import type { ColorSchemePreference } from '../../foundation/color-scheme.js';

/** The button cycle: each press advances dark → light → system → dark. */
export const themeCycle: readonly ColorSchemePreference[] = ['dark', 'light', 'system'];
/** The group's options, in shadcn ModeToggle order. */
export const themeOptions: readonly ColorSchemePreference[] = ['light', 'dark', 'system'];
export const themeNames: Readonly<Record<ColorSchemePreference, string>> = {
  light: 'Light',
  dark: 'Dark',
  system: 'System',
};

export function nextThemePreference(current: ColorSchemePreference): ColorSchemePreference {
  return themeCycle[(themeCycle.indexOf(current) + 1) % themeCycle.length]!;
}
