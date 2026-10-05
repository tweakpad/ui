import { css, html, type PropertyValues } from 'lit';
import { createId } from '../../foundation/id.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { resolvesReducedMotion } from '../../foundation/motion.js';
import { MessageScrollerProvider, type ScrollOptions } from './provider.js';
import { messageScrollerContext, messageScrollerOwner } from './context.js';
import type {
  TpMessageScrollerItem,
  TpMessageScrollerContent,
  TpMessageScrollerViewport,
} from './parts.js';

export class TpMessageScroller extends TpElement {
  static tagName = 'tp-message-scroller';
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

      [hidden] {
        display: none !important;
      }
    `,
  ];
  readonly [messageScrollerContext] = true as const;
  #members = new Map<HTMLElement, { name: string; member: TpElement }>();
  #explicit = false;
  #membershipObserver: MutationObserver | undefined;
  #pinnedInput: boolean | undefined;
  defaultPinned = true;
  follow = true;
  threshold = 8;
  initialPosition: 'start' | 'end' | 'preserve' | 'last-anchor' = 'end';
  readingLine = 0;
  previousItemPeek = 0;
  returnControlPeek = 0;
  preserveOnPrepend = true;
  knownMessageIds: readonly string[] = [];
  label = 'Conversation';
  returnDirection: 'start' | 'end' = 'end';
  #pin = new ControllableState<boolean>({
    host: this,
    initialValue: true,
    readControlledValue: () => this.#pinnedInput,
    readDefaultValue: () => this.defaultPinned,
  });
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
  scrollToStart(options?: ScrollOptions) {
    return this.provider.scrollToStart(options);
  }
  scrollToEnd(options?: ScrollOptions) {
    return this.provider.scrollToEnd(options);
  }
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
