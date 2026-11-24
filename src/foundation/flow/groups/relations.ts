import type {
  FlowConnection,
  FlowEdgeRelation,
  FlowGroupTerminal,
  FlowModelLike,
  FlowNode,
  FlowNodeDefinition,
} from '../types.js';

/**
 * Group relations (Widgets §6.3 Definition). A group is a node whose definition has the `group`
 * shape; its members point at it through `parentId`. Edges connect siblings, a group port and a
 * direct child (the group port in the inverted role), or a group input to an output of the same
 * group; anything else crosses a border.
 */

/** The node type of the built-in group definition. */
export const FLOW_GROUP_TYPE = 'group';

/** The definition a `group` node uses when the schema declares no `group` type. */
export const FLOW_GROUP_DEFINITION: FlowNodeDefinition = Object.freeze({
  type: FLOW_GROUP_TYPE,
  label: 'Group',
  shape: 'group' as const,
  ports: [],
});

/** The synthetic node types of a group's boundary terminals inside the group. */
export const FLOW_TERMINAL_TYPES: Readonly<Record<FlowGroupTerminal, string>> = Object.freeze({
  inputs: '@inputs',
  outputs: '@outputs',
});

/** The id of a group's boundary terminal: `${groupId}#inputs` or `${groupId}#outputs`. */
export function flowTerminalId(groupId: string, kind: FlowGroupTerminal): string {
  return `${groupId}#${kind}`;
}

/** The group and terminal kind a terminal id names, or `undefined` for any other id. */
export function parseFlowTerminalId(
  id: string,
): { groupId: string; kind: FlowGroupTerminal } | undefined {
  const at = id.lastIndexOf('#');
  if (at <= 0) return undefined;
  const kind = id.slice(at + 1);
  if (kind !== 'inputs' && kind !== 'outputs') return undefined;
  return { groupId: id.slice(0, at), kind };
}

/** What the relation helpers read: nodes and their definitions. */
type GroupReader = Pick<FlowModelLike, 'getNode' | 'definitionOf'>;

/** Whether a node is a group: its definition has the `group` shape. */
export function isFlowGroup(model: GroupReader, node: FlowNode | string): boolean {
  const item = typeof node === 'string' ? model.getNode(node) : node;
  if (!item) return false;
  const definition = model.definitionOf(item);
  return definition ? definition.shape === 'group' : item.type === FLOW_GROUP_TYPE;
}

/**
 * The declared direction of a node's port, from its instance override or definition; an absent id
 * stands for the default port of the end (`natural`), an unknown id gives `undefined`.
 */
export function portDirectionOf(
  model: GroupReader,
  node: FlowNode,
  portId: string | undefined,
  natural: 'input' | 'output',
): 'input' | 'output' | undefined {
  if (portId === undefined) return natural;
  const instance = node.ports?.find((port) => port.id === portId);
  if (instance?.direction) return instance.direction;
  const declared = model.definitionOf(node)?.ports.find((port) => port.id === portId);
  if (declared) return declared.direction;
  return instance ? 'input' : undefined;
}

/** How an edge (or a proposed connection) relates to the group tree. */
export function flowEdgeRelation(model: GroupReader, edge: FlowConnection): FlowEdgeRelation {
  const source = model.getNode(edge.source);
  const target = model.getNode(edge.target);
  if (!source || !target) return 'crossing';
  if (source !== target && source.parentId === target.parentId) return 'sibling';
  if (source === target) {
    if (
      isFlowGroup(model, source) &&
      portDirectionOf(model, source, edge.sourcePort, 'output') === 'input' &&
      portDirectionOf(model, target, edge.targetPort, 'input') === 'output'
    )
      return 'through';
    return 'sibling';
  }
  if (
    target.parentId === source.id &&
    isFlowGroup(model, source) &&
    portDirectionOf(model, source, edge.sourcePort, 'output') === 'input'
  )
    return 'inner-input';
  if (
    source.parentId === target.id &&
    isFlowGroup(model, target) &&
    portDirectionOf(model, target, edge.targetPort, 'input') === 'output'
  )
    return 'inner-output';
  return 'crossing';
}

/**
 * The level an edge belongs to: the shared parent of a sibling edge (`undefined` at the root), the
 * group of an inner or pass-through edge, `null` for a crossing edge.
 */
export function flowEdgeLevel(model: GroupReader, edge: FlowConnection): string | undefined | null {
  switch (flowEdgeRelation(model, edge)) {
    case 'sibling':
      return model.getNode(edge.source)?.parentId;
    case 'inner-input':
    case 'through':
      return edge.source;
    case 'inner-output':
      return edge.target;
    default:
      return null;
  }
}

/** Whether the end of an edge at `nodeId` uses its port in the inverted role. */
export function invertsRole(
  model: GroupReader,
  nodeId: string,
  peerId: string | undefined,
): boolean {
  if (peerId === undefined) return false;
  if (peerId === nodeId) return isFlowGroup(model, nodeId);
  const peer = model.getNode(peerId);
  return peer?.parentId === nodeId && isFlowGroup(model, nodeId);
}

/**
 * The effective direction of a port at one end of an edge whose other end is `peerId`: the declared
 * direction, flipped at the group end of an inner edge (the peer is a direct child) and at both
 * ends of a pass-through (the peer is the group itself).
 */
export function flowPortFacing(
  model: GroupReader,
  nodeId: string,
  direction: 'input' | 'output',
  peerId?: string,
): 'input' | 'output' {
  if (!invertsRole(model, nodeId, peerId)) return direction;
  return direction === 'input' ? 'output' : 'input';
}

/** Which ends of an edge with `relation` attach to the inside of a group port. */
export function inwardEnds(relation: FlowEdgeRelation): { source: boolean; target: boolean } {
  return {
    source: relation === 'inner-input' || relation === 'through',
    target: relation === 'inner-output' || relation === 'through',
  };
}

/**
 * Whether an edge is a legal segment of the group tree: not crossing, and every group end used in
 * the role its relation gives it (a group output never feeds a sibling's edge from the inside).
 */
export function isFlowSegmentValid(model: GroupReader, edge: FlowConnection): boolean {
  const relation = flowEdgeRelation(model, edge);
  if (relation === 'crossing') return false;
  for (const end of ['source', 'target'] as const) {
    const nodeId = end === 'source' ? edge.source : edge.target;
    const node = model.getNode(nodeId);
    if (!node || !isFlowGroup(model, node)) continue;
    const natural = end === 'source' ? 'output' : 'input';
    const declared = portDirectionOf(
      model,
      node,
      end === 'source' ? edge.sourcePort : edge.targetPort,
      natural,
    );
    if (declared === undefined) continue;
    const peer = end === 'source' ? edge.target : edge.source;
    if (flowPortFacing(model, nodeId, declared, peer) !== natural) return false;
  }
  return true;
}
