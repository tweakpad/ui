import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { presentationFamilies } from '../presentation/families/index.js';
import { widgetPresentationFamilies } from '../presentation/families/widgets.js';
import { widgetDefinitions } from '../presentation/widgets.js';
import { widgetEntries } from './catalog.js';

// The widgets section mirrors the component rules with its own registries, and never leaks
// into `@tweakpad/ui` or `@tweakpad/ui/register`. Every assertion holds with zero widgets.

const root = new URL('../', import.meta.url).pathname;
const read = (file: string) => readFileSync(join(root, file), 'utf8');
const sources = (dir: string): string[] =>
  readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(join(dir, entry.name))
      : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
        ? [join(dir, entry.name)]
        : [],
  );
const componentKinds = [
  'compound-reexport',
  'flattening-compound',
  'preset-composition',
  'presentational-primitive',
  'thin-wrapper',
];
const widgetFolders = readdirSync(join(root, 'widgets'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

/** Runtime (non-type) relative imports of one source file, as src-relative `.ts` paths. */
const runtimeImports = (file: string): string[] =>
  [
    ...read(file).matchAll(
      /^(?:import|export)\s+(?!type\b)[^'"]*?from\s+'([^']+)'|^import\s+'([^']+)'/gmu,
    ),
  ]
    .map((match) => match[1] ?? match[2]!)
    .filter((specifier) => specifier.startsWith('.'))
    .map((specifier) => join(dirname(file), specifier).replace(/\.js$/u, '.ts'))
    .filter((target) => existsSync(join(root, target)));
const reachable = (entry: string, seen = new Set<string>()): Set<string> => {
  if (seen.has(entry)) return seen;
  seen.add(entry);
  for (const target of runtimeImports(entry)) reachable(target, seen);
  return seen;
};
const widgetModule = (file: string) =>
  file.startsWith('widgets/') ||
  file === 'presentation/widgets.ts' ||
  file === 'presentation/families/widgets.ts';

describe('widget catalog', () => {
  it('names each widget once with a tp- tag and a component kind', () => {
    const names = widgetEntries.map((entry) => entry.name);
    const tags = widgetEntries.map((entry) => entry.tagName);
    expect(new Set(names).size).toBe(names.length);
    expect(new Set(tags).size).toBe(tags.length);
    for (const entry of widgetEntries) {
      expect(entry.tagName).toMatch(/^tp-[a-z0-9-]+$/u);
      expect(componentKinds).toContain(entry.kind);
      expect(catalogEntries.some((component) => component.tagName === entry.tagName)).toBe(false);
      expect(catalogEntries.some((component) => component.name === entry.name)).toBe(false);
    }
  });

  it('has exactly one family per widget and shares none with components', () => {
    const familyTags = widgetPresentationFamilies.map((family) => family.definition.tagName);
    expect(new Set(familyTags).size).toBe(familyTags.length);
    expect(new Set(familyTags)).toEqual(new Set(widgetEntries.map((entry) => entry.tagName)));
    expect(new Set(widgetDefinitions.map((definition) => definition.tagName))).toEqual(
      new Set(familyTags),
    );
    const componentTags = new Set(presentationFamilies.map((family) => family.definition.tagName));
    for (const tag of familyTags) expect(componentTags.has(tag), tag).toBe(false);
  });

  it('keeps every widget in its own folder, exported and registered', () => {
    const top = readdirSync(join(root, 'widgets'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
      .filter((entry) => !entry.name.endsWith('.test.ts'))
      .map((entry) => entry.name)
      .sort();
    expect(top).toEqual(['catalog.ts', 'index.ts']);
    const index = read('widgets/index.ts');
    const register = read('register/widgets.ts');
    for (const folder of widgetFolders) {
      expect(readdirSync(join(root, 'widgets', folder)), folder).toContain('index.ts');
      expect(index, folder).toContain(`export * from './${folder}/index.js';`);
    }
    const tagClass = new Map<string, string>();
    for (const file of sources('widgets'))
      for (const match of read(file).matchAll(
        /export (?:abstract )?class (Tp\w+)[^{]*\{[\s\S]{0,800}?static (?:override )?tagName = '(tp-[a-z0-9-]+)'/gu,
      ))
        tagClass.set(match[2]!, match[1]!);
    for (const entry of widgetEntries) {
      const className = tagClass.get(entry.tagName);
      expect(className, entry.tagName).toBeDefined();
      expect(register, entry.tagName).toContain(
        `defineElement(${className}.tagName, ${className})`,
      );
    }
  });

  it('never reaches a widget module from the main index, register or presentation', () => {
    for (const entry of [
      'index.ts',
      'register.ts',
      'presentation/index.ts',
      'components/index.ts',
    ]) {
      const leaked = [...reachable(entry)].filter(widgetModule);
      expect(leaked, entry).toEqual([]);
    }
    for (const file of [...sources('components'), ...sources('foundation')])
      for (const target of runtimeImports(file))
        expect(widgetModule(relative(root, join(root, target))), `${file} → ${target}`).toBe(false);
  });
});
