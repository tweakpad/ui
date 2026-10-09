import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setLogicalPortalOwner } from '../../foundation/portal-ownership.js';
import { shallowEqual } from '../../foundation/store.js';
import { TpDrawerProvider, inactiveDrawerState, nearestDrawerService } from './provider.js';
import type { DrawerVisualState } from './types.js';

customElements.define('tp-drawer-provider-test', class extends TpDrawerProvider {});
const createProvider = () =>
  new (customElements.get('tp-drawer-provider-test')!)() as TpDrawerProvider;
const drawerState = (state: Partial<DrawerVisualState>): DrawerVisualState => ({
  ...inactiveDrawerState(),
  active: true,
  ...state,
});

describe('Drawer provider store subscribers (media player R-03 regression V-74)', () => {
  it('keeps the legacy emitCurrent subscription used by Drawer indents', () => {
    const provider = createProvider();
    const seen: DrawerVisualState[] = [];
    provider.state.subscribe(({ value }) => seen.push(value), true);
    const first = {} as HTMLElement;
    const second = {} as HTMLElement;
    provider.updateDrawer(first, drawerState({ progress: 0.25, height: 300 }));
    provider.updateDrawer(first, drawerState({ progress: 0.25, height: 300 }));
    provider.updateDrawer(second, drawerState({ progress: 0.5, height: 200, swiping: true }));
    provider.removeDrawer(second);
    provider.removeDrawer(first);
    expect(
      seen.map(({ active, count, progress, height, swiping }) => [
        active,
        count,
        progress,
        height,
        swiping,
      ]),
    ).toEqual([
      [false, 0, 0, 0, false],
      [true, 1, 0.25, 300, false],
      [true, 2, 0.5, 200, true],
      [true, 1, 0.25, 300, false],
      [false, 0, 0, 0, false],
    ]);
  });

  it('supports selected subscriptions on the same provider state', () => {
    const provider = createProvider();
    const counts: number[] = [];
    const geometry: unknown[] = [];
    provider.state.subscribe((count) => counts.push(count), {
      selector: (state: DrawerVisualState) => state.count,
    });
    provider.state.subscribe((value) => geometry.push(value), {
      selector: ({ height, progress }) => ({ height, progress }),
      equality: shallowEqual,
    });
    const drawer = {} as HTMLElement;
    provider.updateDrawer(drawer, drawerState({ progress: 0.1, height: 100 }));
    provider.updateDrawer(drawer, drawerState({ progress: 0.1, height: 100, swiping: true }));
    provider.updateDrawer(drawer, drawerState({ progress: 0.2, height: 100, swiping: true }));
    expect(counts).toEqual([1]);
    expect(geometry).toEqual([
      { height: 100, progress: 0.1 },
      { height: 100, progress: 0.2 },
    ]);
  });
});

describe('nearestDrawerService (media player R-06 regression V-76)', () => {
  class FakeElement {
    assignedSlot: FakeElement | null = null;
    readonly nodeType = 1;
    constructor(
      readonly localName: string,
      readonly parentNode: FakeElement | null = null,
    ) {}
  }
  beforeEach(() => vi.stubGlobal('HTMLElement', FakeElement));
  afterEach(() => vi.unstubAllGlobals());
  const as = <T>(value: FakeElement) => value as unknown as T;

  it('finds the nearest provider, drawer or side panel through composed ancestry', () => {
    const provider = new FakeElement('tp-drawer-provider');
    const outer = new FakeElement('tp-drawer', provider);
    const content = new FakeElement('div', outer);
    const inner = new FakeElement('tp-drawer', content);
    const swipe = new FakeElement('tp-drawer-swipe-area', inner);
    expect(nearestDrawerService(as(swipe), 'tp-drawer')).toBe(inner);
    expect(nearestDrawerService(as(inner), 'tp-drawer')).toBe(outer);
    expect(nearestDrawerService(as(swipe), 'tp-drawer-provider')).toBe(provider);
    expect(nearestDrawerService(as(provider), 'tp-drawer-provider')).toBeNull();
    const panel = new FakeElement('tp-drawer');
    const nested = new FakeElement('tp-drawer-indent', panel);
    expect(nearestDrawerService(as(nested), 'tp-drawer')).toBe(panel);
    expect(nearestDrawerService(as(nested), 'tp-drawer-provider')).toBeNull();
  });

  it('follows a portal host to its logical drawer owner', () => {
    const provider = new FakeElement('tp-drawer-provider');
    const drawer = new FakeElement('tp-drawer', provider);
    const portalHost = new FakeElement('div', new FakeElement('body'));
    const popup = new FakeElement('div', portalHost);
    const swipe = new FakeElement('tp-drawer-swipe-area', popup);
    setLogicalPortalOwner(as(portalHost), as(drawer));
    try {
      expect(nearestDrawerService(as(swipe), 'tp-drawer')).toBe(drawer);
      expect(nearestDrawerService(as(swipe), 'tp-drawer-provider')).toBe(provider);
    } finally {
      setLogicalPortalOwner(as(portalHost), null);
    }
    expect(nearestDrawerService(as(swipe), 'tp-drawer')).toBeNull();
  });
});
