import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type {
  FileUploadHintTreatment,
  FileUploadItemSize,
  FileUploadLayout,
  FileUploadPaste,
  FileUploadSize,
} from '../components/file-upload/index.js';

interface Args {
  multiple: boolean;
  accept: string;
  maxFiles: number | null;
  maxFileSize: string;
  layout: FileUploadLayout;
  size: FileUploadSize;
  itemSize: FileUploadItemSize;
  hintTreatment: FileUploadHintTreatment;
  showTrigger: boolean;
  clearable: boolean;
  removable: boolean;
  keepRejected: boolean;
  allowDrop: boolean;
  paste: FileUploadPaste;
  required: boolean;
  disabled: boolean;
  readOnly: boolean;
}

const meta = {
  title: 'Components/File upload',
  component: 'tp-file-upload',
  parameters: { docs: libraryDocs('components/file-upload') },
  args: {
    multiple: true,
    accept: '.pdf,image/png,image/jpeg',
    maxFiles: null,
    maxFileSize: '10MB',
    layout: 'stack',
    size: 'default',
    itemSize: 'default',
    hintTreatment: 'text',
    showTrigger: false,
    clearable: false,
    removable: true,
    keepRejected: true,
    allowDrop: true,
    paste: 'none',
    required: false,
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    accept: { control: 'text' },
    maxFiles: { control: 'number' },
    maxFileSize: { control: 'text' },
    layout: { control: 'select', options: ['stack', 'grid'] },
    size: { control: 'select', options: ['sm', 'default'] },
    itemSize: { control: 'select', options: ['xs', 'sm', 'default'] },
    hintTreatment: { control: 'select', options: ['text', 'badges', 'none'] },
    paste: { control: 'select', options: ['none', 'control', 'document'] },
  },
  render: (args) =>
    html`<tp-file-upload
      name="files"
      ?multiple=${args.multiple}
      accept=${args.accept}
      max-files=${args.maxFiles ?? ''}
      max-file-size=${args.maxFileSize}
      layout=${args.layout}
      size=${args.size}
      item-size=${args.itemSize}
      hint-treatment=${args.hintTreatment}
      ?show-trigger=${args.showTrigger}
      ?clearable=${args.clearable}
      .removable=${args.removable}
      .keepRejected=${args.keepRejected}
      .allowDrop=${args.allowDrop}
      paste=${args.paste}
      ?required=${args.required}
      ?disabled=${args.disabled}
      ?readonly=${args.readOnly}
    ></tp-file-upload>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
