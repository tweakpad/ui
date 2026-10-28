/**
 * List keys on Lexical (Widgets `uwg-te-req-parity-1`, `uwg-te-req-blocks-1`, `uwg-te-req-key-3`,
 * `uwg-te-req-content-7`).
 *
 * The engine's tab indentation is not installed, so Tab and Shift+Tab reach the adapter, which
 * applies the shared `listTab` to the list items that the selection touches: Tab nests each item
 * that can nest as the last nested item of its previous sibling; Shift+Tab unnests each item, a
 * nested item following its parent with its following siblings as its nested items, a top-level
 * item becoming a paragraph whose nested items follow as top-level items. The key is consumed when
 * items change, and without effect while the head lies in a list item; otherwise it is no list
 * key. Enter in an empty list item unnests it the same way. Backspace and Delete at list
 * boundaries follow the shared `listBoundaryEdit`, so an item keeps its identifier where the
 * engine would recreate it. Enter at the start of a non-empty item is the split rule of `ids.ts`
 * (an empty item before it).
 */
import { listTab, outdentItems } from '../shared/block-edits.js';
import { listBoundaryEdit, type TextEditorDeleteKey } from '../shared/text-edits.js';
import { $commitDocument, editContext } from './blocks.js';
import { $portableDocument } from './document.js';
import { $ownStep } from './history.js';
import { $blockId, $nearestHolder } from './ids.js';
import type { LexicalRangeSelectionLike } from './modules.js';
import { $textblockAt, $textblockLength, $textPointOf } from './points.js';
import type { LexicalRuntime } from './runtime.js';

/** The range selection being read, or `null`. */
function $range(rt: LexicalRuntime): LexicalRangeSelectionLike | null {
  const selection = rt.lexical.$getSelection();
  return rt.lexical.$isRangeSelection(selection) ? selection : null;
}

/** Whether either end of the selection lies in a table cell, where the widget owns Tab. */
function $inCell(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): boolean {
  return [selection.anchor, selection.focus].some(
    (point) => $textblockAt(rt, point)?.address.cell !== undefined,
  );
}

/**
 * Tab (`outdent` false) or Shift+Tab (`outdent` true) with a text selection outside tables: the
 * shared `listTab` nests or unnests the list items the selection touches, as an undo step of its
 * own; answers whether the key is consumed, also without effect while the head lies in a list
 * item. A selection that touches no list item that could nest, its head outside lists, is no list
 * key: focus moves (`uwg-te-req-key-3`).
 */
export function $listTab(rt: LexicalRuntime, outdent: boolean): boolean {
  const selection = $range(rt);
  if (!selection || $inCell(rt, selection)) return false;
  const anchor = $nearestHolder(rt, selection.anchor.getNode());
  const head = $nearestHolder(rt, selection.focus.getNode());
  if (!anchor || !head) return false;
  const result = listTab(
    $portableDocument(rt),
    $blockId(rt, anchor),
    $blockId(rt, head),
    outdent,
    editContext(rt),
  );
  if (!result) return false;
  if (result.document) {
    $ownStep(rt);
    $commitDocument(rt, result.document, 'keep');
  }
  return true;
}

/** The list item holding a collapsed caret outside tables, with the caret's offset in it. */
function $caretItem(rt: LexicalRuntime): { id: string; offset: number; empty: boolean } | null {
  const selection = $range(rt);
  if (!selection || !selection.isCollapsed()) return null;
  const found = $textblockAt(rt, selection.anchor);
  if (!found || found.address.cell || !rt.isListItem(found.block)) return null;
  const point = $textPointOf(rt, selection.anchor);
  if (!point) return null;
  return {
    id: found.address.block,
    offset: point.offset,
    empty: $textblockLength(rt, found.block) === 0,
  };
}

/** Unnests one item, the caret staying at its text point. */
function $outdentOne(rt: LexicalRuntime, id: string): boolean {
  const next = outdentItems($portableDocument(rt), [id], editContext(rt));
  if (!next) return false;
  $ownStep(rt);
  return $commitDocument(rt, next, 'keep');
}

/** Enter in an empty list item: the item unnests; answers whether it applied. */
export function $listEnterEmpty(rt: LexicalRuntime): boolean {
  const item = $caretItem(rt);
  return item !== null && item.empty && $outdentOne(rt, item.id);
}

/**
 * Backspace or Delete with a collapsed caret at a list boundary outside tables: the shared rule of
 * every engine (`listBoundaryEdit`), an undo step of its own with the caret it leaves.
 * Backspace at the start of an item unnests it; Backspace at the start of a paragraph after a list
 * joins it into the deepest last item; Delete at the end of an item, or of a block before a list,
 * joins the next textblock into it; the block holding the first character keeps its identifier.
 * Answers whether it applied; elsewhere the engine's own deletion acts.
 */
export function $listBoundary(rt: LexicalRuntime, key: TextEditorDeleteKey): boolean {
  const selection = $range(rt);
  if (!selection || !selection.isCollapsed()) return false;
  const point = $textPointOf(rt, selection.anchor);
  if (!point || point.cell) return false;
  const edit = listBoundaryEdit(
    $portableDocument(rt),
    key,
    { block: point.block, offset: point.offset },
    editContext(rt),
  );
  if (!edit) return false;
  $ownStep(rt);
  return $commitDocument(rt, edit.document, { kind: 'text', anchor: edit.caret });
}

/** Registers the list keys at high priority, ahead of the engine's own list handling. */
export function registerListKeys(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const HIGH = lexical.COMMAND_PRIORITY_HIGH;
  const editable = () => editor.isEditable();
  return lexical.mergeRegister(
    editor.registerCommand(
      lexical.KEY_TAB_COMMAND,
      (event) => {
        if (!editable() || event.altKey || event.ctrlKey || event.metaKey) return false;
        if (!$listTab(rt, event.shiftKey)) return false;
        event.preventDefault();
        return true;
      },
      HIGH,
    ),
    editor.registerCommand(
      lexical.INSERT_PARAGRAPH_COMMAND,
      () => editable() && $listEnterEmpty(rt),
      HIGH,
    ),
    // Backspace and Delete at list boundaries, from the key or from the deletion input.
    ...(
      [
        [lexical.KEY_BACKSPACE_COMMAND, 'backspace'],
        [lexical.KEY_DELETE_COMMAND, 'delete'],
      ] as const
    ).map(([command, key]) =>
      editor.registerCommand(
        command,
        (event) => {
          if (!editable() || !$listBoundary(rt, key)) return false;
          event.preventDefault();
          return true;
        },
        HIGH,
      ),
    ),
    editor.registerCommand(
      lexical.DELETE_CHARACTER_COMMAND,
      (backward) => editable() && $listBoundary(rt, backward ? 'backspace' : 'delete'),
      HIGH,
    ),
  );
}
