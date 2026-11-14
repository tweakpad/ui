/** What the palette lists: the collection's colors, its palettes, or the favorites. */
export type ColorPaletteMode = 'colors' | 'palettes' | 'favorites';
/** Where uncontrolled favorites are kept between visits: local storage, or nowhere. */
export type ColorPalettePersistence = 'local' | 'none';

/**
 * A bookmarked color, palette or gradient. A palette shows its colors as hard stops and a
 * gradient blends them; both keep their colors' shares.
 */
export type ColorPaletteFavorite =
  | { readonly kind: 'color'; readonly value: string; readonly name?: string }
  | {
      readonly kind: 'palette' | 'gradient';
      readonly name?: string;
      /** Two to twelve color texts. */
      readonly colors: readonly string[];
      /** Shares of the colors, summing to 1; equal shares when absent. */
      readonly weights?: readonly number[];
    };

/** Metadata of a favorites proposal: what was added or removed. */
export interface ColorPaletteFavoritesMetadata {
  readonly [key: string]: unknown;
  readonly action: 'add' | 'remove';
  readonly favorite: ColorPaletteFavorite;
}
/** How a palette shows its colors: hard stops side by side, or blended as one gradient. */
export type ColorPalettePaletteStyle = 'stops' | 'gradient';
/** Scale of the swatches, cells and controls of the palette. */
export type ColorPaletteSize = 'sm' | 'default' | 'lg';
/** How the colors mode shows its colors: cells in rows, or one row per color with its name. */
export type ColorPaletteLayout = 'grid' | 'list';

/** A listed color: the picked or highlighted swatch with where it is listed. */
export interface ColorPaletteSwatchInfo {
  /** The color text the collection gives; the value when picked. */
  readonly value: string;
  readonly name?: string;
  /** The collection group id. */
  readonly group?: string;
  /** The palette it is listed in, in the palettes mode. */
  readonly set?: { readonly name: string };
  /** Its share of its palette, 0–1. */
  readonly share?: number;
}

/** Metadata of a value proposal. */
export interface ColorPaletteChangeMetadata {
  readonly [key: string]: unknown;
  readonly swatch?: ColorPaletteSwatchInfo;
  /** Id of the active collection. */
  readonly collection?: string;
}

/** Texts of the widget by key, listed in English as `colorPaletteStrings`. */
export interface ColorPaletteStrings {
  label: string;
  empty: string;
  emptyHint: string;
  palettesEmpty: string;
  palettesHint: string;
  /** Status bar text beside the name of a collection that is loading. */
  loading: string;
  /** Title of a collection that failed to load; `{name}` is its name. */
  loadError: string;
  loadErrorHint: string;
  /** Status bar text beside the name of a collection that failed to load. */
  loadErrorShort: string;
  retry: string;
  modes: string;
  modeColors: string;
  modePalettes: string;
  modeFavorites: string;
  favoriteColors: string;
  favoritePalettes: string;
  favoriteGradients: string;
  favoritesEmpty: string;
  favoritesHint: string;
  removeFavorite: string;
  favorite: string;
  collections: string;
  options: string;
  display: string;
  layoutGrid: string;
  layoutList: string;
  paletteStops: string;
  paletteGradient: string;
  groupBy: string;
  groupsAuto: string;
  groupsCollection: string;
  groupsNone: string;
  size: string;
  sizeSmall: string;
  sizeMedium: string;
  sizeLarge: string;
  /** The text of an unnamed color in the list layout. */
  hsl: string;
  other: string;
  familyRed: string;
  familyOrange: string;
  familyYellow: string;
  familyGreen: string;
  familyTeal: string;
  familyBlue: string;
  familyPurple: string;
  familyPink: string;
  familyNeutral: string;
  palette: string;
  share: string;
  license: string;
  source: string;
  summaryCount: string;
  colorCount: string;
  colorCountOne: string;
  paletteCount: string;
  paletteCountOne: string;
  favoriteCount: string;
  favoriteCountOne: string;
  copyColor: string;
  copyPalette: string;
  valueMissing: string;
}
