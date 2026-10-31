import { describe, expect, it } from 'vitest';
import { kbdNotation, kbdPlatform } from '../../foundation/key-notation.js';
import { shortcutKeys } from './shortcut.js';
describe('Kbd notation', () => {
  it('resolves automatic platform and preserves explicit overrides', () => {
    expect(kbdPlatform('auto', { platform: 'MacIntel', userAgent: '' })).toBe('mac');
    expect(kbdPlatform('auto', { platform: 'Win32', userAgent: '' })).toBe('windows');
    expect(kbdPlatform('auto', { platform: 'Linux', userAgent: '' })).toBe('linux');
    expect(kbdPlatform('linux', { platform: 'MacIntel', userAgent: '' })).toBe('linux');
  });
  it('gives symbols readable names and uses the platform modifier', () => {
    expect(kbdNotation('mod', 'mac')).toEqual({ text: '⌘', label: 'Command' });
    expect(kbdNotation('mod', 'windows')).toEqual({ text: 'Ctrl', label: 'Control' });
    expect(kbdNotation('option', 'mac')).toEqual({ text: '⌥', label: 'Option' });
    expect(kbdNotation('command', 'linux').text).toBe('Super');
    expect(kbdNotation('⌘', 'windows').label).toBe('Windows');
    expect(kbdNotation('Page Down', 'mac').text).toBe('Page Down');
    expect(kbdNotation('constructor', 'mac').text).toBe('constructor');
  });
  it('localizes canonical and supplied names independently', () => {
    expect(kbdNotation('ctrl', 'mac', { control: { text: 'Ctrl', label: 'Contrôle' } })).toEqual({
      text: 'Ctrl',
      label: 'Contrôle',
    });
    expect(kbdNotation('mod', 'mac', { mod: 'Primary', command: 'Commande' }).text).toBe('Primary');
    expect(kbdNotation('mod', 'mac', { command: 'Commande' }).text).toBe('Commande');
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
