import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { navigationIcons } from '../icons/navigation.js';
import { plusIcon } from '../icons/plus.js';
import type { TpIcon } from '../components/icon/icon.js';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpMenubar } from '../components/menubar/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
interface Args {
  value: string;
  disabled: boolean;
  orientation: 'horizontal' | 'vertical';
  loopFocus: boolean;
  modal: boolean;
}
const menuContent = `
  <tp-menu value="file" label="File actions">
    <tp-button slot="trigger" variant="ghost">File</tp-button>
    <tp-menu-item value="new"><tp-icon data-menubar-icon="plus"></tp-icon>New document<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="N"></tp-key-hint></tp-key-hint-group></tp-menu-item>
    <tp-menu-item value="open"><tp-icon data-menubar-icon="folder"></tp-icon>Open<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="O"></tp-key-hint></tp-key-hint-group></tp-menu-item>
    <tp-separator></tp-separator>
    <tp-menu label="Share document">
      <tp-button slot="trigger" variant="ghost"><tp-icon slot="icon-start" data-menubar-icon="share"></tp-icon>Share</tp-button>
      <tp-menu-item value="invite"><tp-icon data-menubar-icon="account"></tp-icon>Invite people</tp-menu-item>
      <tp-menu-item value="link"><tp-icon data-menubar-icon="share"></tp-icon>Copy link<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="shift"></tp-key-hint><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="C"></tp-key-hint></tp-key-hint-group></tp-menu-item>
    </tp-menu>
    <tp-separator></tp-separator>
    <tp-menu-item value="delete" variant="destructive"><tp-icon data-menubar-icon="trash"></tp-icon>Delete document<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="⌫"></tp-key-hint></tp-key-hint-group></tp-menu-item>
  </tp-menu>
  <tp-menu value="edit" label="Edit actions">
    <tp-button slot="trigger" variant="ghost">Edit</tp-button>
    <tp-menu-item value="settings"><tp-icon data-menubar-icon="settings"></tp-icon>Preferences<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key=","></tp-key-hint></tp-key-hint-group></tp-menu-item>
    <tp-menu-item disabled value="paste">Paste<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="V"></tp-key-hint></tp-key-hint-group></tp-menu-item>
    <tp-separator></tp-separator>
    <tp-menu-checkbox-item default-checked>Word wrap</tp-menu-checkbox-item>
    <tp-menu-checkbox-item>Show ruler</tp-menu-checkbox-item>
    <tp-separator></tp-separator>
    <tp-menu-radio-group label="Density" default-value="comfortable">
      <span data-menu-label>Density</span>
      <tp-menu-radio-item value="compact">Compact</tp-menu-radio-item>
      <tp-menu-radio-item value="comfortable">Comfortable</tp-menu-radio-item>
    </tp-menu-radio-group>
  </tp-menu>
  <tp-menu value="help" label="Help actions">
    <tp-button slot="trigger" variant="ghost">Help</tp-button>
    <tp-menu-item value="docs"><tp-icon data-menubar-icon="book"></tp-icon>Documentation</tp-menu-item>
    <tp-menu-item value="shortcuts"><tp-icon data-menubar-icon="terminal"></tp-icon>Keyboard shortcuts<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="/"></tp-key-hint></tp-key-hint-group></tp-menu-item>
  </tp-menu>`;
const setupIcons = (element: Element | undefined): void => {
  queueMicrotask(() => {
    for (const icon of element?.querySelectorAll<TpIcon>('[data-menubar-icon]') ?? []) {
      const name = icon.dataset.menubarIcon as keyof typeof navigationIcons | 'plus';
      icon.icon = name === 'plus' ? plusIcon : navigationIcons[name];
    }
  });
};
const meta: Meta<Args> = {
  title: 'Components/Menubar',
  component: 'tp-menubar',
  parameters: {
    layout: 'centered',
    docs: libraryDocs('components/menubar'),
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
      ${ref(setupIcons)}
      aria-label="Editor"
      .value=${args.value}
      .disabled=${args.disabled}
      .orientation=${args.orientation}
      .loopFocus=${args.loopFocus}
      .modal=${args.modal}
      .onValueChange=${change}
    >
      ${unsafeHTML(menuContent)}
    </tp-menubar>`;
  },
};
