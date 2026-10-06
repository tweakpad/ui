import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dialogFamilyAppearance } from '../recipes/core/dialog-family.js';

const definition: ComponentDefinition = {
  name: 'Dialog',
  tagName: 'tp-dialog',
  kind: 'flattening-compound',
  sourceNode: 'ucl19-dialog',
  axes: [],
  parts: [
    {
      name: 'dialog',
      publicName: 'Root',
      presentationKeys: ['dialog'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'dialog-trigger',
      publicName: 'Trigger',
      presentationKeys: ['dialog-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-portal',
      publicName: 'Portal',
      presentationKeys: ['dialog-portal'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-overlay',
      publicName: 'Overlay',
      presentationKeys: ['dialog-overlay'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-content',
      publicName: 'Content',
      presentationKeys: ['dialog-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-header',
      publicName: 'Header',
      presentationKeys: ['dialog-header'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-title',
      publicName: 'Title',
      presentationKeys: ['dialog-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-description',
      publicName: 'Description',
      presentationKeys: ['dialog-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-footer',
      publicName: 'Footer',
      presentationKeys: ['dialog-footer'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'dialog-close',
      publicName: 'Close',
      presentationKeys: ['dialog-close'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const dialogPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('dialog')],
});
