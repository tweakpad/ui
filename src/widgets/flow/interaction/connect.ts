import { edgePath } from '../../../foundation/flow/edges/paths.js';
import { edgeKindOptions } from '../../../foundation/flow/defaults.js';
import type { FlowPortHit } from '../../../foundation/flow/model/model.js';
import type {
  FlowConnection,
  FlowEndpoint,
  FlowNode,
  FlowPoint,
  FlowResolvedPort,
  FlowSide,
} from '../../../foundation/flow/types.js';
import type { FlowPortDirection } from '../../../foundation/flow/edges/endpoints.js';
import { fillTemplate } from '../../../foundation/template.js';
import type { FlowInteractionHost } from './host.js';

export interface ConnectionStart {
  nodeId: string;
  portId: string | undefined;
  direction: FlowPortDirection;
  /** Reconnecting an existing edge's end instead of adding an edge. */
  reconnect?: { edgeId: string; end: 'source' | 'target' } | undefined;
}

const OPPOSITE: Record<FlowSide, FlowSide> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

/** Candidates considered by the keyboard cycle (nearest first). */
const KEYBOARD_CANDIDATES = 64;

/**
 * A connection gesture (Widgets §6.3 Keyboard and pointer: connection): from a port press,
 * a port click (click-to-connect) or Enter on a port (keyboard connect). The nearest compatible
 * port within `connectionRadius` becomes the candidate, validated through the schema and the
 * consumer predicate; the renderer draws the provisional line; release, a second activation or
 * Enter completes through the root's `connect`/`reconnect`.
 */
export class ConnectionSession {
  readonly kind = 'connect';
  readonly #host: FlowInteractionHost;
  readonly #start: ConnectionStart;
  #mode: 'pointer' | 'click' | 'keyboard' = 'pointer';
  #from: FlowEndpoint | undefined;
  #candidate: FlowPortHit | undefined;
  #connection: FlowConnection | undefined;
  #valid: boolean | undefined;
  #keyboard: { list: FlowPortHit[]; index: number } | undefined;
  #latest: PointerEvent | undefined;
  #unsubscribe: (() => void) | undefined;

  constructor(host: FlowInteractionHost, start: ConnectionStart) {
    this.#host = host;
    this.#start = start;
  }

  get start(): ConnectionStart {
    return this.#start;
  }

  get mode(): 'pointer' | 'click' | 'keyboard' {
    return this.#mode;
  }

  get candidate(): FlowPortHit | undefined {
    return this.#candidate;
  }

  get valid(): boolean | undefined {
    return this.#valid;
  }

  begin(mode: 'pointer' | 'click' | 'keyboard' = 'pointer'): boolean {
    const host = this.#host;
    const node = host.model.getNode(this.#start.nodeId);
    if (!host.editable || !node || node.connectable === false) return false;
    this.#mode = mode;
    this.#from = host.portEndpoint(this.#start.nodeId, this.#start.portId, this.#start.direction);
    if (mode !== 'pointer' && this.#start.portId)
      host.setPortState(this.#start.nodeId, this.#start.portId, { clickConnecting: true });
    this.#draw(this.#from.point, undefined);
    if (mode === 'pointer')
      this.#unsubscribe = host.onViewportTick(() => {
        if (this.#latest) this.moveTo(host.screenToFlow(this.#latest));
      });
    return true;
  }

  /** Pointer movement (pointer and click modes follow the pointer). */
  move(event: PointerEvent): void {
    this.#latest = event;
    const host = this.#host;
    this.moveTo(host.screenToFlow({ x: event.clientX, y: event.clientY }));
    if (this.#mode === 'pointer') host.autoPan(host.paneOffset(event));
  }

  moveTo(point: FlowPoint): void {
    const hit = this.#nearest(point);
    this.#setCandidate(hit);
    this.#draw(hit ? hit.point : point, hit);
  }

  /**
   * A press released on the start port without dragging becomes click-to-connect: the line
   * follows the pointer until a second port press completes or cancels it.
   */
  switchToClick(): void {
    const host = this.#host;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    host.autoPan(null);
    this.#mode = 'click';
    if (this.#start.portId)
      host.setPortState(this.#start.nodeId, this.#start.portId, { clickConnecting: true });
    if (this.#from) this.#draw(this.#from.point, undefined);
  }

  /** Completes on release (pointer mode) or a second activation (click mode). */
  end(event: Event | null, dragged: boolean): boolean {
    const host = this.#host;
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    host.autoPan(null);
    const done = this.#complete(event);
    const dropped = !done && !this.#candidate && dragged && this.#latest;
    const at = dropped
      ? host.screenToFlow({ x: this.#latest!.clientX, y: this.#latest!.clientY })
      : undefined;
    this.#clear();
    if (at) host.openPaletteAt?.(at, this.#start);
    return done;
  }

  /** Completes with the keyboard-focused candidate. */
  confirm(event: Event | null): boolean {
    const focused = this.#keyboard?.list[this.#keyboard.index];
    if (focused) this.#setCandidate(focused);
    return this.end(event, false);
  }

  cancel(): void {
    this.#unsubscribe?.();
    this.#unsubscribe = undefined;
    this.#host.autoPan(null);
    this.#clear();
  }

  /** Moves the keyboard focus through the compatible ports, nearest first. */
  cycle(delta: 1 | -1): FlowPortHit | undefined {
    const host = this.#host;
    if (!this.#keyboard) this.#keyboard = { list: this.#candidates(), index: -1 };
    const list = this.#keyboard.list;
    if (!list.length) return undefined;
    this.#keyboard.index = (this.#keyboard.index + delta + list.length) % list.length;
    const focused = list[this.#keyboard.index]!;
    this.#setCandidate(focused);
    for (const item of list)
      host.setPortState(item.nodeId, item.port.id, {
        candidate: true,
        candidateFocused: item === focused,
        valid: item === focused ? (this.#valid ?? null) : null,
      });
    this.#draw(focused.point, focused);
    host.announce(
      fillTemplate(host.strings.announceCandidate, {
        target: `${host.nodeLabel(focused.nodeId)}: ${host.portLabel(focused.nodeId, focused.port.id)} (${this.#keyboard.index + 1}/${list.length})`,
      }),
    );
    return focused;
  }

  /** Whether a port press belongs to this session's start port (click mode re-press). */
  isStart(nodeId: string, portId: string | undefined): boolean {
    return this.#start.nodeId === nodeId && this.#start.portId === portId;
  }

  /** Completes with an explicitly activated port (click mode second press). */
  completeWith(nodeId: string, portId: string | undefined, event: Event | null): boolean {
    const host = this.#host;
    const port = host.model.ports(nodeId).find((item) => item.id === portId);
    const node = host.model.getNode(nodeId);
    if (!port || !node || !this.#acceptable(port, node)) return false;
    const rect = host.model.nodeRect(nodeId);
    const point = rect
      ? {
          x: rect.x + port.geometry.x + port.geometry.width / 2,
          y: rect.y + port.geometry.y + port.geometry.height / 2,
        }
      : { x: 0, y: 0 };
    this.#setCandidate({ nodeId, port, point, distance: 0 });
    return this.end(event, false);
  }

  #nearest(point: FlowPoint): FlowPortHit | undefined {
    const host = this.#host;
    const radius = host.connectionRadius / Math.max(host.zoom, 0.01);
    return host.model.portNear(point, radius, (port, node) => this.#acceptable(port, node));
  }

  #acceptable(port: FlowResolvedPort, node: FlowNode): boolean {
    const start = this.#start;
    if (port.hidden || node.connectable === false) return false;
    if (node.id === start.nodeId && port.id === start.portId) return false;
    if (this.#host.connectionMode === 'strict' && port.direction === start.direction) return false;
    return true;
  }

  #connectionFor(hit: FlowPortHit): FlowConnection {
    const start = this.#start;
    const startIsSource =
      start.direction === 'output' ||
      (this.#host.connectionMode === 'loose' && hit.port.direction === 'input');
    const connection: FlowConnection = startIsSource
      ? { source: start.nodeId, target: hit.nodeId }
      : { source: hit.nodeId, target: start.nodeId };
    if (startIsSource) {
      if (start.portId !== undefined) connection.sourcePort = start.portId;
      connection.targetPort = hit.port.id;
    } else {
      connection.sourcePort = hit.port.id;
      if (start.portId !== undefined) connection.targetPort = start.portId;
    }
    return connection;
  }

  #setCandidate(hit: FlowPortHit | undefined): void {
    const host = this.#host;
    const previous = this.#candidate;
    if (previous && (!hit || previous.nodeId !== hit.nodeId || previous.port.id !== hit.port.id)) {
      if (!this.#keyboard) host.setPortState(previous.nodeId, previous.port.id, null);
    }
    this.#candidate = hit;
    if (!hit) {
      this.#connection = undefined;
      this.#valid = undefined;
      return;
    }
    const connection = this.#connectionFor(hit);
    const verdict = host.validateConnection(connection, this.#start.reconnect?.edgeId);
    this.#connection = connection;
    this.#valid = verdict.valid;
    host.setPortState(hit.nodeId, hit.port.id, {
      candidate: true,
      valid: verdict.valid,
      ...(this.#keyboard ? { candidateFocused: true } : {}),
    });
  }

  #draw(to: FlowPoint, hit: FlowPortHit | undefined): void {
    const host = this.#host;
    const from = this.#from;
    if (!from) return;
    const kind = host.edgeKind();
    const toSide = hit ? hit.port.geometry.side : OPPOSITE[from.side];
    const path = edgePath(
      kind === 'orthogonal' ? 'smoothstep' : kind,
      { point: from.point, side: from.side },
      { point: to, side: toSide },
      edgeKindOptions(kind),
    );
    host.setConnectionLine({
      from: from.point,
      fromSide: from.side,
      to,
      toSide,
      kind,
      path,
      ...(this.#valid !== undefined ? { valid: this.#valid } : {}),
      ...(hit ? { candidate: { nodeId: hit.nodeId, portId: hit.port.id } } : {}),
    });
  }

  #complete(event: Event | null): boolean {
    const host = this.#host;
    const connection = this.#connection;
    if (!connection || !this.#valid) return false;
    const reconnect = this.#start.reconnect;
    if (reconnect)
      return host.reconnect(reconnect.edgeId, reconnect.end, connection, event ?? undefined);
    return host.connect(connection, {}, 'connect', event ?? undefined) !== undefined;
  }

  #clear(): void {
    const host = this.#host;
    host.clearPortStates();
    host.setConnectionLine(null);
    this.#candidate = undefined;
    this.#connection = undefined;
    this.#valid = undefined;
    this.#keyboard = undefined;
    this.#latest = undefined;
  }

  #candidates(): FlowPortHit[] {
    const host = this.#host;
    const from = this.#from;
    if (!from) return [];
    const hits: FlowPortHit[] = [];
    for (const node of host.model.nodes) {
      if (node.hidden) continue;
      const rect = host.model.nodeRect(node.id);
      if (!rect) continue;
      for (const port of host.model.ports(node.id)) {
        if (!this.#acceptable(port, node)) continue;
        const point = {
          x: rect.x + port.geometry.x + port.geometry.width / 2,
          y: rect.y + port.geometry.y + port.geometry.height / 2,
        };
        const hit: FlowPortHit = {
          nodeId: node.id,
          port,
          point,
          distance: Math.hypot(point.x - from.point.x, point.y - from.point.y),
        };
        if (host.validateConnection(this.#connectionFor(hit), this.#start.reconnect?.edgeId).valid)
          hits.push(hit);
      }
    }
    hits.sort((a, b) => a.distance - b.distance);
    return hits.slice(0, KEYBOARD_CANDIDATES);
  }
}
