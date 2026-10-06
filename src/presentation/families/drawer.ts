import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dialogFamilyAppearance } from '../recipes/core/dialog-family.js';
import { drawerAppearance } from '../recipes/drawer.js';

const definition: ComponentDefinition = {
  name: 'Drawer',
  tagName: 'tp-drawer',
  kind: 'flattening-compound',
  sourceNode: 'ucl19-drawer',
  axes: [],
  parts: [
    {
      name: 'drawer',
      publicName: 'Root',
      presentationKeys: ['drawer'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'drawer-trigger',
      publicName: 'Trigger',
      presentationKeys: ['drawer-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-close',
      publicName: 'Close',
      presentationKeys: ['drawer-close'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-portal',
      publicName: 'Portal',
      presentationKeys: ['drawer-portal'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-overlay',
      publicName: 'Overlay',
      presentationKeys: ['drawer-overlay'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-viewport',
      publicName: 'Viewport',
      presentationKeys: ['drawer-viewport'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-surface',
      publicName: 'Surface',
      presentationKeys: ['drawer-surface'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-swipe-handle',
      publicName: 'Swipe handle',
      presentationKeys: ['drawer-swipe-handle'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-content',
      publicName: 'Content',
      presentationKeys: ['drawer-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-header',
      publicName: 'Header',
      presentationKeys: ['drawer-header'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-title',
      publicName: 'Title',
      presentationKeys: ['drawer-title'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-description',
      publicName: 'Description',
      presentationKeys: ['drawer-description'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'drawer-footer',
      publicName: 'Footer',
      presentationKeys: ['drawer-footer'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const drawerPresentation = definePresentation({
  definition,
  sources: [dialogFamilyAppearance('drawer'), drawerAppearance],
});
