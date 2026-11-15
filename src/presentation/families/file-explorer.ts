import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { fileExplorerAppearance } from '../recipes/file-explorer.js';

/** UI Widgets Specification File explorer: its regions; the views are Data views. */
const definition: ComponentDefinition = {
  name: 'File explorer',
  tagName: 'tp-file-explorer',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'file-explorer',
      description:
        'The root: the toolbar, the panels and the status bar; `data-view` names the view.',
    },
    {
      name: 'file-explorer-toolbar',
      description: 'The row with the path, the search field and the view switcher.',
    },
    { name: 'file-explorer-sidebar', description: 'The folder tree’s panel.' },
    { name: 'file-explorer-main', description: 'The open folder’s panel.' },
    {
      name: 'file-explorer-view',
      description: 'The Data view of the open folder; `data-view` names the view.',
    },
    {
      name: 'file-explorer-column',
      description:
        'One column of the columns view: a Data view of one folder; `data-level` is its depth.',
    },
    { name: 'file-explorer-details', description: 'The details pane of the selection.' },
    { name: 'file-explorer-status', description: 'The status bar.' },
    {
      name: 'file-explorer-drag-preview',
      description: 'The chip under the pointer while entries are dragged: icon, name and count.',
    },
  ],
};

export const fileExplorerPresentation = definePresentation({
  definition,
  bindings: {
    'tp-file-explorer': {
      '[part~="file-explorer-toolbar"]': 'file-explorer-toolbar',
      '[part~="file-explorer-sidebar"]': 'file-explorer-sidebar',
      '[part~="file-explorer-main"]': 'file-explorer-main',
      '[part~="file-explorer-view"]': 'file-explorer-view',
      '[part~="file-explorer-column"]': 'file-explorer-column',
      '[part~="file-explorer-details"]': 'file-explorer-details',
      '[part~="file-explorer-status"]': 'file-explorer-status',
      '[part~="file-explorer-drag-preview"]': 'file-explorer-drag-preview',
    },
  },
  sources: [fileExplorerAppearance],
});
