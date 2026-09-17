import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import collapsibleDocumentation from '../../docs/collapsible.md?raw';
import type { CollapsibleIndicatorPosition } from '../components/collapsible.js';
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
  indicatorPosition: CollapsibleIndicatorPosition;
  headingLevel: number;
  customIndicator: boolean;
  contentMotion: 'none' | 'line-by-line';
  onOpenChange?: (event: TpOpenChangeEvent) => void;
}

const meta: Meta<CollapsibleStoryArgs> = {
  title: 'Components/Collapsible',
  component: 'tp-collapsible',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component: collapsibleDocumentation.replace(/^# Collapsible\n/u, ''),
      },
    },
  },
  args: {
    open: true,
    defaultOpen: false,
    disabled: false,
    keepMounted: false,
    hiddenUntilFound: false,
    motionPolicy: 'inherit',
    indicatorPosition: 'trailing',
    headingLevel: 0,
    customIndicator: false,
    contentMotion: 'none',
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
    indicatorPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      description: 'Logical inline edge of this Collapsible’s Indicator.',
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
    customIndicator: {
      control: 'boolean',
      description: 'Demo control that replaces the default chevron through the indicator slot.',
      table: { category: 'Demo', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    contentMotion: {
      control: 'radio',
      options: ['none', 'line-by-line'],
      description: 'Demo driver that claims only the content motion role.',
      table: {
        category: 'Demo',
        type: { summary: "'none' | 'line-by-line'" },
        defaultValue: { summary: 'none' },
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
  render: (args: CollapsibleStoryArgs) => {
    const [, updateArgs] = useArgs<CollapsibleStoryArgs>();
    const handleOpenChange = (event: TpOpenChangeEvent): void => {
      updateArgs({ open: event.detail.value });
    };
    const handleMotionRequest = (event: TpMotionRequestEvent): void => {
      if (args.contentMotion !== 'line-by-line' || event.request.role !== 'content') return;
      event.respondWith({ play: playLineByLine });
    };
    return html`
      <style>
        .collapsible-story {
          width: min(34rem, calc(100vw - 2rem));
        }

        .collapsible-story h1 {
          margin: 0 0 var(--tp-space-4);
          font-size: var(--tp-text-xl);
        }

        .collapsible-story tp-collapsible::part(collapsible) {
          overflow: clip;
          border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
          border-radius: var(--tp-radius-lg);
          background: var(--tp-background);
        }

        .collapsible-story tp-collapsible::part(collapsible-trigger) {
          width: 100%;
          padding: var(--tp-space-3) var(--tp-space-4);
          border: 0;
          color: inherit;
          background: transparent;
          font: inherit;
          font-weight: var(--tp-font-medium);
          text-align: start;
          cursor: pointer;
        }

        .collapsible-story tp-collapsible::part(collapsible-content-body) {
          padding: 0 var(--tp-space-4) var(--tp-space-4);
        }

        .collapsible-story p {
          margin-block: var(--tp-space-2) 0;
        }
      </style>
      <main class="story collapsible-story">
        <h1>Collapsible</h1>
        <tp-collapsible
          .open=${args.open}
          .defaultOpen=${args.defaultOpen}
          ?disabled=${args.disabled}
          ?keep-mounted=${args.keepMounted}
          ?hidden-until-found=${args.hiddenUntilFound}
          .motionPolicy=${args.motionPolicy}
          .indicatorPosition=${args.indicatorPosition}
          .headingLevel=${args.headingLevel}
          .onOpenChange=${args.onOpenChange}
          @tp-open-change=${handleOpenChange}
          @tp-motion-request=${handleMotionRequest}
        >
          <span slot="trigger">Project details</span>
          ${
            args.customIndicator
              ? html`<tp-icon slot="indicator" .icon=${plusIcon}></tp-icon>`
              : null
          }
          <p>Created today and shared with three collaborators.</p>
          <p>
            Review ownership, access rules, and the longer description associated with this project
            without navigating away from the current view.
          </p>
        </tp-collapsible>
      </main>
    `;
  },
};

export default meta;
type Story = StoryObj<CollapsibleStoryArgs>;

export const Default: Story = {};

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

export const CustomIndicator: Story = {
  args: { customIndicator: true },
};

export const ExternalLineByLineMotion: Story = {
  args: { contentMotion: 'line-by-line' },
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
