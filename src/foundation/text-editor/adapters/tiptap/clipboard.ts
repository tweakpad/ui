/**
 * Copy and cut of the Tiptap adapter (Widgets `uwg-te-req-content-6`, `uwg-te-req-engine-4`,
 * `uwg-te-req-engine-11`).
 *
 * Copy and cut stay in the engine's event flow, but the adapter writes the clipboard itself, from
 * `copy` and `cut` handlers of the editing root: the shared clipboard payload of the selection's
 * portable fragment (`selectionFragment`, `clipboardPayload`), `text/html` that records whether it
 * holds a text range or whole blocks and `text/plain`; no other flavour and no engine attribute
 * such as `data-pm-slice`. A text selection copies a text range, a block selection or a selected
 * atom its blocks, a cell range a table of its cells, and the whole-document selection every block
 * as a text range, however it was made. A cut then deletes the selection: the whole-document
 * selection by leaving one empty paragraph with a fresh identifier, a block selection through the
 * shared block deletion, a cell range by clearing its cells, a range across blocks by the shared
 * range deletion, anything else as the engine deletes it. Paste and drops are the widget's; the
 * adapter handles neither.
 */
import type { TextEditorPortableFragment } from '../../content/portable.js';
import {
  clipboardPayload,
  selectionFragment,
  type TextEditorClipboardPayload,
} from '../shared/fragments.js';
import { clearSelectedCells, clearWholeDocument, deleteSelectedRange } from './keymap.js';
import { keyAction } from './lists.js';
import type { TiptapEditorStateLike } from './modules.js';
import { readSelection, selectedBlockIds, wholeDocumentSelection } from './selection.js';
import { portableOf, type TiptapDispatchViewLike, type TiptapEnv } from './work.js';

/** The metadata of a cut's transaction. */
const CUT = Object.freeze({ uiEvent: 'cut' });

/**
 * The portable fragment of a state's selection (`selectionFragment`), the whole-document selection
 * (`wholeDocumentSelection`) as the whole document; `null` when it holds nothing to copy.
 */
export function stateFragment(
  env: TiptapEnv,
  state: TiptapEditorStateLike,
): TextEditorPortableFragment | null {
  const { selection, doc } = state;
  const whole = wholeDocumentSelection(env, doc, selection);
  return selectionFragment(portableOf(doc, env), readSelection(env, doc, selection), whole);
}

/** The clipboard flavours of a state's selection (`clipboardPayload`), or `null`. */
export const stateClipboard = (
  env: TiptapEnv,
  state: TiptapEditorStateLike,
): TextEditorClipboardPayload | null => clipboardPayload(stateFragment(env, state), env.nodes);

/** The clipboard data of a `copy` or `cut` event, as far as the adapter writes it. */
interface ClipboardDataLike {
  clearData(): void;
  setData(format: string, data: string): void;
}

/** The view that the clipboard handlers receive. */
export interface TiptapClipboardViewLike extends TiptapDispatchViewLike {
  readonly editable: boolean;
}

/**
 * Deletes the selection that a cut wrote: the whole-document selection by leaving one empty
 * paragraph, a block selection's blocks through the shared block deletion, else the selection as
 * the engine deletes it; the transaction is marked as a cut.
 */
function deleteCut(env: TiptapEnv, view: TiptapDispatchViewLike): void {
  if (clearWholeDocument(env, view, CUT)) return;
  const { selection, doc } = view.state;
  const ids = selectedBlockIds(env.modules, doc, selection);
  if (ids && ids.length > 0) {
    keyAction(env, view, { type: 'blocks.delete', ids }, { uiEvent: 'cut' });
    return;
  }
  // A cell range clears the cells it copied, kept selected (`uwg-te-req-tables-5`); a text range
  // across blocks goes by the shared range deletion (`uwg-te-req-content-7`).
  if (clearSelectedCells(env, view, CUT) || deleteSelectedRange(env, view, CUT)) return;
  view.dispatch(view.state.tr.deleteSelection().scrollIntoView().setMeta('uiEvent', 'cut'));
}

/**
 * The `copy` (`cut` false) and `cut` handler of the editing root: writes both flavours, cancels
 * the event's default and, for a cut while editable, deletes the selection. `false` leaves the
 * event to the engine: no clipboard data, nothing selected, or a cut while read-only.
 */
export function handleClipboardEvent(
  env: TiptapEnv,
  view: TiptapClipboardViewLike,
  event: { readonly clipboardData: ClipboardDataLike | null; preventDefault(): void },
  cut: boolean,
): boolean {
  const data = event.clipboardData;
  if (!data || (cut && !view.editable)) return false;
  const payload = stateClipboard(env, view.state);
  if (!payload) return false;
  event.preventDefault();
  data.clearData();
  data.setData('text/html', payload.html);
  data.setData('text/plain', payload.text);
  if (cut) deleteCut(env, view);
  return true;
}
