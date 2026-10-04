import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import type { TpSidePanel, PanelEdge } from '../components/side-panel/index.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import documentation from '../../docs/side-panel.md?raw';
interface Args {
  open: boolean;
  edge: PanelEdge;
  showHeader: boolean;
  showFooter: boolean;
  showCloseControl: boolean;
  modality: 'modal' | 'non-modal' | 'trap-focus-only';
  keepMounted: boolean;
  portal: boolean;
}
const source = `<tp-side-panel label="Workspace settings" description="Update your profile and preferences.">
  <tp-button slot="trigger" variant="outline">Open settings</tp-button>
  <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
  <tp-button slot="close" variant="outline">Done</tp-button>
</tp-side-panel>`;
const meta = {
  title: 'Components/Side panel',
  component: 'tp-side-panel',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: documentation }, source: { code: source } },
  },
  args: {
    open: false,
    edge: 'inline-end',
    showHeader: true,
    showFooter: true,
    showCloseControl: true,
    modality: 'modal',
    keepMounted: false,
    portal: false,
  },
  argTypes: {
    open: { control: 'boolean' },
    edge: {
      control: 'select',
      options: ['inline-start', 'inline-end', 'block-start', 'block-end'],
    },
    showHeader: { control: 'boolean' },
    showFooter: { control: 'boolean' },
    showCloseControl: { control: 'boolean' },
    modality: { control: 'select', options: ['modal', 'non-modal', 'trap-focus-only'] },
    keepMounted: { control: 'boolean' },
    portal: { control: 'boolean' },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-side-panel
      label="Workspace settings"
      description="Update your profile and preferences."
      .open=${args.open}
      .edge=${args.edge}
      .showHeader=${args.showHeader}
      .showFooter=${args.showFooter}
      .showCloseControl=${args.showCloseControl}
      .modality=${args.modality}
      .keepMounted=${args.keepMounted}
      .portal=${args.portal}
      @tp-open-change=${(event: TpSurfaceOpenChangeEvent) => {
        if (event.defaultPrevented || event.detail.cancelled) return;
        (event.currentTarget as TpSidePanel).open = event.detail.value;
        updateArgs({ open: event.detail.value });
      }}
    >
      <tp-button slot="trigger" variant="outline">Open settings</tp-button>
      <tp-field label="Display name"><tp-input value="Alex Morgan"></tp-input></tp-field>
      <tp-button slot="close" variant="outline">Done</tp-button>
    </tp-side-panel>`;
  },
} satisfies Meta<Args>;
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
