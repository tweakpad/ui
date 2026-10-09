/**
 * Shared fakes for the foundation unit tests (node environment): a manual frame source, a
 * reactive-controller host, an IntersectionObserver and a keyboard event. A `*.test.ts` module
 * stays out of the build; the suite at the end keeps the file from counting as an empty one.
 */
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { describe, expect, it, vi } from 'vitest';
import type { TweenFrameSource } from './map/camera.js';

/** Animation frames that run only when a test ticks them, with a clock they advance. */
export class ManualFrames implements TweenFrameSource {
  time = 0;
  #next = 1;
  readonly #callbacks = new Map<number, (time: number) => void>();
  requestAnimationFrame(callback: (time: number) => void): number {
    const handle = this.#next++;
    this.#callbacks.set(handle, callback);
    return handle;
  }
  cancelAnimationFrame(handle: number): void {
    this.#callbacks.delete(handle);
  }
  now(): number {
    return this.time;
  }
  get pending(): number {
    return this.#callbacks.size;
  }
  /** Runs one frame `ms` later. */
  tick(ms = 16): void {
    this.time += ms;
    const callbacks = [...this.#callbacks.values()];
    this.#callbacks.clear();
    for (const callback of callbacks) callback(this.time);
  }
  run(frames: number, ms = 16): void {
    for (let index = 0; index < frames; index++) this.tick(ms);
  }
}

/** A reactive-controller host that records its controllers and update requests. */
export class FakeHost extends EventTarget implements ReactiveControllerHost {
  readonly controllers: ReactiveController[] = [];
  updateComplete = Promise.resolve(true);
  requestUpdate: () => void = vi.fn();
  addController = vi.fn((controller: ReactiveController) => {
    this.controllers.push(controller);
  });
  removeController = vi.fn((controller: ReactiveController) => {
    const index = this.controllers.indexOf(controller);
    if (index >= 0) this.controllers.splice(index, 1);
  });
}

/** A fresh host, optionally extended with the element-like members a controller reads. */
export function fakeHost<Extra extends object = Record<never, never>>(
  extra?: Extra,
): FakeHost & Extra {
  return Object.assign(new FakeHost(), extra) as FakeHost & Extra;
}

export interface FakeIntersectionEntry {
  target: object;
  isIntersecting: boolean;
  intersectionRatio: number;
}

/** An IntersectionObserver that reports only when a test asks it to. */
export class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  readonly targets = new Set<object>();
  disconnected = false;
  constructor(
    readonly callback: (entries: FakeIntersectionEntry[]) => void,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeIntersectionObserver.instances.push(this);
  }
  observe(target: object): void {
    this.targets.add(target);
  }
  unobserve(target: object): void {
    this.targets.delete(target);
  }
  disconnect(): void {
    this.disconnected = true;
    this.targets.clear();
  }
  /** Reports one observation of `target` from this observer. */
  report(target: object, isIntersecting: boolean, intersectionRatio = isIntersecting ? 1 : 0) {
    this.callback([{ target, isIntersecting, intersectionRatio }]);
  }
  /** Reports `target` from every observer watching it with `rootMargin`. */
  static report(target: object, isIntersecting: boolean, rootMargin = '0px'): void {
    for (const observer of FakeIntersectionObserver.instances)
      if (observer.options.rootMargin === rootMargin && observer.targets.has(target))
        observer.report(target, isIntersecting);
  }
}

export interface KeyEventInit {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
}

/**
 * A cancelable `keydown` with every modifier flag defined (false unless given) and `path` as its
 * composed path, so owners that walk the path see exactly the supplied targets.
 */
export function keyEvent(
  key: string | KeyEventInit,
  init: Partial<KeyEventInit> & { path?: EventTarget[] } = {},
): KeyboardEvent {
  const { path = [], ...flags } = init;
  const event = Object.assign(new Event('keydown', { cancelable: true }), {
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    ...(typeof key === 'string' ? { key } : key),
    ...flags,
  });
  Object.defineProperty(event, 'composedPath', { value: () => path });
  return event as unknown as KeyboardEvent;
}

describe('foundation test fakes', () => {
  it('runs manual frames in order and reports pending callbacks', () => {
    const frames = new ManualFrames();
    const seen: number[] = [];
    frames.requestAnimationFrame((time) => seen.push(time));
    const cancelled = frames.requestAnimationFrame(() => seen.push(-1));
    frames.cancelAnimationFrame(cancelled);
    expect(frames.pending).toBe(1);
    frames.tick(10);
    expect([seen, frames.now(), frames.pending]).toEqual([[10], 10, 0]);
  });

  it('builds keyboard events with explicit flags and a composed path', () => {
    const host = new EventTarget();
    const event = keyEvent({ key: 'k', ctrlKey: true }, { path: [host] });
    expect([event.type, event.key, event.ctrlKey, event.shiftKey, event.cancelable]).toEqual([
      'keydown',
      'k',
      true,
      false,
      true,
    ]);
    expect(event.composedPath()).toEqual([host]);
    expect(keyEvent('Enter', { repeat: true }).repeat).toBe(true);
  });

  it('tracks controllers on the fake host', () => {
    const host = fakeHost({ isConnected: true });
    const controller: ReactiveController = {};
    host.addController(controller);
    expect(host.controllers).toEqual([controller]);
    host.removeController(controller);
    expect([host.controllers, host.isConnected]).toEqual([[], true]);
  });
});
