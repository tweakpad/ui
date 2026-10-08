const params = new URLSearchParams(location.search);
const built = params.has('built');
if (built) document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';

// Layout shifts are recorded from the start, before any element is defined.
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
          ? `${source.node.localName}${source.node.id ? '#' + source.node.id : ''}.${source.node.className}`
          : String(source.node?.nodeName),
      ),
    });
}).observe({ type: 'layout-shift', buffered: true });

/** Positions of every flow paragraph, to compare before and after definition. */
const flowPositions = () =>
  [...document.querySelectorAll<HTMLElement>('.flow, section.case')].map((element) =>
    Math.round(element.getBoundingClientRect().top + scrollY),
  );

const log: { id: string; type: string; detail: unknown; time: number }[] = [];
for (const type of [
  'tp-reveal-change',
  'tp-reveal-change-complete',
  'tp-loading-status-change',
  'tp-text-split',
  'tp-diagnostic',
])
  document.addEventListener(type, (event) => {
    const target = event.composedPath()[0] as HTMLElement;
    const detail = (event as CustomEvent).detail;
    log.push({
      id: target.id,
      type,
      detail:
        type === 'tp-text-split'
          ? Object.fromEntries(Object.entries(detail).map(([key, list]) => [key, (list as unknown[]).length]))
          : detail,
      time: Math.round(performance.now()),
    });
  });

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?w=${width}&q=70&auto=format&fit=crop`;
const photos = [
  'photo-1497366754035-f200968a6e72',
  'photo-1497215728101-856f4ea42174',
  'photo-1465869185982-5a1a7522cbcb',
];
const row = document.querySelector('#trigger-images')!;
for (const [index, id] of photos.entries()) {
  const image = document.createElement('tp-image');
  image.id = `trigger-image-${index}`;
  image.setAttribute('ratio', '1.333');
  image.setAttribute('src', photo(id, 640));
  image.setAttribute('alt', `Interior ${index + 1}`);
  row.append(image);
}

const stress = Number(params.get('stress') ?? 0);
if (stress) {
  document.querySelector<HTMLElement>('#case-stress')!.hidden = false;
  const grid = document.querySelector('#stress')!;
  for (let index = 0; index < stress; index++) {
    const text = document.createElement('tp-text-motion');
    text.setAttribute('split', index % 3 === 0 ? 'chars' : 'words lines');
    if (index % 2) text.setAttribute('mask', 'lines');
    text.textContent = `Card ${index + 1}: quiet spaces and open light for every room`;
    grid.append(text);
  }
}

// Recorded once all content exists, before any element is defined.
const beforeDefinition = flowPositions();

const define = async () => {
  const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
  for (const element of [api.TpTextMotion, api.TpScrollTrigger, api.TpImage, api.TpImageGroup])
    api.defineElement(element.tagName, element);
};
// `?defer=ms` defines the elements late, to compare layout before and after definition.
const defer = Number(params.get('defer') ?? 0);
if (defer) setTimeout(define, defer);
else await define();

Object.assign(window, {
  textLog: log,
  layoutShifts: shifts,
  flowPositions,
  beforeDefinition,
});
