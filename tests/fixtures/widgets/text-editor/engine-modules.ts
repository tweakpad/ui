/**
 * Engine modules of the text-editor fixture pages. Builds the module objects that the adapters
 * receive from the installed engines, optionally counting the engines' own serializers, loads the
 * adapters by their module paths (never through the package entry) and creates engines over the
 * full, reduced or failing modules. Also loads the parity corpus into `fixture.corpus`.
 * Driven only through the Chrome DevTools MCP (see README.md).
 */
import * as lexicalA11y from '@lexical/a11y';
import * as lexicalCode from '@lexical/code';
import * as lexicalExtension from '@lexical/extension';
import * as lexicalHistory from '@lexical/history';
import * as lexicalHtml from '@lexical/html';
import * as lexicalLink from '@lexical/link';
import * as lexicalList from '@lexical/list';
import * as lexicalMarkdown from '@lexical/markdown';
import * as lexicalRichText from '@lexical/rich-text';
import * as lexicalSelection from '@lexical/selection';
import * as lexicalTable from '@lexical/table';
import * as tiptapCore from '@tiptap/core';
import * as tiptapList from '@tiptap/extension-list';
import * as tiptapTable from '@tiptap/extension-table';
import * as tiptapHistory from '@tiptap/pm/history';
import * as tiptapState from '@tiptap/pm/state';
import * as tiptapTables from '@tiptap/pm/tables';
import * as tiptapStarterKit from '@tiptap/starter-kit';
import * as lexical from 'lexical';
import type { TextEditorEngine } from '../../../../src/foundation/text-editor/engine.js';
import { fixture, type CorpusDocument, type EngineName } from './harness.js';

/** `full`; `reduced` without the table modules; `failing` with modules whose probes reject the mount. */
export type EngineVariant = 'full' | 'reduced' | 'failing';

// Serializer counts ----------------------------------------------------------------------------

/** Counts the engines' own serializers through the module objects the adapters receive. */
export interface SerializerSpy {
  /** Called once per serializer while the modules are built, so every name is listed with 0. */
  register(engine: EngineName, name: string): void;
  count(engine: EngineName, name: string): void;
}

export interface SerializerCounter {
  readonly spy: SerializerSpy;
  /** A copy of the counts by engine, in registration order. */
  counts(): Record<EngineName, Record<string, number>>;
}

export function serializerCounter(): SerializerCounter {
  const calls: Record<EngineName, Record<string, number>> = { tiptap: {}, lexical: {} };
  return {
    spy: {
      register: (engine, name) => {
        calls[engine][name] = 0;
      },
      count: (engine, name) => {
        calls[engine][name] = (calls[engine][name] ?? 0) + 1;
      },
    },
    counts: () => structuredClone(calls),
  };
}

function spied<F extends (...args: never[]) => unknown>(
  spy: SerializerSpy | undefined,
  engine: EngineName,
  name: string,
  fn: F,
): F {
  if (!spy) return fn;
  spy.register(engine, name);
  return ((...args: Parameters<F>) => {
    spy.count(engine, name);
    return fn(...args);
  }) as F;
}

/** The engine's editor class, counting its own HTML and text serializers when spied. */
function editorClass(spy: SerializerSpy | undefined): typeof tiptapCore.Editor {
  if (!spy) return tiptapCore.Editor;
  spy.register('tiptap', 'Editor.getHTML');
  spy.register('tiptap', 'Editor.getText');
  return class SpiedEditor extends tiptapCore.Editor {
    override getHTML(): string {
      spy.count('tiptap', 'Editor.getHTML');
      return super.getHTML();
    }
    override getText(options?: Parameters<tiptapCore.Editor['getText']>[0]): string {
      spy.count('tiptap', 'Editor.getText');
      return super.getText(options);
    }
  };
}

// Module objects -------------------------------------------------------------------------------

function buildModules(spy: SerializerSpy | undefined) {
  const tiptap = {
    core: {
      ...tiptapCore,
      Editor: editorClass(spy),
      getHTMLFromFragment: spied(
        spy,
        'tiptap',
        'getHTMLFromFragment',
        tiptapCore.getHTMLFromFragment,
      ),
      generateHTML: spied(spy, 'tiptap', 'generateHTML', tiptapCore.generateHTML),
      generateText: spied(spy, 'tiptap', 'generateText', tiptapCore.generateText),
      getText: spied(spy, 'tiptap', 'getText', tiptapCore.getText),
    },
    state: tiptapState,
    history: tiptapHistory,
    starterKit: tiptapStarterKit,
    list: tiptapList,
    table: tiptapTable,
    tables: tiptapTables,
  };
  const lexicalModules = {
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
    html: {
      ...lexicalHtml,
      $generateHtmlFromNodes: spied(
        spy,
        'lexical',
        '$generateHtmlFromNodes',
        lexicalHtml.$generateHtmlFromNodes,
      ),
      $generateNodesFromDOM: spied(
        spy,
        'lexical',
        '$generateNodesFromDOM',
        lexicalHtml.$generateNodesFromDOM,
      ),
    },
    table: lexicalTable,
  };
  return { tiptap, lexical: lexicalModules };
}

/** The modules without some of their entries. */
const without = (modules: object, names: readonly string[]): object =>
  Object.fromEntries(Object.entries(modules).filter(([name]) => !names.includes(name)));

/**
 * A core module standing for a second copy of the engine: its element node class is not the one
 * that the rich-text, list, link, code and table node classes extend.
 */
const secondCopy = (core: typeof lexical): typeof lexical => ({
  ...core,
  ElementNode: class ElementNode extends core.ElementNode {},
});

// Adapters and engines -------------------------------------------------------------------------

export type TiptapAdapter =
  typeof import('../../../../src/foundation/text-editor/adapters/tiptap/index.js');
export type LexicalAdapter =
  typeof import('../../../../src/foundation/text-editor/adapters/lexical/index.js');
export type TiptapModules = Parameters<TiptapAdapter['createTiptapEngine']>[0];
export type TiptapOptions = Parameters<TiptapAdapter['createTiptapEngine']>[1];
export type LexicalModules = Parameters<LexicalAdapter['createLexicalEngine']>[0];
export type LexicalOptions = Parameters<LexicalAdapter['createLexicalEngine']>[1];

/**
 * The adapters by module path, from `dist/` on a page opened with `?built`; a variable path keeps
 * a missing adapter from failing the page.
 */
const ADAPTERS = new URLSearchParams(globalThis.location?.search ?? '').has('built')
  ? ({
      tiptap: '/dist/text-editor/adapters/tiptap.js',
      lexical: '/dist/text-editor/adapters/lexical.js',
    } as const)
  : ({
      tiptap: '/src/foundation/text-editor/adapters/tiptap/index.ts',
      lexical: '/src/foundation/text-editor/adapters/lexical/index.ts',
    } as const);

/** Factories over the page's modules, for engines with other options (`options.css`, `nodes`). */
export interface FixtureEngineFactories {
  tiptap(options?: TiptapOptions, reduced?: boolean): TextEditorEngine;
  lexical(options?: LexicalOptions, reduced?: boolean): TextEditorEngine;
}

export interface FixtureEngines {
  /** The full module objects per engine, with the spied serializers when a spy was given. */
  readonly modules: { readonly tiptap: object; readonly lexical: object };
  /**
   * The module objects of a variant: `reduced` without the table modules; `failing` without the
   * Tiptap history module, or with a Lexical core module whose `ElementNode` the node classes do
   * not extend.
   */
  modulesFor(engine: EngineName, variant: EngineVariant): object;
  readonly factories: FixtureEngineFactories;
  /** An engine over the variant's modules, or null when its adapter did not load or the factory threw. */
  createEngine(engine: EngineName, variant: EngineVariant): TextEditorEngine | null;
  /** Adapter load and factory errors by engine; the same object for the page's lifetime. */
  readonly loadErrors: Partial<Record<EngineName, unknown>>;
}

/** Builds the modules (spied when `spy` is given) and loads the wanted adapters by module path, in order. */
export async function loadFixtureEngines(options: {
  readonly wanted: (engine: EngineName) => boolean;
  readonly spy?: SerializerSpy | undefined;
}): Promise<FixtureEngines> {
  const modules = buildModules(options.spy);
  const variants: Record<EngineName, Record<EngineVariant, object>> = {
    tiptap: {
      full: modules.tiptap,
      reduced: without(modules.tiptap, ['table', 'tables']),
      failing: without(modules.tiptap, ['history']),
    },
    lexical: {
      full: modules.lexical,
      reduced: without(modules.lexical, ['table']),
      failing: { ...modules.lexical, lexical: secondCopy(modules.lexical.lexical) },
    },
  };
  const loadErrors: Partial<Record<EngineName, unknown>> = {};

  async function load<T>(engine: EngineName): Promise<T | null> {
    try {
      return (await import(/* @vite-ignore */ ADAPTERS[engine])) as T;
    } catch (error) {
      loadErrors[engine] = error;
      return null;
    }
  }

  const tiptapAdapter = options.wanted('tiptap') ? await load<TiptapAdapter>('tiptap') : null;
  const lexicalAdapter = options.wanted('lexical') ? await load<LexicalAdapter>('lexical') : null;

  const build = {
    tiptap(variant: EngineVariant, engineOptions?: TiptapOptions): TextEditorEngine {
      if (!tiptapAdapter) throw new Error('The Tiptap adapter did not load.');
      const chosen = variants.tiptap[variant] as unknown as TiptapModules;
      return tiptapAdapter.createTiptapEngine(chosen, engineOptions);
    },
    lexical(variant: EngineVariant, engineOptions?: LexicalOptions): TextEditorEngine {
      if (!lexicalAdapter) throw new Error('The Lexical adapter did not load.');
      const chosen = variants.lexical[variant] as unknown as LexicalModules;
      return lexicalAdapter.createLexicalEngine(chosen, engineOptions);
    },
  };

  const factories: FixtureEngineFactories = {
    tiptap: (engineOptions, reduced = false) =>
      build.tiptap(reduced ? 'reduced' : 'full', engineOptions),
    lexical: (engineOptions, reduced = false) =>
      build.lexical(reduced ? 'reduced' : 'full', engineOptions),
  };

  return {
    modules: { tiptap: modules.tiptap, lexical: modules.lexical },
    modulesFor: (engine, variant) => variants[engine][variant],
    factories,
    createEngine(engine, variant) {
      try {
        return build[engine](variant, undefined);
      } catch (error) {
        loadErrors[engine] ??= error;
        return null;
      }
    },
    loadErrors,
  };
}

// Corpus ---------------------------------------------------------------------------------------

const CORPUS_FILES = import.meta.glob<string>('./corpus/*.{html,md,txt}', {
  query: '?raw',
  import: 'default',
  eager: true,
});
const CUSTOM_DOCUMENTS = new Set(['05-custom', 'addressing', 'lists']);
let corpusLoaded = false;

/** Fills `fixture.corpus` from `corpus/*.{html,md,txt}` once and returns it (later calls return the same map). */
export function loadCorpus(): ReadonlyMap<string, CorpusDocument> {
  if (corpusLoaded) return fixture.corpus;
  corpusLoaded = true;
  for (const [path, html] of Object.entries(CORPUS_FILES)) {
    const name = path.replace(/^\.\/corpus\//, '').replace(/\.html$/, '');
    if (!path.endsWith('.html') || name.endsWith('.input')) continue;
    fixture.corpus.set(name, {
      name,
      html: html.replace(/\n$/, ''),
      markdown: CORPUS_FILES[`./corpus/${name}.md`] ?? null,
      text: CORPUS_FILES[`./corpus/${name}.txt`]?.replace(/\n$/, '') ?? null,
      custom: CUSTOM_DOCUMENTS.has(name),
    });
  }
  return fixture.corpus;
}
