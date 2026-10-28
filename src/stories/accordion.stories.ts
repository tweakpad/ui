import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { AccordionValue, AccordionVariant } from '../components/accordion/accordion.js';
import type { AccordionContentAlignment } from '../components/accordion/accordion-item.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type { MotionPolicy } from '../foundation/motion.js';

interface AccordionStoryArgs {
  selectionMode: 'single' | 'multiple';
  variant: AccordionVariant;
  value: AccordionValue;
  defaultValue: AccordionValue;
  collapsible: boolean;
  disabled: boolean;
  keepMounted: boolean;
  hiddenUntilFound: boolean;
  motionPolicy: MotionPolicy;
  contentAlignment: AccordionContentAlignment;
  onValueChange?: (event: TpValueChangeEvent<AccordionValue>) => void;
}

const meta: Meta<AccordionStoryArgs> = {
  title: 'Components/Accordion',
  component: 'tp-accordion',
  parameters: { docs: libraryDocs('components/accordion') },
  args: {
    selectionMode: 'single',
    variant: 'plain',
    value: [],
    defaultValue: [],
    collapsible: false,
    disabled: false,
    keepMounted: false,
    hiddenUntilFound: false,
    motionPolicy: 'inherit',
    contentAlignment: 'edge',
  },
  argTypes: {
    variant: {
      control: 'radio',
      options: ['plain', 'line', 'outline', 'separated'],
      table: {
        category: 'Root',
        type: { summary: "'plain' | 'line' | 'outline' | 'separated'" },
        defaultValue: { summary: 'plain' },
      },
    },
    selectionMode: {
      control: 'radio',
      options: ['single', 'multiple'],
      table: {
        category: 'Root',
        type: { summary: "'single' | 'multiple'" },
        defaultValue: { summary: 'single' },
      },
    },
    value: {
      control: 'object',
      table: { category: 'Root', type: { summary: 'string[]' }, defaultValue: { summary: '[]' } },
    },
    defaultValue: {
      control: 'object',
      table: { category: 'Root', type: { summary: 'string[]' }, defaultValue: { summary: '[]' } },
    },
    collapsible: {
      control: 'boolean',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    keepMounted: {
      control: 'boolean',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    hiddenUntilFound: {
      control: 'boolean',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    motionPolicy: {
      control: 'radio',
      options: ['inherit', 'normal', 'reduce'],
      table: {
        category: 'Root',
        type: { summary: "'inherit' | 'normal' | 'reduce'" },
        defaultValue: { summary: 'inherit' },
      },
    },
    contentAlignment: {
      control: 'radio',
      options: ['edge', 'label'],
      table: {
        category: 'Root',
        type: { summary: "'edge' | 'label'" },
        defaultValue: { summary: 'edge' },
      },
    },
    onValueChange: {
      control: false,
      table: {
        category: 'Root',
        type: { summary: '(event: TpValueChangeEvent<string[]>) => void' },
        defaultValue: { summary: 'undefined' },
      },
    },
  },
  render: (args) => renderAccordion(args),
};

function renderAccordion(args: AccordionStoryArgs) {
  const [, updateArgs] = useArgs<AccordionStoryArgs>();
  const handleValueChange = (event: TpValueChangeEvent<AccordionValue>): void => {
    updateArgs({ value: [...event.detail.value] });
    args.onValueChange?.(event);
  };
  return html`
    <tp-accordion
      .variant=${args.variant}
      selection-mode=${args.selectionMode}
      .value=${args.value}
      .defaultValue=${args.defaultValue}
      ?collapsible=${args.collapsible}
      ?disabled=${args.disabled}
      ?keep-mounted=${args.keepMounted}
      ?hidden-until-found=${args.hiddenUntilFound}
      .motionPolicy=${args.motionPolicy}
      .contentAlignment=${args.contentAlignment}
      @tp-value-change=${handleValueChange}
    >
      <tp-accordion-item value="account" heading-level="2">
        <span slot="label">Account settings</span>
        <p>Your public profile starts here.</p>
        <p>
          Choose how your name appears to your team, update the email used for account notices, and
          review the recovery options you would need if you lost access to your usual device.
        </p>
      </tp-accordion-item>
      <tp-accordion-item value="security" heading-level="2">
        <span slot="label">Security</span>
        <p>Require a second step when signing in from a new device or location.</p>
        <p>Save your backup codes offline.</p>
      </tp-accordion-item>
      <tp-accordion-item value="billing" heading-level="2">
        <span slot="label">Billing</span>
        <p>
          Review every invoice from the current subscription, download receipts for your records,
          and compare charges across billing periods before making a change.
        </p>
        <p>Update the payment method used for future charges.</p>
        <p>Changes apply to your next invoice.</p>
      </tp-accordion-item>
    </tp-accordion>
  `;
}

export default meta;
type Story = StoryObj<AccordionStoryArgs>;

export const Default: Story = {};
