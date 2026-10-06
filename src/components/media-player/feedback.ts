import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { Scheduler } from '../../foundation/services.js';
import type { TpOpenChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { MediaRequestAction, MediaRequestOptions } from '../../foundation/media/requests.js';
import { TpMediaElement, closeMediaPopups, type MediaPlayerApi } from './context.js';
import {
  MEDIA_BUFFERING_DELAY,
  errorDialogOpens,
  mediaErrorDialogText,
  mediaStalled,
} from './feedback-state.js';
import { mediaOverlayStyles, mediaScrimPreferenceStyles } from './styles.js';

type LooseRequest = (
  action: MediaRequestAction,
  value: unknown,
  options: MediaRequestOptions,
) => Promise<unknown>;

/**
 * `tp-media-buffering-indicator`: a decorative `tp-spinner` (empty label: no status region, no
 * announcement) shown after `delay` milliseconds (default 500) of `waiting` while not paused.
 * Marker: `data-visible`. Hidden (and not animating) otherwise.
 *
 * @csspart spinner - The composed Spinner.
 */
export class TpMediaBufferingIndicator extends TpMediaElement {
  static tagName = 'tp-media-buffering-indicator';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    delay: { type: Number },
  };

  static override styles = [
    TpElement.styles,
    mediaOverlayStyles,
    css`
      :host {
        display: grid;
        place-content: center;
        z-index: 2;
        pointer-events: none;
      }

      :host(:not([data-visible])) {
        display: none;
      }
    `,
    mediaScrimPreferenceStyles(':host'),
  ];

  /** Milliseconds of stalled playback before the indicator shows. */
  delay = MEDIA_BUFFERING_DELAY;

  readonly #stall = this.select((state) => mediaStalled(state), Object.is);
  #scheduler: Scheduler | undefined;
  #cancel: (() => void) | undefined;
  #visible = false;

  /** Whether the indicator is shown. */
  get visible(): boolean {
    return this.#visible;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#scheduler = new Scheduler(this.ownerDocument.defaultView ?? undefined);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
    this.#cancel = undefined;
    this.#visible = false;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const stalled = Boolean(this.player) && this.#stall.value;
    if (!stalled) {
      this.#cancel?.();
      this.#cancel = undefined;
      this.#visible = false;
      return;
    }
    if (this.#visible || this.#cancel) return;
    const delay = Number.isFinite(this.delay) ? Math.max(0, this.delay) : MEDIA_BUFFERING_DELAY;
    if (delay === 0 || !this.#scheduler) {
      this.#visible = true;
      return;
    }
    this.#cancel = this.#scheduler.timeout(() => {
      this.#cancel = undefined;
      this.#visible = this.#stall.value;
      this.requestUpdate();
    }, delay);
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-visible', this.#visible);
  }

  protected override render() {
    return this.#visible
      ? html`<tp-spinner part="spinner" label="" size="lg" aria-hidden="true"></tp-spinner>`
      : nothing;
  }
}

/**
 * `tp-media-error-dialog`: composes `tp-alert-dialog` for media errors (Library mp-l-feedback).
 *
 * - Opens while the store `error` is non-null, except `MEDIA_ERR_ABORTED` (code 1).
 * - Title `errorTitle`; the description is the code's `error*` message, else the error's own
 *   message, else `errorUnexpected`.
 * - `dismiss` (the Alert dialog cancel action, also Escape) requests `dismiss-error`; the dialog
 *   closes when the store error clears. With `show-retry`, `retry` clears the error, reloads the
 *   media (`load()`) and requests `play`.
 * - While open: the Alert dialog uses container modality (`modality="container"`) with the player
 *   container. It renders inside the container (so it stays visible in container fullscreen),
 *   the container's other content is inert, focus is trapped in the dialog, the page outside the
 *   player stays interactive and its scroll is not locked. Player hotkeys and gestures are also
 *   locked (`lockInteractions`), open player popups close, and focus returns to the previously
 *   focused control when it closes (unless the user has moved focus outside the player).
 * - Marker: `data-open`.
 *
 * @csspart dialog - The composed Alert dialog element.
 * @csspart dismiss - The dismiss action (`tp-button`).
 * @csspart retry - The retry action (`tp-button`).
 */
export class TpMediaErrorDialog extends TpMediaElement {
  static tagName = 'tp-media-error-dialog';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    showRetry: { type: Boolean, attribute: 'show-retry' },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: contents;
      }
    `,
  ];

  /** Offer a retry action that reloads the media and plays. */
  showRetry = false;

  readonly #error = this.select((state) => state.error);
  #lock: { player: MediaPlayerApi; release: () => void } | undefined;
  #open = false;

  /** Whether the dialog is open. */
  get open(): boolean {
    return this.#open;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseLock();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const open = Boolean(this.player) && errorDialogOpens(this.#error.value);
    const player = this.player;
    if (open && player && this.#lock?.player !== player) {
      this.#releaseLock();
      this.#lock = { player, release: player.lockInteractions() };
      // Error while a menu is open: the menu closes and the dialog takes over.
      closeMediaPopups(player as unknown as ParentNode, 'imperative-action');
    } else if (!open) this.#releaseLock();
    this.#open = open;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-open', this.#open);
  }

  protected override render() {
    const text = mediaErrorDialogText(this.#error.value, this.mediaMessages);
    return html`<tp-alert-dialog
      part="dialog"
      modality="container"
      .container=${this.player?.container ?? null}
      .open=${this.#open}
      .label=${text.title}
      .description=${text.description}
      .finalFocus=${'previous'}
      @tp-open-change=${this.#openChange}
      ><tp-button part="dismiss" slot="cancel" variant="outline"
        >${this.message('dismiss')}</tp-button
      >${
        this.showRetry
          ? html`<tp-button part="retry" slot="confirm" @click=${this.#retry}
              >${this.message('retry')}</tp-button
            >`
          : nothing
      }</tp-alert-dialog
    >`;
  }

  #request(
    action: MediaRequestAction,
    event: Event,
    reason: ChangeReason = 'trigger-press',
  ): Promise<unknown> {
    const request = this.request as unknown as LooseRequest;
    return request
      .call(this, action, undefined, { reason, sourceEvent: event })
      .catch(() => undefined);
  }

  /** The Alert dialog proposes closing (dismiss action, Escape): clear the store error. */
  #openChange = (event: Event): void => {
    // The composed dialog's proposal stays internal; the store error is the public state.
    event.stopPropagation();
    const change = event as TpOpenChangeEvent;
    if (change.detail.value || !this.#open) return;
    // The dialog's reason is kept: `close-action` (dismiss), `escape-key`, `close-watcher`.
    void this.#request('dismiss-error', change.detail.sourceEvent ?? event, change.detail.reason);
  };

  #retry = async (event: MouseEvent): Promise<void> => {
    if (event.defaultPrevented) return;
    await this.#request('dismiss-error', event);
    this.player?.media?.load?.();
    await this.#request('play', event);
  };

  #releaseLock(): void {
    this.#lock?.release();
    this.#lock = undefined;
  }
}
