import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { popoverAppearance } from '../recipes/popover.js';

const definition: ComponentDefinition = {
  name: 'Popover',
  tagName: 'tp-popover',
  kind: 'flattening-compound',
  sourceNode: 'ucl19-popover',
  axes: [],
  parts: [
    {
      name: 'popover',
      publicName: 'Root',
      presentationKeys: ['popover'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'popover-trigger',
      publicName: 'Trigger',
      presentationKeys: ['popover-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-anchor',
      publicName: 'Anchor',
      presentationKeys: ['popover-anchor'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-content',
      publicName: 'Content',
      presentationKeys: ['popover-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-header',
      publicName: 'Header',
      presentationKeys: ['popover-header'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-title',
      publicName: 'Title',
      presentationKeys: ['popover-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-description',
      publicName: 'Description',
      presentationKeys: ['popover-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-positioner',
      publicName: 'Positioner',
      presentationKeys: ['popover-positioner'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'popover-portal',
      publicName: 'Portal',
      presentationKeys: ['popover-portal'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const popoverPresentation = definePresentation({
  definition,
  sources: [popoverAppearance],
});
