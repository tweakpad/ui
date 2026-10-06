import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { progressAppearance } from '../recipes/progress.js';

const definition: ComponentDefinition = {
  name: 'Progress',
  tagName: 'tp-progress',
  kind: 'compound-reexport',
  sourceNode: 'ucl21-progress',
  axes: [],
  parts: [
    {
      name: 'progress',
      publicName: 'Root',
      presentationKeys: ['progress'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'progress-label',
      publicName: 'Label',
      presentationKeys: ['progress-label'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'progress-value-output',
      publicName: 'Value output',
      presentationKeys: ['progress-value-output'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'progress-track',
      publicName: 'Track',
      presentationKeys: ['progress-track'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'progress-indicator',
      publicName: 'Indicator',
      presentationKeys: ['progress-indicator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const progressPresentation = definePresentation({
  definition,
  bindings: {
    'tp-progress': {
      '[part~="progress"]': 'progress',
      '[part~="progress-label"]': 'progress-label',
      '[part~="progress-value-output"]': 'progress-value-output',
      '[part~="progress-track"]': 'progress-track',
      '[part~="progress-indicator"]': 'progress-indicator',
    },
  },
  sources: [progressAppearance],
});
