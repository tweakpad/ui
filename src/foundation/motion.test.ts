import { describe, expect, it, vi } from 'vitest';
import {
  cancelMotions,
  prepareMotion,
  resolvesReducedMotion,
  type TpMotionRequestEvent,
} from './motion.js';

function element(policy: string | null, parent: Node | null = null): Element {
  return {
    nodeType: 1,
    parentNode: parent,
    getAttribute: () => policy,
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } },
  } as unknown as Element;
}

describe('motion policy environment', () => {
  it('uses current properties before reflected attributes, including returning to inheritance', () => {
    const target = element('reduce', element('normal'));
    Object.assign(target, { motionPolicy: 'normal' });
    expect(resolvesReducedMotion(target)).toBe(false);
    Object.assign(target, { motionPolicy: 'reduce' });
    expect(resolvesReducedMotion(target)).toBe(true);
    Object.assign(target, { motionPolicy: 'auto' });
    expect(resolvesReducedMotion(target)).toBe(false);
  });
  it('uses the involved owner window for the OS preference', () => {
    const target = element(null);
    const match = vi.fn(() => ({ matches: true }));
    Object.assign(target.ownerDocument.defaultView!, { matchMedia: match });
    expect(resolvesReducedMotion(target)).toBe(true);
    expect(match).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
  });

  it('respects an explicit policy across a foreign shadow boundary', () => {
    const host = element('normal');
    const shadow = { nodeType: 11, host } as unknown as ShadowRoot;
    expect(resolvesReducedMotion(element(null, shadow))).toBe(false);
  });

  it('follows rendered slot ancestry before the light DOM parent', () => {
    const target = element(null, element('normal'));
    Object.assign(target, { assignedSlot: element('reduce') });
    expect(resolvesReducedMotion(target)).toBe(true);
  });
});

describe('motion replacement ownership', () => {
  it('cancels every successive reversal and releases the final playback', async () => {
    const attributes = new Map<string, string>();
    const owner = Object.assign(new EventTarget(), {
      nodeType: 1,
      parentNode: null,
      isConnected: true,
      ownerDocument: { defaultView: { AbortController, setTimeout, clearTimeout } },
      getAttribute: () => 'normal',
      setAttribute: (name: string, value: string) => attributes.set(name, value),
      removeAttribute: (name: string) => attributes.delete(name),
      getRootNode: () => owner,
    }) as unknown as HTMLElement;
    const cancellations: ReturnType<typeof vi.fn>[] = [];
    owner.addEventListener('tp-motion-request', (event) => {
      (event as TpMotionRequestEvent).respondWith({
        play: () => {
          let resolve!: () => void;
          const finished = new Promise<void>((done) => {
            resolve = done;
          });
          const cancel = vi.fn(resolve);
          cancellations.push(cancel);
          return { finished, cancel };
        },
      });
    });
    const role = {
      name: 'content',
      kind: 'presence',
      phases: ['enter', 'exit'],
      completion: 'blocking',
    } as const;
    const handles = ['enter', 'exit', 'enter'].map((phase) => {
      const handle = prepareMotion(owner, owner, role, { phase: phase as 'enter' | 'exit' });
      handle.start();
      return handle;
    });
    expect(cancellations.map((cancel) => cancel.mock.calls.length)).toEqual([1, 1, 0]);
    cancelMotions(owner);
    cancelMotions(owner);
    await Promise.all(handles.map((handle) => handle.finished));
    expect(cancellations.map((cancel) => cancel.mock.calls.length)).toEqual([1, 1, 1]);
    expect(attributes.has('data-tp-motion-driven')).toBe(false);
  });
});
