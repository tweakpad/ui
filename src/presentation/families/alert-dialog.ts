import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dialogFamilyAppearance } from '../recipes/core/dialog-family.js';

const definition: ComponentDefinition = {
  name: 'Alert dialog',
  tagName: 'tp-alert-dialog',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'alert-dialog',
    },
    {
      name: 'alert-dialog-trigger',
    },
    {
      name: 'alert-dialog-portal',
    },
    {
      name: 'alert-dialog-overlay',
    },
    {
      name: 'alert-dialog-content',
    },
    {
      name: 'alert-dialog-header',
    },
    {
      name: 'alert-dialog-media',
    },
    {
      name: 'alert-dialog-title',
    },
    {
      name: 'alert-dialog-description',
    },
    {
      name: 'alert-dialog-actions',
    },
    {
      name: 'alert-dialog-confirm',
    },
    {
      name: 'alert-dialog-cancel',
    },
  ],
};

export const alertDialogPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('alert-dialog')],
});
