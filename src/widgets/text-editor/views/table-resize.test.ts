import { describe, expect, it, vi } from 'vitest';

vi.mock('../../../foundation/generated-style.js', () => ({
  GeneratedStyleResource: class {
    setText() {}
    dispose() {}
  },
}));

vi.mock('../../../foundation/drag-cursor.js', () => ({
  leaseDragCursor: () => () => {},
}));

import {
  columnResizeMax,
  resizedWidths,
  TABLE_COLUMN_MIN,
  TextEditorTableResize,
  type TableResizeHost,
} from './table-resize.js';

function key(name: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  return Object.assign(new Event('keydown', { cancelable: true }), {
    key: name,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    ...init,
  }) as unknown as KeyboardEvent;
}

function pointer(type: string, init: Record<string, unknown> = {}): PointerEvent {
  return Object.assign(new Event(type, { cancelable: true }), {
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 1,
    clientX: 100,
    clientY: 0,
    ...init,
  }) as unknown as PointerEvent;
}

const element = {
  focus() {},
  setPointerCapture() {},
  hasPointerCapture: () => false,
  releasePointerCapture() {},
} as unknown as HTMLElement;

function setup(direction: 'ltr' | 'rtl' = 'ltr', disabled = false) {
  const commit = vi.fn();
  const changed = vi.fn();
  const host: TableResizeHost = {
    element: { ownerDocument: { defaultView: new EventTarget() } } as unknown as HTMLElement,
    direction: () => direction,
    disabled: () => disabled,
    commit,
    changed,
  };
  const resize = new TextEditorTableResize(host);
  resize.setTarget({ table: 't1', column: 1, widths: [120, 100, 80], visible: 300 });
  return { host: { commit, changed }, resize };
}

describe('column resize helpers', () => {
  it('keeps every measured width, the resized one clamped to the minimum', () => {
    expect(resizedWidths([120.4, 100, 80], 1, 20)).toEqual([120, TABLE_COLUMN_MIN, 80]);
    expect(resizedWidths([120, 100, 30], 0, 150.6)).toEqual([151, 100, TABLE_COLUMN_MIN]);
  });

  it('allows the larger of the visible width and the column width', () => {
    expect(columnResizeMax(300, 100)).toBe(300);
    expect(columnResizeMax(300, 520)).toBe(520);
    expect(columnResizeMax(0, 10)).toBe(TABLE_COLUMN_MIN);
  });
});

describe('TextEditorTableResize', () => {
  it('steps by 8, 32 with Shift and 1 with Alt, one keyboard request each', () => {
    const { host, resize } = setup();
    resize.separator.handleKeyDown(key('ArrowRight'));
    expect(host.commit).toHaveBeenLastCalledWith(
      't1',
      [120, 108, 80],
      'keyboard',
      expect.anything(),
    );
    resize.separator.handleKeyDown(key('ArrowLeft', { shiftKey: true }));
    expect(host.commit).toHaveBeenLastCalledWith(
      't1',
      [120, 76, 80],
      'keyboard',
      expect.anything(),
    );
    resize.separator.handleKeyDown(key('ArrowRight', { altKey: true }));
    expect(host.commit).toHaveBeenLastCalledWith(
      't1',
      [120, 77, 80],
      'keyboard',
      expect.anything(),
    );
    resize.separator.handleKeyDown(key('Home'));
    expect(host.commit).toHaveBeenLastCalledWith(
      't1',
      [120, 48, 80],
      'keyboard',
      expect.anything(),
    );
    resize.separator.handleKeyDown(key('End'));
    expect(host.commit).toHaveBeenLastCalledWith(
      't1',
      [120, 300, 80],
      'keyboard',
      expect.anything(),
    );
    expect(host.commit).toHaveBeenCalledTimes(5);
  });

  it('mirrors the arrows in right-to-left content', () => {
    const { host, resize } = setup('rtl');
    resize.separator.handleKeyDown(key('ArrowLeft'));
    expect(host.commit).toHaveBeenLastCalledWith(
      't1',
      [120, 108, 80],
      'keyboard',
      expect.anything(),
    );
  });

  it('moves a guide while dragging and commits once on release', () => {
    const { host, resize } = setup();
    resize.pointerDown(pointer('pointerdown'), element);
    expect(resize.dragging).toBe(true);
    resize.separator.pointerMove(pointer('pointermove', { clientX: 130 }));
    expect(resize.guideOffset).toBe(30);
    expect(host.changed).toHaveBeenCalled();
    expect(host.commit).not.toHaveBeenCalled();
    // The target does not move during a drag.
    resize.setTarget({ table: 't1', column: 0, widths: [1, 2, 3], visible: 10 });
    resize.separator.pointerMove(pointer('pointermove', { clientX: 10 }));
    expect(resize.guideOffset).toBe(-52);
    resize.separator.pointerUp(pointer('pointerup', { clientX: 10 }));
    expect(host.commit).toHaveBeenCalledWith('t1', [120, 48, 80], 'drag', expect.anything());
    expect(resize.guideOffset).toBeNull();
  });

  it('restores without a request on Escape, pointer cancellation or a press without movement', () => {
    const { host, resize } = setup();
    resize.pointerDown(pointer('pointerdown'), element);
    resize.separator.pointerMove(pointer('pointermove', { clientX: 150 }));
    resize.separator.pointerCancel(pointer('pointercancel'));
    resize.pointerDown(pointer('pointerdown'), element);
    resize.separator.pointerMove(pointer('pointermove', { clientX: 150 }));
    resize.separator.cancel(key('Escape'));
    resize.pointerDown(pointer('pointerdown'), element);
    resize.separator.pointerUp(pointer('pointerup'));
    expect(host.commit).not.toHaveBeenCalled();
    expect(resize.guideOffset).toBeNull();
  });

  it('changes nothing while disabled or without a target', () => {
    const { host, resize } = setup('ltr', true);
    expect(resize.separator.handleKeyDown(key('ArrowRight'))).toBe(false);
    const free = setup();
    free.resize.setTarget(null);
    expect(free.resize.separator.handleKeyDown(key('ArrowRight'))).toBe(false);
    expect(free.resize.attributes()).toBeNull();
    expect(host.commit).not.toHaveBeenCalled();
  });

  it('freezes the maximum while the separator holds focus', () => {
    const { resize } = setup();
    resize.focusChanged(true);
    resize.setTarget({ table: 't1', column: 1, widths: [120, 100, 80], visible: 900 });
    expect(resize.attributes()?.['aria-valuemax']).toBe(300);
    resize.focusChanged(false);
    resize.setTarget({ table: 't1', column: 1, widths: [120, 100, 80], visible: 900 });
    expect(resize.attributes()?.['aria-valuemax']).toBe(900);
  });
});
