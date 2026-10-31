import { formatChannelValue, type ChannelDefinition } from '../../foundation/color/channels.js';
import type { ColorPickerStrings } from './types.js';

export type { KeyboardStep, KeyboardStepOptions } from '../../foundation/dimension-step.js';
// The keyboard step model is the shared Foundation owner (`dimension-step.ts`); a channel
// definition satisfies its `DimensionDefinition` structurally.
export { stepForKey, applyKeyboardStep } from '../../foundation/dimension-step.js';

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
