import { describe, expect, it } from 'vitest';
import { PlotGradientCache } from '../../../../src/widgets/plot/renderer.js';
import { validatePlot } from '../../../../src/widgets/plot/geometry.js';
import { crosshairFormat } from '../../../../src/widgets/plot/decorations.js';
import type { PlotConfiguration } from '../../../../src/widgets/plot/types.js';

/** A context that normalizes colors as canvas does and records the gradients it creates. */
function fakeContext() {
  const created: { from: number; to: number; stops: [number, string][] }[] = [];
  let fill = '#000000';
  const context = {
    get fillStyle() {
      return fill;
    },
    set fillStyle(value: string) {
      fill = value === 'rgb(10, 20, 30)' ? '#0a141e' : value;
    },
    createLinearGradient(_x0: number, from: number, _x1: number, to: number) {
      const record = { from, to, stops: [] as [number, string][] };
      created.push(record);
      return {
        addColorStop: (offset: number, color: string) => record.stops.push([offset, color]),
      };
    },
  };
  return { context: context as unknown as CanvasRenderingContext2D, created };
}

describe('Plot gradient areas', () => {
  it('fades the series color to the same color without alpha at the baseline', () => {
    const { context, created } = fakeContext();
    new PlotGradientCache().get(context, 'a', false, 'rgb(10, 20, 30)', 0, 80);
    expect(created).toEqual([
      {
        from: 0,
        to: 80,
        stops: [
          [0, '#0a141e'],
          [1, 'rgba(10, 20, 30, 0)'],
        ],
      },
    ]);
  });

  it('reuses a gradient until the mapping or the color changes', () => {
    const { context, created } = fakeContext();
    const cache = new PlotGradientCache();
    const first = cache.get(context, 'a', false, 'rgb(10, 20, 30)', 0, 80);
    expect(cache.get(context, 'a', false, 'rgb(10, 20, 30)', 0, 80)).toBe(first);
    cache.get(context, 'a', true, 'rgb(10, 20, 30)', 100, 80);
    cache.get(context, 'a', false, 'rgb(10, 20, 30)', 0, 60);
    expect(created).toHaveLength(3);
    cache.clear();
    cache.get(context, 'a', false, 'rgb(10, 20, 30)', 0, 60);
    expect(created).toHaveLength(4);
  });
});

describe('Plot options', () => {
  const base = {
    series: [{ id: 'a', label: 'A' }],
    data: {},
    stream: undefined,
    mode: 'static',
    xDomain: 'auto',
    yDomain: 'auto',
    window: 10,
    follow: 'latest',
    clock: undefined,
    autoRange: {},
    xAxis: false,
    yAxis: false,
    background: 'none',
    grid: {},
    guides: [],
    maxFrameRate: 10,
    maxPixelRatio: 2,
    renderStrategy: 'auto',
    decimation: 'auto',
    locale: 'en-US',
    timeZone: 'UTC',
    scheduler: undefined,
  } as unknown as PlotConfiguration;

  it('accepts gradient fills, latest markers and guide label placement', () => {
    expect(() =>
      validatePlot({
        ...base,
        series: [{ id: 'a', label: 'A', fill: { baseline: 0, gradient: true }, marker: 'latest' }],
        guides: [
          { id: 'g', axis: 'y', value: 1, label: 'G', labelAlign: 'end', labelSide: 'above' },
        ],
      }),
    ).not.toThrow();
  });

  it('rejects unknown markers and label placements', () => {
    expect(() =>
      validatePlot({ ...base, series: [{ id: 'a', label: 'A', marker: 'first' as 'latest' }] }),
    ).toThrow(/marker/u);
    expect(() =>
      validatePlot({
        ...base,
        guides: [{ id: 'g', axis: 'y', value: 1, labelAlign: 'middle' as 'end' }],
      }),
    ).toThrow(/label placement/u);
  });

  it('formats a crosshair x in full on time axes', () => {
    expect(crosshairFormat(base, { type: 'time' }, Date.UTC(2026, 10, 13, 14, 42))).toBe(
      'Nov 13, 2026, 2:42 PM',
    );
    expect(crosshairFormat(base, {}, 715.84)).toBe('715.84');
  });
});
