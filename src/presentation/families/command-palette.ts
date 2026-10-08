import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { commandPaletteAppearance } from '../recipes/command-palette.js';

const definition: ComponentDefinition = {
  name: 'Command palette',
  tagName: 'tp-command-palette',
  kind: 'preset-composition',
  sourceNode: 'ucl18-command',
  nonVisualParts: ['Dialog composition'],
  axes: [],
  parts: [
    {
      name: 'command-palette',
      publicName: 'Root',
      presentationKeys: ['command-palette'],
      cardinality: 'exactly one public owner host per control instance',
    },
    {
      name: 'command-palette-input-wrapper',
      publicName: 'InputWrapper',
      presentationKeys: ['command-palette-input-wrapper'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'command-palette-input',
      publicName: 'Input',
      presentationKeys: ['command-palette-input'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'command-palette-list',
      publicName: 'List',
      presentationKeys: ['command-palette-list'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'command-palette-group',
      publicName: 'Group',
      presentationKeys: ['command-palette-group'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'command-palette-item',
      publicName: 'Item',
      presentationKeys: ['command-palette-item'],
      cardinality: 'zero or more descendants of Root; cited behavior sets any stronger minimum',
    },
    {
      name: 'command-palette-match',
      publicName: 'Match',
      presentationKeys: ['command-palette-match'],
      cardinality: 'zero or more descendants of Item; present while matches are highlighted',
    },
    {
      name: 'command-palette-shortcut-hint',
      publicName: 'Shortcut hint',
      presentationKeys: ['command-palette-shortcut-hint'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'command-palette-separator',
      publicName: 'Separator',
      presentationKeys: ['command-palette-separator'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
    {
      name: 'command-palette-empty-state',
      publicName: 'Empty state',
      presentationKeys: ['command-palette-empty-state'],
      cardinality:
        'zero or one descendant of Root; cited behavior sets any required-presence condition',
    },
  ],
};

export const commandPalettePresentation = definePresentation({
  definition,
  bindings: {
    'tp-command-palette': {
      '[part~="command-palette"]': 'command-palette',
      '[part~="command-palette-input-wrapper"]': 'command-palette-input-wrapper',
      '[part~="command-palette-input"]': 'command-palette-input',
      '[part~="command-palette-list"]': 'command-palette-list',
      '[part~="command-palette-group"]': 'command-palette-group',
      '[part~="command-palette-item"]': 'command-palette-item',
      '[part~="command-palette-match"]': 'command-palette-match',
      '[part~="command-palette-empty-state"]': 'command-palette-empty-state',
      '[part~="command-palette-separator"]': 'command-palette-separator',
      '[part~="command-palette-shortcut-hint"]': 'command-palette-shortcut-hint',
    },
  },
  sources: [commandPaletteAppearance],
});
