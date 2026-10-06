import { describe, expect, it, vi } from 'vitest';
import type { ReactiveController } from 'lit';
import { setLogicalPortalOwner } from '../../foundation/portal-ownership.js';
import { createMediaMessages } from '../../foundation/media/messages.js';
import type { MediaState } from '../../foundation/media/state.js';
import {
  DEFAULT_MEDIA_STATE,
  MediaSelectorController,
  closeMediaPopups,
  mediaPlayerBrand,
  mediaPopupScopeBrand,
  mediaPlayerOf,
  resolveMediaMessages,
  type MediaPlayerApi,
} from './context.js';

/** A player fake: a state cell with selected subscriptions (equality as the real store). */
function fakePlayer(initial: Partial<MediaState> = {}) {
  let state: MediaState = { ...DEFAULT_MEDIA_STATE, ...initial };
  const subscribers = new Set<{
    selector: (state: MediaState) => unknown;
    callback: (value: unknown) => void;
    equality: (a: unknown, b: unknown) => boolean;
    last: unknown;
  }>();
  const player = {
    [mediaPlayerBrand]: true,
    nodeType: 1,
    parentNode: null,
    get state() {
      return state;
    },
    subscribe: vi.fn(
      (
        selector: (state: MediaState) => unknown,
        callback: (value: unknown) => void,
        options: { equality?: (a: unknown, b: unknown) => boolean } = {},
      ) => {
        const entry = {
          selector,
          callback,
          equality: options.equality ?? Object.is,
          last: selector(state),
        };
        subscribers.add(entry);
        return () => subscribers.delete(entry);
      },
    ),
    set(patch: Partial<MediaState>) {
      state = { ...state, ...patch };
      for (const entry of subscribers) {
        const next = entry.selector(state);
        if (entry.equality(entry.last, next)) continue;
        entry.last = next;
        entry.callback(next);
      }
    },
    get subscriberCount() {
      return subscribers.size;
    },
  };
  return player as typeof player & MediaPlayerApi;
}

function fakeHost(player: MediaPlayerApi | null) {
  const controllers: ReactiveController[] = [];
  const host = {
    player,
    updates: 0,
    addController: (controller: ReactiveController) => controllers.push(controller),
    removeController: () => undefined,
    requestUpdate() {
      host.updates++;
    },
    updateComplete: Promise.resolve(true),
    connect: () => controllers.forEach((controller) => controller.hostConnected?.()),
    update: () => controllers.forEach((controller) => controller.hostUpdate?.()),
    disconnect: () => controllers.forEach((controller) => controller.hostDisconnected?.()),
  };
  return host;
}

describe('MediaSelectorController (sec-1810 mp-f-store; V-11)', () => {
  it('reads defaults without a player and the player slice once connected', () => {
    const player = fakePlayer({ paused: false });
    const host = fakeHost(null);
    const paused = new MediaSelectorController(host, (state) => state.paused);
    expect(paused.value).toBe(true);
    host.connect();
    expect(paused.player).toBeNull();
    host.player = player;
    host.update();
    expect(paused.value).toBe(false);
    expect(paused.player).toBe(player);
  });

  it('re-renders only when the selected slice changes (shallow equality by default)', () => {
    const player = fakePlayer();
    const host = fakeHost(player);
    const slice = new MediaSelectorController(host, (state) => ({
      paused: state.paused,
      muted: state.muted,
    }));
    host.connect();
    const before = host.updates;
    player.set({ currentTime: 5 });
    player.set({ currentTime: 6 });
    expect(host.updates).toBe(before);
    player.set({ muted: true });
    expect(host.updates).toBe(before + 1);
    expect(slice.value).toEqual({ paused: true, muted: true });
  });

  it('accepts a custom equality and unsubscribes on disconnection', () => {
    const player = fakePlayer();
    const host = fakeHost(player);
    const time = new MediaSelectorController(
      host,
      (state) => state.currentTime,
      (a, b) => Math.floor(a) === Math.floor(b),
    );
    host.connect();
    expect(player.subscriberCount).toBe(1);
    player.set({ currentTime: 0.5 });
    expect(time.value).toBe(0);
    player.set({ currentTime: 1.2 });
    expect(time.value).toBe(1.2);
    host.disconnect();
    expect(player.subscriberCount).toBe(0);
  });

  it('re-binds before an update when the host player changes', () => {
    const first = fakePlayer({ volume: 0.2 });
    const second = fakePlayer({ volume: 0.8 });
    const host = fakeHost(first);
    const volume = new MediaSelectorController(host, (state) => state.volume);
    host.connect();
    expect(volume.value).toBe(0.2);
    host.player = second;
    host.update();
    expect(volume.value).toBe(0.8);
    expect(first.subscriberCount).toBe(0);
    expect(second.subscriberCount).toBe(1);
    first.set({ volume: 0.1 });
    expect(volume.value).toBe(0.8);
  });
});

/** Minimal composed-tree nodes for the owner walk. */
function node(parent: object | null, extra: object = {}) {
  return { nodeType: 1, parentNode: parent, assignedSlot: null, ...extra } as unknown as Node;
}

describe('mediaPlayerOf (sec-1810 mp-f-owner; V-05)', () => {
  it('finds the nearest player through composed parents and logical portal owners', () => {
    const player = fakePlayer() as unknown as Node;
    const controls = node(player);
    const menu = node(controls);
    expect(mediaPlayerOf(node(menu))).toBe(player);
    // A portaled surface: physically elsewhere, logically owned by the menu.
    const portal = node(node(null));
    setLogicalPortalOwner(portal, menu as HTMLElement);
    expect(mediaPlayerOf(node(portal))).toBe(player);
    expect(mediaPlayerOf(node(node(null)))).toBeNull();
  });

  it('resolves an explicit player id in the tree scope, then the document', () => {
    const player = fakePlayer();
    const scoped = {
      getElementById: (id: string) => (id === 'main' ? player : null),
    };
    const host = node(null, { getRootNode: () => scoped });
    expect(mediaPlayerOf(host, 'main')).toBe(player);
    expect(mediaPlayerOf(host, 'other')).toBeNull();
    const notPlayer = { getElementById: () => ({ nodeType: 1 }) };
    expect(mediaPlayerOf(node(null, { getRootNode: () => notPlayer }), 'x')).toBeNull();
    const viaDocument = node(null, {
      getRootNode: () => ({}),
      ownerDocument: { getElementById: () => player },
    });
    expect(mediaPlayerOf(viaDocument, 'main')).toBe(player);
  });
});

describe('messages inheritance (sec-1810 mp-f-locale; V-41)', () => {
  it('layers constituent overrides over root messages over English, with stable identity', () => {
    const root = createMediaMessages({ play: 'Lecture', pause: 'Pause (root)' });
    const own = { play: 'Reproducir' };
    const resolver = resolveMediaMessages(root, own);
    expect(resolver.get('play')).toBe('Reproducir');
    expect(resolver.get('pause')).toBe('Pause (root)');
    expect(resolver.get('mute')).toBe('Mute');
    expect(resolveMediaMessages(root, own)).toBe(resolver);
    expect(resolveMediaMessages(root, null)).toBe(root);
    expect(resolveMediaMessages(null, null).get('player')).toBe('Media player');
    expect(
      resolveMediaMessages(undefined, { seekForward: 'Skip {seconds}' }).get('seekForward', {
        seconds: 5,
      }),
    ).toBe('Skip 5');
  });
});

describe('closeMediaPopups (sec-1922 hide semantics; mp-f-surfaces-fullscreen)', () => {
  it('closes only open popup hosts with the given reason', () => {
    const calls: string[] = [];
    const popup = (name: string, open: boolean) => ({
      open,
      setOpen: (value: boolean, reason: string) => calls.push(`${name}:${value}:${reason}`),
    });
    const scope = {
      querySelectorAll: () => [popup('menu', true), popup('popover', false), { open: true }, {}],
    } as unknown as ParentNode;
    closeMediaPopups(scope, 'idle');
    expect(calls).toEqual(['menu:false:idle']);
  });

  it('walks into layout shadow roots but not into other components', () => {
    const calls: string[] = [];
    const popup = (name: string) => ({
      open: true,
      setOpen: (value: boolean, reason: string) => calls.push(`${name}:${value}:${reason}`),
    });
    const tree = (...children: object[]) => ({ querySelectorAll: () => children });
    const layout = { [mediaPopupScopeBrand]: true, shadowRoot: tree(popup('tooltip')) };
    const dialog = { shadowRoot: tree(popup('alert-dialog')) };
    closeMediaPopups(tree(layout, dialog) as unknown as ParentNode, 'imperative-action');
    expect(calls).toEqual(['tooltip:false:imperative-action']);
  });
});
