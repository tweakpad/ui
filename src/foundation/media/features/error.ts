import type { MediaErrorState } from '../state.js';
import { isMediaErrorCapable, type MediaErrorLike } from '../target.js';
import type { MediaFeature } from './context.js';

/**
 * Normalizes a media error. `fatal` defaults to the network, decode, source and encryption codes
 * (2–5); an engine may flag recoverable errors explicitly.
 */
export function toMediaErrorState(error: unknown): MediaErrorState | null {
  if (typeof error !== 'object' || error === null) return null;
  const candidate = error as Partial<MediaErrorLike>;
  const code = typeof candidate.code === 'number' ? candidate.code : 0;
  const message = typeof candidate.message === 'string' ? candidate.message : '';
  if (!code && !message) return null;
  const fatal = typeof candidate.fatal === 'boolean' ? candidate.fatal : code >= 2 && code <= 5;
  return { code, message, fatal };
}

/**
 * Error slice: set from the `error` event and from `media.error` at attach (an error that
 * happened before attach is not lost); cleared on `emptied` and by `dismiss-error`.
 */
export const errorFeature: MediaFeature = {
  name: 'error',
  attach(context) {
    const { media } = context;
    if (!isMediaErrorCapable(media)) return;
    const initial = toMediaErrorState(media.error);
    if (initial) context.set({ error: initial });
    context.listen(media, 'error', (event) => {
      const error =
        toMediaErrorState(media.error) ??
        toMediaErrorState((event as CustomEvent<unknown>).detail) ??
        toMediaErrorState((event as ErrorEvent).error);
      if (error) context.set({ error });
    });
    context.listen(media, 'emptied', () => context.set({ error: null }));
  },
};
