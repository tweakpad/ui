import type { ChannelDefinition } from './color/channels.js';
import { displayColor } from './color/serialize.js';
import type { ColorValue } from './color/types.js';
import { withChannel } from './model.js';

const AXIS = 'var(--_tp-color-picker-axis, to right)';
const MAX_STOPS = 64;

/** The hue spectrum, used by the hue slider track and the wheel. */
export function hueGradient(stops = 12): string {
  const entries: string[] = [];
  for (let index = 0; index <= stops; index++) {
    const hue = Math.round((360 * index) / stops);
    entries.push(`hsl(${hue} 100% 50%) ${((100 * index) / stops).toFixed(2)}%`);
  }
  return `linear-gradient(${AXIS}, ${entries.join(', ')})`;
}

export function hueConicGradient(stops = 12): string {
  const entries: string[] = [];
  for (let index = 0; index <= stops; index++) {
    const hue = Math.round((360 * index) / stops);
    entries.push(`hsl(${hue} 100% 50%) ${((360 * index) / stops).toFixed(2)}deg`);
  }
  return `conic-gradient(from 90deg, ${entries.join(', ')})`;
}

/** Transparent to opaque current color for the alpha track (over the recipe checkerboard). */
export function alphaGradient(value: ColorValue): string {
  return `linear-gradient(${AXIS}, ${displayColor(value, 0)}, ${displayColor(value, 1)})`;
}

/** The saturation/brightness plane at a hue: white→hue under transparent→black. */
export function areaGradient(hue: number): string {
  const h = Math.round(((hue % 360) + 360) % 360);
  return `linear-gradient(to top, rgb(0 0 0), rgb(0 0 0 / 0)), linear-gradient(${AXIS}, rgb(255 255 255), hsl(${h} 100% 50%))`;
}

/** The hue/saturation disc at full brightness: the hue ring under a white center. */
export function wheelGradient(): string {
  return `radial-gradient(circle, rgb(255 255 255), rgb(255 255 255 / 0) 100%), ${hueConicGradient()}`;
}

/** A gradient varying one channel of the current color across its domain. */
export function channelGradient(
  value: ColorValue,
  definition: ChannelDefinition,
  stops = 16,
): string {
  const count = Math.min(MAX_STOPS, Math.max(2, stops));
  const entries: string[] = [];
  for (let index = 0; index <= count; index++) {
    const position = index / count;
    const display = definition.min + (definition.max - definition.min) * position;
    const sample = withChannel(value, definition, display);
    entries.push(`${displayColor(sample)} ${(position * 100).toFixed(2)}%`);
  }
  return `linear-gradient(${AXIS}, ${entries.join(', ')})`;
}

/** A flat fill for previews and swatches. */
export function flatGradient(value: ColorValue): string {
  const fill = displayColor(value);
  return `linear-gradient(${fill}, ${fill})`;
}
