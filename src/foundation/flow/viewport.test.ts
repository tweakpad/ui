import { describe, expect, it } from 'vitest';
import {
  autoPanVelocity,
  centerOn,
  clampViewport,
  flowToScreen,
  interpolateViewport,
  panBy,
  resolveFitPadding,
  screenToFlow,
  viewportForBounds,
  viewportsEqual,
  visibleRect,
  wheelZoomFactor,
  zoomBy,
  zoomToPoint,
} from './viewport.js';

const size = { width: 800, height: 600 };
const limits = { minZoom: 0.1, maxZoom: 4 };

describe('flow viewport', () => {
  it('converts between screen and flow space', () => {
    const viewport = { x: 100, y: 50, zoom: 2 };
    const flow = screenToFlow({ x: 300, y: 250 }, viewport);
    expect(flow).toEqual({ x: 100, y: 100 });
    expect(flowToScreen(flow, viewport)).toEqual({ x: 300, y: 250 });
    expect(visibleRect(viewport, size)).toEqual({ x: -50, y: -25, width: 400, height: 300 });
  });

  it('fits bounds with every padding form', () => {
    const bounds = { x: 0, y: 0, width: 400, height: 300 };
    const plain = viewportForBounds(bounds, size, { ...limits, padding: 0 });
    expect(plain.zoom).toBe(2);
    expect(plain).toEqual({ x: 0, y: 0, zoom: 2 });

    const ratio = viewportForBounds(bounds, size, { ...limits, padding: 0.1 });
    expect(ratio.zoom).toBeLessThan(2);
    expect(flowToScreen(bounds, ratio).x).toBeGreaterThanOrEqual(resolveFitPadding(0.1, size).left);

    const px = viewportForBounds(bounds, size, { ...limits, padding: '100px' });
    expect(px.zoom).toBeCloseTo(Math.min(600 / 400, 400 / 300), 6);
    expect(resolveFitPadding('100px', size)).toEqual({
      top: 100,
      right: 100,
      bottom: 100,
      left: 100,
      x: 200,
      y: 200,
    });

    const percent = viewportForBounds(bounds, size, { ...limits, padding: '10%' });
    expect(resolveFitPadding('10%', size)).toEqual({
      top: 60,
      right: 80,
      bottom: 60,
      left: 80,
      x: 160,
      y: 120,
    });
    expect(percent.zoom).toBeCloseTo(Math.min(640 / 400, 480 / 300), 6);

    const sides = viewportForBounds(bounds, size, {
      ...limits,
      padding: { left: '200px', right: 0, top: 0, bottom: 0 },
    });
    // Asymmetric padding shifts the content so the left gap is honored.
    expect(flowToScreen(bounds, sides).x).toBeGreaterThanOrEqual(200);
    expect(resolveFitPadding({ x: '10px', y: 0 }, size)).toEqual({
      top: 0,
      right: 10,
      bottom: 0,
      left: 10,
      x: 20,
      y: 0,
    });
    expect(resolveFitPadding('bogus', size).x).toBe(0);
  });

  it('clamps the fit zoom to its limits', () => {
    const tiny = viewportForBounds({ x: 0, y: 0, width: 10, height: 10 }, size, limits);
    expect(tiny.zoom).toBe(4);
    const huge = viewportForBounds({ x: 0, y: 0, width: 100000, height: 10 }, size, limits);
    expect(huge.zoom).toBe(0.1);
  });

  it('keeps the flow point under the pointer while zooming', () => {
    const viewport = { x: 120, y: -40, zoom: 1.5 };
    const screenPoint = { x: 333, y: 212 };
    const before = screenToFlow(screenPoint, viewport);
    const zoomed = zoomToPoint(viewport, 2.75, screenPoint, limits);
    expect(zoomed.zoom).toBe(2.75);
    const after = screenToFlow(screenPoint, zoomed);
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);

    const byFactor = zoomBy(viewport, 2, screenPoint, limits);
    expect(byFactor.zoom).toBe(3);
    const limited = zoomBy(viewport, 100, screenPoint, limits);
    expect(limited.zoom).toBe(4);
    const point = screenToFlow(screenPoint, limited);
    expect(point.x).toBeCloseTo(before.x, 9);
  });

  it('pans and centers', () => {
    expect(panBy({ x: 1, y: 2, zoom: 1 }, { x: 10, y: -5 })).toEqual({ x: 11, y: -3, zoom: 1 });
    const centered = centerOn({ x: 100, y: 100 }, size, 2);
    expect(screenToFlow({ x: 400, y: 300 }, centered)).toEqual({ x: 100, y: 100 });
  });

  it('constrains the translation to the extent', () => {
    const free = clampViewport({ x: -5000, y: 12, zoom: 9 }, { ...limits, size });
    expect(free).toEqual({ x: -5000, y: 12, zoom: 4 });

    const extent = [
      [0, 0],
      [400, 300],
    ] as const;
    // Smaller than the pane: the extent is centered.
    const small = clampViewport(
      { x: 0, y: 0, zoom: 1 },
      { ...limits, size, translateExtent: extent },
    );
    expect(small).toEqual({ x: 200, y: 150, zoom: 1 });
    // Larger than the pane: no empty space past an edge.
    const large = clampViewport(
      { x: 100, y: 100, zoom: 4 },
      { ...limits, size, translateExtent: extent },
    );
    expect(large).toEqual({ x: 0, y: 0, zoom: 4 });
    const farRight = clampViewport(
      { x: -2000, y: -2000, zoom: 4 },
      { ...limits, size, translateExtent: extent },
    );
    expect(farRight).toEqual({ x: -800, y: -600, zoom: 4 });
  });

  it('derives wheel zoom factors per delta mode', () => {
    expect(wheelZoomFactor(-100, 0)).toBeCloseTo(2 ** 0.2, 9);
    expect(wheelZoomFactor(10, 1)).toBeCloseTo(2 ** -0.5, 9);
    expect(wheelZoomFactor(1, 2)).toBe(0.5);
    expect(wheelZoomFactor(-10, 0, { pinch: true, mac: true })).toBeCloseTo(2 ** 0.2, 9);
    expect(wheelZoomFactor(-10, 0, { pinch: true, mac: false })).toBeCloseTo(2 ** 0.02, 9);
  });

  it('computes auto-pan velocity near the edges', () => {
    expect(autoPanVelocity({ x: 400, y: 300 }, size)).toEqual({ x: 0, y: 0 });
    expect(autoPanVelocity({ x: 0, y: 300 }, size)).toEqual({ x: 15, y: 0 });
    expect(autoPanVelocity({ x: 800, y: 600 }, size)).toEqual({ x: -15, y: -15 });
    expect(autoPanVelocity({ x: 20, y: 300 }, size).x).toBe(7.5);
    expect(autoPanVelocity({ x: 20, y: 300 }, size, { speed: 30, distance: 80 }).x).toBe(22.5);
  });

  it('interpolates viewports log-linearly', () => {
    const from = { x: 0, y: 0, zoom: 1 };
    const to = { x: 100, y: 50, zoom: 4 };
    expect(interpolateViewport(from, to, 0)).toEqual(from);
    expect(interpolateViewport(from, to, 1)).toEqual(to);
    const mid = interpolateViewport(from, to, 0.5);
    expect(mid).toEqual({ x: 50, y: 25, zoom: 2 });
    expect(interpolateViewport(from, to, 2)).toEqual(to);
    expect(viewportsEqual(mid, { x: 50, y: 25, zoom: 2.0000001 }, 1e-6)).toBe(true);
    expect(viewportsEqual(mid, to)).toBe(false);
  });
});
