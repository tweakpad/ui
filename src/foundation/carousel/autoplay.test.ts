import { afterEach, describe, expect, it, vi } from 'vitest';
import { CarouselAutoplay } from './autoplay.js';
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
