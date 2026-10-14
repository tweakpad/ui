/**
 * Batched layout passes (Foundation §12.3 `env-shared-observation`; Text motion `tm-lines`, Text
 * transform `ttf-refit`, Overflow list `ovl-refit`). Every owner that needs layout in the same
 * turn queues one pass. The batch runs every write, then every measurement in one layout, then
 * every apply, in a microtask that completes before the next paint. An owner keeps only its
 * latest pass.
 */
export interface LayoutPass<T = unknown> {
  /** Whether the pass is still wanted when the batch runs; wanted when omitted. */
  active?(): boolean;
  /** DOM writes the measurement depends on. */
  write?(): void;
  /** Layout reads only. */
  measure(): T;
  /** Writes that follow from the measurement. */
  apply?(measured: T): void;
}

const pending = new Map<object, LayoutPass<never>>();
let scheduled = false;

/** Queues `pass` for `owner`, replacing a pass the owner queued earlier in this turn. */
export function scheduleLayoutPass<T>(owner: object, pass: LayoutPass<T>): void {
  pending.set(owner, pass as LayoutPass<never>);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(runLayoutPasses);
}

/** Runs every pending pass now (also used by tests). */
export function runLayoutPasses(): void {
  scheduled = false;
  const batch = [...pending.values()].filter((pass) => pass.active?.() ?? true);
  pending.clear();
  for (const pass of batch) pass.write?.();
  const measured = batch.map((pass) => pass.measure());
  batch.forEach((pass, index) => pass.apply?.(measured[index] as never));
}
