import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { tableAppearance } from '../recipes/table.js';

const definition: ComponentDefinition = {
  name: 'Table',
  tagName: 'tp-table',
  kind: 'presentational-primitive',
  sourceNode: 'ucl22-table',
  axes: [],
  parts: [
    {
      name: 'table',
      publicName: 'Container',
      presentationKeys: ['table'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'table-table',
      publicName: 'Table',
      presentationKeys: ['table-table'],
      cardinality:
        'zero or one descendant of Container; cited behavior sets any required-presence condition',
    },
    {
      name: 'table-caption',
      publicName: 'Caption',
      presentationKeys: ['table-caption'],
      cardinality:
        'zero or one descendant of Container; cited behavior sets any required-presence condition',
    },
    {
      name: 'table-header',
      publicName: 'Header',
      presentationKeys: ['table-header'],
      cardinality:
        'zero or one descendant of Container; cited behavior sets any required-presence condition',
    },
    {
      name: 'table-body',
      publicName: 'Body',
      presentationKeys: ['table-body'],
      cardinality:
        'zero or one descendant of Container; cited behavior sets any required-presence condition',
    },
    {
      name: 'table-footer',
      publicName: 'Footer',
      presentationKeys: ['table-footer'],
      cardinality:
        'zero or one descendant of Container; cited behavior sets any required-presence condition',
    },
    {
      name: 'table-row',
      publicName: 'Row',
      presentationKeys: ['table-row'],
      cardinality:
        'zero or more descendants of Container; cited behavior sets any stronger minimum',
    },
    {
      name: 'table-column-header',
      publicName: 'Column header',
      presentationKeys: ['table-column-header'],
      cardinality:
        'zero or one descendant of Container; cited behavior sets any required-presence condition',
    },
    {
      name: 'table-cell',
      publicName: 'Cell',
      presentationKeys: ['table-cell'],
      cardinality:
        'zero or more descendants of Container; cited behavior sets any stronger minimum',
    },
  ],
};

export const tablePresentation = definePresentation({
  definition,
  sources: [tableAppearance],
});
