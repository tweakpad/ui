/**
 * Guards over the sources of the Lexical adapter (Widgets `uwg-te-req-engine-1`,
 * `uwg-te-par-engine-1`): their comments and test titles cite spec node ids only and state each
 * rule in words; the shipped modules reach the engine through structural types precise enough
 * that a wrong argument fails to compile, export no test-only entry point, and keep no local copy
 * of a rule the shared adapter core or the companion owns.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { planningCitations } from '../shared/planning-ids.test.js';

const folder = new URL('.', import.meta.url).pathname;
const files = readdirSync(folder).filter((name) => name.endsWith('.ts'));
const shipped = files.filter((name) => !name.endsWith('.test.ts'));
const source = (name: string): string => readFileSync(join(folder, name), 'utf8');

describe('uwg-te-req-engine-1: the sources of the Lexical adapter', () => {
  it('cite spec node ids only in comments and test titles; a title may start with V ids', () => {
    expect(files.length).toBeGreaterThan(30);
    expect(files.flatMap((name) => planningCitations(join(folder, name), name))).toEqual([]);
  });

  it('cast nothing to never and take no never-typed parameter but the constructor of any node class', () => {
    const found = shipped.flatMap((name) =>
      source(name)
        .split('\n')
        .flatMap((text, index) => {
          if (/^\s*(?:\/\/|\/\*|\*)/u.test(text)) return [];
          const loose =
            /\bas never\b|as unknown as RegExp/u.test(text) ||
            (/\w\??:\s*never\b/u.test(text) && !/\.\.\.args: never\[\]/u.test(text));
          return loose ? [`${name}:${index + 1}: ${text.trim()}`] : [];
        }),
    );
    expect(found).toEqual([]);
  });

  it('export from the entry only the factory, its option types and the modules type', () => {
    const exported = [
      ...source('index.ts').matchAll(
        /^export (?:type |interface |function |const |class )?(?:\{([^}]*)\}|(\w+))/gmu,
      ),
    ].flatMap((match) =>
      match[1] !== undefined ? match[1].split(',').map((name) => name.trim()) : [match[2] ?? ''],
    );
    expect(exported.sort()).toEqual([
      'TextEditorLexicalModules',
      'TextEditorLexicalNodeOverride',
      'TextEditorLexicalOptions',
      'createLexicalEngine',
    ]);
  });

  it('keep no local copy of a shared rule and no dead or test-only code', () => {
    const REMOVED = [
      '$copyBlockId',
      '$selectedBlockIds',
      '$textEdgeOf',
      'FORMAT_BITS',
      'INLINE_RULE_TRIGGERS',
      'LexicalCssOption',
      'LexicalInstanceTarget',
      'LexicalNodeOverride',
      'TOGGLE_BITS',
      'characterTieAfter',
      'clientRect',
      'clipboardPayload',
      'createLexicalInstance',
      'customAttributes',
      'definitionOfType',
      'documentKey',
      'engineChange',
      'freshId',
      'inlineAtCell',
      'isElementLike',
      'lexicalCss',
      'mapSelection',
      'notFound',
      'taskContentRects',
      'tieAfter',
    ];
    const defined = shipped.flatMap((name) =>
      [
        ...source(name).matchAll(
          /^(?:export )?(?:async )?(?:function\*? |const |let |class |interface |type )(\$?\w+)/gmu,
        ),
      ].map((match) => match[1]),
    );
    expect(REMOVED.filter((name) => defined.includes(name))).toEqual([]);
  });

  it('keep the tests of each module in its own test file, none named after a review', () => {
    expect(
      files.filter((name) => /^(?:contract|adoption|review-fixes)\.test\.ts$/u.test(name)),
    ).toEqual([]);
  });
});
