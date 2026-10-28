/**
 * Marks and links on Lexical (Widgets `uwg-te-tab-actions` r1, `uwg-te-req-blocks-1`,
 * `uwg-te-lis-up-i2`, `uwg-te-req-content-2`).
 *
 * Toggle marks are the engine's text format bits; colors are palette names in NodeState on the
 * stock text node, a highlighted run also carrying the highlight bit. A mark turns on across the
 * selection, or off when every selected character has it. Over a block selection or a cell range
 * the actions act on the runs of the text of the selected blocks or cells, code-block text left
 * out. At a caret the marks apply to the text typed next: format bits through the selection's
 * format, colors through custom properties in the selection's style (`caret.ts`), which a text
 * transform moves into NodeState before anything renders, so no node keeps a style. Links keep
 * their destination only; the shared action gate checks it against the link protocols.
 */
import { TOGGLE_MARKS } from '../../actions.js';
import type {
  TextEditorLinkSetAction,
  TextEditorLinkUnsetAction,
  TextEditorMarkColorAction,
  TextEditorMarkToggleAction,
} from '../../actions.js';
import type {
  TextEditorCellRange,
  TextEditorLinkState,
  TextEditorSelectionInput,
  TextEditorTextRange,
  TextEditorToggleMark,
} from '../../model.js';
import type { TextEditorColor } from '../../palette.js';
import {
  markActionAllowed,
  markTargets,
  textRangePoints,
  type TextEditorMarkScope,
} from '../shared/selection-state.js';
import { tableModel, tableTargetCells } from '../shared/tables.js';
import {
  $caretColors,
  $nodeColors,
  $seedCaret,
  $settleCaretStyle,
  readCaretColors,
  writeCaretColors,
  type LexicalCaretColors,
} from './caret.js';
import { $linkAt, $locateHolder } from './document.js';
import { $holderById, $isWrapperItem } from './ids.js';
import { LEXICAL_FORMAT } from './mapping.js';
import { $inCodeBlock } from './nodes.js';
import type {
  LexicalElementLike,
  LexicalLinkLike,
  LexicalNodeLike,
  LexicalRangeSelectionLike,
  LexicalTextLike,
} from './modules.js';
import { $pointOfText, $tablePlacement, $textblockAt, $textblockOf } from './points.js';
import { selectionInput } from './blocks.js';
import { $applySelection, $readSelection, $selectText } from './selection.js';
import type { LexicalRuntime } from './runtime.js';

/** The engine's format names of the toggle marks, as `hasFormat` and `formatText` take them. */
export const LEXICAL_FORMAT_NAMES: Readonly<Record<TextEditorToggleMark, string>> = Object.freeze({
  bold: 'bold',
  italic: 'italic',
  underline: 'underline',
  strike: 'strikethrough',
  code: 'code',
  superscript: 'superscript',
  subscript: 'subscript',
});

/**
 * The text transform: a style moves into NodeState colors and is dropped, so a run typed after a
 * caret color takes it and no text node renders a style.
 */
export function $settleTextStyle(rt: LexicalRuntime, node: LexicalNodeLike): void {
  const { lexical, states } = rt;
  if (!lexical.$isTextNode(node)) return;
  const style = node.getStyle();
  if (style === '') return;
  const colors = readCaretColors(style);
  if (colors.color)
    lexical.$setState(node, states.color, colors.color === 'none' ? '' : colors.color);
  if (colors.highlight)
    lexical.$setState(node, states.highlight, colors.highlight === 'none' ? '' : colors.highlight);
  node.setStyle('');
  $settleCaretStyle(rt, node);
}

/** Registers the text transform of caret colors. */
export function registerTextStyles(rt: LexicalRuntime): () => void {
  return rt.engine.registerNodeTransform(rt.lexical.TextNode, (node) => $settleTextStyle(rt, node));
}

// Selected text

/** A text node with the part of it that a selection covers. */
export interface LexicalSelectedRun {
  readonly node: LexicalTextLike;
  readonly from: number;
  readonly to: number;
}

/** The text runs a range selection covers, in document order, empty parts left out. */
export function $selectedRuns(
  rt: LexicalRuntime,
  selection: LexicalRangeSelectionLike,
): LexicalSelectedRun[] {
  const { lexical } = rt;
  const backward = selection.isBackward();
  const start = backward ? selection.focus : selection.anchor;
  const end = backward ? selection.anchor : selection.focus;
  const runs: LexicalSelectedRun[] = [];
  for (const node of selection.getNodes()) {
    if (!lexical.$isTextNode(node)) continue;
    const size = node.getTextContentSize();
    const from = start.type === 'text' && start.key === node.getKey() ? start.offset : 0;
    const to = end.type === 'text' && end.key === node.getKey() ? end.offset : size;
    if (to > from) runs.push({ node, from, to });
  }
  return runs;
}

/** The text nodes of a non-collapsed selection, split at its edges. */
function $extractText(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): LexicalTextLike[] {
  return selection
    .extract()
    .filter(
      (node): node is LexicalTextLike =>
        rt.lexical.$isTextNode(node) && node.getTextContentSize() > 0,
    );
}

/** The range selection the mark actions act on, or `null`. */
function $range(rt: LexicalRuntime): LexicalRangeSelectionLike | null {
  const selection = rt.lexical.$getSelection();
  return rt.lexical.$isRangeSelection(selection) ? selection : null;
}

/**
 * The runs of a range selection outside code blocks: the text the mark actions act on (the shared
 * `markTargets`).
 */
function $markRuns(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): LexicalSelectedRun[] {
  return markTargets(
    $selectedRuns(rt, selection).map((run) => ({
      ...run,
      codeBlock: $inCodeBlock(rt, run.node),
      marks: run.node.hasFormat('code') ? { code: true as const } : null,
    })),
  ).runs.map(({ node, from, to }) => ({ node, from, to }));
}

/**
 * Where the mark actions act (`uwg-te-req-blocks-1`: code takes no mark but a link): at a caret, in
 * its code block, in inline code when the format typed text takes has the code format; over a
 * range, the scope of the runs it covers outside code blocks (the shared `markTargets`), so marks
 * act on that text and skip code-block text, and nothing acts on a range without such text.
 */
export function $markScope(
  rt: LexicalRuntime,
  selection: LexicalRangeSelectionLike,
): TextEditorMarkScope {
  if (selection.isCollapsed()) {
    const found = $textblockAt(rt, selection.anchor);
    return {
      codeBlock: found !== null && rt.isCode(found.block),
      inlineCode: (selection.format & LEXICAL_FORMAT.code) !== 0,
    };
  }
  return markTargets(
    $selectedRuns(rt, selection).map(({ node }) => ({
      codeBlock: $inCodeBlock(rt, node),
      marks: node.hasFormat('code') ? { code: true as const } : null,
    })),
  ).scope;
}

/** Every format bit of a mark: the toggle marks' and the highlight's. */
const ALL_MARK_BITS = TOGGLE_MARKS.reduce<number>(
  (all, mark) => all | LEXICAL_FORMAT[mark],
  LEXICAL_FORMAT.highlight,
);

// Runs of block selections and cell ranges (`uwg-te-tab-actions` r1)

/** The text nodes of a block selection's blocks: their own text, a list item's nested items too. */
export function $blockText(rt: LexicalRuntime, ids: readonly string[]): LexicalTextLike[] {
  return ids.flatMap((id) => {
    const holder = $holderById(rt, id);
    if (!holder || !rt.lexical.$isElementNode(holder)) return [];
    const next = holder.getNextSibling();
    const nested =
      rt.isListItem(holder) && next && $isWrapperItem(rt, next)
        ? (next as LexicalElementLike).getAllTextNodes()
        : [];
    return [...holder.getAllTextNodes(), ...nested];
  });
}

/** The text nodes of the cells of a cell range: the rectangle it covers, grown over merged cells. */
export function $cellText(
  rt: LexicalRuntime,
  table: string,
  range: TextEditorCellRange,
): LexicalTextLike[] {
  const holder = $holderById(rt, table);
  const located = holder ? $locateHolder(rt, holder) : null;
  if (!holder || located?.block.type !== 'table') return [];
  const model = tableModel(table, located.block);
  const placement = $tablePlacement(rt, holder as LexicalElementLike);
  return tableTargetCells(model, { range }).flatMap((index) => {
    const cell = model.cells[index];
    return cell ? (placement.at(cell.row, cell.column)?.getAllTextNodes() ?? []) : [];
  });
}

/**
 * What a mark action acts on: a range selection (a caret or selected text), or the runs of the
 * text of the selected blocks or of the cells of a cell range, empty runs and code-block text left
 * out; `null` without a selection.
 */
type MarkTarget =
  | { readonly kind: 'range'; readonly selection: LexicalRangeSelectionLike }
  | { readonly kind: 'runs'; readonly nodes: readonly LexicalTextLike[] };

function $markTarget(rt: LexicalRuntime): MarkTarget | null {
  const selection = rt.lexical.$getSelection();
  if (rt.lexical.$isRangeSelection(selection)) return { kind: 'range', selection };
  const reported = $readSelection(rt);
  const nodes =
    reported.kind === 'blocks'
      ? $blockText(rt, reported.ids)
      : reported.kind === 'cells'
        ? $cellText(rt, reported.table, reported.range)
        : null;
  if (!nodes) return null;
  return {
    kind: 'runs',
    nodes: nodes.filter((node) => node.getTextContentSize() > 0 && !$inCodeBlock(rt, node)),
  };
}

/** The scope of the runs of a block selection or cell range, as the shared rule takes it. */
const runsScope = (nodes: readonly LexicalTextLike[]): TextEditorMarkScope => ({
  codeBlock: false,
  inlineCode: nodes.length > 0 && nodes.every((node) => node.hasFormat('code')),
});

/** The runs a mark may join: inline code keeps out every mark but the code mark itself. */
const markable = (nodes: readonly LexicalTextLike[], mark: TextEditorToggleMark | null) =>
  mark === 'code' ? nodes : nodes.filter((node) => !node.hasFormat('code'));

/** Turns a toggle mark on or off on a text node; superscript and subscript exclude each other. */
function $setMark(
  rt: LexicalRuntime,
  node: LexicalTextLike,
  mark: TextEditorToggleMark,
  on: boolean,
): void {
  const bit = LEXICAL_FORMAT[mark];
  let format = node.getFormat();
  if (!on) format &= ~bit;
  else if (mark === 'code') format = LEXICAL_FORMAT.code;
  else {
    format |= bit;
    if (mark === 'superscript') format &= ~LEXICAL_FORMAT.subscript;
    if (mark === 'subscript') format &= ~LEXICAL_FORMAT.superscript;
  }
  if (format !== node.getFormat()) node.setFormat(format);
  if (on && mark === 'code') {
    // Inline code excludes every mark but a link.
    rt.lexical.$setState(node, rt.states.color, '');
    rt.lexical.$setState(node, rt.states.highlight, '');
  }
}

/** Sets a color channel on a text node; `null` clears it. */
function $setColor(
  rt: LexicalRuntime,
  node: LexicalTextLike,
  highlight: boolean,
  color: TextEditorColor | null,
): void {
  const { lexical, states } = rt;
  if (!highlight) {
    lexical.$setState(node, states.color, color ?? '');
    return;
  }
  lexical.$setState(node, states.highlight, color ?? '');
  const format = node.getFormat();
  node.setFormat(
    color === null ? format & ~LEXICAL_FORMAT.highlight : format | LEXICAL_FORMAT.highlight,
  );
}

/** Removes every mark but links from a text node. */
function $clearMarks(rt: LexicalRuntime, node: LexicalTextLike): void {
  node.setFormat(node.getFormat() & ~ALL_MARK_BITS);
  rt.lexical.$setState(node, rt.states.color, '');
  rt.lexical.$setState(node, rt.states.highlight, '');
}

// Actions

/**
 * `mark.toggle`: turns a mark on across the selection, or off when it covers all of it; at a
 * caret it applies to the text typed next, which keeps the caret's colors.
 */
export function $prepareMarkToggle(
  rt: LexicalRuntime,
  action: TextEditorMarkToggleAction,
): (() => boolean) | null {
  const target = $markTarget(rt);
  if (!target) return null;
  const name = LEXICAL_FORMAT_NAMES[action.mark];
  const bit = LEXICAL_FORMAT[action.mark];
  if (target.kind === 'runs') {
    if (!markActionAllowed('mark.toggle', action.mark, runsScope(target.nodes))) return null;
    const nodes = markable(target.nodes, action.mark);
    if (nodes.length === 0) return null;
    return () => {
      const current = $markTarget(rt);
      const runs = current?.kind === 'runs' ? markable(current.nodes, action.mark) : [];
      if (runs.length === 0) return false;
      const covered = runs.every((node) => node.hasFormat(name));
      for (const node of runs) $setMark(rt, node, action.mark, !covered);
      return true;
    };
  }
  const range = target.selection;
  if (!markActionAllowed('mark.toggle', action.mark, $markScope(rt, range))) return null;
  return () => {
    const selection = $range(rt);
    if (!selection) return false;
    if (selection.isCollapsed()) {
      const colors = $caretColors(rt, selection);
      selection.formatText(name);
      if (action.mark === 'code' && selection.hasFormat('code')) {
        selection.setFormat(LEXICAL_FORMAT.code);
        selection.setStyle(writeCaretColors({ color: 'none', highlight: 'none' }));
      } else selection.setStyle(writeCaretColors(colors));
      return true;
    }
    const runs = $markRuns(rt, selection);
    if (runs.length === 0) return false;
    const covered = runs.every(({ node }) => node.hasFormat(name));
    // Code-block text keeps no format: the code text transform clears what this sets there.
    selection.formatText(name, covered ? 0 : bit);
    if (action.mark === 'code' && !covered) {
      // Inline code excludes every mark but a link.
      for (const node of $extractText(rt, selection)) $setMark(rt, node, 'code', true);
    }
    return true;
  };
}

/** `mark.color`: a text color or highlight hue across the selection, or at a caret for typed text. */
export function $prepareMarkColor(
  rt: LexicalRuntime,
  action: TextEditorMarkColorAction,
): (() => boolean) | null {
  const target = $markTarget(rt);
  if (!target) return null;
  const highlight = action.mark === 'highlight';
  if (target.kind === 'runs') {
    if (!markActionAllowed('mark.color', null, runsScope(target.nodes))) return null;
    if (markable(target.nodes, null).length === 0) return null;
    return () => {
      const current = $markTarget(rt);
      const runs = current?.kind === 'runs' ? markable(current.nodes, null) : [];
      if (runs.length === 0) return false;
      for (const node of runs) $setColor(rt, node, highlight, action.color);
      return true;
    };
  }
  const range = target.selection;
  if (!markActionAllowed('mark.color', null, $markScope(rt, range))) return null;
  if (!range.isCollapsed() && !$markRuns(rt, range).some(({ node }) => !node.hasFormat('code')))
    return null;
  return () => {
    const selection = $range(rt);
    if (!selection) return false;
    if (selection.isCollapsed()) {
      const colors = { ...$caretColors(rt, selection) };
      if (highlight) {
        colors.highlight = action.color ?? 'none';
        const on = action.color !== null;
        selection.setFormat(
          on
            ? selection.format | LEXICAL_FORMAT.highlight
            : selection.format & ~LEXICAL_FORMAT.highlight,
        );
      } else colors.color = action.color ?? 'none';
      selection.setStyle(writeCaretColors(colors));
      return true;
    }
    const nodes = $extractText(rt, selection).filter(
      (node) => !node.hasFormat('code') && !$inCodeBlock(rt, node),
    );
    if (nodes.length === 0) return false;
    for (const node of nodes) $setColor(rt, node, highlight, action.color);
    return true;
  };
}

/** `mark.clear`: removes every mark but links. */
export function $prepareMarkClear(rt: LexicalRuntime): (() => boolean) | null {
  const target = $markTarget(rt);
  if (!target) return null;
  if (target.kind === 'runs') {
    if (target.nodes.length === 0) return null;
    if (!markActionAllowed('mark.clear', null, runsScope(target.nodes))) return null;
    return () => {
      const current = $markTarget(rt);
      const runs = current?.kind === 'runs' ? current.nodes : [];
      if (runs.length === 0) return false;
      for (const node of runs) $clearMarks(rt, node);
      return true;
    };
  }
  const range = target.selection;
  if (!markActionAllowed('mark.clear', null, $markScope(rt, range))) return null;
  return () => {
    const selection = $range(rt);
    if (!selection) return false;
    if (selection.isCollapsed()) {
      selection.setFormat(selection.format & ~ALL_MARK_BITS);
      selection.setStyle(writeCaretColors({ color: 'none', highlight: 'none' }));
      return true;
    }
    for (const node of $extractText(rt, selection))
      if (!$inCodeBlock(rt, node)) $clearMarks(rt, node);
    return true;
  };
}

// Links

/** The link that holds a node, or `null`. */
export function $linkOf(rt: LexicalRuntime, node: LexicalNodeLike | null): LexicalLinkLike | null {
  let current = node;
  while (current) {
    if (rt.isLink(current)) return current as LexicalLinkLike;
    if (rt.lexical.$isElementNode(current) && !current.isInline()) return null;
    current = current.getParent();
  }
  return null;
}

/** Whether a text range names text of the document; reads only. */
export function $rangeExists(rt: LexicalRuntime, range: TextEditorTextRange): boolean {
  const [from, to] = textRangePoints(range);
  return $pointOfText(rt, from) !== null && $pointOfText(rt, to) !== null;
}

/** Selects a text range; answers whether it named text. */
export function $selectRange(rt: LexicalRuntime, range: TextEditorTextRange): boolean {
  const [from, to] = textRangePoints(range);
  return $selectText(rt, from, to);
}

/**
 * The text runs a text range covers, read without selecting it (a dry run reads only): its ends
 * as `$selectText` places them, empty parts left out; none for an empty range.
 */
function $rangeRuns(rt: LexicalRuntime, range: TextEditorTextRange): LexicalSelectedRun[] {
  const [from, to] = textRangePoints(range);
  const anchor = $pointOfText(rt, from, 'forward');
  const focus = $pointOfText(rt, to, 'backward');
  if (!anchor || !focus) return [];
  const selection = rt.lexical.$createRangeSelection();
  selection.anchor.set(anchor.key, anchor.offset, anchor.type);
  selection.focus.set(focus.key, focus.offset, focus.type);
  return selection.isCollapsed() ? [] : $selectedRuns(rt, selection);
}

/** Whether runs hold linked text. */
const $linkedRuns = (rt: LexicalRuntime, runs: readonly LexicalSelectedRun[]): boolean =>
  runs.some(({ node }) => $linkOf(rt, node) !== null);

/**
 * Sets again the selection an action found before it selected its own range: the same text points
 * (a link action moves no text), the same blocks or cells, or none.
 */
function $restoreSelection(rt: LexicalRuntime, before: TextEditorSelectionInput | null): void {
  if (!before || !$applySelection(rt, before)) rt.lexical.$setSelection(null);
}

/** The links that hold the runs of a block selection or cell range, each once. */
function $linksOfRuns(rt: LexicalRuntime, nodes: readonly LexicalTextLike[]): LexicalLinkLike[] {
  const links: LexicalLinkLike[] = [];
  for (const node of nodes) {
    const link = $linkOf(rt, node);
    if (link && !links.some((found) => found.is(link))) links.push(link);
  }
  return links;
}

/** Selects a link run and replaces its text with linked text taking the run's first format. */
function $replaceLinkText(
  rt: LexicalRuntime,
  link: TextEditorLinkState,
  href: string,
  text: string,
) {
  if (!$selectRange(rt, link.range)) return false;
  const selection = $range(rt);
  if (!selection) return false;
  const first = $selectedRuns(rt, selection)[0]?.node;
  const format = first ? first.getFormat() & ~LEXICAL_FORMAT.code : 0;
  const colors = first ? $nodeColors(rt, first) : {};
  selection.removeText();
  const after = $range(rt);
  if (!after) return false;
  after.format = format;
  after.style = '';
  return $insertLinkedText(rt, after, href, text, colors);
}

/**
 * Inserts `text` linked to `href` at a caret, taking the caret's format, inline code included (the
 * shared `insertionMarks`: a link combines with code), and the given colors.
 */
function $insertLinkedText(
  rt: LexicalRuntime,
  selection: LexicalRangeSelectionLike,
  href: string,
  text: string,
  colors: LexicalCaretColors,
): boolean {
  const { lexical } = rt;
  const link = lexical.$parseSerializedNode({
    type: 'link',
    version: 1,
    url: href,
    children: [],
  }) as LexicalElementLike;
  const node = lexical.$createTextNode(text);
  node.setFormat(selection.format);
  if (colors.color && colors.color !== 'none')
    lexical.$setState(node, rt.states.color, colors.color);
  if (colors.highlight && colors.highlight !== 'none' && selection.hasFormat('highlight'))
    lexical.$setState(node, rt.states.highlight, colors.highlight);
  link.append(node);
  selection.insertNodes([link]);
  // The caret after the link continues its text's marks, outside the link
  // (`uwg-te-lis-up-i2`).
  const after = $range(rt);
  if (after?.isCollapsed()) $seedCaret(rt, after);
  return true;
}

/** Links the text of a range selection to `href`, no other attribute (`uwg-te-req-content-2`). */
function $linkSelection(rt: LexicalRuntime, href: string | null): void {
  // Without explicit attributes the engine would store `rel="noreferrer"`.
  rt.modules.link.$toggleLink(
    href === null ? null : { url: href, rel: null, target: null, title: null },
  );
}

/** The link a node is, when it is a link to `href`. */
const linkTo = (rt: LexicalRuntime, node: LexicalNodeLike | null, href: string) =>
  node !== null && rt.isLink(node) && (node as LexicalLinkLike).getURL() === href
    ? (node as LexicalLinkLike)
    : null;

/**
 * Links exactly the selected text to `href`, as every engine does (`uwg-te-tab-actions` r1): text
 * that another link holds leaves it, and the parts of that link outside the selection keep their
 * destination, where the engine's own linking would give the whole link the new destination. The
 * linked text joins a link to the same destination right before or after it, so one destination
 * makes one link. Text already linked to `href` throughout stays as it is.
 */
function $linkText(rt: LexicalRuntime, href: string): void {
  const selection = $range(rt);
  if (!selection) return;
  const runs = $selectedRuns(rt, selection);
  if (runs.every(({ node }) => linkTo(rt, $linkOf(rt, node), href) !== null)) return;
  if ($linkedRuns(rt, runs)) $linkSelection(rt, null);
  $linkSelection(rt, href);
  const after = $range(rt);
  if (!after) return;
  for (const link of $linksOfRuns(
    rt,
    $selectedRuns(rt, after).map(({ node }) => node),
  )) {
    const next = linkTo(rt, link.getNextSibling(), href);
    if (next) {
      link.append(...next.getChildren());
      next.remove();
    }
    const previous = linkTo(rt, link.getPreviousSibling(), href);
    if (previous) {
      previous.append(...link.getChildren());
      link.remove();
    }
  }
}

/**
 * `link.set` (`uwg-te-tab-actions` r1): over `range`, exactly its text; an empty `range` is a
 * point, where `text` is inserted as linked text (`uwg-te-req-surfaces-3`) and nothing applies
 * without it, the link at a caret never taken there. Else at a caret in or at a link (its edges
 * included, the shared `linkAtSelection`), that link gets the destination, or with `text` that
 * text; else at a caret `text` inserted as linked text, taking the caret's format and colors; else
 * a link the selection lies in as a whole, or else exactly the selected text. The selection stays where it was, also over `range`, where
 * it was none; after inserted text the caret follows it. A block selection or cell range has no
 * text to link. The destination passed the link protocols already: the action gate checks an
 * action's, the input rules and autolinks their own.
 */
export function $prepareLinkSet(
  rt: LexicalRuntime,
  action: TextEditorLinkSetAction,
): (() => boolean) | null {
  const range = action.range;
  const text = action.text === undefined || action.text === '' ? null : action.text;
  if (range) {
    if (!$rangeExists(rt, range) || $linkInCodeBlock(rt, range)) return null;
    if (range.from === range.to) {
      if (text === null) return null;
      return () => {
        if (!$selectRange(rt, range)) return false;
        const caret = $range(rt);
        return (
          caret !== null && $insertLinkedText(rt, caret, action.href, text, $caretColors(rt, caret))
        );
      };
    }
    return () => {
      const before = selectionInput($readSelection(rt));
      if (!$selectRange(rt, range)) return false;
      $linkText(rt, action.href);
      $restoreSelection(rt, before);
      return true;
    };
  }
  const selection = $range(rt);
  if (!selection || $linkInCodeBlock(rt, undefined)) return null;
  const reported = $readSelection(rt);
  const link = $linkAt(rt, reported);
  if (selection.isCollapsed() && !link && text === null) return null;
  return () => {
    const current = $range(rt);
    if (!current) return false;
    const before = selectionInput($readSelection(rt));
    if (link && text !== null) return $replaceLinkText(rt, link, action.href, text);
    if (!link && current.isCollapsed())
      return $insertLinkedText(rt, current, action.href, text!, $caretColors(rt, current));
    if (link) {
      if (!$selectRange(rt, link.range)) return false;
      $linkSelection(rt, action.href);
    } else $linkText(rt, action.href);
    $restoreSelection(rt, before);
    return true;
  };
}

/**
 * `link.unset`: removes the link at a caret in or at a link (the shared `linkAtSelection`), from
 * the text of `range` when that text holds linked text (an empty range holds none), from the
 * selected text, or in the selected blocks or cells; the selection stays where it was, also over
 * `range`, where it was none.
 */
export function $prepareLinkUnset(
  rt: LexicalRuntime,
  action: TextEditorLinkUnsetAction,
): (() => boolean) | null {
  const range = action.range;
  if (!range) {
    const target = $markTarget(rt);
    if (target?.kind === 'runs') {
      if ($linksOfRuns(rt, target.nodes).length === 0) return null;
      return () => {
        const current = $markTarget(rt);
        const links = current?.kind === 'runs' ? $linksOfRuns(rt, current.nodes) : [];
        if (links.length === 0) return false;
        for (const link of links) $unwrap(link);
        return true;
      };
    }
  }
  if ($linkInCodeBlock(rt, range)) return null;
  if (range) {
    if (!$linkedRuns(rt, $rangeRuns(rt, range))) return null;
    return () => {
      const before = selectionInput($readSelection(rt));
      if (!$selectRange(rt, range)) return false;
      $linkSelection(rt, null);
      $restoreSelection(rt, before);
      return true;
    };
  }
  const selection = $range(rt);
  if (!selection) return null;
  const link = selection.isCollapsed() ? $linkAt(rt, $readSelection(rt)) : null;
  if (selection.isCollapsed() ? !link : !$linkedRuns(rt, $selectedRuns(rt, selection))) return null;
  return () => {
    const before = selectionInput($readSelection(rt));
    if (link && !$selectRange(rt, link.range)) return false;
    $linkSelection(rt, null);
    $restoreSelection(rt, before);
    return true;
  };
}

/** Whether a link action would act in a code block, whose text takes no link. */
function $linkInCodeBlock(rt: LexicalRuntime, range: TextEditorTextRange | undefined): boolean {
  if (range) {
    const block = range.cell ? null : $textblockOf(rt, { block: range.block });
    return block !== null && rt.isCode(block);
  }
  const selection = $range(rt);
  return selection !== null && !markActionAllowed('link.set', null, $markScope(rt, selection));
}

/** Replaces an inline element by its children. */
function $unwrap(element: LexicalElementLike): void {
  for (const child of element.getChildren()) element.insertBefore(child);
  element.remove();
}
