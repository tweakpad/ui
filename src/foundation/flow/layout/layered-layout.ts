import { unionRects } from '../geometry.js';
import type {
  FlowChange,
  FlowLayoutDirection,
  FlowNode,
  FlowPoint,
  FlowRect,
  FlowSize,
} from '../types.js';
import { packComponents, splitComponents } from './components.js';
import { assignCoordinates } from './coordinates.js';
import { removeCycles } from './cycles.js';
import { resolveDirection, mapToFlowCoordinates, type DirectionEstimate } from './direction.js';
import { insertDummies } from './dummies.js';
import { buildLayoutGraph, subgraph, type LayoutGraph } from './graph.js';
import { layoutGroupTree, type LevelResult } from './groups.js';
import { assignLayers } from './layering.js';
import { minimizeCrossings } from './ordering.js';
import { partitionPinned, placeAroundPinned } from './pinned.js';
import {
  resolveLayoutOptions,
  type FlowLayoutEdge,
  type FlowLayoutEngine,
  type FlowLayoutNode,
  type FlowLayoutOptions,
  type FlowLayoutRequest,
  type FlowLayoutRequestDirection,
  type FlowLayoutResult,
  type FlowLayoutSource,
  type ResolvedLayoutOptions,
} from './types.js';

const THRESHOLD = 0.5;

const defaultNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

/**
 * Layered (Sugiyama) layout engine (Widgets §6.3 Layout): groups bottom-up, pinned nodes kept
 * and flowed around, per component cycle removal → longest-path layering with promotion →
 * dummy chains → median ordering with transpose → Brandes–Köpf coordinates → rank spacing →
 * direction mapping → component packing → origin preservation. Deterministic for equal input.
 */
export class LayeredLayoutEngine implements FlowLayoutEngine {
  readonly #now: () => number;

  constructor(options: { now?: () => number } = {}) {
    this.#now = options.now ?? defaultNow;
  }

  layout(request: FlowLayoutRequest): FlowLayoutResult {
    const start = this.#now();
    const options = resolveLayoutOptions(request.options);
    const topLevel = topLevelEstimate(request, options);
    const direction = resolveDirection(request, topLevel.estimate, options.viewportAspect);
    const effective: ResolvedLayoutOptions =
      request.direction === 'smart' && topLevel.components > 1
        ? { ...options, pack: 'grid' }
        : options;
    const tree = layoutGroupTree(request.nodes, request.edges, direction, effective, layoutLevel);
    const byId = new Map(request.nodes.map((node) => [node.id, node]));
    const included = (id: string | undefined): id is string => id !== undefined && byId.has(id);
    const changes: FlowChange[] = [];
    const rects: FlowRect[] = [];
    for (const node of request.nodes) {
      const absolute = tree.positions.get(node.id);
      if (!absolute) continue;
      const size = tree.sizes.get(node.id) ?? node.size;
      rects.push({ ...absolute, ...size });
      const parent = included(node.parentId) ? byId.get(node.parentId)! : undefined;
      const newParent = parent ? tree.positions.get(parent.id)! : (node.offset ?? { x: 0, y: 0 });
      const oldParent = parent
        ? (parent.position ?? { x: 0, y: 0 })
        : (node.offset ?? { x: 0, y: 0 });
      const position = { x: absolute.x - newParent.x, y: absolute.y - newParent.y };
      const previous = node.position
        ? { x: node.position.x - oldParent.x, y: node.position.y - oldParent.y }
        : undefined;
      if (
        !previous ||
        Math.abs(previous.x - position.x) > THRESHOLD ||
        Math.abs(previous.y - position.y) > THRESHOLD
      )
        changes.push({ type: 'node-position', id: node.id, position });
      const derived = tree.sizes.get(node.id);
      if (
        node.group &&
        derived &&
        (Math.abs(derived.width - node.size.width) > THRESHOLD ||
          Math.abs(derived.height - node.size.height) > THRESHOLD)
      )
        changes.push({ type: 'node-size', id: node.id, size: derived });
    }
    const result: FlowLayoutResult = {
      direction,
      positions: tree.positions,
      sizes: tree.sizes,
      changes,
      bounds: unionRects(rects),
      stats: { ...tree.stats, elapsed: this.#now() - start },
    };
    if (effective.bendPoints) result.bendPoints = tree.bendPoints;
    return result;
  }
}

/** Rank/cross extents of the top level for the `smart` rule, plus its component count. */
function topLevelEstimate(
  request: FlowLayoutRequest,
  options: ResolvedLayoutOptions,
): { estimate: DirectionEstimate | undefined; components: number } {
  const byId = new Map(request.nodes.map((node) => [node.id, node]));
  const top = request.nodes.filter(
    (node) => !node.pinned && (node.parentId === undefined || !byId.has(node.parentId)),
  );
  if (top.length === 0) return { estimate: undefined, components: 0 };
  const graph = buildLayoutGraph(top, request.edges);
  const components = splitComponents(graph).length;
  removeCycles(graph);
  const layering = assignLayers(graph);
  const widthByLayer = new Float64Array(layering.count);
  const heightByLayer = new Float64Array(layering.count);
  const widthSum = new Float64Array(layering.count);
  const heightSum = new Float64Array(layering.count);
  const members = new Int32Array(layering.count);
  for (let node = 0; node < graph.count; node += 1) {
    const layer = layering.layer[node]!;
    widthByLayer[layer] = Math.max(widthByLayer[layer]!, graph.width[node]!);
    heightByLayer[layer] = Math.max(heightByLayer[layer]!, graph.height[node]!);
    widthSum[layer] = widthSum[layer]! + graph.width[node]!;
    heightSum[layer] = heightSum[layer]! + graph.height[node]!;
    members[layer] = members[layer]! + 1;
  }
  let mainW = 0;
  let mainH = 0;
  let crossW = 0;
  let crossH = 0;
  for (let layer = 0; layer < layering.count; layer += 1) {
    mainW += widthByLayer[layer]! + (layer > 0 ? options.rankSpacing : 0);
    mainH += heightByLayer[layer]! + (layer > 0 ? options.rankSpacing : 0);
    const gaps = Math.max(0, members[layer]! - 1) * options.nodeSpacing;
    crossH = Math.max(crossH, heightSum[layer]! + gaps);
    crossW = Math.max(crossW, widthSum[layer]! + gaps);
  }
  return {
    estimate: {
      horizontal: { width: mainW, height: crossH },
      vertical: { width: crossW, height: mainH },
    },
    components,
  };
}

/** One level (siblings of a group or the top level): pinned kept, free nodes laid out. */
export function layoutLevel(
  nodes: FlowLayoutNode[],
  edges: FlowLayoutEdge[],
  direction: FlowLayoutDirection,
  options: ResolvedLayoutOptions,
  origin: FlowPoint | undefined,
): LevelResult {
  const positions = new Map<string, FlowPoint>();
  const bendPoints = new Map<string, FlowPoint[]>();
  const stats = { layers: 0, dummies: 0, crossings: 0, components: 0 };
  const { pinned, free } = partitionPinned(nodes);
  for (const node of pinned) positions.set(node.id, node.position ?? { x: 0, y: 0 });
  if (free.length === 0) return { positions, bendPoints, stats };
  const graph = buildLayoutGraph(free, edges);
  const components = splitComponents(graph);
  stats.components = components.length;
  const boxes: FlowRect[] = [];
  const local: Array<Map<string, FlowPoint>> = [];
  const localBends: Array<Map<string, FlowPoint[]>> = [];
  const previousMin: Array<FlowPoint | undefined> = [];
  for (const members of components) {
    const component = layoutComponent(subgraph(graph, members), direction, options);
    stats.layers = Math.max(stats.layers, component.layers);
    stats.dummies += component.dummies;
    stats.crossings += component.crossings;
    boxes.push(component.box);
    local.push(component.positions);
    localBends.push(component.bendPoints);
    let min: FlowPoint | undefined;
    for (const index of members) {
      const position = free[index]!.position;
      if (!position) continue;
      min = min
        ? { x: Math.min(min.x, position.x), y: Math.min(min.y, position.y) }
        : { ...position };
    }
    previousMin.push(min);
  }
  const pinnedRects = pinned.map((node) => ({
    ...(node.position ?? { x: 0, y: 0 }),
    ...node.size,
  }));
  if (options.pack === 'none' && components.length > 1) {
    components.forEach((_, index) => {
      const anchor = origin ?? previousMin[index] ?? { x: 0, y: 0 };
      const box = boxes[index]!;
      const shift = placeAroundPinned(
        box,
        anchor,
        pinnedRects,
        direction,
        options.componentSpacing,
      );
      for (const [id, position] of local[index]!)
        positions.set(id, { x: position.x + shift.x, y: position.y + shift.y });
      for (const [id, points] of localBends[index]!)
        bendPoints.set(
          id,
          points.map((point) => ({ x: point.x + shift.x, y: point.y + shift.y })),
        );
    });
    return { positions, bendPoints, stats };
  }
  const offsets = packComponents(boxes, {
    mode: options.pack,
    spacing: options.componentSpacing,
    direction,
    aspect: options.viewportAspect,
  });
  const block = unionRects(
    boxes.map((box, index) => ({ ...box, x: offsets[index]!.x, y: offsets[index]!.y })),
  );
  let anchor = origin;
  if (!anchor) {
    for (const min of previousMin) {
      if (!min) continue;
      anchor = anchor ? { x: Math.min(anchor.x, min.x), y: Math.min(anchor.y, min.y) } : { ...min };
    }
  }
  const shift = placeAroundPinned(
    block,
    anchor ?? { x: 0, y: 0 },
    pinnedRects,
    direction,
    options.componentSpacing,
  );
  components.forEach((_, index) => {
    const offset = offsets[index]!;
    const dx = offset.x + shift.x - block.x;
    const dy = offset.y + shift.y - block.y;
    for (const [id, position] of local[index]!)
      positions.set(id, { x: position.x + dx, y: position.y + dy });
    for (const [id, points] of localBends[index]!)
      bendPoints.set(
        id,
        points.map((point) => ({ x: point.x + dx, y: point.y + dy })),
      );
  });
  return { positions, bendPoints, stats };
}

interface ComponentLayout {
  positions: Map<string, FlowPoint>;
  bendPoints: Map<string, FlowPoint[]>;
  box: FlowRect;
  layers: number;
  dummies: number;
  crossings: number;
}

/** The layered pipeline over one connected component; output normalized to the origin. */
function layoutComponent(
  graph: LayoutGraph,
  direction: FlowLayoutDirection,
  options: ResolvedLayoutOptions,
): ComponentLayout {
  removeCycles(graph);
  const layering = assignLayers(graph);
  const layered = insertDummies(graph, layering, options.maxDummies);
  const ordering = minimizeCrossings(layered, {
    iterations: options.iterations,
    transpose: options.transpose,
  });
  const horizontal = direction === 'horizontal';
  const crossExtent = (node: number): number =>
    horizontal ? layered.height[node]! : layered.width[node]!;
  const mainExtent = (node: number): number =>
    horizontal ? layered.width[node]! : layered.height[node]!;
  const cross = assignCoordinates(layered, ordering, {
    extent: crossExtent,
    spacing: options.nodeSpacing,
    align: options.align,
  });
  const layerSize = new Float64Array(layering.count);
  for (let node = 0; node < layered.realCount; node += 1) {
    const layer = layered.layer[node]!;
    layerSize[layer] = Math.max(layerSize[layer]!, mainExtent(node));
  }
  const layerStart = new Float64Array(layering.count);
  for (let layer = 1; layer < layering.count; layer += 1)
    layerStart[layer] = layerStart[layer - 1]! + layerSize[layer - 1]! + options.rankSpacing;
  const rects: FlowRect[] = [];
  const positions = new Map<string, FlowPoint>();
  for (let node = 0; node < layered.realCount; node += 1) {
    const layer = layered.layer[node]!;
    const main = layerStart[layer]! + (layerSize[layer]! - mainExtent(node)) / 2;
    const crossStart = cross[node]! - crossExtent(node) / 2;
    const point = mapToFlowCoordinates(main, crossStart, direction);
    positions.set(graph.ids[node]!, point);
    rects.push({ ...point, width: graph.width[node]!, height: graph.height[node]! });
  }
  const bendPoints = new Map<string, FlowPoint[]>();
  for (const [edgeIndex, chain] of layered.chains) {
    const edge = graph.edges[edgeIndex]!;
    const points = chain.map((dummy) => {
      const layer = layered.layer[dummy]!;
      return mapToFlowCoordinates(
        layerStart[layer]! + layerSize[layer]! / 2,
        cross[dummy]!,
        direction,
      );
    });
    if (edge.reversed) points.reverse();
    for (const id of edge.ids)
      bendPoints.set(
        id,
        points.map((point) => ({ ...point })),
      );
  }
  const bounds = unionRects(rects);
  for (const [id, point] of positions)
    positions.set(id, { x: point.x - bounds.x, y: point.y - bounds.y });
  for (const [id, points] of bendPoints)
    bendPoints.set(
      id,
      points.map((point) => ({ x: point.x - bounds.x, y: point.y - bounds.y })),
    );
  return {
    positions,
    bendPoints,
    box: { x: 0, y: 0, width: bounds.width, height: bounds.height },
    layers: layering.count,
    dummies: layered.dummies,
    crossings: ordering.crossings,
  };
}

/** Builds a layout request from a model-like source (all visible nodes, or the given ids). */
export function flowLayoutRequest(
  source: FlowLayoutSource,
  direction: FlowLayoutRequestDirection,
  options?: FlowLayoutOptions,
  ids?: Iterable<string>,
): FlowLayoutRequest {
  const selected = ids ? new Set(ids) : undefined;
  const included = (node: FlowNode | undefined): node is FlowNode =>
    node !== undefined && !node.hidden && (selected === undefined || selected.has(node.id));
  const nodes: FlowLayoutNode[] = [];
  for (const node of source.nodes) {
    if (!included(node)) continue;
    const rect = source.nodeRect(node.id);
    const size: FlowSize = { width: rect.width, height: rect.height };
    const parentIncluded = node.parentId !== undefined && included(source.getNode(node.parentId));
    const entry: FlowLayoutNode = {
      id: node.id,
      size,
      position: source.absolutePosition(node.id),
      ports: source.ports(node.id).map((port) => ({
        id: port.id,
        direction: port.direction,
        index: port.index,
        side: port.side,
      })),
    };
    if (parentIncluded) entry.parentId = node.parentId;
    else if (node.parentId !== undefined) entry.offset = source.absolutePosition(node.parentId);
    if (node.pinned) entry.pinned = true;
    if (source.definitionOf(node)?.shape === 'group') entry.group = true;
    nodes.push(entry);
  }
  const present = new Set(nodes.map((node) => node.id));
  const edges: FlowLayoutEdge[] = [];
  for (const edge of source.edges) {
    if (edge.hidden || !present.has(edge.source) || !present.has(edge.target)) continue;
    edges.push({
      id: edge.id,
      source: edge.source,
      sourcePort: edge.sourcePort,
      target: edge.target,
      targetPort: edge.targetPort,
    });
  }
  const request: FlowLayoutRequest = { nodes, edges, direction };
  if (options) request.options = options;
  return request;
}

export interface LayoutFlowOptions extends FlowLayoutOptions {
  engine?: FlowLayoutEngine | undefined;
  /** Restrict the layout to these nodes. */
  ids?: Iterable<string> | undefined;
}

/** Convenience: builds the request from the source and runs the engine. */
export function layoutFlow(
  source: FlowLayoutSource,
  direction: FlowLayoutRequestDirection,
  options: LayoutFlowOptions = {},
): FlowLayoutResult {
  const { engine, ids, ...layoutOptions } = options;
  const request = flowLayoutRequest(source, direction, layoutOptions, ids);
  return (engine ?? new LayeredLayoutEngine()).layout(request);
}
