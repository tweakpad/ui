/**
 * `content.insert` over the portable model (Widgets `uwg-te-tab-actions` r5,
 * `uwg-te-req-content-6`, `uwg-te-req-content-7`).
 *
 * Pure functions that insert a portable fragment at a text point or after a block selection, and
 * turn blocks into the paragraphs of a table cell. Every fragment first passes the URL policy and
 * is converted to what the mount represents, as a load is, and its blocks take fresh identifiers.
 * Each adapter applies the result in one engine transaction or update and reports the diagnostics
 * once the insertion applied. Every function answers `null` when the insertion cannot apply.
 */
import {
  canonicalize,
  convertedDiagnostic,
  convertUnsupported,
  inlineText,
  isListItem,
  textToInline,
  type TextEditorPortableBlock,
  type TextEditorPortableCellParagraph,
  type TextEditorPortableDocument,
  type TextEditorPortableDraftBlock,
  type TextEditorPortableFragment,
} from '../../content/portable.js';
import type { TextEditorSelectionInput } from '../../model.js';
import type { TextEditorCapability } from '../../capabilities.js';
import type { TextEditorDiagnostic } from '../../engine.js';
import { applyTextEditorUrlPolicy } from './content.js';
import {
  editedDocument,
  replaceAt,
  withInline,
  type TextEditorEditContext,
} from './block-edits.js';
import {
  blockAt,
  blockInline,
  findBlock,
  findPath,
  inlineLength,
  splitInline,
  type TextEditorBlockTextPoint,
} from './blocks.js';
import {
  copyBlock,
  deleteBlocks,
  insertAfterBlock,
  isReplaceable,
  selectionAfterBlock,
} from './structure-edits.js';

type Block = TextEditorPortableBlock;

/** What inserting a fragment needs besides an edit: what the mount can represent. */
export interface TextEditorFragmentContext extends TextEditorEditContext {
  /** The engine's capabilities with the mount's node capabilities (the content glue's set). */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
}

/** A fragment ready to insert: under the URL policy and converted to what the mount represents. */
export interface TextEditorPreparedFragment {
  readonly kind: TextEditorPortableFragment['kind'];
  readonly blocks: readonly Block[];
  /** At most one `text-editor-content-converted`, reported once the insertion applied. */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

export interface TextEditorFragmentInsert {
  readonly document: TextEditorPortableDocument;
  /** The caret after the inserted content, for a fragment that ends in text. */
  readonly caret: TextEditorBlockTextPoint;
  /** The selection after the insertion: the caret, or what `selectionAfterBlock` gives. */
  readonly selection: TextEditorSelectionInput;
  /** As `TextEditorPreparedFragment.diagnostics`. */
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

const NO_DIAGNOSTICS: readonly TextEditorDiagnostic[] = Object.freeze([]);

/**
 * A fragment under the URL policy, with the kinds the mount cannot represent converted, as a load
 * applies both (`readTextEditorContent`): a link or image that fails the policy goes, then a block
 * or inline node without its capability becomes text, giving one converted diagnostic.
 */
export function prepareFragment(
  fragment: TextEditorPortableFragment,
  context: TextEditorFragmentContext,
): TextEditorPreparedFragment {
  if (fragment.blocks.length === 0)
    return { kind: fragment.kind, blocks: [], diagnostics: NO_DIAGNOSTICS };
  const allowed = applyTextEditorUrlPolicy({ blocks: fragment.blocks }, context);
  const { document, converted } = convertUnsupported(allowed, {
    capabilities: context.capabilities,
    nodes: context.nodes,
  });
  const diagnostic = convertedDiagnostic(converted);
  return {
    kind: fragment.kind,
    blocks: document.blocks,
    diagnostics: diagnostic ? Object.freeze([diagnostic]) : NO_DIAGNOSTICS,
  };
}

/** Fragment blocks with fresh identifiers. */
const freshBlocks = (blocks: readonly Block[], context: TextEditorEditContext): Block[] =>
  blocks.map((block) => copyBlock(block, context));

/** Inline content of a fragment block that merges into text, or `null` for one that does not. */
const mergingInline = (block: Block) => (block.type === 'code' ? null : blockInline(block));

/**
 * Inserts a fragment at a text point of a block outside tables, after `prepareFragment`. A
 * text-range fragment merges its first and last paragraphs into the text around the point; whole
 * blocks follow the block, or replace it when it is an empty paragraph or list item. A code block
 * takes the fragment's text. Of a block split by a range of several paragraphs, the part holding
 * the block's first character keeps its identifier (`uwg-te-req-content-7`): the tail when the
 * point is at the start of a non-empty block, else the head part; the other part gets a new one.
 */
export function insertFragmentAtPoint(
  document: TextEditorPortableDocument,
  point: TextEditorBlockTextPoint,
  fragment: TextEditorPortableFragment,
  context: TextEditorFragmentContext,
): TextEditorFragmentInsert | null {
  const path = findPath(document.blocks, point.block);
  if (!path) return null;
  const target = blockAt(document.blocks, path)!;
  const content = blockInline(target);
  if (content === null) return null;
  if (point.offset > inlineLength(content)) return null;
  const prepared = prepareFragment(fragment, context);
  const blocks = freshBlocks(prepared.blocks, context);
  if (blocks.length === 0) return null;
  const { diagnostics } = prepared;
  const atText = (next: TextEditorPortableDocument, caret: TextEditorBlockTextPoint) => ({
    document: next,
    caret,
    selection: { kind: 'text' as const, anchor: caret },
    diagnostics,
  });
  const [head, tail] = splitInline(content, point.offset);
  if (target.type === 'code') {
    const text = blocks
      .map((block) =>
        block.type === 'code' ? block.text : inlineText(blockInline(block) ?? [], context.nodes),
      )
      .join('\n');
    const inserted = textToInline(text);
    const next = withInline(target, [...head, ...inserted, ...tail], context.nodes);
    return atText(editedDocument(replaceAt(document.blocks, path, [next]), context), {
      block: point.block,
      offset: point.offset + text.length,
    });
  }
  const first = blocks[0]!;
  const last = blocks[blocks.length - 1]!;
  const firstInline = fragment.kind === 'range' ? mergingInline(first) : null;
  const lastInline = fragment.kind === 'range' && blocks.length > 1 ? mergingInline(last) : null;
  if (fragment.kind === 'range' && blocks.length === 1 && firstInline) {
    const next = withInline(target, [...head, ...firstInline, ...tail], context.nodes);
    return atText(editedDocument(replaceAt(document.blocks, path, [next]), context), {
      block: point.block,
      offset: point.offset + inlineLength(firstInline),
    });
  }
  if (fragment.kind === 'blocks') {
    const next = isReplaceable(target)
      ? editedDocument(replaceAt(document.blocks, path, blocks), context)
      : insertAfterBlock(document, point.block, blocks, context);
    if (!next) return null;
    const selection = selectionAfterBlock(next, last.id!);
    if (!selection) return null;
    return { document: next, caret: endCaret(next, last), selection, diagnostics };
  }
  // A text range of several blocks: head + first, middle blocks, last + tail.
  const middle = blocks.slice(firstInline ? 1 : 0, lastInline ? -1 : undefined);
  const freshId = context.createId();
  const tailKeeps = head.length === 0 && tail.length > 0;
  const headBlock = {
    ...withInline(target, [...head, ...(firstInline ?? [])], context.nodes),
    ...(tailKeeps ? { id: freshId } : {}),
  } as Block;
  const tailId = tailKeeps ? target.id! : freshId;
  const tailBlock = {
    ...withInline(target, [...(lastInline ?? []), ...tail], context.nodes),
    id: tailId,
    ...(isListItem(target) ? { children: target.children } : {}),
  } as Block;
  const headWithoutChildren = (
    isListItem(headBlock) ? { ...headBlock, children: [] } : headBlock
  ) as Block;
  const replacement: TextEditorPortableDraftBlock[] = [headWithoutChildren, ...middle, tailBlock];
  const next = editedDocument(replaceAt(document.blocks, path, replacement as Block[]), context);
  return atText(next, { block: tailId, offset: lastInline ? inlineLength(lastInline) : 0 });
}

/** The caret at the end of an inserted block's text, or at its start without text. */
function endCaret(document: TextEditorPortableDocument, block: Block): TextEditorBlockTextPoint {
  const found = block.id ? findBlock(document.blocks, block.id) : undefined;
  const content = found ? blockInline(found) : null;
  if (found?.id && content) return { block: found.id, offset: inlineLength(content) };
  return { block: found?.id ?? block.id ?? '', offset: 0 };
}

/** The result of a fragment inserted over a block selection. */
export interface TextEditorFragmentOverBlocks {
  readonly document: TextEditorPortableDocument;
  readonly selection: TextEditorSelectionInput;
  readonly diagnostics: readonly TextEditorDiagnostic[];
}

/**
 * `content.insert` over a block selection: the prepared fragment's blocks, with fresh identifiers,
 * replace the selected blocks, each list item with its nested items, as a text range is replaced
 * (a paste in block mode, `uwg-te-tab-keymap-host`); the selection goes where
 * `selectionAfterBlock` puts it after the fragment's last block.
 */
export function replaceBlocksWithFragment(
  document: TextEditorPortableDocument,
  ids: readonly string[],
  fragment: TextEditorPortableFragment,
  context: TextEditorFragmentContext,
): TextEditorFragmentOverBlocks | null {
  const target = ids[ids.length - 1];
  if (target === undefined) return null;
  const prepared = prepareFragment(fragment, context);
  const blocks = freshBlocks(prepared.blocks, context);
  const last = blocks[blocks.length - 1];
  if (!last) return null;
  const inserted = insertAfterBlock(document, target, blocks, context);
  const next = inserted ? deleteBlocks(inserted, ids, context)?.document : null;
  const selection = next ? selectionAfterBlock(next, last.id!) : null;
  return next && selection
    ? { document: next, selection, diagnostics: prepared.diagnostics }
    : null;
}

/** The cell paragraphs that blocks become when they enter a table cell (`uwg-te-req-content-6`). */
export function cellParagraphs(
  blocks: readonly TextEditorPortableDraftBlock[],
  context: TextEditorEditContext,
): readonly TextEditorPortableCellParagraph[] {
  const table = canonicalize(
    {
      blocks: [
        { type: 'table', headerRow: false, headerColumn: false, rows: [{ cells: [{ blocks }] }] },
      ],
    },
    { nodes: context.nodes, createId: context.createId },
  ).document.blocks[0];
  if (table?.type !== 'table') return [{ content: [] }];
  return table.rows[0]?.cells[0]?.paragraphs ?? [{ content: [] }];
}
