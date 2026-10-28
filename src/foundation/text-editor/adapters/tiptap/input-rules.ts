/**
 * Input rules of the Tiptap adapter (Widgets `uwg-te-req-key-7`, `uwg-te-tab-input-rules`,
 * `uwg-te-tab-engine` r10, `uwg-te-lis-up-i0`).
 *
 * The engine's own input rules are off: the editor enables input rules for this adapter's
 * extension alone, whose plugin hands every typed text to the shared rule table
 * (`TE/input-rules.ts`) with the text of the textblock before the caret, written by
 * `caretTextBefore`. A block rule at the start of a top-level paragraph turns it into its block
 * through the shared `applyBlockRule`; an inline rule removes its delimiters and marks the text;
 * a URL followed by a space, Enter or Shift+Enter becomes a link to itself. The typed text applies
 * first, as typing applies it, and the rule then applies as an undo step of its own, so that undo
 * right after it restores the text as typed; Backspace never reverts a rule. Rules never run while
 * composing, nor on the composed text that the engine reads once the composition has ended, and
 * paste rules stay off. Text typed over the whole-document selection, however it was made, lands
 * without marks at the caret of one empty paragraph that replaces the document, and completes no
 * rule.
 */
import { matchAutolink, matchBlockRule, matchInlineRule } from '../../input-rules.js';
import { applyBlockRule } from '../shared/block-edits.js';
import { caretTextBefore } from '../shared/state.js';
import { applyDocument, editContext, restoreSelection } from './blocks.js';
import { clearDocument, crossBlockRange, replaceCrossBlockRange } from './inline.js';
import { keyEdit } from './lists.js';
import { inlineUnitsBefore } from './mapping.js';
import { typedMarks } from './marks.js';
import type {
  TiptapEditorStateLike,
  TiptapExtensionLike,
  TiptapMarkLike,
  TiptapPluginLike,
  TiptapResolvedPosLike,
  TiptapTransactionLike,
} from './modules.js';
import { NATIVE, NATIVE_MARKS } from './schema.js';
import { wholeDocumentSelection } from './selection.js';
import {
  COMPOSITION_META,
  ownStep,
  TiptapWork,
  type TiptapDispatchViewLike,
  type TiptapEnv,
} from './work.js';

/** The name of the adapter's input rule extension, the only one whose rules the editor enables. */
export const TIPTAP_INPUT_RULES = 'tpInputRules';

/** Where typed text lies, as the shared rules take it. */
export interface TiptapRuleScope {
  /** A paragraph at the top level of the document. */
  readonly topLevelParagraph: boolean;
  /** In a code block, or typed text would take inline code. */
  readonly inCode: boolean;
  /** Typed text would take a link, or follows linked text. */
  readonly inLink: boolean;
  /** Nothing follows the typed text in its textblock. */
  readonly atEnd: boolean;
}

const hasMark = (marks: readonly TiptapMarkLike[], name: string): boolean =>
  marks.some((mark) => mark.type.name === name);

/** The scope of text typed over `$from`–`$to` of one textblock. */
export function ruleScope(
  state: TiptapEditorStateLike,
  $from: TiptapResolvedPosLike,
  $to: TiptapResolvedPosLike,
): TiptapRuleScope {
  const parent = $from.parent;
  const marks = typedMarks(state, $from);
  return {
    topLevelParagraph: $from.depth === 1 && parent.type.name === NATIVE.paragraph,
    inCode: parent.type.name === NATIVE.code || hasMark(marks, NATIVE_MARKS.code),
    inLink:
      hasMark(marks, NATIVE_MARKS.link) ||
      hasMark($from.nodeBefore?.marks ?? [], NATIVE_MARKS.link),
    atEnd: $to.parentOffset === $to.parent.content.size,
  };
}

/** The text of a textblock before a position, as the shared rules read it. */
export const ruleTextBefore = ($pos: TiptapResolvedPosLike): string =>
  caretTextBefore(inlineUnitsBefore($pos.parent, $pos.parentOffset), Infinity);

/** A URL before the caret that Enter or Shift+Enter links, in positions, with its text. */
export interface TiptapAutolink {
  readonly from: number;
  readonly to: number;
  readonly href: string;
  readonly text: string;
}

/** The URL that ends the text before a collapsed caret and passes the link policy, or `null`. */
export function autolinkAtCaret(
  env: TiptapEnv,
  state: TiptapEditorStateLike,
): TiptapAutolink | null {
  const { selection } = state;
  if (!selection.empty) return null;
  const { $head } = selection;
  if (!$head.parent.inlineContent) return null;
  const before = ruleTextBefore($head);
  const match = matchAutolink(before, ruleScope(state, $head, $head), env.urls);
  if (!match) return null;
  const start = $head.start();
  return {
    from: start + match.from,
    to: start + match.to,
    href: match.href,
    text: before.slice(match.from, match.to),
  };
}

/** Links an autolink's URL as an undo step of its own, if its text is still where it was. */
export function applyAutolink(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  link: TiptapAutolink,
): void {
  const { state } = view;
  const type = state.schema.marks[NATIVE_MARKS.link];
  if (!type || link.to > state.doc.content.size) return;
  if (state.doc.textBetween(link.from, link.to) !== link.text) return;
  view.dispatch(
    ownStep(env, state.tr.addMark(link.from, link.to, type.create({ href: link.href }))),
  );
}

/**
 * Text typed over a range across blocks: the shared range replacement (`replaceRange`), grouped with
 * typing; whether it applied. No rule applies to such text.
 */
function typeOverRange(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  from: number,
  to: number,
  text: string,
): boolean {
  const range = from === to ? null : crossBlockRange(env, view.state.doc, from, to);
  if (!range) return false;
  return keyEdit(env, view, (work) => replaceCrossBlockRange(work, range, text), { step: false });
}

/**
 * Text typed over the whole-document selection, however it was made (`wholeDocumentSelection`),
 * when `from`–`to` is that selection: the document becomes one empty paragraph with a fresh
 * identifier and the text lands at its caret without marks, grouped with typing
 * (`uwg-te-req-engine-4`); whether it applied.
 */
function typeOverDocument(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  from: number,
  to: number,
  text: string,
): boolean {
  const { selection, doc } = view.state;
  if (from !== selection.from || to !== selection.to) return false;
  if (!wholeDocumentSelection(env, doc, selection)) return false;
  return keyEdit(
    env,
    view,
    (work) => {
      clearDocument(work);
      work.tr.setStoredMarks(null).insertText(text);
      return true;
    },
    { step: false },
  );
}

/**
 * A character key over the whole-document selection, which the engine would otherwise leave to the
 * browser within one textblock: the text typed over the document (`typeOverDocument`). Keys with
 * Ctrl or Meta and line breaks are no text.
 */
export function keyPressOverDocument(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  event: Pick<KeyboardEvent, 'charCode' | 'ctrlKey' | 'altKey' | 'metaKey'>,
): boolean {
  if (view.composing || !event.charCode || event.metaKey || (event.ctrlKey && !event.altKey))
    return false;
  const text = String.fromCharCode(event.charCode);
  if (/[\r\n]/u.test(text)) return false;
  const { from, to } = view.state.selection;
  return typeOverDocument(env, view, from, to, text);
}

/**
 * Text typed over `from`–`to`: when it completes a rule, applies the typed text, then the rule as
 * an undo step of its own, and answers `true`; otherwise `false`, the engine inserting the text.
 * `insert` builds the engine's own transaction of the typed text, when the view passes one. Text
 * of a composition completes no rule (`uwg-te-req-key-7` applies the rules to typed delimiters),
 * also when the engine reads it after the composition ended, which its transaction records.
 */
export function applyTypedRules(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  from: number,
  to: number,
  text: string,
  insert?: () => TiptapTransactionLike,
): boolean {
  if (view.composing || text === '') return false;
  if (typeOverDocument(env, view, from, to, text)) return true;
  if (typeOverRange(env, view, from, to, text)) return true;
  const { state } = view;
  const $from = state.doc.resolve(from);
  const $to = state.doc.resolve(to);
  if (!$from.parent.inlineContent || $from.parent !== $to.parent) return false;
  const scope = ruleScope(state, $from, $to);
  const before = ruleTextBefore($from);
  const typed = before + text;
  const block = matchBlockRule(typed, scope);
  const inline = block ? null : matchInlineRule(typed, scope, env.urls);
  const autolink = block || inline || text !== ' ' ? null : matchAutolink(before, scope, env.urls);
  if (!block && !inline && !autolink) return false;
  const input = insert?.() ?? state.tr.insertText(text, from, to);
  if (input.getMeta(COMPOSITION_META) !== undefined) return false;
  view.dispatch(input);
  // Another plugin changed the document further: the rule no longer knows where its text is.
  if (!view.state.doc.eq(input.doc)) return true;
  const start = $from.start();
  const after = view.state;
  let tr: TiptapTransactionLike | null = null;
  if (block) {
    const id = $from.parent.attrs.id;
    if (typeof id === 'string') tr = blockRule(env, after, id, block.length, block.rule);
  } else if (inline) {
    const type = after.schema.marks[NATIVE_MARKS[inline.rule.mark]];
    if (type) {
      const mark =
        inline.rule.mark === 'highlight'
          ? type.create({ color: inline.rule.color })
          : inline.rule.mark === 'link'
            ? type.create({ href: inline.rule.href })
            : type.create();
      const textFrom = start + inline.from;
      const textTo = textFrom + (inline.textTo - inline.textFrom);
      tr = after.tr
        .delete(start + inline.textTo, start + inline.to)
        .delete(start + inline.from, start + inline.textFrom)
        .addMark(textFrom, textTo, mark);
      tr.setSelection(env.modules.state.TextSelection.create(tr.doc, textTo));
      // Text typed next continues without the rule's mark.
      tr.removeStoredMark(type);
    }
  } else if (autolink) {
    const type = after.schema.marks[NATIVE_MARKS.link];
    if (type)
      tr = after.tr.addMark(
        start + autolink.from,
        start + autolink.to,
        type.create({ href: autolink.href }),
      );
  }
  if (tr) view.dispatch(ownStep(env, tr));
  return true;
}

/** The transaction of a block rule over the paragraph `id`, through the shared rule edit. */
function blockRule(
  env: TiptapEnv,
  state: TiptapEditorStateLike,
  id: string,
  length: number,
  rule: Parameters<typeof applyBlockRule>[3],
): TiptapTransactionLike | null {
  const work = new TiptapWork(env, state);
  const result = applyBlockRule(work.portable(), id, length, rule, editContext(work));
  if (!result || !applyDocument(work, result.document)) return null;
  restoreSelection(work, result.selection);
  return work.tr;
}

/**
 * The plugin of the rules: typed text through `handleTextInput`, and a character key over the
 * whole-document selection through `handleKeyPress`.
 */
export function inputRulesPlugin(env: TiptapEnv): TiptapPluginLike {
  return new env.modules.state.Plugin({
    key: new env.modules.state.PluginKey(TIPTAP_INPUT_RULES),
    props: {
      handleKeyPress: (view: TiptapDispatchViewLike, event: KeyboardEvent) =>
        keyPressOverDocument(env, view, event),
      handleTextInput: (
        view: TiptapDispatchViewLike,
        from: number,
        to: number,
        text: string,
        insert?: () => TiptapTransactionLike,
      ) => applyTypedRules(env, view, from, to, text, insert),
    },
  });
}

/** The extension of the rules, the only one whose input rules the editor enables. */
export function inputRulesExtension(env: TiptapEnv): TiptapExtensionLike {
  return env.modules.core.Extension.create({
    name: TIPTAP_INPUT_RULES,
    addProseMirrorPlugins: () => [inputRulesPlugin(env)],
  });
}
