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
  sourceNode: 'ucl16-collapsible',
  axes: [],
  parts: [
    {
      name: 'collapsible',
      publicName: 'Root',
      presentationKeys: ['collapsible'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'collapsible-heading',
      publicName: 'Heading',
      presentationKeys: ['collapsible-heading'],
      cardinality: 'zero or one descendant of Root; headingLevel determines semantics',
    },
    {
      name: 'collapsible-trigger',
      publicName: 'Trigger',
      presentationKeys: ['collapsible-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'collapsible-leading',
      publicName: 'Leading',
      presentationKeys: ['collapsible-leading'],
      cardinality:
        'exactly one descendant of Trigger; accepts zero or more nodes from the leading slot',
    },
    {
      name: 'collapsible-label',
      publicName: 'Label',
      presentationKeys: ['collapsible-label'],
      cardinality: 'exactly one descendant of Trigger; receives the label slot',
    },
    {
      name: 'collapsible-trailing',
      publicName: 'Trailing',
      presentationKeys: ['collapsible-trailing'],
      cardinality:
        'exactly one descendant of Trigger; accepts zero or more nodes from the trailing slot',
    },
    {
      name: 'collapsible-content',
      publicName: 'Content',
      presentationKeys: ['collapsible-content'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'collapsible-content-body',
      publicName: 'ContentBody',
      presentationKeys: ['collapsible-content-body'],
      cardinality: 'exactly one descendant of Content',
    },
  ],
};

export const collapsiblePresentation = definePresentation({
  definition,
  structure: navigationPanelDisclosureStructure,
  sources: [collapsibleAppearance, collapsibleCoreAppearance, navigationPanelDisclosureAppearance],
});
