import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  parseStaggerFrom,
  RevealCoordinator,
  revealCoordinatorHost,
  type RevealCoordinatorHost,
  type StaggerFrom,
} from '../../foundation/reveal-coordination.js';
import { parseScrollRangeSpan } from '../../foundation/scroll-progress.js';
import { scrollTriggerPresentation } from '../../presentation/families/scroll-trigger.js';

export type ScrollTriggerStatus = 'idle' | 'loading' | 'ready';

/**
 * `tp-scroll-trigger`: reveals the revealing components inside it together (Foundation §18.18,
 * Component Library Scroll trigger). Once it nears the viewport it asks every member to prepare
 * (images start loading); once it is in view, every member is ready and nothing holds, it reveals
 * them in document order, `stagger` milliseconds apart from `stagger-from`.
 *
 * Members are the `tp-image`, `tp-image-group`, `tp-text-motion` and nested `tp-scroll-trigger`
 * elements whose nearest coordinator it is, at any depth and across shadow roots. Each keeps its
 * own effect (or takes `reveal` as a default) and motion role. The trigger is an ordinary block
 * that never changes its own box, so binding it never moves the content around it.
 *
 * With `scrub`, the scroll position drives the same choreography instead of time: progress over
 * `scrub-range` follows the scroll both ways, or only forward with `scrub-once`. With `pin`, the trigger
 * becomes a track one viewport plus `--tp-scroll-trigger-pin-length` tall whose content sticks in
 * the `stage` part, so a pinned section can reveal as the scroll advances.
 *
 * Markers: `data-status`, `data-in-view` (while observed), `data-revealed`.
 *
 * @slot - Content, including the members at any depth.
 * @csspart scroll-trigger - The host.
 * @csspart stage - Wraps the content; sticky while pinned.
 * @fires tp-scroll-progress - `{ progress }` in each frame scrubbed progress changes.
 * @cssprop --tp-scroll-trigger-pin-length - Extra scroll length while pinned. Default `200cqb`
 * (twice the visible extent: the nearest size container, otherwise the viewport).
 * @cssprop --tp-scroll-trigger-pin-top - Pinned offset from the viewport start. Default `0`.
 * @fires tp-loading-status-change - `{ status, ready, failed, total }` when the aggregate
 * readiness changes.
 * @fires tp-reveal-change - `{ revealed }` when the sequence starts or a repeat resets it.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last member's reveal settles.
 */
export class TpScrollTrigger extends TpElement {
  static tagName = 'tp-scroll-trigger';
  static override presentation = scrollTriggerPresentation;
  static override properties = {
    ...TpElement.properties,
    stagger: { type: Number },
    staggerFrom: { type: String, attribute: 'stagger-from', reflect: true },
    reveal: { type: String, reflect: true },
    revealRepeat: { type: Boolean, attribute: 'reveal-repeat', reflect: true },
    revealHold: { type: Boolean, attribute: 'reveal-hold', reflect: true },
    scrub: { type: Boolean, reflect: true },
    scrubRange: { type: String, attribute: 'scrub-range', reflect: true },
    scrubSmoothing: { type: Number, attribute: 'scrub-smoothing' },
    scrubOnce: { type: Boolean, attribute: 'scrub-once', reflect: true },
    pin: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      /* The stage only boxes the content while pinned, so an unpinned trigger lays out its
         content directly. */
      .stage {
        display: contents;
      }

      /* Pinned (Foundation §18.18 vr-pin): a track one visible extent plus the pin length tall,
         the content sticking to its start. The visible extent is the nearest size container (a
         scroll container with container-type: size), otherwise the viewport: cqb falls back to
         the small viewport. The same height is set before definition. */
      :host([pin]) {
        block-size: calc(100cqb + var(--tp-scroll-trigger-pin-length, 200cqb));
      }

      :host([pin]) .stage {
        display: block;
        position: sticky;
        inset-block-start: var(--tp-scroll-trigger-pin-top, 0%);
        block-size: calc(100cqb - var(--tp-scroll-trigger-pin-top, 0%));
        overflow: clip;
      }
    `,
  ];

  /** Milliseconds between consecutive member reveals; 0 reveals them together. */
  stagger = 0;
  /** The member the stagger starts from. */
  staggerFrom: StaggerFrom = 'first';
  /** Default reveal effect for members without their own. */
  reveal = '';
  /** Replay the sequence each time the trigger re-enters view. */
  revealRepeat = false;
  /** While set (or while any member holds), every member waits in its start state. */
  revealHold = false;
  /** Reveal with the scroll position instead of over time. */
  scrub = false;
  /**
   * The scroll range mapped to progress while scrubbing: `contain`, `cover`, `entry` or `exit`,
   * or, as in CSS `animation-range`, a start and an end point such as `entry 20% contain 50%`.
   */
  scrubRange = 'contain';
  /** How far scrubbed progress trails the scroll, 0 through 0.98; 0 is locked to it. */
  scrubSmoothing = 0;
  /** Scrubbed progress only moves forward, leaving revealed members at rest on scroll back. */
  scrubOnce = false;
  /** Pin the content in a sticky stage for an extra scroll length. */
  pin = false;

  #status: ScrollTriggerStatus = 'idle';

  readonly #coordinator = new RevealCoordinator(this, {
    stagger: () => this.stagger,
    staggerFrom: () => parseStaggerFrom(this.staggerFrom),
    repeat: () => this.revealRepeat,
    hold: () => this.revealHold,
    reveal: () => this.reveal,
    scrub: () => this.scrub,
    range: () => parseScrollRangeSpan(this.scrubRange),
    smoothing: () => this.scrubSmoothing,
    scrubOnce: () => this.scrubOnce,
    marker: true,
    emit: (type, detail) => this.emit(type, detail),
    status: ({ status, ready, failed, total }) => {
      if (status === this.#status) return;
      this.#status = status;
      this.setAttribute('data-status', status);
      this.emit('tp-loading-status-change', { status, ready, failed, total });
    },
  });

  readonly [revealCoordinatorHost]: RevealCoordinatorHost = this.#coordinator.host;

  /** Aggregate readiness of the members. */
  get status(): ScrollTriggerStatus {
    return this.#status;
  }

  /** The member elements, in document order. */
  get members(): HTMLElement[] {
    return this.#coordinator.members.map((member) => member.element);
  }

  /** Whether the sequence has played (false again after a repeat reset). */
  get revealed(): boolean {
    return this.#coordinator.revealed;
  }

  /** Scrubbed progress, 0 through 1 (0 when not scrubbing). */
  get progress(): number {
    return this.#coordinator.progress;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#coordinator.connect();
  }

  override disconnectedCallback(): void {
    this.#coordinator.disconnect();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#coordinator.configChanged(changed.has('reveal'));
  }

  protected override render() {
    return html`<div part="stage" class="stage"><slot></slot></div>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-scroll-trigger': TpScrollTrigger;
  }
}
