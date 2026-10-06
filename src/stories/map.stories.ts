import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import documentation from '../../docs/map.md?raw';
import { openFreeMapEngine } from './map-example.js';
import {
  googleMapsExample,
  mapDemoSource,
  mapMarkup,
  renderMapExample,
  tokenThemeExample,
} from './map.examples.js';

interface Args {
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
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: { component: documentation },
      source: { code: mapDemoSource() },
    },
  },
  args: {
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
    reveal: {
      control: 'select',
      options: ['none', 'if-hidden', 'always'],
      description:
        'After a selection not made on the pin itself: never move, move only when the pin is outside the padded viewport, or always center it.',
      table: { defaultValue: { summary: 'if-hidden' } },
    },
    revealZoom: {
      control: { type: 'number', min: 0, max: 20, step: 0.5 },
      description: '`reveal-zoom`: zoom used when revealing; unset keeps the current zoom.',
      table: { defaultValue: { summary: 'null' } },
    },
    fitPadding: {
      control: { type: 'number', min: 0, max: 160, step: 4 },
      description:
        '`fit-padding`: CSS pixels around fitted regions and the reveal visibility test.',
      table: { defaultValue: { summary: '48' } },
    },
    minZoom: {
      control: { type: 'number', min: 0, max: 20, step: 1 },
      description: '`min-zoom` on the 256-pixel zoom scale.',
      table: { defaultValue: { summary: '0' } },
    },
    maxZoom: {
      control: { type: 'number', min: 0, max: 22, step: 1 },
      description: '`max-zoom` on the 256-pixel zoom scale.',
      table: { defaultValue: { summary: '20' } },
    },
    interactive: {
      control: 'boolean',
      description:
        'Engine gestures and keyboard. `interactive="false"` keeps pins, overlays and controls working.',
      table: { defaultValue: { summary: 'true' } },
    },
    cooperativeGestures: {
      control: 'boolean',
      description:
        '`cooperative-gestures`: wheel zoom needs a modifier and touch pans with two fingers, so the page keeps scrolling.',
      table: { defaultValue: { summary: 'false' } },
    },
    disabled: {
      control: 'boolean',
      description: 'Pins and controls become `aria-disabled`; the engine stops reacting to input.',
      table: { defaultValue: { summary: 'false' } },
    },
  },
  render: (args) =>
    renderMapExample(
      mapMarkup({
        id: 'lisbon-map',
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

/** OpenFreeMap through MapLibre: custom SVG pins, overlays, external controls and a list. */
export const Default: Story = {};

const exampleStory = (example: {
  render: () => unknown;
  code: string;
  description?: string | undefined;
}): Story => ({
  render: () => html`${example.render()}`,
  parameters: {
    controls: { disable: true },
    docs: {
      description: { story: example.description ?? '' },
      source: { code: example.code },
    },
  },
});

const googleKey = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  ?.STORYBOOK_GOOGLE_MAPS_API_KEY;

export const GoogleMaps: Story = {
  name: 'Google Maps engine',
  ...exampleStory(googleMapsExample(googleKey)),
};

export const TokenTheme: Story = { name: 'Token theme', ...exampleStory(tokenThemeExample) };
