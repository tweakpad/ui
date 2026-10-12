import { describe, expect, it } from 'vitest';
import { insertWaypoint, projectOntoPolyline, waypointInsertIndex } from './waypoints.js';

const path = [
  { x: 0, y: 0 },
  { x: 100, y: 0 },
  { x: 100, y: 100 },
];

describe('waypoint insertion', () => {
  it('projects points onto the polyline by arc length', () => {
    expect(projectOntoPolyline(path, { x: 50, y: 5 })).toBeCloseTo(0.25);
    expect(projectOntoPolyline(path, { x: 110, y: 50 })).toBeCloseTo(0.75);
    expect(projectOntoPolyline(path, { x: -10, y: -10 })).toBe(0);
    expect(projectOntoPolyline([{ x: 0, y: 0 }], { x: 1, y: 1 })).toBe(0);
  });

  it('keeps existing waypoints ordered along the path', () => {
    const waypoints = [
      { x: 100, y: 0 },
      { x: 100, y: 80 },
    ];
    expect(waypointInsertIndex(path, waypoints, { x: 40, y: 0 })).toBe(0);
    expect(waypointInsertIndex(path, waypoints, { x: 100, y: 40 })).toBe(1);
    expect(waypointInsertIndex(path, waypoints, { x: 100, y: 95 })).toBe(2);
  });

  it('inserts a copy of the point', () => {
    const point = { x: 100, y: 40 };
    const next = insertWaypoint(path, [{ x: 100, y: 0 }], point);
    expect(next).toEqual([
      { x: 100, y: 0 },
      { x: 100, y: 40 },
    ]);
    expect(next[1]).not.toBe(point);
  });
});
