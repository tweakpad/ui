import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { fieldAppearance } from '../recipes/field.js';

const definition: ComponentDefinition = {
  name: 'Field',
  tagName: 'tp-field',
  kind: 'compound-reexport',
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
      axes: ['orientation'],
    },
    {
      name: 'field-legend',
      axes: ['orientation'],
    },
    {
      name: 'field-field-group',
      axes: ['orientation'],
    },
    {
      name: 'field-field',
      axes: ['orientation'],
    },
    {
      name: 'field-label',
      axes: ['orientation'],
    },
    {
      name: 'field-title',
      axes: ['orientation'],
    },
    {
      name: 'field-control-region',
      axes: ['orientation'],
    },
    {
      name: 'field-description',
      axes: ['orientation'],
    },
    {
      name: 'field-error',
      axes: ['orientation'],
    },
    {
      name: 'field-separator',
      axes: ['orientation'],
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
