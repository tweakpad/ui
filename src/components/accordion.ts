import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { createId } from '../foundation/id.js';
import { PresenceController } from '../foundation/presence.js';
import type { PresenceState } from '../foundation/types.js';
import { assignedElements } from './shared.js';

export type AccordionValue = string[];

const accordionValueConverter = {
  fromAttribute(value: string | null): AccordionValue {
    return value?.split(/\s+/u).filter(Boolean) ?? [];
  },
  toAttribute(value: AccordionValue): string | null {
    return value.length ? value.join(' ') : null;
  },
};

interface AccordionItemRecord {
  item: HTMLDetailsElement;
  summary: HTMLElement;
  panel: HTMLElement;
  body: HTMLElement;
  indicator: HTMLElement;
  value: string;
  index: number;
  duplicate: boolean;
  presence: PresenceController;
  resizeObserver: ResizeObserver | null;
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
    value: { converter: accordionValueConverter, reflect: true },
    defaultValue: { converter: accordionValueConverter, attribute: 'default-value' },
    collapsible: { type: Boolean, reflect: true },
    keepMounted: { type: Boolean, attribute: 'keep-mounted', reflect: true },
    hiddenUntilFound: { type: Boolean, attribute: 'hidden-until-found', reflect: true },
    onValueChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }
    `,
  ];
  selectionMode: 'single' | 'multiple' = 'single';
  value: AccordionValue = [];
  defaultValue: AccordionValue = [];
  collapsible = false;
  keepMounted = false;
  hiddenUntilFound = false;
  onValueChange: ((event: TpValueChangeEvent<AccordionValue>) => void) | undefined;
  override orientation = 'vertical' as const;
  #records: AccordionItemRecord[] = [];
  #slot: HTMLSlotElement | null = null;
  #observer: MutationObserver | null = null;
  #rebuildScheduled = false;
  #initialized = false;
  #diagnostics = new Set<string>();

  protected override render() {
    return html`<div
      part="accordion"
      data-orientation="vertical"
      ?data-disabled=${this.disabled}
      @click=${this.#click}
      @keydown=${this.#key}
    >
      <slot @slotchange=${this.#readItems}></slot>
    </div>`;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver((mutations) => {
      if (
        mutations.some((mutation) =>
          mutation.type === 'attributes'
            ? mutation.target instanceof HTMLDetailsElement
            : mutation.target === this || mutation.target instanceof HTMLDetailsElement,
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
      (item): item is HTMLDetailsElement => item instanceof HTMLDetailsElement,
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
      const summary = item.querySelector<HTMLElement>(':scope > summary');
      if (!summary) continue;
      const { panel, body } = this.#contentFor(item);
      const indicator = this.#indicatorFor(summary);
      const record = this.#createRecord({
        item,
        summary,
        panel,
        body,
        indicator,
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

  #createRecord(
    input: Omit<AccordionItemRecord, 'presence' | 'resizeObserver' | 'cleanups'>,
  ): AccordionItemRecord {
    const reference: { current?: AccordionItemRecord } = {};
    const presence = new PresenceController(this, {
      surface: () => reference.current?.panel ?? null,
      keepMounted: () => {
        const current = reference.current;
        return current
          ? this.#itemPolicy(current.item, 'keep-mounted', this.keepMounted) ||
              this.#itemPolicy(current.item, 'hidden-until-found', this.hiddenUntilFound)
          : false;
      },
      onStateChange: (state) => {
        if (reference.current) this.#syncPresence(reference.current, state);
      },
      onComplete: (open) => {
        reference.current?.item.dispatchEvent(
          new CustomEvent('tp-open-change-complete', {
            bubbles: true,
            composed: true,
            detail: { value: reference.current?.value, open },
          }),
        );
      },
    });
    const record = { ...input, presence, resizeObserver: null, cleanups: [] };
    reference.current = record;
    this.#configureRecord(record);
    return record;
  }

  #configureRecord(record: AccordionItemRecord): void {
    const { item, summary, panel, body, indicator, index, duplicate } = record;
    summary.setAttribute('part', 'accordion-heading accordion-trigger');
    summary.id ||= createId('tp-accordion-trigger');
    panel.id ||= createId('tp-accordion-content');
    summary.setAttribute('aria-controls', panel.id);
    panel.setAttribute('aria-labelledby', summary.id);
    panel.setAttribute('role', 'region');
    panel.setAttribute('part', 'accordion-content');
    body.setAttribute('part', 'accordion-content-body');
    indicator.setAttribute('part', 'accordion-indicator');
    indicator.setAttribute('aria-hidden', 'true');
    item.dataset.index = String(index);
    item.dataset.orientation = 'vertical';
    summary.dataset.index = String(index);
    summary.dataset.orientation = 'vertical';
    panel.dataset.index = String(index);
    panel.dataset.orientation = 'vertical';
    const unavailable = this.disabled || item.hasAttribute('disabled') || duplicate;
    item.toggleAttribute('data-disabled', unavailable);
    summary.toggleAttribute('data-disabled', unavailable);
    panel.toggleAttribute('data-disabled', unavailable);
    summary.setAttribute('aria-disabled', String(unavailable));
    summary.tabIndex = unavailable ? -1 : 0;
    panel.style.overflow = 'clip';
    panel.style.transitionProperty = 'block-size';
    panel.style.transitionDuration = 'var(--tp-duration-normal, 180ms)';
    panel.style.transitionTimingFunction = 'var(--tp-easing-standard, cubic-bezier(0.2, 0, 0, 1))';
    body.style.display ||= 'flow-root';
    indicator.style.display ||= 'inline-block';
    indicator.style.transitionProperty = 'rotate';
    indicator.style.transitionDuration = 'var(--tp-duration-normal, 180ms)';
    indicator.style.transitionTimingFunction =
      'var(--tp-easing-standard, cubic-bezier(0.2, 0, 0, 1))';
    const focus = (): void => {
      summary.toggleAttribute('data-focus-visible', summary.matches(':focus-visible'));
    };
    const blur = (): void => summary.removeAttribute('data-focus-visible');
    const reveal = (event: Event): void => this.#requestItem(record, true, 'programmatic', event);
    const nativeToggle = (): void => {
      const mounted = record.presence.state !== 'absent';
      if (item.open !== mounted) item.open = mounted;
    };
    summary.addEventListener('focus', focus);
    summary.addEventListener('blur', blur);
    panel.addEventListener('beforematch', reveal);
    item.addEventListener('toggle', nativeToggle);
    record.cleanups.push(
      () => summary.removeEventListener('focus', focus),
      () => summary.removeEventListener('blur', blur),
      () => panel.removeEventListener('beforematch', reveal),
      () => item.removeEventListener('toggle', nativeToggle),
    );
    if (typeof ResizeObserver !== 'undefined') {
      record.resizeObserver = new ResizeObserver(() => this.#measure(record));
      record.resizeObserver.observe(body);
    }
    this.#measure(record);
    this.#syncPresence(record, record.presence.state);
  }

  #contentFor(item: HTMLDetailsElement): { panel: HTMLElement; body: HTMLElement } {
    let panel = item.querySelector<HTMLElement>(':scope > [data-tp-accordion-content]');
    if (!panel) {
      panel = document.createElement('div');
      panel.dataset.tpAccordionContent = '';
      for (const node of [...item.childNodes]) {
        if (!(node instanceof HTMLElement && node.tagName === 'SUMMARY')) panel.append(node);
      }
      item.append(panel);
    }
    let body = panel.querySelector<HTMLElement>(':scope > [data-tp-accordion-content-body]');
    if (!body) {
      body = document.createElement('div');
      body.dataset.tpAccordionContentBody = '';
      for (const node of [...panel.childNodes]) body.append(node);
      panel.append(body);
    }
    return { panel, body };
  }

  #indicatorFor(summary: HTMLElement): HTMLElement {
    let indicator = summary.querySelector<HTMLElement>('[data-tp-accordion-indicator]');
    if (!indicator) {
      indicator = document.createElement('span');
      indicator.dataset.tpAccordionIndicator = '';
      indicator.textContent = '›';
      summary.append(indicator);
    }
    return indicator;
  }

  #click = (event: MouseEvent): void => {
    const summary = event
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          target instanceof HTMLElement && target.tagName === 'SUMMARY',
      );
    if (!summary) return;
    const record = this.#records.find((candidate) => candidate.summary === summary);
    if (!record) return;
    event.preventDefault();
    const open = this.#derivedValue().includes(record.value);
    this.#requestItem(record, !open, 'trigger-press', event);
  };

  #key = (event: KeyboardEvent): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const summary = event
      .composedPath()
      .find(
        (target): target is HTMLElement =>
          target instanceof HTMLElement && target.tagName === 'SUMMARY',
      );
    if (!summary) return;
    const record = this.#records.find((candidate) => candidate.summary === summary);
    if (!record) return;
    event.preventDefault();
    const open = this.#derivedValue().includes(record.value);
    this.#requestItem(record, !open, 'trigger-press', event);
  };

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
    for (const candidate of changed) {
      const request = new TpOpenChangeEvent(
        next.includes(candidate.value),
        previous.includes(candidate.value),
        reason,
        sourceEvent,
      );
      if (!candidate.item.dispatchEvent(request)) return;
    }
    const request = new TpValueChangeEvent([...next], [...previous], reason, sourceEvent, {
      trigger: record.summary,
    });
    if (!this.dispatchEvent(request)) return;
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
      record.item.toggleAttribute('data-disabled', unavailable);
      record.summary.toggleAttribute('data-disabled', unavailable);
      record.panel.toggleAttribute('data-disabled', unavailable);
      record.summary.setAttribute('aria-disabled', String(unavailable));
      record.summary.tabIndex = unavailable ? -1 : 0;
      record.item.toggleAttribute('data-open', open);
      record.item.toggleAttribute('data-closed', !open);
      record.summary.toggleAttribute('data-open', open);
      record.summary.toggleAttribute('data-closed', !open);
      record.summary.toggleAttribute('data-panel-open', open);
      record.panel.toggleAttribute('data-open', open);
      record.panel.toggleAttribute('data-closed', !open);
      record.summary.setAttribute('aria-expanded', String(open));
      record.indicator.style.rotate = open ? '90deg' : '0deg';
      record.presence.setPresent(open, 180);
      if (!open && (record.presence.state === 'absent' || record.presence.state === 'retained')) {
        this.#syncPresence(record, record.presence.state);
      }
    }
  }

  #syncPresence(record: AccordionItemRecord, state: PresenceState): void {
    const { item, panel } = record;
    panel.dataset.state = state;
    panel.toggleAttribute('data-starting-style', state === 'starting');
    panel.toggleAttribute('data-ending-style', state === 'ending');
    if (state === 'starting' || state === 'open' || state === 'ending') {
      item.open = true;
      panel.removeAttribute('hidden');
      this.#measure(record);
    }
    panel.style.blockSize = state === 'open' ? 'var(--accordion-panel-height)' : '0px';
    if (state === 'absent') {
      panel.hidden = true;
      item.open = false;
    } else if (state === 'retained') {
      item.open = true;
      if (this.#itemPolicy(item, 'hidden-until-found', this.hiddenUntilFound)) {
        panel.setAttribute('hidden', 'until-found');
      } else {
        panel.hidden = true;
      }
    }
  }

  #measure(record: AccordionItemRecord): void {
    record.panel.style.setProperty(
      '--accordion-panel-height',
      `${Math.max(0, record.body.scrollHeight)}px`,
    );
    record.panel.style.setProperty(
      '--accordion-panel-width',
      `${Math.max(0, record.body.scrollWidth)}px`,
    );
  }

  #itemPolicy(item: HTMLElement, name: string, inherited: boolean): boolean {
    const value = item.getAttribute(name);
    return value === null ? inherited : value !== 'false';
  }

  #disposeRecords(): void {
    for (const record of this.#records) {
      record.presence.destroy();
      record.resizeObserver?.disconnect();
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
      changed.has('hiddenUntilFound')
    ) {
      this.#applyValue();
    }
  }
}
