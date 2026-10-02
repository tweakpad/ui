import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import { eventReason } from './shared.js';

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
    css`
      :host {
        display: inline-block;
      }

      button {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--tp-space-2);
        cursor: pointer;
      }

      button > * {
        position: relative;
        z-index: 1;
      }
    `,
  ];
  pressed = false;
  defaultPressed = false;
  variant: 'ghost' | 'outline' = 'ghost';
  size: 'sm' | 'default' | 'lg' = 'default';
  /** Compound ownership is separate from the consumer's disabled and readonly inputs. */
  selectionOwner: HTMLElement | null = null;

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
    if (this.selectionOwner) return;
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
