import { css, html, type PropertyValues } from 'lit';
import { createId } from '../../foundation/id.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import { resolvesReducedMotion } from '../../foundation/motion.js';
import { MessageScrollerProvider, type ScrollOptions } from './provider.js';

export class TpMessageScrollerItem extends TpElement {
  static tagName = 'tp-message-scroller-item';
  static presentationTagName = 'tp-message-scroller';
  static override properties = {
    ...TpElement.properties,
    messageId: { type: String, attribute: 'message-id', reflect: true },
    scrollAnchor: { type: Boolean, attribute: 'scroll-anchor', reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
        flex: none;
      }
    `,
  ];
  messageId = '';
  scrollAnchor = false;
  protected override render() {
    return this.renderPart('message-scroller-item', Object.freeze({}), {
      properties: { part: 'message-scroller-item' },
      content: html`<slot></slot>`,
    });
  }
}

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
        block-size: 100%;
        overflow: hidden;
      }

      .viewport {
        overflow: auto;
        overscroll-behavior: contain;
        min-block-size: 0;
        min-inline-size: 0;
        flex: 1;
        block-size: 100%;
        max-block-size: var(--tp-message-scroller-height, calc(var(--tp-spacing) * 120));
        overflow-anchor: none;
      }

      .content {
        display: flex;
        flex-direction: column;
        min-block-size: 100%;
      }

      .spacer {
        flex: none;
        pointer-events: none;
      }

      .return {
        position: absolute;
        inset-block-end: var(--tp-space-3);
        inset-inline-start: 50%;
        translate: -50% 0;
      }

      :host(:dir(rtl)) .return {
        translate: 50% 0;
      }

      .start {
        inset-block: var(--tp-space-3) auto;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
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
  readonly provider = new MessageScrollerProvider({
    rows: () => {
      const items = [
        ...this.querySelectorAll<TpMessageScrollerItem>('tp-message-scroller-item'),
      ].filter((row) => row.closest('tp-message-scroller') === this);
      if (items.length)
        return items.map((row) => ({ id: row.messageId, anchor: row.scrollAnchor, element: row }));
      // Preserve the original direct-message composition while new addressable rows use Item.
      return [...this.children]
        .filter((node): node is HTMLElement => node instanceof HTMLElement)
        .map((element) => {
          let id = element.id || this.#legacyIds.get(element);
          if (!id) {
            id = createId('message');
            this.#legacyIds.set(element, id);
          }
          return { id, element, anchor: element.hasAttribute('scroll-anchor') };
        });
    },
    knownIds: () => this.knownMessageIds,
    pinned: () => this.pinned,
    pin: (value, event) => {
      this.#pin.set(value, event ? 'pointer' : 'programmatic', event);
      return this.pinned === value;
    },
    follow: () => this.follow,
    initialPosition: () => this.initialPosition,
    threshold: () => this.threshold,
    readingLine: () => Math.max(0, this.readingLine),
    previousItemPeek: () => Math.max(0, this.previousItemPeek),
    returnControlPeek: () => Math.max(0, this.returnControlPeek),
    preserveOnPrepend: () => this.preserveOnPrepend,
    reducedMotion: () => resolvesReducedMotion(this),
    changed: () => this.requestUpdate(),
  });
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (this.isConnected) this.#connect();
    });
  }
  override disconnectedCallback(): void {
    this.provider.disconnect();
    super.disconnectedCallback();
  }
  #connect() {
    const viewport = this.renderRoot.querySelector<HTMLElement>('.viewport');
    if (!viewport || this.provider.viewport === viewport) return;
    this.provider.connect(
      viewport,
      this.renderRoot.querySelector('.content')!,
      this.renderRoot.querySelector('.spacer')!,
      this,
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#connect();
    if (changed.has('pinned') && this.#pinnedInput !== undefined && !this.provider.pendingScroll) {
      if (this.pinned) this.provider.scrollToEnd();
      else this.provider.mode = 'free-scrolling';
    }
    if (changed.size) this.provider.schedule();
    const edges = this.provider.scrollable.value;
    for (const node of [this, this.provider.viewport]) {
      node?.toggleAttribute('data-pending-scroll', this.provider.pendingScroll);
      node?.toggleAttribute('data-scrollable-start', edges.start);
      node?.toggleAttribute('data-scrollable-end', edges.end);
      node?.setAttribute('data-scroll-mode', this.provider.mode);
    }
    this.toggleAttribute('data-pinned', this.pinned);
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
    const state = Object.freeze({});
    const edges = this.provider.scrollable.value;
    const go = (direction: 'start' | 'end', event: MouseEvent) => {
      // Allow consumer click listeners to cancel before committing the command.
      queueMicrotask(() => {
        if (!event.defaultPrevented)
          this[direction === 'start' ? 'scrollToStart' : 'scrollToEnd']({ behavior: 'smooth' });
      });
    };
    return this.renderPart('message-scroller', state, {
      properties: { class: 'root', part: 'message-scroller' },
      content: html` ${this.renderPart('message-scroller-viewport', state, {
          properties: {
            class: 'viewport',
            part: 'viewport message-scroller-viewport',
            tabindex: '0',
            role: 'region',
            'aria-label': this.label,
          },
          content: this.renderPart('message-scroller-content', state, {
            properties: {
              class: 'content',
              part: 'message-scroller-content',
              role: 'log',
              'aria-label': this.label,
              'aria-live': 'polite',
              'aria-relevant': 'additions',
              'aria-atomic': 'false',
            },
            content: html`<slot @slotchange=${this.provider.schedule}></slot>
              <div class="spacer" aria-hidden="true"></div>`,
          }),
        })}
        <tp-button
          class=${this.returnDirection === 'start' ? 'return start' : 'return'}
          part="message-scroller-return-control"
          variant="secondary"
          size="sm"
          ?hidden=${!edges[this.returnDirection]}
          data-direction=${this.returnDirection}
          data-active=${String(edges[this.returnDirection])}
          @click=${(event: MouseEvent) => go(this.returnDirection, event)}
          >${this.returnDirection === 'start' ? 'Jump to start' : 'Jump to latest'}</tp-button
        >`,
    });
  }
}
