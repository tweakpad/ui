import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpPopover } from '../components/popover/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import {
  surfaceArgs,
  surfaceArgTypes,
  sourceImports,
  configuredSource,
  type SurfaceArgs,
} from './menu-family-controls.js';
import documentation from '../../docs/popover.md?raw';
interface Args extends SurfaceArgs {
  preserveOnTriggerHover: boolean;
  modal: boolean;
  openOnHover: boolean;
  openDelay: number;
  closeDelay: number;
}
const source = `${sourceImports}
<tp-popover label="Document settings">
  <tp-button slot="trigger" variant="outline">Document settings</tp-button>
  <span slot="title">Document settings</span>
      <span slot="description">Update the document name.</span>
      <tp-field><label slot="label">Name</label><tp-input default-value="Notes"></tp-input></tp-field>
      <tp-button slot="close">Done</tp-button>
</tp-popover>`;
const meta: Meta<Args> = {
  title: 'Components/Popover',
  component: 'tp-popover',
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
    ...surfaceArgs,
    placement: 'block-end center',
    label: 'Document settings',
    preserveOnTriggerHover: false,
    modal: false,
    openOnHover: false,
    openDelay: 300,
    closeDelay: 0,
  },
  argTypes: {
    ...surfaceArgTypes,
    preserveOnTriggerHover: { control: 'boolean' },
    modal: { control: 'boolean' },
    openOnHover: { control: 'boolean' },
    openDelay: { control: 'number' },
    closeDelay: { control: 'number' },
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const owner = createRef<TpPopover>();
    const change = (event: TpSurfaceOpenChangeEvent): void => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.open = event.detail.value;
      queueMicrotask(() => {
        if (owner.value) updateArgs({ open: owner.value.open });
      });
    };
    return html`<tp-popover
      ${ref(owner)}
      .open=${args.open}
      .disabled=${args.disabled}
      .label=${args.label}
      .placement=${args.placement}
      .sideOffset=${args.sideOffset}
      .alignOffset=${args.alignOffset}
      .keepMounted=${args.keepMounted}
      .showArrow=${args.showArrow}
      .arrowPadding=${args.arrowPadding}
      .arrowWidth=${args.arrowWidth}
      .arrowHeight=${args.arrowHeight}
      .portal=${args.portal}
      .preserveTabOrder=${args.preserveTabOrder}
      .showBackdrop=${args.showBackdrop}
      .backdropForceRender=${args.backdropForceRender}
      .showViewport=${args.showViewport}
      .dismissible=${args.dismissible}
      .sticky=${args.sticky}
      .disableAnchorTracking=${args.disableAnchorTracking}
      .positionMethod=${args.positionMethod}
      .preserveOnTriggerHover=${args.preserveOnTriggerHover}
      .modal=${args.modal}
      .openOnHover=${args.openOnHover}
      .openDelay=${args.openDelay}
      .closeDelay=${args.closeDelay}
      .onOpenChange=${change}
      ><tp-button slot="trigger" variant="outline">Document settings</tp-button>
      <span slot="title">Document settings</span>
      <span slot="description">Update the document name.</span>
      <tp-field
        ><label slot="label">Name</label><tp-input default-value="Notes"></tp-input
      ></tp-field>
      <tp-button slot="close">Done</tp-button>
    </tp-popover>`;
  },
};
