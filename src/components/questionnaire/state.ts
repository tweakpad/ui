import type { ReactiveControllerHost } from 'lit';
import {
  ControllableState,
  type StateTransactionProposal,
} from '../../foundation/controllable-state.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import {
  normalizeQuestionnaireAnswers,
  questionnaireDefaultAnswers,
  questionnaireQuestionKind,
  sameQuestionnaireAnswers,
  type QuestionnaireAnswers,
  type QuestionnaireChoiceMode,
  type QuestionnaireQuestion,
} from '../../foundation/questionnaire.js';
interface StateHost extends ReactiveControllerHost, EventTarget {
  questions: readonly QuestionnaireQuestion[];
  choiceMode: QuestionnaireChoiceMode;
  defaultValue: QuestionnaireAnswers;
  defaultItem: string;
  onValueChange: ((event: TpValueChangeEvent<QuestionnaireAnswers>) => void) | undefined;
  onItemChange: ((event: TpValueChangeEvent<string>) => void) | undefined;
}
export interface QuestionnaireMetadata {
  skipped: Set<string>;
  attempted: Set<string>;
  inputSelected: Set<string>;
  reached: number;
}
interface Lane {
  question: string;
  choice: string | undefined;
  state: ControllableState<boolean | string>;
}
const key = (question: string, choice?: string) => JSON.stringify([question, choice ?? null]);
export const cloneAnswers = (answers: QuestionnaireAnswers): QuestionnaireAnswers =>
  Object.fromEntries(
    Object.entries(answers).map(([name, value]) => [
      name,
      Array.isArray(value) ? [...value] : value,
    ]),
  );
/** Exactly one answer owner: supplied aggregate OR constituent value lanes. */
export class QuestionnaireState {
  readonly item: ControllableState<string>;
  #aggregate: ControllableState<QuestionnaireAnswers> | null = null;
  #lanes = new Map<string, Lane>();
  #kinds = new Map<string, string>();
  #initialized = false;
  #inTransaction = false;
  #queue: (() => void)[] = [];
  metadata: QuestionnaireMetadata = {
    skipped: new Set(),
    attempted: new Set(),
    inputSelected: new Set(),
    reached: 0,
  };
  constructor(
    private host: StateHost,
    private readValue: () => QuestionnaireAnswers | undefined,
    private readItem: () => string | undefined,
    private changed: () => void,
    private diagnostic: (message: string) => void,
  ) {
    this.item = new ControllableState({
      host,
      initialValue: '',
      readControlledValue: readItem,
      readDefaultValue: () => this.initialItem,
      eventFactory: (value, previous, reason, source, options) =>
        new TpValueChangeEvent(value, previous, reason, source, options, 'tp-item-change'),
      onChange: (event) => host.onItemChange?.(event),
      onCommit: changed,
      diagnostic,
    });
  }
  get questions(): QuestionnaireQuestion[] {
    const names = new Set<string>();
    return this.host.questions.filter(
      (q) => !q.disabled && q.name && !names.has(q.name) && Boolean(names.add(q.name)),
    );
  }
  get initialItem(): string {
    return (
      this.questions.find((q) => q.name === this.host.defaultItem)?.name ??
      this.questions[0]?.name ??
      ''
    );
  }
  get aggregateControlled(): boolean {
    return this.#aggregate !== null;
  }
  initialize(): void {
    if (this.#initialized) return;
    this.#initialized = true;
    if (this.readValue() !== undefined) {
      this.#aggregate = new ControllableState({
        host: this.host,
        initialValue: {},
        readControlledValue: this.readValue,
        equals: sameQuestionnaireAnswers,
        onChange: (e) => this.host.onValueChange?.(e),
        onCommit: this.changed,
        diagnostic: this.diagnostic,
      });
      this.#aggregate.initialize();
    }
    this.reconcile();
    this.item.initialize();
    this.metadata.reached = Math.max(
      0,
      this.questions.findIndex((q) => q.name === this.item.value),
    );
  }
  syncValue(): void {
    this.#aggregate?.sync();
  }
  syncItem(): void {
    this.item.sync();
  }
  get answers(): QuestionnaireAnswers {
    if (this.#aggregate)
      return normalizeQuestionnaireAnswers(
        this.questions,
        this.#aggregate.value,
        this.host.choiceMode,
      );
    return this.#derive(new Map(), this.metadata);
  }
  get defaults(): QuestionnaireAnswers {
    return questionnaireDefaultAnswers(
      this.questions,
      this.host.defaultValue,
      this.host.choiceMode,
    );
  }
  metadataCopy(): QuestionnaireMetadata {
    return {
      ...this.metadata,
      skipped: new Set(this.metadata.skipped),
      attempted: new Set(this.metadata.attempted),
      inputSelected: new Set(this.metadata.inputSelected),
    };
  }
  #definition(lane: Lane) {
    const question = this.host.questions.find((q) => q.name === lane.question);
    return lane.choice === undefined
      ? question?.input
      : question?.choices?.find((c) => c.value === lane.choice);
  }
  #controlled(lane: Lane): boolean | string | undefined {
    const definition = this.#definition(lane);
    return lane.choice === undefined
      ? (definition as QuestionnaireQuestion['input'])?.value
      : (definition as NonNullable<QuestionnaireQuestion['choices']>[number])?.checked;
  }
  #default(lane: Lane): boolean | string {
    const answer = this.defaults[lane.question];
    if (lane.choice !== undefined)
      return Array.isArray(answer) ? answer.includes(lane.choice) : answer === lane.choice;
    const q = this.questions.find((q) => q.name === lane.question);
    const choices = new Set(q?.choices?.map((c) => c.value));
    return (
      (Array.isArray(answer)
        ? answer.find((v) => !choices.has(v))
        : answer && !choices.has(answer)
          ? answer
          : undefined) ??
      q?.input?.defaultValue ??
      ''
    );
  }
  reconcile(): void {
    if (!this.#initialized) return;
    if (this.#aggregate) {
      this.#aggregate.hostUpdate();
      if (
        this.questions.some(
          (q) => q.input?.value !== undefined || q.choices?.some((c) => c.checked !== undefined),
        )
      )
        this.diagnostic(
          'Controlled aggregate answers cannot be combined with controlled choice/input values.',
        );
      return;
    }
    if (this.readValue() !== undefined)
      this.diagnostic('Questionnaire answer ownership cannot change after initialization.');
    const next = new Set<string>();
    for (const q of this.questions) {
      const definitions = [
        ...(q.choices ?? []).map((c) => c.value),
        ...(q.input || questionnaireQuestionKind(q, this.host.choiceMode) === 'text'
          ? [undefined]
          : []),
      ];
      for (const choice of definitions) {
        const id = key(q.name, choice);
        next.add(id);
        let lane = this.#lanes.get(id);
        if (!lane) {
          lane = { question: q.name, choice, state: null! };
          const own = lane;
          lane.state = new ControllableState<boolean | string>({
            host: this.host,
            initialValue: choice === undefined ? '' : false,
            readControlledValue: () => this.#controlled(own),
            readDefaultValue: () => this.#default(own),
            eventFactory: (value, previous, reason, source, options) => {
              const event = new TpValueChangeEvent(
                value,
                previous,
                reason,
                source,
                options,
                'tp-answer-change',
              );
              Object.assign(event.detail, { question: own.question, choice: own.choice });
              return event;
            },
            onChange: (event) => {
              const definition = this.#definition(own);
              if (own.choice === undefined)
                (definition as QuestionnaireQuestion['input'])?.onValueChange?.(
                  event as TpValueChangeEvent<string>,
                );
              else
                (
                  definition as NonNullable<QuestionnaireQuestion['choices']>[number]
                )?.onCheckedChange?.(event as TpValueChangeEvent<boolean>);
            },
            onCommit: () => {
              if (!this.#inTransaction && own.state.value) {
                this.metadata.skipped.delete(own.question);
                const question = this.questions.find((q) => q.name === own.question);
                if (
                  own.choice !== undefined &&
                  question &&
                  questionnaireQuestionKind(question, this.host.choiceMode) !== 'multiple'
                )
                  this.metadata.inputSelected.delete(own.question);
              }
              if (!this.#inTransaction && own.choice === undefined) {
                if (String(own.state.value).trim()) this.metadata.inputSelected.add(own.question);
                else this.metadata.inputSelected.delete(own.question);
              }
              this.changed();
            },
            diagnostic: this.diagnostic,
          });
          this.#lanes.set(id, lane);
          lane.state.initialize();
          if (
            choice === undefined &&
            String(lane.state.value).trim() &&
            (questionnaireQuestionKind(q, this.host.choiceMode) === 'multiple' ||
              !q.choices?.some((c) => this.#lanes.get(key(q.name, c.value))?.state.value))
          )
            this.metadata.inputSelected.add(q.name);
        } else lane.state.hostUpdate();
      }
    }
    for (const [id, lane] of this.#lanes)
      if (!next.has(id)) {
        this.host.removeController(lane.state);
        this.#lanes.delete(id);
      }
    const names = new Set(this.questions.map((q) => q.name));
    for (const set of [this.metadata.skipped, this.metadata.attempted, this.metadata.inputSelected])
      for (const name of set) if (!names.has(name)) set.delete(name);
    let narrowed = false;
    for (const q of this.questions) {
      const kind = questionnaireQuestionKind(q, this.host.choiceMode);
      if (this.#kinds.get(q.name) === 'multiple' && kind !== 'multiple') narrowed = true;
      this.#kinds.set(q.name, kind);
    }
    for (const name of this.#kinds.keys()) if (!names.has(name)) this.#kinds.delete(name);
    // Normalize the owned lanes too, so widening again cannot resurrect discarded answers.
    // Controlled constituents still have to acknowledge the same atomic proposal.
    if (narrowed)
      this.change(this.answers, this.item.value, this.metadataCopy(), 'programmatic', undefined, {
        preserveDraft: true,
      });
  }
  inputValue(q: QuestionnaireQuestion): string {
    if (!this.#aggregate) return String(this.#lanes.get(key(q.name))?.state.value ?? '');
    const answer = this.answers[q.name],
      choices = new Set(q.choices?.map((c) => c.value));
    return (
      (Array.isArray(answer)
        ? answer.find((v) => !choices.has(v))
        : answer && !choices.has(answer)
          ? answer
          : '') ?? ''
    );
  }
  #derive(
    values: Map<string, boolean | string>,
    meta: QuestionnaireMetadata,
  ): QuestionnaireAnswers {
    const result: QuestionnaireAnswers = {};
    const read = (id: string) =>
      values.has(id) ? values.get(id) : this.#lanes.get(id)?.state.value;
    for (const q of this.questions) {
      if (meta.skipped.has(q.name)) continue;
      const selected = (q.choices ?? [])
        .filter((c) => !c.disabled && read(key(q.name, c.value)) === true)
        .map((c) => c.value);
      const input = String(read(key(q.name)) ?? '');
      if (meta.inputSelected.has(q.name) && !q.input?.disabled && input.trim())
        selected.push(input);
      const multiple = questionnaireQuestionKind(q, this.host.choiceMode) === 'multiple';
      if (selected.length) result[q.name] = multiple ? selected : selected[0]!;
    }
    return result;
  }
  /** All initiating paths use the same atomic proposal, including skip/reset. */
  change(
    answers: QuestionnaireAnswers,
    item: string,
    metadata: QuestionnaireMetadata,
    reason: ChangeReason,
    sourceEvent?: Event,
    options: {
      input?: { name: string; value: string } | undefined;
      preserveDraft?: boolean;
      reset?: boolean;
    } = {},
  ): boolean {
    this.initialize();
    if (this.#inTransaction) {
      this.#queue.push(() => this.change(answers, item, metadata, reason, sourceEvent, options));
      return false;
    }
    const previous = this.answers;
    const values = new Map<string, boolean | string>();
    const proposals: StateTransactionProposal[] = [];
    if (this.#aggregate)
      proposals.push(this.#aggregate.proposal(cloneAnswers(answers), reason, sourceEvent));
    else {
      for (const q of this.questions) {
        const value = answers[q.name],
          selected = new Set(Array.isArray(value) ? value : value === undefined ? [] : [value]);
        const input = options.input?.name === q.name ? options.input : undefined;
        for (const choice of q.choices ?? []) {
          const id = key(q.name, choice.value),
            lane = this.#lanes.get(id);
          if (!lane) continue;
          values.set(
            id,
            input && questionnaireQuestionKind(q, this.host.choiceMode) !== 'multiple'
              ? false
              : selected.has(choice.value),
          );
        }
        const id = key(q.name),
          lane = this.#lanes.get(id);
        if (lane) {
          const free = [...selected].find((v) => !q.choices?.some((c) => c.value === v));
          const nextInput =
            input?.value ??
            (options.reset
              ? String(this.#default(lane))
              : (free ?? (options.preserveDraft ? String(lane.state.value) : '')));
          values.set(id, nextInput);
          if (input ? Boolean(input.value.trim()) : Boolean(free?.trim()))
            metadata.inputSelected.add(q.name);
          else if (
            !options.preserveDraft ||
            questionnaireQuestionKind(q, this.host.choiceMode) !== 'multiple'
          )
            metadata.inputSelected.delete(q.name);
        }
      }
      for (const [id, value] of values)
        proposals.push(this.#lanes.get(id)!.state.proposal(value, reason, sourceEvent));
      answers = this.#derive(values, metadata);
    }
    proposals.push(this.item.proposal(item, reason, sourceEvent));
    const changed = !sameQuestionnaireAnswers(previous, answers);
    const event =
      !this.#aggregate && changed
        ? new TpValueChangeEvent(answers, previous, reason, sourceEvent)
        : null;
    const desired = answers;
    return ControllableState.transaction(proposals, {
      changed: true,
      begin: () => {
        this.#inTransaction = true;
        return true;
      },
      dispatch: () => {
        if (event) {
          this.host.onValueChange?.(event);
          this.host.dispatchEvent(event);
        }
      },
      resolve: () => {
        if (event?.defaultPrevented || event?.detail.cancelled) return false;
        if (
          this.#aggregate &&
          changed &&
          !sameQuestionnaireAnswers(this.readValue() ?? {}, desired)
        )
          return false;
        if (this.item.controlled && item !== this.item.value && this.readItem() !== item)
          return false;
        for (const [id, value] of values) {
          const lane = this.#lanes.get(id)!;
          if (
            lane.state.controlled &&
            !Object.is(lane.state.value, value) &&
            !Object.is(this.#controlled(lane), value)
          )
            return false;
        }
        return true;
      },
      publish: () => {
        this.metadata = metadata;
      },
      notify: this.changed,
      end: () => {
        this.#inTransaction = false;
        this.host.requestUpdate();
        const queue = this.#queue.splice(0);
        queue.forEach((run) => run());
      },
    });
  }
}
