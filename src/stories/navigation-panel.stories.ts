import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import { chevronRightIcon } from '../icons/chevron-right.js';
import { plusIcon } from '../icons/plus.js';
import documentation from '../../docs/navigation-panel.md?raw';
import type { TpNavigationPanel } from '../components/navigation-panel/index.js';
interface Args {
  expanded: boolean;
  compact: boolean;
  variant: 'integrated' | 'floating' | 'inset';
  side: 'inline-start' | 'inline-end';
  collapseMode: 'off-canvas' | 'compact' | 'none';
  label: string;
  showLoading: boolean;
  showLoadingIcon: boolean;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
function source(args: Args): string {
  return `import { html, render } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { chevronRightIcon } from '@tweakpad/ui/icons/chevron-right';
import { plusIcon } from '@tweakpad/ui/icons/plus';
const example = document.createElement('div');
document.body.append(example);
render(html\`<tp-navigation-panel
  .expanded=\${${args.expanded}} .compact=\${${args.compact}}
  .variant=\${${JSON.stringify(args.variant)}} .side=\${${JSON.stringify(args.side)}}
  .collapseMode=\${${JSON.stringify(args.collapseMode)}} .label=\${${JSON.stringify(args.label)}}
  .motionPolicy=\${${JSON.stringify(args.motionPolicy)}}
  @tp-value-change=\${event => {
    if (event.target !== event.currentTarget || event.defaultPrevented || event.detail.cancelled) return;
    event.currentTarget.expanded = event.detail.value;
  }}>
  <tp-navigation-panel-trigger .icon=\${chevronRightIcon}></tp-navigation-panel-trigger>
  <tp-navigation-panel-header><h2>Workspace</h2></tp-navigation-panel-header>
  <tp-navigation-panel-content><tp-navigation-panel-group>
    <tp-navigation-panel-group-label>Projects</tp-navigation-panel-group-label>
    <tp-navigation-panel-group-action aria-label="Add project" .icon=\${plusIcon}></tp-navigation-panel-group-action>
    <tp-navigation-panel-group-content><tp-navigation-panel-menu>
      <tp-navigation-panel-item><tp-navigation-panel-link href="#overview" active .icon=\${chevronRightIcon} tooltip="Overview">Overview</tp-navigation-panel-link><tp-navigation-panel-badge>3</tp-navigation-panel-badge></tp-navigation-panel-item>
      <tp-navigation-panel-item><tp-navigation-panel-link href="#activity" .icon=\${chevronRightIcon} tooltip="Activity">Activity</tp-navigation-panel-link></tp-navigation-panel-item>
      <tp-navigation-panel-item><tp-navigation-panel-action .icon=\${plusIcon}>Create project</tp-navigation-panel-action></tp-navigation-panel-item>
    </tp-navigation-panel-menu></tp-navigation-panel-group-content>
  </tp-navigation-panel-group><tp-navigation-panel-separator></tp-navigation-panel-separator>
  <tp-navigation-panel-input label="Filter projects" placeholder="Filter projects"></tp-navigation-panel-input>
  ${args.showLoading ? `<tp-navigation-panel-loading-placeholder .showIcon=\${${args.showLoadingIcon}}></tp-navigation-panel-loading-placeholder>` : ''}
  </tp-navigation-panel-content>
  <tp-navigation-panel-footer><tp-button variant="ghost">Account settings</tp-button></tp-navigation-panel-footer>
  <tp-navigation-panel-inset><div>
    <h1 id="overview">Project overview</h1>
    <p>Persistent navigation stays beside your content and becomes a modal Drawer in compact mode.</p>
    <tp-button variant="outline">Create a task</tp-button>
  </div></tp-navigation-panel-inset>
</tp-navigation-panel>\`, example);`;
}
const meta: Meta<Args> = {
  title: 'Components/Navigation panel',
  component: 'tp-navigation-panel',
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: { component: documentation },
      source: {
        transform: (_source: string, { args }: { args: Args }) => source(args),
        language: 'ts',
      },
    },
  },
  args: {
    expanded: true,
    compact: false,
    variant: 'integrated',
    side: 'inline-start',
    collapseMode: 'compact',
    label: 'Workspace navigation',
    showLoading: false,
    showLoadingIcon: false,
    motionPolicy: 'inherit',
  },
  argTypes: {
    expanded: { control: 'boolean' },
    compact: { control: 'boolean' },
    variant: { control: 'select', options: ['integrated', 'floating', 'inset'] },
    side: { control: 'select', options: ['inline-start', 'inline-end'] },
    collapseMode: { control: 'select', options: ['off-canvas', 'compact', 'none'] },
    label: { control: 'text' },
    showLoading: { control: 'boolean' },
    showLoadingIcon: { control: 'boolean' },
    motionPolicy: { control: 'select', options: ['inherit', 'normal', 'reduce'] },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    return html`<tp-navigation-panel
      .expanded=${args.expanded}
      .compact=${args.compact}
      .variant=${args.variant}
      .side=${args.side}
      .collapseMode=${args.collapseMode}
      .label=${args.label}
      .motionPolicy=${args.motionPolicy}
      @tp-value-change=${(event: CustomEvent) => {
        const panel = event.currentTarget as TpNavigationPanel;
        if (event.target !== panel || event.defaultPrevented || event.detail.cancelled) return;
        panel.expanded = event.detail.value;
        queueMicrotask(() => {
          if (!event.defaultPrevented && !event.detail.cancelled && panel.isConnected)
            updateArgs({ expanded: panel.expanded });
        });
      }}
    >
      <tp-navigation-panel-trigger .icon=${chevronRightIcon}></tp-navigation-panel-trigger>
      <tp-navigation-panel-header><h2>Workspace</h2></tp-navigation-panel-header>
      <tp-navigation-panel-content
        ><tp-navigation-panel-group
          ><tp-navigation-panel-group-label>Projects</tp-navigation-panel-group-label
          ><tp-navigation-panel-group-action
            aria-label="Add project"
            .icon=${plusIcon}
          ></tp-navigation-panel-group-action
          ><tp-navigation-panel-group-content
            ><tp-navigation-panel-menu>
              <tp-navigation-panel-item
                ><tp-navigation-panel-link
                  href="#overview"
                  active
                  .icon=${chevronRightIcon}
                  tooltip="Overview"
                  >Overview</tp-navigation-panel-link
                ><tp-navigation-panel-badge>3</tp-navigation-panel-badge></tp-navigation-panel-item
              >
              <tp-navigation-panel-item
                ><tp-navigation-panel-link
                  href="#activity"
                  .icon=${chevronRightIcon}
                  tooltip="Activity"
                  >Activity</tp-navigation-panel-link
                ></tp-navigation-panel-item
              >
              <tp-navigation-panel-item
                ><tp-navigation-panel-action .icon=${plusIcon}
                  >Create project</tp-navigation-panel-action
                ></tp-navigation-panel-item
              >
            </tp-navigation-panel-menu></tp-navigation-panel-group-content
          ></tp-navigation-panel-group
        ><tp-navigation-panel-separator></tp-navigation-panel-separator
        ><tp-navigation-panel-input
          label="Filter projects"
          placeholder="Filter projects"
        ></tp-navigation-panel-input
        >${args.showLoading ? html`<tp-navigation-panel-loading-placeholder .showIcon=${args.showLoadingIcon}></tp-navigation-panel-loading-placeholder>` : ''}</tp-navigation-panel-content
      >
      <tp-navigation-panel-footer
        ><tp-button variant="ghost">Account settings</tp-button></tp-navigation-panel-footer
      ><tp-navigation-panel-inset
        ><div>
          <h1 id="overview">Project overview</h1>
          <p>
            Persistent navigation stays beside your content and becomes a modal Drawer in compact
            mode.
          </p>
          <tp-button variant="outline">Create a task</tp-button>
        </div></tp-navigation-panel-inset
      >
    </tp-navigation-panel>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
