import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import buttonDocumentation from '../../docs/button.md?raw';

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
}

const meta: Meta<ButtonStoryArgs> = {
  title: 'Components/Button',
  component: 'tp-button',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: buttonDocumentation.replace(/^# Button\n/u, '') } },
  },
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
  },
  argTypes: {
    variant: {
      control: 'select',
      options: ['default', 'secondary', 'destructive', 'outline', 'ghost', 'link'],
      description: 'Visual emphasis only; link appearance does not change button semantics.',
      table: { category: 'Presentation', defaultValue: { summary: 'default' } },
    },
    size: {
      control: 'select',
      options: ['xs', 'sm', 'default', 'lg', 'icon-xs', 'icon-sm', 'icon', 'icon-lg'],
      description: 'Control and mark extent; icon sizes require an accessible name.',
      table: { category: 'Presentation', defaultValue: { summary: 'default' } },
    },
    type: {
      control: 'radio',
      options: ['button', 'submit', 'reset'],
      description: 'Action type in a form; defaults to button to avoid accidental submission.',
      table: { category: 'Action', defaultValue: { summary: 'button' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Exposes disabled state and blocks pointer and keyboard activation.',
      table: { category: 'Action', defaultValue: { summary: 'false' } },
    },
    focusableWhenDisabled: {
      control: 'boolean',
      description: 'Keeps a disabled Button focusable for discovery without allowing activation.',
      table: { category: 'Action', defaultValue: { summary: 'false' } },
    },
    nativeAction: {
      control: 'boolean',
      description: 'Uses a native button host or a keyboard-enabled non-native button host.',
      table: { category: 'Action', defaultValue: { summary: 'true' } },
    },
    ariaLabel: {
      control: 'text',
      description: 'Accessible name for an icon-only Button.',
      table: { category: 'Accessibility', defaultValue: { summary: "''" } },
    },
    name: {
      control: 'text',
      description: 'Submitter name when type is submit.',
      table: { category: 'Form', defaultValue: { summary: "''" } },
    },
    value: {
      control: 'text',
      description: 'Submitter value when type is submit.',
      table: { category: 'Form', defaultValue: { summary: "''" } },
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
      name=${args.name}
      value=${args.value}
      >Continue</tp-button
    >
  `,
};

export default meta;
type Story = StoryObj<ButtonStoryArgs>;

export const Default: Story = {};
export const Secondary: Story = { args: { variant: 'secondary' } };
export const Destructive: Story = { args: { variant: 'destructive' } };
export const Outline: Story = { args: { variant: 'outline' } };
export const Ghost: Story = { args: { variant: 'ghost' } };
export const LinkAppearance: Story = { args: { variant: 'link' } };
export const ExtraSmall: Story = { args: { size: 'xs' } };
export const Small: Story = { args: { size: 'sm' } };
export const Large: Story = { args: { size: 'lg' } };
export const IconOnly: Story = {
  args: { size: 'icon', ariaLabel: 'Add' },
  render: (args) => html`
    <tp-button size=${args.size} variant=${args.variant} .ariaLabel=${args.ariaLabel || null}>
      <span slot="icon-start" aria-hidden="true">+</span>
    </tp-button>
  `,
};
export const IconExtraSmall: Story = { ...IconOnly, args: { size: 'icon-xs', ariaLabel: 'Add' } };
export const IconSmall: Story = { ...IconOnly, args: { size: 'icon-sm', ariaLabel: 'Add' } };
export const IconLarge: Story = { ...IconOnly, args: { size: 'icon-lg', ariaLabel: 'Add' } };
export const WithMarks: Story = {
  render: (args) => html`
    <tp-button variant=${args.variant} size=${args.size}>
      <span slot="icon-start" aria-hidden="true">←</span>
      Continue
      <span slot="icon-end" aria-hidden="true">→</span>
    </tp-button>
  `,
};
export const Disabled: Story = { args: { disabled: true } };
export const FocusableDisabled: Story = {
  args: { disabled: true, focusableWhenDisabled: true },
};
export const SyntheticAction: Story = { args: { nativeAction: false } };
export const FormActions: Story = {
  render: () => html`
    <form
      @submit=${(event: SubmitEvent) => {
        event.preventDefault();
        const form = event.currentTarget as HTMLFormElement;
        const output = form.querySelector('output');
        if (output) output.textContent = new FormData(form, event.submitter).get('intent') + '';
      }}
      @reset=${(event: Event) => {
        const output = (event.currentTarget as HTMLFormElement).querySelector('output');
        if (output) output.textContent = 'reset';
      }}
    >
      <tp-button type="submit" name="intent" value="save">Save</tp-button>
      <tp-button type="reset" variant="outline">Reset</tp-button>
      <output aria-live="polite"></output>
    </form>
  `,
};
