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
    },
    {
      name: 'dialog-trigger',
    },
    {
      name: 'dialog-portal',
    },
    {
      name: 'dialog-overlay',
    },
    {
      name: 'dialog-content',
    },
    {
      name: 'dialog-header',
    },
    {
      name: 'dialog-title',
    },
    {
      name: 'dialog-description',
    },
    {
      name: 'dialog-footer',
    },
    {
      name: 'dialog-close',
    },
  ],
};

export const dialogPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('dialog')],
});
