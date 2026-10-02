import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';

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
        cursor: pointer;
      }

      .indicator {
        display: grid;
        place-items: center;
        width: var(--tp-icon-size-md);
        height: var(--tp-icon-size-md);
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
    input.indeterminate = this.indeterminate;
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
    this.#syncForm();
  }
}
