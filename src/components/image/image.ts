import { clampScrollSmoothing } from '../../foundation/scroll-progress.js';
import { css, html, nothing, type PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { styleMap } from 'lit/directives/style-map.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { ImageLoadController, type ImageLoadStatus } from '../../foundation/image-load.js';
import {
  resolvesReducedMotion,
  type MotionRoleDefinition,
  stateRole,
} from '../../foundation/motion.js';
import { observeIntersection } from '../../foundation/observation.js';
import {
  clampParallaxDepth,
  observeParallax,
  parallaxAxis,
  parallaxDriver,
  parallaxGeometry,
  type ParallaxDirection,
} from '../../foundation/parallax.js';
import { RevealMembership, type RevealMember } from '../../foundation/reveal-coordination.js';
import {
  revealsImmediately,
  RevealPlayback,
  StandaloneReveal,
  transitionSpan,
  cssTimeMs,
} from '../../foundation/reveal-playback.js';
import { imageOffIcon } from '../../icons/image.js';
import { imagePresentation } from '../../presentation/families/image.js';
import { transitionCss } from '../../presentation/motion.js';
import { TpAspectRatio } from '../aspect-ratio/aspect-ratio.js';
import { TpIcon } from '../icon/icon.js';
import { TpSkeleton } from '../skeleton/skeleton.js';
import { TpSpinner } from '../spinner/spinner.js';
import {
  hasWidthDescriptors,
  readSources,
  SOURCE_ATTRIBUTES,
  type ImageSourceRecord,
} from './sources.js';

export type ImageLoadingStatus = ImageLoadStatus;
export type ImageFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
export type ImagePlaceholder = 'skeleton' | 'spinner' | 'none';
export type ImageZoom = 'none' | 'in' | 'out';
/** Scroll-linked effects: one direction (displacement) and/or one scroll zoom. */
export type ImageParallaxEffect = ParallaxDirection | 'zoom-in' | 'zoom-out';
/** `none`, or a space-separated list of `ImageParallaxEffect` tokens, e.g. `up zoom-in`. */
export type ImageParallax = 'none' | ImageParallaxEffect | (string & {});
export type ImageRevealEffect = 'fade' | 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out';

/** Milliseconds of the first time in a computed time list (`0.56s`, `560ms`). */
const REVEAL_EFFECTS: readonly ImageRevealEffect[] = [
  'fade',
  'up',
  'down',
  'left',
  'right',
  'zoom-in',
  'zoom-out',
];

export const imageMotionRoles = {
  reveal: stateRole('reveal'),
} as const satisfies Record<string, MotionRoleDefinition>;

/**
 * `tp-image`: a responsive image in an optional fixed-ratio frame, with a placeholder while it
 * loads, a fallback when it fails, and optional hover zoom, scroll parallax and viewport reveal
 * (Foundation §18.17, Component Library Image).
 *
 * The browser selects and loads the resource: request attributes and `<source>` children are
 * passed to a native `<picture>`, and loading status is read from that image, so native lazy
 * loading is never defeated by a preload. Visibility and parallax subscribe to shared observers
 * only while they are needed, so a page can hold hundreds of images.
 *
 * Markers: `data-status`, `data-in-view` (present while observed and intersecting), `data-revealed`.
 *
 * @slot - `<source>` children (media, type, srcset, sizes, width, height), in priority order.
 * @slot placeholder - Replaces the default loading placeholder.
 * @slot fallback - Replaces the default failure fallback.
 * @csspart frame - The clipping frame (Aspect-ratio box when `ratio` is set).
 * @csspart media - The layer that zoom and parallax transform.
 * @csspart picture - The native image.
 * @csspart placeholder - The loading surface.
 * @csspart fallback - The failure surface.
 * @fires tp-loading-status-change - `{ status }` after each accepted loading status change.
 * @cssprop --tp-image-position - Object position of the image. Default `50% 50%`.
 * @cssprop --tp-image-zoom-scale - Hover zoom scale. Default `1.1`.
 * @cssprop --tp-image-reveal-distance - Reveal travel. Default `var(--tp-space-6)`.
 * @cssprop --tp-image-reveal-scale - Reveal scale offset for zoom-in/zoom-out. Default `0.08`.
 * @cssprop --tp-image-reveal-delay - Reveal delay, for staggering. Default `0s`.
 */
export class TpImage extends TpElement {
  static tagName = 'tp-image';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpAspectRatio, TpSkeleton, TpSpinner, TpIcon];
  }
  static override presentation = imagePresentation;
  static override properties = {
    ...TpElement.properties,
    src: { type: String },
    alt: { type: String },
    srcSet: { type: String, attribute: 'srcset' },
    sizes: { type: String },
    crossOrigin: { type: String, attribute: 'crossorigin' },
    referrerPolicy: { type: String, attribute: 'referrerpolicy' },
    fetchPriority: { type: String, attribute: 'fetchpriority' },
    width: { type: Number },
    height: { type: Number },
    loading: { type: String },
    ratio: { type: Number, noAccessor: true },
    fit: { type: String, reflect: true },
    placeholder: { type: String, reflect: true },
    zoom: { type: String, reflect: true },
    zoomed: { type: Boolean, reflect: true },
    parallax: { type: String, reflect: true },
    parallaxDepth: { type: Number, attribute: 'parallax-depth' },
    parallaxSmoothing: { type: Number, attribute: 'parallax-smoothing' },
    reveal: { type: String, reflect: true },
    revealRepeat: { type: Boolean, attribute: 'reveal-repeat', reflect: true },
    revealHold: { type: Boolean, attribute: 'reveal-hold', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        position: relative;
        min-inline-size: 0;
        transition:
          opacity var(--_reveal-duration) var(--_reveal-easing),
          translate var(--_reveal-duration) var(--_reveal-easing),
          scale var(--_reveal-duration) var(--_reveal-easing);

        /* The group adds its stagger offset; reduced motion removes waiting along with motion. */
        transition-delay: calc(
          (var(--tp-image-reveal-delay, 0s) + var(--_tp-image-group-delay, 0ms)) *
            var(--tp-motion-scale, 1)
        );

        /* Reveal timing is consumer-tunable; the shared motion scale still applies. */
        --_reveal-duration: calc(
          var(--tp-image-reveal-duration, calc(var(--tp-duration-normal) * 2)) *
            var(--tp-motion-scale, 1)
        );
        --_reveal-easing: var(--tp-image-reveal-easing, var(--tp-easing-standard));
      }

      /* Reveal start values (Foundation §18.17 img-reveal), shared by the timed start state and
         the scrubbed keyframe; data-revealed returns to rest. */
      :host([data-reveal~='fade']) {
        --_reveal-opacity: 0;
      }

      :host([data-reveal~='up']) {
        --_reveal-y: var(--tp-image-reveal-distance, var(--tp-space-6));
      }

      :host([data-reveal~='down']) {
        --_reveal-y: calc(-1 * var(--tp-image-reveal-distance, var(--tp-space-6)));
      }

      :host([data-reveal~='left']) {
        --_reveal-x: var(--tp-image-reveal-distance, var(--tp-space-6));
      }

      :host([data-reveal~='right']) {
        --_reveal-x: calc(-1 * var(--tp-image-reveal-distance, var(--tp-space-6)));
      }

      :host([data-reveal~='zoom-in']) {
        --_reveal-scale: calc(1 - var(--tp-image-reveal-scale, 0.08));
      }

      :host([data-reveal~='zoom-out']) {
        --_reveal-scale: calc(1 + var(--tp-image-reveal-scale, 0.08));
      }

      :host([data-reveal]:not([data-revealed], [data-tp-scrub])) {
        opacity: var(--_reveal-opacity, 1);
        translate: var(--_reveal-x, 0%) var(--_reveal-y, 0%);
        scale: var(--_reveal-scale, 1);
      }

      /* Scrubbed (Foundation §18.17 img-scrub): the scroll sets the time; the image shows its
         eased reveal at that time, its reveal delay included. */
      @keyframes tp-image-reveal {
        from {
          opacity: var(--_reveal-opacity, 1);
          translate: var(--_reveal-x, 0%) var(--_reveal-y, 0%);
          scale: var(--_reveal-scale, 1);
        }
      }

      :host([data-reveal][data-tp-scrub]) {
        transition: none;
        animation: tp-image-reveal var(--_reveal-duration) var(--_reveal-easing) both paused;
        animation-delay: calc(var(--tp-image-reveal-delay, 0s) - var(--_tp-image-time, 0ms));
      }

      /* Returning to the start state (repeat, off screen) is instant; only revealing animates. */
      :host(:not([data-revealed])) {
        transition-duration: 0s;
      }

      :host([data-tp-motion-driven~='reveal']) {
        transition: none !important;
      }

      /* Off-screen loading placeholders stop their ambient motion. */
      :host([data-status='loading']:not([data-in-view])) {
        --tp-motion-play-state: paused;
      }

      .frame {
        display: block;
        position: relative;
        overflow: clip;
        border-radius: inherit;
      }

      div.frame {
        block-size: 100%;
        object-fit: cover;
      }

      :host([fit='contain']) div.frame {
        object-fit: contain;
      }

      :host([fit='fill']) div.frame {
        object-fit: fill;
      }

      :host([fit='none']) div.frame {
        object-fit: none;
      }

      :host([fit='scale-down']) div.frame {
        object-fit: scale-down;
      }

      .media {
        /* --_overscan and --_reach come from the shared parallax geometry; reduced motion rests. */
        --_motion: clamp(0, var(--tp-motion-scale, 1), 1);
        --_travel: calc(var(--_reach, 0) * 100% * var(--_motion));
        --_zoom: 1;

        display: block;
        position: relative;
        inline-size: 100%;
        block-size: 100%;
        border-radius: inherit;
        scale: calc((1 + var(--_overscan, 0) * var(--_motion)) * var(--_zoom));

        /* Hover zoom: slower than control feedback, settling with an ease-out by default. */
        transition: scale
          calc(
            var(--tp-image-zoom-duration, calc(var(--tp-duration-normal) * 2)) *
              var(--tp-motion-scale, 1)
          )
          var(--tp-image-zoom-easing, ease-out);
      }

      /* With a ratio, Aspect-ratio box fits its slotted Media; the picture inherits that fit. */
      div.frame > .media {
        object-fit: inherit;
      }

      :host([parallax~='up']) .media {
        --_shift-y: calc(-1 * var(--_travel));
      }

      :host([parallax~='down']) .media {
        --_shift-y: var(--_travel);
      }

      :host([parallax~='left']) .media {
        --_shift-x: calc(-1 * var(--_travel));
      }

      :host([parallax~='right']) .media {
        --_shift-x: var(--_travel);
      }

      :host([zoom='out']) .media,
      :host([zoom='in'][zoomed]) .media {
        --_zoom: var(--tp-image-zoom-scale, 1.1);
      }

      :host([zoom='out'][zoomed]) .media {
        --_zoom: 1;
      }

      @media (hover: hover) {
        :host([zoom='in']:hover) .media {
          --_zoom: var(--tp-image-zoom-scale, 1.1);
        }

        :host([zoom='out']:hover) .media {
          --_zoom: 1;
        }
      }

      :host(:is([parallax~='up'], [parallax~='down'], [parallax~='left'], [parallax~='right']))
        .media[data-driver='script'] {
        translate: calc(var(--_shift-x, 0px) * var(--_progress, 0))
          calc(var(--_shift-y, 0px) * var(--_progress, 0));
      }

      /*
       * The timeline follows the host: a view() on Media would bind to the clipping frame, which
       * is a scroll container of its own and never moves.
       */
      :host([parallax]:not([parallax='none'], [parallax=''])) {
        view-timeline: --tp-image-parallax block;
      }

      /* A sideways strip measures progress along its inline axis. */
      :host([parallax]:not([parallax='none'], [parallax=''])[data-parallax-axis='inline']) {
        view-timeline-axis: inline;
      }

      :host(:is([parallax~='up'], [parallax~='down'], [parallax~='left'], [parallax~='right']))
        .media[data-driver='timeline'] {
        animation: tp-image-parallax linear both;
        animation-duration: auto;
        animation-timeline: --tp-image-parallax;
      }

      @keyframes tp-image-parallax {
        from {
          translate: calc(-1 * var(--_shift-x, 0px)) calc(-1 * var(--_shift-y, 0px));
        }

        to {
          translate: var(--_shift-x, 0%) var(--_shift-y, 0%);
        }
      }

      picture {
        display: contents;
        object-fit: inherit;
      }

      img {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        border-radius: inherit;
        object-fit: inherit;
        object-position: var(--tp-image-position, 50% 50%);
        opacity: 0;
        transition: ${transitionCss(['opacity'])};
      }

      :host([data-status='loaded']) img {
        opacity: 1;
      }

      /*
       * Scroll zoom scales the picture inside Media, so it composes with displacement and hover
       * zoom (both on Media). It only enlarges, so the frame edges never show.
       */
      :host([parallax~='zoom-in']) img {
        --_scroll-zoom-from: 1;
        --_scroll-zoom-to: calc(1 + var(--_zoom-reach, 0) * var(--_motion));
      }

      :host([parallax~='zoom-out']) img {
        --_scroll-zoom-from: calc(1 + var(--_zoom-reach, 0) * var(--_motion));
        --_scroll-zoom-to: 1;
      }

      :host(:is([parallax~='zoom-in'], [parallax~='zoom-out'])) .media[data-driver='script'] img {
        scale: calc(
          var(--_scroll-zoom-from) + (var(--_scroll-zoom-to) - var(--_scroll-zoom-from)) *
            (var(--_progress, 0) + 1) / 2
        );
      }

      :host(:is([parallax~='zoom-in'], [parallax~='zoom-out'])) .media[data-driver='timeline'] img {
        animation: tp-image-parallax-zoom linear both;
        animation-duration: auto;
        animation-timeline: --tp-image-parallax;
      }

      @keyframes tp-image-parallax-zoom {
        from {
          scale: var(--_scroll-zoom-from, 1);
        }

        to {
          scale: var(--_scroll-zoom-to, 1);
        }
      }

      .layer {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        border-radius: inherit;
        overflow: clip;
      }

      .layer tp-skeleton {
        position: absolute;
        inset: 0;
        inline-size: 100%;
        block-size: 100%;
        border-radius: inherit;
      }

      .layer tp-spinner,
      .layer tp-icon {
        position: relative;
      }
    `,
  ];

  src = '';
  alt = '';
  srcSet = '';
  sizes = '';
  crossOrigin: '' | 'anonymous' | 'use-credentials' = '';
  referrerPolicy: ReferrerPolicy = '';
  fetchPriority: '' | 'high' | 'low' | 'auto' = '';
  width: number | undefined;
  height: number | undefined;
  loading: 'lazy' | 'eager' = 'lazy';
  fit: ImageFit = 'cover';
  placeholder: ImagePlaceholder = 'skeleton';
  zoom: ImageZoom = 'none';
  zoomed = false;
  parallax: ImageParallax = 'none';
  parallaxDepth = 0.3;
  /** Share of the remaining scroll-linked motion left after a 60 Hz frame; 0 is locked to scroll. */
  parallaxSmoothing = 0;
  reveal = '';
  /** Reveal again on every viewport entry instead of only the first. */
  revealRepeat = false;
  /** While set, a ready reveal waits in its start state; clearing it plays the reveal. */
  revealHold = false;

  #ratio: number | undefined;
  /** Width divided by height; unset uses the image's intrinsic geometry. */
  get ratio(): number | undefined {
    return this.#ratio;
  }
  set ratio(value: number | null | undefined) {
    const next = value ?? undefined;
    if (next !== undefined && (!Number.isFinite(next) || next <= 0))
      throw new RangeError('Image ratio must be a finite number greater than zero.');
    const previous = this.#ratio;
    this.#ratio = next;
    this.requestUpdate('ratio', previous);
  }

  readonly #image = new ImageLoadController(this, {
    onStatusChange: (status) => {
      this.setAttribute('data-status', status);
      this.emit('tp-loading-status-change', { status });
      if (status === 'loaded') this.#decode();
      this.#settledChanged();
    },
  });
  /** The load generation whose image has been decoded, so a reveal's first frame has pixels. */
  #decodedGeneration = -1;
  /** A concrete `sizes` replacing `auto` once a group asks a lazy image to load now. */
  #eagerSizes: string | undefined;
  #eager = false;
  #requestKey: string | undefined;
  #sources: ImageSourceRecord[] = [];
  #sourceObserver: MutationObserver | undefined;
  #releaseVisibility: (() => void) | undefined;
  #releaseParallax: (() => void) | undefined;
  #parallaxSmoothingApplied = 0;
  #parallaxMedia: HTMLElement | null = null;
  #driver: 'timeline' | 'script' = 'script';

  /** Loading status of the current source. */
  get imageLoadingStatus(): ImageLoadingStatus {
    return this.#image.status;
  }

  /** The candidate the browser selected for the current source. */
  get currentSrc(): string {
    return this.#img?.currentSrc ?? '';
  }

  /** Whether the reveal has played (false again after a repeat reset). */
  get revealed(): boolean {
    return this.#playback.revealed;
  }

  get #img(): HTMLImageElement | null {
    return this.renderRoot?.querySelector('img') ?? null;
  }

  get #parallaxTokens(): string[] {
    return this.parallax.split(/\s+/);
  }

  /** The displacement direction, if any. */
  get #parallaxDirection(): ParallaxDirection | undefined {
    const tokens = this.#parallaxTokens;
    return (['up', 'down', 'left', 'right'] as const).find((token) => tokens.includes(token));
  }

  get #parallaxZoom(): boolean {
    const tokens = this.#parallaxTokens;
    return tokens.includes('zoom-in') || tokens.includes('zoom-out');
  }

  get #parallaxActive(): boolean {
    return this.#parallaxDirection !== undefined || this.#parallaxZoom;
  }

  /** The image's own reveal effect, or its group's default. */
  get #revealEffects(): ImageRevealEffect[] {
    const tokens = (this.reveal || this.#membership.host?.reveal || '').split(/\s+/);
    return REVEAL_EFFECTS.filter((effect) => tokens.includes(effect));
  }

  /** `sizes` for a request: supplied, `auto` for lazy width sets, or the size measured on eager. */
  #sizesFor(sizes: string | null | undefined, srcset: string | null | undefined) {
    if (sizes) return sizes;
    if (!hasWidthDescriptors(srcset)) return undefined;
    if (this.#eagerSizes) return this.#eagerSizes;
    return this.loading === 'lazy' ? 'auto, 100vw' : undefined;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // The load controller abandons its generation on disconnection; request again.
    this.#requestKey = undefined;
    this.#syncSourceObserver();
    this.#membership.connect();
    this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#releaseVisibility?.();
    this.#releaseVisibility = undefined;
    this.#standalone.release();
    this.removeAttribute('data-in-view');
    this.#releaseParallax?.();
    this.#releaseParallax = undefined;
    this.#parallaxMedia = null;
    this.#sourceObserver?.disconnect();
    this.#sourceObserver = undefined;
    this.#membership.disconnect();
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#sources = readSources(this);
    const sizes = this.#sizesFor(this.sizes, this.srcSet);
    const key = JSON.stringify([
      this.src,
      this.srcSet,
      this.sizes,
      this.crossOrigin,
      this.referrerPolicy,
      this.#sources,
    ]);
    if (key !== this.#requestKey) {
      this.#requestKey = key;
      this.#image.load(
        {
          src: this.src,
          srcset: this.srcSet,
          sizes,
          crossOrigin: this.crossOrigin,
          referrerPolicy: this.referrerPolicy,
          sources: this.#sources,
        },
        { preload: false },
      );
      this.setAttribute('data-status', this.#image.status);
    }
    const effects = this.#revealEffects.join(' ');
    if (effects) this.setAttribute('data-reveal', effects);
    else this.removeAttribute('data-reveal');
    // No intersection support or reduced motion: reveal before the first paint once settled.
    if (revealsImmediately(this)) this.#standalone.update();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#image.observe(this.#img);
    this.#syncVisibility();
    this.#syncParallax();
    if (changed.has('revealHold') || changed.has('reveal') || changed.has('revealRepeat'))
      this.#settledChanged();
  }

  /** Settled: loaded and decoded, failed, or without a source (after the request is issued). */
  #settled(): boolean {
    if (this.#requestKey === undefined) return false;
    const status = this.#image.status;
    if (status === 'loading') return false;
    return status !== 'loaded' || this.#decodedGeneration === this.#image.generation;
  }

  /** Decodes once per loaded source before a reveal may use it. */
  #decode(): void {
    const generation = this.#image.generation;
    const img = this.#img;
    const done = () => {
      if (generation !== this.#image.generation) return;
      this.#decodedGeneration = generation;
      this.#settledChanged();
    };
    if (typeof img?.decode === 'function') void img.decode().then(done, done);
    else done();
  }

  #settledChanged(): void {
    if (this.#membership.coordinated) this.#membership.update();
    else this.#standalone.update();
  }

  /**
   * The reveal (Foundation §18.18): played after a coordinator's stagger offset, announced, and
   * settled from the claimed driver's playback or the CSS transition.
   */
  readonly #playback = new RevealPlayback({
    owner: this,
    role: imageMotionRoles.reveal,
    emit: (type, detail) => this.emit(type, detail),
    effect: () => this.#revealEffects.join(' '),
    apply: (revealed, delay) => {
      if (revealed && delay > 0) this.style.setProperty('--_tp-image-group-delay', `${delay}ms`);
      else this.style.removeProperty('--_tp-image-group-delay');
      this.toggleAttribute('data-revealed', revealed);
      // A revealed image that does not repeat no longer needs reveal visibility.
      if (this.isConnected) this.#syncVisibility();
    },
    span: () => {
      const view = this.ownerDocument.defaultView;
      return view ? transitionSpan(view.getComputedStyle(this)) : 0;
    },
  });

  /** What this image offers its coordinator (an Image group or a Scroll trigger). */
  readonly #member: RevealMember = {
    element: this,
    ready: () => this.#settled(),
    outcome: () => {
      const status = this.#image.status;
      return status === 'loaded'
        ? 'loaded'
        : status === 'error'
          ? 'failed'
          : status === 'loading'
            ? 'pending'
            : 'none';
    },
    revealing: () => this.#revealEffects.length > 0,
    revealed: () => this.#playback.revealed,
    held: () => this.revealHold,
    prepare: () => {
      if (this.#eager || this.loading === 'eager' || this.#image.status !== 'loading') return;
      // Native `sizes=auto` needs lazy loading; keep the laid-out width it would have used.
      const width = this.#img?.getBoundingClientRect().width ?? 0;
      if (width > 0) this.#eagerSizes = `${Math.ceil(width)}px`;
      this.#eager = true;
      this.requestUpdate();
    },
    reveal: (delay) => this.#playback.play(delay),
    reset: () => this.#playback.reset(),
    refresh: () => this.requestUpdate(),
    duration: () => {
      const view = this.ownerDocument.defaultView;
      if (!view || !this.#revealEffects.length) return 0;
      // The scrubbed keyframe resolves the duration; its delay at time 0 is the reveal delay.
      this.toggleAttribute('data-tp-scrub', true);
      this.style.setProperty('--_tp-image-time', '0ms');
      const style = view.getComputedStyle(this);
      return (
        Math.max(0, cssTimeMs(style.animationDelay.split(',')[0]!)) +
        cssTimeMs(style.animationDuration.split(',')[0]!)
      );
    },
    scrub: (time) => {
      if (time === null) {
        this.removeAttribute('data-tp-scrub');
        this.style.removeProperty('--_tp-image-time');
        return;
      }
      this.toggleAttribute('data-tp-scrub', true);
      this.style.setProperty('--_tp-image-time', `${Math.max(0, time)}ms`);
    },
  };

  readonly #membership = new RevealMembership(this, this.#member, () => this.requestUpdate());

  /**
   * Without a coordinator the image reveals itself once in view and settled: loaded and decoded
   * (so its first animated frame has pixels), failed, or unsourced.
   */
  readonly #standalone = new StandaloneReveal(this, {
    playback: this.#playback,
    repeat: () => this.revealRepeat,
    revealing: () => this.#revealEffects.length > 0,
    ready: () => this.#settled(),
    held: () => this.revealHold,
    coordinated: () => this.#membership.coordinated,
  });

  #syncVisibility(): void {
    const loadingMotion =
      this.#image.status === 'loading' &&
      (this.placeholder !== 'none' || this.querySelector(':scope > [slot="placeholder"]'));
    const repeats = this.revealRepeat && !revealsImmediately(this);
    const needed =
      this.isConnected &&
      ((!this.#membership.coordinated &&
        this.#revealEffects.length > 0 &&
        (!this.#playback.revealed || repeats)) ||
        Boolean(loadingMotion) ||
        this.#parallaxActive);
    if (needed && !this.#releaseVisibility) {
      this.#releaseVisibility = observeIntersection(this, this.#intersected);
    } else if (!needed && this.#releaseVisibility) {
      this.#releaseVisibility();
      this.#releaseVisibility = undefined;
      this.removeAttribute('data-in-view');
    }
  }

  readonly #intersected = (entry: IntersectionObserverEntry): void => {
    if (!this.#releaseVisibility) return;
    this.toggleAttribute('data-in-view', entry.isIntersecting);
    // Layout around the image may have changed since the driver was chosen.
    if (entry.isIntersecting && this.#parallaxActive) this.#chooseDriver();
    this.#syncVisibility();
  };

  /**
   * Picks the progress axis of the real scroller and re-renders when the clipping ancestors
   * change which driver can follow it.
   */
  #chooseDriver(): void {
    const axis = parallaxAxis(this);
    if (axis === 'inline') this.setAttribute('data-parallax-axis', axis);
    else this.removeAttribute('data-parallax-axis');
    const driver = parallaxDriver(this, { smoothing: this.parallaxSmoothing });
    if (driver === this.#driver) return;
    this.#driver = driver;
    this.requestUpdate();
  }

  #syncParallax(): void {
    if (this.#parallaxActive && this.isConnected) this.#chooseDriver();
    else this.removeAttribute('data-parallax-axis');
    const media = this.renderRoot.querySelector<HTMLElement>('.media');
    const wanted =
      this.isConnected &&
      media !== null &&
      this.#parallaxActive &&
      this.#driver === 'script' &&
      !resolvesReducedMotion(this);
    const smoothing = clampScrollSmoothing(this.parallaxSmoothing);
    if (wanted && media === this.#parallaxMedia && smoothing === this.#parallaxSmoothingApplied)
      return;
    this.#releaseParallax?.();
    this.#releaseParallax = undefined;
    this.#parallaxMedia = null;
    if (!wanted) return;
    this.#parallaxMedia = media;
    this.#parallaxSmoothingApplied = smoothing;
    this.#releaseParallax = observeParallax(
      this,
      (progress) => media.style.setProperty('--_progress', progress.toFixed(4)),
      { smoothing },
    );
  }

  /** Attribute edits on `<source>` children; created only while there are any. */
  #syncSourceObserver(): void {
    const hasSources = [...this.children].some((child) => child.localName === 'source');
    if (hasSources && !this.#sourceObserver && this.isConnected) {
      const Observer = this.ownerDocument.defaultView?.MutationObserver;
      if (!Observer) return;
      this.#sourceObserver = new Observer(() => this.requestUpdate());
      this.#sourceObserver.observe(this, {
        subtree: true,
        attributes: true,
        attributeFilter: [...SOURCE_ATTRIBUTES],
      });
    } else if (!hasSources && this.#sourceObserver) {
      this.#sourceObserver.disconnect();
      this.#sourceObserver = undefined;
    }
  }

  readonly #sourcesChanged = (): void => {
    this.#syncSourceObserver();
    this.requestUpdate();
  };

  #renderSources() {
    return this.#sources.map(
      (source) =>
        html`<source
          media=${ifDefined(source.media)}
          type=${ifDefined(source.type)}
          width=${ifDefined(source.width)}
          height=${ifDefined(source.height)}
          sizes=${ifDefined(this.#sizesFor(source.sizes, source.srcset))}
          srcset=${ifDefined(source.srcset)}
        />`,
    );
  }

  #renderLayers(status: ImageLoadingStatus) {
    if (status === 'loading') {
      const mode = this.placeholder;
      return html`<div class="layer" part="placeholder image-placeholder" aria-hidden="true">
        <slot name="placeholder"
          >${
            mode === 'none'
              ? nothing
              : html`<tp-skeleton motion=${mode === 'skeleton' ? 'pulse' : 'none'}></tp-skeleton>`
          }${mode === 'spinner' ? html`<tp-spinner label=""></tp-spinner>` : nothing}</slot
        >
      </div>`;
    }
    if (status === 'loaded') return nothing;
    const supplied = this.querySelector(':scope > [slot="fallback"]') !== null;
    return html`<div
      class="layer"
      part="fallback image-fallback"
      aria-hidden=${supplied ? nothing : 'true'}
    >
      <slot name="fallback" @slotchange=${() => this.requestUpdate()}
        ><tp-skeleton motion="none"></tp-skeleton
        ><tp-icon .icon=${imageOffIcon} size="var(--tp-icon-size-lg)"></tp-icon
      ></slot>
    </div>`;
  }

  #parallaxStyle(): Record<string, string | undefined> {
    const { scale, travel } = parallaxGeometry(clampParallaxDepth(this.parallaxDepth));
    const zoomReach = this.#parallaxZoom ? String(scale - 1) : undefined;
    if (!this.#parallaxDirection)
      return { '--_overscan': undefined, '--_reach': undefined, '--_zoom-reach': zoomReach };
    return {
      '--_overscan': String(scale - 1),
      '--_reach': String(travel),
      '--_zoom-reach': zoomReach,
    };
  }

  protected override render() {
    const status = this.#image.status;
    const loading = status === 'loading';
    const media = html`<div
      class="media"
      part="media image-media"
      data-driver=${this.#parallaxActive ? this.#driver : nothing}
      style=${styleMap(this.#parallaxStyle())}
    >
      <picture
        >${this.#renderSources()}<img
          part="picture image-picture"
          loading=${this.#eager ? 'eager' : this.loading}
          decoding="async"
          fetchpriority=${this.fetchPriority || nothing}
          crossorigin=${this.crossOrigin || nothing}
          referrerpolicy=${this.referrerPolicy || nothing}
          width=${ifDefined(this.width)}
          height=${ifDefined(this.height)}
          alt=${this.alt}
          sizes=${ifDefined(this.#sizesFor(this.sizes, this.srcSet))}
          srcset=${this.srcSet || nothing}
          src=${this.src || nothing}
      /></picture>
    </div>`;
    const content = html`${media}${this.#renderLayers(status)}`;
    const busy = loading ? 'true' : nothing;
    const frame =
      this.ratio === undefined
        ? html`<div class="frame" part="frame image-frame" aria-busy=${busy}>${content}</div>`
        : html`<tp-aspect-ratio
            class="frame"
            part="frame image-frame"
            aria-busy=${busy}
            .ratio=${this.ratio}
            fit=${this.fit}
            >${content}</tp-aspect-ratio
          >`;
    return html`${frame}<slot hidden @slotchange=${this.#sourcesChanged}></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-image': TpImage;
  }
}
