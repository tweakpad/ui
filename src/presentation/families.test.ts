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
    for (const file of sources('presentation/families').filter(
      (f) => !/\/(?:index|widgets)\.ts$/.test(f),
    ))
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
      'presentation/widgets.ts',
      'presentation/families/widgets.ts',
      'widgets/index.ts',
      'widgets/catalog.ts',
    ];
    for (const file of [
      ...sources('components'),
      ...sources('foundation'),
      ...sources('widgets'),
    ]) {
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

  it('keeps every component in its own folder with an entrypoint', () => {
    const top = readdirSync(join(root, 'components'), { withFileTypes: true });
    expect(
      top.filter((entry) => entry.isFile() && entry.name.endsWith('.ts')).map((e) => e.name),
    ).toEqual(['index.ts']);
    for (const entry of top)
      if (entry.isDirectory() && entry.name !== 'shared')
        expect(readdirSync(join(root, 'components', entry.name)), entry.name).toContain('index.ts');
  });

  it('declares every library element a component renders, so defining it defines them', () => {
    const files = [...sources('components'), ...sources('widgets')];
    const tagClass = new Map<string, string>();
    for (const file of files) {
      const text = readFileSync(join(root, file), 'utf8');
      for (const match of text.matchAll(
        /export (?:abstract )?class (Tp\w+)[^{]*\{[\s\S]{0,800}?static (?:override )?tagName = '(tp-[a-z0-9-]+)'/g,
      ))
        tagClass.set(match[2]!, match[1]!);
    }
    // Each class declares what its own templates render; helper modules without a class belong
    // to the classes of their folder, so they are checked against the folder's declarations.
    const missing = new Set<string>();
    const renders = (text: string) =>
      [...text.matchAll(/(?:<|\btag: ?'|createElement\(')(tp-[a-z0-9-]+)/g)].map((m) => m[1]!);
    const declares = (text: string) =>
      [
        ...text.matchAll(
          /static (?:override )?get elementDependencies\(\)[^{]*\{\s*return \[([^\]]*)\]/g,
        ),
      ]
        .flatMap((m) => m[1]!.split(','))
        .map((name) => name.trim());
    const folderOf = (file: string) =>
      file.split('/').length > 2 ? file.split('/').slice(0, 2).join('/') : file;
    const folderText = new Map<string, string>();
    for (const file of files)
      folderText.set(
        folderOf(file),
        (folderText.get(folderOf(file)) ?? '') + readFileSync(join(root, file), 'utf8'),
      );
    for (const file of files) {
      const text = readFileSync(join(root, file), 'utf8');
      const classes = [...text.matchAll(/^export (?:abstract )?class (Tp\w+|\w+Part)\b/gm)];
      if (!classes.length) {
        // A helper module: its templates must be declared somewhere in the folder.
        const declared = declares(folderText.get(folderOf(file))!);
        for (const tag of renders(text))
          if (tagClass.has(tag) && !declared.includes(tagClass.get(tag)!))
            missing.add(`${file} renders <${tag}>`);
        continue;
      }
      classes.forEach((match, index) => {
        const body = text.slice(match.index, classes[index + 1]?.index ?? text.length);
        const own = body.match(/static (?:override )?tagName = '(tp-[a-z0-9-]+)'/)?.[1];
        const declared = declares(body);
        for (const tag of renders(body))
          if (tag !== own && tagClass.has(tag) && !declared.includes(tagClass.get(tag)!))
            missing.add(`${match[1]} (${file}) renders <${tag}>`);
      });
    }
    expect([...missing]).toEqual([]);
  });
});
