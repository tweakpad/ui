import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpCommandPalette, CommandEntry } from '../components/command-palette/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import { navigationIcons } from '../icons/navigation.js';
import documentation from '../../docs/command-palette.md?raw';
interface Args {
  query: string;
  value: unknown;
  open: boolean;
  inline: boolean;
  disabled: boolean;
  loopNavigation: boolean;
  showCloseControl: boolean;
}
const items: readonly CommandEntry[] = [
  {
    type: 'group',
    label: 'Documents',
    items: [
      {
        value: 'new',
        label: 'New document',
        icon: navigationIcons.folder,
        shortcut: '⌘N',
        keywords: ['create'],
      },
      { value: 'open', label: 'Open document', icon: navigationIcons.folder, shortcut: '⌘O' },
    ],
  },
  { type: 'separator' },
  { value: 'settings', label: 'Settings', icon: navigationIcons.settings, shortcut: '⌘,' },
];
const source = `import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { TpCommandPalette } from '@tweakpad/ui';
import { navigationIcons } from '@tweakpad/ui/icons/navigation';
const palette = new TpCommandPalette();
palette.inline = true;
palette.items = [
  { type: 'group', label: 'Documents', items: [
    { value: 'new', label: 'New document', icon: navigationIcons.folder, shortcut: '⌘N', keywords: ['create'] },
    { value: 'open', label: 'Open document', icon: navigationIcons.folder, shortcut: '⌘O' },
  ] },
  { type: 'separator' },
  { value: 'settings', label: 'Settings', icon: navigationIcons.settings, shortcut: '⌘,' },
];
palette.onExecute = event => console.log(event.detail.commandId);
document.body.append(palette);`;
const meta: Meta<Args> = {
  title: 'Components/Command palette',
  component: 'tp-command-palette',
  parameters: {
    layout: 'centered',
    docs: { description: { component: documentation }, source: { code: source } },
  },
  args: {
    query: '',
    value: null,
    open: false,
    inline: true,
    disabled: false,
    loopNavigation: false,
    showCloseControl: false,
  },
  argTypes: {
    query: { control: 'text' },
    value: { control: 'text' },
    open: { control: 'boolean' },
    inline: { control: 'boolean' },
    disabled: { control: 'boolean' },
    loopNavigation: { control: 'boolean' },
    showCloseControl: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const accept = (
      property: 'query' | 'value' | 'open',
      event: TpValueChangeEvent<unknown> | TpSurfaceOpenChangeEvent,
    ) => {
      if (event.defaultPrevented || event.detail.cancelled) return;
      const owner = event.target as TpCommandPalette;
      if (property === 'open') owner.open = event.detail.value as boolean;
      else if (property === 'query') owner.query = event.detail.value as string;
      else owner.value = event.detail.value;
      queueMicrotask(() => updateArgs({ [property]: owner[property] }));
    };
    return html`<tp-command-palette
      .items=${items}
      .query=${args.query}
      .value=${args.value}
      .open=${args.open}
      .inline=${args.inline}
      .disabled=${args.disabled}
      .loopNavigation=${args.loopNavigation}
      .showCloseControl=${args.showCloseControl}
      @tp-query-change=${(event: TpValueChangeEvent<string>) => accept('query', event)}
      @tp-value-change=${(event: TpValueChangeEvent<unknown>) => accept('value', event)}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => accept('open', event)}
    >
      <tp-button slot="trigger" variant="outline">Open commands</tp-button>
      <tp-button slot="close" variant="outline">Close commands</tp-button>
    </tp-command-palette>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
export const InDialog: Story = {
  args: { inline: false },
  parameters: {
    docs: {
      source: {
        code: source.replace(
          'palette.inline = true;',
          `const trigger = document.createElement('tp-button');
trigger.slot = 'trigger'; trigger.textContent = 'Open commands'; trigger.variant = 'outline';
const close = document.createElement('tp-button'); close.slot = 'close'; close.textContent = 'Close commands'; close.variant = 'outline';
palette.append(trigger, close);`,
        ),
      },
    },
  },
};
