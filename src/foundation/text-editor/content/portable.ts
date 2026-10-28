/**
 * Portable model of the text editor (Widgets `uwg-te-req-content-1`, `uwg-te-req-content-2`,
 * `uwg-te-req-content-3`, `uwg-te-req-blocks-1`, `uwg-te-tab-content-model`).
 *
 * The engine-neutral document from which the shared converters write HTML, Markdown and text and
 * into which they read them, and to and from which each adapter maps its native JSON. It is plain
 * data with no engine positions, keys or nodes.
 *
 * Canonical documents, as canonicalization leaves them: every block carries a valid identifier,
 * unique in the document; an optional member at its default is left out (marks when none is on,
 * the start alignment, no language, an ordered list starting at 1, a span of one, no background,
 * automatic column widths); adjacent text runs with equal marks are merged; inline code carries no
 * mark but a link, and superscript and subscript exclude each other; tables are rectangular; a
 * document has at least one block, an empty document being one empty paragraph. A hard break may
 * end a textblock: it stands for the empty last line that the HTML profile writes as a second
 * `br`, because HTML import drops the line break that ends a block.
 *
 * Below the types: canonicalization, which also fits the looser draft trees that the importers
 * build to the content model; the conversion of content an engine cannot represent; and the
 * model helpers that every format shares (the text of a block, the table grid, the blocks the
 * formats write and the nesting of marks).
 */
import { isTextEditorAttributeValue, storedAlign } from '../actions.js';
import type { TextEditorCapability } from '../capabilities.js';
import type { TextEditorDiagnostic } from '../engine.js';
import { planIdRepair } from '../ids.js';
import type {
  TextEditorAlign,
  TextEditorAttributes,
  TextEditorAttributeValue,
  TextEditorHeadingLevel,
  TextEditorListKind,
} from '../model.js';
import {
  ATTRIBUTE_NAME,
  type TextEditorAttributeSpec,
  type TextEditorBlockDefinition,
  type TextEditorInlineDefinition,
  type TextEditorNodeDefinition,
} from '../nodes.js';
import { isTextEditorColor, type TextEditorColor } from '../palette.js';

// Inline content

/**
 * The marks of a text run, in the order in which HTML nests them, outermost first; a mark that is
 * absent is off.
 */
export interface TextEditorPortableMarks {
  /** The link destination. */
  readonly link?: string | undefined;
  readonly textColor?: TextEditorColor | undefined;
  readonly highlight?: TextEditorColor | undefined;
  readonly bold?: true | undefined;
  readonly italic?: true | undefined;
  readonly underline?: true | undefined;
  readonly strike?: true | undefined;
  readonly superscript?: true | undefined;
  readonly subscript?: true | undefined;
  readonly code?: true | undefined;
}

/** A run of text with its marks. */
export interface TextEditorPortableText {
  readonly type: 'text';
  readonly text: string;
  readonly marks?: TextEditorPortableMarks | undefined;
}

export interface TextEditorPortableHardBreak {
  readonly type: 'hard-break';
}

/** A custom inline node: an atom that counts as one unit in text points. */
export interface TextEditorPortableInlineNode {
  readonly type: 'custom';
  readonly name: string;
  readonly attrs: TextEditorAttributes;
}

/** Inline content: marks apply to text runs only. */
export type TextEditorPortableInline =
  TextEditorPortableText | TextEditorPortableHardBreak | TextEditorPortableInlineNode;

// Blocks

export interface TextEditorPortableParagraph {
  readonly type: 'paragraph';
  readonly id?: string | undefined;
  readonly align?: TextEditorAlign | undefined;
  readonly content: readonly TextEditorPortableInline[];
}

export interface TextEditorPortableHeading {
  readonly type: 'heading';
  readonly id?: string | undefined;
  readonly level: TextEditorHeadingLevel;
  readonly align?: TextEditorAlign | undefined;
  readonly content: readonly TextEditorPortableInline[];
}

/** A quote: a textblock, whose line breaks are hard breaks. */
export interface TextEditorPortableQuote {
  readonly type: 'quote';
  readonly id?: string | undefined;
  readonly align?: TextEditorAlign | undefined;
  readonly content: readonly TextEditorPortableInline[];
}

/** A code block: its text verbatim, line breaks as line feeds. */
export interface TextEditorPortableCodeBlock {
  readonly type: 'code';
  readonly id?: string | undefined;
  readonly language?: string | undefined;
  readonly text: string;
}

interface ListItemFields<K extends TextEditorListKind> {
  readonly type: K;
  readonly id?: string | undefined;
  readonly align?: TextEditorAlign | undefined;
  /** The inline content of the item's paragraph. */
  readonly content: readonly TextEditorPortableInline[];
  /** The nested items, in order; consecutive items of one kind form one list. */
  readonly children: readonly TextEditorPortableListItem[];
}

export type TextEditorPortableBulletItem = ListItemFields<'list-bullet'>;

export interface TextEditorPortableOrderedItem extends ListItemFields<'list-ordered'> {
  /** The number of the list's first item, held by that item; 1 when absent. */
  readonly start?: number | undefined;
}

export interface TextEditorPortableTaskItem extends ListItemFields<'list-task'> {
  readonly checked: boolean;
}

/**
 * A list item. List containers are implicit: consecutive sibling items of one kind form one list,
 * at the top level of the document or among the children of an item.
 */
export type TextEditorPortableListItem =
  TextEditorPortableBulletItem | TextEditorPortableOrderedItem | TextEditorPortableTaskItem;

export interface TextEditorPortableDivider {
  readonly type: 'divider';
  readonly id?: string | undefined;
}

export interface TextEditorPortableImage {
  readonly type: 'image';
  readonly id?: string | undefined;
  readonly src: string;
  /** The alternative text; empty when there is none. */
  readonly alt: string;
  /** The width in CSS pixels. */
  readonly width?: number | undefined;
}

/** A paragraph of a table cell; cell paragraphs carry no identifier and no alignment. */
export interface TextEditorPortableCellParagraph {
  readonly content: readonly TextEditorPortableInline[];
}

/** A cell, at the first row and column of its span. */
export interface TextEditorPortableTableCell {
  readonly rowSpan?: number | undefined;
  readonly colSpan?: number | undefined;
  readonly background?: TextEditorColor | undefined;
  readonly align?: TextEditorAlign | undefined;
  /** One or more paragraphs. */
  readonly paragraphs: readonly TextEditorPortableCellParagraph[];
}

/** The cells that start in one row, in column order; cells that a span covers are left out. */
export interface TextEditorPortableTableRow {
  readonly cells: readonly TextEditorPortableTableCell[];
}

/** A table; header cells are positional, the first row and the first column. */
export interface TextEditorPortableTable {
  readonly type: 'table';
  readonly id?: string | undefined;
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
  /** The width of every column in CSS pixels; absent for automatic widths. */
  readonly widths?: readonly number[] | undefined;
  readonly rows: readonly TextEditorPortableTableRow[];
}

/** A custom block; `content` holds the inline content of a textblock and is absent for an atom. */
export interface TextEditorPortableCustomBlock {
  readonly type: 'custom';
  readonly id?: string | undefined;
  readonly name: string;
  readonly attrs: TextEditorAttributes;
  readonly content?: readonly TextEditorPortableInline[] | undefined;
}

export type TextEditorPortableBlock =
  | TextEditorPortableParagraph
  | TextEditorPortableHeading
  | TextEditorPortableQuote
  | TextEditorPortableCodeBlock
  | TextEditorPortableListItem
  | TextEditorPortableDivider
  | TextEditorPortableImage
  | TextEditorPortableTable
  | TextEditorPortableCustomBlock;

/** A document: its top-level blocks in order. */
export interface TextEditorPortableDocument {
  readonly blocks: readonly TextEditorPortableBlock[];
}

/**
 * Content to insert (`content.insert`): a text range, whose first and last paragraphs merge into
 * the text around the insertion point, or whole blocks, which insert as blocks.
 */
export interface TextEditorPortableFragment {
  readonly kind: 'range' | 'blocks';
  readonly blocks: readonly TextEditorPortableBlock[];
}

// Drafts (uwg-te-req-content-3)

/*
 * A draft is what an importer builds before canonicalization fits it to the content model, and
 * every document is a draft. A quote, a list item and a custom textblock may hold the blocks that
 * an importer found inside them; a table cell may hold blocks and a header flag.
 */

/** A quote as an importer builds it: its inline content, then the blocks it holds. */
export interface TextEditorPortableDraftQuote {
  readonly type: 'quote';
  readonly id?: string | undefined;
  readonly align?: TextEditorAlign | undefined;
  /** Inline content before the first block it holds; empty or absent for none. */
  readonly content?: readonly TextEditorPortableInline[] | undefined;
  /** The blocks it holds after `content`, in order. */
  readonly blocks?: readonly TextEditorPortableDraftBlock[] | undefined;
}

interface DraftListItemFields<K extends TextEditorListKind> {
  readonly type: K;
  readonly id?: string | undefined;
  readonly align?: TextEditorAlign | undefined;
  /** Inline content before the first block the item holds; empty or absent for none. */
  readonly content?: readonly TextEditorPortableInline[] | undefined;
  /** What the item holds after `content`, in order: paragraphs, nested items and other blocks. */
  readonly children?: readonly TextEditorPortableDraftBlock[] | undefined;
}

export type TextEditorPortableDraftBulletItem = DraftListItemFields<'list-bullet'>;

export interface TextEditorPortableDraftOrderedItem extends DraftListItemFields<'list-ordered'> {
  readonly start?: number | undefined;
}

export interface TextEditorPortableDraftTaskItem extends DraftListItemFields<'list-task'> {
  /** Unchecked when absent. */
  readonly checked?: boolean | undefined;
}

export type TextEditorPortableDraftListItem =
  | TextEditorPortableDraftBulletItem
  | TextEditorPortableDraftOrderedItem
  | TextEditorPortableDraftTaskItem;

/** A cell as an importer builds it, at the first row and column of its span. */
export interface TextEditorPortableDraftTableCell {
  readonly rowSpan?: number | undefined;
  readonly colSpan?: number | undefined;
  readonly background?: TextEditorColor | undefined;
  readonly align?: TextEditorAlign | undefined;
  /** A header cell: positional headers come from the header cells of the first row and column. */
  readonly header?: boolean | undefined;
  readonly paragraphs?: readonly TextEditorPortableCellParagraph[] | undefined;
  /** The blocks found in the cell after `paragraphs`, in order. */
  readonly blocks?: readonly TextEditorPortableDraftBlock[] | undefined;
}

export interface TextEditorPortableDraftTableRow {
  readonly cells: readonly TextEditorPortableDraftTableCell[];
}

export interface TextEditorPortableDraftTable {
  readonly type: 'table';
  readonly id?: string | undefined;
  /** When absent: whether every cell of the first row is a header cell. */
  readonly headerRow?: boolean | undefined;
  /** When absent: whether the cells that start the other rows are all header cells. */
  readonly headerColumn?: boolean | undefined;
  readonly widths?: readonly number[] | undefined;
  readonly rows: readonly TextEditorPortableDraftTableRow[];
}

/** A custom block as an importer builds it; a textblock may hold blocks, as a quote does. */
export interface TextEditorPortableDraftCustomBlock {
  readonly type: 'custom';
  readonly id?: string | undefined;
  readonly name: string;
  readonly attrs?: TextEditorAttributes | undefined;
  readonly content?: readonly TextEditorPortableInline[] | undefined;
  readonly blocks?: readonly TextEditorPortableDraftBlock[] | undefined;
}

/** A block as an importer builds it. */
export type TextEditorPortableDraftBlock =
  | TextEditorPortableParagraph
  | TextEditorPortableHeading
  | TextEditorPortableDraftQuote
  | TextEditorPortableCodeBlock
  | TextEditorPortableDraftListItem
  | TextEditorPortableDivider
  | TextEditorPortableImage
  | TextEditorPortableDraftTable
  | TextEditorPortableDraftCustomBlock;

/** A document as an importer builds it: its top-level blocks in order. */
export interface TextEditorPortableDraft {
  readonly blocks: readonly TextEditorPortableDraftBlock[];
}

// Model helpers

type Rec = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Rec =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const list = (value: unknown): readonly unknown[] => (Array.isArray(value) ? value : []);

const LIST_KINDS: ReadonlySet<string> = new Set<TextEditorListKind>([
  'list-bullet',
  'list-ordered',
  'list-task',
]);

const isListKind = (value: unknown): value is TextEditorListKind =>
  typeof value === 'string' && LIST_KINDS.has(value);

/** Whether a block is a list item. */
export function isListItem(block: TextEditorPortableBlock): block is TextEditorPortableListItem {
  return LIST_KINDS.has(block.type);
}

/** Whether a block holds no inline content: a divider, an image, a table or a custom atom. */
export function isAtomOrTable(block: TextEditorPortableBlock): boolean {
  return (
    block.type === 'divider' ||
    block.type === 'image' ||
    block.type === 'table' ||
    (block.type === 'custom' && block.content === undefined)
  );
}

/** Whether a block is a pending image: one with an empty source, which an upload fills in. */
export function isPendingImage(block: TextEditorPortableBlock): boolean {
  return block.type === 'image' && block.src === '';
}

/**
 * The blocks that HTML, Markdown and text write: every block but the pending images, which exist
 * only while their upload runs, and the empty paragraph that follows a final atom block or table,
 * which the engines keep and the formats omit (uwg-te-req-blocks-1).
 */
export function outputBlocks(
  document: TextEditorPortableDocument,
): readonly TextEditorPortableBlock[] {
  const blocks = document.blocks.filter((block) => !isPendingImage(block));
  const last = blocks[blocks.length - 1];
  const before = blocks[blocks.length - 2];
  return last?.type === 'paragraph' &&
    last.content.length === 0 &&
    before !== undefined &&
    isAtomOrTable(before)
    ? blocks.slice(0, -1)
    : blocks;
}

/** Whether a document is empty: one paragraph without content, as an empty document is held. */
export function isEmptyDocument(document: TextEditorPortableDocument): boolean {
  const [only, ...rest] = document.blocks;
  return rest.length === 0 && only?.type === 'paragraph' && only.content.length === 0;
}

/**
 * The document limited to the subtrees of the blocks of `ids`, as content limited to blocks is
 * written: those blocks in document order, each list item with its nested items. A nested item
 * listed without its parent item takes the top level, an item inside a listed item comes only
 * with it, and identifiers that no block holds are ignored, so no block is left for none.
 */
export function selectPortableBlocks(
  document: TextEditorPortableDocument,
  ids: readonly string[],
): TextEditorPortableDocument {
  const wanted = new Set(ids);
  const blocks: TextEditorPortableBlock[] = [];
  const visit = (block: TextEditorPortableBlock) => {
    if (block.id !== undefined && wanted.has(block.id)) blocks.push(block);
    else if (isListItem(block)) block.children.forEach(visit);
  };
  document.blocks.forEach(visit);
  return { blocks };
}

// Custom node definitions

/** The custom node definitions by kind and name; of two definitions with one name, the first. */
export interface TextEditorNodeLookup {
  readonly blocks: ReadonlyMap<string, TextEditorBlockDefinition>;
  readonly inlines: ReadonlyMap<string, TextEditorInlineDefinition>;
}

const NO_NODES: TextEditorNodeLookup = { blocks: new Map(), inlines: new Map() };
const nodeLookups = new WeakMap<readonly TextEditorNodeDefinition[], TextEditorNodeLookup>();

/** The lookup of a list of definitions, built once per list. */
export function nodeLookup(
  nodes: readonly TextEditorNodeDefinition[] | undefined,
): TextEditorNodeLookup {
  if (!nodes || nodes.length === 0) return NO_NODES;
  let lookup = nodeLookups.get(nodes);
  if (!lookup) {
    const blocks = new Map<string, TextEditorBlockDefinition>();
    const inlines = new Map<string, TextEditorInlineDefinition>();
    for (const definition of nodes) {
      if (definition.kind === 'block') {
        if (!blocks.has(definition.name)) blocks.set(definition.name, definition);
      } else if (!inlines.has(definition.name)) inlines.set(definition.name, definition);
    }
    lookup = { blocks, inlines };
    nodeLookups.set(nodes, lookup);
  }
  return lookup;
}

/** A value for a spec: a valid value, a string read as a number or Boolean, or the default. */
function attributeValue(spec: TextEditorAttributeSpec, value: unknown): TextEditorAttributeValue {
  switch (spec.type) {
    case 'string':
      if (typeof value === 'string' || value === null) return value;
      return typeof value === 'number' && Number.isFinite(value) ? String(value) : spec.default;
    case 'number':
      if (value === null || (typeof value === 'number' && Number.isFinite(value))) return value;
      if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value)))
        return Number(value);
      return spec.default;
    case 'boolean':
      if (typeof value === 'boolean') return value;
      return value === 'true' ? true : value === 'false' ? false : spec.default;
    case 'enum':
      return typeof value === 'string' && spec.values.includes(value) ? value : spec.default;
    default:
      return isTextEditorAttributeValue(value) ? value : null;
  }
}

/**
 * The attribute values of a defined node: every attribute of its definition, valid for its spec
 * or else its default; attributes that the definition lacks are left out.
 */
export function definitionAttributes(
  definition: TextEditorNodeDefinition,
  attrs: unknown,
): TextEditorAttributes {
  const source: Rec = isRecord(attrs) ? attrs : {};
  const values: Record<string, TextEditorAttributeValue> = {};
  for (const [name, spec] of Object.entries(definition.attrs ?? {}))
    values[name] = attributeValue(spec, Object.hasOwn(source, name) ? source[name] : undefined);
  return values;
}

/**
 * The text of an attribute value as a `data-` attribute holds it: a string as it is, a number in
 * its shortest form, a Boolean as `true` or `false`; `null` is written as no attribute.
 */
export function attributeText(value: TextEditorAttributeValue): string | null {
  return value === null ? null : String(value);
}

/**
 * The attributes that describe a custom node in HTML, as the profile and the preview write them:
 * the node name in `data-type`, then each attribute that has a value as a `data-` attribute, when
 * HTML keeps its name as it is and it is neither `type`, which holds the name, nor, on a block,
 * `id`, which holds the block identifier.
 */
export function customNodeAttributes(
  name: string,
  attrs: TextEditorAttributes,
  block: boolean,
): readonly (readonly [name: string, value: string])[] {
  const attributes: (readonly [string, string])[] = [['data-type', name]];
  for (const [attribute, value] of Object.entries(attrs)) {
    const text = attributeText(value);
    if (
      text !== null &&
      ATTRIBUTE_NAME.test(attribute) &&
      attribute !== 'type' &&
      !(block && attribute === 'id')
    )
      attributes.push([`data-${attribute}`, text]);
  }
  return attributes;
}

/** The attribute values of a node without a definition: the valid ones, as they are. */
function plainAttributes(attrs: unknown): TextEditorAttributes {
  const values: Record<string, TextEditorAttributeValue> = {};
  if (isRecord(attrs))
    for (const [name, value] of Object.entries(attrs))
      if (isTextEditorAttributeValue(value)) values[name] = value;
  return values;
}

// Text of the model (uwg-te-req-content-5)

/** The text of an inline node: its definition's text, or nothing without a definition. */
function inlineNodeText(node: Rec, lookup: TextEditorNodeLookup): string {
  const definition = typeof node.name === 'string' ? lookup.inlines.get(node.name) : undefined;
  if (!definition) return '';
  try {
    const text = definition.text(definitionAttributes(definition, node.attrs));
    return typeof text === 'string' ? text : '';
  } catch {
    return '';
  }
}

function inlineTextOf(content: unknown, lookup: TextEditorNodeLookup): string {
  let text = '';
  for (const node of list(content)) {
    if (!isRecord(node)) continue;
    if (node.type === 'text') text += typeof node.text === 'string' ? node.text : '';
    else if (node.type === 'hard-break') text += '\n';
    else if (node.type === 'custom') text += inlineNodeText(node, lookup);
  }
  return text;
}

/**
 * The text of inline content as the text format writes it: marks dropped, a hard break as a line
 * feed and an inline node as its definition's text, or nothing without a definition.
 */
export function inlineText(
  content: readonly TextEditorPortableInline[],
  nodes?: readonly TextEditorNodeDefinition[],
): string {
  return inlineTextOf(content, nodeLookup(nodes));
}

function customBlockText(block: Rec, lookup: TextEditorNodeLookup): string | null {
  const definition = typeof block.name === 'string' ? lookup.blocks.get(block.name) : undefined;
  const textblock = definition ? definition.content === 'inline' : block.content !== undefined;
  const own = textblock ? inlineTextOf(block.content, lookup) : '';
  let text = own;
  if (definition?.text) {
    try {
      const written = definition.text({
        attrs: definitionAttributes(definition, block.attrs),
        text: own,
      });
      text = typeof written === 'string' ? written : own;
    } catch {
      text = own;
    }
  }
  return textblock || text !== '' ? text : null;
}

/** The text of a cell: its paragraphs holding text, joined by a space, so a row stays one line. */
function cellText(cell: TextEditorPortableTableCell, lookup: TextEditorNodeLookup): string {
  return list(cell.paragraphs)
    .map((paragraph) => (isRecord(paragraph) ? inlineTextOf(paragraph.content, lookup) : ''))
    .filter((text) => text !== '')
    .join(' ');
}

function tableText(table: TextEditorPortableTable, lookup: TextEditorNodeLookup): string {
  const grid = tableGrid(table);
  const lines: string[] = [];
  for (let row = 0; row < grid.rows; row += 1) {
    const cells: string[] = [];
    for (let column = 0; column < grid.columns; column += 1) {
      const placed = grid.cells[grid.grid[row]?.[column] ?? -1];
      cells.push(
        placed && placed.row === row && placed.column === column
          ? cellText(placed.cell, lookup)
          : '',
      );
    }
    lines.push(cells.join('\t'));
  }
  return lines.join('\n');
}

function blockTextOf(block: TextEditorPortableBlock, lookup: TextEditorNodeLookup): string | null {
  switch (block.type) {
    case 'paragraph':
    case 'heading':
    case 'quote':
    case 'list-bullet':
    case 'list-ordered':
    case 'list-task':
      return inlineTextOf(block.content, lookup);
    case 'code':
      return typeof block.text === 'string' ? block.text : '';
    case 'divider':
      return null;
    case 'image':
      return typeof block.alt === 'string' && block.alt !== '' ? block.alt : null;
    case 'table':
      return tableText(block, lookup);
    case 'custom':
      return customBlockText(block as unknown as Rec, lookup);
    default:
      return null;
  }
}

/**
 * The text of one block as the text format writes it, or `null` for a block the format omits: a
 * divider, an image without alternative text and an atom without text. A list item gives its own
 * text without its nested items; a code block its text verbatim; an image its alternative text; a
 * table one line per row with its cells separated by tabs, the positions a span covers as empty
 * cells and the paragraphs of a cell joined by a space; a custom block its definition's text, or
 * its inline text without one.
 */
export function blockText(
  block: TextEditorPortableBlock,
  nodes?: readonly TextEditorNodeDefinition[],
): string | null {
  return blockTextOf(block, nodeLookup(nodes));
}

/** Inline content holding a text: its lines as text runs, with a hard break between two lines. */
export function textToInline(text: string): TextEditorPortableInline[] {
  const content: TextEditorPortableInline[] = [];
  text.split('\n').forEach((line, index) => {
    if (index > 0) content.push({ type: 'hard-break' });
    if (line !== '') content.push({ type: 'text', text: line });
  });
  return content;
}

// Table grid (uwg-te-tab-content-model r7)

const MAX_COLUMN_SPAN = 1000;
const MAX_ROW_SPAN = 65534;

/** A cell of a table with the row and column where it starts and its span. */
export interface TextEditorPortablePlacedCell<C = TextEditorPortableTableCell> {
  readonly row: number;
  readonly column: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  readonly cell: C;
}

/** The grid of a table. */
export interface TextEditorPortableTableGrid {
  readonly rows: number;
  readonly columns: number;
  /** The cells in row-major order of the positions where they start. */
  readonly cells: readonly TextEditorPortablePlacedCell[];
  /** `grid[row][column]`: the index in `cells` of the cell covering that position, or -1. */
  readonly grid: readonly (readonly number[])[];
}

interface Placement<C> {
  readonly cells: TextEditorPortablePlacedCell<C>[];
  readonly columns: number;
  /** `starts[row][column]`: the cell that starts there. */
  readonly starts: (TextEditorPortablePlacedCell<C> | undefined)[][];
  readonly covered: boolean[][];
}

const spanOf = (value: unknown, max: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value > 1 ? Math.min(value, max) : 1;

/**
 * Places the cells of each row in the first position that no span from an earlier row covers, as
 * HTML tables do; a column span stops at a covered position and a row span at the last row.
 */
function placeCells<C extends { readonly rowSpan?: unknown; readonly colSpan?: unknown }>(
  rows: readonly (readonly C[])[],
): Placement<C> {
  const covered: boolean[][] = rows.map(() => []);
  const starts: (TextEditorPortablePlacedCell<C> | undefined)[][] = rows.map(() => []);
  const cells: TextEditorPortablePlacedCell<C>[] = [];
  let columns = 0;
  rows.forEach((rowCells, row) => {
    const line = covered[row]!;
    let column = 0;
    for (const cell of rowCells) {
      while (line[column]) column += 1;
      const wanted = spanOf(cell.colSpan, MAX_COLUMN_SPAN);
      let colSpan = 1;
      while (colSpan < wanted && !line[column + colSpan]) colSpan += 1;
      const rowSpan = Math.min(spanOf(cell.rowSpan, MAX_ROW_SPAN), rows.length - row);
      for (let r = row; r < row + rowSpan; r += 1)
        for (let c = column; c < column + colSpan; c += 1) covered[r]![c] = true;
      const placed = { row, column, rowSpan, colSpan, cell };
      cells.push(placed);
      starts[row]![column] = placed;
      column += colSpan;
      columns = Math.max(columns, column);
    }
  });
  return { cells, columns, starts, covered };
}

/** The grid of a canonical table: where each cell starts and which cell covers each position. */
export function tableGrid(table: TextEditorPortableTable): TextEditorPortableTableGrid {
  const rows = list(table.rows).map((row) =>
    isRecord(row) ? list(row.cells).filter(isRecord) : [],
  );
  const placement = placeCells(
    rows as unknown as readonly (readonly TextEditorPortableTableCell[])[],
  );
  const grid = rows.map(() => new Array<number>(placement.columns).fill(-1));
  placement.cells.forEach((placed, index) => {
    for (let row = placed.row; row < placed.row + placed.rowSpan; row += 1)
      for (let column = placed.column; column < placed.column + placed.colSpan; column += 1)
        grid[row]![column] = index;
  });
  return { rows: rows.length, columns: placement.columns, cells: placement.cells, grid };
}

// Nesting of marks (uwg-te-req-content-2)

/** The marks in the order in which the HTML profile nests them, outermost first. */
export const PORTABLE_MARK_ORDER = Object.freeze([
  'link',
  'textColor',
  'highlight',
  'bold',
  'italic',
  'underline',
  'strike',
  'superscript',
  'subscript',
  'code',
] as const);

export type TextEditorPortableMarkName = (typeof PORTABLE_MARK_ORDER)[number];

/** A mark wrapping inline content. */
export interface TextEditorPortableMarkNode {
  readonly type: 'mark';
  readonly mark: TextEditorPortableMarkName;
  /** The link destination or the color name, `true` for the other marks. */
  readonly value: string | true;
  readonly children: readonly TextEditorPortableInlineTree[];
}

/** Inline content with its marks as wrappers: a mark, a text, a hard break or an inline node. */
export type TextEditorPortableInlineTree =
  | TextEditorPortableMarkNode
  | { readonly type: 'text'; readonly text: string }
  | TextEditorPortableHardBreak
  | TextEditorPortableInlineNode;

/**
 * Inline content with its marks nested in the order of the HTML profile, link outermost and code
 * innermost; adjacent runs share the marks they have in common from the outside in, so a link or a
 * color that spans runs with different inner marks stays one wrapper.
 */
export function inlineTree(
  content: readonly TextEditorPortableInline[],
): TextEditorPortableInlineTree[] {
  interface OpenMark {
    readonly type: 'mark';
    readonly mark: TextEditorPortableMarkName;
    readonly value: string | true;
    readonly children: TextEditorPortableInlineTree[];
  }
  const root: TextEditorPortableInlineTree[] = [];
  const open: OpenMark[] = [];
  for (const node of content) {
    const marks: { mark: TextEditorPortableMarkName; value: string | true }[] = [];
    if (node.type === 'text' && node.marks)
      for (const mark of PORTABLE_MARK_ORDER) {
        const value = node.marks[mark];
        if (typeof value === 'string' || value === true) marks.push({ mark, value });
      }
    let kept = 0;
    while (
      kept < open.length &&
      kept < marks.length &&
      open[kept]!.mark === marks[kept]!.mark &&
      open[kept]!.value === marks[kept]!.value
    )
      kept += 1;
    open.length = kept;
    for (const { mark, value } of marks.slice(kept)) {
      const wrapper: OpenMark = { type: 'mark', mark, value, children: [] };
      (open[open.length - 1]?.children ?? root).push(wrapper);
      open.push(wrapper);
    }
    (open[open.length - 1]?.children ?? root).push(
      node.type === 'text' ? { type: 'text', text: node.text } : node,
    );
  }
  return root;
}

// Canonicalization (uwg-te-req-content-3, uwg-te-req-content-7, uwg-te-req-blocks-1)

export interface TextEditorCanonicalizeOptions {
  /** The custom node definitions: a defined node takes the content and attributes they declare. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  /**
   * The draft was read from HTML or Markdown: a no-break space outside a code block reads as a
   * space, and the hard break that ends a textblock of the source is dropped. Never set it for a
   * document that is already canonical, whose final hard breaks are content.
   */
  readonly imported?: boolean | undefined;
  /** Creates the identifiers of the blocks that need one; ten random characters by default. */
  readonly createId?: (() => string) | undefined;
}

export interface TextEditorCanonicalResult {
  readonly document: TextEditorPortableDocument;
  /** One `text-editor-block-id` diagnostic when identifiers were replaced. */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

interface FitContext {
  readonly lookup: TextEditorNodeLookup;
  readonly imported: boolean;
}

/** Blocks while they are fitted: raw values, checked when the document is finished. */
interface FitText {
  readonly type: 'paragraph' | 'quote';
  id: unknown;
  align: TextEditorAlign | undefined;
  readonly content: unknown[];
}

interface FitHeading {
  readonly type: 'heading';
  id: unknown;
  readonly level: unknown;
  readonly align: TextEditorAlign | undefined;
  readonly content: unknown[];
}

interface FitCode {
  readonly type: 'code';
  id: unknown;
  readonly language: unknown;
  readonly text: unknown;
}

interface FitItem {
  readonly type: TextEditorListKind;
  id: unknown;
  start: unknown;
  readonly checked: unknown;
  align: TextEditorAlign | undefined;
  readonly content: unknown[];
  readonly children: FitItem[];
  /** The fitting epoch in which the item was placed; a later epoch closes it. */
  epoch: number;
  placed: boolean;
}

interface FitAtom {
  readonly type: 'divider' | 'image';
  id: unknown;
  readonly source: Rec;
}

interface FitCell {
  readonly rowSpan: unknown;
  readonly colSpan: unknown;
  readonly background: unknown;
  readonly align: TextEditorAlign | undefined;
  readonly header: unknown;
  readonly paragraphs: unknown[][];
}

interface FitTable {
  readonly type: 'table';
  id: unknown;
  readonly headerRow: unknown;
  readonly headerColumn: unknown;
  readonly widths: unknown;
  readonly rows: FitCell[][];
}

interface FitCustom {
  readonly type: 'custom';
  id: unknown;
  readonly name: string;
  readonly attrs: unknown;
  readonly content: unknown[] | undefined;
}

type FitBlock = FitText | FitHeading | FitCode | FitItem | FitAtom | FitTable | FitCustom;

const isFitItem = (block: FitBlock): block is FitItem => LIST_KINDS.has(block.type);

/** Draft paragraphs that leave the list item holding them instead of joining its text. */
const leavingParagraphs = new WeakSet<object>();

const hardBreak = (): TextEditorPortableHardBreak => ({ type: 'hard-break' });

const isEmptyText = (node: unknown): boolean =>
  isRecord(node) && node.type === 'text' && node.text === '';

/** Inline content without the hard break that ends it, empty text runs after it aside. */
function withoutFinalBreak(content: readonly unknown[]): unknown[] {
  let end = content.length;
  while (end > 0 && isEmptyText(content[end - 1])) end -= 1;
  const last = content[end - 1];
  return isRecord(last) && last.type === 'hard-break'
    ? [...content.slice(0, end - 1), ...content.slice(end)]
    : [...content];
}

/**
 * Fits draft blocks to the content model. A block that a quote, a list item or a custom textblock
 * holds leaves it at its place, splitting it there; inside a list it also splits the outermost
 * list: every list item placed before it is closed, so a later item whose parent item lies before
 * that place becomes a top-level item, with its own nested items (uwg-te-req-blocks-1).
 */
class Fitter {
  readonly blocks: FitBlock[] = [];
  #epoch = 0;

  constructor(readonly context: FitContext) {}

  add(block: unknown): void {
    if (!isRecord(block)) return;
    const { type } = block;
    if (type === 'paragraph')
      this.blocks.push({
        type,
        id: block.id,
        align: storedAlign(block.align),
        content: this.#source(block.content),
      });
    else if (type === 'heading')
      this.blocks.push({
        type,
        id: block.id,
        level: block.level,
        align: storedAlign(block.align),
        content: this.#source(block.content),
      });
    else if (type === 'quote')
      this.#container(block, () => ({
        type: 'quote',
        id: undefined,
        align: storedAlign(block.align),
        content: [],
      }));
    else if (type === 'code')
      this.blocks.push({ type, id: block.id, language: block.language, text: block.text });
    else if (isListKind(type)) this.#item(block, type, null);
    else if (type === 'divider') this.blocks.push({ type, id: block.id, source: block });
    else if (type === 'image') {
      // An empty source is a pending image (filled in by an upload), kept; a missing one is not.
      if (typeof block.src === 'string') this.blocks.push({ type, id: block.id, source: block });
    } else if (type === 'table') {
      const table = this.#table(block);
      if (table) this.blocks.push(table);
    } else if (type === 'custom') this.#custom(block);
  }

  /** Places a block that leaves the block holding it, closing every open list item. */
  #leave(block: unknown): void {
    this.#epoch += 1;
    this.add(block);
  }

  /** The inline content of one textblock of the draft. */
  #source(content: unknown): unknown[] {
    const nodes = list(content);
    return this.context.imported ? withoutFinalBreak(nodes) : [...nodes];
  }

  /** A quote or custom textblock: its paragraphs join with hard breaks, other blocks leave it. */
  #container(draft: Rec, create: () => FitText | FitCustom): void {
    let id: unknown = draft.id;
    let part: FitText | FitCustom | null = create();
    let placed = false;
    let paragraphs = 0;
    let split = false;
    const place = (block: FitText | FitCustom) => {
      if (placed) return;
      block.id = id;
      id = undefined;
      this.blocks.push(block);
      placed = true;
    };
    const append = (content: unknown[], align: unknown) => {
      if (!part) {
        part = create();
        placed = false;
      }
      const target = part;
      if (paragraphs > 0) target.content!.push(hardBreak());
      target.content!.push(...content);
      if (paragraphs === 0 && target.type === 'quote') target.align ??= storedAlign(align);
      paragraphs += 1;
      if (target.content!.length > 0) place(target);
    };
    const own = this.#source(draft.content);
    if (own.length > 0) append(own, undefined);
    for (const child of list(draft.blocks)) {
      if (!isRecord(child)) continue;
      if (child.type === 'paragraph' && !leavingParagraphs.has(child)) {
        append(this.#source(child.content), child.align);
        continue;
      }
      // A part left empty is dropped; the block leaves at its place.
      part = null;
      paragraphs = 0;
      split = true;
      this.#leave(child);
    }
    if (part && !placed && !split) place(part);
  }

  /**
   * A list item: the paragraphs before its nested items join its text with hard breaks, nested
   * items stay its children, and every other block leaves it, as a paragraph after its nested
   * items does. The first part that is kept keeps the identifier and the start of an ordered list.
   */
  #item(draft: Rec, type: TextEditorListKind, parent: FitItem | null): void {
    let id: unknown = draft.id;
    let start: unknown = draft.start;
    const create = (): FitItem => ({
      type,
      id: undefined,
      start: undefined,
      checked: draft.checked,
      align: storedAlign(draft.align),
      content: [],
      children: [],
      epoch: -1,
      placed: false,
    });
    const place = (item: FitItem) => {
      if (item.placed) return;
      item.id = id;
      item.start = start;
      id = undefined;
      start = undefined;
      if (parent?.placed && parent.epoch === this.#epoch) parent.children.push(item);
      else this.blocks.push(item);
      item.epoch = this.#epoch;
      item.placed = true;
    };
    let part: FitItem | null = create();
    let paragraphs = 0;
    let nested = false;
    let split = false;
    const append = (content: unknown[], align: unknown) => {
      const target = (part ??= create());
      if (paragraphs > 0) target.content.push(hardBreak());
      target.content.push(...content);
      if (paragraphs === 0) target.align ??= storedAlign(align);
      paragraphs += 1;
      if (target.content.length > 0) place(target);
    };
    const own = this.#source(draft.content);
    if (own.length > 0) append(own, undefined);
    for (const child of list(draft.children)) {
      if (!isRecord(child)) continue;
      if (isListKind(child.type)) {
        // Without a part, after a split, the nested item has no parent left and goes up a level.
        if (part) place(part);
        nested = true;
        this.#item(child, child.type, part);
        continue;
      }
      if (child.type === 'paragraph' && !nested && !leavingParagraphs.has(child)) {
        append(this.#source(child.content), child.align);
        continue;
      }
      part = null;
      paragraphs = 0;
      nested = false;
      split = true;
      this.#leave(child);
    }
    if (part && !part.placed && !split) place(part);
  }

  #table(draft: Rec): FitTable | null {
    const rows = list(draft.rows).map((row) =>
      (isRecord(row) ? list(row.cells) : []).filter(isRecord).map((cell) => this.#cell(cell)),
    );
    if (!rows.some((cells) => cells.length > 0)) return null;
    return {
      type: 'table',
      id: draft.id,
      headerRow: draft.headerRow,
      headerColumn: draft.headerColumn,
      widths: draft.widths,
      rows,
    };
  }

  /** A cell holds paragraphs only: every other block becomes paragraphs of its text. */
  #cell(cell: Rec): FitCell {
    const paragraphs: unknown[][] = [];
    let align = storedAlign(cell.align);
    for (const paragraph of list(cell.paragraphs))
      if (isRecord(paragraph)) paragraphs.push(this.#source(paragraph.content));
    for (const block of list(cell.blocks)) {
      if (!isRecord(block)) continue;
      if (block.type === 'paragraph') {
        if (paragraphs.length === 0) align ??= storedAlign(block.align);
        paragraphs.push(this.#source(block.content));
      } else paragraphs.push(...this.#textParagraphs(block));
    }
    return {
      rowSpan: cell.rowSpan,
      colSpan: cell.colSpan,
      background: cell.background,
      align,
      header: cell.header,
      paragraphs,
    };
  }

  /** The paragraphs that a block becomes in a cell: one per block it fits to, holding its text. */
  #textParagraphs(block: Rec): unknown[][] {
    const fitter = new Fitter(this.context);
    fitter.add(block);
    const paragraphs: unknown[][] = [];
    const visit = (finished: TextEditorPortableBlock) => {
      const text = blockTextOf(finished, this.context.lookup);
      if (text !== null) paragraphs.push(textToInline(text));
      if (isListItem(finished)) finished.children.forEach(visit);
    };
    finishBlocks(fitter.blocks, this.context).forEach(visit);
    return paragraphs;
  }

  #custom(draft: Rec): void {
    const name = typeof draft.name === 'string' ? draft.name : '';
    if (name === '') return;
    const definition = this.context.lookup.blocks.get(name);
    const textblock = definition
      ? definition.content === 'inline'
      : Array.isArray(draft.content) || Array.isArray(draft.blocks);
    if (!textblock) {
      this.blocks.push({
        type: 'custom',
        id: draft.id,
        name,
        attrs: draft.attrs,
        content: undefined,
      });
      return;
    }
    this.#container(draft, () => ({
      type: 'custom',
      id: undefined,
      name,
      attrs: draft.attrs,
      content: [],
    }));
  }
}

/** Gives every block a valid identifier, unique in the document; answers how many it replaced. */
function assignIds(blocks: readonly FitBlock[], create: (() => string) | undefined): number {
  const order: FitBlock[] = [];
  const visit = (block: FitBlock) => {
    order.push(block);
    if (isFitItem(block)) block.children.forEach(visit);
  };
  blocks.forEach(visit);
  const repair = planIdRepair(
    order.map((block) => (typeof block.id === 'string' ? block.id : null)),
    create,
  );
  order.forEach((block, index) => {
    block.id = repair.ids[index];
  });
  return repair.replaced;
}

const NO_BREAK_SPACE = /\u00a0/gu;
/** The marks besides link, colors and code, in nesting order. */
const FLAG_MARKS = ['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript'] as const;

/**
 * Canonical marks: a link with a destination, palette names for colors, `true` flags; inline code
 * keeps only a link, and superscript wins over subscript, since a run cannot hold both.
 */
function canonicalMarks(marks: unknown): TextEditorPortableMarks | undefined {
  if (!isRecord(marks)) return undefined;
  const result: { -readonly [K in keyof TextEditorPortableMarks]: TextEditorPortableMarks[K] } = {};
  if (typeof marks.link === 'string' && marks.link !== '') result.link = marks.link;
  if (marks.code === true) result.code = true;
  else {
    if (isTextEditorColor(marks.textColor)) result.textColor = marks.textColor;
    if (isTextEditorColor(marks.highlight)) result.highlight = marks.highlight;
    for (const flag of FLAG_MARKS) if (marks[flag] === true) result[flag] = true;
    if (result.superscript) delete result.subscript;
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

function sameMarks(
  a: TextEditorPortableMarks | undefined,
  b: TextEditorPortableMarks | undefined,
): boolean {
  if (a === b) return true;
  return PORTABLE_MARK_ORDER.every((mark) => a?.[mark] === b?.[mark]);
}

/** Canonical inline content: runs with equal marks merged, empty runs and unknown nodes dropped. */
function canonicalInline(
  content: readonly unknown[],
  context: FitContext,
): TextEditorPortableInline[] {
  const result: (
    | { readonly type: 'text'; text: string; readonly marks?: TextEditorPortableMarks }
    | TextEditorPortableHardBreak
    | TextEditorPortableInlineNode
  )[] = [];
  for (const node of content) {
    if (!isRecord(node)) continue;
    if (node.type === 'text') {
      if (typeof node.text !== 'string') continue;
      const text = context.imported ? node.text.replace(NO_BREAK_SPACE, ' ') : node.text;
      if (text === '') continue;
      const marks = canonicalMarks(node.marks);
      const last = result[result.length - 1];
      if (last?.type === 'text' && sameMarks(last.marks, marks)) last.text += text;
      else result.push(marks ? { type: 'text', text, marks } : { type: 'text', text });
    } else if (node.type === 'hard-break') result.push(hardBreak());
    else if (node.type === 'custom' && typeof node.name === 'string' && node.name !== '') {
      const definition = context.lookup.inlines.get(node.name);
      result.push({
        type: 'custom',
        name: node.name,
        attrs: definition
          ? definitionAttributes(definition, node.attrs)
          : plainAttributes(node.attrs),
      });
    }
  }
  return result;
}

const headingLevel = (value: unknown): TextEditorHeadingLevel =>
  typeof value === 'number' && Number.isFinite(value)
    ? (Math.min(6, Math.max(1, Math.round(value))) as TextEditorHeadingLevel)
    : 1;

/** The start of an ordered list: a whole number other than 1, held by the list's first item. */
const listStart = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value !== 1
    ? value
    : undefined;

const positive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;

const LANGUAGE = /^\S+$/u;

function finishItems(items: readonly FitItem[], context: FitContext): TextEditorPortableListItem[] {
  let previous: string | undefined;
  return items.map((item) => {
    const finished = finishItem(item, context, previous !== 'list-ordered');
    previous = item.type;
    return finished;
  });
}

function finishItem(
  item: FitItem,
  context: FitContext,
  firstOfList: boolean,
): TextEditorPortableListItem {
  const id = typeof item.id === 'string' ? { id: item.id } : {};
  const align = item.align ? { align: item.align } : {};
  const content = canonicalInline(item.content, context);
  const children = finishItems(item.children, context);
  if (item.type === 'list-ordered') {
    const start = firstOfList ? listStart(item.start) : undefined;
    return {
      type: 'list-ordered',
      ...id,
      ...(start === undefined ? {} : { start }),
      ...align,
      content,
      children,
    };
  }
  if (item.type === 'list-task')
    return {
      type: 'list-task',
      ...id,
      checked: item.checked === true,
      ...align,
      content,
      children,
    };
  return { type: 'list-bullet', ...id, ...align, content, children };
}

function finishTable(
  table: FitTable,
  context: FitContext,
  id: { id?: string },
): TextEditorPortableTable {
  const placement = placeCells(table.rows);
  const { columns } = placement;
  const sources = (row: number) => placement.cells.filter((placed) => placed.row === row);
  const header = (placed: TextEditorPortablePlacedCell<FitCell>) => placed.cell.header === true;
  const firstRow = sources(0);
  const headerRow =
    typeof table.headerRow === 'boolean'
      ? table.headerRow
      : firstRow.length > 0 && firstRow.every(header);
  const leading = table.rows
    .map((_, row) => placement.starts[row]?.[0])
    .slice(headerRow ? 1 : 0)
    .filter((placed): placed is TextEditorPortablePlacedCell<FitCell> => placed !== undefined);
  const headerColumn =
    typeof table.headerColumn === 'boolean'
      ? table.headerColumn
      : leading.length > 0 && leading.every(header);
  const rows: TextEditorPortableTableRow[] = table.rows.map((_, row) => {
    const cells: TextEditorPortableTableCell[] = [];
    for (let column = 0; column < columns; column += 1) {
      const placed = placement.starts[row]?.[column];
      if (placed) cells.push(finishCell(placed, context));
      else if (!placement.covered[row]?.[column]) cells.push({ paragraphs: [{ content: [] }] });
    }
    return { cells };
  });
  const widths =
    Array.isArray(table.widths) &&
    table.widths.length >= columns &&
    table.widths.slice(0, columns).every(positive)
      ? { widths: (table.widths as number[]).slice(0, columns) }
      : {};
  return { type: 'table', ...id, headerRow, headerColumn, ...widths, rows };
}

function finishCell(
  placed: TextEditorPortablePlacedCell<FitCell>,
  context: FitContext,
): TextEditorPortableTableCell {
  const { cell } = placed;
  const paragraphs = cell.paragraphs.length > 0 ? cell.paragraphs : [[]];
  return {
    ...(placed.rowSpan > 1 ? { rowSpan: placed.rowSpan } : {}),
    ...(placed.colSpan > 1 ? { colSpan: placed.colSpan } : {}),
    ...(isTextEditorColor(cell.background) ? { background: cell.background } : {}),
    ...(cell.align ? { align: cell.align } : {}),
    paragraphs: paragraphs.map((content) => ({ content: canonicalInline(content, context) })),
  };
}

function finishBlock(
  block: FitBlock,
  context: FitContext,
  firstOfList: boolean,
): TextEditorPortableBlock {
  const id = typeof block.id === 'string' ? { id: block.id } : {};
  switch (block.type) {
    case 'paragraph':
    case 'quote':
      return {
        type: block.type,
        ...id,
        ...(block.align ? { align: block.align } : {}),
        content: canonicalInline(block.content, context),
      };
    case 'heading':
      return {
        type: 'heading',
        ...id,
        level: headingLevel(block.level),
        ...(block.align ? { align: block.align } : {}),
        content: canonicalInline(block.content, context),
      };
    case 'code': {
      const language = typeof block.language === 'string' ? block.language.trim() : '';
      return {
        type: 'code',
        ...id,
        ...(LANGUAGE.test(language) ? { language } : {}),
        text: typeof block.text === 'string' ? block.text : '',
      };
    }
    case 'divider':
      return { type: 'divider', ...id };
    case 'image': {
      const { source } = block;
      return {
        type: 'image',
        ...id,
        src: source.src as string,
        alt: typeof source.alt === 'string' ? source.alt : '',
        ...(positive(source.width) ? { width: source.width } : {}),
      };
    }
    case 'table':
      return finishTable(block, context, id);
    case 'custom': {
      const definition = context.lookup.blocks.get(block.name);
      return {
        type: 'custom',
        ...id,
        name: block.name,
        attrs: definition
          ? definitionAttributes(definition, block.attrs)
          : plainAttributes(block.attrs),
        ...(block.content ? { content: canonicalInline(block.content, context) } : {}),
      };
    }
    default:
      return finishItem(block, context, firstOfList);
  }
}

function finishBlocks(blocks: readonly FitBlock[], context: FitContext): TextEditorPortableBlock[] {
  let previous: string | undefined;
  return blocks.map((block) => {
    const finished = finishBlock(block, context, previous !== 'list-ordered');
    previous = block.type;
    return finished;
  });
}

/**
 * Canonicalizes a document or a draft (uwg-te-req-content-3): fits it to the content model, so
 * the paragraphs of a quote, or of a list item before its nested items, join with hard breaks, any
 * other block that a textblock or a list item holds leaves it at its place and splits it there,
 * splitting the outermost list as an inserted block does, a part left empty being dropped, every
 * block but a paragraph in a table cell becomes paragraphs of its text, and a list that mixes
 * kinds splits into lists of one kind; merges adjacent text with equal marks; applies the mark
 * exclusions; makes tables rectangular, padding short rows with empty cells, with positional
 * headers; keeps the start of an ordered list on its first item only; checks attributes, a custom
 * node's against its definition; validates identifiers (uwg-te-req-content-7), the first of
 * duplicates keeping its identifier and the others and invalid ones getting fresh ones, with one
 * `text-editor-block-id` diagnostic; and turns an empty document into one empty paragraph. A
 * custom node without a definition keeps its content; `convertUnsupported` converts it. The
 * importer resolves the inner of a nested superscript and subscript as it walks its source; a run
 * that carries both keeps superscript. Without `imported`, canonicalizing a canonical document
 * returns an equal document. The input is never changed.
 */
export function canonicalize(
  document: TextEditorPortableDraft,
  options: TextEditorCanonicalizeOptions = {},
): TextEditorCanonicalResult {
  const context: FitContext = {
    lookup: nodeLookup(options.nodes),
    imported: options.imported === true,
  };
  const fitter = new Fitter(context);
  for (const block of list(isRecord(document) ? document.blocks : undefined)) fitter.add(block);
  if (fitter.blocks.length === 0)
    fitter.blocks.push({ type: 'paragraph', id: undefined, align: undefined, content: [] });
  const replaced = assignIds(fitter.blocks, options.createId);
  const noun = replaced === 1 ? 'identifier' : 'identifiers';
  const diagnostics: TextEditorDiagnostic[] =
    replaced > 0
      ? [
          {
            code: 'text-editor-block-id',
            message: `Replaced ${replaced} invalid or duplicate block ${noun}.`,
          },
        ]
      : [];
  return { document: { blocks: finishBlocks(fitter.blocks, context) }, diagnostics };
}

// Content an engine cannot represent (uwg-te-req-engine-8, uwg-te-tab-engine r8, r9)

export interface TextEditorConversionInput {
  /** The capabilities of the engine that loads the content. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
  /** The custom node definitions, whose text converted nodes become. */
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
}

export interface TextEditorConversion {
  /** The input document itself when nothing was converted. */
  readonly document: TextEditorPortableDocument;
  /** The converted kinds, each once, in document order: block kinds and custom node names. */
  readonly converted: readonly string[];
}

/** The capability that a block's kind needs; a paragraph needs none, since conversion makes one. */
const blockCapability = (block: TextEditorPortableBlock): TextEditorCapability | null =>
  block.type === 'paragraph'
    ? null
    : block.type === 'custom'
      ? `block.${block.name}`
      : `block.${block.type}`;

/**
 * Converts the content that an engine cannot represent, whether loaded or carried over to a new
 * mount: each block of a kind that the capabilities lack becomes a paragraph holding its text as
 * the text format writes it, a line break becoming a hard break, and keeping its identifier, a
 * converted list item's nested items following it as an inserted block's later items do; each
 * inline node whose kind they lack becomes its definition's text, or nothing without one. The
 * caller reports one `text-editor-content-converted` diagnostic per load (`convertedDiagnostic`).
 */
export function convertUnsupported(
  document: TextEditorPortableDocument,
  input: TextEditorConversionInput,
): TextEditorConversion {
  const lookup = nodeLookup(input.nodes);
  const converted: string[] = [];
  const note = (kind: string) => {
    if (!converted.includes(kind)) converted.push(kind);
  };
  const unsupported = (node: TextEditorPortableInline): node is TextEditorPortableInlineNode =>
    node.type === 'custom' && !input.capabilities.has(`inline.${node.name}`);
  const inline = (content: readonly TextEditorPortableInline[]): TextEditorPortableInline[] =>
    content.flatMap((node) => {
      if (!unsupported(node)) return [node];
      note(node.name);
      return textToInline(inlineNodeText(node as unknown as Rec, lookup));
    });
  /** Names the inline kinds that a converted block's text takes in. */
  const noteInline = (block: TextEditorPortableBlock) => {
    const contents =
      block.type === 'table'
        ? block.rows.flatMap((row) =>
            row.cells.flatMap((cell) => cell.paragraphs.map((paragraph) => paragraph.content)),
          )
        : 'content' in block && block.content
          ? [block.content]
          : [];
    for (const content of contents)
      for (const node of content) if (unsupported(node)) note(node.name);
  };
  const convert = (block: TextEditorPortableBlock): TextEditorPortableDraftBlock[] => {
    const capability = blockCapability(block);
    if (capability !== null && !input.capabilities.has(capability)) {
      note(block.type === 'custom' ? block.name : block.type);
      noteInline(block);
      const paragraph: TextEditorPortableParagraph = {
        type: 'paragraph',
        ...(block.id === undefined ? {} : { id: block.id }),
        content: textToInline(blockTextOf(block, lookup) ?? ''),
      };
      leavingParagraphs.add(paragraph);
      return isListItem(block) ? [paragraph, ...block.children.flatMap(convert)] : [paragraph];
    }
    switch (block.type) {
      case 'paragraph':
      case 'heading':
      case 'quote':
        return [{ ...block, content: inline(block.content) }];
      case 'list-bullet':
      case 'list-ordered':
      case 'list-task':
        return [
          { ...block, content: inline(block.content), children: block.children.flatMap(convert) },
        ];
      case 'table':
        return [
          {
            ...block,
            rows: block.rows.map((row) => ({
              cells: row.cells.map((cell) => ({
                ...cell,
                paragraphs: cell.paragraphs.map((p) => ({ content: inline(p.content) })),
              })),
            })),
          },
        ];
      case 'custom':
        return [block.content ? { ...block, content: inline(block.content) } : block];
      default:
        return [block];
    }
  };
  const blocks = document.blocks.flatMap(convert);
  if (converted.length === 0) return { document, converted };
  return { document: canonicalize({ blocks }, { nodes: input.nodes }).document, converted };
}

/** The diagnostic naming the converted kinds, or `null` when nothing was converted. */
export function convertedDiagnostic(converted: readonly string[]): TextEditorDiagnostic | null {
  return converted.length === 0
    ? null
    : {
        code: 'text-editor-content-converted',
        message: `Converted content that the engine cannot represent: ${converted.join(', ')}.`,
      };
}
