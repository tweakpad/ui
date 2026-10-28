/**
 * The normalized state and the editing root on Lexical (Widgets `uwg-te-req-engine-4`,
 * `uwg-te-tab-engine` r3, r12, `uwg-te-req-engine-9`).
 *
 * The state is frozen and built once per version from the committed editor state: counters,
 * editability, focus, composition, emptiness, history, the selection, and the parts that depend on
 * it through the shared rules (`AD/shared/state.ts`, `AD/shared/selection-state.ts`): the marks,
 * the block at the selection head and the kinds the selection spans, the common alignment, the
 * link and the table at the selection, the caret and the empty block. Only the blocks at the
 * selection are mapped to the portable model (`$locateHolder`), so a keystroke never maps the
 * whole document. While the engine holds the selection of Mod+A, the state reports text from the
 * first to the last text point of the document; that text selection, however it was made, spans
 * every block (`$holdsWholeDocument`).
 *
 * The adapter owns the root's attributes: those the widget passes through `setRootAttributes`,
 * `contenteditable`, which follows editability, and `translate="no"`; the engine adds no ARIA and
 * no `tabindex` of its own, its `data-lexical-editor` and `white-space` stay, and its inline
 * `user-select` and `word-break` are removed. A `dragstart` from inside the root is cancelled.
 */
import type { TextEditorRootAttributes } from '../../engine.js';
import { deepFreeze } from '../../../freeze.js';
import { MARKS_OFF } from '../../state.js';
import type { TextEditorPortableBlock, TextEditorPortableMarks } from '../../content/portable.js';
import type {
  TextEditorBlockKindKey,
  TextEditorEngineState,
  TextEditorMarkState,
  TextEditorSelection,
} from '../../model.js';
import { blockModel, textblockState } from '../shared/blocks.js';
import { headBlockId, tableState } from '../shared/selection-state.js';
import { blockKindKeys, caretTextBefore, markState, selectionAlign } from '../shared/state.js';
import { tableModel } from '../shared/tables.js';
import { $caretColors, $nodeColors } from './caret.js';
import { $linkAt, $locateBlock, $wholeTextSelection } from './document.js';
import { $holdsSelectAll, $holdsWholeDocument } from './guards.js';
import { $holders } from './ids.js';
import { portableMarks } from './mapping.js';
import { $blockText, $cellText, $selectedRuns } from './marks.js';
import type {
  LexicalElementLike,
  LexicalNodeLike,
  LexicalRangeSelectionLike,
  LexicalTextLike,
} from './modules.js';
import { $inlineUnits, $textblockOf, unitsBefore } from './points.js';
import type { LexicalRuntime } from './runtime.js';
import { $readSelection } from './selection.js';

/** Root attributes the adapter writes itself; the widget's values for them are ignored. */
export const ADAPTER_ROOT_ATTRIBUTES: ReadonlySet<string> = new Set([
  'contenteditable',
  'translate',
]);

/** The parts of the state that depend on the selection. */
export interface LexicalStateDetails {
  readonly marks: TextEditorMarkState;
  readonly block: TextEditorEngineState['block'];
  readonly blockKinds: TextEditorEngineState['blockKinds'];
  readonly align: TextEditorEngineState['align'];
  readonly link: TextEditorEngineState['link'];
  readonly table: TextEditorEngineState['table'];
  readonly caret: TextEditorEngineState['caret'];
  readonly emptyBlock: TextEditorEngineState['emptyBlock'];
}

// Marks

/** The marks of a text node. */
const $nodeMarks = (rt: LexicalRuntime, node: LexicalTextLike): TextEditorPortableMarks =>
  portableMarks(node.getFormat(), $nodeColors(rt, node));

/**
 * The marks typed text takes at a caret: the selection's format, and its colors from the caret
 * colors in its style, else from the text the caret continues (`caret.ts`).
 */
export function $caretMarks(
  rt: LexicalRuntime,
  selection: LexicalRangeSelectionLike,
): TextEditorPortableMarks {
  return portableMarks(selection.format, $caretColors(rt, selection));
}

/**
 * The mark state of the selection: the marks typed text takes at a caret, the runs of the
 * selected text, or the runs of the text of the selected blocks or of the cells of a cell range.
 */
function $markState(rt: LexicalRuntime, reported: TextEditorSelection): TextEditorMarkState {
  const selection = rt.lexical.$getSelection();
  const runs = (nodes: readonly LexicalTextLike[]) =>
    markState(
      nodes.filter((node) => node.getTextContentSize() > 0).map((node) => $nodeMarks(rt, node)),
    );
  if (reported.kind === 'blocks') return runs($blockText(rt, reported.ids));
  if (reported.kind === 'cells') return runs($cellText(rt, reported.table, reported.range));
  if (!rt.lexical.$isRangeSelection(selection)) return MARKS_OFF;
  if (selection.isCollapsed()) return markState([$caretMarks(rt, selection)]);
  return markState($selectedRuns(rt, selection).map(({ node }) => $nodeMarks(rt, node)));
}

// Blocks at the selection

const $locate = $locateBlock;

/** The holders from one block to another in document order, either way round. */
function $holdersBetween(rt: LexicalRuntime, from: string, to: string): LexicalNodeLike[] {
  const holders = $holders(rt);
  const ids = holders.map((holder) => rt.lexical.$getState(holder, rt.states.id));
  const a = ids.indexOf(from);
  const b = ids.indexOf(to);
  if (a < 0 || b < 0) return [];
  return holders.slice(Math.min(a, b), Math.max(a, b) + 1);
}

/** The portable blocks a selection spans, in document order. */
function $spannedBlocks(
  rt: LexicalRuntime,
  selection: TextEditorSelection,
): TextEditorPortableBlock[] {
  // The whole-document selection spans every block, atoms before its first text point included.
  const ids = $holdsWholeDocument(rt)
    ? $holders(rt).map((holder) => rt.lexical.$getState(holder, rt.states.id))
    : selection.kind === 'text'
      ? $holdersBetween(rt, selection.anchor.block, selection.head.block).map((holder) =>
          rt.lexical.$getState(holder, rt.states.id),
        )
      : selection.kind === 'blocks'
        ? selection.ids
        : selection.kind === 'cells'
          ? [selection.table]
          : [];
  return ids.flatMap((id) => {
    const located = $locate(rt, id);
    return located ? [located.block] : [];
  });
}

/** The table at the selection: text in a cell or a cell range. */
function $table(
  rt: LexicalRuntime,
  selection: TextEditorSelection,
): TextEditorEngineState['table'] {
  let id: string;
  let head;
  let range = null;
  if (selection.kind === 'cells') {
    id = selection.table;
    head = selection.range.head;
    range = selection.range;
  } else if (selection.kind === 'text' && selection.head.cell) {
    id = selection.head.block;
    head = selection.head.cell;
    const anchor = selection.anchor.cell;
    if (
      anchor &&
      selection.anchor.block === id &&
      (anchor.row !== head.row || anchor.column !== head.column)
    )
      range = {
        anchor: { row: anchor.row, column: anchor.column },
        head: { row: head.row, column: head.column },
      };
  } else return null;
  const table = $locate(rt, id)?.block;
  if (table?.type !== 'table') return null;
  return tableState(tableModel(id, table), { row: head.row, column: head.column }, range);
}

/** The caret of a collapsed text selection and the empty block holding it. */
function $caret(
  rt: LexicalRuntime,
  selection: TextEditorSelection,
  marks: TextEditorMarkState,
): Pick<LexicalStateDetails, 'caret' | 'emptyBlock'> {
  if (selection.kind !== 'text' || !selection.empty) return { caret: null, emptyBlock: null };
  const point = selection.head;
  const textblock = $textblockOf(rt, point) as LexicalElementLike | null;
  if (!textblock) return { caret: null, emptyBlock: null };
  const units = $inlineUnits(rt, textblock);
  const codeBlock = !point.cell && rt.isCode(textblock);
  const caret = {
    point,
    textBefore: caretTextBefore(unitsBefore(units, point.offset)),
    inCode: codeBlock || marks.code === 'on',
  };
  if (point.cell) return { caret, emptyBlock: null };
  const located = $locate(rt, point.block);
  const empty = located && textblockState(located.block).empty;
  return {
    caret,
    emptyBlock: empty && located ? { id: point.block, kind: blockModel(located.block).kind } : null,
  };
}

/** The selection-dependent parts of the state. */
export function $stateDetails(
  rt: LexicalRuntime,
  selection: TextEditorSelection,
): LexicalStateDetails {
  const marks = $markState(rt, selection);
  const spanned = $spannedBlocks(rt, selection);
  const head = headBlockId(selection);
  const located = head ? $locate(rt, head) : null;
  const model = located ? blockModel(located.block) : null;
  return {
    marks,
    block:
      located && model && head
        ? { id: head, kind: model.kind, attrs: model.attrs, depth: located.depth }
        : null,
    blockKinds: blockKindKeys(spanned.map(blockModel)) as readonly TextEditorBlockKindKey[],
    align: selectionAlign(selection, spanned),
    link: $linkAt(rt, selection),
    table: $table(rt, selection),
    ...$caret(rt, selection, marks),
  };
}

// The selection of Mod+A

/** The selection the state reports: the text of the whole document while Mod+A holds it. */
export function $stateSelection(rt: LexicalRuntime): TextEditorSelection {
  return ($holdsSelectAll(rt) ? $wholeTextSelection(rt) : null) ?? $readSelection(rt);
}

/** Whether the document is one empty paragraph. */
export function $isEmptyDocument(rt: LexicalRuntime): boolean {
  const root = rt.lexical.$getRoot();
  if (root.getChildrenSize() !== 1) return false;
  const only = root.getFirstChild();
  return rt.lexical.$isParagraphNode(only) && (only as LexicalElementLike).getChildrenSize() === 0;
}

/** The frozen state of the committed editor state. */
export function buildLexicalState(rt: LexicalRuntime): TextEditorEngineState {
  const editor = rt.engine;
  return rt.readCommitted(() => {
    const selection = $stateSelection(rt);
    return deepFreeze({
      version: rt.version,
      contentVersion: rt.contentVersion,
      editable: editor.isEditable(),
      focused: rt.focused,
      composing: editor.isComposing(),
      empty: $isEmptyDocument(rt),
      selection,
      ...$stateDetails(rt, selection),
      history: { undo: rt.canUndo, redo: rt.canRedo },
    });
  });
}

// The editing root

/** Writes the widget's root attributes; `null` removes one, adapter-owned names are skipped. */
export function writeRootAttributes(root: HTMLElement, attributes: TextEditorRootAttributes): void {
  for (const [name, value] of Object.entries(attributes)) {
    const lower = name.toLowerCase();
    if (ADAPTER_ROOT_ATTRIBUTES.has(lower)) continue;
    if (value === null) root.removeAttribute(lower);
    else if (root.getAttribute(lower) !== value) root.setAttribute(lower, value);
  }
}

/** Writes the root attributes the adapter owns for an editability. */
export function writeOwnRootAttributes(root: HTMLElement, editable: boolean): void {
  const value = editable ? 'true' : 'false';
  if (root.getAttribute('contenteditable') !== value) root.setAttribute('contenteditable', value);
  if (root.getAttribute('translate') !== 'no') root.setAttribute('translate', 'no');
}

/**
 * Removes the inline `user-select` and `word-break` the engine writes on the root when it is set,
 * so the root computes them as the other engine's root does (`uwg-te-req-engine-12`); its
 * `white-space` stays.
 */
export function releaseEngineRootStyle(root: HTMLElement): void {
  root.style.removeProperty('user-select');
  root.style.removeProperty('word-break');
}

/**
 * Cancels every `dragstart` from inside the root, editable or not: dragging inside the document
 * is disabled, text moving by cut and paste and blocks only through the widget
 * (`uwg-te-req-content-6`, `uwg-te-req-blocks-5`). Returns the removal of the listener.
 */
export function cancelDragStarts(root: HTMLElement): () => void {
  const listener = (event: Event) => event.preventDefault();
  root.addEventListener('dragstart', listener);
  return () => root.removeEventListener('dragstart', listener);
}

/**
 * Removes the document's selection when it lies in the editing root (`uwg-te-req-engine-4`). The
 * engine adopts a DOM selection in its root as the selection of its next update while it holds
 * none, so wherever the adapter leaves no selection while the browser keeps one in the root (a
 * content load into an unfocused root, whose blur kept the DOM selection, or the caret the browser
 * puts into a root that the adapter focuses after applied actions), that DOM selection goes. The
 * points are read through the shadow roots around the root (the engine's `getDOMSelectionPoints`).
 * Answers whether it removed one.
 */
export function releaseRootSelection(rt: LexicalRuntime, root: HTMLElement): boolean {
  const selection = root.ownerDocument.getSelection?.() ?? null;
  if (!selection || selection.rangeCount === 0) return false;
  const { anchorNode, focusNode } = rt.lexical.getDOMSelectionPoints(selection, root);
  const inside = (node: Node | null) => node !== null && root.contains(node);
  if (!inside(anchorNode) && !inside(focusNode)) return false;
  selection.removeAllRanges();
  return true;
}

/**
 * Writes a text selection of the engine into the document's selection of the focused root while
 * the editor is read-only (`uwg-te-req-engine-4`): the engine writes no DOM selection then, and it
 * reads the DOM selection again at the next event in the root, so a selection set through the API
 * would otherwise give way to the caret the DOM still holds before a copy could write it. A block
 * selection or a cell range has no DOM range. Answers whether it wrote one.
 */
export function showReadOnlySelection(rt: LexicalRuntime, root: HTMLElement): boolean {
  if (rt.engine.isEditable() || !rootFocused(root)) return false;
  const range = rt.readCommitted(() => {
    const selection = rt.lexical.$getSelection();
    if (!rt.lexical.$isRangeSelection(selection)) return null;
    const { anchor, focus } = selection;
    const dom = rt.modules.selection.createDOMRange(
      rt.engine,
      anchor.getNode(),
      anchor.offset,
      focus.getNode(),
      focus.offset,
    );
    return dom ? { dom, backward: selection.isBackward() } : null;
  });
  const selection = root.ownerDocument.getSelection?.() ?? null;
  if (!range || !selection) return false;
  const { dom, backward } = range;
  if (backward)
    selection.setBaseAndExtent(
      dom.endContainer,
      dom.endOffset,
      dom.startContainer,
      dom.startOffset,
    );
  else
    selection.setBaseAndExtent(
      dom.startContainer,
      dom.startOffset,
      dom.endContainer,
      dom.endOffset,
    );
  return true;
}

/** Whether the root holds focus: it is the active element of its root node. */
export function rootFocused(root: HTMLElement | null): boolean {
  if (!root || !root.isConnected) return false;
  const owner = root.getRootNode() as Document | ShadowRoot;
  return owner.activeElement === root;
}
