/**
 * Text points on Lexical (Widgets `uwg-te-req-engine-3`).
 *
 * A text point names a block and a UTF-16 offset into its own inline content, where a hard break
 * or an inline node counts one unit; text in a table cell names the table, the cell and the
 * paragraph. Lexical points name a node key and an offset: a text node and a character offset, or
 * an element and a child index. Engine points and keys never leave the adapter.
 */
import { tableGrid, type TextEditorPortableTable } from '../../content/portable.js';
import type {
  TextEditorCellAddress,
  TextEditorCellPoint,
  TextEditorTextPoint,
} from '../../model.js';
import { $blockId, $holderById, $isHolder } from './ids.js';
import type {
  LexicalElementLike,
  LexicalNodeLike,
  LexicalPointLike,
  LexicalTableCellLike,
} from './modules.js';
import type { TextEditorInlineUnit } from '../shared/state.js';
import type { LexicalRuntime } from './runtime.js';

/** A unit of inline content: a text node, or a line break or inline node that counts one. */
export interface LexicalInlineUnit {
  readonly node: LexicalNodeLike;
  readonly size: number;
  readonly text: boolean;
}

/** The inline units of a textblock in order, inline elements such as links flattened. */
export function $inlineUnits(rt: LexicalRuntime, block: LexicalElementLike): LexicalInlineUnit[] {
  const units: LexicalInlineUnit[] = [];
  const visit = (element: LexicalElementLike) => {
    for (const child of element.getChildren()) {
      if (rt.lexical.$isTextNode(child))
        units.push({ node: child, size: child.getTextContentSize(), text: true });
      else if (rt.lexical.$isElementNode(child) && child.isInline()) visit(child);
      else units.push({ node: child, size: 1, text: false });
    }
  };
  visit(block);
  return units;
}

/** The units of a textblock before an offset, as the shared state helpers read them. */
export function unitsBefore(
  units: readonly LexicalInlineUnit[],
  offset: number,
): TextEditorInlineUnit[] {
  const before: TextEditorInlineUnit[] = [];
  let position = 0;
  for (const unit of units) {
    if (position >= offset) break;
    if (unit.text)
      before.push({ type: 'text', text: unit.node.getTextContent().slice(0, offset - position) });
    else
      before.push(
        unit.node.getType() === 'linebreak' ? { type: 'hard-break' } : { type: 'custom' },
      );
    position += unit.size;
  }
  return before;
}

/** The length of a textblock's inline content in text-point units. */
export const $textblockLength = (rt: LexicalRuntime, block: LexicalElementLike): number =>
  $inlineUnits(rt, block).reduce((length, unit) => length + unit.size, 0);

/** A Lexical point as plain values. */
export interface LexicalPointSpec {
  readonly key: string;
  readonly offset: number;
  readonly type: 'text' | 'element';
}

/**
 * The Lexical point of an offset in a textblock. At a boundary between two text nodes, `backward`
 * takes the end of the earlier one, as a caret that continues the text before it, and `forward`
 * the start of the later one; a boundary next to a line break or inline node is an element point.
 */
export function $lexicalPoint(
  rt: LexicalRuntime,
  block: LexicalElementLike,
  offset: number,
  bias: 'backward' | 'forward' = 'backward',
): LexicalPointSpec | null {
  const units = $inlineUnits(rt, block);
  const total = units.reduce((length, unit) => length + unit.size, 0);
  if (!Number.isInteger(offset) || offset < 0 || offset > total) return null;
  if (units.length === 0) return { key: block.getKey(), offset: 0, type: 'element' };
  let position = 0;
  for (let index = 0; index < units.length; index += 1) {
    const unit = units[index]!;
    const end = position + unit.size;
    if (unit.text) {
      const text = (at: number): LexicalPointSpec => ({
        key: unit.node.getKey(),
        offset: at,
        type: 'text',
      });
      if (offset > position && offset < end) return text(offset - position);
      if (offset === position && !(bias === 'backward' && index > 0 && units[index - 1]!.text))
        return text(0);
      if (offset === end) {
        const next = units[index + 1];
        if (bias === 'backward' || !next || !next.text) return text(unit.size);
      }
    } else if (offset === position) {
      return elementPointBefore(unit.node);
    }
    position = end;
  }
  return elementPointAfter(units[units.length - 1]!.node);
}

function elementPointBefore(node: LexicalNodeLike): LexicalPointSpec {
  const parent = node.getParent()!;
  return { key: parent.getKey(), offset: node.getIndexWithinParent(), type: 'element' };
}

function elementPointAfter(node: LexicalNodeLike): LexicalPointSpec {
  const parent = node.getParent()!;
  return { key: parent.getKey(), offset: node.getIndexWithinParent() + 1, type: 'element' };
}

/** The offset in a textblock of a Lexical point inside it, or `null`. */
export function $offsetIn(
  rt: LexicalRuntime,
  block: LexicalElementLike,
  point: LexicalPointLike,
): number | null {
  const units = $inlineUnits(rt, block);
  let position = 0;
  if (point.type === 'text') {
    for (const unit of units) {
      if (unit.node.getKey() === point.key) return position + Math.min(point.offset, unit.size);
      position += unit.size;
    }
    return null;
  }
  // An element point: the units before the child at the offset, or before the element's end.
  const element = rt.lexical.$getNodeByKey(point.key);
  if (!element || !rt.lexical.$isElementNode(element)) return null;
  if (!element.is(block) && !isInside(element, block)) return null;
  const stop = element.getChildAtIndex(point.offset);
  for (const unit of units) {
    const before = stop
      ? unit.node.isBefore(stop) && !(rt.lexical.$isElementNode(stop) && isInside(unit.node, stop))
      : element.is(block) || isInside(unit.node, element) || unit.node.isBefore(element);
    if (!before) return position;
    position += unit.size;
  }
  return position;
}

function isInside(node: LexicalNodeLike, ancestor: LexicalElementLike): boolean {
  let current = node.getParent();
  while (current) {
    if (current.is(ancestor)) return true;
    current = current.getParent();
  }
  return false;
}

// Tables

/** The placement of a table's cell nodes: each cell's address, and the cell at each position. */
export interface LexicalTablePlacement {
  readonly cells: readonly {
    readonly node: LexicalTableCellLike;
    readonly row: number;
    readonly column: number;
  }[];
  readonly rows: number;
  readonly columns: number;
  /** The cell node covering a position, or `null`. */
  at(row: number, column: number): LexicalTableCellLike | null;
}

/** The placement of the cells of a table node, as the portable grid places them. */
export function $tablePlacement(
  rt: LexicalRuntime,
  table: LexicalElementLike,
): LexicalTablePlacement {
  const nodes: LexicalTableCellLike[][] = table
    .getChildren()
    .filter((row) => rt.isTableRow(row))
    .map(
      (row) =>
        (row as LexicalElementLike)
          .getChildren()
          .filter((cell) => rt.isTableCell(cell)) as LexicalTableCellLike[],
    );
  const shape: TextEditorPortableTable = {
    type: 'table',
    headerRow: false,
    headerColumn: false,
    rows: nodes.map((cells) => ({
      cells: cells.map((cell) => ({
        rowSpan: cell.getRowSpan(),
        colSpan: cell.getColSpan(),
        paragraphs: [],
      })),
    })),
  };
  const grid = tableGrid(shape);
  const flat = nodes.flat();
  const cells = grid.cells.map((placed, index) => ({
    node: flat[index]!,
    row: placed.row,
    column: placed.column,
  }));
  return {
    cells,
    rows: grid.rows,
    columns: grid.columns,
    at: (row, column) => {
      const index = grid.grid[row]?.[column];
      return index === undefined || index < 0 ? null : (cells[index]?.node ?? null);
    },
  };
}

/** The address of a cell node: the first row and column of its span. */
export function $cellAddress(
  rt: LexicalRuntime,
  cell: LexicalNodeLike,
): { table: LexicalElementLike; cell: TextEditorCellAddress } | null {
  const row = cell.getParent();
  const table = row?.getParent() ?? null;
  if (!table || !rt.isTable(table)) return null;
  const placed = $tablePlacement(rt, table).cells.find((entry) => entry.node.is(cell));
  return placed ? { table, cell: { row: placed.row, column: placed.column } } : null;
}

// Text points

/** The textblock a text point names: a block's own element, or a paragraph of a table cell. */
export function $textblockOf(
  rt: LexicalRuntime,
  point: {
    readonly block: string;
    readonly cell?: TextEditorCellAddress | TextEditorCellPoint | undefined;
  },
): LexicalElementLike | null {
  const holder = $holderById(rt, point.block);
  if (!holder || !rt.lexical.$isElementNode(holder)) return null;
  if (point.cell) {
    if (!rt.isTable(holder)) return null;
    const cell = $tablePlacement(rt, holder).at(point.cell.row, point.cell.column);
    if (!cell) return null;
    const paragraph = cell.getChildAtIndex('paragraph' in point.cell ? point.cell.paragraph : 0);
    return paragraph && rt.lexical.$isElementNode(paragraph) ? paragraph : null;
  }
  if (rt.isTable(holder) || !isTextHolder(rt, holder)) return null;
  return holder;
}

/** Whether a holder holds text: its children are inline. */
function isTextHolder(rt: LexicalRuntime, holder: LexicalElementLike): boolean {
  return holder
    .getChildren()
    .every(
      (child) =>
        child.isInline() || rt.lexical.$isTextNode(child) || rt.lexical.$isLineBreakNode(child),
    );
}

/** A textblock with the address of its block. */
type LexicalTextblock = {
  block: LexicalElementLike;
  address: { block: string; cell?: TextEditorCellPoint };
};

/** The textblock that holds a Lexical point, with the address of its block. */
export function $textblockAt(rt: LexicalRuntime, point: LexicalPointLike): LexicalTextblock | null {
  let node: LexicalNodeLike | null = point.getNode();
  if (point.type === 'element' && rt.lexical.$isElementNode(node) && !node.isInline()) {
    // An element point on a block: the block itself when it holds text.
  } else {
    while (node && rt.lexical.$isElementNode(node) === false) node = node.getParent();
    while (node && (node as LexicalElementLike).isInline()) node = node.getParent();
  }
  return $textblockOfNode(rt, node);
}

/** A block element node as a textblock: a paragraph of a table cell, or a block holding text. */
function $textblockOfNode(
  rt: LexicalRuntime,
  node: LexicalNodeLike | null,
): LexicalTextblock | null {
  if (!node || !rt.lexical.$isElementNode(node) || node.isInline()) return null;
  const parent = node.getParent();
  if (parent && rt.isTableCell(parent)) {
    const address = $cellAddress(rt, parent);
    if (!address) return null;
    const id = $blockId(rt, address.table);
    if (id === '') return null;
    // Frozen where it is built, as every part of the state is (`uwg-te-req-engine-4`).
    return {
      block: node,
      address: {
        block: id,
        cell: Object.freeze({ ...address.cell, paragraph: node.getIndexWithinParent() }),
      },
    };
  }
  if (!$isHolder(rt, node) || rt.isTable(node) || !isTextHolder(rt, node)) return null;
  const id = $blockId(rt, node);
  return id === '' ? null : { block: node, address: { block: id } };
}

/**
 * The text point nearest to a Lexical point that lies outside text, such as an element point on
 * the root between blocks, toward the inside of a range (`uwg-te-req-engine-4`): the start of the
 * first textblock at or after it (`forward`, for the start of a range) or the end of the last
 * textblock before it (`backward`, for its end); `null` when there is none. Every node is visited
 * in document order, which only such a point needs.
 */
export function $textPointNear(
  rt: LexicalRuntime,
  point: LexicalPointLike,
  direction: 'forward' | 'backward',
): TextEditorTextPoint | null {
  const { lexical } = rt;
  const element = point.getNode();
  if (point.type !== 'element' || !lexical.$isElementNode(element)) return null;
  const before = element.getChildAtIndex(point.offset);
  // The textblocks in document order, and how many of them come before the point.
  const textblocks: LexicalTextblock[] = [];
  let at = -1;
  const visit = (node: LexicalNodeLike) => {
    if (before?.is(node)) at = textblocks.length;
    const textblock = $textblockOfNode(rt, node);
    if (textblock) textblocks.push(textblock);
    else if (lexical.$isElementNode(node)) for (const child of node.getChildren()) visit(child);
    if (!before && node.is(element)) at = textblocks.length;
  };
  visit(lexical.$getRoot());
  if (at < 0) return null;
  const found = direction === 'forward' ? textblocks[at] : textblocks[at - 1];
  if (!found) return null;
  const offset = direction === 'forward' ? 0 : $textblockLength(rt, found.block);
  return Object.freeze({ ...found.address, offset });
}

/** The text point of a Lexical point, or `null` outside text. */
export function $textPointOf(
  rt: LexicalRuntime,
  point: LexicalPointLike,
): TextEditorTextPoint | null {
  const found = $textblockAt(rt, point);
  if (!found) return null;
  const offset = $offsetIn(rt, found.block, point);
  if (offset === null) return null;
  return Object.freeze({ ...found.address, offset });
}

/** The Lexical point of a text point, or `null` when it names no text. */
export function $pointOfText(
  rt: LexicalRuntime,
  point: TextEditorTextPoint,
  bias: 'backward' | 'forward' = 'backward',
): LexicalPointSpec | null {
  const block = $textblockOf(rt, point);
  return block ? $lexicalPoint(rt, block, point.offset, bias) : null;
}
