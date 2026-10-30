import { describe, expect, it } from 'vitest';
import { cometHeads, cometTail, computeField } from './light-field.js';
import { ringSamples } from './ring-samples.js';

const r = (x: number) => ({ x, y: x });
const box = { width: 300, height: 120, radii: [r(14), r(14), r(14), r(14)] as const };
const samples = ringSamples(box, 0.5);
const sum = (values: Float32Array) => values.reduce((total, value) => total + value, 0);
const circular = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));

describe('cometHeads', () => {
  it('keeps comets exactly evenly spaced at every phase, through the wrap', () => {
    for (const phase of [0, 0.37, 0.99, 1.01, 2.5]) {
      const heads = cometHeads(phase, 3, null).sort((a, b) => a - b);
      for (let index = 0; index < heads.length; index++)
        expect(circular(heads[index]!, heads[(index + 1) % heads.length]!)).toBeCloseTo(1 / 3, 6);
    }
  });

  it('uses a custom spacing', () => {
    expect(cometHeads(0.1, 2, 0.2)).toEqual([0.1, expect.closeTo(0.3, 6)]);
  });
});

describe('cometTail', () => {
  it('stays shorter than the gap to the next comet', () => {
    expect(cometTail(0.5, 2, null)).toBeCloseTo(0.45);
    expect(cometTail(0.1, 2, null)).toBeCloseTo(0.1);
    expect(cometTail(0.3, 3, 0.1)).toBeCloseTo(0.09);
    expect(cometTail(0.3, 1, null)).toBeCloseTo(0.3);
  });
});

describe('computeField', () => {
  it('lights the same amount of line at every phase, including across the start corner', () => {
    const tail = 0.15;
    const lit = [0, 0.004, 0.5, 0.996, 0.9999].map((phase) =>
      sum(
        computeField(samples, box, {
          comets: { heads: cometHeads(phase, 2, null), tail, direction: 1 },
        }).intensity,
      ),
    );
    for (const value of lit) expect(value).toBeCloseTo(lit[0]!, 0);
    expect(lit[0]).toBeGreaterThan(10);
  });

  it('makes a comet brightest and hottest at its head, fading along its tail', () => {
    const field = computeField(samples, box, {
      comets: { heads: [0.5], tail: 0.2, direction: 1 },
    });
    const at = (u: number) => {
      let best = 0;
      for (let index = 0; index < samples.count; index++)
        if (
          Math.abs(samples.s[index]! / samples.length - u) <
          Math.abs(samples.s[best]! / samples.length - u)
        )
          best = index;
      return best;
    };
    const head = at(0.5);
    const mid = at(0.4);
    const end = at(0.31);
    expect(field.intensity[head]).toBeGreaterThan(0.95);
    expect(field.core[head]).toBeGreaterThan(0.9);
    expect(field.intensity[mid]).toBeLessThan(field.intensity[head]!);
    expect(field.core[mid]).toBeLessThan(0.05);
    expect(field.intensity[end]).toBeLessThan(0.05);
    // Nothing well ahead of the head.
    expect(field.intensity[at(0.55)]).toBe(0);
  });

  it('lights by distance to a pointer, white-hot near it and dark beyond reach', () => {
    const field = computeField(samples, box, { pointer: { x: 0, y: 60, reach: 100 } });
    let nearest = 0;
    let farthest = 0;
    for (let index = 0; index < samples.count; index++) {
      const d = Math.hypot(samples.x[index]!, samples.y[index]! - 60);
      if (d < Math.hypot(samples.x[nearest]!, samples.y[nearest]! - 60)) nearest = index;
      if (d > Math.hypot(samples.x[farthest]!, samples.y[farthest]! - 60)) farthest = index;
    }
    expect(field.intensity[nearest]).toBeGreaterThan(0.95);
    expect(field.core[nearest]).toBeGreaterThan(0.9);
    expect(field.swell[nearest]).toBeGreaterThan(1.5);
    expect(field.intensity[farthest]).toBe(0);
  });

  it('passes a glint band from the top-left corner and lights the whole line for sweep and pulse', () => {
    const start = computeField(samples, box, { glint: { center: 0, half: 0.15, direction: 1 } });
    expect(start.intensity[0]).toBeGreaterThan(0.5);
    const end = computeField(samples, box, { glint: { center: 1, half: 0.15, direction: 1 } });
    expect(end.intensity[0]).toBe(0);
    const sweep = computeField(samples, box, { sweep: true });
    expect(Math.min(...sweep.intensity)).toBeCloseTo(0.9);
    const pulse = computeField(samples, box, { pulse: 0.5 });
    expect(Math.min(...pulse.intensity)).toBeCloseTo(0.5);
  });

  it('lights a glowing span along its stretch, through the start, hot at its ends', () => {
    const at = (u: number) => {
      let best = 0;
      for (let index = 0; index < samples.count; index++)
        if (
          Math.abs(samples.s[index]! / samples.length - u) <
          Math.abs(samples.s[best]! / samples.length - u)
        )
          best = index;
      return best;
    };
    const field = computeField(samples, box, { spans: [{ start: 0.9, end: 1.1 }] });
    expect(field.intensity[at(0.95)]).toBe(1);
    expect(field.intensity[at(0.05)]).toBe(1);
    expect(field.intensity[at(0.5)]).toBe(0);
    expect(field.core[at(0.95)]).toBe(0);
    expect(field.core[at(0.903)]).toBeGreaterThan(0.3);
    const empty = computeField(samples, box, { spans: [{ start: 0.3, end: 0.3 }] });
    expect(Math.max(...empty.intensity)).toBe(0);
  });
});
