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
      description: 'The native form element the Form moves its children into.',
    },
    {
      name: 'form-error-summary',
      description: 'A child with `slot="error-summary"`, laid out as the summary of errors.',
    },
    {
      name: 'form-actions',
      description:
        'A child with `slot="actions"`, laid out as the row of submit and reset Buttons.',
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
