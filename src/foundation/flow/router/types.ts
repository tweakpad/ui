import type { FlowEdgePath, FlowPathEndpoint } from '../edges/paths.js';
import type {
  FlowChange,
  FlowEdge,
  FlowEdgeKind,
  FlowEdgeKindOptions,
  FlowEndpoint,
  FlowNode,
  FlowNodeDefinition,
  FlowPoint,
  FlowRect,
  FlowSchema,
} from '../types.js';
import type { ObstacleIndex } from './obstacles.js';
import type { SegmentIndex } from './segments.js';

/**
 * Router contract (Widgets §6.3 Routing). A route request carries resolved endpoints and the
 * routing context: the obstacle index, the segment index of already routed edges, spacing and
 * the two injected path builders. The builders keep the router free of the edge-path module so
 * routers and their tests run with any polyline renderer.
 */
export interface FlowRouteContext {
  /** Padded node rects; groups are never obstacles. */
  obstacles: ObstacleIndex;
  /** Segments of already routed edges, for crossing and overlap costs. */
  segments: SegmentIndex | undefined;
  /** Gap between parallel segments after nudging. */
  edgeSpacing: number;
  /** Clearance the obstacles were padded with. */
  nodePadding: number;
  /** Document order of an edge; ties in nudging and routing fall back to it. */
  order(edgeId: string): number;
  /** Builds the smoothstep fallback when no orthogonal route exists. */
  fallback(source: FlowPathEndpoint, target: FlowPathEndpoint): FlowEdgePath;
  /** Renders an orthogonal polyline with rounded corners. */
  render(points: FlowPoint[], borderRadius: number): FlowEdgePath;
}

export interface FlowRouteRequest {
  edgeId: string;
  kind: FlowEdgeKind;
  options: Required<FlowEdgeKindOptions>;
  source: FlowEndpoint;
  target: FlowEndpoint;
  /** Absolute must-pass points, in order. */
  waypoints?: readonly FlowPoint[] | undefined;
  context: FlowRouteContext;
}

export interface FlowRoute extends FlowEdgePath {
  edgeId: string;
  /** The orthogonal search failed and the smoothstep fallback was used. */
  fallback: boolean;
  selfLoop: boolean;
  /** Corner radius the points were rendered with; nudging and unpacking re-render with it. */
  borderRadius: number;
  /** Fixed stub length at each port (0 for free endpoints); nudging never moves the stubs. */
  stub: number;
  /** Hash of the kind, flags and rounded points; equal routes hash equally. */
  hash: number;
}

export interface FlowRouter {
  route(request: FlowRouteRequest): FlowRoute;
  /** Spreads colinear overlapping segments; routes that did not move keep their identity. */
  nudge?(routes: readonly FlowRoute[], context: FlowRouteContext): FlowRoute[];
}

/** The change event the planner consumes (the model's `FlowChangeEvent` is a superset). */
export interface FlowRoutingInvalidation {
  changes: readonly FlowChange[];
  affectedNodes: ReadonlySet<string>;
  affectedEdges: ReadonlySet<string>;
  /** Old ∪ new padded rects of every moved, resized or removed node. */
  dirtyRects: readonly FlowRect[];
}

/** The model surface the planner reads; `FlowModel` satisfies it structurally. */
export interface FlowRoutingSource {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly schema: FlowSchema | undefined;
  getEdge(id: string): FlowEdge | undefined;
  getNode(id: string): FlowNode | undefined;
  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined;
  /** Absolute rect: measured ?? size ?? definition size ?? shape default. */
  nodeRect(id: string): FlowRect;
  endpoint(nodeId: string, portId: string | undefined, direction: 'input' | 'output'): FlowEndpoint;
  subscribe(listener: (event: FlowRoutingInvalidation) => void): () => void;
  children?(id: string): readonly string[];
}

export interface FlowRoutingProgress {
  done: boolean;
  /** Edges routed by this call. */
  routed: number;
  /** Dirty edges still waiting. */
  remaining: number;
  /** Milliseconds spent by this call. */
  elapsed: number;
}

export interface FlowRoutingPlanner {
  /** Current routes by edge id (nudged); only routable kinds appear. */
  readonly routes: ReadonlyMap<string, FlowRoute>;
  readonly dirty: ReadonlySet<string>;
  /** Dirty edges or an unfinished nudge remain: keep calling `run` until this is false. */
  readonly pending: boolean;
  readonly obstacles: ObstacleIndex;
  invalidate(event: FlowRoutingInvalidation): void;
  invalidateAll(): void;
  /** Routes dirty edges and nudges until the budget is spent; resumable. */
  run(budgetMs?: number): FlowRoutingProgress;
  /** Routes a transient request (the connection line) against the current context. */
  preview(request: Omit<FlowRouteRequest, 'context'>): FlowRoute;
  /** Lower values route first; the default is document order. */
  setPriority(priority?: (edgeId: string) => number): void;
  subscribe(
    listener: (updatedIds: readonly string[], progress: FlowRoutingProgress) => void,
  ): () => void;
  dispose(): void;
}

/** Routes packed into typed arrays for `postMessage` transfer. */
export interface PackedRoutes {
  ids: string[];
  kinds: FlowEdgeKind[];
  /** `offsets[i]..offsets[i + 1]` index `coords` in point pairs. */
  offsets: Uint32Array;
  coords: Float64Array;
  /** Bit 0 fallback, bit 1 self-loop. */
  flags: Uint8Array;
  hashes: Uint32Array;
  radii: Float32Array;
  stubs: Float32Array;
}
