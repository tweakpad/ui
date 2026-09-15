import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { CollectionRegistry } from '../foundation/collection.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpOpenChangeEvent, TpValueChangeEvent } from '../foundation/events.js';
import { eventReason, controlStyles, assignedElements } from './shared.js';

export class TpToggle extends TpFormElement {
  static tagName = 'tp-toggle';
  static override properties = {
    ...TpFormElement.properties,
    pressed: { type: Boolean, reflect: true },
    defaultPressed: { type: Boolean, attribute: 'default-pressed' },
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

  protected override render() {
    return html`<button
      class="control"
      part="control focusable"
      type="button"
      ?disabled=${this.disabled}
      aria-pressed=${String(this.pressed)}
      @click=${this.#activate}
    >
      <slot></slot>
    </button>`;
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
      part="root"
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
      <span class="indicator" part="indicator" aria-hidden="true"
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
  #syncForm(): void {
    this.setFormValue(this.checked ? this.value || 'on' : null);
    this.setValidity(
      this.required && !this.checked ? { valueMissing: true } : {},
      this.required && !this.checked ? 'Please select this option.' : '',
    );
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('checked') || changed.has('value') || changed.has('required')) this.#syncForm();
  }
  protected resetFormValue(): void {
    this.checked = this.defaultChecked;
    this.indeterminate = false;
    this.#syncForm();
  }
}

export class TpSwitch extends TpCheckbox {
  static tagName = 'tp-switch';
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
  protected override render() {
    return html`<label class="root" part="root" ?data-checked=${this.checked}>
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
      <span class="track" part="track" aria-hidden="true"
        ><span class="thumb" part="thumb"></span></span
      ><span part="label"><slot></slot></span>
    </label>`;
  }
}

export class TpCollapsible extends TpElement {
  static tagName = 'tp-collapsible';
  static override properties = { ...TpElement.properties, open: { type: Boolean, reflect: true } };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part='content'][hidden] {
        display: none;
      }
    `,
  ];
  open = false;
  protected override render() {
    return html`<div part="root">
      <button
        part="trigger focusable"
        type="button"
        ?disabled=${this.disabled}
        aria-expanded=${String(this.open)}
        @click=${this.#toggle}
      >
        <slot name="trigger">Toggle</slot>
      </button>
      <div part="content" ?hidden=${!this.open}><slot></slot></div>
    </div>`;
  }
  #toggle(event: Event): void {
    const next = !this.open;
    if (this.dispatchEvent(new TpOpenChangeEvent(next, this.open, eventReason(event), event)))
      this.open = next;
  }
}

export class TpAccordion extends TpElement {
  static tagName = 'tp-accordion';
  static override properties = {
    ...TpElement.properties,
    multiple: { type: Boolean, reflect: true },
  };
  multiple = false;
  protected override render() {
    return html`<div part="root" @toggle=${this.#toggle}><slot></slot></div>`;
  }
  #toggle(event: Event): void {
    const target = event.target;
    if (this.multiple || !(target instanceof HTMLDetailsElement) || !target.open) return;
    for (const item of this.querySelectorAll<HTMLDetailsElement>('details[open]'))
      if (item !== target) item.open = false;
  }
}

export class TpToggleGroup extends TpFormElement {
  static tagName = 'tp-toggle-group';
  static override properties = {
    ...TpFormElement.properties,
    multiple: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
      }

      [part='root'] {
        display: flex;
        gap: 0.25rem;
      }
    `,
  ];
  multiple = false;
  #slot: HTMLSlotElement | null = null;
  #registry = new CollectionRegistry();
  protected override render() {
    return html`<div
      part="root"
      role="toolbar"
      aria-orientation=${this.orientation}
      @click=${this.#select}
      @keydown=${this.#key}
    >
      <slot @slotchange=${this.#items}></slot>
    </div>`;
  }
  #items(event: Event): void {
    this.#slot = event.currentTarget as HTMLSlotElement;
    this.#registry = new CollectionRegistry();
    for (const el of assignedElements(this.#slot)) {
      el.setAttribute('role', 'button');
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
    if (!el || this.disabled || el.hasAttribute('disabled')) return;
    const previous = this.value;
    if (this.multiple) {
      const values = new Set(previous.split(' ').filter(Boolean));
      const selectedValue = el.getAttribute('value') ?? '';
      if (values.has(selectedValue)) values.delete(selectedValue);
      else values.add(selectedValue);
      this.value = [...values].join(' ');
    } else this.value = el.getAttribute('value') ?? '';
    for (const item of assignedElements(this.#slot))
      item.toggleAttribute(
        'pressed',
        this.value.split(' ').includes(item.getAttribute('value') ?? ''),
      );
    this.setFormValue(this.value || null);
    this.dispatchEvent(new TpValueChangeEvent(this.value, previous, eventReason(event), event));
  }
  #key(event: KeyboardEvent): void {
    this.#registry.handleArrowKey(
      event,
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
      this.orientation,
      this.direction,
    );
  }
  protected resetFormValue(): void {
    this.value = '';
    this.setFormValue(null);
  }
}

export class TpTabs extends TpElement {
  static tagName = 'tp-tabs';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    activation: { type: String },
  };
  value = '';
  activation: 'automatic' | 'manual' = 'automatic';
  #tabs: HTMLElement[] = [];
  protected override render() {
    return html`<div
        part="list"
        role="tablist"
        aria-orientation=${this.orientation}
        @keydown=${this.#key}
      >
        <slot name="tab" @slotchange=${this.#sync}></slot>
      </div>
      <div part="panels"><slot name="panel" @slotchange=${this.#sync}></slot></div>`;
  }
  #sync = (): void => {
    this.#tabs = [...this.querySelectorAll<HTMLElement>('[slot="tab"]')];
    const panels = [...this.querySelectorAll<HTMLElement>('[slot="panel"]')];
    if (!this.value) this.value = this.#tabs[0]?.getAttribute('value') ?? '';
    this.#tabs.forEach((tab, i) => {
      const selected = (tab.getAttribute('value') ?? '') === this.value;
      tab.setAttribute('role', 'tab');
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      tab.onclick = (e) => this.#select(tab, e);
      const panel = panels[i];
      if (panel) {
        const id = panel.id || (panel.id = `tp-tab-panel-${i}`);
        tab.setAttribute('aria-controls', id);
        panel.setAttribute('role', 'tabpanel');
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
    const reg = new CollectionRegistry();
    this.#tabs.forEach((tab) =>
      reg.register({ element: tab, disabled: tab.hasAttribute('disabled') }),
    );
    const next = reg.handleArrowKey(event, current, this.orientation, this.direction);
    if (next && this.activation === 'automatic') this.#select(next, event);
  }
}
