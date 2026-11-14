import { css, html, nothing, type PropertyValues } from 'lit';
import { ControllableState } from '../../foundation/controllable-state.js';
import { defaultTrue } from '../../foundation/converters.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import {
  applyKeyboardStep,
  stepForKey,
  type DimensionDefinition,
  type KeyboardStep,
} from '../../foundation/dimension-step.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { bindPart } from '../../foundation/part.js';
import { PointerDrag, type PointerDragPoint } from '../../foundation/pointer-drag.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import type { ChangeReason } from '../../foundation/types.js';
import { parseColor } from '../../foundation/color/parse.js';
import { displayColor } from '../../foundation/color/serialize.js';
import type { ColorValue } from '../../foundation/color/types.js';
import { trashIcon } from '../../icons/trash.js';
import { TpButton } from '../../components/button/button.js';
import { TpGradientStop } from './gradient-stop.js';
import { rangeHandleStyles } from '../../components/shared/control-styles.js';
import { gradientPickerPresentation } from '../../presentation/families/gradient-picker.js';
import {
  FIELD_GRADIENT_DEFAULTS,
  insertFieldAnchor,
  moveFieldAnchor,
  normalizeFieldAnchors,
  removeFieldAnchor,
  renderFieldGradient,
  sampleFieldGradient,
  type FieldGradientAnchor,
  type FieldGradientFalloff,
  type FieldGradientOptions,
  type FieldGradientProjection,
} from './field.js';
import {
  MIDPOINT_MAX,
  MIDPOINT_MIN,
  gradientTrackPaint,
  insertGradientStop,
  moveGradientMidpoint,
  moveGradientStop,
  normalizeGradientStops,
  removeGradientStop,
  sampleLinearGradient,
  type GradientInterpolation,
  type GradientStop,
} from './linear.js';
import { format, resolveStrings, type GradientPickerStrings } from './strings.js';

/**
 * `linear`: stops along a track, with a midpoint between each pair. `field`: color anchors placed
 * anywhere on a field, every point blending all of them by distance.
 */
export type GradientPickerVariant = 'linear' | 'field';
/** The stops of a linear gradient or the anchors of a field gradient. */
export type GradientPickerValue = readonly GradientStop[] | readonly FieldGradientAnchor[];
/** One stop or anchor, for `setStop`: the fields the variant reads. */
export type GradientPickerStopChanges = Partial<GradientStop> & Partial<FieldGradientAnchor>;
/**
 * Called with each `tp-value-change` proposal of new stops or anchors while they are being edited.
 */
export type GradientPickerValueChangeCallback = (
  event: TpValueChangeEvent<GradientPickerValue>,
) => void;
/** Called with each `tp-value-commit` when an edit of the stops or anchors settles. */
export type GradientPickerValueCommitCallback = (
  event: TpValueCommitEvent<GradientPickerValue>,
) => void;
/** Called with each `tp-selection-change` proposal of the selected stop index, `-1` for none. */
export type GradientPickerSelectionChangeCallback = (event: TpValueChangeEvent<number>) => void;
/** Scale of the gradient track, handles and fields. */
export type GradientPickerSize = 'sm' | 'default';

type Kind = 'stop' | 'midpoint' | 'anchor';
type Active = { readonly kind: Kind; index: number };
type Axis = 'x' | 'y';
type Entry = Partial<GradientStop> & Partial<FieldGradientAnchor>;

/** Stops or anchors saved as JSON in the form state. */
function parseList(value: string): GradientPickerValue | undefined {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as GradientPickerValue) : undefined;
  } catch {
    return undefined;
  }
}

const STOP_TAG = 'tp-gradient-stop';
const STOP_ATTRIBUTES = ['position', 'color', 'midpoint', 'x', 'y'] as const;

/** A stop child's declaration, from its attributes (its properties reflect to them). */
function readStop(element: Element): Entry {
  const number = (name: string): number | undefined => {
    const text = element.getAttribute(name);
    const parsed = text === null || text.trim() === '' ? Number.NaN : Number(text);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const entry: Record<string, unknown> = { color: element.getAttribute('color') ?? '' };
  for (const name of ['position', 'midpoint', 'x', 'y'] as const) {
    const value = number(name);
    if (value !== undefined) entry[name] = value;
  }
  return entry as Entry;
}

/** Writes a stop or anchor into a stop child's attributes, dropping those it does not use. */
function writeStop(element: Element, entry: Entry): void {
  for (const name of STOP_ATTRIBUTES) {
    const value = entry[name];
    const text =
      value === undefined || (name === 'midpoint' && value === 0.5) ? null : String(value);
    if (text === null) element.removeAttribute(name);
    else if (element.getAttribute(name) !== text) element.setAttribute(name, text);
  }
}

/** Whether two values hold the same stops or anchors, field by field. */
function sameEntries(a: GradientPickerValue, b: GradientPickerValue): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return (a as readonly Entry[]).every((entry, index) => {
    const other = (b as readonly Entry[])[index]!;
    return (
      entry.color === other.color &&
      entry.position === other.position &&
      (entry.midpoint ?? 0.5) === (other.midpoint ?? 0.5) &&
      entry.x === other.x &&
      entry.y === other.y
    );
  });
}

const percent = (value: number): string => `${Math.round(value * 1000) / 10}%`;
const paintOf = (text: string): string => {
  const parsed = parseColor(text);
  return parsed ? displayColor(parsed) : 'transparent';
};
/** The widest the field preview renders, in pixels; the smooth field scales up cleanly. */
const FIELD_RESOLUTION = 320;

/**
 * Edits the color stops of a gradient, as data any renderer can draw. The `linear` variant places
 * stops along a track, with a midpoint between each pair where their colors mix half and half; a
 * press on the track adds a stop in the gradient's own color there, and a stop dragged past a
 * neighbor passes it. The `field` variant places color anchors anywhere on a field whose every
 * point blends all anchors by distance; a double press on the field adds an anchor. It edits the
 * stops only: a stop's color, the gradient's angle or shape and how it is drawn belong to the
 * controls and the renderer an app composes around it, through `value` and `selected`.
 *
 * @slot - `tp-gradient-stop` children declaring the stops or anchors; the picker writes its edits
 * back to them. Without them, `value` or `defaultValue` supplies the stops as records.
 * @fires tp-value-change - Cancelable proposal of new stops or anchors: live while a handle is
 * dragged, and for each key, press and removal.
 * @fires tp-value-commit - Settled stops or anchors: once per drag on release, and at once for
 * keys, a press that adds one and a removal.
 * @fires tp-selection-change - Cancelable proposal of the selected index (`-1` for none).
 * @fires tp-field-value - Each committed value, for a surrounding Field's validation state.
 * @csspart gradient-picker - The root group named by the label.
 * @csspart gradient-picker-track - The bar painted with a linear gradient.
 * @csspart gradient-picker-field - The canvas painted with a field gradient.
 * @csspart gradient-picker-stop - A stop's or anchor's round handle, in its own color.
 * @csspart gradient-picker-midpoint - A midpoint's diamond handle above the track.
 * @csspart gradient-picker-remove - The Button that removes the selected stop or anchor.
 * @csspart focusable - The native range input inside each handle, which takes focus.
 */
export class TpGradientPicker extends TpFormElement<GradientPickerValue> {
  static tagName = 'tp-gradient-picker';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpGradientStop];
  }
  static override presentation = gradientPickerPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: false },
    selected: { type: Number, noAccessor: true },
    defaultSelected: { type: Number, attribute: 'default-selected' },
    variant: { type: String, reflect: true },
    interpolation: { type: String },
    falloff: { type: String },
    power: { type: Number },
    warpAmplitude: { type: Number, attribute: 'warp-amplitude' },
    warpFrequency: { type: Number, attribute: 'warp-frequency' },
    projection: { type: String },
    minStops: { type: Number, attribute: 'min-stops' },
    maxStops: { type: Number, attribute: 'max-stops' },
    removable: { converter: defaultTrue, reflect: true },
    step: { type: Number },
    size: { type: String, reflect: true },
    label: { type: String },
    required: { type: Boolean, reflect: true },
    strings: { attribute: false },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
    onSelectionChange: { attribute: false },
  };
  static override styles = [
    TpFormElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      /* The diamonds ride above the track; the stops and the delete Button share its row. */
      .root {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-rows:
          calc(var(--_tp-gradient-picker-midpoint) * 2)
          var(--_tp-gradient-picker-row);
        align-items: center;
        min-inline-size: 0;
      }

      .surface {
        grid-row: 1 / 3;
        grid-column: 1;
        align-self: stretch;
        position: relative;
        min-inline-size: 0;
        touch-action: none;
        user-select: none;
        cursor: copy;
      }

      .surface[data-locked] {
        cursor: default;
      }

      .track {
        position: absolute;
        inset-inline: 0;
        inset-block-end: calc(
          (var(--_tp-gradient-picker-row) - var(--_tp-gradient-picker-track)) / 2
        );
        block-size: var(--_tp-gradient-picker-track);
      }

      /* Positions 0 and 1 sit on the track's rounded ends: the handles span an inset frame. */
      .frame {
        position: absolute;
        inset-block: 0;
        inset-inline: calc(var(--_tp-gradient-picker-stop) / 2);
        pointer-events: none;
      }

      .stop,
      .midpoint {
        position: absolute;
        pointer-events: auto;
        touch-action: none;
        cursor: grab;
      }

      .surface[data-locked] :is(.stop, .midpoint) {
        cursor: default;
      }

      .stop {
        inset-block-end: calc(
          (var(--_tp-gradient-picker-row) - var(--_tp-gradient-picker-stop)) / 2
        );
        margin-inline-start: calc(var(--_tp-gradient-picker-stop) / -2);
      }

      /* The selected and the dragged stop paint above their neighbors. */
      .stop[data-selected] {
        z-index: 1;
      }

      .stop[data-dragging] {
        z-index: 2;
      }

      /* The hit box stays square so it never reaches the track; only the diamond turns. */
      .midpoint {
        /* Above the stops' hit areas in the row over the track. */
        z-index: 3;
        inset-block-start: calc(var(--_tp-gradient-picker-midpoint) * 0.5);
        inline-size: var(--_tp-gradient-picker-midpoint);
        block-size: var(--_tp-gradient-picker-midpoint);
        margin-inline-start: calc(var(--_tp-gradient-picker-midpoint) / -2);
      }

      .diamond {
        position: absolute;
        inset: 0;
        box-sizing: border-box;
        rotate: 45deg;
      }

      .midpoint[hidden] {
        display: none;
      }

      .remove {
        grid-row: 2;
        grid-column: 2;
        margin-inline-start: var(--tp-space-2);
      }

      /* Field: the canvas fills a box of the field's aspect; anchors sit on it, centered on their
         point. Field coordinates are an image's, so they never mirror. */
      .root[data-variant='field'] {
        grid-template-rows: auto;
        align-items: end;
      }

      .field-surface {
        grid-row: 1;
        grid-column: 1;
        position: relative;
        min-inline-size: 0;
        aspect-ratio: var(--_tp-gradient-picker-aspect);
        touch-action: none;
        user-select: none;
        cursor: crosshair;
      }

      .field-surface[data-locked] {
        cursor: default;
      }

      .field {
        position: absolute;
        inset: 0;
        display: block;
        inline-size: 100%;
        block-size: 100%;
      }

      .anchor {
        inset-block-end: auto;
        margin: calc(var(--_tp-gradient-picker-stop) / -2) 0 0
          calc(var(--_tp-gradient-picker-stop) / -2);
      }

      /* Field: the remove Button floats in a corner of the field, at the bottom end, and moves to
         the top end while the selected anchor sits under it (see #placeRemove). */
      .field-surface .remove {
        position: absolute;
        z-index: 4;
        inset-block-end: var(--tp-space-2);
        inset-inline-end: var(--tp-space-2);
        margin: 0;
        translate: 0 var(--_tp-gradient-picker-remove-shift, 0);
      }

      ${rangeHandleStyles('.stop, .midpoint')}

      /* A midpoint's hit area keeps to the row above the track, so a press on the track always
         adds a stop. */
      .midpoint::after {
        inset-block: calc(var(--_tp-gradient-picker-midpoint) * -0.5);
      }
    `,
  ];

  /**
   * Stops or anchors, as records, the element starts with when neither `value` nor
   * `tp-gradient-stop` children supply them.
   */
  defaultValue: GradientPickerValue | undefined;
  /** The selected index when `selected` is not set; `-1` selects none. */
  defaultSelected: number | undefined;
  /** Whether the picker edits color stops along a track or color anchors on a field. */
  variant: GradientPickerVariant = 'linear';
  /**
   * The color space colors mix in, for the preview and `sample()`; match the renderer that draws
   * the gradient.
   */
  interpolation: GradientInterpolation = 'oklab';
  /**
   * Field: how an anchor's weight falls off with distance.
   * @default 'inverse-distance'
   */
  falloff: FieldGradientFalloff = FIELD_GRADIENT_DEFAULTS.falloff;
  /** Field: the falloff's power, from 0.4 to 6; higher keeps each anchor's color closer to it. */
  power = FIELD_GRADIENT_DEFAULTS.power;
  /** Field: how far the domain warp bends the regions' borders, from 0 to 0.6. */
  warpAmplitude = FIELD_GRADIENT_DEFAULTS.warpAmplitude;
  /** Field: how many waves the domain warp lays across the field, from 0.3 to 4. */
  warpFrequency = FIELD_GRADIENT_DEFAULTS.warpFrequency;
  /**
   * Field: how distances are measured, either across a sphere's longitude and latitude so the
   * field wraps at its left and right edges as an environment map does, or straight across a flat
   * plane.
   * @default 'equirectangular'
   */
  projection: FieldGradientProjection = FIELD_GRADIENT_DEFAULTS.projection;
  /** The fewest stops the gradient keeps (2 linear, 1 field by default); removing below it is refused. */
  minStops: number | undefined;
  /** The most stops the gradient takes (no limit linear, 8 field by default); adding beyond it is refused. */
  maxStops: number | undefined;
  /** Shows the Button that removes the selected stop; `removable="false"` hides it. */
  removable = true;
  /** How far an Arrow key moves a handle, as a fraction of the track or the field. */
  step = 0.01;
  /** The track, handle and Button size; `sm` fits a compact panel. */
  size: GradientPickerSize = 'default';
  /** The accessible name of the group; each handle's name follows it. */
  label = '';
  /** Requires at least one stop for a valid form value. */
  required = false;
  /** Replaces the announced and shown words. */
  strings: Partial<GradientPickerStrings> = {};
  /**
   * Called synchronously with each `tp-value-change` proposal, before listeners; a controlled owner
   * writes `value` back here to accept it.
   */
  onValueChange: GradientPickerValueChangeCallback | undefined;
  /** Called with each settled value: once per drag, and at once for keys, presses and removals. */
  onValueCommitted: GradientPickerValueCommitCallback | undefined;
  /**
   * Called synchronously with each `tp-selection-change` proposal; a controlled owner writes
   * `selected` back here to accept it.
   */
  onSelectionChange: GradientPickerSelectionChangeCallback | undefined;

  #provided: GradientPickerValue | undefined;
  #providedSelected: number | undefined;
  #surface: HTMLElement | null = null;
  #frame: HTMLElement | null = null;
  #fieldSurface: HTMLElement | null = null;
  #canvas: HTMLCanvasElement | null = null;
  #fieldObserver: ResizeObserver | undefined;
  #fieldSize = { width: 0, height: 0 };
  #drawn = '';
  #drag: PointerDrag | undefined;
  /** The gesture's value and selection before the press, restored by Escape. */
  #pressed: { value: GradientPickerValue; selected: number } | undefined;
  /** The value a drag moves from: the pressed value, with the stop a press added. */
  #base: GradientPickerValue | undefined;
  #baseIndex = -1;
  #active: Active | undefined;
  #dragging = false;
  #focused: Active | undefined;
  #focusVisible = false;

  readonly #state = new ControllableState<GradientPickerValue>({
    host: this,
    initialValue: [],
    readControlledValue: () =>
      this.#provided === undefined ? undefined : this.#normalize(this.#provided),
    readDefaultValue: () =>
      this.#markupDefault ??
      (this.defaultValue === undefined ? undefined : this.#normalize(this.defaultValue)),
    hasDefaultValue: () => this.defaultValue !== undefined || this.#markupDefault !== undefined,
    equals: sameEntries,
    onChange: (event) => this.onValueChange?.(event),
    onCommit: (value, previous, reason) => {
      if (this.#markup && !this.controlled) {
        // A reset returns the markup to its written state, from which author changes count again.
        if (reason === 'form-reset') this.#edited = false;
        else if (!sameEntries(value, this.#readStops() ?? [])) this.#edited = true;
        this.#writeStops(value);
      }
      this.emit('tp-field-value', { value, previousValue: previous, reason });
    },
    diagnostic: (message) => this.diagnose('gradient-picker-state', message),
  });
  readonly #selectedState = new ControllableState<number>({
    host: this,
    initialValue: -1,
    readControlledValue: () => this.#providedSelected,
    readDefaultValue: () => this.defaultSelected,
    hasDefaultValue: () => this.defaultSelected !== undefined,
    equals: (a, b) => a === b,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-selection-change'),
    onChange: (event) => this.onSelectionChange?.(event),
    diagnostic: (message) => this.diagnose('gradient-picker-selection', message),
  });

  // ---- public lanes --------------------------------------------------------------------------

  /**
   * The stops in gradient order (`linear`), or the anchors in their given order (`field`).
   */
  override get value(): GradientPickerValue {
    return this.#state.value;
  }
  override set value(value: GradientPickerValue) {
    const previous = this.value;
    this.#provided = value === null || value === undefined ? undefined : value;
    if (this.hasUpdated) this.#state.sync();
    this.requestUpdate('value', previous);
  }

  /** The selected index, `-1` for none. */
  get selected(): number {
    const index = this.#selectedState.value;
    return Number.isInteger(index) && index >= 0 && index < this.value.length ? index : -1;
  }
  set selected(value: number) {
    const previous = this.selected;
    this.#providedSelected =
      value === null || value === undefined || !Number.isFinite(value) ? undefined : value;
    if (this.hasUpdated) this.#selectedState.sync();
    this.requestUpdate('selected', previous);
  }

  /** Whether an owner supplies `value`. */
  get controlled(): boolean {
    return this.#state.controlled;
  }

  /**
   * Proposes new stops or anchors as an edit does: published at once while uncontrolled, asked of
   * the owner while controlled. Returns whether the proposal was accepted.
   */
  setValue(
    value: GradientPickerValue,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    const previous = this.value;
    const next = this.#normalize(value);
    if (sameEntries(previous, next)) return true;
    if (!this.#propose(next, reason, sourceEvent)) return false;
    this.#commit(previous, reason, sourceEvent);
    return true;
  }

  /**
   * Changes one stop or anchor from a control composed around the element, such as its color or
   * location. A linear stop that moves past a neighbor passes it, and stays selected if it was.
   * Returns whether the proposal was accepted.
   */
  setStop(
    index: number,
    changes: GradientPickerStopChanges,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    const previous = this.value;
    if (!previous[index]) return false;
    let next: GradientPickerValue;
    let landing = index;
    if (this.#field) {
      next = normalizeFieldAnchors(
        this.#anchors.map((entry, at) => (at === index ? { ...entry, ...changes } : entry)),
      );
    } else {
      const stops = this.#stops;
      const merged = stops.map((entry, at) =>
        at === index ? { ...entry, ...changes, position: entry.position } : entry,
      );
      const moved = moveGradientStop(merged, index, changes.position ?? stops[index]!.position);
      next = moved.stops;
      landing = moved.index;
    }
    if (sameEntries(previous, next)) return true;
    if (!this.#propose(next, reason, sourceEvent)) return false;
    if (this.selected === index) this.#select(landing, reason, sourceEvent);
    this.#commit(previous, reason, sourceEvent);
    return true;
  }

  /** Proposes the selected index (`-1` for none); returns whether it was accepted. */
  setSelected(index: number, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    const next = Number.isInteger(index) && index >= 0 && index < this.value.length ? index : -1;
    if (next === this.selected) return true;
    return this.#selectedState.set(next, reason, sourceEvent);
  }

  /**
   * The color at `x` along a linear gradient (`y` unused), or at `(x, y)` on a field gradient,
   * each 0–1, mixed as the preview mixes it.
   */
  sample(x: number, y = 0.5): ColorValue {
    return this.#field
      ? sampleFieldGradient(this.#anchors, x, y, this.#fieldOptions)
      : sampleLinearGradient(this.#stops, x, this.interpolation);
  }

  // ---- lifecycle -----------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker.
    this.setAttribute('data-field-control', '');
    this.addEventListener('tp-gradient-stop-change', this.#stopsChanged);
  }

  override disconnectedCallback(): void {
    this.#drag?.disconnect();
    this.#drag = undefined;
    this.#surface = null;
    this.#fieldSurface = null;
    this.#fieldObserver?.disconnect();
    this.#fieldObserver = undefined;
    this.#endGesture();
    this.removeEventListener('tp-gradient-stop-change', this.#stopsChanged);
    super.disconnectedCallback();
  }

  // ---- markup --------------------------------------------------------------------------------

  /** Whether the stops are declared as `tp-gradient-stop` children, which then mirror the value. */
  #markup = false;
  /** The stops the markup declared, which a form reset restores. */
  #markupDefault: GradientPickerValue | undefined;

  #stopElements(): Element[] {
    return [...this.children].filter((child) => child.localName === STOP_TAG);
  }

  /** The stops the children declare, or `undefined` when the picker has none. */
  #readStops(): GradientPickerValue | undefined {
    const elements = this.#stopElements();
    if (!elements.length && !this.#markup) return undefined;
    return this.#normalize(elements.map(readStop) as GradientPickerValue);
  }

  /** Whether the picker has written an edit to its children since the markup was read. */
  #edited = false;

  /**
   * A child was added, removed or changed. The picker's own writes read back as the value; any
   * other change is the author's and becomes the value. Until the picker's first edit it also
   * becomes the reset default, so markup that arrives while the page parses counts as written.
   */
  readonly #stopsChanged = (): void => {
    if (this.controlled) return;
    const read = this.#readStops();
    if (!read) return;
    this.#markup = true;
    if (sameEntries(read, this.value)) return;
    if (!this.#edited) this.#markupDefault = read;
    this.#state.reconcile(read);
  };

  /**
   * Mirrors the value into the stop children: an unchanged stop keeps its element, a changed one
   * takes a spare element, new ones are created, leftovers are removed, all in gradient order.
   */
  #writeStops(value: GradientPickerValue): void {
    const elements = this.#stopElements();
    const entries = value as readonly Entry[];
    const used = new Set<Element>();
    const matched = entries.map((entry) => {
      const element = elements.find(
        (candidate) =>
          !used.has(candidate) &&
          sameEntries([readStop(candidate)] as GradientPickerValue, [entry] as GradientPickerValue),
      );
      if (element) used.add(element);
      return element;
    });
    const spare = elements.filter((element) => !used.has(element));
    const ordered = matched.map((element, index) => {
      const target = element ?? spare.shift() ?? this.ownerDocument.createElement(STOP_TAG);
      writeStop(target, entries[index]!);
      return target;
    });
    for (const element of spare) element.remove();
    const current = this.#stopElements();
    if (
      current.length !== ordered.length ||
      current.some((element, index) => element !== ordered[index])
    )
      for (const element of ordered) this.append(element);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.hasUpdated) {
      const read = this.#readStops();
      if (read) {
        this.#markup = true;
        this.#markupDefault = read;
      }
    }
    this.#state.initialize();
    this.#selectedState.initialize();
    // A variant reads its own fields: an uncontrolled value takes the new variant's shape.
    if (changed.has('variant') && changed.get('variant') !== undefined)
      this.#state.reconcile(this.#normalize(this.value));
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const value = this.value;
    const text = value.length ? JSON.stringify(value) : null;
    this.setFormValue(text, text);
    this.setRequiredValidity(this.required && !value.length, 'Add at least one stop.');
    const input = this.renderRoot.querySelector<HTMLInputElement>('input:focus');
    if (input && input.matches(':focus-visible') !== this.#focusVisible) {
      this.#focusVisible = input.matches(':focus-visible');
      this.requestUpdate();
    }
    this.#drawField();
    this.#placeRemove();
  }

  /**
   * Keeps the field's remove Button off the anchor it acts on: it takes the bottom end corner, and
   * the top end corner while the dragged or selected anchor reaches into the bottom one.
   */
  #placeRemove(): void {
    const surface = this.#fieldSurface;
    const button = surface?.querySelector<HTMLElement>(':scope > .remove');
    if (!this.#field || !surface || !button || button.hidden) return;
    const index = this.#active?.kind === 'anchor' ? this.#active.index : this.selected;
    const anchor = this.#anchors[index];
    const width = surface.clientWidth;
    const height = surface.clientHeight;
    const handle = surface.querySelector<HTMLElement>('.anchor');
    // The anchor's handle and a gap around it may not touch the Button.
    const reach = (handle?.offsetWidth ?? 20) / 2 + 8;
    const left = button.offsetLeft;
    const top = button.offsetTop;
    const under =
      !!anchor &&
      anchor.x * width > left - reach &&
      anchor.x * width < left + button.offsetWidth + reach &&
      anchor.y * height > top - reach &&
      anchor.y * height < top + button.offsetHeight + reach;
    const inset = height - top - button.offsetHeight;
    button.toggleAttribute('data-raised', under);
    button.style.setProperty(
      '--_tp-gradient-picker-remove-shift',
      under ? `${-(height - 2 * inset - button.offsetHeight)}px` : '0px',
    );
  }

  protected override resetFormValue(): void {
    this.#state.reset();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    const value = parseList(state);
    if (value)
      this.#state.set(this.#normalize(value), 'programmatic', undefined, { cancelable: false });
  }

  override get inputElement(): HTMLElement | null {
    return this.#input({
      kind: this.#field ? 'anchor' : 'stop',
      index: Math.max(0, this.selected),
    });
  }

  protected override focusTarget(): HTMLElement | null {
    return this.inputElement ?? super.focusTarget();
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="gradient-picker"]');
  }

  // ---- model ---------------------------------------------------------------------------------

  get #field(): boolean {
    return this.variant === 'field';
  }

  get #stops(): readonly GradientStop[] {
    return this.value as readonly GradientStop[];
  }

  get #anchors(): readonly FieldGradientAnchor[] {
    return this.value as readonly FieldGradientAnchor[];
  }

  #normalize(value: GradientPickerValue): GradientPickerValue {
    return this.#field
      ? normalizeFieldAnchors(value as readonly FieldGradientAnchor[])
      : normalizeGradientStops(value as readonly GradientStop[]);
  }

  get #fieldOptions(): FieldGradientOptions {
    return {
      falloff: this.falloff,
      power: this.power,
      warpAmplitude: this.warpAmplitude,
      warpFrequency: this.warpFrequency,
      projection: this.projection,
      interpolation: this.interpolation,
    };
  }

  get #minStops(): number {
    return this.minStops !== undefined && Number.isFinite(this.minStops)
      ? Math.max(0, this.minStops)
      : this.#field
        ? 1
        : 2;
  }

  get #maxStops(): number {
    return this.maxStops !== undefined && Number.isFinite(this.maxStops)
      ? Math.max(1, this.maxStops)
      : this.#field
        ? 8
        : Infinity;
  }

  // ---- proposals -----------------------------------------------------------------------------

  get #editable(): boolean {
    return !this.effectiveDisabled && !this.readOnly;
  }

  get #text(): GradientPickerStrings {
    return resolveStrings(this.strings);
  }

  #propose(value: GradientPickerValue, reason: ChangeReason, source?: Event): boolean {
    return this.#state.set(value, reason, source);
  }

  #select(index: number, reason: ChangeReason, source?: Event): void {
    if (index !== this.selected) this.#selectedState.set(index, reason, source);
  }

  /**
   * Emits the commit once the proposal settles: at once while uncontrolled, after the owner's
   * write-back render while controlled.
   */
  #commit(previous: GradientPickerValue, reason: ChangeReason, source?: Event): void {
    const finish = (): void => {
      const value = this.value;
      if (sameEntries(previous, value)) return;
      const event = new TpValueCommitEvent(value, previous, reason, source);
      this.onValueCommitted?.(event);
      this.dispatchEvent(event);
    };
    if (!this.controlled) finish();
    else void Promise.resolve().then(() => this.updateComplete.then(finish));
  }

  /** Removes the stop or anchor at `index` and selects its neighbor; returns whether it did. */
  #remove(index: number, reason: ChangeReason, source?: Event): boolean {
    if (!this.#editable) return false;
    const previous = this.value;
    const next = this.#field
      ? removeFieldAnchor(this.#anchors, index, this.#minStops)
      : removeGradientStop(this.#stops, index, this.#minStops);
    if (!next || !this.#propose(next, reason, source)) return false;
    this.#select(Math.min(index, next.length - 1), reason, source);
    this.#commit(previous, reason, source);
    return true;
  }

  /** The remove Button keeps focus while it can remove more; at the minimum, the stop takes it. */
  readonly #removePress = (event: MouseEvent): void => {
    if (!this.#remove(this.selected, 'item-press', event)) return;
    if (this.value.length <= this.#minStops)
      this.#focusLater({
        kind: this.#field ? 'anchor' : 'stop',
        index: Math.max(0, this.selected),
      });
  };

  // ---- pointer -------------------------------------------------------------------------------

  #connectDrag(element: HTMLElement, handles: string): void {
    this.#drag?.disconnect();
    this.#drag = new PointerDrag({
      element,
      owner: this.ownerDocument.defaultView,
      disabled: () => !this.#editable,
      // A press inside a handle drags it from where it was pressed.
      grip: (event) => (event.target as Element | null)?.closest?.(handles),
      focusTarget: () => (this.#active ? this.#input(this.#active) : null),
      handlers: {
        begin: (point, event) => this.#begin(point, event),
        move: (point, event) => {
          if (!this.#active) return;
          this.#dragging = true;
          this.#moveTo(point, 'drag', event);
          this.requestUpdate();
        },
        end: (point, event, dragged) => {
          const pressed = this.#pressed;
          if (this.#active && dragged) this.#moveTo(point, 'drag', event);
          this.#endGesture();
          this.requestUpdate();
          if (pressed) this.#commit(pressed.value, dragged ? 'drag' : 'track-press', event);
        },
        cancel: (reason, event) => {
          const pressed = this.#pressed;
          this.#endGesture();
          this.requestUpdate();
          if (!pressed) return;
          const why: ChangeReason = reason === 'escape' ? 'escape-key' : 'pointer';
          this.#propose(pressed.value, why, event ?? undefined);
          this.#select(pressed.selected, why, event ?? undefined);
        },
      },
    });
    this.#drag.connect();
  }

  #surfaceReference = (element: HTMLElement | null): void => {
    if (element === this.#surface) return;
    this.#surface = element;
    if (element) this.#connectDrag(element, '.stop, .midpoint');
  };

  #frameReference = (element: HTMLElement | null): void => {
    this.#frame = element;
  };

  #fieldSurfaceReference = (element: HTMLElement | null): void => {
    if (element === this.#fieldSurface) return;
    this.#fieldSurface = element;
    this.#fieldObserver?.disconnect();
    this.#fieldObserver = undefined;
    if (!element) return;
    this.#connectDrag(element, '.anchor');
    this.#fieldObserver = new (this.ownerDocument.defaultView ?? window).ResizeObserver(
      ([entry]) => {
        const box = entry?.contentRect;
        if (!box || box.width <= 0 || box.height <= 0) return;
        const width = Math.max(1, Math.round(Math.min(box.width, FIELD_RESOLUTION)));
        const height = Math.max(1, Math.round((width * box.height) / box.width));
        this.#fieldSize = { width, height };
        this.#drawField();
        this.#placeRemove();
      },
    );
    this.#fieldObserver.observe(element);
  };

  #canvasReference = (element: HTMLElement | null): void => {
    this.#canvas = element instanceof HTMLCanvasElement ? element : null;
    this.#drawn = '';
  };

  #endGesture(): void {
    this.#dragging = false;
    this.#active = undefined;
    this.#pressed = undefined;
    this.#base = undefined;
    this.#baseIndex = -1;
  }

  /** Where a track position falls along the gradient (0–1), in the writing direction. */
  #positionAt(point: PointerDragPoint): number {
    const frame = this.#frame;
    const left = frame?.offsetLeft ?? 0;
    const width = frame?.offsetWidth || point.width || 1;
    const fraction = Math.min(1, Math.max(0, (point.x - left) / width));
    return this.direction === 'rtl' ? 1 - fraction : fraction;
  }

  /** Where a field position falls on the field, each 0–1 from the top start. */
  #fieldPointAt(point: PointerDragPoint): { x: number; y: number } {
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    return { x: clamp(point.x / (point.width || 1)), y: clamp(point.y / (point.height || 1)) };
  }

  /**
   * Resolves a press: a handle to drag, a new linear stop where the track was pressed, or nothing
   * on the field's empty space, where a double press adds an anchor.
   */
  #begin(point: PointerDragPoint, event: PointerEvent): boolean | undefined {
    const value = this.value;
    const target = (event.target as Element | null)?.closest?.<HTMLElement>('.stop, .midpoint');
    if (target) {
      const index = Number(target.dataset.index);
      const kind: Kind = target.classList.contains('anchor')
        ? 'anchor'
        : target.classList.contains('stop')
          ? 'stop'
          : 'midpoint';
      this.#pressed = { value, selected: this.selected };
      this.#active = { kind, index };
      this.#base = value;
      this.#baseIndex = index;
      if (kind !== 'midpoint') this.#select(index, 'item-press', event);
      return undefined;
    }
    if (this.#field || value.length >= this.#maxStops) return false;
    const added = insertGradientStop(this.#stops, this.#positionAt(point), this.interpolation);
    this.#pressed = { value, selected: this.selected };
    if (!this.#propose(added.stops, 'track-press', event)) {
      this.#pressed = undefined;
      return false;
    }
    this.#select(added.index, 'track-press', event);
    this.#active = { kind: 'stop', index: added.index };
    this.#base = added.stops;
    this.#baseIndex = added.index;
    return undefined;
  }

  /** Moves the active handle to a surface position, from the value the gesture started with. */
  #moveTo(point: PointerDragPoint, reason: ChangeReason, source: Event): void {
    const active = this.#active;
    const base = this.#base;
    if (!active || !base) return;
    if (active.kind === 'anchor') {
      const at = this.#fieldPointAt(point);
      this.#propose(
        moveFieldAnchor(base as readonly FieldGradientAnchor[], active.index, at.x, at.y),
        reason,
        source,
      );
      return;
    }
    const stops = base as readonly GradientStop[];
    const at = this.#positionAt(point);
    if (active.kind === 'stop') {
      const moved = moveGradientStop(stops, this.#baseIndex, at);
      if (this.#propose(moved.stops, reason, source) || sameEntries(moved.stops, this.value)) {
        active.index = moved.index;
        this.#select(moved.index, reason, source);
      }
      return;
    }
    const from = stops[active.index];
    const to = stops[active.index + 1];
    if (!from || !to || to.position <= from.position) return;
    const midpoint = (at - from.position) / (to.position - from.position);
    this.#propose(moveGradientMidpoint(stops, active.index, midpoint), reason, source);
  }

  /** A double press on the field's empty space adds an anchor there in the field's own color. */
  readonly #fieldDoubleClick = (event: MouseEvent): void => {
    const surface = this.#fieldSurface;
    if (!surface || !this.#editable || this.value.length >= this.#maxStops) return;
    // A press captured by an anchor retargets the double press: test what lies under it.
    const under = (this.renderRoot as ShadowRoot).elementFromPoint(event.clientX, event.clientY);
    if (under?.closest('.anchor, .remove')) return;
    const box = surface.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const previous = this.value;
    const added = insertFieldAnchor(
      this.#anchors,
      (event.clientX - box.left) / box.width,
      (event.clientY - box.top) / box.height,
      this.#fieldOptions,
    );
    if (!this.#propose(added.anchors, 'track-press', event)) return;
    this.#select(added.index, 'track-press', event);
    this.#commit(previous, 'track-press', event);
  };

  /** Paints the field into the canvas when the anchors, the options or its size changed. */
  #drawField(): void {
    const canvas = this.#canvas;
    const { width, height } = this.#fieldSize;
    if (!this.#field || !canvas || !width || !height) return;
    const options = this.#fieldOptions;
    const key = JSON.stringify([this.value, options, width, height]);
    if (key === this.#drawn) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    this.#drawn = key;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    const image = context.createImageData(width, height);
    renderFieldGradient(this.#anchors, width, height, options, image.data);
    context.putImageData(image, 0, 0);
  }

  // ---- keyboard ------------------------------------------------------------------------------

  get #dimension(): DimensionDefinition {
    const step = this.step > 0 && Number.isFinite(this.step) ? Math.min(this.step, 1) : 0.01;
    return { min: 0, max: 1, step, smallStep: step / 10, largeStep: Math.min(1, step * 10) };
  }

  #keyDown = (event: KeyboardEvent): void => {
    if (!this.#editable) return;
    const input = event.currentTarget as HTMLInputElement;
    const kind = (input.dataset.kind ?? 'stop') as Kind;
    const index = Number(input.dataset.index);
    const value = this.value;
    if (kind !== 'midpoint' && (event.key === 'Delete' || event.key === 'Backspace')) {
      event.preventDefault();
      if (this.#remove(index, 'keyboard', event))
        this.#focusLater({ kind, index: Math.min(index, this.value.length - 1) });
      return;
    }
    if (kind === 'anchor') {
      this.#anchorKey(event, index, input.dataset.axis === 'y' ? 'y' : 'x');
      return;
    }
    const step = stepForKey(event, {
      definition: this.#dimension,
      axis: 'both',
      direction: this.direction,
    });
    if (!step) return;
    event.preventDefault();
    const stops = this.#stops;
    if (kind === 'stop') {
      const stop = stops[index];
      if (!stop) return;
      const at = applyKeyboardStep(stop.position, step, this.#dimension);
      const moved = moveGradientStop(stops, index, at);
      if (!this.#propose(moved.stops, 'keyboard', event)) return;
      this.#select(moved.index, 'keyboard', event);
      this.#commit(value, 'keyboard', event);
      if (moved.index !== index) this.#focusLater({ kind: 'stop', index: moved.index });
      return;
    }
    const current = stops[index]?.midpoint ?? 0.5;
    const next = Math.min(
      MIDPOINT_MAX,
      Math.max(
        MIDPOINT_MIN,
        step.kind === 'min'
          ? MIDPOINT_MIN
          : step.kind === 'max'
            ? MIDPOINT_MAX
            : applyKeyboardStep(current, step, this.#dimension),
      ),
    );
    if (this.#propose(moveGradientMidpoint(stops, index, next), 'keyboard', event))
      this.#commit(value, 'keyboard', event);
  };

  /**
   * A field anchor's keys: the horizontal arrows move it across, the vertical arrows up and
   * down, on either of its inputs; Page, Home and End act on the focused axis. The field is an
   * image, so the arrows never mirror.
   */
  #anchorKey(event: KeyboardEvent, index: number, axis: Axis): void {
    const anchor = this.#anchors[index];
    if (!anchor) return;
    const definition = this.#dimension;
    const across = stepForKey(event, { definition, axis: 'horizontal', direction: 'ltr' });
    const upDown = stepForKey(event, { definition, axis: 'vertical', direction: 'ltr' });
    // Up moves toward the top, where y is 0.
    const flip = (step: KeyboardStep | null): KeyboardStep | null =>
      step?.kind === 'delta' ? { kind: 'delta', amount: -step.amount } : step;
    let x = anchor.x;
    let y = anchor.y;
    if (across || upDown) {
      if (across) x = applyKeyboardStep(x, across, definition);
      if (upDown) y = applyKeyboardStep(y, flip(upDown)!, definition);
    } else {
      const step = stepForKey(event, { definition, axis: 'both', direction: 'ltr' });
      if (!step) return;
      if (axis === 'x') x = applyKeyboardStep(x, step, definition);
      else y = applyKeyboardStep(y, step, definition);
    }
    event.preventDefault();
    const previous = this.value;
    if (this.#propose(moveFieldAnchor(this.#anchors, index, x, y), 'keyboard', event))
      this.#commit(previous, 'keyboard', event);
  }

  #input(active: Active): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(
      `input[data-kind="${active.kind}"][data-index="${active.index}"]`,
    );
  }

  /** Focuses a handle's input after the render that moved it there. */
  #focusLater(active: Active): void {
    void this.updateComplete.then(() => this.#input(active)?.focus());
  }

  #restoreInput = (event: Event): void => {
    // The element owns the value; a native range key never publishes.
    const input = event.currentTarget as HTMLInputElement;
    input.value = input.getAttribute('aria-valuenow') ?? input.value;
  };

  #focus = (event: FocusEvent): void => {
    const input = event.currentTarget as HTMLInputElement;
    const kind = (input.dataset.kind ?? 'stop') as Kind;
    const index = Number(input.dataset.index);
    this.#focused = { kind, index };
    this.#focusVisible = input.matches(':focus-visible');
    // Focusing a stop or anchor selects it, as pressing it does.
    if (kind !== 'midpoint' && this.#editable && !this.#active) this.#select(index, 'focus', event);
    this.requestUpdate();
  };

  #blur = (): void => {
    this.#focused = undefined;
    this.#focusVisible = false;
    this.requestUpdate();
  };

  // ---- render --------------------------------------------------------------------------------

  #markers(active: Active): Record<string, unknown> {
    const focused = this.#focused?.kind === active.kind && this.#focused.index === active.index;
    const dragging =
      this.#dragging && this.#active?.kind === active.kind && this.#active.index === active.index;
    return stateMarkers(
      {
        disabled: this.effectiveDisabled,
        readOnly: this.readOnly,
        dragging,
        focused,
        focusVisible: focused && this.#focusVisible,
      },
      ['disabled', 'readOnly', 'dragging', 'focused', 'focusVisible'],
    );
  }

  #handleInput(
    active: Active,
    value: number,
    name: string,
    valueText: string,
    options: { min?: number; max?: number; axis?: Axis } = {},
  ) {
    const { min = 0, max = 1, axis } = options;
    const props: Record<string, unknown> = {
      type: 'range',
      class: 'dimension',
      part: 'focusable',
      'data-kind': active.kind,
      'data-index': String(active.index),
      'data-axis': axis,
      '.min': String(min),
      '.max': String(max),
      '.step': String(this.#dimension.step),
      '.value': String(value),
      '.disabled': this.effectiveDisabled,
      tabindex: this.effectiveDisabled ? -1 : 0,
      'aria-label': this.label ? `${this.label}: ${name}` : name,
      'aria-valuemin': String(Math.round(min * 100)),
      'aria-valuemax': String(Math.round(max * 100)),
      'aria-valuenow': String(Math.round(value * 1000) / 10),
      'aria-valuetext': valueText,
      'aria-orientation': axis === 'y' ? 'vertical' : 'horizontal',
      'aria-readonly': this.readOnly ? 'true' : undefined,
      '@keydown': this.#keyDown,
      '@input': this.#restoreInput,
      '@focus': this.#focus,
      '@blur': this.#blur,
    };
    return html`<input ${bindPart(props, [])} />`;
  }

  #renderStop(stop: GradientStop, index: number, count: number, selected: number) {
    const active: Active = { kind: 'stop', index };
    const name = format(this.#text.stop, { index: index + 1, count });
    return this.renderPart(
      'gradient-picker-stop',
      { size: this.size, variant: this.variant, index, selected: index === selected },
      {
        tag: 'span',
        properties: {
          part: 'gradient-picker-stop',
          class: 'stop',
          'data-index': String(index),
          'data-selected': index === selected,
          style: {
            'inset-inline-start': `${(stop.position * 100).toFixed(3)}%`,
            '--_tp-handle-paint': paintOf(stop.color),
          },
          ...this.#markers(active),
        },
        content: this.#handleInput(
          active,
          stop.position,
          name,
          `${percent(stop.position)}, ${stop.color}`,
        ),
      },
    );
  }

  #renderMidpoint(stops: readonly GradientStop[], index: number) {
    const from = stops[index]!;
    const to = stops[index + 1]!;
    const midpoint = from.midpoint ?? 0.5;
    const at = from.position + (to.position - from.position) * midpoint;
    const active: Active = { kind: 'midpoint', index };
    const name = format(this.#text.midpoint, { from: index + 1, to: index + 2 });
    const markers = this.#markers(active);
    const diamond = this.renderPart(
      'gradient-picker-midpoint',
      { size: this.size, index },
      {
        tag: 'span',
        properties: {
          part: 'gradient-picker-midpoint',
          class: 'diamond',
          'aria-hidden': 'true',
          ...markers,
        },
      },
    );
    return html`<span
      ${bindPart(
        {
          class: 'midpoint',
          'data-index': String(index),
          // Stops at one position leave no span to mix across.
          hidden: to.position <= from.position,
          style: `inset-inline-start: ${(at * 100).toFixed(3)}%`,
          ...markers,
        },
        [],
      )}
      >${diamond}${this.#handleInput(active, midpoint, name, percent(midpoint), {
        min: MIDPOINT_MIN,
        max: MIDPOINT_MAX,
      })}</span
    >`;
  }

  #renderAnchor(anchor: FieldGradientAnchor, index: number, count: number, selected: number) {
    const text = this.#text;
    const active: Active = { kind: 'anchor', index };
    const name = format(text.anchor, { index: index + 1, count });
    return this.renderPart(
      'gradient-picker-stop',
      { size: this.size, variant: this.variant, index, selected: index === selected },
      {
        tag: 'span',
        properties: {
          part: 'gradient-picker-stop',
          class: 'stop anchor',
          'data-index': String(index),
          'data-selected': index === selected,
          style: {
            left: `${(anchor.x * 100).toFixed(3)}%`,
            top: `${(anchor.y * 100).toFixed(3)}%`,
            '--_tp-handle-paint': paintOf(anchor.color),
          },
          ...this.#markers(active),
        },
        content: html`${this.#handleInput(
          active,
          anchor.x,
          `${name} ${text.horizontal}`,
          `${percent(anchor.x)}, ${anchor.color}`,
          { axis: 'x' },
        )}${this.#handleInput(
          active,
          anchor.y,
          `${name} ${text.vertical}`,
          `${percent(anchor.y)}, ${anchor.color}`,
          { axis: 'y' },
        )}`,
      },
    );
  }

  #renderLinear(state: Record<string, unknown>, selected: number) {
    const stops = this.#stops;
    return html`<div
      ${bindPart(
        {
          class: 'surface',
          'data-locked': !this.#editable,
          'data-disabled': this.effectiveDisabled,
        },
        [this.#surfaceReference],
      )}
    >
      ${this.renderPart('gradient-picker-track', state, {
        tag: 'div',
        properties: { part: 'gradient-picker-track', class: 'track', 'aria-hidden': 'true' },
      })}
      <div ${bindPart({ class: 'frame' }, [this.#frameReference])}>
        ${stops.map(
          (stop, index) =>
            html`${this.#renderStop(stop, index, stops.length, selected)}${
              index < stops.length - 1 ? this.#renderMidpoint(stops, index) : nothing
            }`,
        )}
      </div>
    </div>`;
  }

  #renderField(state: Record<string, unknown>, selected: number, remove: unknown) {
    const anchors = this.#anchors;
    return html`<div
      ${bindPart(
        {
          class: 'field-surface',
          'data-locked': !this.#editable,
          'data-disabled': this.effectiveDisabled,
          '@dblclick': this.#fieldDoubleClick,
        },
        [this.#fieldSurfaceReference],
      )}
    >
      ${this.renderPart('gradient-picker-field', state, {
        tag: 'canvas',
        reference: this.#canvasReference,
        properties: { part: 'gradient-picker-field', class: 'field', 'aria-hidden': 'true' },
      })}
      ${anchors.map((anchor, index) => this.#renderAnchor(anchor, index, anchors.length, selected))}
      ${remove}
    </div>`;
  }

  protected override render() {
    const text = this.#text;
    const value = this.value;
    const selected = this.selected;
    const field = this.#field;
    const state = {
      size: this.size,
      variant: this.variant,
      dragging: this.#dragging,
      count: value.length,
      selected,
    };
    const canRemove = this.#editable && selected >= 0 && value.length > this.#minStops;
    // On the field the Button floats over the colors, so it takes a surface of its own, and it
    // shows only while an anchor is selected and can be edited.
    const remove = this.removable
      ? html`<tp-button
          class="remove"
          part="gradient-picker-remove"
          variant=${field ? 'secondary' : 'ghost'}
          size="icon-sm"
          .icon=${trashIcon}
          .ariaLabel=${text.remove}
          ?hidden=${field && !(this.#editable && selected >= 0)}
          ?disabled=${!canRemove}
          @click=${this.#removePress}
        ></tp-button>`
      : nothing;
    return html`${this.renderPart('gradient-picker', state, {
        tag: 'div',
        properties: {
          part: 'gradient-picker',
          class: 'root',
          role: 'group',
          'aria-label': this.label || this.getAttribute('aria-label') || text.label,
          'data-variant': this.variant,
          'data-dragging': this.#dragging,
          style: field
            ? {}
            : {
                '--_tp-gradient-picker-paint': gradientTrackPaint(this.#stops, this.interpolation),
                '--_tp-gradient-picker-axis': this.direction === 'rtl' ? 'to left' : 'to right',
              },
        },
        content: field
          ? this.#renderField(state, selected, remove)
          : html`${this.#renderLinear(state, selected)}${remove}`,
      })}<slot hidden @slotchange=${this.#stopsChanged}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-gradient-picker': TpGradientPicker;
  }
}
