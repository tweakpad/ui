import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import accordionDocumentation from '../../docs/accordion.md?raw';
import type { AccordionValue } from '../components/accordion.js';
import type { AccordionIndicatorPosition } from '../components/accordion-item.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import { plusIcon } from '../icons/plus.js';

interface AccordionStoryArgs {
  selectionMode: 'single' | 'multiple';
  value: AccordionValue;
  defaultValue: AccordionValue;
  collapsible: boolean;
  disabled: boolean;
  keepMounted: boolean;
  hiddenUntilFound: boolean;
  indicatorPosition: AccordionIndicatorPosition;
  securityIndicatorPosition: AccordionIndicatorPosition;
  billingIndicatorPosition: AccordionIndicatorPosition;
  itemDisabled: boolean;
  headingLevel: number;
  onValueChange?: (event: TpValueChangeEvent<AccordionValue>) => void;
}

const meta: Meta<AccordionStoryArgs> = {
  title: 'Components/Accordion',
  component: 'tp-accordion',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: accordionDocumentation.replace(/^# Accordion\n/u, ''),
      },
    },
  },
  args: {
    selectionMode: 'single',
    value: ['account'],
    defaultValue: [],
    collapsible: false,
    disabled: false,
    keepMounted: false,
    hiddenUntilFound: false,
    indicatorPosition: 'trailing',
    securityIndicatorPosition: 'trailing',
    billingIndicatorPosition: 'trailing',
    itemDisabled: false,
    headingLevel: 2,
  },
  argTypes: {
    selectionMode: {
      control: 'radio',
      options: ['single', 'multiple'],
      description: 'Whether one or several items may be open.',
      table: {
        category: 'Root',
        type: { summary: "'single' | 'multiple'" },
        defaultValue: { summary: 'single' },
      },
    },
    value: {
      control: 'object',
      description:
        'Ordered list of open item values. Interacting with the story keeps this control in sync.',
      table: { category: 'Root', type: { summary: 'string[]' }, defaultValue: { summary: '[]' } },
    },
    defaultValue: {
      control: 'object',
      description:
        'Initial selection when value is empty at first registration; changing it later does not reset the instance.',
      table: { category: 'Root', type: { summary: 'string[]' }, defaultValue: { summary: '[]' } },
    },
    collapsible: {
      control: 'boolean',
      description: 'Allows the last open item to close in single mode; ignored in multiple mode.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Prevents activation of every item.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    keepMounted: {
      control: 'boolean',
      description: 'Ends a closed panel in the retained presence state after exit.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    hiddenUntilFound: {
      control: 'boolean',
      description: 'Retains closed content as hidden-until-found for browser search and reveal.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    onValueChange: {
      control: false,
      description: 'Property-only callback invoked after an accepted tp-value-change proposal.',
      table: {
        category: 'Root',
        type: { summary: '(event: TpValueChangeEvent<string[]>) => void' },
        defaultValue: { summary: 'undefined' },
      },
    },
    indicatorPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      description:
        'Logical edge of the Account item’s decorative indicator; independent of other items.',
      table: {
        category: 'Item · Account',
        type: { summary: "'leading' | 'trailing'" },
        defaultValue: { summary: 'trailing' },
      },
    },
    securityIndicatorPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      description: 'Logical edge of the Security item’s decorative indicator.',
      table: { category: 'Item · Security', type: { summary: "'leading' | 'trailing'" } },
    },
    billingIndicatorPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      description: 'Logical edge of the Billing item’s decorative indicator.',
      table: { category: 'Item · Billing', type: { summary: "'leading' | 'trailing'" } },
    },
    itemDisabled: {
      control: 'boolean',
      description: 'Prevents activation of the Security item only.',
      table: { category: 'Item · Security', type: { summary: 'boolean' } },
    },
    headingLevel: {
      control: { type: 'range', min: 1, max: 6, step: 1 },
      description: 'Semantic heading level of each Item; choose to fit the surrounding page.',
      table: { category: 'Item', type: { summary: '1–6' }, defaultValue: { summary: '2' } },
    },
  },
  render: (args: AccordionStoryArgs) => {
    const [, updateArgs] = useArgs<AccordionStoryArgs>();
    const handleValueChange = (event: TpValueChangeEvent<AccordionValue>): void => {
      updateArgs({ value: [...event.detail.value] });
      args.onValueChange?.(event);
    };
    return html`
      <style>
        .accordion-story {
          width: min(36rem, calc(100vw - 2rem));
        }

        .accordion-story h1 {
          margin: 0 0 1rem;
          font-size: 1.25rem;
        }

        .accordion-story tp-accordion {
          display: block;
          border: 1px solid var(--tp-color-border);
          border-radius: var(--tp-radius-md);
        }

        .accordion-story tp-accordion-item + tp-accordion-item {
          border-top: 1px solid var(--tp-color-border);
        }

        .accordion-story tp-accordion-item::part(accordion-content-body) {
          padding: 0 1rem 1rem;
        }
      </style>
      <main class="story accordion-story">
        <h1>Accordion</h1>
        <tp-accordion
          selection-mode=${args.selectionMode}
          .value=${args.value}
          .defaultValue=${args.defaultValue}
          ?collapsible=${args.collapsible}
          ?disabled=${args.disabled}
          ?keep-mounted=${args.keepMounted}
          ?hidden-until-found=${args.hiddenUntilFound}
          @tp-value-change=${handleValueChange}
        >
          <tp-accordion-item
            value="account"
            indicator-position=${args.indicatorPosition}
            heading-level=${args.headingLevel}
          >
            <span slot="label">Account settings</span>
            <p>Manage your profile and password.</p>
          </tp-accordion-item>
          <tp-accordion-item
            value="security"
            indicator-position=${args.securityIndicatorPosition}
            heading-level=${args.headingLevel}
            ?disabled=${args.itemDisabled}
          >
            <span slot="label">Security</span>
            <p>Configure sign-in and recovery options.</p>
          </tp-accordion-item>
          <tp-accordion-item
            value="billing"
            indicator-position=${args.billingIndicatorPosition}
            heading-level=${args.headingLevel}
          >
            <span slot="label">Billing</span>
            <tp-icon slot="indicator" .icon=${plusIcon}></tp-icon>
            <p>View invoices and payment methods.</p>
          </tp-accordion-item>
        </tp-accordion>
      </main>
    `;
  },
};

export default meta;
type Story = StoryObj<AccordionStoryArgs>;

export const Default: Story = {};

export const Multiple: Story = {
  args: { selectionMode: 'multiple', value: ['account', 'security'] },
  parameters: {
    docs: {
      description: {
        story:
          'Multiple mode permits independent open items and keeps value in registration order.',
      },
    },
  },
};

export const Collapsible: Story = {
  args: { collapsible: true },
  parameters: {
    docs: {
      description: { story: 'Single mode can allow all items to close when collapsible is true.' },
    },
  },
};

export const Disabled: Story = {
  args: { disabled: true },
  parameters: {
    docs: {
      description: {
        story: 'A disabled root prevents activation without changing the current open item.',
      },
    },
  },
};

export const DisabledItem: Story = {
  args: { itemDisabled: true },
  parameters: {
    docs: {
      description: {
        story: 'Only the Security item is disabled. Account settings and Billing remain available.',
      },
    },
  },
};

export const Retained: Story = {
  args: { collapsible: true, keepMounted: true },
  parameters: {
    docs: {
      description: {
        story: 'Closed content reaches the retained presence state after its exit transition.',
      },
    },
  },
};

export const FindInPage: Story = {
  args: { collapsible: true, hiddenUntilFound: true },
  parameters: {
    docs: {
      description: { story: 'Closed content remains discoverable through browser find-in-page.' },
    },
  },
};

export const MixedIndicatorPositions: Story = {
  args: { indicatorPosition: 'leading', billingIndicatorPosition: 'leading' },
  parameters: {
    docs: {
      description: {
        story:
          'Each Item chooses its own logical icon edge; the Billing item also replaces the default indicator.',
      },
    },
  },
};
