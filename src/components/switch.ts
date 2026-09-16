import { css, html } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpCheckbox } from './checkbox.js';

export class TpSwitch extends TpCheckbox {
  static tagName = 'tp-switch';
  static override properties = {
    ...TpCheckbox.properties,
    size: { type: String, reflect: true },
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
  size: 'sm' | 'default' = 'default';
  protected override render() {
    return html`<label class="root" part="switch" ?data-checked=${this.checked}>
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
      <span class="track" aria-hidden="true"><span class="thumb" part="switch-thumb"></span></span
      ><span part="label"><slot></slot></span>
    </label>`;
  }
}
