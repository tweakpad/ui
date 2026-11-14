import type { ChannelKey } from '../../foundation/color/channels.js';
import type { HarmonyRule } from './color/harmony.js';
import type { ColorFormat, ColorValue } from '../../foundation/color/types.js';

/** A surface the picker can show for choosing a color, listed in `views`. */
export type ColorPickerView = 'area' | 'sliders' | 'wheel' | 'triangle';
export const COLOR_PICKER_VIEWS: readonly ColorPickerView[] = [
  'area',
  'sliders',
  'wheel',
  'triangle',
];
/** Whether the picker shows in place or opens from a trigger in a popup. */
export type ColorPickerPicker = 'inline' | 'popup';
/** Scale of the surfaces, tracks, thumbs and swatches together. */
export type ColorPickerSize = 'sm' | 'default' | 'lg';
/** Whether the preview and the swatches are squares or circles. */
export type ColorPickerShape = 'square' | 'round';
export type ColorPickerSurface =
  'area' | 'wheel' | 'triangle' | 'slider' | 'field' | 'swatch' | 'eyedropper' | 'compare';

/** Saved swatches: a flat list of colors or labeled groups. */
export interface ColorSwatchGroup {
  readonly label: string;
  readonly colors: readonly string[];
}
/** One entry of `swatches`: a CSS color text, or a labeled group of them. */
export type ColorSwatchInput = string | ColorSwatchGroup;

/** Metadata of a `tp-value-change` / `tp-value-commit` detail. */
export interface ColorPickerChangeMetadata extends Record<string, unknown> {
  readonly color: ColorValue | null;
  readonly channel?: ChannelKey;
  readonly surface?: ColorPickerSurface;
  readonly handle?: number;
  readonly formatChange?: boolean;
}

/** Localizable names; every key is optional in the `strings` property. */
export interface ColorPickerStrings {
  readonly red: string;
  readonly green: string;
  readonly blue: string;
  readonly hue: string;
  readonly saturation: string;
  readonly lightness: string;
  readonly value: string;
  readonly whiteness: string;
  readonly blackness: string;
  readonly cyan: string;
  readonly magenta: string;
  readonly yellow: string;
  readonly key: string;
  readonly a: string;
  readonly b: string;
  readonly chroma: string;
  readonly alpha: string;
  readonly hex: string;
  readonly format: string;
  readonly areaGroup: string;
  readonly wheelGroup: string;
  readonly triangleGroup: string;
  readonly harmony: string;
  readonly harmonyHandle: string;
  readonly eyedropper: string;
  readonly compare: string;
  readonly palette: string;
  readonly original: string;
  readonly copy: string;
  readonly empty: string;
  readonly savedColors: string;
  readonly recentColors: string;
  readonly views: string;
  readonly viewArea: string;
  readonly viewSliders: string;
  readonly viewWheel: string;
  readonly viewTriangle: string;
  /** Name of the palette Toggle and of the Color palette it opens. */
  readonly colorPalette: string;
  readonly formatHex: string;
  readonly formatRgb: string;
  readonly formatHsl: string;
  readonly formatHwb: string;
  readonly formatHsv: string;
  readonly formatLab: string;
  readonly formatOklab: string;
  readonly formatOklch: string;
  readonly formatCmyk: string;
  readonly harmonyNone: string;
  readonly harmonyComplementary: string;
  readonly harmonyAnalogous: string;
  readonly harmonyTriad: string;
  readonly harmonyCompound: string;
  readonly harmonyCustom: string;
  readonly valueMissing: string;
}

export type { ColorFormat, HarmonyRule };

/** Space-separated list attribute converter (`views="area swatches"`, `formats="hex rgb"`). */
export const listConverter = {
  fromAttribute: (value: string | null): readonly string[] | undefined =>
    value === null ? undefined : value.split(/[\s,]+/).filter(Boolean),
  toAttribute: (value: readonly string[] | undefined): string | null =>
    value === undefined ? null : value.join(' '),
};
