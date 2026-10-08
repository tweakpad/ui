const params = new URLSearchParams(location.search);

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

const log: { id: string; type: string; detail: unknown; time: number }[] = [];
for (const type of ['tp-reveal-change', 'tp-reveal-change-complete', 'tp-loading-status-change'])
  document.addEventListener(type, (event) => {
    const target = event.composedPath()[0] as HTMLElement;
    log.push({
      id: target.id,
      type,
      detail: (event as CustomEvent).detail,
      time: Math.round(performance.now()),
    });
  });
const progress: Record<string, number[]> = {};
document.addEventListener('tp-scroll-progress', (event) => {
  const target = event.composedPath()[0] as HTMLElement;
  (progress[target.id] ??= []).push((event as CustomEvent<{ progress: number }>).detail.progress);
});

const photo = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?w=${width}&q=70&auto=format&fit=crop`;
const row = document.querySelector('#pinned-images')!;
for (const [index, id] of [
  'photo-1497366754035-f200968a6e72',
  'photo-1497215728101-856f4ea42174',
  'photo-1548516173-3cabfa4607e9',
].entries()) {
  const image = document.createElement('tp-image');
  image.id = `pinned-image-${index}`;
  image.setAttribute('ratio', '1.333');
  image.setAttribute('src', photo(id, 640));
  image.setAttribute('alt', '');
  row.append(image);
}

const flowPositions = () =>
  [...document.querySelectorAll<HTMLElement>('.flow, tp-scroll-trigger')].map((element) =>
    Math.round(element.getBoundingClientRect().top + scrollY),
  );
const pageHeight = () => document.documentElement.scrollHeight;
const beforeDefinition = { positions: flowPositions(), height: pageHeight() };

const define = async () => {
  const api = await import('/src/index.ts');
  for (const element of [api.TpTextMotion, api.TpScrollTrigger, api.TpImage, api.TpImageGroup])
    api.defineElement(element.tagName, element);
};
const defer = Number(params.get('defer') ?? 0);
if (defer) setTimeout(define, defer);
else await define();

Object.assign(window, {
  triggerLog: log,
  scrollProgress: progress,
  layoutShifts: shifts,
  flowPositions,
  pageHeight,
  beforeDefinition,
});
