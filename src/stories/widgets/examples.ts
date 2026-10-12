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
  'tp-easing-editor': () =>
    html`<tp-easing-editor
      label="Motion"
      name="easing"
      default-value="ease-out"
    ></tp-easing-editor>`,
  'tp-flow': () =>
    html`<tp-flow
      label="Pipeline"
      name="flow"
      fit-view
      default-value='{"version":1,"nodes":[{"id":"start","type":"step","position":{"x":0,"y":0},"data":{},"label":"Start"},{"id":"finish","type":"step","position":{"x":320,"y":0},"data":{},"label":"Finish"}],"edges":[{"id":"start-finish","source":"start","target":"finish","label":"then"}]}'
    ></tp-flow>`,
} satisfies Record<WidgetTag, () => TemplateResult>;

export function renderWidgetExample(tagName: WidgetTag): TemplateResult {
  const example: () => TemplateResult = examples[tagName];
  return example();
}

export const widgetStoryTags = Object.keys(examples) as WidgetTag[];
