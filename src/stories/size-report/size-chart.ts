import type {
  VisualizationRenderer,
  VisualizationSnapshot,
} from '../../components/data-visualization/index.js';

/** One bar: an independent component bundle, measured before and after gzip. */
export interface SizeChartRow extends Record<string, unknown> {
  name: string;
  gzip: number;
  bytes: number;
}

export const sizeChartSeries = {
  gzip: { label: 'Gzip', color: 'var(--tp-chart-1)' },
};

/** The build log's format: kB of 1000 bytes, truncated to two decimals. */
export const kb = (bytes: number) => `${(Math.floor(bytes / 10) / 100).toFixed(2)} kB`;

/**
 * Horizontal bars (story-owned SVG adapter; geometry stays outside the library control).
 * Rows are focusable: Arrow keys move between them and both pointer and focus report the same
 * inspection payload, so the composed Tooltip shows the gzip size for either input.
 */
export const sizeChartRenderer: VisualizationRenderer = {
  mount(plot, context) {
    const doc = plot.ownerDocument;
    const ns = 'http://www.w3.org/2000/svg';
    const svg = doc.createElementNS(ns, 'svg');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Largest components by gzip size');
    svg.style.display = 'block';
    svg.style.inlineSize = '100%';
    const body = doc.createElementNS(ns, 'g');
    svg.append(body);
    plot.append(svg);
    let snapshot: VisualizationSnapshot;
    const set = (element: Element, values: Record<string, string | number>) => {
      for (const [key, value] of Object.entries(values)) element.setAttribute(key, String(value));
    };
    const inspect = (mark: SVGElement, row: SizeChartRow, source: 'pointer' | 'focus') =>
      context.inspect({
        active: true,
        source,
        label: `${row.name} · ${kb(row.gzip)}`,
        anchor: { getBoundingRectangle: () => mark.getBoundingClientRect(), contextElement: mark },
        payload: (['gzip'] as const).map((key) => ({
          dataKey: key,
          name: sizeChartSeries[key].label,
          value: kb(row[key]),
          color: snapshot.colors[key]!,
          payload: row,
        })),
      });
    const clear = (source: 'pointer' | 'focus') =>
      context.inspect({ active: false, source, payload: [] });
    return {
      update(next) {
        snapshot = next;
        const rows = next.data as SizeChartRow[];
        const width = Math.max(320, next.width);
        const label = Math.min(180, width * 0.32);
        const rowHeight = 26;
        const height = rows.length * rowHeight + 28;
        const plotWidth = width - label - 72;
        const max = Math.max(1, ...rows.map((row) => row.gzip));
        set(svg, { viewBox: `0 0 ${width} ${height}`, height });
        body.replaceChildren();
        const marks: SVGGElement[] = [];
        rows.forEach((row, index) => {
          const y = index * rowHeight + 4;
          const group = doc.createElementNS(ns, 'g') as SVGGElement;
          set(group, {
            tabindex: index === 0 ? 0 : -1,
            role: 'img',
            'aria-label': `${row.name}: ${kb(row.gzip)} gzip`,
          });
          group.style.outline = 'none';
          const name = doc.createElementNS(ns, 'text');
          set(name, {
            x: label - 8,
            y: y + 13,
            'text-anchor': 'end',
            fill: 'currentColor',
            'font-size': 12,
          });
          name.textContent = row.name;
          const componentWidth = (row.gzip / max) * plotWidth;
          const own = doc.createElementNS(ns, 'rect');
          set(own, {
            x: label,
            y,
            width: componentWidth,
            height: 18,
            rx: 3,
            fill: next.colors.gzip!,
          });
          const value = doc.createElementNS(ns, 'text');
          set(value, {
            x: label + componentWidth + 6,
            y: y + 13,
            fill: 'var(--tp-muted-foreground)',
            'font-size': 11,
            'font-variant-numeric': 'tabular-nums',
          });
          value.textContent = kb(row.gzip);
          // A focus ring drawn as part of the mark, since SVG groups have no outline box.
          const ring = doc.createElementNS(ns, 'rect');
          set(ring, {
            x: label - 3,
            y: y - 3,
            width: componentWidth + 6,
            height: 24,
            rx: 5,
            fill: 'none',
            stroke: 'var(--tp-ring)',
            'stroke-width': 2,
            visibility: 'hidden',
          });
          group.append(name, own, value, ring);
          // The tooltip points at the bar, not the whole row with its label.
          group.addEventListener('pointerenter', () => inspect(own, row, 'pointer'));
          group.addEventListener('pointerleave', () => clear('pointer'));
          group.addEventListener('focus', () => {
            ring.setAttribute('visibility', 'visible');
            inspect(own, row, 'focus');
          });
          group.addEventListener('blur', () => {
            ring.setAttribute('visibility', 'hidden');
            clear('focus');
          });
          group.addEventListener('keydown', (event) => {
            const step = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
            if (!step) return;
            event.preventDefault();
            const target = marks[Math.min(marks.length - 1, Math.max(0, index + step))]!;
            for (const mark of marks) mark.setAttribute('tabindex', mark === target ? '0' : '-1');
            target.focus();
          });
          marks.push(group);
          body.append(group);
        });
        const axis = doc.createElementNS(ns, 'text');
        set(axis, {
          x: label,
          y: height - 6,
          fill: 'var(--tp-muted-foreground)',
          'font-size': 11,
        });
        axis.textContent = `0 – ${kb(max)} gzip`;
        body.append(axis);
      },
      destroy() {
        svg.remove();
      },
    };
  },
};
