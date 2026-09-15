import { LitElement, css } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import type { Direction, Orientation } from './types.js';

export class TpElement extends LitElement {
  static properties = {
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    invalid: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    orientation: { type: String, reflect: true },
  };

  static styles: CSSResultGroup = css`
    :host {
      box-sizing: border-box;
      color: inherit;
      font: inherit;
    }

    :host([hidden]) {
      display: none !important;
    }

    :host([disabled]) {
      cursor: not-allowed;
      opacity: 0.55;
    }

    *,
    *::before,
    *::after {
      box-sizing: inherit;
    }

    [part~='focusable']:focus-visible {
      outline: 2px solid var(--tp-color-accent, Highlight);
      outline-offset: 2px;
    }

    .visually-hidden {
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip-path: inset(50%);
      white-space: nowrap;
      border: 0;
    }
  `;

  disabled = false;
  readOnly = false;
  invalid = false;
  required = false;
  orientation: Orientation = 'horizontal';

  get direction(): Direction {
    const own = this.getAttribute('dir');
    if (own === 'rtl' || own === 'ltr') return own;
    return getComputedStyle(this).direction === 'rtl' ? 'rtl' : 'ltr';
  }

  protected emit<T>(type: string, detail: T, init: CustomEventInit<T> = {}): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        composed: true,
        ...init,
        detail,
      }),
    );
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-disabled', this.disabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-invalid', this.invalid);
    this.setAttribute('data-orientation', this.orientation);
  }
}

export abstract class TpFormElement extends TpElement {
  static formAssociated = true;

  static override properties = {
    ...TpElement.properties,
    name: { type: String, reflect: true },
    value: { type: String },
  };

  name = '';
  value = '';
  protected readonly internals: ElementInternals | null;

  constructor() {
    super();
    this.internals = 'attachInternals' in this ? this.attachInternals() : null;
  }

  get form(): HTMLFormElement | null {
    return this.internals?.form ?? null;
  }

  get labels(): NodeList | null {
    return this.internals?.labels ?? null;
  }

  get validity(): ValidityState | null {
    return this.internals?.validity ?? null;
  }

  get validationMessage(): string {
    return this.internals?.validationMessage ?? '';
  }

  checkValidity(): boolean {
    return this.internals?.checkValidity() ?? true;
  }

  reportValidity(): boolean {
    return this.internals?.reportValidity() ?? true;
  }

  protected setFormValue(
    value: FormData | File | string | null,
    state?: FormData | File | string | null,
  ): void {
    this.internals?.setFormValue(value, state);
  }

  protected setValidity(flags: ValidityStateFlags = {}, message = '', anchor?: HTMLElement): void {
    this.internals?.setValidity(flags, message, anchor);
    this.invalid = Object.values(flags).some(Boolean);
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }

  formResetCallback(): void {
    this.resetFormValue();
  }

  protected abstract resetFormValue(): void;
}
