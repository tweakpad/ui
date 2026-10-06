import { afterEach, describe, expect, it, vi } from 'vitest';
import { CarouselAutoplay, carouselAutoplayAction, toggleCarouselAutoplay } from './autoplay.js';
import { ReasonLeases } from '../reason-leases.js';
import type { CarouselNavigationResult } from './types.js';
const accepted: CarouselNavigationResult = {
  status: 'accepted',
  index: 1,
  id: 'b',
  reason: 'automatic-advance',
};
describe('Carousel autoplay pause leases', () => {
  afterEach(() => vi.useRealTimers());
  it('does not invoke an advance queued immediately before stop', async () => {
    vi.useFakeTimers();
    const advance = vi.fn(async () => accepted);
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => true,
      advance,
      changed() {},
    });
    autoplay.start();
    vi.advanceTimersByTime(10);
    autoplay.stop();
    await vi.advanceTimersByTimeAsync(0);
    expect(advance).not.toHaveBeenCalled();
    autoplay.dispose();
  });
  it('waits for every mandatory reason to clear, then starts a full interval', async () => {
    vi.useFakeTimers();
    const advance = vi.fn(async () => accepted);
    const autoplay = new CarouselAutoplay({
      delay: () => 1000,
      available: () => true,
      advance,
      changed() {},
    });
    autoplay.start();
    await vi.advanceTimersByTimeAsync(500);
    autoplay.setReason('focus', true);
    autoplay.setReason('hidden', true);
    autoplay.setReason('focus', false);
    await vi.advanceTimersByTimeAsync(2000);
    expect(advance).not.toHaveBeenCalled();
    autoplay.setReason('hidden', false);
    await vi.advanceTimersByTimeAsync(999);
    expect(advance).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(advance).toHaveBeenCalledTimes(1);
    autoplay.dispose();
  });
  it('never overlaps advances and pauses an unacknowledged owner until resume', async () => {
    vi.useFakeTimers();
    let finish!: (result: CarouselNavigationResult) => void;
    const advance = vi.fn(
      () =>
        new Promise<CarouselNavigationResult>((resolve) => {
          finish = resolve;
        }),
    );
    const autoplay = new CarouselAutoplay({
      delay: () => 100,
      available: () => true,
      advance,
      changed() {},
    });
    autoplay.start();
    await vi.advanceTimersByTimeAsync(1000);
    expect(advance).toHaveBeenCalledTimes(1);
    finish({ ...accepted, status: 'rejected' });
    await vi.advanceTimersByTimeAsync(1000);
    expect(autoplay.reasons).toContain('unacknowledged');
    expect(advance).toHaveBeenCalledTimes(1);
    autoplay.resume();
    await vi.advanceTimersByTimeAsync(100);
    expect(advance).toHaveBeenCalledTimes(2);
    autoplay.dispose();
  });
  it('does not schedule unavailable content or retain a stale disposed timer', async () => {
    vi.useFakeTimers();
    let available = false;
    const advance = vi.fn(async () => accepted);
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => available,
      advance,
      changed() {},
    });
    autoplay.start();
    await vi.advanceTimersByTimeAsync(100);
    expect(advance).not.toHaveBeenCalled();
    available = true;
    autoplay.refresh();
    autoplay.dispose();
    await vi.advanceTimersByTimeAsync(100);
    expect(advance).not.toHaveBeenCalled();
  });
  it('ignores old advance completion after restart and disposal', async () => {
    vi.useFakeTimers();
    const completions: Array<(value: CarouselNavigationResult) => void> = [];
    const changed = vi.fn();
    const advance = vi.fn(
      () => new Promise<CarouselNavigationResult>((resolve) => completions.push(resolve)),
    );
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => true,
      advance,
      changed,
    });
    autoplay.start();
    await vi.advanceTimersByTimeAsync(10);
    autoplay.stop();
    autoplay.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(advance).toHaveBeenCalledTimes(2);
    completions[0]!({ ...accepted, status: 'rejected' });
    await vi.advanceTimersByTimeAsync(100);
    expect(autoplay.paused).toBe(false);
    expect(advance).toHaveBeenCalledTimes(2);
    autoplay.dispose();
    const notifications = changed.mock.calls.length;
    completions[1]!({ ...accepted, status: 'rejected' });
    await vi.advanceTimersByTimeAsync(100);
    expect(changed).toHaveBeenCalledTimes(notifications);
    expect(autoplay.reasons).toEqual([]);
  });
});

describe('Carousel autoplay control state', () => {
  afterEach(() => vi.useRealTimers());
  it('names Resume after a finite-end stop and restarts the timer from the control', async () => {
    vi.useFakeTimers();
    let status: CarouselNavigationResult['status'] = 'unchanged';
    const advance = vi.fn(async () => ({ ...accepted, status }));
    const changed = vi.fn();
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => true,
      advance,
      changed,
    });
    autoplay.start();
    expect(carouselAutoplayAction(autoplay)).toBe('pause');
    await vi.advanceTimersByTimeAsync(10);
    expect(autoplay.running).toBe(false);
    expect(carouselAutoplayAction(autoplay)).toBe('resume');
    status = 'accepted';
    toggleCarouselAutoplay(autoplay);
    expect(autoplay.running).toBe(true);
    expect(carouselAutoplayAction(autoplay)).toBe('pause');
    await vi.advanceTimersByTimeAsync(10);
    expect(advance).toHaveBeenCalledTimes(2);
    autoplay.dispose();
  });
  it('names Resume after stopAfterInteraction-style stops and manual pauses', () => {
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => true,
      advance: async () => accepted,
      changed() {},
    });
    autoplay.start();
    autoplay.stop();
    expect(carouselAutoplayAction(autoplay)).toBe('resume');
    autoplay.start();
    toggleCarouselAutoplay(autoplay);
    expect(autoplay.reasons).toContain('explicit');
    expect(carouselAutoplayAction(autoplay)).toBe('resume');
    // Mandatory hover/focus pauses do not rename the manual control.
    toggleCarouselAutoplay(autoplay);
    autoplay.setReason('hover', true);
    expect(carouselAutoplayAction(autoplay)).toBe('pause');
    autoplay.dispose();
  });
  it('notifies when resume clears only an unacknowledged pause', async () => {
    vi.useFakeTimers();
    const changed = vi.fn();
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => true,
      advance: async () => ({ ...accepted, status: 'rejected' as const }),
      changed,
    });
    autoplay.start();
    await vi.advanceTimersByTimeAsync(10);
    expect(carouselAutoplayAction(autoplay)).toBe('resume');
    const notifications = changed.mock.calls.length;
    autoplay.resume();
    expect(changed.mock.calls.length).toBeGreaterThan(notifications);
    expect(carouselAutoplayAction(autoplay)).toBe('pause');
    autoplay.dispose();
  });
});

describe('Carousel autoplay on the shared reason-lease owner', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });
  it('delegates pause reasons to ReasonLeases switch leases and clears them on dispose', () => {
    const set = vi.spyOn(ReasonLeases.prototype, 'set');
    const clear = vi.spyOn(ReasonLeases.prototype, 'clear');
    const changed = vi.fn();
    const autoplay = new CarouselAutoplay({
      delay: () => 10,
      available: () => true,
      advance: async () => accepted,
      changed,
    });
    autoplay.start();
    const notifications = changed.mock.calls.length;
    autoplay.setReason('focus', true);
    autoplay.setReason('hover', true);
    // A repeated switch is not a second lease and does not notify.
    autoplay.setReason('focus', true);
    expect(set.mock.calls).toEqual([
      ['focus', true],
      ['hover', true],
      ['focus', true],
    ]);
    expect(changed).toHaveBeenCalledTimes(notifications + 2);
    expect(autoplay.reasons).toEqual(['focus', 'hover']);
    expect(Object.isFrozen(autoplay.reasons)).toBe(true);
    // Releasing one reason never clears another.
    autoplay.setReason('focus', false);
    expect(autoplay.paused).toBe(true);
    expect(autoplay.reasons).toEqual(['hover']);
    autoplay.pause();
    expect(set).toHaveBeenLastCalledWith('explicit', true);
    autoplay.resume();
    expect(set).toHaveBeenCalledWith('unacknowledged', false);
    expect(set).toHaveBeenLastCalledWith('explicit', false);
    expect(autoplay.reasons).toEqual(['hover']);
    autoplay.dispose();
    expect(clear).toHaveBeenCalledTimes(1);
    expect(autoplay.paused).toBe(false);
  });
});
