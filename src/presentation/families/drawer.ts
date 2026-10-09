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
    },
    {
      name: 'drawer-trigger',
    },
    {
      name: 'drawer-close',
    },
    {
      name: 'drawer-portal',
    },
    {
      name: 'drawer-overlay',
    },
    {
      name: 'drawer-viewport',
    },
    {
      name: 'drawer-surface',
    },
    {
      name: 'drawer-swipe-handle',
    },
    {
      name: 'drawer-content',
    },
    {
      name: 'drawer-header',
    },
    {
      name: 'drawer-title',
    },
    {
      name: 'drawer-description',
    },
    {
      name: 'drawer-footer',
    },
  ],
};

export const drawerPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('drawer'), drawerAppearance],
});
