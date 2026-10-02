import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/tabs.md?raw';

interface Args {
  value: string;
  label: string;
  variant: 'enclosed' | 'underline';
  orientation: 'horizontal' | 'vertical';
  activation: 'manual' | 'automatic';
  loopFocus: boolean;
  disabled: boolean;
  renderBeforeActivation: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Tabs',
  component: 'tp-tabs',
  tags: ['autodocs'],
  parameters: { layout: 'padded', docs: { description: { component: documentation } } },
  args: {
    value: 'account',
    label: 'Settings',
    variant: 'enclosed',
    orientation: 'horizontal',
    activation: 'manual',
    loopFocus: true,
    disabled: false,
    renderBeforeActivation: false,
  },
  argTypes: {
    value: {
      control: 'select',
      options: ['account', 'password'],
      description: 'Controlled value; this example accepts change proposals.',
    },
    label: { control: 'text', description: 'Accessible name of the tab list.' },
    variant: { control: 'select', options: ['enclosed', 'underline'] },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    activation: { control: 'select', options: ['manual', 'automatic'] },
    loopFocus: { control: 'boolean' },
    disabled: { control: 'boolean' },
    renderBeforeActivation: {
      control: 'boolean',
      description: 'Allow an optional indicator to render before a measurable selection exists.',
    },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-tabs
      .value=${args.value}
      .label=${args.label}
      .variant=${args.variant}
      .orientation=${args.orientation}
      .activation=${args.activation}
      .loopFocus=${args.loopFocus}
      .disabled=${args.disabled}
      .renderBeforeActivation=${args.renderBeforeActivation}
      @tp-value-change=${(event: TpValueChangeEvent<string>) => {
        if (event.target instanceof HTMLElement && event.target.localName === 'tp-tabs')
          updateArgs({ value: event.detail.value });
      }}
    >
      <button slot="tab" value="account">Account</button>
      <button slot="tab" value="password">Password</button>
      <span slot="indicator" aria-hidden="true"></span>
      <section slot="panel" value="account" keep-mounted>
        <tp-card>
          <span slot="header">Account</span>
          <span slot="description">Manage your profile and account preferences.</span>
          <tp-input label="Display name" value="Alex"></tp-input>
          <tp-button slot="footer">Save changes</tp-button>
        </tp-card>
      </section>
      <section slot="panel" value="password">
        <tp-card>
          <span slot="header">Password</span>
          <span slot="description">Choose a strong password for your account.</span>
          <tp-input label="New password" type="password" autocomplete="new-password"></tp-input>
          <tp-button slot="footer">Update password</tp-button>
        </tp-card>
      </section>
    </tp-tabs>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
