import { css, html, type PropertyDeclarations, type PropertyValues } from 'lit';
import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { nearestOwner } from '../../foundation/portal-ownership.js';
import {
  cursorAxisRect,
  positionSurface,
  rect,
  themeSpacing,
  type PositioningHandle,
  type PositioningOptions,
  type Rect,
} from '../../foundation/positioning.js';
import { TpMediaElement } from './context.js';
import { mediaTextPreferenceStyles } from './styles.js';
import {
  MEDIA_PREVIEW_CHANGE_EVENT,
  mediaPreviewSourceBrand,
  type MediaPreviewDetail,
  type MediaPreviewSource,
  type TpMediaTimeSlider,
} from './time-slider.js';

export type MediaPreviewOverflow = 'clamp' | 'visible';

/** Far enough above and below the track that only the viewport limits the block axis. */
const UNBOUNDED_BLOCK = 1e7;

/**
 * The virtual anchor of the preview: a zero-width slice of the track box at `ratio` along the
 * horizontal axis (shared `cursorAxisRect`). The timeline is chronological left-to-right.
 */
export function previewAnchorRect(
  track: Pick<Rect, 'x' | 'y' | 'width' | 'height'>,
  ratio: number,
): Rect {
  const clamped = Number.isFinite(ratio) ? Math.min(1, Math.max(0, ratio)) : 0;
  return cursorAxisRect(track, { x: track.x + clamped * track.width, y: track.y }, 'horizontal');
}

/**
 * Positioning policy for an overflow mode: `clamp` keeps the preview inside the track's inline
 * extent by shifting it along the alignment axis; `visible` lets it overflow the track.
 */
export function previewPositioning(
  track: Pick<Rect, 'x' | 'width'>,
  overflow: MediaPreviewOverflow,
): Pick<PositioningOptions, 'boundary' | 'collision' | 'padding'> {
  if (overflow === 'visible')
    return {
      boundary: 'clipping-ancestors',
      collision: { side: 'none', align: 'none' },
      padding: 0,
    };
  return {
    boundary: rect(track.x, -UNBOUNDED_BLOCK, track.width, UNBOUNDED_BLOCK * 2),
    collision: { side: 'none', align: 'shift' },
    padding: 0,
  };
}

const isPreviewSource = (node: Node): node is MediaPreviewSource =>
  (node as Partial<MediaPreviewSource>)[mediaPreviewSourceBrand] === true;

/** The nearest preview source (a preview, else a time slider) above `host`, portal-aware. */
export function mediaPreviewSourceOf(host: Node): MediaPreviewSource | null {
  return nearestOwner(host, isPreviewSource);
}

/**
 * Preview time for constituents inside a preview or time slider (`tp-media-thumbnail`,
 * `tp-media-chapter-title`, `tp-media-time type="pointer"`): it resolves the nearest preview
 * source, re-renders the host on `tp-media-preview-change`, and exposes `time`, `previewing`,
 * `keyboardInteraction` and `value`.
 *
 * ```ts
 * readonly #preview = new MediaPreviewController(this);
 * render() { return format(this.#preview.time ?? 0); }
 * ```
 */
export class MediaPreviewController implements ReactiveController {
  readonly #host: ReactiveControllerHost & HTMLElement;
  #source: MediaPreviewSource | null = null;

  constructor(host: ReactiveControllerHost & HTMLElement) {
    this.#host = host;
    host.addController(this);
  }

  /** The resolved preview source, or `null`. */
  get source(): MediaPreviewSource | null {
    return this.#source;
  }

  /** Time under the pointer or drag (retained after leaving), or `null`. */
  get time(): number | null {
    return this.#source?.previewTime ?? null;
  }

  get previewing(): boolean {
    return this.#source?.previewing ?? false;
  }

  get keyboardInteraction(): boolean {
    return this.#source?.keyboardInteraction ?? false;
  }

  /** The time slider's displayed value (media time, or the drag value). */
  get value(): number | null {
    return this.#source ? this.#source.sliderValue : null;
  }

  hostConnected(): void {
    this.#bind();
  }

  hostUpdate(): void {
    // The source may upgrade after this host connected.
    if (!this.#source) this.#bind();
  }

  hostDisconnected(): void {
    this.#unbind();
  }

  #changed = (): void => this.#host.requestUpdate();

  #bind(): void {
    const source = mediaPreviewSourceOf(this.#host);
    if (source === this.#source) return;
    this.#unbind();
    this.#source = source;
    source?.addEventListener(MEDIA_PREVIEW_CHANGE_EVENT, this.#changed);
    if (source) this.#host.requestUpdate();
  }

  #unbind(): void {
    this.#source?.removeEventListener(MEDIA_PREVIEW_CHANGE_EVENT, this.#changed);
    this.#source = null;
  }
}

/**
 * `tp-media-time-slider-preview`: the decorative pointer-following preview of a time slider
 * (Library mp-l-preview). It is a slotted child of `tp-media-time-slider`, positioned on the
 * slider's horizontal pointer axis by the shared positioning service with a virtual anchor
 * (`cursorAxisRect`), clamped inside the track by default (`overflow="visible"` lets it
 * overflow). It is shown while the slider is pointing or dragging, is `aria-hidden`, and is
 * not a Tooltip (no description semantics).
 *
 * It is also a preview source: `previewTime`, `previewing` and the non-bubbling
 * `tp-media-preview-change` event mirror its time slider for the content inside it
 * (`tp-media-thumbnail`, `tp-media-chapter-title`, `tp-media-time type="pointer"`).
 *
 * Markers: `data-visible`, plus `data-side`/`data-placement` from positioning.
 *
 * @fires tp-media-preview-change - The preview time or state changed (not bubbling).
 * @slot - Preview content.
 */
export class TpMediaTimeSliderPreview extends TpMediaElement implements MediaPreviewSource {
  static tagName = 'tp-media-time-slider-preview';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    overflow: { type: String, reflect: true },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        z-index: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        inline-size: max-content;
        pointer-events: none;
      }

      :host(:not([data-visible])) {
        visibility: hidden;
        opacity: 0;
      }
    `,
    mediaTextPreferenceStyles(':host'),
  ];

  readonly [mediaPreviewSourceBrand] = true as const;

  /** `clamp` keeps the preview inside the track; `visible` lets it overflow. */
  overflow: MediaPreviewOverflow = 'clamp';

  #slider: TpMediaTimeSlider | null = null;
  #owned: OwnedAttributes | undefined;
  #handle: PositioningHandle | undefined;
  #options: PositioningOptions | undefined;

  get timeSlider(): TpMediaTimeSlider | null {
    return this.#slider;
  }

  get previewTime(): number | null {
    return this.#slider?.previewTime ?? null;
  }

  get previewRatio(): number | null {
    return this.#slider?.previewRatio ?? null;
  }

  get previewing(): boolean {
    return this.#slider?.previewing ?? false;
  }

  get keyboardInteraction(): boolean {
    return this.#slider?.keyboardInteraction ?? false;
  }

  get sliderValue(): number {
    return this.#slider?.sliderValue ?? 0;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const owned = (this.#owned ??= new OwnedAttributes(this));
    owned.set('aria-hidden', 'true');
    this.#bindSlider();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#unbindSlider();
    this.#handle?.destroy();
    this.#handle = undefined;
    this.#options = undefined;
    this.#owned?.dispose();
    this.#owned = undefined;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (!this.#slider) this.#bindSlider();
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const visible = this.previewing;
    this.toggleAttribute('data-visible', visible);
    if (visible || changed.has('overflow')) this.#position();
  }

  #changed = (event: Event): void => {
    this.requestUpdate();
    this.dispatchEvent(
      new CustomEvent<MediaPreviewDetail>(MEDIA_PREVIEW_CHANGE_EVENT, {
        detail: (event as CustomEvent<MediaPreviewDetail>).detail,
      }),
    );
  };

  #bindSlider(): void {
    const parent = nearestOwner(
      this,
      (node): node is TpMediaTimeSlider =>
        isPreviewSource(node) && (node as MediaPreviewSource).timeSlider === node,
    );
    if (parent === this.#slider) return;
    this.#unbindSlider();
    this.#slider = parent;
    parent?.addEventListener(MEDIA_PREVIEW_CHANGE_EVENT, this.#changed);
    if (parent) this.requestUpdate();
  }

  #unbindSlider(): void {
    this.#slider?.removeEventListener(MEDIA_PREVIEW_CHANGE_EVENT, this.#changed);
    this.#slider = null;
  }

  /** The track box: the composed Slider's box (its Control spans the host's inline size). */
  #track(): Rect {
    const slider = this.#slider;
    const box = (slider?.slider ?? slider)?.getBoundingClientRect();
    return box ? rect(box.x, box.y, box.width, box.height) : rect(0, 0, 0, 0);
  }

  #position(): void {
    const slider = this.#slider;
    if (!slider || !this.isConnected) return;
    const policy = previewPositioning(this.#track(), this.overflow);
    if (!this.#handle || !this.#options) {
      const options: PositioningOptions = {
        placement: 'top',
        strategy: 'absolute',
        offset: themeSpacing(this, 2),
        tracking: false,
        ...policy,
      };
      this.#options = options;
      this.#handle = positionSurface(
        {
          contextElement: slider,
          getBoundingRectangle: () => previewAnchorRect(this.#track(), this.previewRatio ?? 0),
        },
        this,
        options,
      );
      return;
    }
    // Positioning reads the options object on every update; refresh the track-derived policy.
    Object.assign(this.#options, policy);
    void this.#handle.update();
  }
}
