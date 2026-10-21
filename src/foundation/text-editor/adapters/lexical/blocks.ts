/**
 * Block actions on Lexical (Widgets `uwg-te-tab-actions` r2, r3, `uwg-te-req-blocks-1`,
 * `uwg-te-req-blocks-4`, `uwg-te-req-blocks-5`, `uwg-te-req-content-7`).
 *
 * Each action computes the next portable document with the shared block and structure edits and
 * applies it in the action's update, replacing only the changed children of the root; identifiers
 * stay with their blocks, so turn-into, list toggles and moves keep them and copies get fresh
 * ones. The selection afterwards follows the action: it stays at its text points, selects the
 * moved or copied blocks, or goes where a deletion or an insertion puts it.
 */
import type {
  TextEditorBlockAlignAction,
  TextEditorBlockSlot,
  TextEditorBlockIndentAction,
  TextEditorBlockOutdentAction,
  TextEditorBlockSetAttrsAction,
  TextEditorBlockSetTypeAction,
  TextEditorBlocksDeleteAction,
  TextEditorBlocksDuplicateAction,
  TextEditorBlocksInsertAction,
  TextEditorBlocksMoveAction,
} from '../../actions.js';
import type { TextEditorPortableDocument } from '../../content/portable.js';
import type { TextEditorSelection, TextEditorSelectionInput } from '../../model.js';
import {
  alignBlocks,
  indentItems,
  outdentItems,
  setBlockAttrs,
  setBlockType,
  textblockTargets,
  touchedItems,
} from '../shared/block-edits.js';
import { isTextblock, withTrailingParagraph } from '../shared/blocks.js';
import type { TextEditorFragmentContext } from '../shared/fragment-insert.js';
import {
  caretSelection,
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
  topLevelSlotAfter,
} from '../shared/structure-edits.js';
import { $applyDocument, $portableDocument } from './document.js';
import { $holdsWholeDocument } from './guards.js';
import { $blockId, $holderById, $holders, $nearestHolder } from './ids.js';
import type { LexicalNodeLike } from './modules.js';
import { $textblockAt } from './points.js';
import type { LexicalRuntime } from './runtime.js';
import { $applySelection, $readSelection } from './selection.js';

/** What the shared edits need; fragments also the mount's capabilities. */
export const editContext = (rt: LexicalRuntime): TextEditorFragmentContext => ({
  urls: rt.urls,
  nodes: rt.nodes,
  createId: rt.createId,
  capabilities: rt.glue.capabilities,
});

/** A selection the model reports, as the input that sets it again. */
export function selectionInput(selection: TextEditorSelection): TextEditorSelectionInput | null {
  switch (selection.kind) {
    case 'text':
      return { kind: 'text', anchor: selection.anchor, head: selection.head };
    case 'blocks':
      return { kind: 'blocks', ids: selection.ids };
    case 'cells':
      return { kind: 'cells', table: selection.table, range: selection.range };
    default:
      return null;
  }
}

/** A caret at the start of the first textblock, or no selection without one. */
function $fallbackSelection(rt: LexicalRuntime, document: TextEditorPortableDocument): void {
  for (const block of document.blocks)
    if (
      block.id &&
      isTextblock(block) &&
      $applySelection(rt, { kind: 'caret', block: block.id, position: 'start' })
    )
      return;
  rt.lexical.$setSelection(null);
}

/**
 * Applies a next document in the update and sets the selection: `keep` restores the selection the
 * update started with, at its text points, blocks or cells, and the whole-document selection
 * (`$holdsWholeDocument`) as the engine's select-all of the changed document, as the other engine
 * maps its own (`uwg-te-req-engine-4`).
 */
export function $commitDocument(
  rt: LexicalRuntime,
  next: TextEditorPortableDocument,
  selection: TextEditorSelectionInput | 'keep' | null,
): boolean {
  const before = $readSelection(rt);
  const whole = selection === 'keep' && $holdsWholeDocument(rt);
  // The select-all spans the empty paragraph that the root keeps after a final atom block or
  // table, which therefore joins the document before it.
  $applyDocument(rt, whole ? withTrailingParagraph(next, rt.createId) : next);
  if (whole) {
    rt.lexical.$selectAll(null);
    rt.selectAll = true;
    return true;
  }
  const wanted = selection === 'keep' ? selectionInput(before) : selection;
  if (wanted && $applySelection(rt, wanted)) return true;
  if (selection === 'keep' && before.kind === 'none') {
    rt.lexical.$setSelection(null);
    return true;
  }
  $fallbackSelection(rt, next);
  return true;
}

// Targets of the selection

/** The holders that a block selection (a node selection) holds, in document order. */
function $nodeSelectedIds(rt: LexicalRuntime): string[] {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isNodeSelection(selection)) return [];
  const keys = new Set(selection.getNodes().map((node) => node.getKey()));
  return $holders(rt)
    .filter((holder) => keys.has(holder.getKey()))
    .map((holder) => $blockId(rt, holder));
}

/** Whether the selection lies in a table, whose cells hold paragraphs only. */
function $inTable(rt: LexicalRuntime): boolean {
  const selection = rt.lexical.$getSelection();
  if (!selection) return false;
  if (rt.modules.table?.$isTableSelection(selection)) return true;
  if (!rt.lexical.$isRangeSelection(selection)) return false;
  return [selection.anchor, selection.focus].some(
    (point) => $textblockAt(rt, point)?.address.cell !== undefined,
  );
}

/**
 * The blocks that `block.set-type` and `block.align` target (`uwg-te-tab-actions` r2): the action's
 * own, else the blocks of a block selection, else the textblocks whose text a text selection
 * outside tables meets, atoms and tables between them skipped (the shared `textblockTargets`);
 * `null` in a table or without any.
 */
function $blockTargets(
  rt: LexicalRuntime,
  ids: readonly string[] | undefined,
): readonly string[] | null {
  if (ids) return ids;
  if ($inTable(rt)) return null;
  const selection = $readSelection(rt);
  const targets = rt.lexical.$isNodeSelection(rt.lexical.$getSelection())
    ? $nodeSelectedIds(rt)
    : selection.kind === 'text'
      ? textblockTargets($portableDocument(rt), selection.anchor, selection.head)
      : [];
  return targets.length > 0 ? targets : null;
}

type Prepared = (() => boolean) | null;

/** Prepares a document edit: the next document is computed now, applied by the returned step. */
function prepared(
  rt: LexicalRuntime,
  next: TextEditorPortableDocument | null,
  selection: TextEditorSelectionInput | 'keep' | null = 'keep',
): Prepared {
  return next ? () => $commitDocument(rt, next, selection) : null;
}

// block.set-type, block.set-attrs, block.align, block.indent, block.outdent

export function $prepareSetType(
  rt: LexicalRuntime,
  action: TextEditorBlockSetTypeAction,
): Prepared {
  const ids = $blockTargets(rt, action.ids);
  if (!ids) return null;
  return prepared(
    rt,
    setBlockType(
      $portableDocument(rt),
      ids,
      { kind: action.kind, attrs: action.attrs, toggle: action.toggle },
      editContext(rt),
    ),
  );
}

export function $prepareSetAttrs(
  rt: LexicalRuntime,
  action: TextEditorBlockSetAttrsAction,
): Prepared {
  return prepared(
    rt,
    setBlockAttrs($portableDocument(rt), action.id, action.attrs, editContext(rt)),
  );
}

export function $prepareAlign(rt: LexicalRuntime, action: TextEditorBlockAlignAction): Prepared {
  const ids = $blockTargets(rt, action.ids);
  if (!ids) return null;
  return prepared(rt, alignBlocks($portableDocument(rt), ids, action.align, editContext(rt)));
}

/**
 * The list items that nesting targets (`uwg-te-tab-actions` r2): the action's own, else the list
 * items that a text selection outside tables touches (the shared `touchedItems`), or the list
 * items of a block selection.
 */
function $itemIds(
  rt: LexicalRuntime,
  ids: readonly string[] | undefined,
): readonly string[] | null {
  if (ids) return ids;
  const selection = $readSelection(rt);
  let items: readonly string[] = [];
  if (selection.kind === 'text' && !selection.anchor.cell && !selection.head.cell)
    items = touchedItems($portableDocument(rt), selection.anchor.block, selection.head.block);
  else if (selection.kind === 'blocks')
    items = selection.ids.filter((id) => {
      const holder = $holderById(rt, id);
      return holder !== null && rt.isListItem(holder);
    });
  return items.length > 0 ? items : null;
}

export function $prepareIndent(rt: LexicalRuntime, action: TextEditorBlockIndentAction): Prepared {
  const ids = $itemIds(rt, action.ids);
  if (!ids) return null;
  return prepared(rt, indentItems($portableDocument(rt), ids, editContext(rt)));
}

export function $prepareOutdent(
  rt: LexicalRuntime,
  action: TextEditorBlockOutdentAction,
): Prepared {
  const ids = $itemIds(rt, action.ids);
  if (!ids) return null;
  return prepared(rt, outdentItems($portableDocument(rt), ids, editContext(rt)));
}

// blocks.insert (`uwg-te-tab-actions` r3)

type Placement =
  | { readonly slot: TextEditorBlockSlot }
  | { readonly replace: string }
  | { readonly after: string }
  | { readonly before: string };

/** Where an inserted block goes when the action names no place: the point of insertion. */
function $insertionPoint(
  rt: LexicalRuntime,
  document: TextEditorPortableDocument,
): Placement | null {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  // Without a selection, the end of the document (`placeAtPoint`).
  const end: Placement = placeAtPoint(document, null) ?? {
    slot: { parent: null, index: document.blocks.length },
  };
  if (!selection) return end;
  const table = rt.modules.table;
  if (table && table.$isTableSelection(selection)) {
    const holder = $nearestHolder(rt, selection.anchor.getNode());
    const slot = holder ? topLevelSlotAfter(document, $blockId(rt, holder)) : null;
    return slot ? { slot } : null;
  }
  if (lexical.$isNodeSelection(selection)) {
    const ids = $nodeSelectedIds(rt);
    const last = ids[ids.length - 1];
    return last ? { after: last } : end;
  }
  if (!lexical.$isRangeSelection(selection)) return end;
  const point = selection.isBackward() ? selection.anchor : selection.focus;
  const holder: LexicalNodeLike | null = $nearestHolder(rt, point.getNode());
  if (!holder) return end;
  const id = $blockId(rt, holder);
  if ($textblockAt(rt, point)?.address.cell !== undefined) {
    const slot = topLevelSlotAfter(document, id);
    return slot ? { slot } : null;
  }
  return placeAtPoint(document, id);
}

function placementOf(
  rt: LexicalRuntime,
  document: TextEditorPortableDocument,
  at: TextEditorBlocksInsertAction['at'],
): Placement | null {
  if (!at) return $insertionPoint(rt, document);
  if ('after' in at) return { after: at.after };
  if ('before' in at) return { before: at.before };
  if ('replace' in at) return { replace: at.replace };
  return { slot: { parent: at.parent, index: at.index } };
}

export function $prepareInsert(rt: LexicalRuntime, action: TextEditorBlocksInsertAction): Prepared {
  const document = $portableDocument(rt);
  const context = editContext(rt);
  const block = newBlock(action.kind, action.attrs ?? {}, context);
  if (!block) return null;
  const placement = placementOf(rt, document, action.at);
  if (!placement) return null;
  const next =
    'replace' in placement
      ? replaceInPlace(document, placement.replace, [block], context)
      : 'after' in placement
        ? insertAfterBlock(document, placement.after, [block], context)
        : 'before' in placement
          ? insertBeforeBlock(document, placement.before, [block], context)
          : insertBlocks(document, placement.slot, [block], context);
  if (!next) return null;
  // The selection afterwards is the shared rule: an atom block-selected, a table or a textblock
  // with a caret as `select` says, `start` when absent.
  const selection = selectionAfterInsert(next, block.id!, action.select);
  if (selection === null) return null;
  return prepared(rt, next, selection);
}

// blocks.move, blocks.duplicate, blocks.delete

export function $prepareMove(rt: LexicalRuntime, action: TextEditorBlocksMoveAction): Prepared {
  const next = moveBlocks($portableDocument(rt), action.ids, action.to, editContext(rt));
  if (!next) return null;
  const current = $readSelection(rt);
  // A block selection holds the moved blocks; a caret, a text selection or a cell range stays at
  // its points, and no selection stays none.
  const selection: TextEditorSelectionInput | 'keep' =
    current.kind === 'blocks' ? { kind: 'blocks', ids: action.ids } : 'keep';
  return prepared(rt, next, selection);
}

export function $prepareDuplicate(
  rt: LexicalRuntime,
  action: TextEditorBlocksDuplicateAction,
): Prepared {
  const result = duplicateBlocks($portableDocument(rt), action.ids, editContext(rt));
  if (!result) return null;
  return prepared(rt, result.document, { kind: 'blocks', ids: result.copies });
}

export function $prepareDelete(rt: LexicalRuntime, action: TextEditorBlocksDeleteAction): Prepared {
  const result = deleteBlocks($portableDocument(rt), action.ids, editContext(rt));
  if (!result) return null;
  const caret = result.caret;
  // A table's end is its last cell in document order (`uwg-te-req-tables-1`).
  const selection: TextEditorSelectionInput | null = caret
    ? caretSelection(result.document, caret.block, caret.position)
    : null;
  return prepared(rt, result.document, selection);
}

/**
 * Deletes the blocks of the block selection being read as `blocks.delete` deletes them, for a key
 * or a cut (`uwg-te-req-blocks-4`): whichever key deletes them, the caret goes to the end of the
 * nearest textblock or table before them, else the start of the nearest one after them. Answers
 * whether it deleted a block selection.
 */
export function $deleteSelectedBlocks(rt: LexicalRuntime): boolean {
  const selection = $readSelection(rt);
  if (selection.kind !== 'blocks') return false;
  const step = $prepareDelete(rt, { type: 'blocks.delete', ids: selection.ids });
  return step !== null && step();
}
