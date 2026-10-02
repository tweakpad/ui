const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
const { plusIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/plus.js' : '/src/icons/plus.ts'
);
for (const icon of document.querySelectorAll('tp-icon')) Object.assign(icon, { icon: plusIcon });
Object.assign(document.getElementById('button-regression')!, { nativeAction: false });
const events: unknown[] = [];
document.addEventListener('tp-value-change', (event) => {
  const e = event as CustomEvent;
  events.push({
    id: (e.target as HTMLElement).id,
    ...e.detail,
    sourceEvent: e.detail.sourceEvent.type,
  });
});
let submits = 0;
document.getElementById('form')!.addEventListener('submit', (event) => {
  event.preventDefault();
  submits++;
});
Object.assign(window, { tabsAPI: api, tabsEvents: events, getSubmits: () => submits });
await Promise.all(
  [...document.querySelectorAll('tp-tabs')].map(
    (element) => (element as unknown as { updateComplete: Promise<unknown> }).updateComplete,
  ),
);
document.documentElement.dataset.ready = '';
