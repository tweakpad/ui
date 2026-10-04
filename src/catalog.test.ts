import { describe, expect, it } from 'vitest';
import { catalogEntries } from './catalog.js';

describe('public catalog', () => {
  it('contains unique public controls and one Menu identity', () => {
    expect(catalogEntries.some((entry) => entry.tagName === 'tp-menu')).toBe(true);
    expect(catalogEntries.some((entry) => entry.tagName === 'tp-context-menu')).toBe(false);
    expect(new Set(catalogEntries.map((entry) => entry.name)).size).toBe(catalogEntries.length);
    expect(new Set(catalogEntries.map((entry) => entry.tagName)).size).toBe(catalogEntries.length);
  });

  it('uses the public tp custom-element namespace', () => {
    for (const entry of catalogEntries) {
      expect(entry.tagName).toMatch(/^tp-[a-z0-9-]+$/);
    }
  });

  it('preserves every specification definition kind', () => {
    expect(new Set(catalogEntries.map((entry) => entry.kind))).toEqual(
      new Set([
        'compound-reexport',
        'flattening-compound',
        'preset-composition',
        'presentational-primitive',
        'thin-wrapper',
      ]),
    );
  });
});
