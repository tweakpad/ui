import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { createId } from '../foundation/id.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import { PresenceController } from '../foundation/presence.js';
import type { PresenceState } from '../foundation/types.js';
import { assignedElements } from './shared.js';
import { TpAccordionItem } from './accordion-item.js';

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
  item: TpAccordionItem;
  trigger: HTMLElement;
  panel: HTMLElement;
  body: HTMLElement;
  indicator: HTMLElement;
  value: string;
  index: number;
  duplicate: boolean;
  presence: PresenceController;
  resizeObserver: ResizeObserver | null;
  cleanups: Array<() => void>;
  pendingEnter: MotionHandle[];
  pendingExit: MotionHandle[];
  indicatorMotion: MotionHandle | null;
  open: boolean | null;
}

export const accordionMotionRoles = {
  disclosure: {
    name: 'disclosure',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
  content: {
    name: 'content',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
  indicator: {
    name: 'indicator',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

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
      const trigger = item.triggerElement;
      if (!trigger) {
        void item.updateComplete.then(() => this.#scheduleRebuild());
        continue;
      }
      const panel = item.panelElement;
      const body = item.bodyElement;
      const indicator = item.indicatorElement;
      if (!panel || !body || !indicator) {
        void item.updateComplete.then(() => this.#scheduleRebuild());
        continue;
      }
      const record = this.#createRecord({
        item,
        trigger,
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
    input: Omit<
      AccordionItemRecord,
      | 'presence'
      | 'resizeObserver'
      | 'cleanups'
      | 'pendingEnter'
      | 'pendingExit'
      | 'indicatorMotion'
      | 'open'
    >,
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
    const record = {
      ...input,
      presence,
      resizeObserver: null,
      cleanups: [],
      pendingEnter: [],
      pendingExit: [],
      indicatorMotion: null,
      open: null,
    };
    reference.current = record;
    this.#configureRecord(record);
    return record;
  }

  #configureRecord(record: AccordionItemRecord): void {
    const { item, trigger, panel, body, indicator, index, duplicate } = record;
    trigger.id ||= createId('tp-accordion-trigger');
    panel.id ||= createId('tp-accordion-content');
    trigger.setAttribute('aria-controls', panel.id);
    panel.setAttribute('aria-labelledby', trigger.id);
    panel.setAttribute('role', 'region');
    indicator.setAttribute('aria-hidden', 'true');
    item.dataset.index = String(index);
    item.dataset.orientation = 'vertical';
    trigger.dataset.index = String(index);
    trigger.dataset.orientation = 'vertical';
    panel.dataset.index = String(index);
    panel.dataset.orientation = 'vertical';
    const unavailable = this.disabled || item.hasAttribute('disabled') || duplicate;
    item.toggleAttribute('data-disabled', unavailable);
    trigger.toggleAttribute('data-disabled', unavailable);
    panel.toggleAttribute('data-disabled', unavailable);
    trigger.setAttribute('aria-disabled', String(unavailable));
    trigger.tabIndex = unavailable ? -1 : 0;
    panel.style.overflow = 'clip';
    panel.style.transitionProperty = 'block-size';
    panel.style.transitionDuration =
      'calc(var(--tp-duration-normal, 180ms) * var(--tp-motion-scale, 1))';
    panel.style.transitionTimingFunction = 'var(--tp-easing-standard, cubic-bezier(0.2, 0, 0, 1))';
    body.style.display ||= 'flow-root';
    indicator.style.display ||= 'inline-block';
    indicator.style.transitionProperty = 'rotate';
    indicator.style.transitionDuration =
      'calc(var(--tp-duration-normal, 180ms) * var(--tp-motion-scale, 1))';
    indicator.style.transitionTimingFunction =
      'var(--tp-easing-standard, cubic-bezier(0.2, 0, 0, 1))';
    const focus = (): void => {
      trigger.toggleAttribute('data-focus-visible', trigger.matches(':focus-visible'));
    };
    const blur = (): void => trigger.removeAttribute('data-focus-visible');
    const press = (event: MouseEvent): void => {
      event.preventDefault();
      const open = this.#derivedValue().includes(record.value);
      this.#requestItem(record, !open, 'trigger-press', event);
    };
    const reveal = (event: Event): void => this.#requestItem(record, true, 'programmatic', event);
    trigger.addEventListener('click', press);
    trigger.addEventListener('focus', focus);
    trigger.addEventListener('blur', blur);
    panel.addEventListener('beforematch', reveal);
    record.cleanups.push(
      () => trigger.removeEventListener('click', press),
      () => trigger.removeEventListener('focus', focus),
      () => trigger.removeEventListener('blur', blur),
      () => panel.removeEventListener('beforematch', reveal),
    );
    if (typeof ResizeObserver !== 'undefined') {
      record.resizeObserver = new ResizeObserver(() => this.#measure(record));
      record.resizeObserver.observe(body);
    }
    this.#measure(record);
    this.#syncPresence(record, record.presence.state);
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
      record.item.toggleAttribute('data-disabled', unavailable);
      record.trigger.toggleAttribute('data-disabled', unavailable);
      record.panel.toggleAttribute('data-disabled', unavailable);
      record.trigger.setAttribute('aria-disabled', String(unavailable));
      record.trigger.tabIndex = unavailable ? -1 : 0;
      record.item.toggleAttribute('data-open', open);
      record.item.toggleAttribute('data-closed', !open);
      record.trigger.toggleAttribute('data-open', open);
      record.trigger.toggleAttribute('data-closed', !open);
      record.trigger.toggleAttribute('data-panel-open', open);
      record.panel.toggleAttribute('data-open', open);
      record.panel.toggleAttribute('data-closed', !open);
      record.trigger.setAttribute('aria-expanded', String(open));
      if (record.open !== null && record.open !== open) {
        record.indicatorMotion = prepareMotion(
          record.item,
          record.indicator,
          accordionMotionRoles.indicator,
          {
            phase: 'change',
            fromState: record.open,
            toState: open,
            context: { value: record.value, index: record.index },
          },
        );
      }
      record.indicator.style.rotate = open ? '90deg' : '0deg';
      record.indicatorMotion?.start();
      record.open = open;
      record.presence.setPresent(open);
      if (!open && (record.presence.state === 'absent' || record.presence.state === 'retained')) {
        this.#syncPresence(record, record.presence.state);
      }
    }
  }

  #syncPresence(record: AccordionItemRecord, state: PresenceState): void {
    const { item, panel, body } = record;
    const phase = state === 'starting' ? 'enter' : state === 'ending' ? 'exit' : null;
    if (phase) {
      const handles = [
        prepareMotion(item, panel, accordionMotionRoles.disclosure, {
          phase,
          fromState: phase === 'enter' ? 'closed' : 'open',
          toState: phase === 'enter' ? 'open' : 'closed',
          context: { value: record.value, index: record.index },
        }),
        prepareMotion(item, body, accordionMotionRoles.content, {
          phase,
          fromState: phase === 'enter' ? 'closed' : 'open',
          toState: phase === 'enter' ? 'open' : 'closed',
          context: { value: record.value, index: record.index },
        }),
      ];
      if (phase === 'enter') record.pendingEnter = handles;
      else record.pendingExit = handles;
    }
    panel.dataset.state = state;
    panel.toggleAttribute('data-starting-style', state === 'starting');
    panel.toggleAttribute('data-ending-style', state === 'ending');
    if (state === 'starting' || state === 'open' || state === 'ending') {
      panel.removeAttribute('hidden');
      this.#measure(record);
    }
    panel.style.blockSize = state === 'open' ? 'var(--accordion-panel-height)' : '0px';
    const handles =
      state === 'open' ? record.pendingEnter : state === 'ending' ? record.pendingExit : [];
    for (const handle of handles) {
      handle.start();
      record.presence.trackCompletion(handle.finished);
    }
    if (state === 'open') record.pendingEnter = [];
    if (state === 'ending') record.pendingExit = [];
    if (state === 'absent') {
      panel.hidden = true;
    } else if (state === 'retained') {
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
      for (const handle of [...record.pendingEnter, ...record.pendingExit]) handle.cancel();
      record.indicatorMotion?.cancel();
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
