import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import type {
  TextEditorEngine,
  TextEditorFormat,
  TextEditorImageUpload,
  TpTextEditor,
} from '../../widgets/text-editor/index.js';
import {
  calloutBlock,
  customBlockNotes,
  embedBlock,
  fieldNotes,
  lexicalEngine,
  mentionInline,
  tiptapEngine,
} from './text-editor-example.js';
import { textEditorExamples, textEditorStorySources } from './text-editor.examples.js';
import documentation from '../../../docs/widgets/text-editor.md?raw';
import sampleImage from '../assets/ratio-landscape.svg?no-inline';

interface Args {
  defaultValue: string;
  format: TextEditorFormat;
  placeholder: string;
  label: string;
  name: string;
  readOnly: boolean;
  disabled: boolean;
  stickyTableHeaders: boolean;
}

/** One editor with the story's properties; its engine is assigned once, so no Control remounts it. */
const renderTextEditor = (args: Args, createEngine: () => TextEditorEngine): TemplateResult =>
  html`<tp-text-editor
    .defaultValue=${args.defaultValue}
    .format=${args.format}
    .placeholder=${args.placeholder}
    .label=${args.label}
    .name=${args.name}
    .readOnly=${args.readOnly}
    .disabled=${args.disabled}
    .stickyTableHeaders=${args.stickyTableHeaders}
    ${ref((element?: Element) => {
      const editor = element as TpTextEditor | undefined;
      if (editor && !editor.engine) editor.engine = createEngine();
    })}
  ></tp-text-editor>`;

const meta: Meta<Args> = {
  title: 'Widgets/Text editor',
  component: 'tp-text-editor',
  parameters: {
    docs: {
      examples: textEditorExamples,
      description: { component: documentation },
      source: { code: textEditorStorySources.Default, language: 'html' },
    },
  },
  args: {
    defaultValue: fieldNotes,
    format: 'html',
    placeholder: 'Write what you observed',
    label: 'Field notes',
    name: 'notes',
    readOnly: false,
    disabled: false,
    stickyTableHeaders: false,
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
    stickyTableHeaders: {
      control: 'boolean',
      description: 'Keeps the header row of a table in view while the rest of the table scrolls.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) => renderTextEditor(args, tiptapEngine),
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Lexical: Story = {
  name: 'Lexical engine',
  render: (args) => renderTextEditor(args, lexicalEngine),
  parameters: {
    docs: {
      description: {
        story:
          'The same editor on the second engine adapter: properties, events, keyboard and appearance are identical.',
      },
      source: { code: textEditorStorySources.Lexical, language: 'html' },
    },
  },
};

const customNodes = [calloutBlock, embedBlock, mentionInline];
/** The slash list and the mention's `@` list. */
const customSuggestions = { suggestions: ['slash', 'mention'] };

export const CustomNodes: Story = {
  name: 'Custom nodes',
  args: { defaultValue: customBlockNotes, label: 'Mooring notes' },
  render: (args) =>
    html`<tp-text-editor
      .nodes=${customNodes}
      .layout=${customSuggestions}
      .defaultValue=${args.defaultValue}
      .format=${args.format}
      .placeholder=${args.placeholder}
      .label=${args.label}
      .readOnly=${args.readOnly}
      .disabled=${args.disabled}
      ${ref((element?: Element) => {
        const editor = element as TpTextEditor | undefined;
        if (editor && !editor.engine) editor.engine = tiptapEngine();
      })}
    ></tp-text-editor>`,
  parameters: {
    docs: {
      description: {
        story:
          'A callout and an embed defined with `defineTextEditorBlock`, and a mention defined with `defineTextEditorInline`. The callout defines no paint of its own; the embed shows an https page in a sandboxed frame and requires a title; typing `@` lists the crew, searched after a short delay.',
      },
    },
  },
};

/**
 * A sample upload service: it reports progress in eight steps, stops on abort and answers the URL
 * of one sample image, since it stores nothing.
 */
const sampleUpload: TextEditorImageUpload = (file, { signal, onProgress }) =>
  new Promise((resolve, reject) => {
    const total = Math.max(file.size, 1);
    let sent = 0;
    const timer = setInterval(() => {
      sent = Math.min(total, sent + Math.ceil(total / 8));
      onProgress(sent, total);
      if (sent < total) return;
      clearInterval(timer);
      resolve(sampleImage);
    }, 200);
    signal.addEventListener(
      'abort',
      () => {
        clearInterval(timer);
        reject(signal.reason);
      },
      { once: true },
    );
  });

export const ImageUpload: Story = {
  name: 'Image upload',
  args: { label: 'Survey photos' },
  render: (args) =>
    html`<tp-text-editor
      .imageUpload=${sampleUpload}
      .defaultValue=${args.defaultValue}
      .format=${args.format}
      .placeholder=${args.placeholder}
      .label=${args.label}
      .readOnly=${args.readOnly}
      .disabled=${args.disabled}
      ${ref((element?: Element) => {
        const editor = element as TpTextEditor | undefined;
        if (editor && !editor.engine) editor.engine = tiptapEngine();
      })}
    ></tp-text-editor>`,
  parameters: {
    docs: {
      description: {
        story:
          'With `imageUpload`, the image popover offers a file upload, and pasted or dropped image files are uploaded too. The hook receives each file with an abort signal and a progress callback and resolves to the image source.',
      },
    },
  },
};
