import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { CollapsibleController } from '../../foundation/collapsible.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import { compositeControl } from '../../foundation/composite-control.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import {
  DisclosureIndicator,
  DisclosurePanelController,
} from '../../foundation/disclosure-panel.js';
import { TpElement } from '../../foundation/element.js';
import { TpOpenChangeEvent } from '../../foundation/events.js';
import { observeResize } from '../../foundation/observation.js';
import type { PartRenderOptions, PartState } from '../../foundation/part.js';
import type { PresenceState } from '../../foundation/types.js';
import { chevronDownIcon } from '../../icons/chevron-down.js';
import { descriptionListPresentation } from '../../presentation/families/description-list.js';
import { disclosureIndicatorStyles, disclosurePanelStyles } from '../../presentation/motion.js';
import { TpButton } from '../button/button.js';
import { TpIcon } from '../icon/icon.js';
import { TpDescriptionListItem } from './description-list-item.js';

/** Item counts passed to function messages. */
export interface DescriptionListCounts {
  /** Items beyond the limit. */
  hidden: number;
  /** All Items. */
  total: number;
}

export type DescriptionListMessage = string | ((counts: DescriptionListCounts) => string);

export interface DescriptionListMessages {
  /** Trigger text while the Items beyond the limit are hidden, `Show more` by default. */
  showMore?: DescriptionListMessage;
  /** Trigger text while every Item shows, `Show less` by default. */
  showLess?: DescriptionListMessage;
}

const DEFAULT_MESSAGES = { showMore: 'Show more', showLess: 'Show less' } as const;

const VIEWPORT_EXTENT = {
  block: '--description-list-height',
  inline: '--description-list-width',
} as const;
const COLLAPSED_EXTENT = '--description-list-collapsed-height';

export type DescriptionListLayout = 'inline' | 'stacked';

const isLayout = (value: unknown): value is DescriptionListLayout =>
  value === 'inline' || value === 'stacked';

const isItem = (node: Node): node is TpDescriptionListItem =>
  node instanceof TpDescriptionListItem ||
  (node as Element).localName === TpDescriptionListItem.tagName;

/**
 * Description list: label–value pairs, such as the properties of a record. With a `limit`, only
 * the first Items show and a Show more trigger reveals the rest.
 *
 * The list renders one native `dl`: a term (`dt`) and description (`dd`) per Item, with the Item
 * itself presented as the description. Items beyond the limit stay laid out but concealed, so
 * their labels keep the shared label column; the Viewport clips the list to the visible Items.
 *
 * @slot - `tp-description-list-item` elements.
 * @csspart description-list - The list (`dl`).
 * @csspart description-list-viewport - The region that clips the list while it is closed.
 * @csspart description-list-item - One label–value pair.
 * @csspart description-list-label - A term (`dt`).
 * @csspart description-list-value - A description (`dd`).
 * @csspart description-list-trigger - The composed `tp-button` that shows or hides Items.
 * @csspart description-list-trigger-label - The trigger text.
 * @csspart description-list-indicator - The trigger chevron.
 * @fires tp-open-change - Cancelable proposal to show or hide the Items beyond the limit.
 * @fires tp-open-change-complete - After the list finishes opening or closing.
 */
export class TpDescriptionList extends TpElement {
  static tagName = 'tp-description-list';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpDescriptionListItem, TpButton, TpIcon];
  }
  static override presentation = descriptionListPresentation;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static override properties = {
    ...TpElement.properties,
    limit: { type: Number, reflect: true },
    open: { type: Boolean, reflect: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    hiddenUntilFound: { type: Boolean, attribute: 'hidden-until-found', reflect: true },
    layout: { type: String, reflect: true },
    align: { type: String, reflect: true },
    messages: { attribute: false },
    onOpenChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    disclosurePanelStyles(
      "[part~='description-list-viewport']",
      VIEWPORT_EXTENT.block,
      COLLAPSED_EXTENT,
    ),
    disclosureIndicatorStyles("[part~='description-list-indicator']"),
    css`
      /* A reflected align attribute must not align the slotted values through the legacy hint. */
      :host {
        display: block;
        text-align: inherit;
      }

      /* Focus rings of values at the edges stay visible inside the clipping Viewport. */
      [part~='description-list-viewport'] {
        display: block;
        overflow-clip-margin: calc(var(--tp-ring-width) + var(--tp-ring-offset));
      }

      :host(:not([data-limited])) [part~='description-list-viewport'] {
        block-size: auto;
        overflow: visible;
      }

      /* Vertical: the pairs stack. Inline Labels share one column that follows the widest Label,
         up to a share of the list; stacked pairs span both columns. */
      [part~='description-list'] {
        position: relative;
        display: grid;
        grid-template-columns: minmax(0, 1fr);
        margin: 0;
      }

      :host([data-inline]) [part~='description-list'] {
        grid-template-columns: fit-content(40%) minmax(0, 1fr);
      }

      [part~='description-list-item'] {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        align-items: baseline;
      }

      [part~='description-list-label'],
      [part~='description-list-value'] {
        min-inline-size: 0;
        margin: 0;
      }

      /* Labels break between words; a long value such as an address breaks anywhere. */
      [part~='description-list-label'] {
        grid-column: 1;
        overflow-wrap: break-word;
      }

      [part~='description-list-value'] {
        grid-column: 2;
        overflow-wrap: anywhere;
      }

      [data-layout='stacked'] > [part~='description-list-label'],
      [data-layout='stacked'] > [part~='description-list-value'] {
        grid-column: 1 / -1;
      }

      /* Horizontal: the pairs sit side by side and wrap onto further lines. */
      :host([orientation='horizontal']) [part~='description-list'] {
        display: flex;
        flex-wrap: wrap;
        align-items: flex-start;
      }

      :host([orientation='horizontal']) [part~='description-list-item'] {
        display: flex;
        flex-direction: column;
        max-inline-size: 100%;
      }

      :host([orientation='horizontal']) [part~='description-list-item'][data-layout='inline'] {
        flex-direction: row;
        align-items: baseline;
      }

      /* Concealed pairs keep their place in a vertical layout, so opening never moves the values;
         in a horizontal row they take no space. A pair hidden until found stays searchable; the
         browser skips its layout instead. */
      [part~='description-list-item'][data-concealed]:not([hidden='until-found']) {
        visibility: hidden;
      }

      :host([orientation='horizontal'])
        [part~='description-list-item'][data-concealed]:not([hidden='until-found']) {
        display: none;
      }

      /* Center: inline Labels meet their Values at the column seam; stacked pairs center. */
      :host([align='center']) [data-layout='inline'] > [part~='description-list-label'] {
        text-align: end;
      }

      :host([align='center']) [part~='description-list-item'][data-layout='stacked'] {
        align-items: center;
        text-align: center;
      }

      [part~='description-list-trigger'] {
        display: flex;
        inline-size: fit-content;
      }

      :host([align='center']:not([orientation='horizontal'], [layout='stacked']))
        [part~='description-list-trigger'] {
        margin-inline-start: var(--_tp-description-list-value-start, 0);
      }

      :host([align='center'][layout='stacked']:not([orientation='horizontal']))
        [part~='description-list-trigger'] {
        margin-inline: auto;
      }

      [part~='description-list-indicator'] {
        display: inline-flex;
      }
    `,
  ];

  /** Most Items shown while closed; unset, below one or not a number shows every Item. */
  limit: number | null = null;
  /** Whether the Items beyond the limit show. */
  open = false;
  /** Initial uncontrolled open state. */
  defaultOpen = false;
  /** Keeps hidden Items available to find in page; a match opens the list. */
  hiddenUntilFound = false;
  /** Pairs stack as rows (vertical) or sit side by side and wrap (horizontal). */
  override orientation: 'vertical' | 'horizontal' = 'vertical';
  /** Label beside its Value (inline) or above it (stacked); an Item's own `layout` wins. */
  layout: DescriptionListLayout = 'inline';
  /** Center aligns each Label toward its Value. */
  align: 'start' | 'center' = 'start';
  /** Trigger text: strings, or functions of the hidden and total Item counts. */
  messages: DescriptionListMessages = {};
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;

  #items: TpDescriptionListItem[] = [];
  #defaultInitialized = false;
  #observer: MutationObserver | null = null;
  #stopResize: (() => void) | null = null;
  #observedList: HTMLElement | null = null;
  #composedTrigger: ReturnType<typeof compositeControl>;
  readonly #indicator = new DisclosureIndicator();
  readonly #refreshController = (): void => {
    if (this.isConnected) this.#collapsible.update(this.open, this.disabled);
  };
  readonly #panel = new DisclosurePanelController(this, {
    owner: () => this,
    panel: () => this.viewportElement,
    body: () => this.listElement,
    trackCompletion: (completion) => this.#collapsible.trackCompletion(completion),
    extent: VIEWPORT_EXTENT,
  });
  readonly #collapsible = new CollapsibleController(this, {
    owner: this,
    trigger: () => this.triggerElement,
    activation: () => this.#part$('description-list-trigger'),
    content: () => (this.hiddenCount ? this.viewportElement : null),
    markers: () => [
      this.listElement,
      this.#part$('description-list-trigger-label'),
      this.#part$('description-list-indicator'),
    ],
    hiddenUntilFound: () => this.hiddenUntilFound,
    labelContent: () => false,
    hideContent: () => false,
    onOpenRequest: (open, reason, sourceEvent) => this.#requestOpen(open, reason, sourceEvent),
    onStateChange: (state) => {
      this.#conceal(state);
      this.#panel.sync(state);
    },
    onComplete: (open) => {
      this.emit('tp-open-change-complete', { open });
    },
  });

  /** The Items, in document order. */
  get items(): readonly TpDescriptionListItem[] {
    return this.#items;
  }

  /** Number of Items beyond the limit. */
  get hiddenCount(): number {
    const limit = this.#resolvedLimit();
    return limit === null ? 0 : Math.max(0, this.#items.length - limit);
  }

  /** The native `dl`. */
  get listElement(): HTMLElement | null {
    return this.#part$('description-list');
  }

  /** The region that clips the list to the visible Items while closed. */
  get viewportElement(): HTMLElement | null {
    return this.#part$('description-list-viewport');
  }

  /** The native button inside the composed trigger. */
  get triggerElement(): HTMLButtonElement | null {
    const host = this.#part$('description-list-trigger');
    if (!host) return null;
    const control = compositeControl(host);
    return (control ? control.target() : host) as HTMLButtonElement | null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#defaultInitialized) {
      this.#defaultInitialized = true;
      if (!this.hasAttribute('open') && this.defaultOpen) this.open = true;
    }
    // Item membership and labels; values change freely without re-rendering the list.
    this.#observer = new (this.ownerDocument.defaultView ?? window).MutationObserver((records) => {
      if (
        records.some((record) =>
          record.type === 'childList' ? record.target === this : record.target.parentNode === this,
        )
      )
        this.#collect(true);
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['label', 'layout'],
    });
    this.#collect();
    if (this.hasUpdated) {
      this.#observeList();
      queueMicrotask(this.#refreshController);
    }
  }

  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#stopResize?.();
    this.#stopResize = null;
    this.#observedList = null;
    this.#composedTrigger?.release(this);
    this.#composedTrigger = undefined;
    this.#panel.disconnect();
    this.#indicator.cancel();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#collapsible.update(this.open, this.disabled);
      this.#indicator.apply(this.#indicatorElement, this.#rotation(this.open));
    });
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) return;
    if (changed.has('open') && this.#collapsible.initialized) {
      this.#indicator.prepare(this, this.#indicatorElement, this.#collapsible.open, this.open);
    }
    if (changed.has('open') || changed.has('disabled') || changed.has('hiddenUntilFound'))
      this.#collapsible.update(this.open, this.disabled);
    if (changed.has('open')) {
      this.#indicator.apply(this.#indicatorElement, this.#rotation(this.open));
      this.#indicator.start();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-limited', this.hiddenCount > 0);
    this.toggleAttribute(
      'data-inline',
      this.#items.some((item) => this.#pairLayout(item) === 'inline'),
    );
    this.#assign();
    const triggerHost = this.#part$('description-list-trigger');
    const composed = triggerHost ? compositeControl(triggerHost) : undefined;
    if (composed !== this.#composedTrigger) {
      this.#composedTrigger?.release(this);
      this.#composedTrigger = composed;
    }
    composed?.apply(
      this,
      { disabled: this.disabled, focusableWhenDisabled: false, tabIndex: this.disabled ? -1 : 0 },
      this.#refreshController,
    );
    // The first update defers this to firstUpdated's microtask, as Collapsible does.
    if (this.#collapsible.initialized) this.#refreshController();
    this.#conceal();
    // A newly rendered indicator starts at the current state without turning.
    this.#indicator.apply(this.#indicatorElement, this.#rotation(this.open));
    this.#observeList();
    this.#measure();
  }

  protected override render() {
    const total = this.#items.length;
    const hidden = this.hiddenCount;
    const split = total - hidden;
    const state = Object.freeze({
      open: this.open,
      disabled: this.disabled,
      orientation: this.#resolvedOrientation(),
      hidden,
      total,
    });
    const pairs = repeat(
      this.#items,
      (item) => item,
      (item, index) =>
        html`<div
          part="description-list-item"
          data-layout=${this.#pairLayout(item)}
          ?data-overflow=${index >= split}
        >
          <dt part="description-list-label">${item.getAttribute('label') ?? ''}</dt>
          <dd part="description-list-value"><slot></slot></dd>
        </div>`,
    );
    return html`${this.#part('description-list-viewport', state, {
      content: this.#part('description-list', state, { tag: 'dl', content: pairs }),
    })}${hidden ? this.#renderTrigger(state) : nothing}`;
  }

  #renderTrigger(state: PartState & DescriptionListCounts) {
    const text = this.#message(this.open ? 'showLess' : 'showMore', state);
    return this.#part('description-list-trigger', state, {
      tag: 'tp-button',
      properties: { variant: 'link', size: 'sm', type: 'button' },
      content: html`${this.#part('description-list-trigger-label', state, {
        tag: 'span',
        content: text,
      })}${this.#part('description-list-indicator', state, {
        tag: 'tp-icon',
        properties: { slot: 'icon-end', '.icon': chevronDownIcon, 'aria-hidden': 'true' },
      })}`,
    });
  }

  #part(name: string, state: PartState, options: PartRenderOptions = {}): unknown {
    return this.renderPart(name, state, {
      ...options,
      reference: this.presentationController.partReference(name),
      properties: {
        ...stateMarkers({ open: this.open, disabled: this.disabled }, ['open', 'disabled']),
        ...options.properties,
      },
    });
  }

  #part$(name: string): HTMLElement | null {
    return this.presentationController.partElement(name) ?? null;
  }

  get #indicatorElement(): HTMLElement | null {
    return this.#part$('description-list-indicator');
  }

  #rotation(open: boolean): string {
    return open ? '180deg' : '0deg';
  }

  #message(key: keyof typeof DEFAULT_MESSAGES, counts: DescriptionListCounts): string {
    const message = this.messages?.[key] ?? DEFAULT_MESSAGES[key];
    return typeof message === 'function'
      ? message({ hidden: counts.hidden, total: counts.total })
      : message;
  }

  #resolvedLimit(): number | null {
    const limit = Number(this.limit);
    return this.limit !== null && Number.isFinite(limit) && limit >= 1 ? Math.floor(limit) : null;
  }

  #resolvedOrientation(): 'horizontal' | 'vertical' {
    return this.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  }

  /** The Item's own layout, else the list's. */
  #pairLayout(item: TpDescriptionListItem): DescriptionListLayout {
    const own = item.getAttribute('layout');
    if (isLayout(own)) return own;
    return isLayout(this.layout) ? this.layout : 'inline';
  }

  /** Reads the Items from the children; only Items are presented. */
  #collect(labels = false): void {
    const items: TpDescriptionListItem[] = [];
    for (const node of this.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (isItem(node)) items.push(node);
        else
          this.diagnose(
            'description-list-child',
            `<${(node as Element).localName}> is not a description list item and is not shown.`,
            { once: true, defer: true },
          );
      } else if (node.nodeType === Node.TEXT_NODE && node.textContent?.trim())
        this.diagnose(
          'description-list-child',
          'Text directly inside a description list is not shown; place it in an item.',
          { once: true, defer: true },
        );
    }
    const same =
      items.length === this.#items.length &&
      items.every((item, index) => item === this.#items[index]);
    if (same && !labels) return;
    this.#items = items;
    this.requestUpdate();
  }

  /** Manual assignment keeps the authored DOM untouched: each Item becomes its description. */
  #assign(): void {
    const slots = this.renderRoot.querySelectorAll<HTMLSlotElement>(
      "[part~='description-list-value'] > slot",
    );
    slots.forEach((slot, index) => {
      const item = this.#items[index];
      if (item && slot.assignedNodes()[0] !== item) slot.assign(item);
    });
  }

  /** Pairs beyond the limit stay laid out but hidden while the list is closed. */
  #conceal(state: PresenceState = this.#collapsible.state): void {
    const concealed = state === 'absent' || state === 'retained';
    for (const pair of this.renderRoot.querySelectorAll<HTMLElement>(
      "[part~='description-list-item']",
    )) {
      const hide = concealed && pair.hasAttribute('data-overflow');
      pair.toggleAttribute('data-concealed', hide);
      if (hide && this.hiddenUntilFound) pair.setAttribute('hidden', 'until-found');
      else pair.removeAttribute('hidden');
    }
  }

  #observeList(): void {
    const list = this.listElement;
    if (list === this.#observedList) return;
    this.#stopResize?.();
    this.#observedList = list;
    this.#stopResize = list ? observeResize(list, () => this.#measure()) : null;
    this.#panel.observe();
  }

  /** Publishes the open extent, the extent of the visible Items and the Value column start. */
  #measure(): void {
    this.#panel.measure();
    const viewport = this.viewportElement;
    const list = this.listElement;
    if (!viewport || !list) return;
    const pairs = [
      ...this.renderRoot.querySelectorAll<HTMLElement>("[part~='description-list-item']"),
    ];
    const visible = pairs.slice(0, this.#items.length - this.hiddenCount);
    // A centered inline list starts the Trigger at the Value column, measured in layout pixels.
    const trigger = this.#part$('description-list-trigger');
    const value = visible
      .find((pair) => pair.dataset.layout === 'inline')
      ?.querySelector<HTMLElement>("[part~='description-list-value']");
    if (trigger && value) {
      const start =
        this.direction === 'rtl'
          ? list.offsetWidth - value.offsetLeft - value.offsetWidth
          : value.offsetLeft;
      trigger.style.setProperty('--_tp-description-list-value-start', `${start}px`);
    }
    if (!this.hiddenCount) {
      viewport.style.removeProperty(COLLAPSED_EXTENT);
      return;
    }
    const extent = Math.max(0, ...visible.map((pair) => pair.offsetTop + pair.offsetHeight));
    viewport.style.setProperty(COLLAPSED_EXTENT, `${extent}px`);
  }

  #requestOpen(open: boolean, reason: 'trigger-press' | 'programmatic', sourceEvent: Event): void {
    if (this.disabled || open === this.open) return;
    const request = new TpOpenChangeEvent(open, this.open, reason, sourceEvent);
    if (!this.dispatchEvent(request)) return;
    this.onOpenChange?.(request);
    this.open = open;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-description-list': TpDescriptionList;
  }
}
