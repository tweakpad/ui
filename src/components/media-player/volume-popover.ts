import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import type { MediaAvailability } from '../../foundation/media/availability.js';
import type { ChangeReason } from '../../foundation/types.js';

import { TpMediaElement, type MediaPlayerApi } from './context.js';
import { mediaPopupSurface } from './styles.js';
import { TpMediaMuteButton } from './buttons.js';
import type { PartPresentation } from '../../presentation/resolver.js';
import { TpPopover } from '../popover/popover.js';
import { TpMediaVolumeSlider } from './volume-slider.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** Whether the volume popup can open: only while volume can be set (Video.js parity). */
export function volumePopupUsable(attached: boolean, availability: MediaAvailability): boolean {
  return attached && availability === 'available';
}

/**
 * `tp-media-volume-popover`: the volume preset (Library mp-l-volume-slider, mp-l-menus). A
 * `tp-popover` opening on hover (`open-delay` 200 ms, `close-delay` 100 ms, `side` top) whose
 * trigger is a `tp-media-mute-button` and whose popup holds a vertical `tp-media-volume-slider`.
 *
 * - While volume cannot be set (unsupported, or no media), the popover is not rendered: the
 *   mute button stands alone without popup ARIA, so muting still works (`data-availability`,
 *   `data-hidden` describe the popup).
 * - The popup portals into the player container and holds a `popover` controls lock while
 *   open; `open`/`setOpen(open, reason)` forward to the popover so the player closes it when
 *   controls hide (`idle`) and on fullscreen entry (`imperative-action`).
 *
 * @csspart popover - The composed Popover.
 * @csspart mute-button - The composed mute button.
 * @csspart volume-slider - The composed volume slider.
 */
/**
 * The volume popup is the media overlay surface (Video.js default skin volume popover): a
 * frosted pill around a short vertical bar slider. The surface variables come from the player
 * container (`mediaSurfaceVariables`), which also makes them opaque under user preferences.
 */
const volumePopupPresentation: PartPresentation = {
  'popover-content': {
    styleHook: {
      ...mediaPopupSurface,
      'border-radius': 'var(--tp-radius-full)',
      padding: 'var(--tp-space-3) var(--tp-space-1)',
      'min-inline-size': '0',
      '--_tp-slider-vertical-length': 'calc(var(--tp-spacing) * 22.5)',
    },
  },
};

export class TpMediaVolumePopover extends TpMediaElement {
  static tagName = 'tp-media-volume-popover';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpMediaMuteButton, TpPopover, TpMediaVolumeSlider];
  }

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    side: { type: String },
    openDelay: { type: Number, attribute: 'open-delay' },
    closeDelay: { type: Number, attribute: 'close-delay' },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        vertical-align: middle;
        flex: none;
      }

      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }
    `,
  ];

  /** Popup side relative to the mute button. */
  side: TpPopover['side'] = 'top';
  /** Hover delay before opening, in milliseconds. */
  openDelay = 200;
  /** Delay before closing after the pointer leaves, in milliseconds. */
  closeDelay = 100;

  readonly #volume = this.select((state) => state.volumeAvailability, Object.is);
  #owned: OwnedAttributes | undefined;
  #lock: { player: MediaPlayerApi; release: () => void } | undefined;

  /** The composed Popover (absent while volume cannot be set). */
  get popoverElement(): TpPopover | null {
    return this.renderRoot?.querySelector?.<TpPopover>('tp-popover') ?? null;
  }

  /** Whether the popup can open. */
  get usable(): boolean {
    return volumePopupUsable(this.player?.attached ?? false, this.#volume.value);
  }

  /** Whether the popup is open. */
  get open(): boolean {
    return this.popoverElement?.open === true;
  }

  /** Opens or closes the popup (forwarded to the composed Popover). */
  setOpen(open: boolean, reason: ChangeReason = 'programmatic'): boolean {
    return this.popoverElement?.setOpen(open, reason) ?? false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseLock();
    this.#owned?.dispose();
    this.#owned = undefined;
  }

  protected override render() {
    const mute = (slot: string | undefined) =>
      html`<tp-media-mute-button
        part="mute-button"
        slot=${slot ?? nothing}
      ></tp-media-mute-button>`;
    if (!this.usable) return mute(undefined);
    return html`<tp-popover
      part="popover"
      .partPresentation=${volumePopupPresentation}
      .container=${this.player?.container ?? null}
      .openOnHover=${true}
      .openDelay=${this.openDelay}
      .closeDelay=${this.closeDelay}
      .side=${this.side}
      @tp-open-change=${this.#openChanged}
      @tp-open-change-complete=${this.#openChanged}
      >${mute('trigger')}<tp-media-volume-slider
        part="volume-slider"
        orientation="vertical"
      ></tp-media-volume-slider
    ></tp-popover>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const owned = (this.#owned ??= new OwnedAttributes(this));
    owned.set('data-availability', this.player?.attached ? this.#volume.value : 'unavailable');
    owned.set('data-hidden', this.usable ? null : '');
    this.toggleAttribute('data-open', this.open);
    this.#syncLock();
  }

  #openChanged = (): void => {
    queueMicrotask(() => {
      this.#syncLock();
      this.toggleAttribute('data-open', this.open);
    });
  };

  /** The open popup holds a `popover` controls lock. */
  #syncLock(): void {
    const player = this.player;
    const open = this.isConnected && this.open && player !== null;
    if (open && this.#lock?.player === player) return;
    this.#releaseLock();
    if (open && player) this.#lock = { player, release: player.requestControlsLock('popover') };
  }

  #releaseLock(): void {
    this.#lock?.release();
    this.#lock = undefined;
  }
}
