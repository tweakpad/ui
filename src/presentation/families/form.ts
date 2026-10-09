import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { formAppearance } from '../recipes/form.js';

const definition: ComponentDefinition = {
  name: 'Form',
  tagName: 'tp-form',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'form',
    },
    {
      name: 'form-error-summary',
    },
    {
      name: 'form-actions',
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
