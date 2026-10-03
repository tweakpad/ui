import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpMenu } from '../components/menu/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import {
  surfaceArgs,
  surfaceArgTypes,
  sourceImports,
  configuredSource,
  type SurfaceArgs,
} from './menu-family-controls.js';
import documentation from '../../docs/menu.md?raw';
interface Args extends SurfaceArgs {
  loopFocus: boolean;
  highlightItemOnHover: boolean;
  itemVariant: 'ghost' | 'destructive';
  closeParentOnEscape: boolean;
  orientation: 'horizontal' | 'vertical';
  modal: boolean;
  openOnHover: boolean;
  openDelay: number;
  closeDelay: number;
}
const source = `${sourceImports}
<tp-menu label="Document actions">
  <tp-button slot="trigger" variant="outline">Document actions</tp-button>
  <tp-menu-item value="new">New document <span data-menu-shortcut>⌘N</span></tp-menu-item>
      <tp-menu-item disabled value="paste">Paste</tp-menu-item>
      <tp-separator></tp-separator>
      <tp-menu-checkbox-item default-checked>Word wrap</tp-menu-checkbox-item>
      <tp-menu-radio-group  aria-label="Density">
        <tp-menu-radio-item value="compact">Compact</tp-menu-radio-item>
        <tp-menu-radio-item value="comfortable">Comfortable</tp-menu-radio-item>
      </tp-menu-radio-group>
      <tp-menu label="Share document">
        <tp-button slot="trigger" variant="ghost">Share</tp-button>
        <tp-menu-item value="email">Email</tp-menu-item>
        <tp-menu-item value="link">Copy link</tp-menu-item>
      </tp-menu>
      <tp-menu-item value="delete" variant="destructive">Delete</tp-menu-item>
</tp-menu>`;
const meta: Meta<Args> = {
  title: 'Components/Menu',
  component: 'tp-menu',
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
    ...surfaceArgs,
    label: 'Document actions',
    loopFocus: true,
    highlightItemOnHover: true,
    itemVariant: 'ghost',
    closeParentOnEscape: false,
    orientation: 'vertical',
    modal: true,
    openOnHover: false,
    openDelay: 100,
    closeDelay: 0,
  },
  argTypes: {
    ...surfaceArgTypes,
    loopFocus: { control: 'boolean' },
    highlightItemOnHover: { control: 'boolean' },
    itemVariant: { control: 'select', options: ['ghost', 'destructive'] },
    closeParentOnEscape: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
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
    const owner = createRef<TpMenu>();
    const change = (event: TpSurfaceOpenChangeEvent): void => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.open = event.detail.value;
      queueMicrotask(() => {
        if (owner.value) updateArgs({ open: owner.value.open });
      });
    };
    return html`<tp-menu
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
      .loopFocus=${args.loopFocus}
      .highlightItemOnHover=${args.highlightItemOnHover}
      .itemVariant=${args.itemVariant}
      .closeParentOnEscape=${args.closeParentOnEscape}
      .orientation=${args.orientation}
      .modal=${args.modal}
      .openOnHover=${args.openOnHover}
      .openDelay=${args.openDelay}
      .closeDelay=${args.closeDelay}
      .onOpenChange=${change}
      ><tp-button slot="trigger" variant="outline">Document actions</tp-button>
      <tp-menu-item value="new">New document <span data-menu-shortcut>⌘N</span></tp-menu-item>
      <tp-menu-item disabled value="paste">Paste</tp-menu-item>
      <tp-separator></tp-separator>
      <tp-menu-checkbox-item default-checked>Word wrap</tp-menu-checkbox-item>
      <tp-menu-radio-group aria-label="Density">
        <tp-menu-radio-item value="compact">Compact</tp-menu-radio-item>
        <tp-menu-radio-item value="comfortable">Comfortable</tp-menu-radio-item>
      </tp-menu-radio-group>
      <tp-menu label="Share document">
        <tp-button slot="trigger" variant="ghost">Share</tp-button>
        <tp-menu-item value="email">Email</tp-menu-item>
        <tp-menu-item value="link">Copy link</tp-menu-item>
      </tp-menu>
      <tp-menu-item value="delete" variant="destructive">Delete</tp-menu-item>
    </tp-menu>`;
  },
};
