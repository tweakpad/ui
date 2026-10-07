import { describe, expect, it } from 'vitest';
import { nextThemePreference, themeCycle, themeOptions } from './preferences.js';

describe('theme switcher preferences', () => {
  it('cycles dark → light → system → dark', () => {
    expect(themeCycle).toEqual(['dark', 'light', 'system']);
    expect(nextThemePreference('dark')).toBe('light');
    expect(nextThemePreference('light')).toBe('system');
    expect(nextThemePreference('system')).toBe('dark');
  });

  it('lists the group options as Light, Dark, System', () => {
    expect(themeOptions).toEqual(['light', 'dark', 'system']);
  });
});
