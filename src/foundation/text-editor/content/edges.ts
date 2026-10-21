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
