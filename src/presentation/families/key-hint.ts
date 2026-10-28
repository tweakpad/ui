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
      description: 'The keycap, a native keyboard-input element.',
    },
    {
      name: 'key-hint-group',
      description: 'The native keyboard-input element around the keys of a shortcut.',
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
