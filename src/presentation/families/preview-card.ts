import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { previewCardCoreAppearance } from '../recipes/core/anchored.js';

const definition: ComponentDefinition = {
  name: 'Preview card',
  tagName: 'tp-preview-card',
  kind: 'flattening-compound',
  sourceNode: 'ucl19-preview-card',
  axes: [],
  parts: [
    {
      name: 'preview-card',
      publicName: 'Root',
      presentationKeys: ['preview-card'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'preview-card-trigger',
      publicName: 'Trigger',
      presentationKeys: ['preview-card-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'preview-card-content',
      publicName: 'Content',
      presentationKeys: ['preview-card-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'preview-card-positioner',
      publicName: 'Positioner',
      presentationKeys: ['preview-card-positioner'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'preview-card-portal',
      publicName: 'Portal',
      presentationKeys: ['preview-card-portal'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const previewCardPresentation = definePresentation({
  definition,
  sources: [previewCardCoreAppearance],
});
