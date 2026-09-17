import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { createId } from '../foundation/id.js';
import { assignedElements } from './shared.js';
import { TpAccordionItem, type AccordionContentAlignment } from './accordion-item.js';
import type { TpCollapsible } from './collapsible.js';

export type AccordionValue = string[];
export type AccordionVariant = 'plain' | 'line' | 'outline' | 'separated';

const accordionValueConverter = {
  fromAttribute(value: string | null): AccordionValue {
    return value?.split(/\s+/u).filter(Boolean) ?? [];
  },
  toAttribute(value: AccordionValue): string | null {
    return value.length ? value.join(' ') : null;
  },
};

interface AccordionItemRecord {
  item: TpAccordionItem;
  collapsible: TpCollapsible;
  trigger: HTMLElement;
  value: string;
  index: number;
  duplicate: boolean;
  cleanups: Array<() => void>;
}

function sameAccordionValue(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value, index) => value === b[index]);
}

export class TpAccordion extends TpElement {
  static tagName = 'tp-accordion';
  static override properties = {
    ...TpElement.properties,
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    variant: { type: String, reflect: true },
    value: { converter: accordionValueConverter, reflect: true },
    defaultValue: { converter: accordionValueConverter, attribute: 'default-value' },
    collapsible: { type: Boolean, reflect: true },
    keepMounted: { type: Boolean, attribute: 'keep-mounted', reflect: true },
    hiddenUntilFound: { type: Boolean, attribute: 'hidden-until-found', reflect: true },
    contentAlignment: { type: String, attribute: 'content-alignment', reflect: true },
    onValueChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;

        --_tp-accordion-container-background: transparent;
        --_tp-accordion-container-border-width: 0px;
        --_tp-accordion-container-radius: 0px;
        --_tp-accordion-container-overflow: visible;
        --_tp-accordion-item-background: transparent;
        --_tp-accordion-item-border-width: 0px;
        --_tp-accordion-item-border-block-start-width: 0px;
        --_tp-accordion-item-radius: 0px;
        --_tp-accordion-item-overflow: visible;
        --_tp-accordion-gap: 0px;
      }

      :host([variant='outline']) {
        --_tp-accordion-container-background: var(--tp-background);
        --_tp-accordion-container-border-width: var(--tp-border-width);
        --_tp-accordion-container-radius: var(--tp-radius-lg);
        --_tp-accordion-container-overflow: clip;
        --_tp-accordion-item-border-block-start-width: var(--tp-border-width);
      }

      :host([variant='line']) {
        --_tp-accordion-item-border-block-start-width: var(--tp-border-width);
      }

      :host([variant='separated']) {
        --_tp-accordion-item-background: var(--tp-background);
        --_tp-accordion-item-border-width: var(--tp-border-width);
        --_tp-accordion-item-border-block-start-width: var(--tp-border-width);
        --_tp-accordion-item-radius: var(--tp-radius-lg);
        --_tp-accordion-item-overflow: clip;
        --_tp-accordion-gap: var(--tp-space-2);
      }

      [part~='accordion'] {
        display: grid;
        gap: var(--_tp-accordion-gap);
        overflow: var(--_tp-accordion-container-overflow);
        border-width: var(--_tp-accordion-container-border-width);
        border-style: var(--tp-border-style);
        border-color: var(--tp-border);
        border-radius: var(--_tp-accordion-container-radius);
        background: var(--_tp-accordion-container-background);
      }

      slot {
        display: contents;
      }
    `,
  ];
  selectionMode: 'single' | 'multiple' = 'single';
  variant: AccordionVariant = 'plain';
  value: AccordionValue = [];
  defaultValue: AccordionValue = [];
  collapsible = false;
  keepMounted = false;
  hiddenUntilFound = false;
  contentAlignment: AccordionContentAlignment = 'edge';
  onValueChange: ((event: TpValueChangeEvent<AccordionValue>) => void) | undefined;
  override orientation = 'vertical' as const;
  #records: AccordionItemRecord[] = [];
  #slot: HTMLSlotElement | null = null;
  #observer: MutationObserver | null = null;
  #rebuildScheduled = false;
  #initialized = false;
  #diagnostics = new Set<string>();

  protected override render() {
    return html`<div part="accordion" data-orientation="vertical" ?data-disabled=${this.disabled}>
      <slot @slotchange=${this.#readItems}></slot>
    </div>`;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) =>
          mutation.type === 'attributes'
            ? mutation.target instanceof TpAccordionItem
            : mutation.target === this || mutation.target instanceof TpAccordionItem,
        )
      ) {
        this.#scheduleRebuild();
      }
    });
    this.#observer.observe(this, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['value', 'disabled', 'keep-mounted', 'hidden-until-found'],
    });
  }

  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#disposeRecords();
    super.disconnectedCallback();
  }

  #readItems = (event: Event): void => {
    this.#slot = event.currentTarget as HTMLSlotElement;
    this.#rebuildItems();
  };

  #scheduleRebuild(): void {
    if (this.#rebuildScheduled) return;
    this.#rebuildScheduled = true;
    queueMicrotask(() => {
      this.#rebuildScheduled = false;
      if (this.isConnected) this.#rebuildItems();
    });
  }

  #rebuildItems(): void {
    this.#disposeRecords();
    const items = assignedElements(this.#slot).filter(
      (item): item is TpAccordionItem => item instanceof TpAccordionItem,
    );
    const values = new Set<string>();
    for (const [index, item] of items.entries()) {
      const generatedValue =
        item.dataset.tpAccordionGeneratedValue ?? createId('tp-accordion-item');
      item.dataset.tpAccordionGeneratedValue = generatedValue;
      const value = item.getAttribute('value') || item.id || generatedValue;
      const duplicate = values.has(value);
      values.add(value);
      item.dataset.value = value;
      item.setAttribute('part', 'accordion-item');
      const collapsible = item.collapsibleElement;
      const trigger = item.triggerElement;
      if (!collapsible || !trigger) {
        void Promise.all([item.updateComplete, collapsible?.updateComplete]).then(() =>
          this.#scheduleRebuild(),
        );
        continue;
      }
      const record = this.#createRecord({
        item,
        collapsible,
        trigger,
        value,
        index,
        duplicate,
      });
      this.#records.push(record);
      if (duplicate) {
        this.#diagnose(
          'accordion-duplicate-value',
          `Accordion item value "${value}" is duplicated; the later item is excluded.`,
        );
      }
    }
    if (!this.#initialized) {
      this.#initialized = true;
      if (!this.value.length && this.defaultValue.length) this.value = [...this.defaultValue];
    }
    const derived = this.#derivedValue();
    if (
      this.selectionMode === 'single' &&
      !this.collapsible &&
      !sameAccordionValue(this.value, derived)
    ) {
      this.value = [...derived];
    }
    this.#applyValue();
  }

  #createRecord(input: Omit<AccordionItemRecord, 'cleanups'>): AccordionItemRecord {
    const record: AccordionItemRecord = { ...input, cleanups: [] };
    this.#configureRecord(record);
    return record;
  }

  #configureRecord(record: AccordionItemRecord): void {
    const { item, collapsible, trigger, index, value } = record;
    item.dataset.index = String(index);
    item.dataset.orientation = 'vertical';
    trigger.dataset.index = String(index);
    trigger.dataset.orientation = 'vertical';
    collapsible.setMotionScope(item, { value, index });

    const handleOpenChange = (event: Event): void => {
      if (!(event instanceof TpOpenChangeEvent) || event.target !== collapsible) return;
      event.preventDefault();
      event.stopPropagation();
      const reason = event.detail.reason === 'trigger-press' ? 'trigger-press' : 'programmatic';
      this.#requestItem(record, event.detail.value, reason, event.detail.sourceEvent);
    };
    const handleOpenComplete = (event: Event): void => {
      if (event.target !== collapsible) return;
      event.stopPropagation();
      const open = Boolean((event as CustomEvent<{ open: boolean }>).detail?.open);
      item.dispatchEvent(
        new CustomEvent('tp-open-change-complete', {
          bubbles: true,
          composed: true,
          detail: { value, open },
        }),
      );
    };
    collapsible.addEventListener('tp-open-change', handleOpenChange);
    collapsible.addEventListener('tp-open-change-complete', handleOpenComplete);
    record.cleanups.push(
      () => collapsible.removeEventListener('tp-open-change', handleOpenChange),
      () => collapsible.removeEventListener('tp-open-change-complete', handleOpenComplete),
    );
  }

  #requestItem(
    record: AccordionItemRecord,
    open: boolean,
    reason: 'trigger-press' | 'programmatic',
    sourceEvent: Event,
  ): void {
    const previous = this.#derivedValue();
    if (
      this.disabled ||
      record.duplicate ||
      record.item.hasAttribute('disabled') ||
      open === previous.includes(record.value)
    ) {
      return;
    }
    if (!open && this.selectionMode === 'single' && !this.collapsible && previous.length === 1)
      return;
    const next =
      this.selectionMode === 'single'
        ? open
          ? [record.value]
          : []
        : this.#records
            .filter(
              (candidate) =>
                !candidate.duplicate &&
                (candidate === record ? open : previous.includes(candidate.value)),
            )
            .map((candidate) => candidate.value);
    const changed = this.#records.filter(
      (candidate) => previous.includes(candidate.value) !== next.includes(candidate.value),
    );
    const openRequests: Array<{ item: TpAccordionItem; event: TpOpenChangeEvent }> = [];
    for (const candidate of changed) {
      const request = new TpOpenChangeEvent(
        next.includes(candidate.value),
        previous.includes(candidate.value),
        reason,
        sourceEvent,
      );
      if (!candidate.item.dispatchEvent(request)) return;
      openRequests.push({ item: candidate.item, event: request });
    }
    const request = new TpValueChangeEvent([...next], [...previous], reason, sourceEvent, {
      trigger: record.trigger,
    });
    if (!this.dispatchEvent(request)) return;
    for (const openRequest of openRequests) openRequest.item.onOpenChange?.(openRequest.event);
    this.onValueChange?.(request);
    this.value = [...next];
    this.#applyValue();
  }

  #derivedValue(): AccordionValue {
    const requested = new Set(this.value);
    const available = this.#records.filter((record) => !record.duplicate);
    const selected = available.filter((record) => requested.has(record.value));
    if (this.selectionMode === 'multiple') return selected.map((record) => record.value);
    const first = selected[0];
    if (first) return [first.value];
    if (!this.collapsible) {
      const fallback = available.find(
        (record) => !this.disabled && !record.item.hasAttribute('disabled'),
      );
      if (fallback) return [fallback.value];
    }
    return [];
  }

  #applyValue(): void {
    const selected = new Set(this.#derivedValue());
    for (const record of this.#records) {
      const open = !record.duplicate && selected.has(record.value);
      const unavailable = this.disabled || record.item.hasAttribute('disabled') || record.duplicate;
      record.collapsible.disabled = unavailable;
      record.collapsible.keepMounted =
        this.#itemPolicy(record.item, 'keep-mounted', this.keepMounted) ||
        this.#itemPolicy(record.item, 'hidden-until-found', this.hiddenUntilFound);
      record.collapsible.hiddenUntilFound = this.#itemPolicy(
        record.item,
        'hidden-until-found',
        this.hiddenUntilFound,
      );
      record.item.setInheritedContentAlignment(this.#resolvedContentAlignment());
      record.collapsible.open = open;
    }
  }

  #itemPolicy(item: HTMLElement, name: string, inherited: boolean): boolean {
    const value = item.getAttribute(name);
    return value === null ? inherited : value !== 'false';
  }

  #resolvedContentAlignment(): AccordionContentAlignment {
    return this.contentAlignment === 'label' ? 'label' : 'edge';
  }

  #disposeRecords(): void {
    for (const record of this.#records) {
      for (const cleanup of record.cleanups) cleanup();
    }
    this.#records = [];
  }

  #diagnose(code: string, message: string): void {
    const key = `${code}:${message}`;
    if (this.#diagnostics.has(key)) return;
    this.#diagnostics.add(key);
    queueMicrotask(() => this.emit('tp-diagnostic', { code, message, severity: 'error' as const }));
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      changed.has('value') ||
      changed.has('selectionMode') ||
      changed.has('collapsible') ||
      changed.has('disabled') ||
      changed.has('keepMounted') ||
      changed.has('hiddenUntilFound') ||
      changed.has('contentAlignment')
    ) {
      this.#applyValue();
    }
  }
}
