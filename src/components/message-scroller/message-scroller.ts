import { css, html, type PropertyValues } from 'lit';
import { hiddenStyles } from '../shared/control-styles.js';
import { createId } from '../../foundation/id.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { resolvesReducedMotion } from '../../foundation/motion.js';
import { MessageScrollerProvider, type ScrollOptions } from './provider.js';
import { messageScrollerContext, messageScrollerOwner } from './context.js';
import type { TpMessageScrollerItem } from './parts.js';
import { messageScrollerPresentation } from '../../presentation/families/message-scroller.js';
import { TpMessageScrollerViewport } from './parts.js';
import { TpMessageScrollerContent } from './parts.js';
import { TpMessageScrollerReturnControl } from './parts.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/**
 * A transcript viewport that opens at the latest message, follows streaming replies while the
 * reader is at the end, and leaves them alone once they scroll away. Scrolling stays the browser's
 * own; the application owns the messages. Put items directly inside it, or compose the viewport,
 * content and return control yourself to configure them.
 *
 * @slot - The items, or an explicit viewport and return control.
 * @fires tp-value-change - Cancelable proposal of a new pinned state, as the reader reaches or leaves the end; a controlled scroller must publish the accepted `pinned`.
 * @cssprop --tp-message-scroller-height - The block size of the frame; use `100%` inside a parent whose height is set.
 */
export class TpMessageScroller extends TpElement {
  static tagName = 'tp-message-scroller';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpMessageScrollerViewport, TpMessageScrollerContent, TpMessageScrollerReturnControl];
  }
  static override presentation = messageScrollerPresentation;
  static override properties = {
    ...TpElement.properties,
    pinned: { type: Boolean, noAccessor: true },
    defaultPinned: { type: Boolean, attribute: 'default-pinned' },
    follow: { type: Boolean },
    threshold: { type: Number },
    initialPosition: { type: String, attribute: 'initial-position' },
    readingLine: { type: Number, attribute: 'reading-line' },
    previousItemPeek: { type: Number, attribute: 'previous-item-peek' },
    returnControlPeek: { type: Number, attribute: 'return-control-peek' },
    preserveOnPrepend: { type: Boolean, attribute: 'preserve-on-prepend' },
    knownMessageIds: { attribute: false },
    label: { type: String },
    returnDirection: { type: String, attribute: 'return-direction' },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-block-size: 0;
        min-inline-size: 0;
      }

      .root {
        position: relative;
        display: flex;
        flex-direction: column;
        min-block-size: 0;
        overflow: hidden;
        block-size: var(--tp-message-scroller-height, calc(var(--tp-spacing) * 120));
      }

      slot {
        display: contents;
      }

      ${hiddenStyles}
    `,
  ];
  /** @internal Marks the element as a message scroller for its constituents. */
  readonly [messageScrollerContext] = true as const;
  #members = new Map<HTMLElement, { name: string; member: TpElement }>();
  #explicit = false;
  #membershipObserver: MutationObserver | undefined;
  #pinnedInput: boolean | undefined;
  /** Whether the scroller starts pinned to the end, when it owns the pinned state. Set the property to false to open free. */
  defaultPinned = true;
  /** Keeps the newest content in view as it grows while the reader is pinned to the end. Set the property to false to stop following. */
  follow = true;
  /** How close to the end, in pixels, still counts as at the end. */
  threshold = 8;
  /** Where the transcript first opens: at the start, at the end, or at the latest anchored turn when it is taller than the viewport. */
  initialPosition: 'start' | 'end' | 'preserve' | 'last-anchor' = 'end';
  /** The reading offset below the top padding, in pixels, where an anchored turn and a jumped-to message land. */
  readingLine = 0;
  /** How much of the previous message, in pixels, stays visible above an anchored turn. */
  previousItemPeek = 0;
  /** Extra space at the end, in pixels, so the return control never covers the last message. */
  returnControlPeek = 0;
  /** Keeps the first visible message in place when earlier history is inserted above it. */
  preserveOnPrepend = true;
  /** Ids of messages the application knows but has not mounted yet, so a jump to one waits for it instead of failing. */
  knownMessageIds: readonly string[] = [];
  /** The accessible name of the viewport and the log, such as "Support chat". */
  label = 'Conversation';
  /** Which end the built-in return control scrolls to, for transcripts read from the top. */
  returnDirection: 'start' | 'end' = 'end';
  #pin = new ControllableState<boolean>({
    host: this,
    initialValue: true,
    readControlledValue: () => this.#pinnedInput,
    readDefaultValue: () => this.defaultPinned,
  });
  /** Whether the reader is pinned to the end, where new content stays in view; set it before the scroller connects to control it, then publish each accepted proposal back. */
  get pinned() {
    return this.#pin.value;
  }
  set pinned(value: boolean) {
    const old = this.#pinnedInput;
    this.#pinnedInput = value;
    this.#pin.sync();
    this.requestUpdate('pinned', old);
  }
  #legacyIds = new WeakMap<HTMLElement, string>();
  /** The scrolling engine: the same commands, the native viewport and subscriptions, for controls outside the scroller. */
  readonly provider: MessageScrollerProvider = new MessageScrollerProvider({
    rows: () => {
      const items = [
        ...this.querySelectorAll<TpMessageScrollerItem>('tp-message-scroller-item'),
      ].filter((row) => messageScrollerOwner(row) === this);
      if (items.length)
        return items.map((row) => ({
          id: this.#rowId(row, row.messageId),
          anchor: row.scrollAnchor,
          element: row,
          addressable: !!row.messageId,
        }));
      // Preserve the original direct-message composition while new addressable rows use Item.
      const content = this.#part('message-scroller-content')?.member;
      return [...(this.#explicit && content ? content.children : this.children)]
        .filter(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && !node.localName.startsWith('tp-message-scroller-'),
        )
        .map((element) => {
          return {
            id: this.#rowId(element, element.id),
            element,
            anchor: element.hasAttribute('scroll-anchor'),
          };
        });
    },
    knownIds: () => this.knownMessageIds,
    pinned: () => this.pinned,
    pin: (value, event) => {
      this.#pin.set(
        value,
        event?.type === 'keydown' ? 'keyboard' : event ? 'pointer' : 'programmatic',
        event,
      );
      return this.pinned === value;
    },
    follow: () => this.follow,
    initialPosition: () => this.initialPosition,
    threshold: () => this.threshold,
    readingLine: () => Math.max(0, this.readingLine),
    previousItemPeek: () => Math.max(0, this.previousItemPeek),
    returnControlPeek: () => Math.max(0, this.returnControlPeek),
    preserveOnPrepend: () =>
      (this.#part('message-scroller-viewport')?.member as TpMessageScrollerViewport | undefined)
        ?.preserveOnPrepend ?? this.preserveOnPrepend,
    reducedMotion: () => resolvesReducedMotion(this),
    changed: () => this.#publish(),
  });
  #rowId(element: HTMLElement, supplied: string) {
    if (supplied) return supplied;
    let id = this.#legacyIds.get(element);
    if (!id) {
      id = createId('message');
      this.#legacyIds.set(element, id);
    }
    return id;
  }
  #part(name: string) {
    for (const [element, entry] of this.#members)
      if (entry.name === name && element.isConnected) return { element, ...entry };
  }
  /** @internal Constituent registration; not a second state owner. */
  registerScrollerPart(name: string, element: HTMLElement, member: TpElement): () => void {
    this.#members.set(element, { name, member });
    element.part.add(name);
    const release = this.presentationController.registerPart(name, element);
    queueMicrotask(() => {
      if (this.isConnected) {
        this.#connect();
        this.provider.schedule();
      }
    });
    return () => {
      release();
      this.#members.delete(element);
      if (this.provider.viewport === element || name === 'message-scroller-content')
        this.provider.disconnect();
      this.provider.schedule();
    };
  }
  #syncComposition = () => {
    const explicit = [...this.querySelectorAll('tp-message-scroller-viewport')].some(
      (node) => messageScrollerOwner(node as HTMLElement) === this,
    );
    if (explicit !== this.#explicit) {
      this.#explicit = explicit;
      this.requestUpdate();
    }
    this.provider.schedule();
  };
  override connectedCallback(): void {
    super.connectedCallback();
    this.#syncComposition();
    this.#membershipObserver = new this.ownerDocument.defaultView!.MutationObserver(
      this.#syncComposition,
    );
    this.#membershipObserver.observe(this, { childList: true, subtree: true });
    void this.updateComplete.then(() => {
      if (this.isConnected) this.#connect();
    });
  }
  override disconnectedCallback(): void {
    this.#membershipObserver?.disconnect();
    this.provider.disconnect();
    super.disconnectedCallback();
  }
  #connect() {
    const viewport = this.#part('message-scroller-viewport')?.element;
    const entry = this.#part('message-scroller-content');
    const content = entry?.element;
    const spacer = (entry?.member as TpMessageScrollerContent | undefined)?.spacerElement;
    if (!viewport || !content || !spacer || this.provider.viewport === viewport) return;
    this.provider.connect(viewport, content, spacer, this);
    this.#publish();
  }
  #publish() {
    // Pending viewports are hidden: measure real rows before enabling offscreen skipping.
    this.style.setProperty(
      '--_tp-message-scroller-content-visibility',
      this.provider.pendingScroll ? 'visible' : 'auto',
    );
    const edges = this.provider.scrollable.value;
    const tokens = [edges.start && 'start', edges.end && 'end'].filter(Boolean).join(' ');
    for (const node of [
      this,
      this.renderRoot?.querySelector('[part~="message-scroller"]'),
      this.provider.viewport,
    ]) {
      node?.toggleAttribute(
        'data-pending-scroll',
        this.provider.pendingScroll && this.initialPosition !== 'start',
      );
      node?.toggleAttribute('data-scrollable-start', edges.start);
      node?.toggleAttribute('data-scrollable-end', edges.end);
      node?.toggleAttribute('data-autoscrolling', this.provider.autoscrolling);
      node?.setAttribute('data-scroll-mode', this.provider.mode);
      if (tokens) node?.setAttribute('data-scrollable', tokens);
      else node?.removeAttribute('data-scrollable');
    }
    this.toggleAttribute('data-pinned', this.pinned);
    this.#part('message-scroller-viewport')?.member.requestUpdate();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#connect();
    if (changed.has('pinned') && this.#pinnedInput !== undefined && !this.provider.pendingScroll) {
      if (
        this.pinned &&
        this.provider.mode !== 'following-bottom' &&
        this.provider.mode !== 'settling-jump'
      )
        this.provider.scrollToEnd();
      else if (!this.pinned && this.provider.mode === 'following-bottom')
        this.provider.mode = 'free-scrolling';
    }
    for (const { member } of this.#members.values())
      if (changed.has('partContracts') || changed.has('label')) member.requestUpdate();
    if (changed.size) this.provider.schedule();
    this.#publish();
  }
  /** Scrolls to the start of the transcript; returns a receipt whose `status` is accepted, pending or rejected and whose `finished` settles when the scroll ends. */
  scrollToStart(options?: ScrollOptions) {
    return this.provider.scrollToStart(options);
  }
  /** Scrolls to the end and resumes following; returns the same receipt as `scrollToStart`. */
  scrollToEnd(options?: ScrollOptions) {
    return this.provider.scrollToEnd(options);
  }
  /** Scrolls a message into view by its id, aligned to the start by default; a known message that is not mounted yet waits as pending. */
  scrollToMessage(id: string, options?: ScrollOptions) {
    return this.provider.scrollToMessage(id, options);
  }
  protected override render() {
    return this.renderPart('message-scroller', Object.freeze({ pinned: this.pinned }), {
      properties: { class: 'root', part: 'message-scroller' },
      content: this.#explicit
        ? html`<slot></slot>`
        : html` <tp-message-scroller-viewport exportparts="message-scroller-viewport, viewport">
              <tp-message-scroller-content exportparts="message-scroller-content"
                ><slot></slot
              ></tp-message-scroller-content>
            </tp-message-scroller-viewport>
            <tp-message-scroller-return-control
              exportparts="message-scroller-return-control"
              .returnDirection=${this.returnDirection}
            ></tp-message-scroller-return-control>`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-message-scroller': TpMessageScroller;
  }
}
