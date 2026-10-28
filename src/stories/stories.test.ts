import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { widgetEntries } from '../widgets/catalog.js';

const directory = new URL('./', import.meta.url);
const read = (file: string) => readFileSync(new URL(file, directory), 'utf8');
const storyFiles = readdirSync(directory)
  .filter((file) => file.endsWith('.stories.ts'))
  .sort();
const stories = new Map(storyFiles.map((file) => [file, read(file)]));
const story = (name: string) => stories.get(`${name}.stories.ts`)!;
// Widget stories live in `widgets/` beside the section overview (an MDX page, not a story file).
const widgetStories = new Map(
  readdirSync(new URL('./widgets/', import.meta.url))
    .filter((file) => file.endsWith('.stories.ts'))
    .sort()
    .map((file) => [`widgets/${file}`, read(`widgets/${file}`)]),
);
/** The meta object of a story file: everything before its stories. */
const meta = (source: string) => source.split('export default meta')[0]!;
const componentStories = [...stories.values()].filter((source) =>
  source.includes("title: 'Components/"),
);
const elementStories = [...componentStories, ...widgetStories.values()];

describe('Storybook catalog entries', () => {
  const docsPage = read('../../.storybook/docs-page.mdx');
  const preview = read('../../.storybook/preview.ts');

  it('has one statically indexed Default story for every public control', () => {
    expect(componentStories).toHaveLength(catalogEntries.length);
    for (const entry of catalogEntries) {
      expect(
        componentStories.filter((source) => source.includes(`component: '${entry.tagName}'`)),
      ).toHaveLength(1);
      expect(
        componentStories.filter((source) => source.includes(`title: 'Components/${entry.name}'`)),
      ).toHaveLength(1);
    }
  });

  it('has one Widgets story per published widget, and none elsewhere', () => {
    const titled = [...widgetStories.values()].filter((source) =>
      source.includes("title: 'Widgets/"),
    );
    expect(titled).toHaveLength(widgetEntries.length);
    expect(widgetStories.size).toBe(widgetEntries.length);
    for (const entry of widgetEntries) {
      expect(
        titled.filter((source) => source.includes(`component: '${entry.tagName}'`)),
      ).toHaveLength(1);
      expect(
        titled.filter((source) => source.includes(`title: 'Widgets/${entry.name}'`)),
      ).toHaveLength(1);
    }
    for (const source of stories.values()) expect(source).not.toContain("title: 'Widgets/");
    for (const source of widgetStories.values())
      expect(source).not.toContain("title: 'Components/");
    // The section exists before its first widget: an overview page, registration and ordering.
    expect(read('widgets/overview.mdx')).toContain('<Meta title="Widgets/Overview" />');
    expect(preview).toContain("import '../src/register/widgets.js';");
    expect(preview).toContain("order: ['Tweakpad UI', 'Components', 'Widgets']");
  });

  it('declares Docs and layout once in the preview, not per story file', () => {
    expect(preview).toContain("tags: ['autodocs']");
    expect(preview).toContain("layout: 'padded'");
    expect(story('size-report')).toContain("tags: ['!autodocs']");
    expect(story('design-tokens')).toContain("tags: ['!autodocs']");
    for (const [file, source] of [...stories, ...widgetStories]) {
      if (file !== 'size-report.stories.ts') expect(source).not.toContain("tags: ['autodocs']");
      expect(meta(source)).not.toContain("layout: 'padded'");
    }
  });

  it('puts an unstyled Default example before public-API configurations', () => {
    expect(docsPage.indexOf('## Default')).toBeLessThan(docsPage.indexOf('<Primary />'));
    expect(docsPage.indexOf('<Primary />')).toBeLessThan(docsPage.indexOf('<Controls />'));
    expect(docsPage).toContain('## Public properties');
    expect(docsPage).toContain('example setup is not a component property');
    // After the controls, the component's documentation page, then its generated API and Related.
    expect(docsPage.indexOf('<Controls />')).toBeLessThan(docsPage.indexOf('<LibraryDoc />'));
    expect(docsPage.indexOf('<LibraryDoc />')).toBeLessThan(docsPage.indexOf('<Api />'));
    expect(docsPage.indexOf('<Api />')).toBeLessThan(docsPage.indexOf('<Related />'));
    expect(docsPage).not.toContain('<Stories');

    for (const source of elementStories) {
      expect(source.match(/export const \w+: Story/u)?.[0]).toBe('export const Default: Story');
      // A viewport/plot/resizer needs an external size. Allow ordinary layout,
      // while still rejecting component paint overrides in the base example.
      const base = meta(source);
      expect(base).not.toMatch(/<style(?:\s|>)/u);
      for (const [, inlineStyle] of base.matchAll(/<tp-[\w-]+\b[^>]*?\sstyle="([^"]*)"/gu)) {
        for (const declaration of inlineStyle!.split(';').filter(Boolean)) {
          const property = declaration.split(':')[0]!.trim();
          expect(property).toMatch(
            /^(?:(?:min-|max-)?(?:width|height|inline-size|block-size)|margin(?:-block|-inline)?)$/u,
          );
        }
      }
      expect(source).not.toContain('::part(');
    }
    for (const examplesSource of [read('examples.ts'), read('widgets/examples.ts')]) {
      expect(examplesSource).not.toMatch(/<style(?:\s|>)/u);
      expect(examplesSource).not.toMatch(/\sstyle=/u);
      expect(examplesSource).not.toContain('::part(');
    }
  });

  it('renders each library documentation page from its own story, and nothing else from it', () => {
    const pages = new Set(
      ['components', 'widgets'].flatMap((section) =>
        (existsSync(new URL(`../../docs/${section}/`, import.meta.url))
          ? readdirSync(new URL(`../../docs/${section}/`, import.meta.url))
          : []
        )
          .filter((file) => file.endsWith('.mdx'))
          .map((file) => `${section}/${file.slice(0, -'.mdx'.length)}`),
      ),
    );
    const declared = new Map<string, string>();
    for (const [file, source] of [...stories, ...widgetStories]) {
      const section = file.startsWith('widgets/') ? 'widgets' : 'components';
      const slug = file.replace(/^widgets\//u, '').replace(/\.stories\.ts$/u, '');
      const id = `${section}/${slug}`;
      const uses = /libraryDocs\('([^']+)'\)/u.exec(source)?.[1];
      if (uses) declared.set(uses, file);
      if (pages.has(id)) {
        // The page is the documentation: no reference markdown, no curated example modules, and
        // any story beyond Default is a canvas fixture hidden from the Docs page.
        expect(uses, `${file} must render docs/${id}.mdx through libraryDocs()`).toBe(id);
        expect(source).not.toContain('?raw');
        expect(source).not.toMatch(/examples:|description: \{ component/u);
        for (const [, name] of source.matchAll(/export const (\w+): Story = \{/gu))
          if (name !== 'Default')
            expect(
              source,
              `${file}: story ${name} needs tags: ['!autodocs'] (the page is the documentation)`,
            ).toMatch(
              new RegExp(`export const ${name}: Story = \\{[^}]*tags: \\['!autodocs'\\]`, 'u'),
            );
      } else expect(uses, `${file} renders a page that does not exist`).toBeUndefined();
    }
    for (const id of pages) expect(declared.has(id), `no story renders docs/${id}.mdx`).toBe(true);
  });
});
