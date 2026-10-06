import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { iconAppearance } from '../recipes/icon.js';
import { iconCoreAppearance } from '../recipes/core/icon.js';

const definition: ComponentDefinition = {
  name: 'Icon',
  tagName: 'tp-icon',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-icon',
  axes: [],
  parts: [
    {
      name: 'icon',
      publicName: 'Root',
      presentationKeys: ['icon', 'icon-decorative', 'icon-named'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'icon-graphic',
      publicName: 'Graphic',
      presentationKeys: ['icon-graphic'],
      cardinality: 'zero or one descendant of Root; present when Icon resolves',
    },
  ],
};

export const iconPresentation = definePresentation({
  definition,
  sources: [iconAppearance, iconCoreAppearance],
});
