/**
 * Geographic values and Web Mercator geometry for Map (`sec-1812-map` map-f-coordinates).
 *
 * Positions always use named `latitude`/`longitude` fields in decimal degrees (WGS 84). Zoom uses
 * the 256-pixel-tile Web Mercator scale (zoom 0 shows the world in 256 CSS pixels); engines that
 * use another scale convert at their boundary. Bounds are `south`, `west`, `north`, `east`; a west
 * edge greater than the east edge crosses the antimeridian.
 */

export interface MapPosition {
  readonly latitude: number;
  readonly longitude: number;
}

export interface MapBounds {
  readonly south: number;
  readonly west: number;
  readonly north: number;
  readonly east: number;
}

export interface MapCamera {
  readonly center: MapPosition;
  readonly zoom: number;
  /** Degrees clockwise from north, in [0, 360). */
  readonly bearing: number;
  /** Degrees from vertical. */
  readonly pitch: number;
}

/** Any subset of camera fields; missing fields keep their current value. */
export interface MapCameraTarget {
  readonly center?: MapPosition;
  readonly zoom?: number;
  readonly bearing?: number;
  readonly pitch?: number;
}

/** A point in CSS pixels relative to the viewport's top-left corner. */
export interface MapPoint {
  readonly x: number;
  readonly y: number;
}

/** Padding in CSS pixels; a number applies to every edge. */
export type MapPadding =
  | number
  | {
      readonly top: number;
      readonly right: number;
      readonly bottom: number;
      readonly left: number;
    };

export const MERCATOR_MAX_LATITUDE = 85.051129;
export const TILE_SIZE = 256;

const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

export function clampLatitude(latitude: number): number {
  return Math.max(-MERCATOR_MAX_LATITUDE, Math.min(MERCATOR_MAX_LATITUDE, latitude));
}

/** Normalizes to [-180, 180). */
export function wrapLongitude(longitude: number): number {
  // In-range values stay exact (modular arithmetic would add floating-point drift).
  if (longitude >= -180 && longitude < 180) return Object.is(longitude, -0) ? 0 : longitude;
  const wrapped = ((((longitude + 180) % 360) + 360) % 360) - 180;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

/** Normalizes to [0, 360). */
export function wrapBearing(bearing: number): number {
  if (bearing >= 0 && bearing < 360) return Object.is(bearing, -0) ? 0 : bearing;
  const wrapped = ((bearing % 360) + 360) % 360;
  return Object.is(wrapped, -0) ? 0 : wrapped;
}

export function normalizePosition(position: MapPosition): MapPosition {
  return Object.freeze({
    latitude: clampLatitude(position.latitude),
    longitude: wrapLongitude(position.longitude),
  });
}

export function isPosition(value: unknown): value is MapPosition {
  return (
    typeof value === 'object' &&
    value !== null &&
    finite((value as MapPosition).latitude) &&
    finite((value as MapPosition).longitude)
  );
}

export function isBounds(value: unknown): value is MapBounds {
  const bounds = value as MapBounds;
  return (
    typeof value === 'object' &&
    value !== null &&
    finite(bounds.south) &&
    finite(bounds.west) &&
    finite(bounds.north) &&
    finite(bounds.east) &&
    bounds.south <= bounds.north
  );
}

function numbers(text: string, count: number): number[] | null {
  const parts = text.split(',').map((part) => part.trim());
  if (parts.length !== count || parts.some((part) => part === '')) return null;
  const values = parts.map(Number);
  return values.every(Number.isFinite) ? values : null;
}

/** Accepts a position object or `latitude,longitude` text; returns `null` when invalid. */
export function parsePosition(value: unknown): MapPosition | null {
  if (isPosition(value)) return normalizePosition(value);
  if (typeof value !== 'string') return null;
  const values = numbers(value, 2);
  return values ? normalizePosition({ latitude: values[0]!, longitude: values[1]! }) : null;
}

/** Accepts a bounds object or `south,west,north,east` text; returns `null` when invalid. */
export function parseBounds(value: unknown): MapBounds | null {
  if (isBounds(value)) return Object.freeze({ ...value });
  if (typeof value !== 'string') return null;
  const values = numbers(value, 4);
  if (!values) return null;
  const bounds = { south: values[0]!, west: values[1]!, north: values[2]!, east: values[3]! };
  return isBounds(bounds) ? Object.freeze(bounds) : null;
}

export function resolvePadding(padding: MapPadding | undefined, fallback = 0) {
  const value = padding ?? fallback;
  return typeof value === 'number'
    ? { top: value, right: value, bottom: value, left: value }
    : { top: value.top, right: value.right, bottom: value.bottom, left: value.left };
}

/** Smallest bounds containing every position (shortest longitude span, antimeridian-aware). */
export function boundsOf(positions: readonly MapPosition[]): MapBounds | null {
  if (!positions.length) return null;
  let south = Infinity;
  let north = -Infinity;
  for (const { latitude } of positions) {
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  // The largest gap between sorted longitudes is the one the bounds should not cross.
  const longitudes = positions
    .map((position) => wrapLongitude(position.longitude))
    .sort((a, b) => a - b);
  let gap = longitudes[0]! + 360 - longitudes.at(-1)!;
  let west = longitudes[0]!;
  let east = longitudes.at(-1)!;
  for (let index = 1; index < longitudes.length; index += 1) {
    const span = longitudes[index]! - longitudes[index - 1]!;
    if (span > gap) {
      gap = span;
      west = longitudes[index]!;
      east = longitudes[index - 1]!;
    }
  }
  return Object.freeze({ south, west, north, east });
}

export function boundsContain(bounds: MapBounds, position: MapPosition): boolean {
  if (position.latitude < bounds.south || position.latitude > bounds.north) return false;
  const longitude = wrapLongitude(position.longitude);
  return bounds.west <= bounds.east
    ? longitude >= bounds.west && longitude <= bounds.east
    : longitude >= bounds.west || longitude <= bounds.east;
}

/** World pixel coordinates at zoom 0 (256 × 256 world). */
export function toWorld(position: MapPosition): MapPoint {
  const sin = Math.sin((clampLatitude(position.latitude) * Math.PI) / 180);
  return {
    x: ((position.longitude + 180) / 360) * TILE_SIZE,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * TILE_SIZE,
  };
}

export function fromWorld(point: MapPoint): MapPosition {
  const longitude = (point.x / TILE_SIZE) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * point.y) / TILE_SIZE;
  const latitude = (180 / Math.PI) * Math.atan(Math.sinh(n));
  return normalizePosition({ latitude, longitude });
}

export interface ViewportSize {
  readonly width: number;
  readonly height: number;
}

/**
 * Projects a position to viewport CSS pixels for a north-up, unpitched camera. Engines that tilt
 * or rotate must provide their own projection; this is the fit and test fallback.
 */
export function projectFlat(
  position: MapPosition,
  camera: MapCamera,
  size: ViewportSize,
): MapPoint {
  const scale = 2 ** camera.zoom;
  const center = toWorld(camera.center);
  const point = toWorld(position);
  let dx = point.x - center.x;
  // Choose the world copy closest to the center.
  if (dx > TILE_SIZE / 2) dx -= TILE_SIZE;
  if (dx < -TILE_SIZE / 2) dx += TILE_SIZE;
  return { x: size.width / 2 + dx * scale, y: size.height / 2 + (point.y - center.y) * scale };
}

export function unprojectFlat(point: MapPoint, camera: MapCamera, size: ViewportSize): MapPosition {
  const scale = 2 ** camera.zoom;
  const center = toWorld(camera.center);
  return fromWorld({
    x: center.x + (point.x - size.width / 2) / scale,
    y: center.y + (point.y - size.height / 2) / scale,
  });
}

/**
 * The north-up camera that fits `bounds` inside the viewport less `padding` (fit fallback for
 * engines without `cameraForBounds`).
 */
export function fitCamera(
  bounds: MapBounds,
  size: ViewportSize,
  options: { padding?: MapPadding; minZoom?: number; maxZoom?: number } = {},
): MapCamera {
  const padding = resolvePadding(options.padding);
  const west = toWorld({ latitude: bounds.north, longitude: bounds.west });
  const eastLongitude = bounds.east < bounds.west ? bounds.east + 360 : bounds.east;
  const east = toWorld({ latitude: bounds.south, longitude: eastLongitude });
  const width = Math.max(east.x - west.x, 1e-9);
  const height = Math.max(east.y - west.y, 1e-9);
  const availableWidth = Math.max(size.width - padding.left - padding.right, 1);
  const availableHeight = Math.max(size.height - padding.top - padding.bottom, 1);
  let zoom = Math.log2(Math.min(availableWidth / width, availableHeight / height));
  zoom = Math.min(options.maxZoom ?? 22, Math.max(options.minZoom ?? 0, zoom));
  const scale = 2 ** zoom;
  // Shift the center so the padded box, not the whole viewport, is centered on the bounds.
  const offsetX = (padding.left - padding.right) / 2 / scale;
  const offsetY = (padding.top - padding.bottom) / 2 / scale;
  const center = fromWorld({
    x: (west.x + east.x) / 2 - offsetX,
    y: (west.y + east.y) / 2 - offsetY,
  });
  return Object.freeze({ center, zoom, bearing: 0, pitch: 0 });
}

export function mergeCamera(camera: MapCamera, target: MapCameraTarget): MapCamera {
  return Object.freeze({
    center: target.center ? normalizePosition(target.center) : camera.center,
    zoom: finite(target.zoom) ? target.zoom : camera.zoom,
    bearing: finite(target.bearing) ? wrapBearing(target.bearing) : camera.bearing,
    pitch: finite(target.pitch) ? target.pitch : camera.pitch,
  });
}

export function camerasEqual(a: MapCamera, b: MapCamera, epsilon = 1e-9): boolean {
  return (
    Math.abs(a.center.latitude - b.center.latitude) < epsilon &&
    Math.abs(wrapLongitude(a.center.longitude - b.center.longitude)) < epsilon &&
    Math.abs(a.zoom - b.zoom) < epsilon &&
    Math.abs(a.bearing - b.bearing) < epsilon &&
    Math.abs(a.pitch - b.pitch) < epsilon
  );
}

export const DEFAULT_CAMERA: MapCamera = Object.freeze({
  center: Object.freeze({ latitude: 0, longitude: 0 }),
  zoom: 1,
  bearing: 0,
  pitch: 0,
});
