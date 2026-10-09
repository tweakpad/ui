import { normalizeHue } from './convert.js';
import { namedColorHex } from './named.js';
import { color, type ColorFormat, type ColorSpace, type ColorValue } from './types.js';

interface Token {
  readonly kind: 'number' | 'percent' | 'angle' | 'none' | 'ident';
  readonly value: number;
  readonly text: string;
}

const NUMBER = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;
const ANGLE_UNITS: Readonly<Record<string, number>> = {
  deg: 1,
  grad: 0.9,
  rad: 180 / Math.PI,
  turn: 360,
};

function token(text: string): Token | null {
  const lower = text.toLowerCase();
  if (lower === 'none') return { kind: 'none', value: 0, text };
  if (lower.endsWith('%')) {
    const digits = lower.slice(0, -1);
    return NUMBER.test(digits) ? { kind: 'percent', value: Number(digits), text } : null;
  }
  for (const [unit, scale] of Object.entries(ANGLE_UNITS))
    if (lower.endsWith(unit)) {
      const digits = lower.slice(0, -unit.length);
      return NUMBER.test(digits) ? { kind: 'angle', value: Number(digits) * scale, text } : null;
    }
  if (NUMBER.test(lower)) return { kind: 'number', value: Number(lower), text };
  if (/^[a-z][a-z0-9-]*$/.test(lower)) return { kind: 'ident', value: NaN, text: lower };
  return null;
}

/** Splits functional arguments; returns the channel tokens, the alpha token and the syntax used. */
function splitArguments(
  body: string,
): { channels: Token[]; alpha: Token | null; legacy: boolean } | null {
  const trimmed = body.trim();
  if (!trimmed) return null;
  if (trimmed.includes(',')) {
    const parts = trimmed.split(',').map((part) => part.trim());
    if (parts.some((part) => !part || part.includes('/') || /\s/.test(part))) return null;
    const tokens = parts.map(token);
    if (tokens.some((entry) => entry === null)) return null;
    const channels = tokens.slice(0, 3) as Token[];
    const alpha = tokens.length === 4 ? (tokens[3] as Token) : null;
    if (tokens.length > 4 || channels.length < 3) return null;
    return { channels, alpha, legacy: true };
  }
  const [channelPart, alphaPart, extra] = trimmed.split('/');
  if (extra !== undefined) return null;
  const channelTokens = channelPart!.trim().split(/\s+/).map(token);
  if (channelTokens.some((entry) => entry === null)) return null;
  let alpha: Token | null = null;
  if (alphaPart !== undefined) {
    const alphaText = alphaPart.trim();
    if (!alphaText || /\s/.test(alphaText)) return null;
    alpha = token(alphaText);
    if (!alpha) return null;
  }
  return { channels: channelTokens as Token[], alpha, legacy: false };
}

type ChannelKind = 'rgb' | 'percentage' | 'hue' | 'number' | 'unit';

/** Resolves a token for a channel; `reference` is the value that 100% maps to. */
function channel(entry: Token, kind: ChannelKind, reference: number): number | null {
  switch (entry.kind) {
    case 'none':
      return 0;
    case 'percent':
      return kind === 'hue' ? null : (entry.value / 100) * reference;
    case 'angle':
      return kind === 'hue' ? normalizeHue(entry.value) : null;
    case 'number':
      if (kind === 'hue') return normalizeHue(entry.value);
      if (kind === 'rgb') return entry.value / 255;
      if (kind === 'unit') return entry.value * reference;
      return entry.value;
    default:
      return null;
  }
}

function alphaValue(entry: Token | null): number | null {
  if (!entry) return 1;
  if (entry.kind === 'none') return 0;
  if (entry.kind === 'percent') return Math.min(1, Math.max(0, entry.value / 100));
  if (entry.kind === 'number') return Math.min(1, Math.max(0, entry.value));
  return null;
}

function hexColor(digits: string): ColorValue {
  const expanded =
    digits.length <= 4
      ? digits
          .split('')
          .map((character) => character + character)
          .join('')
      : digits;
  const parse = (index: number): number => parseInt(expanded.slice(index, index + 2), 16) / 255;
  return color('srgb', [parse(0), parse(2), parse(4)], expanded.length === 8 ? parse(6) : 1);
}

const COLOR_FUNCTION_SPACES: Readonly<Record<string, ColorSpace>> = {
  srgb: 'srgb',
  'srgb-linear': 'srgb-linear',
  xyz: 'xyz-d65',
  'xyz-d65': 'xyz-d65',
  'xyz-d50': 'xyz-d50',
};

/**
 * Parses a CSS Color 4 absolute color (hex, rgb/rgba, hsl/hsla, hwb, lab, lch, oklab,
 * oklch, color() in the sRGB and XYZ spaces, named colors, transparent, `none`
 * channels) plus the non-CSS `hsv()`/`hsb()` and `device-cmyk()` notations. Channels
 * are not clamped; alpha is clamped to 0–1. Returns null for anything else.
 */
export function parseColor(input: string): ColorValue | null {
  const text = input.trim();
  if (!text) return null;
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  if (hex) return hexColor(hex[1]!);
  const prefixed = /^0x([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(text);
  if (prefixed) return hexColor(prefixed[1]!);
  const lower = text.toLowerCase();
  if (lower === 'transparent') return color('srgb', [0, 0, 0], 0);
  const named = namedColorHex(lower);
  if (named) return hexColor(named);
  const functional = /^([a-z-]+)\((.*)\)$/s.exec(lower);
  if (!functional) return null;
  const name = functional[1]!;
  const parsed = splitArguments(functional[2]!);
  if (!parsed) return null;
  const { channels, alpha, legacy } = parsed;
  const resolvedAlpha = alphaValue(alpha);
  if (resolvedAlpha === null) return null;
  const triple = (
    space: ColorSpace,
    kinds: readonly [ChannelKind, ChannelKind, ChannelKind],
    references: readonly [number, number, number],
  ): ColorValue | null => {
    if (channels.length !== 3) return null;
    const values = channels.map((entry, index) =>
      channel(entry, kinds[index]!, references[index]!),
    );
    if (values.some((value) => value === null)) return null;
    return color(space, values as [number, number, number], resolvedAlpha);
  };
  switch (name) {
    case 'rgb':
    case 'rgba': {
      if (channels.length !== 3) return null;
      const percentages = channels.filter((entry) => entry.kind === 'percent').length;
      if (
        legacy &&
        percentages !== 0 &&
        percentages !== channels.filter((e) => e.kind !== 'none').length
      )
        return null;
      return triple('srgb', ['rgb', 'rgb', 'rgb'], [1, 1, 1]);
    }
    case 'hsl':
    case 'hsla':
      return triple('hsl', ['hue', 'percentage', 'percentage'], [100, 100, 100]);
    case 'hsv':
    case 'hsva':
    case 'hsb':
      return triple('hsv', ['hue', 'percentage', 'percentage'], [100, 100, 100]);
    case 'hwb':
      return legacy ? null : triple('hwb', ['hue', 'percentage', 'percentage'], [100, 100, 100]);
    case 'lab':
      return legacy ? null : triple('lab', ['number', 'number', 'number'], [100, 125, 125]);
    case 'lch':
      return legacy ? null : triple('lch', ['number', 'number', 'hue'], [100, 150, 360]);
    case 'oklab':
      return legacy ? null : triple('oklab', ['number', 'number', 'number'], [1, 0.4, 0.4]);
    case 'oklch':
      return legacy ? null : triple('oklch', ['number', 'number', 'hue'], [1, 0.4, 360]);
    case 'color': {
      if (legacy || channels.length !== 4 || channels[0]!.kind !== 'ident') return null;
      const space = COLOR_FUNCTION_SPACES[channels[0]!.text];
      if (!space) return null;
      const values = channels.slice(1).map((entry) => channel(entry, 'unit', 1));
      if (values.some((value) => value === null)) return null;
      return color(space, values as [number, number, number], resolvedAlpha);
    }
    case 'device-cmyk': {
      if (legacy || channels.length !== 4) return null;
      const values = channels.map((entry) =>
        entry.kind === 'number' ? entry.value * 100 : channel(entry, 'percentage', 100),
      );
      if (values.some((value) => value === null)) return null;
      return color('cmyk', values as [number, number, number, number], resolvedAlpha);
    }
    default:
      return null;
  }
}

/** Names the format a color string is written in, or null when it does not parse. */
export function detectColorFormat(input: string): ColorFormat | null {
  if (!parseColor(input)) return null;
  const text = input.trim().toLowerCase();
  if (text.startsWith('#') || text.startsWith('0x') || !text.includes('(')) return 'hex';
  const name = text.slice(0, text.indexOf('('));
  switch (name) {
    case 'rgb':
    case 'rgba':
    case 'color':
      return 'rgb';
    case 'hsl':
    case 'hsla':
      return 'hsl';
    case 'hwb':
      return 'hwb';
    case 'hsv':
    case 'hsva':
    case 'hsb':
      return 'hsv';
    case 'lab':
    case 'lch':
      return 'lab';
    case 'oklab':
      return 'oklab';
    case 'oklch':
      return 'oklch';
    case 'device-cmyk':
      return 'cmyk';
    default:
      return null;
  }
}
