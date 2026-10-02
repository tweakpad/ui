import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import type { LogicalPosition } from '../foundation/types.js';
import type { IconDefinition } from '../icons/types.js';

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
    icon: { attribute: false },
    iconPosition: { type: String, attribute: 'icon-position', reflect: true },
    loadingPosition: { type: String, attribute: 'loading-position', reflect: true },
    href: { type: String, reflect: true },
    target: { type: String, reflect: true },
    rel: { type: String, reflect: true },
    download: { type: String, reflect: true },
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
    css`
      :host {
        display: inline-block;
      }

      .control {
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition:
          color calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard),
          background-color calc(var(--tp-duration-fast) * var(--tp-motion-scale))
            var(--tp-easing-standard),
          border-color calc(var(--tp-duration-fast) * var(--tp-motion-scale))
            var(--tp-easing-standard);
      }

      .control[aria-disabled='true'] {
        cursor: not-allowed;
      }

      .control > * {
        position: relative;
        z-index: 1;
      }

      .control:not(:disabled, [aria-disabled='true']):active {
        transform: translateY(1px);
      }

      [part~='button-leading-mark'],
      [part~='button-trailing-mark'] {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }

      [part~='button-leading-mark'] tp-spinner,
      [part~='button-trailing-mark'] tp-spinner {
        width: 1em;
        height: 1em;
        color: inherit;
      }

      .control > [hidden] {
        display: none;
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
  icon: IconDefinition | undefined;
  iconPosition: LogicalPosition = 'leading';
  loadingPosition: LogicalPosition | null = null;
  href: string | null = null;
  target: string | null = null;
  rel: string | null = null;
  download: string | null = null;
  nativeAction = true;
  focusableWhenDisabled = false;
  declare ariaLabel: string | null;
  #spacePressed = false;
  #unnamedReported = false;

  protected override render() {
    const parts = (part: string) =>
      `${part} ${part}-variant-${this.variant} ${part}-size-${this.size}`;
    const content = this.#content(parts);
    const loading = this.#resolvedLoadingPosition() !== null;
    if (this.href !== null) {
      return html`<a
        class="control"
        part=${`${parts('button')} focusable`}
        href=${this.href}
        target=${this.target ?? nothing}
        rel=${this.rel ?? nothing}
        download=${this.download ?? nothing}
        tabindex=${this.disabled && !this.focusableWhenDisabled ? '-1' : nothing}
        aria-disabled=${this.disabled ? 'true' : nothing}
        aria-busy=${loading ? 'true' : nothing}
        aria-label=${this.ariaLabel || nothing}
        @click=${this.#activate}
        @focusin=${this.#focusIn}
        @focusout=${this.#focusOut}
      >
        ${content}
      </a>`;
    }
    return this.nativeAction
      ? html`<button
          class="control"
          part=${`${parts('button')} focusable`}
          type=${this.#type()}
          .value=${this.value}
          ?disabled=${this.disabled && !this.focusableWhenDisabled}
          aria-disabled=${this.disabled ? 'true' : nothing}
          aria-busy=${loading ? 'true' : nothing}
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
          aria-busy=${loading ? 'true' : nothing}
          aria-label=${this.ariaLabel || nothing}
          @click=${this.#activate}
          @keydown=${this.#keyDown}
          @keyup=${this.#keyUp}
          @focusin=${this.#focusIn}
          @focusout=${this.#focusOut}
          >${content}</span
        >`;
  }

  #content(parts: (part: string) => string) {
    const loadingPosition = this.#resolvedLoadingPosition();
    if (loadingPosition) {
      return html`
        <span part=${parts('button-leading-mark')} ?hidden=${loadingPosition !== 'leading'}>
          ${loadingPosition === 'leading' ? html`<tp-spinner aria-hidden="true"></tp-spinner>` : nothing}
        </span>
        <span part=${parts('button-label')}><slot @slotchange=${this.#checkName}></slot></span>
        <span part=${parts('button-trailing-mark')} ?hidden=${loadingPosition !== 'trailing'}>
          ${
            loadingPosition === 'trailing'
              ? html`<tp-spinner aria-hidden="true"></tp-spinner>`
              : nothing
          }
        </span>
      `;
    }
    if (this.icon) {
      const iconPosition = this.#resolvedIconPosition();
      return html`
        <span part=${parts('button-leading-mark')} ?hidden=${iconPosition !== 'leading'}>
          ${
            iconPosition === 'leading'
              ? html`<tp-icon .icon=${this.icon} size="1em"></tp-icon>`
              : nothing
          }
        </span>
        <span part=${parts('button-label')}><slot @slotchange=${this.#checkName}></slot></span>
        <span part=${parts('button-trailing-mark')} ?hidden=${iconPosition !== 'trailing'}>
          ${
            iconPosition === 'trailing'
              ? html`<tp-icon .icon=${this.icon} size="1em"></tp-icon>`
              : nothing
          }
        </span>
      `;
    }
    return html`
      <span part=${parts('button-leading-mark')} hidden
        ><slot name="icon-start" @slotchange=${this.#syncMark}></slot
      ></span>
      <span part=${parts('button-label')}><slot @slotchange=${this.#checkName}></slot></span>
      <span part=${parts('button-trailing-mark')} hidden
        ><slot name="icon-end" @slotchange=${this.#syncMark}></slot
      ></span>
    `;
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

  #resolvedIconPosition(): LogicalPosition {
    return this.iconPosition === 'trailing' ? 'trailing' : 'leading';
  }

  #resolvedLoadingPosition(): LogicalPosition | null {
    return this.loadingPosition === 'leading' || this.loadingPosition === 'trailing'
      ? this.loadingPosition
      : null;
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
    if (this.href !== null) return;
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
