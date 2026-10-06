import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { keyHintAppearance } from '../recipes/key-hint.js';

const definition: ComponentDefinition = {
  name: 'Key hint',
  tagName: 'tp-key-hint',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-key-hint',
  axes: [],
  parts: [
    {
      name: 'key-hint',
      publicName: 'Key',
      presentationKeys: ['key-hint'],
      cardinality:
        'exactly one public owner host per Key instance; standalone or an ordered child of Group',
    },
    {
      name: 'key-hint-group',
      publicName: 'Group',
      presentationKeys: ['key-hint-group'],
      cardinality:
        'optional parent group host containing an ordered sequence of Key instances; groups may be nested to describe sequences',
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
