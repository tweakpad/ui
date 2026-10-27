import { arrowKeys } from './collection.js';
import { leaseDragCursor } from './drag-cursor.js';
import { GeneratedStyleResource } from './generated-style.js';

/**
 * Separator behavior for one owner-controlled extent, inside or outside a resizable panel group
 * (Foundation `req-f-resizable-parts`, `req-f-resizable-separator`, `req-f-resizable-pointer`,
 * `req-f-resizable-disabled`, `req-f-resizable-teardown`). The owner keeps the value: it supplies
 * the current value, the limits and the keyboard steps, and receives live and settled proposals.
 * The separator exposes the separator role with its orientation and values, steps with the axis
 * arrows (the inline axis mirrored in right-to-left content) and jumps to the limits with Home and
 * End. A pointer drag captures the pointer, blocks text selection and shows the resize cursor for
 * the document; Escape and pointer cancellation restore the start value; capture, cursor and
 * listeners are released on every terminal path and on dispose.
 */

/** The axis along which the extent grows; a horizontal axis has a vertical separator line. */
export type ResizeSeparatorAxis = 'horizontal' | 'vertical';

/** How far one key press moves the value: Shift and Alt use their own step when given. */
export interface ResizeSeparatorKeySteps {
  readonly step: number;
  /** The step with Shift; the base step when absent. */
  readonly shift?: number | undefined;
  /** The step with Alt; Alt presses are left to the page when absent. */
  readonly alt?: number | undefined;
}

/** A key press resolved for the separator: a signed step, or a jump to a limit. */
export type ResizeSeparatorKeyStep =
  | { readonly kind: 'delta'; readonly amount: number }
  | { readonly kind: 'min' }
  | { readonly kind: 'max' };

export interface ResizeSeparatorKeyOptions {
  readonly axis: ResizeSeparatorAxis;
  readonly direction: 'ltr' | 'rtl';
  readonly steps: ResizeSeparatorKeySteps;
}

/**
 * The step of a key press, or null for a key the separator does not handle: the arrow that points
 * toward the end of the axis grows the extent (mirrored in right-to-left content on the horizontal
 * axis), the opposite arrow shrinks it, Home and End jump to the limits. Control, Meta, composition
 * and Alt without an Alt step are not handled.
 */
export function resizeSeparatorKey(
  event: Pick<KeyboardEvent, 'key' | 'shiftKey' | 'altKey' | 'ctrlKey' | 'metaKey' | 'isComposing'>,
  options: ResizeSeparatorKeyOptions,
): ResizeSeparatorKeyStep | null {
  if (event.isComposing || event.ctrlKey || event.metaKey) return null;
  const { steps } = options;
  if (event.altKey && steps.alt === undefined) return null;
  const amount = event.altKey
    ? steps.alt!
    : event.shiftKey
      ? (steps.shift ?? steps.step)
      : steps.step;
  const { previous, next } = arrowKeys(options.axis, options.direction);
  if (event.key === next) return { kind: 'delta', amount };
  if (event.key === previous) return { kind: 'delta', amount: -amount };
  if (event.key === 'Home') return { kind: 'min' };
  if (event.key === 'End') return { kind: 'max' };
  return null;
}

/** Where a proposal comes from. */
export type ResizeSeparatorSource = 'pointer' | 'keyboard';

/**
 * A proposed value: `live` while a pointer drag moves, `settled` once a drag ends or a key press
 * steps, `cancelled` when a drag is abandoned (the value is then the start value).
 */
export interface ResizeSeparatorProposal {
  /** The proposed value, clamped to the limits. */
  readonly value: number;
  /** The unclamped change from the start value along the axis, mirrored in right-to-left content. */
  readonly delta: number;
  readonly source: ResizeSeparatorSource;
  readonly phase: 'live' | 'settled' | 'cancelled';
  readonly event: Event | null;
}

export interface ResizeSeparatorOptions {
  /** The owner element: its document receives the drag's cursor and selection block. */
  readonly host: HTMLElement;
  readonly axis: () => ResizeSeparatorAxis;
  readonly direction: () => 'ltr' | 'rtl';
  readonly value: () => number;
  readonly min: () => number;
  readonly max: () => number;
  readonly steps?: (() => ResizeSeparatorKeySteps) | undefined;
  /** Disabled input changes nothing. */
  readonly disabled?: (() => boolean) | undefined;
  /** Whether a drag shows the resize cursor for the document; default true. */
  readonly cursor?: (() => boolean) | undefined;
  /** Client pixels per CSS pixel along the axis at drag start; default 1. */
  readonly scale?: (() => number) | undefined;
  /** Whether Escape abandons a drag; default true. */
  readonly escapeCancels?: boolean | undefined;
  readonly propose: (proposal: ResizeSeparatorProposal) => void;
}

/** The attributes of the separator element. */
export interface ResizeSeparatorAttributes {
  readonly role: 'separator';
  readonly 'aria-orientation': 'horizontal' | 'vertical';
  readonly 'aria-valuenow': number;
  readonly 'aria-valuemin': number;
  readonly 'aria-valuemax': number;
}

interface DragSession {
  readonly pointerId: number;
  readonly element: HTMLElement;
  readonly start: number;
  readonly startValue: number;
  readonly scale: number;
  /** The `user-select` rule of a touch or pen drag; a mouse drag has none. */
  readonly style: GeneratedStyleResource | null;
  readonly escape: ((event: KeyboardEvent) => void) | null;
  /** Blocks text selection during a mouse drag (`selectstart`), or null. */
  readonly select: ((event: Event) => void) | null;
  /** The frame that writes the drag style, until it ran. */
  frame: number | null;
  /** Releases the drag cursor's lease, once the frame wrote it. */
  cursor: (() => void) | null;
  delta: number;
}

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), Math.max(min, max));

/** The default enlarged pointer targets of a separator, in CSS pixels. */
export const RESIZE_SEPARATOR_TARGET = Object.freeze({ fine: 10, coarse: 20 });

/**
 * The structural hit target of a separator element: a centered `::before` box across the line,
 * `--tp-resize-target-fine` wide, or `--tp-resize-target-coarse` under a coarse pointer, with the
 * default extents as fallbacks so that a separator outside a group gets its enlarged target.
 * `selector` names the separator element; `axis` is the axis its extent resizes.
 */
export function resizeSeparatorTargetCss(selector: string, axis: ResizeSeparatorAxis): string {
  const fine = `var(--tp-resize-target-fine, ${RESIZE_SEPARATOR_TARGET.fine}px)`;
  const coarse = `var(--tp-resize-target-coarse, ${RESIZE_SEPARATOR_TARGET.coarse}px)`;
  const horizontal = axis === 'horizontal';
  const box = horizontal
    ? 'inset-block: 0; inset-inline: auto; inset-inline-start: 50%; translate: -50% 0; block-size: auto;'
    : 'inset-inline: 0; inset-block: auto; inset-block-start: 50%; translate: 0 -50%; inline-size: auto;';
  const extent = horizontal ? 'inline-size' : 'block-size';
  return `${selector}::before { content: ''; position: absolute; ${box} ${extent}: ${fine}; }
@media (any-pointer: coarse) { ${selector}::before { ${extent}: ${coarse}; } }`;
}

/** Separator behavior for one extent (Foundation `req-f-resizable-parts`). */
export class ResizeSeparatorController {
  readonly #options: ResizeSeparatorOptions;
  #session: DragSession | null = null;
  #element: HTMLElement | null = null;

  constructor(options: ResizeSeparatorOptions) {
    this.#options = options;
  }

  /** True between a pointer press and the end of its drag. */
  get dragging(): boolean {
    return this.#session !== null;
  }

  /** The element a drag captured, or null. */
  get dragElement(): HTMLElement | null {
    return this.#session?.element ?? null;
  }

  #disabled(): boolean {
    return this.#options.disabled?.() ?? false;
  }

  /** The separator role, its orientation and its values, the current value clamped to the limits. */
  attributes(): ResizeSeparatorAttributes {
    const min = this.#options.min();
    const max = Math.max(min, this.#options.max());
    return {
      role: 'separator',
      'aria-orientation': this.#options.axis() === 'horizontal' ? 'vertical' : 'horizontal',
      'aria-valuenow': clamp(this.#options.value(), min, max),
      'aria-valuemin': min,
      'aria-valuemax': max,
    };
  }

  /** The step of a key press for this separator, or null; disabled input resolves to null. */
  keyStep(event: KeyboardEvent): ResizeSeparatorKeyStep | null {
    if (this.#disabled()) return null;
    return resizeSeparatorKey(event, {
      axis: this.#options.axis(),
      direction: this.#options.direction(),
      steps: this.#options.steps?.() ?? { step: 1 },
    });
  }

  /**
   * Handles a key press: an arrow, Home or End proposes one settled keyboard value and prevents the
   * key's default. Returns whether the key was handled.
   */
  handleKeyDown(event: KeyboardEvent): boolean {
    if (this.#session) return false;
    const step = this.keyStep(event);
    if (!step) return false;
    event.preventDefault();
    const { min, max, value } = this.#options;
    const current = value();
    const next =
      step.kind === 'min'
        ? min()
        : step.kind === 'max'
          ? max()
          : clamp(current + step.amount, min(), max());
    this.#options.propose({
      value: clamp(next, min(), max()),
      delta: next - current,
      source: 'keyboard',
      phase: 'settled',
      event,
    });
    return true;
  }

  /**
   * Starts a drag from a primary-button press on `element`: prevents the press default, focuses the
   * element, captures the pointer and blocks text selection with the resize cursor. Returns whether
   * a drag started.
   */
  pointerDown(
    event: PointerEvent,
    element: HTMLElement = event.currentTarget as HTMLElement,
  ): boolean {
    if (this.#session || event.button !== 0 || !event.isPrimary || this.#disabled()) return false;
    event.preventDefault();
    element.focus({ preventScroll: true });
    const horizontal = this.#options.axis() === 'horizontal';
    const host = this.#options.host;
    const cursor = this.#options.cursor?.() ?? true;
    const view = host.ownerDocument.defaultView;
    // A mouse drag blocks text selection through `selectstart`: a `user-select` rule over the
    // document recomputes every element's style and the document selection in the pressing task
    // (V-587). Touch and pen keep the rule, which also holds back the long-press selection. The
    // cursor shows through the drag cursor's layer, which styles one element, for every pointer
    // with one.
    const mouse = event.pointerType === 'mouse' && !!view;
    const style = mouse ? null : new GeneratedStyleResource(host, host.ownerDocument);
    const shape =
      cursor && event.pointerType !== 'touch' ? (horizontal ? 'col-resize' : 'row-resize') : null;
    // Written in the pressing task, the owner's reads there (its render after the focus moved)
    // would force a style recalculation, so the drag style waits a frame.
    const write = () => {
      style?.setText('*{user-select:none!important;}');
      if (shape && this.#session) this.#session.cursor = leaseDragCursor(host.ownerDocument, shape);
    };
    const frame = view?.requestAnimationFrame
      ? view.requestAnimationFrame(() => {
          if (this.#session) this.#session.frame = null;
          write();
        })
      : null;
    const select = mouse
      ? (start: Event) => {
          if (this.#session) start.preventDefault();
        }
      : null;
    const scale = this.#options.scale?.() ?? 1;
    const escape =
      this.#options.escapeCancels === false || !view
        ? null
        : (key: KeyboardEvent) => {
            if (key.key !== 'Escape' || !this.#session) return;
            key.preventDefault();
            key.stopPropagation();
            this.cancel(key);
          };
    this.#session = {
      pointerId: event.pointerId,
      element,
      start: horizontal ? event.clientX : event.clientY,
      startValue: this.#options.value(),
      scale: Number.isFinite(scale) && scale > 0 ? scale : 1,
      style,
      escape,
      select,
      frame,
      cursor: null,
      delta: 0,
    };
    if (frame === null) write();
    if (escape) view!.addEventListener('keydown', escape, { capture: true });
    if (select) view!.addEventListener('selectstart', select, { capture: true });
    try {
      element.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointers cannot be captured; the drag still runs on the element.
    }
    return true;
  }

  /** Proposes a live value for a move of the dragging pointer; a buttonless move or disabled input ends the drag. */
  pointerMove(event: PointerEvent): void {
    const session = this.#session;
    if (!session || event.pointerId !== session.pointerId) return;
    if (!event.buttons || this.#disabled()) {
      this.release(event);
      return;
    }
    const horizontal = this.#options.axis() === 'horizontal';
    const coordinate = horizontal ? event.clientX : event.clientY;
    const mirror = horizontal && this.#options.direction() === 'rtl' ? -1 : 1;
    session.delta = ((coordinate - session.start) / session.scale) * mirror;
    this.#options.propose({
      value: this.#clamped(session.startValue + session.delta),
      delta: session.delta,
      source: 'pointer',
      phase: 'live',
      event,
    });
  }

  /** The release, or a lost capture, of the dragging pointer settles the drag at its last position. */
  pointerUp(event: PointerEvent): void {
    if (event.pointerId === this.#session?.pointerId) this.release(event);
  }

  /** Pointer cancellation abandons the drag. */
  pointerCancel(event: PointerEvent): void {
    if (event.pointerId === this.#session?.pointerId) this.cancel(event);
  }

  /** Ends a drag at its last position with a settled proposal; nothing without a drag. */
  release(event: Event | null = null): void {
    const session = this.#end();
    if (!session) return;
    this.#options.propose({
      value: this.#clamped(session.startValue + session.delta),
      delta: session.delta,
      source: 'pointer',
      phase: 'settled',
      event,
    });
  }

  /** Abandons a drag: a cancelled proposal with the start value; nothing without a drag. */
  cancel(event: Event | null = null): void {
    const session = this.#end();
    if (!session) return;
    this.#options.propose({
      value: session.startValue,
      delta: 0,
      source: 'pointer',
      phase: 'cancelled',
      event,
    });
  }

  /**
   * Listens on `element` for the separator's own pointer and key input (an owner that renders its
   * listeners itself calls the input methods instead). Returns the removal.
   */
  connect(element: HTMLElement): () => void {
    this.disconnect();
    this.#element = element;
    for (const [type, listener] of this.#listeners) element.addEventListener(type, listener);
    return () => this.disconnect();
  }

  /** Removes the listeners of `connect` and abandons a drag. */
  disconnect(): void {
    this.cancel();
    const element = this.#element;
    this.#element = null;
    if (element)
      for (const [type, listener] of this.#listeners) element.removeEventListener(type, listener);
  }

  /** Abandons a drag and removes every listener; the controller may be connected again. */
  dispose(): void {
    this.disconnect();
  }

  readonly #listeners: readonly (readonly [string, EventListener])[] = [
    ['pointerdown', (event) => void this.pointerDown(event as PointerEvent)],
    ['pointermove', (event) => this.pointerMove(event as PointerEvent)],
    ['pointerup', (event) => this.pointerUp(event as PointerEvent)],
    ['lostpointercapture', (event) => this.pointerUp(event as PointerEvent)],
    ['pointercancel', (event) => this.pointerCancel(event as PointerEvent)],
    ['keydown', (event) => void this.handleKeyDown(event as KeyboardEvent)],
  ];

  #clamped(value: number): number {
    return clamp(value, this.#options.min(), this.#options.max());
  }

  /** Releases capture, the document style and the Escape listener; returns the ended session. */
  #end(): DragSession | null {
    const session = this.#session;
    this.#session = null;
    if (!session) return null;
    try {
      if (session.element.hasPointerCapture(session.pointerId))
        session.element.releasePointerCapture(session.pointerId);
    } catch {
      // The pointer is already gone.
    }
    const view = this.#options.host.ownerDocument.defaultView;
    if (session.frame !== null) view?.cancelAnimationFrame(session.frame);
    session.style?.dispose();
    session.cursor?.();
    if (session.escape) view?.removeEventListener('keydown', session.escape, { capture: true });
    if (session.select) view?.removeEventListener('selectstart', session.select, { capture: true });
    return session;
  }
}
