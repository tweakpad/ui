import type { ReactiveController, ReactiveControllerHost } from 'lit';

/** `idle`: no source; `loading`: a source is pending; `loaded`/`error`: the current source settled. */
export type ImageLoadStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** Image request attributes; only `src` or `srcset` makes a source loadable. */
export interface ImageLoadSource {
  src?: string | null | undefined;
  srcset?: string | null | undefined;
  sizes?: string | null | undefined;
  crossOrigin?: '' | 'anonymous' | 'use-credentials' | null | undefined;
  referrerPolicy?: ReferrerPolicy | null | undefined;
}

export interface ImageLoadRequestOptions {
  /**
   * Defaults to `true`: request the source through a detached preloader image. Pass `false` when a
   * rendered or authored image performs the request and reports through `observe`, `inspect` or
   * `settle`.
   */
  preload?: boolean;
}

export interface ImageLoadControllerOptions {
  /** Runs after each accepted status change, once the host update has been requested. */
  onStatusChange?: (status: ImageLoadStatus, previous: ImageLoadStatus) => void;
  /**
   * Await `HTMLImageElement.decode()` before reporting `loaded`, so the first painted frame has
   * pixels. A rejected decode still reports `loaded` when the image has intrinsic size.
   */
  decode?: boolean;
}

/** A Lit host; elements also supply their owner document and connection state. */
export type ImageLoadHost = ReactiveControllerHost & {
  readonly ownerDocument?: Document | null;
  readonly isConnected?: boolean;
};

/** Whether an image's own attributes request a source (a `complete` state is then meaningful). */
export function hasOwnImageSource(image: HTMLImageElement): boolean {
  return Boolean(image.getAttribute('src')) || image.hasAttribute('srcset');
}

/**
 * Shared image loading-state owner (Avatar image, media poster and thumbnails).
 *
 * Each `load()` starts a generation; results from an earlier source, a replaced image or a
 * disconnected host are ignored. Already-complete images settle synchronously, and listeners and
 * preloaders are released on source change and host disconnection.
 */
export class ImageLoadController implements ReactiveController {
  #status: ImageLoadStatus = 'idle';
  #generation = 0;
  #connected = false;
  #preloader: HTMLImageElement | null = null;
  #observed: HTMLImageElement | null = null;
  #observation: AbortController | null = null;

  constructor(
    private readonly host: ImageLoadHost,
    private readonly options: ImageLoadControllerOptions = {},
  ) {
    host.addController(this);
  }

  get status(): ImageLoadStatus {
    return this.#status;
  }

  /** Identifies the current source; pass it to `settle` from render-bound image listeners. */
  get generation(): number {
    return this.#generation;
  }

  /** The image currently tracked through `observe`, if any. */
  get image(): HTMLImageElement | null {
    return this.#observed;
  }

  hostConnected(): void {
    this.#connected = true;
  }

  hostDisconnected(): void {
    this.#connected = false;
    this.#generation += 1;
    this.#release();
  }

  /** Starts a new source generation and returns it. A source without `src`/`srcset` is idle. */
  load(source: ImageLoadSource | null | undefined, options: ImageLoadRequestOptions = {}): number {
    this.#release();
    const generation = ++this.#generation;
    if (!source?.src && !source?.srcset) {
      this.#set('idle', generation);
      return generation;
    }
    this.#set('loading', generation);
    if (options.preload === false) return generation;
    const document = this.host.ownerDocument ?? globalThis.document;
    const image = document.createElement('img');
    this.#preloader = image;
    image.onload = () => this.#loaded(image, generation);
    image.onerror = () => this.#set('error', generation);
    if (source.referrerPolicy) image.referrerPolicy = source.referrerPolicy;
    image.crossOrigin = source.crossOrigin || null;
    if (source.sizes) image.sizes = source.sizes;
    if (source.srcset) image.srcset = source.srcset;
    if (source.src) image.src = source.src;
    if (image.complete) this.#complete(image, generation);
    return generation;
  }

  /**
   * Tracks an existing image for the current generation: an already-complete image with its own
   * source settles immediately; later `load`/`error` events settle it. `null` stops tracking.
   */
  observe(image: HTMLImageElement | null): void {
    if (image === this.#observed) return;
    this.#unobserve();
    if (!image) return;
    this.#observed = image;
    const generation = this.#generation;
    const observation = new AbortController();
    this.#observation = observation;
    const { signal } = observation;
    image.addEventListener('load', () => this.#loaded(image, generation), { signal });
    image.addEventListener('error', () => this.#set('error', generation), { signal });
    this.inspect(image, generation);
  }

  /** Settles from an image whose request already completed; incomplete or unsourced images wait. */
  inspect(image: HTMLImageElement | null | undefined, generation = this.#generation): void {
    if (image?.complete && hasOwnImageSource(image)) this.#complete(image, generation);
  }

  /** Reports a result observed by the caller, e.g. a rendered image's `load`/`error` listener. */
  settle(
    status: 'loaded' | 'error',
    generation = this.#generation,
    image?: HTMLImageElement | null,
  ): void {
    if (status === 'loaded' && image) this.#loaded(image, generation);
    else this.#set(status, generation);
  }

  #complete(image: HTMLImageElement, generation: number): void {
    if (image.naturalWidth > 0) this.#loaded(image, generation);
    else this.#set('error', generation);
  }

  #loaded(image: HTMLImageElement, generation: number): void {
    if (!this.options.decode || typeof image.decode !== 'function') {
      this.#set('loaded', generation);
      return;
    }
    if (generation !== this.#generation) return;
    image.decode().then(
      () => this.#set('loaded', generation),
      () => this.#set(image.naturalWidth > 0 ? 'loaded' : 'error', generation),
    );
  }

  #set(status: ImageLoadStatus, generation: number): void {
    const connected = this.host.isConnected ?? this.#connected;
    if (!connected || generation !== this.#generation || status === this.#status) return;
    const previous = this.#status;
    this.#status = status;
    this.host.requestUpdate();
    this.options.onStatusChange?.(status, previous);
  }

  #unobserve(): void {
    this.#observation?.abort();
    this.#observation = null;
    this.#observed = null;
  }

  #release(): void {
    if (this.#preloader) this.#preloader.onload = this.#preloader.onerror = null;
    this.#preloader = null;
    this.#unobserve();
  }
}
