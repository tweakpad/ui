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
