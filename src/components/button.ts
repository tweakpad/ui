import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { controlStyles } from './shared.js';

export class TpButton extends TpElement {
  static tagName = 'tp-button';
  static override properties = {
    ...TpElement.properties,
    type: { type: String, reflect: true },
    pressed: { type: Boolean, reflect: true },
    loading: { type: Boolean, reflect: true },
    value: { type: String },
  };

  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        cursor: pointer;
      }

      button[data-pressed] {
        color: var(--tp-color-accent-contrast, #fff);
        background: var(--tp-color-accent, Highlight);
      }

      [part='spinner'] {
        width: 1em;
        height: 1em;
        border: 2px solid currentcolor;
        border-right-color: transparent;
        border-radius: 50%;
        animation: spin var(--tp-duration-normal, 180ms) linear infinite;
      }

      @keyframes spin {
        to {
          transform: rotate(1turn);
        }
      }
    `,
  ];

  type: 'button' | 'submit' | 'reset' = 'button';
  pressed = false;
  loading = false;
  value = '';

  protected override render() {
    return html`
      <button
        class="control"
        part="control focusable"
        type=${this.type}
        .value=${this.value}
        ?disabled=${this.disabled || this.loading}
        ?data-pressed=${this.pressed}
        aria-pressed=${this.hasAttribute('pressed') ? String(this.pressed) : undefined}
        aria-busy=${this.loading ? 'true' : undefined}
      >
        ${this.loading ? html`<span part="spinner" aria-hidden="true"></span>` : null}
        <slot name="icon-start"></slot><slot></slot><slot name="icon-end"></slot>
      </button>
    `;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('pressed')) this.setAttribute('aria-pressed', String(this.pressed));
  }
}
