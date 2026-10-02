import '/src/register.ts';
import type { TpAlertDialog } from '../../../../src/components/alert-dialog/index.js';
const controlled = document.querySelector<TpAlertDialog>('#controlled')!;
controlled.open = false;
const events: unknown[] = [];
for (const dialog of document.querySelectorAll<TpAlertDialog>('tp-alert-dialog')) {
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
