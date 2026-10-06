import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { ValidationRun } from '../../foundation/validation.js';
import type { TpField } from '../field/index.js';
import { fieldSubmission } from '../field/field.js';
import { fieldValues } from '../field/field-state.js';
import { isAvailable } from '../../foundation/focus.js';
import { formPresentation } from '../../presentation/families/form.js';

const nativeAttributes = [
  'action',
  'method',
  'enctype',
  'target',
  'autocomplete',
  'accept-charset',
  'rel',
  'name',
  'aria-label',
  'aria-labelledby',
  'aria-describedby',
] as const;
const configurationAttributes = [
  'validation-mode',
  'validation-timing',
  'native-validation',
  'submission-policy',
  'novalidate',
  ...nativeAttributes,
];

export class TpForm extends TpElement {
  static tagName = 'tp-form';
  static override presentation = formPresentation;
  static override properties = {
    ...TpElement.properties,
    onFormSubmit: { attribute: false },
    errors: { attribute: false, noAccessor: true },
    noAutofill: { type: Boolean, attribute: 'no-autofill', reflect: true },
  };
  static override get observedAttributes(): string[] {
    return [...new Set([...super.observedAttributes, ...configurationAttributes])];
  }
  override attributeChangedCallback(
    name: string,
    previous: string | null,
    value: string | null,
  ): void {
    super.attributeChangedCallback(name, previous, value);
    if (previous !== value && configurationAttributes.includes(name)) this.#syncConfiguration();
  }
  /** Opts every contained text-entry control out of host and extension autofill. */
  noAutofill = false;
  #errors: Record<string, string | readonly string[]> = {};
  get errors(): Record<string, string | readonly string[]> {
    return this.#errors;
  }
  set errors(value: Record<string, string | readonly string[]>) {
    this.#errors = value ?? {};
    for (const field of this.querySelectorAll<TpField>('tp-field'))
      if (field.closest('tp-form') === this && !field.fieldSet) field.requestUpdate();
    this.#updateActions();
  }
  onFormSubmit:
    | ((
        values: Record<string, unknown>,
        details: {
          sourceEvent: SubmitEvent;
          form: HTMLFormElement;
          data: FormData;
          submitter: HTMLElement | null;
          validationRun: ValidationRun | null;
        },
      ) => void)
    | undefined;
  readonly actions = { validate: (name?: string) => this.validate(name) };
  get values(): Record<string, unknown> {
    return fieldValues(
      [...this.querySelectorAll<TpField>('tp-field')]
        .filter((field) => field.closest('tp-form') === this && !field.fieldSet)
        .map((field) => ({ name: field.effectiveName, value: field.value })),
    );
  }
  get validationMode(): 'on-submit' | 'on-blur' | 'on-change' {
    const value = this.getAttribute('validation-mode');
    return value === 'on-blur' || value === 'on-change'
      ? value
      : value === 'on-submit'
        ? 'on-submit'
        : this.validationTiming;
  }
  set validationMode(value: 'on-submit' | 'on-blur' | 'on-change') {
    this.setAttribute('validation-mode', value);
    for (const field of this.querySelectorAll<TpField>('tp-field')) field.requestUpdate();
  }
  #form: HTMLFormElement | null = null;
  #observer: MutationObserver | null = null;
  #submitter: HTMLElement | null = null;
  #invalidFocusScheduled = false;
  #validationGeneration = 0;
  #validationRun: ValidationRun | null = null;
  #submissionValidation = false;
  #prevalidated = false;
  #policyActions = new Set<HTMLElement>();
  get validationTiming(): 'on-submit' | 'on-blur' | 'on-change' {
    const value = this.getAttribute('validation-timing');
    return value === 'on-blur' || value === 'on-change' ? value : 'on-submit';
  }
  set validationTiming(value: 'on-submit' | 'on-blur' | 'on-change') {
    this.setAttribute('validation-timing', value);
  }
  get nativeValidation(): 'enabled' | 'suppressed' {
    return this.getAttribute('native-validation') === 'suppressed' ? 'suppressed' : 'enabled';
  }
  set nativeValidation(value: 'enabled' | 'suppressed') {
    this.setAttribute('native-validation', value);
    if (this.#form) this.#form.noValidate = value === 'suppressed' || this.novalidate;
  }
  get submissionPolicy(): 'always-enabled' | 'disable-while-invalid' | 'disable-while-pending' {
    const value = this.getAttribute('submission-policy');
    return value === 'disable-while-invalid' || value === 'disable-while-pending'
      ? value
      : 'always-enabled';
  }
  set submissionPolicy(
    value: 'always-enabled' | 'disable-while-invalid' | 'disable-while-pending',
  ) {
    this.setAttribute('submission-policy', value);
    this.#updateActions();
  }
  get novalidate(): boolean {
    return this.hasAttribute('novalidate');
  }
  set novalidate(value: boolean) {
    this.toggleAttribute('novalidate', value);
  }
  get form(): HTMLFormElement | null {
    return this.#form;
  }
  #syncConfiguration(): void {
    if (!this.#form) return;
    this.#form.noValidate = this.novalidate || this.nativeValidation === 'suppressed';
    for (const name of nativeAttributes) {
      const value = this.getAttribute(name);
      if (value === null) this.#form.removeAttribute(name);
      else this.#form.setAttribute(name, value);
    }
    for (const field of this.#fields()) field.requestUpdate();
    this.#updateActions();
  }
  #fields(): TpField[] {
    return [...this.querySelectorAll<TpField>('tp-field')].filter(
      (field) => field.closest('tp-form') === this && !field.fieldSet,
    );
  }
  protected override createRenderRoot(): HTMLElement {
    return this;
  }
  protected override shouldUpdate(): boolean {
    return false;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // Contained controls read the reflected attribute; repaint them when it changes.
    if (changed.has('noAutofill') && (this.noAutofill || changed.get('noAutofill')))
      for (const element of this.querySelectorAll<HTMLElement & { requestUpdate?: () => void }>(
        '*',
      ))
        element.requestUpdate?.();
  }

  override connectedCallback(): void {
    const existing = [...this.childNodes];
    super.connectedCallback();
    if (!this.#form) {
      const form = this.ownerDocument.createElement('form');
      form.setAttribute('part', 'form');
      form.noValidate = this.novalidate || this.nativeValidation === 'suppressed';
      for (const node of existing) form.append(node);
      this.append(form);
      this.#form = form;
      form.addEventListener('submit', this.#submit);
      form.addEventListener('reset', this.#reset);
      form.addEventListener('invalid', this.#invalid, true);
      form.addEventListener('input', this.#updateActions);
      form.addEventListener('change', this.#updateActions);
      form.addEventListener('tp-validation', this.#updateActions);
    }
    const form = this.#form;
    for (const node of [...this.childNodes])
      if (node !== form && !(node instanceof HTMLStyleElement)) form.append(node);
    this.#observer = new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node !== form && node.parentNode === this && !(node instanceof HTMLStyleElement))
            form.append(node);
      this.#updateActions();
      if (records.some((record) => record.type === 'childList' || record.attributeName === 'slot'))
        this.presentationController.refresh();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-pending', 'data-invalid', 'disabled', 'slot'],
    });
    this.#syncConfiguration();
    queueMicrotask(this.#updateActions);
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#validationRun?.cancel();
    for (const action of this.#policyActions) this.#releaseAction(action);
    this.#policyActions.clear();
    super.disconnectedCallback();
  }
  requestSubmit(submitter?: HTMLElement): void {
    if (
      !this.#form ||
      !this.isConnected ||
      this.disabled ||
      submitter?.matches(':disabled,[disabled]')
    )
      return;
    if (!this.#acceptSubmission(new Event('submit', { cancelable: true }))) return;
    this.#prevalidated = true;
    queueMicrotask(() => {
      this.#prevalidated = false;
    });
    if (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement) {
      this.#form.requestSubmit(submitter);
      return;
    }
    if (!submitter) {
      this.#form.requestSubmit();
      return;
    }
    const proxy = this.ownerDocument.createElement('button');
    proxy.type = 'submit';
    proxy.hidden = true;
    const name = submitter.getAttribute('name');
    if (name) proxy.name = name;
    proxy.value = submitter.getAttribute('value') ?? '';
    this.#submitter = submitter;
    this.#form.append(proxy);
    this.#form.requestSubmit(proxy);
    proxy.remove();
    this.#submitter = null;
  }
  reset(): void {
    this.#form?.reset();
  }
  checkValidity(): boolean {
    return this.#form?.checkValidity() ?? true;
  }
  reportValidity(): boolean {
    return this.#form?.reportValidity() ?? true;
  }
  validate(name?: string): ValidationRun {
    this.#validationRun?.cancel();
    const run = new ValidationRun(++this.#validationGeneration);
    this.#validationRun = run;
    // Let the initiating submit collect its submitter before a pending policy
    // disables that action. Field validation and host submission stay synchronous.
    queueMicrotask(this.#updateActions);
    const fields = [...this.querySelectorAll<TpField>('tp-field')].filter(
      (field) =>
        field.closest('tp-form') === this &&
        !field.fieldSet &&
        (!name || field.effectiveName === name),
    );
    void Promise.all(
      fields.map(
        (field) =>
          (this.#submissionValidation ? field[fieldSubmission]() : field.validate()).completion,
      ),
    ).then((snapshots) => {
      if (run.signal.aborted) return;
      if (snapshots.some((snapshot) => snapshot.status === 'cancelled')) {
        run.cancel();
        this.#updateActions();
        return;
      }
      const fieldResults = snapshots.flatMap((snapshot) => snapshot.fieldResults);
      const status = fieldResults.some((result) => result.status === 'failed')
        ? 'failed'
        : fieldResults.some((result) => !result.valid)
          ? 'invalid'
          : 'valid';
      run.settle(status, fieldResults);
      this.#updateActions();
    });
    return run;
  }
  #submit = (event: SubmitEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const accepted = this.#prevalidated || this.#acceptSubmission(event);
    this.#prevalidated = false;
    if (!accepted) {
      event.preventDefault();
      return;
    }
    const data = event.submitter
      ? new FormData(form, event.submitter as HTMLButtonElement | HTMLInputElement)
      : new FormData(form);
    const values = this.values;
    if (
      !this.emit(
        'tp-submit',
        {
          form,
          data,
          submitter: this.#submitter ?? event.submitter,
          validationRun: this.#validationRun,
          values,
          reason: 'submit',
          sourceEvent: event,
        },
        { cancelable: true },
      )
    )
      event.preventDefault();
    if (this.onFormSubmit && !event.defaultPrevented) {
      event.preventDefault();
      this.onFormSubmit(values, {
        sourceEvent: event,
        form,
        data,
        submitter: this.#submitter ?? event.submitter,
        validationRun: this.#validationRun,
      });
    }
  };
  #acceptSubmission(sourceEvent: Event): boolean {
    const form = this.#form;
    if (!form) return true;
    this.#submissionValidation = true;
    let validationRun: ValidationRun;
    try {
      validationRun = this.validate();
    } finally {
      this.#submissionValidation = false;
    }
    const fields = [...this.querySelectorAll<TpField>('tp-field')].filter(
      (field) => field.closest('tp-form') === this && !field.fieldSet,
    );
    const invalid = fields.filter(
      (field) => !field.effectiveDisabled && field.validityState.validity.valid === false,
    );
    const nativeValid = form.noValidate || form.checkValidity();
    if (!invalid.length && nativeValid) return true;
    if (!sourceEvent.defaultPrevented)
      invalid.find((field) => field.control && isAvailable(field.control))?.control?.focus();
    this.emit('tp-invalid', { form, validationRun, reason: 'submit', sourceEvent });
    return false;
  }
  #invalid = (event: Event): void => {
    const control = event.target;
    if (!(control instanceof HTMLElement) || !isAvailable(control) || event.defaultPrevented)
      return;
    if (!this.#invalidFocusScheduled) {
      this.#invalidFocusScheduled = true;
      control.focus();
      queueMicrotask(() => {
        this.#invalidFocusScheduled = false;
      });
    }
    this.emit('tp-invalid', { form: this.#form, control, sourceEvent: event });
    this.#updateActions();
  };
  #reset = (event: Event): void => {
    const form = event.currentTarget as HTMLFormElement;
    queueMicrotask(() => {
      if (event.defaultPrevented || !this.isConnected) return;
      this.#validationRun?.cancel();
      this.#updateActions();
      this.emit('tp-reset', { form, values: this.values, sourceEvent: event });
    });
  };
  #updateActions = (): void => {
    if (!this.#form) return;
    const fields = this.#fields();
    const pending =
      this.#validationRun?.status === 'pending' ||
      fields.some((field) => field.validityState.pending);
    const invalid =
      this.#form.matches(':invalid') ||
      fields.some((field) => field.validityState.validity.valid === false);
    const disable =
      this.disabled ||
      (this.submissionPolicy === 'disable-while-invalid' && invalid) ||
      (this.submissionPolicy === 'disable-while-pending' && pending);
    const actions = new Set(
      this.#form.querySelectorAll<HTMLElement>(
        'tp-button[type="submit"], button[type="submit"], input[type="submit"]',
      ),
    );
    for (const action of this.#policyActions)
      if (!actions.has(action)) {
        this.#releaseAction(action);
        this.#policyActions.delete(action);
      }
    for (const action of actions) {
      if (disable) {
        if (!action.hasAttribute('disabled')) {
          action.dataset.tpFormPolicyDisabled = '';
          this.#policyActions.add(action);
        }
        action.toggleAttribute('disabled', true);
      } else if ('tpFormPolicyDisabled' in action.dataset) {
        this.#releaseAction(action);
        this.#policyActions.delete(action);
      }
    }
  };
  #releaseAction(action: HTMLElement): void {
    if ('tpFormPolicyDisabled' in action.dataset) {
      action.removeAttribute('disabled');
      delete action.dataset.tpFormPolicyDisabled;
    }
  }
}
