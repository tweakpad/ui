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
      description: 'The host around the trigger and the dialog.',
    },
    {
      name: 'alert-dialog-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'alert-dialog-portal',
      description: 'The container the dialog renders into when portaled.',
    },
    {
      name: 'alert-dialog-overlay',
      description: 'The backdrop behind the dialog.',
    },
    {
      name: 'alert-dialog-content',
      description: 'The dialog surface.',
    },
    {
      name: 'alert-dialog-header',
      description: 'The header that holds the media, the title and the description.',
    },
    {
      name: 'alert-dialog-media',
      description: 'The region of the `media` slot, above the title.',
    },
    {
      name: 'alert-dialog-title',
      description: 'The title heading.',
    },
    {
      name: 'alert-dialog-description',
      description: 'The consequence text.',
    },
    {
      name: 'alert-dialog-actions',
      description: 'The footer that holds the decisions.',
    },
    {
      name: 'alert-dialog-confirm',
      description: 'The element in the `confirm` slot.',
    },
    {
      name: 'alert-dialog-cancel',
      description: 'The element in the `cancel` slot.',
    },
  ],
};

export const alertDialogPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('alert-dialog')],
});
