import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { colorInputAppearance } from '../recipes/color-input.js';

const axes = ['variant', 'size'];

const definition: ComponentDefinition = {
  name: 'Color input',
  tagName: 'tp-color-input',
  kind: 'compound-reexport',
  axes: [
    {
      // inline: one compact row with the label at the start and the value and chip at the end.
      name: 'variant',
      values: ['default', 'inline'],
      default: 'default',
    },
    {
      name: 'size',
      values: ['sm', 'default'],
      default: 'default',
    },
  ],
  parts: [
    { name: 'color-input', description: 'The wrapper around the swatch or the inline row.', axes },
    {
      name: 'color-input-row',
      description: 'The row of an inline Color input around its label, value text and chip.',
      axes,
    },
    {
      name: 'color-input-label',
      description: "The label at the start of an inline Color input's row.",
      axes,
    },
    {
      name: 'color-input-swatch',
      description: 'The pressable frame around the chip that opens the picker.',
      axes,
    },
    {
      name: 'color-input-chip',
      description: 'The current color painted over a transparency checker.',
      axes,
    },
    {
      name: 'color-input-control',
      description:
        'The native color input covering the swatch, or a button with `picker="none"`; it is transparent, so the swatch shows its focus ring.',
      axes,
    },
    {
      name: 'color-input-value',
      description: 'The editable value text in an inline row, an Input joined into the row.',
      axes,
    },
  ],
};

export const colorInputPresentation = definePresentation({
  definition,
  bindings: {
    'tp-color-input': {
      '[part~="color-input"]': 'color-input',
      '[part~="color-input-row"]': 'color-input-row',
      '[part~="color-input-label"]': 'color-input-label',
      '[part~="color-input-swatch"]': 'color-input-swatch',
      '[part~="color-input-chip"]': 'color-input-chip',
      '[part~="color-input-control"]': 'color-input-control',
    },
  },
  sources: [colorInputAppearance],
});
