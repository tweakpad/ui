import { describe, expect, it } from 'vitest';
import { attachPartReference, detachPartReference } from './part-reference.js';

describe('part reference ownership', () => {
  it('keeps the new host when Lit disconnects the outgoing template after mounting its replacement', () => {
    const oldOwner = {};
    const newOwner = {};
    const oldHost = {} as HTMLElement;
    const newHost = {} as HTMLElement;
    const calls: (HTMLElement | null)[] = [];
    const ref = (element: HTMLElement | null) => calls.push(element);
    attachPartReference(oldOwner, ref, oldHost);
    attachPartReference(newOwner, ref, newHost);
    detachPartReference(oldOwner, ref);
    expect(calls).toEqual([oldHost, null, newHost]);
    detachPartReference(newOwner, ref);
    expect(calls).toEqual([oldHost, null, newHost, null]);
  });

  it('reconnects object references and does not notify unchanged hosts', () => {
    const owner = {};
    const host = {} as HTMLElement;
    const ref = { current: null as HTMLElement | null };
    attachPartReference(owner, ref, host);
    attachPartReference(owner, ref, host);
    expect(ref.current).toBe(host);
    detachPartReference(owner, ref);
    expect(ref.current).toBeNull();
    attachPartReference(owner, ref, host);
    expect(ref.current).toBe(host);
  });
});
