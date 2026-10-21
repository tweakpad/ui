/**
 * Structure edits over the portable model: the `blocks.*` actions (Widgets `uwg-te-tab-actions`
 * r3, `uwg-te-req-blocks-1`, `uwg-te-req-blocks-4`, `uwg-te-req-content-7`).
 *
 * Pure functions that insert, replace, move, duplicate and delete blocks and build new ones, and
 * the selection each leaves, which every adapter applies in one engine transaction or update. A
 * list item moves with its nested items, and blocks other than list items never land under a list
 * item: placed next to a nested item, they split its list. Copies and new blocks take identifiers
 * from `createId`. Every function answers `null` when its action cannot apply.
 */
import {
  isListItem,
  nodeLookup,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
  type TextEditorPortableListItem,
} from '../../content/portable.js';
import type {
  TextEditorAttributes,
  TextEditorBlockKind,
  TextEditorCaretSelectionInput,
  TextEditorHeadingLevel,
  TextEditorSelectionInput,
} from '../../model.js';
import {
  storedAlign,
  type TextEditorBlockSlot,
  type TextEditorInsertSelection,
} from '../../actions.js';
import { allowedUrl, imageProtocols } from '../../../markdown/url.js';
import {
  adoptListKind,
  editedDocument,
  placeInList,
  replaceAt,
  topmost,
  updateContainer,
  type TextEditorEditContext,
} from './block-edits.js';
import {
  blockAt,
  findBlock,
  findPath,
  isAncestorPath,
  isTextblock,
  locatedBlocks,
  type TextEditorBlockPath,
} from './blocks.js';
import { edgeCell, tableModel } from './tables.js';

type Block = TextEditorPortableBlock;
type Item = TextEditorPortableListItem;
type Inline = TextEditorPortableInline;

// Insertion and replacement

/** The slot at a block's place (`offset` 0) or right after it (`offset` 1). */
function slotOf(
  document: TextEditorPortableDocument,
  path: TextEditorBlockPath,
  offset: number,
): TextEditorBlockSlot {
  const parentPath = path.slice(0, -1);
  const parent = parentPath.length > 0 ? blockAt(document.blocks, parentPath) : undefined;
  return { parent: parent?.id ?? null, index: path[path.length - 1]! + offset };
}

/** Inserts blocks after a block: inside a list, blocks other than list items split it. */
export function insertAfterBlock(
  document: TextEditorPortableDocument,
  id: string,
  inserted: readonly Block[],
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  const path = findPath(document.blocks, id);
  if (!path) return null;
  if (path.length > 1 && !inserted.every(isListItem))
    return editedDocument(placeInList(document.blocks, path, 'after', inserted), context);
  return insertBlocks(document, slotOf(document, path, 1), inserted, context);
}

/** Inserts blocks before a block: inside a list, blocks other than list items split it. */
export function insertBeforeBlock(
  document: TextEditorPortableDocument,
  id: string,
  inserted: readonly Block[],
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  const path = findPath(document.blocks, id);
  if (!path) return null;
  if (path.length > 1 && !inserted.every(isListItem))
    return editedDocument(placeInList(document.blocks, path, 'before', inserted), context);
  return insertBlocks(document, slotOf(document, path, 0), inserted, context);
}

/** Inserts blocks at a slot; a non-item block cannot go under a list item. */
export function insertBlocks(
  document: TextEditorPortableDocument,
  slot: TextEditorBlockSlot,
  inserted: readonly Block[],
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  const parentPath = slot.parent === null ? [] : findPath(document.blocks, slot.parent);
  if (!parentPath) return null;
  if (slot.parent !== null) {
    if (!isListItem(blockAt(document.blocks, parentPath)!)) return null;
    if (!inserted.every(isListItem)) return null;
  }
  let failed = false;
  const blocks = updateContainer(document.blocks, parentPath, (children) => {
    if (slot.index < 0 || slot.index > children.length) failed = true;
    else {
      children.splice(slot.index, 0, ...inserted);
      adoptListKind(children, slot.index, inserted.length);
    }
    return children;
  });
  return failed ? null : editedDocument(blocks, context);
}

/**
 * `blocks.insert` with `replace`, and an inserted block replacing the empty paragraph or list item
 * at its point: blocks take the place of the block `id`. A replaced list item's nested items are
 * never dropped:
 * - when the last replacing block is a list item, it adopts them as its own nested items, after
 *   any it has;
 * - otherwise they stay at their depth under the list item right before them, else move up a
 *   level, as `deleteRange` lifts nested items; as a block other than a list item in the place of
 *   a list item splits the outermost list there (`placeInList` `'replace'`, `uwg-te-req-blocks-1`),
 *   the block right before them is the replacing block, so they become top-level items of the
 *   second list with their own nested items.
 * No block other than a list item ever lands under a list item; list items replacing a list item,
 * and blocks replacing any other block, take its place. `null` for an unknown `id` or no blocks.
 */
export function replaceInPlace(
  document: TextEditorPortableDocument,
  id: string,
  blocks: readonly Block[],
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  const path = findPath(document.blocks, id);
  if (!path || blocks.length === 0) return null;
  const target = blockAt(document.blocks, path)!;
  if (!isListItem(target)) return editedDocument(replaceAt(document.blocks, path, blocks), context);
  const last = blocks[blocks.length - 1]!;
  const adopts = target.children.length > 0 && isListItem(last);
  const placed = adopts
    ? [
        ...blocks.slice(0, -1),
        { ...last, children: [...last.children, ...target.children] } as Block,
      ]
    : blocks;
  if (placed.every(isListItem))
    return editedDocument(replaceAt(document.blocks, path, placed), context);
  // The adopted nested items leave the replaced item first, so the split does not keep them too.
  const source = adopts
    ? replaceAt(document.blocks, path, [{ ...target, children: [] }])
    : document.blocks;
  return editedDocument(placeInList(source, path, 'replace', placed), context);
}

/** Where a block that a tool inserts goes: in place of a block, or after it. */
export type TextEditorInsertionPlace = { readonly replace: string } | { readonly after: string };

/**
 * Where a block that a tool inserts goes from the block holding its point of insertion
 * (`uwg-te-req-blocks-1`): in place of that block when it is an empty paragraph or an empty list
 * item (`isReplaceable`), else after it, a list item together with its nested items. With no point,
 * as with no selection, the point is the end of the document, which lies in its last block in
 * document order, a nested list item included. `null` for an unknown block, or a document whose
 * last block has no identifier.
 */
export function placeAtPoint(
  document: TextEditorPortableDocument,
  id: string | null,
): TextEditorInsertionPlace | null {
  const block =
    id === null ? locatedBlocks(document.blocks).at(-1)?.block : findBlock(document.blocks, id);
  if (!block?.id) return null;
  return isReplaceable(block) ? { replace: block.id } : { after: block.id };
}

/** The slot after the top-level block that holds a block. */
export function topLevelSlotAfter(
  document: TextEditorPortableDocument,
  id: string,
): TextEditorBlockSlot | null {
  const path = findPath(document.blocks, id);
  return path ? { parent: null, index: path[0]! + 1 } : null;
}

// blocks.move, blocks.duplicate and blocks.delete

/**
 * Moves blocks, each list item with its nested items, to a slot whose index counts the parent's
 * children without the moved blocks. Only list items nest; no block moves into its own subtree.
 */
export function moveBlocks(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  slot: TextEditorBlockSlot,
  context: TextEditorEditContext,
): TextEditorPortableDocument | null {
  const moving = topmost(document.blocks, ids);
  if (!moving || moving.length === 0) return null;
  const movingIds = new Set(moving.map(({ id }) => id));
  if (slot.parent !== null) {
    if (movingIds.has(slot.parent)) return null;
    const parentPath = findPath(document.blocks, slot.parent);
    if (!parentPath) return null;
    if (moving.some(({ path }) => isAncestorPath(path, parentPath))) return null;
    if (!isListItem(blockAt(document.blocks, parentPath)!)) return null;
  }
  const moved = moving.map(({ path }) => blockAt(document.blocks, path)!);
  if (slot.parent !== null && !moved.every(isListItem)) return null;
  // Remove from the last to the first, so earlier paths stay valid.
  let blocks: Block[] = [...document.blocks];
  for (const { path } of [...moving].reverse()) blocks = replaceAt(blocks, path, []);
  const parentPath = slot.parent === null ? [] : findPath(blocks, slot.parent);
  if (!parentPath) return null;
  let failed = false;
  blocks = updateContainer(blocks, parentPath, (children) => {
    if (slot.index < 0 || slot.index > children.length) failed = true;
    else {
      children.splice(slot.index, 0, ...moved);
      adoptListKind(children, slot.index, moved.length);
    }
    return children;
  });
  return failed ? null : editedDocument(blocks, context);
}

/** A deep copy of a block with fresh identifiers, nested items included. */
export function copyBlock(block: Block, context: TextEditorEditContext): Block {
  const id = context.createId();
  if (isListItem(block))
    return {
      ...block,
      id,
      children: block.children.map((child) => copyBlock(child, context) as Item),
    };
  return { ...block, id } as Block;
}

export interface TextEditorDuplicateResult {
  readonly document: TextEditorPortableDocument;
  /** The identifiers of the copies of the given blocks, in document order. */
  readonly copies: readonly string[];
}

/**
 * Inserts copies of blocks after the last of them, with fresh identifiers; copies other than list
 * items after a nested item split its list.
 */
export function duplicateBlocks(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  context: TextEditorEditContext,
): TextEditorDuplicateResult | null {
  const copying = topmost(document.blocks, ids);
  if (!copying || copying.length === 0) return null;
  const copies = copying.map(({ path }) => copyBlock(blockAt(document.blocks, path)!, context));
  const last = copying[copying.length - 1]!;
  const next = insertAfterBlock(document, last.id, copies, context);
  return next ? { document: next, copies: copies.map((copy) => copy.id!) } : null;
}

/** Where the caret goes after a deletion: a textblock's end, or else a textblock's start. */
export interface TextEditorCaretTarget {
  readonly block: string;
  readonly position: 'start' | 'end';
}

export interface TextEditorDeleteResult {
  readonly document: TextEditorPortableDocument;
  readonly caret: TextEditorCaretTarget | null;
}

/**
 * Deletes blocks, each list item with its nested items; the caret goes to the end of the nearest
 * textblock or table before them, or else the start of the nearest one after them, or else to the
 * one empty paragraph left (`uwg-te-req-blocks-4`).
 */
export function deleteBlocks(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  context: TextEditorEditContext,
): TextEditorDeleteResult | null {
  const deleting = topmost(document.blocks, ids);
  if (!deleting || deleting.length === 0) return null;
  const removed = new Set<string>();
  for (const { path } of deleting)
    for (const { block } of locatedBlocks([blockAt(document.blocks, path)!]))
      if (block.id) removed.add(block.id);
  const order = locatedBlocks(document.blocks);
  const first = order.findIndex(({ block }) => block.id !== undefined && removed.has(block.id));
  const holdsCaret = ({ block }: { block: Block }) =>
    !removed.has(block.id ?? '') && (isTextblock(block) || block.type === 'table');
  const before = order.slice(0, first).reverse().find(holdsCaret);
  const after = order.slice(first).find(holdsCaret);
  let blocks: Block[] = [...document.blocks];
  for (const { path } of [...deleting].reverse()) blocks = replaceAt(blocks, path, []);
  const next = editedDocument(blocks, context);
  const caret: TextEditorCaretTarget | null = before?.block.id
    ? { block: before.block.id, position: 'end' }
    : after?.block.id
      ? { block: after.block.id, position: 'start' }
      : next.blocks[0]?.id
        ? { block: next.blocks[0].id, position: 'start' }
        : null;
  return { document: next, caret };
}

// New blocks (uwg-te-tab-actions r3)

/** A new empty block of a kind with its attributes, or `null` for missing required attributes. */
export function newBlock(
  kind: TextEditorBlockKind,
  attrs: TextEditorAttributes,
  context: TextEditorEditContext,
): Block | null {
  const id = context.createId();
  const stored = storedAlign(attrs['align']);
  const align = stored ? { align: stored } : {};
  switch (kind) {
    case 'paragraph':
      return { type: 'paragraph', id, ...align, content: [] };
    case 'quote':
      return { type: 'quote', id, ...align, content: [] };
    case 'heading':
      return typeof attrs['level'] === 'number'
        ? {
            type: 'heading',
            id,
            level: attrs['level'] as TextEditorHeadingLevel,
            ...align,
            content: [],
          }
        : null;
    case 'code':
      return {
        type: 'code',
        id,
        ...(typeof attrs['language'] === 'string' && attrs['language'] !== ''
          ? { language: attrs['language'] }
          : {}),
        text: '',
      };
    case 'list-bullet':
      return { type: 'list-bullet', id, ...align, content: [], children: [] };
    case 'list-ordered':
      return {
        type: 'list-ordered',
        id,
        ...align,
        ...(typeof attrs['start'] === 'number' ? { start: attrs['start'] } : {}),
        content: [],
        children: [],
      };
    case 'list-task':
      return {
        type: 'list-task',
        id,
        ...align,
        checked: attrs['checked'] === true,
        content: [],
        children: [],
      };
    case 'divider':
      return { type: 'divider', id };
    case 'image':
      return typeof attrs['src'] === 'string' &&
        attrs['src'] !== '' &&
        allowedUrl(attrs['src'], imageProtocols(context.urls))
        ? {
            type: 'image',
            id,
            src: attrs['src'],
            alt: typeof attrs['alt'] === 'string' ? attrs['alt'] : '',
            ...(typeof attrs['width'] === 'number' ? { width: attrs['width'] } : {}),
          }
        : null;
    case 'table': {
      const rows = attrs['rows'];
      const columns = attrs['columns'];
      if (typeof rows !== 'number' || typeof columns !== 'number' || rows < 1 || columns < 1)
        return null;
      return {
        type: 'table',
        id,
        headerRow: attrs['headerRow'] !== false,
        headerColumn: attrs['headerColumn'] === true,
        rows: Array.from({ length: rows }, () => ({
          cells: Array.from({ length: columns }, () => ({ paragraphs: [{ content: [] }] })),
        })),
      };
    }
    default: {
      const definition = nodeLookup(context.nodes).blocks.get(kind);
      if (!definition) return null;
      return {
        type: 'custom',
        id,
        name: kind,
        attrs: { ...attrs },
        ...(definition.content === 'inline' ? { content: [] } : {}),
      };
    }
  }
}

/** Whether a block is an empty paragraph or an empty list item, which an inserted block replaces. */
export const isReplaceable = (block: Block): boolean =>
  (block.type === 'paragraph' || isListItem(block)) &&
  (block as { content: readonly Inline[] }).content.length === 0 &&
  !(isListItem(block) && block.children.length > 0);

// The selection after a structure edit

/**
 * A caret at the start or end of a block's text, or of a table's first cell or the end of its last
 * cell in document order (`edgeCell`); `null` for an atom.
 */
function caretAt(block: Block, position: 'start' | 'end'): TextEditorCaretSelectionInput | null {
  if (!block.id) return null;
  if (block.type === 'table') {
    const cell = edgeCell(tableModel(block.id, block), position);
    return cell
      ? { kind: 'caret', block: block.id, cell: { row: cell.row, column: cell.column }, position }
      : null;
  }
  return isTextblock(block) ? { kind: 'caret', block: block.id, position } : null;
}

/**
 * A caret at the start or the end of the block `id`: of a textblock's text; of a table, at the
 * start of cell (0,0) or at the end of its last cell, the last of its cells in document order
 * (`edgeCell`), whatever their spans. `null` for an atom or an unknown `id`. The caret of
 * `deleteBlocks`' target, of `blocks.insert` and of the start and end of the document.
 */
export function caretSelection(
  document: TextEditorPortableDocument,
  id: string,
  position: 'start' | 'end',
): TextEditorCaretSelectionInput | null {
  const block = findBlock(document.blocks, id);
  return block ? caretAt(block, position) : null;
}

/**
 * The selection after blocks were inserted that end with the block `id`: an atom is
 * block-selected; a table gets a caret at the start of cell (0,0) for `start` or at the end of
 * its last cell for `end` (`caretSelection`); a textblock a caret at its start or end. `select`
 * defaults to `end`, the selection after a pasted fragment. `null` for an unknown `id`.
 */
export function selectionAfterBlock(
  document: TextEditorPortableDocument,
  id: string,
  select: 'start' | 'end' = 'end',
): TextEditorSelectionInput | null {
  const block = findBlock(document.blocks, id);
  if (!block) return null;
  return caretAt(block, select) ?? { kind: 'blocks', ids: [id] };
}

/**
 * The selection after `blocks.insert` of the block `id` (`uwg-te-tab-actions` r3): `none` keeps
 * the selection (`'keep'`); `block` block-selects the new block; otherwise an atom is
 * block-selected whatever `select` says, and a table or a textblock gets the caret of
 * `selectionAfterBlock` with `select`, `start` when absent (a table at cell (0,0)). `null` for an
 * unknown `id`.
 */
export function selectionAfterInsert(
  document: TextEditorPortableDocument,
  id: string,
  select: TextEditorInsertSelection | undefined,
): TextEditorSelectionInput | 'keep' | null {
  if (!findBlock(document.blocks, id)) return null;
  switch (select) {
    case 'none':
      return 'keep';
    case 'block':
      return { kind: 'blocks', ids: [id] };
    default:
      return selectionAfterBlock(document, id, select ?? 'start');
  }
}
