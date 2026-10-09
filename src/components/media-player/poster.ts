import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { authoredImageHasSource, ImageLoadController } from '../../foundation/image-load.js';
import { TpMediaElement } from './context.js';
import { mediaOverlayStyles } from './styles.js';

export { authoredImageHasSource };

/** Poster visibility (Library mp-l-poster-title): until playback starts, optionally after end. */
export function posterVisible(
  state: { readonly started: boolean; readonly ended: boolean },
  showOnEnded: boolean,
): boolean {
  return !state.started || (showOnEnded && state.ended);
}

/**
 * `tp-media-poster`: the poster image shown until playback starts (and after it ends with
 * `show-on-ended`). It renders a decorative fallback `<img part="image" alt="">`, or adopts the
 * first authored `<img>` child: an authored image without its own source receives the resolved
 * poster as `src`; one with a source (or `<picture>` sources) is left alone. Load state comes from
 * the shared image-load owner. `object-fit` follows `--tp-media-object-fit` (default `contain`).
 *
 * Markers: `data-visible`, `data-loading`, `data-loaded`, `data-error`.
 *
 * @csspart image - The fallback poster image.
 * @slot - An optional authored `<img>` (or `<picture>`).
 */
export class TpMediaPoster extends TpMediaElement {
  static tagName = 'tp-media-poster';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    showOnEnded: { type: Boolean, attribute: 'show-on-ended' },
  };

  static override styles = [
    TpElement.styles,
    mediaOverlayStyles,
    css`
      :host {
        display: block;
        z-index: 1;
        pointer-events: none;
      }

      :host(:not([data-visible])) {
        opacity: 0;
        visibility: hidden;
      }

      img,
      ::slotted(img),
      ::slotted(picture) {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        object-fit: var(--tp-media-object-fit, contain);
        object-position: var(--tp-media-object-position, center);
      }

      img:not([src]) {
        visibility: hidden;
      }
    `,
  ];

  /** Show the poster again after playback ends. */
  showOnEnded = false;

  readonly #playback = this.select((state) => ({
    started: state.started,
    ended: state.ended,
    poster: state.poster,
  }));
  // Status only drives markers, which are reflected here rather than by another render.
  readonly #load = new ImageLoadController(this, {
    requestUpdate: false,
    onStatusChange: () => this.#reflectStatus(),
  });
  #image: HTMLImageElement | null = null;
  /** The adopted image had no source of its own, so this element writes its `src`. */
  #owned = false;
  #source: string | null = null;
  #children: MutationObserver | undefined;

  /** Whether the poster is shown. */
  get visible(): boolean {
    return posterVisible(this.#playback.value, this.showOnEnded);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const Observer = this.ownerDocument.defaultView?.MutationObserver;
    if (Observer) {
      this.#children = new Observer(() => this.requestUpdate());
      this.#children.observe(this, { childList: true, subtree: true });
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#children?.disconnect();
    this.#children = undefined;
    this.#adopt(null);
  }

  protected override render() {
    const authored = this.#authoredImage();
    return html`<slot @slotchange=${() => this.requestUpdate()}></slot>${
        authored ? nothing : html`<img part="image" alt="" decoding="async" />`
      }`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const image = this.#authoredImage() ?? this.renderRoot.querySelector('img');
    this.#adopt(image);
    this.#applySource(this.#playback.value.poster);
    this.#reflectStatus();
  }

  #reflectStatus(): void {
    const status = this.#load.status;
    this.toggleAttribute('data-visible', this.visible);
    this.toggleAttribute('data-loading', status === 'loading');
    this.toggleAttribute('data-loaded', status === 'loaded');
    this.toggleAttribute('data-error', status === 'error');
  }

  #authoredImage(): HTMLImageElement | null {
    return this.querySelector('img');
  }

  /** Ownership is settled when an image becomes active (Video.js poster adoption). */
  #adopt(next: HTMLImageElement | null): void {
    if (next === this.#image) return;
    // An authored image that steps aside keeps nothing this element pointed it at.
    if (this.#owned && this.#image && this.#image.parentNode === this)
      this.#image.removeAttribute('src');
    this.#image = next;
    this.#source = null;
    const fallback = next !== null && next.getRootNode() === this.renderRoot;
    this.#owned = next !== null && (fallback || !authoredImageHasSource(next));
    if (!next) {
      this.#load.load(null);
      return;
    }
    if (!this.#owned) {
      // An authored source: observe that image's own request.
      this.#load.load(
        { src: next.getAttribute('src'), srcset: next.getAttribute('srcset') },
        { preload: false },
      );
      this.#load.observe(next);
    }
  }

  /** Writes the resolved poster to an owned image and restarts the load state for it. */
  #applySource(poster: string): void {
    const image = this.#image;
    if (!image || !this.#owned || poster === this.#source) return;
    this.#source = poster;
    if (!poster) {
      image.removeAttribute('src');
      this.#load.load(null);
      return;
    }
    if (image.getAttribute('src') !== poster) image.setAttribute('src', poster);
    this.#load.load({ src: poster }, { preload: false });
    // `observe` settles an already-complete image immediately.
    this.#load.observe(image);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-media-poster': TpMediaPoster;
  }
}
