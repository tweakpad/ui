import { readFileSync } from 'node:fs';
import { render } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import { textEditorStrings } from '../../../foundation/text-editor/strings.js';
import type { TextEditorToolbarGroup, TextEditorToolbarItem } from '../tools/resolve.js';
import {
  blockMenuActivation,
  blockMenuGroups,
  ownBlockMenuAction,
  TextEditorBlockMenu,
} from './block-menu.js';

vi.mock('lit', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  render: vi.fn(),
}));

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

describe('a closed block menu resolves no tool (V-588)', () => {
  /** The listener bound to `@tp-open-change` in the menu's template. */
  const openListener = (template: unknown) => {
    const { strings, values } = template as {
      strings: readonly string[];
      values: readonly unknown[];
    };
    const at = strings.findIndex((text) => text.trimEnd().endsWith('@tp-open-change='));
    return values[at] as (event: unknown) => void;
  };

  it('resolves and renders its items into the Menu when it opens, and freezes them while open', () => {
    vi.mocked(render).mockClear();
    const groups = vi.fn((): TextEditorToolbarGroup[] => [
      { key: '0', items: [item('delete-block', 'button')] },
    ]);
    const host = {
      strings: () => textEditorStrings,
      groups,
      activate: vi.fn(),
      perform: vi.fn(),
      finalFocus: () => true,
      openChanged: vi.fn(),
      requestUpdate: vi.fn(),
    };
    const view = new TextEditorBlockMenu(host);
    // Every render of the element while closed, as after each typed character.
    for (let index = 0; index < 3; index += 1) view.render(true);
    expect(groups).not.toHaveBeenCalled();
    expect(render).not.toHaveBeenCalled();
    const element = {};
    const menu = { getRootNode: () => ({ host: element }) };
    const event = (value: boolean) => ({
      target: menu,
      currentTarget: menu,
      detail: { value },
    });
    openListener(view.render(true))(event(true));
    expect(groups).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
    expect(vi.mocked(render).mock.calls[0]?.[1]).toBe(menu);
    expect(vi.mocked(render).mock.calls[0]?.[2]).toEqual({ host: element });
    expect(host.openChanged).toHaveBeenCalledWith(true);
    view.render(true);
    expect(groups).toHaveBeenCalledTimes(1);
    openListener(view.render(true))(event(false));
    view.render(true);
    expect(groups).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledTimes(1);
  });
});

describe('block menu source guards', () => {
  const source = readFileSync(new URL('./block-menu.ts', import.meta.url), 'utf8');

  it('is an unportaled, non-modal Menu with the grip as a detached trigger', () => {
    expect(source).toContain('.portal=${false}');
    expect(source).toContain('.modal=${false}');
    expect(source).toContain('menu.registerTrigger(grip, { identifier: GRIP_TRIGGER })');
  });

  it('opens from a key with the grip as its default trigger', () => {
    expect(source).toContain('default-trigger-identifier=${GRIP_TRIGGER}');
  });

  it('renders outside the viewport and the overlay, beside the other floating surfaces (uwg-te-req-ana-3)', () => {
    const element = readFileSync(new URL('../text-editor.ts', import.meta.url), 'utf8');
    const overlay = element.slice(
      element.indexOf('<div part="text-editor-overlay">'),
      element.indexOf('${this.#renderStatus()}'),
    );
    expect(overlay).toContain('${this.#blocks.render()}');
    expect(overlay).not.toContain('renderMenu');
    expect(element).toContain('${this.#renderStatus()}${this.#blocks.renderMenu()}');
    const blocks = readFileSync(new URL('./blocks.ts', import.meta.url), 'utf8');
    expect(blocks).toContain('return this.gutter.render();');
  });
});
