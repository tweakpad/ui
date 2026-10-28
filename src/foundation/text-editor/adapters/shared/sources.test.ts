/**
 * Guards over the sources of the companion, the shared adapter core and the foundation modules
 * they build on: their comments and test titles cite spec node ids only and state each rule in
 * words (each engine folder runs the same scan in its own guard); no adapter module restates a
 * rule that a shared owner holds; and every value a shared module exports is used by shipped code.
 */
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { codeOf, planningCitations } from './planning-ids.test.js';

const companion = new URL('../../', import.meta.url).pathname;
const foundation = join(companion, '..');
const adapters = join(companion, 'adapters');
const shared = join(adapters, 'shared');

/** The engine folders: every adapter folder but the shared core; each has its own guard. */
const engineFolders = readdirSync(adapters, { withFileTypes: true })
  .filter((item) => item.isDirectory() && item.name !== 'shared')
  .map((item) => join(adapters, item.name));

const typescript = (dir: string, skip: readonly string[] = []): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return skip.includes(path) ? [] : typescript(path, skip);
    return item.name.endsWith('.ts') && !item.name.endsWith('.d.ts') ? [path] : [];
  });

const shipped = (files: readonly string[]): string[] =>
  files.filter((file) => !file.endsWith('.test.ts'));

/** The companion without the engine folders, and the foundation modules the core builds on. */
const SCANNED = [
  ...typescript(companion, engineFolders),
  ...['freeze', 'generated-style'].flatMap((name) => [
    join(foundation, `${name}.ts`),
    join(foundation, `${name}.test.ts`),
  ]),
];

/** Every shipped module of the adapters: the shared core and each engine folder. */
const ADAPTER_MODULES = shipped(typescript(adapters));

/** Every shipped module of the companion, the engine folders included. */
const COMPANION_MODULES = shipped(typescript(companion));

const code = new Map<string, string>();
const codeOfFile = (file: string): string => {
  let text = code.get(file);
  if (text === undefined) code.set(file, (text = codeOf(file)));
  return text;
};

const label = (file: string): string => relative(foundation, file);

describe('sources of the companion and the shared adapter core', () => {
  it('cite spec node ids only in comments and test titles; a title may start with V ids', () => {
    expect(SCANNED.length).toBeGreaterThan(80);
    expect(SCANNED).toContain(join(companion, 'tools-types.test.ts'));
    expect(SCANNED).toContain(join(foundation, 'generated-style.test.ts'));
    expect(SCANNED).toContain(join(adapters, 'conformance.test.ts'));
    expect(SCANNED.some((file) => engineFolders.some((folder) => file.startsWith(folder)))).toBe(
      false,
    );
    expect(SCANNED.flatMap((file) => planningCitations(file, label(file)))).toEqual([]);
  });

  it('every source guard runs the one shared planning scan', () => {
    const guards = [shared, ...engineFolders].map((folder) => join(folder, 'sources.test.ts'));
    for (const guard of guards) {
      const text = codeOfFile(guard);
      expect(text, label(guard)).toMatch(
        /import \{[^}]*\bplanningCitations\b[^}]*\} from '(?:\.|\.\.\/shared)\/planning-ids\.test\.js'/u,
      );
      expect(text, label(guard)).not.toMatch(
        /(?:const|function) (?:PLANNING\w*|CHECK_PREFIX|planningCitations)\b/u,
      );
    }
  });

  it('keep each rule in its shared owner: no adapter module restates it', () => {
    /** Patterns of a restated rule, with the one module that owns the rule. */
    const RULES: readonly (readonly [string, RegExp, string])[] = [
      ['the change record of a content load', /cause: 'content',\s*reason:/u, 'shared/actions.ts'],
      [
        'the inline content at a cell paragraph',
        /placedCell\([^)]*\)\?\.cell\.paragraphs\[/u,
        'shared/selection-state.ts',
      ],
      ['the node support of a definition', /NODE_NAME\.test\(/u, '../nodes.ts'],
      [
        'the capabilities of an engine',
        /new Set<TextEditorCapability>\(BASE_CAPABILITIES\)/u,
        '../capabilities.ts',
      ],
    ];
    const restated = ADAPTER_MODULES.flatMap((file) =>
      RULES.flatMap(([rule, pattern, owner]) =>
        file !== join(adapters, owner) && pattern.test(codeOfFile(file))
          ? [`${relative(adapters, file)}: ${rule}`]
          : [],
      ),
    );
    expect(restated).toEqual([]);
  });

  it('export only values that shipped code uses, in their own module or another', () => {
    const unused = shipped(typescript(shared)).flatMap((file) =>
      [
        ...codeOfFile(file).matchAll(
          /^export (?:async )?(?:function\*?|const|let|class) ([\w$]+)/gmu,
        ),
      ]
        .map((match) => match[1]!)
        .filter((name) => {
          const word = `(?<![\\w$])${name.replace(/\$/gu, '\\$')}(?![\\w$])`;
          if ((codeOfFile(file).match(new RegExp(word, 'gu')) ?? []).length > 1) return false;
          const use = new RegExp(word, 'u');
          return !COMPANION_MODULES.some((other) => other !== file && use.test(codeOfFile(other)));
        })
        .map((name) => `${relative(adapters, file)}: ${name}`),
    );
    expect(unused).toEqual([]);
  });
});
