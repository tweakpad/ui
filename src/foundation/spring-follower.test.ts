import { describe, expect, it, vi } from 'vitest';
import {
  clampSpring,
  DEFAULT_FOLLOWER,
  DEFAULT_REST,
  SpringFollower2D,
} from './spring-follower.js';

const settle = (follower: SpringFollower2D, frames = 600, elapsed = 16) => {
  let count = 0;
  while (follower.step(elapsed) && count < frames) count++;
  return count;
};

describe('clampSpring', () => {
  it('keeps the base for missing or unreadable values and clamps out-of-range ones', () => {
    const report = vi.fn();
    expect(clampSpring({}, DEFAULT_FOLLOWER, report)).toEqual(DEFAULT_FOLLOWER);
    expect(
      clampSpring({ stiffness: 5000, damping: -1, mass: Number.NaN }, undefined, report),
    ).toEqual({ stiffness: 1000, damping: 0, mass: 1 });
    expect(report.mock.calls.map(([key]) => key)).toEqual(['stiffness', 'damping', 'mass']);
    expect(
      clampSpring({ stiffness: 300, damping: null }, { stiffness: 1, damping: 50, mass: 2 }),
    ).toEqual({ stiffness: 300, damping: 50, mass: 2 });
  });
});

describe('SpringFollower2D', () => {
  it('settles on the target within the rest thresholds and stops reporting motion', () => {
    const follower = new SpringFollower2D();
    follower.setTarget(400, 300);
    expect(follower.settled).toBe(false);
    const frames = settle(follower);
    expect(frames).toBeLessThan(120);
    expect(follower.settled).toBe(true);
    expect(follower.x).toBe(400);
    expect(follower.y).toBe(300);
    expect(follower.vx).toBe(0);
    expect(follower.step(16)).toBe(false);
  });

  it('never overshoots at critical damping', () => {
    const follower = new SpringFollower2D({ stiffness: 170, damping: 2 * Math.sqrt(170), mass: 1 });
    follower.setTarget(500, 0);
    let max = 0;
    while (follower.step(16)) max = Math.max(max, follower.x);
    expect(max).toBeLessThanOrEqual(500 + 1e-6);
  });

  it('keeps velocity when the target moves and when the parameters change', () => {
    const follower = new SpringFollower2D();
    follower.setTarget(200, 0);
    follower.step(16);
    follower.step(16);
    const { vx, x } = follower;
    expect(vx).toBeGreaterThan(0);
    follower.setTarget(-200, 0);
    expect(follower.vx).toBe(vx);
    expect(follower.x).toBe(x);
    follower.setParameters({ stiffness: 900, damping: 60, mass: 0.5 });
    expect(follower.vx).toBe(vx);
    follower.step(16);
    expect(follower.vx).toBeLessThan(vx);
  });

  it('snaps to a point with zero velocity', () => {
    const follower = new SpringFollower2D();
    follower.setTarget(50, 50);
    follower.step(16);
    follower.snap();
    expect([follower.x, follower.y, follower.vx, follower.vy, follower.settled]).toEqual([
      50,
      50,
      0,
      0,
      true,
    ]);
    follower.snap(10, 20);
    expect([follower.tx, follower.ty, follower.x, follower.y]).toEqual([10, 20, 10, 20]);
  });

  it('stays stable with the harshest parameters after a long pause', () => {
    const follower = new SpringFollower2D({ stiffness: 1000, damping: 0.5, mass: 0.1 });
    follower.setTarget(1000, -1000);
    follower.step(5000);
    expect(Number.isFinite(follower.x) && Number.isFinite(follower.vx)).toBe(true);
    expect(Math.abs(follower.x)).toBeLessThan(3000);
    const heavy = new SpringFollower2D({ stiffness: 1000, damping: 100, mass: 0.1 });
    heavy.setTarget(100, 100);
    settle(heavy, 2000);
    expect(heavy.settled).toBe(true);
  });

  it('ignores target changes within the rest distance while settled', () => {
    const follower = new SpringFollower2D(DEFAULT_FOLLOWER, DEFAULT_REST);
    follower.snap(10, 10);
    follower.setTarget(10.05, 10);
    expect(follower.settled).toBe(true);
    follower.setTarget(10.2, 10);
    expect(follower.settled).toBe(false);
  });
});
