import { describe, expect, it } from 'vitest';
import {
  MAX_TRAVEL_DURATION,
  MIN_TRAVEL_DURATION,
  easeInOut,
  interpolateCamera,
  travelDuration,
  tweenCamera,
} from './camera.js';
import { DEFAULT_CAMERA, mergeCamera, type MapCamera } from './geo.js';
import { ManualFrames } from '../fakes.test.js';

const lisbon = mergeCamera(DEFAULT_CAMERA, {
  center: { latitude: 38.7, longitude: -9.1 },
  zoom: 12,
});
const porto = mergeCamera(DEFAULT_CAMERA, {
  center: { latitude: 41.15, longitude: -8.61 },
  zoom: 14,
});

describe('map camera motion (map-f-motion)', () => {
  it('interpolates endpoints exactly and takes the shortest bearing turn', () => {
    expect(interpolateCamera(lisbon, porto, 0).center.latitude).toBeCloseTo(38.7);
    expect(interpolateCamera(lisbon, porto, 1).zoom).toBeCloseTo(14);
    const turn = interpolateCamera(
      mergeCamera(lisbon, { bearing: 350 }),
      mergeCamera(lisbon, { bearing: 10 }),
      0.5,
    );
    expect(turn.bearing).toBeCloseTo(0);
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
  });

  it('scales travel duration within 600–1500 ms', () => {
    const size = { width: 400, height: 300 };
    expect(travelDuration(lisbon, lisbon, size)).toBe(MIN_TRAVEL_DURATION);
    expect(travelDuration(lisbon, porto, size)).toBe(MAX_TRAVEL_DURATION);
  });

  it('tweens once per frame and stops when aborted', async () => {
    const frames = new ManualFrames();
    const applied: MapCamera[] = [];
    const done = tweenCamera(lisbon, porto, 100, (camera) => applied.push(camera), frames);
    frames.run(10, 16);
    await expect(done).resolves.toBe(true);
    expect(applied.at(-1)).toBe(porto);
    expect(applied.length).toBe(7);

    const controller = new AbortController();
    const partial: MapCamera[] = [];
    const aborted = tweenCamera(
      lisbon,
      porto,
      100,
      (camera) => partial.push(camera),
      frames,
      controller.signal,
    );
    frames.tick(16);
    controller.abort();
    frames.run(5);
    await expect(aborted).resolves.toBe(false);
    expect(partial.length).toBe(1);
  });
});
