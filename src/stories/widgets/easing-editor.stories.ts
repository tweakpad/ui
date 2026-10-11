import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type {
  EasingEditorLayout,
  EasingEditorSize,
  EasingPreviewMode,
  TpEasingEditor,
} from '../../widgets/easing-editor/index.js';
import type { TpValueChangeEvent } from '../../foundation/events.js';
import { easingEditorExamples } from './easing-editor.examples.js';
import documentation from '../../../docs/widgets/easing-editor.md?raw';

interface Args {
  value: string;
  duration: number;
  timing: boolean;
  layout: EasingEditorLayout;
  size: EasingEditorSize;
  presetPicker: boolean;
  preview: EasingPreviewMode;
  previewControls: boolean;
  frames: boolean;
  label: string;
  disabled: boolean;
  readOnly: boolean;
}
const sourceFor = (markup: string) =>
  `<script type="module">\n  import '@tweakpad/ui/styles.css';\n  import '@tweakpad/ui/register';\n  import '@tweakpad/ui/register/widgets';\n</script>\n${markup}`;
const source = sourceFor(
  '<tp-easing-editor label="Motion" name="easing" default-value="ease-out"></tp-easing-editor>',
);
const meta: Meta<Args> = {
  title: 'Widgets/Easing editor',
  component: 'tp-easing-editor',
  parameters: {
    docs: {
      examples: easingEditorExamples,
      description: { component: documentation },
      source: { code: source, language: 'html' },
    },
  },
  args: {
    value: 'ease-out',
    duration: 0.7,
    timing: true,
    layout: 'extended',
    size: 'default',
    presetPicker: true,
    preview: 'scale',
    previewControls: true,
    frames: true,
    label: 'Motion',
    disabled: false,
    readOnly: false,
  },
  argTypes: {
    value: {
      control: 'text',
      description: 'Controlled easing string; the example accepts proposals.',
    },
    duration: { control: { type: 'number', min: 0.01, max: 1, step: 0.01 } },
    timing: { control: 'boolean' },
    layout: { control: 'select', options: ['extended', 'compact'] },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    presetPicker: { control: 'boolean' },
    preview: {
      control: 'select',
      options: ['none', 'scale', 'scale-x', 'scale-y', 'rotation'],
    },
    previewControls: { control: 'boolean' },
    frames: { control: 'boolean' },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const editor = createRef<TpEasingEditor>();
    return html`<tp-easing-editor
      ${ref(editor)}
      .value=${args.value}
      .duration=${args.duration}
      .timing=${args.timing}
      .layout=${args.layout}
      .size=${args.size}
      .presetPicker=${args.presetPicker}
      .preview=${args.preview}
      .previewControls=${args.previewControls}
      .frames=${args.frames}
      .label=${args.label}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .onValueChange=${(event: TpValueChangeEvent<string>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (editor.value) editor.value.value = event.detail.value;
        queueMicrotask(() => {
          if (editor.value) updateArgs({ value: editor.value.value });
        });
      }}
      @tp-duration-change=${(event: TpValueChangeEvent<number>) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        if (editor.value) editor.value.duration = event.detail.value;
        queueMicrotask(() => {
          if (editor.value) updateArgs({ duration: editor.value.duration });
        });
      }}
    ></tp-easing-editor>`;
  },
};
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Compact: Story = {
  args: { layout: 'compact', value: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
};

export const Spring: Story = {
  args: { value: 'spring(1 200 8)', duration: 0.6 },
};

export const Custom: Story = {
  args: { value: 'linear(0, 0.3 20%, 1.15 60%, 1)', timing: false, preview: 'scale' },
};
