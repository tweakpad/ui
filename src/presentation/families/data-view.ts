import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dataViewAppearance } from '../recipes/data-view.js';

/** Component Library Data view: a size axis on the root. */
const definition: ComponentDefinition = {
  name: 'Data view',
  tagName: 'tp-data-view',
  kind: 'flattening-compound',
  axes: [{ name: 'size', values: ['sm', 'default', 'lg'], default: 'default' }],
  parts: [
    {
      name: 'data-view',
      axes: ['size'],
      description:
        'The root: the scrolling grid, then the state layer; `data-status` names its state.',
    },
    { name: 'data-view-viewport', description: 'The scroller of the rows, under the header.' },
    {
      name: 'data-view-header',
      description: 'The header row, above the scroller; it follows the rows sideways.',
    },
    {
      name: 'data-view-column-header',
      description:
        'One column header; `data-sortable`, `data-sorted` (`ascending` or `descending`) and `data-align` mark it.',
    },
    {
      name: 'data-view-sort-indicator',
      description: 'The arrow of a sortable header; `data-active` while its column sorts.',
    },
    { name: 'data-view-body', description: 'The rows.' },
    {
      name: 'data-view-row',
      description: 'One row; `data-selected` and, under row navigation, `data-focused` mark it.',
    },
    {
      name: 'data-view-cell',
      description: 'One cell; `data-align`, `data-row-header` and `data-focused` mark it.',
    },
    {
      name: 'data-view-state',
      description:
        'The empty or error layer under the header, or the loading Progress bar along the header; `data-status` names it.',
    },
    { name: 'data-view-skeleton', description: 'A placeholder bar of a loading row.' },
  ],
};

export const dataViewPresentation = definePresentation({
  definition,
  bindings: {
    'tp-data-view': {
      '[part~="data-view-viewport"]': 'data-view-viewport',
      '[part~="data-view-header"]': 'data-view-header',
      '[part~="data-view-column-header"]': 'data-view-column-header',
      '[part~="data-view-sort-indicator"]': 'data-view-sort-indicator',
      '[part~="data-view-body"]': 'data-view-body',
      '[part~="data-view-row"]': 'data-view-row',
      '[part~="data-view-cell"]': 'data-view-cell',
      '[part~="data-view-state"]': 'data-view-state',
      '[part~="data-view-skeleton"]': 'data-view-skeleton',
    },
  },
  sources: [dataViewAppearance],
});
