import { describe, expect, it, vi } from 'vitest';
import { SurfaceState, type TpSurfaceOpenChangeEvent } from './surface-state.js';

function fixture(initial?: boolean) {
  let value = initial;
  let listener: (event: TpSurfaceOpenChangeEvent) => void = () => {};
  const commit = vi.fn();
  const diagnostic = vi.fn();
  const events: TpSurfaceOpenChangeEvent[] = [];
  const state = new SurfaceState({
    read: () => value,
    defaultOpen: () => false,
    dispatch: (event) => {
      events.push(event);
      listener(event);
    },
    commit,
    diagnostic,
  });
  state.initialize();
  return {
    state,
    commit,
    diagnostic,
    events,
    set: (next: boolean | undefined) => {
      value = next;
    },
    listen: (next: typeof listener) => {
      listener = next;
    },
  };
}
describe('surface state', () => {
  it('commits uncontrolled proposals and vetoes without retaining a later close', () => {
    const f = fixture();
    f.state.request(true, 'trigger-press');
    expect(f.state.open).toBe(true);
    f.listen((event) => {
      event.detail.preventUnmountOnClose();
      event.preventDefault();
    });
    f.state.request(false, 'close-action');
    expect(f.state.open).toBe(true);
    expect(f.state.retained).toBe(false);
    f.listen(() => {});
    f.state.request(false, 'close-action');
    expect(f.state.open).toBe(false);
    expect(f.state.retained).toBe(false);
  });
  it('keeps controlled state and association unchanged until the owner accepts', () => {
    const f = fixture(false);
    const accept = vi.fn();
    f.state.request(true, 'trigger-press', undefined, undefined, accept);
    expect(f.state.open).toBe(false);
    expect(accept).not.toHaveBeenCalled();
    f.set(true);
    f.state.sync();
    expect(f.state.open).toBe(true);
    expect(accept).toHaveBeenCalledOnce();
    expect(f.commit).toHaveBeenCalledWith(true);
  });
  it('accepts controlled writes made synchronously inside the proposal callback', () => {
    const f = fixture(false);
    f.listen((event) => f.set(event.detail.value));
    f.state.request(true, 'programmatic');
    expect(f.state.open).toBe(true);
  });
  it('retains accepted exits and clears retention when reopened', () => {
    const f = fixture();
    f.state.request(true, 'programmatic');
    f.listen((event) => event.detail.preventUnmountOnClose());
    f.state.request(false, 'imperative-action');
    expect(f.state.retained).toBe(true);
    f.state.request(true, 'programmatic');
    expect(f.state.retained).toBe(false);
  });
  it('queues reentrant proposals after the first publication', () => {
    const f = fixture();
    f.listen((event) => {
      if (event.detail.value) f.state.request(false, 'close-action');
    });
    f.state.request(true, 'programmatic');
    expect(f.commit.mock.calls).toEqual([[true], [false]]);
    expect(f.state.open).toBe(false);
  });
  it('retains its initial ownership mode', () => {
    const f = fixture();
    f.set(true);
    f.state.sync();
    expect(f.state.open).toBe(false);
    expect(f.diagnostic).toHaveBeenCalledOnce();
  });
  it('proposes same-open trigger reassociation and preserves the accepted association on veto', () => {
    const f = fixture(true);
    const accept = vi.fn();
    f.listen((event) => event.preventDefault());
    f.state.request(true, 'trigger-hover', undefined, undefined, accept, true);
    expect(accept).not.toHaveBeenCalled();
    expect(f.events).toHaveLength(1);
    f.listen(() => {});
    f.state.request(true, 'trigger-hover', undefined, undefined, accept, true);
    expect(accept).toHaveBeenCalledOnce();
    expect(f.state.open).toBe(true);
  });
});
