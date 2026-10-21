/**
 * Block actions of the Tiptap adapter (Widgets `uwg-te-tab-actions` r2 and r3,
 * `uwg-te-req-blocks-1`, `uwg-te-req-blocks-4`, `uwg-te-req-blocks-5`, `uwg-te-req-content-7`).
 *
 * Every block action computes the next portable document with the shared block edits, which
 * both engines apply alike (list placement and splitting, list-kind adoption, nesting, insertion,
 * moves, duplicates and deletion with its caret), and applies it as one transaction that replaces
 * only the top-level blocks that changed. The adapter resolves what the engine knows: the blocks
 * that the selection touches, the selection's point of insertion and the selection afterwards,
 * set again from engine-neutral points and identifiers.
 */
import type { TextEditorBlocksInsertAction } from '../../actions.js';
import type {
  TextEditorPortableBlock,
  TextEditorPortableDocument,
} from '../../content/portable.js';
import type { TextEditorSelection, TextEditorSelectionInput } from '../../model.js';
import { NO_SELECTION } from '../../state.js';
import {
  alignBlocks,
  indentItems,
  outdentItems,
  setBlockAttrs,
  setBlockType,
  textblockTargets,
  touchedItems,
  type TextEditorEditContext,
} from '../shared/block-edits.js';
import { withTrailingParagraph } from '../shared/blocks.js';
import {
  deleteBlocks,
  duplicateBlocks,
  insertAfterBlock,
  insertBeforeBlock,
  insertBlocks,
  moveBlocks,
  newBlock,
  placeAtPoint,
  replaceInPlace,
  selectionAfterInsert,
} from '../shared/structure-edits.js';
import type { TiptapActionHandlers } from './actions.js';
import { holderAtPos, isCellNode, isItemNode } from './mapping.js';
import type { TiptapNodeLike } from './modules.js';
import {
  edgeSelection,
  isCellSelection,
  readSelection,
  resolveSelectionInput,
  selectAllOf,
  selectedBlockIds,
  wholeDocumentSelection,
} from './selection.js';
import type { TiptapWork } from './work.js';

// Applying shared edits

/** What the shared edits need from the mount. */
export const editContext = (work: TiptapWork): TextEditorEditContext => ({
  urls: work.env.urls,
  nodes: work.env.nodes,
  createId: work.env.createId,
});

/**
 * Applies the document a shared edit produced, with the empty paragraph the engine keeps after a
 * final atom block or table; `false` when the edit could not apply.
 */
export function applyDocument(
  work: TiptapWork,
  document: TextEditorPortableDocument | null,
): boolean {
  if (!document) return false;
  work.commit(withTrailingParagraph(document, work.env.createId));
  return true;
}

// Selections

/**
 * The engine-neutral selection of the work's transaction: none while no selection is placed, as
 * the state reports it, so that an action that keeps the selection keeps none
 * (`uwg-te-req-engine-4`).
 */
export function modelSelection(work: TiptapWork): TextEditorSelection {
  return work.placed ? readSelection(work.env, work.doc, work.selection) : NO_SELECTION;
}

/**
 * The selection that an edit keeps: the model selection, or `whole` for the whole-document
 * selection (`wholeDocumentSelection`), which stays the whole-document selection of the changed
 * document, as the engine maps its select-all (`uwg-te-req-engine-4`).
 */
export function selectionToKeep(work: TiptapWork): TextEditorSelection | 'whole' {
  return work.placed && wholeDocumentSelection(work.env, work.doc, work.selection)
    ? 'whole'
    : modelSelection(work);
}

/**
 * Sets a selection again after a rewrite, `whole` as the select-all of the changed document;
 * whether it resolved.
 */
export function restoreSelection(
  work: TiptapWork,
  selection: TextEditorSelection | TextEditorSelectionInput | 'whole' | null,
): boolean {
  if (selection === 'whole') {
    work.tr.setSelection(selectAllOf(work.env.modules, work.doc));
    return true;
  }
  if (!selection || selection.kind === 'none') return false;
  const input: TextEditorSelectionInput =
    selection.kind === 'text'
      ? { kind: 'text', anchor: selection.anchor, head: selection.head }
      : selection;
  const resolved = resolveSelectionInput(work, input);
  if (!resolved) return false;
  work.tr.setSelection(resolved);
  return true;
}

/** Whether a position lies in a table cell. */
export function inCell(doc: TiptapNodeLike, pos: number): boolean {
  const $pos = doc.resolve(pos);
  for (let depth = $pos.depth; depth > 0; depth -= 1) if (isCellNode($pos.node(depth))) return true;
  return false;
}

/**
 * The blocks that a block action without identifiers targets (`uwg-te-tab-actions` r2): the blocks
 * of a block selection, else the textblocks that a text selection meets in document order, atoms
 * and tables between them skipped (`textblockTargets`), none for a point in a table cell; `null`
 * when there is none.
 */
function targetIds(work: TiptapWork, ids: readonly string[] | undefined): string[] | null {
  if (ids) return [...ids];
  const selected = selectedBlockIds(work.env.modules, work.doc, work.selection);
  if (selected) return selected.length > 0 ? selected : null;
  const selection = modelSelection(work);
  if (selection.kind !== 'text') return null;
  const targets = textblockTargets(work.portable(), selection.anchor, selection.head);
  return targets.length > 0 ? [...targets] : null;
}

/**
 * The list items that nesting targets: its own, else the list items that a text selection outside
 * tables touches (the shared `touchedItems`, `uwg-te-req-parity-1`), or the list items of a block
 * selection.
 */
function itemIds(work: TiptapWork, ids: readonly string[] | undefined): string[] | null {
  if (ids) return [...ids];
  const selection = modelSelection(work);
  let items: readonly string[] = [];
  if (selection.kind === 'text' && !selection.anchor.cell && !selection.head.cell)
    items = touchedItems(work.portable(), selection.anchor.block, selection.head.block);
  else if (selection.kind === 'blocks')
    items = selection.ids.filter((id) => {
      const holder = work.holder(id);
      return holder !== null && isItemNode(holder.node);
    });
  return items.length > 0 ? [...items] : null;
}

/** Applies an edit and sets the selection that preceded it again. */
function keepingSelection(
  work: TiptapWork,
  edit: (document: TextEditorPortableDocument) => TextEditorPortableDocument | null,
): boolean {
  const selection = selectionToKeep(work);
  if (!applyDocument(work, edit(work.portable()))) return false;
  restoreSelection(work, selection);
  return true;
}

// Block attributes and nesting (uwg-te-tab-actions r2)

const setType: TiptapActionHandlers['block.set-type'] = (work, action) => {
  const ids = targetIds(work, action.ids);
  if (!ids) return false;
  return keepingSelection(work, (document) =>
    setBlockType(
      document,
      ids,
      { kind: action.kind, attrs: action.attrs, toggle: action.toggle },
      editContext(work),
    ),
  );
};

const align: TiptapActionHandlers['block.align'] = (work, action) => {
  const ids = targetIds(work, action.ids);
  if (!ids) return false;
  return keepingSelection(work, (document) =>
    alignBlocks(document, ids, action.align, editContext(work)),
  );
};

// Blocks (uwg-te-tab-actions r3)

/** Where blocks that a tool inserts go: a block they replace or follow, or the document's end. */
type InsertionPlace =
  { readonly kind: 'replace' | 'after'; readonly id: string } | { readonly kind: 'end' };

/**
 * The point of insertion of the selection (`uwg-te-req-blocks-1`): the end of a text selection,
 * whose empty paragraph or empty list item the block replaces and whose block, a list item with
 * its nested items, it otherwise follows; a table for a point in a cell; the last block of a block
 * selection; the end of the document without a selection.
 */
export function insertionPlace(
  work: TiptapWork,
  document: TextEditorPortableDocument,
): InsertionPlace {
  const { selection, doc } = work;
  const { modules, tables } = work.env;
  const whole = wholeDocumentSelection(work.env, doc, selection);
  // Without a placed selection, the end of the document (`uwg-te-req-blocks-1`).
  const unplaced = !work.placed;
  // A node-selected atom is a block selection (`uwg-te-req-blocks-4`).
  const blocks = unplaced ? null : selectedBlockIds(modules, doc, selection);
  // A text selection or a cell range has a point of insertion; a block selection a last block.
  const point = !blocks && !whole && !unplaced;
  const id: string | null = blocks
    ? (blocks.at(-1) ?? null)
    : whole || unplaced
      ? null
      : (holderAtPos(
          doc,
          isCellSelection(tables, selection) ? selection.$anchorCell.pos : selection.to,
        )?.id ?? null);
  if (!point && id !== null) return { kind: 'after', id };
  // The block at the point, or without one the end of the document (`placeAtPoint`).
  const place = placeAtPoint(document, id);
  if (!place) return id === null ? { kind: 'end' } : { kind: 'after', id };
  return 'replace' in place
    ? { kind: 'replace', id: place.replace }
    : { kind: 'after', id: place.after };
}

/** The document with blocks at an insertion place. */
export function insertAt(
  work: TiptapWork,
  document: TextEditorPortableDocument,
  place: InsertionPlace,
  blocks: readonly TextEditorPortableBlock[],
): TextEditorPortableDocument | null {
  const context = editContext(work);
  switch (place.kind) {
    case 'replace':
      return replaceInPlace(document, place.id, blocks, context);
    case 'after':
      return insertAfterBlock(document, place.id, blocks, context);
    case 'end':
      return insertBlocks(
        document,
        { parent: null, index: document.blocks.length },
        blocks,
        context,
      );
  }
}

const insertBlock: TiptapActionHandlers['blocks.insert'] = (
  work,
  action: TextEditorBlocksInsertAction,
) => {
  const context = editContext(work);
  const block = newBlock(action.kind, action.attrs ?? {}, context);
  if (!block?.id) return false;
  const document = work.portable();
  const selection = selectionToKeep(work);
  const at = action.at;
  const next = !at
    ? insertAt(work, document, insertionPlace(work, document), [block])
    : 'after' in at
      ? insertAfterBlock(document, at.after, [block], context)
      : 'before' in at
        ? insertBeforeBlock(document, at.before, [block], context)
        : 'replace' in at
          ? replaceInPlace(document, at.replace, [block], context)
          : insertBlocks(document, { parent: at.parent, index: at.index }, [block], context);
  if (!applyDocument(work, next)) return false;
  // The shared selection after an insertion (`selectionAfterInsert`, `uwg-te-tab-actions` r3): an
  // atom block-selected, a table or a textblock with the caret at its start or, with `end`, its
  // end; `none` keeps the selection.
  const after = selectionAfterInsert(work.portable(), block.id, action.select);
  restoreSelection(work, after === 'keep' ? selection : after);
  return true;
};

const moveAction: TiptapActionHandlers['blocks.move'] = (work, action) => {
  const selection = selectionToKeep(work);
  if (!applyDocument(work, moveBlocks(work.portable(), action.ids, action.to, editContext(work))))
    return false;
  // A block selection holds the moved blocks; a caret, text selection or cell range stays put, the
  // whole-document selection over the whole document.
  restoreSelection(
    work,
    selection !== 'whole' && selection.kind === 'blocks'
      ? { kind: 'blocks', ids: action.ids }
      : selection,
  );
  return true;
};

const duplicateAction: TiptapActionHandlers['blocks.duplicate'] = (work, action) => {
  const result = duplicateBlocks(work.portable(), action.ids, editContext(work));
  if (!result || !applyDocument(work, result.document)) return false;
  restoreSelection(work, { kind: 'blocks', ids: result.copies });
  return true;
};

const deleteAction: TiptapActionHandlers['blocks.delete'] = (work, action) => {
  const result = deleteBlocks(work.portable(), action.ids, editContext(work));
  if (!result || !applyDocument(work, result.document)) return false;
  if (
    !result.caret ||
    !restoreSelection(work, {
      kind: 'caret',
      block: result.caret.block,
      position: result.caret.position,
    })
  )
    work.tr.setSelection(edgeSelection(work.env, work.doc, 'start'));
  return true;
};

export const BLOCK_HANDLERS: TiptapActionHandlers = {
  'block.set-type': setType,
  'block.set-attrs': (work, action) =>
    keepingSelection(work, (document) =>
      setBlockAttrs(document, action.id, action.attrs, editContext(work)),
    ),
  'block.align': align,
  'block.indent': (work, action) => {
    const ids = itemIds(work, action.ids);
    return (
      ids !== null &&
      keepingSelection(work, (document) => indentItems(document, ids, editContext(work)))
    );
  },
  'block.outdent': (work, action) => {
    const ids = itemIds(work, action.ids);
    return (
      ids !== null &&
      keepingSelection(work, (document) => outdentItems(document, ids, editContext(work)))
    );
  },
  'blocks.insert': insertBlock,
  'blocks.move': moveAction,
  'blocks.duplicate': duplicateAction,
  'blocks.delete': deleteAction,
};
