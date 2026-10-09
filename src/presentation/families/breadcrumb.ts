import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { breadcrumbAppearance } from '../recipes/breadcrumb.js';

const definition: ComponentDefinition = {
  name: 'Breadcrumb',
  tagName: 'tp-breadcrumb',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'breadcrumb',
    },
    {
      name: 'breadcrumb-ordered-list',
    },
    {
      name: 'breadcrumb-item',
    },
    {
      name: 'breadcrumb-link',
    },
    {
      name: 'breadcrumb-current-page',
    },
    {
      name: 'breadcrumb-separator',
    },
    {
      name: 'breadcrumb-ellipsis',
    },
  ],
};

export const breadcrumbPresentation = definePresentation({
  definition,
  sources: [breadcrumbAppearance],
});
