import type { FlowPoint, FlowRect, FlowSelection } from '../../../foundation/flow/types.js';
import type { PointerDragCancelReason } from '../../../foundation/pointer-drag.js';
import type { FlowInteractionHost } from './host.js';

function rectBetween(a: FlowPoint, b: FlowPoint): FlowRect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

function sameList(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((item, index) => item === b[index]);
}

/**
 * Rubber-band selection on the empty pane (Widgets §6.3 Keyboard and pointer: marquee). The
 * selection lane updates live with `reason: 'selection'`; Shift extends the selection present at
 * the press; Escape restores it.
 */
export class MarqueeSession {
  readonly kind = 'marquee';
  readonly #host: FlowInteractionHost;
  #origin: FlowPoint = { x: 0, y: 0 };
  #originPane: FlowPoint = { x: 0, y: 0 };
  #initial: FlowSelection = { nodes: [], edges: [] };
  #additive = false;
  #active = false;

  constructor(host: FlowInteractionHost) {
    this.#host = host;
  }

  get active(): boolean {
    return this.#active;
  }

  begin(event: PointerEvent): boolean {
    const host = this.#host;
    if (host.disabled) return false;
    this.#origin = host.screenToFlow({ x: event.clientX, y: event.clientY });
    this.#originPane = host.paneOffset(event);
    this.#initial = { nodes: [...host.selection.nodes], edges: [...host.selection.edges] };
    this.#additive = event.shiftKey;
    return true;
  }

  move(event: PointerEvent): void {
    const host = this.#host;
    this.#active = true;
    const now = host.screenToFlow({ x: event.clientX, y: event.clientY });
    const pane = host.paneOffset(event);
    host.setMarquee(rectBetween(this.#originPane, pane));
    host.autoPan(pane);
    const rect = rectBetween(this.#origin, now);
    const hit = host.model.nodesInRect(rect, host.selectionMode === 'partial');
    const nodes = this.#additive ? [...new Set([...this.#initial.nodes, ...hit])] : hit;
    const set = new Set(nodes);
    const edges = host.model.edges
      .filter((edge) => set.has(edge.source) && set.has(edge.target))
      .map((edge) => edge.id);
    const current = host.selection;
    if (sameList(current.nodes, nodes) && sameList(current.edges, edges)) return;
    host.setSelection({ nodes, edges }, 'selection', event, { surface: 'pane' });
  }

  end(): void {
    const host = this.#host;
    host.setMarquee(null);
    host.autoPan(null);
    this.#active = false;
  }

  cancel(reason: PointerDragCancelReason, event: Event | null): void {
    const host = this.#host;
    host.setMarquee(null);
    host.autoPan(null);
    if (!this.#active) return;
    this.#active = false;
    host.setSelection(
      this.#initial,
      reason === 'escape' ? 'escape-key' : 'pointer',
      event ?? undefined,
      { surface: 'pane' },
    );
  }
}
