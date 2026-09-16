import { html } from 'lit';
import type { PropertyValues } from 'lit';
import { CollectionRegistry } from '../foundation/collection.js';
import { TpElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { createId } from '../foundation/id.js';
import { eventReason } from './shared.js';

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
