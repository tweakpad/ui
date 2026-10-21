/**
 * Block edits over the portable model (Widgets `uwg-te-tab-actions` r2, `uwg-te-req-blocks-1`,
 * `uwg-te-req-parity-1`, `uwg-te-req-key-3`, `uwg-te-tab-input-rules`, `uwg-te-req-content-7`).
 *
 * Pure functions from a canonical document to the next one, which each adapter applies in one
 * engine transaction or update, so both engines reach the same document: the kind, attributes
 * and alignment of blocks, nesting and unnesting list items, blocks placed inside a list, Tab with
 * list items, the block input rules, and the textblocks that a text selection targets. This
 * module also holds the tree edits the other edit modules build on. Identifiers stay with their
 * blocks; new blocks take identifiers from `createId`, so the caller knows them before it selects
 * them. Every function answers `null` when its action cannot apply, which `can` reports as
 * `false`.
 */
import {
  canonicalize,
  inlineText,
  isListItem,
  nodeLookup,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraftBlock,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
} from '../../content/portable.js';
import type {
  TextEditorAlign,
  TextEditorAttributes,
  TextEditorAttributeValue,
  TextEditorBlockKind,
  TextEditorHeadingLevel,
  TextEditorSelectionInput,
  TextEditorTextPoint,
} from '../../model.js';
import { storedAlign } from '../../actions.js';
import type { TextEditorUrlPolicy } from '../../engine.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import type { TextEditorBlockRule } from '../../input-rules.js';
import { allowedUrl, imageProtocols } from '../../../markdown/url.js';
import {
  blockAt,
  blockInline,
  comparePaths,
  findBlock,
  findPath,
  inlineLength,
  isAncestorPath,
  isTextblock,
  locatedBlocks,
  splitInline,
  type TextEditorBlockPath,
} from './blocks.js';

type Block = TextEditorPortableBlock;
type Item = TextEditorPortableListItem;
type Inline = TextEditorPortableInline;

/** What every edit needs: the URL policy, the custom node definitions and fresh identifiers. */
export interface TextEditorEditContext {
  readonly urls: TextEditorUrlPolicy;
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly createId: () => string;
}

// Tree edits that the edit modules share

/** The blocks with the container at `parent` (a path, or the top level) changed by `change`. */
export function updateContainer(
  blocks: readonly Block[],
  parent: TextEditorBlockPath,
  change: (children: Block[]) => Block[],
): Block[] {
  if (parent.length === 0) return change([...blocks]);
  const [head, ...rest] = parent;
  return blocks.map((block, index) => {
    if (index !== head) return block;
    if (!isListItem(block))
      throw new Error('A container path ends at a block that is no list item.');
    return { ...block, children: updateContainer(block.children, rest, change) as Item[] } as Block;
  });
}

/** The blocks with the block at `path` replaced by `next`, which may be none or several. */
export const replaceAt = (
  blocks: readonly Block[],
  path: TextEditorBlockPath,
  next: readonly Block[],
): Block[] =>
  updateContainer(blocks, path.slice(0, -1), (children) => {
    children.splice(path[path.length - 1]!, 1, ...next);
    return children;
  });

/** The canonical document of edited blocks. */
export function editedDocument(
  blocks: readonly TextEditorPortableDraftBlock[],
  context: TextEditorEditContext,
): TextEditorPortableDocument {
  return canonicalize({ blocks }, { nodes: context.nodes, createId: context.createId }).document;
}

/** A textblock with other inline content; a code block takes its text. */
export function withInline(
  block: Block,
  content: readonly Inline[],
  nodes: readonly TextEditorNodeDefinition[],
): Block {
  if (block.type === 'code') return { ...block, text: inlineText(content, nodes) };
  return { ...block, content } as Block;
}

/** The identifiers in document order, or `null` when one names no block. */
export function orderIds(blocks: readonly Block[], ids: readonly string[]): string[] | null {
  const paths = new Map<string, TextEditorBlockPath>();
  for (const id of ids) {
    const path = findPath(blocks, id);
    if (!path) return null;
    paths.set(id, path);
  }
  return [...paths.keys()].sort((a, b) => comparePaths(paths.get(a)!, paths.get(b)!));
}

/** The identifiers in document order without those inside another one's subtree. */
export function topmost(
  blocks: readonly Block[],
  ids: readonly string[],
): { id: string; path: TextEditorBlockPath }[] | null {
  const ordered = orderIds(blocks, ids);
  if (!ordered) return null;
  const located = ordered.map((id) => ({ id, path: findPath(blocks, id)! }));
  return located.filter(({ path }) => !located.some((other) => isAncestorPath(other.path, path)));
}

// The targets of the block actions

/** The located blocks from the block of `a` to the block of `b`, both included, in document order. */
function blocksBetween(document: TextEditorPortableDocument, a: string, b: string) {
  const order = locatedBlocks(document.blocks);
  const first = order.findIndex(({ block }) => block.id === a);
  const last = order.findIndex(({ block }) => block.id === b);
  if (first < 0 || last < 0) return [];
  return order.slice(Math.min(first, last), Math.max(first, last) + 1);
}

/**
 * The textblocks that a text selection targets for `block.set-type`, `block.align`,
 * `block.indent` and `block.outdent` (`uwg-te-tab-actions` r2): every textblock whose text the
 * range from `anchor` to `head` meets, in document order, from the block holding the first point
 * to the block holding the last, both included at any offset, nested items as they come; atoms and
 * tables between them are skipped. Empty for a point in a table cell, whose paragraphs are no
 * blocks, or a point naming no block; the action then cannot apply.
 */
export function textblockTargets(
  document: TextEditorPortableDocument,
  anchor: TextEditorTextPoint,
  head: TextEditorTextPoint,
): readonly string[] {
  if (anchor.cell || head.cell) return [];
  return blocksBetween(document, anchor.block, head.block).flatMap(({ block }) =>
    isTextblock(block) && block.id ? [block.id] : [],
  );
}

// block.set-type (uwg-te-tab-actions r2)

const LIST_KINDS: ReadonlySet<string> = new Set(['list-bullet', 'list-ordered', 'list-task']);
const BUILTIN_TEXTBLOCKS: ReadonlySet<string> = new Set([
  'paragraph',
  'heading',
  'quote',
  'code',
  ...LIST_KINDS,
]);

/** The key under which a block's kind is compared: a heading with its level, a custom block by name. */
const kindKeyOf = (block: Block): string =>
  block.type === 'heading'
    ? `heading:${String(block.level)}`
    : block.type === 'custom'
      ? block.name
      : block.type;

/** A block's own alignment attribute, kept when it turns into another kind. */
const ownAlign = (block: Block): TextEditorAlign | undefined =>
  'align' in block ? storedAlign(block.align) : undefined;

export interface TextEditorSetTypeInput {
  readonly kind: TextEditorBlockKind;
  readonly attrs?: TextEditorAttributes | undefined;
  readonly toggle?: boolean | undefined;
}

/** The block a textblock turns into, keeping its identifier, content and alignment. */
function convertBlock(
  block: Block,
  kind: TextEditorBlockKind,
  attrs: TextEditorAttributes,
  context: TextEditorEditContext,
): Block | null {
  const content = blockInline(block) ?? [];
  const id = block.id === undefined ? {} : { id: block.id };
  const alignAttr = attrs['align'];
  // A given alignment replaces the block's own; `null` and `start` restore the default.
  const align =
    alignAttr === null || typeof alignAttr === 'string' ? storedAlign(alignAttr) : ownAlign(block);
  const aligned = align ? { align } : {};
  const children = isListItem(block) ? block.children : [];
  switch (kind) {
    case 'paragraph':
      return { type: 'paragraph', ...id, ...aligned, content };
    case 'quote':
      return { type: 'quote', ...id, ...aligned, content };
    case 'heading': {
      const level = attrs['level'];
      if (typeof level !== 'number') return null;
      return {
        type: 'heading',
        ...id,
        level: level as TextEditorHeadingLevel,
        ...aligned,
        content,
      };
    }
    case 'code': {
      const language =
        typeof attrs['language'] === 'string'
          ? attrs['language']
          : attrs['language'] === null
            ? undefined
            : block.type === 'code'
              ? block.language
              : undefined;
      return {
        type: 'code',
        ...id,
        ...(language ? { language } : {}),
        text: block.type === 'code' ? block.text : inlineText(content, context.nodes),
      };
    }
    case 'list-bullet':
      return { type: 'list-bullet', ...id, ...aligned, content, children };
    case 'list-ordered': {
      const start =
        typeof attrs['start'] === 'number'
          ? attrs['start']
          : block.type === 'list-ordered'
            ? block.start
            : undefined;
      return {
        type: 'list-ordered',
        ...id,
        ...aligned,
        ...(start !== undefined ? { start } : {}),
        content,
        children,
      };
    }
    case 'list-task': {
      const checked =
        typeof attrs['checked'] === 'boolean'
          ? attrs['checked']
          : block.type === 'list-task'
            ? block.checked
            : false;
      return { type: 'list-task', ...id, ...aligned, checked, content, children };
    }
    default: {
      const definition = nodeLookup(context.nodes).blocks.get(kind);
      if (!definition || definition.content !== 'inline') return null;
      return { type: 'custom', ...id, name: kind, attrs: { ...attrs }, content };
    }
  }
}

/**
 * Turns the textblocks of `ids` into a kind; with `toggle`, blocks that all are of that kind turn
 * into paragraphs. A list item that becomes another kind splits the outermost list at its place
 * (`placeInList`). Every block keeps its identifier.
 */
export function setBlockType(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  input: TextEditorSetTypeInput,
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  if (ids.length === 0) return null;
  const targets = ids.map((id) => findBlock(document.blocks, id));
  if (!targets.every((block): block is Block => block !== undefined && isTextblock(block)))
    return null;
  const custom = !BUILTIN_TEXTBLOCKS.has(input.kind);
  if (custom && nodeLookup(context.nodes).blocks.get(input.kind)?.content !== 'inline') return null;
  const attrs = input.attrs ?? {};
  const key = input.kind === 'heading' ? `heading:${String(attrs['level'])}` : input.kind;
  const toParagraph = input.toggle === true && targets.every((block) => kindKeyOf(block) === key);
  const kind = toParagraph ? 'paragraph' : input.kind;
  const targetAttrs = toParagraph ? {} : attrs;
  let blocks: Block[] = [...document.blocks];
  for (const id of ids) {
    const path = findPath(blocks, id);
    if (!path) return null;
    const block = blockAt(blocks, path)!;
    const converted = convertBlock(block, kind, targetAttrs, context);
    if (!converted) return null;
    // A list item that becomes another kind splits the outermost list at its place.
    blocks =
      isListItem(block) && !isListItem(converted)
        ? placeInList(blocks, path, 'replace', [converted])
        : replaceAt(blocks, path, [converted]);
  }
  return editedDocument(blocks, context);
}

// block.set-attrs and block.align

/**
 * An alignment attribute: `null` and `start` restore the default (`undefined`), a stored
 * alignment is kept, and anything else is `null`, which refuses the edit.
 */
const alignValue = (value: TextEditorAttributeValue): TextEditorAlign | undefined | null =>
  value === null || value === 'start' ? undefined : (storedAlign(value) ?? null);

/** The attributes each kind accepts in `block.set-attrs`. */
const SETTABLE: Readonly<Record<string, readonly string[]>> = {
  paragraph: ['align'],
  quote: ['align'],
  heading: ['level', 'align'],
  code: ['language'],
  'list-bullet': ['align'],
  'list-ordered': ['align', 'start'],
  'list-task': ['align', 'checked'],
  image: ['src', 'alt', 'width'],
};

/** Changes attributes of one block; an attribute its kind does not take refuses the edit. */
export function setBlockAttrs(
  document: TextEditorPortableDocument,
  id: string,
  attrs: TextEditorAttributes,
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  const path = findPath(document.blocks, id);
  if (!path) return null;
  const block = blockAt(document.blocks, path)!;
  const entries = Object.entries(attrs);
  if (entries.length === 0) return null;
  let next: Record<string, unknown> = { ...block };
  if (block.type === 'custom') {
    const definition = nodeLookup(context.nodes).blocks.get(block.name);
    if (!definition) return null;
    for (const [name] of entries) if (!Object.hasOwn(definition.attrs, name)) return null;
    next = { ...block, attrs: { ...block.attrs, ...attrs } };
  } else {
    const allowed = SETTABLE[block.type];
    if (!allowed) return null;
    for (const [name, value] of entries) {
      if (!allowed.includes(name)) return null;
      switch (name) {
        case 'align': {
          const align = alignValue(value);
          if (align === null) return null;
          next['align'] = align;
          break;
        }
        case 'level':
          if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 6)
            return null;
          next['level'] = value;
          break;
        case 'language':
          if (value !== null && typeof value !== 'string') return null;
          next['language'] = value === null || value === '' ? undefined : value;
          break;
        case 'start':
          if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null;
          next['start'] = value;
          break;
        case 'checked':
          if (typeof value !== 'boolean') return null;
          next['checked'] = value;
          break;
        case 'src':
          if (
            typeof value !== 'string' ||
            value === '' ||
            !allowedUrl(value, imageProtocols(context.urls))
          )
            return null;
          next['src'] = value;
          break;
        case 'alt':
          if (typeof value !== 'string') return null;
          next['alt'] = value;
          break;
        case 'width':
          if (value !== null && !(typeof value === 'number' && Number.isFinite(value) && value > 0))
            return null;
          next['width'] = value === null ? undefined : value;
          break;
      }
    }
  }
  return editedDocument(replaceAt(document.blocks, path, [next as unknown as Block]), context);
}

const ALIGNABLE: ReadonlySet<string> = new Set(['paragraph', 'heading', 'quote', ...LIST_KINDS]);

/** Aligns the blocks of `ids` that take an alignment; `null` when none does. */
export function alignBlocks(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  align: TextEditorAlign | null,
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  let blocks: Block[] = [...document.blocks];
  let changed = 0;
  const stored = storedAlign(align);
  for (const id of ids) {
    const path = findPath(blocks, id);
    if (!path) return null;
    const block = blockAt(blocks, path)!;
    if (!ALIGNABLE.has(block.type)) continue;
    const { align: _previous, ...rest } = block as Block & { align?: TextEditorAlign };
    void _previous;
    blocks = replaceAt(blocks, path, [(stored ? { ...rest, align: stored } : rest) as Block]);
    changed += 1;
  }
  return changed > 0 ? editedDocument(blocks, context) : null;
}

// block.indent and block.outdent (uwg-te-req-parity-1)

/** Nests each list item of `ids` under its previous sibling; `null` when none can nest. */
export function indentItems(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  let blocks: Block[] = [...document.blocks];
  let moved = 0;
  const ordered = orderIds(document.blocks, ids);
  if (!ordered) return null;
  for (const id of ordered) {
    const path = findPath(blocks, id)!;
    const block = blockAt(blocks, path)!;
    if (!isListItem(block)) return null;
    const index = path[path.length - 1]!;
    const previous = index > 0 ? blockAt(blocks, [...path.slice(0, -1), index - 1]) : undefined;
    if (!previous || !isListItem(previous)) continue;
    blocks = updateContainer(blocks, path.slice(0, -1), (children) => {
      children.splice(index - 1, 2, {
        ...previous,
        children: [...previous.children, block as Item],
      } as Block);
      return children;
    });
    moved += 1;
  }
  return moved > 0 ? editedDocument(blocks, context) : null;
}

/**
 * Unnests each list item of `ids` one level: a nested item follows its parent item and its
 * following siblings become its children; a top-level item becomes a paragraph, its nested items
 * following it (`uwg-te-req-blocks-1`).
 */
export function outdentItems(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  let blocks: Block[] = [...document.blocks];
  let moved = 0;
  const ordered = orderIds(document.blocks, ids);
  if (!ordered) return null;
  for (const id of ordered) {
    const path = findPath(blocks, id)!;
    const current = blockAt(blocks, path)!;
    if (!isListItem(current)) return null;
    if (path.length < 2) {
      const paragraph = convertBlock(current, 'paragraph', {}, context)!;
      blocks = placeInList(blocks, path, 'replace', [paragraph]);
      moved += 1;
      continue;
    }
    const parentPath = path.slice(0, -1);
    const index = path[path.length - 1]!;
    const parent = blockAt(blocks, parentPath) as Item;
    const item = parent.children[index]!;
    const lifted = {
      ...item,
      children: [...item.children, ...parent.children.slice(index + 1)],
    } as Item;
    const trimmed = { ...parent, children: parent.children.slice(0, index) } as Item;
    blocks = replaceAt(blocks, parentPath, [trimmed, lifted]);
    moved += 1;
  }
  return moved > 0 ? editedDocument(blocks, context) : null;
}

// Blocks placed inside a list (uwg-te-req-blocks-1)

interface ListEntry {
  readonly item: Item;
  /** The index of the parent entry, or -1 for the top-level item. */
  readonly parent: number;
}

/** A top-level list item and its nested items in document order, each with its parent. */
function flattenItem(item: Item): ListEntry[] {
  const entries: ListEntry[] = [];
  const visit = (current: Item, parent: number) => {
    const index = entries.length;
    entries.push({ item: current, parent });
    for (const child of current.children) visit(child, index);
  };
  visit(item, -1);
  return entries;
}

/** The items of `entries` in `chosen`, rebuilt: those whose parent is not chosen become roots. */
function rebuildItems(entries: readonly ListEntry[], chosen: ReadonlySet<number>): Item[] {
  const build = (index: number): Item =>
    ({
      ...entries[index]!.item,
      children: entries
        .map((entry, child) => ({ entry, child }))
        .filter(({ entry, child }) => entry.parent === index && chosen.has(child))
        .map(({ child }) => build(child)),
    }) as Item;
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry, index }) => chosen.has(index) && !chosen.has(entry.parent))
    .map(({ index }) => build(index));
}

/**
 * Places blocks other than list items before, in place of or after a list item, splitting the
 * outermost list there: the items before that place keep their structure, and each later item
 * whose parent item does not come after that place becomes a top-level item of the second list
 * with its own nested items (`uwg-te-req-blocks-1`).
 */
export function placeInList(
  blocks: readonly Block[],
  path: TextEditorBlockPath,
  mode: 'before' | 'replace' | 'after',
  placed: readonly TextEditorPortableDraftBlock[],
): Block[] {
  const top = path[0]!;
  const root = blocks[top];
  if (!root || !isListItem(root)) throw new Error('A list place lies outside a list item.');
  const entries = flattenItem(root);
  // The entry of the target: the path walks children from the top-level item.
  let target = 0;
  for (const index of path.slice(1)) {
    const children = entries
      .map((entry, child) => ({ entry, child }))
      .filter(({ entry }) => entry.parent === target);
    target = children[index]!.child;
  }
  let last = target;
  for (let index = target + 1; index < entries.length; index += 1) {
    let parent = entries[index]!.parent;
    while (parent > target) parent = entries[parent]!.parent;
    if (parent !== target) break;
    last = index;
  }
  const kept = new Set<number>();
  const later = new Set<number>();
  entries.forEach((_, index) => {
    if (mode === 'after' ? index <= last : index < target) kept.add(index);
    else if (mode !== 'replace' || index !== target) later.add(index);
  });
  return [
    ...blocks.slice(0, top),
    ...rebuildItems(entries, kept),
    ...(placed as Block[]),
    ...rebuildItems(entries, later),
    ...blocks.slice(top + 1),
  ];
}

/**
 * List items placed among the items of a list of another kind take that kind, a task item keeping
 * its checked state only in a task list (`uwg-te-req-blocks-1`).
 */
export function adoptListKind(children: Block[], index: number, count: number): void {
  const before = children[index - 1];
  const after = children[index + count];
  const neighbour =
    before && isListItem(before) ? before : after && isListItem(after) ? after : null;
  if (!neighbour) return;
  for (let position = index; position < index + count; position += 1) {
    const item = children[position]!;
    if (!isListItem(item) || item.type === neighbour.type) continue;
    const {
      start: _start,
      checked: _checked,
      ...rest
    } = item as Item & { start?: number; checked?: boolean };
    void _start;
    void _checked;
    children[position] = (
      neighbour.type === 'list-task'
        ? { ...rest, type: 'list-task', checked: false }
        : { ...rest, type: neighbour.type }
    ) as Block;
  }
}

// Tab with list items (uwg-te-req-parity-1, uwg-te-req-key-3)

/**
 * The list items that a selection touches, in document order: every list item from the block that
 * holds the anchor to the block that holds the head, both included, nested items included as they
 * come in document order (an item's nested items come after it, so a selection that ends in an
 * item's own text does not touch them). `anchor` and `head` are block identifiers outside tables;
 * empty when either is unknown.
 */
export function touchedItems(
  document: TextEditorPortableDocument,
  anchor: string,
  head: string,
): readonly string[] {
  return blocksBetween(document, anchor, head).flatMap(({ block }) =>
    isListItem(block) && block.id ? [block.id] : [],
  );
}

/** What Tab or Shift+Tab does with list items. */
export interface TextEditorListTab {
  /** The key is consumed: the widget does not move focus. */
  readonly consumed: true;
  /** The document after nesting or unnesting, or `null` when nothing changes. */
  readonly document: TextEditorPortableDocument | null;
}

/**
 * Tab (`outdent` false) or Shift+Tab (`outdent` true) with a text selection whose ends lie in the
 * blocks `anchor` and `head`, outside tables:
 * - When the selection touches list items (`touchedItems`), Tab nests every touched item that can
 *   nest (`indentItems`) and Shift+Tab unnests every touched item (`outdentItems`); the key is
 *   consumed, also when no touched item can nest while the head lies in a list item, which
 *   `uwg-te-req-parity-1` consumes without effect.
 * - `null` when the selection touches no list item, or touches some of which none can nest while
 *   the head lies outside list items: the key is not a list key. The adapter then applies the code
 *   keys in a code block and leaves Tab to the widget in a table; anywhere else the key is not
 *   consumed and focus leaves the editing root (`uwg-te-req-key-3`).
 * The selection is kept: identifiers and text points stay with their blocks. `null` also when
 * either block is unknown or is a table.
 */
export function listTab(
  document: TextEditorPortableDocument,
  anchor: string,
  head: string,
  outdent: boolean,
  context: TextEditorEditContext,
): TextEditorListTab | null {
  const anchorBlock = findBlock(document.blocks, anchor);
  const headBlock = findBlock(document.blocks, head);
  if (!anchorBlock || !headBlock || anchorBlock.type === 'table' || headBlock.type === 'table')
    return null;
  const ids = touchedItems(document, anchor, head);
  if (ids.length === 0) return null;
  const next = outdent ? outdentItems(document, ids, context) : indentItems(document, ids, context);
  if (next) return { consumed: true, document: next };
  return isListItem(headBlock) ? { consumed: true, document: null } : null;
}

// Block input rules (uwg-te-tab-input-rules r1–r7)

/** The document after a block input rule, with the selection it leaves. */
export interface TextEditorBlockRuleResult {
  readonly document: TextEditorPortableDocument;
  readonly selection: TextEditorSelectionInput;
}

/** The kind and attributes a block rule turns its paragraph into. */
function ruleKind(rule: TextEditorBlockRule): TextEditorSetTypeInput | null {
  switch (rule.kind) {
    case 'heading':
      return { kind: 'heading', attrs: { level: rule.level } };
    case 'list-ordered':
      return { kind: 'list-ordered', attrs: { start: rule.start } };
    case 'list-task':
      return { kind: 'list-task', attrs: { checked: rule.checked } };
    case 'code':
      return { kind: 'code', attrs: { language: rule.language } };
    case 'list-bullet':
    case 'quote':
      return { kind: rule.kind };
    default:
      return null;
  }
}

/**
 * Applies a block rule that `matchBlockRule` gave for the top-level paragraph `id`, whose first
 * `length` units are the typed pattern: the pattern goes and the paragraph turns into the rule's
 * kind keeping its identifier, alignment and the rest of its text, the caret at its start (a list
 * item joins a list of its kind that precedes or follows it). The divider rule, which completes in
 * an otherwise empty paragraph, turns the paragraph into a divider keeping the identifier and puts
 * the caret at the start of the textblock that follows it, or of a new empty paragraph after it
 * when no textblock follows. `null` when `id` is no top-level paragraph holding the pattern.
 */
export function applyBlockRule(
  document: TextEditorPortableDocument,
  id: string,
  length: number,
  rule: TextEditorBlockRule,
  context: TextEditorEditContext,
): TextEditorBlockRuleResult | null {
  const index = document.blocks.findIndex((block) => block.id === id);
  const paragraph = document.blocks[index];
  if (paragraph?.type !== 'paragraph' || inlineLength(paragraph.content) < length) return null;
  const rest = splitInline(paragraph.content, length)[1];
  if (rule.kind === 'divider') {
    if (rest.length > 0) return null;
    const following = document.blocks[index + 1];
    const next = following && isTextblock(following) ? following : null;
    const created = next
      ? null
      : ({ type: 'paragraph', id: context.createId(), content: [] } as Block);
    const blocks = [
      ...document.blocks.slice(0, index),
      { type: 'divider', id } as Block,
      ...(created ? [created] : []),
      ...document.blocks.slice(index + 1),
    ];
    return {
      document: editedDocument(blocks, context),
      selection: { kind: 'caret', block: (next ?? created)!.id!, position: 'start' },
    };
  }
  const input = ruleKind(rule);
  if (!input) return null;
  const trimmed = replaceAt(document.blocks, [index], [{ ...paragraph, content: rest }]);
  const converted = setBlockType({ blocks: trimmed }, [id], input, context);
  return converted
    ? { document: converted, selection: { kind: 'caret', block: id, position: 'start' } }
    : null;
}
