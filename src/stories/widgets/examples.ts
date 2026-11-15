import { html, type TemplateResult } from 'lit';
import type { widgetCatalog } from '../../widgets/catalog.js';
import { todayCalendarDate } from '../../foundation/calendar.js';
import { focusSessions } from './heatmap-samples.js';
import { sampleHarbor } from '../images.js';
import { createMemorySource } from '../../foundation/file-explorer/memory-source.js';
import { observatoryArchive } from './file-explorer.examples.js';

export type WidgetTag = (typeof widgetCatalog)[number][1];

/**
 * One unstyled Default fixture per published widget, keyed by tag. The size report reads this
 * file to learn which parts each widget's documented example composes, so keep the
 * `  'tp-<name>': () =>` layout of `src/stories/examples.ts`.
 */
const examples = {
  'tp-color-picker': () =>
    html`<tp-color-picker label="Accent" name="accent" default-value="#6d5dfc"></tp-color-picker>`,
  'tp-gradient-picker': () =>
    html`<tp-gradient-picker label="Fill" name="fill" default-selected="1">
      <tp-gradient-stop position="0" color="#1d4ed8"></tp-gradient-stop>
      <tp-gradient-stop position="0.45" color="#5eead4"></tp-gradient-stop>
      <tp-gradient-stop position="0.75" color="#2563eb"></tp-gradient-stop>
      <tp-gradient-stop position="1" color="#60a5fa"></tp-gradient-stop>
    </tp-gradient-picker>`,
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
  'tp-emoji-picker': () =>
    html`<tp-emoji-picker label="Reaction" name="reaction"></tp-emoji-picker>`,
  'tp-plot': () =>
    html`<tp-plot
      label="Signal"
      .series=${[{ id: 'signal', label: 'Amplitude' }]}
      .data=${{
        signal: [
          [0, 0],
          [1, 1],
          [2, -1],
          [3, 0],
        ],
      }}
    ></tp-plot>`,
  'tp-text-editor': () => html`<tp-text-editor label="Field notes" name="notes"></tp-text-editor>`,
  'tp-color-palette': () =>
    html`<tp-color-palette label="Fill" default-value="#3a89fa"></tp-color-palette>`,
  'tp-layers': () =>
    html`<tp-layers label="Scene" default-value='["sun"]'>
      <tp-layer id="sun" label="Sun"></tp-layer>
      <tp-layer id="clouds" label="Clouds"></tp-layer>
      <tp-layer id="sky" label="Sky"></tp-layer>
    </tp-layers>`,
  'tp-heatmap': () =>
    html`<tp-heatmap
      label="Focus sessions"
      size="sm"
      .data=${focusSessions(todayCalendarDate())}
    ></tp-heatmap>`,
  'tp-image-editor': () =>
    html`<tp-image-editor
      label="Harbor at dusk"
      src=${sampleHarbor}
      alt="A harbor town at dusk with a lighthouse and sailing boats"
      controls="zoom fit actual"
    ></tp-image-editor>`,
  'tp-file-explorer': () =>
    html`<tp-file-explorer
      label="Ridgeline archive"
      default-folder="plates"
      .source=${createMemorySource(observatoryArchive())}
    ></tp-file-explorer>`,
} satisfies Record<WidgetTag, () => TemplateResult>;

export function renderWidgetExample(tagName: WidgetTag): TemplateResult {
  const example: () => TemplateResult = examples[tagName];
  return example();
}

export const widgetStoryTags = Object.keys(examples) as WidgetTag[];
