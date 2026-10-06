/**
 * Pure buffering and error-dialog policy (Library mp-l-feedback; Video.js
 * `core/ui/buffering-indicator`, `core/ui/error-dialog`).
 */
import {
  mediaErrorMessageKey,
  type MediaMessagesResolver,
} from '../../foundation/media/messages.js';
import type { MediaErrorState, MediaState } from '../../foundation/media/state.js';

/** Default buffering-indicator delay in milliseconds. */
export const MEDIA_BUFFERING_DELAY = 500;

/** Playback is stalled: waiting while not paused (the indicator shows after the delay). */
export function mediaStalled(state: Pick<MediaState, 'waiting' | 'paused'>): boolean {
  return state.waiting && !state.paused;
}

/** `MediaError.MEDIA_ERR_ABORTED`: the user stopped loading; no dialog (Media Chrome parity). */
export const MEDIA_ERROR_ABORTED = 1;

/** Whether the error dialog opens for `error`. */
export function errorDialogOpens(error: MediaErrorState | null | undefined): boolean {
  return error !== null && error !== undefined && error.code !== MEDIA_ERROR_ABORTED;
}

export interface MediaErrorDialogText {
  readonly title: string;
  readonly description: string;
}

/**
 * Title `errorTitle`; the description is the message for a known `MediaError` code (1–5), else the
 * error's own message, else `errorUnexpected`.
 */
export function mediaErrorDialogText(
  error: Pick<MediaErrorState, 'code' | 'message'> | null | undefined,
  messages: MediaMessagesResolver,
): MediaErrorDialogText {
  const title = messages.get('errorTitle');
  if (!error) return { title, description: messages.get('errorUnexpected') };
  const key = mediaErrorMessageKey(error.code);
  const known = key !== 'errorUnexpected';
  const own = typeof error.message === 'string' ? error.message.trim() : '';
  return {
    title,
    description: known ? messages.get(key) : own || messages.get('errorUnexpected'),
  };
}
