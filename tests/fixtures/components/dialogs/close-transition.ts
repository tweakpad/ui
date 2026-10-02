import type { TpDialog } from '../../../../src/components/dialog/index.js';

/** Run through Chrome DevTools MCP against source and built fixtures. */
export async function inspectCloseTransition(dialog: TpDialog) {
  dialog.setOpen(true);
  await dialog.updateComplete;
  await waitUntil(() => dialog.presenceState === 'open');
  // Presence marks open before the entry backdrop transition completes.
  await new Promise((resolve) => setTimeout(resolve, 500));
  const layer = dialog.shadowRoot!.querySelector('dialog')!;
  const initialHeight = layer.getBoundingClientRect().height;
  let completions = 0;
  const onComplete = (event: Event) => {
    if (!(event as CustomEvent).detail.open) completions++;
  };
  dialog.addEventListener('tp-open-change-complete', onComplete);
  dialog.close();
  await dialog.updateComplete;
  const closedInUpdate = !layer.open && !layer.matches(':popover-open') && !layer.matches(':modal');
  await new Promise(requestAnimationFrame);
  const hiddenOnNextFrame = layer.getBoundingClientRect().height === 0;
  dialog.removeEventListener('tp-open-change-complete', onComplete);
  return {
    pass: initialHeight > 0 && closedInUpdate && hiddenOnNextFrame && completions === 1,
    closedInUpdate,
    hiddenOnNextFrame,
    completions,
  };
}
async function waitUntil(predicate: () => boolean): Promise<void> {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > 2000) throw new Error('Dialog transition did not settle');
    await new Promise(requestAnimationFrame);
  }
}

/** Native focus restoration during a modality handoff must not propose closing. */
export async function inspectModalityChanges(dialog: TpDialog) {
  dialog.setOpen(true);
  await dialog.updateComplete;
  const results = [];
  for (const modality of ['non-modal', 'trap-focus-only', 'modal'] as const) {
    dialog.modality = modality;
    await dialog.updateComplete;
    const layer = dialog.shadowRoot!.querySelector('dialog')!;
    results.push({
      modality,
      pass: dialog.open && layer.matches(':modal') === (modality === 'modal'),
    });
  }
  dialog.close();
  return results;
}

/** Opening an overlay must not add a flow box beside/below its trigger. */
export async function inspectTriggerLayout(dialog: TpDialog, following: HTMLElement) {
  const before = following.getBoundingClientRect().top;
  dialog.setOpen(true);
  await dialog.updateComplete;
  await new Promise(requestAnimationFrame);
  const after = following.getBoundingClientRect().top;
  dialog.close();
  await dialog.updateComplete;
  return { pass: Math.abs(after - before) < 0.5, before, after };
}
