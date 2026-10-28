import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { commandPaletteAppearance } from '../recipes/command-palette.js';

const definition: ComponentDefinition = {
  name: 'Command palette',
  tagName: 'tp-command-palette',
  kind: 'preset-composition',
  axes: [],
  parts: [
    {
      name: 'command-palette',
      description: 'The root around the search field and the list.',
    },
    {
      name: 'command-palette-input-wrapper',
      description: 'The row that holds the search field.',
    },
    {
      name: 'command-palette-input',
      description: 'The search field.',
    },
    {
      name: 'command-palette-list',
      description: 'The list of commands.',
    },
    {
      name: 'command-palette-group',
      description: 'A group of commands with its label.',
    },
    {
      name: 'command-palette-item',
      description: 'Each command.',
    },
    {
      name: 'command-palette-item-description',
      description: 'The secondary text of a command.',
    },
    {
      name: 'command-palette-match',
      description: 'The part of a label that matches the query.',
    },
    {
      name: 'command-palette-shortcut-hint',
      description: 'The shortcut of a command.',
    },
    {
      name: 'command-palette-separator',
      description: 'A divider between groups.',
    },
    {
      name: 'command-palette-empty-state',
      description: 'The message shown when no command matches.',
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
      '[part~="command-palette-item-description"]': 'command-palette-item-description',
      '[part~="command-palette-match"]': 'command-palette-match',
      '[part~="command-palette-empty-state"]': 'command-palette-empty-state',
      '[part~="command-palette-separator"]': 'command-palette-separator',
      '[part~="command-palette-shortcut-hint"]': 'command-palette-shortcut-hint',
    },
  },
  sources: [commandPaletteAppearance],
});
