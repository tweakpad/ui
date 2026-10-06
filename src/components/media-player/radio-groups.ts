import { html, nothing, render, type PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import {
  audioTrackAvailability,
  captionsAvailability,
  controlAvailability,
  qualityAvailability,
  rateAvailability,
  type MediaAvailability,
  type MediaControlAvailability,
} from '../../foundation/media/availability.js';
import type {
  MediaMessageKey,
  MediaMessagesResolver,
  MediaPlayerMessages,
} from '../../foundation/media/messages.js';
import type {
  MediaRequestAction,
  MediaRequestArgs,
  MediaRequestOutcome,
} from '../../foundation/media/requests.js';
import type { MediaState } from '../../foundation/media/state.js';
import { shallowEqual } from '../../foundation/store.js';
import type { ChangeReason } from '../../foundation/types.js';
import { TpMenuRadioGroup, type MenuRadioMember } from '../menu/menu-radio-group.js';
import {
  DEFAULT_MEDIA_STATE,
  MediaOwnerController,
  MediaSelectorController,
  resolveMediaMessages,
  type MediaPlayerApi,
} from './context.js';
import {
  CAPTIONS_OFF_VALUE,
  audioTrackOptions,
  captionsOptions,
  playbackRateOptions,
  qualityOptions,
  selectedAudioTrack,
  selectedCaptions,
  selectedPlaybackRate,
  selectedQuality,
  type MediaRadioOption,
} from './radio-options.js';
import { TpMenuRadioItem } from '../menu/menu-radio-item.js';
import { TpBadge } from '../badge/index.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/** A custom item renderer; it must render a `tp-menu-radio-item` whose `value` is the option's. */
export type MediaRadioItemRenderer = (
  option: MediaRadioOption,
  group: TpMediaRadioGroupElement,
) => unknown;

/** The default item: a Menu radio item with `data-track`/`data-rendition` and Badge extras. */
export function renderMediaRadioItem(
  option: MediaRadioOption,
  options: { readonly disabled?: boolean } = {},
): unknown {
  return html`<tp-menu-radio-item
    .value=${option.value}
    .disabled=${options.disabled === true}
    data-track=${option.track ?? nothing}
    data-rendition=${option.rendition ?? nothing}
    >${option.label}${
      option.tier ? html` <tp-badge variant="secondary">${option.tier}</tp-badge>` : nothing
    }${
      option.badge ? html` <tp-badge variant="outline">${option.badge}</tp-badge>` : nothing
    }</tp-menu-radio-item
  >`;
}

/** What a media radio group derives from one state snapshot (also used by the settings menu). */
export interface MediaRadioModel {
  readonly feature: MediaAvailability;
  readonly options: readonly MediaRadioOption[];
  /** The selected value; `null` selects nothing (the group stays controlled). */
  readonly value: number | string | null;
}

/** Inputs of a model function: state, messages, locale and request capability. */
export interface MediaRadioModelContext {
  readonly messages: Pick<MediaMessagesResolver, 'get'>;
  readonly locale: string | string[] | undefined;
  readonly capability: (action: MediaRequestAction) => MediaAvailability;
}

const capable = (
  context: MediaRadioModelContext,
  action: MediaRequestAction,
  feature: MediaAvailability,
): MediaAvailability => (context.capability(action) === 'unsupported' ? 'unsupported' : feature);

/** Playback-rate model (`speed` group; hidden for live without DVR). */
export function playbackRateModel(
  state: MediaState,
  context: MediaRadioModelContext,
): MediaRadioModel {
  return {
    feature: capable(context, 'set-playback-rate', rateAvailability(state)),
    options: playbackRateOptions(state.playbackRates, context.messages, context.locale),
    value: selectedPlaybackRate(state.playbackRates, state.playbackRate) ?? null,
  };
}

/** Captions model (`off` plus captions/subtitles tracks). */
export function captionsModel(state: MediaState, context: MediaRadioModelContext): MediaRadioModel {
  return {
    feature: capable(context, 'select-text-track', captionsAvailability(state)),
    options: captionsOptions(state.textTracks, context.messages, context.locale),
    value: selectedCaptions(state.textTracks),
  };
}

/** Audio-track model (more than one track). */
export function audioTrackModel(
  state: MediaState,
  context: MediaRadioModelContext,
): MediaRadioModel {
  return {
    feature: capable(context, 'select-audio-track', audioTrackAvailability(state)),
    options: audioTrackOptions(state.audioTracks, context.messages, context.locale),
    value: selectedAudioTrack(state.audioTracks) ?? null,
  };
}

/** Quality model (`auto` plus renditions; more than one rendition). */
export function qualityModel(state: MediaState, context: MediaRadioModelContext): MediaRadioModel {
  return {
    feature: capable(context, 'select-video-rendition', qualityAvailability(state)),
    options: qualityOptions(
      state.videoRenditions,
      state.activeVideoRendition,
      state.autoQuality,
      context.messages,
      context.locale,
    ),
    value: selectedQuality(state.videoRenditions, state.autoQuality),
  };
}

/**
 * Base of the media radio groups (Library mp-l-menus): a `tp-menu-radio-group` extension that
 * generates its `tp-menu-radio-item`s from store state into its light DOM (where the owning
 * Menu collects them), keeps its value controlled by the store, and requests the selection
 * with the selecting reason and event. A group with no usable options renders no items and is
 * `hidden` (`data-availability`, `data-hidden`); while the player is disabled or the list is
 * unavailable the items are disabled. The group label (`aria-label`) comes from the messages
 * unless authored. `renderItem(option, group)` replaces the default item.
 *
 * @fires tp-value-change - The Menu radio group's cancelable proposal (the request follows when
 *   it is accepted).
 */
export abstract class TpMediaRadioGroupElement extends TpMenuRadioGroup {
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpMenuRadioItem, TpBadge];
  }
  static override properties = {
    ...TpMenuRadioGroup.properties,
    playerId: { type: String, attribute: 'player' },
    messages: { attribute: false },
    renderItem: { attribute: false },
  };

  /** Id of a `tp-media-player` to bind to from outside its subtree (`player` attribute). */
  playerId: string | null = null;
  /** Per-group message overrides. */
  messages: MediaPlayerMessages | null = null;
  /** Custom item renderer; it must render a `tp-menu-radio-item`. */
  renderItem: MediaRadioItemRenderer | null = null;

  readonly #owner = new MediaOwnerController(this, { playerId: () => this.playerId });
  readonly #state = new MediaSelectorController(this, (state) => this.slice(state), shallowEqual);
  #model: MediaRadioModel = { feature: 'unavailable', options: [], value: null };
  #availability: MediaControlAvailability = {
    availability: 'unavailable',
    disabled: true,
    hidden: false,
  };
  #owned: OwnedAttributes | undefined;

  /** Message key of the group label (`speed`, `captions`, `audio`, `quality`). */
  protected abstract readonly labelKey: MediaMessageKey;

  /** The state slice the model depends on (the group re-renders when it changes). */
  protected abstract slice(state: MediaState): Record<string, unknown>;

  /** Derives the model from a snapshot. */
  protected abstract model(state: MediaState, context: MediaRadioModelContext): MediaRadioModel;

  /** Requests the media change for a selected value. */
  protected abstract requestSelection(
    value: unknown,
    reason: ChangeReason,
    event: Event,
  ): Promise<unknown>;

  /** The owning player, or `null`. */
  get player(): MediaPlayerApi | null {
    return this.#owner.player;
  }

  /** Requests a media change through the player pipeline (trigger: this group). */
  protected request<A extends MediaRequestAction>(
    action: A,
    ...args: MediaRequestArgs<A>
  ): Promise<MediaRequestOutcome<A>> {
    return this.#owner.request(action, ...args);
  }

  /** Messages: this group's `messages` over the player's over English. */
  get mediaMessages(): MediaMessagesResolver {
    return resolveMediaMessages(this.player?.mediaMessages, this.messages);
  }

  /** The generated options. */
  get options(): readonly MediaRadioOption[] {
    return this.#model.options;
  }

  /** The current availability (`data-availability`, `data-disabled`, `data-hidden`). */
  get availability(): MediaControlAvailability {
    return this.#availability;
  }

  /** The Menu radio group's family plus the Media player definition (`media-radio-group`). */
  override get presentationFamilyTagNames(): readonly string[] {
    return [...super.presentationFamilyTagNames, 'tp-media-player'];
  }

  /** A selection proposal; when accepted, the media change is requested. */
  override select(member: MenuRadioMember, event: Event, reason: ChangeReason): boolean {
    const previous = this.value;
    const accepted = super.select(member, event, reason);
    if (accepted && !Object.is(previous, member.value))
      this.requestSelection(member.value, reason, event).catch(() => undefined);
    return accepted;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#owned?.dispose();
    this.#owned = undefined;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const player = this.player;
    void this.#state.value;
    const state = player?.state ?? DEFAULT_MEDIA_STATE;
    const model = this.model(state, {
      messages: this.mediaMessages,
      locale: player?.resolvedLocale,
      capability: (action) => player?.requestAvailability(action) ?? 'unavailable',
    });
    const availability = (this.#availability = controlAvailability(model.feature, {
      attached: player?.attached ?? false,
      disabled: !player || player.disabled,
      list: true,
    }));
    const next: MediaRadioModel = availability.hidden ? { ...model, options: [] } : model;
    if (
      next.feature !== this.#model.feature ||
      !Object.is(next.value, this.#model.value) ||
      !shallowEqual(next.options, this.#model.options)
    )
      this.#model = next;
    // Controlled by the store (never `undefined`, which would switch to uncontrolled mode): the
    // selection follows media state, not the proposal.
    if (!this.hasUpdated || !Object.is(this.value, next.value)) this.value = next.value;
    const owned = (this.#owned ??= new OwnedAttributes(this));
    if (owned.original('aria-label') === null)
      owned.set('aria-label', this.mediaMessages.get(this.labelKey));
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const availability = this.#availability;
    const owned = (this.#owned ??= new OwnedAttributes(this));
    owned.set('data-availability', availability.availability);
    owned.set('data-hidden', availability.hidden ? '' : null);
    owned.set('hidden', availability.hidden ? '' : owned.original('hidden'));
    this.toggleAttribute('data-disabled', availability.disabled || this.disabled);
    this.#renderItems();
  }

  /** Generated items live in the light DOM, where the owning Menu collects them. */
  #renderItems(): void {
    const renderer = this.renderItem;
    const disabled = this.#availability.disabled;
    render(
      repeat(
        this.#model.options,
        (option) => `${typeof option.value}:${String(option.value)}`,
        (option) =>
          renderer ? renderer(option, this) : renderMediaRadioItem(option, { disabled }),
      ),
      this,
      { host: this },
    );
  }
}

/**
 * `tp-media-playback-rate-radio-group`: the player's `playbackRates` as Menu radio items,
 * labelled `${rate}×` with 1 as `normalSpeed`; selecting requests `set-playback-rate`. Hidden
 * for live streams without DVR and for an empty rate list. Group label `speed`.
 */
export class TpMediaPlaybackRateRadioGroup extends TpMediaRadioGroupElement {
  static override tagName = 'tp-media-playback-rate-radio-group';
  protected readonly labelKey = 'speed';
  protected slice(state: MediaState): Record<string, unknown> {
    const { playbackRates, playbackRate, streamType, dvr } = state;
    return { playbackRates, playbackRate, streamType, dvr };
  }
  protected model(state: MediaState, context: MediaRadioModelContext): MediaRadioModel {
    return playbackRateModel(state, context);
  }
  protected requestSelection(value: unknown, reason: ChangeReason, event: Event): Promise<unknown> {
    return this.request('set-playback-rate', Number(value), { reason, sourceEvent: event });
  }
}

/**
 * `tp-media-captions-radio-group`: `off` and one item per captions/subtitles track (label →
 * language name → `captions`/`subtitles`), `data-track` on each; selecting requests
 * `select-text-track` (`null` for off). Hidden without caption tracks. Group label `captions`.
 */
export class TpMediaCaptionsRadioGroup extends TpMediaRadioGroupElement {
  static override tagName = 'tp-media-captions-radio-group';
  protected readonly labelKey = 'captions';
  protected slice(state: MediaState): Record<string, unknown> {
    return { textTracks: state.textTracks };
  }
  protected model(state: MediaState, context: MediaRadioModelContext): MediaRadioModel {
    return captionsModel(state, context);
  }
  protected requestSelection(value: unknown, reason: ChangeReason, event: Event): Promise<unknown> {
    const id = value === CAPTIONS_OFF_VALUE ? null : String(value);
    return this.request('select-text-track', id, { reason, sourceEvent: event });
  }
}

/**
 * `tp-media-audio-track-radio-group`: one item per audio track (label → language name → kind →
 * `audio`), `data-track` on each; selecting requests `select-audio-track`. Hidden unless more
 * than one track exists. Group label `audio`.
 */
export class TpMediaAudioTrackRadioGroup extends TpMediaRadioGroupElement {
  static override tagName = 'tp-media-audio-track-radio-group';
  protected readonly labelKey = 'audio';
  protected slice(state: MediaState): Record<string, unknown> {
    return { audioTracks: state.audioTracks };
  }
  protected model(state: MediaState, context: MediaRadioModelContext): MediaRadioModel {
    return audioTrackModel(state, context);
  }
  protected requestSelection(value: unknown, reason: ChangeReason, event: Event): Promise<unknown> {
    return this.request('select-audio-track', String(value), { reason, sourceEvent: event });
  }
}

/**
 * `tp-media-quality-radio-group`: `auto` (`autoWithLabel` while adaptive with a known active
 * rendition) and one item per rendition labelled `{size}p` (snapped to the standard classes),
 * else by bitrate, with optional tier and bitrate `tp-badge`s and `data-rendition`; selecting
 * requests `select-video-rendition` (`auto` restores adaptive selection). Hidden unless more
 * than one rendition exists. Group label `quality`.
 */
export class TpMediaQualityRadioGroup extends TpMediaRadioGroupElement {
  static override tagName = 'tp-media-quality-radio-group';
  protected readonly labelKey = 'quality';
  protected slice(state: MediaState): Record<string, unknown> {
    const { videoRenditions, activeVideoRendition, autoQuality } = state;
    return { videoRenditions, activeVideoRendition, autoQuality };
  }
  protected model(state: MediaState, context: MediaRadioModelContext): MediaRadioModel {
    return qualityModel(state, context);
  }
  protected requestSelection(value: unknown, reason: ChangeReason, event: Event): Promise<unknown> {
    return this.request('select-video-rendition', String(value), { reason, sourceEvent: event });
  }
}
