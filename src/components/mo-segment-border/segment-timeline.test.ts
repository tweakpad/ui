import { describe, expect, it } from 'vitest';
import { parseStates, resolveState, sampleStates, SegmentRun } from './segment-timeline.js';

const linear = (t: number) => t;
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

describe('resolveState and sampleStates', () => {
  it('turns pixels into fractions of the perimeter', () => {
    expect(resolveState(parseStates('0% 100px')![0]!, 400)).toEqual({ start: 0, end: 0.25 });
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
    expect(run.span(400)).toEqual({ start: 0, end: 0 });
    run.set(true, 400);
    run.step(100);
    expect(run.span(400).end).toBe(0);
    run.step(200);
    expect(run.span(400).end).toBeCloseTo(0.25);
    run.step(1000);
    expect(run.span(400).end).toBeCloseTo(0.5);
    expect(run.moving).toBe(false);
  });

  it('reverses from wherever it is when turned off', () => {
    const run = new SegmentRun(draw, null, timing());
    run.set(true, 400);
    run.step(300);
    run.set(false, 400);
    expect(run.mode).toBe('reverse');
    run.step(100);
    expect(run.span(400).end).toBeCloseTo(0.25);
    run.step(500);
    expect(run.mode).toBe('rest');
    expect(run.span(400).end).toBe(0);
  });

  it('runs its leave states from where it is, then rests', () => {
    const run = new SegmentRun(draw, parseStates('100% 100%'), timing());
    run.set(true, 400);
    run.step(200);
    run.set(false, 400);
    expect(run.mode).toBe('leave');
    run.step(200);
    const middle = run.span(400);
    expect(middle.start).toBeCloseTo(0.5);
    expect(middle.end).toBeCloseTo(0.625);
    run.step(200);
    expect(run.mode).toBe('rest');
    expect(run.span(400)).toEqual({ start: 0, end: 0 });
  });

  it('starts again from rest when turned on during its exit', () => {
    const run = new SegmentRun(draw, parseStates('100% 100%'), timing());
    run.set(true, 400);
    run.step(400);
    run.set(false, 400);
    run.step(100);
    run.set(true, 400);
    expect(run.mode).toBe('forward');
    expect(run.span(400).end).toBe(0);
  });

  it('repeats, alternates, and rewinds a forever-repeating run through one cycle only', () => {
    const run = new SegmentRun(draw, null, timing({ repeat: Infinity, alternate: true }));
    run.set(true, 400);
    run.step(600);
    // Second run, backwards: halfway back.
    expect(run.span(400).end).toBeCloseTo(0.25);
    run.step(4000);
    run.set(false, 400);
    expect(run.moving).toBe(true);
    run.step(800);
    expect(run.mode).toBe('rest');
  });

  it('counts finite repeats', () => {
    const run = new SegmentRun(draw, null, timing({ repeat: 2 }));
    expect(run.total).toBe(1200);
    run.set(true, 400);
    run.step(500);
    expect(run.span(400).end).toBeCloseTo(0.125);
    run.step(5000);
    expect(run.span(400).end).toBeCloseTo(0.5);
  });

  it('jumps to the end or to rest with no motion', () => {
    const run = new SegmentRun(draw, null, timing({ delay: 50 }));
    run.jump(true);
    expect(run.span(400).end).toBeCloseTo(0.5);
    expect(run.moving).toBe(false);
    run.jump(false);
    expect(run.span(400).end).toBe(0);
  });

  it('shows the end state at once when it has no duration', () => {
    const run = new SegmentRun(draw, null, timing({ duration: 0, repeat: Infinity }));
    run.jump(true);
    expect(run.span(400).end).toBeCloseTo(0.5);
    run.jump(false);
    expect(run.span(400).end).toBe(0);
    run.set(true, 400);
    expect(run.span(400).end).toBeCloseTo(0.5);
    run.set(false, 400);
    expect(run.span(400).end).toBe(0);
  });
});
