import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import type { TpPreviewCard } from '../components/preview-card/index.js';
import { sourceImports, configuredSource } from './menu-family-controls.js';
import documentation from '../../docs/preview-card.md?raw';
interface Args {
  open: boolean;
  disabled: boolean;
  placement: string;
  openDelay: number;
  closeDelay: number;
  showArrow: boolean;
  portal: boolean;
  keepMounted: boolean;
  disableHoverablePopup: boolean;
}
const source = `${sourceImports}
<tp-preview-card label="Alex Morgan profile">
  <tp-button slot="trigger" href="#alex-morgan" variant="link">@alexmorgan</tp-button>
  <tp-avatar fallback="AM" alt="Alex Morgan"></tp-avatar>
  <strong>Alex Morgan</strong>
  <span>Design engineer building accessible interfaces.</span>
  <tp-badge variant="secondary">Available for collaboration</tp-badge>
</tp-preview-card>`;
const meta = {
  title: 'Components/Preview card',
  component: 'tp-preview-card',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: { component: documentation },
      source: {
        code: source,
        transform: (_code: string, context: { args: Args }) =>
          configuredSource(source, context.args, 'open'),
      },
    },
  },
  args: {
    open: false,
    disabled: false,
    placement: 'block-end center',
    openDelay: 600,
    closeDelay: 300,
    showArrow: false,
    portal: true,
    keepMounted: false,
    disableHoverablePopup: false,
  },
  argTypes: {
    open: { control: 'boolean' },
    disabled: { control: 'boolean' },
    placement: {
      control: 'select',
      options: [
        'block-end center',
        'block-start center',
        'inline-start center',
        'inline-end center',
      ],
    },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    showArrow: { control: 'boolean' },
    portal: { control: 'boolean' },
    keepMounted: { control: 'boolean' },
    disableHoverablePopup: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-preview-card
      label="Alex Morgan profile"
      .open=${args.open}
      .disabled=${args.disabled}
      .placement=${args.placement}
      .openDelay=${args.openDelay}
      .closeDelay=${args.closeDelay}
      .showArrow=${args.showArrow}
      .portal=${args.portal}
      .keepMounted=${args.keepMounted}
      .disableHoverablePopup=${args.disableHoverablePopup}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => {
        if (!event.defaultPrevented && !event.detail.cancelled) {
          (event.currentTarget as TpPreviewCard).open = event.detail.value;
          updateArgs({ open: event.detail.value });
        }
      }}
    >
      <tp-button slot="trigger" href="#alex-morgan" variant="link">@alexmorgan</tp-button>
      <tp-avatar fallback="AM" alt="Alex Morgan"></tp-avatar>
      <strong>Alex Morgan</strong>
      <span>Design engineer building accessible interfaces.</span>
      <tp-badge variant="secondary">Available for collaboration</tp-badge>
    </tp-preview-card>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
