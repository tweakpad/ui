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
      description:
        "The root fieldset that holds the legend, the Field's own row and the separator.",
      axes: ['orientation'],
    },
    {
      name: 'field-legend',
      description: 'The caption of a group of Fields, from `legend` or the `legend` slot.',
      axes: ['orientation'],
    },
    {
      name: 'field-field-group',
      description: "The region that holds the `group` slot and the Field's own row.",
      axes: ['orientation'],
    },
    {
      name: 'field-field',
      description:
        'The row of the label and the control region; beside a Switch or Checkbox it lays out as a choice row.',
      axes: ['orientation'],
    },
    {
      name: 'field-label',
      description: 'The Label that names the control, from `label` or the `label` slot.',
      axes: ['orientation'],
    },
    {
      name: 'field-title',
      description: 'The name of a grouped choice, from `title` or the `title` slot.',
      axes: ['orientation'],
    },
    {
      name: 'field-control-region',
      description: 'The column that holds the control, its description and its error.',
      axes: ['orientation'],
    },
    {
      name: 'field-description',
      description: 'The help text below the control.',
      axes: ['orientation'],
    },
    {
      name: 'field-error',
      description: 'The error message, shown while the Field is invalid and announced as an alert.',
      axes: ['orientation'],
    },
    {
      name: 'field-separator',
      description: 'The dividing line below the Field, with its centered caption.',
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
