import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { controlStyles } from './shared.js';

type ButtonType = 'button' | 'submit' | 'reset';

export class TpButton extends TpElement {
  static tagName = 'tp-button';
  static override properties = {
    ...TpElement.properties,
    type: { type: String, reflect: true },
    variant: { type: String, reflect: true },
    size: { type: String, reflect: true },
    name: { type: String, reflect: true },
    value: { type: String, reflect: true },
    nativeAction: { type: Boolean, attribute: 'native-action', reflect: true },
    focusableWhenDisabled: {
      type: Boolean,
      attribute: 'focusable-when-disabled',
      reflect: true,
    },
    ariaLabel: { type: String, attribute: 'aria-label' },
  };

  static override styles = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: inline-block;
      }

      .control {
        position: relative;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: var(--tp-space-2);
        min-height: var(--tp-control-height-md);
        cursor: pointer;
        color: var(--tp-primary-foreground);
        background: var(--tp-primary);
        border-color: var(--tp-primary);
        font-weight: var(--tp-font-medium);
        text-decoration: none;
        transition:
          color calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard),
          background-color calc(var(--tp-duration-fast) * var(--tp-motion-scale))
            var(--tp-easing-standard),
          border-color calc(var(--tp-duration-fast) * var(--tp-motion-scale))
            var(--tp-easing-standard);
      }

      .control > * {
        position: relative;
        z-index: 1;
      }

      :host([variant='outline']) .control::before,
      :host([variant='ghost']) .control::before {
        position: absolute;
        inset: 0;
        z-index: 0;
        border-radius: inherit;
        background-color: color-mix(in oklab, var(--tp-input) 50%, transparent);
        content: '';
        opacity: 0;
        pointer-events: none;
        transition: opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .control[aria-disabled='true'] {
        cursor: not-allowed;
      }

      :host([size='xs']) .control,
      :host([size='icon-xs']) .control {
        min-height: var(--tp-control-height-sm);
        padding: var(--tp-space-1) var(--tp-space-2);
        font-size: var(--tp-text-xs);
      }

      :host([size='sm']) .control,
      :host([size='icon-sm']) .control {
        min-height: var(--tp-control-height-sm);
        padding: var(--tp-space-1) var(--tp-space-3);
        font-size: var(--tp-text-sm);
      }

      :host([size='lg']) .control,
      :host([size='icon-lg']) .control {
        min-height: var(--tp-control-height-lg);
        padding: var(--tp-space-3) var(--tp-space-4);
        font-size: var(--tp-text-lg);
      }

      :host([size^='icon']) .control {
        aspect-ratio: 1;
        padding-inline: 0;
      }

      :host([size='icon-xs']) .control,
      :host([size='icon-sm']) .control {
        width: var(--tp-control-height-sm);
      }

      :host([size='icon']) .control {
        width: var(--tp-control-height-md);
      }

      :host([size='icon-lg']) .control {
        width: var(--tp-control-height-lg);
      }

      :host([variant='secondary']) .control {
        color: var(--tp-secondary-foreground);
        background: var(--tp-secondary);
        border-color: var(--tp-secondary);
      }

      :host([variant='outline']) .control {
        color: var(--tp-foreground);
        background: var(--tp-background);
        border-color: var(--tp-border);
      }

      :host([variant='destructive']) .control {
        color: var(--tp-destructive-foreground);
        background: var(--tp-destructive);
        border-color: var(--tp-destructive);
      }

      :host([variant='ghost']) .control,
      :host([variant='link']) .control {
        color: var(--tp-foreground);
        background: transparent;
        border-color: transparent;
      }

      :host([variant='link']) .control {
        min-height: auto;
        padding: 0;
        text-decoration: underline;
      }

      .control:not(:disabled, [aria-disabled='true']):hover {
        border-color: var(--tp-primary);

        /* 80% primary keeps the paired foreground legible in both modes. */
        background-color: color-mix(
          in oklab,
          var(--tp-primary) 80%,
          light-dark(var(--tp-foreground), var(--tp-background))
        );
      }

      :host([variant='secondary']) .control:not(:disabled, [aria-disabled='true']):hover {
        border-color: var(--tp-secondary);

        /* 80% secondary uses the same mode-aware contrastward mix. */
        background-color: color-mix(
          in oklab,
          var(--tp-secondary) 80%,
          light-dark(var(--tp-foreground), var(--tp-background))
        );
      }

      :host([variant='outline']) .control:not(:disabled, [aria-disabled='true']):hover {
        border-color: var(--tp-border);
        background-color: var(--tp-background);
      }

      :host([variant='destructive']) .control:not(:disabled, [aria-disabled='true']):hover {
        border-color: var(--tp-destructive);

        /* 85% destructive retains its paired foreground. */
        background-color: color-mix(
          in oklab,
          var(--tp-destructive) 85%,
          light-dark(var(--tp-foreground), var(--tp-background))
        );
      }

      :host([variant='ghost']) .control:not(:disabled, [aria-disabled='true']):hover {
        border-color: transparent;
        background-color: var(--tp-background);
      }

      :host([variant='outline']) .control:not(:disabled, [aria-disabled='true']):hover::before,
      :host([variant='ghost']) .control:not(:disabled, [aria-disabled='true']):hover::before {
        opacity: 1;
      }

      :host([variant='link']) .control:not(:disabled, [aria-disabled='true']):hover {
        border-color: transparent;
        background-color: transparent;
      }

      [part~='button-leading-mark'],
      [part~='button-trailing-mark'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
        font-size: var(--tp-icon-size-md);
      }

      .control > [hidden] {
        display: none;
      }

      :host([size='xs']) [part~='button-leading-mark'],
      :host([size='xs']) [part~='button-trailing-mark'],
      :host([size='icon-xs']) [part~='button-leading-mark'],
      :host([size='icon-xs']) [part~='button-trailing-mark'],
      :host([size='sm']) [part~='button-leading-mark'],
      :host([size='sm']) [part~='button-trailing-mark'],
      :host([size='icon-sm']) [part~='button-leading-mark'],
      :host([size='icon-sm']) [part~='button-trailing-mark'] {
        font-size: var(--tp-icon-size-sm);
      }

      :host([size='lg']) [part~='button-leading-mark'],
      :host([size='lg']) [part~='button-trailing-mark'],
      :host([size='icon-lg']) [part~='button-leading-mark'],
      :host([size='icon-lg']) [part~='button-trailing-mark'] {
        font-size: var(--tp-icon-size-lg);
      }

      :host([size^='icon']) [part~='button-label'] {
        display: none;
      }
    `,
  ];

  type: ButtonType = 'button';
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' = 'default';
  size: 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg' = 'default';
  name = '';
  value = '';
  nativeAction = true;
  focusableWhenDisabled = false;
  declare ariaLabel: string | null;
  #spacePressed = false;
  #unnamedReported = false;

  protected override render() {
    const parts = (part: string) =>
      `${part} ${part}-variant-${this.variant} ${part}-size-${this.size}`;
    const content = html`
      <span part=${parts('button-leading-mark')} hidden
        ><slot name="icon-start" @slotchange=${this.#syncMark}></slot
      ></span>
      <span part=${parts('button-label')}><slot @slotchange=${this.#checkName}></slot></span>
      <span part=${parts('button-trailing-mark')} hidden
        ><slot name="icon-end" @slotchange=${this.#syncMark}></slot
      ></span>
    `;
    return this.nativeAction
      ? html`<button
          class="control"
          part=${`${parts('button')} focusable`}
          type=${this.#type()}
          .value=${this.value}
          ?disabled=${this.disabled && !this.focusableWhenDisabled}
          aria-disabled=${this.disabled ? 'true' : nothing}
          aria-label=${this.ariaLabel || nothing}
          @click=${this.#activate}
          @focusin=${this.#focusIn}
          @focusout=${this.#focusOut}
        >
          ${content}
        </button>`
      : html`<span
          class="control"
          part=${`${parts('button')} focusable`}
          role="button"
          tabindex=${this.disabled && !this.focusableWhenDisabled ? '-1' : '0'}
          aria-disabled=${this.disabled ? 'true' : nothing}
          aria-label=${this.ariaLabel || nothing}
          @click=${this.#activate}
          @keydown=${this.#keyDown}
          @keyup=${this.#keyUp}
          @focusin=${this.#focusIn}
          @focusout=${this.#focusOut}
          >${content}</span
        >`;
  }

  override focus(options?: FocusOptions): void {
    this.#control()?.focus(options);
  }

  override blur(): void {
    this.#control()?.blur();
  }

  override click(): void {
    this.#control()?.click();
  }

  #control(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="button"]');
  }

  #type(): ButtonType {
    return this.type === 'submit' || this.type === 'reset' ? this.type : 'button';
  }

  #syncMark = (event: Event): void => {
    const slot = event.currentTarget as HTMLSlotElement;
    const wrapper = slot.parentElement;
    if (wrapper) wrapper.hidden = slot.assignedNodes({ flatten: true }).length === 0;
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#checkName();
  }

  #checkName = (): void => {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot:not([name])');
    const visibleText = slot
      ?.assignedNodes({ flatten: true })
      .map((node) => node.textContent ?? '')
      .join('')
      .trim();
    const unnamed = !this.ariaLabel && (this.size.startsWith('icon') || !visibleText);
    if (!unnamed) {
      this.#unnamedReported = false;
    } else if (!this.#unnamedReported) {
      this.#unnamedReported = true;
      queueMicrotask(() =>
        this.emit('tp-diagnostic', {
          code: 'button-accessible-name-missing',
          message: 'Button requires an accessible name; icon-only buttons need aria-label.',
          severity: 'warning' as const,
        }),
      );
    }
  };

  #focusIn = (event: FocusEvent): void => {
    this.toggleAttribute('data-focus-visible', (event.target as Element).matches(':focus-visible'));
  };

  #focusOut = (): void => {
    this.#spacePressed = false;
    this.removeAttribute('data-focus-visible');
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (event.key === ' ') {
      event.preventDefault();
      this.#spacePressed = true;
    } else if (event.key === 'Enter' && !event.repeat) {
      event.preventDefault();
      this.click();
    }
  };

  #keyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || !this.#spacePressed) return;
    event.preventDefault();
    this.#spacePressed = false;
    this.click();
  };

  #activate = (event: MouseEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    if (this.#type() === 'button') return;
    // Consumer click handlers must be able to cancel the initiating event first.
    queueMicrotask(() => {
      if (!this.isConnected || this.disabled || event.defaultPrevented) return;
      const owner = this.closest('tp-form') as
        | (HTMLElement & { requestSubmit: (submitter?: HTMLElement) => void; reset: () => void })
        | null;
      if (this.#type() === 'submit') {
        if (owner) owner.requestSubmit(this);
        else this.#requestNativeSubmit();
      } else if (owner) owner.reset();
      else this.#nativeForm()?.reset();
    });
  };

  #nativeForm(): HTMLFormElement | null {
    const id = this.getAttribute('form');
    if (id) {
      const target = this.ownerDocument.getElementById(id);
      return target instanceof HTMLFormElement ? target : null;
    }
    return this.closest('form');
  }

  #requestNativeSubmit(): void {
    const form = this.#nativeForm();
    if (!form) return;
    const proxy = document.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    proxy.name = this.name;
    proxy.value = this.value;
    form.append(proxy);
    try {
      form.requestSubmit(proxy);
    } finally {
      proxy.remove();
    }
  }
}
