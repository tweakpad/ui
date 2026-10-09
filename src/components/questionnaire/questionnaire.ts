import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { keyed } from 'lit/directives/keyed.js';

import { createId } from '../../foundation/id.js';
import { TpElement } from '../../foundation/element.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { deepActiveElement } from '../../foundation/focus.js';
import {
  normalizeQuestionnaireAnswer,
  questionnaireAnswered,
  questionnaireQuestionKind,
  questionnaireRemovalFallback,
  questionnaireStatus,
} from '../../foundation/questionnaire.js';
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswers,
  QuestionnaireChoiceMode,
  QuestionnaireFlow,
  QuestionnaireQuestion,
  QuestionnaireShortcutMode,
  QuestionnaireStatus,
} from '../../foundation/questionnaire.js';
import type { ChangeReason } from '../../foundation/types.js';
import { eventReason } from '../shared/events.js';
import { QuestionnaireState, cloneAnswers } from './state.js';
import { type PartRenderOptions } from '../../foundation/part.js';
import { checkIcon } from '../../icons/check.js';
import { questionnaireStyles } from './styles.js';
import { questionnairePresentation } from '../../presentation/families/questionnaire.js';
import { TpIcon } from '../icon/icon.js';
import { TpKeyHint } from '../key-hint/key-hint.js';
import { TpButton } from '../button/button.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export type QuestionnaireAction = 'previous' | 'skip' | 'next' | 'submit';
export interface QuestionnaireActionOptions {
  label?: string;
  variant?: TpButton['variant'];
  size?: TpButton['size'];
  disabled?: boolean;
  hidden?: boolean;
}
export type QuestionnaireActions = Partial<Record<QuestionnaireAction, QuestionnaireActionOptions>>;

export interface QuestionnaireItemChangeDetail {
  value: string;
  previousValue: string;
  reason: ChangeReason;
  sourceEvent: Event;
}

export interface QuestionnaireSubmitDetail {
  form: HTMLFormElement;
  data: FormData;
  answers: QuestionnaireAnswers;
  reason: 'submit';
  sourceEvent: SubmitEvent;
}

function questionnaireInteractionReason(event: Event): ChangeReason {
  if (event instanceof MouseEvent && event.detail === 0) return 'keyboard';
  return eventReason(event);
}

export class TpQuestionnaire extends TpElement {
  static tagName = 'tp-questionnaire';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon, TpKeyHint, TpButton];
  }
  static override presentation = questionnairePresentation;
  static override properties = {
    ...TpElement.properties,
    questions: { attribute: false },
    actions: { attribute: false },
    flow: { type: String, reflect: true },
    choiceMode: { type: String, attribute: 'choice-mode', reflect: true },
    skippable: { type: Boolean },
    value: { attribute: false, noAccessor: true },
    defaultValue: { attribute: false },
    item: { type: String, noAccessor: true },
    defaultItem: { type: String, attribute: 'default-item' },
    shortcutMode: { type: String, attribute: 'shortcut-mode', reflect: true },
    nativeValidation: { type: String, attribute: 'native-validation', reflect: true },
    label: { type: String },
    onValueChange: { attribute: false },
    onItemChange: { attribute: false },
  };
  static override styles = [TpElement.styles, questionnaireStyles];

  questions: readonly QuestionnaireQuestion[] = [];
  actions: QuestionnaireActions = {};
  flow: QuestionnaireFlow = 'linear';
  choiceMode: QuestionnaireChoiceMode = 'single';
  skippable = false;
  #providedValue: QuestionnaireAnswers | undefined;
  get value(): QuestionnaireAnswers {
    return this.answers;
  }
  set value(value: QuestionnaireAnswers | undefined) {
    this.#providedValue = value;
    if (this.#initialized) this.#state.syncValue();
    this.requestUpdate('value');
  }
  defaultValue: QuestionnaireAnswers = {};
  #providedItem: string | undefined;
  get item(): string {
    return this.#active;
  }
  set item(value: string | undefined) {
    this.#providedItem = value;
    if (this.#initialized) this.#state.syncItem();
    this.requestUpdate('item');
  }
  defaultItem = '';
  shortcutMode: QuestionnaireShortcutMode = 'none';
  nativeValidation: 'enabled' | 'suppressed' = 'enabled';
  label = 'Questionnaire';
  onValueChange: ((event: TpValueChangeEvent<QuestionnaireAnswers>) => void) | undefined;
  onItemChange: ((event: TpValueChangeEvent<string>) => void) | undefined;

  #initialized = false;
  readonly #state = new QuestionnaireState(
    this,
    () => this.#providedValue,
    () => this.#providedItem,
    () => this.requestUpdate(),
    (message) => this.#diagnose(message),
  );
  get #answers(): QuestionnaireAnswers {
    return this.#state.answers;
  }
  get #active(): string {
    return this.#state.item.value;
  }
  get #skipped(): Set<string> {
    return this.#state.metadata.skipped;
  }
  get #attempted(): Set<string> {
    return this.#state.metadata.attempted;
  }
  get #reachedIndex(): number {
    return this.#state.metadata.reached;
  }
  #order: string[] = [];
  #renderedItem = '';
  #statuses = new Map<string, QuestionnaireStatus>();
  #pendingFocus = '';
  #pendingReportValidity = false;
  #focusGeneration = 0;
  #lastDiagnostic = '';
  readonly #questionnaireId = createId('tp-questionnaire');

  get answers(): QuestionnaireAnswers {
    return cloneAnswers(this.#answers);
  }

  get currentItem(): string {
    return this.#active;
  }

  get current(): number {
    const index = this.#logicalQuestions().findIndex((question) => question.name === this.#active);
    return index < 0 ? 0 : index + 1;
  }

  get total(): number {
    return this.#logicalQuestions().length;
  }

  get first(): boolean {
    return this.current > 0 && this.current === 1;
  }

  get last(): boolean {
    return this.current > 0 && this.current === this.total;
  }

  get status(): QuestionnaireStatus | undefined {
    const question = this.#activeQuestion();
    return question ? this.#questionStatus(question) : undefined;
  }

  setAnswer(name: string, answer: QuestionnaireAnswer, sourceEvent?: Event): boolean {
    const question = this.questions.find((candidate) => candidate.name === name);
    this.#state.initialize();
    if (!question || question.disabled) return false;
    return this.#requestAnswer(
      question,
      answer,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  setItem(name: string, sourceEvent?: Event): boolean {
    const questions = this.#logicalQuestions();
    const targetIndex = questions.findIndex((question) => question.name === name);
    if (targetIndex < 0) return false;
    if (this.disabled) return false;
    if (this.flow === 'linear' && targetIndex > this.#reachedIndex) {
      const active = this.#activeQuestion();
      if (
        !active ||
        targetIndex !== this.#order.indexOf(this.#active) + 1 ||
        this.#leaveError(active)
      )
        return false;
    }
    return this.#requestItem(
      name,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  requestSubmit(): void {
    void this.updateComplete.then(() => {
      if (this.isConnected) this.#form()?.requestSubmit();
    });
  }

  reset(): void {
    this.#form()?.reset();
  }

  #part(name: string, options: PartRenderOptions, state: Record<string, unknown> = {}): unknown {
    return this.renderPart(
      name === 'root' ? 'questionnaire' : `questionnaire-${name}`,
      {
        current: this.current,
        total: this.total,
        first: this.first,
        last: this.last,
        status: this.status,
        disabled: this.disabled,
        name: this.currentItem,
        ...state,
      },
      options,
    );
  }
  protected override render() {
    const active = this.#activeQuestion();
    const current = this.current,
      total = this.total;
    const error =
      active && (active.invalid || this.#attempted.has(active.name))
        ? this.#leaveError(active)
        : null;
    const titleId = `${this.#questionnaireId}-title`,
      descriptionId = `${this.#questionnaireId}-description`,
      errorId = `${this.#questionnaireId}-error`;
    const described = [active?.description && descriptionId, error && errorId]
      .filter(Boolean)
      .join(' ');
    const progress = this.#part('progress', {
      properties: {
        role: 'progressbar',
        'aria-label': 'Questionnaire progress',
        'aria-valuemin': 0,
        'aria-valuemax': total,
        'aria-valuenow': current,
        'aria-valuetext': `Question ${current} of ${total}`,
        'data-current': current,
        'data-total': total,
        'data-first': this.first,
        'data-last': this.last,
      },
      content: `Question ${current} of ${total}`,
    });
    const actions = this.#renderActions(active, current - 1, total);
    const input =
      active && (active.input || questionnaireQuestionKind(active, this.choiceMode) === 'text')
        ? this.#renderTextQuestion(active, descriptionId, errorId, Boolean(error))
        : nothing;
    const regions = active
      ? {
          title: this.#part('title', {
            tag: 'legend',
            properties: { id: titleId },
            protectedProperties: ['id'],
            content: active.title,
          }),
          description: active.description
            ? this.#part('description', {
                properties: { id: descriptionId },
                content: active.description,
              })
            : nothing,
          choices: active.choices?.length
            ? this.#renderChoiceQuestion(active, descriptionId, errorId, Boolean(error), input)
            : this.#part('choices', { content: input }, { shortcuts: this.shortcutMode }),
          input,
          error: error
            ? this.#part(
                'error',
                { properties: { id: errorId, role: 'alert' }, content: error },
                { invalid: true },
              )
            : nothing,
          progress,
          actions,
        }
      : undefined;
    const question =
      active && regions
        ? keyed(
            active.name,
            this.#part(
              'question',
              {
                tag: 'fieldset',
                properties: {
                  'data-name': active.name,
                  'data-status': this.#questionStatus(active),
                  'data-active': true,
                  'data-invalid': Boolean(error),
                  'data-required': Boolean(active.required),
                  tabindex: -1,
                  'aria-labelledby': titleId,
                  'aria-describedby': described || undefined,
                  'aria-invalid': error ? 'true' : undefined,
                  disabled: this.disabled,
                },
                content: html`${regions.title}${regions.description}${regions.choices}${regions.error}`,
              },
              {
                active: true,
                invalid: Boolean(error),
                required: Boolean(active.required),
                multiple: questionnaireQuestionKind(active, this.choiceMode) === 'multiple',
                regions,
              },
            ),
          )
        : nothing;
    const answers = this.#renderHiddenAnswers(active?.name ?? '');
    return this.#part(
      'root',
      {
        tag: 'form',
        properties: {
          'aria-label': this.label,
          novalidate: true,
          'data-current': current,
          'data-total': total,
          'data-first': this.first,
          'data-last': this.last,
          '@submit': this.#submit,
          '@reset': this.#reset,
          '@keydown': this.#keyDown,
        },
        content: html`${progress}${answers}${question}${actions}`,
      },
      { regions: { progress, answers, question, actions } },
    );
  }

  #renderTextQuestion(
    question: QuestionnaireQuestion,
    descriptionId: string,
    errorId: string,
    invalid: boolean,
  ): unknown {
    const config = question.input ?? question;
    const value = this.#state.inputValue(question);
    const answer = this.#answers[question.name];
    const selected = Array.isArray(answer) ? answer.includes(value) : answer === value;
    return this.#part(
      'input-region',
      {
        content: html`<input
          class="free-answer"
          data-answer-control
          .type=${question.input?.type ?? question.inputType ?? 'text'}
          name=${selected && !this.#skipped.has(question.name) ? question.name : nothing}
          .value=${value}
          .placeholder=${config.placeholder ?? ''}
          aria-label=${question.input?.label ?? question.title}
          pattern=${config.pattern ?? nothing}
          minlength=${config.minLength ?? nothing}
          maxlength=${config.maxLength ?? nothing}
          min=${question.input?.min ?? nothing}
          max=${question.input?.max ?? nothing}
          step=${question.input?.step ?? nothing}
          autocomplete=${question.input?.autocomplete ?? nothing}
          inputmode=${question.input?.inputMode ?? nothing}
          enterkeyhint=${question.input?.enterKeyHint ?? nothing}
          autocapitalize=${question.input?.autocapitalize ?? nothing}
          spellcheck=${question.input?.spellcheck === undefined ? nothing : String(question.input.spellcheck)}
          ?required=${question.required && !question.choices?.length}
          ?disabled=${this.disabled || question.input?.disabled}
          ?readonly=${this.readOnly || question.input?.readOnly}
          aria-invalid=${invalid ? 'true' : nothing}
          aria-describedby=${[question.description && descriptionId, invalid && errorId].filter(Boolean).join(' ') || nothing}
          aria-keyshortcuts=${selected && value.trim() ? 'Enter' : nothing}
          @input=${this.#textInput}
        />`,
      },
      {
        disabled: this.disabled || Boolean(question.input?.disabled),
        filled: Boolean(value.trim()),
        invalid,
      },
    );
  }
  #renderChoiceQuestion(
    question: QuestionnaireQuestion,
    descriptionId: string,
    errorId: string,
    invalid: boolean,
    input: unknown,
  ): unknown {
    const kind = questionnaireQuestionKind(question, this.choiceMode),
      answer = this.#answers[question.name];
    const selected = new Set(Array.isArray(answer) ? answer : answer ? [answer] : []),
      shortcuts = this.#choiceShortcuts(question);
    return this.#part(
      'choices',
      {
        content: html`${(question.choices ?? []).map((choice, index) => {
          const checked = selected.has(choice.value),
            shortcut = shortcuts[index] ?? '',
            type = kind === 'multiple' ? 'checkbox' : 'radio';
          return this.#part(
            'choice',
            {
              tag: 'label',
              properties: {
                'data-type': type,
                'data-disabled': Boolean(this.disabled || choice.disabled),
                'data-checked': checked,
                'data-invalid': invalid,
                'data-shortcut': shortcut || undefined,
              },
              content: html`
                <input
                  class="choice-native"
                  data-answer-control
                  data-choice-value=${choice.value}
                  type=${type}
                  name=${this.#skipped.has(question.name) ? nothing : question.name}
                  .value=${choice.value}
                  .checked=${checked}
                  ?required=${kind === 'single' && question.required && !question.input}
                  ?disabled=${this.disabled || choice.disabled}
                  aria-readonly=${this.readOnly ? 'true' : nothing}
                  aria-keyshortcuts=${[shortcut, checked ? 'Enter' : ''].filter(Boolean).join(' ') || nothing}
                  aria-describedby=${[question.description && descriptionId, invalid && errorId].filter(Boolean).join(' ') || nothing}
                  aria-invalid=${invalid ? 'true' : nothing}
                  @click=${this.#choiceClick}
                  @change=${this.#choiceChange}
                />
                <span class="box" aria-hidden="true"
                  >${checked ? (type === 'checkbox' ? html`<tp-icon .icon=${checkIcon} size="var(--tp-icon-size-sm)"></tp-icon>` : html`<span class="dot"></span>`) : nothing}</span
                >
                <span class="choice-copy"
                  ><span>${choice.label}</span
                  >${choice.description ? html`<span class="choice-description">${choice.description}</span>` : nothing}</span
                >
                ${shortcut ? html`<tp-key-hint class="shortcut" aria-hidden="true">${shortcut}</tp-key-hint>` : nothing}
              `,
            },
            {
              value: choice.value,
              type,
              checked,
              disabled: this.disabled || Boolean(choice.disabled),
              invalid,
              shortcut,
            },
          );
        })}${input}`,
      },
      { shortcuts: this.shortcutMode },
    );
  }
  #renderHiddenAnswers(activeName: string): TemplateResult {
    return html`<div hidden>
      ${Object.entries(this.#answers).flatMap(([name, answer]) => (name === activeName || this.#skipped.has(name) ? [] : (Array.isArray(answer) ? answer : [answer]).map((value) => html`<input type="hidden" name=${name} .value=${value} ?disabled=${this.disabled} />`)))}
    </div>`;
  }
  #renderActions(active: QuestionnaireQuestion | undefined, index: number, total: number): unknown {
    const status = active ? this.#questionStatus(active) : 'unanswered',
      skip = Boolean(active && !active.required && (active.skippable ?? this.skippable));
    const action = (
      name: QuestionnaireAction,
      label: string,
      visible: boolean,
      handler: ((event: MouseEvent) => void) | undefined,
      shortcut?: string,
    ) => {
      const config = this.actions[name];
      visible &&= !config?.hidden;
      return html`<tp-button
        type=${name === 'submit' ? 'submit' : 'button'}
        variant=${config?.variant ?? (name === 'previous' || name === 'skip' ? 'outline' : 'default')}
        size=${config?.size ?? 'default'}
        data-action=${name}
        data-status=${status}
        ?data-visible=${visible}
        ?data-hidden=${!visible}
        ?hidden=${!visible}
        ?disabled=${this.disabled || !visible || config?.disabled || (name === 'skip' && this.readOnly)}
        data-shortcut=${shortcut ?? nothing}
        aria-keyshortcuts=${shortcut ?? nothing}
        @click=${handler}
        >${config?.label ?? label}</tp-button
      >`;
    };
    return this.#part('actions', {
      content: html`${action('previous', 'Previous', index > 0, this.#previous, 'ArrowLeft')}${action('skip', 'Skip', skip, this.#skip)}${action('next', 'Next', index >= 0 && index < total - 1, this.#next, status === 'answered' ? 'Enter' : undefined)}${action('submit', 'Submit', index >= 0 && index === total - 1, undefined, status === 'answered' ? 'Enter' : undefined)}`,
    });
  }
  #choiceClick = (event: MouseEvent): void => {
    if (this.readOnly) event.preventDefault();
  };

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.#initialized) {
      this.#state.initialize();
      this.#initialized = true;
    }
    this.#state.reconcile();
    const next = this.#logicalQuestions().map((q) => q.name);
    if (!next.includes(this.#active) && !this.#state.item.controlled) {
      const fallback = questionnaireRemovalFallback(this.#order, next, this.#active);
      const meta = this.#state.metadataCopy();
      meta.reached = Math.min(meta.reached, Math.max(0, next.length - 1));
      if (
        fallback !== this.#active &&
        this.#state.change(this.#answers, fallback, meta, 'programmatic')
      )
        this.#pendingFocus = fallback;
    }
    if (this.#renderedItem && this.#renderedItem !== this.#active)
      this.#pendingFocus = this.#active;
    if (changed.has('questions')) {
      const focused = deepActiveElement(this.ownerDocument),
        question = this.#activeQuestion();
      if (
        focused instanceof HTMLInputElement &&
        focused.getRootNode() === this.shadowRoot &&
        question
      ) {
        const choice = focused.dataset.choiceValue;
        if (
          choice !== undefined
            ? !question.choices?.some((c) => c.value === choice && !c.disabled)
            : question.input?.disabled ||
              (!question.input && questionnaireQuestionKind(question, this.choiceMode) !== 'text')
        )
          this.#pendingFocus = question.name;
      }
    }
    this.#order = next;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncNativeAnswerState();
    this.#renderedItem = this.#active;
    for (const q of this.#logicalQuestions()) {
      const status = this.#questionStatus(q),
        previous = this.#statuses.get(q.name);
      this.#statuses.set(q.name, status);
      if (previous !== undefined && previous !== status) q.onStatusChange?.(status);
    }
    for (const name of this.#statuses.keys())
      if (!this.#order.includes(name)) this.#statuses.delete(name);
    const error = this.#configurationError();
    if (error) this.#diagnose(error);
    if (this.#pendingFocus) {
      const item = this.#pendingFocus;
      const reportValidity = this.#pendingReportValidity;
      this.#pendingFocus = '';
      this.#pendingReportValidity = false;
      const generation = ++this.#focusGeneration;
      queueMicrotask(() => {
        if (generation !== this.#focusGeneration || !this.isConnected) return;
        this.#focusQuestion(item, reportValidity);
      });
    }
  }

  override disconnectedCallback(): void {
    this.#focusGeneration += 1;
    this.#pendingFocus = '';
    super.disconnectedCallback();
  }

  #requestAnswer(
    question: QuestionnaireQuestion,
    answer: QuestionnaireAnswer,
    reason: ChangeReason,
    sourceEvent: Event,
    input?: string,
  ): boolean {
    if (this.disabled || this.readOnly || question.disabled) return false;
    const normalized = normalizeQuestionnaireAnswer(question, answer, this.choiceMode);
    if (normalized === undefined) return false;
    const next = cloneAnswers(this.#answers);
    next[question.name] = normalized;
    const meta = this.#state.metadataCopy();
    meta.skipped.delete(question.name);
    return this.#state.change(next, this.#active, meta, reason, sourceEvent, {
      preserveDraft: true,
      input: input === undefined ? undefined : { name: question.name, value: input },
    });
  }
  #requestItem(name: string, reason: ChangeReason, sourceEvent: Event): boolean {
    if (this.disabled || !this.#order.includes(name) || name === this.#active) return false;
    const meta = this.#state.metadataCopy();
    meta.reached = Math.max(meta.reached, this.#order.indexOf(name));
    const accepted = this.#state.change(this.#answers, name, meta, reason, sourceEvent, {
      preserveDraft: true,
    });
    if (accepted) this.#pendingFocus = name;
    return accepted;
  }

  #textInput = (event: InputEvent): void => {
    const question = this.#activeQuestion();
    if (!question) return;
    const input = event.currentTarget as HTMLInputElement;
    const before = this.#state.inputValue(question);
    let answer: QuestionnaireAnswer = input.value;
    if (questionnaireQuestionKind(question, this.choiceMode) === 'multiple') {
      const selected = this.#answers[question.name];
      answer = [
        ...(Array.isArray(selected) ? selected.filter((v) => v !== before) : []),
        ...(input.value.trim() ? [input.value] : []),
      ];
    }
    if (!this.#requestAnswer(question, answer, 'input', event, input.value)) input.value = before;
  };

  #choiceChange = (event: Event): void => {
    const question = this.#activeQuestion();
    if (!question) return;
    const input = event.currentTarget as HTMLInputElement;
    if (event.defaultPrevented) {
      this.requestUpdate();
      return;
    }
    if (this.readOnly) {
      this.requestUpdate();
      return;
    }
    const kind = questionnaireQuestionKind(question, this.choiceMode);
    let answer: QuestionnaireAnswer = input.value;
    if (kind === 'multiple') {
      const current = this.#answers[question.name];
      const values = new Set(Array.isArray(current) ? current : []);
      if (input.checked) values.add(input.value);
      else values.delete(input.value);
      answer = [...values];
    }
    this.#requestAnswer(question, answer, 'selection', event);
  };

  #previous = (event: MouseEvent): void => {
    if (event.defaultPrevented || this.disabled) return;
    const index = this.#order.indexOf(this.#active);
    const previous = this.#order[index - 1];
    if (previous) this.#requestItem(previous, questionnaireInteractionReason(event), event);
  };

  #next = (event: MouseEvent): void => {
    if (!event.defaultPrevented) this.#advance(questionnaireInteractionReason(event), event);
  };

  #advance(reason: ChangeReason, sourceEvent: Event): boolean {
    const question = this.#activeQuestion();
    if (!question) return false;
    if (this.disabled) return false;
    const error = this.#leaveError(question);
    if (error) this.#attempted.add(question.name);
    if (error) {
      this.#pendingFocus = question.name;
      this.#pendingReportValidity = true;
      this.requestUpdate();
      return false;
    }
    const index = this.#order.indexOf(question.name);
    const next = this.#order[index + 1];
    if (!next) {
      this.#form()?.requestSubmit();
      return true;
    }
    return this.#requestItem(next, reason, sourceEvent);
  }

  #skip = (event: MouseEvent): void => {
    if (event.defaultPrevented || this.disabled || this.readOnly) return;
    const question = this.#activeQuestion();
    if (!question || question.required || !(question.skippable ?? this.skippable)) return;
    const next = cloneAnswers(this.#answers);
    delete next[question.name];
    const nextItem = this.#order[this.#order.indexOf(question.name) + 1];
    const meta = this.#state.metadataCopy();
    meta.skipped.add(question.name);
    meta.attempted.delete(question.name);
    meta.inputSelected.delete(question.name);
    meta.reached = Math.max(
      meta.reached,
      nextItem ? this.#order.indexOf(nextItem) : this.#reachedIndex,
    );
    if (
      !this.#state.change(
        next,
        nextItem ?? this.#active,
        meta,
        questionnaireInteractionReason(event),
        event,
        { preserveDraft: true, input: { name: question.name, value: '' } },
      )
    )
      return;
    if (nextItem) this.#pendingFocus = nextItem;
    else void this.updateComplete.then(() => this.#form()?.requestSubmit());
  };

  #submit = (event: SubmitEvent): void => {
    if (this.disabled) {
      event.preventDefault();
      return;
    }
    const questions = this.#logicalQuestions();
    const invalid = questions.find((question) => this.#leaveError(question));
    if (invalid) {
      event.preventDefault();
      this.#attempted.add(invalid.name);
      const reason: ChangeReason = 'submit';
      if (invalid.name !== this.#active) this.#requestItem(invalid.name, reason, event);
      this.#pendingFocus = invalid.name;
      this.#pendingReportValidity = true;
      this.requestUpdate();
      return;
    }
    const form = event.currentTarget as HTMLFormElement;
    const accepted = this.emit<QuestionnaireSubmitDetail>(
      'tp-submit',
      {
        form,
        data: new FormData(form),
        answers: this.answers,
        reason: 'submit',
        sourceEvent: event,
      },
      { cancelable: true },
    );
    if (!accepted) event.preventDefault();
  };

  #reset = (event: Event): void => {
    queueMicrotask(() => {
      if (event.defaultPrevented) return;
      const initial = this.#state.initialItem;
      const meta = {
        skipped: new Set<string>(),
        attempted: new Set<string>(),
        inputSelected: new Set<string>(),
        reached: Math.max(0, this.#order.indexOf(initial)),
      };
      if (
        this.#state.change(this.#state.defaults, initial, meta, 'form-reset', event, {
          reset: true,
        })
      )
        this.#pendingFocus = initial;
      this.#syncNativeAnswerState();
      this.requestUpdate();
    });
  };

  #keyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || event.isComposing || event.repeat || this.disabled) return;
    const target = event.composedPath()[0];
    if (!(target instanceof HTMLElement)) return;
    // Real buttons own Enter/Space, including Previous, Skip, Reset and host actions.
    if (
      event
        .composedPath()
        .some((node) => node instanceof HTMLElement && node.matches('button,tp-button,a[href]'))
    )
      return;
    const textEntry = target.matches(
      'input:not([type=radio]):not([type=checkbox]):not([type=hidden]),textarea,[contenteditable]:not([contenteditable=false])',
    );
    const radio = target instanceof HTMLInputElement && target.type === 'radio';

    if (!textEntry && !radio && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      const controls = this.#answerControls();
      const index = controls.indexOf(target as HTMLInputElement);
      if (index >= 0 && controls.length) {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        controls[(index + direction + controls.length) % controls.length]?.focus();
      }
      return;
    }

    if (!textEntry && !radio && event.key === 'ArrowLeft') {
      event.preventDefault();
      this.#previousFromKeyboard(event);
      return;
    }
    if (!textEntry && !radio && event.key === 'ArrowRight') {
      event.preventDefault();
      const question = this.#activeQuestion();
      if (question && questionnaireAnswered(this.#answers[question.name]))
        this.#advance('keyboard', event);
      return;
    }
    if (
      event.key === 'Enter' &&
      (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || this.#activeAnswered())
    ) {
      event.preventDefault();
      this.#advance('keyboard', event);
      return;
    }
    // Prevent the browser's implicit form submit from an unfilled answer.
    if (event.key === 'Enter') {
      event.preventDefault();
      return;
    }
    if (textEntry || event.altKey || event.ctrlKey || event.metaKey) return;
    const question = this.#activeQuestion();
    if (!question) return;
    const shortcuts = this.#choiceShortcuts(question);
    const shortcutIndex = shortcuts.findIndex(
      (shortcut) => shortcut.toLocaleLowerCase() === event.key.toLocaleLowerCase(),
    );
    const choice = question.choices?.[shortcutIndex];
    const control = choice
      ? this.#answerControls().find((input) => input.dataset.choiceValue === choice.value)
      : undefined;
    if (shortcutIndex >= 0 && control) {
      event.preventDefault();
      control.focus();
      control.click();
    }
  };

  #previousFromKeyboard(event: KeyboardEvent): void {
    const index = this.#order.indexOf(this.#active);
    const previous = this.#order[index - 1];
    if (previous) this.#requestItem(previous, 'keyboard', event);
  }

  #activeAnswered(): boolean {
    const question = this.#activeQuestion();
    return Boolean(question && questionnaireAnswered(this.#answers[question.name]));
  }

  #activeQuestion(): QuestionnaireQuestion | undefined {
    return this.#logicalQuestions().find((question) => question.name === this.#active);
  }

  #logicalQuestions(): QuestionnaireQuestion[] {
    const names = new Set<string>();
    return this.questions.filter((question) => {
      if (question.disabled || !question.name || names.has(question.name)) return false;
      names.add(question.name);
      return true;
    });
  }

  #questionStatus(question: QuestionnaireQuestion): QuestionnaireStatus {
    return questionnaireStatus(this.#answers[question.name], this.#skipped.has(question.name));
  }

  #leaveError(question: QuestionnaireQuestion): string | null {
    const status = this.#questionStatus(question);
    if (status === 'skipped') return null;
    if (status === 'unanswered')
      return question.required ? 'Answer this question.' : 'Answer or skip this question.';
    return this.#validationError(question);
  }

  #validationError(question: QuestionnaireQuestion): string | null {
    const answer = this.#answers[question.name];
    if (this.#skipped.has(question.name) && !question.required) return null;
    if (question.invalid) return question.error || 'Check this answer.';
    if (!questionnaireAnswered(answer)) return question.required ? 'Answer this question.' : null;
    const customError = question.validate?.(answer);
    if (customError) return customError;
    const values = Array.isArray(answer) ? answer : [answer];
    const value = values.find((v) => !question.choices?.some((c) => c.value === v)) ?? '';
    if (!value) return null;
    const config = question.input ?? question;
    if (config.minLength !== undefined && value.length < config.minLength)
      return `Use at least ${config.minLength} characters.`;
    if (config.maxLength !== undefined && value.length > config.maxLength)
      return `Use no more than ${config.maxLength} characters.`;
    if (config.pattern) {
      try {
        if (!new RegExp(`^(?:${config.pattern})$`, 'u').test(value))
          return 'Match the requested format.';
      } catch {
        return 'The question pattern is invalid.';
      }
    }
    const input = this.ownerDocument.createElement('input');
    input.type = question.input?.type ?? question.inputType ?? 'text';
    for (const attribute of ['min', 'max', 'step'] as const) {
      const bound = question.input?.[attribute];
      if (bound !== undefined) input.setAttribute(attribute, String(bound));
    }
    input.value = value;
    if (!input.checkValidity()) return input.validationMessage || 'Enter a valid answer.';
    return null;
  }

  #choiceShortcuts(question: QuestionnaireQuestion): string[] {
    if (this.shortcutMode === 'none') return [];
    const used = new Set<string>();
    let index = -1;
    return (question.choices ?? []).map((choice) => {
      if (choice.disabled) return '';
      index++;
      const fallback =
        this.shortcutMode === 'letters'
          ? index < 26
            ? String.fromCharCode(65 + index)
            : ''
          : index < 9
            ? String(index + 1)
            : '';
      const shortcut = (choice.shortcut ?? fallback).trim();
      const key = shortcut.toLocaleLowerCase();
      if (!shortcut || used.has(key)) return '';
      used.add(key);
      return shortcut;
    });
  }

  #answerControls(): HTMLInputElement[] {
    return [
      ...this.renderRoot.querySelectorAll<HTMLInputElement>('[data-answer-control]:not(:disabled)'),
    ];
  }

  #syncNativeAnswerState(): void {
    const question = this.#activeQuestion();
    if (!question) return;
    const answer = this.#answers[question.name],
      selected = new Set(Array.isArray(answer) ? answer : answer ? [answer] : []);
    for (const input of this.renderRoot.querySelectorAll<HTMLInputElement>(
      '[data-answer-control]',
    )) {
      if (input.matches('.free-answer')) input.value = this.#state.inputValue(question);
      else input.checked = selected.has(input.value);
    }
  }

  #focusQuestion(name: string, reportValidity: boolean): void {
    if (name !== this.#active) return;
    const controls = this.#answerControls();
    const filled = controls.find((control) =>
      control.type === 'checkbox' || control.type === 'radio'
        ? control.checked
        : Boolean(control.name && control.value.trim()),
    );
    const target = filled ?? controls[0] ?? this.renderRoot.querySelector<HTMLElement>('fieldset');
    target?.focus();
    if (
      reportValidity &&
      this.nativeValidation === 'enabled' &&
      target instanceof HTMLInputElement &&
      !target.checkValidity()
    )
      target.reportValidity();
  }

  #form(): HTMLFormElement | null {
    return this.renderRoot.querySelector('form');
  }

  #configurationError(): string | null {
    const names = new Set<string>();
    for (const question of this.questions) {
      if (!question.name) return 'Questionnaire questions require non-empty names.';
      if (names.has(question.name))
        return `Questionnaire question names must be unique: "${question.name}".`;
      names.add(question.name);
      const kind = questionnaireQuestionKind(question, this.choiceMode);
      if (kind !== 'text' && !question.choices?.length)
        return `Questionnaire choice question "${question.name}" requires choices.`;
      const values = new Set<string>();
      for (const choice of question.choices ?? []) {
        if (!choice.value) return `Questionnaire choices require non-empty values.`;
        if (values.has(choice.value))
          return `Questionnaire choice values must be unique in "${question.name}".`;
        values.add(choice.value);
      }
    }
    return null;
  }

  #diagnose(message: string): void {
    if (!message || message === this.#lastDiagnostic) return;
    this.#lastDiagnostic = message;
    queueMicrotask(() =>
      this.diagnose('questionnaire-invalid-configuration', message, { severity: 'error' }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-questionnaire': TpQuestionnaire;
  }
}
