const params = new URLSearchParams(location.search);
const built = params.has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel=stylesheet]')!.href = '/dist/styles.css';

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
          ? `${source.node.localName}${source.node.id ? '#' + source.node.id : ''}`
          : String(source.node?.nodeName),
      ),
    });
}).observe({ type: 'layout-shift', buffered: true });

const log: { id: string; type: string; detail: unknown; time: number }[] = [];
for (const type of ['tp-reveal-change', 'tp-reveal-change-complete', 'tp-diagnostic'])
  document.addEventListener(type, (event) => {
    const target = event.composedPath()[0] as HTMLElement;
    log.push({
      id: target.id,
      type,
      detail: (event as CustomEvent).detail,
      time: Math.round(performance.now()),
    });
  });

/** Positions of every flow paragraph and case, to compare before and after definition. */
const flowPositions = () =>
  [...document.querySelectorAll<HTMLElement>('.flow, section.case, .resizable')].map((element) =>
    Math.round(element.getBoundingClientRect().top + scrollY),
  );
// Recorded once all content exists, before any element is defined.
const beforeDefinition = flowPositions();

const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
for (const element of [api.TpMoTextStroke, api.TpScrollTrigger, api.TpButton])
  api.defineElement(element.tagName, element);

const hold = document.querySelector<HTMLElement & { revealHold: boolean }>('#hold')!;
const toggle = document.querySelector<HTMLElement>('#hold-toggle')!;
toggle.addEventListener('click', () => {
  hold.revealHold = !hold.revealHold;
  toggle.textContent = hold.revealHold ? 'Reveal' : 'Hide';
});

/** Each piece's fill and outline state, by element id. */
const sample = (id: string) =>
  [...document.querySelectorAll<HTMLElement>(`#${id} [data-tp-animate]`)].map((piece) => {
    const outline = piece.querySelector('[data-tp-outline]');
    const text = outline?.querySelector('text');
    return {
      text: piece.textContent,
      fill: getComputedStyle(piece).webkitTextFillColor,
      outline: outline ? getComputedStyle(outline).opacity : null,
      dash: text ? getComputedStyle(text).strokeDashoffset : null,
    };
  });

Object.assign(window, {
  textLog: log,
  layoutShifts: shifts,
  sample,
  flowPositions,
  beforeDefinition,
});
