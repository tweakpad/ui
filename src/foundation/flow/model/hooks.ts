import type {
  ChangeReason,
  FlowChange,
  FlowChangeOrigin,
  FlowDocument,
  FlowModelLike,
  FlowRect,
} from '../types.js';

/**
 * Middleware around the apply pipeline. `before` hooks run after cascades and clamping and may
 * veto (`false`) or replace the change list; `after` hooks observe the emitted event. Undo and
 * redo route through the same chain so a controlled owner can refuse them.
 */
export interface FlowHookContext {
  reason: ChangeReason;
  origin: FlowChangeOrigin;
  transaction: string | undefined;
  model: FlowModelLike;
  /** The document the pending changes would produce. */
  preview(): FlowDocument;
}

export interface FlowChangeEvent {
  changes: readonly FlowChange[];
  inverse: readonly FlowChange[];
  reason: ChangeReason;
  origin: FlowChangeOrigin;
  transaction: string | undefined;
  document: FlowDocument;
  previousDocument: FlowDocument;
  affectedNodes: ReadonlySet<string>;
  affectedEdges: ReadonlySet<string>;
  /** Padded unions of each affected node's old and new rects. */
  dirtyRects: readonly FlowRect[];
  label?: string;
}

export interface FlowMiddleware {
  name?: string;
  before?(changes: readonly FlowChange[], context: FlowHookContext): FlowChange[] | false | void;
  after?(event: FlowChangeEvent): void;
}

export interface FlowBeforeHooksResult {
  changes: FlowChange[];
  vetoedBy?: string;
}

function nameOf(middleware: FlowMiddleware, index: number): string {
  return middleware.name ?? `middleware:${index}`;
}

/** Runs the `before` chain; stops at the first veto. */
export function runBeforeHooks(
  middleware: readonly FlowMiddleware[],
  changes: readonly FlowChange[],
  context: FlowHookContext,
): FlowBeforeHooksResult {
  let current: FlowChange[] = [...changes];
  for (let index = 0; index < middleware.length; index += 1) {
    const entry = middleware[index]!;
    if (!entry.before) continue;
    const result = entry.before(current, context);
    if (result === false) return { changes: current, vetoedBy: nameOf(entry, index) };
    if (Array.isArray(result)) current = result;
  }
  return { changes: current };
}

/** Runs every `after` hook; a throwing hook does not stop the others (the first error is rethrown). */
export function runAfterHooks(middleware: readonly FlowMiddleware[], event: FlowChangeEvent): void {
  let failure: unknown;
  let failed = false;
  for (const entry of middleware) {
    if (!entry.after) continue;
    try {
      entry.after(event);
    } catch (error) {
      if (!failed) {
        failed = true;
        failure = error;
      }
    }
  }
  if (failed) throw failure;
}
