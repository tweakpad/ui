import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { questionnaireAppearance } from '../recipes/questionnaire.js';

const definition: ComponentDefinition = {
  name: 'Questionnaire',
  tagName: 'tp-questionnaire',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'questionnaire',
    },
    {
      name: 'questionnaire-progress',
    },
    {
      name: 'questionnaire-question',
    },
    {
      name: 'questionnaire-title',
    },
    {
      name: 'questionnaire-description',
    },
    {
      name: 'questionnaire-choices',
    },
    {
      name: 'questionnaire-choice',
    },
    {
      name: 'questionnaire-input-region',
    },
    {
      name: 'questionnaire-error',
    },
    {
      name: 'questionnaire-actions',
    },
  ],
};

export const questionnairePresentation = definePresentation({
  definition,
  bindings: {
    'tp-questionnaire': {
      form: 'questionnaire',
      fieldset: 'questionnaire-question',
      "[part='questionnaire-progress']": 'questionnaire-progress',
      "[part='questionnaire-title']": 'questionnaire-title',
      "[part='questionnaire-description']": 'questionnaire-description',
      "[part='questionnaire-choices']": 'questionnaire-choices',
      "[part='questionnaire-choice']": 'questionnaire-choice',
      "[part='questionnaire-error']": 'questionnaire-error',
      "[part='questionnaire-actions']": 'questionnaire-actions',
    },
  },
  sources: [questionnaireAppearance],
});
