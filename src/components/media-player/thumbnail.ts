import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { styleMap } from 'lit/directives/style-map.js';
import { TpElement } from '../../foundation/element.js';
import { ImageLoadController } from '../../foundation/image-load.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import {
  ThumbnailSourceMemory,
  findThumbnail,
  resolveThumbnailCrossOrigin,
  resolveThumbnails,
  type MediaThumbnail,
  type ThumbnailCrossOrigin,
} from '../../foundation/media/thumbnails.js';
import type { MediaThumbnailsTrack } from '../../foundation/media/state.js';
import { mediaSurfacePreferenceStyles } from './styles.js';
import { TpMediaElement } from './context.js';
import { MediaPreviewController } from './preview.js';

/** CSS min/max constraints of the thumbnail box, in pixels. */
export interface ThumbnailConstraints {
  readonly minWidth: number;
  readonly maxWidth: number;
  readonly minHeight: number;
  readonly maxHeight: number;
}

export interface ThumbnailLayout {
  readonly scale: number;
  readonly containerWidth: number;
  readonly containerHeight: number;
  readonly imageWidth: number;
  readonly imageHeight: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

/** Parses computed `min-*`/`max-*` lengths (`none`/`auto` mean unconstrained). */
export function parseThumbnailConstraints(raw: {
  readonly minWidth: string;
  readonly maxWidth: string;
  readonly minHeight: string;
  readonly maxHeight: string;
}): ThumbnailConstraints {
  const length = (value: string, fallback: number) => {
    const number = Number.parseFloat(value);
    return Number.isFinite(number) ? number : fallback;
  };
  return {
    minWidth: length(raw.minWidth, 0),
    maxWidth: length(raw.maxWidth, Number.POSITIVE_INFINITY),
    minHeight: length(raw.minHeight, 0),
    maxHeight: length(raw.maxHeight, Number.POSITIVE_INFINITY),
  };
}

/**
 * Sprite-cell layout (Video.js `ThumbnailCore.resize`): one uniform scale fills the max
 * constraints, raised to meet the min constraints (min wins, as in CSS), `1` when
 * unconstrained. The container clips the sprite sheet; the image is translated to the cell.
 * Scaled cells are inset by 1 px to hide the interpolation fringe of neighbouring cells.
 */
export function thumbnailLayout(
  thumbnail: Pick<MediaThumbnail, 'width' | 'height' | 'coords'>,
  naturalWidth: number,
  naturalHeight: number,
  constraints: ThumbnailConstraints,
): ThumbnailLayout | undefined {
  const tileWidth = thumbnail.width ?? naturalWidth;
  const tileHeight = thumbnail.height ?? naturalHeight;
  if (!tileWidth || !tileHeight) return undefined;
  const maxRatio = Math.min(constraints.maxWidth / tileWidth, constraints.maxHeight / tileHeight);
  const minRatio = Math.max(constraints.minWidth / tileWidth, constraints.minHeight / tileHeight);
  let scale = Number.isFinite(maxRatio) ? maxRatio : 1;
  if (Number.isFinite(minRatio) && minRatio > scale) scale = minRatio;
  const inset = scale !== 1 ? 1 : 0;
  return {
    scale,
    containerWidth: Math.max(0, Math.floor(tileWidth * scale) - inset * 2),
    containerHeight: Math.max(0, Math.floor(tileHeight * scale) - inset * 2),
    imageWidth: Math.ceil(naturalWidth * scale),
    imageHeight: Math.ceil(naturalHeight * scale),
    offsetX: Math.ceil((thumbnail.coords?.x ?? 0) * scale) + inset,
    offsetY: Math.ceil((thumbnail.coords?.y ?? 0) * scale) + inset,
  };
}

/**
 * The thumbnail shown for `time` (`mp-f-thumbnails`): the last cue starting at or before the
 * time, skipping sources that already failed (they are never retried).
 */
export function selectThumbnail(
  thumbnails: readonly MediaThumbnail[],
  time: number | null | undefined,
  memory?: Pick<ThumbnailSourceMemory, 'usable'>,
): MediaThumbnail | undefined {
  if (time === null || time === undefined) return undefined;
  const thumbnail = findThumbnail(thumbnails, time);
  return memory ? memory.usable(thumbnail) : thumbnail;
}

const crossOriginConverter = {
  fromAttribute(value: string | null): ThumbnailCrossOrigin | undefined {
    if (value === null) return undefined;
    return value.toLowerCase() === 'use-credentials' ? 'use-credentials' : 'anonymous';
  },
  toAttribute(value: ThumbnailCrossOrigin | null | undefined): string | null {
    return value === undefined || value === null ? null : value;
  },
};

const timeConverter = {
  fromAttribute(value: string | null): number | null {
    if (value === null || value.trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
  toAttribute(value: number | null): string | null {
    return value === null ? null : String(value);
  },
};

/**
 * `tp-media-thumbnail`: the thumbnail image for a time (Library mp-l-preview), from the media's
 * thumbnails track (`kind="metadata" label="thumbnails"`). Each cue's URL resolves against the
 * track source; an `#xywh=x,y,w,h` fragment selects a sprite cell, which is scaled to the
 * element's CSS min/max size and clipped. The time is `time`, else the preview time of the
 * nearest `tp-media-time-slider-preview` (or time slider). Load state comes from the shared
 * image-load owner; failed sources are remembered and never retried. `crossOrigin` inherits
 * the media's CORS mode unless set (`null` opts out).
 *
 * Decorative: `role="img"` with `aria-hidden="true"`, and `dir="ltr"` for sprite geometry.
 * Hidden while no thumbnail is available and nothing is loading.
 *
 * Markers: `data-loading`, `data-loaded`, `data-error`.
 *
 * @csspart image - The sprite or thumbnail image.
 */
export class TpMediaThumbnail extends TpMediaElement {
  static tagName = 'tp-media-thumbnail';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    time: { attribute: 'time', converter: timeConverter },
    crossOrigin: { attribute: 'crossorigin', converter: crossOriginConverter },
    loading: { type: String },
    fetchPriority: { type: String, attribute: 'fetchpriority' },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        position: relative;
        overflow: hidden;
        flex: none;
      }

      img {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        display: block;
        max-inline-size: none;
        max-block-size: none;
        pointer-events: none;
      }

      img:not([src]) {
        visibility: hidden;
      }
    `,
    mediaSurfacePreferenceStyles(':host'),
  ];

  /** Time in seconds; `null` follows the nearest preview. */
  time: number | null = null;
  /**
   * CORS mode of the image. `undefined` inherits the media's mode; `null` opts out; `''` is
   * Anonymous (CORS-settings attribute rules).
   */
  crossOrigin: ThumbnailCrossOrigin | null | undefined = undefined;
  /** Image `loading` hint. */
  loading: 'eager' | 'lazy' = 'eager';
  /** Image `fetchpriority` hint. */
  fetchPriority: 'high' | 'low' | 'auto' = 'auto';

  readonly #track = this.select((state) => state.thumbnails, Object.is);
  readonly #preview = new MediaPreviewController(this);
  readonly #load = new ImageLoadController(this, {
    onStatusChange: (status) => {
      if (status === 'error' && this.#url) this.#memory.markFailed(this.#url);
    },
  });
  readonly #memory = new ThumbnailSourceMemory();
  #resolved: { track: MediaThumbnailsTrack | null; thumbnails: MediaThumbnail[] } = {
    track: null,
    thumbnails: [],
  };
  #url: string | null = null;
  #image: HTMLImageElement | null = null;
  #owned: OwnedAttributes | undefined;
  #layout: { thumbnail: MediaThumbnail; layout: ThumbnailLayout } | undefined;

  /** The thumbnail currently selected (before loading), or `undefined`. */
  get thumbnail(): MediaThumbnail | undefined {
    return selectThumbnail(this.#thumbnails(), this.#time(), this.#memory);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const owned = (this.#owned ??= new OwnedAttributes(this));
    if (owned.original('role') === null) owned.set('role', 'img');
    owned.set('aria-hidden', 'true');
    if (owned.original('dir') === null) owned.set('dir', 'ltr');
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#owned?.dispose();
    this.#owned = undefined;
    this.#url = null;
    this.#image = null;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const thumbnail = this.thumbnail;
    const url = thumbnail?.url ?? null;
    if (url !== this.#url) {
      this.#url = url;
      this.#layout = undefined;
      this.#load.load(url ? { src: url } : null, { preload: false });
    }
  }

  protected override render() {
    const thumbnail = this.thumbnail;
    if (!thumbnail) return nothing;
    const crossOrigin = resolveThumbnailCrossOrigin(
      this.crossOrigin,
      this.#track.value?.crossOrigin ?? null,
    );
    const layout = this.#layout?.thumbnail === thumbnail ? this.#layout.layout : undefined;
    return html`<img
      part="image"
      alt=""
      src=${thumbnail.url}
      crossorigin=${crossOrigin ?? nothing}
      loading=${this.loading}
      fetchpriority=${this.fetchPriority}
      decoding="async"
      style=${styleMap(
        layout
          ? {
              'inline-size': `${layout.imageWidth}px`,
              'block-size': `${layout.imageHeight}px`,
              translate: `${-layout.offsetX}px ${-layout.offsetY}px`,
            }
          : {},
      )}
      @load=${this.#loaded}
    />`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const image = this.renderRoot.querySelector('img');
    if (image !== this.#image) {
      this.#image = image;
      this.#load.observe(image);
    }
    const status = this.#load.status;
    this.toggleAttribute('data-loading', status === 'loading');
    this.toggleAttribute('data-loaded', status === 'loaded');
    this.toggleAttribute('data-error', status === 'error');
    const owned = (this.#owned ??= new OwnedAttributes(this));
    const empty = !this.thumbnail && status !== 'loading';
    owned.set('hidden', empty ? '' : owned.original('hidden'));
    this.#applyLayout();
  }

  #loaded = (): void => {
    this.#layout = undefined;
    this.requestUpdate();
  };

  #time(): number | null {
    return this.time ?? this.#preview.time;
  }

  #thumbnails(): MediaThumbnail[] {
    const track = this.#track.value;
    if (this.#resolved.track !== track)
      this.#resolved = { track, thumbnails: resolveThumbnails(track) };
    return this.#resolved.thumbnails;
  }

  /** Sizes the host to the scaled cell once the sprite's natural size is known. */
  #applyLayout(): void {
    const thumbnail = this.thumbnail;
    const image = this.#image;
    if (!thumbnail || !image || !image.naturalWidth) {
      this.style.removeProperty('inline-size');
      this.style.removeProperty('block-size');
      return;
    }
    if (this.#layout?.thumbnail === thumbnail) return;
    const style = this.ownerDocument.defaultView?.getComputedStyle(this);
    const layout = thumbnailLayout(
      thumbnail,
      image.naturalWidth,
      image.naturalHeight,
      parseThumbnailConstraints(
        style ?? { minWidth: '', maxWidth: '', minHeight: '', maxHeight: '' },
      ),
    );
    if (!layout) return;
    this.#layout = { thumbnail, layout };
    this.style.setProperty('inline-size', `${layout.containerWidth}px`);
    this.style.setProperty('block-size', `${layout.containerHeight}px`);
    this.requestUpdate();
  }
}
