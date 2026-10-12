import { observeResize } from '../../../foundation/observation.js';
import type { FlowModel } from '../../../foundation/flow/model/model.js';
import type { FlowNode, FlowPortGeometry, FlowSize } from '../../../foundation/flow/types.js';
import type { TpFlowNode } from '../node/node.js';
import type { FlowLod } from '../types.js';

export interface NodeLayerOptions {
  model: () => FlowModel;
  container: () => HTMLElement | null;
  /** The manual slot that shows authored light-DOM hosts. */
  slot: () => HTMLSlotElement | null;
  authored: () => ReadonlyMap<string, TpFlowNode>;
  createHost: () => TpFlowNode;
  /** Writes the node's properties into a host (pooled or authored). */
  bind: (host: TpFlowNode, node: FlowNode) => void;
  zoom: () => number;
  /** Current detail level; low-detail hosts render a shell sized from the model, unmeasured. */
  lod: () => FlowLod;
  onMeasured: (id: string, size: FlowSize, ports: FlowPortGeometry[]) => void;
  onHostAdded?: (host: TpFlowNode, id: string) => void;
  onHostRemoved?: (host: TpFlowNode, id: string) => void;
}

/**
 * The node layer (Widgets 6.3 Anatomy): pooled `tp-flow-node` hosts for the visible model
 * nodes, authored hosts assigned to the manual slot while visible, positions written through
 * the object model, measurement through the shared resize observer, and a roving tab stop.
 */
/** Released hosts kept connected (hidden) for reuse. */
const POOL_SIZE = 64;

export class NodeLayer {
  readonly #options: NodeLayerOptions;
  readonly #hosts = new Map<string, TpFlowNode>();
  readonly #pool: TpFlowNode[] = [];
  readonly #unobserve = new Map<string, () => void>();
  readonly #measured = new Set<string>();
  readonly #pinned = new Set<string>();
  /** Hosts created while the view moved: shells until `upgrade()` renders their full detail. */
  readonly #provisional = new Set<string>();
  #focused: string | undefined;
  #visible = new Set<string>();
  #lastAssigned: TpFlowNode[] = [];

  constructor(options: NodeLayerOptions) {
    this.#options = options;
  }

  get visibleIds(): ReadonlySet<string> {
    return this.#visible;
  }

  get hostCount(): number {
    return this.#hosts.size;
  }

  hostOf(id: string): TpFlowNode | undefined {
    return this.#hosts.get(id);
  }

  /** Detail level of one host: provisional hosts stay shells until upgraded. */
  lodOf(id: string): FlowLod {
    return this.#provisional.has(id) ? 'low' : this.#options.lod();
  }

  get provisionalCount(): number {
    return this.#provisional.size;
  }

  /**
   * Renders the full detail of up to `max` provisional hosts (nearest first is the caller's
   * order of creation); returns how many remain.
   */
  upgrade(max: number): number {
    const model = this.#options.model();
    let count = 0;
    for (const id of [...this.#provisional]) {
      if (count >= max) break;
      this.#provisional.delete(id);
      const host = this.#hosts.get(id);
      const node = model.getNode(id);
      if (!host || !node) continue;
      this.#options.bind(host, node);
      this.position(host, node);
      count += 1;
    }
    return this.#provisional.size;
  }

  idOf(host: Element): string | undefined {
    for (const [id, candidate] of this.#hosts) if (candidate === host) return id;
    return undefined;
  }

  isMeasured(id: string): boolean {
    return this.#measured.has(id);
  }

  /** Ids that stay materialized regardless of culling (focused, dragging, connecting). */
  pin(id: string, pinned: boolean): void {
    if (pinned) this.#pinned.add(id);
    else this.#pinned.delete(id);
  }

  get focusedId(): string | undefined {
    return this.#focused;
  }

  set focusedId(id: string | undefined) {
    if (this.#focused === id) return;
    const previous = this.#focused ? this.#hosts.get(this.#focused) : undefined;
    this.#focused = id;
    if (previous) previous.tabIndex = -1;
    if (id) {
      this.pin(id, true);
      const host = this.#hosts.get(id);
      if (host) host.tabIndex = 0;
    }
  }

  /** Syncs the DOM to the wanted visible set; returns the ids that became materialized. */
  update(wanted: ReadonlySet<string>, options: { provisional?: boolean } = {}): string[] {
    const model = this.#options.model();
    const container = this.#options.container();
    const slot = this.#options.slot();
    if (!container) return [];
    const visible = new Set<string>();
    for (const id of wanted) if (model.getNode(id)) visible.add(id);
    for (const id of this.#pinned) if (model.getNode(id)) visible.add(id);
    const added: string[] = [];
    const authored = this.#options.authored();
    for (const [id, host] of this.#hosts)
      if (!visible.has(id)) {
        this.#release(id, host, authored.has(id));
      }
    const assigned: TpFlowNode[] = [];
    for (const id of visible) {
      const node = model.getNode(id)!;
      let host = this.#hosts.get(id);
      const authoredHost = authored.get(id);
      let created = false;
      if (!host) {
        created = true;
        // While the view moves, nodes enter as shells sized from the model (measured, else the
        // definition's size) and render their detail once it settles; the host box is
        // positioned absolutely, so an upgrade that corrects an unmeasured size moves nothing
        // else. Authored hosts always render their own content.
        if (options.provisional && !authoredHost) this.#provisional.add(id);
        const pooled = authoredHost ? undefined : this.#pool.pop();
        host = authoredHost ?? pooled ?? this.#options.createHost();
        this.#hosts.set(id, host);
        // Pooled hosts stay connected and hidden: re-appending a host reconnects its whole
        // subtree (styles, controllers, ports), an order of magnitude dearer than a rebind.
        if (pooled) pooled.hidden = false;
        else if (!authoredHost && !host.isConnected) container.append(host);
        host.tabIndex = id === this.#focused ? 0 : -1;
        this.#observe(id, host);
        added.push(id);
        this.#options.onHostAdded?.(host, id);
      }
      if (authoredHost) assigned.push(authoredHost);
      if (created) {
        this.#options.bind(host, node);
        this.position(host, node);
      }
    }
    if (
      slot &&
      (assigned.length !== this.#lastAssigned.length ||
        assigned.some((host, index) => host !== this.#lastAssigned[index]))
    ) {
      slot.assign(...assigned);
      this.#lastAssigned = assigned;
    }
    this.#visible = visible;
    return added;
  }

  /** Writes a host's transform and declared size through the object model. */
  position(host: TpFlowNode, node: FlowNode): void {
    const model = this.#options.model();
    const absolute = model.absolutePosition(node.id) ?? node.position;
    const transform = `translate(${absolute.x}px, ${absolute.y}px)`;
    if (host.style.transform !== transform) host.style.transform = transform;
    const size = node.size ?? (this.lodOf(node.id) === 'low' ? model.nodeRect(node.id) : undefined);
    if (size) {
      host.style.inlineSize = `${size.width}px`;
      host.style.blockSize = `${size.height}px`;
    } else {
      host.style.removeProperty('inline-size');
      host.style.removeProperty('block-size');
    }
    host.style.zIndex = String(model.nodeZ(node.id));
    host.hidden = Boolean(node.hidden);
  }

  /** Re-binds the given materialized hosts (or all) after state that they render changed. */
  rebind(ids?: Iterable<string>): void {
    const model = this.#options.model();
    for (const id of ids ?? this.#hosts.keys()) {
      const host = this.#hosts.get(id);
      const node = model.getNode(id);
      if (host && node) {
        this.#options.bind(host, node);
        this.position(host, node);
      }
    }
  }

  /** Re-positions every materialized host (after a batch of model changes). */
  reposition(ids?: Iterable<string>): void {
    const model = this.#options.model();
    for (const id of ids ?? this.#hosts.keys()) {
      const host = this.#hosts.get(id);
      const node = model.getNode(id);
      if (host && node) this.position(host, node);
    }
  }

  /** Re-reads the ports of a host after its content changed (controls, LOD). */
  remeasurePorts(id: string): void {
    const host = this.#hosts.get(id);
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const zoom = this.#options.zoom() || 1;
    this.#options.onMeasured(
      id,
      { width: rect.width / zoom, height: rect.height / zoom },
      host.measurePorts(zoom),
    );
  }

  clear(): void {
    const authored = this.#options.authored();
    for (const [id, host] of [...this.#hosts]) this.#release(id, host, authored.has(id));
    for (const host of this.#pool) host.remove();
    this.#pool.length = 0;
    this.#measured.clear();
    this.#visible = new Set();
    const slot = this.#options.slot();
    if (slot && this.#lastAssigned.length) {
      slot.assign();
      this.#lastAssigned = [];
    }
  }

  #release(id: string, host: TpFlowNode, authored: boolean): void {
    this.#provisional.delete(id);
    this.#unobserve.get(id)?.();
    this.#unobserve.delete(id);
    this.#hosts.delete(id);
    this.#options.onHostRemoved?.(host, id);
    if (authored) return;
    host.node = undefined;
    host.tabIndex = -1;
    if (this.#pool.length < POOL_SIZE) {
      host.hidden = true;
      this.#pool.push(host);
    } else host.remove();
  }

  #observe(id: string, host: TpFlowNode): void {
    this.#unobserve.get(id)?.();
    const release = observeResize(host, (entry) => {
      const box = entry.borderBoxSize?.[0];
      const width = box ? box.inlineSize : entry.contentRect.width;
      const height = box ? box.blockSize : entry.contentRect.height;
      if (!width && !height) return;
      // A low-detail shell fills the box the layer wrote; it carries no measurement.
      if (this.lodOf(id) === 'low') return;
      this.#measured.add(id);
      const zoom = this.#options.zoom() || 1;
      this.#options.onMeasured(id, { width, height }, host.measurePorts(zoom));
    });
    this.#unobserve.set(id, release);
  }
}
