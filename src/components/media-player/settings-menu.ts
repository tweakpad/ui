import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TpElement } from '../../foundation/element.js';
import {
  controlAvailability,
  type MediaControlAvailability,
} from '../../foundation/media/availability.js';
import type { MediaMessageKey } from '../../foundation/media/messages.js';
import type { MediaState } from '../../foundation/media/state.js';
import type { ChangeReason } from '../../foundation/types.js';
import { settingsIcon } from '../../icons/settings.js';
import type { TpMenu } from '../menu/menu.js';
import { TpMediaElement, type MediaPlayerApi } from './context.js';
import {
  audioTrackModel,
  captionsModel,
  playbackRateModel,
  qualityModel,
  type MediaRadioModel,
  type MediaRadioModelContext,
} from './radio-groups.js';
import { selectedOptionLabel } from './radio-options.js';

/** Settings groups, in the default (Video.js settings menu) order. */
export type MediaSettingsGroup = 'quality' | 'audio' | 'speed' | 'captions';

export const DEFAULT_MEDIA_SETTINGS_GROUPS: readonly MediaSettingsGroup[] = Object.freeze([
  'quality',
  'audio',
  'speed',
  'captions',
]);

const GROUPS: Readonly<
  Record<
    MediaSettingsGroup,
    {
      readonly label: MediaMessageKey;
      readonly model: (state: MediaState, context: MediaRadioModelContext) => MediaRadioModel;
    }
  >
> = {
  quality: { label: 'quality', model: qualityModel },
  audio: { label: 'audio', model: audioTrackModel },
  speed: { label: 'speed', model: playbackRateModel },
  captions: { label: 'captions', model: captionsModel },
};

const groupsConverter = {
  fromAttribute(value: string | null): readonly MediaSettingsGroup[] {
    if (value === null) return DEFAULT_MEDIA_SETTINGS_GROUPS;
    return value.split(/[\s,]+/u).filter((group): group is MediaSettingsGroup => group in GROUPS);
  },
  toAttribute(value: readonly MediaSettingsGroup[]): string {
    return value.join(' ');
  },
};

interface HintRecord {
  callback: (element?: Element) => void;
  element: Element | undefined;
  release: (() => void) | undefined;
}

/** One available submenu: its group, label and selected-value hint. */
export interface MediaSettingsEntry {
  readonly group: MediaSettingsGroup;
  readonly label: string;
  readonly hint: string;
}

/**
 * The available settings submenus (Library mp-l-menus): groups whose list is usable, in the
 * requested order, each with its label and the selected option's label as a hint.
 */
export function mediaSettingsEntries(
  groups: readonly MediaSettingsGroup[],
  state: MediaState,
  context: MediaRadioModelContext & { readonly attached: boolean },
): MediaSettingsEntry[] {
  const entries: MediaSettingsEntry[] = [];
  for (const group of groups) {
    const definition = GROUPS[group];
    if (!definition) continue;
    const model = definition.model(state, context);
    const availability = controlAvailability(model.feature, {
      attached: context.attached,
      list: true,
    });
    if (availability.availability !== 'available' || !model.options.length) continue;
    entries.push({
      group,
      label: context.messages.get(definition.label),
      hint: selectedOptionLabel(model.options, model.value),
    });
  }
  return entries;
}

/**
 * `tp-media-settings-menu`: the settings preset (Library mp-l-menus). A composed `tp-button`
 * trigger (settings icon, `settings` label) opens a `tp-menu` with one nested submenu per
 * available group (`groups`, default `quality audio speed captions`), each containing the
 * matching media radio group. Submenus use the Menu's flyout nested-submenu behavior; each
 * submenu trigger shows the group label and the selected option as a `data-menu-hint`.
 *
 * - The trigger is `hidden` when no group is available (`data-availability`, `data-hidden`).
 * - The menu portals into the player container and holds a `menu` controls lock while open.
 * - `open`/`setOpen(open, reason)` forward to the menu, so the player closes it when controls
 *   hide (`idle`) and on fullscreen entry (`imperative-action`).
 *
 * @csspart trigger - The composed settings Button.
 * @csspart menu - The composed Menu.
 */
export class TpMediaSettingsMenu extends TpMediaElement {
  static tagName = 'tp-media-settings-menu';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    groups: { attribute: 'groups', converter: groupsConverter },
    side: { type: String },
    align: { type: String },
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

  /** Groups to offer, in order. */
  groups: readonly MediaSettingsGroup[] = DEFAULT_MEDIA_SETTINGS_GROUPS;
  /** Menu side relative to the trigger. */
  side: TpMenu['side'] = 'top';
  /** Menu alignment. */
  align: TpMenu['align'] = 'center';

  readonly #slice = this.select((state) => ({
    textTracks: state.textTracks,
    audioTracks: state.audioTracks,
    videoRenditions: state.videoRenditions,
    activeVideoRendition: state.activeVideoRendition,
    autoQuality: state.autoQuality,
    playbackRates: state.playbackRates,
    playbackRate: state.playbackRate,
    streamType: state.streamType,
    dvr: state.dvr,
  }));
  #entries: MediaSettingsEntry[] = [];
  /** Per-group hint registrations (`media-settings-hint`); hints move with the portaled menu. */
  #hints = new Map<MediaSettingsGroup, HintRecord>();
  #lock: { player: MediaPlayerApi; release: () => void } | undefined;

  /** The composed settings Button (part `trigger`), for example to attach a Tooltip to it. */
  get trigger(): HTMLElement | null {
    return this.renderRoot?.querySelector?.<HTMLElement>('[part~="trigger"]') ?? null;
  }

  /** The composed Menu. */
  get menu(): TpMenu | null {
    return this.renderRoot?.querySelector?.<TpMenu>('tp-menu') ?? null;
  }

  /** The available submenus. */
  get entries(): readonly MediaSettingsEntry[] {
    return this.#entries;
  }

  /** Whether the settings menu is open. */
  get open(): boolean {
    return this.menu?.open === true;
  }

  /** Opens or closes the settings menu (forwarded to the composed Menu). */
  setOpen(open: boolean, reason: ChangeReason = 'programmatic'): boolean {
    return this.menu?.setOpen(open, reason) ?? false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#releaseLock();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    void this.#slice.value;
    const player = this.player;
    this.#entries = mediaSettingsEntries(this.groups, this.mediaState, {
      messages: this.mediaMessages,
      locale: this.mediaLocale,
      capability: (action) => player?.requestAvailability(action) ?? 'unavailable',
      attached: player?.attached ?? false,
    });
    this.controlAvailability(this.#entries.length ? 'available' : 'unavailable', { list: true });
  }

  protected override render() {
    const availability: MediaControlAvailability | undefined = this.availability;
    const label = this.message('settings');
    return html`<tp-menu
      part="menu"
      .container=${this.player?.container ?? null}
      .side=${this.side}
      .align=${this.align}
      @tp-open-change=${this.#openChanged}
      @tp-open-change-complete=${this.#openChanged}
    >
      <tp-button
        part="trigger"
        slot="trigger"
        variant="ghost"
        size="icon"
        .icon=${settingsIcon}
        .ariaLabel=${label}
        .focusableWhenDisabled=${true}
        .disabled=${availability?.disabled ?? true}
      ></tp-button>
      ${this.#entries.map((entry) => this.#submenu(entry))}
    </tp-menu>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    // The last group disappeared while open: the menu has nothing to offer.
    if (this.availability?.hidden && this.open) this.setOpen(false, 'disabled');
    this.#syncLock();
  }

  #submenu(entry: MediaSettingsEntry): unknown {
    const trigger = html`<tp-button slot="trigger" variant="ghost"
      >${entry.label}${
        entry.hint
          ? html`<span slot="icon-end" data-menu-hint ${ref(this.#hintRef(entry.group))}
              >${entry.hint}</span
            >`
          : nothing
      }</tp-button
    >`;
    switch (entry.group) {
      case 'quality':
        return html`<tp-menu data-group="quality"
          >${trigger}<tp-media-quality-radio-group></tp-media-quality-radio-group
        ></tp-menu>`;
      case 'audio':
        return html`<tp-menu data-group="audio"
          >${trigger}<tp-media-audio-track-radio-group></tp-media-audio-track-radio-group
        ></tp-menu>`;
      case 'speed':
        return html`<tp-menu data-group="speed"
          >${trigger}<tp-media-playback-rate-radio-group></tp-media-playback-rate-radio-group
        ></tp-menu>`;
      case 'captions':
        return html`<tp-menu data-group="captions"
          >${trigger}<tp-media-captions-radio-group></tp-media-captions-radio-group
        ></tp-menu>`;
    }
  }

  #hintRef(group: MediaSettingsGroup): (element?: Element) => void {
    let record = this.#hints.get(group);
    if (!record) {
      const entry: HintRecord = {
        element: undefined,
        release: undefined,
        callback: (element) => {
          if (element === entry.element) return;
          entry.release?.();
          entry.release = undefined;
          entry.element = element;
          if (element instanceof HTMLElement)
            entry.release = this.presentationController.registerPart(
              'media-settings-hint',
              element,
            );
        },
      };
      this.#hints.set(group, (record = entry));
    }
    return record.callback;
  }

  #openChanged = (): void => {
    queueMicrotask(() => this.#syncLock());
  };

  /** The open menu holds a `menu` controls lock. */
  #syncLock(): void {
    const player = this.player;
    const open = this.isConnected && this.open && player !== null;
    if (open && this.#lock?.player === player) return;
    this.#releaseLock();
    if (open && player) this.#lock = { player, release: player.requestControlsLock('menu') };
  }

  #releaseLock(): void {
    this.#lock?.release();
    this.#lock = undefined;
  }
}
