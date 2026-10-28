import { defineTextEditorBlock } from '../../foundation/text-editor/index.js';
import {
  textEditorBlocks,
  textEditorSuggestions,
} from '../../widgets/text-editor/features/index.js';
import { globeIcon } from '../../icons/globe.js';
import { infoIcon } from '../../icons/info.js';
import { createEngine } from './text-editor-engine.js';

/**
 * A callout: a textblock with a tone. It carries no paint of its own; `presents: 'callout'` lets
 * the editor paint it as a callout in its tone. Its Markdown is an alert (`> [!NOTE]`), which
 * `parse` restores.
 */
export const calloutBlock = defineTextEditorBlock({
  name: 'callout',
  content: 'inline',
  element: 'aside',
  presents: 'callout',
  attrs: { tone: { type: 'enum', values: ['note', 'tip', 'warning'], default: 'note' } },
  markdown: {
    serialize: ({ attrs, markdown }) => `> [!${attrs.tone.toUpperCase()}]\n> ${markdown}`,
    parse: (node) => {
      if (node.type !== 'alert' || !['note', 'tip', 'warning'].includes(node.kind)) return null;
      const paragraph = node.children.find((child) => child.type === 'paragraph');
      return { attrs: { tone: node.kind }, content: paragraph ? paragraph.children : [] };
    },
  },
  tool: { label: 'Callout', description: 'A highlighted note', icon: infoIcon, keywords: ['note'] },
});

/** The URL an embed may load: an https address, or a page of the document's own origin. */
export function embedSource(src, base = globalThis.location?.href) {
  try {
    const url = new URL(String(src ?? ''), base);
    const own = base !== undefined && url.origin === new URL(base).origin;
    return url.protocol === 'https:' || own ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * An embed: an atom that renders its own view, a page in a sandboxed frame with a required title.
 * A missing title or a source it may not load shows as text instead.
 */
export const embedBlock = defineTextEditorBlock({
  name: 'embed',
  content: 'none',
  element: 'figure',
  attrs: {
    src: { type: 'string', default: null },
    title: { type: 'string', default: null },
  },
  markdown: {
    serialize: ({ attrs }) => (attrs.src ? `[${attrs.title ?? attrs.src}](${attrs.src})` : ''),
  },
  text: ({ attrs }) => attrs.title ?? attrs.src ?? '',
  view(host, attrs) {
    const src = embedSource(attrs.src);
    const title = typeof attrs.title === 'string' ? attrs.title.trim() : '';
    if (!src || !title) {
      host.textContent = title || String(attrs.src ?? '');
      return;
    }
    const frame = host.ownerDocument.createElement('iframe');
    frame.setAttribute('sandbox', 'allow-scripts');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.setAttribute('loading', 'lazy');
    frame.title = title;
    frame.src = src;
    host.append(frame);
    return () => frame.remove();
  },
  css: '.tp-te-block-embed iframe { display: block; inline-size: 100%; block-size: 21rem; border: 0; border-radius: var(--tp-radius-md); background: var(--tp-muted); }',
  tool: { label: 'Embed', description: 'A page from an https address', icon: globeIcon },
});

/** The blocks join the slash menu, and the block gutter moves and edits them like any block. */
export function setupCustomBlocks(editor) {
  editor.nodes = [calloutBlock, embedBlock];
  editor.features = [textEditorBlocks(), textEditorSuggestions()];
  editor.engine = createEngine();
}
