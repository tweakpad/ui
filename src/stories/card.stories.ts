import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
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
    docs: libraryDocs('components/card'),
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
      table: { category: 'Presentation', defaultValue: { summary: 'false' } },
    },
    borders: {
      control: 'radio',
      options: ['on', 'off'],
      table: { category: 'Presentation', defaultValue: { summary: 'on' } },
    },
    sectionColors: {
      control: 'radio',
      options: ['on', 'off'],
      table: { category: 'Presentation', defaultValue: { summary: 'on' } },
    },
    size: {
      control: 'radio',
      options: ['sm', 'default'],
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
