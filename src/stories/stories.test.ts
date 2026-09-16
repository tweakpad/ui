import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { componentStoryTags } from './examples.js';

describe('Storybook catalog entries', () => {
  const storyDirectory = new URL('./generated/', import.meta.url);
  const storyFiles = readdirSync(storyDirectory).filter((file) => file.endsWith('.stories.ts'));
  const accordionStory = readFileSync(new URL('./accordion.stories.ts', import.meta.url), 'utf8');
  const iconStory = readFileSync(new URL('./icon.stories.ts', import.meta.url), 'utf8');

  it('has one type-checked fixture for every public control', () => {
    expect([...componentStoryTags].sort()).toEqual(
      catalogEntries.map((entry) => entry.tagName).sort(),
    );
  });

  it('has one statically indexed Default story for every public control', () => {
    expect(storyFiles).toHaveLength(catalogEntries.length - 2);
    const sources = [
      ...storyFiles.map((file) => readFileSync(new URL(file, storyDirectory), 'utf8')),
      accordionStory,
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

  it('documents Accordion Root and per-Item properties in a maintained controls story', () => {
    expect(accordionStory).toContain("tags: ['autodocs']");
    expect(accordionStory).toContain('export const DisabledItem: Story');
    expect(accordionStory).toContain('args: { itemDisabled: true }');
    expect(accordionStory).toContain('export const ExternalLineByLineMotion: Story');
    for (const property of [
      'selectionMode',
      'value',
      'defaultValue',
      'collapsible',
      'disabled',
      'keepMounted',
      'hiddenUntilFound',
      'onValueChange',
      'indicatorPosition',
      'securityIndicatorPosition',
      'billingIndicatorPosition',
      'itemDisabled',
      'headingLevel',
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
