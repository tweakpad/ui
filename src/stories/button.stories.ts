import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { IconDefinition } from '../icons/types.js';

interface ButtonStoryArgs {
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link';
  size: 'xs' | 'sm' | 'default' | 'lg' | 'icon-xs' | 'icon-sm' | 'icon' | 'icon-lg';
  type: 'button' | 'submit' | 'reset';
  disabled: boolean;
  focusableWhenDisabled: boolean;
  nativeAction: boolean;
  ariaLabel: string;
  name: string;
  value: string;
  icon: IconDefinition | undefined;
  iconPosition: 'leading' | 'trailing';
  loadingPosition: 'leading' | 'trailing' | null;
  href: string;
  target: string;
  rel: string;
  download: string;
}

const meta: Meta<ButtonStoryArgs> = {
  title: 'Components/Button',
  component: 'tp-button',
  parameters: { docs: libraryDocs('components/button') },
  args: {
    variant: 'default',
    size: 'default',
    type: 'button',
    disabled: false,
    focusableWhenDisabled: false,
    nativeAction: true,
    ariaLabel: '',
    name: '',
    value: '',
    icon: undefined,
    iconPosition: 'leading',
    loadingPosition: null,
    href: '',
    target: '',
    rel: '',
    download: '',
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      table: { category: 'Presentation', defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
      table: { category: 'Presentation', defaultValue: { summary: 'default' } },
    },
    type: {
      control: 'radio',
      options: ['button', 'submit', 'reset'],
      table: { category: 'Action', defaultValue: { summary: 'button' } },
    },
    disabled: {
      control: 'boolean',
      table: { category: 'Action', defaultValue: { summary: 'false' } },
    },
    focusableWhenDisabled: {
      control: 'boolean',
      table: { category: 'Action', defaultValue: { summary: 'false' } },
    },
    nativeAction: {
      control: 'boolean',
      table: { category: 'Action', defaultValue: { summary: 'true' } },
    },
    ariaLabel: {
      control: 'text',
      table: { category: 'Accessibility', defaultValue: { summary: "''" } },
    },
    name: {
      control: 'text',
      table: { category: 'Form', defaultValue: { summary: "''" } },
    },
    value: {
      control: 'text',
      table: { category: 'Form', defaultValue: { summary: "''" } },
    },
    icon: {
      control: 'object',
      table: { category: 'Content', defaultValue: { summary: 'undefined' } },
    },
    iconPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      table: { category: 'Content', defaultValue: { summary: 'leading' } },
    },
    loadingPosition: {
      control: 'select',
      options: [null, 'leading', 'trailing'],
      table: { category: 'Content', defaultValue: { summary: 'null' } },
    },
    href: {
      control: 'text',
      table: { category: 'Navigation', defaultValue: { summary: 'null' } },
    },
    target: {
      control: 'text',
      table: { category: 'Navigation', defaultValue: { summary: 'null' } },
    },
    rel: {
      control: 'text',
      table: { category: 'Navigation', defaultValue: { summary: 'null' } },
    },
    download: {
      control: 'text',
      table: { category: 'Navigation', defaultValue: { summary: 'null' } },
    },
  },
  render: (args) => html`
    <tp-button
      variant=${args.variant}
      size=${args.size}
      type=${args.type}
      ?disabled=${args.disabled}
      .focusableWhenDisabled=${args.focusableWhenDisabled}
      .nativeAction=${args.nativeAction}
      .ariaLabel=${args.ariaLabel || null}
      .icon=${args.icon}
      .iconPosition=${args.iconPosition}
      .loadingPosition=${args.loadingPosition}
      .href=${args.href || null}
      .target=${args.target || null}
      .rel=${args.rel || null}
      .download=${args.download || null}
      name=${args.name}
      value=${args.value}
      >Continue</tp-button
    >
  `,
};

export default meta;
type Story = StoryObj<ButtonStoryArgs>;

export const Default: Story = {};
