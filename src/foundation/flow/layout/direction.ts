import type { FlowLayoutDirection, FlowPoint, FlowSide } from '../types.js';
import type { FlowLayoutRequest } from './types.js';

/**
 * Direction mapping: the layered pipeline works in (main, cross) coordinates; `horizontal`
 * maps main → x and cross → y, `vertical` the other way round. Derived port sides follow the
 * direction (inputs before, outputs after along the main axis).
 */
export function mapToFlowCoordinates(
  main: number,
  cross: number,
  direction: FlowLayoutDirection,
): FlowPoint {
  return direction === 'horizontal' ? { x: main, y: cross } : { x: cross, y: main };
}

export function portSidesFor(direction: FlowLayoutDirection): {
  input: FlowSide;
  output: FlowSide;
} {
  return direction === 'horizontal'
    ? { input: 'left', output: 'right' }
    : { input: 'top', output: 'bottom' };
}

/** Extent estimate the `smart` rule compares against the viewport aspect. */
export interface DirectionEstimate {
  /** Main-axis extent when laid out horizontally (sum of rank widths) and vertically. */
  horizontal: { width: number; height: number };
  vertical: { width: number; height: number };
}

/**
 * `smart` picks the axis: explicit port sides decide (left/right → horizontal, top/bottom →
 * vertical, majority wins, horizontal on ties); otherwise the orientation whose estimated
 * aspect is closest to `viewportAspect` (log distance).
 */
export function smartDirection(
  request: FlowLayoutRequest,
  estimate: DirectionEstimate | undefined,
  viewportAspect: number,
): FlowLayoutDirection {
  let horizontal = 0;
  let vertical = 0;
  for (const node of request.nodes)
    for (const port of node.ports) {
      if (port.side === 'left' || port.side === 'right') horizontal += 1;
      else if (port.side === 'top' || port.side === 'bottom') vertical += 1;
    }
  if (horizontal > 0 || vertical > 0) return vertical > horizontal ? 'vertical' : 'horizontal';
  if (!estimate) return 'horizontal';
  const aspect = (size: { width: number; height: number }): number =>
    size.height > 0 && size.width > 0 ? size.width / size.height : viewportAspect;
  const distance = (value: number): number => Math.abs(Math.log(value / viewportAspect));
  const h = distance(aspect(estimate.horizontal));
  const v = distance(aspect(estimate.vertical));
  return v < h - 1e-9 ? 'vertical' : 'horizontal';
}

export function resolveDirection(
  request: FlowLayoutRequest,
  estimate: DirectionEstimate | undefined,
  viewportAspect: number,
): FlowLayoutDirection {
  if (request.direction === 'smart') return smartDirection(request, estimate, viewportAspect);
  return request.direction;
}
