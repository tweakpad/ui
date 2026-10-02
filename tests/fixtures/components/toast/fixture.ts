import type { TpToast, ToastCause } from '../../../../src/components/toast/index.js';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const toaster = document.querySelector<TpToast>('#toaster')!;
await toaster.updateComplete;
const callbacks: {
  phase: 'close' | 'remove';
  identifier: string;
  cause: ToastCause;
  time: number;
}[] = [];
const actions: string[] = [];
let count = 0;
function add(extra: Record<string, unknown> = {}) {
  const identifier = `fixture-${++count}`;
  return toaster.add({
    identifier,
    title: `Event ${count} created`,
    description: 'Your changes are saved. Continue working while this notification is visible.',
    type: 'success',
    actionProperties: { label: 'Undo', onClick: () => actions.push(identifier) },
    onClose: (cause) =>
      callbacks.push({ phase: 'close', identifier, cause, time: performance.now() }),
    onRemove: (cause) =>
      callbacks.push({ phase: 'remove', identifier, cause, time: performance.now() }),
    ...extra,
  });
}
document.querySelector('#add')!.addEventListener('click', () => add());
document.querySelector('#stack')!.addEventListener('click', () => {
  for (let index = 0; index < 5; index++)
    add({
      description:
        index % 2
          ? 'A short message.'
          : 'Long message: a saved change with details that wrap across several lines without clipping.',
    });
});
document.querySelector('#promise')!.addEventListener('click', () => {
  void toaster.manager.promise(
    new Promise<string>((resolve) => window.setTimeout(() => resolve('Operation'), 900)),
    {
      loading: 'Saving changes…',
      success: (name) => `${name} completed`,
      error: 'Saving failed',
    },
  );
});
document.querySelector('#anchored')!.addEventListener('click', () =>
  add({
    title: 'Anchored notification',
    description: 'This message stays near its source.',
    positionerProperties: {
      anchor: document.querySelector('#anchored'),
      side: 'top',
      sideOffset: 10,
      showArrow: true,
    },
  }),
);
document.querySelector('#reset')!.addEventListener('click', () => toaster.close());
Object.assign(window, {
  toastAPI: api,
  toastHarness: { toaster, add, callbacks, actions, manager: toaster.manager },
});
await Promise.all(
  [...document.querySelectorAll('tp-toast,tp-button,tp-input')].map(
    (element) => (element as unknown as { updateComplete: Promise<unknown> }).updateComplete,
  ),
);
document.documentElement.dataset.ready = '';
