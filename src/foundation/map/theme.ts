/**
 * Basemap theme roles and color-scheme resolution (`sec-1812-map` map-f-appearance).
 *
 * A theme assigns optional colors to ten engine-neutral roles, per scheme. Values may be any CSS
 * color, including library token references (`var(--tp-…)`); the map resolves them against its
 * root before they reach the engine, so a scoped token theme recolors the basemap.
 */
import type { MapScheme } from './engine.js';

export const MAP_THEME_ROLES = [
  'background',
  'land',
  'water',
  'park',
  'road',
  'roadMajor',
  'building',
  'boundary',
  'label',
  'labelHalo',
] as const;

export type MapThemeRole = (typeof MAP_THEME_ROLES)[number];

/** Role colors for one scheme. */
export type MapThemeColors = Partial<Record<MapThemeRole, string>>;

/** Per-scheme role colors. A missing scheme falls back to the other scheme's colors. */
export interface MapTheme {
  readonly light?: MapThemeColors;
  readonly dark?: MapThemeColors;
}

/** Role colors with tokens resolved to concrete color strings. */
export type ResolvedMapTheme = Readonly<Partial<Record<MapThemeRole, string>>>;

/**
 * A theme that follows the library tokens: land and background from the surface roles, water and
 * parks from muted/accent roles, labels from the foreground roles.
 */
export const tokenMapTheme: MapTheme = Object.freeze({
  light: {
    background: 'var(--tp-background)',
    land: 'var(--tp-background)',
    water: 'var(--tp-muted)',
    park: 'color-mix(in oklab, var(--tp-accent) 35%, var(--tp-background))',
    road: 'var(--tp-card)',
    roadMajor: 'var(--tp-border)',
    building: 'var(--tp-secondary)',
    boundary: 'var(--tp-border)',
    label: 'var(--tp-muted-foreground)',
    labelHalo: 'var(--tp-background)',
  },
});

/** The scheme for a computed `color-scheme` value (dark only when dark wins). */
export function resolveScheme(colorScheme: string, prefersDark: boolean): MapScheme {
  const values = colorScheme.split(/\s+/);
  if (!values.includes('dark')) return 'light';
  return !values.includes('light') || prefersDark ? 'dark' : 'light';
}

/**
 * Resolves each role with `resolveColor`, which turns any CSS color (including token references
 * and `light-dark()`) into a concrete sRGB color string for the engine, or `null` when invalid.
 */
export function resolveMapTheme(
  theme: MapTheme | null | undefined,
  scheme: MapScheme,
  resolveColor: (value: string) => string | null,
): ResolvedMapTheme | null {
  if (!theme) return null;
  const colors = theme[scheme] ?? theme[scheme === 'dark' ? 'light' : 'dark'];
  if (!colors) return null;
  const resolved: Partial<Record<MapThemeRole, string>> = {};
  for (const role of MAP_THEME_ROLES) {
    const value = colors[role]?.trim();
    const color = value ? resolveColor(value) : null;
    if (color) resolved[role] = color;
  }
  return Object.freeze(resolved);
}

export function mapThemesEqual(a: ResolvedMapTheme | null, b: ResolvedMapTheme | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  return MAP_THEME_ROLES.every((role) => a[role] === b[role]);
}
