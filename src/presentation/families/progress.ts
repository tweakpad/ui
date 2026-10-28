import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { progressAppearance } from '../recipes/progress.js';

const definition: ComponentDefinition = {
  name: 'Progress',
  tagName: 'tp-progress',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'progress',
    },
    {
      name: 'progress-label',
    },
    {
      name: 'progress-value-output',
    },
    {
      name: 'progress-track',
    },
    {
      name: 'progress-indicator',
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
