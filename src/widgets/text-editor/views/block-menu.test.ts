import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { TextEditorToolbarGroup, TextEditorToolbarItem } from '../tools/resolve.js';
import { blockMenuActivation, blockMenuGroups, ownBlockMenuAction } from './block-menu.js';

const item = (id: string, kind: TextEditorToolbarItem['kind']): TextEditorToolbarItem =>
  ({ id, kind }) as TextEditorToolbarItem;

describe('block menu', () => {
  it('performs moves and copy link itself; every other item is a tool request', () => {
    expect(ownBlockMenuAction('move-block-up')).toBe(true);
    expect(ownBlockMenuAction('move-block-down')).toBe(true);
    expect(ownBlockMenuAction('copy-block-link')).toBe(true);
    expect(ownBlockMenuAction('duplicate-block')).toBe(false);
    expect(ownBlockMenuAction('delete-block')).toBe(false);
  });

  it('issues item presses with the block-menu surface', () => {
    const sourceEvent = new Event('click');
    const trigger = {} as Element;
    expect(
      blockMenuActivation({
        tool: 'duplicate-block',
        reason: 'item-press',
        surface: 'toolbar',
        sourceEvent,
        trigger,
        focus: true,
      }),
    ).toEqual({
      tool: 'duplicate-block',
      reason: 'item-press',
      surface: 'block-menu',
      sourceEvent,
      trigger,
      focus: true,
    });
  });

  it('shows the color item only with channel groups to offer', () => {
    const color = { ...item('color', 'color'), colors: [{ channel: 'text' }] } as never;
    const groups: TextEditorToolbarGroup[] = [
      { key: '0', items: [item('turn-into', 'radio-menu'), item('color', 'color')] },
      { key: '1', items: [item('color', 'color')] },
      { key: '2', items: [item('delete-block', 'button')] },
    ];
    expect(blockMenuGroups(groups).map((group) => group.items.map((entry) => entry.id))).toEqual([
      ['turn-into'],
      ['delete-block'],
    ]);
    const withColors: TextEditorToolbarGroup[] = [{ key: '0', items: [color] }];
    expect(blockMenuGroups(withColors)).toBe(withColors);
  });
});

describe('block menu source guards', () => {
  const source = readFileSync(new URL('./block-menu.ts', import.meta.url), 'utf8');

  it('is an unportaled, non-modal Menu with the grip as a detached trigger', () => {
    expect(source).toContain('.portal=${false}');
    expect(source).toContain('.modal=${false}');
    expect(source).toContain('menu.registerTrigger(grip)');
  });

  it('freezes its items while it is open', () => {
    expect(source).toContain('const groups = this.#frozen ??');
  });
});
