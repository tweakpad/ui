import type { ChangeReason } from '../types.js';
import type { Diagnostic } from '../services.js';
import type { MediaRequestAction } from './requests.js';
import type { MediaErrorState, MediaState, MediaStateKey } from './state.js';
import type { MediaTarget } from './target.js';

/** Media player events (`sec-1810-media-player` events table). All bubble and are composed. */
export const MEDIA_REQUEST_EVENT = 'tp-media-request';
export const MEDIA_REQUEST_FAILED_EVENT = 'tp-media-request-failed';
export const MEDIA_STATE_CHANGE_EVENT = 'tp-media-state-change';
export const MEDIA_ERROR_EVENT = 'tp-media-error';
export const MEDIA_ATTACH_EVENT = 'tp-media-attach';
export const MEDIA_DETACH_EVENT = 'tp-media-detach';
/** Custom media registration request (`mp-f-discovery`). */
export const MEDIA_REGISTER_EVENT = 'tp-media-register';

export interface MediaRequestDetail<A extends MediaRequestAction = MediaRequestAction> {
  readonly action: A;
  readonly value: unknown;
  readonly reason: ChangeReason;
  /** The originating DOM event, or a synthetic programmatic source. */
  readonly sourceEvent: Event;
  readonly trigger?: Element;
}

export interface MediaRequestFailedDetail {
  readonly action: MediaRequestAction;
  readonly value: unknown;
  readonly reason: ChangeReason;
  readonly error: unknown;
}

export interface MediaStateChangeDetail {
  readonly changed: readonly MediaStateKey[];
  readonly state: MediaState;
  readonly previousState: MediaState;
  readonly reason: ChangeReason;
}

export interface MediaErrorDetail {
  readonly error: MediaErrorState;
}

/** The store's attachment target. */
export interface MediaAttachTarget {
  readonly media: MediaTarget;
  readonly container: HTMLElement | null;
}

export type MediaAttachDetail = MediaAttachTarget;

const init = <T>(detail: T, cancelable = false): CustomEventInit<T> => ({
  bubbles: true,
  composed: true,
  cancelable,
  detail,
});

/** Cancelable request proposal; `preventDefault()` stops the request. */
export class TpMediaRequestEvent extends CustomEvent<MediaRequestDetail> {
  static readonly eventName = MEDIA_REQUEST_EVENT;
  constructor(detail: MediaRequestDetail) {
    super(MEDIA_REQUEST_EVENT, init(detail, true));
  }
}

export class TpMediaRequestFailedEvent extends CustomEvent<MediaRequestFailedDetail> {
  static readonly eventName = MEDIA_REQUEST_FAILED_EVENT;
  constructor(detail: MediaRequestFailedDetail) {
    super(MEDIA_REQUEST_FAILED_EVENT, init(detail));
  }
}

export class TpMediaStateChangeEvent extends CustomEvent<MediaStateChangeDetail> {
  static readonly eventName = MEDIA_STATE_CHANGE_EVENT;
  constructor(detail: MediaStateChangeDetail) {
    super(MEDIA_STATE_CHANGE_EVENT, init(detail));
  }
}

export class TpMediaErrorEvent extends CustomEvent<MediaErrorDetail> {
  static readonly eventName = MEDIA_ERROR_EVENT;
  constructor(detail: MediaErrorDetail) {
    super(MEDIA_ERROR_EVENT, init(detail));
  }
}

export class TpMediaAttachEvent extends CustomEvent<MediaAttachDetail> {
  static readonly eventName = MEDIA_ATTACH_EVENT;
  constructor(detail: MediaAttachDetail) {
    super(MEDIA_ATTACH_EVENT, init(detail));
  }
}

export class TpMediaDetachEvent extends CustomEvent<MediaAttachDetail> {
  static readonly eventName = MEDIA_DETACH_EVENT;
  constructor(detail: MediaAttachDetail) {
    super(MEDIA_DETACH_EVENT, init(detail));
  }
}

export interface MediaRegisterDetail {
  readonly media: MediaTarget;
  /** Set by the acknowledging provider; releases only this registration. */
  release: (() => void) | undefined;
}

/**
 * Dispatched by a custom media element on connection. A provider acknowledges it with
 * `preventDefault()` and sets `detail.release`; the element calls that release on disconnect.
 */
export class TpMediaRegisterEvent extends CustomEvent<MediaRegisterDetail> {
  static readonly eventName = MEDIA_REGISTER_EVENT;
  constructor(media: MediaTarget) {
    super(MEDIA_REGISTER_EVENT, init<MediaRegisterDetail>({ media, release: undefined }, true));
  }
}

/**
 * Registers a custom media element with its nearest provider. Returns the provider's release, or
 * `undefined` when no provider acknowledged the request.
 */
export function requestMediaRegistration(
  element: EventTarget & MediaTarget,
): (() => void) | undefined {
  const event = new TpMediaRegisterEvent(element);
  element.dispatchEvent(event);
  return event.defaultPrevented ? event.detail.release : undefined;
}

/** Notifications a media store reports to its host. */
export interface MediaStoreHooks {
  /** Dispatches the cancelable proposal; returns `false` when it was cancelled. */
  dispatchRequest(detail: MediaRequestDetail): boolean;
  requestFailed(detail: MediaRequestFailedDetail): void;
  stateChange(detail: MediaStateChangeDetail): void;
  error(detail: MediaErrorDetail): void;
  attach(detail: MediaAttachDetail): void;
  detach(detail: MediaAttachDetail): void;
  diagnostic(diagnostic: Diagnostic): void;
}

/**
 * Store hooks that dispatch the media events on `host` (the player root). Diagnostics go to
 * `onDiagnostic` (for example, the root's `tp-diagnostic` reporter), else `console.warn`.
 */
export function createMediaEventHooks(
  host: EventTarget,
  onDiagnostic: (diagnostic: Diagnostic) => void = (diagnostic) =>
    console.warn(`[tp-media] ${diagnostic.code}: ${diagnostic.message}`, diagnostic.context),
): MediaStoreHooks {
  return {
    dispatchRequest: (detail) => host.dispatchEvent(new TpMediaRequestEvent(detail)),
    requestFailed: (detail) => void host.dispatchEvent(new TpMediaRequestFailedEvent(detail)),
    stateChange: (detail) => void host.dispatchEvent(new TpMediaStateChangeEvent(detail)),
    error: (detail) => void host.dispatchEvent(new TpMediaErrorEvent(detail)),
    attach: (detail) => void host.dispatchEvent(new TpMediaAttachEvent(detail)),
    detach: (detail) => void host.dispatchEvent(new TpMediaDetachEvent(detail)),
    diagnostic: onDiagnostic,
  };
}
