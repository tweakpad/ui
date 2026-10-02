import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import documentation from '../../docs/tooltip.md?raw';
import { plusIcon } from '../icons/plus.js';
import type { TooltipSide, TooltipAlign } from '../components/tooltip/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
interface Args {
  open: boolean;
  label: string;
  side: TooltipSide;
  align: TooltipAlign;
  sideOffset: number;
  alignOffset: number;
  showArrow: boolean;
  openDelay: number;
  closeDelay: number;
  disabled: boolean;
  disableHoverablePopup: boolean;
  closeOnClick: boolean;
  trackCursorAxis: 'none' | 'horizontal' | 'vertical' | 'both';
  keepMounted: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Tooltip',
  component: 'tp-tooltip',
  tags: ['autodocs'],
  parameters: { layout: 'centered', docs: { description: { component: documentation } } },
  args: {
    open: false,
    label: 'Save changes',
    side: 'block-start',
    align: 'center',
    sideOffset: 6,
    alignOffset: 0,
    showArrow: true,
    openDelay: 600,
    closeDelay: 0,
    disabled: false,
    disableHoverablePopup: false,
    closeOnClick: true,
    trackCursorAxis: 'none',
    keepMounted: false,
  },
  argTypes: {
    open: { control: 'boolean', description: 'Controlled state; this example accepts proposals.' },
    label: { control: 'text', description: 'Text fallback when the default slot is empty.' },
    side: {
      control: 'select',
      options: [
        'top',
        'right',
        'bottom',
        'left',
        'inline-start',
        'inline-end',
        'block-start',
        'block-end',
      ],
    },
    align: { control: 'select', options: ['start', 'center', 'end'] },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    showArrow: { control: 'boolean' },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
    disabled: { control: 'boolean' },
    disableHoverablePopup: { control: 'boolean' },
    closeOnClick: { control: 'boolean' },
    trackCursorAxis: { control: 'select', options: ['none', 'horizontal', 'vertical', 'both'] },
    keepMounted: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-tooltip
      .open=${args.open}
      .label=${args.label}
      .side=${args.side}
      .align=${args.align}
      .sideOffset=${args.sideOffset}
      .alignOffset=${args.alignOffset}
      .showArrow=${args.showArrow}
      .openDelay=${args.openDelay}
      .closeDelay=${args.closeDelay}
      .disabled=${args.disabled}
      .disableHoverablePopup=${args.disableHoverablePopup}
      .closeOnClick=${args.closeOnClick}
      .trackCursorAxis=${args.trackCursorAxis}
      .keepMounted=${args.keepMounted}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => updateArgs({ open: event.detail.value })}
      ><tp-button slot="trigger" variant="outline">Save</tp-button></tp-tooltip
    >`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
export const RichContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Descriptive content can include an Icon and KeyHint. Interactive content belongs in Popover.',
      },
    },
  },
  render: () =>
    html`<tp-tooltip
      ><tp-button slot="trigger" variant="outline">Add item</tp-button
      ><tp-icon .icon=${plusIcon} size="0.875rem"></tp-icon> Add item
      <tp-key-hint>⌘ K</tp-key-hint></tp-tooltip
    >`,
};
