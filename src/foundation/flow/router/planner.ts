import { DEFAULT_EDGE_KIND, edgeKindOptions, type FlowRouterOptions } from '../defaults.js';
import { orthogonalPath, smoothStepPath, type FlowEdgePath } from '../edges/paths.js';
import { expandRect, hashNumber, hashString, roundCoord } from '../geometry.js';
import { SpatialIndex } from '../spatial-index.js';
import type { FlowEdge, FlowEdgeKind, FlowPoint, FlowRect } from '../types.js';
import { NUDGE_ROUNDS, nudgeAxis, nudgeItems, renderNudged, type NudgeItem } from './nudging.js';
import { ObstacleIndex } from './obstacles.js';
import { OrthogonalRouter, resolveRouterOptions } from './orthogonal-router.js';
import { SegmentIndex } from './segments.js';
import type {
  FlowRoute,
  FlowRouteContext,
  FlowRouteRequest,
  FlowRouter,
  FlowRoutingInvalidation,
  FlowRoutingPlanner,
  FlowRoutingProgress,
  FlowRoutingSource,
  PackedRoutes,
} from './types.js';

/**
 * Incremental routing planner (Widgets §6.3 Routing). It keeps the obstacle index, the raw
 * (pre-nudge) routes with their segment index and the nudged routes the renderer reads. A
 * change event dirties the edges whose route bounds touch the dirty rects plus the incident
 * edges whose request geometry changed; `run(budgetMs)` routes one edge or nudges one axis per
 * step so a frame or a worker message can stop at any point and resume later.
 */
export interface FlowRoutingPlannerOptions extends FlowRouterOptions {
  router?: FlowRouter;
  now?: () => number;
  /** Edge kinds the planner routes (default `['orthogonal']`); `'all'` routes every edge. */
  kinds?: readonly FlowEdgeKind[] | 'all';
}

/** Hash of everything a route depends on besides the obstacles: kind, options, ends, waypoints. */
export function routeGeometryHash(request: Omit<FlowRouteRequest, 'context' | 'edgeId'>): number {
  let hash = hashString(0x811c9dc5, request.kind);
  const { options, source, target } = request;
  hash = hashNumber(hash, options.borderRadius);
  hash = hashNumber(hash, options.stub);
  hash = hashNumber(hash, options.offset);
  hash = hashNumber(hash, options.stepPosition);
  hash = hashString(hash, source.side);
  hash = hashNumber(hash, roundCoord(source.point.x));
  hash = hashNumber(hash, roundCoord(source.point.y));
  hash = hashString(hash, target.side);
  hash = hashNumber(hash, roundCoord(target.point.x));
  hash = hashNumber(hash, roundCoord(target.point.y));
  for (const rect of [source.rect, target.rect]) {
    hash = hashNumber(hash, roundCoord(rect.x));
    hash = hashNumber(hash, roundCoord(rect.y));
    hash = hashNumber(hash, roundCoord(rect.width));
    hash = hashNumber(hash, roundCoord(rect.height));
  }
  for (const point of request.waypoints ?? []) {
    hash = hashNumber(hash, roundCoord(point.x));
    hash = hashNumber(hash, roundCoord(point.y));
  }
  return hash >>> 0;
}

const defaultNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

export function createRoutingPlanner(
  source: FlowRoutingSource,
  options: FlowRoutingPlannerOptions = {},
): FlowRoutingPlanner {
  return new RoutingPlanner(source, options);
}

class RoutingPlanner implements FlowRoutingPlanner {
  readonly obstacles: ObstacleIndex;
  readonly #source: FlowRoutingSource;
  readonly #router: FlowRouter;
  readonly #options: Required<FlowRouterOptions>;
  readonly #kinds: ReadonlySet<FlowEdgeKind> | 'all';
  readonly #now: () => number;
  readonly #segments = new SegmentIndex();
  readonly #routeIndex = new SpatialIndex();
  readonly #raw = new Map<string, FlowRoute>();
  readonly #routes = new Map<string, FlowRoute>();
  readonly #memo = new Map<string, number>();
  readonly #dirty = new Set<string>();
  readonly #listeners = new Set<
    (updatedIds: readonly string[], progress: FlowRoutingProgress) => void
  >();
  readonly #context: FlowRouteContext;
  #order = new Map<string, number>();
  #orderStale = true;
  #priority: ((edgeId: string) => number) | undefined;
  #queue: string[] = [];
  #queueStale = true;
  /** Routes touched since the last nudge; the nudge set grows from their bounds. */
  readonly #touched = new Set<string>();
  #nudge: { items: NudgeItem[]; routes: FlowRoute[]; step: number } | undefined;
  #unsubscribe: (() => void) | undefined;
  #disposed = false;

  constructor(source: FlowRoutingSource, options: FlowRoutingPlannerOptions) {
    this.#source = source;
    this.#options = resolveRouterOptions(options);
    this.#router = options.router ?? new OrthogonalRouter(this.#options);
    this.#kinds = options.kinds === 'all' ? 'all' : new Set(options.kinds ?? ['orthogonal']);
    this.#now = options.now ?? defaultNow;
    this.obstacles = new ObstacleIndex(this.#options.nodePadding);
    this.#context = {
      obstacles: this.obstacles,
      segments: this.#segments,
      edgeSpacing: this.#options.edgeSpacing,
      nodePadding: this.#options.nodePadding,
      order: (edgeId) => this.#orderOf(edgeId),
      fallback: (from, to) => smoothStepPath(from, to, edgeKindOptions('smoothstep')),
      render: (points, borderRadius) => orthogonalPath(points, borderRadius),
    };
    this.#unsubscribe = source.subscribe((event) => this.invalidate(event));
    this.invalidateAll();
  }

  get routes(): ReadonlyMap<string, FlowRoute> {
    return this.#routes;
  }

  get dirty(): ReadonlySet<string> {
    return this.#dirty;
  }

  get pending(): boolean {
    return this.#dirty.size > 0 || this.#nudge !== undefined || this.#touched.size > 0;
  }

  invalidateAll(): void {
    this.obstacles.clear();
    for (const node of this.#source.nodes) this.#syncObstacle(node.id);
    this.#segments.clear();
    this.#routeIndex.clear();
    this.#raw.clear();
    this.#routes.clear();
    this.#memo.clear();
    this.#dirty.clear();
    this.#touched.clear();
    this.#nudge = undefined;
    for (const edge of this.#source.edges) if (this.#routable(edge)) this.#dirty.add(edge.id);
    this.#orderStale = true;
    this.#queueStale = true;
  }

  invalidate(event: FlowRoutingInvalidation): void {
    if (this.#disposed) return;
    const nodes = new Set(event.affectedNodes);
    for (const change of event.changes) {
      if (change.type === 'edge-add' || change.type === 'edge-remove') this.#orderStale = true;
      if (change.type === 'node-add') nodes.add(change.node.id);
      else if (change.type === 'node-remove') nodes.add(change.id);
      if (change.type === 'edge-remove') this.#drop(change.id);
    }
    for (const id of nodes) this.#syncObstacle(id);
    for (const rect of event.dirtyRects)
      for (const edgeId of this.#routeIndex.queryRect(expandRect(rect, this.#options.edgeSpacing)))
        this.#dirty.add(edgeId);
    for (const edgeId of event.affectedEdges) {
      const edge = this.#source.getEdge(edgeId);
      if (!edge || !this.#routable(edge)) {
        this.#drop(edgeId);
        continue;
      }
      const request = this.#request(edge);
      if (!request) {
        this.#drop(edgeId);
        continue;
      }
      if (this.#memo.get(edgeId) !== routeGeometryHash(request)) this.#dirty.add(edgeId);
    }
    for (const edgeId of [...this.#dirty]) {
      const edge = this.#source.getEdge(edgeId);
      if (!edge || !this.#routable(edge)) this.#drop(edgeId);
    }
    this.#queueStale = true;
  }

  run(budgetMs = Infinity): FlowRoutingProgress {
    const start = this.#now();
    const updated = new Set<string>();
    let routed = 0;
    // Steps taken by this call; a call always makes at least one step of progress.
    let steps = 0;
    if (this.#queueStale) this.#rebuildQueue();
    for (;;) {
      const edgeId = this.#queue[this.#queue.length - 1];
      if (edgeId === undefined) break;
      if (steps > 0 && this.#now() - start >= budgetMs) break;
      this.#queue.pop();
      if (!this.#dirty.has(edgeId)) continue;
      this.#dirty.delete(edgeId);
      steps += 1;
      if (this.#routeEdge(edgeId)) {
        routed += 1;
        updated.add(edgeId);
      }
    }
    let done = this.#dirty.size === 0;
    if (done) {
      if (!this.#nudge && this.#touched.size > 0) this.#beginNudge();
      while (this.#nudge) {
        if (steps > 0 && this.#now() - start >= budgetMs) {
          done = false;
          break;
        }
        steps += 1;
        for (const edgeId of this.#nudgeStep()) updated.add(edgeId);
      }
    }
    const progress: FlowRoutingProgress = {
      done: done && !this.#nudge,
      routed,
      remaining: this.#dirty.size,
      elapsed: this.#now() - start,
    };
    if (updated.size > 0 || progress.done)
      for (const listener of [...this.#listeners]) listener([...updated], progress);
    return progress;
  }

  preview(request: Omit<FlowRouteRequest, 'context'>): FlowRoute {
    return this.#router.route({ ...request, context: this.#context });
  }

  setPriority(priority?: (edgeId: string) => number): void {
    this.#priority = priority;
    this.#queueStale = true;
  }

  subscribe(
    listener: (updatedIds: readonly string[], progress: FlowRoutingProgress) => void,
  ): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    this.#disposed = true;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#listeners.clear();
    this.#dirty.clear();
    this.#queue = [];
    this.#nudge = undefined;
  }

  #routable(edge: FlowEdge): boolean {
    if (edge.hidden) return false;
    const kind = edge.kind ?? this.#source.schema?.rules?.defaultEdgeKind ?? DEFAULT_EDGE_KIND;
    return this.#kinds === 'all' || this.#kinds.has(kind);
  }

  #kindOf(edge: FlowEdge): FlowEdgeKind {
    return edge.kind ?? this.#source.schema?.rules?.defaultEdgeKind ?? DEFAULT_EDGE_KIND;
  }

  #request(edge: FlowEdge): Omit<FlowRouteRequest, 'context'> | undefined {
    const sourceNode = this.#source.getNode(edge.source);
    const targetNode = this.#source.getNode(edge.target);
    if (!sourceNode || !targetNode || sourceNode.hidden || targetNode.hidden) return undefined;
    const kind = this.#kindOf(edge);
    const options = edgeKindOptions(kind, this.#source.schema?.edgeKinds?.[kind], edge.options);
    const request: Omit<FlowRouteRequest, 'context'> = {
      edgeId: edge.id,
      kind,
      options,
      source: this.#source.endpoint(edge.source, edge.sourcePort, 'output'),
      target: this.#source.endpoint(edge.target, edge.targetPort, 'input'),
    };
    if (edge.waypoints && edge.waypoints.length > 0) request.waypoints = edge.waypoints;
    return request;
  }

  #syncObstacle(id: string): void {
    const node = this.#source.getNode(id);
    const definition = node ? this.#source.definitionOf(node) : undefined;
    if (!node || node.hidden || definition?.shape === 'group') this.obstacles.remove(id);
    else this.obstacles.set(id, this.#source.nodeRect(id));
    if (node && this.#source.children)
      for (const child of this.#source.children(id)) this.#syncObstacle(child);
  }

  /**
   * A nudge in progress works on copies of the raw routes it started from; once one of them is
   * re-routed or dropped those copies are stale and would publish the old geometry. Its routes
   * join the next nudge instead.
   */
  #abandonNudge(): void {
    if (!this.#nudge) return;
    for (const route of this.#nudge.routes) this.#touched.add(route.edgeId);
    this.#nudge = undefined;
  }

  #drop(edgeId: string): void {
    this.#abandonNudge();
    const previous = this.#raw.get(edgeId);
    if (previous) this.#touched.add(edgeId);
    this.#raw.delete(edgeId);
    this.#routes.delete(edgeId);
    this.#memo.delete(edgeId);
    this.#dirty.delete(edgeId);
    this.#segments.remove(edgeId);
    this.#routeIndex.remove(edgeId);
    if (previous) this.#touchAround(previous.bbox);
  }

  #touchAround(bbox: FlowRect): void {
    const reach = this.#options.edgeSpacing * 8;
    for (const id of this.#routeIndex.queryRect(expandRect(bbox, reach))) this.#touched.add(id);
  }

  #routeEdge(edgeId: string): boolean {
    this.#abandonNudge();
    const edge = this.#source.getEdge(edgeId);
    if (!edge || !this.#routable(edge)) {
      this.#drop(edgeId);
      return false;
    }
    const request = this.#request(edge);
    if (!request) {
      this.#drop(edgeId);
      return false;
    }
    const previous = this.#raw.get(edgeId);
    const route = this.#router.route({ ...request, context: this.#context });
    this.#memo.set(edgeId, routeGeometryHash(request));
    this.#raw.set(edgeId, route);
    this.#routes.set(edgeId, route);
    if (route.fallback) this.#segments.remove(edgeId);
    else this.#segments.set(edgeId, route.points);
    this.#routeIndex.insert(edgeId, route.bbox);
    this.#touched.add(edgeId);
    if (previous) this.#touchAround(previous.bbox);
    this.#touchAround(route.bbox);
    return true;
  }

  #beginNudge(): void {
    const ids = [...this.#touched].filter((id) => this.#raw.has(id)).sort();
    this.#touched.clear();
    if (ids.length === 0) return;
    const routes = ids.map((id) => this.#raw.get(id)!);
    this.#nudge = { items: nudgeItems(routes), routes, step: 0 };
  }

  /** One axis per step; finishes with the render step that publishes moved routes. */
  #nudgeStep(): string[] {
    const state = this.#nudge!;
    const axis = state.step % 2 === 0 ? 'x' : 'y';
    const round = Math.floor(state.step / 2);
    const moved = nudgeAxis(state.items, axis, this.#context);
    state.step += 1;
    const quiet = moved.size === 0 && axis === 'y' && round > 0;
    if (!quiet && round < NUDGE_ROUNDS) return [];
    const everything = new Set(state.items.map((_, index) => index));
    const result = renderNudged(state.routes, state.items, everything, this.#context);
    const updated: string[] = [];
    for (const route of result) {
      const previous = this.#routes.get(route.edgeId);
      if (previous && previous.hash === route.hash) continue;
      this.#routes.set(route.edgeId, route);
      updated.push(route.edgeId);
    }
    this.#nudge = undefined;
    return updated;
  }

  #orderOf(edgeId: string): number {
    if (this.#orderStale) {
      this.#order = new Map(this.#source.edges.map((edge, index) => [edge.id, index]));
      this.#orderStale = false;
    }
    return this.#order.get(edgeId) ?? Number.MAX_SAFE_INTEGER;
  }

  #rebuildQueue(): void {
    const priority = this.#priority;
    const entries = [...this.#dirty].map((id) => ({
      id,
      priority: priority ? priority(id) : 0,
      order: this.#orderOf(id),
    }));
    entries.sort((a, b) => a.priority - b.priority || a.order - b.order || (a.id < b.id ? -1 : 1));
    // Popped from the end: reverse so the first entry routes first.
    this.#queue = entries.map((entry) => entry.id).reverse();
    this.#queueStale = false;
  }
}

const FLAG_FALLBACK = 1;
const FLAG_SELF_LOOP = 2;

/** Packs routes into typed arrays; transfer `coords.buffer` and friends across a worker. */
export function packRoutes(routes: Iterable<FlowRoute>): PackedRoutes {
  const list = [...routes];
  const ids: string[] = [];
  const kinds: FlowEdgeKind[] = [];
  const offsets = new Uint32Array(list.length + 1);
  const flags = new Uint8Array(list.length);
  const hashes = new Uint32Array(list.length);
  const radii = new Float32Array(list.length);
  const stubs = new Float32Array(list.length);
  let total = 0;
  for (const route of list) total += route.points.length;
  const coords = new Float64Array(total * 2);
  let cursor = 0;
  list.forEach((route, index) => {
    ids.push(route.edgeId);
    kinds.push(route.kind);
    offsets[index] = cursor;
    for (const point of route.points) {
      coords[cursor * 2] = point.x;
      coords[cursor * 2 + 1] = point.y;
      cursor += 1;
    }
    flags[index] = (route.fallback ? FLAG_FALLBACK : 0) | (route.selfLoop ? FLAG_SELF_LOOP : 0);
    hashes[index] = route.hash;
    radii[index] = route.borderRadius;
    stubs[index] = route.stub;
  });
  offsets[list.length] = cursor;
  return { ids, kinds, offsets, coords, flags, hashes, radii, stubs };
}

/** Rebuilds routes from a pack with the given polyline renderer (`orthogonalPath` by default). */
export function unpackRoutes(
  packed: PackedRoutes,
  render: (kind: FlowEdgeKind, points: FlowPoint[], borderRadius: number) => FlowEdgePath = (
    _kind,
    points,
    borderRadius,
  ) => orthogonalPath(points, borderRadius),
): Map<string, FlowRoute> {
  const routes = new Map<string, FlowRoute>();
  packed.ids.forEach((edgeId, index) => {
    const from = packed.offsets[index]!;
    const to = packed.offsets[index + 1]!;
    const points: FlowPoint[] = [];
    for (let at = from; at < to; at += 1)
      points.push({ x: packed.coords[at * 2]!, y: packed.coords[at * 2 + 1]! });
    const kind = packed.kinds[index]!;
    const borderRadius = packed.radii[index]!;
    const path = render(kind, points, borderRadius);
    routes.set(edgeId, {
      ...path,
      kind,
      edgeId,
      fallback: (packed.flags[index]! & FLAG_FALLBACK) !== 0,
      selfLoop: (packed.flags[index]! & FLAG_SELF_LOOP) !== 0,
      borderRadius,
      stub: packed.stubs[index]!,
      hash: packed.hashes[index]!,
    });
  });
  return routes;
}

/** The buffers of a pack, for `postMessage` transfer lists. */
export function packedRouteBuffers(packed: PackedRoutes): ArrayBuffer[] {
  return [
    packed.offsets.buffer,
    packed.coords.buffer,
    packed.flags.buffer,
    packed.hashes.buffer,
    packed.radii.buffer,
    packed.stubs.buffer,
  ] as ArrayBuffer[];
}
