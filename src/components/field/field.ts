import { css, html, nothing, unsafeCSS } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { visuallyHiddenRule } from '../../foundation/visually-hidden.js';
import { dispatchTpEvent } from '../../foundation/events.js';
import { ValidationController, ValidationRun } from '../../foundation/validation.js';
import { PresenceController } from '../../foundation/presence.js';
import { renderPart } from '../../foundation/part.js';
import { activateLabeledControl } from '../shared/events.js';
import { nativeValidityFlags } from './text-control.js';
import {
  fieldErrors as deduplicate,
  sameFieldValue as equivalent,
  fieldValues,
  errorMatches,
} from './field-state.js';
import type {
  FieldControl,
  FieldError,
  FieldValidationMode,
  FieldValidator,
  FieldValidity,
} from './types.js';
import { fieldPresentation } from '../../presentation/families/field.js';
import { TpSeparator } from '../separator/separator.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

const markers = [
  'disabled',
  'invalid',
  'valid',
  'dirty',
  'touched',
  'filled',
  'focused',
  'pending',
] as const;
const controls =
  'tp-input,tp-text-area,tp-native-select,tp-number-field,tp-one-time-code-field,tp-slider,tp-checkbox,tp-radio-group,tp-switch,tp-select,tp-autocomplete,tp-toggle-group,tp-calendar,tp-file-upload,tp-color-input,input,textarea,select,[data-field-control]';

export const fieldSubmission = Symbol('Field submission');
/**
 * Owns everything around one form value: its visible name, help text, errors and the dirty, touched
 * and invalid state. It registers the first compatible control inside it, names it, connects its
 * description and error for assistive technology and validates it on the chosen trigger.
 *
 * @slot - The control, directly or inside a layout wrapper.
 * @slot control - The control, when it sits beside other default content.
 * @slot item - A wrapper around one member of a grouped choice; its disabled state scopes that
 * member.
 * @slot label - Rich label content; takes precedence over `label`.
 * @slot title - Rich name of a grouped choice; takes precedence over `title`.
 * @slot description - Rich help text; takes precedence over `description`.
 * @slot error - Rich error content, shown while the Field is invalid; takes precedence over the
 * error messages.
 * @slot legend - Rich caption of a group of Fields; takes precedence over `legend`.
 * @slot group - Peer Fields captioned by the legend, usually inside one layout wrapper.
 * @slot separator - A caption centered over a dividing line below the Field.
 * @fires tp-validation - After a validation run settles; `detail.run` is the run and `detail.state`
 * the Field's validity state.
 * @fires tp-presence-complete - After the error finishes appearing or disappearing;
 * `detail.present` says which.
 */
export class TpField extends TpElement {
  static tagName = 'tp-field';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSeparator];
  }
  static override presentation = fieldPresentation;
  static override properties = {
    ...TpElement.properties,
    name: { type: String },
    label: { type: String },
    description: { type: String },
    error: { type: String },
    errors: { attribute: false },
    legend: { type: String },
    legendScale: { type: String, attribute: 'legend-scale', reflect: true },
    nativeLabel: { type: Boolean, attribute: 'native-label' },
    noAutofill: { type: Boolean, attribute: 'no-autofill', reflect: true },
    errorMatch: { attribute: false },
    validator: { attribute: false },
    validationMode: { type: String, attribute: 'validation-mode' },
    validationDebounce: { type: Number, attribute: 'validation-debounce' },
    dirty: { type: Boolean },
    touched: { type: Boolean },
    validityContent: { attribute: false },
    title: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      :host([orientation='responsive']) {
        container-type: inline-size;
        inline-size: 100%;
      }

      fieldset {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
        margin: 0;
      }

      .field {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
      }

      .content {
        display: flex;
        flex-direction: column;
        min-inline-size: 0;
        flex: 1;
      }

      .control {
        min-inline-size: 0;
      }

      [part='field-separator'] {
        position: relative;
      }

      /* The control shows this label inside its own anatomy; it still names the control. */
      ${unsafeCSS(visuallyHiddenRule('[part~="field-label"][data-control-label]', { important: true }))}

      .separator-line {
        position: absolute;
        inset-inline: 0;
        top: 50%;
      }

      .separator-content {
        position: relative;
        display: block;
        inline-size: fit-content;
        margin-inline: auto;
      }

      :host([orientation='horizontal']) .field {
        flex-direction: row;
        align-items: center;
      }

      :host([orientation='horizontal']) .label {
        flex: none;
      }

      :host([orientation='horizontal']) .choice {
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
      }

      :host([orientation='horizontal']) .choice .content {
        display: contents;
      }

      :host([orientation='horizontal']) .choice .label,
      :host([orientation='horizontal']) .choice .content > :not(.control) {
        grid-column: 1;
      }

      :host([orientation='horizontal']) .choice .control {
        grid-column: 2;
        grid-row: 1;
        display: flex;
        align-items: center;

        /* Reserve the binary control's expanded pointer target inside the row. */
        padding-inline: var(--tp-space-3);
      }

      @container (min-width:32rem) {
        :host([orientation='responsive']) .field {
          flex-direction: row;
          align-items: center;
        }

        :host([orientation='responsive']) .label {
          flex: none;
        }

        :host([orientation='responsive']) .choice {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
        }

        :host([orientation='responsive']) .choice .content {
          display: contents;
        }

        :host([orientation='responsive']) .choice .label,
        :host([orientation='responsive']) .choice .content > :not(.control) {
          grid-column: 1;
        }

        :host([orientation='responsive']) .choice .control {
          grid-column: 2;
          grid-row: 1;
          display: flex;
          align-items: center;
          padding-inline: var(--tp-space-3);
        }
      }

      ::slotted(*) {
        max-inline-size: 100%;
      }

      ::slotted([hidden]) {
        display: none !important;
      }
    `,
  ];
  /**
   * The form name of the value; takes precedence over the control's own `name` without overwriting
   * it.
   */
  name = '';
  /** The visible name of the control, rendered as a Label that focuses it. */
  label = '';
  /** Help text below the control, announced with it. */
  description = '';
  /** An error message from your own checks or the server; shown while the Field is invalid. */
  error = '';
  /**
   * Several error messages at once, as strings or `{ message }` records; duplicates are dropped and
   * the rest render as a list.
   */
  errors: FieldError[] = [];
  /**
   * The caption of a group of Fields in the `group` slot; the Field then renders as a native
   * fieldset.
   */
  legend = '';
  /** Sizes the legend as a section heading or as a field label. */
  legendScale: 'section' | 'field' = 'section';
  override orientation: 'horizontal' | 'vertical' | 'responsive' = 'vertical';
  /**
   * Whether a click on the label activates the control; turn it off for a control that opens a
   * popup, so one click does not open it twice.
   */
  nativeLabel = true;
  /** Opts the Field's text-entry control out of host and extension autofill. */
  noAutofill = false;
  /**
   * Which failures show the error: `false` hides it, `true` always shows authored messages, and a
   * validity key such as `valueMissing` shows it only for that constraint.
   */
  errorMatch: boolean | keyof ValidityState | undefined;
  /**
   * Your own check: receives the value and every named value in the same form, and returns an error
   * message, a list of them, nothing, or a promise of one of these.
   */
  validator: FieldValidator | undefined;
  /**
   * When the Field validates: on submit, when the control loses focus, or on every change. Without
   * it the Field follows its Form, else validates on submit.
   */
  validationMode: FieldValidationMode | undefined;
  /** Milliseconds to wait after a change before validating in `on-change` mode. */
  validationDebounce = 0;
  /**
   * Overrides whether the value counts as changed from its initial value; leave unset to let the
   * Field track it.
   */
  dirty: boolean | undefined;
  /** Overrides whether the control counts as visited; leave unset to let the Field track it. */
  touched: boolean | undefined;
  /**
   * Renders extra content below the control from the current validity state, such as a strength
   * meter.
   */
  validityContent: ((state: FieldValidity) => unknown) | undefined;
  /**
   * The name of a grouped choice, such as a set of Checkboxes or a Radio group, shown above its
   * options.
   */
  override title = '';
  /**
   * The Field's actions as plain functions, for passing `validate` to code that holds no reference
   * to the element.
   */
  readonly actions = { validate: () => this.validate() };
  #control: FieldControl | null = null;
  #lastValue: unknown;
  #initial: unknown;
  #initialCaptured = false;
  #initialControl: FieldControl | null = null;
  #initialRebased = false;
  #focused = false;
  #touched = false;
  #dirty = false;
  #submitted = false;
  #customErrors: readonly string[] = [];
  #computedErrors: readonly string[] = [];
  #nativeFlags: ValidityStateFlags = {};
  #valid: boolean | null = null;
  #pending = false;
  #timer: number | undefined;
  #run: ValidationRun | null = null;
  #generation = 0;
  #observer: MutationObserver | null = null;
  #queued = false;
  #validation: ValidationController<unknown> | null = null;
  #owned = new Map<HTMLElement, Map<string, { before: string | null; applied: string | null }>>();
  #parts = new Map<HTMLElement, () => void>();
  #errorsPresence = new Map<HTMLElement, PresenceController>();
  #lastErrorContent: unknown;
  readonly #presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('.error'),
    onStateChange: () => this.requestUpdate(),
    onComplete: (present) => this.emit('tp-presence-complete', { present }),
  });

  /** Whether the Field is disabled, by itself or by the grouping Field around it. */
  get effectiveDisabled(): boolean {
    const parent = this.parentElement?.closest('tp-field') as TpField | null;
    const group = this.closest('[slot=group]');
    const inherited = Boolean(
      parent &&
      group &&
      parent.contains(group) &&
      (group === this || group.closest('tp-field') === parent) &&
      parent.effectiveDisabled,
    );
    return this.disabled || inherited;
  }
  /** Whether the Field captions a group of Fields rather than owning a control. */
  get fieldSet(): boolean {
    return !this.#control && this.#ownSlots('group').length > 0;
  }
  /** The control the Field registered, or `null` while it has none. */
  get control(): FieldControl | null {
    return this.#control;
  }
  /**
   * The current value of the registered control: its text, checked or pressed state, or selection.
   */
  get value(): unknown {
    if (this.#control && 'fieldValue' in this.#control) return this.#control.fieldValue;
    if (this.#control && ['tp-checkbox', 'tp-switch'].includes(this.#control.localName))
      return this.#control.checked;
    if (this.#control?.localName === 'tp-toggle') return this.#control.pressed;
    return this.#control?.value;
  }
  /** The name the value submits under: the Field's `name`, else the control's. */
  get effectiveName(): string {
    return this.name || this.#control?.name || '';
  }
  /** The newest validation run, with its status and completion promise. */
  get validationRun(): ValidationRun | null {
    return this.#run;
  }
  /**
   * A snapshot of the Field's state: value, initial value, errors, native validity flags, and
   * whether it is dirty, touched, filled, focused or pending.
   */
  get validityState(): FieldValidity {
    const errors = deduplicate([
      ...this.#serverErrors,
      this.error,
      ...this.errors,
      ...this.#customErrors,
      ...this.#computedErrors,
    ]);
    const invalid = this.invalid || errors.length > 0 || this.#valid === false;
    return Object.freeze({
      value: this.value,
      initialValue: this.#initial,
      errors: Object.freeze(errors),
      error: errors[0] ?? '',
      validity: Object.freeze({
        ...this.#nativeFlags,
        customError: this.invalid || errors.length > 0 || Boolean(this.#nativeFlags.customError),
        valid: invalid ? false : this.effectiveDisabled ? null : this.#valid,
      }),
      dirty: this.dirty ?? this.#dirty,
      touched: this.touched ?? this.#touched,
      filled: this.#filled(),
      focused: this.#focused,
      pending: this.#pending,
    });
  }
  get #serverErrors(): readonly string[] {
    const owner = this.closest('tp-form') as
      (HTMLElement & { errors?: Record<string, string | readonly string[]> }) | null;
    const errors = owner?.errors?.[this.effectiveName];
    return typeof errors === 'string' ? [errors] : (errors ?? []);
  }
  /** The validation trigger in effect, after following the Form when `validationMode` is unset. */
  get mode(): FieldValidationMode {
    const form = this.closest('tp-form') as
      | (HTMLElement & {
          validationTiming?: FieldValidationMode;
          validationMode?: FieldValidationMode;
        })
      | null;
    return this.validationMode ?? form?.validationMode ?? form?.validationTiming ?? 'on-submit';
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('focusin', this.#focusIn);
    this.addEventListener('focusout', this.#focusOut);
    this.addEventListener('input', this.#changed);
    this.addEventListener('change', this.#changed);
    this.addEventListener('tp-field-value', this.#changed);
    this.addEventListener('tp-field-validity', this.#changed);
    this.addEventListener('tp-value-change', this.#proposal);
    this.addEventListener('keydown', this.#keyDown);
    this.#observer = new (this.ownerDocument.defaultView ?? window).MutationObserver(this.#queue);
    this.#observe();
    this.#queue();
    this.ownerDocument.addEventListener('reset', this.#reset, true);
    this.ownerDocument.addEventListener('submit', this.#submit, true);
  }
  override disconnectedCallback(): void {
    this.#cancel();
    this.#observer?.disconnect();
    this.#observer = null;
    this.removeEventListener('focusin', this.#focusIn);
    this.removeEventListener('focusout', this.#focusOut);
    this.removeEventListener('input', this.#changed);
    this.removeEventListener('change', this.#changed);
    this.removeEventListener('tp-field-value', this.#changed);
    this.removeEventListener('tp-field-validity', this.#changed);
    this.removeEventListener('tp-value-change', this.#proposal);
    this.removeEventListener('keydown', this.#keyDown);
    this.ownerDocument.removeEventListener('reset', this.#reset, true);
    this.ownerDocument.removeEventListener('submit', this.#submit, true);
    this.#release();
    for (const undo of this.#parts.values()) undo();
    this.#parts.clear();
    for (const [element, attributes] of this.#owned)
      for (const [name, record] of attributes)
        if (element.getAttribute(name) === record.applied) {
          if (record.before === null) element.removeAttribute(name);
          else element.setAttribute(name, record.before);
        }
    this.#owned.clear();
    for (const presence of this.#errorsPresence.values()) {
      presence.hostDisconnected();
      this.removeController(presence);
    }
    this.#errorsPresence.clear();
    super.disconnectedCallback();
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.isConnected) this.#associate();
  }
  protected override render() {
    const state = this.validityState;
    this.#presence.setPresent(this.#errorVisible(state));
    const errorContent = html`<slot name="error" @slotchange=${this.#queue}
      >${
        state.errors.length > 1
          ? html`<ul>
              ${state.errors.map((message) => html`<li>${message}</li>`)}
            </ul>`
          : state.error
      }</slot
    >`;
    if (this.#errorVisible(state)) this.#lastErrorContent = errorContent;
    const content = html` ${this.#has('field-title', this.title, 'title') ? this.#part('field-title', 'div', html`<slot name="title">${this.title}</slot>`) : nothing}
      <div class="control">
        <slot @slotchange=${this.#queue}></slot
        ><slot name="control" @slotchange=${this.#queue}></slot
        ><slot name="item" @slotchange=${this.#queue}></slot>
      </div>
      ${this.#has('field-description', this.description, 'description') ? this.#part('field-description', 'div', html`<slot name="description" @slotchange=${this.#queue}>${this.description}</slot>`) : nothing}
      ${this.#presence.mounted ? this.#part('field-error', 'div', this.#lastErrorContent ?? errorContent, { class: 'error', role: 'alert', 'data-starting-style': this.#presence.state === 'starting', 'data-ending-style': this.#presence.state === 'ending' }) : nothing}
      ${this.validityContent?.(state) ?? nothing}`;
    const field = html` ${this.#has('field-label', this.label, 'label') ? this.#part('field-label', 'tp-label', html`<slot name="label" @slotchange=${this.#queue}>${this.label}</slot>`, { class: 'label', 'data-control-label': !!this.#control?.rendersFieldLabel, '@click': this.#activate }) : nothing}
    ${this.#part('field-control-region', 'div', content, { class: 'content' })}`;
    const group = html`<slot name="group"></slot>${this.#part('field-field', 'div', field, {
        class: this.#control?.matches(
          'tp-switch,tp-checkbox,input[type="checkbox"],input[type="radio"],[role="switch"],[role="checkbox"],[role="radio"]',
        )
          ? 'field choice'
          : 'field',
      })}`;
    return this.#part(
      'field',
      'fieldset',
      html` ${this.#has('field-legend', this.legend, 'legend') ? this.#part('field-legend', 'legend', html`<slot name="legend">${this.legend}</slot>`, { 'data-scale': this.legendScale }) : nothing}
      ${this.#part('field-field-group', 'div', group)}
      ${this.#ownSlots('separator').length || this.partContracts['field-separator'] ? this.#separator() : nothing}`,
    );
  }
  #part(
    name: string,
    tag: string,
    content: unknown,
    properties: Record<string, unknown> = {},
  ): unknown {
    return this.renderPart(name, this.#partState(), {
      tag,
      content,
      properties: {
        ...Object.fromEntries(markers.map((marker) => [`data-${marker}`, this.#marker(marker)])),
        ...properties,
      },
    });
  }
  #partState() {
    const state = this.validityState;
    return {
      ...state,
      disabled: this.effectiveDisabled,
      invalid: state.validity.valid === false,
      valid: state.validity.valid === true,
    };
  }
  #separator(): unknown {
    const state = this.#partState();
    const contract = this.partContracts['field-separator'] ?? {};
    const hasCustomContent = 'content' in contract;
    const caption = hasCustomContent
      ? typeof contract.content === 'function'
        ? contract.content(state)
        : contract.content
      : html`<slot name="separator"></slot>`;
    const hasCaption = hasCustomContent
      ? caption !== undefined && caption !== null && caption !== nothing && caption !== ''
      : this.#ownSlots('separator').length > 0;
    // The public content channel supplies the caption; the sourced Separator line remains anatomy.
    const content = html`<tp-separator class="separator-line"></tp-separator>
      ${hasCaption ? html`<span class="separator-content">${caption}</span>` : nothing}`;
    return renderPart(
      'field-separator',
      state,
      { ...contract, content },
      {
        tag: 'div',
        properties: {
          'data-content': hasCaption,
          ...Object.fromEntries(markers.map((marker) => [`data-${marker}`, this.#marker(marker)])),
        },
      },
    );
  }
  #has(part: string, fallback: string, slot: string): boolean {
    return Boolean(
      fallback ||
      this.#ownSlots(slot).length ||
      this.partContracts[part]?.content ||
      this.partContracts[part]?.renderDelegate,
    );
  }
  #ownSlots(slot: string): HTMLElement[] {
    return [...this.querySelectorAll<HTMLElement>(`[slot="${slot}"]`)].filter(
      (element) => element.parentElement?.closest('tp-field') === this,
    );
  }
  #queue = (): void => {
    if (this.#queued) return;
    this.#queued = true;
    queueMicrotask(() => {
      this.#queued = false;
      if (this.isConnected) {
        this.#associate();
        this.requestUpdate();
      }
    });
  };
  #observe(): void {
    this.#observer?.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'slot',
        'id',
        'name',
        'disabled',
        'invalid',
        'match',
        'native-label',
        'required',
        'type',
        'role',
        // A control may start or stop showing the Field label when its presentation changes.
        'variant',
        'orientation',
        'searchable',
      ],
    });
  }
  #associate(): void {
    if (!this.isConnected) return;
    this.#observer?.disconnect();
    const members = [...this.querySelectorAll<FieldControl>(controls)].filter((control) => {
      const group = control.closest('[slot=group]');
      return (
        control.closest('tp-field') === this &&
        (!group || group === this || group.closest('tp-field') !== this)
      );
    });
    const next = members[0] ?? null;
    if (next !== this.#control) {
      this.#cancel();
      this.#release();
      this.#control = next;
      if (next && !this.#initialCaptured) {
        this.#initial = this.value;
        this.#lastValue = this.value;
        this.#initialCaptured = true;
        this.#initialControl = next;
      }
    }
    const control = this.#control;
    const state = this.validityState;
    this.#syncErrorMembers(state);
    const label =
      this.#text('label', this.label) ||
      this.#text('title', this.title) ||
      this.renderRoot.querySelector('[part=field-label]')?.textContent?.trim() ||
      this.renderRoot.querySelector('[part=field-title]')?.textContent?.trim() ||
      '';
    const description = this.#text('description', this.description);
    const error = this.#errorVisible(state) ? this.#text('error', state.errors.join('. ')) : '';
    if (control) {
      control.setFieldContext?.({
        disabled: this.effectiveDisabled || this.#itemDisabled(control),
        ...(this.name ? { name: this.name } : {}),
        invalid: state.validity.valid === false,
        noAutofill: this.noAutofill,
        markers: Object.fromEntries(
          markers
            .filter((marker) => marker !== 'disabled' && marker !== 'invalid')
            .map((marker) => [marker, this.#marker(marker)]),
        ),
      });
      control.setFieldAssociation?.({ label, description, error });
      if (!control.setFieldContext) {
        this.#attribute(
          control,
          'disabled',
          this.effectiveDisabled ||
            this.#itemDisabled(control) ||
            this.#authoredAttribute(control, 'disabled') !== null
            ? ''
            : null,
        );
        this.#attribute(control, 'name', this.name || this.#authoredAttribute(control, 'name'));
      }
      if (!control.setFieldAssociation) {
        this.#attribute(control, 'aria-label', label || null);
        this.#attribute(
          control,
          'aria-description',
          [description, error].filter(Boolean).join('. ') || null,
        );
        this.#attribute(control, 'aria-invalid', state.validity.valid === false ? 'true' : null);
      }
      this.#dirty = !equivalent(this.value, this.#initial);
      if (!control.setFieldContext)
        for (const marker of markers)
          this.#attribute(control, `data-${marker}`, this.#marker(marker) ? '' : null);
    }
    for (const element of this.renderRoot.querySelectorAll<HTMLElement>('[part]'))
      for (const marker of markers) element.toggleAttribute(`data-${marker}`, this.#marker(marker));
    for (const marker of markers) this.toggleAttribute(`data-${marker}`, this.#marker(marker));
    for (const element of this.querySelectorAll<HTMLElement>('[slot]')) {
      if (element.closest('tp-field') !== this) continue;
      const part = {
        legend: 'field-legend',
        label: 'field-label',
        title: 'field-title',
        description: 'field-description',
        error: 'field-error',
        group: 'field-field-group',
      }[element.slot];
      if (part && !this.#parts.has(element))
        this.#parts.set(element, this.presentationController.registerPart(part, element));
      for (const marker of markers)
        this.#attribute(element, `data-${marker}`, this.#marker(marker) ? '' : null);
    }
    for (const [element, undo] of this.#parts)
      if (!this.contains(element)) {
        undo();
        this.#parts.delete(element);
      }
    for (const field of this.querySelectorAll<TpField>('tp-field'))
      if (field.parentElement?.closest('tp-field') === this) field.requestUpdate();
    this.#observe();
  }
  #attribute(element: HTMLElement, name: string, value: string | null): void {
    let attributes = this.#owned.get(element);
    if (!attributes) this.#owned.set(element, (attributes = new Map()));
    let record = attributes.get(name);
    if (!record)
      attributes.set(name, (record = { before: element.getAttribute(name), applied: value }));
    else if (element.getAttribute(name) !== record.applied)
      record.before = element.getAttribute(name);
    record.applied = value;
    if (element.getAttribute(name) === value) return;
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
  }
  #release(): void {
    this.#control?.setFieldContext?.({});
    this.#control?.setFieldAssociation?.({ label: '', description: '', error: '' });
    if (this.#control) {
      for (const [name, record] of this.#owned.get(this.#control) ?? [])
        if (this.#control.getAttribute(name) === record.applied) {
          if (record.before === null) this.#control.removeAttribute(name);
          else this.#control.setAttribute(name, record.before);
        }
      this.#owned.delete(this.#control);
    }
    this.#control = null;
  }
  #authoredAttribute(element: HTMLElement, name: string): string | null {
    const record = this.#owned.get(element)?.get(name);
    const current = element.getAttribute(name);
    return record && current === record.applied ? record.before : current;
  }
  #text(slot: string, fallback: string): string {
    const part = `field-${slot}`;
    const contract = this.partContracts[part];
    if (contract && ('content' in contract || contract.renderDelegate)) {
      const rendered = this.renderRoot.querySelector(`[part~="${part}"]`);
      if (rendered) return this.#composedText(rendered).trim();
    }
    const nodes = [...this.querySelectorAll<HTMLElement>(`[slot="${slot}"]`)].filter(
      (element) => element.closest('tp-field') === this,
    );
    return nodes.length
      ? nodes
          .filter((node) => slot !== 'error' || this.#errorMemberMatches(node, this.validityState))
          .map((node) => node.textContent?.trim() ?? '')
          .filter(Boolean)
          .join(' ')
      : fallback;
  }
  #composedText(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? '';
    if (node.nodeType === Node.ELEMENT_NODE && (node as Element).localName === 'slot') {
      const assigned = (node as HTMLSlotElement).assignedNodes({ flatten: true });
      if (assigned.length) return assigned.map((child) => this.#composedText(child)).join('');
    }
    return [...node.childNodes].map((child) => this.#composedText(child)).join('');
  }
  #itemDisabled(control: HTMLElement): boolean {
    return Boolean(control.closest('[slot=item][disabled]'));
  }
  #filled(): boolean {
    const value = this.value;
    return (
      value != null &&
      value !== '' &&
      value !== false &&
      (!Array.isArray(value) || value.length > 0)
    );
  }
  #marker(marker: (typeof markers)[number]): boolean {
    const state = this.validityState;
    switch (marker) {
      case 'disabled':
        return this.effectiveDisabled;
      case 'invalid':
        return state.validity.valid === false;
      case 'valid':
        return state.validity.valid === true;
      default:
        return state[marker];
    }
  }
  #errorMemberMatches(element: HTMLElement, state: FieldValidity): boolean {
    const member = element as HTMLElement & { match?: unknown };
    return (
      this.errorMatch !== false &&
      errorMatches(member.match ?? element.getAttribute('match') ?? this.errorMatch, state.validity)
    );
  }
  #syncErrorMembers(state: FieldValidity): void {
    const elements = [...this.querySelectorAll<HTMLElement>('[slot=error]')].filter(
      (element) => element.closest('tp-field') === this,
    );
    for (const element of elements) {
      let presence = this.#errorsPresence.get(element);
      if (!presence) {
        presence = new PresenceController(this, {
          surface: () => element,
          keepMounted: () => true,
          onStateChange: (phase) => {
            this.#attribute(
              element,
              'hidden',
              phase === 'retained' || phase === 'absent' ? '' : null,
            );
            this.#attribute(
              element,
              'aria-hidden',
              phase === 'retained' || phase === 'absent' ? 'true' : null,
            );
            this.#attribute(element, 'data-starting-style', phase === 'starting' ? '' : null);
            this.#attribute(element, 'data-ending-style', phase === 'ending' ? '' : null);
            this.requestUpdate();
          },
          onComplete: (present) => dispatchTpEvent(element, 'tp-presence-complete', { present }),
        });
        this.#errorsPresence.set(element, presence);
      }
      presence.setPresent(this.#errorMemberMatches(element, state));
    }
    for (const [element, presence] of this.#errorsPresence)
      if (!elements.includes(element)) {
        presence.hostDisconnected();
        this.removeController(presence);
        this.#errorsPresence.delete(element);
      }
  }
  #errorVisible(state: FieldValidity): boolean {
    if (this.errorMatch === false) return false;
    const matching = [...this.querySelectorAll<HTMLElement>('[slot=error]')].some(
      (element) => element.closest('tp-field') === this && this.#errorMemberMatches(element, state),
    );
    return matching || (state.errors.length > 0 && errorMatches(this.errorMatch, state.validity));
  }
  #activate = (event: Event): void => {
    if (
      !this.nativeLabel ||
      this.#ownSlots('label').some((element) => element.getAttribute('native-label') === 'false') ||
      event.defaultPrevented
    )
      return;
    activateLabeledControl(this.#control);
  };
  #focusIn = (): void => {
    this.#focused = true;
    this.requestUpdate();
  };
  #focusOut = (): void => {
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#focused = this.matches(':focus-within');
      if (!this.#focused) {
        this.#touched = true;
        if (this.mode === 'on-blur') this.validate();
      }
      this.requestUpdate();
    });
  };
  #proposal = (event: Event): void => {
    queueMicrotask(() => {
      if (!event.defaultPrevented) this.#changed();
    });
  };
  #changed = (event?: Event): void => {
    if (!this.#control || !this.isConnected) return;
    const detail = (event as CustomEvent<{ reason?: string; previousValue?: unknown }> | undefined)
      ?.detail;
    if (
      event?.type === 'tp-field-value' &&
      detail?.reason === 'initial' &&
      event.composedPath()[0] === this.#control &&
      this.#initialControl === this.#control &&
      !this.#initialRebased &&
      !this.#touched &&
      !this.#submitted &&
      equivalent(this.#lastValue, this.#initial) &&
      equivalent(detail.previousValue, this.#initial)
    ) {
      this.#initial = this.value;
      this.#lastValue = this.value;
      this.#initialRebased = true;
      this.#dirty = false;
      this.requestUpdate();
      return;
    }
    // A control whose validity changed without a value change (a File upload rejection)
    // revalidates under the same timing policy as an edit.
    if (event?.type !== 'tp-field-validity' && equivalent(this.value, this.#lastValue)) return;
    this.#lastValue = this.value;
    this.#dirty = !equivalent(this.value, this.#initial);
    this.#cancel();
    if (this.mode === 'on-change' || (this.mode === 'on-submit' && this.#submitted)) {
      const delay = Math.max(0, this.validationDebounce || 0);
      if (delay)
        this.#timer = this.ownerDocument.defaultView?.setTimeout(() => {
          this.#timer = undefined;
          this.validate();
        }, delay);
      else this.validate();
    }
    this.requestUpdate();
  };
  #keyDown = (event: KeyboardEvent): void => {
    if (
      event.key === 'Enter' &&
      !event.isComposing &&
      !event.defaultPrevented &&
      this.#control?.inputElement?.tagName === 'INPUT'
    ) {
      this.#touched = true;
      this.validate();
    }
  };
  #reset = (event: Event): void => {
    if (event.target !== (this.#control?.form ?? this.#control?.closest('form'))) return;
    queueMicrotask(() => {
      this.#cancel();
      this.#customErrors = [];
      this.#computedErrors = [];
      this.#valid = null;
      this.#touched = false;
      this.#submitted = false;
      this.#dirty = !equivalent(this.value, this.#initial);
      this.requestUpdate();
    });
  };
  #submit = (event: Event): void => {
    if (event.target !== (this.#control?.form ?? this.#control?.closest('form'))) return;
    if (this.closest('tp-form')) return;
    this.#submitted = true;
    this.#touched = true;
    this.validate();
    if (this.validityState.validity.valid === false) {
      event.preventDefault();
      this.#control?.focus();
    }
    this.requestUpdate();
  };
  #cancel(): void {
    if (this.#timer !== undefined) this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#validation?.cancel();
    this.#run?.cancel();
    this.#generation++;
    this.#pending = false;
  }
  #formValues(): Record<string, unknown> {
    const form = this.closest('tp-form,form');
    return fieldValues(
      [...(form ?? this.ownerDocument).querySelectorAll<TpField>('tp-field')]
        .filter((field) => field.closest('tp-form,form') === form)
        .map((field) => ({ name: field.effectiveName, value: field.value })),
    );
  }

  /**
   * Validates as part of a submission, marking the Field touched first; the enclosing Form calls
   * it.
   */
  [fieldSubmission](): ValidationRun {
    this.#submitted = true;
    this.#touched = true;
    return this.validate();
  }
  /**
   * Validates now and returns the run; a newer run supersedes this one, and a promise from the
   * validator leaves the Field pending until it settles.
   */
  validate(): ValidationRun {
    this.#cancel();
    const generation = this.#generation;
    const run = new ValidationRun(generation);
    this.#run = run;
    const control = this.#control;
    if (!control) {
      this.#pending = true;
      console.warn('tp-field: validation requires a registered control.');
      this.requestUpdate();
      return run;
    }
    if (this.effectiveDisabled || control.effectiveDisabled || control.disabled) {
      this.#valid = null;
      this.#computedErrors = [];
      run.settle('valid', [
        {
          identity: this.effectiveName || this.id || 'field',
          status: 'valid',
          valid: true,
          errors: [],
        },
      ]);
      this.requestUpdate();
      return run;
    }
    // A composed control can impose constraints beyond its inner editor (for
    // example a complete code). Its public form validity is authoritative.
    const validityOwner = control.validity ? control : control.inputElement;
    const native = validityOwner?.validity;
    this.#nativeFlags = native ? nativeValidityFlags(native) : {};
    const nativeError =
      native?.valid === false ? validityOwner?.validationMessage || 'Invalid value.' : '';
    this.#computedErrors = nativeError ? [nativeError] : [];
    this.#customErrors = [];
    let result: ReturnType<FieldValidator>;
    try {
      result = this.validator?.(this.value, this.#formValues());
    } catch (error) {
      this.#failed(run, error);
      return run;
    }
    const finish = (result: string | readonly string[] | null | void) => {
      if (generation !== this.#generation || !this.isConnected) {
        run.cancel();
        return;
      }
      if (
        result != null &&
        typeof result !== 'string' &&
        (!Array.isArray(result) || !result.every((message) => typeof message === 'string'))
      ) {
        this.#failed(run, new TypeError('Malformed validator result'));
        return;
      }
      this.#customErrors = deduplicate(typeof result === 'string' ? [result] : (result ?? []));
      this.#pending = false;
      this.#valid =
        !this.invalid &&
        !this.error &&
        !this.errors.length &&
        !this.#serverErrors.length &&
        !this.#customErrors.length &&
        !nativeError;
      const errors = this.validityState.errors;
      run.settle(this.#valid ? 'valid' : 'invalid', [
        {
          identity: this.effectiveName || this.id || 'field',
          status: this.#valid ? 'valid' : 'invalid',
          valid: this.#valid,
          errors,
          flags: this.#nativeFlags,
        },
      ]);
      this.requestUpdate();
      this.emit('tp-validation', { run, state: this.validityState });
    };
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      this.#pending = true;
      if (!nativeError) this.#valid = null;
      this.#validation = new ValidationController<unknown>([
        () => result as Promise<string | readonly string[] | null | undefined>,
      ]);
      const inner = this.#validation.validate(this.value, this.effectiveName);
      void inner.completion.then((snapshot) => {
        if (generation !== this.#generation) {
          run.cancel();
          return;
        }
        if (snapshot.status === 'cancelled') {
          run.cancel();
          return;
        }
        const first = snapshot.fieldResults[0];
        if (first?.status === 'failed') {
          this.#failed(run, new Error(first.errors.join('\n')));
          return;
        }
        finish(first?.errors ?? []);
      });
      this.requestUpdate();
    } else finish(result as string | readonly string[] | null | void);
    return run;
  }
  #failed(run: ValidationRun, error: unknown): void {
    this.#pending = false;
    this.#valid = false;
    this.#customErrors = [error instanceof Error ? error.message : 'Validation failed.'];
    run.settle('failed', [
      {
        identity: this.effectiveName || this.id || 'field',
        status: 'failed',
        valid: false,
        errors: this.#customErrors,
      },
    ]);
    this.requestUpdate();
    this.emit('tp-validation', { run, state: this.validityState });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-field': TpField;
  }
}
