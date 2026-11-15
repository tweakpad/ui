/**
 * Image editor geometry, free of the DOM: the image layer, the zoom floor of each fit, the pan
 * clamp, the crop region and the value in image space.
 *
 * Spaces:
 * - **screen**: CSS pixels relative to the viewport's top-left corner.
 * - **layer**: natural pixels of the image rotated by `rotation`, with the origin at the top-left of
 *   the rotated image's bounding box. The value lives in this space.
 *
 * A view `{ x, y, zoom }` maps layer to screen: `screen = layer * zoom + (x, y)`. The image sits
 * centred in its bounding box and turns about its centre.
 */

export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

export interface View {
  readonly x: number;
  readonly y: number;
  readonly zoom: number;
}

export type ImageEditorFitMode = 'contain' | 'cover' | 'none';

/** The handles of an adjustable region: four edges and four corners. */
export type RegionHandle = 'n' | 'e' | 's' | 'w' | 'ne' | 'se' | 'sw' | 'nw';

export const REGION_HANDLES: readonly RegionHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

const RADIANS = Math.PI / 180;

/** `(-180, 180]` degrees. */
export function normalizeRotation(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  let value = degrees % 360;
  if (value <= -180) value += 360;
  if (value > 180) value -= 360;
  // Normalise −0 so values compare and serialise stably.
  return value === 0 ? 0 : value;
}

/**
 * The quarter turn a straighten control offsets a rotation from, the offset staying within
 * ±`range`: the nearest quarter turn, with ±`range` itself kept on the side nearer to zero so a
 * control at its end reads as that end, not as the opposite one.
 */
export function straightenBase(rotation: number, range = 45): number {
  const turned = normalizeRotation(rotation);
  const base = Math.sign(turned) * Math.max(0, Math.ceil((Math.abs(turned) - range) / 90)) * 90;
  return normalizeRotation(base);
}

/** Sine and cosine of a rotation, snapped at quarter turns so 90° has no floating residue. */
function trig(degrees: number): { sin: number; cos: number } {
  const quarter = degrees / 90;
  if (Number.isInteger(quarter)) {
    const turn = ((quarter % 4) + 4) % 4;
    return [
      { sin: 0, cos: 1 },
      { sin: 1, cos: 0 },
      { sin: 0, cos: -1 },
      { sin: -1, cos: 0 },
    ][turn]!;
  }
  return { sin: Math.sin(degrees * RADIANS), cos: Math.cos(degrees * RADIANS) };
}

/** The bounding box of an image of `size` rotated by `degrees`, in natural pixels. */
export function rotatedBounds(size: Size, degrees: number): Size {
  const { sin, cos } = trig(degrees);
  const s = Math.abs(sin);
  const c = Math.abs(cos);
  return { width: size.width * c + size.height * s, height: size.width * s + size.height * c };
}

/** Layer to image-local coordinates: the offset from the image centre in the unrotated image. */
function toLocal(point: Point, image: Size, degrees: number): Point {
  const box = rotatedBounds(image, degrees);
  const { sin, cos } = trig(degrees);
  const dx = point.x - box.width / 2;
  const dy = point.y - box.height / 2;
  return { x: dx * cos + dy * sin, y: -dx * sin + dy * cos };
}

/** Image-local to layer coordinates. */
function fromLocal(local: Point, image: Size, degrees: number): Point {
  const box = rotatedBounds(image, degrees);
  const { sin, cos } = trig(degrees);
  return {
    x: box.width / 2 + local.x * cos - local.y * sin,
    y: box.height / 2 + local.x * sin + local.y * cos,
  };
}

/**
 * The half-extents of a frame of `frame` screen size seen from the unrotated image, in screen
 * pixels: how far its corners reach along the image's own axes.
 */
function frameReach(frame: Size, degrees: number): Size {
  const { sin, cos } = trig(degrees);
  const s = Math.abs(sin);
  const c = Math.abs(cos);
  return {
    width: (frame.width * c + frame.height * s) / 2,
    height: (frame.width * s + frame.height * c) / 2,
  };
}

/** The smallest zoom at which the rotated image covers a centred frame. */
export function coverZoom(image: Size, degrees: number, frame: Size): number {
  if (!image.width || !image.height) return 1;
  const reach = frameReach(frame, degrees);
  return Math.max((reach.width * 2) / image.width, (reach.height * 2) / image.height);
}

/** The largest zoom at which the rotated image's bounding box fits inside the frame. */
export function containZoom(image: Size, degrees: number, frame: Size): number {
  const box = rotatedBounds(image, degrees);
  if (!box.width || !box.height) return 1;
  return Math.min(frame.width / box.width, frame.height / box.height);
}

/** The zoom `fit()` goes to: cover for `cover`, contain otherwise. */
export function fitZoom(
  image: Size,
  degrees: number,
  frame: Size,
  mode: ImageEditorFitMode,
): number {
  return mode === 'cover' ? coverZoom(image, degrees, frame) : containZoom(image, degrees, frame);
}

export interface ZoomRange {
  readonly min: number;
  readonly max: number;
  /** The zoom of `fit()`. */
  readonly fit: number;
}

/**
 * The effective zoom range. `cover` and `contain` floor at their fit zoom; `none` floors at half
 * the contain zoom unless `minZoom` says otherwise. `minZoom` raises any floor; `maxZoom` never
 * drops below it.
 */
export function zoomRange(
  image: Size,
  degrees: number,
  frame: Size,
  mode: ImageEditorFitMode,
  minZoom: number | undefined,
  maxZoom: number,
): ZoomRange {
  const fit = fitZoom(image, degrees, frame, mode);
  const floor = mode === 'none' ? (minZoom ?? fit / 2) : Math.max(fit, minZoom ?? 0);
  const min = Math.max(floor, 1e-4);
  return { min, max: Math.max(min, maxZoom), fit };
}

/**
 * A `min-zoom` attribute: a plain number is a zoom; a CSS length is the shortest the image's
 * longer side may render, converted with `length`.
 */
export function resolveMinZoom(
  value: number | string | undefined | null,
  image: Size,
  length: (text: string) => number | undefined,
): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined;
  const number = Number(value);
  if (Number.isFinite(number)) return number > 0 ? number : undefined;
  const pixels = length(value);
  const side = Math.max(image.width, image.height);
  return pixels !== undefined && pixels > 0 && side > 0 ? pixels / side : undefined;
}

/**
 * Converts a CSS length to pixels: `px`, `rem`, `em` and `%` of `reference`. Returns undefined for
 * other text.
 */
export function resolveLength(
  value: string | number | undefined | null,
  reference: number,
  fontSize: { readonly root: number; readonly element: number },
): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  const match = /^\s*(-?\d*\.?\d+)\s*(px|rem|em|%)?\s*$/u.exec(value);
  if (!match) return undefined;
  const number = Number(match[1]);
  switch (match[2]) {
    case 'rem':
      return number * fontSize.root;
    case 'em':
      return number * fontSize.element;
    case '%':
      return (number / 100) * reference;
    default:
      return number;
  }
}

/** The clamped zoom. */
export function clampZoom(zoom: number, range: ZoomRange): number {
  return Math.min(range.max, Math.max(range.min, zoom));
}

/**
 * Keeps the image where `mode` requires it relative to the frame, by moving the view only:
 * - `cover`: every corner of the frame stays on the image; an axis the image cannot cover centres.
 * - `contain`: an axis on which the rotated image is smaller than the frame centres on it; a larger
 *   one may not leave a gap at either frame edge.
 * - `none`: the frame's centre stays over the rotated image's bounding box.
 */
export function clampView(
  view: View,
  image: Size,
  degrees: number,
  frame: Rect,
  mode: ImageEditorFitMode,
): View {
  const zoom = view.zoom;
  if (!image.width || !image.height || !(zoom > 0)) return view;
  const box = rotatedBounds(image, degrees);
  const centre = { x: frame.x + frame.width / 2, y: frame.y + frame.height / 2 };
  if (mode === 'cover') {
    const layer = { x: (centre.x - view.x) / zoom, y: (centre.y - view.y) / zoom };
    const local = toLocal(layer, image, degrees);
    const reach = frameReach(frame, degrees);
    const limitX = Math.max(0, image.width / 2 - reach.width / zoom);
    const limitY = Math.max(0, image.height / 2 - reach.height / zoom);
    const clamped = {
      x: Math.min(limitX, Math.max(-limitX, local.x)),
      y: Math.min(limitY, Math.max(-limitY, local.y)),
    };
    if (clamped.x === local.x && clamped.y === local.y) return view;
    const point = fromLocal(clamped, image, degrees);
    return { x: centre.x - point.x * zoom, y: centre.y - point.y * zoom, zoom };
  }
  const axis = (offset: number, extent: number, start: number, size: number): number => {
    if (mode === 'none') {
      // The frame centre stays within [offset, offset + extent].
      const middle = start + size / 2;
      return Math.min(middle, Math.max(middle - extent, offset));
    }
    if (extent <= size) return start + (size - extent) / 2;
    return Math.min(start, Math.max(start + size - extent, offset));
  };
  const x = axis(view.x, box.width * zoom, frame.x, frame.width);
  const y = axis(view.y, box.height * zoom, frame.y, frame.height);
  return x === view.x && y === view.y ? view : { x, y, zoom };
}

/** The view at `zoom` that keeps the layer point under `screen` where it is. */
export function zoomAround(view: View, zoom: number, screen: Point): View {
  const layerX = (screen.x - view.x) / view.zoom;
  const layerY = (screen.y - view.y) / view.zoom;
  return { x: screen.x - layerX * zoom, y: screen.y - layerY * zoom, zoom };
}

/**
 * The view after turning the image from `from` to `to` degrees about the screen point `pivot`:
 * the image point under the pivot stays under it. The layer box changes with the rotation.
 */
export function rotateAround(
  view: View,
  image: Size,
  from: number,
  to: number,
  pivot: Point,
): View {
  const layer = { x: (pivot.x - view.x) / view.zoom, y: (pivot.y - view.y) / view.zoom };
  const local = toLocal(layer, image, from);
  const point = fromLocal(local, image, to);
  return { x: pivot.x - point.x * view.zoom, y: pivot.y - point.y * view.zoom, zoom: view.zoom };
}

/** The value of a view: the frame in layer space, with the rotation. */
export function valueOfView(view: View, frame: Rect, degrees: number): ImageEditorRect {
  const zoom = view.zoom || 1;
  return {
    x: (frame.x - view.x) / zoom,
    y: (frame.y - view.y) / zoom,
    width: frame.width / zoom,
    height: frame.height / zoom,
    rotation: normalizeRotation(degrees),
  };
}

/** The image-space region a value describes; the same shape as the public value. */
export interface ImageEditorRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly rotation: number;
}

/**
 * The view that shows a value in the frame: the whole value region fits the frame, centred on it.
 */
export function viewOfValue(value: ImageEditorRect, frame: Rect): View {
  const zoom =
    value.width > 0 && value.height > 0
      ? Math.min(frame.width / value.width, frame.height / value.height)
      : 1;
  const cx = value.x + value.width / 2;
  const cy = value.y + value.height / 2;
  return {
    x: frame.x + frame.width / 2 - cx * zoom,
    y: frame.y + frame.height / 2 - cy * zoom,
    zoom,
  };
}

/** The view that centres the image at `zoom` in the frame. */
export function centredView(image: Size, degrees: number, frame: Rect, zoom: number): View {
  const box = rotatedBounds(image, degrees);
  return {
    x: frame.x + (frame.width - box.width * zoom) / 2,
    y: frame.y + (frame.height - box.height * zoom) / 2,
    zoom,
  };
}

/** Whether two values match to a thousandth of a pixel and degree. */
export function sameRect(a: ImageEditorRect | undefined, b: ImageEditorRect | undefined): boolean {
  if (!a || !b) return a === b;
  const near = (p: number, q: number) => Math.abs(p - q) < 1e-3;
  return (
    near(a.x, b.x) &&
    near(a.y, b.y) &&
    near(a.width, b.width) &&
    near(a.height, b.height) &&
    near(a.rotation, b.rotation)
  );
}

/** A value rounded to a thousandth, for stable events and serialisation. */
export function roundRect(value: ImageEditorRect): ImageEditorRect {
  const round = (n: number) => Math.round(n * 1000) / 1000 || 0;
  return {
    x: round(value.x),
    y: round(value.y),
    width: round(value.width),
    height: round(value.height),
    rotation: round(normalizeRotation(value.rotation)),
  };
}

// ---- region ---------------------------------------------------------------------------------

export interface RegionLimits {
  readonly minWidth: number;
  readonly minHeight: number;
  readonly maxWidth: number;
  readonly maxHeight: number;
}

/** A positive aspect ratio from a number or `w/h` / `w:h` text; undefined means free. */
export function parseAspectRatio(value: number | string | undefined | null): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : undefined;
  const parts = value.split(/[/:]/u).map((part) => Number(part.trim()));
  const ratio = parts.length === 2 ? parts[0]! / parts[1]! : parts[0]!;
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined;
}

/** The limits a ratio can meet: each minimum raised and maximum lowered to agree with it. */
function ratioLimits(limits: RegionLimits, ratio: number | undefined): RegionLimits {
  if (!ratio) return limits;
  const minWidth = Math.max(limits.minWidth, limits.minHeight * ratio);
  const maxWidth = Math.min(limits.maxWidth, limits.maxHeight * ratio);
  return {
    minWidth,
    minHeight: minWidth / ratio,
    maxWidth: Math.max(minWidth, maxWidth),
    maxHeight: Math.max(minWidth, maxWidth) / ratio,
  };
}

/**
 * The initial region: `width`/`height` when given (the ratio derives the missing one), otherwise
 * the largest region of the ratio inside `bounds` inset by `inset`, centred in `bounds`.
 */
export function initialRegion(
  bounds: Rect,
  ratio: number | undefined,
  limits: RegionLimits,
  inset: number,
  width?: number,
  height?: number,
): Rect {
  const room = {
    width: Math.max(1, bounds.width - inset * 2),
    height: Math.max(1, bounds.height - inset * 2),
  };
  let w: number;
  let h: number;
  if (width !== undefined || height !== undefined) {
    w = width ?? (ratio && height !== undefined ? height * ratio : room.width);
    h = height ?? (ratio ? w / ratio : room.height);
    if (ratio) h = w / ratio;
  } else if (ratio) {
    w = Math.min(room.width, room.height * ratio);
    h = w / ratio;
  } else {
    w = room.width;
    h = room.height;
  }
  const limited = ratioLimits(limits, ratio);
  const fitWidth = Math.min(
    limited.maxWidth,
    bounds.width,
    ratio ? bounds.height * ratio : Infinity,
  );
  w = Math.min(fitWidth, Math.max(limited.minWidth, w));
  h = ratio
    ? w / ratio
    : Math.min(limited.maxHeight, bounds.height, Math.max(limited.minHeight, h));
  return {
    x: bounds.x + (bounds.width - w) / 2,
    y: bounds.y + (bounds.height - h) / 2,
    width: w,
    height: h,
  };
}

/** The region moved by a delta, kept inside `bounds`. */
export function moveRegion(region: Rect, dx: number, dy: number, bounds: Rect): Rect {
  const x = Math.min(bounds.x + bounds.width - region.width, Math.max(bounds.x, region.x + dx));
  const y = Math.min(bounds.y + bounds.height - region.height, Math.max(bounds.y, region.y + dy));
  return { ...region, x, y };
}

/**
 * The region resized by dragging `handle` by a delta. Edges move with the handle while the
 * opposite side stays; with a ratio, a corner keeps its opposite corner and an edge keeps the
 * centre of the other axis. The result respects the limits and stays inside `bounds`.
 */
export function resizeRegion(
  start: Rect,
  handle: RegionHandle,
  dx: number,
  dy: number,
  ratio: number | undefined,
  limits: RegionLimits,
  bounds: Rect,
): Rect {
  const east = handle.includes('e');
  const west = handle.includes('w');
  const south = handle.includes('s');
  const north = handle.includes('n');
  const left = start.x;
  const top = start.y;
  const right = start.x + start.width;
  const bottom = start.y + start.height;
  const bRight = bounds.x + bounds.width;
  const bBottom = bounds.y + bounds.height;

  if (!ratio) {
    let x0 = left;
    let x1 = right;
    let y0 = top;
    let y1 = bottom;
    if (east) x1 = clampEdge(right + dx, x0 + limits.minWidth, x0 + limits.maxWidth, bRight);
    if (west) x0 = clampStart(left + dx, x1 - limits.maxWidth, x1 - limits.minWidth, bounds.x);
    if (south) y1 = clampEdge(bottom + dy, y0 + limits.minHeight, y0 + limits.maxHeight, bBottom);
    if (north) y0 = clampStart(top + dy, y1 - limits.maxHeight, y1 - limits.minHeight, bounds.y);
    return { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
  }

  const limited = ratioLimits(limits, ratio);
  const horizontal = east || west;
  const vertical = north || south;
  // The width each moved edge asks for; a corner follows the request that moved further.
  const fromX = start.width + (east ? dx : west ? -dx : 0);
  const fromY = (start.height + (south ? dy : north ? -dy : 0)) * ratio;
  let width =
    horizontal && vertical
      ? Math.abs(fromX - start.width) >= Math.abs(fromY - start.width)
        ? fromX
        : fromY
      : horizontal
        ? fromX
        : fromY;

  // The room the anchor leaves inside the bounds.
  const cx = start.x + start.width / 2;
  const cy = start.y + start.height / 2;
  const roomX = east
    ? bRight - left
    : west
      ? right - bounds.x
      : 2 * Math.min(cx - bounds.x, bRight - cx);
  const roomY = south
    ? bBottom - top
    : north
      ? bottom - bounds.y
      : 2 * Math.min(cy - bounds.y, bBottom - cy);
  const maxWidth = Math.min(limited.maxWidth, roomX, roomY * ratio);
  width = Math.min(maxWidth, Math.max(Math.min(limited.minWidth, maxWidth), width));
  const height = width / ratio;
  const x = east ? left : west ? right - width : cx - width / 2;
  const y = south ? top : north ? bottom - height : cy - height / 2;
  return { x, y, width, height };
}

function clampEdge(value: number, min: number, max: number, bound: number): number {
  return Math.min(bound, max, Math.max(min, value));
}

function clampStart(value: number, min: number, max: number, bound: number): number {
  return Math.max(bound, min, Math.min(max, value));
}

/**
 * Fits a region into new bounds after the viewport resizes: it keeps its size when it can and
 * shrinks (keeping its ratio) when it cannot, then stays inside.
 */
export function fitRegion(region: Rect, bounds: Rect, ratio: number | undefined): Rect {
  let { width, height } = region;
  const scale = Math.min(1, bounds.width / width, bounds.height / height);
  width *= scale;
  height = ratio ? width / ratio : height * scale;
  return moveRegion({ x: region.x, y: region.y, width, height }, 0, 0, bounds);
}
