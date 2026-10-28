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
      description:
        'The progress bar: the element assistive technology reads, around the label, the value and the track.',
    },
    {
      name: 'progress-label',
      description: 'The wrapper of the `label` slot.',
    },
    {
      name: 'progress-value-output',
      description:
        'The wrapper of the visible value, hidden from assistive technology since the bar already reads it.',
    },
    {
      name: 'progress-track',
      description: 'The full range of the bar.',
    },
    {
      name: 'progress-indicator',
      description: 'The fill for the completed share, or the moving fill while indeterminate.',
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
