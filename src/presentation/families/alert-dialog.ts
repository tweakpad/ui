import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dialogFamilyAppearance } from '../recipes/core/dialog-family.js';

const definition: ComponentDefinition = {
  name: 'Alert dialog',
  tagName: 'tp-alert-dialog',
  kind: 'flattening-compound',
  sourceNode: 'ucl19-alert-dialog',
  axes: [],
  parts: [
    {
      name: 'alert-dialog',
      publicName: 'Root',
      presentationKeys: ['alert-dialog'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'alert-dialog-trigger',
      publicName: 'Trigger',
      presentationKeys: ['alert-dialog-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-portal',
      publicName: 'Portal',
      presentationKeys: ['alert-dialog-portal'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-overlay',
      publicName: 'Overlay',
      presentationKeys: ['alert-dialog-overlay'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-content',
      publicName: 'Content',
      presentationKeys: ['alert-dialog-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-header',
      publicName: 'Header',
      presentationKeys: ['alert-dialog-header'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-media',
      publicName: 'Media',
      presentationKeys: ['alert-dialog-media'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-title',
      publicName: 'Title',
      presentationKeys: ['alert-dialog-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-description',
      publicName: 'Description',
      presentationKeys: ['alert-dialog-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-actions',
      publicName: 'Actions',
      presentationKeys: ['alert-dialog-actions'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-confirm',
      publicName: 'Confirm',
      presentationKeys: ['alert-dialog-confirm'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'alert-dialog-cancel',
      publicName: 'Cancel',
      presentationKeys: ['alert-dialog-cancel'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const alertDialogPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('alert-dialog')],
});
