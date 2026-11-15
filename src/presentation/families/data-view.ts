import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { dataViewAppearance } from '../recipes/data-view.js';

/** Component Library Data view: a size axis on the root. */
const definition: ComponentDefinition = {
  name: 'Data view',
  tagName: 'tp-data-view',
  kind: 'flattening-compound',
  axes: [
    { name: 'size', values: ['sm', 'default', 'lg'], default: 'default' },
    { name: 'borders', values: ['rows', 'grid', 'none'], default: 'rows' },
  ],
  parts: [
    {
      name: 'data-view',
      axes: ['size', 'borders'],
      description:
        'The root: the scrolling grid, then the state layer; `data-status` names its state and `data-overflow` (`start`, `end`) the edges columns scroll past.',
    },
    { name: 'data-view-viewport', description: 'The scroller of the rows, under the header.' },
    {
      name: 'data-view-header',
      description: 'The header row, above the scroller; it follows the rows sideways.',
    },
    {
      name: 'data-view-column-header',
      description:
        'One column header; `data-sortable`, `data-sorted` (`ascending` or `descending`), `data-align`, and on pinned columns `data-pinned` and `data-pin-edge` (`start` or `end`) mark it.',
    },
    {
      name: 'data-view-sort-indicator',
      description:
        'The indicator of a sortable header, by default a chevron up while ascending and down while descending; `data-active` while its column sorts.',
    },
    { name: 'data-view-body', description: 'The rows.' },
    {
      name: 'data-view-row',
      description:
        'One row; `data-stripe` (alternate rows while `striped`), `data-selected`, `data-drop-target` (under a drag) and, under row navigation, `data-focused` mark it.',
    },
    {
      name: 'data-view-cell',
      description:
        'One cell; `data-align`, `data-row-header`, `data-focused`, and on pinned columns `data-pinned` and `data-pin-edge` mark it.',
    },
    {
      name: 'data-view-state',
      description:
        'The empty or error layer under the header, or the loading Progress bar along the header; `data-status` names it.',
    },
    { name: 'data-view-skeleton', description: 'A placeholder bar of a loading row.' },
    {
      name: 'data-view-selection-header',
      description:
        "The selection column's header, also a `data-view-column-header`: the select-all box under `multiple`.",
    },
    {
      name: 'data-view-selection-cell',
      description: "A row's cell in the selection column, also a `data-view-cell`.",
    },
    {
      name: 'data-view-tile',
      description:
        'A row as a tile under `layout="grid"`; `data-selected`, `data-focused` and `data-drop-target` mark it.',
    },
    {
      name: 'data-view-selection-box',
      description:
        'A selection box; `data-checked` while selected and `data-indeterminate` on the select-all box while only some rows are.',
    },
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
      '[part~="data-view-selection-box"]': 'data-view-selection-box',
      '[part~="data-view-tile"]': 'data-view-tile',
    },
  },
  sources: [dataViewAppearance],
});
