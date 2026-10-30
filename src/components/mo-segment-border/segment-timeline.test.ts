import { describe, expect, it } from 'vitest';
import {
  parseStates,
  resolveStates,
  sampleStates,
  SegmentRun,
  type BoxPoint,
  type Placement,
} from './segment-timeline.js';

const linear = (t: number) => t;
/** A 400 px line whose points of the box are all at its origin. */
const place: Placement = { perimeter: 400, point: () => 0 };
/** A 3:1 box from its top-left corner: the corners at 0, 0.375, 0.5 and 0.875 of the line. */
const corners: Record<BoxPoint, number> = {
  'top-left': 0,
  top: 0.1875,
  'top-right': 0.375,
  right: 0.4375,
  'bottom-right': 0.5,
  bottom: 0.6875,
  'bottom-left': 0.875,
  left: 0.9375,
};
const box = (origin: BoxPoint = 'top-left'): Placement => ({
  perimeter: 800,
  point: (point) => {
    const at = corners[point] - corners[origin];
    return at - Math.floor(at);
  },
});
const timing = (overrides = {}) => ({
  duration: 400,
  delay: 0,
  easing: linear,
  repeat: 0,
  alternate: false,
  ...overrides,
});

describe('parseStates', () => {
  it('reads pairs, single ends, percentages, pixels and negatives', () => {
    expect(parseStates('0% 0%, 0% 50%')).toEqual([
      [
        { value: 0, unit: '%' },
        { value: 0, unit: '%' },
      ],
      [
        { value: 0, unit: '%' },
        { value: 50, unit: '%' },
      ],
    ]);
    expect(parseStates('25%')![0]).toEqual([
      { value: 0, unit: '%' },
      { value: 25, unit: '%' },
    ]);
    expect(parseStates('-10% 24px')![0]).toEqual([
      { value: -10, unit: '%' },
      { value: 24, unit: 'px' },
    ]);
    expect(parseStates('90% 110%')![0]![1]).toEqual({ value: 110, unit: '%' });
  });

  it('rejects empty and malformed lists', () => {
    expect(parseStates('')).toBeNull();
    expect(parseStates(null)).toBeNull();
    expect(parseStates('0% 10% 20%')).toBeNull();
    expect(parseStates('half')).toBeNull();
    expect(parseStates('0%, , 10%')).toBeNull();
  });
});

describe('resolveStates and sampleStates', () => {
  it('turns pixels into fractions of the perimeter', () => {
    expect(resolveStates(parseStates('0% 100px')!, place)).toEqual([{ start: 0, end: 0.25 }]);
  });

  it('places points of the box exactly, running clockwise from the start to an end point', () => {
    // The top edge, then the left edge and the top edge from the top-left corner.
    expect(resolveStates(parseStates('top-left top-left, top-left top-right')!, box())).toEqual([
      { start: 0, end: 0 },
      { start: 0, end: 0.375 },
    ]);
    expect(resolveStates(parseStates('bottom-left top-right')!, box())).toEqual([
      { start: -0.125, end: 0.375 },
    ]);
    // From another origin, the same points are found relative to it.
    expect(
      resolveStates(
        parseStates('top-right top-right, top-right bottom-right')!,
        box('top-right'),
      )[1],
    ).toEqual({
      start: 0,
      end: 0.125,
    });
  });

  it('moves points the short way round, and back on an exact half turn', () => {
    // The start goes back from the top-right corner to the bottom-left one, half a turn away.
    const spans = resolveStates(
      parseStates('top-right top-right, bottom-left top-right')!,
      box('top-right'),
    );
    expect(spans[1]).toEqual({ start: -0.5, end: 0 });
    // A leave from where the segment is moves to the next corner, not around the box.
    const leave = resolveStates(parseStates('top-right top-right')!, box(), {
      start: 0,
      end: 0.375,
    });
    expect(leave).toEqual([{ start: 0.375, end: 0.375 }]);
  });

  it('reads points in a list, alone or with lengths', () => {
    expect(parseStates('top-left top-right, 10% bottom')).toEqual([
      [{ point: 'top-left' }, { point: 'top-right' }],
      [{ value: 10, unit: '%' }, { point: 'bottom' }],
    ]);
    expect(parseStates('top-middle')).toBeNull();
  });

  it('eases each step between two states on its own', () => {
    const states = [
      { start: 0, end: 0 },
      { start: 0, end: 0.5 },
      { start: 0.5, end: 1 },
    ];
    expect(sampleStates(states, 0.25, linear)).toEqual({ start: 0, end: 0.25 });
    expect(sampleStates(states, 0.75, linear)).toEqual({ start: 0.25, end: 0.75 });
    const square = (t: number) => t * t;
    expect(sampleStates(states, 0.25, square).end).toBeCloseTo(0.125);
  });
});

describe('SegmentRun', () => {
  const draw = parseStates('0% 0%, 0% 50%')!;

  it('rests at its first state, waits its delay, then runs forward and holds the end', () => {
    const run = new SegmentRun(draw, null, timing({ delay: 100 }));
    expect(run.span(place)).toEqual({ start: 0, end: 0 });
    run.set(true, place);
    run.step(100);
    expect(run.span(place).end).toBe(0);
    run.step(200);
    expect(run.span(place).end).toBeCloseTo(0.25);
    run.step(1000);
    expect(run.span(place).end).toBeCloseTo(0.5);
    expect(run.moving).toBe(false);
  });

  it('reverses from wherever it is when turned off', () => {
    const run = new SegmentRun(draw, null, timing());
    run.set(true, place);
    run.step(300);
    run.set(false, place);
    expect(run.mode).toBe('reverse');
    run.step(100);
    expect(run.span(place).end).toBeCloseTo(0.25);
    run.step(500);
    expect(run.mode).toBe('rest');
    expect(run.span(place).end).toBe(0);
  });

  it('runs its leave states from where it is, then rests', () => {
    const run = new SegmentRun(draw, parseStates('100% 100%'), timing());
    run.set(true, place);
    run.step(200);
    run.set(false, place);
    expect(run.mode).toBe('leave');
    run.step(200);
    const middle = run.span(place);
    expect(middle.start).toBeCloseTo(0.5);
    expect(middle.end).toBeCloseTo(0.625);
    run.step(200);
    expect(run.mode).toBe('rest');
    expect(run.span(place)).toEqual({ start: 0, end: 0 });
  });

  it('starts again from rest when turned on during its exit', () => {
    const run = new SegmentRun(draw, parseStates('100% 100%'), timing());
    run.set(true, place);
    run.step(400);
    run.set(false, place);
    run.step(100);
    run.set(true, place);
    expect(run.mode).toBe('forward');
    expect(run.span(place).end).toBe(0);
  });

  it('repeats, alternates, and rewinds a forever-repeating run through one cycle only', () => {
    const run = new SegmentRun(draw, null, timing({ repeat: Infinity, alternate: true }));
    run.set(true, place);
    run.step(600);
    // Second run, backwards: halfway back.
    expect(run.span(place).end).toBeCloseTo(0.25);
    run.step(4000);
    run.set(false, place);
    expect(run.moving).toBe(true);
    run.step(800);
    expect(run.mode).toBe('rest');
  });

  it('counts finite repeats', () => {
    const run = new SegmentRun(draw, null, timing({ repeat: 2 }));
    expect(run.total).toBe(1200);
    run.set(true, place);
    run.step(500);
    expect(run.span(place).end).toBeCloseTo(0.125);
    run.step(5000);
    expect(run.span(place).end).toBeCloseTo(0.5);
  });

  it('jumps to the end or to rest with no motion', () => {
    const run = new SegmentRun(draw, null, timing({ delay: 50 }));
    run.jump(true);
    expect(run.span(place).end).toBeCloseTo(0.5);
    expect(run.moving).toBe(false);
    run.jump(false);
    expect(run.span(place).end).toBe(0);
  });

  it('keeps its place when its timing changes', () => {
    const run = new SegmentRun(draw, null, timing({ duration: 4000, delay: 1000 }));
    run.set(true, place);
    run.step(500);
    run.timing = timing({ duration: 400, delay: 100 });
    // Halfway through the delay stays halfway through it.
    run.step(50);
    expect(run.span(place).end).toBe(0);
    run.step(300);
    // Three quarters of the way through the run, reversed at the new pace.
    run.timing = timing({ duration: 4000, delay: 1000 });
    expect(run.span(place).end).toBeCloseTo(0.375);
    run.set(false, place);
    run.timing = timing({ duration: 400, delay: 100 });
    run.step(300);
    expect(run.span(place).end).toBe(0);
    // Back through the delay, then at rest.
    run.step(100);
    expect(run.mode).toBe('rest');
  });

  it('holds its end when timing comes back after a jump with no duration', () => {
    const run = new SegmentRun(draw, null, timing({ duration: 0 }));
    run.jump(true);
    run.timing = timing();
    expect(run.span(place).end).toBeCloseTo(0.5);
    expect(run.moving).toBe(false);
  });

  it('shows the end state at once when it has no duration', () => {
    const run = new SegmentRun(draw, null, timing({ duration: 0, repeat: Infinity }));
    run.jump(true);
    expect(run.span(place).end).toBeCloseTo(0.5);
    run.jump(false);
    expect(run.span(place).end).toBe(0);
    run.set(true, place);
    expect(run.span(place).end).toBeCloseTo(0.5);
    run.set(false, place);
    expect(run.span(place).end).toBe(0);
  });
});
