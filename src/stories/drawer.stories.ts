import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpDrawer, DrawerEdge } from '../components/drawer/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import documentation from '../../docs/drawer.md?raw';
interface Args {
  open: boolean;
  swipeEnabled: boolean;
  backdrop: 'dark' | 'blur';
  modality: 'modal' | 'non-modal' | 'trap-focus-only';
  edge: DrawerEdge;
  showHeader: boolean;
  showFooter: boolean;
  showCloseControl: boolean;
  showSwipeHandle: boolean;
  dismissible: boolean;
  keepMounted: boolean;
  portal: boolean;
}
const source = `<tp-drawer label="Workspace settings" description="Update your profile and preferences." show-swipe-handle>
  <tp-button slot="trigger" variant="outline">Open settings</tp-button>
  <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
  <tp-button slot="close" variant="outline">Done</tp-button>
</tp-drawer>`;
const meta = {
  title: 'Components/Drawer',
  component: 'tp-drawer',
  parameters: {
    layout: 'centered',
    docs: { description: { component: documentation }, source: { code: source } },
  },
  args: {
    open: false,
    swipeEnabled: true,
    backdrop: 'dark',
    modality: 'modal',
    edge: 'block-end',
    showHeader: true,
    showFooter: true,
    showCloseControl: true,
    showSwipeHandle: true,
    dismissible: true,
    keepMounted: false,
    portal: false,
  },
  argTypes: {
    open: { control: 'boolean' },
    swipeEnabled: { control: 'boolean' },
    backdrop: { control: 'select', options: ['dark', 'blur'] },
    modality: { control: 'select', options: ['modal', 'non-modal', 'trap-focus-only'] },
    edge: {
      control: 'select',
      options: ['inline-start', 'inline-end', 'block-start', 'block-end'],
    },
    showHeader: { control: 'boolean' },
    showFooter: { control: 'boolean' },
    showCloseControl: { control: 'boolean' },
    showSwipeHandle: { control: 'boolean' },
    dismissible: { control: 'boolean' },
    keepMounted: { control: 'boolean' },
    portal: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-drawer
      label="Workspace settings"
      description="Update your profile and preferences."
      .open=${args.open}
      .swipeEnabled=${args.swipeEnabled}
      .backdrop=${args.backdrop}
      .modality=${args.modality}
      .edge=${args.edge}
      .showHeader=${args.showHeader}
      .showFooter=${args.showFooter}
      .showCloseControl=${args.showCloseControl}
      .showSwipeHandle=${args.showSwipeHandle}
      .dismissible=${args.dismissible}
      .keepMounted=${args.keepMounted}
      .portal=${args.portal}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        (event.currentTarget as TpDrawer).open = event.detail.value;
        updateArgs({ open: event.detail.value });
      }}
    >
      <tp-button slot="trigger" variant="outline">Open settings</tp-button>
      <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
      <tp-button slot="close" variant="outline">Done</tp-button>
    </tp-drawer>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};

const snapSource = `<tp-drawer label="Explore places" show-swipe-handle>
  <tp-button slot="trigger" variant="outline">Explore places</tp-button>
  <p>Drag the handle, or focus it and use Arrow keys, Home and End.</p>
  <tp-button slot="close" variant="outline">Done</tp-button>
</tp-drawer>
<script>
  const drawer = document.querySelector('tp-drawer');
  drawer.snapPoints = [0.25, 0.5, 1];
  drawer.defaultSnapPoint = 0.5;
</script>`;
export const SnapPoints: Story = {
  parameters: { controls: { disable: true }, docs: { source: { code: snapSource } } },
  render: () =>
    html`<tp-drawer
      label="Explore places"
      show-swipe-handle
      .snapPoints=${[0.25, 0.5, 1]}
      .defaultSnapPoint=${0.5}
    >
      <tp-button slot="trigger" variant="outline">Explore places</tp-button>
      <p>Drag the handle, or focus it and use Arrow keys, Home and End.</p>
      <tp-button slot="close" variant="outline">Done</tp-button>
    </tp-drawer>`,
};
const nestedSource = `<tp-drawer-provider>
  <tp-drawer label="Workspace" show-swipe-handle>
    <tp-button slot="trigger" variant="outline">Open workspace</tp-button>
    <tp-drawer label="Invite a member" show-swipe-handle>
      <tp-button slot="trigger" variant="outline">Invite member</tp-button>
      <tp-field label="Email"><tp-input type="email" placeholder="name@example.com"></tp-input></tp-field>
      <tp-button slot="close" variant="outline">Done</tp-button>
    </tp-drawer>
    <tp-button slot="close" variant="outline">Close workspace</tp-button>
  </tp-drawer>
</tp-drawer-provider>`;
export const Nested: Story = {
  parameters: { controls: { disable: true }, docs: { source: { code: nestedSource } } },
  render: () =>
    html`<tp-drawer-provider>
      <tp-drawer label="Workspace" show-swipe-handle>
        <tp-button slot="trigger" variant="outline">Open workspace</tp-button>
        <tp-drawer label="Invite a member" show-swipe-handle>
          <tp-button slot="trigger" variant="outline">Invite member</tp-button>
          <tp-field label="Email"
            ><tp-input type="email" placeholder="name@example.com"></tp-input
          ></tp-field>
          <tp-button slot="close" variant="outline">Done</tp-button>
        </tp-drawer>
        <tp-button slot="close" variant="outline">Close workspace</tp-button>
      </tp-drawer>
    </tp-drawer-provider>`,
};
