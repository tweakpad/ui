import { describe, it, expect, vi } from 'vitest';
import { ControllableState } from './controllable-state.js';
import { SurfaceState } from './surface-state.js';
function setup(controlled = false) {
  let inputOpen: boolean | undefined = controlled ? true : undefined;
  let inputSnap: number | undefined = controlled ? 2 : undefined;
  const host = Object.assign(new EventTarget(), {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  });
  const observations: unknown[] = [];
  let veto = false,
    acknowledge = true;
  const snap: ControllableState<number> = new ControllableState({
    host,
    initialValue: 2,
    readControlledValue: () => inputSnap,
    onChange: (event) => {
      observations.push(['snap-proposal', surface.open, snap.value]);
      if (controlled && acknowledge) {
        inputSnap = event.detail.value;
        snap.sync();
      }
      if (veto) event.preventDefault();
    },
    onCommit: () => observations.push(['snap-commit', surface.open, snap.value]),
  });
  const surface = new SurfaceState({
    read: () => inputOpen,
    defaultOpen: () => true,
    diagnostic: vi.fn(),
    dispatch: (event) => {
      observations.push(['open-proposal', surface.open, snap.value]);
      if (controlled && acknowledge) {
        inputOpen = event.detail.value;
        surface.sync(true);
      }
    },
    commit: () => observations.push(['open-commit', surface.open, snap.value]),
  });
  snap.initialize();
  surface.initialize();
  return {
    snap,
    surface,
    observations,
    veto: () => (veto = true),
    reject: () => (acknowledge = false),
  };
}
describe('surface and value transaction', () => {
  it('publishes both committed getters before either commit callback', () => {
    const f = setup();
    f.surface.requestTogether([f.snap.proposal(1, 'swipe')], false, 'swipe');
    expect(f.observations).toEqual([
      ['open-proposal', true, 2],
      ['snap-proposal', true, 2],
      ['open-commit', false, 1],
      ['snap-commit', false, 1],
    ]);
  });
  it('consumes synchronous controlled writes on a later snap veto without replaying either lane', () => {
    const f = setup(true);
    f.veto();
    expect(f.surface.requestTogether([f.snap.proposal(1, 'swipe')], false, 'swipe')).toBe(false);
    f.surface.sync();
    f.snap.hostUpdate();
    expect([f.surface.open, f.snap.value]).toEqual([true, 2]);
    expect(f.observations).toHaveLength(2);
  });
  it('rejects an unacknowledged controlled pair and can publish a later acknowledged request', () => {
    const f = setup(true);
    f.reject();
    expect(f.surface.requestTogether([f.snap.proposal(1, 'swipe')], false, 'swipe')).toBe(false);
    expect([f.surface.open, f.snap.value]).toEqual([true, 2]);
    const accepted = setup(true);
    expect(
      accepted.surface.requestTogether([accepted.snap.proposal(1, 'swipe')], false, 'swipe'),
    ).toBe(true);
    expect([accepted.surface.open, accepted.snap.value]).toEqual([false, 1]);
  });
});
