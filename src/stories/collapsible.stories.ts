import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { useArgs } from 'storybook/preview-api';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type {
  CollapsibleContentAlignment,
  CollapsibleIndicatorPosition,
} from '../components/collapsible/collapsible.js';
import type { TpOpenChangeEvent } from '../foundation/events.js';
import type { MotionPolicy } from '../foundation/motion.js';

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

const meta: Meta<CollapsibleStoryArgs> = {
  title: 'Components/Collapsible',
  component: 'tp-collapsible',
  parameters: { docs: libraryDocs('components/collapsible') },
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
      table: { category: 'Root', type: { summary: 'boolean' }, defaultValue: { summary: 'false' } },
    },
    defaultOpen: {
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
    indicatorPosition: {
      control: 'radio',
      options: ['leading', 'trailing'],
      table: {
        category: 'Root',
        type: { summary: "'leading' | 'trailing'" },
        defaultValue: { summary: 'trailing' },
      },
    },
    headingLevel: {
      control: { type: 'range', min: 0, max: 6, step: 1 },
      table: {
        category: 'Root',
        type: { summary: '0–6' },
        defaultValue: { summary: '0' },
      },
    },
    onOpenChange: {
      control: false,
      table: {
        category: 'Root',
        type: { summary: '(event: TpOpenChangeEvent) => void' },
        defaultValue: { summary: 'undefined' },
      },
    },
  },
  render: (args) => renderCollapsible(args),
};

function renderCollapsible(args: CollapsibleStoryArgs) {
  const [, updateArgs] = useArgs<CollapsibleStoryArgs>();
  const handleOpenChange = (event: TpOpenChangeEvent): void => {
    updateArgs({ open: event.detail.value });
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
    >
      <span slot="label">Project details</span>
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
