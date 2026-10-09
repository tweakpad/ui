import { clampChannel, type ChannelDefinition } from './color/channels.js';
import { convertColor, normalizeHue } from './color/convert.js';
import type { Hsv } from './color/harmony.js';
import { parseColor } from './color/parse.js';
import { serializeColor } from './color/serialize.js';
import { color, type ColorFormat, type ColorValue, workingSpaceOf } from './color/types.js';

const ACHROMATIC = 1e-6;

/** HSV of a color in degrees and percentages. */
export function hsvOf(value: ColorValue): Hsv {
  const [h, s, v] = convertColor(value, 'hsv').coords;
  return { h, s, v };
}

/**
 * Keeps the last chromatic hue (and saturation at zero brightness) so dragging through
 * black, white or gray and back does not lose the surface position (tweakpane loses it).
 */
export function stickyHsv(previous: Hsv, next: ColorValue): Hsv {
  const current = hsvOf(next);
  if (current.v <= ACHROMATIC) return { h: previous.h, s: previous.s, v: 0 };
  if (current.s <= ACHROMATIC) return { h: previous.h, s: 0, v: current.v };
  return current;
}

/** Parses any supported notation and serializes it in `format`; empty for unparsable text. */
export function normalizeColorText(text: string, format: ColorFormat, alpha: boolean): string {
  const parsed = parseColor(text);
  if (!parsed) return '';
  return serializeColor(alpha ? parsed : color(parsed.space, parsed.coords, 1), format);
}

/** Converts a color into the working space of a format. */
export function toWorkingSpace(value: ColorValue, format: ColorFormat): ColorValue {
  return convertColor(value, workingSpaceOf[format]);
}

/** A copy of the color with one channel set from a display value (clamped or wrapped). */
export function withChannel(
  value: ColorValue,
  definition: ChannelDefinition,
  displayValue: number,
): ColorValue {
  const bounded = clampChannel(definition, displayValue);
  if (definition.key === 'alpha')
    return color(value.space, value.coords, bounded / definition.scale);
  const coords = [...value.coords] as number[];
  coords[definition.index] = bounded / definition.scale;
  return color(value.space, coords as unknown as ColorValue['coords'], value.alpha);
}

/** A color from HSV components in the working space of a format, keeping alpha. */
export function fromHsv(hsv: Hsv, alpha: number, format: ColorFormat): ColorValue {
  const hsvColor = color(
    'hsv',
    [normalizeHue(hsv.h), Math.min(100, Math.max(0, hsv.s)), Math.min(100, Math.max(0, hsv.v))],
    alpha,
  );
  return toWorkingSpace(hsvColor, format);
}

export function withAlpha(value: ColorValue, alpha: number): ColorValue {
  return color(value.space, value.coords, Math.min(1, Math.max(0, alpha)));
}

/** The display value of a channel for fields and sliders. */
export function channelDisplayValue(value: ColorValue, definition: ChannelDefinition): number {
  if (definition.key === 'alpha') return value.alpha * definition.scale;
  return (value.coords[definition.index] ?? 0) * definition.scale;
}
