import type { ColorFormat } from './types.js';

export type ChannelKey =
  | 'red'
  | 'green'
  | 'blue'
  | 'hue'
  | 'saturation'
  | 'lightness'
  | 'value'
  | 'whiteness'
  | 'blackness'
  | 'cyan'
  | 'magenta'
  | 'yellow'
  | 'key'
  | 'a'
  | 'b'
  | 'chroma'
  | 'alpha';

/** One editable channel of a format, in display units. */
export interface ChannelDefinition {
  readonly key: ChannelKey;
  /** Coordinate index in the working space (3 only for the CMYK key); alpha is keyed `alpha`. */
  readonly index: 0 | 1 | 2 | 3;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly smallStep: number;
  readonly largeStep: number;
  /** Hue channels wrap at the bounds instead of clamping. */
  readonly wrap: boolean;
  /** Suffix shown in fields; `°` is display-only and never serialized. */
  readonly unit: '' | '%' | '°';
  /** Maximum fraction digits in fields, value text and serialization. */
  readonly precision: number;
  /** Multiplies a working-space coordinate into display units. */
  readonly scale: number;
}

const percent = (key: ChannelKey, index: 0 | 1 | 2 | 3): ChannelDefinition => ({
  key,
  index,
  min: 0,
  max: 100,
  step: 1,
  smallStep: 0.1,
  largeStep: 10,
  wrap: false,
  unit: '%',
  precision: 0,
  scale: 1,
});
const hue = (index: 0 | 1 | 2, precision = 0): ChannelDefinition => ({
  key: 'hue',
  index,
  min: 0,
  max: 360,
  step: 1,
  smallStep: 0.1,
  largeStep: 10,
  wrap: true,
  unit: '°',
  precision,
  scale: 1,
});
const byte = (key: ChannelKey, index: 0 | 1 | 2): ChannelDefinition => ({
  key,
  index,
  min: 0,
  max: 255,
  step: 1,
  smallStep: 1,
  largeStep: 10,
  wrap: false,
  unit: '',
  precision: 0,
  scale: 255,
});
const labChannel = (
  key: ChannelKey,
  index: 0 | 1 | 2,
  min: number,
  max: number,
): ChannelDefinition => ({
  key,
  index,
  min,
  max,
  step: 1,
  smallStep: 0.1,
  largeStep: 10,
  wrap: false,
  unit: '',
  precision: 1,
  scale: 1,
});
const okChannel = (
  key: ChannelKey,
  index: 0 | 1 | 2,
  min: number,
  max: number,
): ChannelDefinition => ({
  key,
  index,
  min,
  max,
  step: 0.01,
  smallStep: 0.001,
  largeStep: 0.1,
  wrap: false,
  unit: '',
  precision: 3,
  scale: 1,
});

export const ALPHA_CHANNEL: ChannelDefinition = {
  key: 'alpha',
  index: 3,
  min: 0,
  max: 100,
  step: 1,
  smallStep: 0.1,
  largeStep: 10,
  wrap: false,
  unit: '%',
  precision: 0,
  scale: 100,
};

const CHANNELS: Readonly<Record<ColorFormat, readonly ChannelDefinition[]>> = {
  hex: [byte('red', 0), byte('green', 1), byte('blue', 2)],
  rgb: [byte('red', 0), byte('green', 1), byte('blue', 2)],
  hsl: [hue(0), percent('saturation', 1), percent('lightness', 2)],
  hsv: [hue(0), percent('saturation', 1), percent('value', 2)],
  hwb: [hue(0), percent('whiteness', 1), percent('blackness', 2)],
  cmyk: [percent('cyan', 0), percent('magenta', 1), percent('yellow', 2), percent('key', 3)],
  lab: [
    labChannel('lightness', 0, 0, 100),
    labChannel('a', 1, -125, 125),
    labChannel('b', 2, -125, 125),
  ],
  oklab: [
    okChannel('lightness', 0, 0, 1),
    okChannel('a', 1, -0.4, 0.4),
    okChannel('b', 2, -0.4, 0.4),
  ],
  oklch: [okChannel('lightness', 0, 0, 1), okChannel('chroma', 1, 0, 0.4), hue(2, 1)],
};

/** Channel definitions of a format, with alpha appended when requested. */
export function channelDefinitions(
  format: ColorFormat,
  alpha: boolean,
): readonly ChannelDefinition[] {
  const channels = CHANNELS[format];
  return alpha ? [...channels, ALPHA_CHANNEL] : channels;
}

/** tweakpane's `loopHueRange`: hue wraps, except that exactly 360 is kept. */
export function wrapHue(value: number): number {
  if (value === 360) return 360;
  const wrapped = value % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/** Clamps or wraps a display value into the channel's domain. */
export function clampChannel(definition: ChannelDefinition, value: number): number {
  if (!Number.isFinite(value)) return definition.min;
  if (definition.wrap) return wrapHue(value);
  return Math.min(definition.max, Math.max(definition.min, value));
}

/** Formats a display value with the channel precision; `-0` becomes `0`. */
export function formatChannelValue(definition: ChannelDefinition, value: number): string {
  const rounded = Number(value.toFixed(definition.precision));
  return String(rounded === 0 ? 0 : rounded);
}
