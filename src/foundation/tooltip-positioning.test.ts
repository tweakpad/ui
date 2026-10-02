import { describe, expect, it, vi } from 'vitest';
import { computeSurfacePosition, rect } from './positioning.js';
import { DelayGroup } from './delay-group.js';

const viewport = rect(0, 0, 320, 240);
const surface = rect(0, 0, 100, 40);
describe('anchored collision policy', () => {
  it.each([
    ['top', rect(2, 2, 20, 20), 'bottom'],
    ['right', rect(300, 80, 20, 20), 'left'],
    ['bottom', rect(100, 220, 20, 20), 'top'],
    ['left', rect(2, 80, 20, 20), 'right'],
  ] as const)('flips %s and shifts the alignment into the viewport', (side, anchor, resolved) => {
    const result = computeSurfacePosition(anchor, surface, viewport, {
      placement: side,
      padding: 5,
      collision: { side: 'flip', align: 'shift' },
    })!;
    expect(result.placement).toBe(resolved);
    expect(result.x).toBeGreaterThanOrEqual(5);
    expect(result.y).toBeGreaterThanOrEqual(5);
    expect(result.x + surface.width).toBeLessThanOrEqual(315);
    expect(result.y + surface.height).toBeLessThanOrEqual(235);
  });
  it('honors collision none even when both axes overflow', () => {
    const result = computeSurfacePosition(rect(0, 0, 10, 10), surface, viewport, {
      placement: 'top',
      offset: 6,
      collision: { side: 'none', align: 'none' },
    })!;
    expect(result).toMatchObject({ x: -45, y: -46, placement: 'top' });
    expect(result.stageData.shift).toMatchObject({ x: 0, y: 0 });
  });
  it('subtracts spacing from the available extent on the resolved side', () => {
    const result = computeSurfacePosition(rect(100, 80, 20, 20), surface, viewport, {
      placement: 'right',
      offset: 6,
      padding: 5,
    })!;
    expect(result.availableWidth).toBe(189);
    expect(result.availableHeight).toBe(230);
  });
  it('measures untransformed arrows and reports clamp displacement', () => {
    const arrow = {
      offsetWidth: 10,
      offsetHeight: 10,
      getBoundingClientRect: () => rect(0, 0, 2, 2),
    } as HTMLElement;
    const result = computeSurfacePosition(rect(0, 80, 4, 20), surface, viewport, {
      placement: 'bottom',
      padding: 5,
      arrow,
      arrowPadding: 8,
      collision: { side: 'flip', align: 'shift' },
    })!;
    expect(result.stageData.arrow).toMatchObject({ x: 8, centerOffset: -16 });
  });
  it('sticky permits side shifting but does not override collision none', () => {
    const anchor = rect(100, 220, 20, 20);
    const sticky = computeSurfacePosition(anchor, surface, viewport, {
      placement: 'bottom',
      padding: 5,
      sticky: true,
      collision: { side: 'none', align: 'shift' },
    })!;
    expect(sticky.y).toBe(195);
    const fixed = computeSurfacePosition(anchor, surface, viewport, {
      placement: 'bottom',
      padding: 5,
      sticky: true,
      collision: { side: 'none', align: 'none' },
    })!;
    expect(fixed.y).toBe(248);
  });
  it('rejects invalid virtual geometry', () => {
    expect(computeSurfacePosition(rect(NaN, 0, 1, 1), surface, viewport)).toBeNull();
  });
});
describe('tooltip provider', () => {
  it('cancels earlier pending participants and closes the active sibling', () => {
    const group = new DelayGroup();
    const first = { close: vi.fn() },
      second = { close: vi.fn() },
      cancel = vi.fn();
    group.reserve(first, cancel);
    group.reserve(second, vi.fn());
    expect(cancel).toHaveBeenCalledOnce();
    group.activate(first);
    group.activate(second);
    expect(first.close).toHaveBeenCalledOnce();
    expect(group.instant).toBe(true);
  });
  it('retains instant switching only for the configured rest interval', () => {
    vi.useFakeTimers();
    const group = new DelayGroup({ restTimeout: 400, openDelay: 0 });
    const owner = { close: vi.fn() };
    expect(group.openDelay).toBe(0);
    group.activate(owner);
    group.release(owner);
    vi.advanceTimersByTime(399);
    expect(group.instant).toBe(true);
    vi.advanceTimersByTime(1);
    expect(group.instant).toBe(false);
    group.reserve(owner, owner.close);
    group.destroy();
    expect(owner.close).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
});
