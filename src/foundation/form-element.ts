import { formOptsOutOfAutofill } from './autofill.js';
import type { PropertyDeclarations, PropertyValues } from 'lit';
import { createId } from './id.js';
import type { ElementReference } from './part.js';
import { TpElement } from './element.js';

export abstract class TpFormElement<TValue = string> extends TpElement {
  static formAssociated = true;

  static override properties: PropertyDeclarations = {
    ...TpElement.properties,
    name: { type: String, reflect: true },
    value: { type: String, noAccessor: true },
    formOwner: { attribute: 'form', noAccessor: true },
    inputElementReference: { attribute: false },
  };

  name = '';
  #value = '' as TValue;
  get value(): TValue {
    return this.#value;
  }
  set value(value: TValue) {
    const previous = this.#value;
    this.#value = value;
    this.requestUpdate('value', previous);
  }
  #formOwner: string | HTMLFormElement | null = null;
  #writingFormOwner = false;
  get formOwner(): string | HTMLFormElement | null {
    return this.#formOwner;
  }
  set formOwner(value: string | HTMLFormElement | null) {
    if (this.#writingFormOwner) return;
    const previous = this.#formOwner;
    this.#formOwner = value;
    this.#writingFormOwner = true;
    if (typeof value === 'string' && value) this.setAttribute('form', value);
    else if (value && typeof value !== 'string') {
      if (!value.id) value.id = createId('tp-form-owner');
      this.setAttribute('form', value.id);
    } else this.removeAttribute('form');
    this.#writingFormOwner = false;
    this.requestUpdate('formOwner', previous);
  }
  inputElementReference: ElementReference | undefined;
  #formDisabled = false;
  #nativeInvalid = false;
  #lastEffectiveDisabled: boolean | undefined;
  #formValue: FormData | File | string | null = null;
  #formState: FormData | File | string | null | undefined;
  #fieldContext: {
    disabled?: boolean;
    name?: string;
    invalid?: boolean;
    markers?: Record<string, boolean>;
    noAutofill?: boolean;
  } = {};
  #fieldMarkers = new Set<string>();
  #inputReference: ElementReference | undefined;
  #inputTarget: HTMLElement | null = null;
  #associationTarget: HTMLElement | null = null;
  #associationAttributes = new Map<string, { previous: string | null; applied: string | null }>();
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
    if (this.formOwner instanceof this.ownerDocument.defaultView!.HTMLFormElement)
      return this.formOwner;
    if (typeof this.formOwner === 'string') {
      const owner = this.ownerDocument.getElementById(this.formOwner);
      if (owner instanceof this.ownerDocument.defaultView!.HTMLFormElement) return owner;
    }
    return this.internals?.form ?? null;
  }

  get effectiveDisabled(): boolean {
    return this.disabled || this.#formDisabled || !!this.#fieldContext.disabled;
  }
  get effectiveName(): string {
    return this.#fieldContext.name ?? this.name;
  }
  get effectiveInvalid(): boolean {
    // Field owns when computed validity is exposed. Native constraints still
    // participate in form submission while the Field is pristine/unvalidated.
    return this.invalid || (this.#fieldContext.invalid ?? this.#nativeInvalid);
  }
  /** Current Field ownership, available during render before host marker reflection. */
  protected get fieldStateMarkers(): Readonly<Record<string, boolean>> {
    return this.#fieldContext.markers ?? {};
  }
  get inputElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('input,textarea,select') ?? null;
  }
  /** No autofill inherited from the owning Field or an enclosing Form. */
  protected get inheritedNoAutofill(): boolean {
    return !!this.#fieldContext.noAutofill || formOptsOutOfAutofill(this);
  }
  setFieldContext(context: {
    disabled?: boolean;
    name?: string;
    invalid?: boolean;
    markers?: Record<string, boolean>;
    noAutofill?: boolean;
  }): void {
    if (JSON.stringify(this.#fieldContext) === JSON.stringify(context)) return;
    this.#fieldContext = { ...context };
    this.requestUpdate();
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
    return this.inputElement ?? this.focusTarget();
  }

  setFieldAssociation(association: { label?: string; description?: string; error?: string }): void {
    if (
      (!('label' in association) || (association.label ?? '') === this.#fieldLabel) &&
      (!('description' in association) ||
        (association.description ?? '') === this.#fieldDescription) &&
      (!('error' in association) || (association.error ?? '') === this.#fieldError)
    )
      return;
    if ('label' in association) {
      this.#fieldLabel = association.label ?? '';
      this.#hasFieldLabel = !!association.label;
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
    if (!this.effectiveDisabled) this.focus();
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
    this.#formValue = value;
    this.#formState = state;
    this.#writeFormValue();
  }
  #writeFormValue(): void {
    const value = this.#formValue;
    const state = this.#formState;
    if (this.effectiveName !== this.name && value !== null && !(value instanceof FormData)) {
      const data = new FormData();
      data.append(this.effectiveName, value);
      this.internals?.setFormValue(this.effectiveDisabled ? null : data, state);
    } else this.internals?.setFormValue(this.effectiveDisabled ? null : value, state);
  }

  protected setValidity(flags: ValidityStateFlags = {}, message = '', anchor?: HTMLElement): void {
    this.internals?.setValidity(flags, message, anchor);
    const invalid = Object.values(flags).some(Boolean);
    if (this.#nativeInvalid !== invalid) {
      this.#nativeInvalid = invalid;
      this.requestUpdate();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    if (this.#lastEffectiveDisabled !== this.effectiveDisabled) {
      changed.set('disabled', this.#lastEffectiveDisabled ?? this.disabled);
      this.#lastEffectiveDisabled = this.effectiveDisabled;
    }
    super.updated(changed);
    this.#writeFormValue();
    const markers = this.#fieldContext.markers ?? {};
    for (const marker of this.#fieldMarkers)
      if (!(marker in markers)) this.removeAttribute(`data-${marker}`);
    for (const [marker, enabled] of Object.entries(markers))
      if (/^[a-z][a-z0-9-]*$/.test(marker)) this.toggleAttribute(`data-${marker}`, enabled);
    this.#fieldMarkers = new Set(Object.keys(markers));
    // Field context cannot clear independently authored/native control state.
    this.toggleAttribute('data-disabled', this.effectiveDisabled);
    this.toggleAttribute('data-readonly', this.readOnly);
    this.toggleAttribute('data-invalid', this.effectiveInvalid);
    if (this.effectiveInvalid) this.removeAttribute('data-valid');
    if (this.formOwner instanceof this.ownerDocument.defaultView!.HTMLFormElement) {
      if (!this.formOwner.id) this.formOwner.id = createId('tp-form-owner');
      if (this.getAttribute('form') !== this.formOwner.id)
        this.setAttribute('form', this.formOwner.id);
    }
    this.#syncInputReference();
    this.#syncFieldAssociation();
  }

  #syncInputReference(): void {
    const target = this.inputElement;
    if (target === this.#inputTarget && this.inputElementReference === this.#inputReference) return;
    this.#writeInputReference(null);
    this.#inputTarget = target;
    this.#inputReference = this.inputElementReference;
    this.#writeInputReference(target);
  }
  #writeInputReference(element: HTMLElement | null): void {
    if (typeof this.#inputReference === 'function') this.#inputReference(element);
    else if (this.#inputReference) this.#inputReference.current = element;
  }
  #restoreAssociation(): void {
    const target = this.#associationTarget;
    if (target)
      for (const [name, { previous, applied }] of this.#associationAttributes) {
        if (target.getAttribute(name) !== applied) continue;
        if (previous === null) target.removeAttribute(name);
        else target.setAttribute(name, previous);
      }
    this.#associationAttributes.clear();
  }
  #associationAttribute(name: string, value: string | null): void {
    const target = this.#associationTarget!;
    this.#associationAttributes.set(name, { previous: target.getAttribute(name), applied: value });
    if (value === null) target.removeAttribute(name);
    else target.setAttribute(name, value);
  }

  #syncFieldAssociation(): void {
    this.#restoreAssociation();
    const target = this.associationTarget();
    this.#associationTarget = target;
    if (!target) return;
    if (this.#hasFieldLabel) {
      this.#associationAttribute('aria-label', this.#fieldLabel);
    } else if (this.hasAttribute('aria-label')) {
      this.#associationAttribute('aria-label', this.getAttribute('aria-label'));
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

    if (this.#descriptionNode || this.#errorNode)
      this.#associationAttribute(
        'aria-describedby',
        [
          target.getAttribute('aria-describedby'),
          this.#descriptionNode ? this.#fieldDescriptionId : null,
          this.#errorNode ? this.#fieldErrorId : null,
        ]
          .filter(Boolean)
          .join(' '),
      );
    if (this.#errorNode)
      this.#associationAttribute(
        'aria-errormessage',
        [target.getAttribute('aria-errormessage'), this.#fieldErrorId].filter(Boolean).join(' '),
      );
    if (this.effectiveInvalid) this.#associationAttribute('aria-invalid', 'true');
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
    const next = node ?? this.ownerDocument.createElement('span');
    next.id = id;
    next.className = 'visually-hidden';
    next.hidden = false;
    next.textContent = text;
    // IDREFs resolve within one tree: keep the node beside the association target. A light-DOM
    // native editor gets a light-DOM node, hidden inline since shadow styles do not reach it.
    const target = this.#associationTarget;
    const container = target && target.getRootNode() !== this.renderRoot ? this : this.renderRoot;
    if (container === this)
      next.style.cssText =
        'position:absolute;inline-size:1px;block-size:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0';
    if (next.parentNode !== container) container.append(next);
    return next;
  }

  formDisabledCallback(disabled: boolean): void {
    this.#formDisabled = disabled;
    this.requestUpdate();
  }

  formStateRestoreCallback(
    _state: string | File | FormData | null,
    _mode: 'restore' | 'autocomplete',
  ): void {
    void _state;
    void _mode;
  }
  override disconnectedCallback(): void {
    this.#writeInputReference(null);
    this.#inputReference = undefined;
    this.#inputTarget = null;
    this.#restoreAssociation();
    super.disconnectedCallback();
  }

  formResetCallback(): void {
    this.resetFormValue();
  }

  protected abstract resetFormValue(): void;
}
