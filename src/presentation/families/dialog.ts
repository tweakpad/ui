import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dialogFamilyAppearance } from '../recipes/core/dialog-family.js';

const definition: ComponentDefinition = {
  name: 'Dialog',
  tagName: 'tp-dialog',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'dialog',
      description: 'The host around the trigger and the dialog.',
    },
    {
      name: 'dialog-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'dialog-portal',
      description: 'The container the dialog renders into when portaled.',
    },
    {
      name: 'dialog-overlay',
      description: 'The backdrop behind a modal dialog.',
    },
    {
      name: 'dialog-content',
      description: 'The dialog surface.',
    },
    {
      name: 'dialog-header',
      description: 'The header that holds the title and the description.',
    },
    {
      name: 'dialog-title',
      description: 'The title heading.',
    },
    {
      name: 'dialog-description',
      description: 'The description text.',
    },
    {
      name: 'dialog-footer',
      description: 'The footer that holds the `footer` and `close` slots.',
    },
    {
      name: 'dialog-close',
      description: 'The corner Close button.',
    },
  ],
};

export const dialogPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('dialog')],
});
