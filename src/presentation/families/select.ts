import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { selectCoreAppearance } from '../recipes/core/surfaces.js';
import { selectAppearance } from '../recipes/select.js';

const definition: ComponentDefinition = {
  name: 'Select',
  tagName: 'tp-select',
  kind: 'flattening-compound',
  sourceNode: 'ucl18-select',
  axes: [],
  parts: [
    {
      name: 'select',
      publicName: 'Root',
      presentationKeys: ['select'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'select-trigger',
      publicName: 'Trigger',
      presentationKeys: ['select-trigger'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-value',
      publicName: 'Value',
      presentationKeys: ['select-value'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-content',
      publicName: 'Content',
      presentationKeys: ['select-content'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-list',
      publicName: 'List',
      presentationKeys: ['select-list'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-group',
      publicName: 'Group',
      presentationKeys: ['select-group'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'select-label',
      publicName: 'Label',
      presentationKeys: ['select-label'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-option',
      publicName: 'Option',
      presentationKeys: ['select-option'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'select-status',
      publicName: 'Status',
      presentationKeys: ['select-status'],
      cardinality: 'zero or one in List; present while a source loads or after it fails',
    },
    {
      name: 'select-match',
      publicName: 'Match',
      presentationKeys: ['select-match'],
      cardinality: 'zero or more descendants of Option; present while matches are highlighted',
    },
    {
      name: 'select-separator',
      publicName: 'Separator',
      presentationKeys: ['select-separator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-scroll-up-button',
      publicName: 'ScrollUpButton',
      presentationKeys: ['select-scroll-up-button'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-scroll-down-button',
      publicName: 'ScrollDownButton',
      presentationKeys: ['select-scroll-down-button'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-anchor',
      publicName: 'Anchor',
      presentationKeys: ['select-anchor'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-input',
      publicName: 'Input',
      presentationKeys: ['select-input'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-clear',
      publicName: 'Clear',
      presentationKeys: ['select-clear'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-collection',
      publicName: 'Collection',
      presentationKeys: ['select-collection'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-empty-state',
      publicName: 'Empty state',
      presentationKeys: ['select-empty-state'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-chip-list',
      publicName: 'ChipList',
      presentationKeys: ['select-chip-list'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'select-chip',
      publicName: 'Chip',
      presentationKeys: ['select-chip'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'select-chip-remove',
      publicName: 'Chip remove',
      presentationKeys: ['select-chip-remove'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
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
