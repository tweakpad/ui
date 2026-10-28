/**
 * The portable fragment of a selection, which copy and cut write through the shared clipboard
 * serializers on every engine (Widgets `uwg-te-req-content-6`, `uwg-te-req-engine-4`,
 * `uwg-te-req-engine-11`).
 *
 * A text selection gives a text range: the blocks between its points, the first and last trimmed
 * to the selected text, list items nested as far as their parents are selected; a block selection
 * gives its blocks with their nested items; a cell range gives a table of its cells; a
 * whole-document selection gives every block as a text range (`selectionFragment`). The adapters
 * only read their selections; the payload's HTML and text come from `writeClipboardHtml` and
 * `writeText` (`clipboardPayload`).
 */
import {
  isListItem,
  outputBlocks,
  selectPortableBlocks,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableFragment,
  type TextEditorPortableTable,
  type TextEditorPortableTableRow,
} from '../../content/portable.js';
import { writeClipboardHtml } from '../../content/html.js';
import { writeText } from '../../content/text.js';
import type { TextEditorCellRange, TextEditorSelection, TextEditorTextPoint } from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { blockInline, findBlock, isTextblock, locatedBlocks, splitInline } from './blocks.js';
import { inlineAtCell } from './selection-state.js';
import { cellRangeRect, tableModel } from './tables.js';

type Block = TextEditorPortableBlock;

/** A block with the part of its text from `from` to `to`; nested items are kept as given. */
function withContent(block: Block, from: number, to: number): Block {
  const content = blockInline(block);
  if (content === null) return block;
  const part = splitInline(splitInline(content, to)[0], from)[1];
  if (block.type === 'code')
    return {
      ...block,
      text: part.map((node) => (node.type === 'text' ? node.text : '\n')).join(''),
    };
  return { ...block, content: part } as Block;
}

/** The blocks of `wanted` in document order, items nested under wanted parents only. */
function pick(blocks: readonly Block[], wanted: ReadonlySet<string>): Block[] {
  const picked: Block[] = [];
  for (const block of blocks) {
    const children = isListItem(block) ? pick(block.children, wanted) : [];
    if (block.id !== undefined && wanted.has(block.id))
      picked.push(isListItem(block) ? ({ ...block, children } as Block) : block);
    else picked.push(...children);
  }
  return picked;
}

/** Replaces the block with an identifier, at any depth. */
function replaceIn(blocks: readonly Block[], id: string, next: (block: Block) => Block): Block[] {
  return blocks.map((block) => {
    if (block.id === id) return next(block);
    return isListItem(block)
      ? ({ ...block, children: replaceIn(block.children, id, next) } as Block)
      : block;
  });
}

/**
 * The text range between two text points (in either order) as a fragment of kind `range`. Points
 * in one textblock give that block with the selected text; points in one paragraph of a table
 * cell give a paragraph; otherwise the blocks from the first point's block to the last point's
 * block, the outer two trimmed when they are textblocks (a table stays whole). `null` when a point
 * names no block of the document.
 */
export function rangeFragment(
  document: TextEditorPortableDocument,
  anchor: TextEditorTextPoint,
  head: TextEditorTextPoint,
): TextEditorPortableFragment | null {
  const located = locatedBlocks(document.blocks);
  const indexOf = (point: TextEditorTextPoint) =>
    located.findIndex(({ block }) => block.id === point.block);
  const a = indexOf(anchor);
  const h = indexOf(head);
  if (a < 0 || h < 0) return null;
  const forward = a !== h ? a < h : comparePoints(anchor, head) <= 0;
  const [start, end] = forward ? [anchor, head] : [head, anchor];
  const [first, last] = forward ? [a, h] : [h, a];
  if (first === last) {
    const block = located[first]!.block;
    if (block.type === 'table') {
      const cell = start.cell;
      const other = end.cell;
      if (
        cell &&
        other &&
        cell.row === other.row &&
        cell.column === other.column &&
        cell.paragraph === other.paragraph
      ) {
        const content = inlineAtCell(block, cell) ?? [];
        const part = splitInline(splitInline(content, end.offset)[0], start.offset)[1];
        return { kind: 'range', blocks: [{ type: 'paragraph', content: part }] };
      }
      return { kind: 'range', blocks: [block] };
    }
    const alone = isListItem(block) ? ({ ...block, children: [] } as Block) : block;
    return { kind: 'range', blocks: [withContent(alone, start.offset, end.offset)] };
  }
  const ids = new Set(
    located
      .slice(first, last + 1)
      .map(({ block }) => block.id)
      .filter((id): id is string => id !== undefined),
  );
  let blocks = pick(document.blocks, ids);
  const firstBlock = located[first]!.block;
  const lastBlock = located[last]!.block;
  if (isTextblock(firstBlock) && !start.cell)
    blocks = replaceIn(blocks, firstBlock.id!, (block) =>
      withContent(block, start.offset, Number.MAX_SAFE_INTEGER),
    );
  if (isTextblock(lastBlock) && !end.cell)
    blocks = replaceIn(blocks, lastBlock.id!, (block) => withContent(block, 0, end.offset));
  return { kind: 'range', blocks };
}

/** Orders two points of one block: by cell (row-major), paragraph and offset. */
function comparePoints(a: TextEditorTextPoint, b: TextEditorTextPoint): number {
  if (a.cell && b.cell) {
    if (a.cell.row !== b.cell.row) return a.cell.row - b.cell.row;
    if (a.cell.column !== b.cell.column) return a.cell.column - b.cell.column;
    if (a.cell.paragraph !== b.cell.paragraph) return a.cell.paragraph - b.cell.paragraph;
  }
  return a.offset - b.offset;
}

/** The blocks of a block selection, each with its nested items, as a fragment of kind `blocks`. */
export function blocksFragment(
  document: TextEditorPortableDocument,
  ids: readonly string[],
): TextEditorPortableFragment {
  return { kind: 'blocks', blocks: selectPortableBlocks(document, ids).blocks };
}

/**
 * The cells of a cell range as a table of their own, a fragment of kind `blocks`: the rectangle the
 * range covers, grown over merged cells, with the cells that start in it, their spans, alignment
 * and backgrounds; header flags only where the rectangle holds the table's first row or column;
 * the widths of its columns. `null` when the range lies outside the table.
 */
export function cellsFragment(
  table: TextEditorPortableTable & { readonly id: string },
  range: TextEditorCellRange,
): TextEditorPortableFragment | null {
  const rect = cellRangeRect(tableModel(table.id, table), range);
  if (!rect) return null;
  const grid = tableGrid(table);
  const rows: TextEditorPortableTableRow[] = [];
  for (let row = rect.top; row <= rect.bottom; row += 1)
    rows.push({
      cells: grid.cells
        .filter(
          (placed) =>
            placed.row === row && placed.column >= rect.left && placed.column <= rect.right,
        )
        .map((placed) => placed.cell),
    });
  const widths = table.widths?.slice(rect.left, rect.right + 1);
  const copy: TextEditorPortableTable = {
    type: 'table',
    headerRow: table.headerRow && rect.top === 0,
    headerColumn: table.headerColumn && rect.left === 0,
    ...(widths && widths.length > 0 ? { widths } : {}),
    rows,
  };
  return { kind: 'blocks', blocks: [copy] };
}

/** A whole-document selection as a text range of every block the formats write. */
export function documentFragment(document: TextEditorPortableDocument): TextEditorPortableFragment {
  return { kind: 'range', blocks: outputBlocks(document) };
}

/**
 * The fragment that copy and cut take from a selection: the whole document when `whole` (the
 * engine's select-all), else a text selection's range (nothing for a caret), a block selection's
 * blocks, or a cell range's cells; `null` without a selection or for a table that is not there.
 */
export function selectionFragment(
  document: TextEditorPortableDocument,
  selection: TextEditorSelection,
  whole: boolean,
): TextEditorPortableFragment | null {
  if (whole) return documentFragment(document);
  switch (selection.kind) {
    case 'text':
      return selection.empty ? null : rangeFragment(document, selection.anchor, selection.head);
    case 'blocks':
      return blocksFragment(document, selection.ids);
    case 'cells': {
      const table = findBlock(document.blocks, selection.table);
      return table?.type === 'table'
        ? cellsFragment({ ...table, id: selection.table }, selection.range)
        : null;
    }
    case 'none':
      return null;
  }
}

/** The two clipboard flavours that copy and cut write. */
export interface TextEditorClipboardPayload {
  /** `text/html`: the shared clipboard serializer, which records a text range or whole blocks. */
  readonly html: string;
  /** `text/plain`: the shared text serializer. */
  readonly text: string;
}

/**
 * The clipboard payload of a fragment, from the shared serializers and nothing else; `null` for no
 * fragment or one without blocks, which copies nothing.
 */
export function clipboardPayload(
  fragment: TextEditorPortableFragment | null,
  nodes: readonly TextEditorNodeDefinition[],
): TextEditorClipboardPayload | null {
  if (!fragment || fragment.blocks.length === 0) return null;
  return {
    html: writeClipboardHtml(fragment, { nodes }),
    text: writeText({ blocks: fragment.blocks }, { nodes }),
  };
}
