import { css, html, nothing, type PropertyValues } from 'lit';
import { keyed } from 'lit/directives/keyed.js';
import { TpElement } from '../../foundation/element.js';
import { ImageLoadController, type ImageLoadStatus } from '../../foundation/image-load.js';
import { avatarPresentation } from '../../presentation/families/avatar.js';

export type AvatarLoadingStatus = ImageLoadStatus;

export class TpAvatar extends TpElement {
  static tagName = 'tp-avatar';
  static override presentation = avatarPresentation;
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
  readonly #image = new ImageLoadController(this, {
    onStatusChange: (status) => {
      if (status === 'loaded') {
        this.#cancelDelay?.();
        this.#cancelDelay = undefined;
      }
      this.onLoadingStatusChange?.(status);
      this.emit('tp-loading-status-change', { status });
    },
  });
  #cancelDelay: (() => void) | undefined;
  #fallbackReady = false;
  #needsLoad = true;
  #contentObserver: MutationObserver | undefined;
  get imageLoadingStatus(): AvatarLoadingStatus {
    return this.#image.status;
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.#contentObserver = new this.ownerDocument.defaultView!.MutationObserver(
      this.#slotsChanged,
    );
    this.#contentObserver.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot'],
    });
    this.#needsLoad = true;
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#contentObserver?.disconnect();
    this.#contentObserver = undefined;
    this.#cancelDelay?.();
    this.#cancelDelay = undefined;
    super.disconnectedCallback();
  }
  #scheduleFallback(): void {
    this.#cancelDelay?.();
    this.#cancelDelay = undefined;
    if (this.#fallbackReady || this.#image.status === 'loaded') return;
    const delay = Number.isFinite(this.fallbackDelay) ? Math.max(0, this.fallbackDelay) : 0;
    if (!delay) {
      this.#fallbackReady = true;
      return;
    }
    const view = this.ownerDocument.defaultView;
    if (!view) return;
    const generation = this.#image.generation;
    const timer = view.setTimeout(() => {
      this.#cancelDelay = undefined;
      if (!this.isConnected || generation !== this.#image.generation) return;
      this.#fallbackReady = true;
      this.requestUpdate();
    }, delay);
    this.#cancelDelay = () => view.clearTimeout(timer);
  }
  #beginLoad(): void {
    this.#needsLoad = false;
    // Keep-mounted avatars request through the rendered image instead of a detached preloader.
    this.#image.load(
      {
        src: this.src,
        srcset: this.srcSet,
        sizes: this.sizes,
        crossOrigin: this.crossOrigin,
        referrerPolicy: this.referrerPolicy,
      },
      { preload: !this.keepMounted },
    );
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
    if (this.keepMounted && this.#image.status === 'loading')
      this.#image.inspect(this.shadowRoot?.querySelector('img'));
  }
  readonly #slotsChanged = (): void => {
    this.requestUpdate();
  };
  protected override render() {
    const generation = this.#image.generation;
    const status = this.#image.status;
    const loaded = status === 'loaded';
    const name = this.alt || this.fallback;
    const suppliedFallback = Array.from(this.childNodes).some((node) =>
      node.nodeType === Node.ELEMENT_NODE
        ? !(node as Element).getAttribute('slot')
        : node.nodeType === Node.TEXT_NODE && Boolean(node.textContent?.trim()),
    );
    const badge = Array.from(this.children).some((child) => child.slot === 'badge');
    return html`
      ${
        this.keepMounted || loaded
          ? keyed(
              generation,
              this.renderPart('avatar-image', Object.freeze({ loadingStatus: status, loaded }), {
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
                  'data-loading': status === 'loading',
                  'data-error': status === 'error',
                  '@load': () => this.#image.settle('loaded', generation),
                  '@error': () => this.#image.settle('error', generation),
                },
              }),
            )
          : nothing
      }
      ${
        !loaded && this.#fallbackReady
          ? this.renderPart('avatar-fallback', Object.freeze({ loadingStatus: status }), {
              tag: 'span',
              properties: {
                class: 'fallback',
                part: 'fallback avatar-fallback',
                role: name ? 'img' : undefined,
                'aria-label': name || undefined,
              },
              content: html`<slot
                  ?hidden=${!suppliedFallback}
                  @slotchange=${this.#slotsChanged}
                ></slot
                >${suppliedFallback ? nothing : this.fallback}`,
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
  static override presentation = avatarPresentation;
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
