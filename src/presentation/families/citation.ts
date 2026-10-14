import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { citationAppearance } from '../recipes/citation.js';

const definition: ComponentDefinition = {
  name: 'Citation',
  tagName: 'tp-citation',
  kind: 'preset-composition',
  axes: [
    {
      name: 'orientation',
      values: ['vertical', 'horizontal'],
      default: 'vertical',
    },
  ],
  parts: [
    { name: 'citation' },
    { name: 'citation-badge' },
    { name: 'citation-index' },
    { name: 'citation-icon' },
    { name: 'citation-label' },
    { name: 'citation-external' },
    { name: 'citation-preview' },
    { name: 'citation-preview-source' },
    { name: 'citation-preview-title' },
    { name: 'citation-preview-description' },
    { name: 'citation-list', axes: ['orientation'] },
  ],
};

/** The chip is the composed Badge; Citation adds the number, mark, label and preview rows. */
export const citationPresentation = definePresentation({
  definition,
  bindings: {
    'tp-citation': {
      ':host': 'citation',
    },
  },
  sources: [citationAppearance],
});
