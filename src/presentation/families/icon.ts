import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { iconAppearance } from '../recipes/icon.js';
import { iconCoreAppearance } from '../recipes/core/icon.js';

const definition: ComponentDefinition = {
  name: 'Icon',
  tagName: 'tp-icon',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'icon',
    },
    {
      name: 'icon-graphic',
    },
  ],
};

export const iconPresentation = definePresentation({
  definition,
  sources: [iconAppearance, iconCoreAppearance],
});
