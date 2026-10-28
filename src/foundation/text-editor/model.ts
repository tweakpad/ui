/**
 * Normalized model of the text editor (Widgets `uwg-te-req-engine-3`, `uwg-te-req-engine-4`,
 * `uwg-te-req-blocks-1`, `uwg-te-tab-engine` r6–r8, `uwg-te-req-tables-1`).
 *
 * Engine-neutral addresses, selections, the block tree, the table model and the normalized state
 * that every engine adapter reports. Everything here is plain data: engine positions, keys and
 * nodes never leave an adapter.
 */
import type { TextEditorColor } from './palette.js';

// Values

/** A value of a block or inline node attribute. */
export type TextEditorAttributeValue = string | number | boolean | null;

/** Attribute values by attribute name. */
export type TextEditorAttributes = Readonly<Record<string, TextEditorAttributeValue>>;

/**
 * Logical horizontal alignment of a block or a table cell. `start` is the default and is stored
 * as no alignment, so the state reports it as `null`.
 */
export type TextEditorAlign = 'start' | 'center' | 'end' | 'justify';

export type TextEditorHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

// Block kinds (uwg-te-req-blocks-1)

/** The kinds of list item: bullet, ordered and task. Each kind is its own block kind. */
export type TextEditorListKind = 'list-bullet' | 'list-ordered' | 'list-task';

/** The built-in block kinds that hold text, which `block.set-type` turns blocks into. */
export type TextEditorTextblockKind =
  'paragraph' | 'heading' | 'quote' | 'code' | TextEditorListKind;

/** The built-in block kinds. */
export type TextEditorBuiltinBlockKind = TextEditorTextblockKind | 'divider' | 'image' | 'table';

/** A block kind: a built-in kind or the name of a custom block. */
export type TextEditorBlockKind = TextEditorBuiltinBlockKind | (string & {});

/**
 * The attributes of a block, by kind:
 * - `paragraph`, `quote`, `list-bullet`: `align`;
 * - `heading`: `level` (1 to 6) and `align`;
 * - `code`: `language` (a string or `null`);
 * - `list-ordered`: `align` and `start`, the number of a list's first item, which that item holds;
 * - `list-task`: `align` and `checked`;
 * - `image`: `src`, `alt` and `width` (CSS pixels or `null`);
 * - `table`: `rows`, `columns`, `headerRow` and `headerColumn`;
 * - `divider`: none;
 * - a custom block: the attributes of its definition.
 *
 * `align` holds `center`, `end` or `justify`, or `null` for the default start alignment.
 */
export type TextEditorBlockAttributes = TextEditorAttributes;

// Addresses (uwg-te-req-engine-3)

/** A cell of a table by row and column; the cell at the first row and column of a span stands for it. */
export interface TextEditorCellAddress {
  readonly row: number;
  readonly column: number;
}

/** A cell together with a paragraph of it, for text in a table cell. */
export interface TextEditorCellPoint extends TextEditorCellAddress {
  /** The index of the paragraph within the cell. */
  readonly paragraph: number;
}

/**
 * A text point: a block identifier and a UTF-16 offset into that block's own inline content, in
 * which an inline node or a hard break counts as one unit. Text in a table cell uses the table
 * identifier as `block` and names the cell and its paragraph in `cell`.
 */
export interface TextEditorTextPoint {
  readonly block: string;
  readonly cell?: TextEditorCellPoint | undefined;
  readonly offset: number;
}

/** A range of text within one block, or within one paragraph of a table cell; `from <= to`. */
export interface TextEditorTextRange {
  readonly block: string;
  readonly cell?: TextEditorCellPoint | undefined;
  readonly from: number;
  readonly to: number;
}

/** A rectangular range of cells from its anchor cell to its head cell. */
export interface TextEditorCellRange {
  readonly anchor: TextEditorCellAddress;
  readonly head: TextEditorCellAddress;
}

// Selections (uwg-te-req-engine-4; uwg-te-tab-actions r6)

export interface TextEditorNoSelection {
  readonly kind: 'none';
}

/** A text selection from its anchor point to its head point; `empty` for a caret. */
export interface TextEditorTextSelection {
  readonly kind: 'text';
  readonly anchor: TextEditorTextPoint;
  readonly head: TextEditorTextPoint;
  readonly empty: boolean;
}

/** A selection of whole blocks, their identifiers in document order. */
export interface TextEditorBlockSelection {
  readonly kind: 'blocks';
  readonly ids: readonly string[];
}

/** A range of cells of one table. */
export interface TextEditorCellSelection {
  readonly kind: 'cells';
  readonly table: string;
  readonly range: TextEditorCellRange;
}

/** The selection that the state reports. */
export type TextEditorSelection =
  | TextEditorNoSelection
  | TextEditorTextSelection
  | TextEditorBlockSelection
  | TextEditorCellSelection;

/** A text selection to set; without `head` it is a caret at `anchor`. */
export interface TextEditorTextSelectionInput {
  readonly kind: 'text';
  readonly anchor: TextEditorTextPoint;
  readonly head?: TextEditorTextPoint | undefined;
}

/** A caret at the start or the end of a block, or of a cell of the table that `block` names. */
export interface TextEditorCaretSelectionInput {
  readonly kind: 'caret';
  readonly block: string;
  readonly cell?: TextEditorCellAddress | undefined;
  readonly position: 'start' | 'end';
}

/** A selection to set: a text, caret, block or cell selection. */
export type TextEditorSelectionInput =
  | TextEditorTextSelectionInput
  | TextEditorCaretSelectionInput
  | TextEditorBlockSelection
  | TextEditorCellSelection;

// Block tree (uwg-te-tab-engine r7)

/**
 * A block of the block tree. List items nest under list items only; list containers, cell
 * paragraphs and inline nodes are never blocks.
 */
export interface TextEditorBlock {
  readonly id: string;
  readonly kind: TextEditorBlockKind;
  readonly attrs: TextEditorBlockAttributes;
  /** The parent list item, or `null` for a top-level block. */
  readonly parentId: string | null;
  /** Zero-based nesting depth. */
  readonly depth: number;
  /** Position among the parent's children, or among the top-level blocks. */
  readonly index: number;
  /** Identifiers of the nested list items, in document order. */
  readonly children: readonly string[];
  /** The block is a textblock that holds no text and no inline node. */
  readonly empty: boolean;
  /**
   * The block holds text and the caret: a paragraph, heading, quote, code block, list item or
   * custom textblock; never a divider, image, table or custom atom.
   */
  readonly textblock: boolean;
}

/** The block tree of one revision of the document. */
export interface TextEditorBlockTree {
  /** The content version the tree describes. */
  readonly version: number;
  /** Identifiers of the top-level blocks, in document order. */
  readonly roots: readonly string[];
  get(id: string): TextEditorBlock | undefined;
  /** Every block in document order, each before its nested items. */
  ordered(): readonly TextEditorBlock[];
}

/** Client rectangles of a block. */
export interface TextEditorBlockRects {
  /** The block together with its nested items. */
  readonly box: DOMRectReadOnly;
  /** The block's own element. */
  readonly content: DOMRectReadOnly;
  /** The first line box; the height of a line in an empty block. */
  readonly firstLine: DOMRectReadOnly;
}

// Table model (uwg-te-tab-engine r8; uwg-te-req-tables-1)

/** A cell of the table model, at the first row and column of its span. */
export interface TextEditorTableCell {
  readonly row: number;
  readonly column: number;
  readonly rowSpan: number;
  readonly colSpan: number;
  /** In the header row or the header column. */
  readonly header: boolean;
  readonly background: TextEditorColor | null;
  /** `center`, `end` or `justify`, or `null` for the default start alignment. */
  readonly align: TextEditorAlign | null;
  readonly empty: boolean;
}

/** A span-aware table grid. */
export interface TextEditorTableModel {
  readonly id: string;
  readonly rows: number;
  readonly columns: number;
  /** The cells at the first row and column of their spans, in row-major order. */
  readonly cells: readonly TextEditorTableCell[];
  /** `grid[row][column]` is the index in `cells` of the cell covering that position. */
  readonly grid: readonly (readonly number[])[];
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
  /** The width of every column in CSS pixels, or `null` for automatic widths. */
  readonly widths: readonly number[] | null;
  /** Some cell spans more than one row or column. */
  readonly merged: boolean;
}

// Normalized state (uwg-te-req-engine-4)

/** The marks that `mark.toggle` turns on and off. */
export type TextEditorToggleMark =
  'bold' | 'italic' | 'underline' | 'strike' | 'code' | 'superscript' | 'subscript';

/** The color marks that `mark.color` sets. */
export type TextEditorColorMark = 'text-color' | 'highlight';

/**
 * Whether a mark covers the selection: `on` for every selected character, or at a caret for the
 * marks that typed text would take, `mixed` for some and `off` for none.
 */
export type TextEditorMarkStatus = 'on' | 'off' | 'mixed';

export interface TextEditorMarkState {
  readonly bold: TextEditorMarkStatus;
  readonly italic: TextEditorMarkStatus;
  readonly underline: TextEditorMarkStatus;
  readonly strike: TextEditorMarkStatus;
  readonly code: TextEditorMarkStatus;
  readonly superscript: TextEditorMarkStatus;
  readonly subscript: TextEditorMarkStatus;
  /** The hue of the text color, `mixed`, or `null` for none. */
  readonly textColor: TextEditorColor | 'mixed' | null;
  /** The hue of the highlight, `mixed`, or `null` for none. */
  readonly highlight: TextEditorColor | 'mixed' | null;
}

/** The block at the selection. */
export interface TextEditorBlockState {
  readonly id: string;
  readonly kind: TextEditorBlockKind;
  readonly attrs: TextEditorBlockAttributes;
  readonly depth: number;
}

/**
 * A block kind as `blockKinds` reports it: the kind, with a heading qualified by its level, as
 * `heading:1` to `heading:6`.
 */
export type TextEditorBlockKindKey = TextEditorBlockKind | `heading:${TextEditorHeadingLevel}`;

/** The link at the selection. */
export interface TextEditorLinkState {
  readonly href: string;
  /** The whole link. */
  readonly range: TextEditorTextRange;
}

/** The table at the selection. */
export interface TextEditorTableState {
  readonly id: string;
  /** The cell holding the selection head. */
  readonly cell: TextEditorCellAddress;
  /** The cell range, or `null` when the selection is text in one cell. */
  readonly range: TextEditorCellRange | null;
  readonly rows: number;
  readonly columns: number;
  readonly headerRow: boolean;
  readonly headerColumn: boolean;
  /** Some cell of the table spans more than one row or column. */
  readonly merged: boolean;
  /** The cell holding the selection head spans more than one row or column. */
  readonly cellMerged: boolean;
}

/** The caret of a collapsed text selection. */
export interface TextEditorCaretState {
  readonly point: TextEditorTextPoint;
  /**
   * The text of the caret's textblock before the caret: at most its last 64 UTF-16 code units, a
   * hard break as a line feed and an inline node as U+FFFC.
   */
  readonly textBefore: string;
  /** The caret lies in inline code or in a code block. */
  readonly inCode: boolean;
}

/** The empty textblock that holds the caret. */
export interface TextEditorEmptyBlockState {
  readonly id: string;
  readonly kind: TextEditorBlockKind;
}

export interface TextEditorHistoryState {
  readonly undo: boolean;
  readonly redo: boolean;
}

/** The normalized state: a frozen snapshot that every engine adapter reports alike. */
export interface TextEditorEngineState {
  /** Increases on every engine update, a selection change included. */
  readonly version: number;
  /** Increases on every document change. */
  readonly contentVersion: number;
  readonly editable: boolean;
  readonly focused: boolean;
  readonly composing: boolean;
  /** The document is one empty paragraph. */
  readonly empty: boolean;
  readonly selection: TextEditorSelection;
  readonly marks: TextEditorMarkState;
  /** The block at the selection head, or `null`. */
  readonly block: TextEditorBlockState | null;
  /** The distinct block kinds that the selection spans, in document order. */
  readonly blockKinds: readonly TextEditorBlockKindKey[];
  /**
   * The alignment that every selected textblock shares, `mixed`, or `null` for the default start
   * alignment or no textblock.
   */
  readonly align: TextEditorAlign | 'mixed' | null;
  readonly link: TextEditorLinkState | null;
  readonly table: TextEditorTableState | null;
  readonly caret: TextEditorCaretState | null;
  readonly emptyBlock: TextEditorEmptyBlockState | null;
  readonly history: TextEditorHistoryState;
}
