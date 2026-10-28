/**
 * Selection-dependent parts of the normalized state, for every engine adapter (Widgets
 * `uwg-te-req-engine-4`, `uwg-te-tab-engine` r3, `uwg-te-req-blocks-1`).
 *
 * Pure rules over portable blocks and model selections, so that both engines report the same
 * block at the selection head, the same link and table at the selection, the same first and last
 * text points of a whole-document selection, tell the whole-document selection alike however it was
 * made, select the same cell range by Shift with an arrow key, move a caret from cell to cell by
 * ArrowUp and ArrowDown alike, keep it where it is when such a key would leave a table that nothing
 * lies beyond, and refuse the same mark actions in code. The adapters read the selection and the
 * portable form of the few blocks involved from their engines and pass them here; nothing reads the
 * whole document per keystroke.
 */
import {
  isListItem,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
  type TextEditorPortableMarks,
  type TextEditorPortableTable,
} from '../../content/portable.js';
import type { TextEditorActionType } from '../../actions.js';
import type {
  TextEditorBlockTree,
  TextEditorCellAddress,
  TextEditorCellPoint,
  TextEditorCellRange,
  TextEditorCellSelection,
  TextEditorLinkState,
  TextEditorSelection,
  TextEditorTableModel,
  TextEditorTableState,
  TextEditorTextPoint,
  TextEditorTextRange,
  TextEditorToggleMark,
} from '../../model.js';
import { blockInline, comparePaths, inlineLength, locatedBlocks } from './blocks.js';
import {
  cellRangeRect,
  cellsInRect,
  cellStepOfKey,
  extendCellRange,
  placedCell,
  tableModel,
  verticalCellCaret,
  type TextEditorCellStep,
} from './tables.js';

export { blockTextEdge, firstTextEdge } from '../../content/edges.js';

// A cleared selection (uwg-te-req-surfaces-6)

/** The keys that leave a cleared selection unplaced: Escape, Tab, a lone modifier and composition. */
const KEEPS_CLEARED: ReadonlySet<string> = new Set([
  'Escape',
  'Tab',
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'CapsLock',
]);

/**
 * Whether a key places a cleared selection before the engine handles it: every key but Escape,
 * Tab, a lone modifier and one of a composition. Browsers put a caret of their own at the start of
 * a focused editing root that holds no selection when a key arrives, so a key that does not place
 * the selection leaves it cleared whatever the DOM selection then is.
 */
export function placesClearedSelection(event: Pick<KeyboardEvent, 'key' | 'isComposing'>): boolean {
  return !event.isComposing && !KEEPS_CLEARED.has(event.key);
}

// The block at the selection head

/**
 * The identifier of the block at the selection (`state.block`): the block of a text selection's
 * head (the table for text in a cell), the table of a cell range, the first block of a block
 * selection (`uwg-te-tab-engine` r7; its identifiers normalized by `normalizeBlockIds`), or `null`
 * without a selection.
 */
export function headBlockId(selection: TextEditorSelection): string | null {
  switch (selection.kind) {
    case 'text':
      return selection.head.block;
    case 'cells':
      return selection.table;
    case 'blocks':
      return selection.ids[0] ?? null;
    default:
      return null;
  }
}

/**
 * The identifiers a block selection reports and holds (`uwg-te-req-blocks-1`): the topmost of
 * `ids` in document order, an identifier inside another listed list item's subtree left out (its
 * nested items are implied, not listed), duplicates once. `null` when one names no block of `tree`.
 */
export function normalizeBlockIds(
  tree: Pick<TextEditorBlockTree, 'get'>,
  ids: readonly string[],
): readonly string[] | null {
  const listed = new Set<string>();
  for (const id of ids) {
    if (!tree.get(id)) return null;
    listed.add(id);
  }
  /** The indices from the top level down to a block, which order blocks in document order. */
  const pathOf = (id: string): number[] => {
    const path: number[] = [];
    for (
      let block = tree.get(id);
      block;
      block = block.parentId ? tree.get(block.parentId) : undefined
    )
      path.unshift(block.index);
    return path;
  };
  const insideListed = (id: string): boolean => {
    for (
      let parent = tree.get(id)?.parentId ?? null;
      parent;
      parent = tree.get(parent)?.parentId ?? null
    )
      if (listed.has(parent)) return true;
    return false;
  };
  const kept = [...listed]
    .filter((id) => !insideListed(id))
    .map((id) => ({ id, path: pathOf(id) }));
  kept.sort((a, b) => comparePaths(a.path, b.path));
  return Object.freeze(kept.map(({ id }) => id));
}

// Links

/** A run of text that links to one destination, in text-point offsets of its textblock. */
export interface TextEditorLinkRun {
  readonly href: string;
  readonly from: number;
  readonly to: number;
}

/** The link runs of inline content: adjacent text with one destination, in order. */
export function linkRuns(
  content: readonly TextEditorPortableInline[],
): readonly TextEditorLinkRun[] {
  const runs: TextEditorLinkRun[] = [];
  let offset = 0;
  for (const node of content) {
    const href = node.type === 'text' ? node.marks?.link : undefined;
    const size = node.type === 'text' ? node.text.length : 1;
    const last = runs[runs.length - 1];
    if (href !== undefined) {
      if (last && last.href === href && last.to === offset)
        runs[runs.length - 1] = { href, from: last.from, to: offset + size };
      else runs.push({ href, from: offset, to: offset + size });
    }
    offset += size;
  }
  return runs;
}

/**
 * The link at a selection within one textblock (`from <= to`): the run that holds the selected
 * text, or for a caret the run the caret touches, at either edge included, the run after the
 * caret first where two runs meet. `null` when no run holds it.
 */
export function linkRunAt(
  content: readonly TextEditorPortableInline[],
  from: number,
  to: number,
): TextEditorLinkRun | null {
  const runs = linkRuns(content);
  if (from === to) {
    return (
      runs.find((run) => run.from <= from && from < run.to) ??
      runs.find((run) => run.to === from) ??
      null
    );
  }
  return runs.find((run) => run.from <= from && to <= run.to) ?? null;
}

/** The inline content of a textblock, or of a paragraph of a table cell; `null` for none. */
export type TextEditorInlineAt = (
  block: string,
  cell: TextEditorCellPoint | undefined,
) => readonly TextEditorPortableInline[] | null;

/**
 * The inline content at a text point of a block: a textblock's content (`blockInline`) without
 * `cell`, or with `cell` the content of that paragraph of the cell that starts at its row and
 * column in a table; `null` for anything else.
 */
export function inlineAtCell(
  block: TextEditorPortableBlock,
  cell: TextEditorCellPoint | undefined,
): readonly TextEditorPortableInline[] | null {
  if (!cell) return blockInline(block);
  if (block.type !== 'table') return null;
  return placedCell(block, cell.row, cell.column)?.cell.paragraphs[cell.paragraph]?.content ?? null;
}

/**
 * The link at the selection (`state.link`) and the link that `link.set` and `link.unset` act on at
 * a caret (`uwg-te-tab-actions` r1): for a text selection within one textblock or one cell
 * paragraph, the `linkRunAt` run of its content, edges included, with the run's range; `null` for
 * any other selection, a code block (its content holds no link) or no run.
 */
export function linkAtSelection(
  selection: TextEditorSelection,
  contentAt: TextEditorInlineAt,
): TextEditorLinkState | null {
  if (selection.kind !== 'text') return null;
  const { anchor, head } = selection;
  const sameCell =
    anchor.cell === undefined
      ? head.cell === undefined
      : head.cell !== undefined &&
        anchor.cell.row === head.cell.row &&
        anchor.cell.column === head.cell.column &&
        anchor.cell.paragraph === head.cell.paragraph;
  if (anchor.block !== head.block || !sameCell) return null;
  const content = contentAt(head.block, head.cell);
  if (!content) return null;
  const run = linkRunAt(
    content,
    Math.min(anchor.offset, head.offset),
    Math.max(anchor.offset, head.offset),
  );
  if (!run) return null;
  return {
    href: run.href,
    range: {
      block: head.block,
      ...(head.cell ? { cell: { ...head.cell } } : {}),
      from: run.from,
      to: run.to,
    },
  };
}

// Tables

/** The cell of the model covering a position, or `null` outside the grid. */
function coveringCell(model: TextEditorTableModel, address: TextEditorCellAddress) {
  const index = model.grid[address.row]?.[address.column];
  return index === undefined || index < 0 ? null : (model.cells[index] ?? null);
}

/**
 * The table at the selection: the cell holding the selection head (the first row and column of
 * its span), the cell range or `null` for text in one cell, the size, the header flags and
 * whether the table or the head's cell is merged. `null` when the head lies outside the grid.
 */
export function tableState(
  model: TextEditorTableModel,
  head: TextEditorCellAddress,
  range: TextEditorCellRange | null,
): TextEditorTableState | null {
  const cell = coveringCell(model, head);
  if (!cell) return null;
  return {
    id: model.id,
    cell: { row: cell.row, column: cell.column },
    range: range ? { anchor: { ...range.anchor }, head: { ...range.head } } : null,
    rows: model.rows,
    columns: model.columns,
    headerRow: model.headerRow,
    headerColumn: model.headerColumn,
    merged: model.merged,
    cellMerged: cell.rowSpan > 1 || cell.colSpan > 1,
  };
}

/** What the cell range of Shift with an arrow key reads from a mount. */
export interface TextEditorCellKeyInput {
  /** The selection that the state reports. */
  readonly selection: TextEditorSelection;
  /** The arrow key pressed with Shift, by its `KeyboardEvent.key`. */
  readonly key: string;
  /** The portable table of a table identifier, or `null`. */
  readonly table: (id: string) => TextEditorPortableTable | null;
  /** Whether a table lays out its columns from right to left. */
  readonly rtl: (table: string) => boolean;
  /** Whether a text point lies on the first or the last line of its paragraph, as laid out. */
  readonly onEdgeLine: (point: TextEditorTextPoint, side: 'first' | 'last') => boolean;
}

/**
 * Whether a text point in a table cell lies at the cell's edge in a step's direction: at the end
 * of its last paragraph going forward, at the start of its first going backward, on the last line
 * of its last paragraph going down and on the first line of its first going up.
 */
function atCellEdge(
  table: TextEditorPortableTable,
  point: TextEditorTextPoint & { readonly cell: TextEditorCellPoint },
  step: TextEditorCellStep,
  onEdgeLine: TextEditorCellKeyInput['onEdgeLine'],
): boolean {
  const { cell } = point;
  const count = placedCell(table, cell.row, cell.column)?.cell.paragraphs.length ?? 0;
  if (count === 0) return false;
  const first = cell.paragraph === 0;
  const last = cell.paragraph === count - 1;
  switch (step) {
    case 'forward':
      return last && point.offset >= inlineLength(inlineAtCell(table, cell) ?? []);
    case 'backward':
      return first && point.offset === 0;
    case 'down':
      return last && onEdgeLine(point, 'last');
    case 'up':
      return first && onEdgeLine(point, 'first');
  }
}

/**
 * The cell range that Shift with an arrow key selects (`uwg-te-req-tables-5`), one rule for every
 * engine. Over a cell range it is the range after one step of the grid rule (`extendCellRange`),
 * kept at the table's edge. From a text selection within one cell whose head lies at the cell's
 * edge in the key's direction, at the end of its last paragraph going forward, at the start of its
 * first going backward, on the last line of its last paragraph going down or on the first line of
 * its first going up, it is that step from the cell alone, so a step at the table's edge selects
 * the cell. `null` for any other selection or key: the key then moves or extends within the text
 * as the engine does. The range selects the cells of its grown rectangle (`tableTargetCells`).
 */
export function cellRangeKey(input: TextEditorCellKeyInput): TextEditorCellSelection | null {
  const { selection } = input;
  let id: string;
  let range: TextEditorCellRange;
  let caret: (TextEditorTextPoint & { readonly cell: TextEditorCellPoint }) | null = null;
  if (selection.kind === 'cells') ({ table: id, range } = selection);
  else if (selection.kind === 'text') {
    const { anchor, head } = selection;
    if (!anchor.cell || !head.cell || anchor.block !== head.block) return null;
    if (anchor.cell.row !== head.cell.row || anchor.cell.column !== head.cell.column) return null;
    id = head.block;
    caret = { ...head, cell: head.cell };
    range = { anchor: head.cell, head: head.cell };
  } else return null;
  const table = input.table(id);
  const step = table ? cellStepOfKey(input.key, input.rtl(id)) : null;
  if (!table || !step) return null;
  if (caret && !atCellEdge(table, caret, step, input.onEdgeLine)) return null;
  const next = extendCellRange(tableModel(id, table), range, step);
  return next ? Object.freeze({ kind: 'cells', table: id, range: next }) : null;
}

/**
 * The caret that plain ArrowUp or ArrowDown places in another cell (`uwg-te-req-engine-9`), one
 * rule for every engine: from a caret on the first line of a cell's first paragraph (ArrowUp) or
 * on the last line of its last paragraph (ArrowDown), with a row beyond the cell's span, the end
 * of the last paragraph of the cell above or the start of the first paragraph of the cell below
 * (`verticalCellCaret`). `null` for any other selection or key, and for a caret that the key moves
 * within its cell or out of the table's first or last row: the engine then moves it, out of the
 * table by the same rule, or it stays where no block lies beyond the table (`cellCaretStays`). The
 * caller passes only keys without modifiers; with Shift the arrow keys select cells
 * (`cellRangeKey`). The line is read last, only for a caret that would move.
 */
export function cellCaretKey(
  input: Omit<TextEditorCellKeyInput, 'rtl'>,
): TextEditorTextPoint | null {
  const vertical = verticalCellKey(input);
  if (!vertical) return null;
  const { caret, step, table } = vertical;
  const target = verticalCellCaret(caret.block, table, caret.cell, step);
  if (!target) return null;
  return atCellEdge(table, caret, step, input.onEdgeLine) ? target : null;
}

/**
 * The table that plain ArrowUp or ArrowDown leaves (`uwg-te-req-tables-7`): from a caret on the
 * first line of a cell's first paragraph (ArrowUp) or on the last line of its last paragraph
 * (ArrowDown) with no row beyond the cell's span, so from every cell whose span starts on the
 * table's first row or ends on its last, a cell spanning several rows included. The key then moves
 * the caret out of the table as `uwg-te-req-engine-9` requires. `null` for any other selection or
 * key, and for a caret that `cellCaretKey` moves into another cell. The line is read last.
 */
export function cellCaretExit(input: Omit<TextEditorCellKeyInput, 'rtl'>): string | null {
  const vertical = verticalCellKey(input);
  if (!vertical) return null;
  const { caret, step, table } = vertical;
  if (verticalCellCaret(caret.block, table, caret.cell, step)) return null;
  return atCellEdge(table, caret, step, input.onEdgeLine) ? caret.block : null;
}

/** What `cellCaretStays` reads from a mount. */
export interface TextEditorCellStayInput extends Omit<TextEditorCellKeyInput, 'rtl'> {
  /** Whether a block lies before a top-level table (`up`) or after it (`down`) in the document. */
  readonly blockBeyond: (table: string, step: 'up' | 'down') => boolean;
}

/**
 * Whether plain ArrowUp or ArrowDown leaves a table beyond which no block lies in the key's
 * direction (`uwg-te-req-engine-9`: a key that would leave a collapsed selection beside a block
 * that is not a textblock moves it into the nearest textblock or cell in that direction, "or leave
 * the selection unchanged when there is none"), one exit rule for every engine: ArrowUp from the
 * first line of a cell on the first row of a table that opens the document, a cell spanning
 * several rows included, or ArrowDown from the last line of a cell whose span ends on the last row
 * of a table that ends it. The adapter then consumes the key and leaves the selection as it is, so
 * that neither the engine nor the browser moves the caret to the start or the end of a cell. A key
 * that leaves the table toward a block (`cellCaretExit`) moves the caret into it, and one that
 * moves within the cell or into another cell (`cellCaretKey`) is no exit. The block lookup comes
 * before the line, which is read last, only for a caret that would stay.
 */
export function cellCaretStays(input: TextEditorCellStayInput): boolean {
  const vertical = verticalCellKey(input);
  if (!vertical) return false;
  const { caret, step, table } = vertical;
  if (verticalCellCaret(caret.block, table, caret.cell, step)) return false;
  if (input.blockBeyond(caret.block, step)) return false;
  return atCellEdge(table, caret, step, input.onEdgeLine);
}

/**
 * A collapsed caret in a table cell with plain ArrowUp on the cell's first paragraph or ArrowDown
 * on its last, with the step and the portable table; `null` for any other selection or key.
 */
function verticalCellKey(input: Omit<TextEditorCellKeyInput, 'rtl' | 'onEdgeLine'>): {
  readonly caret: TextEditorTextPoint & { readonly cell: TextEditorCellPoint };
  readonly step: 'up' | 'down';
  readonly table: TextEditorPortableTable;
} | null {
  const { selection } = input;
  if (selection.kind !== 'text' || !selection.empty) return null;
  const { head } = selection;
  const step = input.key === 'ArrowUp' ? 'up' : input.key === 'ArrowDown' ? 'down' : null;
  if (!head.cell || !step) return null;
  const table = input.table(head.block);
  if (!table) return null;
  const count = placedCell(table, head.cell.row, head.cell.column)?.cell.paragraphs.length ?? 0;
  if (count === 0 || head.cell.paragraph !== (step === 'up' ? 0 : count - 1)) return null;
  return { caret: { ...head, cell: head.cell }, step, table };
}

// Text edges (Mod+A)

/** Whether two text points are one: the same block and offset, and in a table the same cell paragraph. */
export function sameTextPoint(a: TextEditorTextPoint, b: TextEditorTextPoint): boolean {
  if (a.block !== b.block || a.offset !== b.offset) return false;
  if (a.cell === undefined || b.cell === undefined) return a.cell === b.cell;
  return (
    a.cell.row === b.cell.row &&
    a.cell.column === b.cell.column &&
    a.cell.paragraph === b.cell.paragraph
  );
}

/** The first and the last text point of a document (`firstTextEdge` from either end). */
export interface TextEditorTextEdges {
  readonly first: TextEditorTextPoint;
  readonly last: TextEditorTextPoint;
}

/**
 * Whether a selection can be the whole-document selection before the document's edges are read: a
 * text selection that is not collapsed with a point at offset 0, where the first text point of a
 * document always lies. Adapters map the edges (`isWholeDocumentSelection`) only then, so a
 * selection elsewhere costs no mapping.
 */
export function mayBeWholeDocument(
  selection: TextEditorSelection,
): selection is TextEditorSelection & { readonly kind: 'text' } {
  return (
    selection.kind === 'text' &&
    !selection.empty &&
    (selection.anchor.offset === 0 || selection.head.offset === 0)
  );
}

/**
 * Whether a selection is the whole-document selection (`uwg-te-req-engine-4`), one rule for every
 * engine: a text selection that is not collapsed from the first to the last text point of the
 * document (`edges`), either way round, however it was made: by Mod+A, a press and drag, Shift
 * with the keys or `selection.set`. A copy then writes the whole document as a text range,
 * deleting or cutting it leaves one empty paragraph with a fresh identifier, typing and pasting
 * over it act at the caret in that paragraph, and an action that keeps the selection keeps it as
 * the whole-document selection of the changed document. A collapsed selection is a caret, the one
 * point of a document of one empty textblock included, unless the state reports it as not empty:
 * the engine's own select-all of that document. `false` without edges.
 */
export function isWholeDocumentSelection(
  selection: TextEditorSelection,
  edges: TextEditorTextEdges | null,
): boolean {
  if (!edges || !mayBeWholeDocument(selection)) return false;
  const { anchor, head } = selection;
  return (
    (sameTextPoint(anchor, edges.first) && sameTextPoint(head, edges.last)) ||
    (sameTextPoint(anchor, edges.last) && sameTextPoint(head, edges.first))
  );
}

// Marks in code (uwg-te-req-blocks-1: inline code excludes every mark but a link)

/** Where the mark actions act. */
export interface TextEditorMarkScope {
  /**
   * No text that marks act on: a caret in a code block, or a range whose text all lies in code
   * blocks, or that holds no text (`markTargets`). Code-block text takes no mark and no link.
   */
  readonly codeBlock: boolean;
  /**
   * Every run the marks act on, or for a caret the marks typed text takes, has inline code.
   */
  readonly inlineCode: boolean;
}

/** A run of selected text: one text node's range in its textblock or cell paragraph. */
export interface TextEditorMarkRun {
  readonly range: TextEditorTextRange;
  /** The run lies in a code block, whose text runs carry no marks. */
  readonly codeBlock: boolean;
  readonly marks: TextEditorPortableMarks | null;
}

/** The runs a mark action changes and the scope of `markActionAllowed`. */
export interface TextEditorMarkTargets<R> {
  /** The runs outside code blocks, in order. */
  readonly runs: readonly R[];
  readonly scope: TextEditorMarkScope;
}

/**
 * The mark scope of a non-collapsed selection from the runs it covers (`uwg-te-req-blocks-1`):
 * marks act on the text outside code blocks and skip code-block text, so a range from a paragraph
 * into a code block changes the paragraph's text only. `codeBlock` (nothing to act on) when no run
 * lies outside code blocks, so `can` is true exactly when the range covers some text outside code
 * blocks; `inlineCode` when every such run has the `code` mark. A caret's scope stays the
 * adapter's: its code block, and the marks typed text takes.
 */
export function markTargets<R extends Pick<TextEditorMarkRun, 'codeBlock' | 'marks'>>(
  runs: Iterable<R>,
): TextEditorMarkTargets<R> {
  const targets = Object.freeze([...runs].filter((run) => !run.codeBlock));
  return Object.freeze({
    runs: targets,
    scope: Object.freeze({
      codeBlock: targets.length === 0,
      inlineCode: targets.length > 0 && targets.every((run) => run.marks?.code === true),
    }),
  });
}

/** Where a run lies: a textblock, or a paragraph of a table cell. */
type RunPlace = Pick<TextEditorTextRange, 'block' | 'cell'>;

/** The text runs of inline content between two offsets, each non-empty. */
function inlineRuns(
  content: readonly TextEditorPortableInline[],
  place: RunPlace,
  from: number,
  to: number,
  codeBlock: boolean,
): TextEditorMarkRun[] {
  const runs: TextEditorMarkRun[] = [];
  let offset = 0;
  for (const node of content) {
    const size = node.type === 'text' ? node.text.length : 1;
    const start = Math.max(from, offset);
    const end = Math.min(to, offset + size);
    if (node.type === 'text' && start < end)
      runs.push({
        range: {
          block: place.block,
          ...(place.cell ? { cell: place.cell } : {}),
          from: start,
          to: end,
        },
        codeBlock,
        marks: node.marks ?? null,
      });
    offset += size;
  }
  return runs;
}

/** The runs of a block's whole text: a textblock's, or every paragraph of a table's cells. */
function wholeRuns(block: TextEditorPortableBlock): TextEditorMarkRun[] {
  if (!block.id) return [];
  if (block.type === 'table')
    return tableGrid(block).cells.flatMap((placed) =>
      placed.cell.paragraphs.flatMap((paragraph, index) =>
        inlineRuns(
          paragraph.content,
          { block: block.id!, cell: { row: placed.row, column: placed.column, paragraph: index } },
          0,
          inlineLength(paragraph.content),
          false,
        ),
      ),
    );
  const content = blockInline(block);
  return content
    ? inlineRuns(content, { block: block.id }, 0, inlineLength(content), block.type === 'code')
    : [];
}

/**
 * The two text points of a text range (`uwg-te-tab-actions` r1): its start and end offsets in its
 * block, or in the cell paragraph it names; a range without a cell gives points without one.
 */
export function textRangePoints(
  range: TextEditorTextRange,
): readonly [TextEditorTextPoint, TextEditorTextPoint] {
  const { block, cell, from, to } = range;
  const place = cell === undefined ? { block } : { block, cell };
  return [
    { ...place, offset: from },
    { ...place, offset: to },
  ];
}

/**
 * The text runs between two text points in document order (`uwg-te-tab-actions` r1): runs of the
 * textblocks from the first point's block to the last point's, nested items as they come, every
 * paragraph of each cell of a table between them, code-block text as code runs. Both points outside
 * tables, or both in one cell (its paragraphs between them); `null` otherwise (a cell range is
 * `cellMarkRuns`), or for an unknown block.
 */
export function rangeMarkRuns(
  document: TextEditorPortableDocument,
  anchor: TextEditorTextPoint,
  head: TextEditorTextPoint,
): readonly TextEditorMarkRun[] | null {
  const order = locatedBlocks(document.blocks);
  if (anchor.cell && head.cell) {
    const { row, column } = anchor.cell;
    if (anchor.block !== head.block || head.cell.row !== row || head.cell.column !== column)
      return null;
    const table = order.find(({ block }) => block.id === anchor.block)?.block;
    if (table?.type !== 'table') return null;
    const placed = placedCell(table, row, column);
    if (!placed) return null;
    const forward =
      anchor.cell.paragraph < head.cell.paragraph ||
      (anchor.cell.paragraph === head.cell.paragraph && anchor.offset <= head.offset);
    const [from, to] = forward ? [anchor, head] : [head, anchor];
    const runs: TextEditorMarkRun[] = [];
    for (let index = from.cell!.paragraph; index <= to.cell!.paragraph; index += 1) {
      const content = placed.cell.paragraphs[index]?.content;
      if (!content) return null;
      runs.push(
        ...inlineRuns(
          content,
          { block: table.id!, cell: { row, column, paragraph: index } },
          index === from.cell!.paragraph ? from.offset : 0,
          index === to.cell!.paragraph ? to.offset : inlineLength(content),
          false,
        ),
      );
    }
    return Object.freeze(runs);
  }
  if (anchor.cell || head.cell) return null;
  const a = order.findIndex(({ block }) => block.id === anchor.block);
  const h = order.findIndex(({ block }) => block.id === head.block);
  if (a < 0 || h < 0) return null;
  const forward = a < h || (a === h && anchor.offset <= head.offset);
  const [first, last] = forward ? [a, h] : [h, a];
  const [from, to] = forward ? [anchor, head] : [head, anchor];
  const runs: TextEditorMarkRun[] = [];
  for (let index = first; index <= last; index += 1) {
    const block = order[index]!.block;
    const content = blockInline(block);
    if (!content || (index !== first && index !== last)) {
      runs.push(...wholeRuns(block));
      continue;
    }
    runs.push(
      ...inlineRuns(
        content,
        { block: block.id! },
        index === first ? from.offset : 0,
        index === last ? to.offset : inlineLength(content),
        block.type === 'code',
      ),
    );
  }
  return Object.freeze(runs);
}

/**
 * The text runs of a block selection (`uwg-te-tab-actions` r1): every textblock of the listed
 * blocks with their nested items, and every cell paragraph of a listed table, in document order;
 * atoms hold none. Unknown identifiers are ignored.
 */
export function blockMarkRuns(
  document: TextEditorPortableDocument,
  ids: readonly string[],
): readonly TextEditorMarkRun[] {
  const listed = new Set(ids);
  const runs: TextEditorMarkRun[] = [];
  const visit = (blocks: readonly TextEditorPortableBlock[], inside: boolean) => {
    for (const block of blocks) {
      const selected = inside || (block.id !== undefined && listed.has(block.id));
      if (selected) runs.push(...wholeRuns(block));
      if (isListItem(block)) visit(block.children, selected);
    }
  };
  visit(document.blocks, false);
  return Object.freeze(runs);
}

/**
 * The text runs of a cell range (`uwg-te-req-tables-5`): every paragraph of each cell the
 * range's rectangle holds once grown over merged cells (`cellRangeRect`, as `table.clear-cells`
 * takes it), in row-major order; empty for a range outside the table.
 */
export function cellMarkRuns(
  id: string,
  table: TextEditorPortableTable,
  range: TextEditorCellRange,
): readonly TextEditorMarkRun[] {
  const model = tableModel(id, table);
  const rect = cellRangeRect(model, range);
  if (!rect) return Object.freeze([]);
  const placed = tableGrid(table).cells;
  return Object.freeze(
    cellsInRect(model, rect).flatMap((index) => {
      const { row, column, cell } = placed[index]!;
      return cell.paragraphs.flatMap((paragraph, at) =>
        inlineRuns(
          paragraph.content,
          { block: id, cell: { row, column, paragraph: at } },
          0,
          inlineLength(paragraph.content),
          false,
        ),
      );
    }),
  );
}

/**
 * Whether a mark or link action may apply where the selection lies: in a code block none does;
 * in inline code only toggling the code mark itself, clearing marks, and links do.
 */
export function markActionAllowed(
  type: Extract<
    TextEditorActionType,
    'mark.toggle' | 'mark.color' | 'mark.clear' | 'link.set' | 'link.unset'
  >,
  mark: TextEditorToggleMark | null,
  scope: TextEditorMarkScope,
): boolean {
  if (scope.codeBlock) return false;
  if (!scope.inlineCode) return true;
  switch (type) {
    case 'mark.toggle':
      return mark === 'code';
    case 'mark.color':
      return false;
    default:
      return true;
  }
}
