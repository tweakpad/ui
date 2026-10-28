/**
 * The content action of the Tiptap adapter (Widgets `uwg-te-tab-actions` r5, `uwg-te-req-content-6`,
 * `uwg-te-req-blocks-1`, `uwg-te-req-tables-5`).
 *
 * `content.insert` inserts a portable fragment at a point or over a text range, whose text goes
 * first. Outside tables the shared fragment edit decides the outcome, as on every engine: a text
 * range merges its first and last paragraphs into the text around the point, whole blocks follow
 * the block at the point or replace it when it is an empty paragraph or list item, and a code
 * block takes the fragment's text. In a table cell the fragment enters the cell as paragraphs
 * (`cellParagraphs`) that merge into the text around the point. Inserted blocks get fresh
 * identifiers, and kinds the mount cannot represent are converted first. Over a cell range the
 * shared edit clears its cells and fills the first one, or fills the range from a pasted table
 * (`uwg-te-req-tables-5`).
 */
import type { TextEditorContentInsertAction } from '../../actions.js';
import type { TextEditorTextPoint } from '../../model.js';
import {
  cellParagraphs,
  replaceBlocksWithFragment,
  insertFragmentAtPoint,
  prepareFragment,
  type TextEditorFragmentContext,
} from '../shared/fragment-insert.js';
import { findBlock } from '../shared/blocks.js';
import { cellRangeInsertEdit } from '../shared/table-edits.js';
import type { TiptapActionHandlers } from './actions.js';
import { applyDocument, editContext, inCell, restoreSelection } from './blocks.js';
import { isItemNode, isListNode, toTiptapInline } from './mapping.js';
import type { TiptapNodeLike } from './modules.js';
import { NATIVE } from './schema.js';
import {
  clearDocument,
  crossBlockRange,
  deleteCrossBlockRange,
  holdsWholeDocument,
} from './inline.js';
import { caretPosition, readSelection } from './selection.js';
import type { TiptapWork } from './work.js';

/** What inserting a fragment needs: the edit context and what the mount represents. */
const fragmentContext = (work: TiptapWork): TextEditorFragmentContext => ({
  ...editContext(work),
  capabilities: work.env.capabilities,
});

/** The position just inside the first (or the last) textblock of a node, through lists and items. */
function textEdge(doc: TiptapNodeLike, side: 'start' | 'end'): number {
  let node = doc;
  let pos = side === 'start' ? 0 : doc.content.size;
  for (;;) {
    const child = side === 'start' ? node.firstChild : node.lastChild;
    if (!child) return pos;
    if (child.isTextblock) return side === 'start' ? pos + 1 : pos - 1;
    if (!isListNode(child) && !isItemNode(child)) return pos;
    pos += side === 'start' ? 1 : -1;
    node = child;
  }
}

/** Replaces a range with paragraphs, the first and the last merging with the text around. */
function mergeParagraphs(work: TiptapWork, at: number, nodes: readonly TiptapNodeLike[]): void {
  const { tr } = work;
  const temporary = work.schema.topNodeType.create(null, nodes);
  const slice = temporary.slice(textEdge(temporary, 'start'), textEdge(temporary, 'end'));
  const steps = tr.mapping.maps.length;
  tr.replaceRange(at, at, slice);
  const end = tr.mapping.maps.slice(steps).reduce((pos, map) => map.map(pos, 1), at);
  tr.setSelection(work.env.modules.state.Selection.near(tr.doc.resolve(end), -1));
}

/** The range of an insertion point or text range input, ordered. */
function rangeOf(
  work: TiptapWork,
  at: TextEditorContentInsertAction['at'],
): { from: number; to: number } | null {
  switch (at.kind) {
    case 'text': {
      const anchor = work.pointPos(at.anchor);
      const head = at.head ? work.pointPos(at.head) : anchor;
      if (anchor === null || head === null) return null;
      return { from: Math.min(anchor, head), to: Math.max(anchor, head) };
    }
    case 'caret': {
      const pos = caretPosition(work.doc, at.block, at.cell, at.position, work.env.tables);
      return pos === null ? null : { from: pos, to: pos };
    }
    default:
      return null;
  }
}

const samePoint = (a: TextEditorTextPoint, b: TextEditorTextPoint): boolean =>
  a.block === b.block &&
  a.offset === b.offset &&
  a.cell?.row === b.cell?.row &&
  a.cell?.column === b.cell?.column &&
  a.cell?.paragraph === b.cell?.paragraph;

/**
 * Whether an insertion point is the whole-document selection of Mod+A that the engine holds: the
 * text range from its first to its last text point, as the state reports it; the fragment then
 * lands at the caret of one empty paragraph (`uwg-te-req-engine-11`).
 */
function atWholeDocument(work: TiptapWork, at: TextEditorContentInsertAction['at']): boolean {
  if (at.kind !== 'text' || !at.head || !holdsWholeDocument(work)) return false;
  const whole = readSelection(work.env, work.doc, work.selection);
  return (
    whole.kind === 'text' && samePoint(whole.anchor, at.anchor) && samePoint(whole.head, at.head)
  );
}

/** `content.insert`: a fragment at a point, over a text range or over a block selection. */
/**
 * A fragment over a cell range (`uwg-te-req-tables-5`), by the shared edit: the cells cleared and
 * the fragment in the first cell, or a pasted table filling the range from its first cell, in one
 * transaction with the caret the edit leaves.
 */
function insertOverCells(work: TiptapWork, action: TextEditorContentInsertAction): boolean {
  const { at } = action;
  if (at.kind !== 'cells' || !work.env.tables) return false;
  const context = fragmentContext(work);
  const document = work.portable();
  const table = findBlock(document.blocks, at.table);
  if (table?.type !== 'table') return false;
  const prepared = prepareFragment(action.content, context);
  const edit = cellRangeInsertEdit(at.table, table, at.range, prepared.blocks, (blocks) =>
    cellParagraphs(blocks, context),
  );
  if (!edit || edit.selection === 'keep') return false;
  const blocks = document.blocks.map((block) => (block === table ? edit.table : block));
  if (!applyDocument(work, work.canonical({ blocks }))) return false;
  work.diagnostics.push(...prepared.diagnostics);
  return restoreSelection(work, edit.selection);
}

function insertContent(work: TiptapWork, action: TextEditorContentInsertAction): boolean {
  const { at } = action;
  if (at.kind === 'cells') return insertOverCells(work, action);
  const context = fragmentContext(work);
  if (at.kind === 'blocks') {
    // Over a block selection: the blocks, with fresh identifiers, replace the selected blocks.
    const result = replaceBlocksWithFragment(work.portable(), at.ids, action.content, context);
    if (!result || !applyDocument(work, result.document)) return false;
    work.diagnostics.push(...result.diagnostics);
    return restoreSelection(work, result.selection);
  }
  let range: { from: number; to: number } | null;
  if (atWholeDocument(work, at)) {
    // At the whole-document selection, the fragment lands at the caret of one empty paragraph.
    clearDocument(work);
    range = { from: 1, to: 1 };
  } else range = rangeOf(work, at);
  if (!range) return false;
  // A range across blocks goes by the shared range deletion, the fragment landing at its caret
  // (`uwg-te-req-content-7`).
  const across =
    range.from === range.to ? null : crossBlockRange(work.env, work.doc, range.from, range.to);
  if (across) {
    if (!deleteCrossBlockRange(work, across)) return false;
    range = { from: work.selection.from, to: work.selection.from };
  }
  const { tr } = work;
  if (range.from !== range.to) tr.delete(range.from, range.to);
  const point = work.pointAt(range.from);
  if (!point) return false;
  if (point.cell || inCell(tr.doc, range.from)) {
    const prepared = prepareFragment(action.content, context);
    const paragraphs = cellParagraphs(prepared.blocks, context).map((paragraph) =>
      work.schema.nodeFromJSON({
        type: NATIVE.paragraph,
        content: toTiptapInline(paragraph.content),
      }),
    );
    if (paragraphs.length === 0) return false;
    mergeParagraphs(work, range.from, paragraphs);
    work.diagnostics.push(...prepared.diagnostics);
    return true;
  }
  const result = insertFragmentAtPoint(
    work.portable(),
    { block: point.block, offset: point.offset },
    action.content,
    context,
  );
  if (!result || !applyDocument(work, result.document)) return false;
  work.diagnostics.push(...result.diagnostics);
  restoreSelection(work, result.selection);
  return true;
}

export const CONTENT_HANDLERS: TiptapActionHandlers = {
  'content.insert': insertContent,
};
