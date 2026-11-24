import { DEFAULT_LAYOUT_OPTIONS } from '../defaults.js';
import { pickPort } from '../edges/endpoints.js';
import { rectsEqual, unionRects } from '../geometry.js';
import { GROUP_HEADER_PADDING } from '../layout/types.js';
import { FlowModel } from '../model/model.js';
import type {
  FlowChange,
  FlowConnection,
  FlowEdge,
  FlowEdgePatch,
  FlowGroupTerminals,
  FlowNode,
  FlowPoint,
  FlowPortInstance,
  FlowRect,
} from '../types.js';
import {
  flattenFlowGroups,
  flowEdgeLeafPairs,
  type FlowLeafEnd,
  type FlowLeafPair,
} from './flatten.js';
import { FLOW_GROUP_TYPE, isFlowSegmentValid, portDirectionOf } from './relations.js';

/**
 * Group commands (Widgets §6.3 Properties): pure change builders. Each reads the model, simulates
 * its steps on a scratch copy of the document and returns one change list that the caller applies
 * as one history entry with `{ cascade: false, clamp: false }`: the cascade and clamp passes read
 * the document before the batch and would delete or clamp members the batch just moved.
 */

/** Creates ids for the nodes and edges a command adds. */
export type FlowIdFactory = (kind: 'node' | 'edge') => string;

/** The frame padding of a group around its members: room for the header strip on top. */
export const FLOW_GROUP_PADDING: Readonly<{
  top: number;
  right: number;
  bottom: number;
  left: number;
}> = Object.freeze({
  top: GROUP_HEADER_PADDING,
  right: DEFAULT_LAYOUT_OPTIONS.groupPadding,
  bottom: DEFAULT_LAYOUT_OPTIONS.groupPadding,
  left: DEFAULT_LAYOUT_OPTIONS.groupPadding,
});

/** A command's change list; apply it with `{ cascade: false, clamp: false }`. */
export interface FlowGroupCommandResult {
  changes: FlowChange[];
}

/** A command that may expose group ports: the ports and edges it creates. */
export interface FlowExposeResult extends FlowGroupCommandResult {
  ports: Array<{ nodeId: string; port: FlowPortInstance }>;
  edges: FlowEdge[];
}

/** What `reparentChanges` returns: the nodes it moves, besides the exposed ports and edges. */
export interface FlowReparentResult extends FlowExposeResult {
  moved: string[];
}

/** What `groupNodesChanges` returns: the new group and its members. */
export interface FlowGroupNodesResult extends FlowExposeResult {
  groupId: string;
  members: string[];
}

/** What `ungroupChanges` returns: the members moved out of the removed group. */
export interface FlowUngroupResult extends FlowExposeResult {
  members: string[];
}

/** The state a resize starts from: the group rect and its members' and terminals' positions. */
export interface FlowGroupResizeSnapshot {
  /** Absolute rect of the group at the start. */
  rect: FlowRect;
  /** Parent-relative positions of the direct members at the start. */
  children: ReadonlyMap<string, FlowPoint>;
  terminals?: FlowGroupTerminals | undefined;
}

/** What `groupResizeChanges` returns: the rect the group takes after clamping. */
export interface FlowGroupResizeResult extends FlowGroupCommandResult {
  rect: FlowRect;
}

/** An edit of a group's ports: add one, patch one (rename), or remove one with its edges. */
export type FlowGroupPortAction =
  | {
      action: 'add';
      groupId: string;
      port: Omit<FlowPortInstance, 'id' | 'direction'> & {
        id?: string;
        direction: 'input' | 'output';
      };
    }
  | {
      action: 'update';
      groupId: string;
      portId: string;
      patch: Partial<Omit<FlowPortInstance, 'id' | 'direction'>>;
    }
  | { action: 'remove'; groupId: string; portId: string };

/** What `groupPortChanges` returns: the port as it ends up (absent after a removal). */
export interface FlowGroupPortResult extends FlowGroupCommandResult {
  port?: FlowPortInstance;
}

// Draft ----------------------------------------------------------------------------------------

/** A history-free model over the same document and schema, for simulating steps. */
function scratch(source: FlowModel): FlowModel {
  return source.schema
    ? new FlowModel({ document: source.document, schema: source.schema, history: false })
    : new FlowModel({ document: source.document, history: false });
}

/** A scratch model the steps of a command run on, recording the changes in order. */
class Draft {
  readonly model: FlowModel;
  readonly changes: FlowChange[] = [];
  readonly ports: Array<{ nodeId: string; port: FlowPortInstance }> = [];
  readonly edges: FlowEdge[] = [];
  readonly #ids: FlowIdFactory;
  readonly #taken = new Set<string>();
  #counter = 0;

  constructor(source: FlowModel, ids: FlowIdFactory) {
    this.model = scratch(source);
    this.#ids = ids;
  }

  apply(...changes: FlowChange[]): void {
    this.changes.push(...changes);
    this.model.apply(changes, { cascade: false, clamp: false });
  }

  id(kind: 'node' | 'edge'): string {
    const taken = (id: string): boolean =>
      this.#taken.has(id) ||
      (kind === 'node' ? this.model.getNode(id) : this.model.getEdge(id)) !== undefined;
    for (let attempt = 0; attempt < 1000; attempt += 1) {
      const id = this.#ids(kind);
      if (!taken(id)) {
        this.#taken.add(id);
        return id;
      }
    }
    let id: string;
    do id = `${kind}-${(this.#counter += 1)}`;
    while (taken(id));
    this.#taken.add(id);
    return id;
  }

  result(): FlowExposeResult {
    return { changes: this.changes, ports: this.ports, edges: this.edges };
  }
}

// Ends and ports -------------------------------------------------------------------------------

function endKey(nodeId: string, portId: string | undefined): string {
  return `${nodeId}\u0000${portId ?? ''}`;
}

function sameEnd(a: FlowLeafEnd, b: FlowLeafEnd): boolean {
  return a.nodeId === b.nodeId && a.portId === b.portId;
}

function sourceEnd(edge: FlowConnection): FlowLeafEnd {
  return { nodeId: edge.source, portId: edge.sourcePort };
}

function targetEnd(edge: FlowConnection): FlowLeafEnd {
  return { nodeId: edge.target, portId: edge.targetPort };
}

/** Lowercase words of a port id joined by dashes (`Image` → `image`). */
function slug(text: string): string {
  const value = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return value || 'port';
}

/** `base` slugged, made unique among the group's ports (`image`, `image-2`, …). */
function uniquePortId(model: FlowModel, groupId: string, base: string): string {
  const taken = new Set(model.ports(groupId).map((port) => port.id));
  const id = slug(base);
  if (!taken.has(id)) return id;
  for (let suffix = 2; ; suffix += 1) if (!taken.has(`${id}-${suffix}`)) return `${id}-${suffix}`;
}

/** The node a group-tree walk starts from for an end: its group for an inverted-role port. */
function containerOf(
  model: FlowModel,
  end: FlowLeafEnd,
  role: 'source' | 'target',
): string | undefined {
  const node = model.getNode(end.nodeId);
  if (!node) return undefined;
  if (model.isGroup(node)) {
    const natural = role === 'source' ? 'output' : 'input';
    const declared = portDirectionOf(model, node, end.portId, natural);
    if (declared !== undefined && declared !== natural) return node.id;
  }
  return node.parentId !== undefined && model.getNode(node.parentId) ? node.parentId : undefined;
}

/** A container and its ancestors, then the root (`undefined`). */
function containerChain(model: FlowModel, id: string | undefined): Array<string | undefined> {
  return id === undefined ? [undefined] : [id, ...model.ancestors(id), undefined];
}

interface Keep {
  edge: FlowEdge;
  end: 'source' | 'target';
}

interface Rewire {
  draft: Draft;
  /** Edges that no longer hold and wait to be re-created (or removed). */
  pending: Set<string>;
  /** Live edges that only carried pairs being re-created: the ports they feed count as free. */
  stale: ReadonlySet<string>;
  /** Original edges whose id survives on a new segment, in priority order. */
  keeps: readonly Keep[];
  /** Per kept edge, how many pairs still to re-create run through it (this one included). */
  remaining?: ReadonlyMap<string, number>;
  /** Group ports the pair's original chain passed through. */
  chainPorts: ReadonlySet<string>;
  template: Partial<FlowEdge> | undefined;
}

interface Segment {
  from: FlowLeafEnd;
  to: FlowLeafEnd;
}

function liveEdges(context: Rewire): FlowEdge[] {
  return context.draft.model.edges.filter((edge) => !context.pending.has(edge.id));
}

/** Whether nothing that stays arrives at a group port (so the pair may use it again). */
function portFree(context: Rewire, groupId: string, portId: string): boolean {
  return !liveEdges(context).some(
    (edge) => edge.target === groupId && edge.targetPort === portId && !context.stale.has(edge.id),
  );
}

function addPort(
  context: Rewire,
  groupId: string,
  direction: 'input' | 'output',
  leaf: FlowLeafEnd,
): string {
  const { draft } = context;
  const model = draft.model;
  const leafPort = pickPort(model.ports(leaf.nodeId), leaf.portId, direction);
  const id = uniquePortId(model, groupId, leafPort?.id ?? leaf.portId ?? direction);
  const port: FlowPortInstance = { id, direction };
  if (leafPort?.label !== undefined) port.label = leafPort.label;
  if (leafPort?.dataType !== undefined) port.dataType = leafPort.dataType;
  const node = model.getNode(groupId)!;
  draft.apply({
    type: 'node-update',
    id: groupId,
    patch: { ports: [...(node.ports ?? []), port] },
  });
  draft.ports.push({ nodeId: groupId, port });
  return id;
}

/**
 * Crosses the border of `groupId` from `current`: outward through an output (`exit`) or inward
 * through an input. A port already fed by the same endpoint is shared (fan-out and fan-in); else a
 * port the pair's old chain used and nothing else feeds is taken again; else a port is added.
 */
function crossBorder(
  context: Rewire,
  groupId: string,
  direction: 'input' | 'output',
  current: FlowLeafEnd,
  leaf: FlowLeafEnd,
  segments: Segment[],
): FlowLeafEnd {
  const model = context.draft.model;
  const group = model.getNode(groupId)!;
  const shared = liveEdges(context).find(
    (edge) =>
      sameEnd(sourceEnd(edge), current) &&
      edge.target === groupId &&
      portDirectionOf(model, group, edge.targetPort, 'input') === direction,
  );
  if (shared) return targetEnd(shared);
  const reused = model
    .ports(groupId)
    .find(
      (port) =>
        port.direction === direction &&
        context.chainPorts.has(endKey(groupId, port.id)) &&
        portFree(context, groupId, port.id),
    );
  const end = { nodeId: groupId, portId: reused?.id ?? addPort(context, groupId, direction, leaf) };
  segments.push({ from: current, to: end });
  return end;
}

/**
 * Emits a pair's new segments. A kept edge takes the segment at its kept end, else (that segment
 * being shared with another pair) the segment at its other end; the rest are new edges.
 */
function emitSegments(context: Rewire, segments: readonly Segment[]): void {
  const { draft } = context;
  const assigned = new Map<number, Keep>();
  const placed = new Set<Keep>();
  // An edge that later pairs could still take yields to one this pair is the last chance for.
  const later = (keep: Keep): number => ((context.remaining?.get(keep.edge.id) ?? 1) > 1 ? 1 : 0);
  const open = context.keeps
    .filter((keep) => context.pending.has(keep.edge.id))
    .map((keep, index) => ({ keep, index }))
    .sort((a, b) => later(a.keep) - later(b.keep) || a.index - b.index)
    .map((item) => item.keep);
  const at = (keep: Keep, end: 'source' | 'target'): number => {
    if (end === 'source')
      return segments.findIndex((segment) => sameEnd(segment.from, sourceEnd(keep.edge)));
    for (let index = segments.length - 1; index >= 0; index -= 1)
      if (sameEnd(segments[index]!.to, targetEnd(keep.edge))) return index;
    return -1;
  };
  for (const pass of ['kept', 'other'] as const)
    for (const keep of open) {
      if (placed.has(keep)) continue;
      const end = pass === 'kept' ? keep.end : keep.end === 'source' ? 'target' : 'source';
      const index = at(keep, end);
      if (index < 0 || assigned.has(index)) continue;
      assigned.set(index, keep);
      placed.add(keep);
    }
  segments.forEach((segment, index) => {
    const keep = assigned.get(index);
    if (keep) {
      context.pending.delete(keep.edge.id);
      const patch: FlowEdgePatch = {
        source: segment.from.nodeId,
        sourcePort: segment.from.portId,
        target: segment.to.nodeId,
        targetPort: segment.to.portId,
      };
      draft.apply({ type: 'edge-update', id: keep.edge.id, patch });
      if (draft.model.getEdge(keep.edge.id)?.waypoints)
        draft.apply({ type: 'edge-waypoints', id: keep.edge.id, waypoints: undefined });
      return;
    }
    const { id: named, waypoints, selected, ...template } = context.template ?? {};
    void waypoints;
    void selected;
    const id =
      named !== undefined && draft.edges.length === 0 && !draft.model.getEdge(named)
        ? named
        : draft.id('edge');
    const edge = {
      ...template,
      id,
      source: segment.from.nodeId,
      target: segment.to.nodeId,
    } as FlowEdge;
    if (segment.from.portId !== undefined) edge.sourcePort = segment.from.portId;
    if (segment.to.portId !== undefined) edge.targetPort = segment.to.portId;
    draft.apply({ type: 'edge-add', edge });
    draft.edges.push(edge);
  });
}

/**
 * Realizes one leaf-to-leaf connection on the current group tree: up from the source through one
 * output per border, one edge at the lowest common level, down through one input per border.
 */
function exposePath(context: Rewire, source: FlowLeafEnd, target: FlowLeafEnd): void {
  const model = context.draft.model;
  const up = containerChain(model, containerOf(model, source, 'source'));
  const down = containerChain(model, containerOf(model, target, 'target'));
  const common = up.find((id) => down.includes(id));
  const segments: Segment[] = [];
  let current = source;
  for (const groupId of up.slice(0, up.indexOf(common)))
    current = crossBorder(context, groupId!, 'output', current, source, segments);
  for (const groupId of down.slice(0, down.indexOf(common)).reverse())
    current = crossBorder(context, groupId!, 'input', current, target, segments);
  const end = current;
  const exists = liveEdges(context).some(
    (edge) => sameEnd(sourceEnd(edge), end) && sameEnd(targetEnd(edge), target),
  );
  if (!exists) segments.push({ from: current, to: target });
  emitSegments(context, segments);
}

/**
 * Re-creates the leaf pairs that ran through `invalid` edges (read on `snapshot`, the document
 * before the step), keeps edge ids on the new segments (`keeps`, in priority order), then removes
 * what is left of the old chains and the group ports they leave without edges.
 */
function rewire(
  draft: Draft,
  snapshot: FlowModel,
  invalid: readonly string[],
  keeps: readonly Keep[],
): void {
  const schema = snapshot.schema;
  const doc = snapshot.document;
  const pending = new Set(invalid);
  const pairs = new Map<string, FlowLeafPair>();
  for (const id of invalid)
    for (const pair of flowEdgeLeafPairs(doc, id, { schema })) pairs.set(pair.id, pair);
  const involved = new Set<string>();
  for (const pair of pairs.values()) for (const id of pair.chain) involved.add(id);
  const stale = new Set<string>();
  for (const id of involved)
    if (flowEdgeLeafPairs(doc, id, { schema }).every((pair) => pairs.has(pair.id))) stale.add(id);
  const remaining = new Map<string, number>();
  for (const pair of pairs.values())
    for (const id of pair.chain) remaining.set(id, (remaining.get(id) ?? 0) + 1);
  for (const pair of pairs.values()) {
    const chainPorts = new Set<string>();
    for (const id of pair.chain) {
      const edge = snapshot.getEdge(id);
      if (!edge) continue;
      chainPorts.add(endKey(edge.source, edge.sourcePort));
      chainPorts.add(endKey(edge.target, edge.targetPort));
    }
    exposePath(
      {
        draft,
        pending,
        stale,
        keeps: keeps.filter((keep) => pair.chain.includes(keep.edge.id)),
        remaining,
        chainPorts,
        template: undefined,
      },
      pair.source,
      pair.target,
    );
    for (const id of pair.chain) remaining.set(id, remaining.get(id)! - 1);
  }
  for (const id of invalid)
    if (pending.has(id) && draft.model.getEdge(id)) draft.apply({ type: 'edge-remove', id });
  // Segments of the old chains that no longer carry any leaf pair go too.
  const now = flattenFlowGroups(draft.model.document, { schema });
  const carried = new Set<string>();
  for (const chain of now.chains.values()) for (const id of chain) carried.add(id);
  for (const id of involved)
    if (!carried.has(id) && draft.model.getEdge(id)) draft.apply({ type: 'edge-remove', id });
  // Group ports the command emptied.
  const seen = new Set<string>();
  for (const id of new Set([...invalid, ...involved])) {
    const edge = snapshot.getEdge(id);
    if (!edge) continue;
    for (const end of [sourceEnd(edge), targetEnd(edge)]) {
      const key = endKey(end.nodeId, end.portId);
      if (end.portId === undefined || seen.has(key)) continue;
      seen.add(key);
      removeIfUnused(draft, end.nodeId, end.portId);
    }
  }
}

/** Removes a group's own (instance) port when no edge uses it on either side. */
function removeIfUnused(draft: Draft, nodeId: string, portId: string): void {
  const model = draft.model;
  const node = model.getNode(nodeId);
  if (!node || !model.isGroup(node) || !node.ports?.some((port) => port.id === portId)) return;
  if (model.definitionOf(node)?.ports.some((port) => port.id === portId)) return;
  const used = model.edges.some(
    (edge) =>
      (edge.source === nodeId && edge.sourcePort === portId) ||
      (edge.target === nodeId && edge.targetPort === portId),
  );
  if (used) return;
  const ports = node.ports.filter((port) => port.id !== portId);
  draft.apply({
    type: 'node-update',
    id: nodeId,
    patch: { ports: ports.length ? ports : undefined },
  });
}

/**
 * Moves nodes under `parentId` on the draft and rewires the edges the move invalidates. With
 * `dissolving`, the edges of that group that do not reach a moved node are rewired too, their id
 * kept at their other end.
 */
function moveInto(
  draft: Draft,
  ids: readonly string[],
  parentId: string | undefined,
  dissolving?: string,
): string[] {
  const model = draft.model;
  const wanted = new Set(ids.filter((id) => model.getNode(id)));
  const parentAncestors = parentId === undefined ? [] : model.ancestors(parentId);
  const moved = model.nodes
    .filter(
      (node) =>
        wanted.has(node.id) &&
        node.id !== parentId &&
        !parentAncestors.includes(node.id) &&
        !model.ancestors(node.id).some((ancestor) => wanted.has(ancestor)) &&
        (node.parentId !== undefined && model.getNode(node.parentId)
          ? node.parentId
          : undefined) !== parentId,
    )
    .map((node) => node.id);
  const movedSet = new Set(moved);
  const outer = model.edges.filter(
    (edge) =>
      dissolving !== undefined &&
      (edge.source === dissolving || edge.target === dissolving) &&
      !movedSet.has(edge.source) &&
      !movedSet.has(edge.target),
  );
  if (moved.length === 0 && outer.length === 0) return moved;
  const snapshot = scratch(model);
  const origin =
    parentId === undefined ? { x: 0, y: 0 } : (model.absolutePosition(parentId) ?? { x: 0, y: 0 });
  const changes: FlowChange[] = [];
  for (const id of moved) {
    const absolute = model.absolutePosition(id)!;
    changes.push(
      { type: 'node-update', id, patch: { parentId } },
      {
        type: 'node-position',
        id,
        position: { x: absolute.x - origin.x, y: absolute.y - origin.y },
      },
    );
  }
  if (changes.length) draft.apply(...changes);
  const extra = new Set(outer.map((edge) => edge.id));
  const invalid = model.edges.filter(
    (edge) =>
      extra.has(edge.id) ||
      ((movedSet.has(edge.source) || movedSet.has(edge.target)) &&
        !isFlowSegmentValid(model, edge)),
  );
  if (invalid.length === 0) return moved;
  // The segment at a moved node keeps the id first; an edge of a dissolved group keeps it at its
  // other end.
  const keeps: Keep[] = [];
  for (const edge of invalid) {
    const original = snapshot.getEdge(edge.id)!;
    if (movedSet.has(edge.source)) keeps.push({ edge: original, end: 'source' });
    else if (movedSet.has(edge.target)) keeps.push({ edge: original, end: 'target' });
  }
  for (const edge of outer)
    if (edge.source !== edge.target)
      keeps.push({ edge, end: edge.source === dissolving ? 'target' : 'source' });
  rewire(
    draft,
    snapshot,
    invalid.map((edge) => edge.id),
    keeps,
  );
  return moved;
}

// Commands -------------------------------------------------------------------------------------

/**
 * Moves nodes into `parentId` (`undefined`: the root), keeping their absolute positions. Nodes
 * whose ancestor also moves follow it. Every edge the move leaves crossing a border is replaced by
 * its leaf pairs, re-created through group ports (one port per source endpoint, shared by fan-out
 * and fan-in); the segment at the moved node keeps the edge's id, kind, label, data and markers
 * (waypoints are dropped). Ports the move leaves without edges are removed.
 */
export function reparentChanges(
  model: FlowModel,
  args: { ids: readonly string[]; parentId: string | undefined },
  idFactory: FlowIdFactory,
): FlowReparentResult {
  const draft = new Draft(model, idFactory);
  if (args.parentId !== undefined && !model.isGroup(args.parentId))
    return { ...draft.result(), moved: [] };
  const moved = moveInto(draft, args.ids, args.parentId);
  return { ...draft.result(), moved };
}

/**
 * Connects two ends that sit at different levels: walks up from the source through one output per
 * group border (reusing an output that already carries the same endpoint out), adds one edge at
 * the lowest common level and walks down to the target (reusing an input already fed by the same
 * upstream endpoint). New ports take their id from the leaf port (unique in the group), their
 * label and data type from it. `edge` is the template of the new edges; its `id` names the first.
 */
export function exposeConnectionChanges(
  model: FlowModel,
  args: { connection: FlowConnection; edge?: Partial<FlowEdge> },
  idFactory: FlowIdFactory,
): FlowExposeResult {
  const draft = new Draft(model, idFactory);
  exposePath(
    {
      draft,
      pending: new Set(),
      stale: new Set(),
      keeps: [],
      chainPorts: new Set(),
      template: args.edge,
    },
    sourceEnd(args.connection),
    targetEnd(args.connection),
  );
  return draft.result();
}

/**
 * Wraps the selected top-level nodes in a new group sized to their bounds plus the frame padding,
 * placed at the first member's document position, and converts every edge that would cross the
 * new border (see `reparentChanges`); the new ports are ordered by the cross-axis position of
 * their inner ends. Returns `undefined` when the nodes do not share one parent.
 */
export function groupNodesChanges(
  model: FlowModel,
  args: { ids: readonly string[]; type?: string; label?: string; id?: string },
  idFactory: FlowIdFactory,
): FlowGroupNodesResult | undefined {
  const wanted = new Set(args.ids.filter((id) => model.getNode(id)));
  const members = model.nodes
    .filter(
      (node) =>
        wanted.has(node.id) && !model.ancestors(node.id).some((ancestor) => wanted.has(ancestor)),
    )
    .map((node) => node.id);
  if (members.length === 0) return undefined;
  const parentOf = (id: string): string | undefined => {
    const parentId = model.getNode(id)?.parentId;
    return parentId !== undefined && model.getNode(parentId) ? parentId : undefined;
  };
  const parentId = parentOf(members[0]!);
  if (members.some((id) => parentOf(id) !== parentId)) return undefined;
  const rects = members
    .map((id) => model.nodeRect(id))
    .filter((rect): rect is FlowRect => rect !== undefined);
  const bounds = unionRects(rects);
  const padding = FLOW_GROUP_PADDING;
  const origin =
    parentId === undefined ? { x: 0, y: 0 } : (model.absolutePosition(parentId) ?? { x: 0, y: 0 });
  const draft = new Draft(model, idFactory);
  const groupId = args.id !== undefined && !model.getNode(args.id) ? args.id : draft.id('node');
  const type =
    args.type ??
    model.schema?.nodes.find((definition) => definition.shape === 'group')?.type ??
    FLOW_GROUP_TYPE;
  const group: FlowNode = {
    id: groupId,
    type,
    position: { x: bounds.x - padding.left - origin.x, y: bounds.y - padding.top - origin.y },
    size: {
      width: bounds.width + padding.left + padding.right,
      height: bounds.height + padding.top + padding.bottom,
    },
    data: {},
  };
  if (parentId !== undefined) group.parentId = parentId;
  if (args.label !== undefined) group.label = args.label;
  const index = Math.min(
    ...members.map((id) => model.document.nodes.findIndex((n) => n.id === id)),
  );
  draft.apply({ type: 'node-add', node: group, index });
  moveInto(draft, members, groupId);
  orderPorts(draft, model, groupId);
  return { ...draft.result(), groupId, members };
}

/** Orders a group's ports by the cross-axis position of their inner ends, inputs first. */
function orderPorts(draft: Draft, source: FlowModel, groupId: string): void {
  const node = draft.model.getNode(groupId);
  if (!node?.ports || node.ports.length < 2) return;
  const vertical = source.layoutDirection === 'vertical';
  const cross = (end: FlowLeafEnd): number => {
    const center = end.portId !== undefined ? source.portCenter(end.nodeId, end.portId) : undefined;
    const rect = source.nodeRect(end.nodeId);
    const point =
      center ?? (rect ? { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 } : undefined);
    return point ? (vertical ? point.x : point.y) : 0;
  };
  const edges = draft.model.edges;
  const position = (port: FlowPortInstance): number => {
    const inner =
      port.direction === 'output'
        ? edges.find((edge) => edge.target === groupId && edge.targetPort === port.id)
        : edges.find((edge) => edge.source === groupId && edge.sourcePort === port.id);
    if (!inner) return Infinity;
    return cross(port.direction === 'output' ? sourceEnd(inner) : targetEnd(inner));
  };
  const rank = (port: FlowPortInstance): number => (port.direction === 'output' ? 1 : 0);
  const sorted = node.ports
    .map((port, index) => ({ port, index, at: position(port) }))
    .sort((a, b) => rank(a.port) - rank(b.port) || a.at - b.at || a.index - b.index)
    .map((item) => item.port);
  if (sorted.every((port, index) => port === node.ports![index])) return;
  draft.apply({ type: 'node-update', id: groupId, patch: { ports: sorted } });
}

/**
 * Dissolves a group: its members move to the group's parent (keeping absolute positions), the
 * chains through its ports merge back into direct edges (the segment at a member keeps its id),
 * then the edges still at the group and the group itself are removed explicitly.
 */
export function ungroupChanges(
  model: FlowModel,
  args: { id: string },
  idFactory: FlowIdFactory,
): FlowUngroupResult | undefined {
  const group = model.getNode(args.id);
  if (!group || !model.isGroup(group)) return undefined;
  const draft = new Draft(model, idFactory);
  const members = [...model.children(args.id)];
  const parentId =
    group.parentId !== undefined && model.getNode(group.parentId) ? group.parentId : undefined;
  moveInto(draft, members, parentId, args.id);
  for (const edge of draft.model.edges)
    if (edge.source === args.id || edge.target === args.id)
      draft.apply({ type: 'edge-remove', id: edge.id });
  draft.apply({ type: 'node-remove', id: args.id });
  return { ...draft.result(), members };
}

/**
 * Grows the parents of moved nodes to contain them plus the frame padding, during a drag. When a
 * parent's origin moves its members (the moved ones included) and terminals are shifted back so
 * nothing moves on screen; growth propagates to the parent's own parent.
 */
export function expandParentChanges(
  model: FlowModel,
  args: { ids: readonly string[] },
): FlowGroupCommandResult {
  const positions = new Map<string, FlowPoint>();
  const frames = new Map<string, FlowRect>();
  const terminals = new Map<string, FlowGroupTerminals>();
  const positionOf = (id: string): FlowPoint => positions.get(id) ?? model.getNode(id)!.position;
  const padding = FLOW_GROUP_PADDING;
  // Absolute positions never change here: a parent's origin move is undone on its members.
  const grow = (parentId: string, rects: readonly FlowRect[]): void => {
    const parent = model.getNode(parentId);
    if (!parent || !model.isGroup(parent) || parent.collapsed || rects.length === 0) return;
    const frame = frames.get(parentId) ?? model.nodeRect(parentId);
    if (!frame) return;
    const content = unionRects(rects);
    const needed = unionRects([
      frame,
      {
        x: content.x - padding.left,
        y: content.y - padding.top,
        width: content.width + padding.left + padding.right,
        height: content.height + padding.top + padding.bottom,
      },
    ]);
    if (rectsEqual(needed, frame)) return;
    frames.set(parentId, needed);
    const delta = { x: frame.x - needed.x, y: frame.y - needed.y };
    if (delta.x !== 0 || delta.y !== 0) {
      const position = positionOf(parentId);
      positions.set(parentId, { x: position.x - delta.x, y: position.y - delta.y });
      for (const child of model.children(parentId)) {
        const at = positionOf(child);
        positions.set(child, { x: at.x + delta.x, y: at.y + delta.y });
      }
      const own = terminals.get(parentId) ?? parent.terminals;
      if (own) {
        const next: FlowGroupTerminals = {};
        if (own.inputs) next.inputs = { x: own.inputs.x + delta.x, y: own.inputs.y + delta.y };
        if (own.outputs) next.outputs = { x: own.outputs.x + delta.x, y: own.outputs.y + delta.y };
        terminals.set(parentId, next);
      }
    }
    if (parent.parentId !== undefined) grow(parent.parentId, [needed]);
  };
  const byParent = new Map<string, FlowRect[]>();
  for (const id of args.ids) {
    const node = model.getNode(id);
    const rect = model.nodeRect(id);
    if (!node?.parentId || !rect) continue;
    const list = byParent.get(node.parentId);
    if (list) list.push(rect);
    else byParent.set(node.parentId, [rect]);
  }
  for (const [parentId, rects] of byParent) grow(parentId, rects);
  const changes: FlowChange[] = [];
  for (const [id, frame] of frames)
    changes.push({ type: 'node-size', id, size: { width: frame.width, height: frame.height } });
  for (const [id, position] of positions) changes.push({ type: 'node-position', id, position });
  for (const [id, value] of terminals)
    changes.push({ type: 'node-update', id, patch: { terminals: value } });
  return { changes };
}

/** The state a resize of group `id` starts from, for `groupResizeChanges`. */
export function groupResizeSnapshot(model: FlowModel, id: string): FlowGroupResizeSnapshot {
  const rect = model.nodeRect(id) ?? { x: 0, y: 0, width: 0, height: 0 };
  const children = new Map<string, FlowPoint>();
  for (const child of model.children(id)) {
    const node = model.getNode(child);
    if (node) children.set(child, { ...node.position });
  }
  const terminals = model.getNode(id)?.terminals;
  return { rect, children, terminals };
}

/**
 * Resizes a group to `rect` (absolute), never smaller than its members' bounds plus the frame
 * padding (or the definition's minimum size). A resize from the start or top edge moves the
 * origin, so the members and terminals are shifted back from the `snapshot` taken at the start.
 */
export function groupResizeChanges(
  model: FlowModel,
  args: { id: string; rect: FlowRect; snapshot?: FlowGroupResizeSnapshot },
): FlowGroupResizeResult | undefined {
  const node = model.getNode(args.id);
  const current = model.nodeRect(args.id);
  if (!node || !current) return undefined;
  const snapshot = args.snapshot ?? groupResizeSnapshot(model, args.id);
  const padding = FLOW_GROUP_PADDING;
  let left = args.rect.x;
  let top = args.rect.y;
  let right = args.rect.x + args.rect.width;
  let bottom = args.rect.y + args.rect.height;
  const members: FlowRect[] = [];
  for (const [child, position] of snapshot.children) {
    const item = model.getNode(child);
    if (!item) continue;
    const size = model.nodeSize(item);
    members.push({
      x: snapshot.rect.x + position.x,
      y: snapshot.rect.y + position.y,
      width: size.width,
      height: size.height,
    });
  }
  if (members.length) {
    const bounds = unionRects(members);
    left = Math.min(left, bounds.x - padding.left);
    top = Math.min(top, bounds.y - padding.top);
    right = Math.max(right, bounds.x + bounds.width + padding.right);
    bottom = Math.max(bottom, bounds.y + bounds.height + padding.bottom);
  }
  const minSize = model.definitionOf(node)?.minSize;
  const minWidth = Math.max(minSize?.width ?? 0, padding.left + padding.right);
  const minHeight = Math.max(minSize?.height ?? 0, padding.top + padding.bottom);
  if (right - left < minWidth) {
    if (left !== snapshot.rect.x) left = right - minWidth;
    else right = left + minWidth;
  }
  if (bottom - top < minHeight) {
    if (top !== snapshot.rect.y) top = bottom - minHeight;
    else bottom = top + minHeight;
  }
  const rect = { x: left, y: top, width: right - left, height: bottom - top };
  const changes: FlowChange[] = [];
  if (rect.x !== current.x || rect.y !== current.y)
    changes.push({
      type: 'node-position',
      id: args.id,
      position: {
        x: node.position.x + rect.x - current.x,
        y: node.position.y + rect.y - current.y,
      },
    });
  changes.push({
    type: 'node-size',
    id: args.id,
    size: { width: rect.width, height: rect.height },
  });
  const delta = { x: snapshot.rect.x - rect.x, y: snapshot.rect.y - rect.y };
  for (const [child, position] of snapshot.children)
    if (model.getNode(child))
      changes.push({
        type: 'node-position',
        id: child,
        position: { x: position.x + delta.x, y: position.y + delta.y },
      });
  if (snapshot.terminals && (delta.x !== 0 || delta.y !== 0)) {
    const terminals: FlowGroupTerminals = {};
    const { inputs, outputs } = snapshot.terminals;
    if (inputs) terminals.inputs = { x: inputs.x + delta.x, y: inputs.y + delta.y };
    if (outputs) terminals.outputs = { x: outputs.x + delta.x, y: outputs.y + delta.y };
    changes.push({ type: 'node-update', id: args.id, patch: { terminals } });
  }
  return { changes, rect };
}

/**
 * Adds, patches (renames) or removes a group port. A new port's id is the slug of its id, label or
 * direction, unique in the group. Removing a port removes its edges on both sides; ports of the
 * group's definition can be patched but not removed (`undefined`).
 */
export function groupPortChanges(
  model: FlowModel,
  args: FlowGroupPortAction,
): FlowGroupPortResult | undefined {
  const group = model.getNode(args.groupId);
  if (!group || !model.isGroup(group)) return undefined;
  const instances = group.ports ?? [];
  const declared = model.definitionOf(group)?.ports ?? [];
  if (args.action === 'add') {
    const { id: requested, ...rest } = args.port;
    const id = uniquePortId(model, group.id, requested ?? rest.label ?? rest.direction);
    const port: FlowPortInstance = { ...rest, id };
    return {
      changes: [{ type: 'node-update', id: group.id, patch: { ports: [...instances, port] } }],
      port,
    };
  }
  const existing = instances.find((port) => port.id === args.portId);
  const inDefinition = declared.some((port) => port.id === args.portId);
  if (args.action === 'update') {
    if (!existing && !inDefinition) return undefined;
    const port: FlowPortInstance = { ...existing, id: args.portId };
    for (const key of Object.keys(args.patch) as Array<keyof typeof args.patch>) {
      const value = args.patch[key];
      if (value === undefined) delete port[key];
      else (port as Record<string, unknown>)[key] = value;
    }
    const ports = existing
      ? instances.map((item) => (item === existing ? port : item))
      : [...instances, port];
    return { changes: [{ type: 'node-update', id: group.id, patch: { ports } }], port };
  }
  if (!existing || inDefinition) return undefined;
  const changes: FlowChange[] = [];
  for (const edge of model.edges)
    if (
      (edge.source === group.id && edge.sourcePort === args.portId) ||
      (edge.target === group.id && edge.targetPort === args.portId)
    )
      changes.push({ type: 'edge-remove', id: edge.id });
  const ports = instances.filter((port) => port !== existing);
  changes.push({
    type: 'node-update',
    id: group.id,
    patch: { ports: ports.length ? ports : undefined },
  });
  return { changes };
}
