import { describe, expect, it } from 'vitest';
import { channelDefinitions } from './color/channels.js';
import { DEFAULT_STRINGS } from './strings.js';
import {
  applyKeyboardStep,
  channelName,
  channelValueText,
  dimensionLabel,
  stepForKey,
} from './dimensions.js';

const [hue, saturation] = channelDefinitions('hsv', false);
const key = (
  name: string,
  modifiers: Partial<Record<'shiftKey' | 'ctrlKey' | 'metaKey' | 'altKey', boolean>> = {},
): KeyboardEvent =>
  ({
    key: name,
    shiftKey: false,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    ...modifiers,
  }) as KeyboardEvent;

describe('keyboard step model', () => {
  it('steps by the channel step, large step with modifiers and page keys, small step with Alt', () => {
    const options = { definition: saturation!, axis: 'both' as const, direction: 'ltr' as const };
    expect(stepForKey(key('ArrowRight'), options)).toEqual({ kind: 'delta', amount: 1 });
    expect(stepForKey(key('ArrowLeft', { shiftKey: true }), options)).toEqual({
      kind: 'delta',
      amount: -10,
    });
    expect(stepForKey(key('ArrowUp', { ctrlKey: true }), options)).toEqual({
      kind: 'delta',
      amount: 10,
    });
    expect(stepForKey(key('ArrowDown', { altKey: true }), options)).toEqual({
      kind: 'delta',
      amount: -0.1,
    });
    expect(stepForKey(key('PageUp'), options)).toEqual({ kind: 'delta', amount: 10 });
    expect(stepForKey(key('Home'), options)).toEqual({ kind: 'min' });
    expect(stepForKey(key('End'), options)).toEqual({ kind: 'max' });
    expect(stepForKey(key('Enter'), options)).toBeNull();
  });

  it('restricts arrows to the axis and reserves Page, Home and End for the focused dimension', () => {
    const horizontal = {
      definition: saturation!,
      axis: 'horizontal' as const,
      direction: 'ltr' as const,
    };
    expect(stepForKey(key('ArrowUp'), horizontal)).toBeNull();
    expect(stepForKey(key('Home'), horizontal)).toBeNull();
    const vertical = {
      definition: saturation!,
      axis: 'vertical' as const,
      direction: 'ltr' as const,
    };
    expect(stepForKey(key('ArrowRight'), vertical)).toBeNull();
    expect(stepForKey(key('ArrowUp'), vertical)).toEqual({ kind: 'delta', amount: 1 });
  });

  it('flips horizontal arrows in RTL unless the axis is angular', () => {
    const rtl = { definition: saturation!, axis: 'horizontal' as const, direction: 'rtl' as const };
    expect(stepForKey(key('ArrowRight'), rtl)).toEqual({ kind: 'delta', amount: -1 });
    const angular = {
      definition: hue!,
      axis: 'both' as const,
      direction: 'rtl' as const,
      angular: true,
    };
    expect(stepForKey(key('ArrowRight'), angular)).toEqual({ kind: 'delta', amount: 1 });
  });

  it('applies steps and formats names and value text', () => {
    expect(applyKeyboardStep(50, { kind: 'delta', amount: 10 }, saturation!)).toBe(60);
    expect(applyKeyboardStep(50, { kind: 'min' }, saturation!)).toBe(0);
    expect(applyKeyboardStep(50, { kind: 'max' }, hue!)).toBe(360);
    expect(channelName(DEFAULT_STRINGS, hue!)).toBe('Hue');
    expect(channelValueText(hue!, 241.6)).toBe('242°');
    expect(channelValueText(saturation!, 66.4)).toBe('66%');
    expect(dimensionLabel('Accent', 'Hue')).toBe('Accent: Hue');
    expect(dimensionLabel('', 'Hue')).toBe('Hue');
  });
});
