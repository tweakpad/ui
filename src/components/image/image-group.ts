import { css, html, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { resolvesReducedMotion } from '../../foundation/motion.js';
import { canObserveIntersection, observeIntersection } from '../../foundation/observation.js';
import { imagePresentation } from '../../presentation/families/image.js';
import {
  groupLoadingStatus,
  imageGroupHost,
  staggerDelays,
  type ImageGroupHost,
  type ImageGroupMember,
} from './group-protocol.js';

export type ImageGroupLoadingStatus = 'idle' | 'loading' | 'loaded';

/** Where a group starts fetching every member: within 25% of the visible area. */
const LOAD_MARGIN = '25%';
/** Where a repeating group starts its reveal: 10% inside the viewport's block edges. */
const REVEAL_ENTRY_INSET = '-10% 0px -10% 0px';

/**
 * `tp-image-group`: coordinates the `tp-image` elements inside it (Foundation §18.17 `img-group`).
 * It fetches every member once the group nears the viewport, reports the aggregate loading
 * status, and reveals the members together in document order, `stagger` milliseconds apart, only
 * after all of them have settled (loaded and decoded, failed, or unsourced) and nothing holds it.
 *
 * Members never trigger their own reveal; the group owns their timing. Events share names with
 * the image events: check `event.target` to tell the group's from a member's, which bubble too.
 *
 * @slot - Content, including the member `tp-image` elements at any depth.
 * @csspart group - The host.
 * @fires tp-loading-status-change - `{ status, loaded, failed, total }` when the aggregate
 * status changes.
 * @fires tp-reveal-change - `{ revealed }` when the group sequence starts or resets.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last member's reveal settles.
 */
export class TpImageGroup extends TpElement {
  static tagName = 'tp-image-group';
  static presentationTagName = 'tp-image';
  static override presentation = imagePresentation;
  static override properties = {
    ...TpElement.properties,
    stagger: { type: Number },
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

  /** Milliseconds between consecutive member reveals, in document order; 0 reveals in sync. */
  stagger = 0;
  /** Default reveal effect for members without their own `reveal`. */
  reveal = '';
  /** Replay the group reveal each time the group re-enters view. */
  revealRepeat = false;
  /** While set (or while any member holds), the group waits in its start state. */
  revealHold = false;

  readonly #members = new Set<ImageGroupMember>();
  #status: ImageGroupLoadingStatus = 'idle';
  #counts = { loaded: 0, failed: 0, total: 0 };
  #near = false;
  #inView = false;
  #revealed = false;
  #sequence = 0;
  #release: (() => void)[] = [];
  #observedRepeat: boolean | undefined;
  #evaluating = false;

  readonly [imageGroupHost]: ImageGroupHost = ((group: TpImageGroup) => ({
    register: (member: ImageGroupMember) => {
      group.#members.add(member);
      group.#schedule();
      return () => {
        group.#members.delete(member);
        group.#schedule();
      };
    },
    update: () => group.#schedule(),
    get reveal() {
      return group.reveal;
    },
  }))(this);

  /** Aggregate loading status of the members. */
  get loadingStatus(): ImageGroupLoadingStatus {
    return this.#status;
  }

  /** The member images, in document order. */
  get images(): HTMLElement[] {
    return this.#ordered().map((member) => member.element);
  }

  /** Whether the group sequence has played (false again after a repeat reset). */
  get revealed(): boolean {
    return this.#revealed;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observe();
  }

  override disconnectedCallback(): void {
    for (const release of this.#release) release();
    this.#release = [];
    this.#observedRepeat = undefined;
    this.#near = this.#inView = false;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('revealRepeat') && this.isConnected) this.#observe();
    // Members read the default effect while they render their start state.
    if (changed.has('reveal'))
      for (const member of this.#members) (member.element as TpElement).requestUpdate();
    this.#schedule();
  }

  protected override render() {
    return html`<slot></slot>`;
  }

  #ordered(): ImageGroupMember[] {
    return [...this.#members].sort((a, b) =>
      a.element.compareDocumentPosition(b.element) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1,
    );
  }

  /** Visibility through the shared intersection service: a loading margin, entry and exit. */
  #observe(): void {
    if (this.#observedRepeat === this.revealRepeat && this.#release.length) return;
    for (const release of this.#release) release();
    this.#observedRepeat = this.revealRepeat;
    this.#release = [
      observeIntersection(
        this,
        (entry) => {
          this.#near = entry.isIntersecting;
          this.#schedule();
        },
        { rootMargin: LOAD_MARGIN, scrollMargin: LOAD_MARGIN },
      ),
      observeIntersection(this, (entry) => {
        // Fully out of view: a repeating group returns to its start state, instantly.
        if (!entry.isIntersecting && this.revealRepeat) this.#reset();
        if (!this.revealRepeat) this.#inView = entry.isIntersecting;
        else if (!entry.isIntersecting) this.#inView = false;
        this.#schedule();
      }),
    ];
    if (this.revealRepeat)
      this.#release.push(
        observeIntersection(
          this,
          (entry) => {
            if (entry.isIntersecting) this.#inView = true;
            this.#schedule();
          },
          { rootMargin: REVEAL_ENTRY_INSET },
        ),
      );
    if (!canObserveIntersection(this)) this.#near = this.#inView = true;
  }

  /** Batches member notifications into one evaluation per microtask. */
  #schedule(): void {
    if (this.#evaluating) return;
    this.#evaluating = true;
    queueMicrotask(() => {
      this.#evaluating = false;
      if (this.isConnected) this.#evaluate();
    });
  }

  #evaluate(): void {
    const members = this.#ordered();
    const aggregate = groupLoadingStatus(members.map((member) => member.status()));
    // `loaded` also waits for decoding, so the group never reveals an undecoded member.
    const status =
      aggregate.status === 'loaded' && !members.every((member) => member.settled())
        ? 'loading'
        : aggregate.status;
    this.#counts = { loaded: aggregate.loaded, failed: aggregate.failed, total: aggregate.total };
    if (status !== this.#status) {
      this.#status = status;
      this.setAttribute('data-status', status);
      this.emit('tp-loading-status-change', { status, ...this.#counts });
    }
    if (this.#near) for (const member of members) member.ensureLoading();
    const immediate = !canObserveIntersection(this) || resolvesReducedMotion(this);
    const held = this.revealHold || members.some((member) => member.held());
    if (held) return;
    if (!this.#revealed) {
      if (status === 'loaded' && (this.#inView || immediate)) this.#play(members, immediate);
      return;
    }
    // Already revealed: members that joined later reveal as soon as they settle.
    for (const member of members)
      if (member.revealing() && !member.revealed() && member.settled()) void member.reveal(0);
  }

  #play(members: ImageGroupMember[], immediate: boolean): void {
    const sequence = ++this.#sequence;
    this.#revealed = true;
    this.toggleAttribute('data-revealed', true);
    const revealing = members.filter((member) => member.revealing() && !member.revealed());
    const delays = staggerDelays(revealing.length, immediate ? 0 : this.stagger);
    this.emit('tp-reveal-change', { revealed: true });
    void Promise.all(revealing.map((member, index) => member.reveal(delays[index]!))).then(() => {
      if (sequence === this.#sequence && this.#revealed)
        this.emit('tp-reveal-change-complete', { revealed: true });
    });
  }

  #reset(): void {
    if (!this.#revealed) return;
    const sequence = ++this.#sequence;
    this.#revealed = false;
    this.removeAttribute('data-revealed');
    for (const member of this.#members) member.reset();
    this.emit('tp-reveal-change', { revealed: false });
    queueMicrotask(() => {
      if (sequence === this.#sequence) this.emit('tp-reveal-change-complete', { revealed: false });
    });
  }
}
