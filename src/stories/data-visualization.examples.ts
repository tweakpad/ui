import { html } from 'lit';
import type {
  VisualizationRenderer,
  VisualizationSnapshot,
  VisualizationInteraction,
  VisualizationTooltipOptions,
  VisualizationLegendOptions,
} from '../components/data-visualization/index.js';

export const quarterlyData = [
  { quarter: 'Q1', desktop: 186, mobile: 80 },
  { quarter: 'Q2', desktop: 305, mobile: 200 },
  { quarter: 'Q3', desktop: 237, mobile: 120 },
  { quarter: 'Q4', desktop: 273, mobile: 190 },
];
export const quarterlySeries = {
  desktop: { label: 'Desktop', color: 'var(--tp-chart-1)', appearance: { pattern: 'solid' } },
  mobile: { label: 'Mobile', color: 'var(--tp-chart-2)', appearance: { pattern: 'striped' } },
};
/** Consumer SVG adapter. Geometry belongs here, outside the library control. */
export const quarterlyRenderer: VisualizationRenderer = {
  mount(plot, context) {
    const doc = plot.ownerDocument;
    const svg = doc.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 640 320');
    svg.setAttribute('role', 'group');
    svg.setAttribute('aria-label', 'Quarterly visits by device');
    const axes = doc.createElementNS(svg.namespaceURI, 'g');
    const marks = doc.createElementNS(svg.namespaceURI, 'g');
    const defs = doc.createElementNS(svg.namespaceURI, 'defs');
    svg.append(defs, axes, marks);
    plot.append(svg);
    let current: VisualizationSnapshot;
    let legendSeries: VisualizationSnapshot['series'] | undefined;
    let focused: SVGElement | null = null;
    const records = new Map<
      string,
      { mark: SVGElement; row: Record<string, unknown>; key: string; clean: () => void }
    >();
    const attributes = (element: Element, values: Record<string, string | number>) => {
      for (const [key, value] of Object.entries(values)) element.setAttribute(key, String(value));
    };
    const text = (x: number, y: number, value: string) => {
      const node = doc.createElementNS(svg.namespaceURI, 'text');
      attributes(node, { x, y, fill: 'currentColor', 'text-anchor': 'middle', 'font-size': '12' });
      node.textContent = value;
      axes.append(node);
    };
    const inspect = (
      mark: SVGElement,
      row: Record<string, unknown>,
      source: 'pointer' | 'focus',
    ) => {
      context.inspect({
        active: true,
        source,
        label: row.quarter,
        anchor: { getBoundingRectangle: () => mark.getBoundingClientRect(), contextElement: mark },
        payload: Object.keys(current.series).map((key) => ({
          dataKey: key,
          name: current.series[key]!.label ?? key,
          value: row[key],
          color: current.colors[key]!,
          payload: row,
        })),
      });
    };
    return {
      update(snapshot) {
        current = snapshot;
        const keys = Object.keys(snapshot.series);
        const max = Math.max(
          1,
          ...snapshot.data.flatMap((row) => keys.map((key) => Number(row[key]) || 0)),
        );
        axes.replaceChildren();
        defs.replaceChildren();
        for (let tick = 0; tick <= 4; tick++) {
          const y = 280 - tick * 60;
          const line = doc.createElementNS(svg.namespaceURI, 'line');
          attributes(line, {
            x1: 45,
            x2: 625,
            y1: y,
            y2: y,
            stroke: 'var(--tp-border)',
            'stroke-dasharray': '4 4',
          });
          axes.append(line);
          text(20, y + 4, String(Math.round((max * tick) / 4)));
        }
        keys.forEach((key, index) => {
          if (index % 2 === 0) return;
          const pattern = doc.createElementNS(svg.namespaceURI, 'pattern');
          attributes(pattern, {
            id: `${snapshot.id}-pattern-${index}`,
            width: 8,
            height: 8,
            patternUnits: 'userSpaceOnUse',
            patternTransform: 'rotate(45)',
          });
          const background = doc.createElementNS(svg.namespaceURI, 'rect');
          attributes(background, { width: 8, height: 8, fill: snapshot.colors[key]! });
          const line = doc.createElementNS(svg.namespaceURI, 'line');
          attributes(line, { y2: 8, stroke: 'var(--tp-background)', 'stroke-width': 2 });
          pattern.append(background, line);
          defs.append(pattern);
        });
        const present = new Set<string>();
        snapshot.data.forEach((row, rowIndex) => {
          const group = 580 / Math.max(1, snapshot.data.length);
          const width = Math.min(44, group / (keys.length + 1));
          const start = 45 + rowIndex * group + (group - width * keys.length) / 2;
          text(45 + (rowIndex + 0.5) * group, 306, String(row.quarter));
          keys.forEach((key, index) => {
            const identity = `${row.quarter}:${key}`;
            present.add(identity);
            let record = records.get(identity);
            if (!record) {
              const mark = doc.createElementNS(svg.namespaceURI, 'rect') as SVGElement;
              const enter = () => inspect(mark, records.get(identity)!.row, 'pointer');
              const focus = () => {
                focused = mark;
                inspect(mark, records.get(identity)!.row, 'focus');
              };
              const leave = () => {
                if (!focused) context.inspect({ active: false, source: 'pointer', payload: [] });
                else {
                  const active = [...records.values()].find((record) => record.mark === focused);
                  if (active) inspect(active.mark, active.row, 'focus');
                }
              };
              const blur = () => {
                focused = null;
                context.inspect({ active: false, source: 'focus', payload: [] });
              };
              const keydown = (event: KeyboardEvent) => {
                const available = [...records.values()].map((record) => record.mark);
                let target = available.indexOf(mark);
                if (event.key === 'ArrowRight' || event.key === 'ArrowDown') target++;
                else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') target--;
                else if (event.key === 'Home') target = 0;
                else if (event.key === 'End') target = available.length - 1;
                else return;
                event.preventDefault();
                available[Math.max(0, Math.min(available.length - 1, target))]?.focus();
              };
              mark.addEventListener('pointerenter', enter);
              mark.addEventListener('pointerleave', leave);
              mark.addEventListener('focus', focus);
              mark.addEventListener('blur', blur);
              mark.addEventListener('keydown', keydown);
              record = {
                mark,
                row,
                key,
                clean: () => {
                  mark.removeEventListener('pointerenter', enter);
                  mark.removeEventListener('pointerleave', leave);
                  mark.removeEventListener('focus', focus);
                  mark.removeEventListener('blur', blur);
                  mark.removeEventListener('keydown', keydown);
                  mark.remove();
                },
              };
              records.set(identity, record);
              marks.append(mark);
            }
            record.row = row;
            const value = Number(row[key]) || 0;
            const height = Math.max(0, (value / max) * 240);
            attributes(record.mark, {
              x: start + index * width,
              y: 280 - height,
              width: width * 0.85,
              height,
              rx: 3,
              fill: index % 2 ? `url(#${snapshot.id}-pattern-${index})` : snapshot.colors[key]!,
              role: 'img',
              tabindex:
                snapshot.interaction === 'both' || snapshot.interaction === 'focus' ? 0 : -1,
              'aria-label': `${row.quarter}, ${snapshot.series[key]!.label ?? key}: ${value}`,
            });
          });
        });
        for (const [key, record] of records)
          if (!present.has(key)) {
            record.clean();
            records.delete(key);
          }
        const payload = keys.map((key) => ({
          dataKey: key,
          value: key,
          color: snapshot.colors[key]!,
        }));
        if (legendSeries !== snapshot.series) {
          context.legend(payload);
          legendSeries = snapshot.series;
        }
      },
      destroy() {
        for (const record of records.values()) record.clean();
        records.clear();
        svg.remove();
      },
    };
  },
};

export function dataVisualizationExample(
  interaction: VisualizationInteraction = 'both',
  tooltipOptions: VisualizationTooltipOptions = {},
  legendOptions: VisualizationLegendOptions = {},
) {
  return html`<tp-data-visualization
    label="Quarterly visits"
    description="Desktop visits peaked in Q2. Desktop exceeded mobile in every quarter; stripes distinguish mobile bars."
    .data=${quarterlyData}
    .series=${quarterlySeries}
    .renderer=${quarterlyRenderer}
    .interaction=${interaction}
    .tooltipOptions=${tooltipOptions}
    .legendOptions=${legendOptions}
  >
    <tp-table slot="table" label="Quarterly visits by device">
      <table>
        <caption>
          Visits by quarter
        </caption>
        <thead>
          <tr>
            <th scope="col">Quarter</th>
            <th scope="col">Desktop</th>
            <th scope="col">Mobile</th>
          </tr>
        </thead>
        <tbody>
          ${quarterlyData.map(
            (row) =>
              html`<tr>
                <th scope="row">${row.quarter}</th>
                <td>${row.desktop}</td>
                <td>${row.mobile}</td>
              </tr>`,
          )}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row">Total</th>
            <td>${quarterlyData.reduce((sum, row) => sum + row.desktop, 0)}</td>
            <td>${quarterlyData.reduce((sum, row) => sum + row.mobile, 0)}</td>
          </tr>
        </tfoot>
      </table>
    </tp-table>
  </tp-data-visualization>`;
}
