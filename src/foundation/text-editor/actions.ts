/**
 * Actions of the text editor (Widgets `uwg-te-par-engine-2`, `uwg-te-tab-actions`,
 * `uwg-te-req-engine-5`, `uwg-te-req-evt-1`).
 *
 * An action is a plain object with a dotted type and its payload. The widget passes lists of
 * actions to an engine's `execute` and in its requests, and `run` accepts them. `selection.set` is
 * the only action that does not change the document. Every `can` validates an action with
 * `isValidTextEditorAction` before it answers, so that an unknown type or a malformed payload
 * answers `false`.
 */
import { domError } from '../dom-error.js';
import type { TextEditorCapability } from './capabilities.js';
import type { TextEditorPortableFragment } from './content/portable.js';
import type { TextEditorFormat, TextEditorHistoryMode } from './engine.js';
import type {
  TextEditorAlign,
  TextEditorAttributes,
  TextEditorAttributeValue,
  TextEditorBlockAttributes,
  TextEditorBlockKind,
  TextEditorCellAddress,
  TextEditorCellRange,
  TextEditorColorMark,
  TextEditorNoSelection,
  TextEditorSelectionInput,
  TextEditorTextRange,
  TextEditorToggleMark,
} from './model.js';
import { isTextEditorColor, type TextEditorColor } from './palette.js';

// Marks and alignments (uwg-te-tab-content-model)

/** The toggle marks, in the order the state reports them. */
export const TOGGLE_MARKS: readonly TextEditorToggleMark[] = Object.freeze([
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  'superscript',
  'subscript',
]);

const STORED_ALIGNMENTS: ReadonlySet<unknown> = new Set<TextEditorAlign>([
  'center',
  'end',
  'justify',
]);

/**
 * The alignment that a block or a cell stores: `center`, `end` or `justify`. `start`, the default,
 * and any other value store nothing (`undefined`).
 */
export function storedAlign(value: unknown): TextEditorAlign | undefined {
  return STORED_ALIGNMENTS.has(value) ? (value as TextEditorAlign) : undefined;
}

// Payload parts

/** A place in the block tree: a parent list item, or `null` for the top level, and an index. */
export interface TextEditorBlockSlot {
  readonly parent: string | null;
  /** The position among the parent's children, counted without the blocks that move there. */
  readonly index: number;
}

/** Where `blocks.insert` puts its block: after, before or in place of a block, or at a slot. */
export type TextEditorInsertPosition =
  | { readonly after: string }
  | { readonly before: string }
  | { readonly replace: string }
  | TextEditorBlockSlot;

/**
 * The selection after `blocks.insert`: a caret at the start or the end of the new block, a block
 * selection of it, or no change.
 */
export type TextEditorInsertSelection = 'start' | 'end' | 'block' | 'none';

/** The cells that `table.align` and `table.background` change. */
export type TextEditorTableTarget =
  | { readonly row: number }
  | { readonly column: number }
  | { readonly range: TextEditorCellRange }
  | { readonly all: true };

// Marks and links (uwg-te-tab-actions r1)

/** Turns a mark on across the selection, or off when it covers all of it. */
export interface TextEditorMarkToggleAction {
  readonly type: 'mark.toggle';
  readonly mark: TextEditorToggleMark;
}

/** Sets the text color or the highlight to a hue, or clears it with `null`. */
export interface TextEditorMarkColorAction {
  readonly type: 'mark.color';
  readonly mark: TextEditorColorMark;
  readonly color: TextEditorColor | null;
}

/** Removes every mark but links. */
export interface TextEditorMarkClearAction {
  readonly type: 'mark.clear';
}

/**
 * Links the whole link at the selection, or else the selected text or `range`, to `href`; over a
 * collapsed selection it inserts `text` as linked text.
 */
export interface TextEditorLinkSetAction {
  readonly type: 'link.set';
  readonly href: string;
  readonly text?: string | undefined;
  readonly range?: TextEditorTextRange | undefined;
}

/** Removes the link at the selection or over `range`. */
export interface TextEditorLinkUnsetAction {
  readonly type: 'link.unset';
  readonly range?: TextEditorTextRange | undefined;
}

// Block attributes (uwg-te-tab-actions r2)

/**
 * Turns the blocks of the selection, or the blocks of `ids`, into a textblock kind with `attrs`; a
 * heading needs `attrs.level`. With `toggle`, blocks already of that kind turn into paragraphs.
 */
export interface TextEditorBlockSetTypeAction {
  readonly type: 'block.set-type';
  readonly kind: TextEditorBlockKind;
  readonly attrs?: TextEditorBlockAttributes | undefined;
  readonly ids?: readonly string[] | undefined;
  readonly toggle?: boolean | undefined;
}

/** Changes attributes of one block, such as the checked state of a task item. */
export interface TextEditorBlockSetAttrsAction {
  readonly type: 'block.set-attrs';
  readonly id: string;
  readonly attrs: TextEditorBlockAttributes;
}

/** Aligns the textblocks of the selection or of `ids`; `null` and `start` restore the default. */
export interface TextEditorBlockAlignAction {
  readonly type: 'block.align';
  readonly align: TextEditorAlign | null;
  readonly ids?: readonly string[] | undefined;
}

/** Nests the list items of the selection or of `ids`. */
export interface TextEditorBlockIndentAction {
  readonly type: 'block.indent';
  readonly ids?: readonly string[] | undefined;
}

/** Unnests the list items of the selection or of `ids`. */
export interface TextEditorBlockOutdentAction {
  readonly type: 'block.outdent';
  readonly ids?: readonly string[] | undefined;
}

// Blocks (uwg-te-tab-actions r3)

/**
 * Inserts a block of a kind with `attrs` at `at`, or else at the point of insertion of the
 * selection. An image needs `attrs.src`, a table `attrs.rows` and `attrs.columns`, a heading
 * `attrs.level`.
 */
export interface TextEditorBlocksInsertAction {
  readonly type: 'blocks.insert';
  readonly kind: TextEditorBlockKind;
  readonly attrs?: TextEditorBlockAttributes | undefined;
  readonly at?: TextEditorInsertPosition | undefined;
  readonly select?: TextEditorInsertSelection | undefined;
}

/** Moves blocks, each list item with its nested items, to a slot. */
export interface TextEditorBlocksMoveAction {
  readonly type: 'blocks.move';
  readonly ids: readonly string[];
  readonly to: TextEditorBlockSlot;
}

/** Inserts copies of blocks after the last of them; the copies receive fresh identifiers. */
export interface TextEditorBlocksDuplicateAction {
  readonly type: 'blocks.duplicate';
  readonly ids: readonly string[];
}

export interface TextEditorBlocksDeleteAction {
  readonly type: 'blocks.delete';
  readonly ids: readonly string[];
}

// Text and inline nodes (uwg-te-tab-actions r4)

/** Inserts text at the selection, or in place of `range`. */
export interface TextEditorTextInsertAction {
  readonly type: 'text.insert';
  readonly text: string;
  readonly range?: TextEditorTextRange | undefined;
}

export interface TextEditorTextDeleteAction {
  readonly type: 'text.delete';
  readonly range: TextEditorTextRange;
}

/**
 * Inserts a custom inline node followed by one space at the selection, or in place of `range`,
 * such as a trigger and its query.
 */
export interface TextEditorInlineInsertAction {
  readonly type: 'inline.insert';
  /** The name of the inline node. */
  readonly kind: string;
  readonly attrs: TextEditorAttributes;
  readonly range?: TextEditorTextRange | undefined;
}

// Content (uwg-te-tab-actions r5)

/**
 * Inserts a portable fragment at a point, over a text range or over a cell range, as `at` gives it:
 * a text range merges its first and last paragraphs into the surrounding text, whole blocks insert
 * as blocks.
 */
export interface TextEditorContentInsertAction {
  readonly type: 'content.insert';
  readonly content: TextEditorPortableFragment;
  readonly at: TextEditorSelectionInput;
}

/** Replaces the content; the request pipeline applies it through the engine's `setContent`. */
export interface TextEditorContentSetAction {
  readonly type: 'content.set';
  /** A string, or for `json` the native JSON as an object or as JSON text. */
  readonly content: unknown;
  readonly format: TextEditorFormat;
  readonly history: TextEditorHistoryMode;
}

// Selection and history (uwg-te-tab-actions r6)

/**
 * Sets a text, caret, block or cell selection, or clears the selection with `{ kind: 'none' }`,
 * the editing root keeping focus; it changes no document.
 */
export interface TextEditorSelectionSetAction {
  readonly type: 'selection.set';
  readonly selection: TextEditorSelectionInput | TextEditorNoSelection;
}

/** Moves one step back through the history; the only action of its list. */
export interface TextEditorHistoryUndoAction {
  readonly type: 'history.undo';
}

/** Moves one step forward through the history; the only action of its list. */
export interface TextEditorHistoryRedoAction {
  readonly type: 'history.redo';
}

// Tables (uwg-te-tab-actions r7)

/** Inserts a row at `index`; the row count appends. With `select` the caret moves to its first cell. */
export interface TextEditorTableInsertRowAction {
  readonly type: 'table.insert-row';
  readonly table: string;
  readonly index: number;
  readonly select?: boolean | undefined;
}

/** Inserts a column at `index`; the column count appends. With `select` the caret moves to its first cell. */
export interface TextEditorTableInsertColumnAction {
  readonly type: 'table.insert-column';
  readonly table: string;
  readonly index: number;
  readonly select?: boolean | undefined;
}

/** Deletes the rows from `from` to `to`, both included. */
export interface TextEditorTableDeleteRowsAction {
  readonly type: 'table.delete-rows';
  readonly table: string;
  readonly from: number;
  readonly to: number;
}

/** Deletes the columns from `from` to `to`, both included. */
export interface TextEditorTableDeleteColumnsAction {
  readonly type: 'table.delete-columns';
  readonly table: string;
  readonly from: number;
  readonly to: number;
}

/** Moves the row at `from` so that it ends at index `to`. */
export interface TextEditorTableMoveRowAction {
  readonly type: 'table.move-row';
  readonly table: string;
  readonly from: number;
  readonly to: number;
}

/** Moves the column at `from` so that it ends at index `to`. */
export interface TextEditorTableMoveColumnAction {
  readonly type: 'table.move-column';
  readonly table: string;
  readonly from: number;
  readonly to: number;
}

/** Inserts a copy of the row at `index` after it. */
export interface TextEditorTableDuplicateRowAction {
  readonly type: 'table.duplicate-row';
  readonly table: string;
  readonly index: number;
}

/** Inserts a copy of the column at `index` after it. */
export interface TextEditorTableDuplicateColumnAction {
  readonly type: 'table.duplicate-column';
  readonly table: string;
  readonly index: number;
}

/** Joins a rectangular range into its first cell. */
export interface TextEditorTableMergeCellsAction {
  readonly type: 'table.merge-cells';
  readonly table: string;
  readonly range: TextEditorCellRange;
}

/** Turns a merged cell into single cells over the same area. */
export interface TextEditorTableSplitCellAction {
  readonly type: 'table.split-cell';
  readonly table: string;
  readonly cell: TextEditorCellAddress;
}

/** Sets the header row flag, the header column flag, or both. */
export interface TextEditorTableSetHeaderAction {
  readonly type: 'table.set-header';
  readonly table: string;
  readonly row?: boolean | undefined;
  readonly column?: boolean | undefined;
}

/** Aligns cells; `null` and `start` restore the default. */
export interface TextEditorTableAlignAction {
  readonly type: 'table.align';
  readonly table: string;
  readonly target: TextEditorTableTarget;
  readonly align: TextEditorAlign | null;
}

/** Sets the background of cells to a hue, or clears it with `null`. */
export interface TextEditorTableBackgroundAction {
  readonly type: 'table.background';
  readonly table: string;
  readonly target: TextEditorTableTarget;
  readonly color: TextEditorColor | null;
}

/** Sets the width of every column in CSS pixels, or automatic widths with `null`. */
export interface TextEditorTableColumnWidthsAction {
  readonly type: 'table.column-widths';
  readonly table: string;
  readonly widths: readonly number[] | null;
}

/** Empties the cells of a range without deleting the table. */
export interface TextEditorTableClearCellsAction {
  readonly type: 'table.clear-cells';
  readonly table: string;
  readonly range: TextEditorCellRange;
}

/** An action of the text editor: the 37 types of `uwg-te-tab-actions`. */
export type TextEditorAction =
  | TextEditorMarkToggleAction
  | TextEditorMarkColorAction
  | TextEditorMarkClearAction
  | TextEditorLinkSetAction
  | TextEditorLinkUnsetAction
  | TextEditorBlockSetTypeAction
  | TextEditorBlockSetAttrsAction
  | TextEditorBlockAlignAction
  | TextEditorBlockIndentAction
  | TextEditorBlockOutdentAction
  | TextEditorBlocksInsertAction
  | TextEditorBlocksMoveAction
  | TextEditorBlocksDuplicateAction
  | TextEditorBlocksDeleteAction
  | TextEditorTextInsertAction
  | TextEditorTextDeleteAction
  | TextEditorInlineInsertAction
  | TextEditorContentInsertAction
  | TextEditorContentSetAction
  | TextEditorSelectionSetAction
  | TextEditorHistoryUndoAction
  | TextEditorHistoryRedoAction
  | TextEditorTableInsertRowAction
  | TextEditorTableInsertColumnAction
  | TextEditorTableDeleteRowsAction
  | TextEditorTableDeleteColumnsAction
  | TextEditorTableMoveRowAction
  | TextEditorTableMoveColumnAction
  | TextEditorTableDuplicateRowAction
  | TextEditorTableDuplicateColumnAction
  | TextEditorTableMergeCellsAction
  | TextEditorTableSplitCellAction
  | TextEditorTableSetHeaderAction
  | TextEditorTableAlignAction
  | TextEditorTableBackgroundAction
  | TextEditorTableColumnWidthsAction
  | TextEditorTableClearCellsAction;

export type TextEditorActionType = TextEditorAction['type'];

/** The action of a type. */
export type TextEditorActionOf<T extends TextEditorActionType> = Extract<
  TextEditorAction,
  { readonly type: T }
>;

// Capabilities (uwg-te-tab-actions, Capability column)

/** Answers the kind of a block of the current document, or `null` for an unknown identifier. */
export type TextEditorBlockKindLookup = (id: string) => TextEditorBlockKind | null;

type CapabilityRule<A> = (
  action: A,
  kindOf: TextEditorBlockKindLookup,
) => readonly TextEditorCapability[];

const capabilities = (...ids: TextEditorCapability[]): readonly TextEditorCapability[] =>
  Object.freeze(ids);

const NONE = capabilities();
const LINK = capabilities('link');
const BLOCKS_MOVE = capabilities('blocks.move');
const BLOCKS_NEST = capabilities('blocks.nest');
const BLOCKS_SELECT = capabilities('blocks.select');
const HISTORY = capabilities('history');
const TABLE = capabilities('block.table');
const TABLE_MOVE = capabilities('block.table', 'table.move');
const TABLE_MERGE = capabilities('block.table', 'table.merge');

/**
 * The capabilities each action type requires. `block.set-attrs` takes the capability of the kind
 * of the block it changes, and none for an unknown block, which `can` refuses anyway;
 * `selection.set` takes the capability of its kind of selection.
 */
export const ACTION_CAPABILITIES: {
  readonly [T in TextEditorActionType]: CapabilityRule<TextEditorActionOf<T>>;
} = Object.freeze({
  'mark.toggle': (action) => capabilities(`mark.${action.mark}`),
  'mark.color': (action) =>
    capabilities(action.mark === 'text-color' ? 'mark.text-color' : 'mark.highlight'),
  'mark.clear': () => capabilities('mark.clear'),
  'link.set': () => LINK,
  'link.unset': () => LINK,
  'block.set-type': (action) => capabilities(`block.${action.kind}`),
  'block.set-attrs': (action, kindOf) => {
    const kind = kindOf(action.id);
    return kind === null ? NONE : capabilities(`block.${kind}`);
  },
  'block.align': () => capabilities('align'),
  'block.indent': () => BLOCKS_NEST,
  'block.outdent': () => BLOCKS_NEST,
  'blocks.insert': (action) => capabilities(`block.${action.kind}`),
  'blocks.move': () => BLOCKS_MOVE,
  'blocks.duplicate': () => BLOCKS_MOVE,
  'blocks.delete': () => BLOCKS_SELECT,
  'text.insert': () => NONE,
  'text.delete': () => NONE,
  'inline.insert': (action) => capabilities(`inline.${action.kind}`),
  'content.insert': () => NONE,
  'content.set': (action) => capabilities(`format.${action.format}`),
  'selection.set': (action) =>
    action.selection.kind === 'blocks'
      ? BLOCKS_SELECT
      : action.selection.kind === 'cells'
        ? TABLE
        : NONE,
  'history.undo': () => HISTORY,
  'history.redo': () => HISTORY,
  'table.insert-row': () => TABLE,
  'table.insert-column': () => TABLE,
  'table.delete-rows': () => TABLE,
  'table.delete-columns': () => TABLE,
  'table.move-row': () => TABLE_MOVE,
  'table.move-column': () => TABLE_MOVE,
  'table.duplicate-row': () => TABLE,
  'table.duplicate-column': () => TABLE,
  'table.merge-cells': () => TABLE_MERGE,
  'table.split-cell': () => TABLE_MERGE,
  'table.set-header': () => TABLE,
  'table.align': () => TABLE,
  'table.background': () => TABLE,
  'table.column-widths': () => TABLE,
  'table.clear-cells': () => TABLE,
});

/** The capabilities a valid action requires. */
export function actionCapabilities(
  action: TextEditorAction,
  kindOf: TextEditorBlockKindLookup,
): readonly TextEditorCapability[] {
  const rule = ACTION_CAPABILITIES[action.type] as CapabilityRule<TextEditorAction>;
  return rule(action, kindOf);
}

// Classification (uwg-te-req-engine-5; uwg-te-req-evt-1)

/** Whether an action changes the document: every action but `selection.set`. */
export function isMutatingAction(action: TextEditorAction): boolean {
  return action.type !== 'selection.set';
}

/** Whether a list only changes the selection: a non-empty list of `selection.set` actions. */
export function isSelectionOnly(actions: readonly TextEditorAction[]): boolean {
  return actions.length > 0 && actions.every((action) => action.type === 'selection.set');
}

/**
 * Whether a list combines `history.undo` or `history.redo` with another action, which `execute`
 * refuses without applying anything.
 */
export function combinesHistory(actions: readonly TextEditorAction[]): boolean {
  return (
    actions.length > 1 &&
    actions.some((action) => action.type === 'history.undo' || action.type === 'history.redo')
  );
}

// Validation

type Payload = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Payload =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string';
/** A non-empty string, such as an identifier. */
const isFilled = (value: unknown): value is string => typeof value === 'string' && value !== '';
const isBoolean = (value: unknown): value is boolean => typeof value === 'boolean';
const isInteger = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value);
const isIndex = (value: unknown): value is number => isInteger(value) && value >= 0;
const isCount = (value: unknown): value is number => isInteger(value) && value >= 1;
const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
const optional = (value: unknown, check: (value: unknown) => boolean): boolean =>
  value === undefined || check(value);
const orNull =
  (check: (value: unknown) => boolean) =>
  (value: unknown): boolean =>
    value === null || check(value);

const MARKS_TO_TOGGLE: ReadonlySet<unknown> = new Set(TOGGLE_MARKS);
const FORMATS: ReadonlySet<unknown> = new Set<TextEditorFormat>([
  'html',
  'markdown',
  'text',
  'json',
]);
const INSERT_SELECTIONS: ReadonlySet<unknown> = new Set<TextEditorInsertSelection>([
  'start',
  'end',
  'block',
  'none',
]);
/** Built-in kinds that hold no text, which `block.set-type` cannot turn a block into. */
const ATOM_KINDS: ReadonlySet<unknown> = new Set<TextEditorBlockKind>([
  'divider',
  'image',
  'table',
]);

const isAlignment = (value: unknown): boolean =>
  value === 'start' || storedAlign(value) !== undefined;
const isColor = orNull(isTextEditorColor);
const isIdList = (value: unknown): boolean =>
  Array.isArray(value) && value.length > 0 && value.every(isFilled);
const isAttributes = (value: unknown): boolean =>
  isRecord(value) && Object.values(value).every(isTextEditorAttributeValue);

const isCellAddress = (value: unknown): boolean =>
  isRecord(value) && isIndex(value.row) && isIndex(value.column);
const isCellPoint = (value: unknown): boolean =>
  isCellAddress(value) && isIndex((value as Payload).paragraph);
const isCellRange = (value: unknown): boolean =>
  isRecord(value) && isCellAddress(value.anchor) && isCellAddress(value.head);
const isTextPoint = (value: unknown): boolean =>
  isRecord(value) &&
  isFilled(value.block) &&
  optional(value.cell, isCellPoint) &&
  isIndex(value.offset);
const isTextRange = (value: unknown): boolean =>
  isRecord(value) &&
  isFilled(value.block) &&
  optional(value.cell, isCellPoint) &&
  isIndex(value.from) &&
  isIndex(value.to) &&
  (value.from as number) <= (value.to as number);

function isSelectionInput(value: unknown): boolean {
  if (!isRecord(value)) return false;
  switch (value.kind) {
    case 'text':
      return isTextPoint(value.anchor) && optional(value.head, isTextPoint);
    case 'caret':
      return (
        isFilled(value.block) &&
        optional(value.cell, isCellAddress) &&
        (value.position === 'start' || value.position === 'end')
      );
    case 'blocks':
      return isIdList(value.ids);
    case 'cells':
      return isFilled(value.table) && isCellRange(value.range);
    default:
      return false;
  }
}

/** The one form among `forms` that a payload part holds, or `null` for none or several. */
function soleForm(value: Payload, forms: readonly string[]): string | null {
  const present = forms.filter((form) => value[form] !== undefined);
  return present.length === 1 ? present[0]! : null;
}

const isSlot = (value: unknown): boolean =>
  isRecord(value) && (value.parent === null || isFilled(value.parent)) && isIndex(value.index);

function isInsertPosition(value: unknown): boolean {
  if (!isRecord(value)) return false;
  const form = soleForm(value, ['after', 'before', 'replace', 'parent']);
  if (form === null) return false;
  return form === 'parent' ? isSlot(value) : isFilled(value[form]);
}

function isTableTarget(value: unknown): boolean {
  if (!isRecord(value)) return false;
  switch (soleForm(value, ['row', 'column', 'range', 'all'])) {
    case 'row':
      return isIndex(value.row);
    case 'column':
      return isIndex(value.column);
    case 'range':
      return isCellRange(value.range);
    case 'all':
      return value.all === true;
    default:
      return false;
  }
}

const isFragment = (value: unknown): boolean =>
  isRecord(value) &&
  (value.kind === 'range' || value.kind === 'blocks') &&
  Array.isArray(value.blocks) &&
  value.blocks.every((block) => isRecord(block) && isFilled(block.type));

/**
 * Whether `attrs` fits a block kind. Built-in kinds check the attributes they define; a custom
 * kind only needs attribute values, since its definition types its attributes.
 */
function fitsKind(kind: string, attrs: unknown): boolean {
  if (attrs !== undefined && !isAttributes(attrs)) return false;
  const values: Payload = (attrs as Payload | undefined) ?? {};
  const align = optional(values.align, orNull(isAlignment));
  switch (kind) {
    case 'paragraph':
    case 'quote':
    case 'list-bullet':
      return align;
    case 'heading':
      return isInteger(values.level) && values.level >= 1 && values.level <= 6 && align;
    case 'code':
      return optional(values.language, orNull(isString));
    case 'list-ordered':
      return align && optional(values.start, isInteger);
    case 'list-task':
      return align && optional(values.checked, isBoolean);
    case 'image':
      return (
        isFilled(values.src) &&
        optional(values.alt, isString) &&
        optional(values.width, orNull(isPositive))
      );
    case 'table':
      return (
        isCount(values.rows) &&
        isCount(values.columns) &&
        optional(values.headerRow, isBoolean) &&
        optional(values.headerColumn, isBoolean)
      );
    default:
      return true;
  }
}

const tableIs = (action: Payload): boolean => isFilled(action.table);
const isLineRange = (action: Payload): boolean =>
  tableIs(action) &&
  isIndex(action.from) &&
  isIndex(action.to) &&
  (action.from as number) <= (action.to as number);
const isLineMove = (action: Payload): boolean =>
  tableIs(action) && isIndex(action.from) && isIndex(action.to);
const isLineInsert = (action: Payload): boolean =>
  tableIs(action) && isIndex(action.index) && optional(action.select, isBoolean);
const isLine = (action: Payload): boolean => tableIs(action) && isIndex(action.index);

const PAYLOAD_CHECKS: { readonly [T in TextEditorActionType]: (action: Payload) => boolean } = {
  'mark.toggle': (action) => MARKS_TO_TOGGLE.has(action.mark),
  'mark.color': (action) =>
    (action.mark === 'text-color' || action.mark === 'highlight') && isColor(action.color),
  'mark.clear': () => true,
  'link.set': (action) =>
    isFilled(action.href) && optional(action.text, isString) && optional(action.range, isTextRange),
  'link.unset': (action) => optional(action.range, isTextRange),
  'block.set-type': (action) =>
    isFilled(action.kind) &&
    !ATOM_KINDS.has(action.kind) &&
    fitsKind(action.kind, action.attrs) &&
    optional(action.ids, isIdList) &&
    optional(action.toggle, isBoolean),
  'block.set-attrs': (action) => isFilled(action.id) && isAttributes(action.attrs),
  'block.align': (action) =>
    (action.align === null || isAlignment(action.align)) && optional(action.ids, isIdList),
  'block.indent': (action) => optional(action.ids, isIdList),
  'block.outdent': (action) => optional(action.ids, isIdList),
  'blocks.insert': (action) =>
    isFilled(action.kind) &&
    fitsKind(action.kind, action.attrs) &&
    optional(action.at, isInsertPosition) &&
    optional(action.select, (select) => INSERT_SELECTIONS.has(select)),
  'blocks.move': (action) => isIdList(action.ids) && isSlot(action.to),
  'blocks.duplicate': (action) => isIdList(action.ids),
  'blocks.delete': (action) => isIdList(action.ids),
  'text.insert': (action) => isString(action.text) && optional(action.range, isTextRange),
  'text.delete': (action) => isTextRange(action.range),
  'inline.insert': (action) =>
    isFilled(action.kind) && isAttributes(action.attrs) && optional(action.range, isTextRange),
  'content.insert': (action) => isFragment(action.content) && isSelectionInput(action.at),
  'content.set': (action) =>
    isTextEditorFormat(action.format) &&
    (action.history === 'reset' || action.history === 'push') &&
    (isString(action.content) || (action.format === 'json' && isRecord(action.content))),
  'selection.set': (action) =>
    (isRecord(action.selection) && action.selection.kind === 'none') ||
    isSelectionInput(action.selection),
  'history.undo': () => true,
  'history.redo': () => true,
  'table.insert-row': isLineInsert,
  'table.insert-column': isLineInsert,
  'table.delete-rows': isLineRange,
  'table.delete-columns': isLineRange,
  'table.move-row': isLineMove,
  'table.move-column': isLineMove,
  'table.duplicate-row': isLine,
  'table.duplicate-column': isLine,
  'table.merge-cells': (action) => tableIs(action) && isCellRange(action.range),
  'table.split-cell': (action) => tableIs(action) && isCellAddress(action.cell),
  'table.set-header': (action) =>
    tableIs(action) && optional(action.row, isBoolean) && optional(action.column, isBoolean),
  'table.align': (action) =>
    tableIs(action) &&
    isTableTarget(action.target) &&
    (action.align === null || isAlignment(action.align)),
  'table.background': (action) =>
    tableIs(action) && isTableTarget(action.target) && isColor(action.color),
  'table.column-widths': (action) =>
    tableIs(action) &&
    (action.widths === null ||
      (Array.isArray(action.widths) &&
        action.widths.length > 0 &&
        action.widths.every(isPositive))),
  'table.clear-cells': (action) => tableIs(action) && isCellRange(action.range),
};

/**
 * Whether a value is an action: a known type with a well-formed payload. It checks the payload's
 * shape, not the document: an action for a block that does not exist is valid, and `can` refuses
 * it. Members it does not know are ignored. It never throws.
 */
export function isValidTextEditorAction(value: unknown): value is TextEditorAction {
  try {
    if (!isRecord(value)) return false;
    const type = value.type;
    if (typeof type !== 'string' || !Object.hasOwn(PAYLOAD_CHECKS, type)) return false;
    return PAYLOAD_CHECKS[type as TextEditorActionType](value);
  } catch {
    return false;
  }
}

/** Whether a value names a content format: `html`, `markdown`, `text` or `json`. */
export function isTextEditorFormat(value: unknown): value is TextEditorFormat {
  return FORMATS.has(value);
}

/** The error for a value that names no content format: a `NotSupportedError`. */
export function unknownFormatError(format: unknown): Error {
  return domError('NotSupportedError', `"${String(format)}" is not a content format.`);
}

/** Throws `unknownFormatError` unless a value names a content format. */
export function assertTextEditorFormat(format: unknown): asserts format is TextEditorFormat {
  if (!isTextEditorFormat(format)) throw unknownFormatError(format);
}

/** Whether a value is an attribute value: a string, a finite number, a Boolean or `null`. */
export function isTextEditorAttributeValue(value: unknown): value is TextEditorAttributeValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  );
}

// Keys

let unkeyed = 0;

/**
 * A stable key of an action for memoizing `can`: actions with equal payloads share a key whatever
 * the order of their members, and a member set to `undefined` counts as absent. It never throws.
 */
export function actionKey(action: TextEditorAction): string {
  try {
    return keyOf(action, new Set());
  } catch {
    unkeyed += 1;
    return `#${unkeyed}`;
  }
}

function keyOf(value: unknown, path: Set<object>): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') {
    if (typeof value === 'string') return JSON.stringify(value);
    if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value);
    if (typeof value === 'bigint') return `${value}n`;
    if (typeof value === 'boolean' || typeof value === 'undefined') return String(value);
    return typeof value;
  }
  if (path.has(value)) return 'cycle';
  path.add(value);
  try {
    if (Array.isArray(value)) return `[${value.map((item) => keyOf(item, path)).join(',')}]`;
    const record = value as Payload;
    const members = Object.keys(record)
      .filter((key) => record[key] !== undefined)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${keyOf(record[key], path)}`);
    return `{${members.join(',')}}`;
  } finally {
    path.delete(value);
  }
}
