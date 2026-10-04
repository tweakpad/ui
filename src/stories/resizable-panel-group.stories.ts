import { html } from 'lit';
import type { Meta, StoryObj } from '@storybook/web-components-vite';
import type {
  TpResizablePanel,
  TpResizablePanelGroup,
} from '../components/resizable-panel-group/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/resizable-panel-group.md?raw';
interface Args {
  orientation: 'horizontal' | 'vertical';
  disabled: boolean;
  withHandle: boolean;
  keyboardStep: number;
  disableDoubleClickReset: boolean;
}
const source = `<tp-resizable-panel-group style="height:18rem">
  <tp-resizable-panel id="sidebar" default-size="25%" min-size="15%" collapsible>Sidebar</tp-resizable-panel>
  <tp-resizable-handle label="Resize sidebar" with-handle></tp-resizable-handle>
  <tp-resizable-panel id="content" min-size="30%">Content</tp-resizable-panel>
</tp-resizable-panel-group>`;
const meta = {
  title: 'Components/Resizable panel group',
  component: 'tp-resizable-panel-group',
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: { description: { component: documentation }, source: { code: source, language: 'html' } },
  },
  args: {
    orientation: 'horizontal',
    disabled: false,
    withHandle: true,
    keyboardStep: 1,
    disableDoubleClickReset: false,
  },
  argTypes: {
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    disabled: { control: 'boolean' },
    withHandle: { control: 'boolean' },
    keyboardStep: { control: { type: 'number', min: 0.1 } },
    disableDoubleClickReset: { control: 'boolean' },
  },
  render: (args) =>
    html`<tp-resizable-panel-group
      .orientation=${args.orientation}
      .disabled=${args.disabled}
      .keyboardStep=${args.keyboardStep}
      .disableDoubleClickReset=${args.disableDoubleClickReset}
      style="height:18rem;width:40rem;max-width:100%"
      ><tp-resizable-panel id="sidebar" default-size="25%" min-size="15%" collapsible
        ><div style="padding:var(--tp-space-6)">Sidebar</div></tp-resizable-panel
      ><tp-resizable-handle
        label="Resize sidebar"
        .withHandle=${args.withHandle}
      ></tp-resizable-handle
      ><tp-resizable-panel id="content" min-size="30%"
        ><div style="padding:var(--tp-space-6)">Content</div></tp-resizable-panel
      ></tp-resizable-panel-group
    >`,
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
export const NestedWorkspace: Story = {
  render: () =>
    html`<tp-resizable-panel-group
      style="height:24rem;border:var(--tp-border-width) solid var(--tp-border);border-radius:var(--tp-radius-lg)"
      ><tp-resizable-panel default-size="25%" min-size="15%"
        ><div style="padding:var(--tp-space-6)">Navigation</div></tp-resizable-panel
      ><tp-resizable-handle with-handle label="Resize navigation"></tp-resizable-handle
      ><tp-resizable-panel
        ><tp-resizable-panel-group orientation="vertical"
          ><tp-resizable-panel default-size="65%" min-size="20%"
            ><div style="padding:var(--tp-space-6)">Editor</div></tp-resizable-panel
          ><tp-resizable-handle with-handle label="Resize editor"></tp-resizable-handle
          ><tp-resizable-panel min-size="15%"
            ><div style="padding:var(--tp-space-6)">Console</div></tp-resizable-panel
          ></tp-resizable-panel-group
        ></tp-resizable-panel
      ></tp-resizable-panel-group
    >`,
};
export const Controlled: Story = {
  render: () =>
    html`<tp-resizable-panel-group
      .sizes=${['30%', '70%']}
      @tp-value-change=${(event: TpValueChangeEvent<readonly number[]>) => {
        if (!event.defaultPrevented)
          (event.currentTarget as TpResizablePanelGroup).sizes = event.detail.value;
      }}
      style="height:18rem;border:var(--tp-border-width) solid var(--tp-border)"
      ><tp-resizable-panel id="controlled-left" min-size="20%"
        ><div style="padding:var(--tp-space-6)">Controlled sidebar</div></tp-resizable-panel
      ><tp-resizable-handle with-handle label="Resize controlled sidebar"></tp-resizable-handle
      ><tp-resizable-panel id="controlled-right" min-size="30%"
        ><div style="padding:var(--tp-space-6)">Controlled content</div></tp-resizable-panel
      ></tp-resizable-panel-group
    >`,
};
export const CollapsibleSidebar: Story = {
  render: () =>
    html`<div style="display:grid;gap:var(--tp-space-4)">
      <tp-button
        variant="outline"
        @click=${(event: Event) => {
          const panel = (
            event.currentTarget as HTMLElement
          ).parentElement!.querySelector<TpResizablePanel>('tp-resizable-panel')!;
          if (panel.isCollapsed()) panel.expand();
          else panel.collapse();
        }}
        >Toggle sidebar</tp-button
      ><tp-resizable-panel-group
        style="height:18rem;border:var(--tp-border-width) solid var(--tp-border)"
        ><tp-resizable-panel default-size="25%" min-size="15%" collapsible
          ><div style="padding:var(--tp-space-6)">Sidebar</div></tp-resizable-panel
        ><tp-resizable-handle with-handle label="Resize collapsible sidebar"></tp-resizable-handle
        ><tp-resizable-panel min-size="30%"
          ><div style="padding:var(--tp-space-6)">Content</div></tp-resizable-panel
        ></tp-resizable-panel-group
      >
    </div>`,
};

// Each distinct composition exposes matching copyable markup in Docs.
NestedWorkspace.parameters = {
  docs: {
    source: {
      code: `<tp-resizable-panel-group style="height:24rem">
  <tp-resizable-panel default-size="25%" min-size="15%">Navigation</tp-resizable-panel>
  <tp-resizable-handle with-handle label="Resize navigation"></tp-resizable-handle>
  <tp-resizable-panel>
    <tp-resizable-panel-group orientation="vertical">
      <tp-resizable-panel default-size="65%" min-size="20%">Editor</tp-resizable-panel>
      <tp-resizable-handle with-handle label="Resize editor"></tp-resizable-handle>
      <tp-resizable-panel min-size="15%">Console</tp-resizable-panel>
    </tp-resizable-panel-group>
  </tp-resizable-panel>
</tp-resizable-panel-group>`,
    },
  },
};
Controlled.parameters = {
  docs: {
    source: {
      code: `<template id="controlled-layout"><tp-resizable-panel-group id="controlled" style="height:18rem">
  <tp-resizable-panel id="controlled-left" min-size="20%">Controlled sidebar</tp-resizable-panel>
  <tp-resizable-handle with-handle label="Resize controlled sidebar"></tp-resizable-handle>
  <tp-resizable-panel id="controlled-right" min-size="30%">Controlled content</tp-resizable-panel>
</tp-resizable-panel-group></template>
<script type="module">
  const fragment = document.querySelector('#controlled-layout').content.cloneNode(true);
  const group = fragment.querySelector('#controlled');
  group.sizes = ['30%', '70%']; // Configure before connection.
  group.onSizesChange = event => { if (!event.defaultPrevented) group.sizes = event.detail.value; };
  document.body.append(fragment);
</script>`,
    },
  },
};
CollapsibleSidebar.parameters = {
  docs: {
    source: {
      code: `<tp-button id="toggle-sidebar" variant="outline">Toggle sidebar</tp-button>
${source}
<script type="module">
  const panel = document.querySelector('#sidebar');
  document.querySelector('#toggle-sidebar').addEventListener('click', () => {
    if (panel.isCollapsed()) panel.expand(); else panel.collapse();
  });
</script>`,
    },
  },
};
