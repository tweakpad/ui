/**
 * Mapping of the Tiptap adapter (Widgets `uwg-te-req-engine-3`, `uwg-te-req-content-1`,
 * `uwg-te-tab-engine` r5, `uwg-te-req-content-2`).
 *
 * Pure functions between the engine's native JSON and the portable model, in both directions,
 * and the index of a document revision that maps block identifiers and engine-neutral text points
 * to engine positions and back. Colors stay palette names, a link keeps its `href` only, and JSON
 * that is not a Tiptap document, such as another engine's, is a DataError. Engine positions never
 * leave the adapter.
 */
import { domError } from '../../../dom-error.js';
import { storedAlign, TOGGLE_MARKS } from '../../actions.js';
import {
  canonicalize,
  isListItem,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
  type TextEditorPortableDraftBlock,
  type TextEditorPortableDraftTableCell,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
  type TextEditorPortableMarks,
  type TextEditorPortableTable,
} from '../../content/portable.js';
import type {
  TextEditorAlign,
  TextEditorAttributes,
  TextEditorAttributeValue,
  TextEditorCellAddress,
  TextEditorTextPoint,
  TextEditorTextRange,
  TextEditorToggleMark,
} from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { isTextEditorColor, type TextEditorColor } from '../../palette.js';
import type { TextEditorInlineAt } from '../shared/selection-state.js';
import type { TextEditorInlineUnit } from '../shared/state.js';
import { positionalHeader } from '../shared/tables.js';
import type { TiptapMarkLike, TiptapNodeLike, TiptapTablesLike } from './modules.js';
import {
  customNodeName,
  ITEM_TYPES,
  LIST_TYPES,
  NATIVE,
  NATIVE_MARKS,
  nativeNodeName,
} from './schema.js';

/** A node of the native JSON, as the engine writes and reads it. */
export interface TiptapJson {
  readonly type: string;
  readonly attrs?: Readonly<Record<string, unknown>> | undefined;
  readonly content?: readonly TiptapJson[] | undefined;
  readonly marks?: readonly { readonly type: string; readonly attrs?: unknown }[] | undefined;
  readonly text?: string | undefined;
}

type Rec = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Rec =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const malformed = (problem: string): Error =>
  domError('DataError', `The native JSON is not a Tiptap document: ${problem}.`);

const alignOf = (attrs: Rec): TextEditorAlign | undefined => storedAlign(attrs.align);

const idOf = (attrs: Rec): string | undefined =>
  typeof attrs.id === 'string' && attrs.id !== '' ? attrs.id : undefined;

const BUILTIN_INLINE: ReadonlySet<string> = new Set([NATIVE.text, NATIVE.hardBreak]);

// Native JSON to the portable model

/** A checked node of the JSON: an object with a string `type`, its attributes and children. */
interface Checked {
  readonly type: string;
  readonly attrs: Rec;
  readonly content: readonly unknown[];
  readonly raw: Rec;
}

function check(value: unknown, where: string): Checked {
  if (!isRecord(value) || typeof value.type !== 'string' || value.type === '')
    throw malformed(`${where} is not a node with a type`);
  if (value.attrs !== undefined && value.attrs !== null && !isRecord(value.attrs))
    throw malformed(`the attributes of a ${value.type} node are not an object`);
  if (value.content !== undefined && value.content !== null && !Array.isArray(value.content))
    throw malformed(`the content of a ${value.type} node is not an array`);
  return {
    type: value.type,
    attrs: (value.attrs as Rec | undefined) ?? {},
    content: (value.content as readonly unknown[] | undefined) ?? [],
    raw: value,
  };
}

/** The toggle mark of each native mark name that is one, from the shared list of toggle marks. */
const TOGGLE_OF_NATIVE: ReadonlyMap<string, TextEditorToggleMark> = new Map(
  TOGGLE_MARKS.map((mark) => [NATIVE_MARKS[mark], mark]),
);

/** The portable marks of the marks of the engine, such as those typed text takes at a caret. */
export function marksOf(marks: readonly TiptapMarkLike[]): TextEditorPortableMarks {
  return portableMarks(marks.map((mark) => ({ type: mark.type.name, attrs: mark.attrs }))) ?? {};
}

/** The portable marks of a text node; marks the model lacks are dropped. */
function portableMarks(marks: unknown): TextEditorPortableMarks | undefined {
  if (marks === undefined || marks === null) return undefined;
  if (!Array.isArray(marks)) throw malformed('the marks of a text node are not an array');
  const result: Record<string, unknown> = {};
  for (const mark of marks) {
    if (!isRecord(mark) || typeof mark.type !== 'string') throw malformed('a mark has no type');
    const attrs = isRecord(mark.attrs) ? mark.attrs : {};
    const toggle = TOGGLE_OF_NATIVE.get(mark.type);
    if (toggle) result[toggle] = true;
    else if (mark.type === NATIVE_MARKS.link) {
      if (typeof attrs.href === 'string' && attrs.href !== '') result.link = attrs.href;
    } else if (mark.type === NATIVE_MARKS.textColor || mark.type === NATIVE_MARKS.highlight) {
      if (isTextEditorColor(attrs.color))
        result[mark.type === NATIVE_MARKS.textColor ? 'textColor' : 'highlight'] = attrs.color;
    }
  }
  return Object.keys(result).length > 0 ? (result as TextEditorPortableMarks) : undefined;
}

/** Attribute values of a custom node: every valid value but the identifier. */
function customAttrs(attrs: Rec): TextEditorAttributes {
  const values: Record<string, TextEditorAttributeValue> = {};
  for (const [name, value] of Object.entries(attrs)) {
    if (name === 'id') continue;
    if (
      value === null ||
      typeof value === 'string' ||
      typeof value === 'boolean' ||
      (typeof value === 'number' && Number.isFinite(value))
    )
      values[name] = value;
  }
  return values;
}

/** Whether a JSON node is inline content: text, a hard break or an inline node. */
const isInlineJson = (value: unknown): boolean =>
  isRecord(value) &&
  (BUILTIN_INLINE.has(value.type as string) ||
    (typeof value.type === 'string' &&
      !BLOCK_TYPES.has(value.type) &&
      value.content === undefined));

const BLOCK_TYPES: ReadonlySet<string> = new Set<string>([
  NATIVE.paragraph,
  NATIVE.heading,
  NATIVE.quote,
  NATIVE.code,
  NATIVE.divider,
  NATIVE.image,
  NATIVE.table,
  NATIVE.row,
  NATIVE.cell,
  NATIVE.header,
  ...LIST_TYPES,
  ...ITEM_TYPES,
]);

function inlineContent(content: readonly unknown[]): TextEditorPortableInline[] {
  const inline: TextEditorPortableInline[] = [];
  for (const value of content) {
    const node = check(value, 'an inline node');
    if (node.type === NATIVE.text) {
      if (typeof node.raw.text !== 'string') throw malformed('a text node has no text');
      const marks = portableMarks(node.raw.marks);
      inline.push(
        marks
          ? { type: 'text', text: node.raw.text, marks }
          : { type: 'text', text: node.raw.text },
      );
    } else if (node.type === NATIVE.hardBreak) inline.push({ type: 'hard-break' });
    else
      inline.push({
        type: 'custom',
        name: customNodeName(node.type) ?? node.type,
        attrs: customAttrs(node.attrs),
      });
  }
  return inline;
}

/** The text of a code block's content: its text nodes, a hard break as a line feed. */
function codeText(content: readonly unknown[]): string {
  let text = '';
  for (const value of content) {
    const node = check(value, 'a code block child');
    if (node.type === NATIVE.text && typeof node.raw.text === 'string') text += node.raw.text;
    else if (node.type === NATIVE.hardBreak) text += '\n';
  }
  return text;
}

const LIST_KIND: Readonly<Record<string, TextEditorPortableListItem['type']>> = {
  [NATIVE.bulletList]: 'list-bullet',
  [NATIVE.orderedList]: 'list-ordered',
  [NATIVE.taskList]: 'list-task',
};

/** The items of a list as portable draft items, the start of an ordered list on its first item. */
function listItems(list: Checked): TextEditorPortableDraftBlock[] {
  const kind = LIST_KIND[list.type]!;
  const start = typeof list.attrs.start === 'number' ? list.attrs.start : undefined;
  return list.content.map((value, index) => {
    const item = check(value, 'a list item');
    const [first, ...rest] = item.content;
    const head = first === undefined ? null : check(first, 'the content of a list item');
    const holdsText =
      head !== null && (head.type === NATIVE.paragraph || head.type === NATIVE.heading);
    const children = (holdsText ? rest : item.content).flatMap((child) => draftBlocks(child));
    const id = idOf(item.attrs);
    const align = head && holdsText ? alignOf(head.attrs) : undefined;
    return {
      type: kind,
      ...(id === undefined ? {} : { id }),
      ...(align === undefined ? {} : { align }),
      content: head && holdsText ? inlineContent(head.content) : [],
      children,
      ...(kind === 'list-ordered' && index === 0 && start !== undefined ? { start } : {}),
      ...(kind === 'list-task' ? { checked: item.attrs.checked === true } : {}),
    } as TextEditorPortableDraftBlock;
  });
}

/** The column widths of a table from its cells' `colwidth`, when every column has one. */
function tableWidths(
  rows: readonly (readonly {
    readonly colSpan: number;
    readonly rowSpan: number;
    readonly widths: unknown;
  }[])[],
): number[] | undefined {
  const grid = tableGrid({
    type: 'table',
    headerRow: false,
    headerColumn: false,
    rows: rows.map((cells) => ({
      cells: cells.map((cell) => ({
        colSpan: cell.colSpan,
        rowSpan: cell.rowSpan,
        paragraphs: [],
      })),
    })),
  });
  if (grid.columns === 0) return undefined;
  const widths: (number | undefined)[] = new Array<number | undefined>(grid.columns);
  const flat = rows.flat();
  grid.cells.forEach((placed, index) => {
    const source = flat[index]?.widths;
    if (!Array.isArray(source)) return;
    for (let offset = 0; offset < placed.colSpan; offset += 1) {
      const width: unknown = source[offset];
      if (typeof width === 'number' && Number.isFinite(width) && width > 0)
        widths[placed.column + offset] ??= width;
    }
  });
  // `Array.from` fills the holes of the sparse array, which `every` would skip.
  const complete = Array.from(widths);
  return complete.every((width) => width !== undefined) ? (complete as number[]) : undefined;
}

function tableDraft(table: Checked): TextEditorPortableDraftBlock {
  const sizes: { colSpan: number; rowSpan: number; widths: unknown }[][] = [];
  const rows = table.content.map((value) => {
    const row = check(value, 'a table row');
    const cells: TextEditorPortableDraftTableCell[] = [];
    const rowSizes: { colSpan: number; rowSpan: number; widths: unknown }[] = [];
    for (const cellValue of row.content) {
      const cell = check(cellValue, 'a table cell');
      const colSpan = typeof cell.attrs.colspan === 'number' ? cell.attrs.colspan : 1;
      const rowSpan = typeof cell.attrs.rowspan === 'number' ? cell.attrs.rowspan : 1;
      rowSizes.push({ colSpan, rowSpan, widths: cell.attrs.colwidth });
      const paragraphs: { content: TextEditorPortableInline[] }[] = [];
      const blocks: TextEditorPortableDraftBlock[] = [];
      for (const childValue of cell.content) {
        const child = check(childValue, 'the content of a table cell');
        if (child.type === NATIVE.paragraph && blocks.length === 0)
          paragraphs.push({ content: inlineContent(child.content) });
        else blocks.push(...draftBlocks(childValue));
      }
      const background = cell.attrs.background;
      const align = alignOf(cell.attrs);
      cells.push({
        ...(colSpan > 1 ? { colSpan } : {}),
        ...(rowSpan > 1 ? { rowSpan } : {}),
        ...(isTextEditorColor(background) ? { background } : {}),
        ...(align === undefined ? {} : { align }),
        header: cell.type === NATIVE.header,
        paragraphs,
        ...(blocks.length > 0 ? { blocks } : {}),
      });
    }
    sizes.push(rowSizes);
    return { cells };
  });
  const id = idOf(table.attrs);
  const widths = tableWidths(sizes);
  return {
    type: 'table',
    ...(id === undefined ? {} : { id }),
    ...(typeof table.attrs.headerRow === 'boolean' ? { headerRow: table.attrs.headerRow } : {}),
    ...(typeof table.attrs.headerColumn === 'boolean'
      ? { headerColumn: table.attrs.headerColumn }
      : {}),
    ...(widths ? { widths } : {}),
    rows,
  };
}

/** The portable draft blocks of one block node of the JSON; a list gives its items. */
function draftBlocks(value: unknown): TextEditorPortableDraftBlock[] {
  const node = check(value, 'a block');
  const id = idOf(node.attrs);
  const withId = id === undefined ? {} : { id };
  const align = alignOf(node.attrs);
  const withAlign = align === undefined ? {} : { align };
  switch (node.type) {
    case NATIVE.paragraph:
      return [{ type: 'paragraph', ...withId, ...withAlign, content: inlineContent(node.content) }];
    case NATIVE.heading: {
      const level = node.attrs.level;
      return [
        {
          type: 'heading',
          ...withId,
          level: (typeof level === 'number' && level >= 1 && level <= 6 ? level : 1) as 1,
          ...withAlign,
          content: inlineContent(node.content),
        },
      ];
    }
    case NATIVE.quote:
      // The adapter's quote holds inline content; a quote of another schema holds blocks.
      return node.content.every(isInlineJson)
        ? [{ type: 'quote', ...withId, ...withAlign, content: inlineContent(node.content) }]
        : [{ type: 'quote', ...withId, ...withAlign, blocks: node.content.flatMap(draftBlocks) }];
    case NATIVE.code: {
      const language = node.attrs.language;
      return [
        {
          type: 'code',
          ...withId,
          ...(typeof language === 'string' && language !== '' ? { language } : {}),
          text: codeText(node.content),
        },
      ];
    }
    case NATIVE.divider:
      return [{ type: 'divider', ...withId }];
    case NATIVE.image: {
      const { src, alt, width } = node.attrs;
      return [
        {
          type: 'image',
          ...withId,
          src: typeof src === 'string' ? src : '',
          alt: typeof alt === 'string' ? alt : '',
          ...(typeof width === 'number' && Number.isFinite(width) && width > 0 ? { width } : {}),
        },
      ];
    }
    case NATIVE.bulletList:
    case NATIVE.orderedList:
    case NATIVE.taskList:
      return listItems(node);
    case NATIVE.table:
      return [tableDraft(node)];
    case NATIVE.text:
    case NATIVE.hardBreak:
      return [{ type: 'paragraph', content: inlineContent([value]) }];
    default: {
      const textblock = node.raw.content !== undefined && node.raw.content !== null;
      return [
        {
          type: 'custom',
          ...withId,
          name: customNodeName(node.type) ?? node.type,
          attrs: customAttrs(node.attrs),
          ...(textblock ? { content: inlineContent(node.content) } : {}),
        },
      ];
    }
  }
}

/**
 * The portable draft of a native JSON document: `{ type: 'doc', content }` with the nodes of the
 * adapter's schema; a node type of no built-in kind is a custom node, named by its engine name
 * without the adapter's prefix (`nativeNodeName`), else by its type. Throws a
 * DataError for JSON that is not a Tiptap document, such as another engine's `{ root }`.
 */
export function fromTiptapJson(json: unknown): TextEditorPortableDraft {
  if (!isRecord(json)) throw malformed('it is not an object');
  if (json.type !== NATIVE.doc) throw malformed('its type is not "doc"');
  const doc = check(json, 'the document');
  return { blocks: doc.content.flatMap(draftBlocks) };
}

// The portable model to native JSON

function nativeMarks(marks: TextEditorPortableMarks | undefined): TiptapJson['marks'] {
  if (!marks) return undefined;
  const result: { type: string; attrs?: Rec }[] = [];
  if (marks.link) result.push({ type: NATIVE_MARKS.link, attrs: { href: marks.link } });
  if (marks.textColor)
    result.push({ type: NATIVE_MARKS.textColor, attrs: { color: marks.textColor } });
  if (marks.highlight)
    result.push({ type: NATIVE_MARKS.highlight, attrs: { color: marks.highlight } });
  for (const mark of TOGGLE_MARKS)
    if (marks[mark] === true) result.push({ type: NATIVE_MARKS[mark] });
  return result.length > 0 ? result : undefined;
}

/** The native JSON of inline content. */
export function toTiptapInline(content: readonly TextEditorPortableInline[]): TiptapJson[] {
  return content.flatMap((node): TiptapJson[] => {
    switch (node.type) {
      case 'text': {
        if (node.text === '') return [];
        const marks = nativeMarks(node.marks);
        return [
          marks
            ? { type: NATIVE.text, text: node.text, marks }
            : { type: NATIVE.text, text: node.text },
        ];
      }
      case 'hard-break':
        return [{ type: NATIVE.hardBreak }];
      case 'custom':
        return [{ type: nativeNodeName(node.name), attrs: { ...node.attrs } }];
    }
  });
}

const withContent = (content: readonly TiptapJson[]): { content?: readonly TiptapJson[] } =>
  content.length > 0 ? { content } : {};

/** A paragraph of the native JSON, which list items and cells hold. */
const paragraphJson = (
  content: readonly TextEditorPortableInline[],
  attrs: Rec = { id: null, align: null },
): TiptapJson => ({ type: NATIVE.paragraph, attrs, ...withContent(toTiptapInline(content)) });

const LIST_NODE: Readonly<Record<TextEditorPortableListItem['type'], string>> = {
  'list-bullet': NATIVE.bulletList,
  'list-ordered': NATIVE.orderedList,
  'list-task': NATIVE.taskList,
};

/** Consecutive sibling items of one kind as one list node each, their items in order. */
function listJson(items: readonly TextEditorPortableListItem[]): TiptapJson[] {
  const lists: TiptapJson[] = [];
  let index = 0;
  while (index < items.length) {
    const first = items[index]!;
    const run: TextEditorPortableListItem[] = [];
    while (index < items.length && items[index]!.type === first.type) run.push(items[index++]!);
    const itemType = first.type === 'list-task' ? NATIVE.taskItem : NATIVE.listItem;
    const start = first.type === 'list-ordered' ? (first.start ?? 1) : undefined;
    lists.push({
      type: LIST_NODE[first.type],
      ...(start === undefined ? {} : { attrs: { start } }),
      content: run.map((item) => ({
        type: itemType,
        attrs:
          item.type === 'list-task'
            ? { id: item.id ?? null, checked: item.checked }
            : { id: item.id ?? null },
        content: [
          paragraphJson(item.content, { id: null, align: item.align ?? null }),
          ...listJson(item.children),
        ],
      })),
    });
  }
  return lists;
}

function tableJson(table: TextEditorPortableTable): TiptapJson {
  const grid = tableGrid(table);
  const flags = { headerRow: table.headerRow, headerColumn: table.headerColumn };
  let placed = 0;
  return {
    type: NATIVE.table,
    attrs: { id: table.id ?? null, headerRow: table.headerRow, headerColumn: table.headerColumn },
    content: table.rows.map((row) => ({
      type: NATIVE.row,
      content: row.cells.map((cell) => {
        const at = grid.cells[placed++];
        const address = { row: at?.row ?? 0, column: at?.column ?? 0 };
        const header = positionalHeader(address, flags);
        const colSpan = cell.colSpan ?? 1;
        const widths = table.widths?.slice(address.column, address.column + colSpan);
        return {
          type: header.row || header.column ? NATIVE.header : NATIVE.cell,
          attrs: {
            colspan: colSpan,
            rowspan: cell.rowSpan ?? 1,
            colwidth: widths && widths.length === colSpan ? widths : null,
            background: cell.background ?? null,
            align: cell.align ?? null,
          },
          content: (cell.paragraphs.length > 0 ? cell.paragraphs : [{ content: [] }]).map(
            (paragraph) => paragraphJson(paragraph.content),
          ),
        };
      }),
    })),
  };
}

function blockJson(block: TextEditorPortableBlock): TiptapJson {
  const id = block.id ?? null;
  switch (block.type) {
    case 'paragraph':
      return paragraphJson(block.content, { id, align: block.align ?? null });
    case 'heading':
      return {
        type: NATIVE.heading,
        attrs: { id, level: block.level, align: block.align ?? null },
        ...withContent(toTiptapInline(block.content)),
      };
    case 'quote':
      return {
        type: NATIVE.quote,
        attrs: { id, align: block.align ?? null },
        ...withContent(toTiptapInline(block.content)),
      };
    case 'code':
      return {
        type: NATIVE.code,
        attrs: { id, language: block.language ?? null },
        ...(block.text === '' ? {} : { content: [{ type: NATIVE.text, text: block.text }] }),
      };
    case 'divider':
      return { type: NATIVE.divider, attrs: { id } };
    case 'image':
      return {
        type: NATIVE.image,
        attrs: { id, src: block.src, alt: block.alt, width: block.width ?? null },
      };
    case 'table':
      return tableJson(block);
    case 'custom':
      return {
        type: nativeNodeName(block.name),
        attrs: { ...block.attrs, id },
        ...(block.content ? { content: toTiptapInline(block.content) } : {}),
      };
    default:
      // List items are written by `blocksJson`, which groups them into lists.
      throw new TypeError(`A ${block.type} item is written as part of its list.`);
  }
}

/** The native JSON of blocks: consecutive list items of one kind as one list node. */
export function toTiptapBlocks(blocks: readonly TextEditorPortableBlock[]): TiptapJson[] {
  const result: TiptapJson[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index]!;
    if (isListItem(block)) {
      const run: TextEditorPortableListItem[] = [];
      while (index < blocks.length && isListItem(blocks[index]!))
        run.push(blocks[index++] as TextEditorPortableListItem);
      result.push(...listJson(run));
    } else {
      result.push(blockJson(block));
      index += 1;
    }
  }
  return result;
}

/** The native JSON of a portable document. */
export function toTiptapJson(document: TextEditorPortableDocument): TiptapJson {
  return { type: NATIVE.doc, content: toTiptapBlocks(document.blocks) };
}

// Position index of a revision

/** A block of the block tree in a revision: its node and the position before it. */
export interface TiptapHolder {
  readonly id: string | null;
  readonly node: TiptapNodeLike;
  readonly pos: number;
  readonly parentId: string | null;
  readonly depth: number;
  /** Position among the parent item's nested items, or among the top-level blocks. */
  readonly index: number;
}

export interface TiptapHolderIndex {
  /** Every block in document order, each list item before its nested items. */
  readonly list: readonly TiptapHolder[];
  readonly byId: ReadonlyMap<string, TiptapHolder>;
}

const indexes = new WeakMap<object, TiptapHolderIndex>();

/** Whether a node is a list item. */
export const isItemNode = (node: TiptapNodeLike): boolean => ITEM_TYPES.has(node.type.name);
/** Whether a node is a list. */
export const isListNode = (node: TiptapNodeLike): boolean => LIST_TYPES.has(node.type.name);

/** The nested items of a list item, flattened over its nested lists, with their positions. */
function nestedItems(
  item: TiptapNodeLike,
  itemPos: number,
): { node: TiptapNodeLike; pos: number }[] {
  const items: { node: TiptapNodeLike; pos: number }[] = [];
  item.forEach((child, offset) => {
    if (!isListNode(child)) return;
    const listPos = itemPos + 1 + offset;
    child.forEach((node, itemOffset) => {
      if (isItemNode(node)) items.push({ node, pos: listPos + 1 + itemOffset });
    });
  });
  return items;
}

/** The block holders of a revision: the top-level blocks, lists flattened, and list items. */
export function holderIndex(doc: TiptapNodeLike): TiptapHolderIndex {
  let index = indexes.get(doc);
  if (index) return index;
  const list: TiptapHolder[] = [];
  const byId = new Map<string, TiptapHolder>();
  const add = (
    node: TiptapNodeLike,
    pos: number,
    parentId: string | null,
    depth: number,
    at: number,
  ) => {
    const id = typeof node.attrs.id === 'string' ? node.attrs.id : null;
    const holder: TiptapHolder = { id, node, pos, parentId, depth, index: at };
    list.push(holder);
    if (id !== null && !byId.has(id)) byId.set(id, holder);
    if (isItemNode(node))
      nestedItems(node, pos).forEach((child, childIndex) =>
        add(child.node, child.pos, id, depth + 1, childIndex),
      );
  };
  let top = 0;
  doc.forEach((child, offset) => {
    if (isListNode(child))
      child.forEach((item, itemOffset) => {
        if (isItemNode(item)) add(item, offset + 1 + itemOffset, null, 0, top++);
      });
    else add(child, offset, null, 0, top++);
  });
  index = { list, byId };
  indexes.set(doc, index);
  return index;
}

/** The textblock that holds a block's own text and the position before it, or `null`. */
export function holderTextblock(holder: Pick<TiptapHolder, 'node' | 'pos'>): {
  readonly node: TiptapNodeLike;
  readonly pos: number;
} | null {
  if (holder.node.isTextblock) return { node: holder.node, pos: holder.pos };
  if (isItemNode(holder.node)) {
    const first = holder.node.firstChild;
    return first?.isTextblock ? { node: first, pos: holder.pos + 1 } : null;
  }
  return null;
}

const CELL_TYPES: ReadonlySet<string> = new Set([NATIVE.cell, NATIVE.header]);
/** Whether a node is a table cell. */
export const isCellNode = (node: TiptapNodeLike): boolean => CELL_TYPES.has(node.type.name);

/** A cell of a table node: the position before it and its node. */
export function cellAt(
  table: TiptapNodeLike,
  tablePos: number,
  cell: TextEditorCellAddress,
  tables: TiptapTablesLike,
): { readonly node: TiptapNodeLike; readonly pos: number } | null {
  const map = tables.TableMap.get(table);
  if (cell.row >= map.height || cell.column >= map.width || cell.row < 0 || cell.column < 0)
    return null;
  const offset = map.map[cell.row * map.width + cell.column];
  if (offset === undefined) return null;
  const node = table.nodeAt(offset);
  return node ? { node, pos: tablePos + 1 + offset } : null;
}

/** The paragraph of a cell by index and the position before it. */
function cellParagraph(
  cell: { readonly node: TiptapNodeLike; readonly pos: number },
  index: number,
): { readonly node: TiptapNodeLike; readonly pos: number } | null {
  if (index >= cell.node.childCount) return null;
  let pos = cell.pos + 1;
  for (let child = 0; child < index; child += 1) pos += cell.node.child(child).nodeSize;
  const node = cell.node.child(index);
  return node.isTextblock ? { node, pos } : null;
}

/**
 * The textblock that a point or range addresses and the position before it: a block's own
 * textblock, or a paragraph of a table cell.
 */
export function addressedTextblock(
  doc: TiptapNodeLike,
  address: Pick<TextEditorTextPoint, 'block' | 'cell'>,
  tables: TiptapTablesLike | undefined,
): { readonly node: TiptapNodeLike; readonly pos: number } | null {
  const holder = holderIndex(doc).byId.get(address.block);
  if (!holder) return null;
  if (!address.cell) return holderTextblock(holder);
  if (holder.node.type.name !== NATIVE.table || !tables) return null;
  const cell = cellAt(holder.node, holder.pos, address.cell, tables);
  return cell ? cellParagraph(cell, address.cell.paragraph) : null;
}

/** The engine position of a text point, or `null` when the point does not resolve. */
export function pointToPos(
  doc: TiptapNodeLike,
  point: TextEditorTextPoint,
  tables?: TiptapTablesLike,
): number | null {
  const textblock = addressedTextblock(doc, point, tables);
  if (!textblock || point.offset < 0 || point.offset > textblock.node.content.size) return null;
  return textblock.pos + 1 + point.offset;
}

/** The engine positions of a text range, or `null` when it does not resolve. */
export function rangeToPositions(
  doc: TiptapNodeLike,
  range: TextEditorTextRange,
  tables?: TiptapTablesLike,
): { readonly from: number; readonly to: number } | null {
  const textblock = addressedTextblock(doc, range, tables);
  if (!textblock || range.from > range.to || range.to > textblock.node.content.size) return null;
  const start = textblock.pos + 1;
  return { from: start + range.from, to: start + range.to };
}

/**
 * The text point of an engine position inside a textblock, or `null` for a position outside one
 * or in a textblock that is no block's own text.
 */
export function posToPoint(
  doc: TiptapNodeLike,
  pos: number,
  tables?: TiptapTablesLike,
): TextEditorTextPoint | null {
  if (pos < 0 || pos > doc.content.size) return null;
  const $pos = doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;
  const offset = $pos.parentOffset;
  const depth = $pos.depth;
  if (depth >= 2 && isCellNode($pos.node(depth - 1))) {
    if (!tables || depth < 4) return null;
    const table = $pos.node(depth - 3);
    const id = table.attrs.id;
    if (typeof id !== 'string') return null;
    const rect = tables.TableMap.get(table).findCell(
      $pos.before(depth - 1) - $pos.start(depth - 3),
    );
    return {
      block: id,
      cell: { row: rect.top, column: rect.left, paragraph: $pos.index(depth - 1) },
      offset,
    };
  }
  const textblock = $pos.parent;
  const holder =
    depth >= 2 && isItemNode($pos.node(depth - 1)) && $pos.index(depth - 1) === 0
      ? $pos.node(depth - 1)
      : depth === 1
        ? textblock
        : null;
  const id = holder?.attrs.id;
  return typeof id === 'string' ? { block: id, offset } : null;
}

/**
 * The holder whose node contains a position, the innermost one: a list item before its list. A
 * holder's end is exclusive: the position right after a block belongs to what follows it
 * (`uwg-te-req-blocks-4`).
 */
export function holderAtPos(doc: TiptapNodeLike, pos: number): TiptapHolder | null {
  let found: TiptapHolder | null = null;
  for (const holder of holderIndex(doc).list) {
    if (pos < holder.pos || pos >= holder.pos + holder.node.nodeSize) continue;
    if (!found || holder.depth >= found.depth) found = holder;
  }
  return found;
}

/** The palette name of a native color attribute, or `null`. */
export const colorOf = (value: unknown): TextEditorColor | null =>
  isTextEditorColor(value) ? value : null;

const KIND_OF_TYPE: Readonly<Record<string, string>> = {
  [NATIVE.paragraph]: 'paragraph',
  [NATIVE.heading]: 'heading',
  [NATIVE.quote]: 'quote',
  [NATIVE.code]: 'code',
  [NATIVE.divider]: 'divider',
  [NATIVE.image]: 'image',
  [NATIVE.table]: 'table',
  [NATIVE.taskItem]: 'list-task',
};

/**
 * The block kind of a holder, as the block tree reports it: a list item takes the kind of its
 * list, a custom block its name.
 */
export function holderKind(
  doc: TiptapNodeLike,
  holder: Pick<TiptapHolder, 'node' | 'pos'>,
): string {
  const name = holder.node.type.name;
  if (name === NATIVE.listItem)
    return doc.resolve(holder.pos).parent.type.name === NATIVE.orderedList
      ? 'list-ordered'
      : 'list-bullet';
  return KIND_OF_TYPE[name] ?? customNodeName(name) ?? name;
}

// Single blocks and inline units (state, input rules)

/**
 * The inline units of a textblock before an offset, as `caretTextBefore` reads them: its text, a
 * hard break, or an inline node.
 */
export function inlineUnitsBefore(parent: TiptapNodeLike, offset: number): TextEditorInlineUnit[] {
  const units: TextEditorInlineUnit[] = [];
  parent.forEach((child, at) => {
    if (at >= offset) return;
    if (child.isText) units.push({ type: 'text', text: (child.text ?? '').slice(0, offset - at) });
    else if (child.type.name === NATIVE.hardBreak) units.push({ type: 'hard-break' });
    else units.push({ type: 'custom' });
  });
  return units;
}

/** The portable inline content of a textblock other than a code block. */
export function textblockInline(node: TiptapNodeLike): TextEditorPortableInline[] {
  const json = node.toJSON() as { readonly content?: readonly unknown[] | undefined };
  return inlineContent(json.content ?? []);
}

/**
 * The inline content of the textblock or cell paragraph that a block and cell address in a
 * document, or `null`, as the shared link rule reads it (`linkAtSelection`).
 */
export const inlineAt =
  (doc: TiptapNodeLike, tables: TiptapTablesLike | undefined): TextEditorInlineAt =>
  (block, cell) => {
    const textblock = addressedTextblock(doc, { block, cell }, tables);
    return textblock ? textblockInline(textblock.node) : null;
  };

const singles = new WeakMap<object, { readonly key: string; readonly block: unknown }>();

/**
 * The portable form of one block holder alone, canonical with the mount's nodes, which the state
 * reads for the few blocks it reports: a list item with its own paragraph only, in a list of its
 * kind that holds its start when it is the list's first item. Memoized per node; `null` for a node
 * that maps to no block.
 */
export function holderBlock(
  doc: TiptapNodeLike,
  holder: Pick<TiptapHolder, 'node' | 'pos'>,
  nodes: readonly TextEditorNodeDefinition[],
): TextEditorPortableBlock | null {
  const { node } = holder;
  let json: unknown;
  let key = '';
  if (isItemNode(node)) {
    const $pos = doc.resolve(holder.pos);
    const list = $pos.parent;
    const first = $pos.index() === 0;
    key = `${list.type.name}:${first ? String(list.attrs.start) : ''}`;
    json = {
      type: list.type.name,
      attrs: first ? list.attrs : {},
      content: [
        {
          type: node.type.name,
          attrs: node.attrs,
          content: node.firstChild ? [node.firstChild.toJSON()] : [],
        },
      ],
    };
  }
  const cached = singles.get(node);
  if (cached?.key === key) return cached.block as TextEditorPortableBlock | null;
  let block: TextEditorPortableBlock | null;
  try {
    const draft = fromTiptapJson({ type: NATIVE.doc, content: [json ?? node.toJSON()] });
    block = canonicalize(draft, { nodes }).document.blocks[0] ?? null;
  } catch {
    block = null;
  }
  singles.set(node, { key, block });
  return block;
}
