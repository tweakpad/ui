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

it('supports controller-owned custom constraints and first activation wins', async () => {
  const { ActivationController, ActivationConstraint } = await import('./activation.js');
  let aborted = 0,
    activated = 0;
  class Custom extends ActivationConstraint<Event> {
    onEvent(event: Event): void {
      if (event.type === 'activate') this.activate(event);
    }
    abort(): void {
      aborted++;
    }
  }
  const constraint = new Custom({});
  const controller = new ActivationController([constraint], () => {
    activated++;
  });
  controller.onEvent(new Event('waiting'));
  expect(activated).toBe(0);
  controller.onEvent(new Event('activate'));
  controller.onEvent(new Event('activate'));
  expect(activated).toBe(1);
  controller.abort();
  controller.abort();
  expect(aborted).toBe(1);
});

it('releases every custom constraint even when one abort throws', async () => {
  const { ActivationController, ActivationConstraint } = await import('./activation.js');
  const released: number[] = [];
  class Custom extends ActivationConstraint<Event, number> {
    onEvent(): void {}
    abort(): void {
      released.push(this.configuration);
      if (this.configuration === 1) throw new Error('consumer cleanup');
    }
  }
  const controller = new ActivationController([new Custom(1), new Custom(2)], () => {});
  expect(() => controller.abort()).toThrow(AggregateError);
  expect(released).toEqual([1, 2]);
  controller.abort();
  expect(released).toEqual([1, 2]);
});
