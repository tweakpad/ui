import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import collapsibleDocumentation from '../../docs/collapsible.md?raw';
import type {
  CollapsibleContentAlignment,
  CollapsibleIndicatorPosition,
} from '../components/collapsible.js';
import type { TpOpenChangeEvent } from '../foundation/events.js';
import type {
  MotionPlayback,
  MotionPolicy,
  MotionRequest,
  TpMotionRequestEvent,
} from '../foundation/motion.js';
import { plusIcon } from '../icons/plus.js';

interface CollapsibleStoryArgs {
  open: boolean;
  defaultOpen: boolean;
  disabled: boolean;
  keepMounted: boolean;
  hiddenUntilFound: boolean;
  motionPolicy: MotionPolicy;
  contentAlignment: CollapsibleContentAlignment;
  indicatorPosition: CollapsibleIndicatorPosition;
  headingLevel: number;
  onOpenChange?: (event: TpOpenChangeEvent) => void;
}

interface CollapsibleFixtureOptions {
  showLeadingContent: boolean;
  showTrailingContent: boolean;
  contentMotion: 'none' | 'line-by-line';
}

const defaultCollapsibleFixture: CollapsibleFixtureOptions = {
  showLeadingContent: false,
  showTrailingContent: false,
  contentMotion: 'none',
};

const meta: Meta<CollapsibleStoryArgs> = {
  title: 'Components/Collapsible',
  component: 'tp-collapsible',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: collapsibleDocumentation.replace(/^# Collapsible\n/u, ''),
      },
    },
  },
  args: {
    open: false,
    defaultOpen: false,
    disabled: false,
    keepMounted: false,
    hiddenUntilFound: false,
    motionPolicy: 'inherit',
    contentAlignment: 'edge',
    indicatorPosition: 'trailing',
    headingLevel: 0,
  },
  argTypes: {
    open: {
      control: 'boolean',
      description: 'Current disclosure state; accepted Trigger interactions update it.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    defaultOpen: {
      control: 'boolean',
      description: 'Initial state when the open attribute is absent.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Prevents Trigger activation without changing the current open state.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    keepMounted: {
      control: 'boolean',
      description: 'Ends closed Content in the retained presence state.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    hiddenUntilFound: {
      control: 'boolean',
      description: 'Retains closed Content as hidden-until-found for browser search and reveal.',
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    motionPolicy: {
      control: 'radio',
      options: ['inherit', 'normal', 'reduce'],
      description: 'Resolves motion policy for this Collapsible subtree.',
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
        'Aligns ContentBody’s logical inline start to the component edge or the Label position.',
      table: {
        category: 'Root',
        type: { summary: "'edge' | 'label'" },
        defaultValue: { summary: 'edge' },
      },
    },
    indicatorPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      description:
        'Logical position whose empty slot renders this Collapsible’s default disclosure indicator.',
      table: {
        category: 'Root',
        type: { summary: "'leading' | 'trailing'" },
        defaultValue: { summary: 'trailing' },
      },
    },
    headingLevel: {
      control: { type: 'range', min: 0, max: 6, step: 1 },
      description: 'Optional semantic Trigger heading level; 0 omits heading semantics.',
      table: {
        category: 'Root',
        type: { summary: '0–6' },
        defaultValue: { summary: '0' },
      },
    },
    onOpenChange: {
      control: false,
      description: 'Property-only callback invoked after an accepted tp-open-change proposal.',
      table: {
        category: 'Root',
        type: { summary: '(event: TpOpenChangeEvent) => void' },
        defaultValue: { summary: 'undefined' },
      },
    },
  },
  render: (args) => renderCollapsible(args),
};

function renderCollapsible(
  args: CollapsibleStoryArgs,
  options: Partial<CollapsibleFixtureOptions> = {},
) {
  const fixture = { ...defaultCollapsibleFixture, ...options };
  const [, updateArgs] = useArgs<CollapsibleStoryArgs>();
  const handleOpenChange = (event: TpOpenChangeEvent): void => {
    updateArgs({ open: event.detail.value });
  };
  const handleMotionRequest = (event: TpMotionRequestEvent): void => {
    if (fixture.contentMotion !== 'line-by-line' || event.request.role !== 'content') return;
    event.respondWith({ play: playLineByLine });
  };
  return html`
    <tp-collapsible
      .open=${args.open}
      .defaultOpen=${args.defaultOpen}
      ?disabled=${args.disabled}
      ?keep-mounted=${args.keepMounted}
      ?hidden-until-found=${args.hiddenUntilFound}
      .motionPolicy=${args.motionPolicy}
      .contentAlignment=${args.contentAlignment}
      .indicatorPosition=${args.indicatorPosition}
      .headingLevel=${args.headingLevel}
      .onOpenChange=${args.onOpenChange}
      @tp-open-change=${handleOpenChange}
      @tp-motion-request=${handleMotionRequest}
    >
      ${
          fixture.showLeadingContent
            ? html`<tp-badge slot="leading" variant="accent">New</tp-badge>`
            : null
        }
      <span slot="label">Project details</span>
      ${
          fixture.showTrailingContent
            ? html`<tp-icon slot="trailing" .icon=${plusIcon}></tp-icon>`
            : null
        }
      <p>Created today and shared with three collaborators.</p>
      <p>
        Review ownership, access rules, and the longer description associated with this project
        without navigating away from the current view.
      </p>
    </tp-collapsible>
  `;
}

export default meta;
type Story = StoryObj<CollapsibleStoryArgs>;

export const Default: Story = {};

export const Open: Story = {
  args: { open: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Retained: Story = {
  args: { open: false, keepMounted: true },
};

export const FindInPage: Story = {
  args: { open: false, hiddenUntilFound: true },
};

export const LeadingIndicator: Story = {
  args: { indicatorPosition: 'leading' },
};

export const LeadingContent: Story = {
  render: (args) => renderCollapsible(args, { showLeadingContent: true }),
};

export const LabelAlignedContent: Story = {
  args: { open: true, contentAlignment: 'label' },
  render: (args) => renderCollapsible(args, { showLeadingContent: true }),
};

export const TrailingContent: Story = {
  render: (args) => renderCollapsible(args, { showTrailingContent: true }),
};

export const ExternalLineByLineMotion: Story = {
  args: { open: true },
  render: (args) => renderCollapsible(args, { contentMotion: 'line-by-line' }),
};

function playLineByLine(request: MotionRequest): MotionPlayback {
  const lines = [...request.owner.querySelectorAll<HTMLElement>('p')];
  const ordered = request.phase === 'exit' ? [...lines].reverse() : lines;
  const easing = getComputedStyle(request.owner).getPropertyValue('--tp-easing-standard').trim();
  const animations = ordered.map((line, index) =>
    line.animate(
      request.phase === 'exit'
        ? [
            { opacity: 1, transform: 'translateY(0)' },
            { opacity: 0, transform: 'translateY(-6px)' },
          ]
        : [
            { opacity: 0, transform: 'translateY(8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
      { duration: 380, delay: index * 100, easing, fill: 'both' },
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
