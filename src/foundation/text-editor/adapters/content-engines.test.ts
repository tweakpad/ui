/**
 * Both engine adapters as the content tests see them (node environment): each maps the portable
 * model to its native JSON and back, and mounts headless with content in a format, custom nodes
 * and the direction of the widget. Tiptap runs over its stub modules with the real engine state,
 * Lexical as the adapter's real editor without a root; both read HTML through the structural
 * source builder.
 */
import { describe, expect, it } from 'vitest';
import { htmlSource } from '../content/html-source.test.js';
import { canonicalize, type TextEditorPortableDocument } from '../content/portable.js';
import type { TextEditorContentInput, TextEditorEngineInstance } from '../engine.js';
import type { TextEditorNodeDefinition } from '../nodes.js';
import { createLexicalEngine } from './lexical/index.js';
import { lexicalRuntime, openLexicalInstance } from './lexical/instance.js';
import { realLexicalModules, recordingContext } from './lexical/lexical-stubs.test.js';
import { lexicalToPortable, portableToLexical } from './lexical/mapping.js';
import { withTrailingParagraph } from './shared/blocks.js';
import { FakeDocument, TEST_URLS } from './shared/test-helpers.test.js';
import { createTiptapEngine } from './tiptap/index.js';
import { fromTiptapJson, toTiptapJson } from './tiptap/mapping.js';
import { stubContext, stubTiptapModules } from './tiptap/tiptap-stubs.test.js';

/** Identifiers `<prefix>000000001`, … in order. */
export const idSequence = (prefix = 'm') => {
  let count = 0;
  return () => `${prefix}${String((count += 1)).padStart(9, '0')}`;
};

/** How a content test mounts an engine. */
export interface ContentMountOptions {
  readonly nodes?: readonly TextEditorNodeDefinition[] | undefined;
  /** The direction the widget resolves; left-to-right by default. */
  readonly direction?: 'ltr' | 'rtl' | undefined;
}

/** One engine as the content tests see it. */
export interface ContentEngine {
  readonly name: 'tiptap' | 'lexical';
  toNative(document: TextEditorPortableDocument): unknown;
  /** The mapper's draft of native JSON, canonical; identifiers it lacks are `x000000001`, … */
  fromNative(
    json: unknown,
    nodes?: readonly TextEditorNodeDefinition[],
  ): TextEditorPortableDocument;
  /** A headless mount whose load reports nothing but ready; new identifiers `t000000001`, … */
  mount(content: TextEditorContentInput, options?: ContentMountOptions): TextEditorEngineInstance;
}

export const tiptapContent: ContentEngine = {
  name: 'tiptap',
  toNative: (document) => toTiptapJson(withTrailingParagraph(document, idSequence('t'))),
  fromNative: (json, nodes = []) =>
    canonicalize(fromTiptapJson(json), { nodes, createId: idSequence('x') }).document,
  mount(content, options = {}) {
    const { modules } = stubTiptapModules();
    const nodes = options.nodes ?? [];
    const context = {
      ...stubContext({ content, nodes, createId: idSequence('t') }),
      urls: TEST_URLS,
    };
    const container = new FakeDocument().createElement('section');
    // The widget's direction, as `:dir()` resolves it through the shadow root.
    Object.assign(container, {
      matches: (selector: string) => selector === `:dir(${options.direction ?? 'ltr'})`,
    });
    const instance = createTiptapEngine(modules).mount(
      container as unknown as HTMLElement,
      context,
    );
    if (instance instanceof Promise) throw new Error('The headless mount is synchronous.');
    expect(context.calls).toEqual(['ready']);
    return instance;
  },
};

export const lexicalContent: ContentEngine = {
  name: 'lexical',
  toNative: portableToLexical,
  fromNative: (json, nodes = []) =>
    canonicalize(lexicalToPortable(json), { nodes, createId: idSequence('x') }).document,
  mount(content, options = {}) {
    const direction = options.direction ?? 'ltr';
    const engine = createLexicalEngine(realLexicalModules, {});
    const recording = recordingContext({
      initialContent: content,
      nodes: options.nodes ?? [],
      createId: idSequence('t'),
    });
    const rt = lexicalRuntime(engine, realLexicalModules, {}, recording.context, {
      parseHtml: htmlSource,
      direction: () => direction,
    });
    const instance = openLexicalInstance(engine, rt, {}, recording.context, null);
    expect(recording.records.filter(({ type }) => type !== 'ready')).toEqual([]);
    return instance;
  },
};

export const CONTENT_ENGINES = [tiptapContent, lexicalContent] as const;

describe('content test engines', () => {
  it.each(CONTENT_ENGINES)('$name mounts HTML and writes it back', (engine) => {
    const html = '<p data-id="a000000001">calm</p>';
    expect(engine.mount({ content: html, format: 'html' }).getContent('html')).toBe(html);
  });
});
