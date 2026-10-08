import { html } from 'lit';
import type { PropertyValues } from 'lit';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import type { Orientation } from '../../foundation/types.js';
import { timelinePresentation } from '../../presentation/families/timeline.js';
import { timelineListStyles } from './layout.js';
import { DEFAULT_TIMELINE_MESSAGES } from './messages.js';
import type { TimelineMessages } from './messages.js';
import { timelineState } from './state.js';
import type { TimelineAlign } from './state.js';
import { TpTimelineItem, applyTimelineRecord, syncTimeline } from './timeline-item.js';

/** Display-only ordered sequence: owns membership, derived status, sides and list semantics. */
export class TpTimeline extends TpElement {
  static tagName = 'tp-timeline';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTimelineItem];
  }
  static override presentation = timelinePresentation;
  static override properties = {
    ...TpElement.properties,
    align: { type: String, reflect: true },
    value: { type: String },
    messages: { attribute: false },
  };
  static override styles = [TpElement.styles, ...timelineListStyles];

  override orientation: Orientation = 'vertical';
  /** Side of the axis holding item content. */
  align: TimelineAlign = 'end';
  /** Value of the current item; earlier items are complete and later ones upcoming. */
  value: string | null = null;
  /** Localized status text announced for items with a status. */
  messages: TimelineMessages = {};

  #items: TpTimelineItem[] = [];
  #owned = new Map<TpTimelineItem, OwnedAttributes>();
  #diagnostics = new Set<string>();

  // The host is the list, so aria-label and aria-labelledby name it directly. An attribute,
  // not ElementInternals, so that every accessibility tool sees the list.
  #ownRole = new OwnedAttributes(this);

  /** Member items in order. */
  get items(): readonly TpTimelineItem[] {
    return this.#items;
  }

  get timelineMessages(): Required<TimelineMessages> {
    return { ...DEFAULT_TIMELINE_MESSAGES, ...this.messages };
  }

  [syncTimeline](): void {
    this.#sync();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#ownRole.original('role')) this.#ownRole.set('role', 'list');
    this.#sync();
  }

  override disconnectedCallback(): void {
    for (const [item, owned] of this.#owned) {
      owned.dispose();
      item[applyTimelineRecord](null);
    }
    this.#owned.clear();
    this.#items = [];
    this.#ownRole.dispose();
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#sync();
  }

  #sync = (): void => {
    if (!this.isConnected) return;
    const items = [...this.children].filter(
      (child): child is TpTimelineItem => child instanceof TpTimelineItem,
    );
    for (const [item, owned] of this.#owned)
      if (!items.includes(item)) {
        owned.dispose();
        item[applyTimelineRecord](null);
        this.#owned.delete(item);
      }
    const state = timelineState(
      items.map((item) => ({
        value: item.value ?? '',
        status: item.status ?? '',
        align: item.align ?? '',
      })),
      this.value,
      this.align,
    );
    for (const value of state.duplicates) this.#diagnose(value);
    const messages = this.timelineMessages;
    const alternate = this.align === 'alternate' || this.align === 'alternate-reverse';
    items.forEach((item, index) => {
      const itemState = state.items[index]!;
      let owned = this.#owned.get(item);
      if (!owned) {
        owned = new OwnedAttributes(item);
        this.#owned.set(item, owned);
      }
      if (!owned.original('role')) owned.set('role', 'listitem');
      owned.set('aria-current', itemState.current ? 'step' : owned.original('aria-current'));
      item[applyTimelineRecord]({
        state: itemState,
        orientation: this.orientation,
        alternate,
        statusText: itemState.status === 'none' ? '' : messages[itemState.status],
      });
    });
    this.#items = items;
  };

  #diagnose(value: string): void {
    const message = `Timeline item value "${value}" is duplicated; the first matching item is current.`;
    if (this.#diagnostics.has(message)) return;
    this.#diagnostics.add(message);
    queueMicrotask(() =>
      this.emit('tp-diagnostic', {
        code: 'timeline-duplicate-value',
        message,
        severity: 'warning' as const,
      }),
    );
  }

  protected override render() {
    const state = Object.freeze({ orientation: this.orientation, align: this.align });
    return this.renderPart('timeline', state, {
      properties: {
        class: 'list',
        'data-orientation': this.orientation,
        'data-align': this.align,
      },
      content: html`<slot @slotchange=${this.#sync}></slot>`,
    });
  }
}
