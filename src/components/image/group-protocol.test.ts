import { describe, expect, it } from 'vitest';
import { groupLoadingStatus, staggerDelays, transitionSpan } from './group-protocol.js';

describe('image group helpers', () => {
  it('spaces reveals by the stagger in order', () => {
    expect(staggerDelays(4, 120)).toEqual([0, 120, 240, 360]);
    expect(staggerDelays(3, 0)).toEqual([0, 0, 0]);
    expect(staggerDelays(2, -50)).toEqual([0, 0]);
    expect(staggerDelays(0, 100)).toEqual([]);
  });

  it('aggregates member status, counting failures as settled', () => {
    expect(groupLoadingStatus([])).toEqual({ status: 'idle', loaded: 0, failed: 0, total: 0 });
    expect(groupLoadingStatus(['loaded', 'loading'])).toMatchObject({
      status: 'loading',
      loaded: 1,
    });
    expect(groupLoadingStatus(['loaded', 'error', 'idle'])).toEqual({
      status: 'loaded',
      loaded: 1,
      failed: 1,
      total: 3,
    });
  });

  it('measures the longest transition including its delay', () => {
    const style = (transitionDuration: string, transitionDelay: string) =>
      ({ transitionDuration, transitionDelay }) as CSSStyleDeclaration;
    expect(transitionSpan(style('0.9s, 0.9s, 0.9s', '0.24s'))).toBeCloseTo(1140);
    expect(transitionSpan(style('200ms, 0s', '0s, 500ms'))).toBe(500);
    expect(transitionSpan(style('0s', '0s'))).toBe(0);
  });
});
