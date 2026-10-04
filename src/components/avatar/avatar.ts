import { css, html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { TpElement } from '../../foundation/element.js';

export type AvatarLoadingStatus = 'idle' | 'loading' | 'loaded' | 'error';

export class TpAvatar extends TpElement {
  static tagName = 'tp-avatar';
  static override properties = {
    ...TpElement.properties,
    src: { type: String },
    alt: { type: String },
    fallback: { type: String },
    size: { type: String, reflect: true },
    fallbackDelay: { type: Number, attribute: 'fallback-delay' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    loading: { type: String },
    srcSet: { type: String, attribute: 'srcset' },
    sizes: { type: String },
    crossOrigin: { type: String, attribute: 'crossorigin' },
    referrerPolicy: { type: String, attribute: 'referrerpolicy' },
    onLoadingStatusChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-grid;
        position: relative;
        flex-shrink: 0;
        vertical-align: middle;
      }

      img,
      .fallback {
        grid-area: 1 / 1;
        inline-size: 100%;
        block-size: 100%;
        min-inline-size: 0;
        min-block-size: 0;
        border-radius: inherit;
      }

      img {
        object-fit: cover;
      }

      img[aria-hidden='true'] {
        visibility: hidden;
      }

      .fallback {
        display: grid;
        place-items: center;
        overflow: hidden;
      }

      .badge {
        position: absolute;
        inset-inline-end: 0;
        inset-block-end: 0;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  src = '';
  alt = '';
  fallback = '';
  size: 'sm' | 'default' | 'lg' = 'default';
  fallbackDelay = 0;
  keepMounted = false;
  loading: 'eager' | 'lazy' = 'eager';
  srcSet = '';
  sizes = '';
  crossOrigin: '' | 'anonymous' | 'use-credentials' = '';
  referrerPolicy: ReferrerPolicy = '';
  onLoadingStatusChange: ((status: AvatarLoadingStatus) => void) | undefined;
  #status: AvatarLoadingStatus = 'idle';
  #generation = 0;
  #preloader: HTMLImageElement | null = null;
  #cancelDelay: (() => void) | undefined;
  #fallbackReady = false;
  #needsLoad = true;
  get imageLoadingStatus(): AvatarLoadingStatus {
    return this.#status;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#needsLoad = true;
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    ++this.#generation;
    this.#clearLoad();
    this.#cancelDelay?.();
    this.#cancelDelay = undefined;
    super.disconnectedCallback();
  }
  #clearLoad(): void {
    if (this.#preloader) this.#preloader.onload = this.#preloader.onerror = null;
    this.#preloader = null;
  }
  #setStatus(status: AvatarLoadingStatus, generation: number): void {
    if (!this.isConnected || generation !== this.#generation || status === this.#status) return;
    this.#status = status;
    if (status === 'loaded') {
      this.#cancelDelay?.();
      this.#cancelDelay = undefined;
    }
    this.requestUpdate();
    this.onLoadingStatusChange?.(status);
    this.emit('tp-loading-status-change', { status });
  }
  #scheduleFallback(): void {
    this.#cancelDelay?.();
    this.#cancelDelay = undefined;
    if (this.#fallbackReady || this.#status === 'loaded') return;
    const delay = Number.isFinite(this.fallbackDelay) ? Math.max(0, this.fallbackDelay) : 0;
    if (!delay) {
      this.#fallbackReady = true;
      return;
    }
    const view = this.ownerDocument.defaultView;
    if (!view) return;
    const generation = this.#generation;
    const timer = view.setTimeout(() => {
      this.#cancelDelay = undefined;
      if (!this.isConnected || generation !== this.#generation) return;
      this.#fallbackReady = true;
      this.requestUpdate();
    }, delay);
    this.#cancelDelay = () => view.clearTimeout(timer);
  }
  #beginLoad(): void {
    this.#needsLoad = false;
    this.#clearLoad();
    const generation = ++this.#generation;
    if (!this.src && !this.srcSet) {
      this.#setStatus('idle', generation);
      return;
    }
    this.#setStatus('loading', generation);
    if (this.keepMounted) return;
    const image = this.ownerDocument.createElement('img');
    this.#preloader = image;
    image.onload = () => this.#setStatus('loaded', generation);
    image.onerror = () => this.#setStatus('error', generation);
    if (this.referrerPolicy) image.referrerPolicy = this.referrerPolicy;
    image.crossOrigin = this.crossOrigin || null;
    if (this.sizes) image.sizes = this.sizes;
    if (this.srcSet) image.srcset = this.srcSet;
    if (this.src) image.src = this.src;
    if (image.complete) this.#setStatus(image.naturalWidth > 0 ? 'loaded' : 'error', generation);
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const sourceChanged =
      this.#needsLoad ||
      (['src', 'srcSet', 'sizes', 'crossOrigin', 'referrerPolicy', 'keepMounted'] as const).some(
        (key) => changed.has(key),
      );
    if (sourceChanged) this.#beginLoad();
    if (sourceChanged || changed.has('fallbackDelay')) this.#scheduleFallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.keepMounted && this.#status === 'loading') {
      const image = this.shadowRoot?.querySelector('img');
      if (image?.complete && (this.src || this.srcSet))
        this.#setStatus(image.naturalWidth > 0 ? 'loaded' : 'error', this.#generation);
    }
  }
  readonly #slotsChanged = (): void => {
    this.requestUpdate();
  };
  protected override render() {
    const generation = this.#generation;
    const loaded = this.#status === 'loaded';
    const name = this.alt || this.fallback;
    const badge = Array.from(this.children).some((child) => child.slot === 'badge');
    return html`
      ${
        this.keepMounted || loaded
          ? keyed(
              generation,
              this.renderPart(
                'avatar-image',
                Object.freeze({ loadingStatus: this.#status, loaded }),
                {
                  tag: 'img',
                  properties: {
                    part: 'image avatar-image',
                    loading: this.loading,
                    crossorigin: this.crossOrigin || undefined,
                    referrerpolicy: this.referrerPolicy || undefined,
                    sizes: this.sizes || undefined,
                    srcset: this.srcSet || undefined,
                    src: this.src || undefined,
                    alt: this.alt,
                    'aria-hidden': loaded ? undefined : 'true',
                    'data-loading': this.#status === 'loading',
                    'data-error': this.#status === 'error',
                    '@load': () => this.#setStatus('loaded', generation),
                    '@error': () => this.#setStatus('error', generation),
                  },
                },
              ),
            )
          : nothing
      }
      ${
        !loaded && this.#fallbackReady
          ? this.renderPart('avatar-fallback', Object.freeze({ loadingStatus: this.#status }), {
              tag: 'span',
              properties: {
                class: 'fallback',
                part: 'fallback avatar-fallback',
                role: name ? 'img' : undefined,
                'aria-label': name || undefined,
              },
              content: html`<slot>${this.fallback}</slot>`,
            })
          : nothing
      }
      ${this.renderPart('avatar-badge', Object.freeze({ visible: badge }), {
        tag: 'span',
        properties: { class: 'badge', part: 'avatar-badge', hidden: !badge },
        content: html`<slot name="badge" @slotchange=${this.#slotsChanged}></slot>`,
      })}
    `;
  }
}

/** Composition uses the same Avatar for omitted-member presentation. */
export class TpAvatarGroup extends TpElement {
  static tagName = 'tp-avatar-group';
  static presentationTagName = 'tp-avatar';
  static override properties = {
    ...TpElement.properties,
    size: { type: String, reflect: true },
    omitted: { type: Number },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
        vertical-align: middle;
      }

      .group {
        display: flex;
        align-items: center;
      }

      ::slotted(tp-avatar:not(:first-child)),
      .count {
        margin-inline-start: calc(-1 * var(--tp-space-2));
      }

      ::slotted(tp-avatar),
      .count {
        box-shadow: 0 0 0 var(--tp-border-width-strong) var(--tp-background);
      }
    `,
  ];
  size: 'sm' | 'default' | 'lg' = 'default';
  omitted = 0;
  protected override render() {
    const count = Math.max(0, Math.trunc(Number.isFinite(this.omitted) ? this.omitted : 0));
    return this.renderPart('avatar-group', Object.freeze({ size: this.size, omitted: count }), {
      properties: { class: 'group', part: 'avatar-group' },
      content: html`<slot></slot>${
          count
            ? this.renderPart(
                'avatar-overflow-count',
                Object.freeze({ size: this.size, omitted: count }),
                {
                  tag: 'tp-avatar',
                  properties: {
                    class: 'count',
                    part: 'avatar-overflow-count',
                    '.size': this.size,
                    dir: 'ltr',
                    fallback: `+${count}`,
                    alt: `${count} additional participants`,
                  },
                },
              )
            : nothing
        }`,
    });
  }
}
