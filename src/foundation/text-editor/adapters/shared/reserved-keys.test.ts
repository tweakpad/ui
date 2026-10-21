import { describe, expect, it } from 'vitest';
import { keyEvent } from './test-helpers.test.js';
import { isModifiedEnter, MODIFIED_ENTER_CHORDS } from './reserved-keys.js';

describe('uwg-te-req-engine-11: the modified Enter chords every adapter reserves', () => {
  it('are Enter with Ctrl, Meta or Alt, alone or together, with and without Shift, by physical modifiers', () => {
    expect(MODIFIED_ENTER_CHORDS).toEqual([
      'Ctrl+Enter',
      'Meta+Enter',
      'Alt+Enter',
      'Ctrl+Meta+Enter',
      'Ctrl+Alt+Enter',
      'Meta+Alt+Enter',
      'Ctrl+Meta+Alt+Enter',
      'Ctrl+Shift+Enter',
      'Meta+Shift+Enter',
      'Alt+Shift+Enter',
      'Ctrl+Meta+Shift+Enter',
      'Ctrl+Alt+Shift+Enter',
      'Meta+Alt+Shift+Enter',
      'Ctrl+Meta+Alt+Shift+Enter',
    ]);
    expect(new Set(MODIFIED_ENTER_CHORDS).size).toBe(14);
    expect(Object.isFrozen(MODIFIED_ENTER_CHORDS)).toBe(true);
    // The editing keys, select-all and Escape stay out; no chord depends on the platform.
    for (const chord of ['Enter', 'Shift+Enter', 'Mod+a', 'Escape'])
      expect(MODIFIED_ENTER_CHORDS).not.toContain(chord);
    expect(MODIFIED_ENTER_CHORDS.filter((chord) => chord.includes('Mod'))).toEqual([]);
  });

  it('isModifiedEnter tells a modified Enter from Enter and Shift+Enter', () => {
    expect(isModifiedEnter(null)).toBe(false);
    expect(isModifiedEnter(keyEvent('Enter').event)).toBe(false);
    expect(isModifiedEnter(keyEvent('Enter', { shift: true }).event)).toBe(false);
    for (const init of [{ ctrl: true }, { meta: true }, { alt: true }, { meta: true, shift: true }])
      expect(isModifiedEnter(keyEvent('Enter', init).event), JSON.stringify(init)).toBe(true);
  });
});
