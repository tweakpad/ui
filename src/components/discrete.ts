import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { CollectionRegistry } from '../foundation/collection.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { createId } from '../foundation/id.js';
import { PresenceController } from '../foundation/presence.js';
import { eventReason, controlStyles, assignedElements } from './shared.js';

export class TpToggle extends TpFormElement {
  static tagName = 'tp-toggle';
  static override properties = {
    ...TpFormElement.properties,
    pressed: { type: Boolean, reflect: true },
    defaultPressed: { type: Boolean, attribute: 'default-pressed' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      button {
        cursor: pointer;
      }

      [aria-pressed='true'] {
        background: var(--tp-color-accent);
        color: var(--tp-color-accent-contrast);
      }
    `,
  ];
  pressed = false;
  defaultPressed = false;
  variant: 'default' | 'outline' = 'default';
  size: 'sm' | 'default' | 'lg' = 'default';

  protected override render() {
    return html`<button
      class="control"
      part="toggle focusable"
      type="button"
      ?disabled=${this.disabled}
      aria-pressed=${String(this.pressed)}
      @click=${this.#activate}
    >
      <span part="toggle-content"><slot></slot></span>
    </button>`;
  }
  override activateFromLabel(): void {
    if (this.disabled) return;
    const button = this.renderRoot.querySelector<HTMLButtonElement>('button');
    button?.focus();
    button?.click();
  }
  #activate(event: Event): void {
    if (this.disabled || this.readOnly) return;
    const previous = this.pressed;
    const next = !previous;
    if (this.dispatchEvent(new TpValueChangeEvent(next, previous, eventReason(event), event))) {
      this.pressed = next;
      this.value = String(next);
      this.setFormValue(this.name ? this.value : null);
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('pressed') || changed.has('value') || changed.has('disabled'))
      this.setFormValue(!this.disabled && this.pressed && this.name ? this.value || 'on' : null);
  }
  protected resetFormValue(): void {
    this.pressed = this.defaultPressed;
    this.setFormValue(this.pressed ? this.value || 'on' : null);
  }
}

export class TpCheckbox extends TpFormElement {
  static tagName = 'tp-checkbox';
  static override properties = {
    ...TpFormElement.properties,
    checked: { type: Boolean, reflect: true },
    defaultChecked: { type: Boolean, attribute: 'default-checked' },
    indeterminate: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      .root {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      .indicator {
        display: grid;
        place-items: center;
        width: 1.125rem;
        height: 1.125rem;
        border: 1px solid var(--tp-color-border);
        border-radius: 0.25rem;
      }

      .root[data-checked] .indicator,
      .root[data-indeterminate] .indicator {
        color: var(--tp-color-accent-contrast);
        background: var(--tp-color-accent);
        border-color: var(--tp-color-accent);
      }
    `,
  ];
  checked = false;
  defaultChecked = false;
  indeterminate = false;

  protected override render() {
    const state = this.indeterminate ? 'mixed' : String(this.checked);
    return html`<label
      class="root"
      part="checkbox"
      ?data-checked=${this.checked}
      ?data-indeterminate=${this.indeterminate}
    >
      <input
        class="visually-hidden"
        part="focusable"
        type="checkbox"
        .checked=${this.checked}
        .indeterminate=${this.indeterminate}
        ?disabled=${this.disabled}
        ?required=${this.required}
        aria-checked=${state}
        @change=${this.handleChange}
      />
      <span class="indicator" part="checkbox-indicator" aria-hidden="true"
        >${this.indeterminate ? '−' : this.checked ? '✓' : ''}</span
      ><span part="label"><slot></slot></span>
    </label>`;
  }
  protected handleChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const previous = this.checked;
    if (this.readOnly) {
      input.checked = previous;
      return;
    }
    if (!this.dispatchEvent(new TpValueChangeEvent(input.checked, previous, 'input', event))) {
      input.checked = previous;
      return;
    }
    this.checked = input.checked;
    this.indeterminate = false;
    this.#syncForm();
  }
  override activateFromLabel(): void {
    if (this.disabled) return;
    const input = this.renderRoot.querySelector<HTMLInputElement>('input');
    input?.focus();
    input?.click();
  }
  #syncForm(): void {
    this.setFormValue(!this.disabled && this.checked ? this.value || 'on' : null);
    this.setValidity(
      this.required && !this.checked ? { valueMissing: true } : {},
      this.required && !this.checked ? 'Please select this option.' : '',
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      changed.has('checked') ||
      changed.has('value') ||
      changed.has('required') ||
      changed.has('disabled')
    )
      this.#syncForm();
  }
  protected resetFormValue(): void {
    this.checked = this.defaultChecked;
    this.indeterminate = false;
    this.#syncForm();
  }
}

export class TpSwitch extends TpCheckbox {
  static tagName = 'tp-switch';
  static override properties = {
    ...TpCheckbox.properties,
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      .root {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      .track {
        display: flex;
        width: 2.25rem;
        height: 1.25rem;
        padding: 0.125rem;
        border-radius: 999px;
        background: var(--tp-color-border);
        transition: background var(--tp-duration-fast);
      }

      .thumb {
        width: 1rem;
        height: 1rem;
        border-radius: 50%;
        background: var(--tp-color-surface);
        box-shadow: 0 1px 3px rgb(0 0 0 / 35%);
        transition: transform var(--tp-duration-fast);
      }

      .root[data-checked] .track {
        background: var(--tp-color-accent);
      }

      .root[data-checked] .thumb {
        transform: translateX(1rem);
      }

      :host-context([dir='rtl']) .root[data-checked] .thumb {
        transform: translateX(-1rem);
      }
    `,
  ];
  size: 'sm' | 'default' = 'default';
  protected override render() {
    return html`<label class="root" part="switch" ?data-checked=${this.checked}>
      <input
        class="visually-hidden"
        part="focusable"
        type="checkbox"
        role="switch"
        .checked=${this.checked}
        ?disabled=${this.disabled}
        ?required=${this.required}
        aria-checked=${String(this.checked)}
        @change=${this.handleChange}
      />
      <span class="track" aria-hidden="true"><span class="thumb" part="switch-thumb"></span></span
      ><span part="label"><slot></slot></span>
    </label>`;
  }
}

export class TpCollapsible extends TpElement {
  static tagName = 'tp-collapsible';
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part='collapsible-content'][hidden] {
        display: none;
      }
    `,
  ];
  open = false;
  defaultOpen = false;
  readonly #contentId = createId('tp-collapsible-content');
  readonly #presence = new PresenceController(this);
  protected override firstUpdated(): void {
    if (!this.hasAttribute('open') && this.defaultOpen) this.open = true;
    this.#presence.setPresent(this.open, 180);
  }
  protected override render() {
    return html`<div part="collapsible">
      <button
        part="collapsible-trigger focusable"
        type="button"
        ?disabled=${this.disabled}
        aria-expanded=${String(this.open)}
        aria-controls=${this.#contentId}
        @click=${this.#toggle}
      >
        <slot name="trigger">Toggle</slot>
      </button>
      <div
        id=${this.#contentId}
        part="collapsible-content"
        data-state=${this.#presence.state}
        ?hidden=${!this.#presence.mounted}
      >
        <slot></slot>
      </div>
    </div>`;
  }
  #toggle(event: Event): void {
    const next = !this.open;
    if (this.dispatchEvent(new TpOpenChangeEvent(next, this.open, eventReason(event), event)))
      this.open = next;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('open')) this.#presence.setPresent(this.open, 180);
  }
}

export class TpAccordion extends TpElement {
  static tagName = 'tp-accordion';
  static override properties = {
    ...TpElement.properties,
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    value: { type: String, reflect: true },
    defaultValue: { type: String, attribute: 'default-value' },
    collapsible: { type: Boolean, reflect: true },
  };
  selectionMode: 'single' | 'multiple' = 'single';
  value = '';
  defaultValue = '';
  collapsible = false;
  #items: HTMLDetailsElement[] = [];
  #syncing = false;
  protected override render() {
    return html`<div part="accordion" @click=${this.#click} @keydown=${this.#key}>
      <slot @slotchange=${this.#readItems}></slot>
    </div>`;
  }
  #readItems = (event: Event): void => {
    for (const item of this.#items) item.removeEventListener('toggle', this.#toggle);
    this.#items = assignedElements(event.currentTarget as HTMLSlotElement).filter(
      (item): item is HTMLDetailsElement => item instanceof HTMLDetailsElement,
    );
    for (const [index, item] of this.#items.entries()) {
      const value = item.getAttribute('value') || item.id || `item-${index + 1}`;
      item.dataset.value = value;
      item.setAttribute('part', 'accordion-item');
      const summary = item.querySelector<HTMLElement>(':scope > summary');
      if (!summary) continue;
      summary.setAttribute('part', 'accordion-heading accordion-trigger');
      summary.setAttribute('aria-disabled', String(this.disabled || item.hasAttribute('disabled')));
      const content = this.#contentFor(item);
      const contentId = content.id || (content.id = createId('tp-accordion-content'));
      summary.setAttribute('aria-controls', contentId);
      item.addEventListener('toggle', this.#toggle);
    }
    if (!this.value) {
      this.value =
        this.defaultValue ||
        (this.selectionMode === 'single' && !this.collapsible
          ? (this.#items.find((item) => !item.hasAttribute('disabled'))?.dataset.value ?? '')
          : '');
    }
    this.#applyValue();
  };
  #contentFor(item: HTMLDetailsElement): HTMLElement {
    let content = item.querySelector<HTMLElement>(':scope > [data-tp-accordion-content]');
    if (!content) {
      content = document.createElement('div');
      content.dataset.tpAccordionContent = '';
      for (const node of [...item.childNodes]) {
        if (!(node instanceof HTMLElement && node.tagName === 'SUMMARY')) content.append(node);
      }
      item.append(content);
    }
    content.setAttribute('part', 'accordion-content accordion-content-body');
    return content;
  }
  #toggle = (event: Event): void => {
    if (this.#syncing) return;
    const item = event.currentTarget;
    if (!(item instanceof HTMLDetailsElement)) return;
    if (this.disabled || item.hasAttribute('disabled')) {
      this.#applyValue();
      return;
    }
    const previous = this.value;
    let openItems = this.#items.filter((candidate) => candidate.open);
    if (this.selectionMode === 'single' && item.open) openItems = [item];
    if (this.selectionMode === 'single' && !this.collapsible && openItems.length === 0) {
      this.#applyValue();
      return;
    }
    const next = this.#items
      .filter((candidate) => openItems.includes(candidate))
      .map((candidate) => candidate.dataset.value ?? '')
      .filter(Boolean)
      .join(' ');
    if (!this.dispatchEvent(new TpValueChangeEvent(next, previous, 'selection', event))) {
      this.#applyValue();
      return;
    }
    this.value = next;
    this.#applyValue();
  };
  #click = (event: Event): void => {
    const item = (event.target as Element).closest('details');
    if (this.disabled || item?.hasAttribute('disabled')) event.preventDefault();
  };
  #applyValue(): void {
    const selected = new Set(this.value.split(' ').filter(Boolean));
    this.#syncing = true;
    for (const item of this.#items) {
      item.open = selected.has(item.dataset.value ?? '');
      item.querySelector(':scope > summary')?.setAttribute('aria-expanded', String(item.open));
    }
    queueMicrotask(() => {
      this.#syncing = false;
    });
  }
  #key(event: KeyboardEvent): void {
    const summaries = this.#items
      .filter((item) => !item.hasAttribute('disabled'))
      .map((item) => item.querySelector<HTMLElement>(':scope > summary'))
      .filter((summary): summary is HTMLElement => Boolean(summary));
    const current = event
      .composedPath()
      .find((target) => summaries.includes(target as HTMLElement));
    const index = summaries.indexOf(current as HTMLElement);
    if (index < 0) return;
    let next: number;
    if (event.key === 'ArrowDown') next = (index + 1) % summaries.length;
    else if (event.key === 'ArrowUp') next = (index - 1 + summaries.length) % summaries.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = summaries.length - 1;
    else return;
    event.preventDefault();
    summaries[next]?.focus();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('value') || changed.has('selectionMode') || changed.has('collapsible'))
      this.#applyValue();
  }
}

export class TpToggleGroup extends TpFormElement {
  static tagName = 'tp-toggle-group';
  static override properties = {
    ...TpFormElement.properties,
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    defaultValue: { type: String, attribute: 'default-value' },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    spacing: { type: Number, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      [part='toggle-group'] {
        display: flex;
        gap: calc(var(--tp-space-unit, 0.125rem) * var(--tp-toggle-group-spacing, 2));
      }
    `,
  ];
  selectionMode: 'single' | 'multiple' = 'single';
  defaultValue = '';
  variant: 'default' | 'outline' = 'default';
  size: 'sm' | 'default' | 'lg' = 'default';
  spacing = 2;
  #slot: HTMLSlotElement | null = null;
  #registry = new CollectionRegistry();
  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[role="toolbar"]');
  }
  protected override render() {
    return html`<div
      part="toggle-group"
      role="toolbar"
      aria-orientation=${this.orientation}
      style=${`--tp-toggle-group-spacing:${Math.max(0, this.spacing)}`}
      @click=${this.#select}
      @keydown=${this.#key}
    >
      <slot @slotchange=${this.#items}></slot>
    </div>`;
  }
  #items(event: Event): void {
    this.#slot = event.currentTarget as HTMLSlotElement;
    this.#syncItems();
  }
  #syncItems(): void {
    this.#registry = new CollectionRegistry();
    for (const el of assignedElements(this.#slot)) {
      el.setAttribute('role', 'button');
      el.setAttribute('part', 'toggle-group-item');
      el.setAttribute('data-variant', this.variant);
      el.setAttribute('data-size', this.size);
      const selected = this.value.split(' ').includes(el.getAttribute('value') ?? '');
      el.toggleAttribute('pressed', selected);
      el.setAttribute('aria-pressed', String(selected));
      el.tabIndex = el.hasAttribute('pressed') ? 0 : -1;
      this.#registry.register({
        element: el,
        disabled: el.hasAttribute('disabled'),
        value: el.getAttribute('value') ?? '',
      });
    }
  }
  #select(event: Event): void {
    const el = (event.target as Element).closest<HTMLElement>('[value]');
    if (!el || this.disabled || this.readOnly || el.hasAttribute('disabled')) return;
    const previous = this.value;
    let next: string;
    if (this.selectionMode === 'multiple') {
      const values = new Set(previous.split(' ').filter(Boolean));
      const selectedValue = el.getAttribute('value') ?? '';
      if (values.has(selectedValue)) values.delete(selectedValue);
      else values.add(selectedValue);
      next = [...values].join(' ');
    } else next = el.getAttribute('value') ?? '';
    if (!this.dispatchEvent(new TpValueChangeEvent(next, previous, eventReason(event), event)))
      return;
    this.value = next;
    for (const item of assignedElements(this.#slot)) this.#publishItemState(item);
    this.setFormValue(this.value || null);
  }
  #key(event: KeyboardEvent): void {
    if (this.disabled || this.readOnly) return;
    this.#registry.handleArrowKey(
      event,
      event.target instanceof HTMLElement ? event.target : null,
      this.orientation,
      this.direction,
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      changed.has('value') ||
      changed.has('disabled') ||
      changed.has('variant') ||
      changed.has('size')
    )
      this.#syncItems();
    if (changed.has('value') || changed.has('disabled'))
      this.setFormValue(this.disabled ? null : this.value || null);
  }
  protected resetFormValue(): void {
    this.value = this.defaultValue;
    this.setFormValue(this.value || null);
  }
  #publishItemState(item: HTMLElement): void {
    const selected = this.value.split(' ').includes(item.getAttribute('value') ?? '');
    item.toggleAttribute('pressed', selected);
    item.setAttribute('aria-pressed', String(selected));
  }
}

export class TpTabs extends TpElement {
  static tagName = 'tp-tabs';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    defaultValue: { type: String, attribute: 'default-value' },
    activation: { type: String },
    variant: { type: String, reflect: true },
  };
  value = '';
  defaultValue = '';
  activation: 'automatic' | 'manual' = 'manual';
  variant: 'enclosed' | 'line' = 'enclosed';
  #tabs: HTMLElement[] = [];
  readonly #tabIds = new WeakMap<HTMLElement, string>();
  readonly #panelIds = new WeakMap<HTMLElement, string>();
  protected override render() {
    return html`<div part="tabs">
      <div
        part="tabs-list"
        role="tablist"
        aria-orientation=${this.orientation}
        @keydown=${this.#key}
      >
        <slot name="tab" @slotchange=${this.#sync}></slot>
      </div>
      <div><slot name="panel" @slotchange=${this.#sync}></slot></div>
    </div>`;
  }
  #sync = (): void => {
    this.#tabs = [...this.querySelectorAll<HTMLElement>('[slot="tab"]')];
    const panels = [...this.querySelectorAll<HTMLElement>('[slot="panel"]')];
    if (!this.value)
      this.value =
        this.defaultValue ||
        this.#tabs.find((tab) => !tab.hasAttribute('disabled'))?.getAttribute('value') ||
        '';
    this.#tabs.forEach((tab, i) => {
      const selected = (tab.getAttribute('value') ?? '') === this.value;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('part', 'tabs-trigger');
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-disabled', String(tab.hasAttribute('disabled')));
      tab.tabIndex = selected ? 0 : -1;
      tab.onclick = (e) => this.#select(tab, e);
      const panel = panels[i];
      if (panel) {
        const id = panel.id || this.#panelIds.get(panel) || createId('tp-tab-panel');
        const tabId = tab.id || this.#tabIds.get(tab) || createId('tp-tab');
        this.#panelIds.set(panel, id);
        this.#tabIds.set(tab, tabId);
        panel.id = id;
        tab.id = tabId;
        tab.setAttribute('aria-controls', id);
        panel.setAttribute('role', 'tabpanel');
        panel.setAttribute('part', 'tabs-content');
        panel.setAttribute('aria-labelledby', tabId);
        panel.hidden = !selected;
      }
    });
  };
  #select(tab: HTMLElement, event: Event): void {
    if (this.disabled || tab.hasAttribute('disabled')) return;
    const next = tab.getAttribute('value') ?? '';
    const previous = this.value;
    if (next === previous) return;
    if (this.dispatchEvent(new TpValueChangeEvent(next, previous, eventReason(event), event))) {
      this.value = next;
      this.#sync();
    }
  }
  #key(event: KeyboardEvent): void {
    const current = event.target instanceof HTMLElement ? event.target : null;
    if ((event.key === 'Enter' || event.key === ' ') && current && this.#tabs.includes(current)) {
      event.preventDefault();
      this.#select(current, event);
      return;
    }
    const reg = new CollectionRegistry();
    this.#tabs.forEach((tab) =>
      reg.register({ element: tab, disabled: tab.hasAttribute('disabled') }),
    );
    const next = reg.handleArrowKey(event, current, this.orientation, this.direction);
    if (next && this.activation === 'automatic') this.#select(next, event);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('value') || changed.has('orientation') || changed.has('disabled')) this.#sync();
  }
}
