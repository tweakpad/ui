/**
 * Text edges of portable blocks (Widgets `uwg-te-req-engine-3`, `uwg-te-req-engine-4`): the length of
 * inline content in text-point units, the inline content of a textblock, and the first or last text
 * point of a block, of a table's edge cell or of a run of blocks, so that every engine and the
 * controller agree on where a document's text starts and ends. Engine-free.
 */
import {
  tableGrid,
  textToInline,
  type TextEditorPortableBlock,
  type TextEditorPortableInline,
  type TextEditorPortablePlacedCell,
  type TextEditorPortableTable,
} from './portable.js';
import { segmenter } from '../../text-split/segment.js';
import type { TextEditorCellAddress, TextEditorTextPoint } from '../model.js';

/** The length of one inline node in text-point units: a hard break or an inline node counts one. */
export const inlineUnitLength = (node: TextEditorPortableInline): number =>
  node.type === 'text' ? node.text.length : 1;

/** The length of inline content in text-point units: a hard break or an inline node counts one. */
export const inlineLength = (content: readonly TextEditorPortableInline[]): number =>
  content.reduce((length, node) => length + inlineUnitLength(node), 0);

/**
 * The inline content of a textblock: that of a paragraph, heading, quote, list item or custom
 * textblock, and a code block's text as text and hard breaks, one per line feed; `null` for an
 * atom or a table. Text points count offsets in this content.
 */
export function blockInline(
  block: TextEditorPortableBlock,
): readonly TextEditorPortableInline[] | null {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
    case 'list-bullet':
    case 'list-ordered':
    case 'list-task':
      return block.content;
    case 'code':
      return textToInline(block.text);
    case 'custom':
      return block.content ?? null;
    default:
      return null;
  }
}

/**
 * The cell of a portable table that starts at a row and column, with its span; `undefined` where
 * no cell starts, such as a position that a span covers or one outside the grid.
 */
export function placedCell(
  table: TextEditorPortableTable,
  row: number,
  column: number,
): TextEditorPortablePlacedCell | undefined {
  return tableGrid(table).cells.find((cell) => cell.row === row && cell.column === column);
}

/**
 * The first (`start`) or last (`end`) text point of the cell of a portable table that starts at a
 * row and column: the start of its first paragraph or the end of its last, with `id` as the
 * point's block; `null` where no cell starts.
 */
export function cellTextEdge(
  id: string,
  table: TextEditorPortableTable,
  cell: TextEditorCellAddress,
  side: 'start' | 'end',
): TextEditorTextPoint | null {
  const placed = placedCell(table, cell.row, cell.column);
  if (!placed) return null;
  const { paragraphs } = placed.cell;
  const paragraph = side === 'start' ? 0 : Math.max(0, paragraphs.length - 1);
  const content = paragraphs[paragraph]?.content ?? [];
  return {
    block: id,
    cell: { row: placed.row, column: placed.column, paragraph },
    offset: side === 'start' ? 0 : inlineLength(content),
  };
}

/**
 * The first (`start`) or last (`end`) text point of a block: the start or end of a textblock's
 * text, or of the first paragraph of a table's first cell, cell (0,0), or the last paragraph of
 * its last cell in document order (`uwg-te-req-tables-1`); `null` for a block that
 * holds no text, such as a divider or an image, which is never selected implicitly.
 */
export function blockTextEdge(
  block: TextEditorPortableBlock,
  side: 'start' | 'end',
): TextEditorTextPoint | null {
  if (!block.id) return null;
  if (block.type === 'table') {
    const { cells } = tableGrid(block);
    const cell = side === 'start' ? cells[0] : cells[cells.length - 1];
    return cell ? cellTextEdge(block.id, block, cell, side) : null;
  }
  const content = blockInline(block);
  if (content === null) return null;
  return { block: block.id, offset: side === 'start' ? 0 : inlineLength(content) };
}

/**
 * The first text point of the first block that holds text, `blocks` in document order, nested
 * items included, or the last text point of the last such block for `end` (`blocks` then in
 * reverse document order). Each block is mapped only when it is reached, so an adapter maps the
 * few blocks at the edges. The start point is where `focus()` places the caret without an earlier
 * selection (`uwg-te-req-engine-4`): a leading table gives the start of cell (0,0), and a leading atom
 * is skipped, never block-selected.
 */
export function firstTextEdge(
  blocks: Iterable<TextEditorPortableBlock>,
  side: 'start' | 'end',
): TextEditorTextPoint | null {
  for (const block of blocks) {
    const edge = blockTextEdge(block, side);
    if (edge) return edge;
  }
  return null;
}

/** A direction in document order. */
export type TextEditorStepDirection = 'forward' | 'backward';

/** The UTF-16 length of the code point at an offset (`forward`) or before it (`backward`). */
function codePointStep(text: string, offset: number, direction: TextEditorStepDirection): number {
  const high = (code: number) => code >= 0xd800 && code <= 0xdbff;
  const low = (code: number) => code >= 0xdc00 && code <= 0xdfff;
  if (direction === 'forward')
    return high(text.charCodeAt(offset)) && low(text.charCodeAt(offset + 1)) ? 2 : 1;
  return low(text.charCodeAt(offset - 1)) && high(text.charCodeAt(offset - 2)) ? 2 : 1;
}

/**
 * The offset one user-perceived character from an offset of a text, forward or backward: the
 * next or previous grapheme boundary where the host segments text, else a whole code point, so
 * that a surrogate pair is never split; `null` at the text's end (`forward`) or start (`backward`).
 */
export function textStep(
  text: string,
  offset: number,
  direction: TextEditorStepDirection,
): number | null {
  if (direction === 'forward' ? offset >= text.length : offset <= 0) return null;
  const graphemes = segmenter('grapheme', undefined);
  if (!graphemes) {
    const step = codePointStep(text, offset, direction);
    return direction === 'forward' ? offset + step : offset - step;
  }
  let boundary = 0;
  for (const { segment } of graphemes.segment(text)) {
    const next = boundary + segment.length;
    if (direction === 'forward' ? next > offset : next >= offset) {
      return direction === 'forward' ? next : boundary;
    }
    boundary = next;
  }
  return direction === 'forward' ? text.length : boundary;
}

/**
 * The offset one character from an offset of inline content, forward or backward, in text-point
 * units: a grapheme of a text node (`textStep`), or a whole hard break or inline node; `null` at
 * the content's end (`forward`) or start (`backward`).
 */
export function inlineStep(
  content: readonly TextEditorPortableInline[],
  offset: number,
  direction: TextEditorStepDirection,
): number | null {
  let start = 0;
  for (const node of content) {
    const end = start + inlineUnitLength(node);
    const inside =
      direction === 'forward' ? offset >= start && offset < end : offset > start && offset <= end;
    if (inside) {
      if (node.type !== 'text') return direction === 'forward' ? end : start;
      const step = textStep(node.text, offset - start, direction);
      return step === null ? null : start + step;
    }
    start = end;
  }
  return null;
}

/**
 * The text point one character from a text point of a block, forward or backward (`inlineStep`),
 * staying in the point's textblock or table cell: at a cell paragraph's edge it moves to the
 * adjacent paragraph of the same cell. `null` at the edge of the textblock or of the cell, or for
 * a point that the block does not hold.
 */
export function stepTextPoint(
  block: TextEditorPortableBlock,
  point: TextEditorTextPoint,
  direction: TextEditorStepDirection,
): TextEditorTextPoint | null {
  if (!point.cell) {
    const content = blockInline(block);
    const offset = content ? inlineStep(content, point.offset, direction) : null;
    return offset === null ? null : { block: point.block, offset };
  }
  if (block.type !== 'table') return null;
  const { row, column, paragraph } = point.cell;
  const paragraphs = placedCell(block, row, column)?.cell.paragraphs;
  const content = paragraphs?.[paragraph]?.content;
  if (!paragraphs || !content) return null;
  const offset = inlineStep(content, point.offset, direction);
  if (offset !== null) return { block: point.block, cell: point.cell, offset };
  const adjacent = direction === 'forward' ? paragraph + 1 : paragraph - 1;
  const next = paragraphs[adjacent];
  if (!next) return null;
  return {
    block: point.block,
    cell: { row, column, paragraph: adjacent },
    offset: direction === 'forward' ? 0 : inlineLength(next.content),
  };
}
