import { html, nothing, svg, type PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { createId } from '../../../foundation/id.js';
import { bindPart } from '../../../foundation/part.js';
import { PointerDrag, type PointerDragPoint } from '../../../foundation/pointer-drag.js';
import { applyKeyboardStep, stepForKey } from '../../../foundation/dimension-step.js';
import {
  cancelMotions,
  prepareMotion,
  stateRole,
  type MotionHandle,
} from '../../../foundation/motion.js';
import type { ChangeReason } from '../../../foundation/types.js';
import { easingFunction, normalizePoints } from '../../../foundation/easing/evaluate.js';
import { convertEasingCurve, hasBezierFit } from '../../../foundation/easing/convert.js';
import { toCssEasing } from '../../../foundation/easing/css.js';
import {
  PROGRESSION_MAX,
  PROGRESSION_MIN,
  type BezierCurve,
  type CustomCurve,
  type EasingCurve,
  type EasingPoint,
  type ProgressionRange,
} from '../../../foundation/easing/types.js';
import { easingEditorPresentation } from '../../../presentation/families/easing-editor.js';
import {
  PROGRESSION_DIMENSION,
  TIME_DIMENSION,
  clampParameter,
  formatParameter,
} from '../parameters.js';
import { previewKeyframes } from '../preview.js';
import { DEFAULT_STRINGS, resolveStrings } from '../strings.js';
import { easingSurfaceStyles } from '../styles.js';
import type { EasingEditorStrings, EasingPreviewMode } from '../types.js';
import { curvePolyline, curveRange, progressionAt, progressionFraction } from './geometry.js';

/** What the graph proposes to its owner: a whole record, the cause and the commit policy. */
export interface EasingSurfaceChangeDetail {
  readonly curve: EasingCurve;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event;
  /** `press`: gesture start; `propose`: live proposal; `commit`: settle; `restore`: abandon. */
  readonly phase: 'press' | 'propose' | 'commit' | 'restore';
  /** Bézier handle (1 or 2) or custom point index that was edited. */
  readonly handle?: number;
  readonly point?: number;
  readonly axis?: 'time' | 'progression';
  /** The edit converted a parametric curve into its Bézier fit or into points first. */
  readonly conversion?: boolean;
}
export const SURFACE_CHANGE = 'easing-surface-change';

type Axis = 'time' | 'progression';
interface Active {
  readonly kind: 'handle' | 'point';
  readonly index: number;
}
const PREVIEW_ROLE = stateRole('preview');
const SAMPLES = 200;

/**
 * The graph: an SVG plot of the progression over time with the unit box, the overshoot band and
 * the curve, plus the Bézier control handles or the custom points as positioned handles whose
 * hidden range inputs carry the keyboard and accessibility contract (Widgets 6.2 Anatomy). The
 * preview shape animates in a layer behind the grid. Change events never leave the widget's
 * shadow root (`composed: false`).
 */
export class TpEasingEditorGraph extends TpElement {
  static tagName = 'tp-easing-editor-graph';
  static override presentation = easingEditorPresentation;
  static override properties = {
    ...TpElement.properties,
    curve: { attribute: false },
    heldRange: { attribute: false },
    label: { type: String },
    strings: { attribute: false },
    preview: { type: String },
    duration: { type: Number },
  };
  static override styles = [TpElement.styles, easingSurfaceStyles];

  curve: EasingCurve | null = null;
  /** The range the owner holds during a drag; otherwise the range follows the curve. */
  heldRange: ProgressionRange | null = null;
  label = '';
  strings: Partial<EasingEditorStrings> = {};
  preview: EasingPreviewMode = 'scale';
  /** Preview duration in seconds. */
  duration = 0.3;

  readonly #groupId = createId('tp-easing-graph');
  #surface: HTMLElement | null = null;
  #shape: HTMLElement | null = null;
  #frame: HTMLElement | null = null;
  #drag: PointerDrag | undefined;
  #pressed: EasingCurve | undefined;
  #active: Active | undefined;
  #dragging = false;
  #focused: { kind: 'handle' | 'point'; index: number; axis: Axis } | undefined;
  #focusVisible = false;
  #playing = false;
  #motion: MotionHandle | undefined;
  #range: ProgressionRange = { min: 0, max: 1 };
  /** The Bézier fit shown over a parametric ease, cached per record. */
  #fit: { readonly source: EasingCurve; readonly curve: BezierCurve } | undefined;

  /** The widget hosting this surface, for axis resolution of the shared family. */
  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  get dragging(): boolean {
    return this.#dragging;
  }
  get playing(): boolean {
    return this.#playing;
  }
  /** The shown progression range (quarter steps around the unit box). */
  get range(): ProgressionRange {
    return this.#range;
  }
  /** Index of the custom point whose input has focus, or null. */
  get focusedPoint(): number | null {
    return this.#focused?.kind === 'point' ? this.#focused.index : null;
  }

  protected get text(): EasingEditorStrings {
    return this.strings === DEFAULT_STRINGS ? DEFAULT_STRINGS : resolveStrings(this.strings);
  }

  protected get editable(): boolean {
    return !this.disabled && !this.readOnly;
  }

  /**
   * The record whose handles the graph shows: a Bézier or custom record itself, the Bézier fit of
   * a sine, power, expo, circ or back ease (its handles are visible from the start, so the first
   * press grabs one instead of moving the curve), or the record unchanged.
   */
  #shown(): EasingCurve | null {
    const curve = this.curve;
    if (curve?.kind !== 'parametric' || !hasBezierFit(curve)) return curve;
    if (this.#fit?.source !== curve) {
      const fit = convertEasingCurve(curve, 'bezier');
      if (fit.kind !== 'bezier') return curve;
      this.#fit = { source: curve, curve: fit };
    }
    return this.#fit.curve;
  }

  /** Focuses the time input of a handle (1 or 2) or a custom point. */
  focusInput(kind: 'handle' | 'point', index: number, axis: Axis = 'time'): void {
    this.renderRoot
      .querySelector<HTMLInputElement>(`input[data-${kind}="${index}"][data-axis="${axis}"]`)
      ?.focus({ preventScroll: true });
  }

  /** Replays the preview from the start; resolves when it finishes (immediately under reduced motion). */
  play(): Promise<void> {
    const shape = this.#shape;
    if (!shape || this.preview === 'none' || !this.curve) return Promise.resolve();
    // A replay restarts: the running motion is cancelled before the new one starts.
    if (this.#motion) {
      cancelMotions(this);
      this.#motion = undefined;
    }
    const keyframes = previewKeyframes(this.preview);
    const easing = toCssEasing(this.curve);
    const duration = Math.max(1, Math.round(this.duration * 1000));
    const handle = prepareMotion(
      this,
      shape,
      PREVIEW_ROLE,
      { phase: 'change', context: { easing, duration, property: this.preview } },
      {
        play() {
          const animation = shape.animate(keyframes, { duration, easing, fill: 'none' });
          return {
            finished: animation.finished.then(() => undefined),
            cancel: () => animation.cancel(),
          };
        },
      },
    );
    this.#motion = handle;
    this.#setPlaying(true);
    handle.start();
    return handle.finished.then(
      () => this.#settlePlayback(handle),
      () => this.#settlePlayback(handle),
    );
  }

  #settlePlayback(handle: MotionHandle): void {
    if (this.#motion !== handle) return;
    this.#motion = undefined;
    this.#setPlaying(false);
  }

  #setPlaying(playing: boolean): void {
    if (this.#playing === playing) return;
    this.#playing = playing;
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent('easing-preview-change', {
        detail: { playing },
        bubbles: true,
        composed: false,
      }),
    );
  }

  // ---- pointer -------------------------------------------------------------------------------

  #surfaceReference = (node: HTMLElement | null): void => {
    if (node === this.#surface) return;
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#surface = node;
    if (!node) return;
    this.#drag = new PointerDrag({
      element: node,
      owner: this.ownerDocument.defaultView,
      disabled: () => !this.editable,
      // A press inside a handle or point drags it from where it was pressed.
      grip: (event) => (event.target as Element | null)?.closest?.('.handle, .point'),
      focusTarget: () => this.#activeInput(),
      handlers: {
        begin: (point, event) => this.#begin(point, event),
        move: (point, event) => {
          const active = this.#active;
          if (!active) return;
          this.#dragging = true;
          this.requestUpdate();
          const next = this.#moved(active, point);
          if (next) this.#propose(next, 'drag', event, 'propose', active);
        },
        end: (point, event, dragged) => {
          const active = this.#active;
          this.#dragging = false;
          this.#active = undefined;
          this.#pressed = undefined;
          if (!active) return;
          const next = this.#moved(active, point) ?? this.curve;
          if (next) this.#propose(next, dragged ? 'drag' : 'track-press', event, 'commit', active);
          this.requestUpdate();
        },
        cancel: (reason, event) => {
          const pressed = this.#pressed;
          const active = this.#active;
          this.#dragging = false;
          this.#active = undefined;
          this.#pressed = undefined;
          this.requestUpdate();
          if (!pressed || !active) return;
          this.#propose(
            pressed,
            reason === 'escape' ? 'escape-key' : 'pointer',
            event ?? new Event('tp-pointer-cancel'),
            'restore',
            active,
          );
        },
      },
    });
    this.#drag.connect();
  };

  #shapeReference = (node: HTMLElement | null): void => {
    this.#shape = node;
  };

  #frameReference = (node: HTMLElement | null): void => {
    this.#frame = node;
  };

  /** Resolves the press: a handle or point to drag, a new custom point, or a declined press. */
  #begin(point: PointerDragPoint, event: PointerEvent): boolean | undefined {
    const curve = this.curve;
    if (!curve) return false;
    const target = (event.target as Element | null)?.closest?.<HTMLElement>('.handle, .point');
    if (target) {
      const handle = target.dataset.handle;
      const index = target.dataset.point;
      this.#active = handle
        ? { kind: 'handle', index: Number(handle) }
        : { kind: 'point', index: Number(index) };
      this.#pressed = curve;
      // A handle shown over a parametric ease converts it to the Bézier fit it belongs to.
      const shown = this.#shown() ?? curve;
      this.#propose(shown, 'track-press', event, 'press', this.#active, undefined, shown !== curve);
      return undefined;
    }
    if (curve.kind === 'parametric') {
      // A bare press on an ease with visible Bézier handles edits nothing, like a Bézier; a press
      // on an elastic, bounce or steps curve converts it to points and drags the nearest one.
      if (hasBezierFit(curve)) return false;
      const converted = convertEasingCurve(curve, 'custom');
      if (converted.kind !== 'custom') return false;
      const at = this.#coordinates(point);
      let index = 0;
      let distance = Infinity;
      normalizePoints(converted.points).forEach((entry, candidate) => {
        const gap = Math.abs(entry.input - at.input);
        if (gap < distance) {
          distance = gap;
          index = candidate;
        }
      });
      this.#active = { kind: 'point', index };
      this.#pressed = curve;
      this.#propose(converted, 'track-press', event, 'press', this.#active, undefined, true);
      return undefined;
    }
    if (curve.kind !== 'custom') return false;
    // A press on the empty custom graph adds a point there and drags it.
    const added = this.#insertPoint(curve, this.#coordinates(point));
    this.#active = { kind: 'point', index: added.index };
    this.#pressed = curve;
    this.#propose(added.curve, 'track-press', event, 'press', this.#active);
    return undefined;
  }

  /** Maps a pointer position on the surface into the inset plot frame. */
  #coordinates(point: PointerDragPoint): EasingPoint {
    const frame = this.#frame;
    const left = frame?.offsetLeft ?? 0;
    const top = frame?.offsetTop ?? 0;
    const width = frame?.offsetWidth || point.width || 1;
    const height = frame?.offsetHeight || point.height || 1;
    return {
      input: Math.min(1, Math.max(0, (point.x - left) / width)),
      output: clampParameter(
        PROGRESSION_DIMENSION,
        progressionAt(1 - (point.y - top) / height, this.#range),
      ),
    };
  }

  #insertPoint(curve: CustomCurve, at: EasingPoint): { curve: CustomCurve; index: number } {
    const points = [...normalizePoints(curve.points)];
    let index = points.findIndex((entry) => entry.input > at.input);
    if (index <= 0) index = index === 0 ? 1 : points.length - 1;
    points.splice(index, 0, at);
    return { curve: { kind: 'custom', points }, index };
  }

  /** The record with the active handle or point moved to the pointer. */
  #moved(active: Active, point: PointerDragPoint): EasingCurve | null {
    const curve = this.curve;
    if (!curve) return null;
    const at = this.#coordinates(point);
    return this.#withPosition(curve, active, at);
  }

  #withPosition(curve: EasingCurve, active: Active, at: EasingPoint): EasingCurve | null {
    if (active.kind === 'handle') {
      if (curve.kind !== 'bezier') return null;
      return active.index === 1
        ? { ...curve, x1: at.input, y1: at.output }
        : { ...curve, x2: at.input, y2: at.output };
    }
    if (curve.kind !== 'custom') return null;
    const points = [...normalizePoints(curve.points)];
    const index = active.index;
    if (index < 0 || index >= points.length) return null;
    const previous = points[index - 1];
    const next = points[index + 1];
    // Ends keep their time; inner points stay between their neighbours.
    const input =
      index === 0
        ? 0
        : index === points.length - 1
          ? 1
          : Math.min(next?.input ?? 1, Math.max(previous?.input ?? 0, at.input));
    points[index] = { input, output: at.output };
    return { kind: 'custom', points };
  }

  #propose(
    curve: EasingCurve,
    reason: ChangeReason,
    sourceEvent: Event,
    phase: EasingSurfaceChangeDetail['phase'],
    active: Active,
    axis?: Axis,
    conversion?: boolean,
  ): void {
    const detail: EasingSurfaceChangeDetail = {
      curve,
      reason,
      sourceEvent,
      phase,
      ...(active.kind === 'handle' ? { handle: active.index } : { point: active.index }),
      ...(axis ? { axis } : {}),
      ...(conversion ? { conversion: true } : {}),
    };
    this.dispatchEvent(new CustomEvent(SURFACE_CHANGE, { detail, bubbles: true, composed: false }));
  }

  // ---- keyboard ------------------------------------------------------------------------------

  #keyDown = (event: KeyboardEvent): void => {
    if (!this.editable || !this.curve) return;
    const input = event.currentTarget as HTMLInputElement;
    const active: Active = input.dataset.handle
      ? { kind: 'handle', index: Number(input.dataset.handle) }
      : { kind: 'point', index: Number(input.dataset.point) };
    const focusedAxis = input.dataset.axis as Axis;
    if ((event.key === 'Delete' || event.key === 'Backspace') && active.kind === 'point') {
      const curve = this.curve;
      if (curve.kind !== 'custom') return;
      const points = normalizePoints(curve.points);
      if (active.index <= 0 || active.index >= points.length - 1) return;
      event.preventDefault();
      const removed = points.filter((_, index) => index !== active.index);
      this.#propose({ kind: 'custom', points: removed }, 'keyboard', event, 'commit', active);
      void this.updateComplete.then(() => this.focusInput('point', active.index - 1, focusedAxis));
      return;
    }
    const current = this.#position(active);
    if (!current) return;
    const time = stepForKey(event, {
      definition: TIME_DIMENSION,
      axis: 'horizontal',
      direction: 'ltr',
      angular: true,
    });
    const progression = stepForKey(event, {
      definition: PROGRESSION_DIMENSION,
      axis: 'vertical',
      direction: 'ltr',
    });
    let next: EasingPoint;
    let axis: Axis = focusedAxis;
    if (time || progression) {
      next = {
        input: time ? applyKeyboardStep(current.input, time, TIME_DIMENSION) : current.input,
        output: progression
          ? applyKeyboardStep(current.output, progression, PROGRESSION_DIMENSION)
          : current.output,
      };
      axis = time ? 'time' : 'progression';
    } else {
      // Page, Home and End act on the focused dimension only.
      const definition = focusedAxis === 'time' ? TIME_DIMENSION : PROGRESSION_DIMENSION;
      const step = stepForKey(event, { definition, axis: 'both', direction: 'ltr', angular: true });
      if (!step) return;
      const value = applyKeyboardStep(
        focusedAxis === 'time' ? current.input : current.output,
        step,
        definition,
      );
      next =
        focusedAxis === 'time'
          ? { input: value, output: current.output }
          : { input: current.input, output: value };
    }
    event.preventDefault();
    const clamped: EasingPoint = {
      input: clampParameter(TIME_DIMENSION, next.input),
      output: clampParameter(PROGRESSION_DIMENSION, next.output),
    };
    const shown = this.#shown();
    const moved = shown ? this.#withPosition(shown, active, clamped) : null;
    if (moved)
      this.#propose(moved, 'keyboard', event, 'commit', active, axis, shown !== this.curve);
  };

  #position(active: Active): EasingPoint | null {
    const curve = this.#shown();
    if (!curve) return null;
    if (active.kind === 'handle')
      return curve.kind !== 'bezier'
        ? null
        : active.index === 1
          ? { input: curve.x1, output: curve.y1 }
          : { input: curve.x2, output: curve.y2 };
    if (curve.kind !== 'custom') return null;
    return normalizePoints(curve.points)[active.index] ?? null;
  }

  #activeInput(): HTMLElement | null {
    const active = this.#active;
    if (!active) return null;
    return this.renderRoot.querySelector<HTMLElement>(
      `input[data-${active.kind}="${active.index}"][data-axis="time"]`,
    );
  }

  #restoreInput = (event: Event): void => {
    // The widget owns the value; the native default of a range key never publishes.
    const input = event.currentTarget as HTMLInputElement;
    input.value = input.getAttribute('aria-valuenow') ?? input.value;
  };

  #focus = (event: FocusEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    this.#focused = input.dataset.handle
      ? { kind: 'handle', index: Number(input.dataset.handle), axis: input.dataset.axis as Axis }
      : { kind: 'point', index: Number(input.dataset.point), axis: input.dataset.axis as Axis };
    this.#focusVisible = input.matches(':focus-visible');
    this.requestUpdate();
  };

  #blur = (): void => {
    this.#focused = undefined;
    this.#focusVisible = false;
    this.requestUpdate();
  };

  // ---- lifecycle -----------------------------------------------------------------------------

  override disconnectedCallback(): void {
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#surface = null;
    cancelMotions(this);
    this.#motion = undefined;
    this.#playing = false;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (changed.has('curve') || changed.has('heldRange'))
      this.#range = this.heldRange ?? curveRange(this.curve);
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const active = this.renderRoot.querySelector<HTMLInputElement>('input:focus');
    if (active && active.matches(':focus-visible') !== this.#focusVisible) {
      this.#focusVisible = active.matches(':focus-visible');
      this.requestUpdate();
    }
  }

  // ---- render --------------------------------------------------------------------------------

  #dimensionInput(active: Active, axis: Axis, value: number, name: string) {
    const definition = axis === 'time' ? TIME_DIMENSION : PROGRESSION_DIMENSION;
    const props: Record<string, unknown> = {
      type: 'range',
      class: 'dimension',
      part: 'focusable',
      [`data-${active.kind}`]: String(active.index),
      'data-axis': axis,
      '.min': String(definition.min),
      '.max': String(definition.max),
      '.step': String(definition.smallStep),
      '.value': String(value),
      '.disabled': this.disabled,
      tabindex: this.disabled ? -1 : 0,
      'aria-label': name,
      'aria-valuemin': String(definition.min),
      'aria-valuemax': String(definition.max),
      'aria-valuenow': String(Math.round(value * 1000) / 1000),
      'aria-valuetext': formatParameter(definition, value),
      'aria-orientation': axis === 'time' ? 'horizontal' : 'vertical',
      'aria-readonly': this.readOnly ? 'true' : undefined,
      '@keydown': this.#keyDown,
      '@input': this.#restoreInput,
      '@focus': this.#focus,
      '@blur': this.#blur,
    };
    return html`<input ${bindPart(props, [])} />`;
  }

  #handleMarkers(active: Active): Record<string, unknown> {
    const focused = this.#focused;
    const isFocused =
      focused !== undefined && focused.kind === active.kind && focused.index === active.index;
    const isDragging =
      this.#dragging &&
      this.#active !== undefined &&
      this.#active.kind === active.kind &&
      this.#active.index === active.index;
    return {
      'data-disabled': this.disabled,
      'data-readonly': this.readOnly,
      'data-dragging': isDragging,
      'data-focused': isFocused,
      'data-focus-visible': isFocused && this.#focusVisible,
    };
  }

  #renderHandle(curve: BezierCurve, index: 1 | 2) {
    const text = this.text;
    const x = index === 1 ? curve.x1 : curve.x2;
    const y = index === 1 ? curve.y1 : curve.y2;
    const active: Active = { kind: 'handle', index };
    const prefix = this.label ? `${this.label}: ` : '';
    const name = `${prefix}${text.controlPoint} ${index}`;
    return this.renderPart(
      'easing-editor-graph-handle',
      { handle: index, x, y },
      {
        tag: 'span',
        properties: {
          part: 'easing-editor-graph-handle',
          class: 'handle',
          'data-handle': String(index),
          style: {
            left: `${(x * 100).toFixed(3)}%`,
            top: `${((1 - progressionFraction(y, this.#range)) * 100).toFixed(3)}%`,
          },
          ...this.#handleMarkers(active),
        },
        content: html`${this.#dimensionInput(active, 'time', x, `${name} ${text.time}`)}${this.#dimensionInput(active, 'progression', y, `${name} ${text.progression}`)}`,
      },
    );
  }

  #renderPoint(point: EasingPoint, index: number) {
    const text = this.text;
    const active: Active = { kind: 'point', index };
    const prefix = this.label ? `${this.label}: ` : '';
    const name = `${prefix}${text.point} ${index + 1}`;
    return this.renderPart(
      'easing-editor-graph-point',
      { point: index, x: point.input, y: point.output },
      {
        tag: 'span',
        properties: {
          part: 'easing-editor-graph-point',
          class: 'point',
          'data-point': String(index),
          'data-end':
            index === 0 || index === normalizePoints((this.curve as CustomCurve).points).length - 1,
          style: {
            left: `${(point.input * 100).toFixed(3)}%`,
            top: `${((1 - progressionFraction(point.output, this.#range)) * 100).toFixed(3)}%`,
          },
          ...this.#handleMarkers(active),
        },
        content: html`${this.#dimensionInput(active, 'time', point.input, `${name} ${text.time}`)}${this.#dimensionInput(active, 'progression', point.output, `${name} ${text.progression}`)}`,
      },
    );
  }

  #renderPlot() {
    const curve = this.curve;
    const shown = this.#shown();
    const range = this.#range;
    const top = (1 - progressionFraction(1, range)) * 100;
    const bottom = (1 - progressionFraction(0, range)) * 100;
    // A dot at every tenth of the unit box; zero-length round-capped lines keep a pixel size.
    const dots: unknown[] = [];
    for (let column = 0; column <= 10; column++) {
      const x = column * 10;
      for (let row = 0; row <= 10; row++) {
        const y = (bottom - ((bottom - top) * row) / 10).toFixed(3);
        dots.push(
          svg`<line class="grid-dot" x1=${x} y1=${y} x2=${x} y2=${y} stroke-linecap="round" vector-effect="non-scaling-stroke"></line>`,
        );
      }
    }
    const handleLines =
      shown?.kind === 'bezier'
        ? svg`<line part="easing-editor-graph-handle-line" class="handle-line" x1="0" y1=${bottom.toFixed(3)} x2=${(shown.x1 * 100).toFixed(3)} y2=${((1 - progressionFraction(shown.y1, range)) * 100).toFixed(3)} vector-effect="non-scaling-stroke"></line><line part="easing-editor-graph-handle-line" class="handle-line" x1="100" y1=${top.toFixed(3)} x2=${(shown.x2 * 100).toFixed(3)} y2=${((1 - progressionFraction(shown.y2, range)) * 100).toFixed(3)} vector-effect="non-scaling-stroke"></line>`
        : nothing;
    const path = curve
      ? svg`<polyline part="easing-editor-graph-curve" class="curve" points=${curvePolyline(easingFunction(curve), range, 100, 100, SAMPLES)} vector-effect="non-scaling-stroke"></polyline>`
      : nothing;
    // The dots and the curve clip to the graph box and its corners; only the handles and their
    // lines may leave it. The curve keeps painting above the handle lines.
    return html`<div class="grid-layer">
        <svg class="plot" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <g part="easing-editor-graph-grid" class="grid">${dots}</g>
        </svg>
      </div>
      <svg class="plot" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        ${handleLines}
      </svg>
      <div class="curve-layer">
        <svg class="plot" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          ${path}
        </svg>
      </div>`;
  }

  protected override render() {
    const text = this.text;
    const curve = this.curve;
    const state = {
      kind: curve?.kind ?? null,
      dragging: this.#dragging,
      playing: this.#playing,
      preview: this.preview,
      range: this.#range,
    };
    const previewLayer =
      this.preview === 'none'
        ? nothing
        : this.renderPart('easing-editor-graph-preview', state, {
            tag: 'div',
            properties: {
              part: 'easing-editor-graph-preview',
              class: 'preview-layer',
              'aria-hidden': 'true',
              'data-mode': this.preview,
              // The square at progression 1 leaves room for the shown overshoot (scale > 1).
              style: {
                '--_tp-easing-editor-headroom': (1 / Math.max(1, this.#range.max)).toFixed(4),
              },
              'data-playing': this.#playing,
            },
            content: html`<span ${bindPart({ class: 'shape' }, [this.#shapeReference])}></span>`,
          });
    const shown = this.#shown();
    const handles =
      shown?.kind === 'bezier'
        ? html`${this.#renderHandle(shown, 1)}${this.#renderHandle(shown, 2)}`
        : shown?.kind === 'custom'
          ? normalizePoints(shown.points).map((point, index) => this.#renderPoint(point, index))
          : nothing;
    return this.renderPart('easing-editor-graph', state, {
      tag: 'div',
      reference: this.#surfaceReference,
      properties: {
        part: 'easing-editor-graph',
        class: 'surface graph',
        role: 'group',
        id: this.#groupId,
        'aria-label': this.label ? `${this.label}: ${text.graph}` : text.graph,
        'data-kind': curve?.kind ?? 'empty',
        'data-disabled': this.disabled,
        'data-readonly': this.readOnly,
        'data-dragging': this.#dragging,
        'data-playing': this.#playing,
        'data-editable': shown?.kind === 'bezier' || shown?.kind === 'custom',
      },
      content: html`${previewLayer}${this.#renderPlot()}
        <div ${bindPart({ class: 'frame' }, [this.#frameReference])}>${handles}</div>`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-easing-editor-graph': TpEasingEditorGraph;
  }
}

export { PROGRESSION_MIN, PROGRESSION_MAX };
