import { describe, expect, it, vi } from 'vitest';
import { PointerDrag, type PointerDragHandlers, type PointerDragPoint } from './pointer-drag.js';

class FakeWindow extends EventTarget {
  readonly #frames = new Map<number, FrameRequestCallback>();
  #next = 0;
  get frames(): FrameRequestCallback[] {
    return [...this.#frames.values()];
  }
  requestAnimationFrame = (callback: FrameRequestCallback): number => {
    const id = ++this.#next;
    this.#frames.set(id, callback);
    return id;
  };
  cancelAnimationFrame = (id: number): void => {
    this.#frames.delete(id);
  };
  flush(): void {
    const pending = [...this.#frames.values()];
    this.#frames.clear();
    for (const frame of pending) frame(0);
  }
}

class FakeElement extends EventTarget {
  rect = { left: 10, top: 20, width: 200, height: 100 };
  captured: number[] = [];
  released: number[] = [];
  focused = 0;
  getBoundingClientRect() {
    return this.rect;
  }
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
    pointerId: 1,
    clientX: 10,
    clientY: 20,
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...init,
  });
  return event as unknown as PointerEvent;
}

function setup(
  overrides: Partial<PointerDragHandlers> = {},
  options: { disabled?: () => boolean } = {},
) {
  const owner = new FakeWindow();
  const element = new FakeElement();
  const calls: string[] = [];
  const points: PointerDragPoint[] = [];
  const handlers: PointerDragHandlers = {
    begin: vi.fn((point) => {
      calls.push('begin');
      points.push(point);
      return undefined;
    }),
    move: vi.fn((point) => {
      calls.push('move');
      points.push(point);
    }),
    end: vi.fn((point, _event, dragged) => {
      calls.push(dragged ? 'end:drag' : 'end:press');
      points.push(point);
    }),
    cancel: vi.fn((reason) => {
      calls.push(`cancel:${reason}`);
    }),
    ...overrides,
  };
  const drag = new PointerDrag({
    element: element as unknown as HTMLElement,
    owner: owner as unknown as Window,
    handlers,
    focusTarget: () => element as unknown as HTMLElement,
    ...options,
  });
  drag.connect();
  return { owner, element, drag, calls, points, handlers };
}

describe('PointerDrag', () => {
  it('captures on press, coalesces moves per frame and ends once on release', () => {
    const { owner, element, drag, calls, points } = setup();
    const down = pointer('pointerdown', { clientX: 60, clientY: 70 });
    element.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(true);
    expect(element.captured).toEqual([1]);
    expect(element.focused).toBe(1);
    expect(drag.active).toBe(true);
    expect(points[0]).toMatchObject({ x: 50, y: 50, width: 200, height: 100 });

    element.dispatchEvent(pointer('pointermove', { clientX: 61, clientY: 70 }));
    expect(drag.dragging).toBe(false);
    element.dispatchEvent(pointer('pointermove', { clientX: 90, clientY: 80, shiftKey: true }));
    element.dispatchEvent(pointer('pointermove', { clientX: 120, clientY: 90 }));
    expect(calls).toEqual(['begin']);
    expect(drag.dragging).toBe(true);
    owner.flush();
    expect(calls).toEqual(['begin', 'move']);
    expect(points[1]).toMatchObject({ x: 110, y: 70, modifiers: { shift: false } });

    element.dispatchEvent(pointer('pointerup', { clientX: 130, clientY: 95 }));
    expect(calls).toEqual(['begin', 'move', 'end:drag']);
    expect(points[2]).toMatchObject({ x: 120, y: 75 });
    expect(element.released).toEqual([1]);
    expect(drag.active).toBe(false);
    // A late lost-capture notification after the release is not a cancellation.
    element.dispatchEvent(pointer('lostpointercapture'));
    expect(calls).toEqual(['begin', 'move', 'end:drag']);
  });

  it('reports a press without movement as a non-drag end', () => {
    const { element, calls } = setup();
    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointerup'));
    expect(calls).toEqual(['begin', 'end:press']);
  });

  it('cancels on Escape, pointercancel, lost capture and disposal', () => {
    const { owner, element, drag, calls } = setup();
    element.dispatchEvent(pointer('pointerdown'));
    const escape = new Event('keydown', { cancelable: true });
    Object.assign(escape, { key: 'Escape' });
    owner.dispatchEvent(escape);
    expect(escape.defaultPrevented).toBe(true);
    expect(calls).toEqual(['begin', 'cancel:escape']);
    expect(drag.active).toBe(false);
    expect(element.released).toEqual([1]);

    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointercancel'));
    expect(calls.at(-1)).toBe('cancel:pointer');

    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('lostpointercapture'));
    expect(calls.at(-1)).toBe('cancel:pointer');

    element.dispatchEvent(pointer('pointerdown'));
    drag.disconnect();
    expect(calls.at(-1)).toBe('cancel:disposed');
    element.dispatchEvent(pointer('pointerdown'));
    expect(calls.filter((call) => call === 'begin')).toHaveLength(4);
  });

  it('drops a pending frame when the gesture ends or is cancelled', () => {
    const { owner, element, calls } = setup();
    element.dispatchEvent(pointer('pointerdown'));
    element.dispatchEvent(pointer('pointermove', { clientX: 90 }));
    element.dispatchEvent(pointer('pointercancel'));
    owner.flush();
    expect(calls).toEqual(['begin', 'cancel:pointer']);
  });

  it('ignores secondary buttons, disabled surfaces, other pointers and declined presses', () => {
    const { element, calls, handlers } = setup({ begin: vi.fn(() => false) });
    element.dispatchEvent(pointer('pointerdown'));
    expect(handlers.begin).toHaveBeenCalledTimes(1);
    expect(element.captured).toEqual([]);
    expect(calls).toEqual([]);

    const disabled = setup({}, { disabled: () => true });
    disabled.element.dispatchEvent(pointer('pointerdown', { button: 2 }));
    disabled.element.dispatchEvent(pointer('pointerdown'));
    expect(disabled.calls).toEqual([]);

    const other = setup();
    other.element.dispatchEvent(pointer('pointerdown', { pointerId: 7 }));
    other.element.dispatchEvent(pointer('pointermove', { pointerId: 8, clientX: 90 }));
    other.element.dispatchEvent(pointer('pointerup', { pointerId: 8 }));
    expect(other.drag.active).toBe(true);
    other.element.dispatchEvent(pointer('pointerup', { pointerId: 7 }));
    expect(other.calls).toEqual(['begin', 'end:press']);
  });
});
