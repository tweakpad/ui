import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpNavigationMenu } from '../components/navigation-menu/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { sourceImports, configuredSource } from './menu-family-controls.js';
import documentation from '../../docs/navigation-menu.md?raw';
interface Args {
  value: string;
  disabled: boolean;
  orientation: 'horizontal' | 'vertical';
  openDelay: number;
  closeDelay: number;
  showViewport: boolean;
  showArrow: boolean;
  placement: string;
  sideOffset: number;
  alignOffset: number;
  keepMounted: boolean;
  portal: boolean;
  preserveTabOrder: boolean;
  showBackdrop: boolean;
}
const source = `${sourceImports}
<tp-navigation-menu aria-label="Resources">
  <tp-navigation-menu-item value="learn"><tp-button slot="trigger" variant="ghost">Learn</tp-button><div slot="content"><a href="#overview" active>Overview</a><a href="#guides">Guides</a><a href="#examples" close-on-click>Examples</a></div></tp-navigation-menu-item>
      <tp-navigation-menu-item value="tools"><tp-button slot="trigger" variant="ghost">Tools</tp-button><div slot="content"><a href="#editor">Editor</a><a href="#inspector">Inspector</a></div></tp-navigation-menu-item>
      <tp-navigation-menu-item><a href="#documentation">Documentation</a></tp-navigation-menu-item>
</tp-navigation-menu>`;
const meta: Meta<Args> = {
  title: 'Components/Navigation menu',
  component: 'tp-navigation-menu',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: { component: documentation },
      source: {
        transform: (_code: string, context: { args: Args }) =>
          configuredSource(source, context.args, 'value'),
      },
    },
  },
  args: {
    value: '',
    disabled: false,
    orientation: 'horizontal',
    openDelay: 50,
    closeDelay: 50,
    showViewport: true,
    showArrow: false,
    placement: 'bottom center',
    sideOffset: 8,
    alignOffset: 0,
    keepMounted: false,
    portal: true,
    preserveTabOrder: true,
    showBackdrop: false,
  },
  argTypes: {
    value: { control: 'text' },
    disabled: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    showViewport: { control: 'boolean' },
    showArrow: { control: 'boolean' },
    placement: {
      control: 'select',
      options: ['bottom start', 'bottom center', 'bottom end', 'top center', 'inline-end start'],
    },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    keepMounted: { control: 'boolean' },
    portal: { control: 'boolean' },
    preserveTabOrder: { control: 'boolean' },
    showBackdrop: { control: 'boolean' },
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const owner = createRef<TpNavigationMenu>();
    const change = (event: TpValueChangeEvent<string>): void => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.value = event.detail.value;
      queueMicrotask(() => {
        if (owner.value) updateArgs({ value: owner.value.value });
      });
    };
    return html`<tp-navigation-menu
      ${ref(owner)}
      aria-label="Resources"
      .value=${args.value}
      .disabled=${args.disabled}
      .orientation=${args.orientation}
      .openDelay=${args.openDelay}
      .closeDelay=${args.closeDelay}
      .showViewport=${args.showViewport}
      .showArrow=${args.showArrow}
      .placement=${args.placement}
      .sideOffset=${args.sideOffset}
      .alignOffset=${args.alignOffset}
      .keepMounted=${args.keepMounted}
      .portal=${args.portal}
      .preserveTabOrder=${args.preserveTabOrder}
      .showBackdrop=${args.showBackdrop}
      .onValueChange=${change}
    >
      <tp-navigation-menu-item value="learn"
        ><tp-button slot="trigger" variant="ghost">Learn</tp-button>
        <div slot="content">
          <a href="#overview" active>Overview</a><a href="#guides">Guides</a
          ><a href="#examples" close-on-click>Examples</a>
        </div></tp-navigation-menu-item
      >
      <tp-navigation-menu-item value="tools"
        ><tp-button slot="trigger" variant="ghost">Tools</tp-button>
        <div slot="content">
          <a href="#editor">Editor</a><a href="#inspector">Inspector</a>
        </div></tp-navigation-menu-item
      >
      <tp-navigation-menu-item><a href="#documentation">Documentation</a></tp-navigation-menu-item>
    </tp-navigation-menu>`;
  },
};
/** Vertical navigation opens beside the list so its remaining destinations stay reachable. */
export const Vertical: Story = {
  ...Default,
  args: { orientation: 'vertical', placement: 'inline-end start', sideOffset: 8 },
};
