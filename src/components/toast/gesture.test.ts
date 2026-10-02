import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToastGesture, type ToastGestureOutput } from './gesture.js';

class GestureElement {
  style = { userSelect: 'text' };
  offsetWidth = 200;
  offsetHeight = 100;
  capture = new Set<number>();
  selected = '';
  ownerDocument = { getSelection: () => ({ toString: () => this.selected }) };
  constructor(readonly interactive = false) {}
  matches() {
    return this.interactive;
  }
  setPointerCapture(id: number) {
    this.capture.add(id);
  }
  hasPointerCapture(id: number) {
    return this.capture.has(id);
  }
  releasePointerCapture(id: number) {
    this.capture.delete(id);
  }
}
function pointer(type: string, x: number, y: number, time: number, path: unknown[]) {
  return {
    type,
    pointerId: 1,
    button: 0,
    clientX: x,
    clientY: y,
    timeStamp: time,
    defaultPrevented: false,
    preventDefault: vi.fn(),
    composedPath: () => path,
  } as unknown as PointerEvent;
}
function setup() {
  vi.stubGlobal('Element', GestureElement);
  const element = new GestureElement();
  const outputs: ToastGestureOutput[] = [];
  const close = vi.fn();
  const gesture = new ToastGesture((output) => outputs.push(output), close);
  const start = (path: unknown[] = [element]) =>
    gesture.start(pointer('pointerdown', 0, 0, 0, path), element as unknown as HTMLElement, [
      'right',
      'down',
    ]);
  return { element, outputs, close, gesture, start };
}
afterEach(() => vi.unstubAllGlobals());
describe('Toast swipe policy and owned capture cleanup', () => {
  it('dismisses a permitted distance swipe and retains release geometry until rest', () => {
    const { element, outputs, close, gesture, start } = setup();
    start();
    gesture.move(pointer('pointermove', 70, 3, 300, [element]));
    gesture.end(pointer('pointerup', 70, 3, 320, [element]));
    expect(close).toHaveBeenCalledOnce();
    expect(outputs.at(-1)).toMatchObject({ x: 70, y: 0, direction: 'right', swiping: false });
    expect(element.capture.size).toBe(0);
    expect(element.style.userSelect).toBe('text');
    gesture.reset();
    expect(outputs.at(-1)).toMatchObject({ x: 0, y: 0, progress: 0, strength: 0 });
  });
  it('cancels rather than closes and restores authored selection/capture', () => {
    const { element, outputs, close, gesture, start } = setup();
    start();
    gesture.move(pointer('pointermove', 90, 2, 100, [element]));
    expect(element.style.userSelect).toBe('none');
    gesture.end(pointer('pointercancel', 90, 2, 110, [element]));
    expect(close).not.toHaveBeenCalled();
    expect(outputs.at(-1)).toMatchObject({ x: 0, y: 0, swiping: false });
    expect(element.style.userSelect).toBe('text');
    expect(element.capture.size).toBe(0);
  });
  it('does not initiate from interactive descendants or an existing text selection', () => {
    const { element, close, gesture, start } = setup();
    start([new GestureElement(true), element]);
    gesture.move(pointer('pointermove', 80, 0, 100, [element]));
    gesture.end(pointer('pointerup', 80, 0, 110, [element]));
    element.selected = 'selected content';
    start();
    expect(element.capture.size).toBe(0);
    expect(close).not.toHaveBeenCalled();
  });
  it('rejects disallowed directions and ambiguous diagonal movement', () => {
    const { element, close, gesture, start } = setup();
    start();
    gesture.move(pointer('pointermove', -80, 0, 100, [element]));
    gesture.end(pointer('pointerup', -80, 0, 110, [element]));
    start();
    gesture.move(pointer('pointermove', 50, 50, 200, [element]));
    gesture.end(pointer('pointerup', 50, 50, 210, [element]));
    expect(close).not.toHaveBeenCalled();
    expect(element.capture.size).toBe(0);
  });
  it('returns a reversed swipe to rest and releases lost capture', () => {
    const { element, outputs, close, gesture, start } = setup();
    start();
    gesture.move(pointer('pointermove', 70, 0, 100, [element]));
    gesture.move(pointer('pointermove', 55, 0, 120, [element]));
    gesture.end(pointer('pointerup', 55, 0, 130, [element]));
    expect(close).not.toHaveBeenCalled();
    start();
    gesture.move(pointer('pointermove', 25, 0, 200, [element]));
    gesture.lostCapture(pointer('lostpointercapture', 25, 0, 210, [element]));
    expect(outputs.at(-1)).toMatchObject({ swiping: false, x: 0 });
    expect(element.style.userSelect).toBe('text');
    expect(element.capture.size).toBe(0);
  });
  it('accepts a short decisive velocity release but rejects a short slow drag', () => {
    const { element, close, gesture, start } = setup();
    start();
    gesture.move(pointer('pointermove', 20, 0, 400, [element]));
    gesture.end(pointer('pointerup', 20, 0, 410, [element]));
    expect(close).not.toHaveBeenCalled();
    start();
    gesture.move(pointer('pointermove', 20, 0, 10, [element]));
    gesture.end(pointer('pointerup', 20, 0, 11, [element]));
    expect(close).toHaveBeenCalledOnce();
  });
});
