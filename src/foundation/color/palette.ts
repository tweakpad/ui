import { convertColor } from './convert.js';
import type { ColorValue, Coords } from './types.js';

/** A hue family of the OKLCH hue circle, or `neutral` for nearly achromatic colors. */
export type HueFamily =
  'red' | 'orange' | 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'pink' | 'neutral';

/** The hue families in display order: around the hue circle from red, then the neutrals. */
export const HUE_FAMILIES: readonly HueFamily[] = [
  'red',
  'orange',
  'yellow',
  'green',
  'teal',
  'blue',
  'purple',
  'pink',
  'neutral',
];

/** OKLCH chroma below which a color counts as neutral and its hue as undefined. */
export const NEUTRAL_CHROMA = 0.03;

/** The OKLCH hue where each chromatic family starts; pink wraps past 360 into red. */
const FAMILY_STARTS: readonly (readonly [number, HueFamily])[] = [
  [14, 'red'],
  [45, 'orange'],
  [80, 'yellow'],
  [120, 'green'],
  [175, 'teal'],
  [225, 'blue'],
  [290, 'purple'],
  [340, 'pink'],
];

/** The OKLCH lightness, chroma and hue (degrees, 0–360) of a color. */
export function oklchOf(value: ColorValue): Coords {
  return convertColor(value, 'oklch').coords;
}

/** The hue family of a color: its OKLCH hue bin, or `neutral` below {@link NEUTRAL_CHROMA}. */
export function hueFamily(value: ColorValue): HueFamily {
  const [, chroma, hue] = oklchOf(value);
  if (!(chroma >= NEUTRAL_CHROMA) || !Number.isFinite(hue)) return 'neutral';
  const angle = ((hue % 360) + 360) % 360;
  let family: HueFamily = 'pink';
  for (const [start, name] of FAMILY_STARTS) if (angle >= start) family = name;
  return angle < FAMILY_STARTS[0]![0] ? 'pink' : family;
}

/** The perceptual feature a palette sorts by. */
export type ColorSortKey = 'lightness' | 'hue' | 'chroma';
/** Whether a palette sort runs from low to high values of its key or from high to low. */
export type SortDirection = 'ascending' | 'descending';

/**
 * Sorts items by the OKLCH lightness, hue or chroma of their color, stably: equal keys keep the
 * given order. Under `hue`, neutral colors sort after every chromatic one in either direction.
 */
export function sortByColor<T>(
  items: readonly T[],
  colorOf: (item: T) => ColorValue,
  key: ColorSortKey,
  direction: SortDirection = 'ascending',
): T[] {
  const sign = direction === 'descending' ? -1 : 1;
  const keyed = items.map((item, index) => {
    const [lightness, chroma, hue] = oklchOf(colorOf(item));
    const neutral = !(chroma >= NEUTRAL_CHROMA);
    const value = key === 'lightness' ? lightness : key === 'chroma' ? chroma : neutral ? 0 : hue;
    return { item, index, value, last: key === 'hue' && neutral };
  });
  keyed.sort(
    (a, b) => Number(a.last) - Number(b.last) || sign * (a.value - b.value) || a.index - b.index,
  );
  return keyed.map((entry) => entry.item);
}
