import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import cardDocumentation from '../../docs/card.md?raw';
import './card.stories.css';

interface CardStoryArgs {
  elevated: boolean;
  borders: 'on' | 'off';
  sectionColors: 'on' | 'off';
  size: 'sm' | 'default';
}

const meta: Meta<CardStoryArgs> = {
  title: 'Components/Card',
  component: 'tp-card',
  parameters: {
    layout: 'centered',
    docs: { description: { component: cardDocumentation.replace(/^# Card\n/u, '') } },
  },
  args: {
    elevated: false,
    borders: 'on',
    sectionColors: 'on',
    size: 'default',
  },
  argTypes: {
    elevated: {
      control: 'boolean',
      description: 'Applies shared surface elevation independently of borders and section colors.',
      table: { category: 'Presentation', defaultValue: { summary: 'false' } },
    },
    borders: {
      control: 'radio',
      options: ['on', 'off'],
      description: 'Shows or removes the outer outline and header/footer dividers together.',
      table: { category: 'Presentation', defaultValue: { summary: 'on' } },
    },
    sectionColors: {
      control: 'radio',
      options: ['on', 'off'],
      description:
        'Uses distinct solid fills for header, content, and footer, or one uniform fill.',
      table: { category: 'Presentation', defaultValue: { summary: 'on' } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'default'],
      description: 'Controls section padding without changing the content or actions.',
      table: { category: 'Presentation', defaultValue: { summary: 'default' } },
    },
  },
  render: (args) => html`
    <tp-card
      class="card-story"
      ?elevated=${args.elevated}
      borders=${args.borders}
      section-colors=${args.sectionColors}
      size=${args.size}
    >
      <h2 slot="header">Project access</h2>
      <p slot="description">Review how your team will use this workspace.</p>
      <p>
        Invited teammates can view shared plans, project files, and recent activity across the
        workspace.
      </p>
      <p>
        Choose who can make changes before sending an invitation. You can update permissions later
        as your team grows.
      </p>
      <tp-button slot="footer" variant="outline" size="sm">Not now</tp-button>
      <tp-button slot="footer" size="sm">Continue</tp-button>
    </tp-card>
  `,
};

export default meta;
type Story = StoryObj<CardStoryArgs>;

export const Default: Story = {};

export const ContentOnly: Story = {
  render: () => html`
    <tp-card class="card-story">
      <p>Your project summary is ready to share.</p>
    </tp-card>
  `,
};
