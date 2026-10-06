import { describe, expect, it } from 'vitest';
import { cubicBezier } from '../motion-easing.js';
import { CarouselKinetics, carouselMotionSegment } from './kinetics.js';

const ease = cubicBezier(0.25, 0.1, 0.25, 1);
const timing = { duration: 300, easing: ease };
const at = (kinetics: CarouselKinetics, time: number) => {
  kinetics.sample(time);
  return kinetics.position;
};

describe('carouselMotionSegment', () => {
  it('uses the plain easing and duration from rest', () => {
    const segment = carouselMotionSegment(0, 100, 0, 0, timing);
    expect(segment.duration).toBe(300);
    expect(segment.curve(0.5)).toBeCloseTo(100 * ease(0.5));
    expect(segment.curve(1)).toBe(100);
  });

  it('leaves at the current velocity and arrives at rest', () => {
    const segment = carouselMotionSegment(0, 100, 1, 0, timing);
    expect(segment.slope(0)).toBeCloseTo(1);
    expect(segment.slope(1)).toBeCloseTo(0);
    expect(segment.curve(1)).toBeCloseTo(100);
  });

  it('shortens a fast release toward the target and never overshoots', () => {
    const segment = carouselMotionSegment(0, 100, 2, 0, timing);
    expect(segment.duration).toBeLessThan(300);
    expect(segment.duration).toBeGreaterThanOrEqual(300 * 0.35);
    for (let step = 0; step <= 20; step++)
      expect(segment.curve(step / 20)).toBeLessThanOrEqual(100 + 1e-9);
  });

  it('continues a reversal backwards before returning', () => {
    const segment = carouselMotionSegment(0, 100, -0.5, 0, timing);
    expect(segment.duration).toBe(300);
    expect(segment.slope(0)).toBeCloseTo(-0.5);
    expect(segment.curve(0.1)).toBeLessThan(0);
    expect(segment.curve(1)).toBeCloseTo(100);
  });

  it('ends no later than a superseded transition, down to half the duration', () => {
    expect(carouselMotionSegment(0, 200, 1, 0, timing, 200).duration).toBe(200);
    expect(carouselMotionSegment(0, 200, 1, 0, timing, 40).duration).toBe(150);
  });
});

describe('CarouselKinetics', () => {
  it('retargets during flight with continuous velocity and accelerates', () => {
    const kinetics = new CarouselKinetics();
    kinetics.plan(100, 0, timing);
    const position = at(kinetics, 100);
    const velocity = kinetics.velocity(100);
    expect(velocity).toBeGreaterThan(0);
    const segment = kinetics.plan(200, 100, timing);
    expect(segment.from).toBe(position);
    expect(kinetics.velocity(100)).toBeCloseTo(velocity, 2);
    // The second movement ends when the first would have.
    expect(segment.start + segment.duration).toBeCloseTo(300);
    expect(at(kinetics, 300)).toBe(200);
  });

  it('keeps momentum across a halt and an immediate retarget', () => {
    const kinetics = new CarouselKinetics();
    kinetics.plan(100, 0, timing);
    at(kinetics, 120);
    const velocity = kinetics.velocity(120);
    kinetics.halt(120);
    expect(kinetics.velocity(125)).toBeCloseTo(velocity);
    // The presenter halts again before it plans; the first halt is kept.
    kinetics.halt(124);
    const segment = kinetics.plan(200, 125, timing);
    // The retarget starts where the transition halted, catching up the render gap.
    expect(segment.start).toBe(120);
    expect(kinetics.velocity(120)).toBeCloseTo(velocity, 2);
    expect(segment.start + segment.duration).toBeCloseTo(300);
  });

  it('resumes a halted transition from its last presented frame', () => {
    const kinetics = new CarouselKinetics();
    kinetics.plan(100, 0, timing);
    const position = at(kinetics, 112);
    // The halt request arrives between frames; the position still belongs to frame 112.
    kinetics.halt(121);
    const segment = kinetics.plan(200, 121, timing);
    expect(segment.from).toBe(position);
    expect(segment.start).toBe(112);
    // Two requests in one frame continue from the unsampled segment's start.
    const repeated = new CarouselKinetics();
    repeated.plan(100, 0, timing);
    repeated.halt(5);
    expect(repeated.plan(200, 5, timing).start).toBe(0);
  });

  it('measures drag velocity from tracked placements across halts', () => {
    const kinetics = new CarouselKinetics();
    for (let time = 0; time <= 64; time += 16) {
      kinetics.halt(time);
      kinetics.place(time * 2, time, true);
    }
    expect(kinetics.velocity(64)).toBeCloseTo(2);
    // A pointer that rested before release carries nothing.
    expect(kinetics.velocity(200)).toBe(0);
  });

  it('shifts every sample for loop compensation without changing velocity', () => {
    const kinetics = new CarouselKinetics();
    kinetics.place(0, 0, true);
    kinetics.place(32, 16, true);
    kinetics.shift(1000);
    expect(kinetics.position).toBe(1032);
    expect(kinetics.velocity(16)).toBeCloseTo(2);
  });

  it('forgets velocity after an untracked jump', () => {
    const kinetics = new CarouselKinetics();
    kinetics.place(0, 0, true);
    kinetics.place(32, 16, true);
    kinetics.place(500, 20, false);
    expect(kinetics.velocity(20)).toBe(0);
  });
});
