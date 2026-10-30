import { describe, expect, it } from 'vitest';
import { emptyField } from '../../foundation/border-ring/light-field.js';
import { ringSamples } from '../../foundation/border-ring/ring-samples.js';
import { cometHeads, cometTail, lightGlow, type GlowSources } from './lights.js';

const r = (x: number) => ({ x, y: x });
const box = { width: 300, height: 120, radii: [r(14), r(14), r(14), r(14)] as const };
const samples = ringSamples(box, 0.5);
const sum = (values: Float32Array) => values.reduce((total, value) => total + value, 0);
const circular = (a: number, b: number) => Math.min(Math.abs(a - b), 1 - Math.abs(a - b));
const light = (sources: GlowSources) => {
  const field = emptyField(samples.count);
  lightGlow(field, samples, box, sources);
  return field;
};
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

describe('lightGlow', () => {
  it('lights the same amount of line at every phase, including across the start corner', () => {
    const tail = 0.15;
    const lit = [0, 0.004, 0.5, 0.996, 0.9999].map((phase) =>
      sum(light({ comets: { heads: cometHeads(phase, 2, null), tail, direction: 1 } }).intensity),
    );
    for (const value of lit) expect(value).toBeCloseTo(lit[0]!, 0);
    expect(lit[0]).toBeGreaterThan(10);
  });

  it('makes a comet brightest and hottest at its head, fading along its tail', () => {
    const field = light({ comets: { heads: [0.5], tail: 0.2, direction: 1 } });
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
    const field = light({ pointer: { x: 0, y: 60, reach: 100 } });
    let nearest = 0;
    let farthest = 0;
    for (let index = 0; index < samples.count; index++) {
      const d = Math.hypot(samples.x[index]!, samples.y[index]! - 60);
      if (d < Math.hypot(samples.x[nearest]!, samples.y[nearest]! - 60)) nearest = index;
      if (d > Math.hypot(samples.x[farthest]!, samples.y[farthest]! - 60)) farthest = index;
    }
    expect(field.intensity[nearest]).toBeGreaterThan(0.95);
    expect(field.core[nearest]).toBeGreaterThan(0.9);
    expect(field.swell[nearest]).toBeGreaterThan(1.3);
    expect(field.intensity[farthest]).toBe(0);
  });

  it('lights only the stretch of a thin outline nearest the pointer, not the far edge', () => {
    const thin = { width: 300, height: 36, radii: [r(8), r(8), r(8), r(8)] as const };
    const lineSamples = ringSamples(thin, 0.5);
    const field = emptyField(lineSamples.count);
    // Just below the bottom edge, a third of the way along.
    lightGlow(field, lineSamples, thin, { pointer: { x: 100, y: 44, reach: 160 } });
    const at = (x: number, y: number) => {
      let best = 0;
      for (let index = 0; index < lineSamples.count; index++)
        if (
          Math.hypot(lineSamples.x[index]! - x, lineSamples.y[index]! - y) <
          Math.hypot(lineSamples.x[best]! - x, lineSamples.y[best]! - y)
        )
          best = index;
      return best;
    };
    expect(field.intensity[at(100, 36)]).toBeGreaterThan(0.9);
    // The top edge right above is close in space but far along the line: dark.
    expect(field.intensity[at(100, 0)]).toBe(0);
    expect(field.intensity[at(290, 36)]).toBe(0);
  });

  it('passes a glint band from the top-left corner and lights the whole line for sweep and pulse', () => {
    expect(light({ glint: { center: 0, half: 0.15, direction: 1 } }).intensity[0]).toBeGreaterThan(
      0.5,
    );
    expect(light({ glint: { center: 1, half: 0.15, direction: 1 } }).intensity[0]).toBe(0);
    expect(Math.min(...light({ sweep: true }).intensity)).toBeCloseTo(0.65);
    expect(Math.min(...light({ pulse: 0.5 }).intensity)).toBeCloseTo(0.5);
  });
});
