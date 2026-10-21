/**
 * The engine-neutral class vocabulary (Widgets `uwg-te-tab-vocabulary`, `uwg-te-req-pres-2`) as
 * one list for every check of rendered or written classes, and the guard over the engine folders:
 * every class an adapter writes in the `tp-te-` namespace is a class of the vocabulary, so that no
 * recipe can depend on a class that only one engine renders.
 */
import { readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { NODE_NAME } from '../../nodes.js';
import { codeOf } from './planning-ids.test.js';

/** The classes of the vocabulary table, every role's, in the table's order. */
export const VOCABULARY_CLASSES: ReadonlySet<string> = new Set([
  'tp-te-paragraph',
  'tp-te-heading',
  'tp-te-list',
  'tp-te-list-bullet',
  'tp-te-list-ordered',
  'tp-te-list-task',
  'tp-te-item',
  'tp-te-nested-item',
  'tp-te-task-item',
  'tp-te-checked',
  'tp-te-task-marker',
  'tp-te-quote',
  'tp-te-code',
  'tp-te-code-block',
  'tp-te-link',
  'tp-te-bold',
  'tp-te-image',
  'tp-te-image-host',
  'tp-te-divider',
  'tp-te-table-wrapper',
  'tp-te-table',
  'tp-te-cell',
  'tp-te-header-cell',
  'tp-te-cell-selected',
  'tp-te-table-selection',
  'tp-te-color',
  'tp-te-highlight',
  'tp-te-italic',
  'tp-te-underline',
  'tp-te-strike',
  'tp-te-sub',
  'tp-te-sup',
  'tp-te-block-cursor',
  'tp-te-callout',
]);

/** The prefixes of a custom node's class, which the node name follows. */
export const VOCABULARY_PREFIXES: readonly string[] = Object.freeze([
  'tp-te-block-',
  'tp-te-inline-',
]);

/** Whether a rendered class is in the vocabulary: one of its classes, or a custom node's class. */
export function isVocabularyClass(name: string): boolean {
  return (
    VOCABULARY_CLASSES.has(name) ||
    VOCABULARY_PREFIXES.some(
      (prefix) => name.startsWith(prefix) && NODE_NAME.test(name.slice(prefix.length)),
    )
  );
}

/**
 * The class literals of `tp-te-` in a source's code, comments left out: a class name, or a custom
 * node's prefix that the code completes with the node name. Custom properties (`--tp-te-…`) and
 * other names that merely end in such a literal are no class.
 */
export function classLiterals(code: string): string[] {
  return [...code.matchAll(/(?<![\w-])tp-te-[a-z0-9]+(?:-[a-z0-9]+)*-?/gu)].map(
    (match) => match[0],
  );
}

const adapters = new URL('../', import.meta.url).pathname;

/** The engine folders: every adapter folder but the shared core. */
const engineFolders = readdirSync(adapters, { withFileTypes: true })
  .filter((item) => item.isDirectory() && item.name !== 'shared')
  .map((item) => join(adapters, item.name));

const shippedModules = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((item) => {
    const path = join(dir, item.name);
    if (item.isDirectory()) return shippedModules(path);
    return item.name.endsWith('.ts') && !item.name.endsWith('.test.ts') ? [path] : [];
  });

describe('uwg-te-tab-vocabulary, uwg-te-req-pres-2: the engine-neutral class vocabulary', () => {
  it('names every class of the vocabulary table and the custom node classes', () => {
    expect(VOCABULARY_CLASSES.size).toBe(34);
    for (const name of ['tp-te-block-callout', 'tp-te-inline-mention', 'tp-te-block-cursor'])
      expect(isVocabularyClass(name), name).toBe(true);
    for (const name of ['tp-te-row', 'tp-te-task-content', 'tp-te-block-', 'tp-te-inline-Bad'])
      expect(isVocabularyClass(name), name).toBe(false);
    expect(
      classLiterals(
        "'tp-te-cell tp-te-header-cell' `${a ? 'tp-te-block-' : 'tp-te-inline-'}` .tp-te-code-block var(--tp-te-text-color) x-tp-te-row",
      ),
    ).toEqual([
      'tp-te-cell',
      'tp-te-header-cell',
      'tp-te-block-',
      'tp-te-inline-',
      'tp-te-code-block',
    ]);
  });

  it('every class an engine adapter writes in the tp-te- namespace is in the vocabulary', () => {
    expect(engineFolders.length).toBeGreaterThan(1);
    const modules = engineFolders.flatMap(shippedModules);
    const literals = modules.flatMap((file) =>
      classLiterals(codeOf(file)).map((literal) => [relative(adapters, file), literal] as const),
    );
    // Every engine writes the vocabulary's classes and builds the custom node classes, through
    // the shared builder, which holds both prefixes.
    const builder = classLiterals(codeOf(join(adapters, '../nodes.ts')));
    for (const prefix of VOCABULARY_PREFIXES) expect(builder, prefix).toContain(prefix);
    for (const folder of engineFolders) {
      const own = literals.filter(([file]) => join(adapters, file).startsWith(folder));
      expect(own.length, folder).toBeGreaterThan(20);
      expect(
        modules.some(
          (file) => file.startsWith(folder) && /\bcustomNodeClassName\(/u.test(codeOf(file)),
        ),
        folder,
      ).toBe(true);
    }
    const outside = literals
      .filter(
        ([, literal]) => !VOCABULARY_CLASSES.has(literal) && !VOCABULARY_PREFIXES.includes(literal),
      )
      .map(([file, literal]) => `${file}: ${literal}`);
    expect(outside).toEqual([]);
  });
});
