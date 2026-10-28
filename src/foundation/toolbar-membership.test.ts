import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { importSpecifiers } from '../source-imports.test.js';

// The Toggle group finds its toolbar through the membership module alone, so a page that renders a
// Toggle group without a Toolbar does not load the controller, its key bindings or its press
// handling (`uwg-te-toggle-group-req-toolbar`, `node-009977`). The membership module stays
// internal, like the controller's other helpers.

const src = new URL('../', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(src, file), 'utf8');
const membership = 'foundation/toolbar-membership.ts';
const controller = 'foundation/toolbar.ts';
const toggleGroup = 'components/toggle-group/toggle-group.ts';

/**
 * The relative modules that a source loads at run time, as src-relative `.ts` paths. The compiler
 * drops the type-only imports first, as the build does, and the shared reader reads the rest.
 */
const runtimeImports = (file: string): string[] =>
  importSpecifiers(
    ts.transpileModule(read(file), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
    }).outputText,
  )
    .filter((specifier): specifier is string => specifier?.startsWith('.') === true)
    .map((specifier) => join(dirname(file), specifier).replace(/\.js$/u, '.ts'));
const reachable = (entry: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const target of runtimeImports(entry))
    if (existsSync(join(src, target))) reachable(target, seen);
  return seen;
};
/** Module-level registries a source declares. */
const registries = (file: string) =>
  [...read(file).matchAll(/^(?:export )?const (\w+) = new (?:WeakMap|Map|WeakSet|Set)\b/gmu)].map(
    (match) => match[1],
  );

describe('toolbar membership module', () => {
  it('reads runtime imports without type-only ones', () => {
    expect(runtimeImports(toggleGroup)).toContain(membership);
    expect(runtimeImports(controller)).toContain(membership);
    expect(runtimeImports(membership)).toEqual(['foundation/focus.ts']);
  });

  it('loads the Toggle group without the toolbar controller', () => {
    const graph = reachable(toggleGroup);
    expect({ membership: graph.has(membership), controller: graph.has(controller) }).toEqual({
      membership: true,
      controller: false,
    });
  });

  it('reaches none of the controller’s own dependencies from the membership module', () => {
    const graph = [...reachable(membership)];
    for (const module of [
      controller,
      'foundation/key-bindings.ts',
      'foundation/key-notation.ts',
      'foundation/press.ts',
      'foundation/interactive-target.ts',
      'foundation/owned-attributes.ts',
    ])
      expect(graph).not.toContain(module);
  });

  it('declares the registries once, in the membership module', () => {
    expect(registries(membership)).toEqual(['roots', 'itemOwners', 'subscriptions']);
    expect(registries(controller)).toEqual([]);
  });

  it('stays out of every public entry', () => {
    const indexes = (dir: string): string[] =>
      readdirSync(join(src, dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? indexes(join(dir, entry.name))
          : entry.name === 'index.ts'
            ? [join(dir, entry.name)]
            : [],
      );
    const entries = [
      'index.ts',
      'register.ts',
      'foundation/index.ts',
      'presentation/index.ts',
      'widgets/index.ts',
      ...indexes('components'),
    ];
    for (const file of entries)
      expect({ file, exported: read(file).includes('toolbar-membership') }).toEqual({
        file,
        exported: false,
      });
  });
});
