import { css, html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { applyKeyboardStep, stepForKey } from '../../../foundation/dimension-step.js';
import type { FlowEdgeKind, FlowPoint, FlowSide } from '../../../foundation/flow/types.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { resolveStrings } from '../strings.js';
import type { FlowGesturePhase, FlowStrings } from '../types.js';

export const EDGE_WAYPOINT = 'flow-edge-waypoint';
export const EDGE_WAYPOINT_REMOVE = 'flow-edge-waypoint-remove';
export const EDGE_SEGMENT = 'flow-edge-segment';
export const EDGE_RECONNECT = 'flow-edge-reconnect';
/** Enter or Space on a reconnect anchor; the root cancels it when it handles the key. */
export const EDGE_RECONNECT_KEY = 'flow-edge-reconnect-key';

export interface FlowEdgeWaypointDetail {
  index: number;
  /** Flow units. */
  point: FlowPoint;
  phase: FlowGesturePhase;
  input: 'pointer' | 'keyboard';
  sourceEvent: Event | null;
}
export interface FlowEdgeWaypointRemoveDetail {
  index: number;
  sourceEvent: Event;
}
export interface FlowEdgeSegmentDetail {
  /** Index of the segment's first point in `points`. */
  index: number;
  /** Displacement along the segment normal, flow units. */
  offset: number;
  /** The axis the segment moves along (`x` for vertical segments). */
  axis: 'x' | 'y';
  phase: FlowGesturePhase;
  input: 'pointer' | 'keyboard';
  sourceEvent: Event | null;
}
export interface FlowEdgeReconnectKeyDetail {
  end: 'source' | 'target';
  sourceEvent: KeyboardEvent;
}
export interface FlowEdgeReconnectDetail {
  end: 'source' | 'target';
  /** Pointer position in flow units. */
  point: FlowPoint;
  phase: FlowGesturePhase;
  sourceEvent: Event | null;
}

type Axis = 'x' | 'y';
interface Segment {
  index: number;
  axis: Axis;
  midpoint: FlowPoint;
}
type Target =
  | { kind: 'waypoint'; index: number }
  | { kind: 'segment'; index: number; axis: Axis }
  | { kind: 'reconnect'; end: 'source' | 'target' };

/** Outward unit vector of each socket side: a reconnect anchor sits on the edge beyond it. */
const SIDE_NORMAL: Record<FlowSide, FlowPoint> = {
  top: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};
/** Segments shorter than this (flow units) get no handle. */
const MIN_SEGMENT = 24;
const COORDINATE_LIMIT = 1_000_000;

const editorStyles = css`
  :host {
    display: block;
    position: absolute;
    inset: 0 auto auto 0;
    inline-size: 0;
    block-size: 0;
    overflow: visible;
    pointer-events: none;

    --_tp-flow-zoom: 1;
  }

  :host([hidden]) {
    display: none;
  }

  .anchor {
    position: absolute;
    inline-size: 0;
    block-size: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: visible;

    /* Handles keep their screen size inside the zoomed viewport layer. */
    scale: calc(1 / var(--_tp-flow-zoom));
  }

  .waypoint,
  .segment,
  .reconnect {
    position: relative;
    flex: none;
    pointer-events: auto;
    touch-action: none;
    margin: 0;
    padding: 0;
    appearance: none;
    font: inherit;
  }

  .dimension {
    position: absolute;
    inset: 0;
    inline-size: 100%;
    block-size: 100%;
    margin: 0;
    opacity: 0;
    pointer-events: none;
  }

  /* xyflow EdgeAnchor: an invisible circle shifted outward by its radius, so it covers the edge
     where it leaves the socket and never the socket itself (which keeps starting new
     connections). Coarse pointers raise it to the minimum target. */
  .reconnect {
    --_tp-flow-reconnect-size: max(var(--tp-space-5), var(--_tp-coarse-target, 0px));

    inline-size: var(--_tp-flow-reconnect-size);
    block-size: var(--_tp-flow-reconnect-size);
    border-radius: 50%;
    translate: calc(var(--_tp-flow-reconnect-x, 0) * var(--_tp-flow-reconnect-size) / 2)
      calc(var(--_tp-flow-reconnect-y, 0) * var(--_tp-flow-reconnect-size) / 2);
  }

  :host(:not([editable])) .waypoint,
  :host(:not([editable])) .segment {
    display: none;
  }
`;

/**
 * The edge editor (Widgets 6.3 Anatomy): the handles of the selected edge, rendered in flow
 * coordinates inside the viewport layer. Every waypoint is a thumb carrying two dimension
 * inputs (horizontal and vertical) so the keyboard nudges it (`stepForKey`) and Delete removes
 * it; orthogonal kinds add a midpoint handle per axis-aligned segment that moves along its
 * normal; the ends carry reconnect anchors when the edge allows it. Each handle runs one
 * pointer-capture drag (a lost capture settles at the last position); positions are reported
 * in flow units through `flow-edge-waypoint`, `flow-edge-segment` and `flow-edge-reconnect`.
 */
export class TpFlowEdgeEditor extends TpElement {
  static tagName = 'tp-flow-edge-editor';
  static override presentation = flowPresentation;
  static override properties = {
    ...TpElement.properties,
    edgeId: { type: String, attribute: 'edge-id' },
    points: { attribute: false },
    waypoints: { attribute: false },
    kind: { type: String, reflect: true },
    zoom: { type: Number },
    editable: { type: Boolean, reflect: true },
    reconnectable: { attribute: false },
    routed: { type: Boolean },
    sourceSide: { attribute: false },
    targetSide: { attribute: false },
    strings: { attribute: false },
    step: { type: Number },
    bigStep: { type: Number, attribute: 'big-step' },
    label: { type: String },
  };
  static override styles = [TpElement.styles, editorStyles];

  edgeId = '';
  /** The rendered path's points in flow units (polyline for orthogonal kinds, ends for others). */
  points: readonly FlowPoint[] = [];
  waypoints: readonly FlowPoint[] = [];
  kind: FlowEdgeKind = 'smoothstep';
  zoom = 1;
  editable = true;
  reconnectable: boolean | 'source' | 'target' = true;
  /**
   * The path came from the obstacle-aware router: only a routed path follows waypoints, so
   * only it gets segment handles (Widgets §6.3: segment handles for orthogonal edges).
   */
  routed = false;
  /** The sides the edge leaves its sockets from; the reconnect anchors sit beyond them. */
  sourceSide: FlowSide = 'right';
  targetSide: FlowSide = 'left';
  strings: Partial<FlowStrings> | undefined;
  /** Keyboard nudge in flow units. */
  step = 1;
  bigStep = 10;
  /** The edge's accessible label, prefixed to the handle names. */
  label = '';

  readonly #drags = new Map<HTMLElement, PointerDrag>();
  #session: { target: Target; origin: FlowPoint; press: FlowPoint } | undefined;
  /**
   * The selected handle (`waypoint:1`, `segment:2`): the one holding focus, whether a press or
   * the keyboard put it there. It is the handle Delete and the arrow keys act on, so it shows.
   */
  #selected: string | undefined;

  // Listened to on the shadow root: a focus move between two handles stays inside it, and the
  // host never sees that focusin (its related target retargets to the host itself).
  #focusOut = (): void => {
    // Focus is still on the old handle while focusout runs.
    queueMicrotask(this.#focusChanged);
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderRoot.addEventListener('focusin', this.#focusChanged);
    this.renderRoot.addEventListener('focusout', this.#focusOut);
  }

  #focusChanged = (): void => {
    const active = this.shadowRoot?.activeElement;
    const handle =
      active instanceof Element
        ? active.closest<HTMLElement>('[data-handle="waypoint"], [data-handle="segment"]')
        : null;
    const selected = handle ? `${handle.dataset['handle']}:${handle.dataset['index']}` : undefined;
    if (selected === this.#selected) return;
    this.#selected = selected;
    this.requestUpdate();
  };

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  /**
   * The segment handles of a routed path: one per interior axis-aligned segment long enough to
   * grab. The first and last segments end at a socket, so they cannot move along their normal
   * (and their handles would sit under the reconnect anchors).
   */
  get segments(): readonly Segment[] {
    if (!this.routed) return [];
    const segments: Segment[] = [];
    for (let index = 1; index + 2 < this.points.length; index++) {
      const a = this.points[index]!;
      const b = this.points[index + 1]!;
      const dx = Math.abs(b.x - a.x);
      const dy = Math.abs(b.y - a.y);
      if (dx < 0.5 && dy >= MIN_SEGMENT)
        segments.push({ index, axis: 'x', midpoint: { x: a.x, y: (a.y + b.y) / 2 } });
      else if (dy < 0.5 && dx >= MIN_SEGMENT)
        segments.push({ index, axis: 'y', midpoint: { x: (a.x + b.x) / 2, y: a.y } });
    }
    return segments;
  }

  get #reconnectSource(): boolean {
    return this.reconnectable === true || this.reconnectable === 'source';
  }

  get #reconnectTarget(): boolean {
    return this.reconnectable === true || this.reconnectable === 'target';
  }

  /** Focuses a waypoint's horizontal input. */
  focusWaypoint(index: number, options?: FocusOptions): void {
    this.renderRoot
      .querySelector<HTMLElement>(`input[data-waypoint="${index}"][data-axis="x"]`)
      ?.focus(options);
  }

  override disconnectedCallback(): void {
    this.renderRoot.removeEventListener('focusin', this.#focusChanged);
    this.renderRoot.removeEventListener('focusout', this.#focusOut);
    for (const drag of this.#drags.values()) drag.disconnect();
    this.#drags.clear();
    this.#session = undefined;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('zoom'))
      this.style.setProperty('--_tp-flow-zoom', String(Math.max(0.01, this.zoom || 1)));
    this.#syncDrags();
  }

  // ---- pointer -------------------------------------------------------------------------------

  #syncDrags(): void {
    const present = new Set<HTMLElement>();
    for (const handle of this.renderRoot.querySelectorAll<HTMLElement>('[data-handle]')) {
      present.add(handle);
      if (this.#drags.has(handle)) continue;
      const drag = new PointerDrag({
        element: handle,
        threshold: 0,
        disabled: () => this.disabled,
        focusTarget: () => handle.querySelector<HTMLElement>('input') ?? handle,
        handlers: {
          begin: (point, event) => {
            const target = this.#target(handle);
            const origin = this.#origin(target);
            if (!target || !origin) return false;
            // Screen coordinates: the handle moves with the gesture, so element-relative
            // points would drift.
            this.#session = { target, origin, press: { x: event.clientX, y: event.clientY } };
            handle.toggleAttribute('data-dragging', true);
            this.#report(target, origin, 'start', event, 'pointer');
            return true;
          },
          move: (point, event) => this.#movePointer(point, 'move', event),
          end: (point, event, dragged) => {
            const session = this.#session;
            this.#session = undefined;
            handle.toggleAttribute('data-dragging', false);
            if (!session) return;
            // A press released without moving only focuses the handle: it changes nothing.
            if (dragged) this.#movePointer(point, 'end', event, session);
            else this.#report(session.target, session.origin, 'cancel', event, 'pointer');
          },
          cancel: (_reason, event) => {
            const session = this.#session;
            this.#session = undefined;
            handle.toggleAttribute('data-dragging', false);
            if (session) this.#report(session.target, session.origin, 'cancel', event, 'pointer');
          },
        },
      });
      drag.connect();
      this.#drags.set(handle, drag);
    }
    for (const [handle, drag] of this.#drags)
      if (!present.has(handle)) {
        drag.disconnect();
        this.#drags.delete(handle);
      }
  }

  #target(handle: HTMLElement): Target | null {
    const kind = handle.dataset['handle'];
    if (kind === 'waypoint') return { kind, index: Number(handle.dataset['index']) };
    if (kind === 'segment')
      return { kind, index: Number(handle.dataset['index']), axis: handle.dataset['axis'] as Axis };
    if (kind === 'reconnect') return { kind, end: handle.dataset['end'] as 'source' | 'target' };
    return null;
  }

  /** The handle's flow position before the gesture. */
  #origin(target: Target | null): FlowPoint | null {
    if (!target) return null;
    if (target.kind === 'waypoint') {
      const point = this.waypoints[target.index];
      return point ? { ...point } : null;
    }
    if (target.kind === 'segment') {
      const segment = this.segments.find((candidate) => candidate.index === target.index);
      return segment ? { ...segment.midpoint } : null;
    }
    const point = target.end === 'source' ? this.points[0] : this.points[this.points.length - 1];
    return point ? { ...point } : null;
  }

  #movePointer(
    _point: PointerDragPoint,
    phase: 'move' | 'end',
    event: PointerEvent,
    session = this.#session,
  ): void {
    if (!session) return;
    const zoom = Math.max(0.01, this.zoom || 1);
    const current = {
      x: session.origin.x + (event.clientX - session.press.x) / zoom,
      y: session.origin.y + (event.clientY - session.press.y) / zoom,
    };
    this.#report(session.target, current, phase, event, 'pointer', session.origin);
  }

  #report(
    target: Target,
    point: FlowPoint,
    phase: FlowGesturePhase,
    sourceEvent: Event | null,
    input: 'pointer' | 'keyboard',
    origin: FlowPoint = point,
  ): void {
    if (target.kind === 'waypoint') {
      this.dispatchEvent(
        new CustomEvent<FlowEdgeWaypointDetail>(EDGE_WAYPOINT, {
          bubbles: true,
          composed: false,
          detail: { index: target.index, point, phase, input, sourceEvent },
        }),
      );
    } else if (target.kind === 'segment') {
      const offset = target.axis === 'x' ? point.x - origin.x : point.y - origin.y;
      this.dispatchEvent(
        new CustomEvent<FlowEdgeSegmentDetail>(EDGE_SEGMENT, {
          bubbles: true,
          composed: false,
          detail: { index: target.index, offset, axis: target.axis, phase, input, sourceEvent },
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent<FlowEdgeReconnectDetail>(EDGE_RECONNECT, {
          bubbles: true,
          composed: false,
          detail: { end: target.end, point, phase, sourceEvent },
        }),
      );
    }
  }

  // ---- keyboard ------------------------------------------------------------------------------

  #definition() {
    return {
      min: -COORDINATE_LIMIT,
      max: COORDINATE_LIMIT,
      step: this.step,
      smallStep: this.step,
      largeStep: this.bigStep,
    };
  }

  #waypointKeyDown = (event: KeyboardEvent): void => {
    if (this.disabled || !this.editable) return;
    const input = event.currentTarget as HTMLInputElement;
    const index = Number(input.dataset['waypoint']);
    const point = this.waypoints[index];
    if (!point) return;
    if (event.key === 'Delete' || event.key === 'Backspace') {
      event.preventDefault();
      this.dispatchEvent(
        new CustomEvent<FlowEdgeWaypointRemoveDetail>(EDGE_WAYPOINT_REMOVE, {
          bubbles: true,
          composed: false,
          detail: { index, sourceEvent: event },
        }),
      );
      return;
    }
    const definition = this.#definition();
    const horizontal = stepForKey(event, {
      definition,
      axis: 'horizontal',
      direction: 'ltr',
      angular: true,
    });
    const vertical = stepForKey(event, { definition, axis: 'vertical', direction: 'ltr' });
    if (!horizontal && !vertical) return;
    event.preventDefault();
    const next = {
      x: horizontal ? applyKeyboardStep(point.x, horizontal, definition) : point.x,
      // Screen y grows downward: an up arrow (positive step) moves the point up.
      y: vertical ? point.y - applyKeyboardStep(0, vertical, definition) : point.y,
    };
    const target: Target = { kind: 'waypoint', index };
    this.#report(target, point, 'start', event, 'keyboard');
    this.#report(target, next, 'move', event, 'keyboard');
    this.#report(target, next, 'end', event, 'keyboard');
  };

  #segmentKeyDown = (event: KeyboardEvent): void => {
    if (this.disabled || !this.editable) return;
    const handle = event.currentTarget as HTMLElement;
    const target = this.#target(handle);
    const origin = this.#origin(target);
    if (!target || target.kind !== 'segment' || !origin) return;
    const definition = this.#definition();
    const step = stepForKey(event, {
      definition,
      axis: target.axis === 'x' ? 'horizontal' : 'vertical',
      direction: 'ltr',
      angular: true,
    });
    if (!step) return;
    event.preventDefault();
    const amount = applyKeyboardStep(0, step, definition);
    const next =
      target.axis === 'x'
        ? { x: origin.x + amount, y: origin.y }
        : { x: origin.x, y: origin.y - amount };
    this.#report(target, origin, 'start', event, 'keyboard', origin);
    this.#report(target, next, 'move', event, 'keyboard', origin);
    this.#report(target, next, 'end', event, 'keyboard', origin);
  };

  #reconnectKeyDown = (event: KeyboardEvent): void => {
    if (this.disabled || (event.key !== 'Enter' && event.key !== ' ')) return;
    const end = (event.currentTarget as HTMLElement).dataset['end'] as 'source' | 'target';
    const started = !this.dispatchEvent(
      new CustomEvent<FlowEdgeReconnectKeyDetail>(EDGE_RECONNECT_KEY, {
        bubbles: true,
        composed: false,
        cancelable: true,
        detail: { end, sourceEvent: event },
      }),
    );
    // The root handled the key (started, confirmed or cancelled a reconnect): the button keeps it.
    if (started) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  #restoreInput = (event: Event): void => {
    // The widget owns the value; the native default of a range key never publishes.
    const input = event.currentTarget as HTMLInputElement;
    input.value = input.getAttribute('aria-valuenow') ?? input.value;
  };

  // ---- render --------------------------------------------------------------------------------

  #dimensionInput(index: number, axis: Axis, value: number, name: string): TemplateResult {
    const rounded = Math.round(value * 100) / 100;
    return html`<input
      type="range"
      class="dimension"
      data-waypoint=${index}
      data-axis=${axis}
      .min=${String(-COORDINATE_LIMIT)}
      .max=${String(COORDINATE_LIMIT)}
      .step=${String(this.step)}
      .value=${String(rounded)}
      .disabled=${this.disabled}
      tabindex=${this.disabled ? -1 : 0}
      aria-label=${name}
      aria-valuemin=${-COORDINATE_LIMIT}
      aria-valuemax=${COORDINATE_LIMIT}
      aria-valuenow=${rounded}
      aria-valuetext=${`${rounded} px`}
      aria-orientation=${axis === 'x' ? 'horizontal' : 'vertical'}
      @keydown=${this.#waypointKeyDown}
      @input=${this.#restoreInput}
    />`;
  }

  #anchor(point: FlowPoint, content: unknown): TemplateResult {
    return html`<span class="anchor" style=${`left:${point.x}px;top:${point.y}px`}
      >${content}</span
    >`;
  }

  #renderWaypoint(point: FlowPoint, index: number): TemplateResult {
    const strings = this.#strings;
    const name = `${this.label ? `${this.label}: ` : ''}${strings.waypoint} ${index + 1}`;
    const handle = this.renderPart(
      'flow-edge-waypoint',
      { index, x: point.x, y: point.y },
      {
        tag: 'span',
        properties: {
          part: 'flow-edge-waypoint',
          class: 'waypoint',
          'data-handle': 'waypoint',
          'data-index': String(index),
          'data-edge': this.edgeId,
          'data-selected': this.#selected === `waypoint:${index}`,
        },
        content: html`${this.#dimensionInput(index, 'x', point.x, `${name} ${strings.horizontal}`)}${this.#dimensionInput(index, 'y', point.y, `${name} ${strings.vertical}`)}`,
      },
    );
    return this.#anchor(point, handle);
  }

  #renderSegment(segment: Segment): TemplateResult {
    const strings = this.#strings;
    const name = `${this.label ? `${this.label}: ` : ''}${strings.segment} ${segment.index + 1}`;
    const handle = this.renderPart(
      'flow-edge-segment-handle',
      { index: segment.index, axis: segment.axis },
      {
        tag: 'button',
        properties: {
          part: 'flow-edge-segment-handle',
          class: 'segment',
          type: 'button',
          'data-handle': 'segment',
          'data-index': String(segment.index),
          'data-axis': segment.axis,
          'data-edge': this.edgeId,
          'data-selected': this.#selected === `segment:${segment.index}`,
          'aria-label': name,
          disabled: this.disabled,
          '@keydown': this.#segmentKeyDown,
        },
      },
    );
    return this.#anchor(segment.midpoint, handle);
  }

  #renderReconnect(end: 'source' | 'target', point: FlowPoint): TemplateResult {
    const strings = this.#strings;
    const normal = SIDE_NORMAL[end === 'source' ? this.sourceSide : this.targetSide];
    const name = `${this.label ? `${this.label}: ` : ''}${end === 'source' ? strings.reconnectSource : strings.reconnectTarget}`;
    const handle = this.renderPart(
      'flow-edge-reconnect',
      { end },
      {
        tag: 'button',
        properties: {
          part: 'flow-edge-reconnect',
          class: 'reconnect',
          type: 'button',
          'data-handle': 'reconnect',
          'data-end': end,
          'data-edge': this.edgeId,
          'aria-label': name,
          disabled: this.disabled,
          style: {
            '--_tp-flow-reconnect-x': String(normal.x),
            '--_tp-flow-reconnect-y': String(normal.y),
          },
          '@keydown': this.#reconnectKeyDown,
        },
      },
    );
    return this.#anchor(point, handle);
  }

  protected override render() {
    const first = this.points[0];
    const last = this.points[this.points.length - 1];
    return html`${this.editable ? this.waypoints.map((point, index) => this.#renderWaypoint(point, index)) : nothing}${this.editable ? this.segments.map((segment) => this.#renderSegment(segment)) : nothing}${first && this.#reconnectSource ? this.#renderReconnect('source', first) : nothing}${last && this.points.length > 1 && this.#reconnectTarget ? this.#renderReconnect('target', last) : nothing}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-edge-editor': TpFlowEdgeEditor;
  }
}
