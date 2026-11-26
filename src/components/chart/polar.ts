import {
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
} from './types.js';
import { finite, node, stepKey, svgAnchor, textMeasure, valueWords } from './svg.js';

let paths = 0;

/** The chart types drawn around a center. */
export type PolarType = 'pie' | 'radar' | 'radial';

/** Where the marks of a polar chart are centered, and the radius of the space inside them. */
export interface PolarCenter {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
  /** Which side of the center has room: both, only above it (a top half), or only below it. */
  readonly room: 'both' | 'above' | 'below';
}

/** What the built-in polar marks read from their Chart besides the snapshot. */
export interface PolarOptions {
  readonly type: PolarType;
  readonly xAxis: ChartAxis | false;
  readonly yAxis: ChartAxis | false;
  readonly yDomain: ChartDomain;
  /** Where the marks start and end, in degrees clockwise from the top. */
  readonly angleRange: readonly [number, number];
  /** The hole in the middle, as a fraction of the outer radius. */
  readonly innerRadius: number | undefined;
  readonly label: string;
  readonly locale?: string;
  /** The text that labels each ring at its start, when the legend is `inline`. */
  readonly inline?: (key: string) => string;
  /** Reports where the marks are centered, for content placed in their middle. */
  readonly center: (center: PolarCenter | null) => void;
}

/** One inspectable position: a slice, a ring or a spoke. */
interface Target {
  /** The tooltip header. */
  readonly label: string;
  readonly payload: readonly ChartPayload[];
  /** Where the tooltip points, in SVG coordinates: a point, or a box such as a spoke's name. */
  readonly x: number;
  readonly y: number;
  readonly width?: number;
  readonly height?: number;
  /** The series this target is, for slices and rings; spokes cover every series. */
  readonly key?: string;
  /** The angle at its middle, and its radial extent, for hit testing. */
  readonly from: number;
  readonly to: number;
  readonly inner: number;
  readonly outer: number;
}

/** A point at `radius` and `angle` degrees clockwise from the top. */
function at(cx: number, cy: number, radius: number, angle: number): [number, number] {
  const radians = (angle * Math.PI) / 180;
  return [cx + radius * Math.sin(radians), cy - radius * Math.cos(radians)];
}

/** Arc commands along `radius` from angle `a` to `b`, in pieces of at most 180°. */
function arc(cx: number, cy: number, radius: number, a: number, b: number): string {
  const sweep = b > a ? 1 : 0;
  const steps = Math.max(1, Math.ceil(Math.abs(b - a) / 180));
  let d = '';
  for (let i = 1; i <= steps; i++) {
    const [x, y] = at(cx, cy, radius, a + ((b - a) * i) / steps);
    d += `A${radius},${radius} 0 0 ${sweep} ${x},${y}`;
  }
  return d;
}

/**
 * An annular sector from angle `a` to `b`, or a wedge when `inner` is zero. With a `gap`, both
 * straight edges move inward by half of it, so neighboring sectors stand the same distance apart
 * from the rim to the center; a wedge's edges then meet on its bisector instead of at the center.
 */
function sector(
  cx: number,
  cy: number,
  inner: number,
  outer: number,
  a: number,
  b: number,
  gap = 0,
) {
  const half = gap / 2;
  const sweep = b - a;
  // The angle a straight edge moves along a circle of `radius` to stand `half` away from it.
  const inset = (radius: number) => (Math.asin(Math.min(1, half / radius)) * 180) / Math.PI;
  const outerInset = half > 0 ? inset(outer) : 0;
  // Too thin to separate: draw it whole rather than lose it.
  if (outerInset * 2 >= sweep) return sector(cx, cy, inner, outer, a, b);
  const [sx, sy] = at(cx, cy, outer, a + outerInset);
  const rim = `M${sx},${sy}${arc(cx, cy, outer, a + outerInset, b - outerInset)}`;
  // Where the two moved edges meet, on the bisector.
  const apex = half > 0 ? half / Math.sin(((sweep / 2) * Math.PI) / 180) : 0;
  if (inner <= apex) {
    const [px, py] = at(cx, cy, apex, a + sweep / 2);
    return `${rim}L${px},${py}Z`;
  }
  const innerInset = half > 0 ? inset(inner) : 0;
  const [ix, iy] = at(cx, cy, inner, b - innerInset);
  return `${rim}L${ix},${iy}${arc(cx, cy, inner, b - innerInset, a + innerInset)}Z`;
}

/** An open arc along `radius`, for stroked rings and their tracks. */
function stroke(cx: number, cy: number, radius: number, a: number, b: number) {
  const [x, y] = at(cx, cy, radius, a);
  return `M${x},${y}${arc(cx, cy, radius, a, b)}`;
}

/** The box a unit circle's arc between `a` and `b` and its center cover. */
function arcBounds(a: number, b: number) {
  const angles = [a, b];
  for (let k = Math.ceil(a / 90) * 90; k < b; k += 90) angles.push(k);
  const xs = [0],
    ys = [0];
  for (const angle of angles) {
    const [x, y] = at(0, 0, 1, angle);
    xs.push(x);
    ys.push(y);
  }
  return {
    left: Math.min(...xs),
    right: Math.max(...xs),
    top: Math.min(...ys),
    bottom: Math.max(...ys),
  };
}

/** How far `angle` is past `start`, within one turn. */
const past = (angle: number, start: number) => (((angle - start) % 360) + 360) % 360;

/** Each series' total over the records. */
function totals(snapshot: ChartSnapshot, keys: readonly string[]) {
  return keys.map((key) => {
    let sum: number | null = null;
    for (const row of snapshot.data) {
      const value = finite(row[key]);
      if (value !== null) sum = (sum ?? 0) + value;
    }
    return sum;
  });
}

/**
 * The polar marks a Chart draws itself: pie and donut slices, one per series; radial rings, one
 * per series over a track; and radar shapes over rings and spokes, one spoke per record. Pie and
 * radial inspect one series at a time, radar one spoke with every series at it.
 */
export function polarRenderer(read: () => PolarOptions): ChartRenderer {
  return {
    mount(plot, { inspect, legend }) {
      const owner = plot.ownerDocument;
      const svg = node(owner, 'svg', { class: 'marks' });
      const id = `tp-chart-polar-${++paths}`;
      const live = owner.createElement('div');
      live.className = 'live';
      live.setAttribute('aria-live', 'polite');
      plot.append(svg, live);
      const measure = textMeasure(plot);
      const cursor = node(owner, 'g', { part: 'chart-cursor', class: 'cursor' });
      let marks: SVGGElement | undefined;
      let snapshot: ChartSnapshot | undefined;
      let options: PolarOptions | undefined;
      let targets: Target[] = [];
      let center = { x: 0, y: 0 };
      let index: number | null = null;
      let source: 'pointer' | 'focus' = 'pointer';

      const allows = (kind: 'pointer' | 'focus') =>
        snapshot?.interaction === 'both' || snapshot?.interaction === kind;

      const color = (key: string) => snapshot?.colors[key] ?? 'currentColor';

      /** Dims every series but the inspected one, or marks the inspected spoke. */
      const drawCursor = () => {
        cursor.replaceChildren();
        const target = index === null ? undefined : targets[index];
        for (const group of marks?.querySelectorAll<SVGGElement>('.series') ?? [])
          group.classList.toggle(
            'dim',
            Boolean(target?.key) && group.dataset['series'] !== target!.key,
          );
        if (!target || target.key || !options) return;
        const [x, y] = at(center.x, center.y, target.outer, target.from);
        cursor.append(
          node(owner, 'line', { class: 'cursor-line', x1: center.x, y1: center.y, x2: x, y2: y }),
        );
        for (const item of target.payload) {
          const point = item['point'] as [number, number] | undefined;
          if (!point) continue;
          const dot = node(owner, 'circle', {
            class: 'cursor-dot',
            cx: point[0],
            cy: point[1],
            r: 4,
          });
          dot.style.fill = color(String(item.dataKey));
          cursor.append(dot);
        }
      };

      const report = () => {
        const target = index === null ? undefined : targets[index];
        if (!target || !snapshot) return;
        inspect({
          active: true,
          source,
          label: target.label,
          payload: target.payload,
          anchor: svgAnchor(svg, target.x, target.y, target.width, target.height),
        });
        if (source === 'focus' && target.key) {
          // A slice or ring: its series and value, then its share unless that reads the same.
          const value = valueWords(
            snapshot.series,
            target.key,
            target.payload[0]?.value as number | null,
            options?.locale,
          );
          live.textContent = `${snapshot.series[target.key]?.label ?? target.key} ${value}${
            value === target.label ? '' : `, ${target.label}`
          }`;
        } else if (source === 'focus')
          live.textContent = `${target.label}: ${target.payload
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
        if (!targets.length) next = null;
        else if (next !== null) next = Math.max(0, Math.min(targets.length - 1, next));
        const changed = next !== index || from !== source;
        index = next;
        source = from;
        drawCursor();
        if (next === null) inspect({ active: false, source: from, payload: [] });
        else if (changed || from === 'pointer') report();
      };

      /** The target under a point: the slice or ring it is in, or the radar spoke nearest it. */
      const hit = (x: number, y: number): number | null => {
        if (!options) return null;
        const dx = x - center.x,
          dy = y - center.y;
        const radius = Math.hypot(dx, dy);
        const angle = (Math.atan2(dx, -dy) * 180) / Math.PI;
        if (options.type === 'radar') {
          const outer = targets[0]?.outer ?? 0;
          if (radius > outer + 16) return null;
          let best: number | null = null,
            distance = Infinity;
          targets.forEach((target, i) => {
            const d = Math.min(past(angle, target.from), 360 - past(angle, target.from));
            if (d < distance) {
              distance = d;
              best = i;
            }
          });
          return best;
        }
        const found = targets.findIndex(
          (target) =>
            radius >= target.inner - 2 &&
            radius <= target.outer + 2 &&
            past(angle, target.from) <= target.to - target.from,
        );
        return found < 0 ? null : found;
      };

      const move = (event: PointerEvent) => {
        if (!allows('pointer')) return;
        const box = svg.getBoundingClientRect();
        const next = hit(event.clientX - box.left, event.clientY - box.top);
        if (next === null) {
          if (source === 'pointer' && index !== null) select(null, 'pointer');
          return;
        }
        select(next, 'pointer');
      };
      const leave = () => {
        if (source === 'pointer' && index !== null) select(null, 'pointer');
      };
      const focus = () => {
        if (allows('focus')) select(index ?? 0, 'focus');
      };
      const blur = () => {
        if (source !== 'focus') return;
        live.textContent = '';
        select(null, 'focus');
      };
      const key = (event: KeyboardEvent) => {
        if (!allows('focus') || !targets.length) return;
        const next = stepKey(event, index, targets.length);
        if (next === undefined) return;
        event.preventDefault();
        select(next, 'focus');
      };
      svg.addEventListener('pointermove', move);
      svg.addEventListener('pointerleave', leave);
      svg.addEventListener('focus', focus);
      svg.addEventListener('blur', blur);
      svg.addEventListener('keydown', key);

      const paint = () => {
        if (!snapshot || !options) return;
        const { width, height } = snapshot;
        svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
        svg.setAttribute('width', String(width));
        svg.setAttribute('height', String(height));
        const focusable = snapshot.interaction === 'focus' || snapshot.interaction === 'both';
        svg.setAttribute('tabindex', focusable ? '0' : '-1');
        svg.setAttribute('role', focusable ? 'group' : 'img');
        svg.setAttribute('aria-label', options.label);
        const keys = Object.keys(snapshot.series);
        const type = options.type;
        const environment = options.locale ? { locale: options.locale } : {};
        const ya: ChartAxis = options.yAxis || {};
        const xa: ChartAxis = options.xAxis || {};
        const yNumber = { ...ya, type: 'number' } as AxisOptions & { key?: string };
        delete yNumber.key;

        // The angles the marks span, increasing and at most one turn.
        let [start, end] = options.angleRange;
        if (!(Number.isFinite(start) && Number.isFinite(end)) || end === start)
          [start, end] = [0, 360];
        if (end < start) [start, end] = [end, start];
        end = Math.min(end, start + 360);
        const sweep = end - start;
        const full = sweep >= 360;

        // Room for the labels around the marks.
        const spokeNames = snapshot.data.map((row, i) =>
          xa.key ? String(row[xa.key] ?? '') : String(i + 1),
        );
        const showSpokes = type === 'radar' && options.xAxis !== false && xa.labels !== false;
        const showTicks =
          (type === 'radial' || type === 'radar') && options.yAxis !== false && ya.labels !== false;
        const marginX =
          type === 'radar' && showSpokes
            ? Math.max(0, ...spokeNames.map(measure)) + 14
            : type === 'radial' && showTicks
              ? 36
              : 4;
        const marginY =
          (type === 'radar' && showSpokes) || (type === 'radial' && showTicks) ? 22 : 4;
        const bounds = arcBounds(start, end);
        const boxWidth = Math.max(1, width - marginX * 2),
          boxHeight = Math.max(1, height - marginY * 2);
        const outer = Math.max(
          4,
          Math.min(
            boxWidth / (bounds.right - bounds.left || 1),
            boxHeight / (bounds.bottom - bounds.top || 1),
          ),
        );
        const cx =
          marginX + (boxWidth - (bounds.right - bounds.left) * outer) / 2 - bounds.left * outer;
        const cy =
          marginY + (boxHeight - (bounds.bottom - bounds.top) * outer) / 2 - bounds.top * outer;
        center = { x: cx, y: cy };
        const innerFraction = Math.max(
          0,
          Math.min(1, options.innerRadius ?? (type === 'radial' ? 0.35 : 0)),
        );
        const inner = outer * innerFraction;
        options.center({
          x: cx,
          y: cy,
          radius: inner,
          room: bounds.bottom < 0.01 ? 'above' : bounds.top > -0.01 ? 'below' : 'both',
        });

        const grid = node(owner, 'g', { part: 'chart-grid', class: 'grid' });
        const axes = node(owner, 'g', { part: 'chart-axis', class: 'axis' });
        const defs = node(owner, 'defs');
        const layer = (marks = node(owner, 'g', { class: 'series-marks' }));
        targets = [];
        const sums = totals(snapshot, keys);

        if (type === 'pie') {
          const total = sums.reduce<number>((all, sum) => all + Math.max(0, sum ?? 0), 0);
          let angle = start;
          const count = sums.filter((sum) => (sum ?? 0) > 0).length;
          // Slices stand two pixels apart, the same from the rim to the center.
          const gap = count > 1 ? 2 : 0;
          keys.forEach((key, k) => {
            const value = sums[k] ?? null;
            if (value === null || value <= 0 || total <= 0) return;
            const a = angle,
              b = angle + (value / total) * sweep;
            angle = b;
            const group = node(owner, 'g', { class: 'series', 'data-series': key });
            const path = node(owner, 'path', {
              class: 'slice',
              d: sector(cx, cy, inner, outer, a, b, gap),
            });
            path.style.fill = color(key);
            group.append(path);
            layer.append(group);
            const [x, y] = at(cx, cy, (inner + outer) / 2, (a + b) / 2);
            targets.push({
              key,
              label: `${Math.round((value / total) * 1000) / 10}%`,
              payload: [{ dataKey: key, value, color: color(key) }],
              x,
              y,
              from: a,
              to: b,
              inner,
              outer,
            });
          });
        } else if (type === 'radial') {
          const top = Math.max(0, ...sums.map((sum) => sum ?? 0));
          const domain: AxisDomain =
            options.yDomain === 'auto' ? niceDomain(0, top || 1, yNumber) : options.yDomain;
          const span = domain[1] - domain[0] || 1;
          const slot = (outer - inner) / Math.max(1, keys.length);
          const thickness = Math.max(2, Math.min(slot * 0.72, 32));
          const angleOf = (value: number) =>
            start + sweep * Math.max(0, Math.min(1, (value - domain[0]) / span));
          keys.forEach((key, k) => {
            const radius = inner + slot * (k + 0.5);
            grid.append(
              node(owner, 'path', {
                class: 'track',
                d: stroke(cx, cy, radius, start, end),
                'stroke-width': thickness,
              }),
            );
            const value = sums[k] ?? null;
            const group = node(owner, 'g', { class: 'series', 'data-series': key });
            const b = value === null ? start : angleOf(value);
            if (value !== null && b > start) {
              const ring = node(owner, 'path', {
                class: 'ring',
                d: stroke(cx, cy, radius, start, b),
                'stroke-width': thickness,
              });
              ring.style.stroke = color(key);
              group.append(ring);
            }
            layer.append(group);
            if (options!.inline) {
              // The label runs back from the ring's start into the open part of the circle.
              const path = node(owner, 'path', {
                id: `${id}-label-${k}`,
                d: stroke(
                  cx,
                  cy,
                  radius,
                  start,
                  start - Math.max(sweep < 360 ? 360 - sweep : 90, 30),
                ),
                fill: 'none',
              });
              defs.append(path);
              const text = node(owner, 'text', {
                class: 'ring-label',
                'dominant-baseline': 'central',
              });
              text.style.fontSize = `${Math.max(9, Math.min(12, thickness * 0.8))}px`;
              // Past the ring's rounded cap.
              const along = node(owner, 'textPath', {
                href: `#${id}-label-${k}`,
                startOffset: thickness / 2 + 6,
              });
              along.textContent = options!.inline(key);
              text.append(along);
              axes.append(text);
            }
            const [x, y] = at(cx, cy, radius, b);
            targets.push({
              key,
              label:
                value === null ? '—' : `${Math.round(((value - domain[0]) / span) * 1000) / 10}%`,
              payload: [{ dataKey: key, value, color: color(key) }],
              x,
              y,
              from: start,
              to: Math.max(b, start + 1),
              inner: radius - thickness / 2,
              outer: radius + thickness / 2,
            });
          });
          if (showTicks) {
            const ticks = axisTicks(domain, yNumber);
            const ring = outer + 6;
            for (const tick of ticks) {
              const angle = angleOf(tick);
              if (full && tick !== ticks[0] && past(angle, start) === 0) continue;
              const [x, y] = at(cx, cy, ring, angle);
              const sin = Math.sin((angle * Math.PI) / 180),
                cos = Math.cos((angle * Math.PI) / 180);
              const text = node(owner, 'text', {
                x,
                y,
                'text-anchor': sin > 0.3 ? 'start' : sin < -0.3 ? 'end' : 'middle',
                'dominant-baseline': cos > 0.3 ? 'auto' : cos < -0.3 ? 'hanging' : 'middle',
              });
              text.textContent = axisLabel(yNumber, tick, 0, environment);
              axes.append(text);
            }
          }
        } else {
          // Radar: one spoke per record, rings at the y ticks, one shape per series.
          const rows = snapshot.data;
          const count = rows.length;
          let low = 0,
            high = -Infinity;
          for (const row of rows)
            for (const key of keys) {
              const value = finite(row[key]);
              if (value !== null) {
                low = Math.min(low, value);
                high = Math.max(high, value);
              }
            }
          if (!Number.isFinite(high)) high = 1;
          const domain: AxisDomain =
            options.yDomain === 'auto' ? niceDomain(low, high, yNumber) : options.yDomain;
          const span = domain[1] - domain[0] || 1;
          const radiusOf = (value: number) =>
            inner + (Math.max(0, Math.min(span, value - domain[0])) / span) * (outer - inner);
          const angles = rows.map(
            (_, i) => start + (sweep * i) / (full ? count : Math.max(1, count - 1)),
          );
          const ticks = axisTicks(domain, yNumber);
          for (const tick of ticks) {
            const radius = radiusOf(tick);
            if (radius <= 0) continue;
            const points = angles.map((angle) => at(cx, cy, radius, angle).join(','));
            grid.append(
              node(owner, full ? 'polygon' : 'polyline', {
                class: 'grid-line ring-line',
                points: points.join(' '),
              }),
            );
            if (showTicks) {
              const [x, y] = at(cx, cy, radius, start);
              // Inside the ring, beside the first spoke, clear of its name.
              const text = node(owner, 'text', {
                x: x + 4,
                y: y + 3,
                'text-anchor': 'start',
                'dominant-baseline': 'hanging',
              });
              text.textContent = axisLabel(yNumber, tick, 0, environment);
              axes.append(text);
            }
          }
          angles.forEach((angle, i) => {
            const [x, y] = at(cx, cy, outer, angle);
            grid.append(
              node(owner, 'line', { class: 'grid-line spoke', x1: cx, y1: cy, x2: x, y2: y }),
            );
            if (showSpokes) {
              const [lx, ly] = at(cx, cy, outer + 10, angle);
              const sin = Math.sin((angle * Math.PI) / 180),
                cos = Math.cos((angle * Math.PI) / 180);
              const text = node(owner, 'text', {
                x: lx,
                y: ly,
                'text-anchor': sin > 0.3 ? 'start' : sin < -0.3 ? 'end' : 'middle',
                'dominant-baseline': cos > 0.3 ? 'auto' : cos < -0.3 ? 'hanging' : 'middle',
              });
              text.textContent = spokeNames[i]!;
              axes.append(text);
            }
          });
          keys.forEach((key) => {
            const group = node(owner, 'g', { class: 'series', 'data-series': key });
            const points = rows.map((row, i) =>
              at(cx, cy, radiusOf(finite(row[key]) ?? domain[0]), angles[i]!),
            );
            const shape = node(owner, full ? 'polygon' : 'polyline', {
              class: 'area',
              points: points.map((point) => point.join(',')).join(' '),
            });
            shape.style.fill = color(key);
            shape.style.stroke = color(key);
            group.append(shape);
            points.forEach(([x, y]) => {
              const dot = node(owner, 'circle', { class: 'dot', cx: x, cy: y, r: 3.5 });
              dot.style.fill = color(key);
              group.append(dot);
            });
            layer.append(group);
          });
          rows.forEach((row, i) => {
            // The tooltip stands beside the spoke's name, so it never covers it.
            let [x, y] = at(cx, cy, outer, angles[i]!);
            let boxWidth = 0,
              boxHeight = 0;
            if (showSpokes) {
              [x, y] = at(cx, cy, outer + 10, angles[i]!);
              const sin = Math.sin((angles[i]! * Math.PI) / 180);
              boxWidth = measure(spokeNames[i]!);
              boxHeight = 16;
              x -= sin > 0.3 ? 0 : sin < -0.3 ? boxWidth : boxWidth / 2;
              y -= boxHeight / 2;
            }
            targets.push({
              width: boxWidth,
              height: boxHeight,
              label: spokeNames[i]!,
              payload: keys.map((key) => {
                const value = finite(row[key]);
                return {
                  dataKey: key,
                  value,
                  color: color(key),
                  payload: row,
                  point: at(cx, cy, radiusOf(value ?? domain[0]), angles[i]!),
                };
              }),
              x,
              y,
              from: angles[i]!,
              to: angles[i]!,
              inner: 0,
              outer,
            });
          });
        }

        svg.replaceChildren(defs, grid, layer, cursor, axes);
        if (index !== null && index >= targets.length) index = null;
        drawCursor();
        if (index !== null) report();
        legend(
          keys.map((key) => ({
            dataKey: key,
            color: color(key),
            type: type === 'radar' ? 'line' : 'rect',
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
          options?.center(null);
          svg.remove();
          live.remove();
        },
      };
    },
  };
}
