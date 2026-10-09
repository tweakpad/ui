import '/src/register.ts';
import type { TpDialog } from '../../../../src/components/dialog/index.js';
const controlled = document.querySelector<TpDialog>('#controlled')!;
controlled.open = false;
const events: unknown[] = [];
for (const dialog of document.querySelectorAll<TpDialog>('tp-alert-dialog, tp-dialog, tp-drawer')) {
  dialog.addEventListener('tp-open-change', (event: Event) => {
    if (event.target !== dialog) return;
    const detail = (event as CustomEvent).detail;
    events.push({ id: dialog.id, kind: 'proposal', value: detail.value, reason: detail.reason });
  });
  dialog.addEventListener('tp-open-change-complete', (event: Event) => {
    if (event.target !== dialog) return;
    events.push({ id: dialog.id, kind: 'complete', ...(event as CustomEvent).detail });
  });
  dialog
    .querySelector<HTMLElement>(':scope > [slot="confirm"]')
    ?.addEventListener('click', (event) => dialog.setOpen(false, 'close-action', event));
}
Object.assign(window, { fixtureEvents: events });

document
  .querySelector('#save')!
  .addEventListener('click', (event) =>
    document.querySelector<TpDialog>('#legacy')!.setOpen(false, 'close-action', event),
  );
import { setPresentationDictionary, defaultPresentationDictionary } from '../../../../src/index.js';
Object.assign(window, { fixtureAPI: { setPresentationDictionary, defaultPresentationDictionary } });
