import { snapPoint } from '../../../foundation/flow/geometry.js';
import type { FlowChange, FlowPoint, FlowRect, FlowSize } from '../../../foundation/flow/types.js';
import type { FlowTransaction } from '../../../foundation/flow/model/model.js';
import type { PointerDragCancelReason } from '../../../foundation/pointer-drag.js';
import { format } from '../strings.js';
import type { FlowInteractionHost } from './host.js';

interface DragEntry {
  id: string;
  start: FlowPoint;
  size: FlowSize;
  parent: FlowRect | undefined;
  extent: boolean;
}

/**
 * Moves the pressed node and every other selected draggable node by the same delta (Widgets
 * §6.3 Keyboard and pointer: node drag). Per-frame proposals carry `reason: 'drag'` inside one
 * transaction, so the gesture records one history entry and commits once; Escape and
 * `pointercancel` roll the transaction back with their own reasons; a lost capture settles at
 * the last accepted position.
 */
/**
 * Press selection (xyflow `handleNodeClick`): a press on an unselected node makes it the
 * selection, Shift, Command or Control adding it; a selected node keeps the selection as is.
 * Presses on a node's own controls select it too: they keep the press, the node takes the
 * selection.
 */
export function selectNodeOnPress(
  host: FlowInteractionHost,
  nodeId: string,
  event: PointerEvent,
): void {
  const node = host.model.getNode(nodeId);
  if (!node || node.selectable === false) return;
  const selection = host.selection;
  if (selection.nodes.includes(nodeId)) return;
  const additive = event.shiftKey || event.metaKey || event.ctrlKey;
  host.setSelection(
    {
      nodes: additive ? [...selection.nodes, nodeId] : [nodeId],
      edges: additive ? selection.edges : [],
    },
    'item-press',
    event,
    { surface: 'node' },
  );
}

export class NodeDragSession {
  readonly kind = 'node-drag';
  readonly #host: FlowInteractionHost;
  readonly #primary: string;
  #entries: DragEntry[] = [];
  #pressFlow: FlowPoint = { x: 0, y: 0 };
  #transaction: FlowTransaction | undefined;
  #latest: PointerEvent | undefined;
  #unsubscribe: (() => void) | undefined;

  constructor(host: FlowInteractionHost, nodeId: string) {
    this.#host = host;
    this.#primary = nodeId;
  }

  get ids(): string[] {
    return this.#entries.map((entry) => entry.id);
  }

  get active(): boolean {
    return this.#transaction !== undefined;
  }

  /** Selects on press and snapshots the drag set; false leaves the press to other handlers. */
  begin(event: PointerEvent): boolean {
    const host = this.#host;
    const model = host.model;
    const node = model.getNode(this.#primary);
    if (!node || node.draggable === false || !host.editable) return false;
    selectNodeOnPress(host, this.#primary, event);
    host.setFocusedNode(this.#primary);
    const ids = new Set(
      host.selection.nodes.includes(this.#primary) ? host.selection.nodes : [this.#primary],
    );
    const entries: DragEntry[] = [];
    for (const id of ids) {
      const item = model.getNode(id);
      if (!item || item.draggable === false) continue;
      if (model.ancestors(id).some((ancestor) => ids.has(ancestor))) continue;
      const rect = model.nodeRect(id);
      entries.push({
        id,
        start: { ...item.position },
        size: rect ? { width: rect.width, height: rect.height } : { width: 0, height: 0 },
        parent: item.parentId ? model.nodeRect(item.parentId) : undefined,
        extent: item.extent === 'parent',
      });
    }
    // The pressed node leads: snapping and the metadata name it.
    entries.sort((a, b) => (a.id === this.#primary ? -1 : b.id === this.#primary ? 1 : 0));
    if (!entries.length) return false;
    this.#entries = entries;
    this.#pressFlow = host.screenToFlow({ x: event.clientX, y: event.clientY });
    return true;
  }

  move(event: PointerEvent): void {
    const host = this.#host;
    this.#latest = event;
    if (!this.#transaction) {
      this.#transaction = host.transaction('move');
      host.setDragging(this.ids, true);
      this.#unsubscribe = host.onViewportTick(() => {
        if (this.#latest && this.#transaction) this.#apply(this.#latest, true);
      });
    }
    host.autoPan(host.paneOffset(event));
    this.#apply(event, true);
  }

  #apply(event: PointerEvent, dragging: boolean): void {
    const host = this.#host;
    const transaction = this.#transaction;
    if (!transaction) return;
    const now = host.screenToFlow({ x: event.clientX, y: event.clientY });
    let delta = { x: now.x - this.#pressFlow.x, y: now.y - this.#pressFlow.y };
    if (host.snap && host.snapGrid > 0) {
      const lead = this.#entries[0]!;
      const target = snapPoint({ x: lead.start.x + delta.x, y: lead.start.y + delta.y }, [
        host.snapGrid,
        host.snapGrid,
      ]);
      delta = { x: target.x - lead.start.x, y: target.y - lead.start.y };
    }
    const changes: FlowChange[] = this.#entries.map((entry) => {
      let x = entry.start.x + delta.x;
      let y = entry.start.y + delta.y;
      if (entry.extent && entry.parent) {
        x = Math.min(Math.max(0, x), Math.max(0, entry.parent.width - entry.size.width));
        y = Math.min(Math.max(0, y), Math.max(0, entry.parent.height - entry.size.height));
      }
      return { type: 'node-position', id: entry.id, position: { x, y }, dragging };
    });
    host.proposeIn(transaction, changes, 'drag', { surface: 'node', nodeId: this.#primary }, event);
  }

  end(event: PointerEvent, dragged: boolean): void {
    const host = this.#host;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    host.autoPan(null);
    const transaction = this.#transaction;
    if (!transaction) return;
    if (dragged) this.#apply(event, false);
    this.#transaction = undefined;
    transaction.commit();
    host.setDragging(this.ids, false);
    host.commit('drag', event, { surface: 'node', nodeId: this.#primary });
    if (dragged) host.settleDrop(this.ids, event);
    const moved = host.model.getNode(this.#primary)?.position;
    host.announce(
      format(host.strings.announceMoved, {
        label: host.nodeLabel(this.#primary),
        x: Math.round(moved?.x ?? 0),
        y: Math.round(moved?.y ?? 0),
      }),
    );
  }

  cancel(reason: PointerDragCancelReason, event: Event | null): void {
    const host = this.#host;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    host.autoPan(null);
    const transaction = this.#transaction;
    this.#transaction = undefined;
    if (!transaction) return;
    host.setDragging(this.ids, false);
    host.rollback(transaction, reason === 'escape' ? 'escape-key' : 'pointer', event);
  }
}
