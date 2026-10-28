import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/tree-view.md?raw';
import { folderIcon } from '../icons/folder.js';
import { fileTextIcon } from '../icons/file-text.js';
import { treeViewDefaultSource, treeViewExamples } from './tree-view.examples.js';

interface Args {
  label: string;
  selectionMode: 'none' | 'single' | 'multiple';
  checkboxSelection: boolean;
  selectionPropagation: boolean;
  expansionTrigger: 'item' | 'indicator';
  size: 'sm' | 'default';
  guides: 'line' | 'none';
  disabled: boolean;
  readOnly: boolean;
}

const meta = {
  title: 'Components/Tree view',
  component: 'tp-tree-view',
  parameters: {
    docs: {
      description: { component: documentation },
      examples: treeViewExamples,
      source: { code: treeViewDefaultSource },
    },
  },
  args: {
    label: 'Files',
    selectionMode: 'single',
    checkboxSelection: false,
    selectionPropagation: false,
    expansionTrigger: 'item',
    size: 'default',
    guides: 'line',
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    label: { control: 'text', description: 'Accessible name of the tree.' },
    selectionMode: {
      control: 'inline-radio',
      options: ['none', 'single', 'multiple'],
      description: '`selection-mode`.',
      table: { defaultValue: { summary: 'single' } },
    },
    checkboxSelection: {
      control: 'boolean',
      description: '`checkbox-selection`: a checked indicator in every row.',
    },
    selectionPropagation: {
      control: 'boolean',
      description: '`selection-propagation`: multiple mode cascades to descendants.',
    },
    expansionTrigger: {
      control: 'inline-radio',
      options: ['item', 'indicator'],
      description: '`expansion-trigger`: what toggles expansion on press.',
      table: { defaultValue: { summary: 'item' } },
    },
    size: { control: 'inline-radio', options: ['sm', 'default'], description: 'Row size.' },
    guides: { control: 'inline-radio', options: ['line', 'none'], description: 'Indent guides.' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean', description: '`readonly`: expansion only.' },
  },
  render: (args) => html`
    <tp-tree-view
      label=${args.label}
      style="max-inline-size: 18rem"
      selection-mode=${args.selectionMode}
      ?checkbox-selection=${args.checkboxSelection}
      ?selection-propagation=${args.selectionPropagation}
      expansion-trigger=${args.expansionTrigger}
      size=${args.size}
      guides=${args.guides}
      ?disabled=${args.disabled}
      ?readonly=${args.readOnly}
      default-expanded='["src", "components"]'
      default-value='["button.ts"]'
    >
      <tp-tree-item value="src">
        <tp-icon slot="leading" .icon=${folderIcon}></tp-icon>src
        <tp-tree-item value="components">
          <tp-icon slot="leading" .icon=${folderIcon}></tp-icon>components
          <tp-tree-item value="button.ts"
            ><tp-icon slot="leading" .icon=${fileTextIcon}></tp-icon>button.ts</tp-tree-item
          >
          <tp-tree-item value="card.ts"
            ><tp-icon slot="leading" .icon=${fileTextIcon}></tp-icon>card.ts</tp-tree-item
          >
          <tp-tree-item value="dialog.ts" disabled
            ><tp-icon slot="leading" .icon=${fileTextIcon}></tp-icon>dialog.ts</tp-tree-item
          >
        </tp-tree-item>
        <tp-tree-item value="lib">
          <tp-icon slot="leading" .icon=${folderIcon}></tp-icon>lib
          <tp-tree-item value="utils.ts"
            ><tp-icon slot="leading" .icon=${fileTextIcon}></tp-icon>utils.ts</tp-tree-item
          >
        </tp-tree-item>
        <tp-tree-item value="index.ts"
          ><tp-icon slot="leading" .icon=${fileTextIcon}></tp-icon>index.ts</tp-tree-item
        >
      </tp-tree-item>
      <tp-tree-item value="package.json"
        ><tp-icon slot="leading" .icon=${fileTextIcon}></tp-icon>package.json</tp-tree-item
      >
    </tp-tree-view>
  `,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

/** A markup file tree with icons, a preselected file and two expanded folders. */
export const Default: Story = {};
