import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './stories/workspace/workspace.js';
import CatalogDocs from '../.storybook/catalog-docs.mdx';
import rendererSource from './stories/data-visualization.examples.ts?raw';
import datePickerSource from './stories/date-picker-trigger.js?raw';
import mapSource from './stories/map-example.js?raw';
import examplesSource from './stories/examples.ts?raw';

const workspaceSources = import.meta.glob<string>('./stories/workspace/**/*.{ts,css}', {
  query: '?raw',
  import: 'default',
  eager: true,
});

/** Rewrites repository-relative imports to the published package and the files listed below. */
const published = (source: string) =>
  source
    .replace(/'(?:\.\.\/)+icons\/([^']+)\.js'/g, "'@tweakpad/ui/icons/$1'")
    .replace(/'(?:\.\.\/)+components\/[^']+'/g, "'@tweakpad/ui'")
    .replace(/'(?:\.\.\/)+foundation\/drag-drop\/index\.js'/g, "'@tweakpad/ui/drag-drop'")
    .replace(/'(?:\.\.\/)+foundation\/map\/index\.js'/g, "'@tweakpad/ui/map'")
    .replace(/'(?:\.\.\/)+foundation\/[^']+'/g, "'@tweakpad/ui'")
    .replaceAll("'../data-visualization.examples.js'", "'./chart.js'")
    .replaceAll("'../../data-visualization.examples.js'", "'../chart.js'")
    .replaceAll("'../date-picker-trigger.js'", "'./date-picker-trigger.js'")
    .replaceAll("'../../map-example.js'", "'../map-example.js'")
    .replaceAll("'../../examples.js'", "'../media.js'");

const order = (path: string) =>
  path.endsWith('/workspace.ts') ? 0 : path.includes('/pages/') ? 2 : path.endsWith('.css') ? 3 : 1;
const files = Object.entries(workspaceSources)
  .map(([path, source]) => [path.replace('./stories/workspace/', ''), source] as const)
  .sort(([a], [b]) => order(a) - order(b) || a.localeCompare(b));
const sampleMedia = examplesSource.match(
  /\/\*\* Repository-generated sample media[\s\S]*?export const sampleThumbnails[^\n]*\n/,
)?.[0];

const meta = {
  title: 'Tweakpad UI/Complete catalog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      page: CatalogDocs,
      description: {
        component:
          'Atlas is a project workspace composed from the complete Tweakpad catalog. Move between Overview, Work, Files, Brief, Activity and Pilot sites from the sidebar; open Settings from the sidebar footer, the workspace menu or ⌘K / Ctrl K. Content is realistic sample data: changes stay in this browser session, and nothing is sent anywhere.',
      },
      source: {
        language: 'typescript',
        code: [
          "// Save the following sections as the named files in one folder.\n// index.ts\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nimport './workspace.js';\ndocument.body.append(document.createElement('catalog-workspace'));",
          ...files.map(([path, source]) =>
            path.endsWith('.css') ? `/* ${path} */\n${source}` : `// ${path}\n${published(source)}`,
          ),
          '// chart.ts\n' + published(rendererSource),
          '// date-picker-trigger.js\n' + published(datePickerSource),
          '// map-example.js\n' + published(mapSource),
          ...(sampleMedia ? ['// media.ts\n' + sampleMedia] : []),
        ].join('\n\n'),
      },
    },
  },
} satisfies Meta;
export default meta;
type Story = StoryObj;
export const Overview: Story = {
  name: 'Project workspace',
  render: () => html`<catalog-workspace></catalog-workspace>`,
};
