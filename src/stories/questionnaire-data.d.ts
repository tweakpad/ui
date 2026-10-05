import type { QuestionnaireQuestion } from '../components/questionnaire/index.js';
export const questionnaireData: Record<
  string,
  { questions: QuestionnaireQuestion[]; submit: string }
> & { default: { questions: QuestionnaireQuestion[]; submit: string } };
