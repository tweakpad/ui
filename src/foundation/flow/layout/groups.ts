import type { FlowLayoutDirection, FlowPoint, FlowSize } from '../types.js';
import type {
  FlowLayoutEdge,
  FlowLayoutNode,
  FlowLayoutStats,
  ResolvedLayoutOptions,
} from './types.js';

/** What a level layout returns: positions in the level's own space plus the bend points. */
export interface LevelResult {
  positions: Map<string, FlowPoint>;
  bendPoints: Map<string, FlowPoint[]>;
  stats: Omit<FlowLayoutStats, 'elapsed'>;
}

export type LevelLayout = (
  nodes: FlowLayoutNode[],
  edges: FlowLayoutEdge[],
  direction: FlowLayoutDirection,
  options: ResolvedLayoutOptions,
  origin: FlowPoint | undefined,
) => LevelResult;

export interface GroupTreeResult {
  positions: Map<string, FlowPoint>;
  sizes: Map<string, FlowSize>;
  bendPoints: Map<string, FlowPoint[]>;
  stats: Omit<FlowLayoutStats, 'elapsed'>;
}

/**
 * Lays out the group tree bottom-up. Each group's children form a level in the group's own
 * coordinate space (origin at the group's content box); edges crossing a group boundary are
 * lifted to the group node at the parent level. Group sizes come from their children's bounds
 * plus padding; positions are composed top-down at the end.
 */
export function layoutGroupTree(
  nodes: readonly FlowLayoutNode[],
  edges: readonly FlowLayoutEdge[],
  direction: FlowLayoutDirection,
  options: ResolvedLayoutOptions,
  layoutLevel: LevelLayout,
): GroupTreeResult {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const children = new Map<string | undefined, FlowLayoutNode[]>();
  for (const node of nodes) {
    const parent =
      node.parentId !== undefined && byId.has(node.parentId) ? node.parentId : undefined;
    const list = children.get(parent);
    if (list) list.push(node);
    else children.set(parent, [node]);
  }
  const sizes = new Map<string, FlowSize>();
  const relative = new Map<string, FlowPoint>();
  const bendPoints = new Map<string, FlowPoint[]>();
  const stats = { layers: 0, dummies: 0, crossings: 0, components: 0 };
  const padding = options.groupPadding;

  /** The direct child of `parent` that contains `id` (or `id` itself), or undefined. */
  const liftTo = (id: string, parent: string | undefined): string | undefined => {
    let current: string | undefined = id;
    while (current !== undefined) {
      const node = byId.get(current);
      if (!node) return undefined;
      const owner =
        node.parentId !== undefined && byId.has(node.parentId) ? node.parentId : undefined;
      if (owner === parent) return current;
      current = owner;
    }
    return undefined;
  };

  const absoluteOf = (id: string): FlowPoint | undefined => byId.get(id)?.position;

  const processLevel = (parent: string | undefined): void => {
    const members = children.get(parent) ?? [];
    for (const member of members) if (children.has(member.id)) processLevel(member.id);
    const parentAbsolute =
      parent === undefined ? { x: 0, y: 0 } : (absoluteOf(parent) ?? { x: 0, y: 0 });
    const contentOrigin =
      parent === undefined ? { x: 0, y: 0 } : { x: padding.left, y: padding.top };
    const levelNodes: FlowLayoutNode[] = members.map((member) => {
      const size = sizes.get(member.id) ?? member.size;
      const position = member.position
        ? { x: member.position.x - parentAbsolute.x, y: member.position.y - parentAbsolute.y }
        : undefined;
      return { ...member, size, position, ports: children.has(member.id) ? [] : member.ports };
    });
    const lifted = new Map<string, FlowLayoutEdge>();
    for (const edge of edges) {
      const source = liftTo(edge.source, parent);
      const target = liftTo(edge.target, parent);
      if (source === undefined || target === undefined || source === target) continue;
      const own = source === edge.source && target === edge.target;
      const key = own ? edge.id : `${source}\u0000${target}\u0000${edge.id}`;
      lifted.set(key, {
        id: edge.id,
        source,
        target,
        sourcePort: own ? edge.sourcePort : undefined,
        targetPort: own ? edge.targetPort : undefined,
      });
    }
    const origin = parent === undefined ? options.origin : contentOrigin;
    const result = layoutLevel(levelNodes, [...lifted.values()], direction, options, origin);
    stats.layers = Math.max(stats.layers, result.stats.layers);
    stats.dummies += result.stats.dummies;
    stats.crossings += result.stats.crossings;
    stats.components += result.stats.components;
    for (const [id, points] of result.bendPoints) bendPoints.set(id, points);
    for (const member of members) relative.set(member.id, result.positions.get(member.id)!);
    if (parent !== undefined) {
      let maxX = 0;
      let maxY = 0;
      for (const member of levelNodes) {
        const position = result.positions.get(member.id)!;
        maxX = Math.max(maxX, position.x + member.size.width);
        maxY = Math.max(maxY, position.y + member.size.height);
      }
      sizes.set(parent, {
        width: Math.max(maxX + padding.right, padding.left + padding.right),
        height: Math.max(maxY + padding.bottom, padding.top + padding.bottom),
      });
    }
  };
  processLevel(undefined);

  const positions = new Map<string, FlowPoint>();
  const compose = (parent: string | undefined, base: FlowPoint): void => {
    for (const member of children.get(parent) ?? []) {
      const rel = relative.get(member.id)!;
      const absolute = { x: base.x + rel.x, y: base.y + rel.y };
      positions.set(member.id, absolute);
      if (children.has(member.id)) compose(member.id, absolute);
    }
  };
  compose(undefined, { x: 0, y: 0 });
  // Bend points of lifted edges were computed in the level space of their parent; translate.
  const translated = new Map<string, FlowPoint[]>();
  const edgeParent = new Map<string, string | undefined>();
  for (const [parent, members] of children)
    for (const member of members) edgeParent.set(member.id, parent);
  for (const [edgeId, points] of bendPoints) {
    const edge = edges.find((candidate) => candidate.id === edgeId);
    if (!edge) continue;
    // The level is the deepest common ancestor; find it from the lifted ends.
    let level: string | undefined = edgeParent.get(edge.source);
    const ancestors = new Set<string | undefined>();
    for (let cursor = level; ; cursor = edgeParent.get(cursor!)) {
      ancestors.add(cursor);
      if (cursor === undefined) break;
    }
    level = edgeParent.get(edge.target);
    while (!ancestors.has(level)) level = edgeParent.get(level!);
    const base = level === undefined ? { x: 0, y: 0 } : (positions.get(level) ?? { x: 0, y: 0 });
    translated.set(
      edgeId,
      points.map((point) => ({ x: point.x + base.x, y: point.y + base.y })),
    );
  }
  return { positions, sizes, bendPoints: translated, stats };
}
