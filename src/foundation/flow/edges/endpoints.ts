import { rectCenter, sideOf } from '../geometry.js';
import type {
  FlowEdgeKind,
  FlowEndpoint,
  FlowLayoutMode,
  FlowPoint,
  FlowPortGeometry,
  FlowRect,
  FlowResolvedPort,
  FlowSide,
  FlowSize,
} from '../types.js';

/**
 * Endpoint resolution: which side of a node an edge leaves from and where. Side precedence is
 * declared (`port.side`) → measured geometry → layout-direction default; path kinds other than
 * `orthogonal` fall back to the side facing the other endpoint when neither is declared nor
 * measured. Default port geometry distributes ports at `(i + 1) / (n + 1)` along their side.
 */

export const DEFAULT_PORT_SIZE = 8;

export type FlowPortDirection = 'input' | 'output';

export function defaultSide(
  direction: FlowPortDirection,
  layout: FlowLayoutMode | undefined,
): FlowSide {
  if (layout === 'vertical') return direction === 'input' ? 'top' : 'bottom';
  return direction === 'input' ? 'left' : 'right';
}

/** The side of `rect` that faces `toward`. */
export function fallbackSide(rect: FlowRect, toward: FlowPoint): FlowSide {
  const center = rectCenter(rect);
  return sideOf({ x: toward.x - center.x, y: toward.y - center.y });
}

export function resolveSide(
  port: {
    side?: FlowSide | undefined;
    geometry?: FlowPortGeometry | undefined;
    measured?: boolean | undefined;
  },
  direction: FlowPortDirection,
  layout: FlowLayoutMode | undefined,
): FlowSide {
  if (port.side) return port.side;
  if (port.measured && port.geometry) return port.geometry.side;
  return defaultSide(direction, layout);
}

/** An `8×8` box centered on `side` at `(index + 1) / (count + 1)`, relative to the node. */
export function defaultPortGeometry(
  size: FlowSize,
  side: FlowSide,
  index: number,
  count: number,
  portSize = DEFAULT_PORT_SIZE,
): Omit<FlowPortGeometry, 'id'> {
  const fraction = (index + 1) / (Math.max(count, 1) + 1);
  const half = portSize / 2;
  switch (side) {
    case 'top':
      return { x: size.width * fraction - half, y: -half, width: portSize, height: portSize, side };
    case 'bottom':
      return {
        x: size.width * fraction - half,
        y: size.height - half,
        width: portSize,
        height: portSize,
        side,
      };
    case 'left':
      return {
        x: -half,
        y: size.height * fraction - half,
        width: portSize,
        height: portSize,
        side,
      };
    default:
      return {
        x: size.width - half,
        y: size.height * fraction - half,
        width: portSize,
        height: portSize,
        side,
      };
  }
}

/** The anchor on a box's `side`, in the box's coordinate space. */
export function sideAnchor(box: FlowRect, side: FlowSide): FlowPoint {
  switch (side) {
    case 'top':
      return { x: box.x + box.width / 2, y: box.y };
    case 'right':
      return { x: box.x + box.width, y: box.y + box.height / 2 };
    case 'bottom':
      return { x: box.x + box.width / 2, y: box.y + box.height };
    default:
      return { x: box.x, y: box.y + box.height / 2 };
  }
}

export interface ResolveEndpointParams {
  nodeId: string;
  /** Absolute node rect. */
  rect: FlowRect;
  ports: readonly FlowResolvedPort[];
  portId: string | undefined;
  /** Which port direction this end naturally uses (`source` → `output`, `target` → `input`). */
  direction: FlowPortDirection;
  layout?: FlowLayoutMode | undefined;
  kind?: FlowEdgeKind | undefined;
  /** The other endpoint's point for the facing-side fallback. */
  other?: FlowPoint | undefined;
  /** Accept a port of either direction when the natural one has none (loose connections). */
  loose?: boolean | undefined;
}

/** Picks the port an edge end refers to: by id, else the first visible port of `direction`. */
export function pickPort(
  ports: readonly FlowResolvedPort[],
  portId: string | undefined,
  direction: FlowPortDirection,
  loose = true,
): FlowResolvedPort | undefined {
  if (portId !== undefined) return ports.find((port) => port.id === portId);
  return (
    ports.find((port) => port.direction === direction && !port.hidden) ??
    ports.find((port) => port.direction === direction) ??
    (loose ? (ports.find((port) => !port.hidden) ?? ports[0]) : undefined)
  );
}

export function resolveEndpoint(params: ResolveEndpointParams): FlowEndpoint {
  const { nodeId, rect, direction, layout, kind, other } = params;
  const port = pickPort(params.ports, params.portId, direction, params.loose ?? true);
  const facing = kind !== 'orthogonal' && other ? fallbackSide(rect, other) : undefined;
  if (!port) {
    const side = facing ?? defaultSide(direction, layout);
    return { point: sideAnchor(rect, side), side, nodeId, portId: undefined, rect };
  }
  const declared = port.side ?? (port.measured ? port.geometry.side : undefined);
  if (declared) {
    const box = {
      x: rect.x + port.geometry.x,
      y: rect.y + port.geometry.y,
      width: port.geometry.width,
      height: port.geometry.height,
    };
    return { point: sideAnchor(box, declared), side: declared, nodeId, portId: port.id, rect };
  }
  const side = facing ?? defaultSide(port.direction, layout);
  const geometry =
    side === port.geometry.side
      ? port.geometry
      : defaultPortGeometry(rect, side, port.index, port.count, port.geometry.width);
  const box = {
    x: rect.x + geometry.x,
    y: rect.y + geometry.y,
    width: geometry.width,
    height: geometry.height,
  };
  return { point: sideAnchor(box, side), side, nodeId, portId: port.id, rect };
}
