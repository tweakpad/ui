import { describe, expect, it } from 'vitest';
import { ReasonLeases, type ReasonLeaseChange } from './reason-leases.js';

describe('ReasonLeases', () => {
  it('counts leases per reason and releases idempotently', () => {
    const changes: ReasonLeaseChange[] = [];
    const leases = new ReasonLeases({ onChange: (change) => changes.push(change) });
    const a = leases.acquire('menu');
    const b = leases.acquire('menu');
    const c = leases.acquire('drag');
    expect([leases.count('menu'), leases.count(), leases.reasons]).toEqual([
      2,
      3,
      ['menu', 'drag'],
    ]);
    a();
    a();
    expect(leases.has('menu')).toBe(true);
    b();
    expect(leases.has('menu')).toBe(false);
    expect(leases.active).toBe(true);
    c();
    expect(changes).toEqual([
      { reason: 'menu', active: true, held: true },
      { reason: 'drag', active: true, held: true },
      { reason: 'menu', active: false, held: true },
      { reason: 'drag', active: false, held: false },
    ]);
  });

  it('switch leases coexist with counted leases of the same reason', () => {
    const leases = new ReasonLeases();
    expect(leases.set('explicit', true)).toBe(true);
    expect(leases.set('explicit', true)).toBe(false);
    const counted = leases.acquire('explicit');
    expect(leases.set('explicit', false)).toBe(true);
    expect(leases.has('explicit')).toBe(true);
    counted();
    expect(leases.active).toBe(false);
  });

  it('clear releases everything and stale releases do nothing afterwards', () => {
    const changes: ReasonLeaseChange[] = [];
    const leases = new ReasonLeases({ onChange: (change) => changes.push(change) });
    const stale = leases.acquire('a');
    leases.set('b', true);
    leases.clear();
    expect(leases.active).toBe(false);
    expect(changes.slice(-2)).toEqual([
      { reason: 'a', active: false, held: false },
      { reason: 'b', active: false, held: false },
    ]);
    const fresh = leases.acquire('a');
    stale();
    expect(leases.has('a')).toBe(true);
    fresh();
    expect(leases.active).toBe(false);
  });
});
