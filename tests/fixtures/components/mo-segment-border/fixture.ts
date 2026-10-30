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
  [
    ...document.querySelectorAll<HTMLElement>(
      '.flow, section.case, tp-mo-segment-border > :not(tp-mo-border-segment)',
    ),
  ].map((element) => {
    const rect = element.getBoundingClientRect();
    return [Math.round(rect.left), Math.round(rect.top + scrollY), Math.round(rect.width)];
  });
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
api.defineElement(api.TpMoBorderSegment.tagName, api.TpMoBorderSegment);
api.defineElement(api.TpMoSegmentBorder.tagName, api.TpMoSegmentBorder);

/** The drawn ring against its surface: boxes, radii, the surface's border, and the line. */
const geometry = (id: string) => {
  const border = document.getElementById(id)!;
  const root = border.shadowRoot!;
  const ring = root.querySelector<SVGSVGElement>('.ring')!;
  const line = root.querySelector<SVGPathElement>('.line')!;
  const ringRect = ring.getBoundingClientRect();
  const child = border.querySelector(':scope > :not(tp-mo-border-segment)') as
    (HTMLElement & { renderRoot?: ShadowRoot }) | null;
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

/** Each plain segment line: visibility, dash array and offset, sampled `count` times `every` ms apart. */
const sampleSegments = (id: string, count = 6, every = 80) =>
  new Promise((resolve) => {
    const lines = [
      ...document.getElementById(id)!.shadowRoot!.querySelectorAll<SVGPathElement>('path.segment'),
    ];
    const samples: string[][] = [];
    const take = () => {
      samples.push(
        lines.map(
          (line) =>
            `${line.getAttribute('visibility')} ${line.getAttribute('stroke-dasharray')} ${line.getAttribute('stroke-dashoffset')}`,
        ),
      );
      if (samples.length < count) setTimeout(take, every);
      else resolve(samples);
    };
    take();
  });

/**
 * Where each visible plain segment starts and ends, in pixels from the ring's top-left corner,
 * with the ring's size and corner radius: ends that name a corner sit on the middle of its arc.
 */
const segmentEnds = (id: string) => {
  const root = document.getElementById(id)!.shadowRoot!;
  const line = root.querySelector<SVGPathElement>('.line')!;
  const total = line.getTotalLength();
  const box = line.getBBox();
  const round = ([x, y]: number[]) => [Math.round(x! * 10) / 10, Math.round(y! * 10) / 10];
  const at = (fraction: number) => {
    const point = line.getPointAtLength(total * (fraction - Math.floor(fraction)));
    return round([point.x - box.x, point.y - box.y]);
  };
  const segments = [...root.querySelectorAll<SVGPathElement>('path.segment')]
    .filter((path) => path.getAttribute('visibility') === 'visible')
    .map((path) => {
      const length = Number(path.getAttribute('stroke-dasharray')!.split(' ')[0]);
      const start = -Number(path.getAttribute('stroke-dashoffset'));
      return { start: at(start), end: at(start + length) };
    });
  return { size: round([box.width, box.height]), segments };
};

Object.assign(window, {
  borderLog: log,
  layoutShifts: shifts,
  /** Layout shifts after the border was defined. */
  borderShifts: () => shifts.slice(shiftsBefore),
  flowPositions,
  beforeDefinition,
  geometry,
  profile,
  sampleSegments,
  segmentEnds,
});
