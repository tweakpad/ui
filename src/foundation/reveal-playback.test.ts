import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeIntersectionObserver, fakeViewTransition } from './fakes.test.js';
import { cssTimeMs } from './motion.js';
import { type RevealPlayback, StandaloneReveal, transitionSpan } from './reveal-playback.js';

describe('CSS time parsing', () => {
  it('reads seconds and milliseconds, and 0 for anything else', () => {
    expect(cssTimeMs('0.56s')).toBe(560);
    expect(cssTimeMs(' 560ms ')).toBe(560);
    expect(cssTimeMs('2s')).toBe(2000);
    expect(cssTimeMs('0s')).toBe(0);
    expect(cssTimeMs('auto')).toBe(0);
    expect(cssTimeMs('')).toBe(0);
  });

  it('spans the longest duration plus delay across a transition list', () => {
    expect(
      transitionSpan({
        transitionDuration: '0.2s, 500ms',
        transitionDelay: '100ms',
      } as CSSStyleDeclaration),
    ).toBe(600);
    expect(
      transitionSpan({ transitionDuration: '0s', transitionDelay: '0s' } as CSSStyleDeclaration),
    ).toBe(0);
  });
});

describe('standalone reveal', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
  });

  function standalone({ observe = true }: { observe?: boolean } = {}) {
    const document = {
      activeViewTransition: null as ViewTransition | null,
      defaultView: {
        ...(observe ? { IntersectionObserver: FakeIntersectionObserver } : {}),
        matchMedia: () => ({ matches: false }),
      },
    };
    const element = {
      nodeType: 1,
      isConnected: true,
      parentNode: null,
      assignedSlot: null,
      ownerDocument: document,
      getAttribute: () => null,
    } as unknown as HTMLElement;
    const playback = {
      revealed: false,
      play: vi.fn(async () => {
        playback.revealed = true;
      }),
      reset: vi.fn(),
    };
    const reveal = new StandaloneReveal(element, {
      playback: playback as unknown as RevealPlayback,
      repeat: () => false,
      revealing: () => true,
      ready: () => true,
      held: () => false,
      coordinated: () => false,
    });
    const enter = () => {
      for (const observer of [...FakeIntersectionObserver.instances])
        if (observer.targets.has(element)) observer.report(element, true);
    };
    return { reveal, playback, document, enter };
  }

  const flush = async () => {
    for (let index = 0; index < 5; index++) await Promise.resolve();
  };

  it('waits out a same-document view transition, then reveals once', async () => {
    const { reveal, playback, document, enter } = standalone();
    const { transition, finish } = fakeViewTransition();
    document.activeViewTransition = transition;
    reveal.update();
    enter();
    await flush();
    expect(playback.play).not.toHaveBeenCalled();

    document.activeViewTransition = null;
    finish();
    await flush();
    expect(playback.play).toHaveBeenCalledTimes(1);
  });

  it('reveals at once without a view transition, and when the reveal is immediate', async () => {
    const plain = standalone();
    plain.reveal.update();
    plain.enter();
    expect(plain.playback.play).toHaveBeenCalledTimes(1);

    // No intersection support: the reveal presents its rest state at once, transition or not.
    const immediate = standalone({ observe: false });
    immediate.document.activeViewTransition = fakeViewTransition().transition;
    immediate.reveal.update();
    expect(immediate.playback.play).toHaveBeenCalledTimes(1);
  });
});
