import { describe, expect, it } from 'vitest';
import { keyHintNotation, keyHintPlatform } from './notation.js';
import { shortcutKeys } from './shortcut.js';
describe('Key Hint notation', () => {
  it('resolves automatic platform and preserves explicit overrides', () => {
    expect(keyHintPlatform('auto', { platform: 'MacIntel', userAgent: '' })).toBe('mac');
    expect(keyHintPlatform('auto', { platform: 'Win32', userAgent: '' })).toBe('windows');
    expect(keyHintPlatform('auto', { platform: 'Linux', userAgent: '' })).toBe('linux');
    expect(keyHintPlatform('linux', { platform: 'MacIntel', userAgent: '' })).toBe('linux');
  });
  it('gives symbols readable names and uses the platform modifier', () => {
    expect(keyHintNotation('mod', 'mac')).toEqual({ text: '⌘', label: 'Command' });
    expect(keyHintNotation('mod', 'windows')).toEqual({ text: 'Ctrl', label: 'Control' });
    expect(keyHintNotation('option', 'mac')).toEqual({ text: '⌥', label: 'Option' });
    expect(keyHintNotation('command', 'linux').text).toBe('Super');
    expect(keyHintNotation('⌘', 'windows').label).toBe('Windows');
    expect(keyHintNotation('Page Down', 'mac').text).toBe('Page Down');
    expect(keyHintNotation('constructor', 'mac').text).toBe('constructor');
  });
  it('localizes canonical and supplied names independently', () => {
    expect(
      keyHintNotation('ctrl', 'mac', { control: { text: 'Ctrl', label: 'Contrôle' } }),
    ).toEqual({ text: 'Ctrl', label: 'Contrôle' });
    expect(keyHintNotation('mod', 'mac', { mod: 'Primary', command: 'Commande' }).text).toBe(
      'Primary',
    );
    expect(keyHintNotation('mod', 'mac', { command: 'Commande' }).text).toBe('Commande');
  });
  it('splits conventional command prefixes without breaking multiword keys', () => {
    expect(shortcutKeys('⇧⌘C')).toEqual(['⇧', '⌘', 'C']);
    expect(shortcutKeys('Ctrl + Shift + Page Down')).toEqual(['Ctrl', 'Shift', 'Page Down']);
    expect(shortcutKeys('⌘ K')).toEqual(['⌘', 'K']);
    expect(shortcutKeys('Ctrl++')).toEqual(['Ctrl', '+']);
    expect(shortcutKeys('Page précédente')).toEqual(['Page précédente']);
    expect(shortcutKeys('F10')).toEqual(['F10']);
    expect(shortcutKeys('')).toEqual([]);
  });
});
