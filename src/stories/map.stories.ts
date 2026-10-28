import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { libraryDocs } from './library-docs.js';
import { openFreeMapEngine } from './map-example.js';
import {
  googleMapsExample,
  mapMarkup,
  renderMapExample,
  tokenThemeExample,
} from './map.examples.js';

interface Args {
  controls: string;
  controlsPosition: 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end';
  controlsOrientation: 'vertical' | 'horizontal';
  reveal: 'none' | 'if-hidden' | 'always';
  revealZoom: number;
  fitPadding: number;
  minZoom: number;
  maxZoom: number;
  interactive: boolean;
  cooperativeGestures: boolean;
  disabled: boolean;
}

const meta = {
  title: 'Components/Map',
  component: 'tp-map',
  parameters: { docs: libraryDocs('components/map') },
  args: {
    controls: 'zoom-in zoom-out reset fit-pins',
    controlsPosition: 'top-end',
    controlsOrientation: 'vertical',
    reveal: 'always',
    revealZoom: 15,
    fitPadding: 48,
    minZoom: 0,
    maxZoom: 20,
    interactive: true,
    cooperativeGestures: true,
    disabled: false,
  },
  argTypes: {
    controls: {
      control: 'text',
      table: { defaultValue: { summary: "''" } },
    },
    controlsPosition: {
      control: 'select',
      options: ['top-start', 'top-end', 'bottom-start', 'bottom-end'],
      table: { defaultValue: { summary: 'top-end' } },
    },
    controlsOrientation: {
      control: 'inline-radio',
      options: ['vertical', 'horizontal'],
      table: { defaultValue: { summary: 'vertical' } },
    },
    reveal: {
      control: 'select',
      options: ['none', 'if-hidden', 'always'],
      table: { defaultValue: { summary: 'if-hidden' } },
    },
    revealZoom: {
      control: { type: 'number', min: 0, max: 20, step: 0.5 },
      table: { defaultValue: { summary: 'null' } },
    },
    fitPadding: {
      control: { type: 'number', min: 0, max: 160, step: 4 },
      table: { defaultValue: { summary: '48' } },
    },
    minZoom: {
      control: { type: 'number', min: 0, max: 20, step: 1 },
      table: { defaultValue: { summary: '0' } },
    },
    maxZoom: {
      control: { type: 'number', min: 0, max: 22, step: 1 },
      table: { defaultValue: { summary: '20' } },
    },
    interactive: {
      control: 'boolean',
      table: { defaultValue: { summary: 'true' } },
    },
    cooperativeGestures: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) =>
    renderMapExample(
      mapMarkup({
        id: 'lisbon-map',
        controls: args.controls,
        controlsPosition: args.controlsPosition,
        controlsOrientation: args.controlsOrientation,
        reveal: args.reveal,
        revealZoom: args.revealZoom,
        fitPadding: args.fitPadding,
        minZoom: args.minZoom,
        maxZoom: args.maxZoom,
        interactive: args.interactive,
        cooperativeGestures: args.cooperativeGestures,
        disabled: args.disabled,
      }),
      () => openFreeMapEngine(),
    ),
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

// Engine and theme verification fixtures, outside the documentation page.
const fixture = (example: { render: () => unknown }): Story => ({
  render: () => html`${example.render()}`,
  parameters: { controls: { disable: true } },
});

const googleKey = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.STORYBOOK_GOOGLE_MAPS_API_KEY;

export const GoogleMaps: Story = {
  name: 'Google Maps engine',
  tags: ['!autodocs'],
  ...fixture(googleMapsExample(googleKey)),
};

export const TokenTheme: Story = {
  name: 'Token theme',
  tags: ['!autodocs'],
  ...fixture(tokenThemeExample),
};
