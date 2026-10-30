import { describe, expect, it, vi } from 'vitest';
import { ManualFrames } from './fakes.test.js';
import { observePointerPosition } from './pointer-position.js';

function fakeDocument() {
  const frames = new ManualFrames();
  const view = {
    requestAnimationFrame: (callback: (time: number) => void) =>
      frames.requestAnimationFrame(callback),
    cancelAnimationFrame: (handle: number) => frames.cancelAnimationFrame(handle),
    performance: { now: () => frames.now() },
  };
  const document = Object.assign(new EventTarget(), { defaultView: view });
  const added = vi.spyOn(document, 'addEventListener');
  const removed = vi.spyOn(document, 'removeEventListener');
  const pointer = (type: string, init: Record<string, unknown>) =>
    document.dispatchEvent(Object.assign(new Event(type), { relatedTarget: null, ...init }));
  return { document: document as unknown as Document, frames, added, removed, pointer };
}

describe('observePointerPosition', () => {
  it('delivers the latest point once per frame to every subscriber', () => {
    const { document, frames, pointer } = fakeDocument();
    const first = vi.fn();
    const second = vi.fn();
    observePointerPosition(document, first);
    observePointerPosition(document, second);
    pointer('pointermove', { clientX: 1, clientY: 2, pointerType: 'mouse' });
    pointer('pointermove', { clientX: 5, clientY: 6, pointerType: 'mouse' });
    expect(first).not.toHaveBeenCalled();
    frames.tick();
    expect(first).toHaveBeenCalledTimes(1);
    expect(first).toHaveBeenCalledWith({ x: 5, y: 6, pointerType: 'mouse' });
    expect(second).toHaveBeenCalledWith({ x: 5, y: 6, pointerType: 'mouse' });
    frames.tick();
    expect(first).toHaveBeenCalledTimes(1);
  });

  it('reports leaving the document and lifted touches as null', () => {
    const { document, frames, pointer } = fakeDocument();
    const callback = vi.fn();
    observePointerPosition(document, callback);
    pointer('pointermove', { clientX: 1, clientY: 1, pointerType: 'mouse' });
    frames.tick();
    pointer('pointerout', { relatedTarget: {} });
    frames.tick();
    expect(callback).toHaveBeenCalledTimes(1);
    pointer('pointerout', {});
    frames.tick();
    expect(callback).toHaveBeenLastCalledWith(null);
    pointer('pointerdown', { clientX: 3, clientY: 4, pointerType: 'touch' });
    frames.tick();
    expect(callback).toHaveBeenLastCalledWith({ x: 3, y: 4, pointerType: 'touch' });
    pointer('pointerup', { pointerType: 'touch' });
    frames.tick();
    expect(callback).toHaveBeenLastCalledWith(null);
  });

  it('notifies again after scrolling', () => {
    const { document, frames, pointer } = fakeDocument();
    const callback = vi.fn();
    observePointerPosition(document, callback);
    document.dispatchEvent(new Event('scroll'));
    frames.tick();
    expect(callback).toHaveBeenLastCalledWith(null);
    pointer('pointermove', { clientX: 1, clientY: 1, pointerType: 'pen' });
    frames.tick();
    document.dispatchEvent(new Event('scroll'));
    frames.tick();
    expect(callback).toHaveBeenCalledTimes(3);
    expect(callback).toHaveBeenLastCalledWith({ x: 1, y: 1, pointerType: 'pen' });
  });

  it('installs one set of listeners and removes it with the last subscriber', () => {
    const { document, frames, added, removed, pointer } = fakeDocument();
    const stopFirst = observePointerPosition(document, () => {});
    const stopSecond = observePointerPosition(document, () => {});
    const count = added.mock.calls.length;
    expect(count).toBeGreaterThan(0);
    stopFirst();
    expect(removed).not.toHaveBeenCalled();
    stopSecond();
    stopSecond();
    expect(removed).toHaveBeenCalledTimes(count);
    const late = vi.fn();
    pointer('pointermove', { clientX: 9, clientY: 9, pointerType: 'mouse' });
    observePointerPosition(document, late);
    expect(added.mock.calls.length).toBe(count * 2);
    frames.tick();
    expect(late).not.toHaveBeenCalled();
  });

  it('gives a new subscriber the last known point', () => {
    const { document, frames, pointer } = fakeDocument();
    observePointerPosition(document, () => {});
    pointer('pointermove', { clientX: 7, clientY: 8, pointerType: 'mouse' });
    frames.tick();
    const late = vi.fn();
    observePointerPosition(document, late);
    frames.tick();
    expect(late).toHaveBeenCalledWith({ x: 7, y: 8, pointerType: 'mouse' });
  });
});
