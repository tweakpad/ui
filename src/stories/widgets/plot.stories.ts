import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { createPlotStream, type TpPlot } from '../../widgets/plot/index.js';
import { libraryDocs } from '../library-docs.js';
import type { PlotSeries, PlotPoint } from '../../widgets/plot/types.js';
interface Args {
  label: string;
  background: 'none' | 'solid' | 'dots' | 'grid';
  axes: boolean;
  legend: boolean;
  interaction: 'none' | 'inspect';
  lineWidth: number;
  fill: boolean;
  gradient: boolean;
  crosshair: boolean;
  size: 'sm' | 'default' | 'lg';
}
const points = Array.from({ length: 240 }, (_, i) => [i, Math.sin((i * Math.PI) / 40)] as const);
const meta: Meta<Args> = {
  title: 'Widgets/Plot',
  component: 'tp-plot',
  parameters: { docs: libraryDocs('widgets/plot') },
  args: {
    label: 'Live signal',
    background: 'solid',
    axes: false,
    legend: false,
    interaction: 'none',
    lineWidth: 1.5,
    fill: true,
    gradient: false,
    crosshair: false,
    size: 'default',
  },
  argTypes: {
    label: { control: 'text' },
    background: { control: 'select', options: ['none', 'solid', 'dots', 'grid'] },
    axes: { control: 'boolean' },
    legend: { control: 'boolean' },
    interaction: { control: 'select', options: ['none', 'inspect'] },
    lineWidth: { control: { type: 'number', min: 0, max: 6, step: 0.5 } },
    fill: { control: 'boolean' },
    gradient: { control: 'boolean' },
    crosshair: { control: 'boolean' },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
  },
  render: (args) => {
    let dispose: (() => void) | undefined;
    return html`<tp-plot
      .label=${args.label}
      .background=${args.background}
      .xAxis=${args.axes ? {} : false}
      .yAxis=${args.axes ? {} : false}
      .legend=${args.legend ? {} : false}
      .interaction=${args.interaction}
      .crosshair=${args.crosshair}
      .size=${args.size}
      mode="scroll"
      follow="clock"
      window="12000"
      y-domain="0 100"
      max-frame-rate="120"
      .partPresentation=${{
        'plot-label': { styleHook: { display: 'none' } },
      }}
      .series=${[{ id: 'signal', label: 'Signal', color: 'var(--tp-chart-1)', lineWidth: args.lineWidth, fill: args.fill ? (args.gradient ? { baseline: 0, gradient: true } : { baseline: 0, opacity: 0.07 }) : false }] satisfies PlotSeries[]}
      ${ref((element?: Element) => {
        dispose?.();
        dispose = undefined;
        if (!element) return;
        const plot = element as TpPlot;
        const stream = createPlotStream({ seriesIds: ['signal'], capacity: 256 });
        plot.stream = stream;
        const next = () => 8 + Math.random() * 80;
        const start = performance.now();
        plot.clock = () => performance.now() - 100;
        stream.appendBatch([
          {
            series: 'signal',
            points: Array.from(
              { length: 122 },
              (_, i) => [start - 12100 + i * 100, next()] as const,
            ),
          },
        ]);
        const tick = () => {
          if (!plot.isConnected) {
            stream.dispose();
            return;
          }
          if (!document.hidden) stream.append('signal', [performance.now(), next()]);
          timer = window.setTimeout(tick, 100);
        };
        let timer = window.setTimeout(tick, 100);
        dispose = () => {
          window.clearTimeout(timer);
          stream.dispose();
        };
      })}
      style="inline-size:100%;height:12rem"
    ></tp-plot>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
const histogramCounts = [
  0, 0, 0, 5, 2, 4, 8, 12, 25, 14, 18, 13, 45, 25, 73, 66, 88, 79, 54, 52, 26, 43, 51, 40, 49, 50,
  42, 60, 52, 34, 38, 29, 48, 47, 49, 31, 25, 15, 26, 23, 28, 23, 23, 14, 17, 0, 0, 2, 6, 0,
];
const histogramPoints: PlotPoint[] = histogramCounts.flatMap((count, i): PlotPoint[] => [
  [i + 0.1, count],
  [i + 0.9, count],
  [i + 0.9, null],
]);
export const Histogram: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-plot
      label="Sample distribution"
      background="solid"
      x-domain="0 50"
      y-domain="0 100"
      .series=${[{ id: 'counts', label: 'Count', line: false, color: 'var(--tp-chart-1)', fill: { baseline: 0, opacity: 1 } }] satisfies PlotSeries[]}
      .data=${{ counts: histogramPoints }}
      .partPresentation=${{
        'plot-label': { styleHook: { display: 'none' } },
      }}
      .guides=${[
        ...[0, 12, 24, 36, 48].map((value) => ({
          id: 'x-' + value,
          axis: 'x',
          value,
          dash: [1, 4],
        })),
        ...[0, 20, 40, 60, 80, 100].map((value) => ({
          id: 'y-' + value,
          axis: 'y',
          value,
          dash: [1, 4],
        })),
      ]}
      style="inline-size:100%;height:auto;aspect-ratio:16/9"
    ></tp-plot>`,
};
export const SignedArea: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-plot
      label="Signed load"
      background="solid"
      y-domain="-1.2 1.2"
      .series=${[{ id: 'load', label: 'Load', fill: { baseline: 0 }, negativeColor: 'var(--tp-destructive)' }]}
      .data=${{ load: points }}
      .guides=${[{ id: 'zero', axis: 'y', value: 0 }]}
      style="height:12rem"
    ></tp-plot>`,
};
export const Monitors: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-plot
      label="Service CPU"
      background="grid"
      .xAxis=${{}}
      .yAxis=${{}}
      .legend=${{}}
      .series=${[
        { id: 'a', label: 'Service A', fill: { baseline: 0 } },
        { id: 'b', label: 'Service B', lineDash: [4, 2], fill: { baseline: 0 } },
      ]}
      .data=${{ a: points.map(([x, y]) => [x, (y + 1) * 30]), b: points.map(([x, y]) => [x, 40 + y * 12]) }}
      style="height:16rem"
    ></tp-plot>`,
};
