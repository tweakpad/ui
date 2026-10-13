import { PointerDrag, type PointerDragCancelReason } from '../../../foundation/pointer-drag.js';
import type { FlowInteractionHost } from './host.js';
import { ConnectionSession, type ConnectionStart } from './connect.js';
import { NodeDragSession, selectNodeOnPress } from './drag.js';
import { MarqueeSession } from './marquee.js';

export type FlowPointerSession = NodeDragSession | MarqueeSession | ConnectionSession;

function noDragInPath(event: Event, within: Element): boolean {
  for (const target of event.composedPath()) {
    if (target === within) return false;
    if (target instanceof Element && target.hasAttribute('data-no-drag')) return true;
  }
  return false;
}

/** Presses on panels and overlay controls (toolbar, menu, editor handles) are never gestures. */
function chromeInPath(event: Event, canvas: Element): boolean {
  for (const target of event.composedPath()) {
    if (target === canvas) return false;
    if (!(target instanceof Element)) continue;
    if (target.classList.contains('panel') || target.classList.contains('overlay')) return true;
    if (target.classList.contains('editor')) return true;
    if (target.localName === 'tp-menu') return true;
  }
  return false;
}

/**
 * One delegated `PointerDrag` on the canvas classifies every primary-button press from its
 * composed path (Widgets §6.3 Keyboard and pointer): a port starts a connection, a node host
 * starts a node drag (unless the press landed on an interactive control, a `data-no-drag`
 * element or the pan tool is active), the empty pane starts a marquee in the select tool or
 * with Shift. Declined presses stay with click selection and the pan/zoom owner.
 */
export class FlowPointerArbiter {
  readonly #host: FlowInteractionHost;
  #drag: PointerDrag | undefined;
  #session: FlowPointerSession | undefined;
  /** Element the admitted press focuses (the node host), so keyboard editing continues there. */
  #focusTarget: HTMLElement | null = null;

  constructor(host: FlowInteractionHost) {
    this.#host = host;
  }

  get session(): FlowPointerSession | undefined {
    return this.#session;
  }

  get connection(): ConnectionSession | undefined {
    return this.#session instanceof ConnectionSession ? this.#session : undefined;
  }

  get dragging(): boolean {
    return this.#session instanceof NodeDragSession && this.#session.active;
  }

  get selecting(): boolean {
    return this.#session instanceof MarqueeSession && this.#session.active;
  }

  connect(): void {
    const canvas = this.#host.canvas;
    if (!canvas || this.#drag) return;
    this.#drag = new PointerDrag({
      element: canvas,
      threshold: 3,
      disabled: () => this.#host.disabled,
      focusTarget: () => this.#focusTarget,
      handlers: {
        begin: (_point, event) => this.#begin(event),
        move: (_point, event) => this.#session?.move(event),
        end: (_point, event, dragged) => this.#end(event, dragged),
        cancel: (reason, event) => this.#cancel(reason, event),
      },
    });
    this.#drag.connect();
  }

  disconnect(): void {
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#cancel('disposed', null);
  }

  /** Starts a click-to-connect or keyboard connection outside the pointer gesture. */
  startConnection(
    start: ConnectionStart,
    mode: 'pointer' | 'click' | 'keyboard',
  ): ConnectionSession | undefined {
    if (this.#session) return undefined;
    const session = new ConnectionSession(this.#host, start);
    if (!session.begin(mode)) return undefined;
    this.#session = session;
    return session;
  }

  /** Ends a click or keyboard connection session (completed or not). */
  finishConnection(): void {
    if (this.#session instanceof ConnectionSession) this.#session = undefined;
  }

  cancel(reason: PointerDragCancelReason = 'disposed', event: Event | null = null): void {
    this.#drag?.cancel(reason, event);
    this.#cancel(reason, event);
  }

  #begin(event: PointerEvent): boolean {
    const host = this.#host;
    this.#focusTarget = null;
    if (host.disabled) return false;
    const port = host.portInPath(event);
    const pending = this.connection;
    if (pending && pending.mode === 'click') {
      // Second press of click-to-connect: a port completes (or cancels on the start port),
      // anything else cancels and the press continues as usual.
      this.#session = undefined;
      if (port) {
        if (pending.isStart(port.nodeId, port.portId)) pending.cancel();
        else pending.completeWith(port.nodeId, port.portId, event);
        return false;
      }
      pending.cancel();
    }
    if (this.#session) return false;
    if (port) {
      if (!host.editable || !port.connectable || port.disabled) return false;
      const session = new ConnectionSession(host, {
        nodeId: port.nodeId,
        portId: port.portId,
        direction: port.portDirection,
      });
      if (!session.begin('pointer')) return false;
      this.#session = session;
      // The press prevents the native focus change; the port keeps focus so Escape cancels and
      // Enter confirms a click-to-connect from the keyboard.
      this.#focusTarget = port.button ?? port;
      return true;
    }
    const node = host.nodeHostInPath(event);
    if (node) {
      if (host.tool === 'pan' || !node.nodeId) return false;
      if (host.interactiveInPath(event, node) || noDragInPath(event, node)) {
        // The control keeps the press; the node takes the selection (a click anywhere inside a
        // node selects it), so an edge selected before is let go.
        selectNodeOnPress(host, node.nodeId, event);
        return false;
      }
      const session = new NodeDragSession(host, node.nodeId);
      if (!session.begin(event)) return false;
      this.#session = session;
      this.#focusTarget = node;
      return true;
    }
    if (host.edgeInPath(event)) return false;
    if (
      host.canvas &&
      (chromeInPath(event, host.canvas) || host.interactiveInPath(event, host.canvas))
    )
      return false;
    // Touch on the empty pane belongs to the pan/zoom owner (pan, then pinch with a second finger).
    if (event.pointerType === 'touch') return false;
    if (host.tool === 'select' || event.shiftKey) {
      const session = new MarqueeSession(host);
      if (!session.begin(event)) return false;
      this.#session = session;
      return true;
    }
    return false;
  }

  #end(event: PointerEvent, dragged: boolean): void {
    const session = this.#session;
    if (session instanceof ConnectionSession && !dragged && this.#host.connectOnClick) {
      session.switchToClick();
      return;
    }
    this.#session = undefined;
    if (session instanceof ConnectionSession) session.end(event, dragged);
    else if (session instanceof NodeDragSession) session.end(event, dragged);
    else session?.end();
  }

  #cancel(reason: PointerDragCancelReason, event: Event | null): void {
    const session = this.#session;
    this.#session = undefined;
    session?.cancel(reason, event);
  }
}
