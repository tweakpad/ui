import { describe, expect, it, vi } from 'vitest';
import { MOTION_TOKENS, styledDocument } from './fakes.test.js';
import {
  cancelMotions,
  cssTimeMs,
  prepareMotion,
  resolveMotionTiming,
  resolvesReducedMotion,
  transitionTimings,
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

describe('motion timing roles (CL §5.3)', () => {
  const styled = (values: Record<string, string> = MOTION_TOKENS, policy: string | null = null) =>
    ({
      nodeType: 1,
      parentNode: null,
      getAttribute: () => policy,
      ownerDocument: styledDocument(values),
    }) as unknown as Element;

  it('parses CSS times, including the canonical form of registered durations', () => {
    expect([cssTimeMs('0.28s'), cssTimeMs(' 560ms '), cssTimeMs('.2s'), cssTimeMs('auto')]).toEqual(
      [280, 560, 200, 0],
    );
  });

  it('reads each transition of a timing probe, with commas inside easing functions', () => {
    const style = {
      transitionDuration: '1.2s, 0.28s',
      transitionDelay: '0s, 120ms',
      transitionTimingFunction: 'linear, cubic-bezier(0.2, 0, 0, 1)',
    } as CSSStyleDeclaration;
    expect(transitionTimings(style)).toEqual([
      { duration: 1200, delay: 0, easing: 'linear' },
      { duration: 280, delay: 120, easing: 'cubic-bezier(0.2, 0, 0, 1)' },
    ]);
  });

  it('resolves a duration role and an easing role from the computed style', () => {
    expect(resolveMotionTiming(styled())).toEqual({
      duration: 280,
      easing: 'cubic-bezier(0.2, 0, 0, 1)',
    });
    expect(resolveMotionTiming(styled(), 'fast', 'enter')).toEqual({
      duration: 200,
      easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
    });
    expect(resolveMotionTiming(styled(), 'slow', 'exit', 0.5).duration).toBe(280);
  });

  it('scales roles and documented option values by the motion scale', () => {
    const slowed = styled({ ...MOTION_TOKENS, '--tp-motion-scale': '2' });
    expect(resolveMotionTiming(slowed).duration).toBe(560);
    expect(resolveMotionTiming(slowed, 100).duration).toBe(200);
    expect(
      resolveMotionTiming(styled({ ...MOTION_TOKENS, '--tp-motion-scale': '0' })).duration,
    ).toBe(0);
  });

  it('follows a scoped override of a role', () => {
    const scoped = styled({ ...MOTION_TOKENS, '--tp-duration-normal': '1s' });
    expect(resolveMotionTiming(scoped).duration).toBe(1000);
  });

  it('resolves no motion under reduced motion and without a token set', () => {
    expect(resolveMotionTiming(styled(MOTION_TOKENS, 'reduce')).duration).toBe(0);
    expect(resolveMotionTiming(styled({}))).toEqual({ duration: 0, easing: 'linear' });
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
