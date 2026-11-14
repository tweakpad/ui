import type {
  PlotConfiguration,
  PlotDomain,
  PlotPaint,
  PlotRenderStats,
  PlotSamples,
} from './types.js';
import { plotPoints } from './decimation.js';
import { paintPlotSeries, PlotGradientCache } from './renderer.js';
import { PlotDashPhase } from './dash-phase.js';
import { lowerBound } from './geometry.js';
export interface PlotFrame {
  config: PlotConfiguration;
  views: ReadonlyMap<string, PlotSamples>;
  x: PlotDomain;
  y: PlotDomain;
  width: number;
  height: number;
  ratio: number;
  paint: PlotPaint;
  generation: number;
}
/** Transparent history cache: integer shifts, fractional presentation, and bounded dirty strips. */
export class PlotHistoryRaster {
  readonly canvas: HTMLCanvasElement;
  readonly #dashes = new Map<string, PlotDashPhase>();
  /** Area gradients of the series that use them; never created for solid fills. */
  #gradients: PlotGradientCache | undefined;
  #offset = 0;
  #width = 0;
  #last:
    | {
        frame: PlotFrame;
        end: number;
        revision: number;
        fraction: number;
        firsts: Map<string, number>;
      }
    | undefined;
  #stats: PlotRenderStats = {
    strategy: 'full',
    fullRedraws: 0,
    incrementalPaints: 0,
    shiftedDevicePixels: 0,
    redrawnColumns: 0,
    fallbackReason: null,
  };
  constructor(
    owner: Document,
    readonly sliding = false,
  ) {
    this.canvas = owner.createElement('canvas');
  }
  get stats(): PlotRenderStats {
    return { ...this.#stats };
  }
  reset(): void {
    this.#last = undefined;
    this.#offset = 0;
  }
  dispose(): void {
    this.#last = undefined;
    this.#offset = 0;
    this.#width = 0;
    this.#dashes.clear();
    this.canvas.width = 0;
    this.canvas.height = 0;
  }
  /** Present one viewport from the bounded raster atlas, including its fractional guard. */
  composite(ctx: CanvasRenderingContext2D, left: number, top: number, fraction: number): void {
    ctx.drawImage(
      this.canvas,
      this.#offset,
      0,
      this.#width,
      this.canvas.height,
      left - fraction,
      top,
      this.#width,
      this.canvas.height,
    );
  }
  paint(f: PlotFrame): number {
    const { config: c, width: w, height: h, ratio } = f;
    // Fractional composition may sample just beyond the viewport's right edge.
    const cacheWidth = w + 2;
    const stream = c.stream;
    const eligible =
      c.mode !== 'static' &&
      c.yDomain !== 'auto' &&
      !!stream &&
      [...f.views.values()].every((v) => v.monotonic);
    if (c.renderStrategy === 'incremental' && !eligible)
      throw new Error('Incremental Plot needs a monotonic stream, scrolling mode, fixed y domain.');
    const last = this.#last;
    const previous = last?.frame;
    // Numeric comparisons avoid building an allocation-heavy string key every frame.
    const sameMapping =
      !!previous &&
      previous.width === w &&
      previous.height === h &&
      previous.ratio === ratio &&
      previous.y[0] === f.y[0] &&
      previous.y[1] === f.y[1] &&
      previous.x[1] - previous.x[0] === f.x[1] - f.x[0] &&
      previous.generation === f.generation &&
      previous.config.mode === c.mode &&
      previous.config.renderStrategy === c.renderStrategy;
    if (!sameMapping) this.#dashes.clear();
    // Gradients follow the vertical mapping and the resolved colors; a new paint drops them.
    if (this.#gradients && (!sameMapping || previous?.paint !== f.paint)) this.#gradients.clear();
    if (
      !this.#gradients &&
      previous?.config !== c &&
      c.series.some((s) => s.fill && s.fill.gradient)
    )
      this.#gradients = new PlotGradientCache();
    const delta = stream?.changesSince(last?.revision ?? -1);
    const scale = w / (f.x[1] - f.x[0]);
    const distance = last ? (f.x[1] - last.end) * scale : 0;
    const coherent =
      eligible && !!last && sameMapping && !delta?.reset && distance >= 0 && distance < w;
    const incremental = c.renderStrategy !== 'full' && coherent;
    for (const series of c.series) {
      const view = f.views.get(series.id);
      if (!view || !series.lineDash?.length) continue;
      let phase = this.#dashes.get(series.id);
      if (!phase) {
        phase = new PlotDashPhase();
        this.#dashes.set(series.id, phase);
      }
      phase.prepare(
        view,
        series,
        scale,
        h / (f.y[1] - f.y[0]),
        delta?.firstX ?? -Infinity,
        !last || !sameMapping || !!delta?.reset,
      );
    }
    const ctx = this.canvas.getContext('2d')!;
    const displacement = coherent && last ? distance + last.fraction : 0;
    const move = Math.floor(displacement + 1e-8);
    // The full baseline uses the same device-pixel lattice and redraws all geometry.
    // This keeps decimation and fractional composition comparable with cached history.
    const fraction = displacement - move;
    let strips: [number, number][] = [];
    const margin =
      Math.ceil((Math.max(1, ...c.series.map((s) => s.lineWidth ?? 1.5)) * ratio) / 2) + 2;
    const sliding = this.sliding && eligible && c.renderStrategy !== 'full';
    const backingWidth = sliding ? cacheWidth * 2 : cacheWidth;
    this.#width = cacheWidth;
    if (this.canvas.width !== backingWidth || this.canvas.height !== h) {
      this.canvas.width = backingWidth;
      this.canvas.height = h;
    }
    if (incremental && last) {
      if (move > 0) {
        if (sliding && this.#offset + move + cacheWidth <= backingWidth) {
          // Advance the viewport through the atlas without copying existing pixels.
          this.#offset += move;
        } else {
          // Compact only when the viewport reaches the end of the bounded atlas.
          // Copy compositing also clears the newly exposed right edge.
          ctx.globalCompositeOperation = 'copy';
          ctx.drawImage(
            this.canvas,
            this.#offset + move,
            0,
            cacheWidth - move,
            h,
            0,
            0,
            cacheWidth - move,
            h,
          );
          ctx.globalCompositeOperation = 'source-over';
          this.#offset = 0;
        }
        this.#stats.shiftedDevicePixels += move;
      }
      const changed = delta?.firstX ?? Infinity;
      let dirty = cacheWidth;
      if (Number.isFinite(changed)) {
        for (const view of f.views.values()) {
          const i = Math.max(0, lowerBound(view, changed) - 1);
          if (view.length)
            dirty = Math.min(dirty, (view.at(i)[0] - f.x[0]) * scale + fraction - margin);
        }
      }
      if (move) dirty = Math.min(dirty, w - move - margin);
      if (dirty < cacheWidth) strips.push([Math.max(0, Math.floor(dirty)), cacheWidth]);
      // Remove still-visible pixels lost to retention, including their joining segment.
      for (const [id, view] of f.views) {
        if (!view.length) continue;
        const first = view.at(0)[0];
        if (first > (last.firsts.get(id) ?? first)) {
          const end = (first - f.x[0]) * scale + fraction + margin;
          if (end > 0) strips.push([0, Math.min(w, Math.ceil(end))]);
        }
      }
      this.#stats.strategy = 'incremental';
      this.#stats.incrementalPaints++;
      this.#stats.fallbackReason = null;
    } else {
      this.#offset = 0;
      ctx.clearRect(0, 0, backingWidth, h);
      strips = [[0, cacheWidth]];
      this.#stats.strategy = 'full';
      this.#stats.fullRedraws++;
      this.#stats.fallbackReason = !last
        ? 'initial'
        : !eligible
          ? 'ineligible'
          : !sameMapping
            ? 'configuration'
            : delta?.reset
              ? 'source revision'
              : 'domain jump';
    }
    // Keep the fractional correction in pixel space: subtracting it from a large
    // epoch timestamp loses precision and can change a pixel-column bucket.
    const rasterX = f.x;
    // Merge overlapping dirty strips before alpha recomposition.
    strips.sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const strip of strips) {
      const prev = merged.at(-1);
      if (prev && strip[0] <= prev[1]) prev[1] = Math.max(prev[1], strip[1]);
      else merged.push([...strip]);
    }
    for (const [left, right] of merged) {
      ctx.save();
      ctx.translate(this.#offset, 0);
      ctx.beginPath();
      ctx.rect(left, 0, right - left, h);
      ctx.clip();
      ctx.clearRect(left, 0, right - left, h);
      for (const series of c.series) {
        if (series.visible === false) continue;
        const view = f.views.get(series.id);
        if (!view) continue;
        const from = rasterX[0] + (left - margin - fraction) / scale,
          to = rasterX[0] + (right + margin - fraction) / scale;
        const dashed = series.lineDash?.length
          ? this.#dashes
              .get(series.id)
              ?.points(view, from, to, rasterX, w, c.decimation === 'auto', fraction)
          : undefined;
        const points =
          dashed?.points ??
          plotPoints(view, rasterX, w, c.decimation === 'auto', from, to, undefined, fraction);
        paintPlotSeries(
          ctx,
          points,
          series,
          rasterX,
          f.y,
          w,
          h,
          f.paint,
          ratio,
          dashed?.offset,
          !!dashed && c.decimation === 'auto',
          fraction,
          this.#gradients,
        );
      }
      ctx.restore();
      this.#stats.redrawnColumns += right - left;
    }
    this.#last = {
      frame: f,
      end: f.x[1],
      revision: stream?.revision ?? 0,
      fraction,
      firsts:
        sameMapping && last?.revision === (stream?.revision ?? 0)
          ? last.firsts
          : new Map([...f.views].map(([id, v]) => [id, v.length ? v.at(0)[0] : Infinity])),
    };
    return fraction;
  }
}
