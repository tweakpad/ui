import type { ColorSchemePreference, ResolvedColorScheme } from '../../foundation/color-scheme.js';

/** The control a Theme switcher renders: a switch, an icon button or a segmented group. */
export type ThemeSwitcherVariant = 'switch' | 'button' | 'group';
/** The size of a Theme switcher's composed control. */
export type ThemeSwitcherSize = 'sm' | 'default';

export interface ThemeSwitcherState {
  variant: ThemeSwitcherVariant;
  size: ThemeSwitcherSize;
  preference: ColorSchemePreference;
  resolved: ResolvedColorScheme;
  disabled: boolean;
}
