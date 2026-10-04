import { bindPart } from '../foundation/part.js';
import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { progressMotionRoles } from './progress/motion.js';
import {
  prepareMotion,
  resolvesReducedMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

export const displayMotionRoles = {
  carouselTrack: {
    name: 'track',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  progressValue: progressMotionRoles.value,
  progressIndeterminate: progressMotionRoles.indeterminate,
  spinnerRotation: {
    name: 'rotation',
    kind: 'ambient',
    phases: ['start', 'stop'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export { TpAvatar, TpAvatarGroup } from './avatar/index.js';
export type { AvatarLoadingStatus } from './avatar/index.js';

export class TpCarousel extends TpElement {
  static tagName = 'tp-carousel';
  static override properties = {
    ...TpElement.properties,
    index: { type: Number, reflect: true },
    loop: { type: Boolean },
    autoplay: { type: Number },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: block;
      }

      .viewport {
        overflow: hidden;
      }

      .track {
        display: flex;
        transition: transform calc(var(--tp-duration-normal) * var(--tp-motion-scale))
          var(--tp-easing-standard);
        transform: translateX(calc(var(--tp-carousel-index, 0) * -100%));
      }

      .track[data-tp-motion-driven] {
        transition: none !important;
      }

      ::slotted(*) {
        flex: 0 0 100%;
      }

      .controls {
        display: flex;
        justify-content: space-between;
        margin-top: var(--tp-space-2);
      }
    `,
  ];
  index = 0;
  loop = false;
  autoplay = 0;
  #slides: HTMLElement[] = [];
  #timer: number | undefined;
  #trackMotion: MotionHandle | null = null;
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const previous = changed.get('index');
    if (previous === undefined || previous === this.index) return;
    this.#trackMotion = prepareMotion(
      this,
      this.renderRoot.querySelector<HTMLElement>('.track'),
      displayMotionRoles.carouselTrack,
      { phase: 'change', fromState: Number(previous), toState: this.index },
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('index')) {
      this.#trackMotion?.start();
      this.#trackMotion = null;
    }
  }
  protected override render() {
    return html`<section
      part="root"
      aria-roledescription="carousel"
      @keydown=${this.#key}
      @pointerenter=${this.#pause}
      @pointerleave=${this.#schedule}
    >
      <div class="viewport" part="viewport">
        <div
          class="track"
          part="track"
          ${bindPart({ style: { '--tp-carousel-index': this.index } })}
        >
          <slot @slotchange=${this.#sync}></slot>
        </div>
      </div>
      <div class="controls" part="controls">
        <button
          class="control"
          part="previous focusable"
          type="button"
          ?disabled=${this.disabled || (!this.loop && this.index <= 0)}
          @click=${(e: Event) => this.#move(-1, e)}
          aria-label="Previous slide"
        >
          ‹</button
        ><span part="status" aria-live="polite"
          >${this.#slides.length ? `${this.index + 1} of ${this.#slides.length}` : '0 of 0'}</span
        ><button
          class="control"
          part="next focusable"
          type="button"
          ?disabled=${this.disabled || (!this.loop && this.index >= this.#slides.length - 1)}
          @click=${(e: Event) => this.#move(1, e)}
          aria-label="Next slide"
        >
          ›
        </button>
      </div>
    </section>`;
  }
  #sync = (event: Event): void => {
    this.#slides = assignedElements(event.currentTarget as HTMLSlotElement);
    this.#slides.forEach((slide, i) => {
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${i + 1} of ${this.#slides.length}`);
      slide.toggleAttribute('inert', i !== this.index);
    });
    this.index = Math.max(0, Math.min(this.index, this.#slides.length - 1));
    this.#schedule();
    this.requestUpdate();
  };
  #move(delta: number, event?: Event): void {
    if (!this.#slides.length) return;
    let next = this.index + delta;
    if (this.loop) next = (next + this.#slides.length) % this.#slides.length;
    else next = Math.max(0, Math.min(this.#slides.length - 1, next));
    const previous = this.index;
    if (
      next !== previous &&
      this.dispatchEvent(
        new TpValueChangeEvent(next, previous, event ? eventReason(event) : 'programmatic', event),
      )
    ) {
      this.index = next;
      this.#syncSlides();
    }
  }
  #syncSlides(): void {
    this.#slides.forEach((slide, i) => slide.toggleAttribute('inert', i !== this.index));
    this.#schedule();
  }
  #key(event: KeyboardEvent): void {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      const rtl = this.direction === 'rtl';
      this.#move((event.key === 'ArrowRight') !== rtl ? 1 : -1, event);
    }
  }
  #pause = (): void => {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
  };
  #schedule = (): void => {
    this.#pause();
    if (this.autoplay > 0 && !resolvesReducedMotion(this))
      this.#timer = window.setTimeout(() => this.#move(1), this.autoplay);
  };
  override disconnectedCallback(): void {
    this.#pause();
    super.disconnectedCallback();
  }
}

export * from './data-visualization/index.js';

export class TpMessageScroller extends TpElement {
  static tagName = 'tp-message-scroller';
  static override properties = {
    ...TpElement.properties,
    follow: { type: Boolean, reflect: true },
    threshold: { type: Number },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      .viewport {
        overflow: auto;
        max-height: var(--tp-message-scroller-height, calc(var(--tp-spacing) * 120));
        overscroll-behavior: contain;
      }
    `,
  ];
  follow = true;
  threshold = 24;
  #viewport: HTMLElement | null = null;
  #observer: MutationObserver | null = null;
  protected override render() {
    return html`<div
      class="viewport"
      part="viewport"
      role="log"
      aria-live="polite"
      @scroll=${this.#scroll}
    >
      <slot></slot>
    </div>`;
  }
  protected override firstUpdated(): void {
    this.#viewport = this.renderRoot.querySelector('.viewport');
    this.#observer = new MutationObserver(() => this.#content());
    this.#observer.observe(this, { childList: true, subtree: true });
    this.#content();
  }
  #scroll = (): void => {
    if (!this.#viewport) return;
    const distance =
      this.#viewport.scrollHeight - this.#viewport.scrollTop - this.#viewport.clientHeight;
    this.follow = distance <= this.threshold;
  };
  #content(): void {
    if (this.follow && this.#viewport) this.#viewport.scrollTop = this.#viewport.scrollHeight;
  }
  scrollToEnd(): void {
    this.follow = true;
    this.#content();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    super.disconnectedCallback();
  }
}

export { TpProgress } from './progress/index.js';

export * from './resizable-panel-group/index.js';

export * from './scroll-area/index.js';

export class TpSeparator extends TpElement {
  static tagName = 'tp-separator';
  static override properties = {
    ...TpElement.properties,
    decorative: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        height: var(--tp-border-width);
        width: 100%;
      }

      :host([orientation='vertical']) {
        height: 100%;
        width: var(--tp-border-width);
      }
    `,
  ];
  decorative = true;
  protected override render() {
    return this.renderPart(
      'root',
      Object.freeze({ decorative: this.decorative, orientation: this.orientation }),
      {
        tag: 'div',
        properties: {
          part: 'root',
          role: this.decorative ? 'none' : 'separator',
          'aria-orientation': this.decorative ? nothing : this.orientation,
        },
      },
    );
  }
}

export class TpSpinner extends TpElement {
  static tagName = 'tp-spinner';
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
        animation: spin calc(var(--tp-duration-fast) * 5) linear infinite;
        animation-play-state: var(--tp-motion-play-state, running);
      }

      :host([data-tp-motion-driven]) {
        animation: none !important;
      }

      @keyframes spin {
        to {
          rotate: 1turn;
        }
      }
    `,
  ];
  label = 'Loading';
  size: 'sm' | 'default' | 'lg' = 'default';
  #rotationMotion: MotionHandle | null = null;
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (!this.isConnected || this.#rotationMotion) return;
      this.#rotationMotion = prepareMotion(this, this, displayMotionRoles.spinnerRotation, {
        phase: 'start',
        fromState: null,
        toState: 'loading',
      });
      this.#rotationMotion.start();
    });
  }
  override disconnectedCallback(): void {
    this.#rotationMotion = null;
    super.disconnectedCallback();
  }
  protected override render() {
    return this.label
      ? html`<span class="visually-hidden" role="status">${this.label}</span>`
      : nothing;
  }
}

export { TpToast } from './toast/index.js';
