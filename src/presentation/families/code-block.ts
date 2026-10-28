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
    },
    {
      name: 'code-block-header',
    },
    {
      name: 'code-block-title',
    },
    {
      name: 'code-block-language',
    },
    {
      name: 'code-block-copy',
    },
    {
      name: 'code-block-viewport',
    },
    {
      name: 'code-block-line',
    },
    {
      name: 'code-block-line-number',
    },
    {
      name: 'code-block-line-marker',
    },
    {
      name: 'code-block-token',
    },
    {
      name: 'code-block-expand',
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
