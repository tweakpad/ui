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
    {
      name: 'copy-button',
      description: 'The host, which holds the composed Button.',
      axes: ['variant', 'size'],
    },
    { name: 'copy-button-button', description: 'The composed Button that copies on press.' },
    {
      name: 'copy-button-icon',
      description: 'The copy Icon, replaced by a check while the copy is confirmed.',
    },
    {
      name: 'copy-button-label',
      description:
        'The visible label with `show-label`, replaced by the copied message while confirmed.',
    },
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
