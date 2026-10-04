import type { TpValueChangeEvent } from './events.js';
export type QuestionnaireFlow = 'linear' | 'free';
export type QuestionnaireChoiceMode = 'single' | 'multiple';
export type QuestionnaireQuestionKind = QuestionnaireChoiceMode | 'text';
export type QuestionnaireAnswer = string | string[];
export type QuestionnaireAnswers = Record<string, QuestionnaireAnswer>;
export type QuestionnaireStatus = 'unanswered' | 'answered' | 'skipped';
export type QuestionnaireShortcutMode = 'none' | 'letters' | 'numbers';

export interface QuestionnaireChoice {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  defaultChecked?: boolean;
  checked?: boolean;
  onCheckedChange?: (event: TpValueChangeEvent<boolean>) => void;
  shortcut?: string;
}

export interface QuestionnaireInput {
  label?: string;
  value?: string;
  defaultValue?: string;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  min?: string | number;
  max?: string | number;
  step?: string | number;
  autocomplete?: string;
  inputMode?: string;
  enterKeyHint?: string;
  autocapitalize?: string;
  spellcheck?: boolean;
  readOnly?: boolean;
  onValueChange?: (event: TpValueChangeEvent<string>) => void;
}
export interface QuestionnaireQuestion {
  name: string;
  title: string;
  description?: string;
  kind?: QuestionnaireQuestionKind;
  required?: boolean;
  skippable?: boolean;
  disabled?: boolean;
  choices?: readonly QuestionnaireChoice[];
  input?: QuestionnaireInput;
  invalid?: boolean;
  error?: string;
  onStatusChange?: (status: QuestionnaireStatus) => void;
  defaultValue?: QuestionnaireAnswer;
  inputType?: string;
  placeholder?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  validate?: (answer: QuestionnaireAnswer | undefined) => string | null;
}

export function questionnaireQuestionKind(
  question: QuestionnaireQuestion,
  defaultChoiceMode: QuestionnaireChoiceMode = 'single',
): QuestionnaireQuestionKind {
  return question.kind ?? (question.choices ? defaultChoiceMode : 'text');
}

export function normalizeQuestionnaireAnswer(
  question: QuestionnaireQuestion,
  answer: QuestionnaireAnswer | undefined,
  defaultChoiceMode: QuestionnaireChoiceMode = 'single',
): QuestionnaireAnswer | undefined {
  const kind = questionnaireQuestionKind(question, defaultChoiceMode);
  if (kind === 'multiple') {
    if (answer === undefined) return undefined;
    const candidates = Array.isArray(answer) ? answer : typeof answer === 'string' ? [answer] : [];
    const allowed = new Set(
      question.choices?.filter((choice) => !choice.disabled).map((choice) => choice.value) ?? [],
    );
    return [
      ...new Set(
        candidates.filter((value) =>
          question.input
            ? !question.choices?.some((choice) => choice.disabled && choice.value === value)
            : allowed.has(value),
        ),
      ),
    ];
  }
  const candidate =
    typeof answer === 'string' ? answer : Array.isArray(answer) ? answer[0] : undefined;
  if (
    kind === 'single' &&
    candidate !== undefined &&
    candidate !== '' &&
    question.choices?.length
  ) {
    return question.choices.some((choice) => choice.value === candidate && choice.disabled)
      ? undefined
      : question.input || question.choices.some((choice) => choice.value === candidate)
        ? candidate
        : undefined;
  }
  return candidate;
}

export function normalizeQuestionnaireAnswers(
  questions: readonly QuestionnaireQuestion[],
  answers: Readonly<QuestionnaireAnswers> | undefined,
  defaultChoiceMode: QuestionnaireChoiceMode = 'single',
): QuestionnaireAnswers {
  const normalized: QuestionnaireAnswers = {};
  if (!answers) return normalized;
  for (const question of questions) {
    if (!question.name || !(question.name in answers)) continue;
    const answer = normalizeQuestionnaireAnswer(
      question,
      answers[question.name],
      defaultChoiceMode,
    );
    if (answer !== undefined) normalized[question.name] = answer;
  }
  return normalized;
}

export function questionnaireDefaultAnswers(
  questions: readonly QuestionnaireQuestion[],
  defaults: Readonly<QuestionnaireAnswers> | undefined,
  defaultChoiceMode: QuestionnaireChoiceMode = 'single',
): QuestionnaireAnswers {
  const result: QuestionnaireAnswers = {};
  for (const question of questions) {
    const kind = questionnaireQuestionKind(question, defaultChoiceMode);
    let candidate = defaults?.[question.name] ?? question.defaultValue;
    if (candidate === undefined && question.choices?.length) {
      const checked = question.choices
        .filter((choice) => choice.defaultChecked && !choice.disabled)
        .map((choice) => choice.value);
      if (checked.length) candidate = kind === 'multiple' ? checked : checked[0];
    }
    if (
      question.input?.defaultValue?.trim() &&
      defaults?.[question.name] === undefined &&
      question.defaultValue === undefined
    ) {
      if (kind === 'multiple')
        candidate = [
          ...(Array.isArray(candidate) ? candidate : candidate ? [candidate] : []),
          question.input.defaultValue,
        ];
      else candidate ??= question.input.defaultValue;
    }
    const answer = normalizeQuestionnaireAnswer(question, candidate, defaultChoiceMode);
    if (answer !== undefined) result[question.name] = answer;
  }
  return result;
}

export function questionnaireAnswered(answer: QuestionnaireAnswer | undefined): boolean {
  return Array.isArray(answer) ? answer.length > 0 : Boolean(answer?.trim());
}

export function questionnaireStatus(
  answer: QuestionnaireAnswer | undefined,
  skipped: boolean,
): QuestionnaireStatus {
  if (questionnaireAnswered(answer)) return 'answered';
  return skipped ? 'skipped' : 'unanswered';
}

export function sameQuestionnaireAnswers(
  left: Readonly<QuestionnaireAnswers>,
  right: Readonly<QuestionnaireAnswers>,
): boolean {
  const leftKeys = Object.keys(left);
  const rightKeys = Object.keys(right);
  if (leftKeys.length !== rightKeys.length) return false;
  return leftKeys.every((key) => {
    const leftValue = left[key];
    const rightValue = right[key];
    return Array.isArray(leftValue) && Array.isArray(rightValue)
      ? leftValue.length === rightValue.length &&
          leftValue.every((value, index) => value === rightValue[index])
      : leftValue === rightValue;
  });
}

export function questionnaireRemovalFallback(
  previousOrder: readonly string[],
  nextOrder: readonly string[],
  active: string,
): string {
  if (nextOrder.includes(active)) return active;
  const previousIndex = previousOrder.indexOf(active);
  if (previousIndex < 0) return nextOrder[0] ?? '';
  return nextOrder[previousIndex] ?? nextOrder[previousIndex - 1] ?? '';
}
