import { html, type TemplateResult } from 'lit';

// One chord per command, shared by the key bindings and the menu hints so the two never drift.
// Shift+digit chords match the physical digit key (Foundation key bindings).
export const ZOOM_IN_KEYS = '+';
export const ZOOM_OUT_KEYS = '-';
export const ZOOM_FIT_KEYS = 'Shift+1';
export const ZOOM_RESET_KEYS = 'Shift+0';
export const DUPLICATE_KEYS = 'Mod+D';
export const SELECT_ALL_KEYS = 'Mod+A';
// Copy, cut and paste run on the native clipboard events of these chords.
export const COPY_KEYS = 'Mod+C';
export const CUT_KEYS = 'Mod+X';
export const PASTE_KEYS = 'Mod+V';
/** Runs the whole graph (`runnable`). */
export const RUN_KEYS = 'Mod+Enter';
/** The first chord is the hint: the Backspace key is the Mac keyboard's Delete. */
export const DELETE_KEYS = ['Backspace', 'Delete'] as const;

const MODIFIERS = new Set(['mod', 'shift', 'alt', 'control', 'command']);

/** A Menu item's shortcut (`menu-shortcut`): one Key hint per part of the chord. */
export function renderShortcut(chord: string): TemplateResult {
  const parts = chord === '+' ? ['+'] : chord.split('+');
  return html`<tp-key-hint-group data-menu-shortcut separator="none"
    >${parts.map((part) => {
      const key = MODIFIERS.has(part.toLowerCase()) ? part.toLowerCase() : part;
      return html`<tp-key-hint key=${key}></tp-key-hint>`;
    })}</tp-key-hint-group
  >`;
}
