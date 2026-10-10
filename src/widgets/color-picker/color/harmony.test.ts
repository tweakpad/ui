import { describe, expect, it } from 'vitest';
import { convertColor } from './convert.js';
import { inGamut } from './gamut.js';
import {
  HARMONY_RULES,
  harmonyBaseIndex,
  harmonyColors,
  harmonyHandles,
  harmonyPrincipals,
  seedCustomHandles,
} from './harmony.js';
import { generateSchemeRows } from './scheme.js';
import { color } from './types.js';

const base = { h: 0, s: 100, v: 100 };

describe('harmony', () => {
  it('produces five handles per rule with one base handle', () => {
    for (const rule of HARMONY_RULES) {
      const handles = harmonyHandles(rule);
      if (rule === 'none') {
        expect(handles).toEqual([]);
        continue;
      }
      expect(handles).toHaveLength(5);
      expect(handles.filter((entry) => entry.base)).toHaveLength(1);
      expect(harmonyBaseIndex(rule)).toBe(handles.findIndex((entry) => entry.base));
    }
  });

  it('derives colors from the base and wraps hues', () => {
    const complementary = harmonyColors(base, 'complementary');
    expect(complementary[0]).toEqual(base);
    expect(complementary[4]).toEqual({ h: 180, s: 100, v: 100 });
    expect(complementary[2]).toEqual({ h: 0, s: 20, v: 40 });
    const analogous = harmonyColors({ h: 10, s: 50, v: 80 }, 'analogous');
    expect(analogous[0]!.h).toBe(340);
    expect(analogous[2]).toEqual({ h: 10, s: 50, v: 80 });
    expect(harmonyColors(base, 'triad').map((entry) => entry.h)).toEqual([0, 120, 120, 240, 240]);
    expect(harmonyColors(base, 'compound').map((entry) => entry.h)).toEqual([
      330, 0, 150, 180, 210,
    ]);
    expect(harmonyColors(base, 'none')).toEqual([]);
  });

  it('keeps custom handles and seeds them from the previous rule', () => {
    const custom = [base, { h: 90, s: 10, v: 20 }];
    expect(harmonyColors({ h: 5, s: 5, v: 5 }, 'custom', custom)).toEqual([
      { h: 5, s: 5, v: 5 },
      custom[1],
    ]);
    expect(harmonyColors(base, 'custom')).toEqual([base]);
    const seeded = seedCustomHandles(base, 'analogous');
    expect(seeded).toHaveLength(5);
    expect(seeded[0]).toEqual(base);
    expect(seedCustomHandles(base, 'none')[4]).toEqual({ h: 180, s: 100, v: 100 });
  });
});

describe('generateSchemeRows', () => {
  it('generates the seven rows in gamut with monotonic tints, shades and tones', () => {
    const rows = generateSchemeRows(color('srgb', [0.9, 0.2, 0.2], 0.5));
    expect(rows.map((row) => row.id)).toEqual([
      'tints',
      'shades',
      'tones',
      'analogous',
      'complementary',
      'triad',
      'tetrad',
    ]);
    expect(rows.map((row) => row.colors.length)).toEqual([7, 7, 7, 7, 7, 6, 8]);
    for (const row of rows)
      for (const entry of row.colors) {
        expect(entry.space).toBe('srgb');
        expect(entry.alpha).toBe(0.5);
        expect(inGamut(entry)).toBe(true);
      }
    const lightness = (row: (typeof rows)[number]) =>
      row.colors.map((entry) => convertColor(entry, 'oklch').coords[0]);
    const increasing = (values: number[]) =>
      values.every((v, i) => i === 0 || v >= values[i - 1]! - 1e-9);
    expect(increasing(lightness(rows[0]!))).toBe(true);
    expect(increasing([...lightness(rows[1]!)].reverse())).toBe(true);
    const chroma = rows[2]!.colors.map((entry) => convertColor(entry, 'oklch').coords[1]);
    expect(increasing([...chroma].reverse())).toBe(true);
  });
  it('marks the principal hues of each scheme and keeps the base among them', () => {
    const count = (rule: Parameters<typeof harmonyPrincipals>[0]) =>
      harmonyPrincipals(rule).filter(Boolean).length;
    expect(count('complementary')).toBe(2);
    expect(count('analogous')).toBe(3);
    expect(count('triad')).toBe(3);
    expect(count('compound')).toBe(3);
    expect(count('custom')).toBe(5);
    expect(harmonyPrincipals('none')).toEqual([]);
    for (const rule of ['complementary', 'analogous', 'triad', 'compound'] as const)
      expect(harmonyPrincipals(rule)[harmonyBaseIndex(rule)]).toBe(true);
    // Custom handle lists of any length are all principals.
    expect(harmonyPrincipals('custom', 3)).toEqual([true, true, true]);
  });
});
