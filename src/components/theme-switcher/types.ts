import type { ColorSchemePreference, ResolvedColorScheme } from '../../foundation/color-scheme.js';

export type ThemeSwitcherVariant = 'switch' | 'button' | 'group';
export type ThemeSwitcherSize = 'sm' | 'default';

export interface ThemeSwitcherState {
  variant: ThemeSwitcherVariant;
  size: ThemeSwitcherSize;
  preference: ColorSchemePreference;
  resolved: ResolvedColorScheme;
  disabled: boolean;
}
