import { describe, expect, it } from 'vitest';
import {
  isTextEditorColor,
  isTextEditorColorChoice,
  paletteName,
  TEXT_EDITOR_COLORS,
  type TextEditorColorChoice,
} from './palette.js';

describe('palette (ccx-roles, uwg-te-tab-content-model r10)', () => {
  it('V-502: nine hues in order, default stores nothing, other names rejected', () => {
    expect(TEXT_EDITOR_COLORS).toEqual([
      'gray',
      'brown',
      'orange',
      'yellow',
      'green',
      'blue',
      'purple',
      'pink',
      'red',
    ]);
    expect(Object.isFrozen(TEXT_EDITOR_COLORS)).toBe(true);

    for (const color of TEXT_EDITOR_COLORS) {
      expect(isTextEditorColor(color)).toBe(true);
      expect(paletteName(color)).toBe(color);
    }
    expect(paletteName('default')).toBeNull();

    for (const name of ['default', 'teal', 'Gray', 'red ', '', 'var(--tp-content-red)', '#ff0000'])
      expect(isTextEditorColor(name), name).toBe(false);
    for (const value of [null, undefined, 1, {}, ['red']])
      expect(isTextEditorColor(value)).toBe(false);
    for (const name of ['teal', 'Red', '', 'none'])
      expect(() => paletteName(name as TextEditorColorChoice), name).toThrow(TypeError);
  });

  it('accepts a color choice: a hue or default', () => {
    expect(isTextEditorColorChoice('default')).toBe(true);
    expect(isTextEditorColorChoice('purple')).toBe(true);
    for (const value of ['teal', 'Default', null, undefined, 0])
      expect(isTextEditorColorChoice(value)).toBe(false);
  });
});
