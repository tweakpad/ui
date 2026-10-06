import { describe, expect, it } from 'vitest';
import {
  boundsContain,
  boundsOf,
  clampLatitude,
  DEFAULT_CAMERA,
  fitCamera,
  mergeCamera,
  parseBounds,
  parsePosition,
  projectFlat,
  unprojectFlat,
  wrapBearing,
  wrapLongitude,
} from './geo.js';

describe('map geo (map-f-coordinates)', () => {
  it('normalizes latitude, longitude and bearing', () => {
    expect(clampLatitude(90)).toBeCloseTo(85.051129);
    expect(wrapLongitude(190)).toBe(-170);
    expect(wrapLongitude(-180)).toBe(-180);
    expect(wrapLongitude(180)).toBe(-180);
    expect(wrapBearing(-90)).toBe(270);
  });

  it('parses named text forms and rejects invalid input', () => {
    expect(parsePosition('38.7, -9.1')).toEqual({ latitude: 38.7, longitude: -9.1 });
    expect(parsePosition('38.7')).toBeNull();
    expect(parsePosition('a,b')).toBeNull();
    expect(parseBounds('38.6,-9.3,38.8,-9.0')).toEqual({
      south: 38.6,
      west: -9.3,
      north: 38.8,
      east: -9,
    });
    expect(parseBounds('39,-9,38,-8')).toBeNull();
  });

  it('computes the shortest bounds, crossing the antimeridian when shorter', () => {
    const bounds = boundsOf([
      { latitude: 0, longitude: 179 },
      { latitude: 10, longitude: -179 },
    ])!;
    expect(bounds.west).toBe(179);
    expect(bounds.east).toBe(-179);
    expect(boundsContain(bounds, { latitude: 5, longitude: 180 })).toBe(true);
    expect(boundsContain(bounds, { latitude: 5, longitude: 0 })).toBe(false);
  });

  it('projects and unprojects inversely', () => {
    const camera = mergeCamera(DEFAULT_CAMERA, {
      center: { latitude: 38.7, longitude: -9.1 },
      zoom: 12,
    });
    const size = { width: 400, height: 300 };
    const point = projectFlat({ latitude: 38.71, longitude: -9.12 }, camera, size);
    const back = unprojectFlat(point, camera, size);
    expect(back.latitude).toBeCloseTo(38.71, 6);
    expect(back.longitude).toBeCloseTo(-9.12, 6);
    expect(projectFlat(camera.center, camera, size)).toEqual({ x: 200, y: 150 });
  });

  it('fits bounds inside the padded viewport', () => {
    const size = { width: 400, height: 300 };
    const bounds = { south: 38.68, west: -9.24, north: 38.78, east: -9.08 };
    const camera = fitCamera(bounds, size, { padding: 20 });
    const corner = projectFlat({ latitude: bounds.north, longitude: bounds.west }, camera, size);
    const opposite = projectFlat({ latitude: bounds.south, longitude: bounds.east }, camera, size);
    expect(Math.min(corner.x, corner.y)).toBeGreaterThanOrEqual(19.9);
    expect(opposite.x).toBeLessThanOrEqual(380.1);
    expect(opposite.y).toBeLessThanOrEqual(280.1);
    // At least one axis touches the padding (the fit is tight).
    expect(Math.min(corner.x - 20, corner.y - 20, 380 - opposite.x, 280 - opposite.y)).toBeCloseTo(
      0,
      3,
    );
    expect(fitCamera(bounds, size, { maxZoom: 5 }).zoom).toBe(5);
  });
});
