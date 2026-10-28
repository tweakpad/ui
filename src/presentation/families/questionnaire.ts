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
      description: 'The native form that holds the question on screen and the submitted answers.',
    },
    {
      name: 'questionnaire-progress',
      description:
        'The progress indicator, with the position of the question on screen and the total.',
    },
    {
      name: 'questionnaire-question',
      description: 'The native fieldset of the question on screen.',
    },
    {
      name: 'questionnaire-title',
      description: 'The legend that names the question.',
    },
    {
      name: 'questionnaire-description',
      description: "The help text below the question's title.",
    },
    {
      name: 'questionnaire-choices',
      description: 'The list of choices, with the free-text input when the question has one.',
    },
    {
      name: 'questionnaire-choice',
      description: 'One choice: its radio or checkbox, label, description and shortcut.',
    },
    {
      name: 'questionnaire-input-region',
      description: 'The free-text input of the question.',
    },
    {
      name: 'questionnaire-error',
      description: 'The error message of the question, announced as an alert.',
    },
    {
      name: 'questionnaire-actions',
      description: 'The row of Previous, Skip, Next and Submit Buttons.',
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
