import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { formAppearance } from '../recipes/form.js';

const definition: ComponentDefinition = {
  name: 'Form',
  tagName: 'tp-form',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-form',
  nonVisualParts: ['Field registry'],
  axes: [],
  parts: [
    {
      name: 'form',
      publicName: 'Root',
      presentationKeys: ['form'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'form-error-summary',
      publicName: 'Error summary',
      presentationKeys: ['form-error-summary'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'form-actions',
      publicName: 'Actions',
      presentationKeys: ['form-actions'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const formPresentation = definePresentation({
  definition,
  bindings: {
    'tp-form': {
      form: 'form',
      'form > [slot="actions"]': 'form-actions',
      'form > [slot="error-summary"]': 'form-error-summary',
    },
  },
  structure: {
    form: [
      {
        declarations: {
          display: 'flex',
          'flex-direction': 'column',
          'min-inline-size': '0',
        },
      },
      {
        selector: 'tp-form:has(> &)',
        declarations: {
          'min-inline-size': '0',
        },
      },
    ],
    'form-actions': [
      {
        declarations: {
          display: 'flex',
          'flex-wrap': 'wrap',
          'align-items': 'center',
        },
      },
    ],
  },
  sources: [formAppearance],
});
