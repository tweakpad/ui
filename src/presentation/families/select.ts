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
    },
    {
      name: 'select-trigger',
    },
    {
      name: 'select-value',
    },
    {
      name: 'select-content',
    },
    {
      name: 'select-list',
    },
    {
      name: 'select-group',
    },
    {
      name: 'select-label',
    },
    {
      name: 'select-option',
    },
    {
      name: 'select-status',
    },
    {
      name: 'select-match',
    },
    {
      name: 'select-separator',
    },
    {
      name: 'select-scroll-up-button',
    },
    {
      name: 'select-scroll-down-button',
    },
    {
      name: 'select-anchor',
    },
    {
      name: 'select-input',
    },
    {
      name: 'select-clear',
    },
    {
      name: 'select-collection',
    },
    {
      name: 'select-empty-state',
    },
    {
      name: 'select-chip-list',
    },
    {
      name: 'select-chip',
    },
    {
      name: 'select-chip-remove',
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
