import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { selectCoreAppearance } from '../recipes/core/surfaces.js';
import { selectAppearance } from '../recipes/select.js';

const definition: ComponentDefinition = {
  name: 'Select',
  tagName: 'tp-select',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    {
      name: 'select',
      description: 'The root wrapper around the trigger or the query.',
    },
    {
      name: 'select-trigger',
      description: 'The button that shows the selection and opens the list.',
    },
    {
      name: 'select-value',
      description: 'The selection or the placeholder inside the trigger.',
    },
    {
      name: 'select-content',
      description: 'The popup that holds the list.',
    },
    {
      name: 'select-list',
      description: 'The scrolling list of options.',
    },
    {
      name: 'select-group',
      description: 'A group of options.',
    },
    {
      name: 'select-label',
      description: 'The label of a group.',
    },
    {
      name: 'select-option',
      description: 'One option, with its text and check mark.',
    },
    {
      name: 'select-status',
      description: 'The loading or error row of a search source.',
    },
    {
      name: 'select-match',
      description: "The part of an option's text that matches the query.",
    },
    {
      name: 'select-separator',
      description: 'The line between options or groups.',
    },
    {
      name: 'select-scroll-up-button',
      description: 'The arrow that scrolls the list up while it overflows above.',
    },
    {
      name: 'select-scroll-down-button',
      description: 'The arrow that scrolls the list down while it overflows below.',
    },
    {
      name: 'select-anchor',
      description: 'The input group of a searchable Select, holding chips, query and buttons.',
    },
    {
      name: 'select-input',
      description: 'The query of a searchable Select.',
    },
    {
      name: 'select-clear',
      description: 'The button that clears the query or the selection.',
    },
    {
      name: 'select-collection',
      description: "The options inside a searchable Select's list.",
    },
    {
      name: 'select-empty-state',
      description: 'The text shown when no option matches the query.',
    },
    {
      name: 'select-chip-list',
      description: 'The chips of a searchable multiple selection.',
    },
    {
      name: 'select-chip',
      description: 'One selected value as a chip.',
    },
    {
      name: 'select-chip-remove',
      description: 'The button that removes a chip.',
    },
  ],
};

export const selectPresentation = definePresentation({
  definition,
  bindings: {
    'tp-select': {
      '[part~="select-anchor"]': 'select-anchor',
      '[part~="select-input"]': 'select-input',
      '[part~="select-clear"]': 'select-clear',
      '[part~="select-chip-list"]': 'select-chip-list',
      '[part~="select-chip"]': 'select-chip',
      '[part~="select-chip-remove"]': 'select-chip-remove',
      '[part~="select-collection"]': 'select-collection',
      '[part~="select-empty-state"]': 'select-empty-state',
      '[part~="select-row"]': 'select-row',
      '[part~="select"]': 'select',
      '[part~="select-trigger"]': 'select-trigger',
      '[part~="select-value"]': 'select-value',
      '[part~="select-content"]': 'select-content',
      '[part~="select-list"]': 'select-list',
      '[part~="select-group"]': 'select-group',
      '[part~="select-label"]': 'select-label',
      '[part~="select-option"]': 'select-option',
      '[part~="select-match"]': 'select-match',
      '[part~="select-status"]': 'select-status',
      '[part~="select-separator"]': 'select-separator',
      '[part~="select-scroll-up-button"]': 'select-scroll-up-button',
      '[part~="select-scroll-down-button"]': 'select-scroll-down-button',
    },
  },
  sources: [selectCoreAppearance, selectAppearance],
});
