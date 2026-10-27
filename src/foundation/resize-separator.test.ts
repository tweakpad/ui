import { describe, expect, it, vi } from 'vitest';

const styles = vi.hoisted(() => ({
  created: [] as { text: string; disposed: boolean }[],
}));

vi.mock('./generated-style.js', () => ({
  GeneratedStyleResource: class {
    record = { text: '', disposed: false };
    constructor() {
      styles.created.push(this.record);
    }
    setText(text: string) {
      this.record.text = text;
    }
    dispose() {
      this.record.disposed = true;
    }
  },
}));

const cursors = vi.hoisted(() => ({
  leases: [] as { cursor: string; released: boolean }[],
}));

// The document cursor of a drag: one lease of the shared drag cursor's layer per drag.
vi.mock('./drag-cursor.js', () => ({
  leaseDragCursor: (_document: Document, cursor: string) => {
    const lease = { cursor, released: false };
    cursors.leases.push(lease);
    return () => {
      lease.released = true;
    };
  },
}));

import {
  ResizeSeparatorController,
  resizeSeparatorKey,
  resizeSeparatorTargetCss,
  type ResizeSeparatorOptions,
  type ResizeSeparatorProposal,
} from './resize-separator.js';

class FakeWindow extends EventTarget {}

class FakeElement extends EventTarget {
  captured: number[] = [];
  released: number[] = [];
  focused = 0;
  setPointerCapture(id: number) {
    this.captured.push(id);
  }
  hasPointerCapture(id: number) {
    return this.captured.includes(id) && !this.released.includes(id);
  }
  releasePointerCapture(id: number) {
    this.released.push(id);
  }
  focus() {
    this.focused++;
  }
}

function pointer(type: string, init: Record<string, unknown> = {}): PointerEvent {
  const event = new Event(type, { cancelable: true });
  Object.assign(event, {
    button: 0,
    buttons: 1,
    isPrimary: true,
    pointerId: 1,
    clientX: 100,
    clientY: 50,
    ...init,
  });
  return event as unknown as PointerEvent;
}

function key(name: string, init: Partial<KeyboardEvent> = {}): KeyboardEvent {
  const event = new Event('keydown', { cancelable: true });
  Object.assign(event, {
    key: name,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    isComposing: false,
    ...init,
  });
  return event as unknown as KeyboardEvent;
}

function setup(options: Partial<ResizeSeparatorOptions> = {}) {
  const view = new FakeWindow();
  const host = { ownerDocument: { defaultView: view } } as unknown as HTMLElement;
  const element = new FakeElement();
  const proposals: ResizeSeparatorProposal[] = [];
  let value = 100;
  const controller = new ResizeSeparatorController({
    host,
    axis: () => 'horizontal',
    direction: () => 'ltr',
    value: () => value,
    min: () => 48,
    max: () => 400,
    steps: () => ({ step: 8, shift: 32, alt: 1 }),
    propose: (proposal) => {
      proposals.push(proposal);
      if (proposal.phase !== 'cancelled') value = proposal.value;
    },
    ...options,
  });
  return {
    view,
    element,
    controller,
    proposals,
    get value() {
      return value;
    },
    set value(next: number) {
      value = next;
    },
  };
}

describe('resizeSeparatorKey', () => {
  const steps = { step: 8, shift: 32, alt: 1 };

  it('grows toward the end of the axis and mirrors the inline axis in right-to-left content', () => {
    const ltr = { axis: 'horizontal', direction: 'ltr', steps } as const;
    const rtl = { axis: 'horizontal', direction: 'rtl', steps } as const;
    expect(resizeSeparatorKey(key('ArrowRight'), ltr)).toEqual({ kind: 'delta', amount: 8 });
    expect(resizeSeparatorKey(key('ArrowLeft'), ltr)).toEqual({ kind: 'delta', amount: -8 });
    expect(resizeSeparatorKey(key('ArrowLeft'), rtl)).toEqual({ kind: 'delta', amount: 8 });
    expect(resizeSeparatorKey(key('ArrowUp'), ltr)).toBeNull();
    const vertical = { axis: 'vertical', direction: 'rtl', steps } as const;
    expect(resizeSeparatorKey(key('ArrowDown'), vertical)).toEqual({ kind: 'delta', amount: 8 });
    expect(resizeSeparatorKey(key('ArrowRight'), vertical)).toBeNull();
  });

  it('uses the Shift and Alt steps, and Home and End jump to the limits', () => {
    const options = { axis: 'horizontal', direction: 'ltr', steps } as const;
    expect(resizeSeparatorKey(key('ArrowRight', { shiftKey: true }), options)).toEqual({
      kind: 'delta',
      amount: 32,
    });
    expect(resizeSeparatorKey(key('ArrowLeft', { altKey: true }), options)).toEqual({
      kind: 'delta',
      amount: -1,
    });
    expect(resizeSeparatorKey(key('Home'), options)).toEqual({ kind: 'min' });
    expect(resizeSeparatorKey(key('End'), options)).toEqual({ kind: 'max' });
  });

  it('leaves Control, Meta, composition and Alt without an Alt step to the page', () => {
    const options = { axis: 'horizontal', direction: 'ltr', steps: { step: 2 } } as const;
    expect(resizeSeparatorKey(key('ArrowRight', { ctrlKey: true }), options)).toBeNull();
    expect(resizeSeparatorKey(key('ArrowRight', { metaKey: true }), options)).toBeNull();
    expect(resizeSeparatorKey(key('ArrowRight', { isComposing: true }), options)).toBeNull();
    expect(resizeSeparatorKey(key('ArrowRight', { altKey: true }), options)).toBeNull();
    expect(resizeSeparatorKey(key('ArrowRight', { shiftKey: true }), options)).toEqual({
      kind: 'delta',
      amount: 2,
    });
  });
});

describe('ResizeSeparatorController', () => {
  it('exposes the separator role, its orientation and its clamped values', () => {
    const { controller } = setup();
    expect(controller.attributes()).toEqual({
      role: 'separator',
      'aria-orientation': 'vertical',
      'aria-valuenow': 100,
      'aria-valuemin': 48,
      'aria-valuemax': 400,
    });
    const vertical = setup({ axis: () => 'vertical', value: () => 900 });
    expect(vertical.controller.attributes()['aria-orientation']).toBe('horizontal');
    expect(vertical.controller.attributes()['aria-valuenow']).toBe(400);
  });

  it('proposes one settled keyboard value per handled key and clamps it', () => {
    const state = setup();
    const right = key('ArrowRight', { shiftKey: true });
    expect(state.controller.handleKeyDown(right)).toBe(true);
    expect(right.defaultPrevented).toBe(true);
    expect(state.proposals.at(-1)).toMatchObject({
      value: 132,
      source: 'keyboard',
      phase: 'settled',
    });
    state.controller.handleKeyDown(key('Home'));
    expect(state.value).toBe(48);
    state.controller.handleKeyDown(key('ArrowLeft'));
    expect(state.value).toBe(48);
    state.controller.handleKeyDown(key('End'));
    expect(state.value).toBe(400);
    const other = key('Enter');
    expect(state.controller.handleKeyDown(other)).toBe(false);
    expect(other.defaultPrevented).toBe(false);
  });

  it('changes nothing while disabled', () => {
    const state = setup({ disabled: () => true });
    expect(state.controller.handleKeyDown(key('ArrowRight'))).toBe(false);
    expect(
      state.controller.pointerDown(pointer('pointerdown'), state.element as unknown as HTMLElement),
    ).toBe(false);
    expect(state.proposals).toEqual([]);
  });

  it('drags with capture, cursor and selection block, and settles on release', () => {
    const state = setup();
    const element = state.element as unknown as HTMLElement;
    styles.created.length = 0;
    cursors.leases.length = 0;
    const down = pointer('pointerdown');
    expect(state.controller.pointerDown(down, element)).toBe(true);
    expect(down.defaultPrevented).toBe(true);
    expect(state.element.focused).toBe(1);
    expect(state.element.captured).toEqual([1]);
    expect(styles.created[0]?.text).toBe('*{user-select:none!important;}');
    expect(cursors.leases).toEqual([{ cursor: 'col-resize', released: false }]);
    state.controller.pointerMove(pointer('pointermove', { clientX: 130 }));
    expect(state.proposals.at(-1)).toMatchObject({ value: 130, delta: 30, phase: 'live' });
    state.controller.pointerMove(pointer('pointermove', { clientX: 1000 }));
    expect(state.proposals.at(-1)).toMatchObject({ value: 400, phase: 'live' });
    state.controller.pointerMove(pointer('pointermove', { clientX: 150 }));
    state.controller.pointerUp(pointer('pointerup', { clientX: 150 }));
    expect(state.proposals.at(-1)).toMatchObject({
      value: 150,
      source: 'pointer',
      phase: 'settled',
    });
    expect(state.element.released).toEqual([1]);
    expect(styles.created[0]?.disposed).toBe(true);
    expect(cursors.leases[0]?.released).toBe(true);
    expect(state.controller.dragging).toBe(false);
  });

  it('V-587: a mouse drag blocks selection through selectstart and shows its cursor through the drag cursor, with no rule', () => {
    const state = setup();
    const element = state.element as unknown as HTMLElement;
    styles.created.length = 0;
    cursors.leases.length = 0;
    const view = state.view;
    const selectStart = () => {
      const event = new Event('selectstart', { cancelable: true });
      view.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(
      state.controller.pointerDown(pointer('pointerdown', { pointerType: 'mouse' }), element),
    ).toBe(true);
    // No rule restyles the document: the cursor is the drag cursor's, selection is held back by
    // `selectstart`.
    expect(styles.created).toEqual([]);
    expect(cursors.leases).toEqual([{ cursor: 'col-resize', released: false }]);
    expect(selectStart()).toBe(true);
    state.controller.pointerUp(pointer('pointerup', { pointerType: 'mouse' }));
    expect(cursors.leases[0]?.released).toBe(true);
    expect(selectStart()).toBe(false);
    // Touch keeps the rule against the long-press selection, and has no cursor to show.
    state.controller.pointerDown(pointer('pointerdown', { pointerType: 'touch' }), element);
    expect(styles.created[0]?.text).toBe('*{user-select:none!important;}');
    expect(cursors.leases).toHaveLength(1);
    expect(selectStart()).toBe(false);
    state.controller.cancel();
    expect(styles.created[0]?.disposed).toBe(true);
  });

  it('V-587: with a frame source the drag style follows in the next frame, and none after an early end', () => {
    vi.useFakeTimers();
    try {
      const state = setup();
      Object.assign(state.view, {
        requestAnimationFrame: (callback: FrameRequestCallback) =>
          setTimeout(() => callback(0), 16) as unknown as number,
        cancelAnimationFrame: (id: number) => clearTimeout(id),
      });
      const element = state.element as unknown as HTMLElement;
      styles.created.length = 0;
      cursors.leases.length = 0;
      state.controller.pointerDown(pointer('pointerdown', { pointerType: 'mouse' }), element);
      expect(cursors.leases).toEqual([]);
      vi.advanceTimersByTime(20);
      expect(cursors.leases).toEqual([{ cursor: 'col-resize', released: false }]);
      state.controller.pointerUp(pointer('pointerup'));
      expect(cursors.leases[0]?.released).toBe(true);
      state.controller.pointerDown(pointer('pointerdown', { pointerType: 'pen' }), element);
      expect(styles.created[0]).toEqual({ text: '', disposed: false });
      state.controller.cancel();
      vi.advanceTimersByTime(40);
      expect(styles.created[0]).toEqual({ text: '', disposed: true });
      expect(cursors.leases).toHaveLength(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('mirrors pointer movement in right-to-left content and divides by the scale', () => {
    const state = setup({ direction: () => 'rtl', scale: () => 2 });
    state.controller.pointerDown(pointer('pointerdown'), state.element as unknown as HTMLElement);
    state.controller.pointerMove(pointer('pointermove', { clientX: 60 }));
    expect(state.proposals.at(-1)).toMatchObject({ delta: 20, value: 120 });
  });

  it('restores the start value on Escape and pointer cancellation', () => {
    const state = setup();
    const element = state.element as unknown as HTMLElement;
    state.controller.pointerDown(pointer('pointerdown'), element);
    state.controller.pointerMove(pointer('pointermove', { clientX: 140 }));
    const escape = key('Escape');
    state.view.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(state.proposals.at(-1)).toMatchObject({ value: 100, phase: 'cancelled' });
    expect(state.controller.dragging).toBe(false);
    state.value = 100;
    state.controller.pointerDown(pointer('pointerdown', { pointerId: 2 }), element);
    state.controller.pointerMove(pointer('pointermove', { pointerId: 2, clientX: 140 }));
    state.controller.pointerCancel(pointer('pointercancel', { pointerId: 2 }));
    expect(state.proposals.at(-1)).toMatchObject({ value: 100, phase: 'cancelled' });
    // The Escape listener is gone with the drag.
    const later = key('Escape');
    state.view.dispatchEvent(later);
    expect(later.defaultPrevented).toBe(false);
  });

  it('keeps Escape for the page when the owner opts out of cancelling', () => {
    const state = setup({ escapeCancels: false });
    state.controller.pointerDown(pointer('pointerdown'), state.element as unknown as HTMLElement);
    const escape = key('Escape');
    state.view.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(false);
    expect(state.controller.dragging).toBe(true);
  });

  it('settles a buttonless move and ignores other pointers and buttons', () => {
    const state = setup();
    const element = state.element as unknown as HTMLElement;
    expect(state.controller.pointerDown(pointer('pointerdown', { button: 2 }), element)).toBe(
      false,
    );
    expect(
      state.controller.pointerDown(pointer('pointerdown', { isPrimary: false }), element),
    ).toBe(false);
    state.controller.pointerDown(pointer('pointerdown'), element);
    state.controller.pointerMove(pointer('pointermove', { pointerId: 9, clientX: 300 }));
    expect(state.proposals).toEqual([]);
    state.controller.pointerMove(pointer('pointermove', { clientX: 120, buttons: 0 }));
    expect(state.proposals.at(-1)).toMatchObject({ phase: 'settled', value: 100 });
  });

  it('wires its own listeners through connect and releases everything on dispose', () => {
    const state = setup();
    const element = state.element as unknown as HTMLElement;
    styles.created.length = 0;
    state.controller.connect(element);
    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointermove', { clientX: 120 }));
    expect(state.proposals.at(-1)).toMatchObject({ value: 120, phase: 'live' });
    state.controller.dispose();
    expect(state.proposals.at(-1)).toMatchObject({ value: 100, phase: 'cancelled' });
    expect(styles.created[0]?.disposed).toBe(true);
    element.dispatchEvent(key('ArrowRight'));
    expect(state.proposals.at(-1)?.phase).toBe('cancelled');
  });

  it('omits the cursor when the owner turns it off', () => {
    const state = setup({ cursor: () => false, axis: () => 'vertical' });
    styles.created.length = 0;
    cursors.leases.length = 0;
    state.controller.pointerDown(pointer('pointerdown'), state.element as unknown as HTMLElement);
    expect(styles.created[0]?.text).not.toContain('cursor');
    expect(cursors.leases).toEqual([]);
  });
});

describe('resizeSeparatorTargetCss', () => {
  it('reads the group extents with the default fallbacks on both axes', () => {
    const horizontal = resizeSeparatorTargetCss('.line', 'horizontal');
    expect(horizontal).toContain('.line::before');
    expect(horizontal).toContain('inline-size: var(--tp-resize-target-fine, 10px)');
    expect(horizontal).toContain('inline-size: var(--tp-resize-target-coarse, 20px)');
    const vertical = resizeSeparatorTargetCss('.line', 'vertical');
    expect(vertical).toContain('block-size: var(--tp-resize-target-fine, 10px)');
  });
});
