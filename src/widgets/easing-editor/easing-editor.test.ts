import { describe, expect, it } from 'vitest';
import { parseEasingCurve } from '../../foundation/easing/parse.js';
import { easingFunction } from '../../foundation/easing/evaluate.js';
import { adapterContext, cssEasingAdapter, parseEasingExpression } from './adapters.js';
import { stepNumberAt, tokenizeExpression } from './surfaces/expression-tokens.js';
import {
  clampParameter,
  easingParameters,
  formatParameter,
  withEasingParameter,
} from './parameters.js';
import { builtinPresetGroups } from './presets.js';
import { previewKeyframes } from './preview.js';
import { DEFAULT_STRINGS } from './strings.js';
import {
  axisAt,
  axisFraction,
  curveRange,
  curvePolyline,
  FRAME_TICKS,
  frameTicks,
  fitRange,
  shownCurve,
  thumbnailPolyline,
} from './surfaces/geometry.js';

const curve = (text: string) => parseEasingCurve(text)!;

describe('easing editor geometry', () => {
  it('keeps the unit range inside it and otherwise fits the extent around the center', () => {
    expect(curveRange(curve('ease-out'))).toEqual({ min: 0, max: 1 });
    const overshoot = curveRange(curve('cubic-bezier(0.34, 1.56, 0.64, 1)'));
    expect(overshoot.max).toBeCloseTo(1.56);
    expect(overshoot.min).toBeCloseTo(-0.56);
    const back = curveRange(curve('back(in-out)'));
    expect(back.min).toBeLessThan(0);
    expect(back.min + back.max).toBeCloseTo(1);
    // An ease drawn with its Bézier fit keeps the fit's handles inside the range.
    const fit = shownCurve(curve('back(in-out)'));
    expect(fit.kind).toBe('bezier');
    if (fit.kind === 'bezier') expect(back.max).toBeGreaterThanOrEqual(Math.max(fit.y1, fit.y2));
    expect(shownCurve(curve('elastic(out)')).kind).toBe('parametric');
    const linear = curveRange(curve('linear(0, 1.3 50%, 1)'));
    expect(linear.max).toBeCloseTo(1.3);
    expect(linear.min).toBeCloseTo(-0.3);
    expect(curveRange(null)).toEqual({ min: 0, max: 1 });
    expect(fitRange({ min: 0.2, max: 0.9 })).toEqual({ min: 0, max: 1 });
    const low = fitRange({ min: -0.1, max: 1 });
    expect(low.min).toBeCloseTo(-0.1);
    expect(low.max).toBeCloseTo(1.1);
    const high = fitRange({ min: 0, max: 1.4 });
    expect(high.min).toBeCloseTo(-0.4);
    expect(high.max).toBeCloseTo(1.4);
  });

  it('maps both axes to the plot and back through the shared range', () => {
    const range = { min: -0.5, max: 1.5 };
    expect(axisFraction(-0.5, range)).toBe(0);
    expect(axisFraction(1.5, range)).toBe(1);
    expect(axisFraction(0, range)).toBe(0.25);
    expect(axisFraction(1, range)).toBe(0.75);
    expect(axisAt(axisFraction(0.3, range), range)).toBeCloseTo(0.3);
  });

  it('builds the curve polyline and thumbnails from samples', () => {
    const points = curvePolyline(easingFunction(curve('linear')), { min: 0, max: 1 }, 100, 100, 4);
    expect(points).toBe('0.00,100.00 25.00,75.00 50.00,50.00 75.00,25.00 100.00,0.00');
    // A widened range shrinks the unit box on both axes around the center.
    const zoomed = curvePolyline(
      easingFunction(curve('linear')),
      { min: -0.5, max: 1.5 },
      100,
      100,
      2,
    );
    expect(zoomed).toBe('25.00,75.00 50.00,50.00 75.00,25.00');
    const thumb = thumbnailPolyline(curve('ease'));
    expect(thumb.split(' ')).toHaveLength(33);
    expect(thumb.startsWith('6.0,26.0')).toBe(true);
    expect(thumb.endsWith('26.0,6.0')).toBe(true);
  });

  it('places frame ticks at eased positions over the range', () => {
    expect(FRAME_TICKS).toBe(40);
    const ticks = frameTicks(easingFunction(curve('linear')), 5, { min: 0, max: 1 });
    expect(ticks).toEqual([0, 0.25, 0.5, 0.75, 1]);
    const eased = frameTicks(easingFunction(curve('ease-in')), 5, { min: 0, max: 1 });
    expect(eased[1]).toBeLessThan(0.25);
  });
});

describe('easing editor parameters', () => {
  it('lists the parameters of each kind with their values', () => {
    expect(
      easingParameters(curve('ease-out')).map((p) => `${p.definition.key}=${p.value}`),
    ).toEqual(['x1=0', 'y1=0', 'x2=0.58', 'y2=1']);
    expect(easingParameters(curve('spring(1 100 10)')).map((p) => p.definition.key)).toEqual([
      'mass',
      'stiffness',
      'damping',
      'velocity',
    ]);
    expect(
      easingParameters(curve('elastic(in)')).map((p) => `${p.definition.key}=${p.value}`),
    ).toEqual(['amplitude=1', 'period=0.3']);
    expect(easingParameters(curve('linear(0, 1)'))).toEqual([]);
    expect(easingParameters(null)).toEqual([]);
  });

  it('replaces one parameter and clamps to its range', () => {
    const next = withEasingParameter(curve('ease-out'), 'y1', 1.5);
    expect(next.kind === 'bezier' && next.y1).toBe(1.5);
    const spring = withEasingParameter(curve('spring(1 100 10)'), 'damping', 3);
    expect(spring.kind === 'spring' && spring.damping).toBe(3);
    const power = withEasingParameter(curve('power(in 2)'), 'exponent', 4);
    expect(power.kind === 'parametric' && power.parameters.exponent).toBe(4);
    const definition = easingParameters(curve('spring(1 100 10)'))[1]!.definition;
    expect(clampParameter(definition, 5000)).toBe(1000);
    expect(formatParameter(definition, 123.456)).toBe('123.5');
  });
});

describe('easing editor presets and adapters', () => {
  it('builds the preset table with stable ids and parseable values', () => {
    const groups = builtinPresetGroups(DEFAULT_STRINGS);
    expect(groups.map((group) => group.id)).toEqual([
      'basic',
      'spring',
      'sine',
      'power',
      'expo',
      'circ',
      'back',
      'elastic',
      'bounce',
    ]);
    const presets = groups.flatMap((group) => group.presets);
    expect(presets).toHaveLength(38);
    expect(new Set(presets.map((preset) => preset.id)).size).toBe(38);
    for (const preset of presets) expect(parseEasingCurve(preset.value), preset.id).not.toBeNull();
    expect(presets.find((preset) => preset.id === 'sine-in-out')?.label).toBe('Sine in-out');
  });

  it('formats the CSS adapter with and without the duration', () => {
    const bezier = curve('ease-out');
    expect(cssEasingAdapter.format(bezier, adapterContext(bezier, 0.3))).toBe(
      '300ms cubic-bezier(0, 0, 0.58, 1)',
    );
    expect(cssEasingAdapter.format(bezier, adapterContext(bezier, null))).toBe(
      'cubic-bezier(0, 0, 0.58, 1)',
    );
    const spring = curve('spring(1 100 10)');
    const context = adapterContext(spring, 0.5);
    expect(context.css.startsWith('linear(')).toBe(true);
    expect(context.samples(3).map((point) => point.input)).toEqual([0, 0.5, 1]);
  });

  it('describes the preview keyframes per mode', () => {
    expect(previewKeyframes('scale')).toEqual([
      { transform: 'scale(0)' },
      { transform: 'scale(1)' },
    ]);
    expect(previewKeyframes('scale-x')).toEqual([
      { transform: 'scaleX(0)' },
      { transform: 'scaleX(1)' },
    ]);
    expect(previewKeyframes('scale-y')).toEqual([
      { transform: 'scaleY(0)' },
      { transform: 'scaleY(1)' },
    ]);
    expect(previewKeyframes('rotation')).toEqual([
      { transform: 'rotate(0deg)' },
      { transform: 'rotate(180deg)' },
    ]);
    expect(previewKeyframes('none')).toEqual([]);
  });
});

describe('easing editor expression field', () => {
  it('tokenizes numbers and units', () => {
    const tokens = tokenizeExpression('700ms cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(tokens.filter((t) => t.type === 'number').map((t) => t.text)).toEqual([
      '700',
      '0.34',
      '1.56',
      '0.64',
      '1',
    ]);
    expect(tokens.filter((t) => t.type === 'unit').map((t) => t.text)).toEqual(['ms']);
    expect(tokens.map((t) => t.text).join('')).toBe('700ms cubic-bezier(0.34, 1.56, 0.64, 1)');
  });

  it('steps the number at the caret by its unit step and modifiers', () => {
    const text = '700ms cubic-bezier(0.34, 1.56, 0.64, 1)';
    expect(stepNumberAt(text, 21, 1)).toEqual({
      text: '700ms cubic-bezier(0.35, 1.56, 0.64, 1)',
      start: 19,
      end: 23,
      index: 1,
    });
    expect(stepNumberAt(text, 21, -1, { large: true })?.text).toBe(
      '700ms cubic-bezier(0.24, 1.56, 0.64, 1)',
    );
    expect(stepNumberAt(text, 21, 1, { small: true })?.text).toBe(
      '700ms cubic-bezier(0.341, 1.56, 0.64, 1)',
    );
    expect(stepNumberAt(text, 1, 1)?.text).toBe('710ms cubic-bezier(0.34, 1.56, 0.64, 1)');
    expect(stepNumberAt(text, 38, 1)?.text).toBe('700ms cubic-bezier(0.34, 1.56, 0.64, 1.01)');
    expect(stepNumberAt(text, 8, 1)).toBeNull();
  });

  it('parses an expression with an optional time', () => {
    expect(parseEasingExpression('700ms cubic-bezier(0, 0, 0.58, 1)')).toEqual({
      curve: parseEasingCurve('ease-out'),
      duration: 0.7,
    });
    expect(parseEasingExpression('0.5s ease-in')?.duration).toBe(0.5);
    expect(parseEasingExpression('spring(1 100 10)')).toEqual({
      curve: parseEasingCurve('spring(1 100 10)'),
    });
    expect(parseEasingExpression('nonsense(')).toBeNull();
  });
});
