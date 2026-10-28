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
      description: 'The navigation landmark around the trail.',
    },
    {
      name: 'breadcrumb-ordered-list',
      description: 'The ordered list of steps.',
    },
    {
      name: 'breadcrumb-item',
      description: 'The list item around each step.',
    },
    {
      name: 'breadcrumb-link',
      description: "An ancestor link: the caller's own anchor, outside any composed Menu.",
    },
    {
      name: 'breadcrumb-current-page',
      description: 'The step marked as the current page.',
    },
    {
      name: 'breadcrumb-separator',
      description: 'The separator between two steps, hidden from assistive technology.',
    },
    {
      name: 'breadcrumb-ellipsis',
      description:
        'A child marked `data-breadcrumb-ellipsis`: a decorative mark for omitted ancestors.',
    },
  ],
};

export const breadcrumbPresentation = definePresentation({
  definition,
  sources: [breadcrumbAppearance],
});
