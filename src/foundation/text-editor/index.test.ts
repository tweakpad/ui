import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { allowedSpecifier, importSpecifiers, widgetModule } from '../../source-imports.test.js';
import { planningCitations } from './adapters/shared/planning-ids.test.js';

// The companion entry `@tweakpad/ui/text-editor` imports only relative modules and Lit, never a
// widget module, and touches no DOM when it is imported, so it loads in Node (Widgets
// `uwg-te-req-pkg-1`, `uwg-te-req-engine-1`). This guard scans every non-test source of the
// companion folder, and of the widget folder once it exists, and imports every companion module in
// Node, the engine adapters included. Since the library depends on no engine, engine names stay
// inside the adapter folders, their integration tests, the factory exports of the entry and the
// guard's own list below. The cases about the entry and the HTML importer fail when those modules
// move. The comments and test titles of the entry, this guard and the adapters' integration tests
// cite spec node ids only, through the one shared planning scan.

const src = new URL('../../', import.meta.url).pathname;
const repository = join(src, '..');
const folder = 'foundation/text-editor';
const entry = `${folder}/index.ts`;
const htmlImporter = `${folder}/content/html.ts`;
const read = (file: string) => readFileSync(join(src, file), 'utf8');
const exists = (file: string) => existsSync(join(src, file));
const sources = (dir: string): string[] =>
  !exists(dir)
    ? []
    : readdirSync(join(src, dir), { withFileTypes: true }).flatMap((item) =>
        item.isDirectory()
          ? sources(join(dir, item.name))
          : item.name.endsWith('.ts') && !item.name.endsWith('.test.ts')
            ? [join(dir, item.name)]
            : [],
      );
/** Every `.ts` file of a folder, tests included. */
const typescriptFiles = (dir: string): string[] =>
  !exists(dir)
    ? []
    : readdirSync(join(src, dir), { withFileTypes: true }).flatMap((item) =>
        item.isDirectory()
          ? typescriptFiles(join(dir, item.name))
          : item.name.endsWith('.ts')
            ? [join(dir, item.name)]
            : [],
      );
const companionFiles = sources(folder);
const widgetFiles = sources('widgets/text-editor');
const moduleUrl = (file: string) => pathToFileURL(join(src, file)).href;

/** Source text without comments; string and template literals are kept. */
const withoutComments = (text: string) =>
  text.replace(/(['"`])(?:\\[\s\S]|(?!\1)[^\\])*\1|\/\*[\s\S]*?\*\/|\/\/[^\n]*/gu, (match) =>
    /^['"`]/u.test(match) ? match : '',
  );
/** The src-relative `.ts` module a relative specifier of `file` names. */
const resolveFrom = (file: string, specifier: string) =>
  relative(src, join(src, dirname(file), specifier)).replace(/\.js$/u, '.ts');

/** Globals of a window or document that no companion module may touch while it is imported. */
const DOM_GLOBALS = [
  'document',
  'window',
  'self',
  'customElements',
  'DOMParser',
  'requestAnimationFrame',
  'HTMLElement',
  'getComputedStyle',
  'matchMedia',
  'navigator',
] as const;
/** The one exception: the built-in tools resolve the platform of their chords at import. */
const PLATFORM_READER = `${folder}/builtin-tools/core.ts`;

/** The repository-relative file of the code that called the accessor whose stack this is. */
function caller(stack: string | undefined): string {
  const frame = stack?.split('\n').filter((line) => /^\s*at /u.test(line))[1] ?? '';
  const file = /^\s*at (?:.*\()?(?:file:\/\/)?(.*?):\d+:\d+\)?$/u.exec(frame)?.[1] ?? frame.trim();
  return file.startsWith(repository) ? relative(repository, file) : file;
}

/**
 * Replaces the DOM globals with accessors that report each read and write, with the file that
 * made it, and keep their values. Returns the function that restores the originals.
 */
function trapDomGlobals(report: (name: string, file: string) => void): () => void {
  const restores: (() => void)[] = [];
  for (const name of DOM_GLOBALS) {
    const original = Object.getOwnPropertyDescriptor(globalThis, name);
    if (original?.configurable === false) continue;
    let value: unknown = original?.get ? original.get.call(globalThis) : original?.value;
    Object.defineProperty(globalThis, name, {
      configurable: true,
      get() {
        report(name, caller(new Error().stack));
        return value;
      },
      set(next: unknown) {
        report(name, caller(new Error().stack));
        value = next;
      },
    });
    restores.push(() => {
      if (original) Object.defineProperty(globalThis, name, original);
      else delete (globalThis as Record<string, unknown>)[name];
    });
  }
  return () => {
    for (const restore of restores.reverse()) restore();
  };
}

/** The names a module's source exports, types included. */
const exportedNames = (code: string): string[] => [
  ...[...code.matchAll(/^export\s+(?:type\s+)?\{([^}]*)\}/gmu)].flatMap((match) =>
    match[1]!
      .split(',')
      .map((item) => item.trim().replace(/^type\s+/u, ''))
      .filter(Boolean)
      .map((item) => /\sas\s+([\w$]+)$/u.exec(item)?.[1] ?? item),
  ),
  ...[
    ...code.matchAll(
      /^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:const|let|var|function\*?|class|interface|type|enum|namespace)\s+([\w$]+)/gmu,
    ),
  ].map((match) => match[1]!),
];

/** The runtime exports of `@tweakpad/ui/text-editor`. */
const PUBLIC_RUNTIME = [
  'TEXT_EDITOR_COLORS',
  'defaultTextEditorLayout',
  'defineTextEditorBlock',
  'defineTextEditorInline',
  'defineTextEditorTool',
  'textEditorStrings',
  'textEditorTools',
];
/**
 * The guard's own list, the only part of this file that names an engine: the pattern of
 * engine names, the two factories, which alone carry no prefix, and the folders that may name an
 * engine, each of which is its own published entry. The widget's guards import it, so that no
 * widget or recipe source spells an engine name.
 */
export const ENGINES = {
  pattern: /tiptap|lexical|prosemirror/iu,
  factories: ['createLexicalEngine', 'createTiptapEngine'],
  folders: [`${folder}/adapters/lexical/`, `${folder}/adapters/tiptap/`],
} as const;
/** The integration tests of the adapters, which may name the engines they import. */
const ADAPTER_TESTS = [
  'adapters',
  'clipboard',
  'clipboard-corpus',
  'conformance',
  'content-direction',
  'content-engines',
  'content-model',
  'goldens',
  'url-policy',
].map((name) => `${folder}/adapters/${name}.test.ts`);
const GUARD = `${folder}/index.test.ts`;
const GUARD_LIST = /^(?:export )?const ENGINES = \{$[\s\S]*?^\} as const;$/mu;
/** The folder of a factory's adapter, from the engine its name spells. */
const factoryFolder = (factory: string) =>
  ENGINES.folders.find((path) =>
    new RegExp(`/${factory.slice(6, -6).toLowerCase()}/`, 'u').test(path),
  );

/**
 * The lines of a file under the companion folder that name an engine, outside the admitted places:
 * the adapter folders and their integration tests are skipped, and so is this guard's own list.
 * The entry names no engine: the adapters ship as their own entries.
 */
function engineMentions(file: string, text: string): string[] {
  if (ENGINES.folders.some((dir) => file.startsWith(dir)) || ADAPTER_TESTS.includes(file))
    return [];
  let code = text;
  if (file === GUARD) code = code.replace(GUARD_LIST, '');
  return code
    .split('\n')
    .flatMap((line, index) => (ENGINES.pattern.test(line) ? [`${file}:${index + 1}`] : []));
}

/** The request types, which the entry exports beside the internal controller that uses them. */
const PUBLIC_REQUEST_TYPES = [
  'TextEditorRequestDetail',
  'TextEditorRequestFailedDetail',
  'TextEditorRequestOutcome',
  'TextEditorRequestSurface',
];
/** The shared Markdown policies that the HTML importer applies instead of restating them. */
const MARKDOWN_POLICIES = [
  'isAlwaysRemovedAttribute',
  'LINK_URL_ATTRIBUTES',
  'IMAGE_URL_ATTRIBUTES',
  'allowedUrl',
  'linkProtocols',
  'imageProtocols',
];

describe('text editor companion sources (uwg-te-req-pkg-1, uwg-te-req-engine-1)', () => {
  it('V-002, V-108: imports only relative modules and lit', () => {
    expect(companionFiles.length).toBeGreaterThan(0);
    const offenders = [...companionFiles, ...widgetFiles].flatMap((file) =>
      importSpecifiers(read(file))
        .filter((specifier) => specifier === null || !allowedSpecifier.test(specifier))
        .map((specifier) => `${file}: ${specifier ?? 'import() without a string specifier'}`),
    );
    expect(offenders).toEqual([]);
  });

  it('the converters and node definitions reach the built-in tools only through their identifiers', () => {
    const ids = `${folder}/builtin-tools/ids.ts`;
    expect(exists(ids)).toBe(true);
    expect(
      importSpecifiers(read(ids)).filter((specifier) => specifier !== null),
      'ids.ts imports nothing at runtime',
    ).toEqual([]);
    const converters = [`${folder}/nodes.ts`, ...sources(`${folder}/content`)];
    const offenders = converters.flatMap((file) =>
      importSpecifiers(read(file))
        .filter((specifier): specifier is string => specifier?.startsWith('.') === true)
        .map((specifier) => resolveFrom(file, specifier))
        .filter((target) => target.startsWith(`${folder}/builtin-tools/`) && target !== ids)
        .map((target) => `${file} → ${target}`),
    );
    expect(offenders).toEqual([]);
  });

  it('V-002: never imports a widget module', () => {
    const offenders = companionFiles.flatMap((file) =>
      importSpecifiers(read(file))
        .filter((specifier): specifier is string => specifier?.startsWith('.') === true)
        .filter((specifier) => widgetModule(resolveFrom(file, specifier)))
        .map((specifier) => `${file} → ${specifier}`),
    );
    expect(offenders).toEqual([]);
  });

  it('V-580, V-108: every module, the engine adapters included, imports in Node without a DOM', async () => {
    expect(
      ENGINES.folders.map((dir) => companionFiles.some((file) => file.startsWith(dir))),
    ).toEqual([true, true]);
    const touched: string[] = [];
    let importing = '';
    const restore = trapDomGlobals((name, file) => {
      if (name === 'navigator' && file === `src/${PLATFORM_READER}`) return;
      touched.push(`${importing}: ${name} (in ${file})`);
    });
    try {
      vi.resetModules();
      for (const file of companionFiles) {
        importing = file;
        await import(/* @vite-ignore */ moduleUrl(file)).catch((error: unknown) =>
          touched.push(`${file}: import failed (${String(error)})`),
        );
      }
    } finally {
      restore();
    }
    expect(touched).toEqual([]);
  });

  it('reads navigator only in the built-in tools', () => {
    const readers = companionFiles.filter(
      (file) => file !== PLATFORM_READER && /\bnavigator\b/u.test(withoutComments(read(file))),
    );
    expect(readers).toEqual([]);
  });

  it('V-123: the HTML importer uses the shared Markdown policies', () => {
    expect(exists(htmlImporter)).toBe(true);
    const code = withoutComments(read(htmlImporter));
    const imported = new Set<string>();
    for (const match of code.matchAll(/^import\s+\{([^}]*)\}\s*from\s*'([^']+)'/gmu))
      if (resolveFrom(htmlImporter, match[2]!).startsWith('foundation/markdown/'))
        for (const item of match[1]!.split(',')) imported.add(item.trim().split(/\s/u)[0]!);
    expect(MARKDOWN_POLICIES.filter((name) => !imported.has(name))).toEqual([]);
    // No local copy: no policy name is declared here, and no protocol or removal rule restated.
    expect(
      MARKDOWN_POLICIES.filter((name) =>
        new RegExp(`\\b(?:const|let|var|function|class)\\s+${name}\\b`, 'u').test(code),
      ),
    ).toEqual([]);
    expect(
      [...code.matchAll(/['"`](?:https?|mailto|tel|javascript|data):['"`]|\bsrcdoc\b/gu)].map(
        (match) => match[0],
      ),
    ).toEqual([]);
  });

  it('V-002: exports exactly the public surface, every name prefixed', async () => {
    expect(exists(entry)).toBe(true);
    const code = withoutComments(read(entry));
    expect(code).not.toMatch(/^export\s+\*/mu);
    const names = exportedNames(code);
    expect(names.length).toBeGreaterThan(0);
    expect(names.filter((name) => !/TextEditor|textEditor|TEXT_EDITOR/u.test(name))).toEqual([]);
    expect(names.filter((name) => ENGINES.pattern.test(name))).toEqual([]);
    expect(PUBLIC_REQUEST_TYPES.filter((name) => !names.includes(name))).toEqual([]);
    const api = (await import(/* @vite-ignore */ moduleUrl(entry))) as Record<string, unknown>;
    expect(Object.keys(api).sort()).toEqual([...PUBLIC_RUNTIME].sort());
  });

  it('uwg-te-req-engine-1: the entry reaches no adapter module', () => {
    const offenders = importSpecifiers(withoutComments(read(entry)))
      .filter((specifier): specifier is string => specifier?.startsWith('.') === true)
      .map((specifier) => `${resolveFrom(entry, specifier)}/`)
      .filter((target) => ENGINES.folders.some((dir) => target.startsWith(dir)));
    expect(offenders).toEqual([]);
  });

  it('uwg-te-req-engine-1: each adapter index is its own entry and exports exactly its factory at runtime', async () => {
    for (const factory of ENGINES.factories) {
      const dir = factoryFolder(factory);
      expect(dir, factory).toBeDefined();
      const file = `${dir}index.ts`;
      expect(exists(file), file).toBe(true);
      const code = withoutComments(read(file));
      expect(code, file).not.toMatch(/^export\s+\*/mu);
      const names = exportedNames(code);
      expect(
        names.filter((name) => name !== factory && !/^TextEditor/u.test(name)),
        file,
      ).toEqual([]);
      const api = (await import(/* @vite-ignore */ moduleUrl(file))) as Record<string, unknown>;
      expect(Object.keys(api), file).toEqual([factory]);
      expect(typeof api[factory], file).toBe('function');
    }
  });

  it('uwg-te-req-engine-1: no file of the companion folder names an engine outside the admitted places', () => {
    const files = typescriptFiles(folder);
    expect(files).toContain(entry);
    expect(files).toContain(GUARD);
    // The guard's list is where this file expects it, so that removing it is no silent no-op.
    expect(GUARD_LIST.test(read(GUARD))).toBe(true);
    expect(files.flatMap((file) => engineMentions(file, read(file)))).toEqual([]);
  });

  it('uwg-te-req-engine-1: the scan reports engine names in code and comments, and skips only the admitted places', () => {
    const [shared, adapter] = [`${folder}/adapters/shared/x.ts`, `${ENGINES.folders[0]}x.ts`];
    const named = ENGINES.factories[0].slice(6, -6);
    expect(engineMentions(shared, `const a = 1;\n// a ${named} note`)).toEqual([`${shared}:2`]);
    expect(engineMentions(`${folder}/controller.ts`, `const ${named}Id = 1;`)).toEqual([
      `${folder}/controller.ts:1`,
    ]);
    expect(engineMentions(adapter, `// ${named}`)).toEqual([]);
    expect(engineMentions(ADAPTER_TESTS[0]!, `// ${named}`)).toEqual([]);
    // The entry has no exemption: an export from an adapter folder names an engine.
    const from = `'./${relative(folder, ENGINES.folders[0])}/index.js'`;
    expect(engineMentions(entry, `export { ${ENGINES.factories[0]} } from ${from};`)).toEqual([
      `${entry}:1`,
    ]);
    expect(engineMentions(entry, `// ${named}`)).toEqual([`${entry}:1`]);
  });

  it('the entry, this guard and the integration tests of the adapters cite spec node ids only in comments and test titles; a title may start with V ids', () => {
    const files = [entry, GUARD, ...ADAPTER_TESTS];
    for (const file of files) expect(exists(file), file).toBe(true);
    // The shared scan reads every comment and title, and matches a decision or resolution number
    // whatever its case.
    expect(files.flatMap((file) => planningCitations(join(src, file), file))).toEqual([]);
  });
});
