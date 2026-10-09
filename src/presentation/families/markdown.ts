import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { markdownAppearance } from '../recipes/markdown.js';

const definition: ComponentDefinition = {
  name: 'Markdown',
  tagName: 'tp-markdown',
  kind: 'preset-composition',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  parts: [
    {
      name: 'markdown',
      axes: ['size'],
    },
    { name: 'markdown-heading' },
    { name: 'markdown-paragraph' },
    { name: 'markdown-list' },
    { name: 'markdown-list-item' },
    { name: 'markdown-blockquote' },
    { name: 'markdown-code' },
    { name: 'markdown-link' },
    { name: 'markdown-image' },
    { name: 'markdown-emphasis' },
    { name: 'markdown-strong' },
    { name: 'markdown-delete' },
    { name: 'markdown-footnotes' },
    { name: 'markdown-footnote-reference' },
    { name: 'markdown-footnote-back-reference' },
  ],
};

export const markdownPresentation = definePresentation({
  definition,
  sources: [markdownAppearance],
});
