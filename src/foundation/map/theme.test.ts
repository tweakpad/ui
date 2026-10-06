import { describe, expect, it } from 'vitest';
import { mapThemesEqual, resolveMapTheme, resolveScheme, tokenMapTheme } from './theme.js';

describe('map appearance (map-f-appearance)', () => {
  it('resolves the scheme from color-scheme and the user preference', () => {
    expect(resolveScheme('normal', true)).toBe('light');
    expect(resolveScheme('dark', false)).toBe('dark');
    expect(resolveScheme('light dark', false)).toBe('light');
    expect(resolveScheme('light dark', true)).toBe('dark');
  });

  it('resolves roles per scheme, falling back to the other scheme', () => {
    const seen: string[] = [];
    const resolved = resolveMapTheme(tokenMapTheme, 'dark', (value) => {
      seen.push(value);
      return value === 'var(--tp-muted)' ? '#111111' : null;
    });
    expect(resolved).toEqual({ water: '#111111' });
    expect(seen).toContain('var(--tp-background)');
    expect(resolveMapTheme({ dark: { water: 'navy' } }, 'dark', (v) => v)).toEqual({
      water: 'navy',
    });
    expect(resolveMapTheme(null, 'light', (v) => v)).toBeNull();
    expect(mapThemesEqual({ water: '#000' }, { water: '#000' })).toBe(true);
    expect(mapThemesEqual({ water: '#000' }, { water: '#111' })).toBe(false);
  });
});
