import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { inputCoreAppearance } from '../recipes/core/surfaces.js';
import { inputAppearance } from '../recipes/input.js';

const definition: ComponentDefinition = {
  name: 'Input',
  tagName: 'tp-input',
  kind: 'compound-reexport',
  axes: [
    {
      // inline: one compact row with the label at the start and the value at the end.
      name: 'variant',
      values: ['default', 'inline'],
      default: 'default',
    },
  ],
  parts: [
    {
      name: 'input',
      description: "The native input, rendered in the page's own tree.",
      axes: ['variant'],
    },
    {
      name: 'input-row',
      description: 'The row of an inline Input around its label and editor.',
      axes: ['variant'],
    },
    {
      name: 'input-label',
      description: "The label at the start of an inline Input's row.",
      axes: ['variant'],
    },
    {
      name: 'input-stepper',
      description:
        "The decrement and increment Buttons at the end of an inline number Input's row, in place of the browser's spin buttons.",
      axes: ['variant'],
    },
    {
      name: 'input-decrement',
      description: 'The Button that steps an inline number Input down.',
      axes: ['variant'],
    },
    {
      name: 'input-increment',
      description: 'The Button that steps an inline number Input up.',
      axes: ['variant'],
    },
    {
      name: 'input-prefix',
      description:
        'Reserved for content before the editor; the Input renders none, so such content goes in an Input group.',
    },
    {
      name: 'input-suffix',
      description:
        'Reserved for content after the editor; the Input renders none, so such content goes in an Input group.',
    },
  ],
};

export const inputPresentation = definePresentation({
  definition,
  bindings: {
    'tp-input': {
      input: 'input',
      '[part~="input-row"]': 'input-row',
      '[part~="input-label"]': 'input-label',
      '[part~="input-stepper"]': 'input-stepper',
      '[part~="input-decrement"]': 'input-decrement',
      '[part~="input-increment"]': 'input-increment',
    },
  },
  sources: [inputCoreAppearance, inputAppearance],
});
