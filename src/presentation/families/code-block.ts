import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { codeBlockAppearance } from '../recipes/code-block.js';

const definition: ComponentDefinition = {
  name: 'Code block',
  tagName: 'tp-code-block',
  kind: 'presentational-primitive',
  parts: [
    {
      name: 'code-block',
      description: 'The figure.',
    },
    {
      name: 'code-block-header',
      description: 'The title row with the language and the copy action.',
    },
    {
      name: 'code-block-title',
      description: 'The title.',
    },
    {
      name: 'code-block-language',
      description: 'The language name.',
    },
    {
      name: 'code-block-copy',
      description: 'The copy action and its tooltip.',
    },
    {
      name: 'code-block-viewport',
      description: 'The scrollable code.',
    },
    {
      name: 'code-block-line',
      description: 'One source line.',
    },
    {
      name: 'code-block-line-number',
      description: 'The line number gutter cell.',
    },
    {
      name: 'code-block-line-marker',
      description: 'The marker of an added or removed line.',
    },
    {
      name: 'code-block-token',
      description: 'A colored token.',
    },
    {
      name: 'code-block-expand',
      description: 'The row with the Expand control.',
    },
  ],
};

export const codeBlockPresentation = definePresentation({
  definition,
  bindings: {
    'tp-code-block': {
      "[part~='code-block']": 'code-block',
      "[part~='header']": 'code-block-header',
      "[part~='title']": 'code-block-title',
      "[part~='language']": 'code-block-language',
      '.copy': 'code-block-copy',
      "[part~='viewport']": 'code-block-viewport',
      "[part~='line']": 'code-block-line',
      "[part~='line-number']": 'code-block-line-number',
      "[part~='line-marker']": 'code-block-line-marker',
      "[part~='token']": 'code-block-token',
      "[part~='expand']": 'code-block-expand',
    },
  },
  sources: [codeBlockAppearance],
});
