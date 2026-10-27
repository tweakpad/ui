/**
 * Documentation example wiring for `tp-text-editor`. The application installs an editing engine,
 * imports its modules and passes them to the adapter factory of that engine's entry,
 * `@tweakpad/ui/text-editor/adapters/<engine>`; the editor never imports an engine itself. Keep the
 * imports and the factory of the engine you install, and the features you use: the editor holds
 * only the features assigned to it, so a page bundles no other. The `data-*` attributes are
 * example setup, not editor properties.
 */
import * as core from '@tiptap/core';
import * as state from '@tiptap/pm/state';
import * as history from '@tiptap/pm/history';
import * as starterKit from '@tiptap/starter-kit';
import * as list from '@tiptap/extension-list';
import * as table from '@tiptap/extension-table';
import * as tables from '@tiptap/pm/tables';
import * as lexical from 'lexical';
import * as lexicalExtension from '@lexical/extension';
import * as lexicalRichText from '@lexical/rich-text';
import * as lexicalHistory from '@lexical/history';
import * as lexicalSelection from '@lexical/selection';
import * as lexicalList from '@lexical/list';
import * as lexicalLink from '@lexical/link';
import * as lexicalMarkdown from '@lexical/markdown';
import * as lexicalCode from '@lexical/code';
import * as lexicalA11y from '@lexical/a11y';
import * as lexicalHtml from '@lexical/html';
import * as lexicalTable from '@lexical/table';
import { createTiptapEngine } from '../../foundation/text-editor/adapters/tiptap/index.js';
import { createLexicalEngine } from '../../foundation/text-editor/adapters/lexical/index.js';
import {
  defineTextEditorBlock,
  defineTextEditorInline,
} from '../../foundation/text-editor/index.js';
import {
  textEditorBlocks,
  textEditorImages,
  textEditorLinks,
  textEditorSelectionToolbar,
  textEditorSuggestions,
  textEditorTables,
} from '../../widgets/text-editor/features/index.js';
import { globeIcon } from '../../icons/globe.js';
import { infoIcon } from '../../icons/info.js';

/** Survey notes for the examples: a heading, two paragraphs and a list with bold lead words. */
export const fieldNotes = [
  '<h1>Tide pool survey, north cove</h1>',
  '<p>Low tide reached 0.3 m at 07:40 and left the upper pools exposed for almost two hours. ',
  'The water stayed clear, with a light swell from the west.</p>',
  '<p>To log on the next visit:</p>',
  '<ul>',
  '<li><p><strong>Count the anemones</strong> in pools 4 to 7 before the sun reaches them.</p></li>',
  '<li><p><strong>Photograph the hermit crabs</strong> and note which shells they moved into.</p></li>',
  '<li><p><strong>Check the temperature logger</strong> under the ledge and swap its battery.</p></li>',
  '</ul>',
].join('');

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

/** Whether an embed source may load: an absolute https URL. */
export function embedSource(src) {
  try {
    const url = new globalThis.URL(String(src ?? ''));
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * An embed: an atom that shows an https page in a sandboxed frame with a required title. A
 * missing title or another protocol shows the title or the source as text instead of a frame.
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
  css: '.tp-te-block-embed iframe { display: block; inline-size: 100%; aspect-ratio: 16 / 9; border: 0; }',
  tool: { label: 'Embed', description: 'A page from an https address', icon: globeIcon },
});

/** The crew that the mention list searches. */
const crew = [
  { id: 'maren-holt', name: 'Maren Holt', role: 'Dockmaster' },
  { id: 'tobias-vik', name: 'Tobias Vik', role: 'Ferry pilot' },
  { id: 'selma-raud', name: 'Selma Raud', role: 'Harbour office' },
  { id: 'arno-petit', name: 'Arno Petit', role: 'Deckhand' },
  { id: 'lia-moreno', name: 'Lia Moreno', role: 'Pilot boat' },
];

/**
 * Searches the crew after a short delay, as a remote directory would. A newer query, or the list
 * closing, aborts the call in flight.
 */
export function searchCrew({ query, signal }) {
  return new Promise((resolve, reject) => {
    const timer = globalThis.setTimeout(() => {
      const needle = query.toLowerCase();
      resolve(crew.filter((person) => person.name.toLowerCase().includes(needle)));
    }, 250);
    signal.addEventListener(
      'abort',
      () => {
        globalThis.clearTimeout(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * A mention: an inline atom naming a crew member. Typing `@` opens a list that searches the crew;
 * choosing an entry inserts the node. Markdown and text hold its text, `@` and the name.
 */
export const mentionInline = defineTextEditorInline({
  name: 'mention',
  element: 'span',
  attrs: { person: { type: 'string', default: null }, label: { type: 'string', default: '' } },
  text: (attrs) => `@${attrs.label}`,
  css: '.tp-te-inline-mention { color: var(--tp-primary); }',
  suggest: {
    trigger: '@',
    source: searchCrew,
    label: (person) => person.name,
    description: (person) => person.role,
    attrs: (person) => ({ person: person.id, label: person.name }),
  },
});

/** Notes with a callout, a mention and an embed, for the custom node example. */
export const customBlockNotes = [
  '<h2>Mooring check</h2>',
  '<aside data-type="callout" data-tone="warning">Wait for slack water before you board the dinghy.</aside>',
  '<p>The tide table below is the harbour office page for this week; ',
  '<span data-type="mention" data-person="selma-raud" data-label="Selma Raud">@Selma Raud</span> ',
  'updates it on Mondays.</p>',
  '<figure data-type="embed" data-src="https://example.com/" data-title="Harbour tide table"></figure>',
].join('');

/** A new engine for one editor, with tables. */
export function tiptapEngine() {
  return createTiptapEngine({ core, state, history, starterKit, list, table, tables });
}

/** A new engine for one editor, with tables. */
export function lexicalEngine() {
  return createLexicalEngine({
    lexical,
    extension: lexicalExtension,
    richText: lexicalRichText,
    history: lexicalHistory,
    selection: lexicalSelection,
    list: lexicalList,
    link: lexicalLink,
    markdown: lexicalMarkdown,
    code: lexicalCode,
    a11y: lexicalA11y,
    html: lexicalHtml,
    table: lexicalTable,
  });
}

const sampleImage = new globalThis.URL('../assets/ratio-landscape.svg', import.meta.url).href;

/**
 * The upload hook of the examples: reports progress in eight steps over 1.6 s and resolves the
 * sample image; the signal aborts it. An application uploads the file to its storage here and
 * resolves the stored image's URL.
 * @param {File} file
 * @param {{ signal: AbortSignal, onProgress(loaded: number, total?: number): void }} options
 * @returns {Promise<string>}
 */
export function uploadImage(file, { signal, onProgress }) {
  return new Promise((resolve, reject) => {
    const total = Math.max(file.size, 1);
    let sent = 0;
    const timer = globalThis.setInterval(() => {
      sent = Math.min(total, sent + Math.ceil(total / 8));
      onProgress(sent, total);
      if (sent < total) return;
      globalThis.clearInterval(timer);
      resolve(sampleImage);
    }, 200);
    signal.addEventListener(
      'abort',
      () => {
        globalThis.clearInterval(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });
}

/**
 * Every feature of the editor, with the sample upload hook: block editing, tables, images, links,
 * the selection toolbar and the suggestion lists. Keep the ones you use.
 * @returns {object[]}
 */
export function allTextEditorFeatures() {
  return [
    textEditorBlocks(),
    textEditorTables(),
    textEditorImages({ upload: uploadImage }),
    textEditorLinks(),
    textEditorSelectionToolbar(),
    textEditorSuggestions(),
  ];
}

/**
 * Wires one example: each editor in `root` gets the sample notes when it carries `data-sample`,
 * every feature with the sample upload hook, then an engine of its own from `createEngine`; a
 * `tp-form[data-form-output]` shows what it submits in the `tp-code-block[data-submitted]` beside
 * it. Returns cleanup.
 * @param {HTMLElement} root
 * @param {() => object} createEngine returns a new engine
 * @returns {() => void} cleanup
 */
export function setupTextEditorExample(root, createEngine) {
  const cleanups = [];
  for (const editor of root.querySelectorAll('tp-text-editor')) {
    if (editor.hasAttribute('data-sample')) editor.defaultValue = fieldNotes;
    if (editor.hasAttribute('data-custom-blocks')) {
      editor.nodes = [calloutBlock, embedBlock, mentionInline];
      // A suggestion opens once `layout.suggestions` lists its node.
      editor.layout = { suggestions: ['slash', 'mention'] };
      editor.defaultValue = customBlockNotes;
    }
    editor.features = allTextEditorFeatures();
    editor.engine = createEngine();
    cleanups.push(() => (editor.engine = null));
  }
  const submitted = root.querySelector('tp-code-block[data-submitted]');
  for (const form of root.querySelectorAll('tp-form[data-form-output]')) {
    form.onFormSubmit = (_values, { data }) => {
      if (!submitted) return;
      submitted.code = String(data.get('notes') ?? '');
      submitted.hidden = false;
    };
    cleanups.push(() => (form.onFormSubmit = undefined));
  }
  return () => {
    for (const cleanup of cleanups.reverse()) cleanup();
  };
}
