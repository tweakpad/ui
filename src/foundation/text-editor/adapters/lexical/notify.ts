/**
 * Notifications of the Lexical adapter (Widgets `uwg-te-tab-engine` r3, `uwg-te-req-engine-6`,
 * `uwg-te-req-engine-4`).
 *
 * Every committed update raises the version and notifies once: `content` when the document
 * changed, with the change the adapter call in progress reports or else the shared engine change
 * (`engineChange`), and `state` otherwise. An update the engine discarded (an aborted action), the
 * history boundary after an action and an update that changed nothing the state reports notify
 * nothing; nothing is notified before ready, after destroy or after the mount's signal aborted. A
 * document change is a node that the update created, removed, moved or whose own JSON changed: the
 * engine also marks nodes dirty that it rewrote unchanged, and those are no change.
 *
 * An undo or redo notifies once, like any other change. The engine sets a history entry's state in
 * two commits: first it commits the update in progress, tagged historic, which marks nothing dirty
 * and still holds the document and selection before the step; then the entry's state, which marks
 * only the root dirty although any node may differ. The first is folded into the second, whose
 * `content` notification reports the restored document, its selection and the new history
 * availability.
 */
import { engineChange } from '../../cause.js';
import type { TextEditorEngineContext } from '../../engine.js';
import { HISTORY_BOUNDARY_TAG } from './actions.js';
import { CUT_TAG } from './clipboard.js';
import { $holdsWholeDocument } from './guards.js';
import type {
  LexicalEditorStateLike,
  LexicalNodeLike,
  LexicalUpdatePayloadLike,
} from './modules.js';
import type { LexicalRuntime } from './runtime.js';

/** A node's position and own JSON, as one comparable string, or `null` when absent. */
function $signature(rt: LexicalRuntime, key: string): string | null {
  const node: LexicalNodeLike | null = rt.lexical.$getNodeByKey(key);
  if (!node) return null;
  const parent = node.getParent();
  return JSON.stringify([
    node.exportJSON(),
    parent?.getKey() ?? null,
    node.getPreviousSibling()?.getKey() ?? null,
    node.getNextSibling()?.getKey() ?? null,
  ]);
}

const signatureIn = (rt: LexicalRuntime, state: LexicalEditorStateLike, key: string) =>
  state.read(() => $signature(rt, key));

/** Whether an update marked no node dirty. */
const marksNothing = (payload: LexicalUpdatePayloadLike): boolean =>
  payload.dirtyElements.size === 0 && payload.dirtyLeaves.size === 0;

/**
 * Whether an update is the engine's commit of the update in progress before it sets a history
 * entry's state: tagged historic, nothing dirty. The restore that follows reports it.
 */
const beforeRestore = (rt: LexicalRuntime, payload: LexicalUpdatePayloadLike): boolean =>
  payload.tags.has(rt.lexical.HISTORIC_TAG) && marksNothing(payload);

/** Whether an update changed the document. */
export function documentChanged(rt: LexicalRuntime, payload: LexicalUpdatePayloadLike): boolean {
  const { dirtyElements, dirtyLeaves, editorState, prevEditorState, tags } = payload;
  if (marksNothing(payload)) return false;
  // A history entry's whole state replaces the document while only the root is marked dirty.
  if (tags.has(rt.lexical.HISTORIC_TAG))
    return JSON.stringify(prevEditorState.toJSON()) !== JSON.stringify(editorState.toJSON());
  const keys = new Set([...dirtyLeaves, ...dirtyElements.keys()]);
  for (const key of keys)
    if (signatureIn(rt, prevEditorState, key) !== signatureIn(rt, editorState, key)) return true;
  return false;
}

/** The notifications of a mount and the signal that ends them. */
type Notifications<K extends 'state' | 'content'> = Pick<TextEditorEngineContext, K | 'signal'>;

/** Whether notifications flow: after ready, before destroy and while the signal has not aborted. */
const flowing = (rt: LexicalRuntime, context: Notifications<never>): boolean =>
  rt.live && !context.signal.aborted;

/** Raises the version and notifies `state`, outside an update, for focus, editability and history. */
export function notifyState(rt: LexicalRuntime, notifications: Notifications<'state'>): void {
  if (!flowing(rt, notifications)) return;
  rt.version += 1;
  // Focus, editability and history leave the selection as the last notification reported it.
  noteReported(rt, reported.get(rt)?.whole ?? false);
  notifications.state();
}

/**
 * The history availability the last notification reported, and whether its selection was the
 * whole-document selection of Mod+A, which the state reports in place of the engine's own.
 */
const reported = new WeakMap<LexicalRuntime, { undo: boolean; redo: boolean; whole: boolean }>();

function noteReported(rt: LexicalRuntime, whole: boolean): void {
  reported.set(rt, { undo: rt.canUndo, redo: rt.canRedo, whole });
}

/**
 * Whether an update that left the document as it was changed nothing the state reports: the same
 * selection (a caret's format and style included; a range's format is not reported, its marks
 * come from its text), reported as the whole-document selection or not as before, no composition
 * and the same history availability, such as the engine's own follow-up commit after an undo,
 * which only refreshes a range's format.
 */
function unobservable(
  rt: LexicalRuntime,
  payload: LexicalUpdatePayloadLike,
  whole: boolean,
): boolean {
  const { lexical } = rt;
  if (payload.tags.has('composition-start') || payload.tags.has('composition-end')) return false;
  if (rt.engine.isComposing()) return false;
  const last = reported.get(rt);
  if (!last || last.undo !== rt.canUndo || last.redo !== rt.canRedo || last.whole !== whole)
    return false;
  const before = payload.prevEditorState.read(() => lexical.$getSelection());
  const after = payload.editorState.read(() => lexical.$getSelection());
  if (before === null || after === null) return before === after;
  if (
    lexical.$isRangeSelection(before) &&
    lexical.$isRangeSelection(after) &&
    !before.isCollapsed() &&
    !after.isCollapsed()
  )
    return before.anchor.is(after.anchor) && before.focus.is(after.focus);
  return before.is(after);
}

/** Registers the update listener that versions and notifies every committed update. */
export function registerNotifications(
  rt: LexicalRuntime,
  notifications: Notifications<'state' | 'content'>,
): () => void {
  return rt.engine.registerUpdateListener((payload) => {
    if (!flowing(rt, notifications)) return;
    if (payload.editorState === payload.prevEditorState) return;
    if (payload.tags.has(HISTORY_BOUNDARY_TAG) || beforeRestore(rt, payload)) return;
    const changed = documentChanged(rt, payload);
    const whole = payload.editorState.read(() => $holdsWholeDocument(rt));
    if (!changed && unobservable(rt, payload, whole)) return;
    rt.version += 1;
    noteReported(rt, whole);
    if (!changed) {
      notifications.state();
      return;
    }
    rt.contentVersion += 1;
    const { tags } = payload;
    notifications.content(
      rt.acting ??
        engineChange({
          history: tags.has(rt.lexical.HISTORIC_TAG),
          cut: tags.has(CUT_TAG),
          composition: rt.engine.isComposing() || tags.has('composition-end'),
        }),
    );
  });
}
