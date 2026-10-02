import { css, html } from 'lit';
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
  variant: 'enclosed' | 'underline' = 'enclosed';
  static override styles = [
    TpElement.styles,
    css`
      [part='tabs'] {
        display: flex;
        flex-direction: column;
      }

      [part='tabs-list'] {
        display: flex;
      }

      :host([orientation='vertical']) [part='tabs'] {
        flex-direction: row;
      }

      :host([orientation='vertical']) [part='tabs-list'] {
        flex-direction: column;
      }

      ::slotted([slot='tab']) {
        appearance: none;
        cursor: pointer;
      }

      ::slotted([slot='tab']:focus-visible) {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: var(--tp-ring-offset);
      }

      :host([variant='enclosed']) ::slotted([aria-selected='true']) {
        background: var(--tp-background);
        border-radius: var(--tp-radius-sm);
      }

      :host([variant='underline']) ::slotted([aria-selected='true']) {
        border-block-end-color: var(--tp-primary);
      }

      :host([variant='underline'][orientation='vertical']) ::slotted([aria-selected='true']) {
        border-inline-end-color: var(--tp-primary);
      }
    `,
  ];
  #tabs: HTMLElement[] = [];
  #parts: Array<() => void> = [];
  #observer: MutationObserver | undefined;
  override connectedCallback(): void {
    super.connectedCallback();
    this.#observer = new MutationObserver(() => this.#sync());
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['value', 'disabled'],
    });
    if (this.hasUpdated) this.#sync();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    for (const cleanup of this.#parts) cleanup();
    this.#parts = [];
    super.disconnectedCallback();
  }
  readonly #tabIds = new WeakMap<HTMLElement, string>();
  readonly #panelIds = new WeakMap<HTMLElement, string>();
  protected override render() {
    return html`<div part="tabs">
      <div
        part="tabs-list"
        role="tablist"
        aria-orientation=${this.orientation}
        @keydown=${this.#key}
        @click=${this.#click}
      >
        <slot name="tab" @slotchange=${this.#sync}></slot>
      </div>
      <div><slot name="panel" @slotchange=${this.#sync}></slot></div>
    </div>`;
  }
  #sync = (): void => {
    for (const cleanup of this.#parts) cleanup();
    this.#parts = [];
    const seen = new Set<string>();
    this.#tabs = [...this.querySelectorAll<HTMLElement>(':scope > [slot="tab"]')].filter((tab) => {
      const value = tab.getAttribute('value') ?? '';
      if (seen.has(value)) {
        tab.tabIndex = -1;
        tab.setAttribute('aria-disabled', 'true');
        tab.setAttribute('aria-selected', 'false');
        tab.removeAttribute('aria-controls');
        return false;
      }
      seen.add(value);
      return true;
    });
    const panels = [...this.querySelectorAll<HTMLElement>(':scope > [slot="panel"]')];
    if (!this.value)
      this.value =
        this.defaultValue ||
        this.#tabs.find((tab) => !tab.hasAttribute('disabled'))?.getAttribute('value') ||
        '';
    panels.forEach((panel) => {
      panel.hidden = true;
    });
    this.#tabs.forEach((tab) => {
      const selected = (tab.getAttribute('value') ?? '') === this.value;
      tab.setAttribute('role', 'tab');
      tab.part.add('tabs-trigger');
      this.#parts.push(this.presentationController.registerPart('tabs-trigger', tab));
      tab.setAttribute('aria-selected', String(selected));
      tab.setAttribute('aria-disabled', String(tab.hasAttribute('disabled')));
      tab.tabIndex = selected ? 0 : -1;
      const panel = panels.find(
        (candidate) => candidate.getAttribute('value') === tab.getAttribute('value'),
      );
      tab.removeAttribute('aria-controls');
      if (panel) {
        const id = panel.id || this.#panelIds.get(panel) || createId('tp-tab-panel');
        const tabId = tab.id || this.#tabIds.get(tab) || createId('tp-tab');
        this.#panelIds.set(panel, id);
        this.#tabIds.set(tab, tabId);
        panel.id = id;
        tab.id = tabId;
        tab.setAttribute('aria-controls', id);
        panel.setAttribute('role', 'tabpanel');
        panel.part.add('tabs-content');
        this.#parts.push(this.presentationController.registerPart('tabs-content', panel));
        panel.setAttribute('aria-labelledby', tabId);
        panel.hidden = !selected;
      }
    });
  };
  #click = (event: MouseEvent): void => {
    const tab = event
      .composedPath()
      .find(
        (node): node is HTMLElement => node instanceof HTMLElement && this.#tabs.includes(node),
      );
    if (tab && !event.defaultPrevented) this.#select(tab, event);
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
