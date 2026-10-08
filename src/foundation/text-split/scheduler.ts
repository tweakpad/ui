/**
 * Batched line passes (Foundation §18.19 `tm-lines`): every splitter that needs its lines
 * recalculated in the same turn is flattened first, then all are measured in one layout, then all
 * write their lines, so a resize costs one forced layout however many texts it affects. Passes
 * run in a microtask, which completes before the next paint.
 */
export interface LinePass {
  /** Whether the pass is still wanted when the batch runs. */
  active(): boolean;
  flatten(): void;
  measure(): DOMRect[][];
  relayout(boxes: DOMRect[][]): void;
}

const pending = new Set<LinePass>();
let scheduled = false;

export function scheduleLinePass(pass: LinePass): void {
  pending.add(pass);
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(runLinePasses);
}

/** Runs every pending pass now (also used by tests). */
export function runLinePasses(): void {
  scheduled = false;
  const batch = [...pending].filter((pass) => pass.active());
  pending.clear();
  for (const pass of batch) pass.flatten();
  const boxes = batch.map((pass) => pass.measure());
  batch.forEach((pass, index) => pass.relayout(boxes[index]!));
}
