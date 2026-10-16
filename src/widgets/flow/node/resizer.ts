import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { applyKeyboardStep, stepForKey } from '../../../foundation/dimension-step.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { flowPresentation } from '../../../presentation/families/flow.js';
import { resolveStrings } from '../strings.js';
import type { FlowGesturePhase, FlowResizeCorner, FlowStrings } from '../types.js';

export const NODE_RESIZE = 'flow-node-resize';

export interface FlowNodeResizeDetail {
  phase: FlowGesturePhase;
  corner: FlowResizeCorner;
  /** Screen pixels from the press (keyboard: the step). */
  dx: number;
  dy: number;
  shiftKey: boolean;
  altKey: boolean;
  /** `keyboard` for arrow steps, otherwise the pointer. */
  input: 'pointer' | 'keyboard';
  sourceEvent: Event | null;
}

const CORNERS: readonly { corner: FlowResizeCorner; string: keyof FlowStrings }[] = [
  { corner: 'top-left', string: 'resizeTopLeft' },
  { corner: 'top-right', string: 'resizeTopRight' },
  { corner: 'bottom-left', string: 'resizeBottomLeft' },
  { corner: 'bottom-right', string: 'resizeBottomRight' },
];
const EDGES = ['top', 'right', 'bottom', 'left'] as const;

const resizerStyles = css`
  :host {
    display: block;
    position: absolute;
    inset: 0;
    pointer-events: none;
  }

  .resizer {
    position: absolute;
    inset: 0;
  }

  .line {
    position: absolute;
    pointer-events: none;
  }

  .line[data-edge='top'] {
    inset: 0 0 auto;
    block-size: 0;
  }

  .line[data-edge='bottom'] {
    inset: auto 0 0;
    block-size: 0;
  }

  .line[data-edge='left'] {
    inset: 0 auto 0 0;
    inline-size: 0;
  }

  .line[data-edge='right'] {
    inset: 0 0 0 auto;
    inline-size: 0;
  }

  .handle {
    position: absolute;
    margin: 0;
    padding: 0;
    pointer-events: auto;
    touch-action: none;
    translate: -50% -50%;
    appearance: none;
    font: inherit;
  }

  .handle[data-corner='top-left'] {
    inset: 0 auto auto 0;
  }

  .handle[data-corner='top-right'] {
    inset: 0 0 auto auto;
    translate: 50% -50%;
  }

  .handle[data-corner='bottom-left'] {
    inset: auto auto 0 0;
    translate: -50% 50%;
  }

  .handle[data-corner='bottom-right'] {
    inset: auto 0 0 auto;
    translate: 50% 50%;
  }

  :host([disabled]) .handle {
    pointer-events: none;
  }
`;

/**
 * The node resizer (Widgets 6.3 Anatomy): four dashed lines on the node's edges and four
 * focusable corner handles. Each handle runs one pointer-capture drag that reports screen
 * deltas from the press (`flow-node-resize` start/move/end; a lost capture settles at the last
 * position, Escape and pointer cancellation report `cancel`). Arrow keys on a focused handle
 * step by `step` (Shift: `bigStep`) as one move followed by an end.
 */
export class TpFlowNodeResizer extends TpElement {
  static tagName = 'tp-flow-node-resizer';
  static override presentation = flowPresentation;
  static override properties = {
    ...TpElement.properties,
    step: { type: Number },
    bigStep: { type: Number, attribute: 'big-step' },
    strings: { attribute: false },
    nodeLabel: { type: String, attribute: 'node-label' },
  };
  static override styles = [TpElement.styles, resizerStyles];

  /** Keyboard step in screen pixels. */
  step = 1;
  /** Shift keyboard step in screen pixels. */
  bigStep = 10;
  strings: Partial<FlowStrings> | undefined;
  /** Prefixes the handle names ("Webhook: Resize top-left"). */
  nodeLabel = '';

  readonly #drags = new Map<FlowResizeCorner, PointerDrag>();
  #pressed: { corner: FlowResizeCorner; x: number; y: number } | undefined;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    const host = root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
    const owner = host?.getRootNode();
    return owner instanceof ShadowRoot ? (owner.host as HTMLElement) : host;
  }

  get #strings(): FlowStrings {
    return resolveStrings(this.strings);
  }

  /** True while a pointer drag is in progress. */
  get dragging(): boolean {
    return this.#pressed !== undefined;
  }

  override focus(options?: FocusOptions): void {
    const handle = this.renderRoot.querySelector<HTMLElement>('.handle');
    if (handle) handle.focus(options);
    else super.focus(options);
  }

  override disconnectedCallback(): void {
    for (const drag of this.#drags.values()) drag.disconnect();
    this.#drags.clear();
    super.disconnectedCallback();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    for (const handle of this.renderRoot.querySelectorAll<HTMLButtonElement>('.handle')) {
      const corner = handle.dataset['corner'] as FlowResizeCorner;
      const drag = new PointerDrag({
        element: handle,
        threshold: 0,
        disabled: () => this.disabled,
        focusTarget: () => handle,
        handlers: {
          begin: (point, event) => {
            // Screen coordinates: the handle moves with the box, element-relative points drift.
            this.#pressed = { corner, x: event.clientX, y: event.clientY };
            handle.toggleAttribute('data-dragging', true);
            this.#emit('start', corner, 0, 0, event, 'pointer');
            return true;
          },
          move: (point, event) => this.#emitPoint('move', corner, point, event),
          end: (point, event) => {
            this.#emitPoint('end', corner, point, event);
            this.#pressed = undefined;
            handle.toggleAttribute('data-dragging', false);
          },
          cancel: (_reason, event) => {
            this.#pressed = undefined;
            handle.toggleAttribute('data-dragging', false);
            this.#emit('cancel', corner, 0, 0, event, 'pointer');
          },
        },
      });
      drag.connect();
      this.#drags.set(corner, drag);
    }
  }

  #emitPoint(
    phase: FlowGesturePhase,
    corner: FlowResizeCorner,
    point: PointerDragPoint,
    event: PointerEvent,
  ): void {
    const pressed = this.#pressed;
    if (!pressed || pressed.corner !== corner) return;
    this.#emit(
      phase,
      corner,
      event.clientX - pressed.x,
      event.clientY - pressed.y,
      event,
      'pointer',
    );
  }

  #emit(
    phase: FlowGesturePhase,
    corner: FlowResizeCorner,
    dx: number,
    dy: number,
    sourceEvent: Event | null,
    input: 'pointer' | 'keyboard',
  ): void {
    const modifiers = sourceEvent as (Event & { shiftKey?: boolean; altKey?: boolean }) | null;
    this.emit<FlowNodeResizeDetail>(
      NODE_RESIZE,
      {
        phase,
        corner,
        dx,
        dy,
        shiftKey: !!modifiers?.shiftKey,
        altKey: !!modifiers?.altKey,
        input,
        sourceEvent,
      },
      { composed: false },
    );
  }

  #keyDown = (event: KeyboardEvent): void => {
    if (this.disabled) return;
    const handle = event.currentTarget as HTMLElement;
    const corner = handle.dataset['corner'] as FlowResizeCorner;
    if (event.key === 'Escape') {
      // A pointer drag in progress is abandoned by its own Escape listener.
      if (!this.#pressed) this.#emit('cancel', corner, 0, 0, event, 'keyboard');
      return;
    }
    const definition = {
      min: -Infinity,
      max: Infinity,
      step: this.step,
      smallStep: this.step,
      largeStep: this.bigStep,
    };
    const horizontal = stepForKey(event, {
      definition,
      axis: 'horizontal',
      direction: 'ltr',
      angular: true,
    });
    const vertical = stepForKey(event, { definition, axis: 'vertical', direction: 'ltr' });
    if (!horizontal && !vertical) return;
    event.preventDefault();
    const dx = horizontal ? applyKeyboardStep(0, horizontal, definition) : 0;
    // Arrow down grows downward on screen: the vertical step model counts up as positive.
    const dy = vertical ? -applyKeyboardStep(0, vertical, definition) : 0;
    this.#emit('start', corner, 0, 0, event, 'keyboard');
    this.#emit('move', corner, dx, dy, event, 'keyboard');
    this.#emit('end', corner, dx, dy, event, 'keyboard');
  };

  protected override render() {
    const strings = this.#strings;
    const prefix = this.nodeLabel ? `${this.nodeLabel}: ` : '';
    return this.renderPart(
      'flow-node-resizer',
      { disabled: this.disabled },
      {
        tag: 'div',
        properties: { part: 'flow-node-resizer', class: 'resizer', 'data-disabled': this.disabled },
        content: html`${EDGES.map(
          (edge) =>
            html`<span
              part="flow-node-resizer-line"
              class="line"
              data-edge=${edge}
              aria-hidden="true"
            ></span>`,
        )}${CORNERS.map(
          ({ corner, string }) =>
            html`<button
              part="flow-node-resizer-handle"
              class="handle"
              type="button"
              data-corner=${corner}
              aria-label=${`${prefix}${strings[string]}`}
              ?disabled=${this.disabled}
              @keydown=${this.#keyDown}
            ></button>`,
        )}`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-node-resizer': TpFlowNodeResizer;
  }
}
