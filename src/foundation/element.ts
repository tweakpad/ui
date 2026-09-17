import { LitElement, css } from 'lit';
import type { CSSResultGroup, PropertyDeclarations, PropertyValues } from 'lit';
import type { Direction, Orientation } from './types.js';
import { cancelMotions, type MotionPolicy } from './motion.js';
import { createId } from './id.js';

export class TpElement extends LitElement {
  static properties: PropertyDeclarations = {
    disabled: { type: Boolean, reflect: true },
    readOnly: { type: Boolean, attribute: 'readonly', reflect: true },
    invalid: { type: Boolean, reflect: true },
    required: { type: Boolean, reflect: true },
    orientation: { type: String, reflect: true },
    motionPolicy: { type: String, attribute: 'motion-policy', reflect: true },
  };

  static styles: CSSResultGroup = css`
    :host {
      box-sizing: border-box;
      color: inherit;
      font: inherit;
    }

    :host([motion-policy='reduce']) {
      --tp-motion-scale: 0;
      --tp-motion-play-state: paused;
    }

    :host([motion-policy='normal']) {
      --tp-motion-scale: 1;
      --tp-motion-play-state: running;
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
  motionPolicy: MotionPolicy = 'inherit';

  get direction(): Direction {
    const own = this.getAttribute('dir');
    if (own === 'rtl' || own === 'ltr') return own;
    return getComputedStyle(this).direction === 'rtl' ? 'rtl' : 'ltr';
  }

  override disconnectedCallback(): void {
    cancelMotions(this);
    super.disconnectedCallback();
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

export abstract class TpFormElement<TValue = string> extends TpElement {
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    ...TpElement.properties,
    name: { type: String, reflect: true },
    value: { type: String },
  };

  name = '';
  value = '' as TValue;
  protected readonly internals: ElementInternals | null;
  readonly #fieldDescriptionId = createId('tp-field-description');
  readonly #fieldErrorId = createId('tp-field-error');
  #fieldLabel = '';
  #hasFieldLabel = false;
  #fieldDescription = '';
  #fieldError = '';
  #descriptionNode: HTMLSpanElement | null = null;
  #errorNode: HTMLSpanElement | null = null;

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

  protected focusTarget(): HTMLElement | null {
    return (
      this.renderRoot.querySelector<HTMLElement>('[part~="focusable"]:not([disabled])') ??
      this.querySelector<HTMLElement>(
        ':not([disabled])[tabindex], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])',
      )
    );
  }

  protected associationTarget(): HTMLElement | null {
    return this.focusTarget();
  }

  setFieldAssociation(association: { label?: string; description?: string; error?: string }): void {
    if ('label' in association) {
      this.#fieldLabel = association.label ?? '';
      this.#hasFieldLabel = true;
    }
    if ('description' in association) this.#fieldDescription = association.description ?? '';
    if ('error' in association) this.#fieldError = association.error ?? '';
    this.requestUpdate();
  }

  override focus(options?: FocusOptions): void {
    const target = this.focusTarget();
    if (target) target.focus(options);
    else super.focus(options);
  }

  override blur(): void {
    const target = this.focusTarget();
    if (target) target.blur();
    else super.blur();
  }

  activateFromLabel(): void {
    if (!this.disabled) this.focus();
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

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncFieldAssociation();
  }

  #syncFieldAssociation(): void {
    const target = this.associationTarget();
    if (!target) return;
    if (this.#hasFieldLabel) {
      if (this.#fieldLabel) target.setAttribute('aria-label', this.#fieldLabel);
      else target.removeAttribute('aria-label');
    }

    this.#descriptionNode = this.#syncAssociationNode(
      this.#descriptionNode,
      this.#fieldDescriptionId,
      this.#fieldDescription,
    );
    this.#errorNode = this.#syncAssociationNode(
      this.#errorNode,
      this.#fieldErrorId,
      this.#fieldError,
    );

    if (this.#descriptionNode) target.setAttribute('aria-describedby', this.#fieldDescriptionId);
    else target.removeAttribute('aria-describedby');
    if (this.#errorNode) target.setAttribute('aria-errormessage', this.#fieldErrorId);
    else target.removeAttribute('aria-errormessage');
    if (this.#fieldError || this.invalid) target.setAttribute('aria-invalid', 'true');
    else target.removeAttribute('aria-invalid');
  }

  #syncAssociationNode(
    node: HTMLSpanElement | null,
    id: string,
    text: string,
  ): HTMLSpanElement | null {
    if (!text) {
      node?.remove();
      return null;
    }
    const next = node ?? document.createElement('span');
    next.id = id;
    next.className = 'visually-hidden';
    next.textContent = text;
    if (!next.isConnected) this.renderRoot.append(next);
    return next;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }

  formResetCallback(): void {
    this.resetFormValue();
  }

  protected abstract resetFormValue(): void;
}
