import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import type { CursorScope } from '../components/cursor/index.js';
import type { MotionPolicy } from '../foundation/motion.js';

interface Args {
  stiffness: number;
  damping: number;
  mass: number;
  restSpeed: number;
  restDelta: number;
  scope: CursorScope;
  hideNative: boolean;
  disabled: boolean;
  motionPolicy: MotionPolicy;
}

const meta = {
  title: 'Components/Cursor',
  component: 'tp-cursor',
  parameters: { docs: libraryDocs('components/cursor') },
  args: {
    stiffness: 170,
    damping: 26,
    mass: 1,
    restSpeed: 1,
    restDelta: 0.1,
    scope: 'region',
    hideNative: true,
    disabled: false,
    motionPolicy: 'inherit',
  },
  argTypes: {
    stiffness: {
      control: { type: 'range', min: 1, max: 1000, step: 1 },
      table: { defaultValue: { summary: '170' } },
    },
    damping: {
      control: { type: 'range', min: 0, max: 100, step: 0.5 },
      table: { defaultValue: { summary: '26' } },
    },
    mass: {
      control: { type: 'range', min: 0.1, max: 10, step: 0.1 },
      table: { defaultValue: { summary: '1' } },
    },
    restSpeed: {
      control: { type: 'number', min: 0, step: 0.5 },
      table: { defaultValue: { summary: '1' } },
    },
    restDelta: {
      control: { type: 'number', min: 0, step: 0.05 },
      table: { defaultValue: { summary: '0.1' } },
    },
    scope: {
      control: 'inline-radio',
      options: ['document', 'region'],
      table: { defaultValue: { summary: 'document' } },
    },
    hideNative: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    disabled: { control: 'boolean', table: { defaultValue: { summary: 'false' } } },
    motionPolicy: {
      control: 'inline-radio',
      options: ['inherit', 'normal', 'reduce'],
      table: { defaultValue: { summary: 'inherit' } },
    },
  },
  render: (args) =>
    html`<tp-cursor
        stiffness=${args.stiffness}
        damping=${args.damping}
        mass=${args.mass}
        rest-speed=${args.restSpeed}
        rest-delta=${args.restDelta}
        scope=${args.scope}
        .hideNative=${args.hideNative}
        ?disabled=${args.disabled}
        motion-policy=${args.motionPolicy}
      ></tp-cursor>
      <div style="display:grid;gap:var(--tp-space-4);justify-items:start;min-block-size:16rem">
        <tp-cursor-zone state="view">
          <template><tp-badge>View</tp-badge></template>
          <tp-card>
            <h3 slot="header">Hover the card</h3>
            <p slot="description">The cursor adopts the zone state and shows its content.</p>
          </tp-card>
        </tp-cursor-zone>
        <tp-cursor-zone stick="bounds">
          <tp-button variant="outline">Morph to the button</tp-button>
        </tp-cursor-zone>
        <tp-cursor-zone native>
          <tp-field label="Notes" description="The native pointer returns here.">
            <tp-text-area rows="2"></tp-text-area>
          </tp-field>
        </tp-cursor-zone>
      </div>`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
