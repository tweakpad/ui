import { fitCornerRadii, type CornerRadius, type RingBox } from './ring-path.js';

/**
 * Points along a border's centerline, in drawing order (clockwise from the start of the top
 * edge, like `ringPath`): position, distance along the line and angle around the box.
 */
export interface RingSamples {
  readonly count: number;
  /** The perimeter in pixels. */
  readonly length: number;
  readonly x: Float32Array;
  readonly y: Float32Array;
  /** Distance along the line from the start, in pixels. */
  readonly s: Float32Array;
  /**
   * Angle around the box center in degrees, 0 at the top and clockwise, measured in the box's
   * own proportions so its corners sit at 45°, 135°, 225° and 315° whatever its shape.
   */
  readonly angle: Float32Array;
}

interface Piece {
  readonly length: number;
  point(t: number): [number, number];
}

const line = (x0: number, y0: number, x1: number, y1: number): Piece => ({
  length: Math.hypot(x1 - x0, y1 - y0),
  point: (t) => [x0 + (x1 - x0) * t, y0 + (y1 - y0) * t],
});

/** A quarter ellipse from `from` to `from + 90°` (degrees, 0 = +x, clockwise on screen). */
const corner = (cx: number, cy: number, radius: CornerRadius, from: number): Piece => {
  const { x, y } = radius;
  const h = (x - y) ** 2 / Math.max((x + y) ** 2, 1e-9);
  const length =
    x > 0 && y > 0 ? (Math.PI * (x + y) * (1 + (3 * h) / (10 + Math.sqrt(4 - 3 * h)))) / 4 : 0;
  return {
    length,
    point: (t) => {
      const a = ((from + 90 * t) * Math.PI) / 180;
      return [cx + x * Math.cos(a), cy + y * Math.sin(a)];
    },
  };
};

/**
 * Samples the centerline `inset` pixels inside `box` (as `ringPath` draws it) about every `step`
 * pixels; every piece of the outline gets whole steps, so corners keep their shape.
 */
export function ringSamples(box: RingBox, inset: number, step = 1.5): RingSamples {
  const [ftl, ftr, fbr, fbl] = fitCornerRadii(box);
  const shrink = (radius: CornerRadius) => ({
    x: Math.max(0, radius.x - inset),
    y: Math.max(0, radius.y - inset),
  });
  const [tl, tr, br, bl] = [shrink(ftl), shrink(ftr), shrink(fbr), shrink(fbl)];
  const x0 = inset;
  const y0 = inset;
  const x1 = Math.max(x0, box.width - inset);
  const y1 = Math.max(y0, box.height - inset);
  const pieces: Piece[] = [
    line(x0 + tl.x, y0, x1 - tr.x, y0),
    corner(x1 - tr.x, y0 + tr.y, tr, -90),
    line(x1, y0 + tr.y, x1, y1 - br.y),
    corner(x1 - br.x, y1 - br.y, br, 0),
    line(x1 - br.x, y1, x0 + bl.x, y1),
    corner(x0 + bl.x, y1 - bl.y, bl, 90),
    line(x0, y1 - bl.y, x0, y0 + tl.y),
    corner(x0 + tl.x, y0 + tl.y, tl, 180),
  ].filter((piece) => piece.length > 1e-6);
  const xs: number[] = [];
  const ys: number[] = [];
  const ss: number[] = [];
  let travelled = 0;
  for (const piece of pieces) {
    const steps = Math.max(1, Math.round(piece.length / step));
    for (let index = 0; index < steps; index++) {
      const [x, y] = piece.point(index / steps);
      xs.push(x);
      ys.push(y);
      ss.push(travelled + (piece.length * index) / steps);
    }
    travelled += piece.length;
  }
  const cx = box.width / 2;
  const cy = box.height / 2;
  const halfWidth = Math.max(box.width / 2, 1e-6);
  const halfHeight = Math.max(box.height / 2, 1e-6);
  const angle = xs.map((x, index) => {
    const degrees =
      (Math.atan2((x - cx) / halfWidth, -(ys[index]! - cy) / halfHeight) * 180) / Math.PI;
    return (degrees + 360) % 360;
  });
  return {
    count: xs.length,
    length: travelled,
    x: Float32Array.from(xs),
    y: Float32Array.from(ys),
    s: Float32Array.from(ss),
    angle: Float32Array.from(angle),
  };
}
