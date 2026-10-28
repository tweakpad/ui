import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { copyButtonAppearance } from '../recipes/copy-button.js';

const definition: ComponentDefinition = {
  name: 'Copy button',
  tagName: 'tp-copy-button',
  kind: 'preset-composition',
  axes: [
    {
      name: 'variant',
      values: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      default: 'ghost',
    },
    { name: 'size', values: ['xs', 'sm', 'default', 'lg'], default: 'sm' },
  ],
  parts: [
    { name: 'copy-button', axes: ['variant', 'size'] },
    { name: 'copy-button-button' },
    { name: 'copy-button-icon' },
    { name: 'copy-button-label' },
  ],
};

export const copyButtonPresentation = definePresentation({
  definition,
  bindings: {
    'tp-copy-button': {
      ':host': 'copy-button',
      'tp-button': 'copy-button-button',
      'tp-icon': 'copy-button-icon',
      '.label': 'copy-button-label',
    },
  },
  sources: [copyButtonAppearance],
});
