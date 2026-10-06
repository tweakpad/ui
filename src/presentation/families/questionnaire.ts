import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { questionnaireAppearance } from '../recipes/questionnaire.js';

const definition: ComponentDefinition = {
  name: 'Questionnaire',
  tagName: 'tp-questionnaire',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-questionnaire',
  axes: [],
  parts: [
    {
      name: 'questionnaire',
      publicName: 'Root',
      presentationKeys: ['questionnaire'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'questionnaire-progress',
      publicName: 'Progress',
      presentationKeys: ['questionnaire-progress'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-question',
      publicName: 'Question',
      presentationKeys: ['questionnaire-question'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-title',
      publicName: 'Title',
      presentationKeys: ['questionnaire-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-description',
      publicName: 'Description',
      presentationKeys: ['questionnaire-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-choices',
      publicName: 'Choices',
      presentationKeys: ['questionnaire-choices'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-choice',
      publicName: 'Choice',
      presentationKeys: ['questionnaire-choice'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'questionnaire-input-region',
      publicName: 'Input region',
      presentationKeys: ['questionnaire-input-region'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-error',
      publicName: 'Error',
      presentationKeys: ['questionnaire-error'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'questionnaire-actions',
      publicName: 'Actions',
      presentationKeys: ['questionnaire-actions'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
