import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import type {
  ImageEditorCrop,
  ImageEditorFit,
  ImageEditorRegionDrag,
  ImageEditorRegionMode,
  ImageEditorWheel,
} from '../../widgets/image-editor/types.js';
import { libraryDocs } from '../library-docs.js';
import { sampleHarbor, samplePortrait, sampleSticker } from '../images.js';

interface Args {
  fit: ImageEditorFit;
  wheel: ImageEditorWheel;
  crop: ImageEditorCrop;
  aspectRatio: string;
  regionMode: ImageEditorRegionMode;
  regionDrag: ImageEditorRegionDrag;
  controls: string;
  guides: boolean;
  cooperativeGestures: boolean;
  pinchRotate: boolean;
  disabled: boolean;
}

const meta: Meta<Args> = {
  title: 'Widgets/Image editor',
  component: 'tp-image-editor',
  parameters: { docs: libraryDocs('widgets/image-editor') },
  args: {
    fit: 'contain',
    wheel: 'zoom',
    crop: 'none',
    aspectRatio: '',
    regionMode: 'fixed',
    regionDrag: 'move',
    controls: 'zoom fit actual',
    guides: false,
    cooperativeGestures: false,
    pinchRotate: false,
    disabled: false,
  },
  argTypes: {
    fit: { control: 'select', options: ['contain', 'cover', 'none'] },
    wheel: { control: 'select', options: ['zoom', 'pan', 'none'] },
    crop: { control: 'select', options: ['none', 'rect', 'circle'] },
    aspectRatio: { control: 'text' },
    regionMode: { control: 'select', options: ['fixed', 'adjustable'] },
    regionDrag: { control: 'select', options: ['move', 'pan'] },
    controls: { control: 'text' },
    guides: { control: 'boolean' },
    cooperativeGestures: { control: 'boolean' },
    pinchRotate: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-image-editor
      label="Harbor at dusk"
      src=${sampleHarbor}
      alt="A harbor town at dusk with a lighthouse and sailing boats"
      fit=${args.fit}
      wheel=${args.wheel}
      crop=${args.crop}
      aspect-ratio=${args.aspectRatio}
      region-mode=${args.regionMode}
      region-drag=${args.regionDrag}
      controls=${args.controls}
      ?guides=${args.guides}
      ?cooperative-gestures=${args.cooperativeGestures}
      ?pinch-rotate=${args.pinchRotate}
      ?disabled=${args.disabled}
    ></tp-image-editor>`,
};

export default meta;
type Story = StoryObj<Args>;

export const Default: Story = {};

export const Avatar: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-image-editor
      label="Profile photo"
      src=${samplePortrait}
      alt="Portrait"
      crop="circle"
      fit="cover"
      controls="zoom"
      style="block-size: calc(var(--tp-spacing) * 90); max-inline-size: calc(var(--tp-spacing) * 100)"
    ></tp-image-editor>`,
};

export const AdjustableRegion: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-image-editor
      label="Cover image"
      src=${sampleHarbor}
      alt="A harbor town at dusk with a lighthouse and sailing boats"
      crop="rect"
      aspect-ratio="16/9"
      fit="cover"
      region-mode="adjustable"
      guides
    ></tp-image-editor>`,
};

export const Rotation: Story = {
  tags: ['!autodocs'],
  render: () =>
    html`<tp-image-editor
      label="Sticker"
      src=${sampleSticker}
      alt="A purple release day sticker"
      crop="rect"
      fit="contain"
      region-mode="adjustable"
      controls="rotate rotation reset"
      pinch-rotate
    ></tp-image-editor>`,
};
