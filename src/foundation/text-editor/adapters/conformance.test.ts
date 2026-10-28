/**
 * Conformance of the engine adapters, checked by the type check (`npm run typecheck`; Widgets
 * `uwg-te-req-engine-1`, `uwg-te-par-engine-1`, `uwg-te-req-blocks-6`).
 *
 * The real Tiptap 3.32.0 and Lexical 0.52.0 module namespaces satisfy the structural module types
 * that `createTiptapEngine` and `createLexicalEngine` take, with and without the optional table
 * modules; real engine nodes satisfy the option types' node overrides; and both factory results
 * satisfy `TextEditorEngine`. Everything is typed through the public entry, as an application
 * sees it. The function holding the checks is never called: Vitest does not type-check, so the
 * file's one runtime case only keeps it counted. The `@ts-expect-error` lines prove that the checks
 * reject a module that is missing or of another shape.
 */
import type * as lexicalA11y from '@lexical/a11y';
import type * as lexicalCode from '@lexical/code';
import type * as lexicalExtension from '@lexical/extension';
import type * as lexicalHistory from '@lexical/history';
import type * as lexicalHtml from '@lexical/html';
import type * as lexicalLink from '@lexical/link';
import type * as lexicalList from '@lexical/list';
import type * as lexicalMarkdown from '@lexical/markdown';
import type * as lexicalRichText from '@lexical/rich-text';
import type * as lexicalSelection from '@lexical/selection';
import type * as lexicalTable from '@lexical/table';
import type * as tiptapCore from '@tiptap/core';
import type * as tiptapList from '@tiptap/extension-list';
import type * as tiptapTable from '@tiptap/extension-table';
import type * as tiptapHistory from '@tiptap/pm/history';
import type * as tiptapState from '@tiptap/pm/state';
import type * as tiptapTables from '@tiptap/pm/tables';
import type * as tiptapStarterKit from '@tiptap/starter-kit';
import type * as lexicalCore from 'lexical';
import { describe, expect, it } from 'vitest';
import type { TextEditorEngine } from '../index.js';
import {
  createLexicalEngine,
  type TextEditorLexicalModules,
  type TextEditorLexicalOptions,
} from './lexical/index.js';
import {
  createTiptapEngine,
  type TextEditorTiptapModules,
  type TextEditorTiptapOptions,
} from './tiptap/index.js';

// The real module namespaces, as an application imports them.
declare const core: typeof tiptapCore;
declare const state: typeof tiptapState;
declare const history: typeof tiptapHistory;
declare const starterKit: typeof tiptapStarterKit;
declare const list: typeof tiptapList;
declare const table: typeof tiptapTable;
declare const tables: typeof tiptapTables;
declare const lexical: typeof lexicalCore;
declare const extension: typeof lexicalExtension;
declare const richText: typeof lexicalRichText;
declare const lexicalUndo: typeof lexicalHistory;
declare const selection: typeof lexicalSelection;
declare const lists: typeof lexicalList;
declare const link: typeof lexicalLink;
declare const markdown: typeof lexicalMarkdown;
declare const code: typeof lexicalCode;
declare const a11y: typeof lexicalA11y;
declare const html: typeof lexicalHtml;
declare const lexicalTables: typeof lexicalTable;

/** The type-level checks; never called. */
function conformance(): void {
  // Tiptap: the required modules, then with both table modules.
  const tiptapReduced = {
    core,
    state,
    history,
    starterKit,
    list,
  } satisfies TextEditorTiptapModules;
  const tiptapModules = {
    core,
    state,
    history,
    starterKit,
    list,
    table,
    tables,
  } satisfies TextEditorTiptapModules;
  // A real node extension replaces a generated custom node; a function extends the base CSS.
  const tiptapOptions = {
    css: (base: string) => `${base}\n.tp-te-callout { margin: 0; }`,
    nodes: { callout: core.Node.create({ name: 'callout', group: 'block', content: 'inline*' }) },
  } satisfies TextEditorTiptapOptions;
  createTiptapEngine(tiptapModules) satisfies TextEditorEngine;
  createTiptapEngine(tiptapReduced, {
    css: '.tp-te-root { color: inherit; }',
  }) satisfies TextEditorEngine;
  createTiptapEngine(tiptapModules, tiptapOptions) satisfies TextEditorEngine;

  // Lexical: the required modules, then with the table module.
  const lexicalReduced = {
    lexical,
    extension,
    richText,
    history: lexicalUndo,
    selection,
    list: lists,
    link,
    markdown,
    code,
    a11y,
    html,
  } satisfies TextEditorLexicalModules;
  const lexicalModules = {
    ...lexicalReduced,
    table: lexicalTables,
  } satisfies TextEditorLexicalModules;
  const lexicalOptions = {
    css: (base: string) => `${base}\n.tp-te-callout { margin: 0; }`,
    nodes: { callout: { klass: lexical.ParagraphNode } },
  } satisfies TextEditorLexicalOptions;
  createLexicalEngine(lexicalModules) satisfies TextEditorEngine;
  createLexicalEngine(lexicalReduced, {
    css: '.tp-te-root { color: inherit; }',
  }) satisfies TextEditorEngine;
  createLexicalEngine(lexicalModules, lexicalOptions) satisfies TextEditorEngine;

  // The checks reject a missing required module and a module of another shape.
  // @ts-expect-error `list` is required.
  void ({ core, state, history, starterKit } satisfies TextEditorTiptapModules);
  // @ts-expect-error the state module is no history module.
  void ({ core, state, history: state, starterKit, list } satisfies TextEditorTiptapModules);
  const { html: missing, ...withoutHtml } = lexicalReduced;
  void missing;
  // @ts-expect-error `html` is required.
  void (withoutHtml satisfies TextEditorLexicalModules);
  // @ts-expect-error the selection module is no table module.
  void ({ ...lexicalReduced, table: selection } satisfies TextEditorLexicalModules);
}

describe('engine adapter conformance (uwg-te-req-engine-1, uwg-te-par-engine-1)', () => {
  it('V-022: is checked by the type check; the entry exports both factories', () => {
    expect(conformance).toBeTypeOf('function');
    expect(createTiptapEngine).toBeTypeOf('function');
    expect(createLexicalEngine).toBeTypeOf('function');
  });
});
