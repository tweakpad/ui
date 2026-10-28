import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import {
  createEmojibaseSource,
  type EmojiPickerPicker,
  type EmojiPickerSize,
  type SkinTone,
  type TpEmojiPicker,
} from '../../widgets/emoji-picker/index.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { libraryDocs } from '../library-docs.js';

interface Args {
  value: string;
  skinTone: SkinTone;
  picker: EmojiPickerPicker;
  size: EmojiPickerSize;
  columns: number;
  sticky: boolean;
  categoryBar: boolean;
  preview: boolean;
  skinToneSelector: boolean;
  label: string;
  disabled: boolean;
  readOnly: boolean;
  fullDataset: boolean;
}
// The full dataset is the application's choice: here a public copy of the dataset files.
const fullDataset = createEmojibaseSource({
  url: 'https://cdn.jsdelivr.net/npm/emojibase-data@16',
});

const meta: Meta<Args> = {
  title: 'Widgets/Emoji picker',
  component: 'tp-emoji-picker',
  parameters: { docs: libraryDocs('widgets/emoji-picker') },
  args: {
    value: '',
    skinTone: 'none',
    picker: 'inline',
    size: 'default',
    columns: 9,
    sticky: true,
    categoryBar: true,
    preview: true,
    skinToneSelector: true,
    label: 'Reaction',
    disabled: false,
    readOnly: false,
    fullDataset: false,
  },
  argTypes: {
    value: { control: 'text' },
    skinTone: {
      control: 'select',
      options: ['none', 'light', 'medium-light', 'medium', 'medium-dark', 'dark'],
    },
    picker: { control: 'select', options: ['inline', 'popup'] },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    columns: { control: { type: 'number', min: 4, max: 12, step: 1 } },
    sticky: { control: 'boolean' },
    categoryBar: { control: 'boolean' },
    preview: { control: 'boolean' },
    skinToneSelector: { control: 'boolean' },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    fullDataset: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const picker = createRef<TpEmojiPicker>();
    return html`<tp-emoji-picker
      ${ref(picker)}
      .value=${args.value}
      .skinTone=${args.skinTone}
      .picker=${args.picker}
      .size=${args.size}
      .columns=${args.columns}
      .sticky=${args.sticky}
      .categoryBar=${args.categoryBar}
      .preview=${args.preview}
      .skinToneSelector=${args.skinToneSelector}
      .label=${args.label}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .data=${args.fullDataset ? fullDataset : undefined}
      .onValueChange=${(event: TpValueChangeEvent<string>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (picker.value) picker.value.value = event.detail.value;
        queueMicrotask(() => {
          if (picker.value) updateArgs({ value: picker.value.value });
        });
      }}
      @tp-skin-tone-change=${(event: TpValueChangeEvent<SkinTone>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (picker.value) picker.value.skinTone = event.detail.value;
        queueMicrotask(() => {
          if (picker.value) updateArgs({ skinTone: picker.value.skinTone });
        });
      }}
    ></tp-emoji-picker>`;
  },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const FullDataset: Story = {
  name: 'Full dataset',
  tags: ['!autodocs'],
  args: { fullDataset: true, label: 'All emoji' },
};
