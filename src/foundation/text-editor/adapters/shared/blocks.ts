/**
 * The portable block tree of every engine adapter (Widgets `uwg-te-tab-engine` r7,
 * `uwg-te-req-blocks-1`, `uwg-te-tab-content-model`).
 *
 * Pure reads of a canonical portable document, so that every engine reports the same blocks: one
 * block per list item, never a list container, a cell paragraph or an engine wrapper item; the
 * kind and attributes of each block; which blocks are textblocks and what inline content they
 * hold; the paths and the document order that the edits walk. A textblock is every block but an
 * atom or a table, a code block included, whose text reads as text and hard breaks. The caller
 * memoizes a tree per document and content version.
 */
import {
  isAtomOrTable,
  isListItem,
  tableGrid,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableInline,
} from '../../content/portable.js';
import type {
  TextEditorBlock,
  TextEditorBlockAttributes,
  TextEditorBlockKind,
  TextEditorBlockTree,
} from '../../model.js';
import { blockInline, inlineUnitLength } from '../../content/edges.js';

export { blockInline, inlineLength } from '../../content/edges.js';

type Block = TextEditorPortableBlock;
type Inline = TextEditorPortableInline;

// Kinds and attributes

/** The kind and attributes of a block. */
export interface TextEditorBlockModel {
  readonly kind: TextEditorBlockKind;
  readonly attrs: TextEditorBlockAttributes;
}

/** The kind and attributes of a portable block, as the block tree and the state report them. */
export function blockModel(block: Block): TextEditorBlockModel {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
    case 'list-bullet':
      return { kind: block.type, attrs: { align: block.align ?? null } };
    case 'heading':
      return { kind: 'heading', attrs: { level: block.level, align: block.align ?? null } };
    case 'code':
      return { kind: 'code', attrs: { language: block.language ?? null } };
    case 'list-ordered':
      return { kind: block.type, attrs: { align: block.align ?? null, start: block.start ?? 1 } };
    case 'list-task':
      return { kind: block.type, attrs: { align: block.align ?? null, checked: block.checked } };
    case 'divider':
      return { kind: 'divider', attrs: {} };
    case 'image':
      return {
        kind: 'image',
        attrs: { src: block.src, alt: block.alt, width: block.width ?? null },
      };
    case 'table': {
      const { rows, columns } = tableGrid(block);
      const { headerRow, headerColumn } = block;
      return { kind: 'table', attrs: { rows, columns, headerRow, headerColumn } };
    }
    case 'custom':
      return { kind: block.name, attrs: block.attrs };
  }
}

// Textblocks and their inline content

/**
 * Whether a block is a textblock, which holds text and the caret: a paragraph, heading, quote,
 * code block, list item or custom textblock; never a divider, image, table or custom atom.
 */
export const isTextblock = (block: Block): boolean => !isAtomOrTable(block);

/**
 * The document with the empty paragraph that every engine keeps after a final atom block or table
 * (`uwg-te-req-blocks-1`), which the formats omit; `createId` gives its identifier.
 */
export function withTrailingParagraph(
  document: TextEditorPortableDocument,
  createId: () => string,
): TextEditorPortableDocument {
  const last = document.blocks[document.blocks.length - 1];
  if (!last || !isAtomOrTable(last)) return document;
  return { blocks: [...document.blocks, { type: 'paragraph', id: createId(), content: [] }] };
}

/** Whether a block holds text and the caret, and whether it is empty. */
export interface TextEditorTextblockState {
  /** A textblock, a code block included (`isTextblock`). */
  readonly textblock: boolean;
  /** A textblock without text, hard break or inline node; never an atom or a table. */
  readonly empty: boolean;
}

/** Whether a portable block is a textblock, and whether that textblock is empty. */
export function textblockState(block: Block): TextEditorTextblockState {
  const inline = blockInline(block);
  return inline === null
    ? { textblock: false, empty: false }
    : { textblock: true, empty: inline.length === 0 };
}

/** Inline content split at an offset in text-point units. */
export function splitInline(content: readonly Inline[], offset: number): [Inline[], Inline[]] {
  const before: Inline[] = [];
  const after: Inline[] = [];
  let position = 0;
  for (const node of content) {
    const length = inlineUnitLength(node);
    if (position + length <= offset) before.push(node);
    else if (position >= offset || node.type !== 'text') after.push(node);
    else {
      const cut = offset - position;
      before.push({ ...node, text: node.text.slice(0, cut) });
      after.push({ ...node, text: node.text.slice(cut) });
    }
    position += length;
  }
  return [before, after];
}

/** A text point in a textblock outside tables: an offset in its `blockInline` content. */
export interface TextEditorBlockTextPoint {
  readonly block: string;
  readonly offset: number;
}

// Paths and document order

/** The indices from the top level down through list items' children to a block. */
export type TextEditorBlockPath = readonly number[];

/** The path of the block with an identifier, or `null`. */
export function findPath(blocks: readonly Block[], id: string): TextEditorBlockPath | null {
  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index]!;
    if (block.id === id) return [index];
    if (isListItem(block)) {
      const inner = findPath(block.children, id);
      if (inner) return [index, ...inner];
    }
  }
  return null;
}

/** The block at a path, or `undefined`. */
export function blockAt(blocks: readonly Block[], path: TextEditorBlockPath): Block | undefined {
  let list: readonly Block[] = blocks;
  let block: Block | undefined;
  for (const index of path) {
    block = list[index];
    if (!block) return undefined;
    list = isListItem(block) ? block.children : [];
  }
  return block;
}

/** The block with an identifier at any depth, or `undefined`. */
export function findBlock(blocks: readonly Block[], id: string): Block | undefined {
  const path = findPath(blocks, id);
  return path ? blockAt(blocks, path) : undefined;
}

/** Orders two paths in document order: an item before its nested items. */
export function comparePaths(a: TextEditorBlockPath, b: TextEditorBlockPath): number {
  for (let index = 0; index < Math.min(a.length, b.length); index += 1)
    if (a[index] !== b[index]) return a[index]! - b[index]!;
  return a.length - b.length;
}

/** Whether a path lies inside the subtree of another. */
export const isAncestorPath = (ancestor: TextEditorBlockPath, path: TextEditorBlockPath): boolean =>
  ancestor.length < path.length && ancestor.every((value, index) => path[index] === value);

/** A portable block at its place: its path, its parent list item, its depth and its index there. */
export interface TextEditorLocatedBlock {
  readonly block: Block;
  /** The indices from the top level down to the block. */
  readonly path: TextEditorBlockPath;
  /** The identifier of the parent list item, or `null` at the top level. */
  readonly parentId: string | null;
  /** Zero-based nesting depth. */
  readonly depth: number;
  /** The position among the parent's children, or among the top-level blocks. */
  readonly index: number;
}

function locate(
  blocks: readonly Block[],
  parent: TextEditorBlockPath,
  parentId: string | null,
): TextEditorLocatedBlock[] {
  return blocks.flatMap((block, index) => {
    const path = [...parent, index];
    const here: TextEditorLocatedBlock = {
      block,
      path,
      parentId,
      depth: parent.length,
      index,
    };
    return isListItem(block) ? [here, ...locate(block.children, path, block.id ?? null)] : [here];
  });
}

/** Every block of `blocks` in document order, each list item before its nested items. */
export function locatedBlocks(blocks: readonly Block[]): TextEditorLocatedBlock[] {
  return locate(blocks, [], null);
}

// The block tree

/**
 * The frozen block tree of a canonical portable document at a content version. Pure: each call
 * builds a new tree and leaves the document as it is; the caller keeps one per revision.
 */
export function blockTree(
  document: TextEditorPortableDocument,
  version: number,
): TextEditorBlockTree {
  const entries = locatedBlocks(document.blocks).map(
    ({ block, parentId, depth, index }): TextEditorBlock => {
      const { kind, attrs } = blockModel(block);
      const { textblock, empty } = textblockState(block);
      return Object.freeze({
        id: block.id ?? '',
        kind,
        attrs: Object.freeze({ ...attrs }),
        parentId,
        depth,
        index,
        children: Object.freeze(
          isListItem(block) ? block.children.map((child) => child.id ?? '') : [],
        ),
        empty,
        textblock,
      });
    },
  );
  const byId = new Map(entries.map((entry) => [entry.id, entry]));
  const ordered = Object.freeze(entries);
  return Object.freeze({
    version,
    roots: Object.freeze(document.blocks.map((block) => block.id ?? '')),
    get: (id: string) => byId.get(id),
    ordered: () => ordered,
  });
}
