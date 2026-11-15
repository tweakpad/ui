import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { imageEditorAppearance } from '../recipes/image-editor.js';

/** UI Widgets Specification Image editor. */
const definition: ComponentDefinition = {
  name: 'Image editor',
  tagName: 'tp-image-editor',
  kind: 'flattening-compound',
  axes: [],
  parts: [
    { name: 'image-editor', description: 'The root: the viewport, then the bar of controls.' },
    {
      name: 'image-editor-viewport',
      description: 'The focusable surface that pans, zooms and rotates the image.',
    },
    {
      name: 'image-editor-background',
      description:
        'The checker behind the image, sized by `--tp-image-editor-checker-size` and painted with `--tp-image-editor-checker-color`.',
    },
    { name: 'image-editor-image', description: 'The image.' },
    {
      name: 'image-editor-region',
      description:
        'The crop region, which dims everything outside it with `--tp-image-editor-dim`; `data-shape`, `data-adjustable` and `data-adjusting` mark its state.',
    },
    { name: 'image-editor-guides', description: 'The rule-of-thirds lines inside the region.' },
    {
      name: 'image-editor-handle',
      description:
        'One of the handles of an adjustable region; `data-handle` names its edge or corner.',
    },
    {
      name: 'image-editor-placeholder',
      description: 'The pulsing placeholder while the image loads.',
    },
    {
      name: 'image-editor-error',
      description: 'The message shown when the image cannot be loaded.',
    },
    { name: 'image-editor-controls', description: 'The bar of controls over the viewport.' },
    { name: 'image-editor-control-set', description: 'One set of controls in the bar.' },
  ],
};

export const imageEditorPresentation = definePresentation({
  definition,
  bindings: {
    'tp-image-editor': {
      '[part~="image-editor-viewport"]': 'image-editor-viewport',
      '[part~="image-editor-background"]': 'image-editor-background',
      '[part~="image-editor-image"]': 'image-editor-image',
      '[part~="image-editor-region"]': 'image-editor-region',
      '[part~="image-editor-guides"]': 'image-editor-guides',
      '[part~="image-editor-handle"]': 'image-editor-handle',
      '[part~="image-editor-placeholder"]': 'image-editor-placeholder',
      '[part~="image-editor-error"]': 'image-editor-error',
      '[part~="image-editor-controls"]': 'image-editor-controls',
      '[part~="image-editor-control-set"]': 'image-editor-control-set',
    },
  },
  sources: [imageEditorAppearance],
});
