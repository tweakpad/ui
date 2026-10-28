import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { collapsibleAppearance } from '../recipes/collapsible.js';
import { collapsibleCoreAppearance } from '../recipes/core/collapsible.js';
import {
  navigationPanelDisclosureAppearance,
  navigationPanelDisclosureStructure,
} from '../recipes/navigation-panel-disclosure.js';

const definition: ComponentDefinition = {
  name: 'Collapsible',
  tagName: 'tp-collapsible',
  kind: 'compound-reexport',
  axes: [],
  parts: [
    {
      name: 'collapsible',
      description: 'The root around the trigger and the content.',
    },
    {
      name: 'collapsible-heading',
      description: 'The wrapper of the trigger, a heading when `heading-level` is set.',
    },
    {
      name: 'collapsible-trigger',
      description: 'The native button that opens and closes the content.',
    },
    {
      name: 'collapsible-leading',
      description: 'The region before the label: the `leading` slot or the chevron.',
    },
    {
      name: 'collapsible-label',
      description: 'The trigger text.',
    },
    {
      name: 'collapsible-trailing',
      description: 'The region after the label: the `trailing` slot or the chevron.',
    },
    {
      name: 'collapsible-content',
      description: 'The region shown when open, whose block size animates.',
    },
    {
      name: 'collapsible-content-body',
      description:
        'The inner box of the content; put padding here so it is measured with the content.',
    },
  ],
};

export const collapsiblePresentation = definePresentation({
  definition,
  structure: navigationPanelDisclosureStructure,
  sources: [collapsibleAppearance, collapsibleCoreAppearance, navigationPanelDisclosureAppearance],
});
