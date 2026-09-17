import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import accordionDocumentation from '../../docs/accordion.md?raw';
import type { AccordionValue } from '../components/accordion.js';
import type { AccordionIndicatorPosition } from '../components/accordion-item.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type {
  MotionPlayback,
  MotionPolicy,
  MotionRequest,
  TpMotionRequestEvent,
} from '../foundation/motion.js';
import { plusIcon } from '../icons/plus.js';

interface AccordionStoryArgs {
  selectionMode: 'single' | 'multiple';
  value: AccordionValue;
  defaultValue: AccordionValue;
  collapsible: boolean;
  disabled: boolean;
  keepMounted: boolean;
  hiddenUntilFound: boolean;
  motionPolicy: MotionPolicy;
  indicatorPosition: AccordionIndicatorPosition;
  securityIndicatorPosition: AccordionIndicatorPosition;
  billingIndicatorPosition: AccordionIndicatorPosition;
  itemDisabled: boolean;
  headingLevel: number;
  contentMotion: 'none' | 'line-by-line';
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
    motionPolicy: 'inherit',
    indicatorPosition: 'trailing',
    securityIndicatorPosition: 'trailing',
    billingIndicatorPosition: 'trailing',
    itemDisabled: false,
    headingLevel: 2,
    contentMotion: 'none',
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
    motionPolicy: {
      control: 'radio',
      options: ['inherit', 'normal', 'reduce'],
      description:
        'Resolves motion for this Accordion subtree; inherit defers to the nearest policy boundary or environment preference.',
      table: {
        category: 'Root',
        type: { summary: "'inherit' | 'normal' | 'reduce'" },
        defaultValue: { summary: 'inherit' },
      },
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
    contentMotion: {
      control: 'radio',
      options: ['none', 'line-by-line'],
      description:
        'Story-only driver selection. line-by-line claims each Item content role; none leaves the role unclaimed.',
      table: {
        category: 'Demo',
        type: { summary: "'none' | 'line-by-line'" },
        defaultValue: { summary: 'none' },
      },
    },
  },
  render: (args: AccordionStoryArgs) => {
    const [, updateArgs] = useArgs<AccordionStoryArgs>();
    const handleValueChange = (event: TpValueChangeEvent<AccordionValue>): void => {
      updateArgs({ value: [...event.detail.value] });
      args.onValueChange?.(event);
    };
    const handleMotionRequest = (event: TpMotionRequestEvent): void => {
      if (args.contentMotion !== 'line-by-line' || event.request.role !== 'content') return;
      event.respondWith({ play: playLineByLine });
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
          .motionPolicy=${args.motionPolicy}
          @tp-value-change=${handleValueChange}
          @tp-motion-request=${handleMotionRequest}
        >
          <tp-accordion-item
            value="account"
            indicator-position=${args.indicatorPosition}
            heading-level=${args.headingLevel}
          >
            <span slot="label">Account settings</span>
            <p>Your public profile starts here.</p>
            <p>
              Choose how your name appears to your team, update the email used for account notices,
              and review the recovery options you would need if you lost access to your usual
              device.
            </p>
          </tp-accordion-item>
          <tp-accordion-item
            value="security"
            indicator-position=${args.securityIndicatorPosition}
            heading-level=${args.headingLevel}
            ?disabled=${args.itemDisabled}
          >
            <span slot="label">Security</span>
            <p>Require a second step when signing in from a new device or location.</p>
            <p>Save your backup codes offline.</p>
          </tp-accordion-item>
          <tp-accordion-item
            value="billing"
            indicator-position=${args.billingIndicatorPosition}
            heading-level=${args.headingLevel}
          >
            <span slot="label">Billing</span>
            <tp-icon slot="indicator" .icon=${plusIcon}></tp-icon>
            <p>
              Review every invoice from the current subscription, download receipts for your
              records, and compare charges across billing periods before making a change.
            </p>
            <p>Update the payment method used for future charges.</p>
            <p>Changes apply to your next invoice.</p>
          </tp-accordion-item>
        </tp-accordion>
      </main>
    `;
  },
};

export default meta;
type Story = StoryObj<AccordionStoryArgs>;

export const Default: Story = {};

export const ExternalLineByLineMotion: Story = {
  args: { contentMotion: 'line-by-line' },
  parameters: {
    docs: {
      description: {
        story:
          'Claims only the per-Item content role and staggers the Item paragraphs. Accordion still owns disclosure measurement, presence, and selection.',
      },
    },
  },
};

export const ReducedMotion: Story = {
  args: { motionPolicy: 'reduce', contentMotion: 'line-by-line', collapsible: true },
  parameters: {
    docs: {
      description: {
        story:
          'Keeps the same semantic and presence lifecycle while completing finite motion at the next checkpoint and skipping the external line-by-line driver.',
      },
    },
  },
};

function playLineByLine(request: MotionRequest): MotionPlayback {
  const lines = [...request.owner.querySelectorAll<HTMLElement>('p')];
  const exiting = request.phase === 'exit';
  const ordered = exiting ? [...lines].reverse() : lines;
  const animations = ordered.map((line, index) =>
    line.animate(
      exiting
        ? [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-6px)' },
          ]
        : [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
      {
        duration: 380,
        delay: index * 100,
        easing: 'cubic-bezier(0.2, 0, 0, 1)',
        fill: 'both',
      },
    ),
  );
  const finished = Promise.all(animations.map((animation) => animation.finished)).then(() => {
    animations.forEach((animation) => animation.cancel());
  });
  return {
    finished,
    cancel: () => animations.forEach((animation) => animation.cancel()),
  };
}

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
