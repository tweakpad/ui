/**
 * Input rules on Lexical (Widgets `uwg-te-req-key-7`, `uwg-te-tab-input-rules`,
 * `uwg-te-lis-up-i2`, `uwg-te-req-engine-5`).
 *
 * The engine's Markdown shortcuts run the adapter's own transformers, never the reference set:
 * one element transformer for the block rules, the original `---` rule and one text-match
 * transformer per character that completes an inline rule (the shared `INLINE_RULE_TRIGGERS`)
 * and for autolinks (a space). Every
 * transformer decides through the shared rule table of `TE/input-rules.ts`, from the whole text of
 * the textblock before the caret (`caretTextBefore(units, Infinity)`), and applies the result over
 * text-point offsets, so a rule may span text nodes of different formats. A matcher answers
 * nothing outside the rule's scope (a block rule outside a top-level paragraph, any rule in code,
 * an autolink in a link), so the engine changes nothing there. Block rules go through the shared
 * `applyBlockRule`, which keeps the paragraph's identifier.
 *
 * The engine applies a rule in an update of its own tagged `history-push` after the typing update,
 * so the rule is one undo step that restores the text as typed, its cause `input`; no Backspace
 * handler reverts it. Enter and Shift+Enter complete an autolink after the break, in an update of
 * its own as well. No rule applies during a composition or in the update that ends one.
 */
import {
  INLINE_RULE_TRIGGERS,
  matchAutolink,
  matchBlockRule,
  matchInlineRule,
  type TextEditorBlockRule,
  type TextEditorInlineRuleMatch,
} from '../../input-rules.js';
import type { TextEditorTextPoint } from '../../model.js';
import { applyBlockRule } from '../shared/block-edits.js';
import { caretTextBefore } from '../shared/state.js';
import { $commitDocument, editContext, selectionInput } from './blocks.js';
import { $portableDocument } from './document.js';
import { LEXICAL_FORMAT } from './mapping.js';
import { $nodeColors, writeCaretColors } from './caret.js';
import { $linkOf, $prepareLinkSet, $prepareMarkColor, LEXICAL_FORMAT_NAMES } from './marks.js';
import type {
  LexicalElementLike,
  LexicalElementTransformerLike,
  LexicalRangeSelectionLike,
  LexicalTextMatchTransformerLike,
  LexicalTransformerLike,
} from './modules.js';
import { $inlineUnits, $offsetIn, $textblockAt, unitsBefore } from './points.js';
import type { LexicalRuntime } from './runtime.js';
import { $applySelection, $readSelection, $selectText } from './selection.js';

/** The tag of the update that ends a composition. */
const COMPOSITION_END_TAG = 'composition-end';

/** The caret's textblock, its text before the caret and the scope of the rules there. */
export interface LexicalCaretContext {
  readonly selection: LexicalRangeSelectionLike;
  readonly block: LexicalElementLike;
  readonly point: TextEditorTextPoint;
  readonly textBefore: string;
  readonly topLevelParagraph: boolean;
  readonly inCode: boolean;
  readonly inLink: boolean;
  readonly atEnd: boolean;
  /** Whether the character that ends at an offset of the textblock is linked text. */
  readonly linkedBefore: (offset: number) => boolean;
}

/** The context of a collapsed caret in a textblock, or `null`. */
export function $caretContext(rt: LexicalRuntime): LexicalCaretContext | null {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return null;
  const found = $textblockAt(rt, selection.anchor);
  if (!found) return null;
  const offset = $offsetIn(rt, found.block, selection.anchor);
  if (offset === null) return null;
  const units = $inlineUnits(rt, found.block);
  const length = units.reduce((sum, unit) => sum + unit.size, 0);
  const anchor = selection.anchor.getNode();
  const parent = found.block.getParent();
  const linkedBefore = (at: number): boolean => {
    let position = 0;
    for (const unit of units) {
      if (at > position && at <= position + unit.size)
        return unit.text && $linkOf(rt, unit.node) !== null;
      position += unit.size;
    }
    return false;
  };
  return {
    selection,
    block: found.block,
    point: { ...found.address, offset },
    textBefore: caretTextBefore(unitsBefore(units, offset), Infinity),
    topLevelParagraph:
      lexical.$isParagraphNode(found.block) && parent !== null && lexical.$isRootNode(parent),
    inCode:
      rt.isCode(found.block) ||
      (lexical.$isTextNode(anchor)
        ? anchor.hasFormat('code')
        : (selection.format & LEXICAL_FORMAT.code) !== 0),
    // In a link: the caret's text node is linked, or the text right before the caret is.
    inLink: $linkOf(rt, anchor) !== null || linkedBefore(offset),
    atEnd: offset === length,
    linkedBefore,
  };
}

/** A match the engine's runner accepts: the character before the caret, so it splits off just that. */
function triggerMatch(text: string, context: LexicalCaretContext): RegExpMatchArray {
  const anchorOffset = context.selection.anchor.offset;
  const match = [text.charAt(anchorOffset - 1)] as RegExpMatchArray;
  match.index = anchorOffset - 1;
  match.input = text;
  return match;
}

/**
 * A pattern whose match the adapter decides: `String.prototype.match`, which the engine's
 * shortcuts call with it, asks its `Symbol.match`; as a pattern it matches nothing.
 */
class DecidedPattern extends RegExp {
  readonly #decide: (text: string) => RegExpMatchArray | null;

  constructor(decide: (text: string) => RegExpMatchArray | null) {
    super('(?!)', 'u');
    this.#decide = decide;
  }

  override [Symbol.match](text: string): RegExpMatchArray | null {
    return this.#decide(text);
  }
}

/** The import pattern of the adapter's transformers: they import nothing. */
const NEVER = /(?!)/u;

// Applying rules

/** A text-point range of the caret's textblock. */
const pointAt = (context: LexicalCaretContext, offset: number): TextEditorTextPoint => ({
  ...context.point,
  offset,
});

/** Deletes a range of the caret's textblock. */
function $deleteRange(
  rt: LexicalRuntime,
  context: LexicalCaretContext,
  from: number,
  to: number,
): void {
  if (to <= from || !$selectText(rt, pointAt(context, from), pointAt(context, to))) return;
  const selection = rt.lexical.$getSelection();
  if (rt.lexical.$isRangeSelection(selection)) selection.removeText();
}

/**
 * A caret at an offset of the caret's textblock that types plain of the given format bit: the
 * format of the text before it without that bit, its colors carried in the selection's style.
 */
function $caretWithout(
  rt: LexicalRuntime,
  context: LexicalCaretContext,
  offset: number,
  bit: number,
): void {
  if (!$selectText(rt, pointAt(context, offset))) return;
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection)) return;
  const node = selection.anchor.getNode();
  if (!rt.lexical.$isTextNode(node)) return;
  selection.setFormat(node.getFormat() & ~bit);
  // The colors of the text before the caret continue in typed text, a highlight rule's apart.
  const { color, highlight } = $nodeColors(rt, node);
  selection.setStyle(
    writeCaretColors({
      ...(color ? { color } : {}),
      ...(highlight && bit !== LEXICAL_FORMAT.highlight ? { highlight } : {}),
    }),
  );
}

/** Applies an inline rule over text-point offsets of the caret's textblock. */
export function $applyInlineRule(
  rt: LexicalRuntime,
  context: LexicalCaretContext,
  match: TextEditorInlineRuleMatch,
): boolean {
  const { rule, from, textFrom, textTo, to } = match;
  $deleteRange(rt, context, textTo, to);
  $deleteRange(rt, context, from, textFrom);
  const end = from + (textTo - textFrom);
  if (!$selectText(rt, pointAt(context, from), pointAt(context, end))) return false;
  let bit = 0;
  switch (rule.mark) {
    case 'link': {
      const step = $prepareLinkSet(rt, { type: 'link.set', href: rule.href });
      if (!step || !step()) return false;
      break;
    }
    case 'highlight': {
      const step = $prepareMarkColor(rt, {
        type: 'mark.color',
        mark: 'highlight',
        color: rule.color,
      });
      if (!step || !step()) return false;
      bit = LEXICAL_FORMAT.highlight;
      break;
    }
    default: {
      const selection = rt.lexical.$getSelection();
      if (!rt.lexical.$isRangeSelection(selection)) return false;
      bit = LEXICAL_FORMAT[rule.mark];
      selection.formatText(LEXICAL_FORMAT_NAMES[rule.mark], bit);
    }
  }
  $caretWithout(rt, context, end, bit);
  return true;
}

/** Links a URL range of the caret's textblock to itself, the caret back where it was. */
export function $applyAutolink(
  rt: LexicalRuntime,
  context: LexicalCaretContext,
  from: number,
  to: number,
  href: string,
): boolean {
  if (!$selectText(rt, pointAt(context, from), pointAt(context, to))) return false;
  const step = $prepareLinkSet(rt, { type: 'link.set', href });
  const applied = step !== null && step();
  $selectText(rt, context.point);
  return applied;
}

/** Applies a block rule through the shared portable edit, keeping the paragraph's identifier. */
function $applyBlock(
  rt: LexicalRuntime,
  context: LexicalCaretContext,
  rule: TextEditorBlockRule,
  length: number,
): boolean {
  const result = applyBlockRule(
    $portableDocument(rt),
    context.point.block,
    length,
    rule,
    editContext(rt),
  );
  return result !== null && $commitDocument(rt, result.document, result.selection);
}

// The transformers

/** The adapter's Markdown shortcut transformers; built per mount, they read its runtime. */
export function lexicalInputRules(
  rt: LexicalRuntime,
  composed: () => boolean = () => false,
): LexicalTransformerLike[] {
  let block: { rule: TextEditorBlockRule; length: number; context: LexicalCaretContext } | null =
    null;
  let inline: { match: TextEditorInlineRuleMatch; context: LexicalCaretContext } | null = null;
  let autolink: { from: number; to: number; href: string; context: LexicalCaretContext } | null =
    null;

  const blockRule = (text: string, divider: boolean): RegExpMatchArray | null => {
    block = null;
    const context = composed() ? null : $caretContext(rt);
    if (!context) return null;
    const found = matchBlockRule(context.textBefore, context);
    if (!found || (found.rule.kind === 'divider') !== divider) return null;
    block = { rule: found.rule, length: found.length, context };
    if (divider) return triggerMatch(text, context);
    const match = [context.textBefore] as RegExpMatchArray;
    match.index = 0;
    match.input = text;
    return match;
  };
  const applyBlockMatch = (): boolean => {
    const pending = block;
    block = null;
    return pending !== null && $applyBlock(rt, pending.context, pending.rule, pending.length);
  };

  const elementRule: LexicalElementTransformerLike = {
    type: 'element',
    dependencies: [],
    export: () => null,
    regExp: new DecidedPattern((text) => blockRule(text, false)),
    replace: () => applyBlockMatch(),
  };
  const dividerRule: LexicalTextMatchTransformerLike = {
    type: 'text-match',
    dependencies: [],
    trigger: '-',
    importRegExp: NEVER,
    regExp: new DecidedPattern((text) => blockRule(text, true)),
    replace: () => void applyBlockMatch(),
  };
  const inlineRules = INLINE_RULE_TRIGGERS.map<LexicalTextMatchTransformerLike>((trigger) => ({
    type: 'text-match',
    dependencies: [],
    trigger,
    importRegExp: NEVER,
    regExp: new DecidedPattern((text) => {
      inline = null;
      const context = composed() ? null : $caretContext(rt);
      if (!context) return null;
      const match = matchInlineRule(context.textBefore, context, rt.urls);
      if (!match) return null;
      inline = { match, context };
      return triggerMatch(text, context);
    }),
    replace: () => {
      const pending = inline;
      inline = null;
      if (pending) $applyInlineRule(rt, pending.context, pending.match);
    },
  }));
  const spaceAutolink: LexicalTextMatchTransformerLike = {
    type: 'text-match',
    dependencies: [],
    trigger: ' ',
    importRegExp: NEVER,
    regExp: new DecidedPattern((text) => {
      autolink = null;
      const context = composed() ? null : $caretContext(rt);
      if (!context || !context.textBefore.endsWith(' ')) return null;
      const before = context.point.offset - 1;
      const found = matchAutolink(
        context.textBefore.slice(0, -1),
        { inCode: context.inCode, inLink: context.linkedBefore(before) },
        rt.urls,
      );
      if (!found) return null;
      autolink = { ...found, context };
      return triggerMatch(text, context);
    }),
    replace: () => {
      const pending = autolink;
      autolink = null;
      if (pending) $applyAutolink(rt, pending.context, pending.from, pending.to, pending.href);
    },
  };
  return [elementRule, dividerRule, ...inlineRules, spaceAutolink];
}

/** A URL that Enter or Shift+Enter completed, linked once the break applied. */
interface PendingAutolink {
  readonly where: { readonly block: string; readonly cell?: TextEditorTextPoint['cell'] };
  readonly from: number;
  readonly to: number;
  readonly href: string;
  readonly text: string;
}

/** The autolink that Enter or Shift+Enter at the caret completes, or `null`. */
export function $autolinkAtBreak(rt: LexicalRuntime): PendingAutolink | null {
  if (rt.engine.isComposing()) return null;
  const context = $caretContext(rt);
  if (!context) return null;
  const found = matchAutolink(context.textBefore, context, rt.urls);
  if (!found) return null;
  const { offset: _offset, ...where } = context.point;
  void _offset;
  return { where, ...found, text: context.textBefore.slice(found.from, found.to) };
}

/**
 * Links a URL that a break completed, in an update of its own: the URL still holds the same text
 * at the same place (the break left the text before it in its block), and the selection stays
 * where the break put it.
 */
export function $applyPendingAutolink(rt: LexicalRuntime, pending: PendingAutolink): boolean {
  const before = $readSelection(rt);
  const from = { ...pending.where, offset: pending.from };
  const to = { ...pending.where, offset: pending.to };
  if (!$selectText(rt, from, to)) return false;
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || selection.getTextContent() !== pending.text)
    return false;
  const step = $prepareLinkSet(rt, { type: 'link.set', href: pending.href });
  const applied = step !== null && step();
  const restore = selectionInput(before);
  if (restore) $applySelection(rt, restore);
  return applied;
}

/**
 * Installs the input rules: the engine's Markdown shortcuts with the adapter's transformers, and
 * the autolink of Enter and Shift+Enter, applied after the break as an undo step of its own. No
 * rule applies during a composition or in the update that ends one.
 */
export function registerInputRules(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const HIGH = lexical.COMMAND_PRIORITY_HIGH;
  let composed = false;
  let pending: PendingAutolink | null = null;
  const atBreak = () => {
    pending = editor.isEditable() ? $autolinkAtBreak(rt) : null;
    return false;
  };
  return lexical.mergeRegister(
    // Registered before the shortcuts' listener, so its matchers see the update's composition.
    editor.registerUpdateListener(({ tags }) => {
      composed = editor.isComposing() || tags.has(COMPOSITION_END_TAG);
    }),
    rt.modules.markdown.registerMarkdownShortcuts(
      editor,
      lexicalInputRules(rt, () => composed),
    ),
    editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, atBreak, HIGH),
    editor.registerCommand(lexical.INSERT_LINE_BREAK_COMMAND, atBreak, HIGH),
    editor.registerUpdateListener(() => {
      const link = pending;
      pending = null;
      if (link)
        editor.update(() => void $applyPendingAutolink(rt, link), {
          discrete: true,
          tag: lexical.HISTORY_PUSH_TAG,
        });
    }),
  );
}
