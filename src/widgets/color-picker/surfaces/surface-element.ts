import type { PropertyValues } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { createId } from '../../../foundation/id.js';
import type { ChangeReason } from '../../../foundation/types.js';
import { colorPickerPresentation } from '../../../presentation/families/color-picker.js';
import { channelDefinitions, type ChannelDefinition } from '../color/channels.js';
import type { Hsv } from '../color/harmony.js';
import { applyKeyboardStep, channelValueText, dimensionLabel, stepForKey } from '../dimensions.js';
import { DEFAULT_STRINGS, resolveStrings } from '../strings.js';
import { colorSurfaceStyles } from '../styles.js';
import type { ColorPickerStrings } from '../types.js';

/** What a surface proposes to its owner: a partial HSV, the cause and the commit policy. */
export interface ColorSurfaceChangeDetail {
  readonly hsv: Partial<Hsv>;
  readonly reason: ChangeReason;
  readonly sourceEvent: Event;
  /** `propose`: live proposal; `commit`: settle; `restore`: abandon to the pre-press value. */
  readonly phase: 'press' | 'propose' | 'commit' | 'restore';
  /** Custom harmony handle index (0 is the base); absent for the base dimensions. */
  readonly handle?: number;
}

export const SURFACE_CHANGE = 'color-surface-change';

const HSV_CHANNELS = channelDefinitions('hsv', false);
export const HUE_CHANNEL: ChannelDefinition = HSV_CHANNELS[0]!;
export const SATURATION_CHANNEL: ChannelDefinition = HSV_CHANNELS[1]!;
export const VALUE_CHANNEL: ChannelDefinition = HSV_CHANNELS[2]!;

/**
 * Base of the three render surfaces. Each editable dimension is a hidden native range input
 * (Slider thumb pattern) with the slider role, an accessible name and value text. Surfaces
 * are constituents of the color picker family and never leave its shadow root: their change
 * events bubble inside the widget's shadow tree only (`composed: false`).
 */
export abstract class ColorSurfaceElement extends TpElement {
  static override presentation = colorPickerPresentation;
  static override properties = {
    ...TpElement.properties,
    hue: { type: Number },
    saturation: { type: Number },
    brightness: { type: Number },
    label: { type: String },
    strings: { attribute: false },
    allowWheelScrub: { type: Boolean, attribute: 'allow-wheel-scrub' },
  };
  static override styles = [TpElement.styles, colorSurfaceStyles];

  hue = 0;
  saturation = 0;
  brightness = 0;
  label = '';
  strings: Partial<ColorPickerStrings> = {};
  allowWheelScrub = false;

  protected readonly groupId = createId('tp-color-surface');
  #focused = false;
  #focusVisible = false;
  #dragging = false;

  /** The widget hosting this surface, for axis resolution of the shared family. */
  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  protected get text(): ColorPickerStrings {
    return this.strings === DEFAULT_STRINGS ? DEFAULT_STRINGS : resolveStrings(this.strings);
  }

  get dragging(): boolean {
    return this.#dragging;
  }

  protected setDragging(dragging: boolean): void {
    if (this.#dragging === dragging) return;
    this.#dragging = dragging;
    this.requestUpdate();
  }

  protected get rtl(): boolean {
    return this.direction === 'rtl';
  }

  protected get editable(): boolean {
    return !this.disabled && !this.readOnly;
  }

  protected markers(): Record<string, unknown> {
    return {
      'data-disabled': this.disabled,
      'data-readonly': this.readOnly,
      'data-dragging': this.#dragging,
      'data-focused': this.#focused,
      'data-focus-visible': this.#focusVisible,
    };
  }

  /** Emits a change to the owning widget without crossing the widget's shadow boundary. */
  protected propose(detail: ColorSurfaceChangeDetail): void {
    this.dispatchEvent(new CustomEvent(SURFACE_CHANGE, { detail, bubbles: true, composed: false }));
  }

  /** Native range input properties for one dimension (`lit` property bindings through spread). */
  protected dimensionInput(
    definition: ChannelDefinition,
    current: number,
    name: string,
    orientation: 'horizontal' | 'vertical',
    onKey: (event: KeyboardEvent) => void,
    extra: Record<string, unknown> = {},
  ): Record<string, unknown> {
    return {
      type: 'range',
      class: 'dimension',
      part: 'focusable',
      'data-dimension': definition.key,
      '.min': String(definition.min),
      '.max': String(definition.max),
      '.step': String(definition.smallStep),
      '.value': String(current),
      '.disabled': this.disabled,
      tabindex: this.disabled ? -1 : 0,
      'aria-label': dimensionLabel(this.label, name),
      'aria-valuemin': String(definition.min),
      'aria-valuemax': String(definition.max),
      'aria-valuenow': String(Math.round(current * 1000) / 1000),
      'aria-valuetext': channelValueText(definition, current),
      'aria-orientation': orientation,
      'aria-readonly': this.readOnly ? 'true' : undefined,
      '@keydown': onKey,
      '@input': this.#restoreInput,
      '@focus': this.#focus,
      '@blur': this.#blur,
      ...extra,
    };
  }

  /** Resolves a keyboard step for a dimension; null when the key is not handled. */
  protected keyboardValue(
    event: KeyboardEvent,
    definition: ChannelDefinition,
    current: number,
    axis: 'horizontal' | 'vertical' | 'both',
    angular = false,
  ): number | null {
    const step = stepForKey(event, { definition, axis, direction: this.direction, angular });
    if (!step) return null;
    return applyKeyboardStep(current, step, definition);
  }

  #restoreInput = (event: Event): void => {
    // The widget owns the value; the native default of a range key never publishes.
    const input = event.currentTarget as HTMLInputElement;
    input.value = input.getAttribute('aria-valuenow') ?? input.value;
  };

  #focus = (event: FocusEvent): void => {
    this.#focused = true;
    const input = event.currentTarget as HTMLInputElement;
    this.#focusVisible = input.matches(':focus-visible');
    this.requestUpdate();
  };

  #blur = (): void => {
    this.#focused = false;
    this.#focusVisible = false;
    this.requestUpdate();
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // Keyboard use after a pointer focus turns the ring on (Slider parity).
    const active = this.renderRoot.querySelector<HTMLInputElement>('input:focus');
    if (active && active.matches(':focus-visible') !== this.#focusVisible) {
      this.#focusVisible = active.matches(':focus-visible');
      this.requestUpdate();
    }
  }
}
