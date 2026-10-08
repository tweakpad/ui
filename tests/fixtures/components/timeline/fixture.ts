import { checkIcon } from '../../../../src/icons/check.js';

const params = new URLSearchParams(location.search);
const built = params.has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';

const shifts: { value: number; sources: string[] }[] = [];
new PerformanceObserver((list) => {
  for (const entry of list.getEntries() as (PerformanceEntry & {
    value: number;
    sources?: { node?: Node }[];
  })[])
    shifts.push({
      value: entry.value,
      sources: (entry.sources ?? []).map((source) =>
        source.node instanceof Element
          ? `${source.node.localName}${source.node.id ? '#' + source.node.id : ''}`
          : String(source.node?.nodeName),
      ),
    });
}).observe({ type: 'layout-shift', buffered: true });

const diagnostics: unknown[] = [];
const motions: unknown[] = [];
document.addEventListener('tp-diagnostic', (event) =>
  diagnostics.push((event as CustomEvent).detail),
);
document.addEventListener('tp-motion-request', (event) => {
  const request = (event as Event & { request?: Record<string, unknown> }).request;
  motions.push(
    request ? { role: request.role, from: request.fromState, to: request.toState } : null,
  );
});

// `?standalone` defines only the Timeline, to check that it brings its own dependencies.
if (params.has('standalone')) {
  const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
  api.defineElement(api.TpTimeline.tagName, api.TpTimeline);
} else {
  await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
}

for (const icon of document.querySelectorAll<HTMLElement & { icon: unknown }>('tp-icon.check'))
  icon.icon = checkIcon;

const base = document.querySelector<HTMLElement & { value: string | null; items: HTMLElement[] }>(
  '#base',
)!;
const values = () => base.items.map((item) => (item as HTMLElement & { value: string }).value);
const step = (delta: number) => {
  const list = values();
  const index = Math.max(0, Math.min(list.length - 1, list.indexOf(base.value ?? '') + delta));
  base.value = list[index] ?? null;
};
document.querySelector('#prev')?.addEventListener('click', () => step(-1));
document.querySelector('#next')?.addEventListener('click', () => step(1));
document.querySelector('#clear')?.addEventListener('click', () => (base.value = null));
let added = 0;
document.querySelector('#add')?.addEventListener('click', () => {
  const item = document.createElement('tp-timeline-item') as HTMLElement & { value: string };
  item.value = `extra-${++added}`;
  item.innerHTML = `<span class="title">Extra ${added}</span>`;
  base.append(item);
});
document
  .querySelector('#remove')
  ?.addEventListener('click', () => base.firstElementChild?.remove());
document.querySelector('#reverse')?.addEventListener('click', () => {
  for (const item of [...base.children].reverse()) base.append(item);
});

Object.assign(window, {
  layoutShifts: shifts,
  timelineDiagnostics: diagnostics,
  timelineMotions: motions,
});
