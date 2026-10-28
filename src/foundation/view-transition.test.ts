import { describe, expect, it, vi } from 'vitest';
import { fakeViewTransition } from './fakes.test.js';
import { activeViewTransition, ViewTransitionHold } from './view-transition.js';

const documentWith = (transition: ViewTransition | null) =>
  ({ activeViewTransition: transition }) as unknown as Document;
const flush = async () => {
  for (let index = 0; index < 5; index++) await Promise.resolve();
};

describe('view transition hold', () => {
  it('reads the active transition, and none where the browser reports none', () => {
    const { transition } = fakeViewTransition();
    expect(activeViewTransition(documentWith(transition))).toBe(transition);
    expect(activeViewTransition({} as Document)).toBeNull();
    expect(activeViewTransition(null)).toBeNull();
  });

  it('does not hold without an active transition', () => {
    const resume = vi.fn();
    expect(new ViewTransitionHold().holds({} as Document, resume)).toBe(false);
    expect(resume).not.toHaveBeenCalled();
  });

  it('holds while a transition is active and resumes once when it finishes', async () => {
    const { transition, finish } = fakeViewTransition();
    const document = documentWith(transition);
    const hold = new ViewTransitionHold();
    const resume = vi.fn();
    expect(hold.holds(document, resume)).toBe(true);
    expect(hold.holds(document, resume)).toBe(true);
    await flush();
    expect(resume).not.toHaveBeenCalled();
    finish();
    await flush();
    expect(resume).toHaveBeenCalledTimes(1);
    // A browser that still reports the finished transition no longer holds the reveal.
    expect(hold.holds(document, resume)).toBe(false);
  });

  it('resumes when the transition is skipped or fails', async () => {
    const { transition, fail } = fakeViewTransition();
    const resume = vi.fn();
    expect(new ViewTransitionHold().holds(documentWith(transition), resume)).toBe(true);
    fail(new DOMException('Skipped', 'AbortError'));
    await flush();
    expect(resume).toHaveBeenCalledTimes(1);
  });
});
