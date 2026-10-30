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
for (const type of ['tp-diagnostic'])
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
  [...document.querySelectorAll<HTMLElement>('.flow, section.case, tp-mo-glow-border > *')].map(
    (element) => {
      const rect = element.getBoundingClientRect();
      return [Math.round(rect.left), Math.round(rect.top + scrollY), Math.round(rect.width)];
    },
  );
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
for (const element of [
  api.TpCard,
  api.TpButton,
  api.TpToggle,
  api.TpInput,
  api.TpTextArea,
  api.TpSelect,
  api.TpSelectOption,
  api.TpNativeSelect,
  api.TpInputGroup,
])
  api.defineElement(element.tagName, element);
// The surfaces are defined and rendered; positions are recorded before the border is defined.
await Promise.all(
  [...document.querySelectorAll<HTMLElement & { updateComplete?: Promise<unknown> }>('*')]
    .filter((element) => element.updateComplete)
    .map((element) => element.updateComplete),
);
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const beforeDefinition = flowPositions();
const shiftsBefore = shifts.length;
api.defineElement(api.TpMoGlowBorder.tagName, api.TpMoGlowBorder);

const point = document.querySelector<HTMLElement & { trackPoint: unknown }>('#point')!;
const placePoint = () => {
  const rect = point.getBoundingClientRect();
  point.trackPoint = { x: rect.left - 20, y: rect.top - 20 };
};
// The point is in viewport coordinates: placed once the page has settled, and again on scroll.
await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
placePoint();
addEventListener('scroll', placePoint, { passive: true });
addEventListener('resize', placePoint);

// The beacon circles the following card.
const beacon = document.querySelector<HTMLElement>('#beacon')!;
const orbit = (time: number) => {
  const angle = time / 900;
  beacon.style.left = `calc(50% + ${Math.cos(angle) * 140}px - 6px)`;
  beacon.style.top = `calc(50% + ${Math.sin(angle) * 100}px - 6px)`;
  requestAnimationFrame(orbit);
};
requestAnimationFrame(orbit);

/** The drawn ring against its surface: boxes, radii, the surface's border, and the line. */
const geometry = (id: string) => {
  const border = document.getElementById(id)!;
  const root = border.shadowRoot!;
  const ring = root.querySelector<SVGSVGElement>('.ring')!;
  const line = root.querySelector<SVGPathElement>('.line')!;
  const ringRect = ring.getBoundingClientRect();
  const child = border.firstElementChild as (HTMLElement & { renderRoot?: ShadowRoot }) | null;
  const parts: Record<string, string> = {
    'TP-CARD': 'card',
    'TP-BUTTON': 'button',
    'TP-TOGGLE': 'toggle',
    'TP-INPUT': 'input',
    'TP-TEXT-AREA': 'text-area',
    'TP-SELECT': 'select-trigger',
    'TP-NATIVE-SELECT': 'native-select-control',
    'TP-INPUT-GROUP': 'input-group',
  };
  const part = child ? parts[child.tagName] : undefined;
  const surface =
    (part &&
      (child!.renderRoot?.querySelector<HTMLElement>(`[part~="${part}"]`) ??
        child!.querySelector<HTMLElement>(`[part~="${part}"]`))) ||
    child ||
    border;
  const rect = surface.getBoundingClientRect();
  const style = getComputedStyle(surface);
  const lineStyle = getComputedStyle(line);
  return {
    ring: [ringRect.left, ringRect.top, ringRect.width, ringRect.height].map(Math.round),
    surface: [rect.left, rect.top, rect.width, rect.height].map(Math.round),
    radius: style.borderTopLeftRadius,
    path: line.getAttribute('d')?.slice(0, 40),
    surfaceBorder: { color: style.borderTopColor, width: style.borderTopWidth },
    line: {
      stroke: lineStyle.stroke,
      width: lineStyle.strokeWidth,
    },
    host: getComputedStyle(border).display,
  };
};

/**
 * The glow canvas along the line: `count` points at even distances from the start of the top
 * edge, each with its alpha and color (0 to 255) read from the canvas pixels.
 */
const profile = (id: string, count = 240) => {
  const border = document.getElementById(id)!;
  const root = border.shadowRoot!;
  const line = root.querySelector<SVGPathElement>('.line')!;
  const canvas = root.querySelector<HTMLCanvasElement>('canvas.glow');
  if (!canvas) return [];
  const ring = root.querySelector('.ring')!.getBoundingClientRect();
  const box = canvas.getBoundingClientRect();
  const scale = canvas.width / box.width;
  const context = canvas.getContext('2d')!;
  const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const total = line.getTotalLength();
  return Array.from({ length: count }, (_, index) => {
    const point = line.getPointAtLength((total * index) / count);
    const x = Math.round((point.x + ring.left - box.left) * scale);
    const y = Math.round((point.y + ring.top - box.top) * scale);
    const offset = (y * canvas.width + x) * 4;
    return {
      a: data[offset + 3]!,
      r: data[offset]!,
      g: data[offset + 1]!,
      b: data[offset + 2]!,
    };
  });
};

/** Positions (fractions of the border) of the brightest point of each lit run along the line. */
const peaks = (id: string, count = 240, floor = 40) => {
  const points = profile(id, count);
  const runs: { start: number; best: number; alpha: number }[] = [];
  let run: { start: number; best: number; alpha: number } | null = null;
  points.forEach((point, index) => {
    if (point.a > floor) {
      if (!run) runs.push((run = { start: index, best: index, alpha: point.a }));
      else if (point.a > run.alpha) Object.assign(run, { best: index, alpha: point.a });
    } else run = null;
  });
  // A run that wraps over the start joins the last run.
  if (runs.length > 1 && points[0]!.a > floor && points[count - 1]!.a > floor) {
    const first = runs.shift()!;
    const last = runs[runs.length - 1]!;
    if (first.alpha > last.alpha) Object.assign(last, { best: first.best, alpha: first.alpha });
  }
  return runs.map((value) => value.best / count);
};

/**
 * A design review stage over the page: large cards, one per entry, each a Glow border with the given
 * attributes around a Card. Returns the borders; `unstage()` removes it.
 */
const stage = (
  entries: { attrs?: Record<string, string>; style?: string; title?: string }[],
  { columns = 2, width = '' } = {},
) => {
  document.querySelector('#stage')?.remove();
  const wrap = document.createElement('div');
  wrap.id = 'stage';
  wrap.style.cssText = `position:fixed;inset:0;z-index:9;background:var(--tp-background);display:grid;grid-template-columns:repeat(${columns},1fr);gap:56px;padding:72px;align-content:center;justify-items:center`;
  const borders = entries.map(({ attrs = {}, style = '', title = 'Tide station 7' }) => {
    const border = document.createElement('tp-mo-glow-border');
    for (const [name, value] of Object.entries(attrs)) border.setAttribute(name, value);
    border.style.cssText = `inline-size:${width || '100%'};${style}`;
    border.innerHTML = `<tp-card><h3 slot="header">${title}</h3><span slot="description">Readings every ten minutes from the north pier.</span><p style="margin:0">Water level 2.4 m and rising.</p></tp-card>`;
    wrap.append(border);
    return border;
  });
  document.body.append(wrap);
  return borders;
};
const unstage = () => document.querySelector('#stage')?.remove();

Object.assign(window, {
  borderLog: log,
  layoutShifts: shifts,
  /** Layout shifts after the border was defined. */
  borderShifts: () => shifts.slice(shiftsBefore),
  flowPositions,
  beforeDefinition,
  geometry,
  profile,
  peaks,
  stage,
  unstage,
});
