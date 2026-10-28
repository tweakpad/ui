import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { scheduleLayoutPass } from '../../foundation/layout-batch.js';
import { observeResize } from '../../foundation/observation.js';
import {
  limitPartition,
  resolveItemLimit,
  shownRange,
  type OverflowCollapseFrom,
} from '../../foundation/overflow-fit.js';
import { overflowListPresentation } from '../../presentation/families/overflow-list.js';
import { TpBadge } from '../badge/badge.js';
import { observeSlots } from '../shared/slots.js';
import { OverflowFitController, type OverflowFitHost } from './fit.js';
import {
  DEFAULT_OVERFLOW_LIST_MESSAGES,
  overflowListMessage,
  type OverflowListMessages,
} from './messages.js';

/** Whether two element lists hold the same elements in the same order. */
function sameElements(a: readonly Element[], b: readonly Element[]): boolean {
  return a.length === b.length && a.every((element, index) => element === b[index]);
}

function sameNumbers(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

/** Assigns `nodes` to `slot` unless it already holds exactly them. */
function assign(slot: HTMLSlotElement | null, nodes: readonly Element[]): void {
  if (!slot) return;
  const current = slot.assignedElements();
  if (!sameElements(current, nodes)) slot.assign(...nodes);
}

/**
 * Wraps its children in rows and, beyond a number of items or of rows that fit the width,
 * replaces the items on one side with a count of the ones left out. The omitted items stay in the
 * page, unrendered and out of reach.
 *
 * @slot - Items: element children that are not `hidden`.
 * @slot count - A Consumer element that replaces the default Count while Items are omitted.
 * @fires tp-overflow-change - The omitted Items changed (not cancelable); `detail.value` is the
 *   omitted count, `detail.reason` is `initial` or `layout`.
 */
export class TpOverflowList extends TpElement implements OverflowFitHost {
  static tagName = 'tp-overflow-list';
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpBadge];
  }
  static override presentation = overflowListPresentation;
  static override properties = {
    ...TpElement.properties,
    limit: { type: Number },
    maxRows: { type: Number, attribute: 'max-rows' },
    collapseFrom: { type: String, attribute: 'collapse-from', reflect: true },
    messages: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .list {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        position: relative;
      }

      /* Measured lists take their inline size from the container; the sizer supplies the
         intrinsic one, so neither depends on how many Items are shown. */
      .list.measured {
        contain: inline-size;
      }

      slot {
        display: contents;
      }

      /* The pool's content box is the available inline size. */
      .pool {
        position: absolute;
        inset-inline: 0;
        inset-block-start: 0;
        gap: inherit;
        padding-inline: inherit;
        block-size: 0;
        overflow: clip;
        visibility: hidden;
        pointer-events: none;
      }

      /* Omitted Items and a waiting Count keep their own widths, however narrow the list. */
      .omitted {
        position: absolute;
        display: flex;
        flex-wrap: nowrap;
        align-items: center;
        gap: inherit;
        inline-size: max-content;
      }

      /* Count texts measured for the fit: invisible, clipped to the Badge, out of its flow. */
      .count-probes {
        position: absolute;
        inset: 0;
        overflow: clip;
        visibility: hidden;
        pointer-events: none;
      }

      .count-probes > span {
        position: absolute;
        inset-block-start: 0;
        inset-inline-start: 0;
        white-space: nowrap;
      }

      /* As wide as the gap between two Items. */
      .gap-probe {
        position: absolute;
        display: inline-flex;
        gap: inherit;
      }

      .sizer {
        display: grid;
        grid-template-columns: minmax(var(--_tp-overflow-min, 0), var(--_tp-overflow-max, 0));
        block-size: 0;
      }
    `,
  ];

  /** Most Items shown; a value below one means no limit. */
  limit: number | null = null;
  /** Most rows of the available inline size; Items that do not fit are omitted. */
  maxRows: number | null = null;
  /** Side whose Items are omitted; the Count takes their place. */
  collapseFrom: OverflowCollapseFrom = 'end';
  /** Replaceable Count texts: `count` (visible, `+N`) and `countLabel` (accessible, `N more`). */
  messages: OverflowListMessages = {};

  #items: Element[] = [];
  #count: Element | null = null;
  /** Items shown by the current fit; undefined before the first fit. */
  #fitted: number | undefined;
  /** Omitted counts whose default Count the fit measures in the pool. */
  #probes: readonly number[] = [];
  #shown = 0;
  #emitted: readonly Element[] | null = null;
  #releaseSlots: (() => void) | undefined;
  #releasePending: (() => void) | undefined;
  readonly #fit = new OverflowFitController(this);

  /** The number of omitted Items. */
  get hiddenCount(): number {
    return this.#items.length - this.#shown;
  }

  /** The omitted Items, in document order. */
  get hiddenItems(): Element[] {
    const [start, end] = shownRange(this.#items.length, this.#shown, this.#from());
    return this.#items.filter((_, index) => index < start || index >= end);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#releaseSlots = observeSlots(
      this,
      (records) => {
        if (records.some((record) => record.target === this || record.target.parentNode === this))
          this.requestUpdate();
      },
      { hidden: true },
    );
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#releaseSlots?.();
    this.#releasePending?.();
    this.#releaseSlots = this.#releasePending = undefined;
    this.#emitted = null;
    super.disconnectedCallback();
  }

  /** Fit controller: presents `shown` Items. */
  adoptShown(shown: number): void {
    if (shown === this.#fitted) return;
    this.#fitted = shown;
    this.requestUpdate();
  }

  /** Fit controller: lays out default Counts for these omitted counts so they can be measured. */
  probeCounts(hidden: readonly number[]): boolean {
    if (sameNumbers(hidden, this.#probes)) return false;
    this.#probes = hidden;
    this.requestUpdate();
    return true;
  }

  /** Fit controller: the presented partition fits. */
  partitionSettled(): void {
    this.#announce();
  }

  /** Fit controller: an Item that the fit cannot measure as intended. */
  itemDiagnostic(kind: 'contents' | 'growing'): void {
    if (kind === 'contents')
      this.diagnose(
        'overflow-list-contents-item',
        'Overflow list items and the count element need a box of their own; display: contents cannot be measured.',
        { once: true, defer: true },
      );
    else
      this.diagnose(
        'overflow-list-growing-item',
        'Overflow list items should not grow to fill their row; flex-grow makes their size depend on the partition.',
        { once: true, defer: true },
      );
  }

  #from(): OverflowCollapseFrom {
    return this.collapseFrom === 'start' ? 'start' : 'end';
  }

  #limit(): number | undefined {
    if (this.limit !== null && this.limit !== undefined && !Number.isFinite(Number(this.limit)))
      this.diagnose(
        'overflow-list-invalid-limit',
        `Overflow list limit must be a number, not ${String(this.getAttribute('limit') ?? this.limit)}.`,
        { once: true, defer: true },
      );
    return resolveItemLimit(this.limit);
  }

  #maxRows(): number | undefined {
    if (this.maxRows === null || this.maxRows === undefined) return undefined;
    const rows = Number(this.maxRows);
    if (Number.isFinite(rows) && rows >= 1) return Math.floor(rows);
    this.diagnose(
      'overflow-list-invalid-max-rows',
      `Overflow list max-rows must be a positive integer, not ${String(this.getAttribute('max-rows') ?? this.maxRows)}.`,
      { once: true, defer: true },
    );
    return undefined;
  }

  /** Items, the first Count element, and diagnostics for content that is neither. */
  #collect(): void {
    const items: Element[] = [];
    let count: Element | null = null;
    for (const node of this.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent?.trim())
          this.diagnose(
            'overflow-list-text-content',
            'Overflow list presents element children only; wrap text in an element.',
            { once: true, defer: true },
          );
        continue;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) continue;
      const element = node as Element;
      if (element.getAttribute('slot') === 'count') {
        if (count)
          this.diagnose(
            'overflow-list-extra-count',
            'Overflow list presents only the first element in the count slot.',
            { once: true, defer: true },
          );
        else count = element;
        continue;
      }
      if (!element.hasAttribute('hidden')) items.push(element);
    }
    this.#items = items;
    this.#count = count;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#collect();
    const total = this.#items.length;
    const cap = limitPartition(total, this.#limit());
    const measured = this.#maxRows() !== undefined;
    if (!measured) this.#fitted = undefined;
    this.#shown = Math.min(this.#fitted ?? cap, cap);
  }

  #countText(hidden: number, total: number) {
    const messages = { ...DEFAULT_OVERFLOW_LIST_MESSAGES, ...this.messages };
    return {
      text: overflowListMessage(messages.count, hidden, total),
      label: overflowListMessage(messages.countLabel, hidden, total),
    };
  }

  /**
   * The default Count Badge for `hidden` omitted Items. A measured list also lays out, invisibly
   * inside it, the texts of other counts its fit needs to size: they take the Badge's font, so
   * each of those Counts measures as the Badge's own chrome plus its text.
   */
  #countBadge(hidden: number, total: number, probes: readonly number[]) {
    const { text, label } = this.#countText(hidden, total);
    return this.renderPart('overflow-list-count', Object.freeze({ hidden, total }), {
      tag: 'tp-badge',
      properties: { class: 'count-badge', part: 'overflow-list-count', '.variant': 'secondary' },
      content: html`<span class="count-text" dir="ltr" aria-hidden="true">${text}</span
        ><span class="visually-hidden">${label}</span>${
          probes.length
            ? html`<span class="count-probes" aria-hidden="true"
                >${probes.map(
                  (probe) =>
                    html`<span dir="ltr" data-hidden=${probe}
                      >${this.#countText(probe, total).text}</span
                    >`,
                )}</span
              >`
            : nothing
        }`,
    });
  }

  /**
   * Omitted counts whose texts are measured: the ones the fit asked for, the neighbors of the
   * presented count, so a refit by one Item finds its Count measured, and all Items omitted.
   */
  #probeCounts(hidden: number, total: number): number[] {
    return [
      ...new Set(
        [...this.#probes, hidden - 1, hidden + 1, total].filter(
          (count) => count > 0 && count <= total && count !== hidden,
        ),
      ),
    ];
  }

  /** The Count slot; its fallback content is the default Count Badge. */
  #countSlot(hidden: number, total: number, pooled: boolean, probes: readonly number[]) {
    return html`<slot name="count" class=${pooled ? 'count pooled' : 'count'}
      >${this.#countBadge(hidden, total, probes)}</slot
    >`;
  }

  protected override render() {
    const total = this.#items.length;
    const hidden = total - this.#shown;
    const measured = this.#maxRows() !== undefined;
    const start = this.#from() === 'start';
    const probes = measured && !this.#count ? this.#probeCounts(hidden, total) : [];
    const count = hidden > 0 ? this.#countSlot(hidden, total, false, probes) : nothing;
    // Measured lists lay out omitted Items, and the Count while nothing is omitted, in an inert
    // pool, so both can be measured.
    const pool = measured
      ? html`<div class="pool" inert aria-hidden="true">
          <span class="gap-probe"><span></span><span></span></span>
          <div class="omitted">
            <slot name="omitted"></slot>${
              hidden === 0 && total > 0 ? this.#countSlot(total, total, true, probes) : nothing
            }
          </div>
        </div>`
      : nothing;
    return html`${this.renderPart('overflow-list', Object.freeze({ hidden, total, measured }), {
      properties: { class: measured ? 'list measured' : 'list', part: 'overflow-list' },
      content: html`${start ? count : nothing}<slot name="shown"></slot>${
          start ? nothing : count
        }${pool}`,
    })}${measured ? html`<div class="sizer" aria-hidden="true"></div>` : nothing}`;
  }

  #assign(): void {
    const root = this.renderRoot as ShadowRoot | undefined;
    if (!root) return;
    const [start, end] = shownRange(this.#items.length, this.#shown, this.#from());
    const shown = this.#items.slice(start, end);
    const omitted = this.#items.filter((_, index) => index < start || index >= end);
    assign(root.querySelector<HTMLSlotElement>('slot[name="shown"]'), shown);
    // Without a pool omitted Items stay unassigned and generate no boxes.
    assign(root.querySelector<HTMLSlotElement>('slot[name="omitted"]'), omitted);
    assign(
      root.querySelector<HTMLSlotElement>('slot[name="count"]'),
      this.#count ? [this.#count] : [],
    );
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#assign();
    const hidden = this.hiddenCount;
    this.toggleAttribute('data-overflowing', hidden > 0);
    const maxRows = this.#maxRows();
    const root = this.renderRoot as ShadowRoot;
    const list = root.querySelector<HTMLElement>('[part~="overflow-list"]');
    const sizer = root.querySelector<HTMLElement>('.sizer');
    const pool = root.querySelector<HTMLElement>('.pool');
    const gapProbe = root.querySelector<HTMLElement>('.gap-probe');
    if (maxRows === undefined || !list || !sizer || !pool || !gapProbe) {
      this.#fit.sync(undefined);
      this.#notify();
      return;
    }
    const countSlot = root.querySelector<HTMLSlotElement>('slot[name="count"]');
    const count = this.#count ?? countSlot?.querySelector('.count-badge') ?? null;
    this.#fit.sync({
      items: this.#items,
      shown: this.#shown,
      maxRows,
      limit: resolveItemLimit(this.limit),
      from: this.#from(),
      count,
      countShown: hidden > 0,
      // The default Count presents the omitted count, or all Items while it waits in the pool.
      countPresents: this.#count ? undefined : hidden || this.#items.length,
      countSource: this.#count ?? this.messages,
      list,
      sizer,
      pool,
      gapProbe,
    });
  }

  /**
   * Announces the partition of a count-only list once it renders. Whether it renders is read
   * with the other lists' layout reads, so many lists cost one layout.
   */
  #notify(): void {
    scheduleLayoutPass(this, {
      active: () => this.isConnected,
      measure: () => this.getClientRects().length > 0,
      apply: (rendered) => {
        if (rendered) this.#announce();
        else this.#releasePending ??= observeResize(this, this.#rendered);
      },
    });
  }

  #rendered = (): void => {
    this.#releasePending?.();
    this.#releasePending = undefined;
    this.#notify();
  };

  /** Dispatches `tp-overflow-change` when the omitted Items changed since the last one. */
  #announce(): void {
    const hidden = this.hiddenItems;
    if (this.#emitted && sameElements(hidden, this.#emitted)) return;
    const reason = this.#emitted ? 'layout' : 'initial';
    const previous = this.#emitted?.length ?? 0;
    this.#emitted = hidden;
    this.dispatchEvent(
      new TpValueChangeEvent(
        hidden.length,
        previous,
        reason,
        undefined,
        { cancelable: false },
        'tp-overflow-change',
      ),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-overflow-list': TpOverflowList;
  }
}
