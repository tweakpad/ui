/**
 * Selections on Lexical (Widgets `uwg-te-req-engine-4`, `uwg-te-tab-actions` r6,
 * `uwg-te-req-engine-3`, `uwg-te-lis-up-i2`).
 *
 * A text or caret selection is a RangeSelection, a block selection a NodeSelection holding the
 * blocks' keys, a cell range the table's TableSelection. A programmatic caret takes the format
 * and colors of the text it continues, as a click there would, so typed text continues the run
 * and no stale stored format survives.
 */
import type {
  TextEditorCellRange,
  TextEditorSelection,
  TextEditorSelectionInput,
  TextEditorTextPoint,
} from '../../model.js';
import { NO_SELECTION } from '../../state.js';
import { blockTree } from '../shared/blocks.js';
import { normalizeBlockIds } from '../shared/selection-state.js';
import { caretSelection } from '../shared/structure-edits.js';
import { $seedCaret } from './caret.js';
import { $portableDocument } from './document.js';
import { $blockId, $holderById, $holders, $isHolder } from './ids.js';
import type { LexicalElementLike, LexicalNodeLike, LexicalRangeSelectionLike } from './modules.js';
import {
  $cellAddress,
  $lexicalPoint,
  $pointOfText,
  $tablePlacement,
  $textblockOf,
  $textblockLength,
  $textPointNear,
  $textPointOf,
  type LexicalPointSpec,
} from './points.js';
import type { LexicalRuntime } from './runtime.js';

/** The selection of the state being read, as the model reports it. */
export function $readSelection(rt: LexicalRuntime): TextEditorSelection {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (selection === null) return NO_SELECTION;
  const table = rt.modules.table;
  if (table && table.$isTableSelection(selection))
    return $readCells(rt, selection.anchor.getNode(), selection.focus.getNode()) ?? NO_SELECTION;
  if (lexical.$isRangeSelection(selection)) return $readRange(rt, selection);
  if (lexical.$isNodeSelection(selection)) {
    const selected = new Set(selection.getNodes().map((node) => node.getKey()));
    const held = $holders(rt)
      .filter((holder) => selected.has(holder.getKey()))
      .map((holder) => $blockId(rt, holder))
      .filter((id) => id !== '');
    // The topmost selected blocks in document order (the shared `normalizeBlockIds`).
    const ids = held.length > 0 ? $normalizedIds(rt, held) : null;
    return ids && ids.length > 0 ? Object.freeze({ kind: 'blocks', ids }) : NO_SELECTION;
  }
  return NO_SELECTION;
}

/**
 * A range selection as text points. An end outside text, such as an element point on the root
 * between blocks (a DOM range over the root's content), reads as the nearest text point inside the
 * range, as the other engine reads it; a range holding no text, and a collapsed selection outside
 * text, read as none.
 */
function $readRange(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): TextEditorSelection {
  let anchor = $textPointOf(rt, selection.anchor);
  let head = $textPointOf(rt, selection.focus);
  const empty = selection.isCollapsed();
  if (!empty && (!anchor || !head)) {
    const backward = selection.isBackward();
    anchor ??= $textPointNear(rt, selection.anchor, backward ? 'backward' : 'forward');
    head ??= $textPointNear(rt, selection.focus, backward ? 'forward' : 'backward');
    if (anchor && head && $textOrder(rt, backward ? head : anchor, backward ? anchor : head) > 0)
      return NO_SELECTION;
  }
  if (!anchor || !head) return NO_SELECTION;
  return Object.freeze({ kind: 'text', anchor, head, empty });
}

/**
 * The order of two text points in the document: negative, zero or positive as `a` comes before,
 * at or after `b`.
 */
function $textOrder(rt: LexicalRuntime, a: TextEditorTextPoint, b: TextEditorTextPoint): number {
  const blockA = $textblockOf(rt, a);
  const blockB = $textblockOf(rt, b);
  if (!blockA || !blockB) return 0;
  if (blockA.is(blockB)) return a.offset - b.offset;
  return blockA.isBefore(blockB) ? -1 : 1;
}

function $readCells(
  rt: LexicalRuntime,
  anchorNode: LexicalNodeLike,
  headNode: LexicalNodeLike,
): TextEditorSelection | null {
  const anchor = $cellAddress(rt, anchorNode);
  const head = $cellAddress(rt, headNode);
  if (!anchor || !head || !anchor.table.is(head.table)) return null;
  const id = $blockId(rt, anchor.table);
  if (id === '') return null;
  const range: TextEditorCellRange = Object.freeze({
    anchor: Object.freeze(anchor.cell),
    head: Object.freeze(head.cell),
  });
  return Object.freeze({ kind: 'cells', table: id, range });
}

/**
 * A RangeSelection between two Lexical points: a caret takes the format and colors of the text it
 * continues (`caret.ts`), a range the format of the text at its anchor.
 */
export function $selectPoints(
  rt: LexicalRuntime,
  anchor: LexicalPointSpec,
  focus: LexicalPointSpec,
): LexicalRangeSelectionLike {
  const { lexical } = rt;
  const selection = lexical.$createRangeSelection();
  selection.anchor.set(anchor.key, anchor.offset, anchor.type);
  selection.focus.set(focus.key, focus.offset, focus.type);
  lexical.$setSelection(selection);
  if (selection.isCollapsed()) $seedCaret(rt, selection);
  else {
    const node = lexical.$getNodeByKey(anchor.key);
    selection.format = lexical.$isTextNode(node) ? node.getFormat() : 0;
    selection.style = '';
  }
  return selection;
}

/** A caret at a text point. */
export function $selectText(
  rt: LexicalRuntime,
  anchor: TextEditorTextPoint,
  head: TextEditorTextPoint = anchor,
): boolean {
  const collapsed =
    anchor.block === head.block && anchor.offset === head.offset && sameCell(anchor, head);
  const from = $pointOfText(rt, anchor, collapsed ? 'backward' : 'forward');
  const to = collapsed ? from : $pointOfText(rt, head, 'backward');
  if (!from || !to) return false;
  $selectPoints(rt, from, to);
  return true;
}

const sameCell = (a: TextEditorTextPoint, b: TextEditorTextPoint): boolean =>
  a.cell === undefined
    ? b.cell === undefined
    : b.cell !== undefined &&
      a.cell.row === b.cell.row &&
      a.cell.column === b.cell.column &&
      a.cell.paragraph === b.cell.paragraph;

/** A caret at the start or end of a block, or of a cell of the table that `block` names. */
export function $selectCaret(
  rt: LexicalRuntime,
  block: string,
  position: 'start' | 'end',
  cell?: { row: number; column: number },
): boolean {
  if (cell) {
    const table = $holderById(rt, block);
    if (!table || !rt.isTable(table)) return false;
    const node = $tablePlacement(rt, table as LexicalElementLike).at(cell.row, cell.column);
    if (!node) return false;
    const paragraphs = node
      .getChildren()
      .filter((child) => rt.lexical.$isElementNode(child)) as LexicalElementLike[];
    const target = position === 'start' ? paragraphs[0] : paragraphs[paragraphs.length - 1];
    if (!target) return false;
    const offset = position === 'start' ? 0 : $textblockLength(rt, target);
    const point = $lexicalPoint(rt, target, offset);
    if (!point) return false;
    $selectPoints(rt, point, point);
    return true;
  }
  const holder = $holderById(rt, block);
  if (holder && rt.isTable(holder)) {
    // A table without a cell: the start of cell (0,0) or the end of its last cell in document
    // order (the shared `caretSelection`, `uwg-te-req-tables-1`).
    const edge = caretSelection($portableDocument(rt), block, position);
    return edge?.cell !== undefined && $selectCaret(rt, block, position, edge.cell);
  }
  const textblock = $textblockOf(rt, { block });
  if (!textblock) return false;
  const point = $lexicalPoint(
    rt,
    textblock,
    position === 'start' ? 0 : $textblockLength(rt, textblock),
  );
  if (!point) return false;
  $selectPoints(rt, point, point);
  return true;
}

/**
 * The identifiers a block selection holds and reports (`uwg-te-req-blocks-4`): the topmost of
 * `ids` in document order, a nested item of a listed item implied (the shared
 * `normalizeBlockIds`).
 */
function $normalizedIds(rt: LexicalRuntime, ids: readonly string[]): readonly string[] | null {
  return normalizeBlockIds(blockTree($portableDocument(rt), 0), ids);
}

/** A block selection: the holders of `ids`, normalized, all of which must exist. */
export function $selectBlocks(rt: LexicalRuntime, given: readonly string[]): boolean {
  if (given.length === 0 || given.some((id) => $holderById(rt, id) === null)) return false;
  const ids = $normalizedIds(rt, given);
  if (!ids) return false;
  const nodes = ids.map((id) => $holderById(rt, id));
  if (nodes.length === 0 || nodes.some((node) => node === null || !$isHolder(rt, node)))
    return false;
  const selection = rt.lexical.$createNodeSelection();
  for (const node of nodes) selection.add(node!.getKey());
  rt.lexical.$setSelection(selection);
  return true;
}

/** A cell range of a table, through the table module. */
export function $selectCells(
  rt: LexicalRuntime,
  table: string,
  range: TextEditorCellRange,
): boolean {
  const module = rt.modules.table;
  if (!module) return false;
  const node = $holderById(rt, table);
  if (!node || !rt.isTable(node)) return false;
  const placement = $tablePlacement(rt, node as LexicalElementLike);
  const anchor = placement.at(range.anchor.row, range.anchor.column);
  const head = placement.at(range.head.row, range.head.column);
  if (!anchor || !head) return false;
  rt.lexical.$setSelection(module.$createTableSelectionFrom(node, anchor, head));
  return true;
}

/** Sets a selection input; answers whether it named content of the document. */
export function $applySelection(rt: LexicalRuntime, input: TextEditorSelectionInput): boolean {
  switch (input.kind) {
    case 'text':
      return $selectText(rt, input.anchor, input.head ?? input.anchor);
    case 'caret':
      return $selectCaret(rt, input.block, input.position, input.cell);
    case 'blocks':
      return $selectBlocks(rt, input.ids);
    case 'cells':
      return $selectCells(rt, input.table, input.range);
  }
}

/** Whether a selection input names content of the document, without setting it. */
export function $selectionExists(rt: LexicalRuntime, input: TextEditorSelectionInput): boolean {
  switch (input.kind) {
    case 'text':
      return (
        $pointOfText(rt, input.anchor) !== null &&
        $pointOfText(rt, input.head ?? input.anchor) !== null
      );
    case 'caret': {
      if (input.cell) {
        const table = $holderById(rt, input.block);
        return (
          !!table &&
          rt.isTable(table) &&
          $tablePlacement(rt, table as LexicalElementLike).at(input.cell.row, input.cell.column) !==
            null
        );
      }
      const holder = $holderById(rt, input.block);
      return (
        (holder !== null && rt.isTable(holder)) || $textblockOf(rt, { block: input.block }) !== null
      );
    }
    case 'blocks':
      return input.ids.length > 0 && input.ids.every((id) => $holderById(rt, id) !== null);
    case 'cells': {
      if (!rt.modules.table) return false;
      const table = $holderById(rt, input.table);
      if (!table || !rt.isTable(table)) return false;
      const placement = $tablePlacement(rt, table as LexicalElementLike);
      return (
        placement.at(input.range.anchor.row, input.range.anchor.column) !== null &&
        placement.at(input.range.head.row, input.range.head.column) !== null
      );
    }
  }
}
