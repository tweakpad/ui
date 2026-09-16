import { describe, expect, it } from 'vitest';
import { catalogEntries } from './catalog.js';

describe('public catalog', () => {
  it('contains all 62 unique public controls', () => {
    expect(catalogEntries).toHaveLength(62);
    expect(new Set(catalogEntries.map((entry) => entry.name)).size).toBe(62);
    expect(new Set(catalogEntries.map((entry) => entry.tagName)).size).toBe(62);
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
