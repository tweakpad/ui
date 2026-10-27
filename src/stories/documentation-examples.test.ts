import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, posix } from 'node:path';
import { describe, expect, it } from 'vitest';
import { importSpecifiers } from '../source-imports.test.js';
import { publishedPackageImports, publishedSource } from './documentation-examples.js';

// The copyable code of every example imports only what the package publishes. Stories publish
// an authored module through `publishedSource`; the catalog publishes its multi-file bundle
// through `publishedPackageImports`.

const root = new URL('../../', import.meta.url).pathname;
const read = (path: string) => readFileSync(join(root, path), 'utf8');

/** src-relative paths of the files under a src-relative folder. */
const filesUnder = (dir: string): string[] =>
  readdirSync(join(root, 'src', dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(posix.join(dir, entry.name)) : [posix.join(dir, entry.name)],
  );

const packageExports = (
  JSON.parse(read('package.json')) as { exports: Record<string, string | { types?: string }> }
).exports;

/** Foundation entries the package exports at their own subpath. */
const foundationEntries = Object.entries(packageExports).flatMap(([key, value]) =>
  typeof value !== 'string' && value.types === `./dist/foundation${key.slice(1)}/index.d.ts`
    ? [key.slice(2)]
    : [],
);

/**
 * Whether `exports` publishes a package specifier. Every `src/icons/<name>.ts` ships declarations,
 * and all but `types.ts` ship a module, so `icons/types` serves type-only imports alone.
 */
const exportedSpecifier = (specifier: string, typeOnly: boolean): boolean => {
  const subpath = `.${specifier.slice('@tweakpad/ui'.length)}`;
  if (!subpath.includes('*') && subpath in packageExports) return true;
  const icon = /^\.\/icons\/([^/]+)$/u.exec(subpath)?.[1];
  return (
    icon !== undefined &&
    (typeOnly || icon !== 'types') &&
    './icons/*' in packageExports &&
    existsSync(join(root, 'src/icons', `${icon}.ts`))
  );
};

/**
 * Specifiers a consumer could not install: repository-relative (`../`), or `@tweakpad/ui…` that
 * `exports` does not list (icons resolved against `src/icons/<name>.ts`).
 */
const unpublishedSpecifiers = (text: string): readonly string[] => {
  const typeOnly = [
    ...text.matchAll(/^(?:import|export)\s+type\s[^'"]*?from\s*['"]([^'"]+)['"]/gmu),
  ].map((match) => match[1]!);
  return importSpecifiers(text).filter((specifier): specifier is string => {
    if (specifier === null) return false;
    if (specifier.startsWith('../')) return true;
    if (!/^@tweakpad\/ui(?:\/|$)/u.test(specifier)) return false;
    const index = typeOnly.indexOf(specifier);
    if (index !== -1) typeOnly.splice(index, 1);
    return !exportedSpecifier(specifier, index !== -1);
  });
};

/** Story sources: every `src/stories/**` module but this one and the tests, and the catalog. */
const storySources = (): readonly string[] => [
  ...filesUnder('stories').filter(
    (file) =>
      file.endsWith('.ts') &&
      !file.endsWith('.test.ts') &&
      file !== 'stories/documentation-examples.ts',
  ),
  'catalog.stories.ts',
];

/** src-relative paths of the `./…(.js|.ts)?raw` modules a source imports. */
const rawImports = (importer: string): string[] =>
  [...read(`src/${importer}`).matchAll(/['"](\.\/[^'"?]+\.(?:js|ts))\?raw['"]/gu)].map((match) =>
    posix.normalize(posix.join(posix.dirname(importer), match[1]!)),
  );

const workspace = 'stories/workspace/';

/**
 * src-relative paths of every module a story publishes as copyable source: each
 * `./…(.js|.ts)?raw` import of a story module, and the workspace modules the catalog publishes,
 * sorted.
 */
const publishedExampleModules = (): readonly string[] =>
  [
    ...new Set([
      ...storySources().flatMap(rawImports),
      ...filesUnder(workspace).filter((file) => file.endsWith('.ts')),
    ]),
  ].sort();

/** The modules a story publishes on their own, through `publishedSource`. */
const singleModules = () => publishedExampleModules().filter((file) => !file.startsWith(workspace));

/** The files of the catalog's bundle: the workspace folder and the modules the catalog imports raw. */
const catalogBundle = (): ReadonlySet<string> =>
  new Set([...filesUnder(workspace), ...rawImports('catalog.stories.ts')]);

const importLine = /^\s*(?:import\b|export\b.*\bfrom\b|\}\s*from\b)/u;
const maskQuoted = (line: string) => line.replaceAll(/(['"])[^'"\n]*\1/gu, "''");

/** Lines a publisher changed other than the specifiers of import lines. */
const nonSpecifierChanges = (before: string, after: string): readonly string[] => {
  const source = before.split('\n');
  const published = after.split('\n');
  if (source.length !== published.length)
    return [`${source.length} lines became ${published.length}`];
  return published.flatMap((line, index) => {
    const original = source[index]!;
    return line === original || (importLine.test(line) && maskQuoted(line) === maskQuoted(original))
      ? []
      : [`${index + 1}: ${line}`];
  });
};

/** The end of the string literal that starts at `start`. */
const stringEnd = (text: string, start: number): number => {
  const quote = text[start];
  let index = start + 1;
  while (index < text.length && text[index] !== quote) index += text[index] === '\\' ? 2 : 1;
  return index + 1;
};

/** The end of the regular expression literal, flags included, that starts at `start`. */
const regexEnd = (text: string, start: number): number => {
  let index = start + 1;
  let inClass = false;
  while (index < text.length && (inClass || text[index] !== '/')) {
    if (text[index] === '\\') index += 1;
    else if (text[index] === '[') inClass = true;
    else if (text[index] === ']') inClass = false;
    index += 1;
  }
  index += 1;
  while (/[a-z]/u.test(text[index] ?? '')) index += 1;
  return index;
};

/** The source text of the arguments of the call whose parenthesis opens just before `start`. */
const callArguments = (text: string, start: number): readonly string[] => {
  const args: string[] = [];
  let current = '';
  let depth = 0;
  let index = start;
  while (index < text.length) {
    const char = text[index]!;
    const end =
      char === "'" || char === '"' || char === '`'
        ? stringEnd(text, index)
        : char === '/' && current.trim() === ''
          ? regexEnd(text, index)
          : undefined;
    if (end !== undefined) {
      current += text.slice(index, end);
      index = end;
      continue;
    }
    if (')]}'.includes(char)) {
      if (depth === 0) break;
      depth -= 1;
    } else if ('([{'.includes(char)) depth += 1;
    if (char === ',' && depth === 0) {
      args.push(current.trim());
      current = '';
    } else current += char;
    index += 1;
  }
  if (current.trim() !== '') args.push(current.trim());
  return args;
};

/**
 * `replace`/`replaceAll` calls whose pattern names a `../` path and either names an icons,
 * widgets, foundation or components module or is replaced by a `@tweakpad/ui` specifier.
 */
const handWrittenImportRewrites = (text: string): readonly string[] =>
  [...text.matchAll(/\.replace(?:All)?\(/gu)].flatMap((match) => {
    const [pattern = '', replacement = ''] = callArguments(text, match.index + match[0].length);
    const path = pattern.replaceAll(/\\([./])/gu, '$1');
    return path.includes('../') &&
      (/(?:^|[^\w-])(?:icons|widgets|foundation|components)\//u.test(path) ||
        replacement.includes('@tweakpad/ui'))
      ? [`${text.slice(0, match.index).split('\n').length}: ${pattern}`]
      : [];
  });

const depths = ['../', '../../', '../../../'];

describe('copyable example sources (uwg-req-102)', () => {
  it('publishes each foundation entry the package exports at its subpath, from any depth', () => {
    expect(foundationEntries).toContain('text-editor');
    for (const entry of foundationEntries)
      for (const depth of depths)
        expect(publishedSource(`import { a } from '${depth}foundation/${entry}/index.js';`)).toBe(
          `import { a } from '@tweakpad/ui/${entry}';`,
        );
  });

  it("publishes a module inside an exported foundation entry at that entry's subpath", () => {
    expect(publishedSource("import { a } from '../foundation/flow/router/planner.js';")).toBe(
      "import { a } from '@tweakpad/ui/flow';",
    );
    expect(
      publishedSource("import { b } from '../../foundation/text-editor/content/mechanics.js';"),
    ).toBe("import { b } from '@tweakpad/ui/text-editor';");
  });

  it('publishes every other foundation module from the package root', () => {
    const modules = [
      ...readdirSync(join(root, 'src/foundation'), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() &&
        !foundationEntries.includes(entry.name) &&
        existsSync(join(root, 'src/foundation', entry.name, 'index.ts'))
          ? [`${entry.name}/index.js`]
          : [],
      ),
      'motion.js',
      'collect-targets.js',
      'text-transform/presets.js',
    ];
    expect(modules).toContain('time/index.js');
    for (const module of modules)
      for (const depth of depths)
        expect(publishedSource(`import { a } from '${depth}foundation/${module}';`)).toBe(
          "import { a } from '@tweakpad/ui';",
        );
  });

  it('publishes component modules from the package root, type-only imports included', () => {
    expect(publishedSource("} from '../components/carousel/effects/index.js';")).toBe(
      "} from '@tweakpad/ui';",
    );
    expect(
      publishedSource("import type { T } from '../components/message-scroller/index.js';"),
    ).toBe("import type { T } from '@tweakpad/ui';");
    expect(publishedSource("import { U } from '../../../components/file-upload/index.js';")).toBe(
      "import { U } from '@tweakpad/ui';",
    );
  });

  it('keeps the icon and widget rewrites', () => {
    expect(publishedSource("import { plusIcon } from '../icons/plus.js';")).toBe(
      "import { plusIcon } from '@tweakpad/ui/icons/plus';",
    );
    expect(publishedSource("import { zapIcon } from '../../icons/zap.js';")).toBe(
      "import { zapIcon } from '@tweakpad/ui/icons/zap';",
    );
    expect(publishedSource("import { TpFlow } from '../widgets/flow/index.js';")).toBe(
      "import { TpFlow } from '@tweakpad/ui/widgets';",
    );
    expect(publishedSource("import '../../widgets/text-editor/index.js';")).toBe(
      "import '@tweakpad/ui/widgets';",
    );
  });

  it('drops .js from relative specifiers only', () => {
    expect(publishedSource("import { h } from './helper.js';")).toBe(
      "import { h } from './helper';",
    );
    expect(publishedSource("import { s } from '../shared/helper.js';")).toBe(
      "import { s } from '../shared/helper';",
    );
    for (const kept of [
      "import { p } from 'some-package/sub.js';",
      "import { repeat } from 'lit/directives/repeat.js';",
      "const m = await import('some-package/sub.js');",
    ])
      expect(publishedSource(kept)).toBe(kept);
  });

  it('leaves no repository-relative specifier in any published example module', () => {
    const modules = singleModules();
    expect(modules).toContain('stories/widgets/flow-example.js');
    const findings = modules.flatMap((module) =>
      unpublishedSpecifiers(publishedSource(read(`src/${module}`)))
        .filter((specifier) => specifier.startsWith('../'))
        .map((specifier) => `${module}: ${specifier}`),
    );
    expect(findings).toEqual([]);
  });

  it('publishes only specifiers the package exports', () => {
    const findings = singleModules().flatMap((module) =>
      unpublishedSpecifiers(publishedSource(read(`src/${module}`)))
        .filter((specifier) => !specifier.startsWith('../'))
        .map((specifier) => `${module}: ${specifier}`),
    );
    expect(findings).toEqual([]);
  });

  it('changes nothing in a published example module but its import specifiers', () => {
    const findings = singleModules().flatMap((module) => {
      const raw = read(`src/${module}`);
      return nonSpecifierChanges(raw, publishedSource(raw)).map((line) => `${module}:${line}`);
    });
    expect(findings).toEqual([]);
  });

  it('publishes the catalog bundle with package imports, relative only to files it carries', () => {
    const bundle = catalogBundle();
    const carried = (module: string, specifier: string) => {
      const path = posix.normalize(posix.join(posix.dirname(module), specifier));
      return bundle.has(path) || bundle.has(path.replace(/\.js$/u, '.ts'));
    };
    const modules = [...bundle].filter((file) => /\.(?:js|ts)$/u.test(file));
    expect(modules).toContain('stories/workspace/workspace.ts');
    const findings = modules.flatMap((module) => {
      const raw = read(`src/${module}`);
      const published = publishedPackageImports(raw);
      return [
        ...importSpecifiers(published).filter(
          (specifier): specifier is string =>
            specifier !== null && /^\.\.?\//u.test(specifier) && !carried(module, specifier),
        ),
        ...unpublishedSpecifiers(published).filter((specifier) => !specifier.startsWith('../')),
        ...nonSpecifierChanges(raw, published),
      ].map((finding) => `${module}: ${finding}`);
    });
    expect(findings).toEqual([]);
  });

  it('leaves no hand-written import rewrite in the story sources', () => {
    const findings = storySources().flatMap((file) =>
      handWrittenImportRewrites(read(`src/${file}`)).map((finding) => `${file}:${finding}`),
    );
    expect(findings).toEqual([]);
  });

  it('reads every written form of a hand rewrite, and no composition edit', () => {
    const rewrites = [
      `setupSource.replaceAll("'../foundation/code/index.js'", "'@tweakpad/ui/code'")`,
      `const script = setupSource.replace(\n  "'../foundation/drag-drop/index.js'",\n  "'@tweakpad/ui/drag-drop'",\n);`,
      "source.replaceAll('../components/message-scroller/index.js', '@tweakpad/ui')",
      String.raw`demoSource.replaceAll(/'\.\.\/icons\/([^']+)\.js'/g, "'@tweakpad/ui/icons/$1'")`,
      `setupSource.replaceAll("'../", "'@tweakpad/ui/").replaceAll(".js';", "';")`,
      String.raw`source.replace(/'(?:\.\.\/)+foundation\/[^']+'/g, "'@tweakpad/ui'")`,
    ];
    expect(rewrites.map((text) => handWrittenImportRewrites(text).length)).toEqual([
      1, 1, 1, 1, 1, 1,
    ]);
    const compositionEdits = [
      String.raw`setupSource.replace(/^import \{ fillGeneratedText \}.*\n/mu, '')`,
      String.raw`casesSource.replace(/import type \{ TpMessageScroller \} from '[^']+';\n/, '')`,
      String.raw`casesSource.replace(/import \{[^}]+\} from '\.\/message-scroller-streaming.js';\n/, '')`,
      `source.replaceAll("'../data-visualization.examples.js'", "'./chart.js'")`,
      `source.replace(\n  "  import '@tweakpad/ui/register';",\n  "  import '@tweakpad/ui/register';\\n  import { plusIcon } from '@tweakpad/ui/icons/plus';",\n)`,
      "title.toLowerCase().replace(/[^a-z0-9]+/g, '-')",
      String.raw`setupSource.replace(/^import \{ applyDatePickerTrigger \}.*\n/mu, '')`,
      "datePickerSource.replaceAll(/^export /gmu, '')",
    ];
    expect(compositionEdits.flatMap(handWrittenImportRewrites)).toEqual([]);
  });

  it('reads repository-relative and unexported package specifiers, and nothing else', () => {
    const flagged = ['../x.js', '@tweakpad/ui/icons/no-such-icon', '@tweakpad/ui/time'];
    const kept = [
      './x',
      '@tweakpad/ui',
      '@tweakpad/ui/text-editor',
      '@tweakpad/ui/icons/plus',
      '@tweakpad/ui/styles.css',
      'lit/directives/repeat.js',
      'some-package/sub.js',
    ];
    const text = [...flagged, ...kept]
      .map((specifier, index) => `import { a${index} } from '${specifier}';`)
      .join('\n');
    expect(unpublishedSpecifiers(text)).toEqual(flagged);
    // Icon declarations without a module serve type-only imports alone.
    expect(
      unpublishedSpecifiers(
        [
          "import type { IconDefinition } from '@tweakpad/ui/icons/types';",
          "export type { IconPath } from '@tweakpad/ui/icons/types';",
          "import { iconValue } from '@tweakpad/ui/icons/types';",
        ].join('\n'),
      ),
    ).toEqual(['@tweakpad/ui/icons/types']);
  });

  it("inlines the calendar's sibling helper, so no calendar example imports a relative module", async () => {
    const { calendarExamples } = await import('./calendar.examples.js');
    const codes = calendarExamples.map((example) => example.code);
    const withHelper = codes.filter((code) => code.includes('applyDatePickerTrigger('));
    expect(withHelper).not.toHaveLength(0);
    for (const code of codes)
      expect(
        importSpecifiers(code).filter(
          (specifier) => specifier !== null && /^\.\.?\//u.test(specifier),
        ),
      ).toEqual([]);
    for (const code of withHelper) {
      expect(code.match(/^function applyDatePickerTrigger\(/gmu) ?? []).toHaveLength(1);
      expect(code.match(/^function datePickerTriggerContracts\(/gmu) ?? []).toHaveLength(1);
      expect(code).not.toMatch(
        /\bexport function (?:applyDatePickerTrigger|datePickerTriggerContracts)\(/u,
      );
    }
  });

  it('documents only package imports that the package exports, in every documentation page', () => {
    const pages = (dir: string): string[] =>
      readdirSync(join(root, dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory()
          ? pages(posix.join(dir, entry.name))
          : entry.name.endsWith('.md')
            ? [posix.join(dir, entry.name)]
            : [],
      );
    const findings = [...pages('docs'), 'README.md'].flatMap((page) =>
      [...read(page).matchAll(/^```(?:js|ts|javascript|typescript|html)\n([\s\S]*?)^```/gmu)]
        .flatMap((fence) => unpublishedSpecifiers(fence[1]!.replace(/^[ \t]+/gmu, '')))
        .filter((specifier) => specifier.startsWith('@tweakpad/ui'))
        .map((specifier) => `${page}: ${specifier}`),
    );
    expect(findings).toEqual([]);
  });

  it('publishes the data visualization story source with package imports', async () => {
    const { default: meta } = await import('./data-visualization.stories.js');
    const code = meta.parameters.docs.source.code;
    expect(code).toBe(publishedSource(read('src/stories/data-visualization.examples.ts')));
    expect(unpublishedSpecifiers(code)).toEqual([]);
  });
});
