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
      description:
        'The overflow region that scrolls the table and holds its pinned edges; focusable while the table scrolls.',
    },
    {
      name: 'table-table',
      description: 'The native table.',
    },
    {
      name: 'table-caption',
      description: 'The native caption.',
    },
    {
      name: 'table-header',
      description: 'The native header region.',
    },
    {
      name: 'table-body',
      description: 'The native body region.',
    },
    {
      name: 'table-footer',
      description: 'The native footer region.',
    },
    {
      name: 'table-row',
      description: 'A native row; selected rows carry the row emphasis.',
    },
    {
      name: 'table-column-header',
      description: 'A native header cell.',
    },
    {
      name: 'table-cell',
      description: 'A native data cell.',
    },
  ],
};

export const tablePresentation = definePresentation({
  definition,
  structure: tableStructure,
  sources: [tableAppearance],
});
