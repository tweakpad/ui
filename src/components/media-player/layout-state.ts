/**
 * Pure policy of the preset layouts (Library mp-l-layouts; Video.js default video and audio
 * skins): the `hide` token vocabulary, the automatic live variant, and the tooltip text of each
 * built-in button, which reuses the buttons' own state → view mapping so a tooltip always shows
 * the same state-dependent label the button carries as its accessible name.
 */
import type { MediaState } from '../../foundation/media/state.js';
import {
  captionsButtonView,
  fullscreenButtonView,
  liveButtonView,
  pipButtonView,
  playButtonView,
  playbackRateButtonView,
  remotePlaybackButtonView,
  seekButtonView,
  type MediaButtonContext,
  type MediaButtonRequest,
} from './button-state.js';

/** Built-in layout controls that `hide` can remove. */
export type MediaLayoutControl =
  | 'play'
  | 'seek'
  | 'volume'
  | 'current-time'
  | 'time-slider'
  | 'remaining-time'
  | 'captions'
  | 'settings'
  | 'live'
  | 'remote'
  | 'pip'
  | 'fullscreen';

export const MEDIA_LAYOUT_CONTROLS: readonly MediaLayoutControl[] = Object.freeze([
  'play',
  'seek',
  'volume',
  'current-time',
  'time-slider',
  'remaining-time',
  'captions',
  'settings',
  'live',
  'remote',
  'pip',
  'fullscreen',
]);

export interface MediaLayoutHide {
  readonly hidden: ReadonlySet<MediaLayoutControl>;
  /** Tokens that name no built-in control (diagnosed, otherwise ignored). */
  readonly unknown: readonly string[];
}

/** Parses a `hide` token list (space- or comma-separated, case-insensitive). */
export function parseMediaLayoutHide(value: string | null | undefined): MediaLayoutHide {
  const hidden = new Set<MediaLayoutControl>();
  const unknown: string[] = [];
  for (const token of (value ?? '').toLowerCase().split(/[\s,]+/u)) {
    if (!token) continue;
    if ((MEDIA_LAYOUT_CONTROLS as readonly string[]).includes(token))
      hidden.add(token as MediaLayoutControl);
    else if (!unknown.includes(token)) unknown.push(token);
  }
  return { hidden, unknown };
}

/**
 * The video layout's automatic variant: `live` (play, live, volume, captions, remote,
 * picture-in-picture, fullscreen; no time slider), `live-dvr` (the same with the time slider),
 * otherwise `on-demand`.
 */
export type MediaVideoLayoutVariant = 'on-demand' | 'live' | 'live-dvr';

export function mediaVideoLayoutVariant(
  state: Pick<MediaState, 'streamType' | 'dvr'>,
): MediaVideoLayoutVariant {
  if (state.streamType !== 'live') return 'on-demand';
  return state.dvr ? 'live-dvr' : 'live';
}

/** Buttons a layout wraps in a Tooltip. */
export type MediaLayoutTooltipControl =
  | 'play'
  | 'seek-backward'
  | 'seek-forward'
  | 'captions'
  | 'playback-rate'
  | 'live'
  | 'remote'
  | 'pip'
  | 'fullscreen'
  | 'settings';

export interface MediaLayoutTooltip {
  /** The visible tooltip text: the button's current accessible name. */
  readonly label: string;
  /** The request whose published key binding the tooltip shows as a Key hint. */
  readonly shortcut?: MediaButtonRequest | undefined;
}

/**
 * The tooltip of a built-in button for the current state: the same label the button computes
 * (`seconds` is the absolute seek step) and the binding it publishes as `aria-keyshortcuts`.
 */
export function mediaLayoutTooltip(
  control: MediaLayoutTooltipControl,
  state: MediaState,
  context: MediaButtonContext,
  seconds: number,
): MediaLayoutTooltip {
  const view = (() => {
    switch (control) {
      case 'play':
        return playButtonView(state, context);
      case 'seek-backward':
        return seekButtonView(state, context, -Math.abs(seconds));
      case 'seek-forward':
        return seekButtonView(state, context, Math.abs(seconds));
      case 'captions':
        return captionsButtonView(state, context);
      case 'playback-rate':
        return playbackRateButtonView(state, context);
      case 'live':
        return liveButtonView(state, context);
      case 'remote':
        return remotePlaybackButtonView(state, context);
      case 'pip':
        return pipButtonView(state, context);
      case 'fullscreen':
        return fullscreenButtonView(state, context);
      case 'settings':
        return null;
    }
  })();
  if (!view) return { label: context.messages.get('settings') };
  return { label: view.label, shortcut: view.shortcut };
}

/**
 * The state slice that changes a layout's tooltip text or variant; the layout re-renders only
 * when it changes (time updates do not re-render the layout).
 */
export function mediaLayoutSlice(state: MediaState) {
  return {
    paused: state.paused,
    ended: state.ended,
    fullscreen: state.fullscreen,
    pictureInPicture: state.pictureInPicture,
    captionsShowing: state.captionsShowing,
    remotePlaybackState: state.remotePlaybackState,
    playbackRate: state.playbackRate,
    atLiveEdge: state.atLiveEdge,
    streamType: state.streamType,
    dvr: state.dvr,
  };
}
