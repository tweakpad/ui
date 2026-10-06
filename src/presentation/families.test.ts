import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { presentationFamilies } from './families/index.js';

const root = new URL('../', import.meta.url).pathname;
const sources = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
        ? [join(dir, entry.name)]
        : [],
  );
const imports = (file: string) =>
  [...readFileSync(join(root, file), 'utf8').matchAll(/from '([^']+)'/g)].map((match) => match[1]!);

// Tree-shaking contract: an application that uses one component bundles that component's
// presentation and code only. Catalog-wide aggregates exist for explicit consumer imports.
describe('per-component presentation ownership', () => {
  it('has exactly one family per catalog component', () => {
    const tags = presentationFamilies.map((family) => family.definition.tagName);
    expect(new Set(tags).size).toBe(tags.length);
    for (const entry of catalogEntries) expect(tags).toContain(entry.tagName);
  });

  it('keeps families independent: no family imports another family or an aggregate', () => {
    for (const file of sources('presentation/families').filter((f) => !f.endsWith('index.ts')))
      for (const specifier of imports(file))
        expect(specifier, file).toMatch(
          /^(\.\.\/recipes\/|\.\.\/family\.js$|\.\.\/definition\.js$)/,
        );
  });

  it('keeps recipes free of catalog-wide registries', () => {
    for (const file of sources('presentation/recipes'))
      for (const specifier of imports(file))
        expect(specifier, file).not.toMatch(
          /(components|default|families\/index|definitions)\.js$/,
        );
  });

  it('never imports catalog-wide aggregates from components or foundation', () => {
    const aggregates = [
      'presentation/components.ts',
      'presentation/default.ts',
      'presentation/families/index.ts',
      'presentation/index.ts',
      'foundation/index.ts',
      'components/index.ts',
      'index.ts',
      'catalog.ts',
    ];
    for (const file of [...sources('components'), ...sources('foundation')]) {
      if (aggregates.includes(file)) continue;
      for (const specifier of imports(file)) {
        if (!specifier.startsWith('.')) continue;
        const target = relative(root, join(root, file, '..', specifier)).replace(/\.js$/, '.ts');
        expect(aggregates, `${file} imports ${specifier}`).not.toContain(target);
      }
    }
  });

  it('keeps Foundation independent of component implementations', () => {
    for (const file of sources('foundation'))
      for (const specifier of imports(file).filter((s) => s.includes('/components/')))
        expect(readFileSync(join(root, file), 'utf8'), `${file} → ${specifier}`).toMatch(
          new RegExp(
            `import type [^;]+'${specifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}'|export \\* from '${specifier.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}'`,
          ),
        );
  });

  it('imports component code from owning modules, not compatibility barrels', () => {
    const barrels = new Set([
      'components/primitives.ts',
      'components/display.ts',
      'components/shared.ts',
    ]);
    const offenders: string[] = [];
    for (const file of [...sources('components'), ...sources('foundation')]) {
      if (barrels.has(file) || file === 'components/index.ts') continue;
      for (const specifier of imports(file)) {
        if (!specifier.startsWith('.')) continue;
        const target = join(file, '..', specifier).replace(/\.js$/, '.ts');
        if (barrels.has(target)) offenders.push(`${file} -> ${specifier}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('declares every library element a component renders, so defining it defines them', () => {
    const files = sources('components');
    const tagClass = new Map<string, string>();
    for (const file of files) {
      const text = readFileSync(join(root, file), 'utf8');
      for (const match of text.matchAll(
        /export (?:abstract )?class (Tp\w+)[^{]*\{[\s\S]{0,800}?static (?:override )?tagName = '(tp-[a-z0-9-]+)'/g,
      ))
        tagClass.set(match[2]!, match[1]!);
    }
    // A component folder owns its templates, including helper modules without a class.
    const folders = new Map<string, string[]>();
    for (const file of files) {
      const folder = file.split('/').length > 2 ? file.split('/').slice(0, 2).join('/') : file;
      folders.set(folder, [...(folders.get(folder) ?? []), file]);
    }
    const missing = new Set<string>();
    for (const [folder, members] of folders) {
      const text = members.map((file) => readFileSync(join(root, file), 'utf8')).join('\n');
      const own = new Set(
        [...text.matchAll(/static (?:override )?tagName = '(tp-[a-z0-9-]+)'/g)].map((m) => m[1]),
      );
      const declared = [
        ...text.matchAll(/static get elementDependencies\(\)[^{]*\{\s*return \[([^\]]*)\]/g),
      ]
        .flatMap((m) => m[1]!.split(','))
        .map((name) => name.trim());
      for (const [, tag] of text.matchAll(/(?:<|\btag: ?'|createElement\(')(tp-[a-z0-9-]+)/g)) {
        if (own.has(tag) || !tagClass.has(tag!)) continue;
        if (!declared.includes(tagClass.get(tag!)!)) missing.add(`${folder} renders <${tag}>`);
      }
    }
    expect([...missing]).toEqual([]);
  });
});
