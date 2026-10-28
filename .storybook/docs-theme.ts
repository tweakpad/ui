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
 * Applies a preference to the preview document through the library's color scheme store, so every
 * library element and every `light-dark()` token follows it.
 */
export function applyTheme(preference: ColorSchemePreference): void {
  colorSchemeStore(document.documentElement, { storageKey: null }).set(preference);
}
