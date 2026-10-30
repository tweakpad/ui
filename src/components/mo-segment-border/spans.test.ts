import { describe, expect, it } from 'vitest';
import { emptyField } from '../../foundation/border-ring/light-field.js';
import { ringSamples } from '../../foundation/border-ring/ring-samples.js';
import { lightSpans, type LitSpan } from './spans.js';

const r = (x: number) => ({ x, y: x });
const box = { width: 300, height: 120, radii: [r(14), r(14), r(14), r(14)] as const };
const samples = ringSamples(box, 0.5);
const light = (spans: LitSpan[]) => {
  const field = emptyField(samples.count);
  lightSpans(field, samples, spans);
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

describe('lightSpans', () => {
  it('lights a glowing span along its stretch, through the start, fading at its ends', () => {
    const field = light([{ start: 0.9, end: 1.1 }]);
    expect(field.intensity[at(0.95)]).toBe(1);
    expect(field.intensity[at(0.05)]).toBe(1);
    expect(field.intensity[at(0.5)]).toBe(0);
    // Soft toward the ends, never hotter there than in the middle.
    expect(field.intensity[at(0.902)]).toBeLessThan(0.3);
    expect(field.core[at(0.902)]).toBeLessThan(field.core[at(0.95)]!);
    expect(field.core[at(0.95)]).toBeCloseTo(0.35);
  });

  it('leaves a zero-length span dark', () => {
    expect(Math.max(...light([{ start: 0.3, end: 0.3 }]).intensity)).toBe(0);
  });
});
