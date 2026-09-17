import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { componentStoryTags } from './examples.js';

describe('Storybook catalog entries', () => {
  const storyDirectory = new URL('./generated/', import.meta.url);
  const storyFiles = readdirSync(storyDirectory).filter((file) => file.endsWith('.stories.ts'));
  const accordionStory = readFileSync(new URL('./accordion.stories.ts', import.meta.url), 'utf8');
  const collapsibleStory = readFileSync(
    new URL('./collapsible.stories.ts', import.meta.url),
    'utf8',
  );
  const iconStory = readFileSync(new URL('./icon.stories.ts', import.meta.url), 'utf8');
  const examplesSource = readFileSync(new URL('./examples.ts', import.meta.url), 'utf8');
  const docsPage = readFileSync(new URL('../../.storybook/docs-page.mdx', import.meta.url), 'utf8');

  it('has one type-checked fixture for every public control', () => {
    expect([...componentStoryTags].sort()).toEqual(
      catalogEntries.map((entry) => entry.tagName).sort(),
    );
  });

  it('has one statically indexed Default story for every public control', () => {
    expect(storyFiles).toHaveLength(catalogEntries.length - 3);
    const sources = [
      ...storyFiles.map((file) => readFileSync(new URL(file, storyDirectory), 'utf8')),
      accordionStory,
      collapsibleStory,
      iconStory,
    ];
    for (const entry of catalogEntries) {
      expect(
        sources.filter((source) => source.includes(`component: '${entry.tagName}'`)),
      ).toHaveLength(1);
      expect(
        sources.filter((source) => source.includes(`title: 'Components/${entry.name}'`)),
      ).toHaveLength(1);
    }
  });

  it('puts an unstyled Default example before public-API configurations', () => {
    const sources = [
      ...storyFiles.map((file) => readFileSync(new URL(file, storyDirectory), 'utf8')),
      accordionStory,
      collapsibleStory,
      iconStory,
    ];

    expect(docsPage.indexOf('## Default')).toBeLessThan(docsPage.indexOf('<Primary />'));
    expect(docsPage.indexOf('<Primary />')).toBeLessThan(docsPage.indexOf('<Controls />'));
    expect(docsPage.indexOf('<Controls />')).toBeLessThan(
      docsPage.indexOf('<Stories title="Configurations"'),
    );
    expect(docsPage.indexOf('<Stories title="Configurations"')).toBeLessThan(
      docsPage.indexOf('<Description />'),
    );

    for (const source of sources) {
      expect(source.match(/export const \w+: Story/u)?.[0]).toBe('export const Default: Story');
      expect(source).toContain("tags: ['autodocs']");
      expect(source).not.toMatch(/<style(?:\s|>)/u);
      expect(source).not.toMatch(/\sstyle=/u);
      expect(source).not.toContain('::part(');
    }
    expect(examplesSource).not.toMatch(/<style(?:\s|>)/u);
    expect(examplesSource).not.toMatch(/\sstyle=/u);
    expect(examplesSource).not.toContain('::part(');
  });

  it('documents Collapsible state and presence properties in a maintained controls story', () => {
    expect(collapsibleStory).toContain("tags: ['autodocs']");
    expect(collapsibleStory).toContain('export const Open: Story');
    expect(collapsibleStory).toContain('export const Retained: Story');
    expect(collapsibleStory).toContain('export const FindInPage: Story');
    expect(collapsibleStory).toContain('export const LeadingIndicator: Story');
    expect(collapsibleStory).toContain('export const LeadingContent: Story');
    expect(collapsibleStory).toContain('<tp-badge slot="leading" variant="accent">New</tp-badge>');
    expect(collapsibleStory).not.toContain('<span slot="leading">New</span>');
    expect(collapsibleStory).toContain('export const LabelAlignedContent: Story');
    expect(collapsibleStory).toContain('export const TrailingContent: Story');
    expect(collapsibleStory).toContain('export const ExternalLineByLineMotion: Story');
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
      'showLeadingContent',
      'showTrailingContent',
      'contentMotion',
      'onOpenChange',
    ]) {
      expect(collapsibleStory).toContain(`    ${property}: {`);
    }
  });

  it('documents Accordion Root and per-Item properties in a maintained controls story', () => {
    expect(accordionStory).toContain("tags: ['autodocs']");
    expect(accordionStory).toContain('export const DisabledItem: Story');
    expect(accordionStory).toContain('args: { itemDisabled: true }');
    expect(accordionStory).toContain('export const ExternalLineByLineMotion: Story');
    expect(accordionStory).toContain('export const Line: Story');
    expect(accordionStory).toContain('export const Outline: Story');
    expect(accordionStory).toContain('export const Separated: Story');
    expect(accordionStory).toContain('export const PositionalContent: Story');
    expect(accordionStory).toContain('export const LabelAlignedContent: Story');
    for (const property of [
      'variant',
      'selectionMode',
      'value',
      'defaultValue',
      'collapsible',
      'disabled',
      'keepMounted',
      'hiddenUntilFound',
      'contentAlignment',
      'accountContentAlignment',
      'onValueChange',
      'indicatorPosition',
      'securityIndicatorPosition',
      'billingIndicatorPosition',
      'itemDisabled',
      'headingLevel',
      'showLeadingContent',
      'contentMotion',
    ]) {
      expect(accordionStory).toContain(`    ${property}: {`);
    }
  });

  it('documents Icon artwork, accessibility, and size in a maintained controls story', () => {
    expect(iconStory).toContain("tags: ['autodocs']");
    for (const property of ['icon', 'label', 'size']) {
      expect(iconStory).toContain(`    ${property}: {`);
    }
  });
});
