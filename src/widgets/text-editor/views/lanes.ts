/**
 * The open lanes of the transient surfaces (`uwg-te-tab-reasons` r12, r13): the link popover,
 * the table size picker and the suggestion lists record each opening and closing with
 * its reason. The lanes are internal by design (no public event or state carries their reasons,
 * DD-024), so they are reported only to the observers of this instrumentation, such as a fixture's
 * lane probe.
 */
import type { ChangeReason } from '../../../foundation/types.js';

/** A transient surface with an open lane. */
export type TextEditorLaneSurface = 'link' | 'table-size' | 'suggestions';

/** One change of a surface's open lane. */
export interface TextEditorLaneChange {
  /** The `tp-text-editor` whose surface changed. */
  readonly host: Element;
  readonly surface: TextEditorLaneSurface;
  readonly open: boolean;
  readonly reason: ChangeReason;
}

const laneListeners = new Set<(change: TextEditorLaneChange) => void>();

/** Internal instrumentation: reports every lane change until the returned function stops it. */
export function observeTextEditorLanes(
  listener: (change: TextEditorLaneChange) => void,
): () => void {
  const entry = (change: TextEditorLaneChange): void => listener(change);
  laneListeners.add(entry);
  return () => {
    laneListeners.delete(entry);
  };
}

/** Reports a lane change to the observers; frozen, and nothing happens without one. */
export function reportTextEditorLane(change: TextEditorLaneChange): void {
  if (!laneListeners.size) return;
  const frozen = Object.freeze({ ...change });
  for (const listener of [...laneListeners]) listener(frozen);
}
