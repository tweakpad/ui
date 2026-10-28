import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dialogFamilyAppearance } from '../recipes/core/dialog-family.js';
import { drawerAppearance } from '../recipes/drawer.js';

const definition: ComponentDefinition = {
  name: 'Drawer',
  tagName: 'tp-drawer',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'drawer',
      description: 'The host around the trigger and the drawer.',
    },
    {
      name: 'drawer-trigger',
      description: 'The element in the `trigger` slot.',
    },
    {
      name: 'drawer-close',
      description: 'The corner Close button.',
    },
    {
      name: 'drawer-portal',
      description: 'The container the drawer renders into when portaled.',
    },
    {
      name: 'drawer-overlay',
      description: 'The backdrop behind a modal drawer.',
    },
    {
      name: 'drawer-viewport',
      description: 'The layer that positions the drawer against its edge.',
    },
    {
      name: 'drawer-surface',
      description: 'The drawer surface that moves with a swipe.',
    },
    {
      name: 'drawer-swipe-handle',
      description: 'The handle on the closing edge, a slider with several snap points.',
    },
    {
      name: 'drawer-content',
      description: 'The scrolling content inside the surface.',
    },
    {
      name: 'drawer-header',
      description: 'The header that holds the title and the description.',
    },
    {
      name: 'drawer-title',
      description: 'The title heading.',
    },
    {
      name: 'drawer-description',
      description: 'The description text.',
    },
    {
      name: 'drawer-footer',
      description: 'The footer that holds the `footer` and `close` slots.',
    },
  ],
};

export const drawerPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('drawer'), drawerAppearance],
});
