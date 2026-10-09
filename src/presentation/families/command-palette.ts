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
    },
    {
      name: 'command-palette-input-wrapper',
    },
    {
      name: 'command-palette-input',
    },
    {
      name: 'command-palette-list',
    },
    {
      name: 'command-palette-group',
    },
    {
      name: 'command-palette-item',
    },
    {
      name: 'command-palette-match',
    },
    {
      name: 'command-palette-shortcut-hint',
    },
    {
      name: 'command-palette-separator',
    },
    {
      name: 'command-palette-empty-state',
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
