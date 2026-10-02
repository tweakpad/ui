import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { CollectionRegistry } from '../foundation/collection.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { assignedElements, eventReason } from './shared.js';
import { TpToggle } from './toggle.js';
import { setPartComposition } from '../presentation/controller.js';
import { joinedControlPresentation } from '../presentation/composition.js';

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

      :host([orientation='vertical']) [part='toggle-group'] {
        flex-direction: column;
      }

      ::slotted(tp-toggle:focus-within) {
        z-index: 1;
      }
    `,
  ];
  selectionMode: 'single' | 'multiple' = 'single';
  override orientation: 'horizontal' | 'vertical' = 'horizontal';
  defaultValue = '';
  variant: 'ghost' | 'outline' = 'ghost';
  size: 'sm' | 'default' | 'lg' = 'default';
  spacing = 2;
  #slot: HTMLSlotElement | null = null;
  #registry = new CollectionRegistry();
  #members: TpToggle[] = [];
  #original = new Map<
    TpToggle,
    { variant: TpToggle['variant']; size: TpToggle['size']; pressed: boolean; tabindex: number }
  >();
  #release(member: TpToggle): void {
    member.selectionOwner = null;
    setPartComposition(member, this);
    const original = this.#original.get(member);
    if (original) {
      member.variant = original.variant;
      member.size = original.size;
      member.pressed = original.pressed;
      void member.updateComplete.then(() => {
        const button = member.renderRoot.querySelector('button');
        if (button) button.tabIndex = original.tabindex;
      });
    }
    this.#original.delete(member);
  }
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
    const members = assignedElements(this.#slot).filter(
      (member): member is TpToggle => member instanceof TpToggle,
    );
    for (const member of this.#members)
      if (!members.includes(member)) {
        this.#release(member);
      }
    this.#members = members;
    let tabStop = members.find(
      (member) => !member.disabled && this.value.split(' ').includes(member.value),
    );
    tabStop ??= members.find((member) => !member.disabled);
    for (const [index, el] of members.entries()) {
      if (!this.#original.has(el))
        this.#original.set(el, {
          variant: el.variant,
          size: el.size,
          pressed: el.pressed,
          tabindex: el.renderRoot.querySelector('button')?.tabIndex ?? 0,
        });
      el.selectionOwner = this;
      el.variant = this.variant;
      el.size = this.size;
      el.part.add('toggle-group-item');
      setPartComposition(
        el,
        this,
        this.spacing === 0
          ? {
              toggle: {
                styleHook: joinedControlPresentation(index, members.length, this.orientation),
              },
            }
          : undefined,
      );
      const selected = this.value.split(' ').includes(el.value);
      el.pressed = selected;
      void el.updateComplete.then(() => {
        const button = el.renderRoot.querySelector<HTMLButtonElement>('button');
        if (button) {
          button.tabIndex = el === tabStop ? 0 : -1;
          button.disabled = el.disabled || this.disabled;
        }
      });
      this.#registry.register({
        element: el,
        disabled: el.hasAttribute('disabled'),
        value: el.value,
      });
    }
  }
  #select(event: Event): void {
    const el = event
      .composedPath()
      .find((node): node is TpToggle => node instanceof TpToggle && this.#members.includes(node));
    if (!el || this.disabled || this.readOnly || el.hasAttribute('disabled')) return;
    const previous = this.value;
    let next: string;
    if (this.selectionMode === 'multiple') {
      const values = new Set(previous.split(' ').filter(Boolean));
      const selectedValue = el.value;
      if (values.has(selectedValue)) values.delete(selectedValue);
      else values.add(selectedValue);
      next = [...values].join(' ');
    } else next = previous === el.value ? '' : el.value;
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
      changed.has('size') ||
      changed.has('orientation') ||
      changed.has('spacing')
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
  override disconnectedCallback(): void {
    for (const member of this.#members) {
      this.#release(member);
    }
    super.disconnectedCallback();
  }
}
