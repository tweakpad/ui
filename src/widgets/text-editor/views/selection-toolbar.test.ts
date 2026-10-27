import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import type { MotionHandle } from '../../../foundation/motion.js';
import { rect } from '../../../foundation/positioning.js';
import type { TextEditorSelection } from '../../../foundation/text-editor/model.js';
import type { TextEditorToolbarItem } from '../tools/resolve.js';
import { sameTextSelection } from './selection-anchor.js';
import {
  compactGroups,
  selectionToolbarVisible,
  type SelectionToolbarVisibility,
  SelectionToolbarMotion,
} from './selection-toolbar.js';
import { anchorRects, selectionAnchor, unionRect } from './selection-anchor.js';

const point = { block: 'a', offset: 0 };
const text = (empty = false): TextEditorSelection => ({
  kind: 'text',
  anchor: point,
  head: empty ? point : { block: 'a', offset: 4 },
  empty,
});

const shown: SelectionToolbarVisibility = {
  ready: true,
  editable: true,
  placed: true,
  selection: text(),
  hasText: true,
  focusInside: true,
  composing: false,
  pointerSelecting: false,
  dragging: false,
  surfaceOpen: false,
  menuOpen: false,
};

const dom = (x: number, y: number, width: number, height: number) =>
  ({
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
  }) as DOMRectReadOnly;

describe('selection toolbar visibility (uwg-te-req-surfaces-1)', () => {
  it('shows for a text selection holding more than whitespace and for a cell range', () => {
    expect(selectionToolbarVisible(shown)).toBe(true);
    expect(
      selectionToolbarVisible({
        ...shown,
        hasText: false,
        selection: {
          kind: 'cells',
          table: 't',
          range: { anchor: { row: 0, column: 0 }, head: { row: 1, column: 1 } },
        },
      }),
    ).toBe(true);
  });

  it('hides for a caret, whitespace, blocks and no selection', () => {
    expect(selectionToolbarVisible({ ...shown, selection: text(true) })).toBe(false);
    expect(selectionToolbarVisible({ ...shown, hasText: false })).toBe(false);
    expect(selectionToolbarVisible({ ...shown, selection: { kind: 'blocks', ids: ['a'] } })).toBe(
      false,
    );
    expect(selectionToolbarVisible({ ...shown, selection: { kind: 'none' } })).toBe(false);
  });

  it('hides as soon as any condition fails', () => {
    for (const failing of [
      { ready: false },
      { editable: false },
      { placed: false },
      { focusInside: false },
      { composing: true },
      { pointerSelecting: true },
      { dragging: true },
      { surfaceOpen: true },
      // A menu of a table grip, the cell handle or the gutter hides it like a popover.
      { menuOpen: true },
    ] as Partial<SelectionToolbarVisibility>[])
      expect(selectionToolbarVisible({ ...shown, ...failing }), JSON.stringify(failing)).toBe(
        false,
      );
  });
});

describe('selection toolbar text check while focus is in the toolbar (uwg-te-req-surfaces-1, uwg-te-req-a11y-2)', () => {
  const text = (anchor: number, head: number, block = 'a'): TextEditorSelection => ({
    kind: 'text',
    anchor: { block, offset: anchor },
    head: { block, offset: head },
    empty: anchor === head,
  });

  it('treats a republished text selection with the same points as the same selection', () => {
    // A mark toggled from a focused selection-toolbar control republishes the state with a new
    // selection object; the toolbar keeps its answer instead of reading the collapsed DOM range.
    expect(sameTextSelection(text(0, 8), text(0, 8))).toBe(true);
    expect(sameTextSelection(text(0, 8), text(0, 7))).toBe(false);
    expect(sameTextSelection(text(0, 8), text(0, 8, 'b'))).toBe(false);
    expect(sameTextSelection(text(0, 8), { kind: 'none' } as TextEditorSelection)).toBe(false);
  });
});

describe('selection toolbar anchor (uwg-te-req-surfaces-1, Foundation §10.2)', () => {
  it('rises above the column grips of a cell range that the toolbar would cover', () => {
    // The table's top edge at y 100; its column grips cover 92 to 108.
    const grips = { top: 92, bottom: 108 };
    const firstRow = [dom(50, 100, 80, 40), dom(130, 100, 80, 40)];
    const extended = anchorRects(firstRow, grips, 0);
    expect(extended).toHaveLength(3);
    expect(
      unionRect(extended.map((value) => rect(value.x, value.y, value.width, value.height))),
    ).toEqual(rect(50, 92, 160, 48));
    // A range in the second row: the toolbar, 48 high with its offset, would reach the grips.
    const secondRow = [dom(50, 140, 160, 40)];
    expect(anchorRects(secondRow, grips, 48)[0]).toMatchObject({ y: 92, height: 16, width: 160 });
    // Far enough below the grips, or without a band, the selection alone anchors.
    expect(anchorRects([dom(50, 300, 160, 40)], grips, 48)).toHaveLength(1);
    expect(anchorRects(firstRow, null, 48)).toBe(firstRow);
  });

  it('unions the rectangles, and is empty without any', () => {
    expect(unionRect([rect(10, 10, 20, 10), rect(0, 20, 5, 10)])).toEqual(rect(0, 10, 30, 20));
    expect(unionRect([])).toEqual(rect(0, 0, 0, 0));
  });

  it('reads the selection rectangles at every pass, one stable anchor with its context', () => {
    let rects = [dom(10, 10, 20, 10)];
    const context = { localName: 'div' } as unknown as Element;
    const anchor = selectionAnchor(
      () => rects,
      () => context,
    );
    expect(anchor.getClientRectangles?.()).toEqual([rect(10, 10, 20, 10)]);
    rects = [dom(10, 10, 20, 10), dom(0, 20, 50, 10)];
    expect(anchor.getBoundingRectangle()).toEqual(rect(0, 10, 50, 20));
    expect(anchor.getClientRectangles?.()).toHaveLength(2);
    expect(anchor.contextElement).toBe(context);
  });

  it('keeps the last rectangles when a pass finds none, never moving to the origin', () => {
    let rects: DOMRectReadOnly[] = [];
    const anchor = selectionAnchor(
      () => rects,
      () => null,
    );
    expect(anchor.getBoundingRectangle()).toEqual(rect(0, 0, 0, 0));
    rects = [dom(10, 300, 40, 18)];
    expect(anchor.getBoundingRectangle()).toEqual(rect(10, 300, 40, 18));
    // The selection collapsed: the toolbar hides (or plays its exit) where it was.
    rects = [];
    expect(anchor.getBoundingRectangle()).toEqual(rect(10, 300, 40, 18));
    expect(anchor.getClientRectangles?.()).toEqual([rect(10, 300, 40, 18)]);
    rects = [dom(60, 320, 10, 18)];
    expect(anchor.getBoundingRectangle()).toEqual(rect(60, 320, 10, 18));
  });
});

describe('selection toolbar compact fit', () => {
  it('drops the label of label triggers only, keeping every other item as it is', () => {
    const item = (patch: Partial<TextEditorToolbarItem>) => patch as TextEditorToolbarItem;
    const icon = { name: 'quote' } as unknown as TextEditorToolbarItem['icon'];
    const turnInto = item({
      id: 'turn-into',
      control: 'menu',
      display: 'label',
      text: 'Quote',
      icon,
    });
    const color = item({ id: 'color', control: 'menu', display: 'icon' });
    const link = item({ id: 'link', control: 'button', display: 'label' });
    const [group] = compactGroups([{ key: '0', items: [turnInto, color, link] }]);
    expect(group!.items.map((entry) => entry.display)).toEqual(['icon', 'icon', 'label']);
    expect(group!.items[0]).toMatchObject({ id: 'turn-into', text: 'Quote', icon });
    expect(group!.items[1]).toBe(color);
  });

  it('keeps the label of a label trigger that has no icon to show, so no trigger is a bare chevron', () => {
    const mixed = {
      id: 'turn-into',
      control: 'menu',
      display: 'label',
      text: 'Turn into',
    } as unknown as TextEditorToolbarItem;
    const [group] = compactGroups([{ key: '0', items: [mixed] }]);
    expect(group!.items[0]).toBe(mixed);
  });
});

describe('selection toolbar focus across a layout change', () => {
  it('returns focus that a render took from a control to the editing root, as a hide with focus inside does', () => {
    const source = readFileSync(new URL('./selection-toolbar.ts', import.meta.url), 'utf8');
    expect(source).toContain('this.#controls.noteFocus(this.#host.renderRoot, this.#surface);');
    expect(source).toContain(
      'if (this.#controls.restoreFocus(root, surface)) this.#host.focusEditing();',
    );
  });

  it('Alt+F10 focuses its first control with the focus indicator, which the chord does not give', () => {
    const source = readFileSync(new URL('./selection-toolbar.ts', import.meta.url), 'utf8');
    expect(source).toContain('return this.#contextual?.focus({ focusVisible: true }) ?? false;');
  });
});

describe('selection toolbar surface motion (uwg-te-req-pres-7)', () => {
  const handle = (claimed: boolean) => {
    let settle: () => void = () => undefined;
    const finished = new Promise<void>((resolve) => (settle = resolve));
    return {
      handle: {
        claimed,
        request: null,
        playback: null,
        finished,
        start: vi.fn(() => null),
        cancel: vi.fn(() => settle()),
      } satisfies MotionHandle,
      settle: () => settle(),
    };
  };

  it('requests enter on show and exit before hiding, at once when no driver claims it', () => {
    const phases: string[] = [];
    const motion = new SelectionToolbarMotion((phase) => {
      phases.push(phase);
      return handle(false).handle;
    });
    motion.entered();
    const hide = vi.fn();
    motion.exit(hide);
    expect(phases).toEqual(['enter', 'exit']);
    expect(hide).toHaveBeenCalledTimes(1);
    expect(motion.exiting).toBe(false);
  });

  it('waits for a claimed exit, ignores repeated hides, and a new show cancels the pending hide', async () => {
    const created: ReturnType<typeof handle>[] = [];
    const motion = new SelectionToolbarMotion(() => {
      const next = handle(true);
      created.push(next);
      return next.handle;
    });
    const hide = vi.fn();
    motion.exit(hide);
    motion.exit(hide);
    expect([created.length, motion.exiting, hide.mock.calls.length]).toEqual([1, true, 0]);
    created[0]!.settle();
    await Promise.resolve();
    expect([motion.exiting, hide.mock.calls.length]).toEqual([false, 1]);
    // An exit that a show replaces never hides.
    motion.exit(hide);
    motion.entered();
    created[1]!.settle();
    await Promise.resolve();
    expect([motion.exiting, hide.mock.calls.length]).toEqual([false, 1]);
    expect(created.map((entry) => entry.handle.start.mock.calls.length)).toEqual([1, 1, 1]);
  });

  it('a cancelled exit never hides', async () => {
    const pending = handle(true);
    const motion = new SelectionToolbarMotion(() => pending.handle);
    const hide = vi.fn();
    motion.exit(hide);
    motion.cancel();
    await Promise.resolve();
    expect([hide.mock.calls.length, pending.handle.cancel.mock.calls.length]).toEqual([0, 1]);
  });
});
