import type { FlowMarker, FlowMarkerDefinition, FlowMarkerType, FlowPoint } from '../types.js';

/**
 * Marker definitions: stable ids per flow, normalized specs for a renderer's `<defs>`, and the
 * geometry of each symbol inside a `-10 -10 20 20` view box with the tip at the origin.
 */
export const DEFAULT_MARKER_SIZE = 12.5;

export interface FlowMarkerSpec extends Required<Omit<FlowMarkerDefinition, 'color'>> {
  id: string;
  color: string | undefined;
}

export interface FlowMarkerCollectOptions {
  /** Flow id used to namespace marker ids across instances. */
  prefix?: string;
  defaultColor?: string;
  defaultMarkerStart?: FlowMarker;
  defaultMarkerEnd?: FlowMarker;
}

export type FlowMarkerShape =
  | { kind: 'polyline'; points: FlowPoint[]; closed: boolean; filled: boolean }
  | { kind: 'circle'; center: FlowPoint; radius: number; filled: boolean };

export interface FlowMarkerGeometry {
  viewBox: readonly [number, number, number, number];
  refX: number;
  refY: number;
  shape: FlowMarkerShape;
  /** SVG path data for the shape. */
  d: string;
}

export function normalizeMarker(
  marker: FlowMarker,
  defaults: Partial<FlowMarkerDefinition> = {},
): FlowMarkerDefinition {
  const definition: FlowMarkerDefinition = typeof marker === 'string' ? { type: marker } : marker;
  const result: FlowMarkerDefinition = {
    type: definition.type,
    width: definition.width ?? defaults.width ?? DEFAULT_MARKER_SIZE,
    height: definition.height ?? defaults.height ?? DEFAULT_MARKER_SIZE,
    strokeWidth: definition.strokeWidth ?? defaults.strokeWidth ?? 1,
    orient: definition.orient ?? defaults.orient ?? 'auto-start-reverse',
    units: definition.units ?? defaults.units ?? 'strokeWidth',
  };
  const color = definition.color ?? defaults.color;
  if (color !== undefined) result.color = color;
  return result;
}

/** Deterministic id for a marker: the type for string markers, sorted `key=value` pairs otherwise. */
export function markerId(marker: FlowMarker | undefined, prefix?: string): string {
  if (!marker) return '';
  const idPrefix = prefix ? `${prefix}__` : '';
  if (typeof marker === 'string') return `${idPrefix}${marker}`;
  const keys = Object.keys(marker).sort() as Array<keyof FlowMarkerDefinition>;
  return `${idPrefix}${keys
    .filter((key) => marker[key] !== undefined)
    .map((key) => `${key}=${String(marker[key])}`)
    .join('&')}`;
}

/** The unique markers `edges` reference (string and object forms), sorted by id. */
export function collectMarkers(
  edges: Iterable<{ markerStart?: FlowMarker | undefined; markerEnd?: FlowMarker | undefined }>,
  options: FlowMarkerCollectOptions = {},
): FlowMarkerSpec[] {
  const seen = new Set<string>();
  const specs: FlowMarkerSpec[] = [];
  for (const edge of edges) {
    for (const marker of [
      edge.markerStart ?? options.defaultMarkerStart,
      edge.markerEnd ?? options.defaultMarkerEnd,
    ]) {
      if (!marker) continue;
      const id = markerId(marker, options.prefix);
      if (seen.has(id)) continue;
      seen.add(id);
      const normalized = normalizeMarker(marker);
      specs.push({
        id,
        type: normalized.type,
        width: normalized.width!,
        height: normalized.height!,
        strokeWidth: normalized.strokeWidth!,
        orient: normalized.orient!,
        units: normalized.units!,
        color: normalized.color ?? options.defaultColor,
      });
    }
  }
  return specs.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

function polylineData(points: readonly FlowPoint[], closed: boolean): string {
  const d = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`)
    .join(' ');
  return closed ? `${d} Z` : d;
}

export function markerGeometry(
  marker: FlowMarkerType | FlowMarkerSpec | FlowMarkerDefinition,
): FlowMarkerGeometry {
  const type = typeof marker === 'string' ? marker : marker.type;
  const viewBox = [-10, -10, 20, 20] as const;
  switch (type) {
    case 'arrowclosed': {
      const points = [
        { x: -5, y: -4 },
        { x: 0, y: 0 },
        { x: -5, y: 4 },
      ];
      return {
        viewBox,
        refX: 0,
        refY: 0,
        shape: { kind: 'polyline', points, closed: true, filled: true },
        d: polylineData(points, true),
      };
    }
    case 'circle':
      return {
        viewBox,
        refX: 0,
        refY: 0,
        shape: { kind: 'circle', center: { x: 0, y: 0 }, radius: 4, filled: true },
        d: 'M-4,0 A4,4 0 1,0 4,0 A4,4 0 1,0 -4,0 Z',
      };
    case 'diamond': {
      const points = [
        { x: -5, y: 0 },
        { x: 0, y: -5 },
        { x: 5, y: 0 },
        { x: 0, y: 5 },
      ];
      return {
        viewBox,
        refX: 0,
        refY: 0,
        shape: { kind: 'polyline', points, closed: true, filled: true },
        d: polylineData(points, true),
      };
    }
    default: {
      const points = [
        { x: -5, y: -4 },
        { x: 0, y: 0 },
        { x: -5, y: 4 },
      ];
      return {
        viewBox,
        refX: 0,
        refY: 0,
        shape: { kind: 'polyline', points, closed: false, filled: false },
        d: polylineData(points, false),
      };
    }
  }
}

/** Largest marker extent in flow units, for bbox padding. */
export function markerPadding(
  edge: { markerStart?: FlowMarker | undefined; markerEnd?: FlowMarker | undefined },
  strokeWidth = 1,
): number {
  let padding = 0;
  for (const marker of [edge.markerStart, edge.markerEnd]) {
    if (!marker) continue;
    const spec = normalizeMarker(marker);
    const scale = spec.units === 'strokeWidth' ? strokeWidth : 1;
    padding = Math.max(padding, Math.max(spec.width!, spec.height!) * scale);
  }
  return padding;
}
