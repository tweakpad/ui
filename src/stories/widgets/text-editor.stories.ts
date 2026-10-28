import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import {
  textEditorBlocks,
  textEditorImages,
  textEditorLinks,
  textEditorSelectionToolbar,
  textEditorSuggestions,
  textEditorTables,
  type TextEditorEngine,
  type TextEditorFeature,
  type TextEditorFormat,
  type TextEditorImageUpload,
  type TpTextEditor,
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

interface Args {
  defaultValue: string;
  format: TextEditorFormat;
  placeholder: string;
  label: string;
  measure: number;
  name: string;
  readOnly: boolean;
  disabled: boolean;
  stickyTableHeaders: boolean;
}

/**
 * One editor with the story's properties and every feature, with the sample upload hook so that
 * the image tool works; its engine is assigned once, so no Control remounts it.
 */
const renderTextEditor = (args: Args, createEngine: () => TextEditorEngine): TemplateResult =>
  html`<tp-text-editor
    .features=${allFeatures(args.stickyTableHeaders)}
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
    measure: 65,
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
    stickyTableHeaders: {
      control: 'boolean',
      description:
        'The `stickyHeaders` option of the tables feature: keeps the header row of a table in view while the rest of the table scrolls.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) => renderTextEditor(args, tiptapEngine),
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Every feature assigned: block editing, tables, images, links, the selection toolbar and the suggestion lists. An application imports only the features it uses.',
      },
    },
  },
};

export const Core: Story = {
  name: 'Core only',
  args: { label: 'Plain notes' },
  render: (args) =>
    html`<tp-text-editor
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
          'No feature assigned: the fixed toolbar with history, block kinds, marks, colors and alignment over the editing surface. The table, image and link tools, the gutter, the selection toolbar and the slash menu are absent, and the page bundles none of them.',
      },
    },
  },
};

/** The layout of the block editor: no fixed toolbar, every control in the block surfaces. */
const blockEditorLayout = { toolbar: [] as string[][] };

export const BlockEditor: Story = {
  name: 'Block editor',
  args: { label: 'Field notes', placeholder: 'Type / for blocks' },
  render: (args) =>
    html`<tp-text-editor
      .features=${allFeatures(false)}
      .layout=${blockEditorLayout}
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
          'The block editor mode: every feature assigned and the fixed toolbar turned off with `layout: { toolbar: [] }`. The gutter beside each block inserts and drags, `/` opens the slash menu, a text selection shows the floating toolbar, and Alt+F10 reaches the controls from the keyboard.',
      },
    },
  },
};

/** The features of a classic toolbar editor: links, tables and images, no block editing. */
const classicFeatures: readonly TextEditorFeature[] = [
  textEditorLinks(),
  textEditorTables(),
  textEditorImages({ upload: (file, options) => sampleUpload(file, options) }),
];

export const ClassicToolbar: Story = {
  name: 'Classic toolbar',
  args: { label: 'Report' },
  render: (args) =>
    html`<tp-text-editor
      .features=${classicFeatures}
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
          'The classic toolbar mode: the links, tables and images features without block editing, the selection toolbar or the slash menu, so every control sits in the fixed toolbar, as in a word processor.',
      },
    },
  },
};

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
      .features=${allFeatures(false)}
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
 * A sample upload service: it reports progress in eight steps, stops on abort and answers an
 * object URL of the file itself, since it stores nothing; an application uploads the file to its
 * storage and resolves the stored image's URL.
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
      resolve(URL.createObjectURL(file));
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

/** Every feature, with the sample upload hook; one list per sticky-headers choice, so a render re-attaches nothing. */
const featureSets = new Map<boolean, readonly TextEditorFeature[]>();
function allFeatures(stickyHeaders: boolean): readonly TextEditorFeature[] {
  let features = featureSets.get(stickyHeaders);
  if (!features) {
    features = [
      textEditorBlocks(),
      textEditorTables({ stickyHeaders }),
      textEditorImages({ upload: sampleUpload }),
      textEditorLinks(),
      textEditorSelectionToolbar(),
      textEditorSuggestions(),
    ];
    featureSets.set(stickyHeaders, features);
  }
  return features;
}

export const ImageUpload: Story = {
  name: 'Image upload',
  args: { label: 'Survey photos' },
  render: (args) =>
    html`<tp-text-editor
      .features=${allFeatures(false)}
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
          "With the images feature and its `upload` option, the image tool inserts an image block that shows a File upload until its image is uploaded, and pasted or dropped image files are uploaded the same way. The feature's `accept` and `maxFileSize` options limit the files; the hook receives each file with an abort signal and a progress callback and resolves to the image source.",
      },
    },
  },
};
