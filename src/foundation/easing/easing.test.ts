import { describe, expect, it } from 'vitest';
import { cubicBezier } from '../motion-easing.js';
import { convertEasingCurve, fitBezier } from './convert.js';
import { cssLinear, toCssEasing } from './css.js';
import { easingFunction, linearFunction, normalizePoints, progressionRange } from './evaluate.js';
import { parametricFunction, stepsFunction } from './parametric.js';
import { easingCurvesEqual, normalizeEasingText, parseEasingCurve } from './parse.js';
import { linearPoints, sampleEasing, simplifyPoints } from './sample.js';
import { formatEasingNumber, serializeEasingCurve } from './serialize.js';
import { springFunction, springSettleTime } from './spring.js';
import type { EasingCurve } from './types.js';

const roundTrip = (text: string) => serializeEasingCurve(parseEasingCurve(text)!);

describe('easing notations', () => {
  it('parses the CSS keywords to their records', () => {
    expect(roundTrip('ease')).toBe('cubic-bezier(0.25, 0.1, 0.25, 1)');
    expect(roundTrip('ease-in-out')).toBe('cubic-bezier(0.42, 0, 0.58, 1)');
    expect(roundTrip('linear')).toBe('linear(0, 1)');
    expect(roundTrip('step-start')).toBe('steps(1, jump-start)');
    expect(roundTrip('step-end')).toBe('steps(1, jump-end)');
  });

  it('serializes every kind canonically', () => {
    expect(roundTrip('CUBIC-BEZIER(0.340, 1.5600, .64, 1)')).toBe(
      'cubic-bezier(0.34, 1.56, 0.64, 1)',
    );
    expect(roundTrip('spring(1 100 10)')).toBe('spring(1 100 10)');
    expect(roundTrip('spring(1, 100, 10, 2.5)')).toBe('spring(1 100 10 2.5)');
    expect(roundTrip('power(in-out 3)')).toBe('power(in-out 3)');
    expect(roundTrip('sine(out)')).toBe('sine(out)');
    expect(roundTrip('back(out)')).toBe('back(out 1.702)');
    expect(roundTrip('elastic(in 1.5 0.5)')).toBe('elastic(in 1.5 0.5)');
    expect(roundTrip('steps(4)')).toBe('steps(4, jump-end)');
    expect(roundTrip('steps(3, start)')).toBe('steps(3, jump-start)');
    expect(roundTrip('linear(0, 0.25 25%, 1)')).toBe('linear(0, 0.25 25%, 1)');
  });

  it('spreads missing linear() inputs evenly and keeps the ends', () => {
    expect(roundTrip('linear(0, 0.5, 1)')).toBe('linear(0, 0.5 50%, 1)');
    expect(roundTrip('linear(0, 0.2, 0.8, 1)')).toBe('linear(0, 0.2 33.3%, 0.8 66.7%, 1)');
    expect(roundTrip('linear(0 0%, 1.2 60%, 1 100%)')).toBe('linear(0, 1.2 60%, 1)');
  });

  it('rejects text that is not an easing', () => {
    for (const text of [
      '',
      'bounce',
      'cubic-bezier(1.5, 0, 0, 1)',
      'spring(1 100)',
      'power(sideways)',
      'steps(0)',
    ])
      expect(parseEasingCurve(text), text).toBeNull();
    expect(normalizeEasingText('nope')).toBe('');
    expect(normalizeEasingText(' Ease-Out ')).toBe('cubic-bezier(0, 0, 0.58, 1)');
  });

  it('formats numbers with at most three decimals', () => {
    expect(formatEasingNumber(1.70158)).toBe('1.702');
    expect(formatEasingNumber(0.5)).toBe('0.5');
    expect(formatEasingNumber(-0.0001)).toBe('0');
    expect(formatEasingNumber(33.3333, 1)).toBe('33.3');
  });

  it('compares records by canonical text', () => {
    expect(
      easingCurvesEqual(
        parseEasingCurve('ease'),
        parseEasingCurve('cubic-bezier(0.25,0.1,0.25,1)'),
      ),
    ).toBe(true);
    expect(easingCurvesEqual(parseEasingCurve('ease'), null)).toBe(false);
  });
});

describe('easing evaluation', () => {
  it('evaluates a bezier through the shared solver without clamping the progression', () => {
    const curve = parseEasingCurve('cubic-bezier(0.34, 1.56, 0.64, 1)')!;
    const fn = easingFunction(curve);
    const reference = cubicBezier(0.34, 1.56, 0.64, 1);
    expect(fn(0.3)).toBeCloseTo(reference(0.3), 6);
    expect(progressionRange(fn).max).toBeGreaterThan(1);
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
  });

  it('evaluates the parametric families and their directions', () => {
    const bounceOut = parametricFunction({
      kind: 'parametric',
      family: 'bounce',
      direction: 'out',
      parameters: {},
    });
    expect(bounceOut(1 / 2.75)).toBeCloseTo(1, 6);
    expect(bounceOut(0.5)).toBeCloseTo(7.5625 * (0.5 - 1.5 / 2.75) ** 2 + 0.75, 6);
    const quadIn = parametricFunction({
      kind: 'parametric',
      family: 'power',
      direction: 'in',
      parameters: { exponent: 2 },
    });
    expect(quadIn(0.5)).toBeCloseTo(0.25, 9);
    const quadOut = parametricFunction({
      kind: 'parametric',
      family: 'power',
      direction: 'out',
      parameters: { exponent: 2 },
    });
    expect(quadOut(0.5)).toBeCloseTo(0.75, 9);
    const quadInOut = parametricFunction({
      kind: 'parametric',
      family: 'power',
      direction: 'in-out',
      parameters: { exponent: 2 },
    });
    expect(quadInOut(0.25)).toBeCloseTo(0.125, 9);
    expect(quadInOut(0.5)).toBeCloseTo(0.5, 9);
    const quadOutIn = parametricFunction({
      kind: 'parametric',
      family: 'power',
      direction: 'out-in',
      parameters: { exponent: 2 },
    });
    expect(quadOutIn(0.25)).toBeCloseTo(0.375, 9);
    const backIn = parametricFunction({
      kind: 'parametric',
      family: 'back',
      direction: 'in',
      parameters: {},
    });
    expect(progressionRange(backIn).min).toBeLessThan(0);
    const elastic = parametricFunction({
      kind: 'parametric',
      family: 'elastic',
      direction: 'out',
      parameters: {},
    });
    expect(elastic(0)).toBe(0);
    expect(elastic(1)).toBe(1);
    expect(progressionRange(elastic).max).toBeGreaterThan(1);
  });

  it('builds staircases for every steps position', () => {
    expect(stepsFunction(4, 'jump-end')(0.3)).toBeCloseTo(0.25);
    expect(stepsFunction(4, 'jump-end')(1)).toBe(1);
    expect(stepsFunction(4, 'jump-start')(0.1)).toBeCloseTo(0.25);
    expect(stepsFunction(4, 'jump-start')(0)).toBe(0);
    expect(stepsFunction(4, 'jump-both')(0.1)).toBeCloseTo(0.2);
    expect(stepsFunction(4, 'jump-both')(0.9)).toBeCloseTo(0.8);
    expect(stepsFunction(4, 'jump-none')(0.1)).toBe(0);
    expect(stepsFunction(4, 'jump-none')(0.9)).toBeCloseTo(1);
    expect(stepsFunction(1, 'jump-none')(0.4)).toBe(0);
    expect(stepsFunction(1, 'jump-none')(0.5)).toBe(1);
  });

  it('interpolates custom points and normalizes their order', () => {
    const fn = linearFunction([
      { input: 0, output: 0 },
      { input: 0.5, output: 1.5 },
      { input: 1, output: 1 },
    ]);
    expect(fn(0.25)).toBeCloseTo(0.75);
    expect(fn(0.75)).toBeCloseTo(1.25);
    expect(fn(2)).toBe(1);
    expect(
      normalizePoints([
        { input: 0.8, output: 0 },
        { input: 0.2, output: 1 },
      ]),
    ).toEqual([
      { input: 0, output: 0 },
      { input: 1, output: 1 },
    ]);
    expect(normalizePoints([])).toEqual([
      { input: 0, output: 0 },
      { input: 1, output: 1 },
    ]);
  });

  it('settles springs and normalizes them to their settle time', () => {
    const under = { kind: 'spring', mass: 1, stiffness: 100, damping: 10, velocity: 0 } as const;
    const settle = springSettleTime(under);
    expect(settle).toBeGreaterThan(0.5);
    expect(settle).toBeLessThan(3);
    const fn = springFunction(under);
    expect(fn(0)).toBe(0);
    expect(fn(1)).toBe(1);
    expect(progressionRange(fn).max).toBeGreaterThan(1);
    expect(Math.abs(fn(0.999) - 1)).toBeLessThan(0.01);
    const over = { kind: 'spring', mass: 1, stiffness: 100, damping: 40, velocity: 0 } as const;
    expect(progressionRange(springFunction(over)).max).toBe(1);
    const critical = { kind: 'spring', mass: 1, stiffness: 100, damping: 20, velocity: 0 } as const;
    expect(springFunction(critical)(0.5)).toBeGreaterThan(0.5);
    const undamped = { kind: 'spring', mass: 1, stiffness: 100, damping: 0, velocity: 0 } as const;
    expect(springSettleTime(undamped)).toBe(10);
  });
});

describe('easing sampling and CSS', () => {
  it('samples, simplifies and bounds point counts', () => {
    const fn = easingFunction(parseEasingCurve('ease-in-out')!);
    const samples = sampleEasing(fn, 5);
    expect(samples.map((point) => point.input)).toEqual([0, 0.25, 0.5, 0.75, 1]);
    const line = simplifyPoints(
      sampleEasing((t) => t, 50),
      0.001,
    );
    expect(line).toHaveLength(2);
    expect(linearPoints(fn, { maximum: 10 }).length).toBeLessThanOrEqual(10);
    expect(linearPoints(fn).length).toBeGreaterThan(2);
  });

  it('emits CSS verbatim for CSS kinds and linear() samples for the others', () => {
    expect(toCssEasing(parseEasingCurve('cubic-bezier(0.34, 1.56, 0.64, 1)')!)).toBe(
      'cubic-bezier(0.34, 1.56, 0.64, 1)',
    );
    expect(toCssEasing(parseEasingCurve('steps(3, jump-both)')!)).toBe('steps(3, jump-both)');
    expect(toCssEasing(parseEasingCurve('linear(0, 0.5 20%, 1)')!)).toBe('linear(0, 0.5 20%, 1)');
    const spring = toCssEasing(parseEasingCurve('spring(1 100 10)')!);
    expect(spring.startsWith('linear(0, ')).toBe(true);
    expect(spring.endsWith(', 1)')).toBe(true);
    expect(spring.split(',').length).toBeLessThanOrEqual(100);
    const back = toCssEasing(parseEasingCurve('back(out)')!);
    expect(back).toMatch(/^linear\(0, .*1\.\d+ \d+(\.\d)?%.*, 1\)$/);
    expect(
      cssLinear([
        { input: 0, output: 0 },
        { input: 1, output: 1 },
      ]),
    ).toBe('linear(0, 1)');
  });
});

describe('easing conversion', () => {
  it('fits a bezier to a parametric curve from its seed', () => {
    const fitted = convertEasingCurve(parseEasingCurve('sine(in-out)')!, 'bezier');
    expect(fitted.kind).toBe('bezier');
    const fn = easingFunction(fitted);
    const reference = easingFunction(parseEasingCurve('sine(in-out)')!);
    for (const t of [0.2, 0.5, 0.8]) expect(Math.abs(fn(t) - reference(t))).toBeLessThan(0.03);
  });

  it('fits a bezier to a spring and keeps its overshoot', () => {
    const fitted = fitBezier(easingFunction(parseEasingCurve('spring(1 100 10)')!));
    expect(fitted.y1 > 1 || fitted.y2 > 1).toBe(true);
  });

  it('converts to custom, spring and parametric', () => {
    const custom = convertEasingCurve(parseEasingCurve('ease-out')!, 'custom');
    expect(custom.kind).toBe('custom');
    expect((custom as Extract<EasingCurve, { kind: 'custom' }>).points.length).toBeLessThanOrEqual(
      24,
    );
    const steps = convertEasingCurve(parseEasingCurve('steps(2, jump-end)')!, 'custom');
    expect(serializeEasingCurve(steps)).toBe('linear(0, 0 25%, 0.5 50%, 0.5 75%, 1)');
    expect(serializeEasingCurve(convertEasingCurve(parseEasingCurve('ease')!, 'spring'))).toBe(
      'spring(1 100 10)',
    );
    const parametric = convertEasingCurve(
      parseEasingCurve('cubic-bezier(0.5, 1, 0.89, 1)')!,
      'parametric',
    );
    expect(serializeEasingCurve(parametric)).toBe('power(out 2)');
    expect(convertEasingCurve(parseEasingCurve('ease')!, 'bezier')).toEqual(
      parseEasingCurve('ease'),
    );
  });
});
