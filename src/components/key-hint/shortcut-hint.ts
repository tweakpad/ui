import { html, nothing, type TemplateResult } from 'lit';
import type { KeyShortcut } from '../../foundation/key-bindings.js';
import { shortcutKeys } from './shortcut.js';

/** Where a shortcut hint is shown (`mp-kb-publish`). */
export type ShortcutHintVariant = 'menu' | 'palette' | 'tooltip';

const MODIFIERS = new Set(['mod', 'shift', 'alt', 'control', 'command']);

/** A chord in the key-binding pattern syntax as Key hint `key` values; modifiers lowercased. */
function chordKeys(chord: string): string[] {
  return shortcutKeys(chord).map((key) =>
    MODIFIERS.has(key.toLowerCase()) ? key.toLowerCase() : key,
  );
}

/**
 * A Command palette row's authored shortcut text (`⌘N`), shown literally: one Key hint per key,
 * in one `separator="none"` group with `aria-hidden` and the `command-palette-shortcut-hint`
 * part (`ucl18-command-q3`).
 */
export function renderShortcutHint(
  shortcut: string | undefined,
  variant: 'palette',
): TemplateResult | typeof nothing;
/**
 * A published shortcut, or a chord in the key-binding pattern syntax (`Mod+D`, `Shift+1`, `+`), as
 * Key hint `key` values in the platform notation (`uwg-te-req-key-2`, `mp-kb-publish`):
 * - `menu`: one `data-menu-shortcut` group with `separator="none"` (`ucl20-menu-q3`);
 * - `tooltip`: a single key alone, or a chord as one group with the default separator.
 *
 * The hints are notation only and install no shortcut (`ucl22-key-hint-q1`). A component that
 * renders them declares `TpKeyHintGroup`, which defines `TpKeyHint` too.
 */
export function renderShortcutHint(
  shortcut: KeyShortcut | string | undefined,
  variant: 'menu' | 'tooltip',
): TemplateResult | typeof nothing;
export function renderShortcutHint(
  shortcut: KeyShortcut | string | undefined,
  variant: ShortcutHintVariant,
): TemplateResult | typeof nothing {
  if (variant === 'palette') {
    const keys = typeof shortcut === 'string' ? shortcutKeys(shortcut) : [];
    return keys.length
      ? html`<tp-key-hint-group
          separator="none"
          part="command-palette-shortcut-hint"
          aria-hidden="true"
          >${keys.map((key) => html`<tp-key-hint>${key}</tp-key-hint>`)}</tp-key-hint-group
        >`
      : nothing;
  }
  const keys = typeof shortcut === 'string' ? chordKeys(shortcut) : (shortcut?.keys ?? []);
  if (!keys.length) return nothing;
  const hints = keys.map((key) => html`<tp-key-hint key=${key}></tp-key-hint>`);
  if (variant === 'menu')
    return html`<tp-key-hint-group data-menu-shortcut separator="none"
      >${hints}</tp-key-hint-group
    >`;
  return hints.length === 1 ? hints[0]! : html`<tp-key-hint-group>${hints}</tp-key-hint-group>`;
}

/**
 * The `aria-keyshortcuts` value of a published shortcut, or null without one (`mp-kb-publish`,
 * `uwg-te-req-a11y-2`).
 */
export function shortcutAria(shortcut: KeyShortcut | undefined): string | null {
  return shortcut?.aria || null;
}
