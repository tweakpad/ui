import { formatChannelValue, type ChannelDefinition } from './color/channels.js';
import type { ColorPickerStrings } from './types.js';

export type KeyboardStep = { kind: 'delta'; amount: number } | { kind: 'min' } | { kind: 'max' };

export interface KeyboardStepOptions {
  readonly definition: ChannelDefinition;
  /** Which arrows move this dimension; the other pair is ignored. */
  readonly axis: 'horizontal' | 'vertical' | 'both';
  readonly direction: 'ltr' | 'rtl';
  /** Angular axes do not flip with the writing direction. */
  readonly angular?: boolean;
}

/**
 * The Slider + NumberField keyboard model: Arrow by `step`, Shift/Control/Meta+Arrow and
 * Page keys by `largeStep`, Alt+Arrow by `smallStep`, Home/End to the bounds. Horizontal
 * arrows follow the writing direction unless the axis is angular. Returns null for other keys.
 */
export function stepForKey(
  event: KeyboardEvent,
  options: KeyboardStepOptions,
): KeyboardStep | null {
  const { definition, axis, direction, angular } = options;
  const coarse = event.shiftKey || event.ctrlKey || event.metaKey;
  const amount = event.altKey
    ? definition.smallStep
    : coarse
      ? definition.largeStep
      : definition.step;
  const flip = direction === 'rtl' && !angular ? -1 : 1;
  switch (event.key) {
    case 'ArrowRight':
      return axis === 'vertical' ? null : { kind: 'delta', amount: amount * flip };
    case 'ArrowLeft':
      return axis === 'vertical' ? null : { kind: 'delta', amount: -amount * flip };
    case 'ArrowUp':
      return axis === 'horizontal' ? null : { kind: 'delta', amount };
    case 'ArrowDown':
      return axis === 'horizontal' ? null : { kind: 'delta', amount: -amount };
    // Page, Home and End act on the focused dimension only (`axis: 'both'`).
    case 'PageUp':
      return axis === 'both' ? { kind: 'delta', amount: definition.largeStep } : null;
    case 'PageDown':
      return axis === 'both' ? { kind: 'delta', amount: -definition.largeStep } : null;
    case 'Home':
      return axis === 'both' ? { kind: 'min' } : null;
    case 'End':
      return axis === 'both' ? { kind: 'max' } : null;
    default:
      return null;
  }
}

/** Applies a keyboard step to a display value (before clamping or wrapping). */
export function applyKeyboardStep(
  current: number,
  step: KeyboardStep,
  definition: ChannelDefinition,
): number {
  if (step.kind === 'min') return definition.min;
  if (step.kind === 'max') return definition.max;
  return current + step.amount;
}

/** Accessible name of a channel. */
export function channelName(strings: ColorPickerStrings, definition: ChannelDefinition): string {
  return strings[definition.key];
}

/** `aria-valuetext` of a channel in display precision and unit. */
export function channelValueText(definition: ChannelDefinition, value: number): string {
  return `${formatChannelValue(definition, value)}${definition.unit}`;
}

/** Prefixes a dimension name with the widget label (`Accent: Hue`). */
export function dimensionLabel(label: string, name: string): string {
  return label ? `${label}: ${name}` : name;
}
