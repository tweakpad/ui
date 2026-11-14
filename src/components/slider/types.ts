import type { ComponentPartContract, ElementReference } from '../../foundation/part.js';
import type {
  SliderBufferedRange,
  SliderCollisionBehavior,
  SliderSegment,
  SliderSegmentState,
} from '../../foundation/slider.js';
import type { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';

/** A Slider's value: one number, or one per thumb for a range. */
export type SliderValue = number | number[];
/** How a Slider's thumbs sit on the track at its ends, as `thumbAlignment` takes it. */
export type SliderThumbAlignment = 'center' | 'edge' | 'delayed-edge';
/** What a Slider thumb dragged into its neighbor does, as `thumbCollisionBehavior` takes it. */
export type SliderThumbCollisionBehavior = SliderCollisionBehavior;
export type { SliderBufferedRange, SliderSegment, SliderSegmentState };
/** Detail of the non-cancelable `tp-slider-pointer-change` event. */
export interface SliderPointerChangeDetail {
  /** Unsnapped hovered value in the slider domain, or `null` when not pointing. */
  value: number | null;
  /** Hovered position as a 0–1 ratio of the domain, or `null` when not pointing. */
  ratio: number | null;
}
/** A summary of one Slider thumb, listed in the Slider's `thumbMetadata`. */
export interface SliderThumbMetadata {
  index: number;
  inputId: string;
  value: number | undefined;
  percentage: number;
  disabled: boolean;
}
/**
 * The full state of one Slider thumb, which its Slider resolves and the Thumb renders its input and
 * state markers from.
 */
export interface SliderThumbState extends Record<string, unknown> {
  index: number;
  value: number;
  percentage: number;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  invalid: boolean;
  dragging: boolean;
  active: boolean;
  orientation: 'horizontal' | 'vertical';
  minimum: number;
  maximum: number;
  step: number;
  /** The domain is empty or non-finite; the Thumb is disabled but still described. */
  indeterminate: boolean;
  label: string;
  valueText: string;
}
/**
 * `bar`: a thumbless track for scrubbing (media timelines); the Thumb keeps its input.
 * `inline`: one compact control-height bar with the label and the value inside it.
 */
export type SliderVariant = 'default' | 'bar' | 'inline';

/**
 * The Slider a Slider thumb belongs to, as the thumb's `slider` returns it; the thumb reads its
 * state from it and reports input back to it.
 */
export interface SliderThumbOwner {
  readonly orientation: 'horizontal' | 'vertical';
  readonly variant: SliderVariant;
  thumbState(thumb: HTMLElement): SliderThumbState;
  thumbContract(thumb: HTMLElement): ComponentPartContract;
  thumbPosition(thumb: HTMLElement): Record<string, string>;
  thumbChanged(): void;
  registerThumb(thumb: HTMLElement, node: HTMLElement | null): void;
  requestThumbValue(
    thumb: HTMLElement,
    value: number,
    reason: 'keyboard' | 'input',
    source: Event,
  ): void;
  thumbKey(thumb: HTMLElement, event: KeyboardEvent): void;
  thumbFocus(thumb: HTMLElement, focused: boolean): void;
}
/** A Slider's `onValueChange`, called with each proposed value before `tp-value-change`. */
export type SliderValueChangeCallback = (
  event: TpValueChangeEvent<SliderValue | undefined>,
) => void;
/** A Slider's `onValueCommitted`, called with each committed value before `tp-value-commit`. */
export type SliderValueCommitCallback = (
  event: TpValueCommitEvent<SliderValue | undefined>,
) => void;
export type SliderInputReference = ElementReference;
export const sliderValueConverter = {
  fromAttribute(value: string | null): SliderValue | undefined {
    if (value === null) return undefined;
    const values = value
      .trim()
      .split(/[\s,]+/)
      .filter(Boolean)
      .map(Number);
    return values.length === 1 ? values[0] : values;
  },
  toAttribute(value: SliderValue | undefined): string | null {
    return value === undefined ? null : Array.isArray(value) ? value.join(' ') : String(value);
  },
};
