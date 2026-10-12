import type {
  FlowChange,
  FlowEdge,
  FlowNode,
  FlowPoint,
  FlowSelection,
} from '../../../foundation/flow/types.js';
import type { FlowModel } from '../../../foundation/flow/model/model.js';

/** Media type of a copied selection (Widgets §6.3 Keyboard and pointer: clipboard). */
export const FLOW_CLIPBOARD_TYPE = 'application/x-tweakpad-flow+json';

export interface FlowClipboardPayload {
  version: 1;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

/**
 * Serializes the selected nodes (with their descendants) and the edges whose both ends are
 * included. Positions stay parent-relative; a copied child of an unselected parent becomes a
 * top-level node at its absolute position.
 */
export function serializeSelection(
  model: FlowModel,
  selection: FlowSelection,
): FlowClipboardPayload {
  const ids = new Set<string>();
  for (const id of selection.nodes) {
    if (!model.getNode(id)) continue;
    ids.add(id);
    for (const child of model.descendants(id)) ids.add(child);
  }
  const nodes: FlowNode[] = [];
  for (const node of model.nodes) {
    if (!ids.has(node.id)) continue;
    const copy: FlowNode = { ...node };
    delete copy.selected;
    if (copy.parentId && !ids.has(copy.parentId)) {
      delete copy.parentId;
      copy.position = model.absolutePosition(node.id) ?? node.position;
    }
    nodes.push(copy);
  }
  // Edges travel only with both of their nodes; a selected edge alone has nothing to attach to.
  const edges: FlowEdge[] = [];
  for (const edge of model.edges)
    if (ids.has(edge.source) && ids.has(edge.target)) edges.push(stripSelected(edge));
  return { version: 1, nodes, edges };
}

function stripSelected(edge: FlowEdge): FlowEdge {
  const copy = { ...edge };
  delete copy.selected;
  return copy;
}

export function parseClipboardPayload(text: string): FlowClipboardPayload | undefined {
  try {
    const parsed: unknown = JSON.parse(text);
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !Array.isArray((parsed as FlowClipboardPayload).nodes) ||
      !Array.isArray((parsed as FlowClipboardPayload).edges)
    )
      return undefined;
    return parsed as FlowClipboardPayload;
  } catch {
    return undefined;
  }
}

export interface PasteOptions {
  /** Produces a fresh id for a copied node or edge. */
  idFactory: (kind: 'node' | 'edge') => string;
  /** Offset applied to top-level copied nodes (one grid step, or the pointer delta). */
  offset: FlowPoint;
  /** Existing ids; copies keep their id when it is free (cut + paste round trip). */
  taken: (id: string) => boolean;
}

/**
 * Remaps a payload into add changes with fresh ids, keeping internal references (parents,
 * edge endpoints) consistent. Returns the changes and the new node ids for the selection.
 */
export function pasteChanges(
  payload: FlowClipboardPayload,
  options: PasteOptions,
): { changes: FlowChange[]; nodeIds: string[]; edgeIds: string[] } {
  const nodeIds = new Map<string, string>();
  for (const node of payload.nodes)
    nodeIds.set(node.id, options.taken(node.id) ? options.idFactory('node') : node.id);
  const changes: FlowChange[] = [];
  const copiedIds = new Set(payload.nodes.map((node) => node.id));
  for (const node of payload.nodes) {
    const id = nodeIds.get(node.id)!;
    const topLevel = !node.parentId || !copiedIds.has(node.parentId);
    const copy: FlowNode = {
      ...node,
      id,
      position: topLevel
        ? { x: node.position.x + options.offset.x, y: node.position.y + options.offset.y }
        : { ...node.position },
      selected: true,
    };
    if (node.parentId && copiedIds.has(node.parentId)) copy.parentId = nodeIds.get(node.parentId)!;
    else delete copy.parentId;
    changes.push({ type: 'node-add', node: copy });
  }
  const edgeIds: string[] = [];
  for (const edge of payload.edges) {
    const source = nodeIds.get(edge.source);
    const target = nodeIds.get(edge.target);
    if (!source || !target) continue;
    const id = options.taken(edge.id) ? options.idFactory('edge') : edge.id;
    edgeIds.push(id);
    changes.push({ type: 'edge-add', edge: { ...edge, id, source, target, selected: true } });
  }
  return { changes, nodeIds: [...nodeIds.values()], edgeIds };
}
