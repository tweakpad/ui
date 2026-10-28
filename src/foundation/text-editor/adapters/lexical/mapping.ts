/**
 * The pure mapper between Lexical's native JSON and the portable model (Widgets
 * `uwg-te-req-content-1`, `uwg-te-tab-content-model`, `uwg-te-req-content-2`).
 *
 * Native JSON is `SerializedEditorState`. Block identifiers live in NodeState `tp-id`, text colors
 * and highlight hues in NodeState `tp-color` and `tp-highlight` (a highlighted run also carries the
 * engine's highlight format, so that it renders as its own element), cell backgrounds in
 * `tp-background`; nothing is a literal color. A list item holds its inline content directly, and
 * its nested items follow in a wrapper item that holds only nested lists; the mapper turns those
 * wrappers into the children of the previous item. Links keep their destination only: `target`,
 * `rel` and `title` are neither read nor written. The mapper calls no engine: it reads and writes
 * plain JSON, and foreign or malformed JSON (Tiptap's `{ type: 'doc' }`) is a DataError.
 */
import { domError } from '../../../dom-error.js';
import { isTextEditorAttributeValue, storedAlign, TOGGLE_MARKS } from '../../actions.js';
import {
  isListItem,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableCellParagraph,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
  type TextEditorPortableDraftBlock,
  type TextEditorPortableDraftTableCell,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
  type TextEditorPortableMarks,
  type TextEditorPortableTable,
} from '../../content/portable.js';
import type { TextEditorAlign, TextEditorAttributes, TextEditorHeadingLevel } from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import { isTextEditorColor, type TextEditorColor } from '../../palette.js';
import { LEXICAL_STATE_KEYS } from './states.js';

// Engine vocabulary of the JSON

/** The node types the adapter defines. */
export const LEXICAL_NODE_TYPES = Object.freeze({
  image: 'tp-image',
  blockPrefix: 'tp-block-',
  inlinePrefix: 'tp-inline-',
});

/** The JSON type of a custom node. */
export const customNodeType = (definition: Pick<TextEditorNodeDefinition, 'kind' | 'name'>) =>
  `${definition.kind === 'block' ? LEXICAL_NODE_TYPES.blockPrefix : LEXICAL_NODE_TYPES.inlinePrefix}${definition.name}`;

/** The text format bits of the engine (`lexical` `IS_*`). */
export const LEXICAL_FORMAT = Object.freeze({
  bold: 1,
  italic: 2,
  strike: 4,
  underline: 8,
  code: 16,
  subscript: 32,
  superscript: 64,
  highlight: 128,
});

/** The header state bits of a table cell (`TableCellHeaderStates`). */
export const LEXICAL_HEADER = Object.freeze({ none: 0, row: 1, column: 2, both: 3 });

/** The highlight hue of a highlighted run without a stored hue. */
export const DEFAULT_HIGHLIGHT: TextEditorColor = 'yellow';

/** A node of native JSON. */
export interface LexicalJsonNode {
  readonly type: string;
  readonly version: number;
  readonly [member: string]: unknown;
}

/** Native JSON: a serialized editor state. */
export interface LexicalJsonState {
  readonly root: LexicalJsonNode;
}

type Rec = Readonly<Record<string, unknown>>;

const isRecord = (value: unknown): value is Rec =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const malformed = (what: string): Error =>
  domError('DataError', `The native JSON is no Lexical editor state: ${what}.`);

/** The children of a JSON node, each checked to be a node. */
function childrenOf(node: Rec): readonly Rec[] {
  const children = node['children'];
  if (children === undefined) return [];
  if (!Array.isArray(children))
    throw malformed(`a "${String(node['type'])}" node has no child list`);
  for (const child of children)
    if (!isRecord(child) || typeof child['type'] !== 'string')
      throw malformed('a child is not a node');
  return children as readonly Rec[];
}

const stateOf = (node: Rec): Rec => (isRecord(node['$']) ? node['$'] : {});

function idOf(node: Rec): { id?: string } {
  const id = stateOf(node)[LEXICAL_STATE_KEYS.id];
  return typeof id === 'string' && id !== '' ? { id } : {};
}

const colorOf = (value: unknown): TextEditorColor | undefined =>
  isTextEditorColor(value) ? value : undefined;

/**
 * The stored alignment of an element `format` (the shared `storedAlign`): the engine's `right` is
 * the logical `end`, and `left` and `start` are the default, which stores nothing.
 */
const alignOf = (format: unknown): TextEditorAlign | undefined =>
  storedAlign(format === 'right' ? 'end' : format);

const aligned = (node: Rec): { align?: TextEditorAlign } => {
  const align = alignOf(node['format']);
  return align ? { align } : {};
};

// Native JSON to the portable model

const INLINE_TYPES: ReadonlySet<string> = new Set([
  'text',
  'tab',
  'code-highlight',
  'linebreak',
  'link',
  'autolink',
]);

const isInlineJson = (node: Rec): boolean => {
  const type = node['type'] as string;
  return INLINE_TYPES.has(type) || type.startsWith(LEXICAL_NODE_TYPES.inlinePrefix);
};

type Marks = { -readonly [K in keyof TextEditorPortableMarks]: TextEditorPortableMarks[K] };

/** A run's colors as the engine holds them: palette names, anything else meaning none. */
export interface LexicalRunColors {
  readonly color?: unknown;
  readonly highlight?: unknown;
}

/**
 * The portable marks of the engine's format bits with a run's colors and the link around it: each
 * toggle mark whose bit is set, the highlight with its hue (yellow without one), the text color and
 * the link. The one conversion from format bits to marks, for native JSON and for live nodes.
 */
export function portableMarks(
  format: number,
  colors: LexicalRunColors,
  link: string | null = null,
): TextEditorPortableMarks {
  const marks: Marks = {};
  if (link !== null) marks.link = link;
  const color = colorOf(colors.color);
  if (color) marks.textColor = color;
  if (format & LEXICAL_FORMAT.highlight)
    marks.highlight = colorOf(colors.highlight) ?? DEFAULT_HIGHLIGHT;
  for (const mark of TOGGLE_MARKS) if (format & LEXICAL_FORMAT[mark]) marks[mark] = true;
  return marks;
}

/** The marks of a text node's JSON: its format bits and its NodeState colors, in a link or not. */
function marksOf(node: Rec, link: string | null): TextEditorPortableMarks | undefined {
  const format = typeof node['format'] === 'number' ? node['format'] : 0;
  const state = stateOf(node);
  const marks = portableMarks(
    format,
    { color: state[LEXICAL_STATE_KEYS.color], highlight: state[LEXICAL_STATE_KEYS.highlight] },
    link,
  );
  return Object.keys(marks).length > 0 ? marks : undefined;
}

function plainAttributes(value: unknown): TextEditorAttributes {
  const attrs: Record<string, TextEditorAttributes[string]> = {};
  if (isRecord(value))
    for (const [name, attr] of Object.entries(value))
      if (isTextEditorAttributeValue(attr)) attrs[name] = attr;
  return attrs;
}

/** Inline content: text runs with their marks, hard breaks and custom inline nodes. */
function readInline(
  children: readonly Rec[],
  link: string | null = null,
): TextEditorPortableInline[] {
  const content: TextEditorPortableInline[] = [];
  for (const node of children) {
    const type = node['type'] as string;
    switch (type) {
      case 'text':
      case 'tab':
      case 'code-highlight': {
        const text = typeof node['text'] === 'string' ? node['text'] : type === 'tab' ? '\t' : '';
        const marks = marksOf(node, link);
        if (text !== '')
          content.push(marks ? { type: 'text', text, marks } : { type: 'text', text });
        break;
      }
      case 'linebreak':
        content.push({ type: 'hard-break' });
        break;
      case 'link':
      case 'autolink': {
        const url = node['url'];
        content.push(
          ...readInline(childrenOf(node), typeof url === 'string' && url !== '' ? url : link),
        );
        break;
      }
      default:
        if (type.startsWith(LEXICAL_NODE_TYPES.inlinePrefix))
          content.push({
            type: 'custom',
            name: type.slice(LEXICAL_NODE_TYPES.inlinePrefix.length),
            attrs: plainAttributes(node['attrs']),
          });
        else if (Array.isArray(node['children']))
          content.push(...readInline(childrenOf(node), link));
        else if (typeof node['text'] === 'string' && node['text'] !== '')
          content.push({ type: 'text', text: node['text'] });
    }
  }
  return content;
}

/** The text of a code block: text runs as they are, a line break as a line feed. */
function codeText(children: readonly Rec[]): string {
  let text = '';
  for (const node of children) {
    const type = node['type'];
    if (type === 'linebreak') text += '\n';
    else if (type === 'tab') text += '\t';
    else if (typeof node['text'] === 'string') text += node['text'];
    else if (Array.isArray(node['children'])) text += codeText(childrenOf(node));
  }
  return text;
}

const HEADING_TAG = /^h([1-6])$/;

type DraftItem = {
  type: 'list-bullet' | 'list-ordered' | 'list-task';
  id?: string;
  align?: TextEditorAlign;
  content: TextEditorPortableInline[];
  children: TextEditorPortableDraftBlock[];
  start?: number;
  checked?: boolean;
};

const LIST_KINDS = { bullet: 'list-bullet', number: 'list-ordered', check: 'list-task' } as const;

/**
 * The items of a list. A wrapper item, one that holds only nested lists, gives its items to the
 * previous item as children; without a previous item they take its place.
 */
function readList(list: Rec): DraftItem[] {
  const listType = list['listType'];
  const kind =
    listType === 'number' || listType === 'check' ? LIST_KINDS[listType] : LIST_KINDS.bullet;
  const start =
    typeof list['start'] === 'number' && Number.isInteger(list['start']) ? list['start'] : 1;
  const items: DraftItem[] = [];
  for (const node of childrenOf(list)) {
    if (node['type'] === 'list') {
      const nested = readList(node);
      const last = items[items.length - 1];
      if (last) last.children.push(...nested);
      else items.push(...nested);
      continue;
    }
    const children = childrenOf(node);
    const lists = children.filter((child) => child['type'] === 'list');
    const inline = children.filter((child) => child['type'] !== 'list');
    const nested = lists.flatMap(readList);
    if (inline.length === 0 && lists.length > 0) {
      const last = items[items.length - 1];
      if (last) last.children.push(...nested);
      else items.push(...nested);
      continue;
    }
    const item: DraftItem = {
      type: kind,
      ...idOf(node),
      ...aligned(node),
      content: readInline(inline),
      children: nested,
    };
    if (kind === 'list-task') item.checked = node['checked'] === true;
    if (kind === 'list-ordered' && items.length === 0 && start !== 1) item.start = start;
    items.push(item);
  }
  return items;
}

/** The header flags of a table from its cells' header bits. */
function headerFlags(rows: readonly (readonly Rec[])[]): {
  headerRow: boolean;
  headerColumn: boolean;
} {
  const bits = (cell: Rec): number =>
    typeof cell['headerState'] === 'number' ? cell['headerState'] : 0;
  const first = rows[0] ?? [];
  const headerRow =
    first.length > 0 && first.every((cell) => (bits(cell) & LEXICAL_HEADER.row) !== 0);
  // The cells that start at the first column: a row whose first column a span covers has none.
  const covered: number[] = [];
  const leading: Rec[] = [];
  rows.forEach((cells, row) => {
    const cell = cells[0];
    if (cell && !((covered[row] ?? 0) > 0)) {
      leading.push(cell);
      const span = typeof cell['rowSpan'] === 'number' ? cell['rowSpan'] : 1;
      for (let next = row + 1; next < row + span; next += 1) covered[next] = 1;
    }
  });
  const headerColumn =
    leading.length > 0 && leading.every((cell) => (bits(cell) & LEXICAL_HEADER.column) !== 0);
  return { headerRow, headerColumn };
}

function readCell(cell: Rec): TextEditorPortableDraftTableCell {
  const children = childrenOf(cell);
  const paragraphs: TextEditorPortableCellParagraph[] = [];
  const blocks: TextEditorPortableDraftBlock[] = [];
  let align: TextEditorAlign | undefined;
  let first = true;
  for (const child of children) {
    if (child['type'] === 'paragraph' && blocks.length === 0) {
      if (first) align = alignOf(child['format']);
      paragraphs.push({ content: readInline(childrenOf(child)) });
    } else if (isInlineJson(child) && blocks.length === 0) {
      paragraphs.push({ content: readInline([child]) });
    } else blocks.push(...readBlocks([child]));
    first = false;
  }
  const span = (value: unknown) =>
    typeof value === 'number' && Number.isInteger(value) && value > 1 ? value : undefined;
  const rowSpan = span(cell['rowSpan']);
  const colSpan = span(cell['colSpan']);
  const background = colorOf(stateOf(cell)[LEXICAL_STATE_KEYS.background]);
  return {
    ...(rowSpan ? { rowSpan } : {}),
    ...(colSpan ? { colSpan } : {}),
    ...(background ? { background } : {}),
    ...(align ? { align } : {}),
    paragraphs,
    ...(blocks.length > 0 ? { blocks } : {}),
  };
}

function readTable(table: Rec): TextEditorPortableDraftBlock {
  const rowNodes = childrenOf(table).filter((row) => row['type'] === 'tablerow');
  const cells = rowNodes.map((row) =>
    childrenOf(row).filter((cell) => cell['type'] === 'tablecell'),
  );
  const widths = table['colWidths'];
  return {
    type: 'table',
    ...idOf(table),
    ...headerFlags(cells),
    ...(Array.isArray(widths) && widths.every((width) => typeof width === 'number')
      ? { widths: widths as number[] }
      : {}),
    rows: cells.map((rowCells) => ({ cells: rowCells.map(readCell) })),
  };
}

function readBlocks(children: readonly Rec[]): TextEditorPortableDraftBlock[] {
  const blocks: TextEditorPortableDraftBlock[] = [];
  let loose: Rec[] = [];
  const flushLoose = () => {
    if (loose.length > 0) blocks.push({ type: 'paragraph', content: readInline(loose) });
    loose = [];
  };
  for (const node of children) {
    if (isInlineJson(node)) {
      loose.push(node);
      continue;
    }
    flushLoose();
    const type = node['type'] as string;
    switch (type) {
      case 'paragraph':
        blocks.push({
          type: 'paragraph',
          ...idOf(node),
          ...aligned(node),
          content: readInline(childrenOf(node)),
        });
        break;
      case 'heading': {
        const match = HEADING_TAG.exec(String(node['tag']));
        const level = (match ? Number(match[1]) : 1) as TextEditorHeadingLevel;
        blocks.push({
          type: 'heading',
          ...idOf(node),
          level,
          ...aligned(node),
          content: readInline(childrenOf(node)),
        });
        break;
      }
      case 'quote': {
        const kids = childrenOf(node);
        const split = kids.findIndex((kid) => !isInlineJson(kid));
        const inline = split < 0 ? kids : kids.slice(0, split);
        blocks.push({
          type: 'quote',
          ...idOf(node),
          ...aligned(node),
          content: readInline(inline),
          ...(split < 0 ? {} : { blocks: readBlocks(kids.slice(split)) }),
        });
        break;
      }
      case 'code': {
        const language = node['language'];
        blocks.push({
          type: 'code',
          ...idOf(node),
          ...(typeof language === 'string' && language !== '' ? { language } : {}),
          text: codeText(childrenOf(node)),
        });
        break;
      }
      case 'list':
        blocks.push(...readList(node));
        break;
      case 'listitem':
        blocks.push(...readList({ type: 'list', listType: 'bullet', children: [node] }));
        break;
      case 'horizontalrule':
        blocks.push({ type: 'divider', ...idOf(node) });
        break;
      case LEXICAL_NODE_TYPES.image: {
        const width = node['width'];
        blocks.push({
          type: 'image',
          ...idOf(node),
          src: typeof node['src'] === 'string' ? node['src'] : '',
          alt: typeof node['alt'] === 'string' ? node['alt'] : '',
          ...(typeof width === 'number' && Number.isFinite(width) && width > 0 ? { width } : {}),
        });
        break;
      }
      case 'table':
        blocks.push(readTable(node));
        break;
      default:
        if (type.startsWith(LEXICAL_NODE_TYPES.blockPrefix)) {
          const kids = Array.isArray(node['children']) ? childrenOf(node) : null;
          blocks.push({
            type: 'custom',
            ...idOf(node),
            name: type.slice(LEXICAL_NODE_TYPES.blockPrefix.length),
            attrs: plainAttributes(node['attrs']),
            ...(kids ? { content: readInline(kids) } : {}),
          });
        } else if (Array.isArray(node['children'])) {
          const kids = childrenOf(node);
          if (kids.every(isInlineJson))
            blocks.push({ type: 'paragraph', ...idOf(node), content: readInline(kids) });
          else blocks.push(...readBlocks(kids));
        }
    }
  }
  flushLoose();
  return blocks;
}

/**
 * Native JSON as a portable draft, which `canonicalize` fits to the content model. Throws a
 * DataError for JSON that is no Lexical editor state: not an object, no `root` node of type
 * `root` with a child list, or a child that is no node.
 */
export function lexicalToPortable(json: unknown): TextEditorPortableDraft {
  if (!isRecord(json)) throw malformed('it is not an object');
  const root = json['root'];
  if (!isRecord(root) || root['type'] !== 'root') throw malformed('it has no root node');
  if (!Array.isArray(root['children'])) throw malformed('its root has no child list');
  return { blocks: readBlocks(childrenOf(root)) };
}

// The portable model to native JSON

const node = (type: string, members: Rec = {}): LexicalJsonNode => ({
  type,
  version: 1,
  ...members,
});

function stateMembers(state: Record<string, string | undefined>): Rec {
  const entries = Object.entries(state).filter(([, value]) => value !== undefined && value !== '');
  return entries.length > 0 ? { $: Object.fromEntries(entries) } : {};
}

const idMembers = (block: { readonly id?: string | undefined }): Rec =>
  stateMembers({ [LEXICAL_STATE_KEYS.id]: block.id });

const formatMembers = (align: TextEditorAlign | undefined): Rec =>
  align && align !== 'start' ? { format: align } : {};

/** The engine's format bits of portable marks: the inverse of `portableMarks` for the bits. */
export function formatBits(marks: TextEditorPortableMarks | null | undefined): number {
  if (!marks) return 0;
  let bits = marks.highlight ? LEXICAL_FORMAT.highlight : 0;
  for (const mark of TOGGLE_MARKS) if (marks[mark]) bits |= LEXICAL_FORMAT[mark];
  return bits;
}

function textNode(text: string, marks: TextEditorPortableMarks | undefined): LexicalJsonNode {
  const format = formatBits(marks);
  return node('text', {
    text,
    ...(format !== 0 ? { format } : {}),
    ...stateMembers({
      [LEXICAL_STATE_KEYS.color]: marks?.textColor,
      [LEXICAL_STATE_KEYS.highlight]: marks?.highlight,
    }),
  });
}

/** Inline content as children: consecutive runs of one link destination share one link node. */
export function writeInline(content: readonly TextEditorPortableInline[]): LexicalJsonNode[] {
  const children: LexicalJsonNode[] = [];
  let link = null as { url: string; children: LexicalJsonNode[] } | null;
  for (const inline of content) {
    if (inline.type === 'text') {
      const url = inline.marks?.link;
      if (url !== undefined) {
        if (link?.url !== url) {
          link = { url, children: [] };
          children.push(node('link', { url, children: link.children }));
        }
        link.children.push(textNode(inline.text, inline.marks));
        continue;
      }
      link = null;
      children.push(textNode(inline.text, inline.marks));
    } else {
      link = null;
      children.push(
        inline.type === 'hard-break'
          ? node('linebreak')
          : node(`${LEXICAL_NODE_TYPES.inlinePrefix}${inline.name}`, {
              attrs: { ...inline.attrs },
            }),
      );
    }
  }
  return children;
}

function codeChildren(text: string): LexicalJsonNode[] {
  const children: LexicalJsonNode[] = [];
  text.split('\n').forEach((line, index) => {
    if (index > 0) children.push(node('linebreak'));
    if (line !== '') children.push(node('text', { text: line }));
  });
  return children;
}

const LIST_TYPES = {
  'list-bullet': 'bullet',
  'list-ordered': 'number',
  'list-task': 'check',
} as const;

/** Consecutive list items of one kind as one list node, each item's children in wrapper items. */
function writeLists(items: readonly TextEditorPortableListItem[]): LexicalJsonNode[] {
  const lists: LexicalJsonNode[] = [];
  let index = 0;
  while (index < items.length) {
    const first = items[index]!;
    const run: TextEditorPortableListItem[] = [];
    while (index < items.length && items[index]!.type === first.type) run.push(items[index++]!);
    const listType = LIST_TYPES[first.type];
    const start = first.type === 'list-ordered' ? (first.start ?? 1) : 1;
    const children: LexicalJsonNode[] = [];
    run.forEach((item, position) => {
      children.push(
        node('listitem', {
          value: start + position,
          ...(item.type === 'list-task' ? { checked: item.checked } : {}),
          ...formatMembers(item.align),
          ...idMembers(item),
          children: writeInline(item.content),
        }),
      );
      for (const nested of writeLists(item.children))
        children.push(node('listitem', { value: start + position + 1, children: [nested] }));
    });
    lists.push(
      node('list', {
        listType,
        start,
        tag: listType === 'number' ? 'ol' : 'ul',
        children,
      }),
    );
  }
  return lists;
}

/** A portable table as a table node's JSON, header bits written from the table's flags. */
export function portableTableToLexical(table: TextEditorPortableTable): LexicalJsonNode {
  const grid = tableGrid(table);
  let placed = 0;
  const rows = table.rows.map((row) =>
    node('tablerow', {
      children: row.cells.map((cell) => {
        const at = grid.cells[placed++];
        const header =
          (table.headerRow && at?.row === 0 ? LEXICAL_HEADER.row : 0) |
          (table.headerColumn && at?.column === 0 ? LEXICAL_HEADER.column : 0);
        return node('tablecell', {
          headerState: header,
          colSpan: cell.colSpan ?? 1,
          rowSpan: cell.rowSpan ?? 1,
          backgroundColor: null,
          ...stateMembers({ [LEXICAL_STATE_KEYS.background]: cell.background }),
          children: cell.paragraphs.map((paragraph) =>
            node('paragraph', {
              ...formatMembers(cell.align),
              children: writeInline(paragraph.content),
            }),
          ),
        });
      }),
    }),
  );
  return node('table', {
    ...(table.widths ? { colWidths: [...table.widths] } : {}),
    ...idMembers(table),
    children: rows,
  });
}

/** A child of the root and the portable blocks it stands for. */
export interface LexicalBlockSegment {
  readonly node: LexicalJsonNode;
  readonly blocks: readonly TextEditorPortableBlock[];
}

/** The children of the root for portable blocks, each with its blocks: list items grouped into lists. */
export function portableBlockSegments(
  blocks: readonly TextEditorPortableBlock[],
): LexicalBlockSegment[] {
  const segments: LexicalBlockSegment[] = [];
  let index = 0;
  while (index < blocks.length) {
    const block = blocks[index]!;
    if (isListItem(block)) {
      const items: TextEditorPortableListItem[] = [];
      while (
        index < blocks.length &&
        isListItem(blocks[index]!) &&
        blocks[index]!.type === block.type
      )
        items.push(blocks[index++] as TextEditorPortableListItem);
      segments.push({ node: writeLists(items)[0]!, blocks: items });
      continue;
    }
    index += 1;
    segments.push({ node: writeBlock(block), blocks: [block] });
  }
  return segments;
}

/** The children of the root for portable blocks: list items grouped into lists. */
export function portableBlocksToLexical(
  blocks: readonly TextEditorPortableBlock[],
): LexicalJsonNode[] {
  return portableBlockSegments(blocks).map((segment) => segment.node);
}

function writeBlock(
  block: Exclude<TextEditorPortableBlock, TextEditorPortableListItem>,
): LexicalJsonNode {
  switch (block.type) {
    case 'paragraph':
      return node('paragraph', {
        ...formatMembers(block.align),
        ...idMembers(block),
        children: writeInline(block.content),
      });
    case 'heading':
      return node('heading', {
        tag: `h${block.level}`,
        ...formatMembers(block.align),
        ...idMembers(block),
        children: writeInline(block.content),
      });
    case 'quote':
      return node('quote', {
        ...formatMembers(block.align),
        ...idMembers(block),
        children: writeInline(block.content),
      });
    case 'code':
      return node('code', {
        ...(block.language !== undefined ? { language: block.language } : {}),
        ...idMembers(block),
        children: codeChildren(block.text),
      });
    case 'divider':
      return node('horizontalrule', idMembers(block));
    case 'image':
      return node(LEXICAL_NODE_TYPES.image, {
        src: block.src,
        alt: block.alt,
        ...(block.width !== undefined ? { width: block.width } : {}),
        ...idMembers(block),
      });
    case 'table':
      return portableTableToLexical(block);
    case 'custom':
      return node(`${LEXICAL_NODE_TYPES.blockPrefix}${block.name}`, {
        attrs: { ...block.attrs },
        ...idMembers(block),
        ...(block.content ? { children: writeInline(block.content) } : {}),
      });
  }
}

/** A canonical portable document as native JSON. */
export function portableToLexical(document: TextEditorPortableDocument): LexicalJsonState {
  return {
    root: node('root', {
      direction: null,
      format: '',
      indent: 0,
      children: portableBlocksToLexical(document.blocks),
    }),
  };
}
