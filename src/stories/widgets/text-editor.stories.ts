import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type { TextEditorFormat, TpTextEditor } from '../../widgets/text-editor/index.js';
import {
  textEditorImages,
  textEditorLinks,
  textEditorTables,
} from '../../widgets/text-editor/features/index.js';
import { libraryDocs } from '../library-docs.js';
import { createEngine } from './text-editor-engine.js';
import { fieldNotes } from './text-editor-samples.js';

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
  parameters: { docs: libraryDocs('widgets/text-editor') },
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
      table: { type: { summary: 'string | object | null' }, defaultValue: { summary: 'null' } },
    },
    format: {
      control: 'select',
      options: ['html', 'markdown', 'text', 'json'],
      table: { defaultValue: { summary: "'html'" } },
    },
    placeholder: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    label: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    measure: {
      control: { type: 'number', min: 0, step: 1 },
      table: { defaultValue: { summary: '65' } },
    },
    name: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    readOnly: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
  },
};
export default meta;
type Story = StoryObj<Args>;

/** Upload the image to your storage and resolve its URL; this one keeps the file in the page. */
const upload = async (file: File) => URL.createObjectURL(file);

/** The classic editor of the page's hero: every control in the fixed toolbar. */
const setupClassicEditor = (editor: TpTextEditor): void => {
  editor.features = [textEditorLinks(), textEditorTables(), textEditorImages({ upload })];
  editor.engine = createEngine();
};

export const Default: Story = {
  args: { label: 'Report' },
  render: (args) => renderEditor(args, setupClassicEditor),
};
