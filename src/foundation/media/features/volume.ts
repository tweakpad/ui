import { isMediaMutedCapable, isMediaVolumeCapable, type MediaTarget } from '../target.js';
import type { MediaAvailability } from '../availability.js';
import type { MediaFeature } from './context.js';

/**
 * Probes whether a written volume persists (it does not on iOS, where the hardware owns the
 * level) using a detached media element of the owner document.
 */
export function probeVolume(document: Document | undefined): MediaAvailability {
  if (!document || typeof document.createElement !== 'function') return 'available';
  try {
    const probe = document.createElement('video') as unknown as MediaTarget;
    probe.volume = 0.5;
    return probe.volume === 0.5 ? 'available' : 'unsupported';
  } catch {
    return 'unsupported';
  }
}

/** Volume slice: `volume`, `muted` and their availability (`volumeLevel` is derived). */
export const volumeFeature: MediaFeature = {
  name: 'volume',
  attach(context) {
    const { media } = context;
    const volumeCapable = isMediaVolumeCapable(media);
    const mutedCapable = isMediaMutedCapable(media);
    context.set({
      volumeAvailability: volumeCapable ? context.probeVolume() : 'unsupported',
      mutedAvailability: mutedCapable ? 'available' : 'unsupported',
    });
    if (!volumeCapable && !mutedCapable) return;
    const sync = () =>
      context.set({
        volume: volumeCapable && Number.isFinite(media.volume) ? media.volume! : 1,
        muted: mutedCapable ? media.muted === true : false,
      });
    sync();
    context.listen(media, 'volumechange', sync);
  },
};
