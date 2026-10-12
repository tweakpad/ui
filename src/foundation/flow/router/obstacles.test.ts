import { describe, expect, it } from 'vitest';
import { ObstacleIndex, collectCoordinates } from './obstacles.js';

describe('ObstacleIndex', () => {
  it('stores padded rects and queries them', () => {
    const obstacles = new ObstacleIndex(10);
    expect(obstacles.set('a', { x: 100, y: 100, width: 50, height: 30 })).toBe(true);
    expect(obstacles.set('a', { x: 100, y: 100, width: 50, height: 30 })).toBe(false);
    expect(obstacles.rectOf('a')).toEqual({ x: 90, y: 90, width: 70, height: 50 });
    expect(obstacles.query({ x: 0, y: 0, width: 95, height: 95 })).toEqual(['a']);
    expect(obstacles.query({ x: 0, y: 0, width: 90, height: 90 })).toEqual([]);
    expect(obstacles.containing({ x: 90, y: 100 })).toEqual(['a']);
    expect(obstacles.containing({ x: 89, y: 100 })).toEqual([]);
    expect(obstacles.remove('a')).toBe(true);
    expect(obstacles.remove('a')).toBe(false);
    expect(obstacles.size).toBe(0);
  });

  it('returns query results in id order', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('b', { x: 0, y: 0, width: 10, height: 10 });
    obstacles.set('a', { x: 5, y: 5, width: 10, height: 10 });
    obstacles.set('c', { x: 500, y: 500, width: 10, height: 10 });
    expect(obstacles.query({ x: 0, y: 0, width: 20, height: 20 })).toEqual(['a', 'b']);
    expect(obstacles.rectsIn({ x: 0, y: 0, width: 20, height: 20 }).map(([id]) => id)).toEqual([
      'a',
      'b',
    ]);
  });

  it('projects inside points onto the nearest padded boundary', () => {
    const obstacles = new ObstacleIndex(10);
    obstacles.set('a', { x: 100, y: 100, width: 100, height: 40 });
    expect(obstacles.projectOut({ x: 150, y: 125 })).toEqual({ x: 150, y: 150 });
    expect(obstacles.projectOut({ x: 95, y: 120 })).toEqual({ x: 90, y: 120 });
    expect(obstacles.projectOut({ x: 150, y: 95 })).toEqual({ x: 150, y: 90 });
    expect(obstacles.projectOut({ x: 300, y: 300 })).toEqual({ x: 300, y: 300 });
    expect(obstacles.projectOut({ x: 90, y: 120 })).toEqual({ x: 90, y: 120 });
  });
});

describe('collectCoordinates', () => {
  it('collects region bounds, obstacle edges in the region and points', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 100, y: 100, width: 50, height: 50 });
    obstacles.set('far', { x: 900, y: 900, width: 50, height: 50 });
    const result = collectCoordinates(obstacles, { x: 0, y: 0, width: 300, height: 300 }, [
      { x: 20, y: 40 },
    ]);
    expect(result.xs).toEqual([0, 20, 100, 150, 300]);
    expect(result.ys).toEqual([0, 40, 100, 150, 300]);
    expect(result.obstacleIds).toEqual(['a']);
  });

  it('clips coordinates to the region and deduplicates them', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: -50, y: 0, width: 100, height: 100 });
    obstacles.set('b', { x: 50, y: 0, width: 50, height: 100 });
    const result = collectCoordinates(obstacles, { x: 0, y: 0, width: 200, height: 100 }, [
      { x: 50, y: 0 },
    ]);
    expect(result.xs).toEqual([0, 50, 100, 200]);
    expect(result.ys).toEqual([0, 100]);
  });

  it('adds midlines between neighbouring coordinates when asked', () => {
    const obstacles = new ObstacleIndex(0);
    obstacles.set('a', { x: 100, y: 100, width: 100, height: 100 });
    const result = collectCoordinates(obstacles, { x: 0, y: 0, width: 300, height: 300 }, [], {
      midlines: true,
    });
    expect(result.xs).toEqual([0, 50, 100, 150, 200, 250, 300]);
    const narrow = collectCoordinates(
      obstacles,
      { x: 0, y: 0, width: 300, height: 300 },
      [{ x: 101, y: 0 }],
      { midlines: true, minGap: 2 },
    );
    expect(narrow.xs).toContain(101);
    expect(narrow.xs).not.toContain(100.5);
  });
});
