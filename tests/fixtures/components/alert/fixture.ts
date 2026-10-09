import type { TpIcon } from '../../../../src/index.js';

const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const { plusIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/plus.js' : '/src/icons/plus.ts'
);
for (const icon of document.querySelectorAll<TpIcon>('tp-icon')) icon.icon = plusIcon;
const actions: string[] = [];
document.querySelector('main')!.addEventListener('click', (event) => {
  const button = event
    .composedPath()
    .find((node) => node instanceof HTMLElement && node.localName === 'tp-button') as
    HTMLElement | undefined;
  if (button) actions.push(button.id || button.textContent!.trim());
});
Object.assign(window, { alertAPI: api, alertActions: actions });
await Promise.all(
  [...document.querySelectorAll('tp-alert, tp-button, tp-icon, tp-badge')].map(
    (element) => (element as unknown as { updateComplete: Promise<unknown> }).updateComplete,
  ),
);
document.documentElement.dataset.ready = '';
