import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpMenubar } from '../components/menubar/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { sourceImports, configuredSource } from './menu-family-controls.js';
import documentation from '../../docs/menubar.md?raw';
interface Args {
  value: string;
  disabled: boolean;
  orientation: 'horizontal' | 'vertical';
  loopFocus: boolean;
  modal: boolean;
}
const source = `${sourceImports}
<tp-menubar aria-label="Editor">
  <tp-menu value="file" label="File actions"><tp-button slot="trigger" variant="ghost">File</tp-button><tp-menu-item>New document</tp-menu-item><tp-menu-item>Open</tp-menu-item></tp-menu>
      <tp-menu value="edit" label="Edit actions"><tp-button slot="trigger" variant="ghost">Edit</tp-button><tp-menu-item>Undo</tp-menu-item><tp-menu-checkbox-item>Show ruler</tp-menu-checkbox-item></tp-menu>
      <tp-menu value="help" label="Help actions"><tp-button slot="trigger" variant="ghost">Help</tp-button><tp-menu-item>Keyboard shortcuts</tp-menu-item></tp-menu>
</tp-menubar>`;
const meta: Meta<Args> = {
  title: 'Components/Menubar',
  component: 'tp-menubar',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: { component: documentation },
      source: {
        code: source,
        transform: (_code: string, context: { args: Args }) =>
          configuredSource(source, context.args, 'value'),
      },
    },
  },
  args: { value: '', disabled: false, orientation: 'horizontal', loopFocus: true, modal: true },
  argTypes: {
    value: { control: 'text' },
    disabled: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    loopFocus: { control: 'boolean' },
    modal: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const owner = createRef<TpMenubar>();
    const change = (event: TpValueChangeEvent<string>): void => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.value = event.detail.value;
      queueMicrotask(() => {
        if (owner.value) updateArgs({ value: owner.value.value });
      });
    };
    return html`<tp-menubar
      ${ref(owner)}
      aria-label="Editor"
      .value=${args.value}
      .disabled=${args.disabled}
      .orientation=${args.orientation}
      .loopFocus=${args.loopFocus}
      .modal=${args.modal}
      .onValueChange=${change}
    >
      <tp-menu value="file" label="File actions"
        ><tp-button slot="trigger" variant="ghost">File</tp-button
        ><tp-menu-item>New document</tp-menu-item><tp-menu-item>Open</tp-menu-item></tp-menu
      >
      <tp-menu value="edit" label="Edit actions"
        ><tp-button slot="trigger" variant="ghost">Edit</tp-button><tp-menu-item>Undo</tp-menu-item
        ><tp-menu-checkbox-item>Show ruler</tp-menu-checkbox-item></tp-menu
      >
      <tp-menu value="help" label="Help actions"
        ><tp-button slot="trigger" variant="ghost">Help</tp-button
        ><tp-menu-item>Keyboard shortcuts</tp-menu-item></tp-menu
      >
    </tp-menubar>`;
  },
};
