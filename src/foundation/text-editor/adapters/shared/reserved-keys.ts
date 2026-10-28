/**
 * Chords that every engine adapter reserves alike (Widgets `uwg-te-req-engine-11`,
 * `uwg-te-tab-engine` r11).
 *
 * Enter and Shift+Enter are editing keys and stay with the engine. Every other Enter chord, Enter
 * with Ctrl, Meta or Alt, alone or together, with or without Shift, is no editing key, and each
 * engine still prevents or acts on it whatever the adapter turns off, so each adapter lists the
 * same chords in `reservedKeys`, on every platform, for the widget to consume as a capture owner.
 */

/**
 * Enter with Ctrl, Meta or Alt, alone or together, with or without Shift: every Enter chord that is
 * neither Enter nor Shift+Enter, named by its physical modifiers so that the list is the same on
 * every platform (Mod+Enter is Meta+Enter on Apple platforms and Ctrl+Enter elsewhere).
 */
export const MODIFIED_ENTER_CHORDS: readonly string[] = Object.freeze(
  [false, true].flatMap((shift) =>
    [
      ['Ctrl'],
      ['Meta'],
      ['Alt'],
      ['Ctrl', 'Meta'],
      ['Ctrl', 'Alt'],
      ['Meta', 'Alt'],
      ['Ctrl', 'Meta', 'Alt'],
    ].map((modifiers) => [...modifiers, ...(shift ? ['Shift'] : []), 'Enter'].join('+')),
  ),
);

/** Whether a key event of Enter has Ctrl, Meta or Alt, which makes it no editing key. */
export const isModifiedEnter = (event: KeyboardEvent | null): event is KeyboardEvent =>
  event !== null && (event.ctrlKey || event.metaKey || event.altKey);
