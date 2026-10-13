import type {
  FlowEdgeKind,
  FlowEdgeKindOptions,
  FlowLayoutSettings,
  FlowNodeDefinition,
  FlowNodeShape,
  FlowPropertyDefinition,
  FlowPropertyPlacement,
  FlowSize,
} from './types.js';

export const FLOW_DOCUMENT_VERSION = 1 as const;

/** Size hints per shape, used until a node is measured (Widgets §6.3 Anatomy). */
export const DEFAULT_NODE_SIZE_BY_SHAPE: Readonly<Record<FlowNodeShape, FlowSize>> = {
  card: { width: 240, height: 96 },
  compact: { width: 96, height: 68 },
  panel: { width: 220, height: 160 },
  group: { width: 320, height: 240 },
};

/** Where a property renders when its definition names no `placement` (Widgets §6.3 Schema). */
export const DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE: Readonly<
  Record<FlowNodeShape, FlowPropertyPlacement>
> = {
  card: 'node',
  panel: 'node',
  compact: 'inspector',
  group: 'inspector',
};

/** The surface that renders a property's control: the node body or the inspector. */
export function propertyPlacement(
  definition: FlowNodeDefinition | undefined,
  property: FlowPropertyDefinition,
): FlowPropertyPlacement {
  return property.placement ?? DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE[definition?.shape ?? 'card'];
}

/** The properties a definition places in the inspector; empty means no inspector. */
export function inspectorProperties(
  definition: FlowNodeDefinition | undefined,
): FlowPropertyDefinition[] {
  return (definition?.properties ?? []).filter(
    (property) => propertyPlacement(definition, property) === 'inspector',
  );
}

export const DEFAULT_EDGE_KIND: FlowEdgeKind = 'smoothstep';

export const DEFAULT_EDGE_KIND_OPTIONS: Readonly<
  Record<FlowEdgeKind, Required<FlowEdgeKindOptions>>
> = {
  bezier: { curvature: 0.25, borderRadius: 0, offset: 0, stepPosition: 0.5, stub: 0 },
  straight: { curvature: 0, borderRadius: 0, offset: 0, stepPosition: 0.5, stub: 0 },
  step: { curvature: 0, borderRadius: 0, offset: 20, stepPosition: 0.5, stub: 0 },
  smoothstep: { curvature: 0, borderRadius: 5, offset: 20, stepPosition: 0.5, stub: 0 },
  orthogonal: { curvature: 0, borderRadius: 8, offset: 0, stepPosition: 0.5, stub: 24 },
};

export interface FlowRouterOptions {
  /** Clearance kept around every node (default 12). */
  nodePadding?: number;
  /** Gap between parallel edge segments after nudging (default 12). */
  edgeSpacing?: number;
  bendPenalty?: number;
  crossingPenalty?: number;
  overlapPenalty?: number;
  hugPenalty?: number;
  /** Minimum straight stub out of a port; effective `max(stub, nodePadding)` (default 24). */
  stub?: number;
  /** Initial search region margin around the endpoints (default 96). */
  regionMargin?: number;
  /** Times the region may double before the smoothstep fallback (default 3). */
  maxRegionGrowth?: number;
  /** Grid size cap per routed leg (default 40000). */
  maxGridVertices?: number;
}

export const DEFAULT_ROUTER_OPTIONS: Readonly<Required<FlowRouterOptions>> = {
  nodePadding: 12,
  edgeSpacing: 12,
  bendPenalty: 30,
  crossingPenalty: 10,
  overlapPenalty: 20,
  hugPenalty: 4,
  stub: 24,
  regionMargin: 96,
  maxRegionGrowth: 3,
  maxGridVertices: 40000,
};

export const DEFAULT_LAYOUT_OPTIONS: Readonly<
  Required<Omit<FlowLayoutSettings, 'direction'>> & { groupPadding: number; iterations: number }
> = {
  nodeSpacing: 40,
  rankSpacing: 80,
  componentSpacing: 60,
  pack: 'grid',
  groupPadding: 16,
  iterations: 8,
};

export const DEFAULT_ZOOM_LIMITS = { minZoom: 0.1, maxZoom: 4 } as const;

export function edgeKindOptions(
  kind: FlowEdgeKind,
  ...overrides: ReadonlyArray<FlowEdgeKindOptions | undefined>
): Required<FlowEdgeKindOptions> {
  const result = { ...DEFAULT_EDGE_KIND_OPTIONS[kind] };
  for (const override of overrides) {
    if (!override) continue;
    for (const key of Object.keys(override) as Array<keyof FlowEdgeKindOptions>) {
      const value = override[key];
      if (value !== undefined) result[key] = value;
    }
  }
  return result;
}
