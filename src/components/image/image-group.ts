import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  parseStaggerFrom,
  RevealCoordinator,
  revealCoordinatorHost,
  type RevealCoordinatorHost,
  type StaggerFrom,
} from '../../foundation/reveal-coordination.js';
import { imagePresentation } from '../../presentation/families/image.js';

export type ImageGroupLoadingStatus = 'idle' | 'loading' | 'loaded';

/**
 * Coordinates the Images inside it: it fetches every member once the group nears the viewport,
 * reports the aggregate loading status, and reveals the members together in document order,
 * `stagger` milliseconds apart, only after all of them have settled (loaded and decoded, failed,
 * or unsourced) and nothing holds it. Inside a Scroll trigger (or another group) it is a member of
 * that coordinator and plays its sequence when the outer one reveals it.
 *
 * Members never trigger their own reveal; the group owns their timing. Events share names with
 * the image events: check `event.target` to tell the group's from a member's, which bubble too.
 *
 * @slot - Content, including the member Images at any depth.
 * @fires tp-loading-status-change - `{ status, loaded, failed, total }` when the aggregate
 * status changes.
 * @fires tp-reveal-change - `{ revealed }` when the group sequence starts or resets.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last member's reveal settles.
 */
export class TpImageGroup extends TpElement {
  static tagName = 'tp-image-group';
  static override presentation = imagePresentation;
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
    `,
  ];

  /** Milliseconds between consecutive member reveals, in document order; 0 reveals in sync. */
  stagger = 0;
  /** The member the stagger starts from. */
  staggerFrom: StaggerFrom = 'first';
  /** Default reveal effect for members without their own. */
  reveal = '';
  /** Replay the group reveal each time the group re-enters view. */
  revealRepeat = false;
  /** While set (or while any member holds), the group waits in its start state. */
  revealHold = false;

  #status: ImageGroupLoadingStatus = 'idle';

  readonly #coordinator = new RevealCoordinator(this, {
    stagger: () => this.stagger,
    staggerFrom: () => parseStaggerFrom(this.staggerFrom),
    repeat: () => this.revealRepeat,
    hold: () => this.revealHold,
    reveal: () => this.reveal,
    emit: (type, detail) => this.emit(type, detail),
    status: ({ status, loaded, failed, total }) => {
      // `loaded` also waits for decoding, so the group never reveals an undecoded member.
      const next = status === 'ready' ? 'loaded' : status;
      if (next === this.#status) return;
      this.#status = next;
      this.setAttribute('data-status', next);
      this.emit('tp-loading-status-change', { status: next, loaded, failed, total });
    },
  });

  /** @internal The coordination its member Images join. */
  readonly [revealCoordinatorHost]: RevealCoordinatorHost = this.#coordinator.host;

  /** Aggregate loading status of the members. */
  get loadingStatus(): ImageGroupLoadingStatus {
    return this.#status;
  }

  /** The member images, in document order. */
  get images(): HTMLElement[] {
    return this.#coordinator.members
      .map((member) => member.element)
      .filter((element) => element.localName === 'tp-image');
  }

  /** Whether the group sequence has played (false again after a repeat reset). */
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
    // Members read the default effect while they render their start state.
    this.#coordinator.configChanged(changed.has('reveal'));
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-image-group': TpImageGroup;
  }
}
