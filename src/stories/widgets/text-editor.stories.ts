import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TextEditorFormat, TpTextEditor } from '../../widgets/text-editor/index.js';
import { setupBlockEditor } from './text-editor-blocks-example.js';
import { setupClassicEditor } from './text-editor-classic-example.js';
import { fieldNotes } from './text-editor-samples.js';
import { setupSelectionToolbarEditor } from './text-editor-selection-example.js';
import { textEditorExamples, textEditorStorySources } from './text-editor.examples.js';
import documentation from '../../../docs/widgets/text-editor.md?raw';

interface Args {
  defaultValue: string;
  format: TextEditorFormat;
  placeholder: string;
  label: string;
  measure: number;
  name: string;
  readOnly: boolean;
  disabled: boolean;
}

/**
 * The editor of a story with its properties, set up once by the module its code shows (features,
 * layout and engine), so no Control remounts it.
 */
const renderEditor = (args: Args, setup: (editor: TpTextEditor) => void): TemplateResult =>
  html`<tp-text-editor
    .defaultValue=${args.defaultValue}
    .format=${args.format}
    .placeholder=${args.placeholder}
    .label=${args.label}
    .measure=${args.measure}
    .name=${args.name}
    .readOnly=${args.readOnly}
    .disabled=${args.disabled}
    ${ref((element?: Element) => {
      const editor = element as TpTextEditor | undefined;
      if (editor && !editor.engine) setup(editor);
    })}
  ></tp-text-editor>`;

const meta: Meta<Args> = {
  title: 'Widgets/Text editor',
  component: 'tp-text-editor',
  parameters: {
    docs: {
      examples: textEditorExamples,
      description: { component: documentation },
    },
  },
  args: {
    defaultValue: fieldNotes,
    format: 'html',
    placeholder: 'Write what you observed',
    label: 'Field notes',
    measure: 65,
    name: 'notes',
    readOnly: false,
    disabled: false,
  },
  argTypes: {
    defaultValue: {
      control: 'text',
      description:
        'Initial content in `format`, applied when the engine mounts; a later change only sets what form reset restores.',
      table: { type: { summary: 'string | object | null' }, defaultValue: { summary: 'null' } },
    },
    format: {
      control: 'select',
      options: ['html', 'markdown', 'text', 'json'],
      description:
        'Format of `defaultValue` and of the form value, and the default of `getContent()` and `setContent()`.',
      table: { defaultValue: { summary: "'html'" } },
    },
    placeholder: {
      control: 'text',
      description:
        'Shown in the first block while the document is empty, and the `aria-placeholder` of the editing root.',
      table: { defaultValue: { summary: "''" } },
    },
    label: {
      control: 'text',
      description: 'Accessible name of the editing root when no Field labels it.',
      table: { defaultValue: { summary: "''" } },
    },
    measure: {
      control: { type: 'number', min: 0, step: 1 },
      description:
        'The longest line of text in characters (`ch` of the content font); the content sits centered in a wider viewport. 0 removes the limit.',
      table: { defaultValue: { summary: '65' } },
    },
    name: {
      control: 'text',
      description: 'Name of the form entry, which holds the document in `format`.',
      table: { defaultValue: { summary: "''" } },
    },
    readOnly: {
      control: 'boolean',
      description:
        'The document stays readable, selectable and copyable; changes other than `setContent()` are rejected.',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description:
        'Nothing in the editor is focusable, changes other than `setContent()` are rejected and no form value is submitted.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  name: 'Classic toolbar',
  args: { label: 'Report' },
  render: (args) => renderEditor(args, setupClassicEditor),
  parameters: {
    docs: {
      description: {
        story:
          'Every control sits in the fixed toolbar, as in a word processor: the links, tables and images features add their tools to it.',
      },
      source: { code: textEditorStorySources.Default, language: 'html' },
    },
  },
};

export const SelectionToolbar: Story = {
  name: 'Selection toolbar',
  render: (args) => renderEditor(args, setupSelectionToolbarEditor),
  parameters: {
    docs: {
      description: {
        story:
          'The fixed toolbar is off (`layout: { toolbar: [] }`) and the selection toolbar feature carries the formatting: select a few words to format them or add a link. Alt+F10 moves focus to it from the keyboard.',
      },
      source: { code: textEditorStorySources.SelectionToolbar, language: 'html' },
    },
  },
};

export const BlockEditor: Story = {
  name: 'Block editor',
  args: { placeholder: 'Type / for blocks' },
  render: (args) => renderEditor(args, setupBlockEditor),
  parameters: {
    docs: {
      description: {
        story:
          'The selection toolbar editor with blocks: the gutter beside each block inserts, drags and opens the block menu, and `/` opens the slash menu, which also inserts tables and images.',
      },
      source: { code: textEditorStorySources.BlockEditor, language: 'html' },
    },
  },
};
