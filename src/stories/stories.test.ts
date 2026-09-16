import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { componentStoryTags } from './examples.js';

describe('Storybook catalog entries', () => {
  const storyDirectory = new URL('./generated/', import.meta.url);
  const storyFiles = readdirSync(storyDirectory).filter((file) => file.endsWith('.stories.ts'));

  it('has one type-checked fixture for every public control', () => {
    expect([...componentStoryTags].sort()).toEqual(
      catalogEntries.map((entry) => entry.tagName).sort(),
    );
  });

  it('has one statically indexed Default story for every public control', () => {
    expect(storyFiles).toHaveLength(catalogEntries.length);
    const sources = storyFiles.map((file) => readFileSync(new URL(file, storyDirectory), 'utf8'));
    for (const entry of catalogEntries) {
      expect(
        sources.filter((source) => source.includes(`component: '${entry.tagName}'`)),
      ).toHaveLength(1);
      expect(
        sources.filter((source) => source.includes(`title: 'Components/${entry.name}'`)),
      ).toHaveLength(1);
    }
  });
});
