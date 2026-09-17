import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { CollectionRegistry } from '../foundation/collection.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { assignedElements, eventReason } from './shared.js';

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
        gap: calc(var(--tp-spacing) * var(--tp-toggle-group-spacing, 2));
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
