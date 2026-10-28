/**
 * Custom node definitions of the text editor corpus: the callout, embed and mention of document 5
 * (`05-custom`), also used by `addressing.html` and `lists.html`. The content unit tests in Node
 * and the browser fixtures import this one copy; the shipped examples are documentation.
 */
import type { MarkdownInline } from '../../../../../src/foundation/markdown/types.js';
import type {
  TextEditorBlockDefinition,
  TextEditorInlineDefinition,
  TextEditorNodeDefinition,
} from '../../../../../src/foundation/text-editor/nodes.js';

const TONES = ['note', 'tip', 'warning'] as const;

export const callout: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'callout',
  content: 'inline',
  element: 'aside',
  attrs: { tone: { type: 'enum', values: TONES, default: 'note' } },
  markdown: {
    // A GitHub alert of the callout's tone, read back by `parse`.
    serialize: ({ attrs, markdown }) =>
      [`[!${String(attrs.tone).toUpperCase()}]`, ...(markdown ? markdown.split('\n') : [])]
        .map((line) => (line ? `> ${line}` : '>'))
        .join('\n'),
    parse: (node) => {
      if (node.type !== 'alert' || !(TONES as readonly string[]).includes(node.kind)) return null;
      const content: MarkdownInline[] = [];
      for (const block of node.children)
        if (block.type === 'paragraph') {
          if (content.length > 0) content.push({ type: 'break' });
          content.push(...block.children);
        }
      return { attrs: { tone: node.kind }, content };
    },
  },
  tool: { label: 'Callout' },
};

export const embed: TextEditorBlockDefinition = {
  kind: 'block',
  name: 'embed',
  content: 'none',
  element: 'figure',
  attrs: { url: { type: 'string', default: '' }, caption: { type: 'string', default: '' } },
  markdown: { serialize: ({ attrs }) => `[${String(attrs.caption)}](${String(attrs.url)})` },
  text: ({ attrs }) => String(attrs.caption || attrs.url),
  tool: { label: 'Embed' },
};

export const mention: TextEditorInlineDefinition = {
  kind: 'inline',
  name: 'mention',
  element: 'span',
  attrs: { person: { type: 'string', default: null }, label: { type: 'string', default: '' } },
  text: (attrs) => `@${String(attrs.label)}`,
};

/** Every definition of the corpus, in the order the documents use them. */
export const corpusNodes: readonly TextEditorNodeDefinition[] = [callout, embed, mention];
