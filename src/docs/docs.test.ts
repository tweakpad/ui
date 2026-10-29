import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries, catalogFolder } from '../catalog.js';
import { widgetEntries } from '../widgets/catalog.js';
import { DOC_FOLDERS, docId, parseDoc, slugify, type ParsedDoc } from './parse.js';
import { isPreviewSpecifier, previewImports, unsupportedImports } from './preview-runtime.js';

/**
 * The documentation pages follow the page structure of the documentation skill
 * (`.agents/skills/tweakpad-docs/references/structure.md`): the checks here are the skeleton and
 * the few terms that must stay precise, nothing about how a page is written.
 */

const root = new URL('../../', import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), 'utf8');
const list = (dir: string) =>
  existsSync(new URL(dir, root)) ? readdirSync(new URL(dir, root)) : [];
const sources = (dir: string): string[] =>
  readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? sources(`${dir}${entry.name}/`)
      : entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')
        ? [`${dir}${entry.name}`]
        : [],
  );

const pages: ParsedDoc[] = DOC_FOLDERS.flatMap((folder) =>
  list(`docs/${folder}/`)
    .filter((file) => file.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const path = `docs/${folder}/${file}`;
      return parseDoc(read(path), docId(path));
    }),
);
const entries = [
  ...catalogEntries.map((entry) => ({ ...entry, folder: catalogFolder(entry) })),
  ...widgetEntries.map((entry) => ({ ...entry, folder: 'widgets' as const })),
];
const pending = new Set<string>(
  (JSON.parse(read('scripts/docs/pending.json')) as { tags: string[] }).tags,
);

/** Every `static tagName` under the component and widget sources. */
const declaredTags = new Set(
  [...sources('src/components/'), ...sources('src/widgets/')].flatMap((file) =>
    [...read(file).matchAll(/static (?:override )?tagName = '(tp-[\w-]+)'/g)].map(
      (match) => match[1]!,
    ),
  ),
);

const AUTHORED_NEVER = new Set(
  // Usage may show how to listen to events (`### Events`) or fill slots (`### Slots`); the
  // generated API Reference and Related sections are never authored.
  [
    'API',
    'API reference',
    'Related',
    'Reference',
    'Attributes',
    'Properties',
    'Methods',
    'CSS parts',
  ].map(slugify),
);

/** Native controls a preview never substitutes for the library's component, with the pages whose subject needs them. */
const NATIVE_SUBSTITUTES =
  /<(button|input|textarea|select|svg|table|dialog|progress|meter|details|kbd|label)\b/g;
const NATIVE_ALLOWED: Record<string, readonly string[]> = {
  'components/native-select': ['select'],
  'components/select': ['select'],
  'components/label': ['label', 'input'],
  'components/field': ['input'],
  // Kept as the website pages show them: Tabs triggers are native buttons, a data table and a
  // two-axis scroll body are native tables, Input group pairs a native textarea, Markdown renders
  // a script's kbd child.
  'components/tabs': ['button'],
  'components/data-visualization': ['table'],
  'components/scroll-area': ['table'],
  'components/input-group': ['textarea'],
  'components/markdown': ['kbd'],
  // Inline icons in the website pages' previews, kept unchanged by the documentation merge.
  ...Object.fromEntries(
    [
      'alert-dialog',
      'alert',
      'attachment',
      'avatar',
      'badge',
      'breadcrumb',
      'button-group',
      'button',
      'calendar',
      'citation',
      'empty-state',
      'map',
    ].map((slug) => [`components/${slug}`, ['svg']]),
  ),
};

/** Names and citations that never appear in the pages: the docs describe the library on its own. */
const PROSE_NEVER =
  /\b(?:Storybook|WAI-ARIA|W3C|WCAG|APG|shadcn|Radix|Tiptap|Lexical|Swiper|dnd-kit|xyflow|Lucide|Floating UI|MapLibre|ProseMirror)\b/;
/** The text editor's page names the editing engines a consumer installs and passes in. */
const PROSE_ALLOWED: Record<string, RegExp> = {
  'widgets/text-editor': /\b(?:Tiptap|Lexical|ProseMirror)\b/g,
};

describe('documentation pages', () => {
  it('exist for every catalog entry that is not pending, and only for catalog entries', () => {
    for (const page of pages) {
      const entry = entries.find((candidate) => candidate.tagName === page.tag);
      expect(entry, `${page.id}: ${page.tag} is not a catalog entry`).toBeDefined();
      expect(entry!.folder, `${page.id} is in the wrong folder`).toBe(page.folder);
      expect(
        pending.has(page.tag),
        `${page.id}: ${page.tag} has a page; take it off pending.json`,
      ).toBe(false);
    }
    for (const entry of entries)
      if (!pending.has(entry.tagName))
        expect(
          pages.some((page) => page.tag === entry.tagName),
          `${entry.tagName} needs docs/${entry.folder}/<slug>.mdx or a pending.json entry`,
        ).toBe(true);
    for (const tag of pending)
      expect(
        entries.some((entry) => entry.tagName === tag),
        `pending.json lists ${tag}, which is not a catalog entry`,
      ).toBe(true);
  });

  it('name constituent tags the library declares', () => {
    for (const page of pages)
      for (const part of page.parts) {
        expect(declaredTags.has(part), `${page.id}: ${part} is not a declared element`).toBe(true);
        expect(part, `${page.id}: parts are other tags`).not.toBe(page.tag);
      }
  });

  it('use only Preview, Code and Keys, with no module statements', () => {
    for (const page of pages) {
      expect(page.moduleStatements, `${page.id}: no import or export`).toEqual([]);
      for (const element of page.elements)
        expect(
          ['Preview', 'Code', 'Keys'],
          `${page.id}:${element.line}: <${element.name}>`,
        ).toContain(element.name);
    }
  });

  it('open with the hero preview, then Usage, and author no generated section', () => {
    for (const page of pages) {
      expect(page.hero, `${page.id}: a Preview comes before the first heading`).not.toBeNull();
      const first = page.headings[0];
      expect(
        first && `${first.depth}:${first.slug}`,
        `${page.id}: ## Usage is the first heading`,
      ).toBe('2:usage');
      for (const heading of page.headings) {
        expect(
          heading.depth,
          `${page.id}:${heading.line}: headings are ## or ###`,
        ).toBeLessThanOrEqual(3);
        if (heading.depth === 2)
          expect(['usage', 'keyboard'], `${page.id}:${heading.line}: ## ${heading.text}`).toContain(
            heading.slug,
          );
        expect(
          AUTHORED_NEVER.has(heading.slug),
          `${page.id}:${heading.line}: ${heading.text} is generated, not authored`,
        ).toBe(false);
      }
      for (const preview of page.previews)
        expect(preview.title, `${page.id}:${preview.line}`).toBeTruthy();
    }
  });

  it('compose previews from the library, with scripts that import only what previews may', () => {
    for (const page of pages)
      for (const preview of page.previews) {
        const allowed = NATIVE_ALLOWED[page.id] ?? [];
        for (const [, element] of preview.code.matchAll(NATIVE_SUBSTITUTES))
          expect(
            allowed,
            `${page.id}:${preview.line}: <${element}> substitutes a library component`,
          ).toContain(element);
        if (!preview.script) continue;
        expect(
          unsupportedImports(preview.script),
          `${page.id}:${preview.line}: scripts use named or namespace imports`,
        ).toBe(0);
        for (const specifier of previewImports(preview.script))
          expect(
            isPreviewSpecifier(specifier),
            `${page.id}:${preview.line}: import of ${specifier}`,
          ).toBe(true);
        for (const [, id] of preview.script.matchAll(
          /getElementById\('([^']+)'\)|querySelector(?:All)?\('#([\w-]+)/g,
        ))
          if (id)
            expect(
              preview.code,
              `${page.id}:${preview.line}: the script's #${id} is in its own code`,
            ).toContain(`id="${id}"`);
      }
  });

  it('describe the library on its own terms', () => {
    for (const page of pages) {
      const allowed = (text: string) => text.replace(PROSE_ALLOWED[page.id] ?? /$^/g, '');
      expect(allowed(page.prose), `${page.id}: prose`).not.toMatch(PROSE_NEVER);
      for (const preview of page.previews)
        expect(
          allowed(`${preview.code}\n${preview.script ?? ''}`),
          `${page.id}:${preview.line}`,
        ).not.toMatch(PROSE_NEVER);
    }
  });
});

describe('page reader', () => {
  const page = (body: string) =>
    parseDoc(
      `---\ntitle: Badge\ndescription: A label.\ntag: tp-badge\nparts: [tp-badge-group]\n---\n${body}`,
      'components/badge',
    );

  it('reads frontmatter, headings with slugs, previews and their positions', () => {
    const parsed = page(`
<Preview title="Badge" code={\`<tp-badge>
  New
</tp-badge>\`} />

## Usage

Text with a \`<Preview />\` in code.

### In a list

<Preview title="List" align="stretch" script={\`const x = \\\`\\\${1}\\\`;\`} code="<tp-badge>A</tp-badge>" />

## Keyboard

| Key | Action |
| --- | --- |
| <Keys keys="mod+k" /> | Opens |
`);
    expect(parsed.parts).toEqual(['tp-badge-group']);
    expect(parsed.headings.map((heading) => `${heading.depth}:${heading.slug}`)).toEqual([
      '2:usage',
      '3:in-a-list',
      '2:keyboard',
    ]);
    expect(parsed.hero?.code).toBe('<tp-badge>\n  New\n</tp-badge>');
    expect(parsed.previews.map((preview) => preview.afterHeading)).toEqual([null, 'in-a-list']);
    expect(parsed.previews[1]?.script).toBe('const x = `${1}`;');
    expect(parsed.previews[1]?.align).toBe('stretch');
    expect(parsed.elements.map((element) => element.name)).toEqual(['Preview', 'Preview', 'Keys']);
    expect(parsed.keyboard).toBe(true);
    expect(parsed.variants).toBeNull();
    expect(parsed.prose).not.toContain('<Preview');
  });

  it('reads elements, not the code inside their attribute values', () => {
    const parsed = page(
      '<Preview title="A" code="x" />\n\n## Usage\n\n<Code code={`const blob: Promise<Blob> = load();`} language="ts" />\n',
    );
    expect(parsed.elements.map((element) => element.name)).toEqual(['Preview', 'Code']);
  });

  it('rejects unknown attributes, interpolation and unclosed elements', () => {
    expect(() => page('<Preview title="A" code="x" render="y" />')).toThrow(
      'unknown Preview attribute',
    );
    expect(() => page('<Preview title="A" code={`${x}`} />')).toThrow('interpolate');
    expect(() => page('<Preview title="A" code="x"></Preview>')).toThrow('self-closing');
    expect(() => page('<Preview code="x" />')).toThrow('needs a title');
  });
});
