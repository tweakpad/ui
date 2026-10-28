import { html, nothing } from 'lit';
import { slotOccupied } from '../shared/slots.js';
import type { PropertyValues } from 'lit';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { prepareMotion, resolvesReducedMotion, stateRole } from '../../foundation/motion.js';
import type { MotionRoleDefinition } from '../../foundation/motion.js';
import type { Orientation } from '../../foundation/types.js';
import { timelinePresentation } from '../../presentation/families/timeline.js';
import { TpSeparator } from '../separator/separator.js';
import { timelineItemStyles } from './layout.js';
import type { TimelineItemState, TimelineSide, TimelineStatus } from './state.js';

export const timelineMotionRoles = {
  connector: stateRole('connector'),
} as const satisfies Record<string, MotionRoleDefinition>;

/** What the owning Timeline resolves for one of its Items. */
export interface TimelineItemRecord {
  readonly state: TimelineItemState;
  readonly orientation: Orientation;
  readonly alternate: boolean;
  readonly statusText: string;
}

/** Root-to-item channel; Items never import their Timeline. */
export const applyTimelineRecord = Symbol('tp-timeline-apply');
/** Item-to-root notification that an input to the derivation changed. */
export const syncTimeline = Symbol('tp-timeline-sync');

type Connector = 'before' | 'after';

/** One entry on the timeline axis: marker, connectors, content and opposite content. */
export class TpTimelineItem extends TpElement {
  static tagName = 'tp-timeline-item';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSeparator];
  }
  static override presentation = timelinePresentation;
  static override properties = {
    ...TpElement.properties,
    value: { type: String },
    status: { type: String },
    align: { type: String, reflect: true },
    _record: { state: true },
    _customMarker: { state: true },
    _opposite: { state: true },
  };
  static override styles = [TpElement.styles, ...timelineItemStyles];

  /** Identity matched by the Timeline value. */
  value = '';
  /** Overrides the derived status: complete, current or upcoming; empty derives. */
  status: '' | Exclude<TimelineStatus, 'none'> = '';
  /** Places this item on one side; empty follows the Timeline align. */
  align: '' | TimelineSide = '';
  override orientation: Orientation = 'vertical';
  _record: TimelineItemRecord | null = null;
  _customMarker = false;
  _opposite = false;
  #fills: Record<Connector, HTMLElement | null> = { before: null, after: null };
  #presented: Record<Connector, TimelineStatus> | null = null;
  readonly #fillReferences: Record<Connector, (element: HTMLElement | null) => void> = {
    before: (element) => {
      this.#fills.before = element;
    },
    after: (element) => {
      this.#fills.after = element;
    },
  };

  /** Position among the Timeline's items; -1 outside a Timeline. */
  get index(): number {
    return this._record?.state.index ?? -1;
  }

  /** Own status when set, otherwise the status derived from the Timeline value. */
  get resolvedStatus(): TimelineStatus {
    return this._record?.state.status ?? 'none';
  }

  /** Side of the axis holding the content. */
  get side(): TimelineSide {
    return this._record?.state.side ?? 'end';
  }

  [applyTimelineRecord](record: TimelineItemRecord | null): void {
    this._record = record;
    this.orientation = record?.orientation ?? 'vertical';
  }

  #slotChange = (): void => {
    this._customMarker = slotOccupied(this, 'marker');
    this._opposite = slotOccupied(this, 'opposite');
  };

  override connectedCallback(): void {
    super.connectedCallback();
    this.#slotChange();
  }

  override disconnectedCallback(): void {
    this.#presented = null;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    // The Timeline re-derives before this render, so its record lands in the same update.
    if (changed.has('value') || changed.has('status') || changed.has('align'))
      (this.parentElement as { [syncTimeline]?: () => void } | null)?.[syncTimeline]?.();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const state = this._record?.state;
    this.toggleAttribute('data-first', !!state?.first);
    this.toggleAttribute('data-last', !!state?.last);
    this.toggleAttribute('data-alternate', !!this._record?.alternate);
    this.toggleAttribute('data-custom-marker', this._customMarker);
    if (state) {
      this.setAttribute('data-index', String(state.index));
      this.setAttribute('data-side', state.side);
    } else {
      this.removeAttribute('data-index');
      this.removeAttribute('data-side');
    }
    if (state && state.status !== 'none') this.setAttribute('data-status', state.status);
    else this.removeAttribute('data-status');
    this.#requestConnectorMotion();
  }

  #requestConnectorMotion(): void {
    const state = this._record?.state;
    const next = state ? { before: state.before, after: state.after } : null;
    const previous = this.#presented;
    this.#presented = next;
    // The first presentation, and presentations outside a Timeline, are not transitions.
    if (!previous || !next || !state) return;
    for (const connector of ['before', 'after'] as const) {
      if (previous[connector] === next[connector]) continue;
      prepareMotion(this, this.#fills[connector], timelineMotionRoles.connector, {
        phase: 'change',
        fromState: previous[connector],
        toState: next[connector],
        context: { status: next[connector], index: state.index, connector },
      }).start();
    }
  }

  #connector(connector: Connector, status: TimelineStatus, hidden: boolean, reduced: boolean) {
    const state = Object.freeze({ connector, status });
    const marker = status === 'none' ? nothing : status;
    return this.renderPart(`timeline-item-connector-${connector}`, state, {
      tag: 'span',
      properties: {
        class: `connector ${connector}`,
        'aria-hidden': 'true',
        'data-status': marker,
        '?data-hidden': hidden,
      },
      content: html`<tp-separator
          class="track"
          .decorative=${true}
          .orientation=${this.#axis}
        ></tp-separator
        >${this.renderPart('timeline-item-connector-fill', state, {
          tag: 'span',
          properties: {
            class: 'fill',
            'data-status': marker,
            '?data-reduced-motion': reduced,
          },
          reference: this.#fillReferences[connector],
        })}`,
    });
  }

  /** The track orientation; responsive tracks follow the container through CSS, so use vertical. */
  get #axis(): 'vertical' | 'horizontal' {
    return this.orientation === 'horizontal' ? 'horizontal' : 'vertical';
  }

  protected override render() {
    const record = this._record;
    const state = record?.state;
    const status = state?.status ?? 'none';
    const reduced = resolvesReducedMotion(this);
    const partState = Object.freeze({
      status,
      side: this.side,
      index: this.index,
      orientation: this.orientation,
    });
    const statusMarker = status === 'none' ? nothing : status;
    return this.renderPart('timeline-item', partState, {
      properties: { class: 'item', 'data-side': this.side, 'data-status': statusMarker },
      content: html`${
          record && status !== 'none'
            ? html`<span class="visually-hidden">${record.statusText}</span>`
            : nothing
        }${this.renderPart('timeline-item-opposite', partState, {
          properties: { class: 'opposite', hidden: !this._opposite },
          content: html`<slot name="opposite" @slotchange=${this.#slotChange}></slot>`,
        })}
        <div class="rail">
          ${this.#connector('before', state?.before ?? 'none', !state || state.first, reduced)}
          ${this.renderPart('timeline-item-marker', partState, {
            properties: { class: 'marker', 'data-status': statusMarker },
            content: html`<slot name="marker" @slotchange=${this.#slotChange}
              >${this.renderPart('timeline-item-dot', partState, {
                tag: 'span',
                properties: { class: 'dot', 'aria-hidden': 'true', 'data-status': statusMarker },
              })}</slot
            >`,
          })}
          ${this.#connector('after', state?.after ?? 'none', !state || state.last, reduced)}
        </div>
        ${this.renderPart('timeline-item-content', partState, {
          properties: { class: 'content' },
          content: html`<slot @slotchange=${this.#slotChange}></slot>`,
        })}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-timeline-item': TpTimelineItem;
  }
}
