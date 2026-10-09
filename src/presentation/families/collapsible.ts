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
    },
    {
      name: 'collapsible-heading',
    },
    {
      name: 'collapsible-trigger',
    },
    {
      name: 'collapsible-leading',
    },
    {
      name: 'collapsible-label',
    },
    {
      name: 'collapsible-trailing',
    },
    {
      name: 'collapsible-content',
    },
    {
      name: 'collapsible-content-body',
    },
  ],
};

export const collapsiblePresentation = definePresentation({
  definition,
  structure: navigationPanelDisclosureStructure,
  sources: [collapsibleAppearance, collapsibleCoreAppearance, navigationPanelDisclosureAppearance],
});
