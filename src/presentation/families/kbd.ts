import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { kbdAppearance } from '../recipes/kbd.js';

const definition: ComponentDefinition = {
  name: 'Kbd',
  tagName: 'tp-kbd',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'kbd',
      description: 'The keycap, a native keyboard-input element.',
    },
    {
      name: 'kbd-group',
      description: 'The native keyboard-input element around the keys of a shortcut.',
    },
  ],
};

export const kbdPresentation = definePresentation({
  definition,
  bindings: {
    'tp-kbd': {
      kbd: 'kbd',
    },
    'tp-kbd-group': {
      kbd: 'kbd-group',
    },
  },
  sources: [kbdAppearance],
});
