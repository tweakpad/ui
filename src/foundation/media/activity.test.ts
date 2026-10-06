import { afterEach, describe, expect, it, vi } from 'vitest';
import { INTERACTIVE_TARGET_SELECTOR } from '../interactive-target.js';
import {
  ActivityOwner,
  DEFAULT_IDLE_DELAY,
  TOUCH_SETTLE_DELAY,
  type ActivityChange,
  type ActivityOwnerOptions,
} from './activity.js';
import { FakeContainer, FakeDocument, pointer } from './media-fakes.test.js';

afterEach(() => vi.useRealTimers());

function setup(options: Partial<ActivityOwnerOptions> = {}) {
  vi.useFakeTimers();
  const document = new FakeDocument();
  const surface = new FakeContainer(document);
  const changes: ActivityChange[] = [];
  let visible = true;
  const owner = new ActivityOwner({
    onChange: (change) => {
      changes.push(change);
      visible = change.userActive || change.locked;
    },
    visible: () => visible,
    ...options,
  });
  owner.attach(surface as unknown as HTMLElement);
  const fire = (event: Event) => surface.dispatchEvent(event);
  return { owner, surface, changes, fire, setVisible: (value: boolean) => (visible = value) };
}

const button = {
  nodeType: 1,
  matches: (selector: string) => selector === INTERACTIVE_TARGET_SELECTOR,
};

describe('ActivityOwner inputs (sec-1922 mp-ai-inputs)', () => {
  it('goes idle after the default delay and mouse/pen movement reactivates it', () => {
    const { owner, fire, changes } = setup();
    vi.advanceTimersByTime(DEFAULT_IDLE_DELAY - 1);
    expect(owner.userActive).toBe(true);
    vi.advanceTimersByTime(1);
    expect(owner.userActive).toBe(false);
    expect(changes.at(-1)).toMatchObject({ userActive: false, reason: 'idle' });
    fire(pointer('pointermove', { pointerType: 'pen' }));
    expect(owner.userActive).toBe(true);
    expect(changes.at(-1)!.reason).toBe('pointer');
    vi.advanceTimersByTime(1500);
    fire(pointer('pointermove'));
    vi.advanceTimersByTime(1500);
    expect(owner.userActive).toBe(true); // the timer restarted
  });

  it('key, pointer down and focus entry mark active; touch movement only restarts the timer', () => {
    const { owner, fire, changes } = setup();
    vi.advanceTimersByTime(DEFAULT_IDLE_DELAY);
    fire(pointer('pointermove', { pointerType: 'touch' }));
    expect(owner.userActive).toBe(false);
    fire(new Event('keydown'));
    expect(changes.at(-1)).toMatchObject({ userActive: true, reason: 'keyboard' });
    vi.advanceTimersByTime(1900);
    fire(pointer('pointermove', { pointerType: 'touch' }));
    vi.advanceTimersByTime(1900);
    expect(owner.userActive).toBe(true);
    vi.advanceTimersByTime(100);
    fire(new Event('focusin'));
    expect(changes.at(-1)!.reason).toBe('focus');
    vi.advanceTimersByTime(DEFAULT_IDLE_DELAY);
    fire(pointer('pointerdown'));
    expect(owner.userActive).toBe(true);
  });

  it('mouse leave is inactive immediately unless it follows touch within 500 ms', () => {
    const { owner, fire } = setup();
    fire(new Event('mouseleave'));
    expect(owner.userActive).toBe(false);
    // Hidden, then a touch tap shows the controls; the synthetic mouseleave that follows is ignored.
    fire(pointer('pointerdown', { pointerType: 'touch' }));
    fire(pointer('pointerup', { pointerType: 'touch' }));
    expect(owner.userActive).toBe(true);
    vi.advanceTimersByTime(300);
    fire(new Event('mouseleave'));
    expect(owner.userActive).toBe(true);
  });

  it('ignores synthetic mouseleave and focusin within the touch settle window', () => {
    const { owner, fire, changes } = setup();
    fire(pointer('pointerdown', { pointerType: 'touch' }));
    vi.advanceTimersByTime(400); // a long press, not a tap
    fire(pointer('pointerup', { pointerType: 'touch' }));
    expect(owner.userActive).toBe(true);
    const count = changes.length;
    fire(new Event('mouseleave'));
    fire(new Event('focusin'));
    expect(owner.userActive).toBe(true);
    expect(changes).toHaveLength(count);
    vi.advanceTimersByTime(TOUCH_SETTLE_DELAY);
    fire(new Event('mouseleave'));
    expect(owner.userActive).toBe(false);
  });

  it('ignores an in-bounds mouseleave right after pointer capture release (Safari)', () => {
    const { owner, fire } = setup();
    fire(new Event('lostpointercapture'));
    fire(Object.assign(new Event('mouseleave'), { clientX: 50, clientY: 50 }));
    expect(owner.userActive).toBe(true);
    vi.advanceTimersByTime(150);
    fire(Object.assign(new Event('mouseleave'), { clientX: 50, clientY: 50 }));
    expect(owner.userActive).toBe(false);
  });

  it('a touch tap ≤ 250 ms on a non-interactive area toggles visibility', () => {
    const { owner, fire, setVisible } = setup();
    const tap = (path?: unknown[]) => {
      fire(pointer('pointerdown', { pointerType: 'touch', ...(path ? { path } : {}) }));
      vi.advanceTimersByTime(100);
      fire(pointer('pointerup', { pointerType: 'touch', ...(path ? { path } : {}) }));
    };
    tap();
    expect(owner.userActive).toBe(false);
    setVisible(false);
    tap();
    expect(owner.userActive).toBe(true);
    // A tap on a control keeps the surface active.
    tap([button]);
    expect(owner.userActive).toBe(true);
  });

  it('leaves a tap claimed by a gesture binding to the gesture layer', () => {
    const claimsTap = vi.fn(() => true);
    const { owner, fire } = setup({ claimsTap });
    fire(pointer('pointerdown', { pointerType: 'touch' }));
    fire(pointer('pointerup', { pointerType: 'touch' }));
    expect(claimsTap).toHaveBeenCalledTimes(1);
    expect(owner.userActive).toBe(true);
  });
});

describe('ActivityOwner leases and hiding (mp-ai-leases, mp-ai-hide)', () => {
  it('leases keep controls visible, release idempotently, and the last release restarts the delay', () => {
    const { owner, changes } = setup();
    const popup = owner.requestLock('popup');
    const drag = owner.requestLock('drag');
    expect(changes.at(-1)).toMatchObject({ locked: true });
    vi.advanceTimersByTime(DEFAULT_IDLE_DELAY * 3);
    expect(owner.userActive).toBe(true);
    popup();
    popup();
    expect(owner.locked).toBe(true); // releasing one reason never clears another
    expect(owner.reasons).toEqual(['drag']);
    vi.advanceTimersByTime(DEFAULT_IDLE_DELAY * 3);
    drag();
    expect(owner.locked).toBe(false);
    vi.advanceTimersByTime(DEFAULT_IDLE_DELAY - 1);
    expect(owner.userActive).toBe(true);
    vi.advanceTimersByTime(1);
    expect(owner.userActive).toBe(false);
  });

  it('holds a focus lease while focus is within a region and a hover lease for mouse', () => {
    const { owner, surface } = setup();
    const region = new EventTarget() as unknown as HTMLElement & EventTarget;
    const inner = { parentNode: region };
    const stopFocus = owner.trackFocusWithin(region);
    const stopHover = owner.trackHover(region);
    region.dispatchEvent(new Event('focusin'));
    expect(owner.reasons).toEqual(['focus']);
    region.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget: inner }));
    expect(owner.reasons).toEqual(['focus']); // focus moved within the region
    region.dispatchEvent(Object.assign(new Event('focusout'), { relatedTarget: surface }));
    expect(owner.locked).toBe(false);
    region.dispatchEvent(pointer('pointerenter', { pointerType: 'touch' }));
    expect(owner.locked).toBe(false);
    region.dispatchEvent(pointer('pointerenter'));
    expect(owner.reasons).toEqual(['hover']);
    stopHover();
    expect(owner.locked).toBe(false);
    region.dispatchEvent(new Event('focusin'));
    stopFocus();
    expect(owner.locked).toBe(false);
  });

  it('an idle delay of zero or less disables hiding, but an explicit toggle still applies', () => {
    let delay = 0;
    const { owner, fire } = setup({ idleDelay: () => delay });
    vi.advanceTimersByTime(60_000);
    fire(new Event('mouseleave'));
    expect(owner.userActive).toBe(true);
    expect(owner.toggle(false)).toBe(false);
    expect(owner.toggle()).toBe(true);
    delay = 500;
    owner.restart();
    vi.advanceTimersByTime(500);
    expect(owner.userActive).toBe(false);
  });

  it('reset releases leases silently and detach keeps leases', () => {
    const { owner, changes } = setup();
    const release = owner.requestLock();
    owner.detach();
    expect(owner.locked).toBe(true);
    const count = changes.length;
    owner.reset();
    expect(owner.locked).toBe(false);
    expect(changes).toHaveLength(count);
    release();
    owner.dispose();
    expect(owner.requestLock()).toBeTypeOf('function');
  });
});
