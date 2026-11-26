import {
  axisDetail,
  axisLabel,
  axisTicks,
  niceDomain,
  type AxisDomain,
  type AxisOptions,
} from '../../foundation/chart-axis.js';
import type {
  ChartAxis,
  ChartDomain,
  ChartPayload,
  ChartRenderer,
  ChartSnapshot,
  ChartType,
} from './types.js';
import { finite, node, stepKey, svgAnchor, textMeasure, valueWords } from './svg.js';

let clips = 0;

/** What the built-in marks read from their Chart besides the snapshot. */
export interface CartesianOptions {
  readonly type: ChartType;
  readonly stacked: boolean;
  readonly xAxis: ChartAxis | false;
  readonly yAxis: ChartAxis | false;
  readonly xDomain: ChartDomain;
  readonly yDomain: ChartDomain;
  /** Resolved colors of values below zero, by series key. */
  readonly negativeColors: Readonly<Record<string, string>>;
  readonly label: string;
  readonly locale?: string;
  /** The text that labels each series at the end of its line, when the legend is `inline`. */
  readonly inline?: (key: string) => string;
}

/** One series value at one row, and where a stacked bar draws it. */
interface Cell {
  readonly value: number | null;
  readonly from: number;
  readonly to: number;
}

/** Everything one paint needs, computed from the snapshot and the options. */
interface Model {
  readonly keys: readonly string[];
  readonly rows: readonly Record<string, unknown>[];
  readonly cells: readonly (readonly Cell[])[];
  /** The x pixel of each row. */
  readonly xs: readonly number[];
  /** The width, in pixels, each row's position owns. */
  readonly band: number;
  readonly py: (value: number) => number;
  readonly yDomain: AxisDomain;
  readonly yTicks: readonly number[];
  readonly xTicks: readonly { readonly x: number; readonly label: string }[];
  readonly x0: number;
  readonly x1: number;
  readonly y0: number;
  readonly y1: number;
  /** The full label of a row's position, for the tooltip. */
  readonly detail: (index: number) => string;
}

/** A position value of the x axis as a number: a timestamp on time axes. */
function position(value: unknown, type: ChartAxis['type']): number {
  if (value instanceof Date) return value.getTime();
  if (type === 'time' && typeof value === 'string') return Date.parse(value);
  return Number(value);
}

/** The axis options the shared tick and label functions read. */
function axisOf(axis: ChartAxis, type: 'number' | 'time'): AxisOptions {
  const options: AxisOptions & { key?: string } = { ...axis, type };
  delete options.key;
  return options;
}

/** A bar from `base` to `end` (pixels) with its far corners rounded. */
function barPath(x: number, width: number, base: number, end: number, radius: number): string {
  const height = Math.abs(end - base);
  const r = Math.max(0, Math.min(radius, width / 2, height));
  const dir = end < base ? 1 : -1;
  return [
    `M${x},${base}`,
    `V${end + dir * r}`,
    `Q${x},${end} ${x + r},${end}`,
    `H${x + width - r}`,
    `Q${x + width},${end} ${x + width},${end + dir * r}`,
    `V${base}`,
    'Z',
  ].join('');
}

/** Lays the chart out: scales, ticks and the plot rectangle inside the measured size. */
function model(
  snapshot: ChartSnapshot,
  options: CartesianOptions,
  measure: (text: string) => number,
): Model {
  const keys = Object.keys(snapshot.series);
  const rows = snapshot.data;
  const { width, height } = snapshot;
  const xa: ChartAxis = options.xAxis || {};
  const ya: ChartAxis = options.yAxis || {};
  const xType = xa.type ?? 'category';
  const environment = options.locale ? { locale: options.locale } : {};
  const bars = options.type === 'bar' || options.type === 'lollipop';

  // Values, and the stacked extents of each row.
  const cells = rows.map((row) => {
    let up = 0,
      down = 0;
    return keys.map((key): Cell => {
      const value = finite(row[key]);
      if (value === null) return { value, from: 0, to: 0 };
      if (!(options.stacked && options.type === 'bar')) return { value, from: 0, to: value };
      const from = value >= 0 ? up : down;
      if (value >= 0) up += value;
      else down += value;
      return { value, from, to: from + value };
    });
  });
  let low = Infinity,
    high = -Infinity;
  for (const row of cells)
    for (const cell of row)
      if (cell.value !== null) {
        low = Math.min(low, cell.from, cell.to);
        high = Math.max(high, cell.from, cell.to);
      }
  if (bars) {
    low = Math.min(low, 0);
    high = Math.max(high, 0);
  }
  if (!Number.isFinite(low)) [low, high] = [0, 1];
  const yNumber = axisOf(ya, 'number');
  const yDomain: AxisDomain =
    options.yDomain === 'auto' ? niceDomain(low, high, yNumber) : options.yDomain;
  const yTicks = axisTicks(yDomain, yNumber);

  // Margins from what the axes show.
  const yLabels =
    ya.labels === false || !options.yAxis
      ? []
      : yTicks.map((t) => axisLabel(yNumber, t, 0, environment));
  const left = options.yAxis
    ? (yLabels.length ? Math.max(...yLabels.map(measure)) + 8 : 0) +
      (ya.ticks === false ? 0 : 6) +
      (ya.title ? 20 : 0)
    : 0;
  const bottom = options.xAxis
    ? (xa.labels === false ? 0 : 20) + (xa.ticks === false ? 0 : 6) + (xa.title ? 20 : 0)
    : 0;
  // Inline labels stand past the end of the lines.
  const right =
    options.inline && options.type === 'line'
      ? Math.max(0, ...keys.map((key) => measure(options.inline!(key)))) + 12
      : 8;
  const x0 = Math.max(left, 4),
    x1 = Math.max(x0 + 1, width - right),
    y0 = 8,
    y1 = Math.max(y0 + 1, height - Math.max(bottom, 4));

  // The x scale: categories own equal bands; numbers and times are linear, with half a step of
  // room at either end for bars.
  const raw = rows.map((row, index) => (xa.key ? row[xa.key] : index));
  const numbers =
    xType === 'category' ? rows.map((_, index) => index) : raw.map((v) => position(v, xType));
  let step = 1;
  if (xType !== 'category') {
    const sorted = numbers.filter(Number.isFinite).sort((a, b) => a - b);
    let smallest = Infinity;
    for (let i = 1; i < sorted.length; i++)
      if (sorted[i]! > sorted[i - 1]!) smallest = Math.min(smallest, sorted[i]! - sorted[i - 1]!);
    step = Number.isFinite(smallest) ? smallest : 1;
  }
  let xDomain: AxisDomain;
  if (xType === 'category') xDomain = [-0.5, Math.max(0, rows.length - 1) + 0.5];
  else if (options.xDomain !== 'auto') xDomain = options.xDomain;
  else {
    const finiteNumbers = numbers.filter(Number.isFinite);
    const min = finiteNumbers.length ? Math.min(...finiteNumbers) : 0,
      max = finiteNumbers.length ? Math.max(...finiteNumbers) : 1;
    xDomain = bars || min === max ? [min - step / 2, max + step / 2] : [min, max];
  }
  const span = xDomain[1] - xDomain[0] || 1;
  const px = (value: number) => x0 + ((value - xDomain[0]) / span) * (x1 - x0);
  const xs = numbers.map(px);
  const band = (step / span) * (x1 - x0);
  const py = (value: number) =>
    y1 - ((value - yDomain[0]) / (yDomain[1] - yDomain[0] || 1)) * (y1 - y0);

  // X ticks: every row's name on categories, thinned until the names fit; nice ticks otherwise.
  let xTicks: { x: number; label: string }[] = [];
  if (options.xAxis && xa.labels !== false) {
    if (xType === 'category') {
      const names = raw.map((v) => (v === undefined || v === null ? '' : String(v)));
      const widest = names.length ? Math.max(...names.map(measure)) : 0;
      const every = Math.max(1, Math.ceil((widest + 16) / Math.max(1, band)));
      xTicks = names
        .map((label, index) => ({ x: xs[index]!, label }))
        .filter((_, index) => index % every === 0);
    } else {
      const axis = axisOf(xa, xType);
      const values = axisTicks(xDomain, {
        ...axis,
        tickCount: xa.tickCount ?? Math.max(2, Math.floor((x1 - x0) / 80)),
      });
      // Labels as fine as the ticks are apart: hours for ticks hours apart, days otherwise.
      const spacing = values.length > 1 ? values[1]! - values[0]! : span;
      xTicks = values.map((value) => ({
        x: px(value),
        label: axisLabel(axis, value, spacing, environment),
      }));
    }
  }
  const detail = (index: number) =>
    xType === 'category'
      ? String(raw[index] ?? '')
      : axisDetail(axisOf(xa, xType), numbers[index]!, environment);
  return { keys, rows, cells, xs, band, py, yDomain, yTicks, xTicks, x0, x1, y0, y1, detail };
}

/**
 * The marks a Chart draws itself: lines, bars (grouped or stacked, hanging below zero for
 * negative values) and lollipops on a category, number or time x axis, with dashed grid lines,
 * axes, and inspection by pointer and keyboard that reports every series at one x position.
 */
export function cartesianRenderer(read: () => CartesianOptions): ChartRenderer {
  return {
    mount(plot, { inspect, legend }) {
      const owner = plot.ownerDocument;
      const svg = node(owner, 'svg', { class: 'marks' });
      const clip = `tp-chart-clip-${++clips}`;
      const live = owner.createElement('div');
      live.className = 'live';
      live.setAttribute('aria-live', 'polite');
      plot.append(svg, live);
      let current: Model | undefined;
      let snapshot: ChartSnapshot | undefined;
      let options: CartesianOptions | undefined;
      let index: number | null = null;
      let source: 'pointer' | 'focus' = 'pointer';
      const band = node(owner, 'g', { part: 'chart-cursor', class: 'cursor' });
      const cross = node(owner, 'g', { part: 'chart-cursor', class: 'cursor' });

      const allows = (kind: 'pointer' | 'focus') =>
        snapshot?.interaction === 'both' || snapshot?.interaction === kind;

      const measure = textMeasure(plot);

      const drawCursor = () => {
        band.replaceChildren();
        cross.replaceChildren();
        if (!current || !options || index === null) return;
        const x = current.xs[index]!;
        if (options.type === 'line') {
          cross.append(
            node(owner, 'line', {
              class: 'cursor-line',
              x1: x,
              x2: x,
              y1: current.y0,
              y2: current.y1,
            }),
          );
          current.keys.forEach((key, k) => {
            const cell = current!.cells[index!]![k]!;
            if (cell.value === null) return;
            const dot = node(owner, 'circle', {
              class: 'cursor-dot',
              cx: x,
              cy: current!.py(cell.to),
              r: 4,
            });
            dot.style.fill = snapshot!.colors[key] ?? 'currentColor';
            cross.append(dot);
          });
        } else {
          const width = Math.max(2, current.band - 4);
          band.append(
            node(owner, 'rect', {
              class: 'cursor-band',
              x: x - width / 2,
              y: current.y0,
              width,
              height: current.y1 - current.y0,
              rx: 4,
            }),
          );
        }
      };

      const report = () => {
        if (!current || !snapshot || index === null) return;
        const row = current.rows[index]!;
        const x = current.xs[index]!;
        // The tooltip sits beside the inspected column: the band, or the crosshair line.
        const columnWidth = options?.type === 'line' ? 0 : Math.max(2, current.band - 4);
        const columnTop = current.y0,
          columnHeight = current.y1 - current.y0;
        const payload: ChartPayload[] = current.keys.map((key, k) => {
          const value = current!.cells[index!]![k]!.value;
          return {
            dataKey: key,
            value,
            color:
              value !== null && value < 0 && options?.negativeColors[key]
                ? options.negativeColors[key]
                : (snapshot!.colors[key] ?? 'currentColor'),
            payload: row,
          };
        });
        const label = current.detail(index);
        inspect({
          active: true,
          source,
          label,
          payload,
          anchor: svgAnchor(svg, x - columnWidth / 2, columnTop, columnWidth, columnHeight),
        });
        if (source === 'focus')
          live.textContent = `${label}: ${payload
            .map(
              (item) =>
                `${snapshot!.series[String(item.dataKey)]?.label ?? item.dataKey} ${valueWords(
                  snapshot!.series,
                  String(item.dataKey),
                  item.value as number | null,
                  options?.locale,
                )}`,
            )
            .join(', ')}`;
      };

      const select = (next: number | null, from: 'pointer' | 'focus') => {
        if (!current || !current.rows.length) next = null;
        else if (next !== null) next = Math.max(0, Math.min(current.rows.length - 1, next));
        const changed = next !== index || from !== source;
        index = next;
        source = from;
        drawCursor();
        if (next === null) inspect({ active: false, source: from, payload: [] });
        else if (changed || from === 'pointer') report();
      };

      const nearest = (x: number): number | null => {
        if (!current || !current.rows.length) return null;
        let best = 0,
          distance = Infinity;
        current.xs.forEach((value, i) => {
          const d = Math.abs(value - x);
          if (d < distance) {
            distance = d;
            best = i;
          }
        });
        return best;
      };

      const move = (event: PointerEvent) => {
        if (!allows('pointer') || !current) return;
        const box = svg.getBoundingClientRect();
        const x = event.clientX - box.left,
          y = event.clientY - box.top;
        const reach = Math.max(current.band / 2, 8);
        if (y < current.y0 || y > current.y1 || x < current.x0 - reach || x > current.x1 + reach) {
          if (source === 'pointer' && index !== null) select(null, 'pointer');
          return;
        }
        select(nearest(x), 'pointer');
      };
      const leave = () => {
        if (source === 'pointer' && index !== null) select(null, 'pointer');
      };
      const focus = () => {
        if (!allows('focus')) return;
        select(index ?? 0, 'focus');
      };
      const blur = () => {
        if (source === 'focus') {
          live.textContent = '';
          select(null, 'focus');
        }
      };
      const key = (event: KeyboardEvent) => {
        if (!allows('focus') || !current?.rows.length) return;
        const next = stepKey(event, index, current.rows.length);
        if (next === undefined) return;
        event.preventDefault();
        select(next, 'focus');
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerleave', leave);
      svg.addEventListener('focus', focus);
      svg.addEventListener('blur', blur);
      svg.addEventListener('keydown', key);

      /** Each line's label past its last value, nudged apart so none overlap. */
      const lineLabels = (m: Model) => {
        const labels = node(owner, 'g', { class: 'line-labels' });
        const placed = m.keys
          .map((key, k) => {
            let y: number | null = null;
            for (let i = m.cells.length - 1; i >= 0 && y === null; i--) {
              const cell = m.cells[i]![k]!;
              if (cell.value !== null) y = m.py(cell.to);
            }
            return { key, y };
          })
          .filter((label): label is { key: string; y: number } => label.y !== null)
          .sort((a, b) => a.y - b.y);
        const gap = 14;
        for (let i = 1; i < placed.length; i++)
          placed[i]!.y = Math.max(placed[i]!.y, placed[i - 1]!.y + gap);
        const overflow = placed.length ? placed[placed.length - 1]!.y - m.y1 : 0;
        if (overflow > 0) for (const label of placed) label.y -= overflow;
        for (const label of placed) {
          const text = node(owner, 'text', {
            class: 'line-label',
            x: m.x1 + 8,
            y: label.y,
            'dominant-baseline': 'middle',
          });
          text.textContent = options!.inline!(label.key);
          text.style.fill = snapshot!.colors[label.key] ?? 'currentColor';
          labels.append(text);
        }
        return labels;
      };

      const paint = () => {
        if (!snapshot || !options) return;
        const m = (current = model(snapshot, options, measure));
        const { width, height } = snapshot;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        const focusable = snapshot.interaction === 'focus' || snapshot.interaction === 'both';
        svg.setAttribute('tabindex', focusable ? '0' : '-1');
        svg.setAttribute('role', focusable ? 'group' : 'img');
        svg.setAttribute('aria-label', options.label);
        const xa: ChartAxis = options.xAxis || {};
        const ya: ChartAxis = options.yAxis || {};

        // Grid lines at the y ticks, and a solid line at zero under bars and lollipops.
        const grid = node(owner, 'g', { part: 'chart-grid', class: 'grid' });
        for (const tick of m.yTicks)
          grid.append(
            node(owner, 'line', {
              class: 'grid-line',
              x1: m.x0,
              x2: m.x1,
              y1: m.py(tick),
              y2: m.py(tick),
            }),
          );
        const bars = options.type !== 'line';
        if (m.yDomain[0] <= 0 && m.yDomain[1] >= 0 && (bars || m.yDomain[0] < 0))
          grid.append(
            node(owner, 'line', {
              class: 'zero-line',
              x1: m.x0,
              x2: m.x1,
              y1: m.py(0),
              y2: m.py(0),
            }),
          );

        // Marks.
        const marks = node(owner, 'g', { class: 'series-marks' });
        const zero = m.py(Math.max(m.yDomain[0], Math.min(m.yDomain[1], 0)));
        m.keys.forEach((key, k) => {
          const color = snapshot!.colors[key] ?? 'currentColor';
          const negative = options!.negativeColors[key] ?? color;
          const group = node(owner, 'g', { class: 'series', 'data-series': key });
          if (options!.type === 'line') {
            let d = '';
            let open = false;
            m.cells.forEach((row, i) => {
              const cell = row[k]!;
              if (cell.value === null) {
                open = false;
                return;
              }
              d += `${open ? 'L' : 'M'}${m.xs[i]},${m.py(cell.to)}`;
              open = true;
            });
            const path = node(owner, 'path', { class: 'line', d });
            path.style.stroke = color;
            group.append(path);
            // Below zero the line takes the series' negative color, split exactly at zero.
            if (options!.negativeColors[key] && m.yDomain[0] < 0) {
              path.setAttribute('clip-path', `url(#${clip}-above)`);
              const below = node(owner, 'path', {
                class: 'line',
                d,
                'clip-path': `url(#${clip}-below)`,
              });
              below.style.stroke = negative;
              group.append(below);
            }
          } else {
            const groupWidth = Math.max(1, Math.min(m.band * 0.72, 96));
            const stacked = options!.stacked && options!.type === 'bar';
            const width = stacked ? groupWidth : groupWidth / m.keys.length;
            m.cells.forEach((row, i) => {
              const cell = row[k]!;
              if (cell.value === null) return;
              const x = m.xs[i]! - groupWidth / 2 + (stacked ? 0 : k * width);
              const fill = cell.value < 0 ? negative : color;
              if (options!.type === 'bar') {
                // A stacked segment rounds only where it ends the stack.
                const outermost =
                  !stacked ||
                  !row.some(
                    (other, j) =>
                      j > k &&
                      other.value !== null &&
                      other.value !== 0 &&
                      Math.sign(other.value) === Math.sign(cell.value!),
                  );
                const path = node(owner, 'path', {
                  class: 'bar',
                  d: barPath(
                    x + (stacked ? 0 : 1),
                    Math.max(1, width - (stacked ? 0 : 2)),
                    m.py(cell.from),
                    m.py(cell.to),
                    outermost ? (stacked ? 3 : 5) : 0,
                  ),
                });
                path.style.fill = fill;
                group.append(path);
              } else {
                const cx = x + width / 2;
                group.append(
                  node(owner, 'line', {
                    class: 'stem',
                    x1: cx,
                    x2: cx,
                    y1: zero,
                    y2: m.py(cell.to),
                  }),
                );
                const dot = node(owner, 'circle', { class: 'dot', cx, cy: m.py(cell.to), r: 6 });
                dot.style.fill = fill;
                group.append(dot);
              }
            });
          }
          marks.append(group);
        });
        if (options.inline && options.type === 'line') marks.append(lineLabels(m));

        // Axes: labels, tick marks and titles.
        const axes = node(owner, 'g', { part: 'chart-axis', class: 'axis' });
        const environment = options.locale ? { locale: options.locale } : {};
        if (options.yAxis) {
          const yNumber: AxisOptions = { ...ya, type: 'number' } as AxisOptions;
          for (const tick of m.yTicks) {
            const y = m.py(tick);
            if (ya.ticks !== false)
              axes.append(
                node(owner, 'line', { class: 'tick', x1: m.x0 - 6, x2: m.x0, y1: y, y2: y }),
              );
            if (ya.labels !== false) {
              const text = node(owner, 'text', {
                x: m.x0 - (ya.ticks === false ? 4 : 10),
                y,
                'text-anchor': 'end',
                'dominant-baseline': 'middle',
              });
              text.textContent = axisLabel(yNumber, tick, 0, environment);
              axes.append(text);
            }
          }
          if (ya.line)
            axes.append(
              node(owner, 'line', { class: 'axis-line', x1: m.x0, x2: m.x0, y1: m.y0, y2: m.y1 }),
            );
          if (ya.title) {
            const title = node(owner, 'text', {
              class: 'title',
              x: 0,
              y: 0,
              transform: `translate(10 ${(m.y0 + m.y1) / 2}) rotate(-90)`,
              'text-anchor': 'middle',
              'dominant-baseline': 'middle',
            });
            title.textContent = ya.title;
            axes.append(title);
          }
        }
        if (options.xAxis) {
          for (const tick of m.xTicks) {
            if (xa.ticks !== false)
              axes.append(
                node(owner, 'line', {
                  class: 'tick',
                  x1: tick.x,
                  x2: tick.x,
                  y1: m.y1,
                  y2: m.y1 + 6,
                }),
              );
            const text = node(owner, 'text', {
              x: tick.x,
              y: m.y1 + (xa.ticks === false ? 4 : 10),
              'text-anchor': 'middle',
              'dominant-baseline': 'hanging',
            });
            text.textContent = tick.label;
            axes.append(text);
          }
          if (xa.line)
            axes.append(
              node(owner, 'line', { class: 'axis-line', x1: m.x0, x2: m.x1, y1: m.y1, y2: m.y1 }),
            );
          if (xa.title) {
            const title = node(owner, 'text', {
              class: 'title',
              x: (m.x0 + m.x1) / 2,
              y: height - 2,
              'text-anchor': 'middle',
            });
            title.textContent = xa.title;
            axes.append(title);
          }
        }
        const defs = node(owner, 'defs');
        const split = m.py(0);
        for (const [side, y, h] of [
          ['above', 0, Math.max(0, split)],
          ['below', split, Math.max(0, height - split)],
        ] as const) {
          const path = node(owner, 'clipPath', { id: `${clip}-${side}` });
          path.append(node(owner, 'rect', { x: 0, y, width, height: h }));
          defs.append(path);
        }
        svg.replaceChildren(defs, grid, band, marks, axes, cross);
        if (index !== null && index >= m.rows.length) index = null;
        drawCursor();
        if (index !== null) report();
        legend(
          m.keys.map((key) => ({
            dataKey: key,
            color: snapshot!.colors[key] ?? 'currentColor',
            type: options!.type === 'line' ? 'line' : 'rect',
          })),
        );
      };

      return {
        update(next) {
          snapshot = next;
          options = read();
          if (!allows('pointer') && source === 'pointer') index = null;
          if (!allows('focus') && source === 'focus') index = null;
          paint();
        },
        destroy() {
          svg.removeEventListener('pointermove', move);
          svg.removeEventListener('pointerleave', leave);
          svg.removeEventListener('focus', focus);
          svg.removeEventListener('blur', blur);
          svg.removeEventListener('keydown', key);
          svg.remove();
          live.remove();
        },
      };
    },
  };
}
