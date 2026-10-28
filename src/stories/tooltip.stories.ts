import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import { libraryDocs } from './library-docs.js';
import type { TooltipSide, TooltipAlign, TooltipDescribes } from '../components/tooltip/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
interface Args {
  open: boolean;
  label: string;
  side: TooltipSide;
  align: TooltipAlign;
  sideOffset: number | undefined;
  alignOffset: number;
  showArrow: boolean;
  openDelay: number;
  closeDelay: number;
  disabled: boolean;
  disableHoverablePopup: boolean;
  closeOnClick: boolean;
  trackCursorAxis: 'none' | 'horizontal' | 'vertical' | 'both';
  describes: TooltipDescribes;
  keepMounted: boolean;
}
const meta: Meta<Args> = {
  title: 'Components/Tooltip',
  component: 'tp-tooltip',
  parameters: { layout: 'centered', docs: libraryDocs('components/tooltip') },
  args: {
    open: false,
    label: 'Save changes',
    side: 'block-start',
    align: 'center',
    sideOffset: undefined,
    alignOffset: 0,
    showArrow: true,
    openDelay: 600,
    closeDelay: 0,
    disabled: false,
    disableHoverablePopup: false,
    closeOnClick: true,
    trackCursorAxis: 'none',
    describes: 'trigger',
    keepMounted: false,
  },
  argTypes: {
    open: { control: 'boolean' },
    label: { control: 'text' },
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
    describes: { control: 'select', options: ['trigger', 'none'] },
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
      .describes=${args.describes}
      .keepMounted=${args.keepMounted}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => updateArgs({ open: event.detail.value })}
      ><tp-button slot="trigger" variant="outline">Save</tp-button></tp-tooltip
    >`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
