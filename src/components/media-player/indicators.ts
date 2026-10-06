import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { PresenceController } from '../../foundation/presence.js';
import { Scheduler } from '../../foundation/services.js';
import type { MediaRequestDetail } from '../../foundation/media/events.js';
import type { MediaState } from '../../foundation/media/state.js';
import { mediaIcons, type MediaIconName } from '../../icons/media.js';
import { volumeIconSlot, type MediaButtonIcon, type MediaMarkers } from './button-state.js';
import { TpMediaElement, type MediaPlayerApi } from './context.js';
import {
  MEDIA_INDICATOR_CLOSE_DELAY,
  MEDIA_VOLUME_BOUNDARY_DELAY,
  indicatorActionIncluded,
  isSeekIndicatorAction,
  isVolumeIndicatorAction,
  nextSeekIndicatorState,
  parseIndicatorActions,
  registerMediaIndicator,
  showMediaIndicator,
  statusIndicatorDetails,
  volumeIndicatorDetails,
  type MediaIndicatorHandle,
  type MediaIndicatorStatus,
  type MediaInputAction,
  type MediaSeekIndicatorState,
  type MediaStatusDetails,
  type MediaVolumeIndicatorDetails,
} from './indicator-state.js';
import { applyMediaMarkers } from './media-button.js';
import { mediaOverlayStyles, mediaSurfacePreferenceStyles } from './styles.js';
import { TpIcon } from '../icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

const REQUEST_EVENT = 'tp-media-request';

function iconTemplate(icon: MediaButtonIcon): unknown {
  return [icon.slot, ...(icon.fallbackSlots ?? [])].reduceRight<unknown>(
    (inner, name) => html`<slot name=${name}>${inner}</slot>`,
    html`<tp-icon part="icon" .icon=${mediaIcons[icon.name]}></tp-icon>`,
  );
}

/**
 * Shared feedback indicator (Library mp-l-feedback; Video.js `InputIndicatorElement`):
 *
 * - Decorative: the host is always `aria-hidden`; announcements belong to the player's status
 *   region.
 * - It reacts only to key-binding and gesture requests (`tp-media-request` with reason `hotkey` or
 *   `gesture` that was not cancelled), using the media state snapshot taken when the request was
 *   proposed, before it executed.
 * - One indicator is visible per player; showing one closes the others. It closes after
 *   `close-delay` milliseconds (default 800).
 * - `actions` (space- or comma-separated request actions) filters what it reacts to.
 * - Presence: `data-open`, plus `data-starting-style`/`data-ending-style` from the shared
 *   presence owner while entering and leaving (motion role `indicator`).
 *
 * @csspart content - The indicator surface.
 * @csspart icon - The fallback icon.
 * @csspart value - The value or label text.
 */
export abstract class TpMediaIndicatorElement<P> extends TpMediaElement {
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    closeDelay: { type: Number, attribute: 'close-delay' },
    actions: { type: String },
  };

  static override styles = [
    TpElement.styles,
    mediaOverlayStyles,
    css`
      :host {
        display: grid;
        z-index: 2;
        pointer-events: none;
      }

      :host(:not([data-open], [data-ending-style])) {
        display: none;
      }

      [part~='content'] {
        display: inline-flex;
        align-items: center;
      }
    `,
    mediaSurfacePreferenceStyles("[part~='content']"),
  ];

  /** Milliseconds before the indicator closes. */
  closeDelay = MEDIA_INDICATOR_CLOSE_DELAY;
  /** Request actions this indicator reacts to (all supported actions when empty). */
  actions = '';

  readonly #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('[part~="content"]'),
  });
  readonly #handle: MediaIndicatorHandle = { close: () => this.close() };
  #scheduler: Scheduler | undefined;
  #cancelClose: (() => void) | undefined;
  #bound: { player: MediaPlayerApi; release: () => void } | undefined;
  #open = false;
  #payload: P | null = null;
  #markers = new Set<string>();

  /** Whether the indicator is showing (it may still be animating out after closing). */
  get open(): boolean {
    return this.#open;
  }

  /** The feedback currently (or last) shown. */
  get payload(): P | null {
    return this.#payload;
  }

  /** Closes the indicator now. */
  close(): void {
    this.#cancelClose?.();
    this.#cancelClose = undefined;
    if (!this.#open) return;
    this.#open = false;
    this.#presence.setPresent(false);
    this.closed();
    this.requestUpdate();
  }

  /** Feedback for a request from the pre-action `snapshot`; `null` ignores it. */
  protected abstract process(
    input: MediaInputAction,
    snapshot: MediaState,
    previous: P | null,
    open: boolean,
  ): P | null;

  /** Content for the payload. */
  protected abstract renderPayload(payload: P): unknown;

  /** Host markers for the payload. */
  protected abstract payloadMarkers(payload: P | null): MediaMarkers;

  /** Called after the indicator closes. */
  protected closed(): void {}

  /** Replaces the shown payload without reopening or restarting the close delay. */
  protected replacePayload(payload: P): void {
    this.#payload = payload;
    this.requestUpdate();
  }

  /** Inline host style for the payload (custom properties). */
  protected payloadStyle(payload: P | null): Readonly<Record<string, string | null>> {
    void payload;
    return {};
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('aria-hidden', 'true');
    this.#scheduler = new Scheduler(this.ownerDocument.defaultView ?? undefined);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unbind();
    this.#scheduler?.dispose();
    this.#scheduler = undefined;
    this.#cancelClose = undefined;
    this.#open = false;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#bind();
    const state = this.#presence.state;
    this.#markers = applyMediaMarkers(
      this,
      {
        'data-open': this.#open,
        'data-starting-style': state === 'starting',
        'data-ending-style': state === 'ending',
        ...this.payloadMarkers(this.#open || state === 'ending' ? this.#payload : null),
      },
      this.#markers,
    );
    for (const [name, value] of Object.entries(this.payloadStyle(this.#payload))) {
      if (value === null) this.style.removeProperty(name);
      else this.style.setProperty(name, value);
    }
  }

  protected override render() {
    const payload = this.#payload;
    if (!this.#presence.mounted || payload === null) return nothing;
    return html`<div part="content">${this.renderPayload(payload)}</div>`;
  }

  /** Handles one accepted input request (exposed for composition and tests). */
  handleInput(input: MediaInputAction, snapshot: MediaState): boolean {
    if (!indicatorActionIncluded(input.action, parseIndicatorActions(this.actions))) return false;
    const payload = this.process(input, snapshot, this.#payload, this.#open);
    if (payload === null) return false;
    this.#payload = payload;
    this.#open = true;
    this.#presence.setPresent(true);
    const player = this.player;
    if (player) showMediaIndicator(player, this.#handle);
    this.#cancelClose?.();
    const delay = Number.isFinite(this.closeDelay)
      ? Math.max(0, this.closeDelay)
      : MEDIA_INDICATOR_CLOSE_DELAY;
    this.#cancelClose = this.#scheduler?.timeout(() => {
      this.#cancelClose = undefined;
      this.close();
    }, delay);
    this.requestUpdate();
    return true;
  }

  #bind(): void {
    const player = this.player;
    if (this.#bound?.player === player) return;
    this.#unbind();
    const target = player as unknown as EventTarget | null;
    if (!player || !target || typeof target.addEventListener !== 'function') return;
    const listener = (event: Event) => {
      const detail = (event as CustomEvent<MediaRequestDetail>).detail;
      if (!detail || (detail.reason !== 'hotkey' && detail.reason !== 'gesture')) return;
      // The proposal is dispatched before the request executes: this is the pre-action snapshot.
      const snapshot = player.state;
      const repeat = (detail.sourceEvent as Partial<KeyboardEvent> | undefined)?.repeat === true;
      // Other listeners may still cancel the proposal; decide once dispatch has finished.
      queueMicrotask(() => {
        if (event.defaultPrevented || !this.isConnected || this.player !== player) return;
        this.handleInput(
          { action: detail.action, value: detail.value, reason: detail.reason as 'hotkey', repeat },
          snapshot,
        );
      });
    };
    target.addEventListener(REQUEST_EVENT, listener);
    const unregister = registerMediaIndicator(player, this.#handle);
    this.#bound = {
      player,
      release: () => {
        target.removeEventListener(REQUEST_EVENT, listener);
        unregister();
      },
    };
  }

  #unbind(): void {
    this.#bound?.release();
    this.#bound = undefined;
  }
}

const STATUS_ICONS: Readonly<Record<MediaIndicatorStatus, MediaIconName>> = {
  play: 'play',
  pause: 'pause',
  'volume-off': 'volumeOff',
  'volume-low': 'volumeLow',
  'volume-high': 'volumeHigh',
  'captions-on': 'captionsOn',
  'captions-off': 'captionsOff',
  fullscreen: 'fullscreenEnter',
  'exit-fullscreen': 'fullscreenExit',
  pip: 'pipEnter',
  'exit-pip': 'pipExit',
};

/**
 * `tp-media-status-indicator`: icon and text feedback for play/pause, volume and mute, captions,
 * fullscreen and picture-in-picture key bindings and gestures. Marker `data-status`
 * (`play|pause|volume-off|volume-low|volume-high|captions-on|captions-off|fullscreen|
 * exit-fullscreen|pip|exit-pip`). The value part shows the volume percent, else the status label
 * (`statusPlaying`, `statusMuted`, …).
 *
 * @slot play - Icon per status; each status name is a slot (`pause`, `volume-off`, …).
 */
export class TpMediaStatusIndicator extends TpMediaIndicatorElement<MediaStatusDetails> {
  static tagName = 'tp-media-status-indicator';

  // A centered mark, not a frame-filling panel (Video.js PlaybackStatusIndicator).
  static override styles = [
    TpMediaIndicatorElement.styles,
    css`
      :host {
        place-items: center;
      }
    `,
  ];

  protected process(input: MediaInputAction, snapshot: MediaState): MediaStatusDetails | null {
    return statusIndicatorDetails(input, snapshot, this.mediaMessages, this.mediaLocale);
  }

  protected renderPayload(payload: MediaStatusDetails): unknown {
    // The icon is the feedback; text appears only for a value (volume percent). The label stays
    // in the player's announcer, as the indicator is decorative.
    return html`${iconTemplate({ slot: payload.status, name: STATUS_ICONS[payload.status] })}${
      payload.value === null ? nothing : html`<span part="value">${payload.value}</span>`
    }`;
  }

  protected payloadMarkers(payload: MediaStatusDetails | null): MediaMarkers {
    return { 'data-status': payload?.status ?? null };
  }
}

/**
 * `tp-media-seek-indicator`: direction and amount for seek key bindings and gestures. Repeated
 * steps in one direction accumulate while it is open (clamped to the media range); a
 * `seek-to-percent` shows the target time. Marker `data-direction` (`forward|backward`).
 *
 * @slot seek-forward - Forward icon.
 * @slot seek-backward - Backward icon.
 */
export class TpMediaSeekIndicator extends TpMediaIndicatorElement<MediaSeekIndicatorState> {
  static tagName = 'tp-media-seek-indicator';

  static override styles = [
    TpMediaIndicatorElement.styles,
    css`
      :host {
        place-items: center;
      }

      :host([data-direction='forward']) {
        justify-items: end;
      }

      :host([data-direction='backward']) {
        justify-items: start;
      }

      [part~='content'] {
        flex-direction: column;
      }
    `,
  ];

  protected process(
    input: MediaInputAction,
    snapshot: MediaState,
    previous: MediaSeekIndicatorState | null,
    open: boolean,
  ): MediaSeekIndicatorState | null {
    if (!isSeekIndicatorAction(input.action)) return null;
    return nextSeekIndicatorState(previous, open, input, snapshot, this.mediaLocale);
  }

  protected renderPayload(payload: MediaSeekIndicatorState): unknown {
    const backward = payload.direction === 'backward';
    return html`${iconTemplate(
        backward
          ? { slot: 'seek-backward', name: 'seekBackward' }
          : { slot: 'seek-forward', name: 'seekForward' },
      )}<span part="value">${payload.value}</span>`;
  }

  protected payloadMarkers(payload: MediaSeekIndicatorState | null): MediaMarkers {
    return { 'data-direction': payload?.direction ?? null };
  }
}

interface MediaVolumeIndicatorPayload extends MediaVolumeIndicatorDetails {
  readonly min: boolean;
  readonly max: boolean;
}

/**
 * `tp-media-volume-indicator`: level, fill and percent for volume and mute key bindings and
 * gestures. Markers: the four-level `data-level` (`off|low|medium|high`, the mute button's
 * vocabulary) and `data-min`/`data-max` for 300 ms after a step at a limit. The fill ratio is
 * published as `--tp-media-volume-fill` (a percentage).
 *
 * @slot volume-off - Icon when muted or at zero.
 * @slot volume-low - Icon below half volume.
 * @slot volume-medium - Icon at medium volume (falls back to `volume-high`).
 * @slot volume-high - Icon at high volume.
 * @csspart fill - The level bar.
 */
export class TpMediaVolumeIndicator extends TpMediaIndicatorElement<MediaVolumeIndicatorPayload> {
  static tagName = 'tp-media-volume-indicator';

  static override styles = [
    TpMediaIndicatorElement.styles,
    css`
      :host {
        place-items: start center;
      }

      [part~='fill'] {
        position: relative;
        flex: 1 1 auto;
        overflow: hidden;
      }

      [part~='fill']::after {
        content: '';
        position: absolute;
        inset-block: 0;
        inset-inline-start: 0;
        inline-size: var(--tp-media-volume-fill, 0%);
      }
    `,
  ];

  #cancelBoundary: (() => void) | undefined;
  #boundaryScheduler: Scheduler | undefined;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#boundaryScheduler = new Scheduler(this.ownerDocument.defaultView ?? undefined);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#boundaryScheduler?.dispose();
    this.#boundaryScheduler = undefined;
    this.#cancelBoundary = undefined;
  }

  protected process(
    input: MediaInputAction,
    snapshot: MediaState,
    previous: MediaVolumeIndicatorPayload | null,
    open: boolean,
  ): MediaVolumeIndicatorPayload | null {
    if (!isVolumeIndicatorAction(input.action)) return null;
    const details = volumeIndicatorDetails(input, snapshot, this.mediaLocale);
    if (!details) return null;
    if (!details.boundary) this.#clearBoundary();
    // A held key keeps the current limit marker instead of restarting it on every repeat.
    const keep = Boolean(details.boundary) && input.repeat && open && previous !== null;
    const show = Boolean(details.boundary) && !input.repeat;
    if (show) this.#scheduleBoundaryClear();
    return {
      ...details,
      min: keep ? previous!.min : show && details.boundary === 'min',
      max: keep ? previous!.max : show && details.boundary === 'max',
    };
  }

  protected override closed(): void {
    this.#clearBoundary();
  }

  protected renderPayload(payload: MediaVolumeIndicatorPayload): unknown {
    return html`${iconTemplate(volumeIconSlot(payload.level))}<span part="fill"></span
      ><span part="value">${payload.value}</span>`;
  }

  protected payloadMarkers(payload: MediaVolumeIndicatorPayload | null): MediaMarkers {
    return {
      'data-level': payload?.level ?? null,
      'data-min': payload?.min ?? false,
      'data-max': payload?.max ?? false,
    };
  }

  protected override payloadStyle(
    payload: MediaVolumeIndicatorPayload | null,
  ): Readonly<Record<string, string | null>> {
    return {
      '--tp-media-volume-fill': payload ? `${Math.round(payload.fill * 1000) / 10}%` : null,
    };
  }

  #scheduleBoundaryClear(): void {
    this.#cancelBoundary?.();
    this.#cancelBoundary = this.#boundaryScheduler?.timeout(() => {
      this.#cancelBoundary = undefined;
      const payload = this.payload;
      if (payload && (payload.min || payload.max)) {
        this.replacePayload({ ...payload, min: false, max: false });
      }
    }, MEDIA_VOLUME_BOUNDARY_DELAY);
  }

  #clearBoundary(): void {
    this.#cancelBoundary?.();
    this.#cancelBoundary = undefined;
  }
}
