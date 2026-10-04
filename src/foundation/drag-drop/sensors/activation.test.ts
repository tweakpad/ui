import { expect, it, vi } from 'vitest';
import { Scheduler } from '../../services.js';
import { DelayConstraint, DistanceConstraint, exceedsDistance } from './activation.js';
import { isKeyboardKey } from './keyboard.js';
it('uses strict scalar distance and both configured axis thresholds', () => {
  expect(exceedsDistance({ x: 3, y: 4 }, 5)).toBe(false);
  expect(exceedsDistance({ x: 6, y: 0 }, { x: 5 })).toBe(true);
  expect(exceedsDistance({ x: 6, y: 0 }, { x: 5, y: 5 })).toBe(false);
  expect(exceedsDistance({ x: 6, y: 6 }, { x: 5, y: 5 })).toBe(true);
});
it('keeps independent delay branches and reusable constraint definitions', () => {
  vi.useFakeTimers();
  const scheduler = new Scheduler(),
    first = vi.fn(),
    second = vi.fn();
  const delay = new DelayConstraint({ value: 250, tolerance: 5 });
  const a = delay.create({ initial: { x: 0, y: 0 }, scheduler, activate: first });
  const b = delay.create({ initial: { x: 0, y: 0 }, scheduler, activate: second });
  a.move({ x: 6, y: 0 });
  vi.advanceTimersByTime(250);
  expect(first).not.toHaveBeenCalled();
  expect(second).toHaveBeenCalledOnce();
  const distance = new DistanceConstraint({ value: 5 }).create({
    initial: { x: 0, y: 0 },
    scheduler,
    activate: first,
  });
  distance.move({ x: 6, y: 0 });
  expect(first).toHaveBeenCalledOnce();
  a.dispose();
  b.dispose();
  scheduler.dispose();
  vi.useRealTimers();
});
it('normalizes logical aliases without requiring physical event codes', () => {
  for (const [key, configured] of [
    [' ', 'Space'],
    ['Spacebar', 'space'],
    ['W', 'KeyW'],
    ['1', 'Digit1'],
    ['ArrowDown', 'arrowdown'],
  ])
    expect(isKeyboardKey({ key: key! }, [configured!])).toBe(true);
});
