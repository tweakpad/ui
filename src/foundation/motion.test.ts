import { describe, expect, it, vi } from 'vitest';
import { resolvesReducedMotion } from './motion.js';

function element(policy: string | null, parent: Node | null = null): Element {
  return {
    nodeType: 1,
    parentNode: parent,
    getAttribute: () => policy,
    ownerDocument: { defaultView: { matchMedia: () => ({ matches: true }) } },
  } as unknown as Element;
}

describe('motion policy environment', () => {
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
