import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { keyHintAppearance } from '../recipes/key-hint.js';

const definition: ComponentDefinition = {
  name: 'Key hint',
  tagName: 'tp-key-hint',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'key-hint',
    },
    {
      name: 'key-hint-group',
    },
  ],
};

export const keyHintPresentation = definePresentation({
  definition,
  bindings: {
    'tp-key-hint': {
      kbd: 'key-hint',
    },
    'tp-key-hint-group': {
      kbd: 'key-hint-group',
    },
  },
  sources: [keyHintAppearance],
});
