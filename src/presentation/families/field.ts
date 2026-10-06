import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { fieldAppearance } from '../recipes/field.js';

const definition: ComponentDefinition = {
  name: 'Field',
  tagName: 'tp-field',
  kind: 'compound-reexport',
  sourceNode: 'ucl17-field',
  axes: [
    {
      name: 'orientation',
      values: ['vertical', 'horizontal', 'responsive'],
      default: 'vertical',
    },
  ],
  parts: [
    {
      name: 'field',
      publicName: 'Field set',
      presentationKeys: [
        'field',
        'field-orientation-vertical',
        'field-orientation-horizontal',
        'field-orientation-responsive',
      ],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'field-legend',
      publicName: 'Legend',
      presentationKeys: [
        'field-legend',
        'field-legend-orientation-vertical',
        'field-legend-orientation-horizontal',
        'field-legend-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-field-group',
      publicName: 'Field group',
      presentationKeys: [
        'field-field-group',
        'field-field-group-orientation-vertical',
        'field-field-group-orientation-horizontal',
        'field-field-group-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-field',
      publicName: 'Field',
      presentationKeys: [
        'field-field',
        'field-field-orientation-vertical',
        'field-field-orientation-horizontal',
        'field-field-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-label',
      publicName: 'Label',
      presentationKeys: [
        'field-label',
        'field-label-orientation-vertical',
        'field-label-orientation-horizontal',
        'field-label-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-title',
      publicName: 'Title',
      presentationKeys: [
        'field-title',
        'field-title-orientation-vertical',
        'field-title-orientation-horizontal',
        'field-title-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-control-region',
      publicName: 'Control region',
      presentationKeys: [
        'field-control-region',
        'field-control-region-orientation-vertical',
        'field-control-region-orientation-horizontal',
        'field-control-region-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-description',
      publicName: 'Description',
      presentationKeys: [
        'field-description',
        'field-description-orientation-vertical',
        'field-description-orientation-horizontal',
        'field-description-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-error',
      publicName: 'Error',
      presentationKeys: [
        'field-error',
        'field-error-orientation-vertical',
        'field-error-orientation-horizontal',
        'field-error-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
    {
      name: 'field-separator',
      publicName: 'Separator',
      presentationKeys: [
        'field-separator',
        'field-separator-orientation-vertical',
        'field-separator-orientation-horizontal',
        'field-separator-orientation-responsive',
      ],
      cardinality:
        'zero or one descendant of Field set; cited behavior sets any required-presence condition',
    },
  ],
};

export const fieldPresentation = definePresentation({
  definition,
  bindings: {
    'tp-field': {
      "[part='field-legend']": 'field-legend',
      "[part='field-field-group']": 'field-field-group',
      "[part='field-field']": 'field-field',
      "[part='field-control-region']": 'field-control-region',
      "[part='field-title']": 'field-title',
      "[part='field-separator']": 'field-separator',
      "[part='field']": 'field',
      "[part='field-label']": 'field-label',
      "[part='field-description']": 'field-description',
      "[part='field-error']": 'field-error',
    },
  },
  sources: [fieldAppearance],
});
