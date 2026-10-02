import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { catalogEntries } from '../catalog.js';
import { componentStoryTags } from './examples.js';

describe('Storybook catalog entries', () => {
  const storyDirectory = new URL('./generated/', import.meta.url);
  const storyFiles = readdirSync(storyDirectory).filter((file) => file.endsWith('.stories.ts'));
  const newlyAuthoredStories = [
    'toggle',
    'toast',
    'toggle-group',
    'text-area',
    'radio-group',
    'input',
    'field',
    'checkbox',
  ].map((name) => readFileSync(new URL(`./${name}.stories.ts`, import.meta.url), 'utf8'));
  const accordionStory = readFileSync(new URL('./accordion.stories.ts', import.meta.url), 'utf8');
  const alertDialogStory = readFileSync(
    new URL('./alert-dialog.stories.ts', import.meta.url),
    'utf8',
  );
  const tabsStory = readFileSync(new URL('./tabs.stories.ts', import.meta.url), 'utf8');
  const alertStory = readFileSync(new URL('./alert.stories.ts', import.meta.url), 'utf8');
  const tooltipStory = readFileSync(new URL('./tooltip.stories.ts', import.meta.url), 'utf8');
  const dialogStory = readFileSync(new URL('./dialog.stories.ts', import.meta.url), 'utf8');
  const buttonStory = readFileSync(new URL('./button.stories.ts', import.meta.url), 'utf8');
  const buttonGroupStory = readFileSync(
    new URL('./button-group.stories.ts', import.meta.url),
    'utf8',
  );
  const cardStory = readFileSync(new URL('./card.stories.ts', import.meta.url), 'utf8');
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
    expect(storyFiles).toHaveLength(catalogEntries.length - 19);
    const sources = [
      ...newlyAuthoredStories,
      ...storyFiles.map((file) => readFileSync(new URL(file, storyDirectory), 'utf8')),
      accordionStory,
      alertDialogStory,
      alertStory,
      tabsStory,
      dialogStory,
      tooltipStory,
      buttonStory,
      buttonGroupStory,
      cardStory,
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
      ...newlyAuthoredStories,
      ...storyFiles.map((file) => readFileSync(new URL(file, storyDirectory), 'utf8')),
      accordionStory,
      alertDialogStory,
      alertStory,
      tabsStory,
      dialogStory,
      tooltipStory,
      buttonStory,
      buttonGroupStory,
      cardStory,
      collapsibleStory,
      iconStory,
    ];

    expect(docsPage.indexOf('## Default')).toBeLessThan(docsPage.indexOf('<Primary />'));
    expect(docsPage.indexOf('<Primary />')).toBeLessThan(docsPage.indexOf('<Controls />'));
    expect(docsPage).toContain('## Public properties');
    expect(docsPage).toContain('fixture setup is not a component\nproperty');
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

  it('keeps Collapsible controls limited to its public properties', () => {
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
      'onOpenChange',
    ]) {
      expect(collapsibleStory).toContain(`    ${property}: {`);
    }
    for (const fixtureProperty of ['showLeadingContent', 'showTrailingContent', 'contentMotion']) {
      expect(collapsibleStory).not.toContain(`    ${fixtureProperty}: {`);
    }
  });

  it('keeps Accordion controls limited to its public Root properties', () => {
    expect(accordionStory).toContain("tags: ['autodocs']");
    expect(accordionStory).toContain('export const DisabledItem: Story');
    expect(accordionStory).toContain('renderAccordion(args, { itemDisabled: true })');
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
      'motionPolicy',
      'contentAlignment',
      'onValueChange',
    ]) {
      expect(accordionStory).toContain(`    ${property}: {`);
    }
    for (const fixtureProperty of [
      'accountContentAlignment',
      'indicatorPosition',
      'securityIndicatorPosition',
      'billingIndicatorPosition',
      'itemDisabled',
      'headingLevel',
      'showLeadingContent',
      'contentMotion',
    ]) {
      expect(accordionStory).not.toContain(`    ${fixtureProperty}: {`);
    }
  });

  it('documents Icon artwork, accessibility, and size in a maintained controls story', () => {
    expect(iconStory).toContain("tags: ['autodocs']");
    for (const property of ['icon', 'label', 'size']) {
      expect(iconStory).toContain(`    ${property}: {`);
    }
  });

  it('exposes the Button contract in a maintained controls story', () => {
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
    for (const configuration of [
      'IconOnly',
      'IconLeading',
      'IconTrailing',
      'LoadingLeading',
      'LoadingTrailing',
      'AsLink',
      'WithMarks',
      'FocusableDisabled',
      'SyntheticAction',
      'FormActions',
    ]) {
      expect(buttonStory).toContain(`export const ${configuration}: Story`);
    }
  });

  it('documents Button group layout while reusing Button members', () => {
    for (const property of ['orientation', 'joined', 'label']) {
      expect(buttonGroupStory).toContain(`    ${property}: {`);
    }
    for (const configuration of ['Sizes', 'Vertical', 'MultipleGroups', 'Unjoined']) {
      expect(buttonGroupStory).toContain(`export const ${configuration}: Story`);
    }
    expect(buttonGroupStory).toContain('<tp-button variant="outline"');
    expect(buttonGroupStory).not.toContain('<button');
  });

  it('shows Card sections and independent presentation properties', () => {
    expect(cardStory).toContain("component: 'tp-card'");
    expect(cardStory).not.toContain("options: ['default', 'elevated']");
    for (const property of ['elevated', 'borders', 'sectionColors', 'size']) {
      expect(cardStory).toContain(`    ${property}: {`);
    }
    for (const configuration of [
      'Elevated',
      'BordersOff',
      'SectionColorsOff',
      'BothOff',
      'ContentOnly',
    ]) {
      expect(cardStory).toContain(`export const ${configuration}: Story`);
    }
    for (const slot of ['header', 'description', 'footer']) {
      expect(cardStory).toContain(`slot="${slot}"`);
    }
    expect(cardStory).toContain('<tp-button slot="footer"');
  });
});
