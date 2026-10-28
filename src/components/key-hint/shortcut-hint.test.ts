import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nothing } from 'lit';
import { describe, expect, it } from 'vitest';
import { defineElement } from '../../foundation/define.js';
import type { KeyShortcut } from '../../foundation/key-bindings.js';
import { templateMarkup } from '../../template-markup.test.js';
import { TpKeyHint } from './key-hint.js';
import { TpKeyHintGroup } from './key-hint-group.js';
import { renderShortcutHint, shortcutAria } from './shortcut-hint.js';

const keyHints = (keys: readonly string[]) =>
  keys.map((key) => `<tp-key-hint key=${key}></tp-key-hint>`).join('');
const menuGroup = (...keys: string[]) =>
  `<tp-key-hint-group data-menu-shortcut separator="none">${keyHints(keys)}</tp-key-hint-group>`;
const tooltipGroup = (...keys: string[]) =>
  `<tp-key-hint-group>${keyHints(keys)}</tp-key-hint-group>`;
const paletteGroup = (...keys: string[]) =>
  `<tp-key-hint-group separator="none" part="command-palette-shortcut-hint" aria-hidden="true">${keys
    .map((key) => `<tp-key-hint>${key}</tp-key-hint>`)
    .join('')}</tp-key-hint-group>`;
const windows = (aria: string, display: string, keys: string[]): KeyShortcut => ({
  aria,
  display,
  keys,
});

describe('shortcut hints', () => {
  it('shows a menu item’s chord as one data-menu-shortcut group, one Key hint per key (`ucl20-menu-q3`, `uwg-te-req-key-2`)', () => {
    expect(templateMarkup(renderShortcutHint('Mod+D', 'menu'))).toBe(
      '<tp-key-hint-group data-menu-shortcut separator="none"><tp-key-hint key=mod></tp-key-hint><tp-key-hint key=D></tp-key-hint></tp-key-hint-group>',
    );
    const chords: Array<[string, string[]]> = [
      ['+', ['+']],
      ['-', ['-']],
      ['Shift+1', ['shift', '1']],
      ['Shift+0', ['shift', '0']],
      ['Mod+A', ['mod', 'A']],
      ['Mod+C', ['mod', 'C']],
      ['Mod+X', ['mod', 'X']],
      ['Mod+V', ['mod', 'V']],
      ['Mod+Enter', ['mod', 'Enter']],
      ['Backspace', ['Backspace']],
      ['Mod+Shift+Z', ['mod', 'shift', 'Z']],
      ['Alt+ArrowUp', ['alt', 'ArrowUp']],
      ['Mod+=', ['mod', '=']],
      ['Ctrl++', ['Ctrl', '+']],
    ];
    for (const [chord, keys] of chords)
      expect(templateMarkup(renderShortcutHint(chord, 'menu')), chord).toBe(menuGroup(...keys));
  });

  it('shows a published shortcut’s keys in the platform notation (`mp-kb-publish`)', () => {
    const bold = windows('Control+b', 'Ctrl+B', ['Control', 'B']);
    const heading = windows('Control+Alt+1', 'Ctrl+Alt+1', ['Control', 'Alt', '1']);
    const list = windows('Control+Shift+8', 'Ctrl+Shift+8', ['Control', 'Shift', '8']);
    expect(templateMarkup(renderShortcutHint(bold, 'menu'))).toBe(menuGroup('Control', 'B'));
    expect(templateMarkup(renderShortcutHint(heading, 'menu'))).toBe(
      menuGroup('Control', 'Alt', '1'),
    );
    expect(templateMarkup(renderShortcutHint(list, 'menu'))).toBe(
      menuGroup('Control', 'Shift', '8'),
    );
    expect(templateMarkup(renderShortcutHint(bold, 'tooltip'))).toBe(tooltipGroup('Control', 'B'));
    expect(templateMarkup(renderShortcutHint(heading, 'tooltip'))).toBe(
      '<tp-key-hint-group><tp-key-hint key=Control></tp-key-hint><tp-key-hint key=Alt></tp-key-hint><tp-key-hint key=1></tp-key-hint></tp-key-hint-group>',
    );
    expect(templateMarkup(renderShortcutHint(list, 'tooltip'))).toBe(
      tooltipGroup('Control', 'Shift', '8'),
    );
    const play = windows('k Space', 'K', ['K']);
    expect(templateMarkup(renderShortcutHint(play, 'tooltip'))).toBe(
      '<tp-key-hint key=K></tp-key-hint>',
    );
    expect(templateMarkup(renderShortcutHint(play, 'menu'))).toBe(menuGroup('K'));
    expect(templateMarkup(renderShortcutHint('Shift+P', 'tooltip'))).toBe(
      tooltipGroup('shift', 'P'),
    );
  });

  it('shows a Command palette row’s authored shortcut literally (`ucl18-command-q3`)', () => {
    expect(templateMarkup(renderShortcutHint('⌘N', 'palette'))).toBe(
      '<tp-key-hint-group separator="none" part="command-palette-shortcut-hint" aria-hidden="true"><tp-key-hint>⌘</tp-key-hint><tp-key-hint>N</tp-key-hint></tp-key-hint-group>',
    );
    expect(templateMarkup(renderShortcutHint('⇧⌘C', 'palette'))).toBe(paletteGroup('⇧', '⌘', 'C'));
    expect(templateMarkup(renderShortcutHint('Ctrl + Shift + Page Down', 'palette'))).toBe(
      paletteGroup('Ctrl', 'Shift', 'Page Down'),
    );
    expect(templateMarkup(renderShortcutHint('Ctrl++', 'palette'))).toBe(paletteGroup('Ctrl', '+'));
    expect(templateMarkup(renderShortcutHint('F10', 'palette'))).toBe(paletteGroup('F10'));
  });

  it('renders nothing without keys (`mp-kb-publish`)', () => {
    for (const shortcut of [undefined, '', '  '])
      expect(renderShortcutHint(shortcut, 'palette'), String(shortcut)).toBe(nothing);
    for (const variant of ['menu', 'tooltip'] as const)
      for (const shortcut of [undefined, '', '  ', windows('', '', [])])
        expect(renderShortcutHint(shortcut, variant), `${variant} ${String(shortcut)}`).toBe(
          nothing,
        );
  });

  it('publishes the aria-keyshortcuts value of a shortcut (`mp-kb-publish`, `uwg-te-req-a11y-2`)', () => {
    expect(shortcutAria(undefined)).toBeNull();
    expect(shortcutAria(windows('', '', []))).toBeNull();
    expect(
      shortcutAria(windows('Control+Shift+z Control+y', 'Ctrl+Shift+Z', ['Control', 'Shift', 'Z'])),
    ).toBe('Control+Shift+z Control+y');
  });

  it('keeps every Key hint group that a component renders for a shortcut in this module (`mp-kb-publish`)', () => {
    const root = new URL('../../', import.meta.url).pathname;
    const sources = (dir: string): string[] =>
      readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? sources(join(dir, entry.name))
          : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
            ? [join(dir, entry.name)]
            : [],
      );
    const copies = ['components', 'widgets']
      .flatMap(sources)
      .filter((file) => !file.startsWith(join('components', 'key-hint')))
      .flatMap((file) =>
        readFileSync(join(root, file), 'utf8')
          .split('\n')
          .flatMap((line, index) =>
            line.includes('<tp-key-hint-group') ? [`${file}:${index + 1}`] : [],
          ),
      );
    expect(copies).toEqual([]);
  });

  it('defines the Key hints a shortcut hint renders when a Key hint group is defined (`mp-kb-publish`)', () => {
    const defined = new Map<string, unknown>();
    const registry = {
      get: (tag: string) => defined.get(tag),
      define: (tag: string, constructor: unknown) => {
        if (defined.has(tag)) throw new Error(`duplicate ${tag}`);
        defined.set(tag, constructor);
      },
    } as unknown as CustomElementRegistry;
    defineElement(TpKeyHintGroup.tagName, TpKeyHintGroup, registry);
    expect([...defined.keys()].sort()).toEqual(['tp-key-hint', 'tp-key-hint-group']);
    expect(defined.get('tp-key-hint')).toBe(TpKeyHint);
    expect(defined.get('tp-key-hint-group')).toBe(TpKeyHintGroup);
  });
});
