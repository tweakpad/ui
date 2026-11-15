import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  colorPickerAppearance,
  colorPickerStructure,
} from '../../../../../src/presentation/recipes/color-picker.js';
import { swatchEdge } from '../../../../../src/presentation/recipes/shared/edges.js';
import { swatchCorner, swatchFill } from '../../../../../src/presentation/recipes/shared/swatch.js';

const pickerFill = (): ReturnType<typeof swatchFill> =>
  swatchFill('var(--_tp-color-picker-paint, none)', 'var(--_tp-color-picker-checker)');

const checkerLayer =
  'linear-gradient(45deg, var(--tp-muted) 25%, transparent 25% 75%, var(--tp-muted) 75%)';

describe('shared swatch fill box', () => {
  it('lays the swatch paint over the transparency checker (`uwg-te-req-pres-3`)', () => {
    expect(Object.entries(swatchFill('P', 'T'))).toEqual([
      ['background-color', 'var(--tp-background)'],
      ['background-image', `P, ${checkerLayer}, ${checkerLayer}`],
      ['background-size', 'auto, T T, T T'],
      ['background-position', '0 0, 0 0, calc(T / 2) calc(T / 2)'],
    ]);
  });

  it('paints the checker squares in a given color, the muted role when none is given', () => {
    expect(swatchFill('P', 'T', 'var(--tp-muted)')).toEqual(swatchFill('P', 'T'));
    const layer = 'linear-gradient(45deg, C 25%, transparent 25% 75%, C 75%)';
    expect(swatchFill('P', 'T', 'C')).toEqual({
      ...swatchFill('P', 'T'),
      'background-image': `P, ${layer}, ${layer}`,
    });
  });

  it('rounds the flat recent strip, not its gapless cells, with the medium radius (`cinp-q8`)', () => {
    expect(swatchCorner).toBe('var(--tp-radius-md)');
    const item = colorPickerAppearance['color-picker-swatch-item']?.find(
      (rule) => rule.selector === '&[part~="toggle"]',
    );
    expect(item?.declarations['border-radius']).toBe('0');
    const strip = colorPickerStructure['color-picker-swatch-grid']?.find(
      (rule) => rule.selector === '&[part~="toggle-group"]',
    );
    // Only a flat region's strip is one rounded, edged run; elsewhere its cells are chips.
    expect(strip?.declarations['border-radius']).toBe(
      `calc(${swatchCorner} * var(--_tp-color-picker-flat, 0))`,
    );
    expect(strip?.declarations.gap).toBe('0');
  });

  it('rounds the preview swatch with the shared swatch corner (`uwg-cp-tab-anatomy-r10-c1-p`)', () => {
    expect(colorPickerAppearance['color-picker-preview']?.[0]?.declarations).toHaveProperty(
      'border-radius',
      swatchCorner,
    );
    const source = readFileSync(
      new URL('../../../../../src/presentation/recipes/color-picker.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toContain(`'border-radius': '${swatchCorner}'`);
  });

  it('fills color picker swatches from the shared swatch set (`uwg-cp-tab-anatomy-r12`)', () => {
    expect(colorPickerAppearance['color-picker-swatch']).toEqual([
      { declarations: { ...pickerFill(), 'box-shadow': swatchEdge.ring } },
    ]);
  });

  it('paints the preview, alpha track and palette over the same checker (`uwg-cp-req-pres-2`)', () => {
    for (const key of [
      'color-picker-preview',
      'color-picker-alpha-track',
      'color-picker-palette-item',
    ])
      expect(colorPickerAppearance[key]?.[0]?.declarations, key).toMatchObject(pickerFill());
  });

  it('keeps the toggle step-aside and pressed ring with the color picker (`uwg-cp-tab-anatomy-r12`)', () => {
    for (const key of ['color-picker-swatch-item']) {
      const rules = colorPickerAppearance[key] ?? [];
      expect(
        rules.find((rule) => rule.selector === '&[part~="toggle"] > [part~="toggle-content"]')
          ?.declarations,
        key,
      ).toEqual({ position: 'static' });
      expect(
        rules.find(
          (rule) => rule.selector === '&[part~="toggle"][data-pressed] slot::slotted(.swatch)',
        )?.declarations,
        key,
      ).toHaveProperty('box-shadow');
    }
    const source = readFileSync(
      new URL('../../../../../src/presentation/recipes/shared/swatch.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toMatch(/toggle/i);
    expect(source).not.toContain('box-shadow');
  });

  it('keeps no checker of its own in the color picker recipe (`uwg-cp-req-pres-2`)', () => {
    const source = readFileSync(
      new URL('../../../../../src/presentation/recipes/color-picker.ts', import.meta.url),
      'utf8',
    );
    expect(source).not.toContain('linear-gradient(45deg');
    expect(source).toContain("from './shared/swatch.js'");
  });
});
