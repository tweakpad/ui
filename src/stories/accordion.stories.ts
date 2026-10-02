import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import accordionDocumentation from '../../docs/accordion.md?raw';
import type { AccordionValue, AccordionVariant } from '../components/accordion.js';
import type {
  AccordionContentAlignment,
  AccordionIndicatorPosition,
} from '../components/accordion-item.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type {
  MotionPlayback,
  MotionPolicy,
  MotionRequest,
  TpMotionRequestEvent,
} from '../foundation/motion.js';

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

interface AccordionFixtureOptions {
  accountContentAlignment: AccordionContentAlignment | 'inherit';
  accountIndicatorPosition: AccordionIndicatorPosition;
  securityIndicatorPosition: AccordionIndicatorPosition;
  billingIndicatorPosition: AccordionIndicatorPosition;
  itemDisabled: boolean;
  headingLevel: number;
  showLeadingContent: boolean;
  contentMotion: 'none' | 'line-by-line';
}

const defaultAccordionFixture: AccordionFixtureOptions = {
  accountContentAlignment: 'inherit',
  accountIndicatorPosition: 'trailing',
  securityIndicatorPosition: 'trailing',
  billingIndicatorPosition: 'trailing',
  itemDisabled: false,
  headingLevel: 2,
  showLeadingContent: false,
  contentMotion: 'none',
};

const meta: Meta<AccordionStoryArgs> = {
  title: 'Components/Accordion',
  component: 'tp-accordion',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: accordionDocumentation.replace(/^# Accordion\n/u, ''),
      },
    },
  },
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
      description:
        'Predefined visual recipe for the Accordion container and the relationship between Items.',
      table: {
        category: 'Root',
        type: { summary: "'plain' | 'line' | 'outline' | 'separated'" },
        defaultValue: { summary: 'plain' },
      },
    },
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
    contentAlignment: {
      control: 'radio',
      options: ['edge', 'label'],
      description:
        'Default logical inline-start alignment for every Item’s ContentBody; label follows arbitrary Leading content.',
      table: {
        category: 'Root',
        type: { summary: "'edge' | 'label'" },
        defaultValue: { summary: 'edge' },
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
  },
  render: (args) => renderAccordion(args),
};

function renderAccordion(args: AccordionStoryArgs, options: Partial<AccordionFixtureOptions> = {}) {
  const fixture = { ...defaultAccordionFixture, ...options };
  const [, updateArgs] = useArgs<AccordionStoryArgs>();
  const handleValueChange = (event: TpValueChangeEvent<AccordionValue>): void => {
    updateArgs({ value: [...event.detail.value] });
    args.onValueChange?.(event);
  };
  const handleMotionRequest = (event: TpMotionRequestEvent): void => {
    if (fixture.contentMotion !== 'line-by-line' || event.request.role !== 'content') return;
    event.respondWith({ play: playLineByLine });
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
      @tp-motion-request=${handleMotionRequest}
    >
      <tp-accordion-item
        value="account"
        indicator-position=${fixture.accountIndicatorPosition}
        .contentAlignment=${
          fixture.accountContentAlignment === 'inherit'
            ? undefined
            : fixture.accountContentAlignment
        }
        heading-level=${fixture.headingLevel}
      >
        ${
          fixture.showLeadingContent
            ? html`<span
                slot=${fixture.accountIndicatorPosition === 'leading' ? 'trailing' : 'leading'}
                >01</span
              >`
            : null
        }
        <span slot="label">Account settings</span>
        <p>Your public profile starts here.</p>
        <p>
          Choose how your name appears to your team, update the email used for account notices, and
          review the recovery options you would need if you lost access to your usual device.
        </p>
      </tp-accordion-item>
      <tp-accordion-item
        value="security"
        indicator-position=${fixture.securityIndicatorPosition}
        heading-level=${fixture.headingLevel}
        ?disabled=${fixture.itemDisabled}
      >
        ${
          fixture.showLeadingContent
            ? html`<span
                slot=${fixture.securityIndicatorPosition === 'leading' ? 'trailing' : 'leading'}
                >02</span
              >`
            : null
        }
        <span slot="label">Security</span>
        <p>Require a second step when signing in from a new device or location.</p>
        <p>Save your backup codes offline.</p>
      </tp-accordion-item>
      <tp-accordion-item
        value="billing"
        indicator-position=${fixture.billingIndicatorPosition}
        heading-level=${fixture.headingLevel}
      >
        ${
          fixture.showLeadingContent
            ? html`<span
                slot=${fixture.billingIndicatorPosition === 'leading' ? 'trailing' : 'leading'}
                >03</span
              >`
            : null
        }
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

export const Line: Story = {
  args: { variant: 'line' },
  parameters: {
    docs: {
      description: {
        story: 'Horizontal separators divide adjacent Items without adding outer container chrome.',
      },
    },
  },
};

export const Outline: Story = {
  args: { variant: 'outline' },
  parameters: {
    docs: {
      description: {
        story: 'One rounded outer border with token-governed separators between Items.',
      },
    },
  },
};

export const Separated: Story = {
  args: { variant: 'separated' },
  parameters: {
    docs: {
      description: {
        story: 'Independent bordered Item surfaces separated by the shared spacing scale.',
      },
    },
  },
};

export const PositionalContent: Story = {
  args: { variant: 'separated', contentAlignment: 'label' },
  render: (args) => renderAccordion(args, { showLeadingContent: true }),
  parameters: {
    docs: {
      description: {
        story:
          'Adds numbered content through the generic positional slots while the built-in indicator remains in the opposite position.',
      },
    },
  },
};

export const LabelAlignedContent: Story = {
  args: { contentAlignment: 'label' },
  render: (args) => renderAccordion(args, { showLeadingContent: true }),
  parameters: {
    docs: {
      description: {
        story:
          'Aligns each ContentBody to its Label’s logical inline start without assuming what occupies Leading.',
      },
    },
  },
};

export const ExternalLineByLineMotion: Story = {
  render: (args) => renderAccordion(args, { contentMotion: 'line-by-line' }),
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
  args: { motionPolicy: 'reduce', collapsible: true },
  render: (args) => renderAccordion(args, { contentMotion: 'line-by-line' }),
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
  const easing = getComputedStyle(request.owner).getPropertyValue('--tp-easing-standard').trim();
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
        easing,
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
  render: (args) => renderAccordion(args, { itemDisabled: true }),
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
  render: (args) =>
    renderAccordion(args, {
      accountIndicatorPosition: 'leading',
      billingIndicatorPosition: 'leading',
    }),
  parameters: {
    docs: {
      description: {
        story: 'Each Item configures which logical position receives its built-in indicator.',
      },
    },
  },
};
