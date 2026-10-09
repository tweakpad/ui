import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { DelayGroup } from '../../foundation/delay-group.js';
import { TpElement } from '../../foundation/element.js';
import type { KeyShortcut } from '../../foundation/key-bindings.js';

import { TpMediaElement, mediaPopupScopeBrand, type MediaPlayerApi } from './context.js';
import {
  mediaLayoutSlice,
  mediaLayoutTooltip,
  mediaVideoLayoutVariant,
  parseMediaLayoutHide,
  type MediaLayoutControl,
  type MediaLayoutTooltipControl,
  type MediaVideoLayoutVariant,
} from './layout-state.js';
import { DEFAULT_SEEK_STEP } from './player.js';

import { TpKeyHint } from '../key-hint/key-hint.js';
import { TpKeyHintGroup } from '../key-hint/key-hint-group.js';
import { TpMediaPoster } from './poster.js';
import { TpMediaTitle } from './title.js';
import { TpMediaBufferingIndicator } from './feedback.js';
import { TpMediaStatusIndicator } from './indicators.js';
import { TpMediaSeekIndicator } from './indicators.js';
import { TpMediaVolumeIndicator } from './indicators.js';
import { TpMediaControls } from './controls.js';
import { TpMediaControlsGroup } from './controls.js';
import { TpMediaErrorDialog } from './feedback.js';
import { TpTooltip } from '../tooltip/tooltip.js';
import { TpMediaPlayButton } from './buttons.js';
import { TpMediaSeekButton } from './buttons.js';
import { TpMediaVolumePopover } from './volume-popover.js';
import { TpMediaLiveButton } from './buttons.js';
import { TpMediaTime } from './time.js';
import { TpMediaTimeSlider } from './time-slider.js';
import { TpMediaTimeSliderPreview } from './preview.js';
import { TpMediaThumbnail } from './thumbnail.js';
import { TpMediaChapterTitle } from './chapter-title.js';
import { TpMediaCaptionsButton } from './buttons.js';
import { TpMenu } from '../menu/menu.js';
import { TpMediaCaptionsRadioGroup } from './radio-groups.js';
import { TpMediaSettingsMenu } from './settings-menu.js';
import { TpMediaRemotePlaybackButton } from './buttons.js';
import { TpMediaPipButton } from './buttons.js';
import { TpMediaFullscreenButton } from './buttons.js';
import { TpMediaPlaybackRateButton } from './buttons.js';
import { TpMediaPlaybackRateRadioGroup } from './radio-groups.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** Tooltip delay group of a layout (Video.js `Tooltip.Provider`: 600 ms, 400 ms group rest). */
export const MEDIA_LAYOUT_TOOLTIP_DELAY = 600;
export const MEDIA_LAYOUT_TOOLTIP_REST = 400;

interface TooltipRegistration {
  element: HTMLElement;
  release: () => void;
}

/** Structure shared by both layouts: regions, control groups and tooltip labels. */
const layoutStyles = css`
  .region {
    display: flex;
    align-items: center;
    gap: var(--tp-space-1);
    min-inline-size: 0;
  }

  tp-media-controls-group.time {
    flex: 1 1 auto;
    min-inline-size: 0;
    gap: var(--tp-space-3);
    padding-inline: var(--tp-space-1);
    container: tp-media-time / inline-size;
  }

  /* The timeline is chronological left-to-right; its clocks follow it in RTL. */
  :host(:dir(rtl)) .time {
    flex-direction: row-reverse;
  }

  .time tp-media-time-slider {
    flex: 1 1 auto;
  }

  /* A narrow time group keeps the slider; its clocks (not the preview's pointer time) hide. */
  @container tp-media-time (width < 16rem) {
    .time tp-media-time:not([type='pointer']) {
      display: none;
    }
  }

  .spacer {
    flex: 1 1 auto;
  }
`;

/**
 * Base of the preset layouts (Library mp-l-layouts). A layout is placed by the author inside a
 * `tp-media-player` (or its `tp-media-container`), next to the media. Its constituents render in
 * its shadow root and resolve their player through the composed tree, so no `player` reference
 * is needed; it is a popup scope (`mediaPopupScopeBrand`), so the player closes its menus and
 * tooltips on idle hide and fullscreen entry.
 *
 * Every built-in button is wrapped in a visual-only `tp-tooltip` (`describes="none"`: the
 * button's name already carries the text, and its shortcut is published as `aria-keyshortcuts`)
 * that shows the button's state-dependent label and its key binding as a `tp-key-hint`. All
 * tooltips of a layout share one `TooltipProvider` (600 ms delay, 400 ms group rest).
 */
export abstract class TpMediaLayoutElement extends TpMediaElement {
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpKeyHint, TpKeyHintGroup];
  }
  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    hide: { type: String },
    seekButtons: { type: Boolean, attribute: 'seek-buttons', reflect: true },
  };

  readonly [mediaPopupScopeBrand] = true as const;

  /** Built-in controls to omit (token list, e.g. `hide="pip remote"`). */
  hide = '';
  /** Add seek backward/forward buttons (the player `seek-step`). */
  seekButtons = false;

  /** The layout's tooltip delay group (one per layout). */
  readonly tooltipProvider = new DelayGroup({
    openDelay: MEDIA_LAYOUT_TOOLTIP_DELAY,
    restTimeout: MEDIA_LAYOUT_TOOLTIP_REST,
  });

  protected readonly layoutState = this.select(mediaLayoutSlice);
  #hidden: ReadonlySet<MediaLayoutControl> = new Set();
  #diagnosed = new Set<string>();
  #registrations = new Map<TpTooltip, TooltipRegistration>();
  #menuLocks = new Map<TpMenu, { player: MediaPlayerApi; release: () => void }>();
  #attachWatch: { player: MediaPlayerApi; release: () => void } | undefined;

  /** The built-in controls currently omitted through `hide`. */
  get hiddenControls(): ReadonlySet<MediaLayoutControl> {
    return this.#hidden;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    for (const registration of this.#registrations.values()) registration.release();
    this.#registrations.clear();
    for (const lock of this.#menuLocks.values()) lock.release();
    this.#menuLocks.clear();
    this.#attachWatch?.release();
    this.#attachWatch = undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('hide') || !this.hasUpdated) {
      const { hidden, unknown } = parseMediaLayoutHide(this.hide);
      this.#hidden = hidden;
      for (const token of unknown) {
        if (this.#diagnosed.has(token)) continue;
        this.#diagnosed.add(token);
        this.diagnose(
          'media-layout-hide-token',
          `<${this.localName}> hide="${token}" names no built-in control.`,
        );
      }
    }
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#watchAttach();
    this.syncTooltipTriggers();
    this.#syncMenuLocks();
  }

  /** Surfaces portal into the container, which the player binds when it attaches media. */
  #watchAttach(): void {
    const player = this.player;
    if (this.#attachWatch?.player === player) return;
    this.#attachWatch?.release();
    this.#attachWatch = undefined;
    const target = player as unknown as EventTarget | null;
    if (!player || typeof target?.addEventListener !== 'function') return;
    const update = () => this.requestUpdate();
    for (const type of ['tp-media-attach', 'tp-media-detach'])
      target.addEventListener(type, update);
    this.#attachWatch = {
      player,
      release: () => {
        for (const type of ['tp-media-attach', 'tp-media-detach'])
          target.removeEventListener(type, update);
      },
    };
  }

  /** Whether a built-in control renders (not listed in `hide`). */
  protected shows(control: MediaLayoutControl): boolean {
    return !this.#hidden.has(control);
  }

  /** The absolute seek step for seek buttons and their labels. */
  protected get seekSeconds(): number {
    return Math.abs(this.player?.seekStep ?? DEFAULT_SEEK_STEP);
  }

  /** Tooltip text of a built-in button for the current state. */
  protected tooltipContent(control: MediaLayoutTooltipControl): unknown {
    const player = this.player;
    void this.layoutState.value;
    const tip = mediaLayoutTooltip(
      control,
      this.mediaState,
      {
        messages: this.mediaMessages,
        locale: this.mediaLocale,
        capability: (action) => player?.requestAvailability(action) ?? 'unavailable',
      },
      this.seekSeconds,
    );
    const shortcut = tip.shortcut
      ? this.shortcut(tip.shortcut.action, tip.shortcut.value)
      : undefined;
    // One projected element keeps the dynamic text together when the Tooltip portals it.
    return html`<span
      data-media-tooltip-label
      style="display: inline-flex; align-items: center; gap: var(--tp-space-2)"
      >${tip.label}${keyHint(shortcut)}</span
    >`;
  }

  /**
   * Tooltips whose trigger is not their slotted child (a Menu trigger, the settings button):
   * subclasses return each tooltip with its current trigger element.
   */
  protected registeredTooltipTriggers(): ReadonlyArray<
    readonly [TpTooltip | null | undefined, HTMLElement | null | undefined]
  > {
    return [];
  }

  /** Registers (or re-registers) the triggers named by `registeredTooltipTriggers()`. */
  protected syncTooltipTriggers(): void {
    const wanted = new Map<TpTooltip, HTMLElement>();
    for (const [tooltip, element] of this.registeredTooltipTriggers())
      if (tooltip && element) wanted.set(tooltip, element);
    for (const [tooltip, registration] of this.#registrations)
      if (wanted.get(tooltip) !== registration.element) {
        registration.release();
        this.#registrations.delete(tooltip);
      }
    for (const [tooltip, element] of wanted)
      if (!this.#registrations.has(tooltip))
        this.#registrations.set(tooltip, { element, release: tooltip.registerTrigger(element) });
  }

  /** A layout-owned Menu opened or closed: open menus hold a `menu` controls lock. */
  protected menuChanged = (): void => {
    queueMicrotask(() => this.#syncMenuLocks());
  };

  #syncMenuLocks(): void {
    const player = this.player;
    const menus = new Set(
      this.renderRoot
        ? [...this.renderRoot.querySelectorAll<TpMenu>('tp-menu[data-layout-menu]')]
        : [],
    );
    for (const [menu, lock] of this.#menuLocks)
      if (!menus.has(menu) || !menu.open || lock.player !== player) {
        lock.release();
        this.#menuLocks.delete(menu);
      }
    if (!player || !this.isConnected) return;
    for (const menu of menus)
      if (menu.open && !this.#menuLocks.has(menu))
        this.#menuLocks.set(menu, { player, release: player.requestControlsLock('menu') });
  }
}

/** A shortcut as Key hints: one key, or a group for a chord. */
function keyHint(shortcut: KeyShortcut | undefined): unknown {
  const keys = shortcut?.keys ?? [];
  if (!keys.length) return nothing;
  if (keys.length === 1) return html`<tp-key-hint key=${keys[0]!}></tp-key-hint>`;
  return html`<tp-key-hint-group
    >${keys.map((key) => html`<tp-key-hint key=${key}></tp-key-hint>`)}</tp-key-hint-group
  >`;
}

/**
 * `tp-media-video-layout`: the standard video player (Library mp-l-layouts; Video.js default video
 * and live video skins), composed only of media constituents and library components.
 *
 * - Overlays: poster; title (`top` region); buffering indicator (`center` region); status, seek
 *   and volume indicators; error dialog.
 * - Default gestures: when the player has no authored `gestures` attribute, the layout sets the
 *   player's `gestures` to `default` while it is connected (`gestures="none"` on the player opts
 *   out).
 * - Controls (`part="controls"`): a bottom bar (`part="bar"`) with the `bottom-start` region (play,
 *   optional seek buttons, volume popover), the time group (current time, time slider with a
 *   preview of thumbnail, chapter title and pointer time, remaining-time toggle) and the
 *   `bottom-end` region (captions button at `lg` and wider, settings menu); and a secondary group
 *   (`part="secondary"`: remote playback, picture-in-picture, fullscreen) in the top-right corner
 *   below `lg` and inline at the end of the bar from `lg`.
 * - Live variant (automatic from the stream type): `[play, live] [time slider with DVR] spacer
 *   [volume, captions menu]` plus the secondary group inline; there is no remaining time or
 *   settings menu.
 * - Responsive through container queries on the layout box, which fills the player container
 *   (`lg` = 32rem); the time group hides its clocks below 16rem.
 *
 * @slot top - Replaces the title.
 * @slot center - Replaces the buffering indicator.
 * @slot bottom-start - Replaces play, seek and volume (live: play and live).
 * @slot bottom-end - Replaces captions and settings (live: volume and captions).
 * @csspart poster - The composed Poster.
 * @csspart top - The top region.
 * @csspart center - The center region.
 * @csspart controls - The composed Controls region.
 * @csspart bar - The bottom bar (a Controls group).
 * @csspart bottom-start - The bar's start region.
 * @csspart time - The time group.
 * @csspart bottom-end - The bar's end region.
 * @csspart secondary - The secondary group.
 */
export class TpMediaVideoLayout extends TpMediaLayoutElement {
  static tagName = 'tp-media-video-layout';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpMediaPoster,
      TpMediaTitle,
      TpMediaBufferingIndicator,
      TpMediaStatusIndicator,
      TpMediaSeekIndicator,
      TpMediaVolumeIndicator,
      TpMediaControls,
      TpMediaControlsGroup,
      TpMediaErrorDialog,
      TpTooltip,
      TpMediaPlayButton,
      TpMediaSeekButton,
      TpMediaVolumePopover,
      TpMediaLiveButton,
      TpMediaTime,
      TpMediaTimeSlider,
      TpMediaTimeSliderPreview,
      TpMediaThumbnail,
      TpMediaChapterTitle,
      TpMediaCaptionsButton,
      TpMenu,
      TpMediaCaptionsRadioGroup,
      TpMediaSettingsMenu,
      TpMediaRemotePlaybackButton,
      TpMediaPipButton,
      TpMediaFullscreenButton,
    ];
  }

  static override styles = [
    TpElement.styles,
    layoutStyles,
    css`
      :host {
        position: absolute;
        inset: 0;
        display: block;
        pointer-events: none;
        container: tp-media-layout / size;
      }

      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }

      .top {
        position: absolute;
        inset-block-start: 0;
        inset-inline: 0;
        z-index: 2;
        display: flex;
        align-items: flex-start;
        pointer-events: none;
      }

      .center {
        position: absolute;
        inset: 0;
        z-index: 2;
        display: grid;
        place-items: center;
        pointer-events: none;
      }

      .top ::slotted(*),
      .center ::slotted(*) {
        pointer-events: auto;
      }

      tp-media-controls {
        display: flex;
        align-items: center;
        gap: var(--tp-space-1);
      }

      .bar {
        flex: 1 1 auto;
        min-inline-size: 0;
      }

      /* Below lg the secondary group floats in the top corner of the container: its bottom edge
     sits one spacing step below the container top, then it moves down by its own height. */
      .secondary {
        position: absolute;
        inset-inline-end: var(--tp-space-2);
        inset-block-end: calc(100cqb - var(--tp-space-2));
        translate: 0 100%;
      }

      .secondary[data-inline] {
        position: static;
        translate: none;
      }

      .captions {
        display: none;
      }

      .captions[data-live] {
        display: contents;
      }

      @container tp-media-layout (width >= 32rem) {
        .secondary {
          position: static;
          translate: none;
        }

        .captions {
          display: contents;
        }
      }
    `,
  ];

  #gestures: (HTMLElement & { gestures: string }) | undefined;
  #captionsTooltip: TpTooltip | undefined;
  #captionsButton: HTMLElement | undefined;
  #settingsTooltip: TpTooltip | undefined;
  #settingsMenu: TpMediaSettingsMenu | undefined;

  /** The current variant (`on-demand`, `live`, `live-dvr`). */
  get variant(): MediaVideoLayoutVariant {
    return mediaVideoLayoutVariant(this.layoutState.value);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#restoreGestures();
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.#applyGestures();
    // The settings trigger renders with the settings menu; register its tooltip afterwards.
    const settings = this.#settingsMenu;
    if (settings && !settings.trigger)
      void settings.updateComplete.then(() => this.syncTooltipTriggers());
  }

  protected override registeredTooltipTriggers() {
    return [
      [this.#captionsTooltip, this.#captionsButton],
      [this.#settingsTooltip, this.#settingsMenu?.trigger],
    ] as const;
  }

  protected override render() {
    const variant = this.variant;
    const live = variant !== 'on-demand';
    return html`<tp-media-poster part="poster"></tp-media-poster>
      <div class="top" part="top">
        <slot name="top"><tp-media-title></tp-media-title></slot>
      </div>
      <div class="center" part="center">
        <slot name="center"><tp-media-buffering-indicator></tp-media-buffering-indicator></slot>
      </div>
      <tp-media-status-indicator></tp-media-status-indicator>
      <tp-media-seek-indicator></tp-media-seek-indicator>
      <tp-media-volume-indicator></tp-media-volume-indicator>
      <tp-media-controls part="controls">
        <tp-media-controls-group class="bar" part="bar">
          <div class="region" part="bottom-start">
            <slot name="bottom-start">${live ? this.#liveStart() : this.#start()}</slot>
          </div>
          ${variant === 'live' ? nothing : this.#time(live)}
          ${live ? html`<div class="spacer" aria-hidden="true"></div>` : nothing}
          <div class="region" part="bottom-end">
            <slot name="bottom-end">${live ? this.#liveEnd() : this.#end()}</slot>
          </div>
        </tp-media-controls-group>
        <tp-media-controls-group class="secondary" part="secondary" ?data-inline=${live}
          >${this.#secondary()}</tp-media-controls-group
        >
      </tp-media-controls>
      <tp-media-error-dialog></tp-media-error-dialog>`;
  }

  #play() {
    if (!this.shows('play')) return nothing;
    return html`<tp-tooltip
      data-control="play"
      describes="none"
      .provider=${this.tooltipProvider}
      .container=${this.player?.container ?? null}
      ><tp-media-play-button slot="trigger"></tp-media-play-button>${this.tooltipContent(
        'play',
      )}</tp-tooltip
    >`;
  }

  #seek() {
    if (!this.seekButtons || !this.shows('seek')) return nothing;
    const seconds = this.seekSeconds;
    return html`<tp-tooltip
        data-control="seek-backward"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ><tp-media-seek-button slot="trigger" seconds=${-seconds}></tp-media-seek-button
        >${this.tooltipContent('seek-backward')}</tp-tooltip
      ><tp-tooltip
        data-control="seek-forward"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ><tp-media-seek-button slot="trigger" seconds=${seconds}></tp-media-seek-button
        >${this.tooltipContent('seek-forward')}</tp-tooltip
      >`;
  }

  #volume() {
    return this.shows('volume')
      ? html`<tp-media-volume-popover></tp-media-volume-popover>`
      : nothing;
  }

  #start() {
    return html`${this.#play()}${this.#seek()}${this.#volume()}`;
  }

  #liveStart() {
    return html`${this.#play()}${
      this.shows('live')
        ? html`<tp-tooltip
            data-control="live"
            describes="none"
            .provider=${this.tooltipProvider}
            .container=${this.player?.container ?? null}
            ><tp-media-live-button slot="trigger"></tp-media-live-button>${this.tooltipContent(
              'live',
            )}</tp-tooltip
          >`
        : nothing
    }`;
  }

  #time(live: boolean) {
    const current = this.shows('current-time') && !live;
    const slider = this.shows('time-slider');
    const remaining = this.shows('remaining-time') && !live;
    if (!current && !slider && !remaining) return nothing;
    return html`<tp-media-controls-group class="time" part="time">
      ${current ? html`<tp-media-time type="current"></tp-media-time>` : nothing}
      ${
        slider
          ? html`<tp-media-time-slider>
              <tp-media-time-slider-preview>
                <tp-media-thumbnail></tp-media-thumbnail>
                <tp-media-chapter-title></tp-media-chapter-title>
                <tp-media-time type="pointer"></tp-media-time>
              </tp-media-time-slider-preview>
            </tp-media-time-slider>`
          : nothing
      }
      ${remaining ? html`<tp-media-time type="remaining" toggle></tp-media-time>` : nothing}
    </tp-media-controls-group>`;
  }

  #captions(menu: boolean) {
    if (!this.shows('captions')) {
      this.#captionsTooltip = undefined;
      this.#captionsButton = undefined;
      return nothing;
    }
    if (!menu) {
      this.#captionsTooltip = undefined;
      this.#captionsButton = undefined;
      return html`<tp-tooltip
        class="captions"
        data-control="captions"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ><tp-media-captions-button slot="trigger"></tp-media-captions-button>${this.tooltipContent(
          'captions',
        )}</tp-tooltip
      >`;
    }
    // Live: the captions button opens a captions menu (no settings menu in the live variant).
    return html`<tp-menu
        class="captions"
        data-live
        data-layout-menu
        side="top"
        .container=${this.player?.container ?? null}
        @tp-open-change-complete=${this.menuChanged}
        ><tp-media-captions-button
          slot="trigger"
          ${ref((element) => {
            this.#captionsButton = element as HTMLElement | undefined;
          })}
        ></tp-media-captions-button
        ><tp-media-captions-radio-group></tp-media-captions-radio-group></tp-menu
      ><tp-tooltip
        data-control="captions"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ${ref((element) => {
          this.#captionsTooltip = element as TpTooltip | undefined;
        })}
        >${this.tooltipContent('captions')}</tp-tooltip
      >`;
  }

  #settings() {
    if (!this.shows('settings')) {
      this.#settingsMenu = undefined;
      this.#settingsTooltip = undefined;
      return nothing;
    }
    return html`<tp-media-settings-menu
        ${ref((element) => {
          this.#settingsMenu = element as TpMediaSettingsMenu | undefined;
        })}
      ></tp-media-settings-menu
      ><tp-tooltip
        data-control="settings"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ${ref((element) => {
          this.#settingsTooltip = element as TpTooltip | undefined;
        })}
        >${this.tooltipContent('settings')}</tp-tooltip
      >`;
  }

  #end() {
    return html`${this.#captions(false)}${this.#settings()}`;
  }

  #liveEnd() {
    this.#settingsMenu = undefined;
    this.#settingsTooltip = undefined;
    return html`${this.#volume()}${this.#captions(true)}`;
  }

  #secondary() {
    const button = (control: 'remote' | 'pip' | 'fullscreen') => {
      if (!this.shows(control)) return nothing;
      const trigger =
        control === 'remote'
          ? html`<tp-media-remote-playback-button slot="trigger"></tp-media-remote-playback-button>`
          : control === 'pip'
            ? html`<tp-media-pip-button slot="trigger"></tp-media-pip-button>`
            : html`<tp-media-fullscreen-button slot="trigger"></tp-media-fullscreen-button>`;
      return html`<tp-tooltip
        data-control=${control}
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        >${trigger}${this.tooltipContent(control)}</tp-tooltip
      >`;
    };
    return html`${button('remote')}${button('pip')}${button('fullscreen')}`;
  }

  /** Video layouts enable the default gestures unless the player authored `gestures`. */
  #applyGestures(): void {
    const player = this.player as unknown as (HTMLElement & { gestures: string }) | null;
    if (this.#gestures === player) return;
    this.#restoreGestures();
    if (
      !player ||
      typeof player.hasAttribute !== 'function' ||
      player.hasAttribute('gestures') ||
      player.gestures !== 'none'
    )
      return;
    player.gestures = 'default';
    this.#gestures = player;
  }

  #restoreGestures(): void {
    const player = this.#gestures;
    this.#gestures = undefined;
    if (player && !player.hasAttribute('gestures') && player.gestures === 'default')
      player.gestures = 'none';
  }
}

/**
 * `tp-media-audio-layout`: the standard audio player (Library mp-l-layouts; Video.js default audio
 * skin). Controls are always visible (`visibility="always"`) and follow the page color scheme;
 * there is no poster, title, gestures or visual indicator.
 *
 * - `bottom-start` region: play (with the buffering indicator over it) and the seek −/+ buttons,
 *   shown from `lg`, or at every width with `seek-buttons`.
 * - `center` region (the time group): current time, the time slider (no thumbnails or chapters;
 *   the preview shows the pointer time and may overflow the track), the live button for live
 *   streams, and the remaining-time toggle.
 * - `bottom-end` region: the playback-rate button opening a speed menu, and the volume popover.
 * - The error dialog, and the player's default key bindings.
 *
 * @slot top - Content above the controls (empty by default).
 * @slot center - Replaces the time group.
 * @slot bottom-start - Replaces play and seek.
 * @slot bottom-end - Replaces speed and volume.
 * @csspart top - The top region.
 * @csspart controls - The composed Controls region.
 * @csspart bottom-start - The start group.
 * @csspart center - The time group.
 * @csspart bottom-end - The end group.
 */
export class TpMediaAudioLayout extends TpMediaLayoutElement {
  static tagName = 'tp-media-audio-layout';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpMediaControls,
      TpMediaControlsGroup,
      TpMediaErrorDialog,
      TpMediaBufferingIndicator,
      TpTooltip,
      TpMediaPlayButton,
      TpMediaSeekButton,
      TpMediaTime,
      TpMediaTimeSlider,
      TpMediaTimeSliderPreview,
      TpMediaLiveButton,
      TpMenu,
      TpMediaPlaybackRateButton,
      TpMediaPlaybackRateRadioGroup,
      TpMediaVolumePopover,
    ];
  }

  static override styles = [
    TpElement.styles,
    layoutStyles,
    css`
      :host {
        display: block;
        container: tp-media-layout / inline-size;
      }

      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }

      tp-media-controls {
        display: flex;
        align-items: center;
        gap: var(--tp-space-1);
      }

      .start,
      .end {
        flex: none;
      }

      .play {
        position: relative;
        display: inline-flex;
      }

      .seek {
        display: none;
      }

      :host([seek-buttons]) .seek {
        display: contents;
      }

      @container tp-media-layout (width >= 32rem) {
        .seek {
          display: contents;
        }
      }
    `,
  ];

  #rateTooltip: TpTooltip | undefined;
  #rateButton: HTMLElement | undefined;

  protected override registeredTooltipTriggers() {
    return [[this.#rateTooltip, this.#rateButton]] as const;
  }

  protected override render() {
    return html`<div class="top" part="top"><slot name="top"></slot></div>
      <tp-media-controls visibility="always" part="controls">
        <tp-media-controls-group class="start" part="bottom-start">
          <slot name="bottom-start">${this.#play()}${this.#seek()}</slot>
        </tp-media-controls-group>
        <tp-media-controls-group class="time" part="center">
          <slot name="center">${this.#time()}</slot>
        </tp-media-controls-group>
        <tp-media-controls-group class="end" part="bottom-end">
          <slot name="bottom-end">${this.#rate()}${this.#volume()}</slot>
        </tp-media-controls-group>
      </tp-media-controls>
      <tp-media-error-dialog></tp-media-error-dialog>`;
  }

  #play() {
    if (!this.shows('play')) return nothing;
    return html`<span class="play"
      ><tp-media-buffering-indicator></tp-media-buffering-indicator
      ><tp-tooltip
        data-control="play"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ><tp-media-play-button slot="trigger"></tp-media-play-button>${this.tooltipContent(
          'play',
        )}</tp-tooltip
      ></span
    >`;
  }

  #seek() {
    if (!this.shows('seek')) return nothing;
    const seconds = this.seekSeconds;
    return html`<tp-tooltip
        class="seek"
        data-control="seek-backward"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ><tp-media-seek-button slot="trigger" seconds=${-seconds}></tp-media-seek-button
        >${this.tooltipContent('seek-backward')}</tp-tooltip
      ><tp-tooltip
        class="seek"
        data-control="seek-forward"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ><tp-media-seek-button slot="trigger" seconds=${seconds}></tp-media-seek-button
        >${this.tooltipContent('seek-forward')}</tp-tooltip
      >`;
  }

  #time() {
    return html`${
      this.shows('current-time') ? html`<tp-media-time type="current"></tp-media-time>` : nothing
    }${
      this.shows('time-slider')
        ? html`<tp-media-time-slider show-chapters="false">
            <tp-media-time-slider-preview overflow="visible">
              <tp-media-time type="pointer"></tp-media-time>
            </tp-media-time-slider-preview>
          </tp-media-time-slider>`
        : nothing
    }${
      this.shows('live')
        ? html`<tp-tooltip
            data-control="live"
            describes="none"
            .provider=${this.tooltipProvider}
            .container=${this.player?.container ?? null}
            ><tp-media-live-button slot="trigger"></tp-media-live-button>${this.tooltipContent(
              'live',
            )}</tp-tooltip
          >`
        : nothing
    }${
      this.shows('remaining-time')
        ? html`<tp-media-time type="remaining" toggle></tp-media-time>`
        : nothing
    }`;
  }

  #rate() {
    if (!this.shows('settings')) {
      this.#rateTooltip = undefined;
      this.#rateButton = undefined;
      return nothing;
    }
    // Settings (speed): the rate button opens a speed menu instead of cycling.
    return html`<tp-menu
        data-layout-menu
        side="top"
        .container=${this.player?.container ?? null}
        @tp-open-change-complete=${this.menuChanged}
        ><tp-media-playback-rate-button
          slot="trigger"
          ${ref((element) => {
            this.#rateButton = element as HTMLElement | undefined;
          })}
        ></tp-media-playback-rate-button
        ><tp-media-playback-rate-radio-group></tp-media-playback-rate-radio-group></tp-menu
      ><tp-tooltip
        data-control="playback-rate"
        describes="none"
        .provider=${this.tooltipProvider}
        .container=${this.player?.container ?? null}
        ${ref((element) => {
          this.#rateTooltip = element as TpTooltip | undefined;
        })}
        >${this.tooltipContent('playback-rate')}</tp-tooltip
      >`;
  }

  #volume() {
    return this.shows('volume')
      ? html`<tp-media-volume-popover></tp-media-volume-popover>`
      : nothing;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-media-video-layout': TpMediaVideoLayout;
    'tp-media-audio-layout': TpMediaAudioLayout;
  }
}
