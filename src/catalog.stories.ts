import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import './stories/workspace/workspace.js';
import CatalogDocs from '../.storybook/catalog-docs.mdx';
import rendererSource from './stories/data-visualization.examples.ts?raw';
import workspaceSource from './stories/workspace/workspace.ts?raw';
import dataSource from './stories/workspace/data.ts?raw';
import stylesSource from './stories/workspace/styles.css?raw';

const meta = {
  title: 'Tweakpad UI/Complete catalog',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      page: CatalogDocs,
      description: {
        component:
          'Atlas is a working project workspace composed from the complete Tweakpad catalog. Explore Overview, Work, Files, Brief, Activity and Settings. Filter and edit tasks, export CSV, add files, write messages, invite teammates, and use ⌘K / Ctrl K to navigate. Changes are local to this browser session; reloading restores the sample project. Verification and invitations are explicitly local demos.',
      },
      source: {
        language: 'typescript',
        code: [
          "// Save the following sections as the named files in one folder.\n// index.ts\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nimport './workspace.js';\ndocument.body.append(document.createElement('catalog-workspace'));",
          '// workspace.ts\n' +
            workspaceSource
              .replaceAll('../../icons/', '@tweakpad/ui/icons/')
              .replace(/(@tweakpad\/ui\/icons\/[^']+)\.js/g, '$1')
              .replace(/from '\.\.\/\.\.\/components\/[^']+'/g, "from '@tweakpad/ui'")
              .replaceAll('../../foundation/events.js', '@tweakpad/ui')
              .replaceAll('../../foundation/surface-state.js', '@tweakpad/ui')
              .replace('../data-visualization.examples.js', './chart.js'),
          '// data.ts\n' +
            dataSource
              .replaceAll('../../icons/', '@tweakpad/ui/icons/')
              .replace(/(@tweakpad\/ui\/icons\/[^']+)\.js/g, '$1')
              .replace(/from '\.\.\/\.\.\/components\/[^']+'/g, "from '@tweakpad/ui'")
              .replace('../../foundation/questionnaire.js', '@tweakpad/ui'),
          '// chart.ts\n' +
            rendererSource.replace('../components/data-visualization/index.js', '@tweakpad/ui'),
          '/* styles.css */\n' + stylesSource,
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
