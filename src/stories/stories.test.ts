import { readdirSync, readFileSync } from 'node:fs';
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
    expect(docsPage.indexOf('<Controls />')).toBeLessThan(
      docsPage.indexOf('<Stories title="Examples"'),
    );
    expect(docsPage.indexOf('<Stories title="Examples"')).toBeLessThan(
      docsPage.indexOf('<Description />'),
    );

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

  it('keeps Collapsible controls limited to its public properties', () => {
    const collapsibleStory = story('collapsible');
    expect(collapsibleStory).toContain('export const LeadingContent: Story');
    expect(collapsibleStory).toContain('<tp-badge slot="leading" variant="accent">New</tp-badge>');
    expect(collapsibleStory).not.toContain('<span slot="leading">New</span>');
    expect(collapsibleStory).toContain('export const TrailingContent: Story');
    expect(collapsibleStory).toContain('export const ExternalLineByLineMotion: Story');
    expect(collapsibleStory).toContain("from './line-by-line-motion.js'");
    // Attribute values are Controls, not stories.
    expect(collapsibleStory).not.toMatch(
      /export const (?:Open|Disabled|Retained|FindInPage|LeadingIndicator|LabelAlignedContent): Story/u,
    );
    for (const property of [
      'open',
      'defaultOpen',
      'disabled',
      'keepMounted',
      'hiddenUntilFound',
      'motionPolicy',
      'contentAlignment',
      'indicatorPosition',
      'headingLevel',
      'onOpenChange',
    ]) {
      expect(collapsibleStory).toContain(`    ${property}: {`);
    }
    for (const fixtureProperty of ['showLeadingContent', 'showTrailingContent', 'contentMotion']) {
      expect(collapsibleStory).not.toContain(`    ${fixtureProperty}: {`);
    }
  });

  it('keeps Accordion controls limited to its public Root properties', () => {
    const accordionStory = story('accordion');
    expect(accordionStory).toContain('export const PositionalContent: Story');
    expect(accordionStory).toContain('export const ExternalLineByLineMotion: Story');
    expect(accordionStory).toContain("from './line-by-line-motion.js'");
    expect(accordionStory).not.toMatch(
      /export const (?:Line|Outline|Separated|LabelAlignedContent|ReducedMotion|Multiple|Collapsible|Disabled|DisabledItem|Retained|FindInPage|MixedIndicatorPositions): Story/u,
    );
    for (const property of [
      'variant',
      'selectionMode',
      'value',
      'defaultValue',
      'collapsible',
      'disabled',
      'keepMounted',
      'hiddenUntilFound',
      'motionPolicy',
      'contentAlignment',
      'onValueChange',
    ]) {
      expect(accordionStory).toContain(`    ${property}: {`);
    }
    for (const fixtureProperty of ['showLeadingContent', 'contentMotion']) {
      expect(accordionStory).not.toContain(`    ${fixtureProperty}: {`);
    }
  });

  it('documents Icon artwork, accessibility, and size in a maintained controls story', () => {
    const iconStory = story('icon');
    for (const property of ['icon', 'label', 'size']) {
      expect(iconStory).toContain(`    ${property}: {`);
    }
  });

  it('exposes the Button contract in a maintained controls story', () => {
    const buttonStory = story('button');
    for (const property of [
      'variant',
      'size',
      'type',
      'disabled',
      'focusableWhenDisabled',
      'nativeAction',
      'ariaLabel',
      'name',
      'value',
      'icon',
      'iconPosition',
      'loadingPosition',
      'href',
      'target',
      'rel',
      'download',
    ]) {
      expect(buttonStory).toContain(`    ${property}: {`);
    }
    // Distinct use cases stay; variant, size and state values are Controls.
    for (const configuration of ['IconOnly', 'AsLink', 'WithMarks', 'FormActions']) {
      expect(buttonStory).toContain(`export const ${configuration}: Story`);
    }
    expect(buttonStory).not.toMatch(
      /export const (?:Secondary|Destructive|Outline|Ghost|LinkAppearance|ExtraSmall|Small|Large|IconExtraSmall|IconSmall|IconLarge|IconLeading|IconTrailing|LoadingLeading|LoadingTrailing|Disabled|FocusableDisabled|SyntheticAction): Story/u,
    );
  });

  it('documents Button group layout while reusing Button members', () => {
    const buttonGroupStory = story('button-group');
    for (const property of ['orientation', 'joined', 'label']) {
      expect(buttonGroupStory).toContain(`    ${property}: {`);
    }
    expect(buttonGroupStory).toContain('examples: buttonGroupExamples');
    expect(buttonGroupStory).not.toMatch(
      /export const (?:Sizes|Vertical|MultipleGroups|Unjoined):/,
    );
    expect(buttonGroupStory).toContain('<tp-button variant="outline"');
    expect(buttonGroupStory).not.toContain('<button');
  });

  it('shows Card sections and independent presentation properties', () => {
    const cardStory = story('card');
    expect(cardStory).toContain("component: 'tp-card'");
    expect(cardStory).not.toContain("options: ['default', 'elevated']");
    for (const property of ['elevated', 'borders', 'sectionColors', 'size']) {
      expect(cardStory).toContain(`    ${property}: {`);
    }
    expect(cardStory).toContain('export const ContentOnly: Story');
    expect(cardStory).not.toMatch(
      /export const (?:Elevated|BordersOff|SectionColorsOff|BothOff): Story/u,
    );
    for (const slot of ['header', 'description', 'footer']) {
      expect(cardStory).toContain(`slot="${slot}"`);
    }
    expect(cardStory).toContain('<tp-button slot="footer"');
  });
});
