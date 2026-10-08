import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  parseStaggerFrom,
  RevealCoordinator,
  revealCoordinatorHost,
  type RevealCoordinatorHost,
  type StaggerFrom,
} from '../../foundation/reveal-coordination.js';
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
 * Markers: `data-status`, `data-in-view` (while observed), `data-revealed`.
 *
 * @slot - Content, including the members at any depth.
 * @csspart scroll-trigger - The host.
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
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      :host([hidden]) {
        display: none;
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

  #status: ScrollTriggerStatus = 'idle';

  readonly #coordinator = new RevealCoordinator(this, {
    stagger: () => this.stagger,
    staggerFrom: () => parseStaggerFrom(this.staggerFrom),
    repeat: () => this.revealRepeat,
    hold: () => this.revealHold,
    reveal: () => this.reveal,
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
    return html`<slot></slot>`;
  }
}
