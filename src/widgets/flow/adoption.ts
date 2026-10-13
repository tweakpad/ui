import type { FlowModel } from '../../foundation/flow/model/model.js';
import type {
  FlowChange,
  FlowEdge,
  FlowEdgeKind,
  FlowMarkerType,
  FlowNode,
  FlowPoint,
} from '../../foundation/flow/types.js';
import type { TpFlowNode } from './node/node.js';
import type { TpFlowEdge } from './edge/flow-edge.js';
import { FLOW_SLOT_REGIONS, type FlowSlotRegion } from './types.js';

/** A shallow copy without the given keys (the record patch of an adopted element). */
function omit<T extends object, K extends keyof T>(value: T, keys: readonly K[]): Omit<T, K> {
  const copy = { ...value } as Record<string, unknown>;
  for (const key of keys) delete copy[key as string];
  return copy as unknown as Omit<T, K>;
}

export interface AdoptionOptions {
  host: HTMLElement;
  model: () => FlowModel;
  /** Proposes adopted changes through the lane (origin external when the widget is uncontrolled). */
  adopt: (changes: readonly FlowChange[]) => void;
  /** Reports an id conflict between an authored child and the document. */
  conflict: (id: string) => void;
  onChanged: () => void;
}

const NODE_FLAGS = ['draggable', 'selectable', 'connectable', 'deletable', 'resizable'] as const;

function number(value: string | null, fallback: number): number {
  const parsed = value === null ? Number.NaN : Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function json(value: string | null): Record<string, unknown> {
  if (!value) return {};
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function waypoints(value: string | null): FlowPoint[] | undefined {
  if (!value) return undefined;
  const points: FlowPoint[] = [];
  for (const pair of value.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    if (Number.isFinite(x) && Number.isFinite(y)) points.push({ x: x!, y: y! });
  }
  return points.length ? points : undefined;
}

/**
 * Declarative adoption (Widgets 6.3 Definition): `tp-flow-node` and `tp-flow-edge` light-DOM
 * children become document nodes and edges by id; authored node elements are the rendered
 * hosts while visible (manual slot assignment, `components/map` precedent). Gesture results
 * are written back only to the owned `x`, `y`, `width` and `height` attributes. Panel-slotted
 * children are collected for the panel slots.
 */
export class LightDomAdoption {
  readonly #options: AdoptionOptions;
  readonly #nodes = new Map<string, TpFlowNode>();
  readonly #edges = new Map<string, TpFlowEdge>();
  readonly #panels = new Map<FlowSlotRegion, Element[]>();
  #observer: MutationObserver | undefined;
  #writing = false;
  #anonymous = 0;

  constructor(options: AdoptionOptions) {
    this.#options = options;
  }

  get nodes(): ReadonlyMap<string, TpFlowNode> {
    return this.#nodes;
  }

  get edges(): ReadonlyMap<string, TpFlowEdge> {
    return this.#edges;
  }

  /** Light-DOM children slotted into a panel or the header, in document order. */
  panel(region: FlowSlotRegion): readonly Element[] {
    return this.#panels.get(region) ?? [];
  }

  connect(): void {
    const view = this.#options.host.ownerDocument.defaultView;
    if (!view) return;
    this.#observer = new view.MutationObserver((records) => {
      if (this.#writing) return;
      let structural = false;
      const changed = new Set<Element>();
      for (const record of records) {
        // Only the host's own children are adopted; content inside authored nodes is theirs.
        if (record.type === 'childList') structural ||= record.target === this.#options.host;
        else if (record.type === 'attributes' && record.target instanceof Element)
          changed.add(record.target);
      }
      if (structural) this.scan();
      else for (const element of changed) this.#readOne(element);
    });
    // One registration: a second observe() on the same target replaces the first's options.
    this.#observer.observe(this.#options.host, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: [
        'x',
        'y',
        'width',
        'height',
        'parent',
        'label',
        'tone',
        'pinned',
        'data',
        'type',
        'source',
        'target',
        'source-port',
        'target-port',
        'kind',
        'animated',
        'waypoints',
        'hidden',
        'slot',
        ...NODE_FLAGS,
      ],
    });
    this.scan();
  }

  disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#nodes.clear();
    this.#edges.clear();
    this.#panels.clear();
  }

  /** Reads every light-DOM child and proposes the differences into the document. */
  scan(): void {
    const host = this.#options.host;
    const model = this.#options.model();
    const nodes = new Map<string, TpFlowNode>();
    const edges = new Map<string, TpFlowEdge>();
    const panels = new Map<FlowSlotRegion, Element[]>();
    const changes: FlowChange[] = [];
    for (const child of host.children) {
      if (child.localName === 'tp-flow-node') {
        const element = child as TpFlowNode;
        if (!element.id) element.id = `tp-flow-node-${(this.#anonymous += 1)}`;
        if (nodes.has(element.id)) {
          this.#options.conflict(element.id);
          continue;
        }
        nodes.set(element.id, element);
        const node = this.#readNode(element);
        const existing = model.getNode(element.id);
        if (!existing) {
          if (!this.#nodes.has(element.id) && model.getNode(element.id))
            this.#options.conflict(element.id);
          changes.push({ type: 'node-add', node });
        } else if (!this.#nodes.has(element.id)) {
          // The document already has this id: the authored element becomes its host.
          this.#options.conflict(element.id);
        }
      } else if (child.localName === 'tp-flow-edge') {
        const element = child as TpFlowEdge;
        if (!element.id) element.id = `tp-flow-edge-${(this.#anonymous += 1)}`;
        edges.set(element.id, element);
        if (!model.getEdge(element.id))
          changes.push({ type: 'edge-add', edge: this.#readEdge(element) });
      } else {
        const slot = child.getAttribute('slot') as FlowSlotRegion | null;
        if (slot && (FLOW_SLOT_REGIONS as readonly string[]).includes(slot)) {
          const list = panels.get(slot) ?? [];
          list.push(child);
          panels.set(slot, list);
        }
      }
    }
    for (const id of this.#nodes.keys())
      if (!nodes.has(id) && model.getNode(id)) changes.push({ type: 'node-remove', id });
    for (const id of this.#edges.keys())
      if (!edges.has(id) && model.getEdge(id)) changes.push({ type: 'edge-remove', id });
    this.#nodes.clear();
    for (const [id, element] of nodes) this.#nodes.set(id, element);
    this.#edges.clear();
    for (const [id, element] of edges) this.#edges.set(id, element);
    this.#panels.clear();
    for (const [position, list] of panels) this.#panels.set(position, list);
    if (changes.length) this.#options.adopt(changes);
    this.#options.onChanged();
  }

  /** Writes a node's gesture results back to its authored element (owned attributes only). */
  writeBack(node: FlowNode): void {
    const element = this.#nodes.get(node.id);
    if (!element) return;
    this.#writing = true;
    try {
      element.setAttribute('x', String(node.position.x));
      element.setAttribute('y', String(node.position.y));
      if (node.size) {
        element.setAttribute('width', String(node.size.width));
        element.setAttribute('height', String(node.size.height));
      }
    } finally {
      this.#writing = false;
    }
  }

  #readOne(element: Element): void {
    if (element === this.#options.host) {
      this.scan();
      return;
    }
    const model = this.#options.model();
    if (element.localName === 'tp-flow-node' && this.#nodes.get(element.id) === element) {
      const node = this.#readNode(element as TpFlowNode);
      const existing = model.getNode(element.id);
      if (!existing) return;
      const changes: FlowChange[] = [];
      if (existing.position.x !== node.position.x || existing.position.y !== node.position.y)
        changes.push({ type: 'node-position', id: node.id, position: node.position });
      if (JSON.stringify(existing.size) !== JSON.stringify(node.size))
        changes.push({ type: 'node-size', id: node.id, size: node.size });
      if (JSON.stringify(existing.data) !== JSON.stringify(node.data))
        changes.push({ type: 'node-data', id: node.id, data: node.data });
      const patch = omit(node, ['id', 'position', 'data', 'size']);
      changes.push({ type: 'node-update', id: node.id, patch });
      this.#options.adopt(changes);
    } else if (element.localName === 'tp-flow-edge' && this.#edges.get(element.id) === element) {
      const edge = this.#readEdge(element as TpFlowEdge);
      if (!model.getEdge(element.id)) return;
      const patch = omit(edge, ['id', 'waypoints']);
      this.#options.adopt([
        { type: 'edge-update', id: edge.id, patch },
        { type: 'edge-waypoints', id: edge.id, waypoints: edge.waypoints },
      ]);
    } else if (element.parentElement === this.#options.host) {
      this.scan();
    }
  }

  #readNode(element: TpFlowNode): FlowNode {
    const node: FlowNode = {
      id: element.id,
      type: element.getAttribute('type') ?? '',
      position: {
        x: number(element.getAttribute('x'), 0),
        y: number(element.getAttribute('y'), 0),
      },
      data: json(element.getAttribute('data')),
    };
    const width = element.getAttribute('width');
    const height = element.getAttribute('height');
    if (width !== null && height !== null)
      node.size = { width: number(width, 0), height: number(height, 0) };
    const parent = element.getAttribute('parent');
    if (parent) node.parentId = parent;
    const label = element.getAttribute('label');
    if (label !== null) node.label = label;
    if (element.hasAttribute('pinned')) node.pinned = true;
    if (element.hasAttribute('hidden')) node.hidden = true;
    for (const flag of NODE_FLAGS) {
      const value = element.getAttribute(flag);
      if (value === 'false') node[flag] = false;
      else if (value !== null) node[flag] = true;
    }
    return node;
  }

  #readEdge(element: TpFlowEdge): FlowEdge {
    const edge: FlowEdge = {
      id: element.id,
      source: element.getAttribute('source') ?? '',
      target: element.getAttribute('target') ?? '',
    };
    const sourcePort = element.getAttribute('source-port');
    if (sourcePort) edge.sourcePort = sourcePort;
    const targetPort = element.getAttribute('target-port');
    if (targetPort) edge.targetPort = targetPort;
    const kind = element.getAttribute('kind') as FlowEdgeKind | null;
    if (kind) edge.kind = kind;
    const label = element.getAttribute('label');
    if (label) edge.label = label;
    if (element.hasAttribute('animated')) edge.animated = true;
    if (element.hasAttribute('hidden')) edge.hidden = true;
    const points = waypoints(element.getAttribute('waypoints'));
    if (points) edge.waypoints = points;
    const data = element.getAttribute('data');
    if (data) edge.data = json(data);
    const markerStart = element.getAttribute('marker-start') as FlowMarkerType | null;
    if (markerStart) edge.markerStart = markerStart;
    const markerEnd = element.getAttribute('marker-end') as FlowMarkerType | null;
    if (markerEnd) edge.markerEnd = markerEnd;
    return edge;
  }
}
