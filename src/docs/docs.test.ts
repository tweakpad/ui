import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { widgetEntries } from '../widgets/catalog.js';
import { presentationFamilies } from '../presentation/families/index.js';
import { widgetPresentationFamilies } from '../presentation/families/widgets.js';
import { docId, parseDoc, slugify, type ParsedDoc } from './parse.js';
import { isPreviewSpecifier, previewImports, unsupportedImports } from './preview-runtime.js';

/**
 * The documentation pages follow the page skeleton of the component documentation guide
 * (`.agents/skills/tweakpad-component/references/documentation.md`): the checks here are the
 * skeleton and the few terms that must stay precise, nothing about how a page is written.
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

const pages: ParsedDoc[] = ['components', 'widgets'].flatMap((section) =>
  list(`docs/${section}/`)
    .filter((file) => file.endsWith('.mdx'))
    .sort()
    .map((file) => {
      const path = `docs/${section}/${file}`;
      return parseDoc(read(path), docId(path));
    }),
);
const entries = [
  ...catalogEntries.map((entry) => ({ ...entry, section: 'components' as const })),
  ...widgetEntries.map((entry) => ({ ...entry, section: 'widgets' as const })),
];
const families = [...presentationFamilies, ...widgetPresentationFamilies];
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

/** Words a `###` heading never is: an axis value or a state is a Control, not a use case. */
const STATE_WORDS = new Set(
  [
    'disabled',
    'readonly',
    'read-only',
    'invalid',
    'required',
    'open',
    'closed',
    'checked',
    'loading',
    'selected',
    'pressed',
    'expanded',
    'horizontal',
    'vertical',
    'small',
    'large',
    'sizes',
    'states',
  ].map(slugify),
);
const AUTHORED_NEVER = new Set(
  [
    'API',
    'API reference',
    'Related',
    'Properties',
    'Attributes',
    'Events',
    'Reference',
    'Examples',
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
};

/** Names and citations that never appear in the pages: the docs describe the library on its own. */
const PROSE_NEVER =
  /\b(?:Storybook|WAI-ARIA|W3C|WCAG|APG|shadcn|Radix|Tiptap|Lexical|Swiper|dnd-kit|xyflow|Lucide|Floating UI|MapLibre|ProseMirror)\b/;

describe('documentation pages', () => {
  it('exist for every catalog entry that is not pending, and only for catalog entries', () => {
    for (const page of pages) {
      const entry = entries.find((candidate) => candidate.tagName === page.tag);
      expect(entry, `${page.id}: ${page.tag} is not a catalog entry`).toBeDefined();
      expect(entry!.section, `${page.id} is in the wrong section`).toBe(page.section);
      expect(page.title, `${page.id}: the title is the catalog name`).toBe(entry!.name);
      expect(
        pending.has(page.tag),
        `${page.id}: ${page.tag} has a page; take it off pending.json`,
      ).toBe(false);
    }
    for (const entry of entries)
      if (!pending.has(entry.tagName))
        expect(
          pages.some((page) => page.tag === entry.tagName),
          `${entry.tagName} needs docs/${entry.section}/<slug>.mdx or a pending.json entry`,
        ).toBe(true);
    for (const tag of pending)
      expect(
        entries.some((entry) => entry.tagName === tag),
        `pending.json lists ${tag}, which is not a catalog entry`,
      ).toBe(true);
  });

  it('name constituent tags the library declares, and never another page', () => {
    const mainTags = new Set(entries.map((entry) => entry.tagName));
    for (const page of pages)
      for (const part of page.parts) {
        expect(declaredTags.has(part), `${page.id}: ${part} is not a declared element`).toBe(true);
        expect(mainTags.has(part), `${page.id}: ${part} has its own page`).toBe(false);
        expect(part, `${page.id}: parts are other tags`).not.toBe(page.tag);
      }
  });

  it('use only Preview and Keys, with no module statements', () => {
    for (const page of pages) {
      expect(page.moduleStatements, `${page.id}: no import or export`).toEqual([]);
      for (const element of page.elements)
        expect(['Preview', 'Keys'], `${page.id}:${element.line}: <${element.name}>`).toContain(
          element.name,
        );
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
      for (const preview of page.previews) {
        const siblings = page.previews.filter(
          (other) => other.afterHeading === preview.afterHeading,
        );
        const heading = page.headings.find((entry) => entry.slug === preview.afterHeading);
        // A section's single preview is named by its heading; a title there is said twice.
        if (siblings.length === 1)
          expect(
            preview.title,
            `${page.id}:${preview.line}: the heading names this preview`,
          ).toBeUndefined();
        else {
          expect(
            preview.title,
            `${page.id}:${preview.line}: several previews need titles`,
          ).toBeTruthy();
          expect(
            preview.title?.toLowerCase(),
            `${page.id}:${preview.line}: a title repeats the heading`,
          ).not.toBe(heading?.text.toLowerCase());
        }
      }
    }
  });

  it('name use cases after scenarios, not after axis values or states', () => {
    for (const page of pages) {
      const family = families.find((candidate) => candidate.definition.tagName === page.tag);
      const axisValues = new Set(
        (family?.definition.axes ?? []).flatMap((axis) => axis.values.map(slugify)),
      );
      for (const heading of page.headings) {
        if (heading.depth !== 3 || heading.slug === 'variants') continue;
        expect(
          axisValues.has(heading.slug) || STATE_WORDS.has(heading.slug),
          `${page.id}:${heading.line}: "${heading.text}" is a Control, not a use case`,
        ).toBe(false);
      }
    }
  });

  it('show a Variants section exactly when the family declares a variant axis, with every value once', () => {
    for (const page of pages) {
      const family = families.find((candidate) => candidate.definition.tagName === page.tag);
      const axis = family?.definition.axes?.find((candidate) => candidate.name === 'variant');
      if (!axis) {
        expect(page.variants, `${page.id}: no variant axis, so no Variants section`).toBeNull();
        expect(page.prose, `${page.id}: "variant" names an axis value only`).not.toMatch(
          /\bvariants?\b/i,
        );
        continue;
      }
      expect(
        page.variants,
        `${page.id}: a variant axis needs a ### Variants section`,
      ).not.toBeNull();
      const counts = new Map<string, number>();
      for (const value of page.variants!) counts.set(value, (counts.get(value) ?? 0) + 1);
      const section = page.previews.filter((preview) => preview.afterHeading === 'variants');
      expect(section, `${page.id}: Variants holds one Preview`).toHaveLength(1);
      const unmarked = (
        section[0]!.code.match(/<tp-[\w-]+(?![^>]*\svariant=)[^>]*>/g) ?? []
      ).filter((tag) => tag.startsWith(`<${page.tag}`)).length;
      for (const value of axis.values) {
        const shown = (counts.get(value) ?? 0) + (value === axis.default ? unmarked : 0);
        expect(shown, `${page.id}: Variants shows ${value} once`).toBe(1);
      }
      for (const value of counts.keys())
        expect(axis.values, `${page.id}: ${value} is not a variant`).toContain(value);
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
      expect(page.prose, `${page.id}: prose`).not.toMatch(PROSE_NEVER);
      for (const preview of page.previews)
        expect(
          `${preview.code}\n${preview.script ?? ''}`,
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

  it('rejects unknown attributes, interpolation and unclosed elements', () => {
    expect(() => page('<Preview title="A" code="x" render="y" />')).toThrow(
      'unknown Preview attribute',
    );
    expect(() => page('<Preview title="A" code={`${x}`} />')).toThrow('interpolate');
    expect(() => page('<Preview title="A" code="x"></Preview>')).toThrow('self-closing');
    expect(() => page('<Preview title="A" />')).toThrow('needs code');
  });
});
