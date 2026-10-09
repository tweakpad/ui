import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tableAppearance, tableStructure } from '../recipes/table.js';

const definition: ComponentDefinition = {
  name: 'Table',
  tagName: 'tp-table',
  kind: 'presentational-primitive',
  axes: [],
  parts: [
    {
      name: 'table',
    },
    {
      name: 'table-table',
    },
    {
      name: 'table-caption',
    },
    {
      name: 'table-header',
    },
    {
      name: 'table-body',
    },
    {
      name: 'table-footer',
    },
    {
      name: 'table-row',
    },
    {
      name: 'table-column-header',
    },
    {
      name: 'table-cell',
    },
  ],
};

export const tablePresentation = definePresentation({
  definition,
  structure: tableStructure,
  sources: [tableAppearance],
});
