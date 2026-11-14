import { createPlotStream, type PlotSeries } from '../../../../src/widgets/plot/index.js';
import { PlotHistoryRaster } from '../../../../src/widgets/plot/history-raster.js';
import { plotDomains } from '../../../../src/widgets/plot/geometry.js';
import type { PlotPaint } from '../../../../src/widgets/plot/types.js';
/** Tiny deterministic browser raster comparisons; no synthetic pointer/keyboard assertions. */
export function verifyPlotRaster(
  dense = false,
  variant: 'a' | 'b' | 'both' = 'both',
  filled = true,
  sliding = true,
  updates = 40,
  gradient = false,
) {
  const results: unknown[] = [];
  for (const interpolation of ['linear', 'step-before', 'step-after'] as const) {
    const stream = createPlotStream({
        seriesIds: ['a', 'b'],
        capacity: dense ? 2048 : 48,
        xMode: 'index',
      }),
      p = document.createElement('tp-plot');
    p.mode = 'push';
    p.window = dense ? 1024 : 24;
    p.yDomain = [-100, 100];
    p.stream = stream;
    p.renderStrategy = 'incremental';
    p.series = [
      {
        id: 'a',
        label: 'A',
        interpolation,
        fill: { baseline: 0, gradient },
        negativeColor: 'var(--tp-destructive)',
      },
      {
        id: 'b',
        label: 'B',
        interpolation,
        lineDash: [4, 3],
        fill: { baseline: 10, opacity: 0.3, gradient },
      },
    ] satisfies PlotSeries[];
    if (!filled) p.series = p.series.map((s) => ({ ...s, fill: false }));
    if (variant !== 'both') p.series = p.series.filter((s) => s.id === variant);
    const style = getComputedStyle(document.documentElement),
      paint: PlotPaint = {
        surface: style.backgroundColor,
        foreground: style.color,
        muted: style.color,
        grid: style.color,
        guide: style.color,
        colors: { a: 'rgb(40,180,100)', b: 'rgb(180,140,30)' },
        negativeColors: { a: 'rgb(220,50,50)', b: 'rgb(180,140,30)' },
        negativeFills: { a: 'rgb(220,50,50)', b: 'rgb(180,140,30)' },
        font: style.font,
      };
    const views = new Map(stream.seriesIds.map((id) => [id, stream.view(id)])),
      incremental = new PlotHistoryRaster(document, sliding),
      full = new PlotHistoryRaster(document);
    // Keep readback from switching one renderer's raster backend midway through the comparison.
    incremental.canvas.getContext('2d', { willReadFrequently: true });
    full.canvas.getContext('2d', { willReadFrequently: true });
    const output = document.createElement('canvas');
    output.width = 240;
    output.height = 100;
    const outputContext = output.getContext('2d', { willReadFrequently: true })!;
    let generation = 0;
    const compare = (label: string) => {
      const domains = plotDomains(p, views),
        frame = {
          config: p,
          views,
          ...domains,
          width: 240,
          height: 100,
          ratio: 1,
          paint,
          generation,
        };
      const incrementalFraction = incremental.paint(frame);
      const fullFraction = full.paint({
        ...frame,
        config: {
          ...p,
          series: p.series,
          data: p.data,
          stream,
          mode: p.mode,
          xDomain: p.xDomain,
          yDomain: p.yDomain,
          window: p.window,
          follow: p.follow,
          clock: p.clock,
          autoRange: p.autoRange,
          xAxis: p.xAxis,
          yAxis: p.yAxis,
          background: p.background,
          grid: p.grid,
          guides: p.guides,
          maxFrameRate: p.maxFrameRate,
          maxPixelRatio: p.maxPixelRatio,
          renderStrategy: 'full',
          decimation: p.decimation,
          locale: p.locale,
          timeZone: p.timeZone,
          scheduler: p.scheduler,
        },
      });
      outputContext.clearRect(0, 0, 240, 100);
      incremental.composite(outputContext, 0, 0, 0);
      const a = outputContext.getImageData(0, 0, 240, 100).data,
        b = full.canvas.getContext('2d')!.getImageData(0, 0, 240, 100).data;
      let total = 0,
        bad = 0;
      // Worst RGB error over black/white composition also bounds every opaque background.
      let visibleTotal = 0,
        visibleBad = 0;
      for (let i = 0; i < a.length; i++) {
        const d = Math.abs(a[i]! - b[i]!);
        total += d;
        if (d > 24) bad++;
        const ai = (i & ~3) + 3,
          alphaA = a[ai]! / 255,
          alphaB = b[ai]! / 255;
        const ca = a[i]! * alphaA,
          cb = b[i]! * alphaB;
        const visible =
          i % 4 === 3
            ? d
            : Math.max(
                Math.abs(ca - cb),
                Math.abs(ca + 255 * (1 - alphaA) - cb - 255 * (1 - alphaB)),
              );
        visibleTotal += visible;
        if (visible > 24) visibleBad++;
      }
      return {
        label,
        incrementalFraction,
        fullFraction,
        visibleMean: visibleTotal / a.length,
        visibleBadFraction: visibleBad / a.length,
        mean: total / a.length,
        badFraction: bad / a.length,
        stats: incremental.stats,
      };
    };
    for (let i = 0; i < (dense ? 1100 : 40); i++)
      stream.push({ a: Math.sin(i * 0.4) * 80, b: i % 9 === 0 ? null : Math.cos(i * 0.3) * 60 });
    const initial = compare('initial');
    for (let i = 0; i < updates; i++) {
      stream.push({ a: Math.sin(i * 0.5) * 80, b: i % 9 === 0 ? null : Math.cos(i * 0.3) * 60 });
      compare('push');
    }
    const push = compare('wrap');
    stream.replaceLatest('a', 99);
    const peak = compare('peak');
    stream.replaceLatest('a', -2);
    const retract = compare('retract');
    stream.clear();
    generation++;
    const reset = compare('reset');
    results.push({ interpolation, initial, push, peak, retract, reset });
    incremental.dispose();
    full.dispose();
    stream.dispose();
  }
  return results;
}
