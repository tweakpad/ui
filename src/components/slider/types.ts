import type { ComponentPartContract, ElementReference } from '../../foundation/part.js';
import type {
  SliderBufferedRange,
  SliderCollisionBehavior,
  SliderSegment,
  SliderSegmentState,
} from '../../foundation/slider.js';
import type { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';

export type SliderValue = number | number[];
export type SliderThumbAlignment = 'center' | 'edge' | 'delayed-edge';
export type SliderThumbCollisionBehavior = SliderCollisionBehavior;
export type { SliderBufferedRange, SliderSegment, SliderSegmentState };
/** Detail of the non-cancelable `tp-slider-pointer-change` event. */
export interface SliderPointerChangeDetail {
  /** Unsnapped hovered value in the slider domain, or `null` when not pointing. */
  value: number | null;
  /** Hovered position as a 0–1 ratio of the domain, or `null` when not pointing. */
  ratio: number | null;
}
export interface SliderThumbMetadata {
  index: number;
  inputId: string;
  value: number | undefined;
  percentage: number;
  disabled: boolean;
}
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
export interface SliderThumbOwner {
  readonly orientation: 'horizontal' | 'vertical';
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
export type SliderValueChangeCallback = (
  event: TpValueChangeEvent<SliderValue | undefined>,
) => void;
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
