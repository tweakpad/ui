/**
 * Guards over the sources of the Tiptap adapter: comments and test titles cite spec node ids only
 * and state each rule in words, test files are named after the modules they test, and the adapter
 * keeps no local copy of a rule that a shared owner holds.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planningCitations } from '../shared/planning-ids.test.js';

const folder = new URL('./', import.meta.url).pathname;

const sources = readdirSync(folder)
  .filter((name) => name.endsWith('.ts'))
  .sort();
const source = (name: string): string => readFileSync(join(folder, name), 'utf8');
const modules = sources.filter((name) => !name.endsWith('.test.ts'));

/** Test files that are no module's: the stub modules, this guard and the engine's own tests. */
const NOT_A_MODULE = new Set(['tiptap-stubs.test.ts', 'sources.test.ts', 'engine.test.ts']);

describe('sources of the Tiptap adapter', () => {
  it('cite spec node ids only in comments and test titles; a title may start with V ids', () => {
    expect(sources.length).toBeGreaterThan(30);
    expect(sources.flatMap((name) => planningCitations(join(folder, name), name))).toEqual([]);
  });

  it('name each test file after the module it tests', () => {
    const unnamed = sources.filter(
      (name) =>
        name.endsWith('.test.ts') &&
        !NOT_A_MODULE.has(name) &&
        !modules.includes(name.replace(/\.test\.ts$/u, '.ts')),
    );
    expect(unnamed).toEqual([]);
  });

  it('keep no local copy of a rule that a shared owner holds', () => {
    /** Patterns of local copies, by the shared owner that replaces them. */
    const copies: [string, RegExp][] = [
      ['the action gate of the shared actions', /function kindLookup[\s\S]*?requirementsMet\(/u],
      ['the link policy of the shared action gate', /allowedUrl\(/u],
      ['the shared tie rule', /#centreOfNext|Math\.abs\(x - /u],
      ['the shared CSS option resolver', /function resolveTiptapCss/u],
      ['the shared kept table selection', /function keptSelection/u],
      [
        'the shared clipboard fragment and payload',
        /TiptapClipboardPayload|function selectionFragment/u,
      ],
      ['the shared change causes', /: ExpectedChange = Object\.freeze/u],
      ['the shared format check', /is not a content format/u],
      ['the shared stored-alignment guard', /new Set<TextEditorAlign>/u],
      ['the shared state constants', /markState\(\[\]\)|Object\.freeze\(\{ kind: 'none' \}\)/u],
      ['a typed instanceof', /as unknown as abstract new \(\) => unknown/u],
      ['the typed table view', /as unknown as \{ readonly colgroup/u],
      [
        'the shared list of toggle marks',
        /\bconst TOGGLE(?:_MARKS)?\b|\[NATIVE_MARKS\.\w+\]: '|\b(?:bold|italic|underline|strike|code|superscript|subscript): NATIVE_MARKS\./u,
      ],
    ];
    const found = modules.flatMap((name) =>
      copies.flatMap(([owner, pattern]) =>
        pattern.test(source(name)) ? [`${name}: ${owner}`] : [],
      ),
    );
    expect(found).toEqual([]);
  });

  it('take the shared owners: the action gate, options, glue and test helpers', () => {
    const index = source('index.ts');
    for (const name of ['planExecute', 'actionCan', 'actionChange', 'resolveCss', 'nodeOverrides'])
      expect(index, name).toMatch(new RegExp(`\\b${name}\\(`, 'u'));
    for (const name of ['textEditorContentOf', 'tableModelOf', 'engineChange', 'ENGINE_CHANGES'])
      expect(index, name).toContain(name);
    expect(source('actions.ts')).toContain("from '../shared/actions.js'");
    expect(index).toMatch(
      /\/\*\*[^/]*\*\/\nexport type TextEditorTiptapOptions = TextEditorAdapterOptions</u,
    );
    const stubs = source('tiptap-stubs.test.ts');
    expect(stubs).toContain("from '../shared/test-helpers.test.js'");
    expect(stubs).not.toMatch(
      /class Stub(?:Element|Document)\b|const TEST_URLS|function sequentialIds/u,
    );
  });
});
