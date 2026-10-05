import type { QuestionnaireQuestion } from '../components/questionnaire/index.js';
export function setupQuestionnaireExample(
  root: HTMLElement,
  questions: readonly QuestionnaireQuestion[],
  kind: string,
  submitLabel: string,
): () => void;
