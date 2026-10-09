import { FakeIntersectionObserver } from './fakes.test.js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  coordinatorStatus,
  type RevealCoordinatorHost,
  RevealCoordinator,
  revealCoordinatorHost,
  staggerDelays,
  staggerPositions,
  type RevealMember,
} from './reveal-coordination.js';
import { transitionSpan } from './reveal-playback.js';

/** A fresh window per test, so the shared observer registry starts empty. */
const newView = () => ({
  IntersectionObserver: FakeIntersectionObserver,
  matchMedia: () => ({ matches: false }),
  customElements: { whenDefined: () => Promise.resolve() },
});
let view = newView();

type FakeElement = HTMLElement & {
  position: number;
  events: [string, unknown][];
  [revealCoordinatorHost]?: RevealCoordinatorHost;
};

function fakeElement(position: number, parentNode: unknown = null): FakeElement {
  const attributes = new Map<string, string>();
  return {
    nodeType: 1,
    localName: 'x-member',
    parentNode,
    assignedSlot: null,
    isConnected: true,
    ownerDocument: { defaultView: view },
    position,
    events: [],
    compareDocumentPosition(other: FakeElement) {
      return other.position > position ? 4 : 2;
    },
    getAttribute: (name: string) => attributes.get(name) ?? null,
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
    hasAttribute: (name: string) => attributes.has(name),
    toggleAttribute: (name: string, force: boolean) =>
      force ? attributes.set(name, '') : attributes.delete(name),
  } as unknown as FakeElement;
}

function fakeMember(element: HTMLElement, ready = true) {
  let revealed = false;
  const state = { ready, held: false };
  const member = {
    element,
    state,
    ready: () => state.ready,
    revealing: () => true,
    revealed: () => revealed,
    held: () => state.held,
    prepare: vi.fn(),
    reveal: vi.fn(async () => {
      revealed = true;
    }),
    reset: vi.fn(() => {
      revealed = false;
    }),
  } satisfies RevealMember & { state: typeof state };
  return member;
}

function coordinate(element: FakeElement, options: { stagger?: number; repeat?: boolean } = {}) {
  const hold = { value: false };
  const coordinator = new RevealCoordinator(element, {
    stagger: () => options.stagger ?? 100,
    staggerFrom: () => 'first',
    repeat: () => options.repeat ?? false,
    hold: () => hold.value,
    reveal: () => 'fade',
    emit: (type, detail) => element.events.push([type, detail]),
    status: () => {},
  });
  (element as unknown as Record<symbol, unknown>)[revealCoordinatorHost] = coordinator.host;
  coordinator.connect();
  return { coordinator, hold };
}

const flush = async () => {
  for (let index = 0; index < 5; index++) await Promise.resolve();
};

describe('stagger order', () => {
  it('numbers members from the first, the last or the center outward', () => {
    expect(staggerPositions(4, 'first')).toEqual([0, 1, 2, 3]);
    expect(staggerPositions(4, 'last')).toEqual([3, 2, 1, 0]);
    expect(staggerPositions(5, 'center')).toEqual([2, 1, 0, 1, 2]);
    expect(staggerPositions(4, 'center')).toEqual([1, 0, 0, 1]);
  });

  it('spaces reveals by the stagger and ignores invalid steps', () => {
    expect(staggerDelays(4, 120)).toEqual([0, 120, 240, 360]);
    expect(staggerDelays(3, 120, 'center')).toEqual([120, 0, 120]);
    expect(staggerDelays(2, -50)).toEqual([0, 0]);
    expect(staggerDelays(0, 100)).toEqual([]);
  });
});

describe('coordinator status', () => {
  it('is idle without members, loading until all are ready, with counts', () => {
    const element = fakeElement(0);
    const ready = fakeMember(element);
    const pending = { ...fakeMember(element, false), outcome: () => 'failed' as const };
    expect(coordinatorStatus([])).toMatchObject({ status: 'idle', total: 0 });
    expect(coordinatorStatus([ready, pending])).toMatchObject({
      status: 'loading',
      ready: 1,
      failed: 1,
      total: 2,
    });
  });
});

describe('reveal coordinator', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    view = newView();
  });

  it('reveals members in document order once in view, ready and not held', async () => {
    const root = fakeElement(0);
    const { hold } = coordinate(root);
    const third = fakeMember(fakeElement(3));
    const first = fakeMember(fakeElement(1), false);
    const second = fakeMember(fakeElement(2));
    for (const member of [third, first, second]) root[revealCoordinatorHost]!.register(member);
    FakeIntersectionObserver.report(root, true, '25%');
    FakeIntersectionObserver.report(root, true);
    await flush();
    expect(first.prepare).toHaveBeenCalled();
    expect(second.reveal).not.toHaveBeenCalled();

    hold.value = true;
    first.state.ready = true;
    root[revealCoordinatorHost]!.update();
    await flush();
    expect(second.reveal).not.toHaveBeenCalled();

    hold.value = false;
    root[revealCoordinatorHost]!.update();
    await flush();
    expect(first.reveal).toHaveBeenCalledWith(0);
    expect(second.reveal).toHaveBeenCalledWith(100);
    expect(third.reveal).toHaveBeenCalledWith(200);
    expect(root.events).toContainEqual(['tp-reveal-change-complete', { revealed: true }]);
  });

  it('reveals a member that joins after the sequence without delay', async () => {
    const root = fakeElement(0);
    coordinate(root);
    root[revealCoordinatorHost]!.register(fakeMember(fakeElement(1)));
    FakeIntersectionObserver.report(root, true);
    await flush();
    const late = fakeMember(fakeElement(2));
    root[revealCoordinatorHost]!.register(late);
    await flush();
    expect(late.reveal).toHaveBeenCalledWith(0);
  });

  it('resets every member when a repeating coordinator leaves the view', async () => {
    const root = fakeElement(0);
    coordinate(root, { repeat: true });
    const member = fakeMember(fakeElement(1));
    root[revealCoordinatorHost]!.register(member);
    FakeIntersectionObserver.report(root, true);
    await flush();
    expect(member.reveal).not.toHaveBeenCalled(); // entry waits for the 10% inset
    FakeIntersectionObserver.report(root, true, '-10% 0px -10% 0px');
    await flush();
    expect(member.reveal).toHaveBeenCalledTimes(1);
    FakeIntersectionObserver.report(root, false);
    await flush();
    expect(member.reset).toHaveBeenCalled();
    expect(root.events).toContainEqual(['tp-reveal-change', { revealed: false }]);
  });

  it('makes a nested coordinator a member of the outer one', async () => {
    const outer = fakeElement(0);
    coordinate(outer, { stagger: 50 });
    const inner = fakeElement(2, outer);
    coordinate(inner, { stagger: 10 });
    const before = fakeMember(fakeElement(1));
    const nested = [fakeMember(fakeElement(3), false), fakeMember(fakeElement(4))];
    outer[revealCoordinatorHost]!.register(before);
    for (const member of nested) inner[revealCoordinatorHost]!.register(member);
    FakeIntersectionObserver.report(outer, true);
    await flush();
    // The inner coordinator is not ready until all of its members are.
    expect(before.reveal).not.toHaveBeenCalled();
    nested[0]!.state.ready = true;
    inner[revealCoordinatorHost]!.update();
    await flush();
    expect(before.reveal).toHaveBeenCalledWith(0);
    expect(nested[0]!.reveal).toHaveBeenCalledWith(50);
    expect(nested[1]!.reveal).toHaveBeenCalledWith(60);
  });
});

describe('scrubbed choreography', () => {
  beforeEach(() => {
    FakeIntersectionObserver.instances = [];
    view = newView();
  });

  /** A nested coordinator's member, captured from a fake outer coordinator. */
  function nestedMember(stagger: number) {
    const registered: RevealMember[] = [];
    const outer = fakeElement(0);
    outer[revealCoordinatorHost] = {
      register: (member) => {
        registered.push(member);
        return () => {};
      },
      update: () => {},
      reveal: '',
    };
    const inner = fakeElement(1, outer);
    const { hold } = coordinate(inner, { stagger });
    return { inner, hold, member: () => registered[0]! };
  }

  function scrubbed(element: HTMLElement, duration: number) {
    const times: (number | null)[] = [];
    return {
      ...fakeMember(element),
      times,
      duration: () => duration,
      scrub: (time: number | null) => times.push(time),
    };
  }

  it('lays the timed choreography out as a timeline and presents each member its own time', async () => {
    const { inner, member } = nestedMember(100);
    const members = [scrubbed(fakeElement(2), 500), scrubbed(fakeElement(3), 300)];
    for (const item of members) inner[revealCoordinatorHost]!.register(item);
    await flush();
    // Offsets 0 and 100: the second ends at 400, the first at 500.
    expect(member().duration!()).toBe(500);
    member().scrub!(250);
    expect(members[0]!.times.at(-1)).toBe(250);
    expect(members[1]!.times.at(-1)).toBe(150);
  });

  it('keeps every member at the start state while held, and returns them to timed reveals', async () => {
    const { inner, hold, member } = nestedMember(100);
    const leaf = scrubbed(fakeElement(2), 500);
    inner[revealCoordinatorHost]!.register(leaf);
    await flush();
    member().duration!();
    hold.value = true;
    member().scrub!(400);
    expect(leaf.times.at(-1)).toBe(0);
    member().scrub!(null);
    expect(leaf.times.at(-1)).toBeNull();
  });
});

describe('transition span', () => {
  it('measures the longest transition including its delay', () => {
    const style = (transitionDuration: string, transitionDelay: string) =>
      ({ transitionDuration, transitionDelay }) as CSSStyleDeclaration;
    expect(transitionSpan(style('0.9s, 0.9s, 0.9s', '0.24s'))).toBeCloseTo(1140);
    expect(transitionSpan(style('200ms, 0s', '0s, 500ms'))).toBe(500);
    expect(transitionSpan(style('0s', '0s'))).toBe(0);
  });
});
