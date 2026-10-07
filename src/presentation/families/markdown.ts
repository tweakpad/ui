import type { ComponentDefinition } from '../definition.js';
import { definePresentation } from '../family.js';
import { markdownAppearance } from '../recipes/markdown.js';

const part = (name: string, publicName: string, cardinality: string) => ({
  name,
  publicName,
  presentationKeys: [name],
  cardinality,
});

const definition: ComponentDefinition = {
  name: 'Markdown',
  tagName: 'tp-markdown',
  kind: 'preset-composition',
  sourceNode: 'ucl21-markdown',
  axes: [{ name: 'size', values: ['sm', 'default'], default: 'default' }],
  states: ['streaming'],
  parts: [
    {
      name: 'markdown',
      publicName: 'Root',
      presentationKeys: ['markdown', 'markdown-size-sm', 'markdown-size-default'],
      cardinality: 'exactly one public owner host per control instance',
    },
    part('markdown-heading', 'Heading', 'one per heading node, descendants of Root'),
    part('markdown-paragraph', 'Paragraph', 'one per paragraph node, descendants of Root'),
    part('markdown-list', 'List', 'one per list node, descendants of Root'),
    part('markdown-list-item', 'List item', 'one per list item, children of List'),
    part('markdown-blockquote', 'Blockquote', 'one per non-alert blockquote, descendants of Root'),
    part('markdown-code', 'Code', 'one per inline code span, descendants of Root'),
    part('markdown-link', 'Link', 'one per link that passes the URL policy, descendants of Root'),
    part(
      'markdown-image',
      'Image',
      'one per image that passes the URL policy, descendants of Root',
    ),
    part('markdown-emphasis', 'Emphasis', 'one per emphasis node, descendants of Root'),
    part('markdown-strong', 'Strong', 'one per strong node, descendants of Root'),
    part('markdown-delete', 'Delete', 'one per strikethrough node, descendants of Root'),
    part(
      'markdown-footnotes',
      'Footnotes',
      'zero or one last child of Root, present while a referenced footnote exists',
    ),
    part(
      'markdown-footnote-reference',
      'Footnote reference',
      'one per footnote reference, descendants of Root',
    ),
    part(
      'markdown-footnote-back-reference',
      'Footnote back-reference',
      'one per footnote reference, descendants of Footnotes',
    ),
  ],
};

export const markdownPresentation = definePresentation({
  definition,
  sources: [markdownAppearance],
  complete: true,
});
