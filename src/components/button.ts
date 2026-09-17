import { css, html } from 'lit';
import { TpElement } from '../foundation/element.js';
import { controlStyles } from './shared.js';

export class TpButton extends TpElement {
  static tagName = 'tp-button';
  static override properties = {
    ...TpElement.properties,
    type: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    name: { type: String, reflect: true },
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
        gap: var(--tp-space-2);
        cursor: pointer;
        color: var(--tp-primary-foreground);
        background: var(--tp-primary);
        border-color: var(--tp-primary);
      }

      :host([size='xs']) button,
      :host([size='icon-xs']) button {
        min-height: var(--tp-control-height-sm);
        padding: var(--tp-space-1) var(--tp-space-2);
      }

      :host([size='sm']) button,
      :host([size='icon-sm']) button {
        min-height: var(--tp-control-height-sm);
        padding: var(--tp-space-1) var(--tp-space-3);
      }

      :host([size='lg']) button,
      :host([size='icon-lg']) button {
        min-height: var(--tp-control-height-lg);
        padding: var(--tp-space-3) var(--tp-space-4);
      }

      :host([size^='icon']) button {
        aspect-ratio: 1;
        padding-inline: 0;
      }

      :host([variant='secondary']) button {
        color: var(--tp-secondary-foreground);
        background: var(--tp-secondary);
      }

      :host([variant='outline']) button {
        color: var(--tp-foreground);
        background: var(--tp-background);
        border-color: var(--tp-border);
      }

      :host([variant='destructive']) button {
        color: var(--tp-destructive-foreground);
        background: var(--tp-destructive);
        border-color: var(--tp-destructive);
      }

      :host([variant='ghost']) button,
      :host([variant='link']) button {
        color: var(--tp-foreground);
        background: transparent;
        border-color: transparent;
      }

      :host([variant='link']) button {
        min-height: auto;
        padding: 0;
        text-decoration: underline;
      }
    `,
  ];

  type: 'button' | 'submit' | 'reset' = 'button';
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' = 'default';
  size: 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg' = 'default';
  name = '';
  value = '';

  protected override render() {
    return html`
      <button
        class="control"
        part="button focusable"
        type=${this.type}
        .value=${this.value}
        ?disabled=${this.disabled}
        @click=${this.#action}
      >
        <span part="button-leading-mark"><slot name="icon-start"></slot></span>
        <span part="button-label"><slot></slot></span>
        <span part="button-trailing-mark"><slot name="icon-end"></slot></span>
      </button>
    `;
  }

  override focus(options?: FocusOptions): void {
    this.renderRoot.querySelector<HTMLButtonElement>('button')?.focus(options);
  }

  override blur(): void {
    this.renderRoot.querySelector<HTMLButtonElement>('button')?.blur();
  }

  #action = (): void => {
    if (this.disabled || this.type === 'button') return;
    const owner = this.closest('tp-form') as
      | (HTMLElement & { requestSubmit: (submitter?: HTMLElement) => void; reset: () => void })
      | null;
    if (this.type === 'submit') {
      if (owner) owner.requestSubmit(this);
      else this.#requestNativeSubmit();
    } else if (owner) owner.reset();
    else this.closest('form')?.reset();
  };

  #requestNativeSubmit(): void {
    const form = this.closest('form');
    if (!form) return;
    const proxy = document.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    proxy.name = this.name;
    proxy.value = this.value;
    form.append(proxy);
    form.requestSubmit(proxy);
    proxy.remove();
  }
}
