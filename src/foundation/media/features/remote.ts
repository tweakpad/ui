import type { MediaRemotePlaybackState } from '../state.js';
import { isMediaRemotePlaybackCapable, isWebKitAirPlayCapable } from '../target.js';
import type { MediaFeature } from './context.js';

const remoteState = (value: string | undefined): MediaRemotePlaybackState =>
  value === 'connected' || value === 'connecting' ? value : 'disconnected';

/**
 * Remote playback slice. WebKit AirPlay events drive both values when available (Safari's W3C
 * events are unreliable for AirPlay); otherwise the W3C Remote Playback API: connection events
 * and `watchAvailability` (a rejection means `unsupported`).
 */
export const remotePlaybackFeature: MediaFeature = {
  name: 'remote',
  attach(context) {
    const { media } = context;
    if (isWebKitAirPlayCapable(media, context.window)) {
      const syncConnection = () =>
        context.set({
          remotePlaybackState:
            media.webkitCurrentPlaybackTargetIsWireless === true ? 'connected' : 'disconnected',
        });
      context.set({ remotePlaybackAvailability: 'unavailable' });
      context.listen(media, 'webkitplaybacktargetavailabilitychanged', (event) =>
        context.set({
          remotePlaybackAvailability:
            (event as Event & { availability?: string }).availability === 'available'
              ? 'available'
              : 'unavailable',
        }),
      );
      context.listen(media, 'webkitcurrentplaybacktargetiswirelesschanged', syncConnection);
      syncConnection();
      return;
    }
    if (!isMediaRemotePlaybackCapable(media)) return;
    const remote = media.remote;
    const sync = () => context.set({ remotePlaybackState: remoteState(remote.state) });
    sync();
    for (const type of ['connect', 'connecting', 'disconnect']) context.listen(remote, type, sync);
    if (typeof remote.watchAvailability !== 'function') {
      context.set({ remotePlaybackAvailability: 'available' });
      return;
    }
    context.set({ remotePlaybackAvailability: 'unavailable' });
    let active = true;
    let watchId: number | undefined;
    context.scope.add(() => {
      active = false;
      remote.cancelWatchAvailability?.(watchId)?.catch(() => undefined);
    });
    remote
      .watchAvailability((available) => {
        if (active)
          context.set({ remotePlaybackAvailability: available ? 'available' : 'unavailable' });
      })
      .then((id) => {
        watchId = id;
      })
      .catch(() => {
        if (active) context.set({ remotePlaybackAvailability: 'unsupported' });
      });
  },
};
