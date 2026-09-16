import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { controlStyles, eventReason } from './shared.js';

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
