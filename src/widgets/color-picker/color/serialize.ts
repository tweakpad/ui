import { channelDefinitions, formatChannelValue, wrapHue } from './channels.js';
import { convertColor } from './convert.js';
import { clipToGamut, inGamut, toGamut } from './gamut.js';
import { type ColorFormat, type ColorSpace, type ColorValue, workingSpaceOf } from './types.js';

const SRGB_FORMATS = new Set<ColorFormat>(['hex', 'rgb', 'hsl', 'hwb', 'hsv', 'cmyk']);
const SRGB_SPACES = new Set<ColorSpace>(['srgb', 'srgb-linear', 'hsl', 'hsv', 'hwb', 'cmyk']);

/**
 * Brings a color into the sRGB gamut for an sRGB-based format: out-of-range sRGB-based
 * coordinates clip (tweakpane parity for over-driven channels), wide-gamut colors are
 * gamut-mapped (CSS Color 4).
 */
function fitToSrgb(value: ColorValue): ColorValue {
  if (inGamut(value)) return value;
  return SRGB_SPACES.has(value.space) ? clipToGamut(value) : toGamut(value);
}

function alphaSuffix(alpha: number): string {
  const rounded = Math.round(alpha * 100) / 100;
  return rounded >= 1 ? '' : ` / ${rounded}`;
}

function hexByte(channel: number): string {
  return Math.round(Math.min(1, Math.max(0, channel)) * 255)
    .toString(16)
    .padStart(2, '0');
}

/**
 * Canonical serialization of a color in a format: modern space-separated CSS syntax,
 * lowercase, alpha appended as ` / a` only below 1 after rounding to two decimals, hex as
 * `#rrggbb` or `#rrggbbaa`. Colors outside sRGB are gamut-mapped for the sRGB-based
 * formats and serialized exactly for lab, oklab and oklch.
 */
export function serializeColor(value: ColorValue, format: ColorFormat): string {
  const space = workingSpaceOf[format];
  const source = SRGB_FORMATS.has(format) ? fitToSrgb(value) : value;
  const converted = convertColor(source, space);
  const channels = channelDefinitions(format, false);
  const display = (index: number): number => {
    const definition = channels[index]!;
    const scaled = (converted.coords[definition.index] ?? 0) * definition.scale;
    const bounded = definition.wrap
      ? wrapHue(scaled)
      : Math.min(definition.max, Math.max(definition.min, scaled));
    return Number(formatChannelValue(definition, bounded));
  };
  const text = (index: number): string => formatChannelValue(channels[index]!, display(index));
  const alpha = alphaSuffix(converted.alpha);
  switch (format) {
    case 'hex': {
      const [r, g, b] = converted.coords;
      const digits = `#${hexByte(r)}${hexByte(g)}${hexByte(b)}`;
      return alpha ? `${digits}${hexByte(converted.alpha)}` : digits;
    }
    case 'rgb':
      return `rgb(${text(0)} ${text(1)} ${text(2)}${alpha})`;
    case 'hsl':
      return `hsl(${text(0)} ${text(1)}% ${text(2)}%${alpha})`;
    case 'hwb':
      return `hwb(${text(0)} ${text(1)}% ${text(2)}%${alpha})`;
    case 'hsv':
      return `hsv(${text(0)} ${text(1)}% ${text(2)}%${alpha})`;
    case 'cmyk': {
      const [c, m, y] = [text(0), text(1), text(2)];
      const key = formatChannelValue(channels[3]!, display(3));
      return `device-cmyk(${c}% ${m}% ${y}% ${key}%${alpha})`;
    }
    case 'lab':
      return `lab(${text(0)} ${text(1)} ${text(2)}${alpha})`;
    case 'oklab':
      return `oklab(${text(0)} ${text(1)} ${text(2)}${alpha})`;
    case 'oklch':
      return `oklch(${text(0)} ${text(1)} ${text(2)}${alpha})`;
  }
}

/** The sRGB `rgb()` string browsers accept, for painting; out-of-gamut colors are mapped. */
export function displayColor(value: ColorValue, alpha = value.alpha): string {
  const mapped = convertColor(fitToSrgb(value), 'srgb');
  const [r, g, b] = mapped.coords.map((channel) =>
    Math.round(Math.min(1, Math.max(0, channel)) * 255),
  );
  const rounded = Math.round(alpha * 1000) / 1000;
  return rounded >= 1 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${rounded})`;
}
