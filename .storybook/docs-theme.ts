import { create } from 'storybook/theming';
import { colorSchemeStore, type ColorSchemePreference } from '../src/foundation/color-scheme.js';

/** Storybook's Docs themes; code in the docs (prose, tables, source) uses the library's mono role. */
export const docsThemes = {
  light: create({ base: 'light', fontCode: 'var(--tp-font-mono)' }),
  dark: create({ base: 'dark', fontCode: 'var(--tp-font-mono)' }),
};

/** The Theme toolbar's preference: `system` (the default) follows the device. */
export function themePreference(
  globals: Record<string, unknown> | undefined,
): ColorSchemePreference {
  const value = globals?.theme;
  return value === 'light' || value === 'dark' ? value : 'system';
}

/**
 * Applies the Density toolbar's preset to the preview document: `compact` scales the spacing and
 * type seeds (`density-compact.css`), and every derived extent follows.
 */
export function applyDensity(globals: Record<string, unknown> | undefined): void {
  const root = document.documentElement;
  if (globals?.density === 'compact') root.dataset.tpDensity = 'compact';
  else delete root.dataset.tpDensity;
}

/**
 * Applies a preference to the preview document through the library's color scheme store, so every
 * library element and every `light-dark()` token follows it.
 */
export function applyTheme(preference: ColorSchemePreference): void {
  colorSchemeStore(document.documentElement, { storageKey: null }).set(preference);
}
