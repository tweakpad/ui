import { html, type TemplateResult } from 'lit';
import type { widgetCatalog } from '../../widgets/catalog.js';

export type WidgetTag = (typeof widgetCatalog)[number][1];

/**
 * One unstyled Default fixture per published widget, keyed by tag. The size report reads this
 * file to learn which parts each widget's documented example composes, so keep the
 * `  'tp-<name>': () =>` layout of `src/stories/examples.ts`.
 */
const examples = {
  'tp-color-picker': () =>
    html`<tp-color-picker label="Accent" name="accent" default-value="#6d5dfc"></tp-color-picker>`,
} satisfies Record<WidgetTag, () => TemplateResult>;

export function renderWidgetExample(tagName: WidgetTag): TemplateResult {
  const example: () => TemplateResult = examples[tagName];
  return example();
}

export const widgetStoryTags = Object.keys(examples) as WidgetTag[];
