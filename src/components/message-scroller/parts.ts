import { css, html, type PropertyValues } from 'lit';
import { hiddenStyles } from '../shared/control-styles.js';
import { TpElement } from '../../foundation/element.js';
import { TpButton } from '../button/button.js';
import { chevronDownIcon } from '../../icons/chevron-down.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { MessageScrollerMember } from './context.js';
import { messageScrollerFadeKeyframes } from '../../presentation/recipes/message-scroller.js';
import { messageScrollerPresentation } from '../../presentation/families/message-scroller.js';
import { buttonPresentation } from '../../presentation/families/button.js';

/**
 * The native scrolling region of a Message scroller, focusable so the keyboard scrolls it. Compose
 * it explicitly to configure it or to reach its element.
 *
 * @slot - The content.
 */
export class TpMessageScrollerViewport extends TpElement {
  static tagName = 'tp-message-scroller-viewport';
  static override presentation = messageScrollerPresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    preserveOnPrepend: { type: Boolean, attribute: 'preserve-on-prepend' },
  };
  static override styles = [
    TpElement.styles,
    messageScrollerFadeKeyframes,
    css`
      :host {
        display: flex;
        flex: 1;
        min-block-size: 0;
        min-inline-size: 0;
        block-size: 100%;
      }

      .viewport {
        flex: 1;
        min-block-size: 0;
        min-inline-size: 0;
        block-size: 100%;
        overflow: auto;
        overscroll-behavior: contain;
        scrollbar-gutter: stable;
        scrollbar-width: thin;
      }

      .viewport[data-pending-scroll] {
        visibility: hidden;
      }

      .viewport[data-autoscrolling] {
        scrollbar-color: transparent transparent;
      }

      slot {
        display: contents;
      }
    `,
  ];
  /** The accessible name of the scrolling region; empty uses the scroller's label. */
  label = '';
  /** Overrides the scroller's `preserve-on-prepend` for this viewport; false leaves only the browser's own anchoring. */
  preserveOnPrepend: boolean | undefined = undefined;
  readonly #member = new MessageScrollerMember(this, 'message-scroller-viewport');
  /** The native scrolling element, for reading the scroll position or observing its size; null before the first render. */
  get viewportElement(): HTMLElement | null {
    return this.renderRoot.querySelector('.viewport');
  }
  protected override render() {
    const provider = this.#member.owner?.provider;
    return this.#member.render(
      Object.freeze({
        pendingScroll: provider?.pendingScroll ?? true,
        ...provider?.scrollable.value,
      }),
      {
        properties: {
          class: 'viewport',
          part: 'viewport message-scroller-viewport',
          tabindex: '0',
          role:
            this.#member.contract(this.partContracts['message-scroller-viewport']).hostProperties
              ?.role ?? 'region',
          'aria-label': this.label || this.#member.owner?.label || 'Conversation',
        },
        content: html`<slot></slot>`,
      },
    );
  }
  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.#member.owner?.provider.schedule();
  }
}

/**
 * The transcript inside a Message scroller's viewport: a polite log, so assistive technology hears
 * new messages as they arrive.
 *
 * @slot - The items and any other transcript content.
 */
export class TpMessageScrollerContent extends TpElement {
  static tagName = 'tp-message-scroller-content';
  static override presentation = messageScrollerPresentation;
  static override properties = { ...TpElement.properties, label: { type: String } };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-block-size: 100%;
        min-inline-size: 0;
      }

      .content {
        display: flex;
        flex-direction: column;
        min-block-size: 100%;
        min-inline-size: 0;
      }

      slot {
        display: contents;
      }

      .spacer {
        flex: none;
        pointer-events: none;
        overflow-anchor: none;
      }

      ${hiddenStyles}
    `,
  ];
  /** The accessible name of the log; empty uses the scroller's label. */
  label = '';
  readonly #member = new MessageScrollerMember(this, 'message-scroller-content');
  /** The element laying out the transcript; null before the first render. */
  get contentElement(): HTMLElement | null {
    return this.renderRoot.querySelector('.content');
  }
  /** The hidden space at the end the scroller sizes itself; read it, but do not move or resize it. */
  get spacerElement(): HTMLElement | null {
    return this.renderRoot.querySelector('.spacer');
  }
  protected override render() {
    return this.#member.render(Object.freeze({}), {
      properties: {
        class: 'content',
        part: 'message-scroller-content',
        role:
          this.#member.contract(this.partContracts['message-scroller-content']).hostProperties
            ?.role ?? 'log',
        'aria-label': this.label || this.#member.owner?.label || 'Conversation',
        'aria-live':
          this.#member.contract(this.partContracts['message-scroller-content']).hostProperties?.[
            'aria-live'
          ] ?? 'polite',
        'aria-relevant':
          this.#member.contract(this.partContracts['message-scroller-content']).hostProperties?.[
            'aria-relevant'
          ] ?? 'additions',
        'aria-atomic': 'false',
      },
      content: html`<slot @slotchange=${() => this.#member.owner?.provider.schedule()}></slot>
        <div class="spacer" aria-hidden="true" hidden></div>`,
    });
  }
}

/**
 * One message row of a Message scroller, addressable by its id and optionally the anchor of a turn.
 *
 * @slot - The message, such as a Message with its Bubble.
 */
export class TpMessageScrollerItem extends TpElement {
  static tagName = 'tp-message-scroller-item';
  static override presentation = messageScrollerPresentation;
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
        content-visibility: var(--_tp-message-scroller-content-visibility, auto);
        contain-intrinsic-size: auto 10rem;
      }
    `,
  ];
  /** The id that `scrollToMessage` and `knownMessageIds` refer to. */
  messageId = '';
  /** Marks the start of a turn, usually the reader's own prompt: a new anchored turn holds its place at the reading line while the reply streams below it. */
  scrollAnchor = false;
  readonly #member = new MessageScrollerMember(this, 'message-scroller-item');
  protected override render() {
    return this.#member.render(
      Object.freeze({ messageId: this.messageId, scrollAnchor: this.scrollAnchor }),
      {
        properties: { part: 'message-scroller-item' },
        content: html`<slot></slot>`,
      },
    );
  }
  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    this.setAttribute('data-scroll-anchor', String(this.scrollAnchor));
    if (this.messageId) this.setAttribute('data-message-id', this.messageId);
    else this.removeAttribute('data-message-id');
    this.#member.owner?.provider.schedule();
  }
}

/**
 * The Button that returns a Message scroller to the end, shown only while there is somewhere to
 * return to. Compose it explicitly to change its direction, behavior or label, or leave it out.
 */
export class TpMessageScrollerReturnControl extends TpButton {
  static override tagName = 'tp-message-scroller-return-control';
  static override presentation = buttonPresentation;
  static override properties = {
    ...TpButton.properties,
    returnDirection: { type: String, attribute: 'return-direction', reflect: true },
    behavior: { type: String },
  };
  static override styles = [
    TpButton.styles,
    css`
      :host {
        position: absolute;
        inset-inline-start: 50%;
        inset-block-end: var(--tp-space-4);
        translate: -50% 0;
        z-index: 1;
      }

      :host(:dir(rtl)) {
        translate: 50% 0;
      }

      :host([return-direction='start']) {
        inset-block: var(--tp-space-4) auto;
      }

      :host(:not([data-active])) {
        pointer-events: none;
      }

      :host([return-direction='start']) [part~='button-leading-mark'] {
        rotate: 180deg;
      }
    `,
  ];
  /** Which end the control scrolls to. */
  returnDirection: 'start' | 'end' = 'end';
  /** How the return scroll moves; reduced motion always jumps. */
  behavior: ScrollBehavior = 'smooth';
  readonly #member = new MessageScrollerMember(this, 'message-scroller-return-control', 'button');
  #activationFrame = 0;
  constructor() {
    super();
    this.variant = 'secondary';
    this.size = 'icon-sm';
    this.icon = chevronDownIcon;
  }
  /** Whether there is content past the control's end to return from; the control is inert otherwise. */
  get active() {
    return this.#member.owner?.provider.scrollable.value[this.returnDirection] ?? false;
  }
  protected override get effectiveDisabled() {
    return super.effectiveDisabled || !this.active;
  }
  protected override buttonPartContract() {
    return this.#member.contract(
      this.partContracts.button ?? this.partContracts['message-scroller-return-control'],
    );
  }
  override connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.#activateScroll);
  }
  override disconnectedCallback() {
    this.removeEventListener('click', this.#activateScroll);
    this.ownerDocument.defaultView?.cancelAnimationFrame(this.#activationFrame);
    this.#activationFrame = 0;
    super.disconnectedCallback();
  }
  #activateScroll = (event: MouseEvent) => {
    const win = this.ownerDocument.defaultView!;
    win.cancelAnimationFrame(this.#activationFrame);
    // Native event dispatch can flush microtasks between listeners. Wait until
    // propagation is complete so consumer listeners on ancestors can veto it.
    this.#activationFrame = win.requestAnimationFrame(() => {
      this.#activationFrame = 0;
      if (
        !this.isConnected ||
        !this.active ||
        this.disabled ||
        event.defaultPrevented ||
        componentHandlingPrevented(event)
      )
        return;
      const provider = this.#member.owner?.provider;
      (this.renderRoot.querySelector('[part~="button"]') as HTMLElement | null)?.blur();
      if (this.returnDirection === 'start') provider?.scrollToStart({ behavior: this.behavior });
      else provider?.scrollToEnd({ behavior: this.behavior });
    });
  };
  protected override willUpdate(changed: PropertyValues<this>) {
    super.willUpdate(changed);
    if (
      !this.hasAttribute('aria-label') ||
      this.ariaLabel === 'Scroll to start' ||
      this.ariaLabel === 'Scroll to end'
    )
      this.ariaLabel = `Scroll to ${this.returnDirection}`;
    this.inert = !this.active;
    this.toggleAttribute('data-active', this.active);
    this.setAttribute('data-direction', this.returnDirection);
  }
  protected override updated(changed: PropertyValues<this>) {
    super.updated(changed);
    const button = this.renderRoot.querySelector('[part~="button"]');
    button?.toggleAttribute('data-active', this.active);
    button?.setAttribute('data-direction', this.returnDirection);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-message-scroller-item': TpMessageScrollerItem;
    'tp-message-scroller-viewport': TpMessageScrollerViewport;
    'tp-message-scroller-content': TpMessageScrollerContent;
    'tp-message-scroller-return-control': TpMessageScrollerReturnControl;
  }
}
