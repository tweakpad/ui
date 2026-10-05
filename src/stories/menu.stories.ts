import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { navigationIcons } from '../icons/navigation.js';
import { plusIcon } from '../icons/plus.js';
import type { TpIcon } from '../components/icon.js';
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
  invocation: 'trigger' | 'context';
  for: string;
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
const menuContent = `
  <tp-menu-item value="new"><tp-icon data-menu-icon="plus"></tp-icon>New document<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="N"></tp-key-hint></tp-key-hint-group></tp-menu-item>
  <tp-menu-item disabled value="paste"><tp-icon data-menu-icon="folder"></tp-icon>Paste<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="V"></tp-key-hint></tp-key-hint-group></tp-menu-item>
  <tp-separator></tp-separator>
  <tp-menu-checkbox-item default-checked>Word wrap</tp-menu-checkbox-item>
  <tp-menu-radio-group aria-label="Density" default-value="comfortable">
    <span data-menu-label>Density</span>
    <tp-menu-radio-item value="compact">Compact</tp-menu-radio-item>
    <tp-menu-radio-item value="comfortable">Comfortable</tp-menu-radio-item>
  </tp-menu-radio-group>
  <tp-separator></tp-separator>
  <tp-menu label="Share document">
    <tp-button slot="trigger" variant="ghost"><tp-icon slot="icon-start" data-menu-icon="share"></tp-icon>Share</tp-button>
    <tp-menu-item value="link"><tp-icon data-menu-icon="share"></tp-icon>Copy link<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="shift"></tp-key-hint><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="C"></tp-key-hint></tp-key-hint-group></tp-menu-item>
    <tp-menu label="Invite people">
      <tp-button slot="trigger" variant="ghost"><tp-icon slot="icon-start" data-menu-icon="account"></tp-icon>Invite people</tp-button>
      <tp-menu-item value="email">Email invitation</tp-menu-item>
      <tp-menu-item value="workspace">Workspace members</tp-menu-item>
    </tp-menu>
  </tp-menu>
  <tp-separator></tp-separator>
  <tp-menu-item value="delete" variant="destructive"><tp-icon data-menu-icon="trash"></tp-icon>Delete<tp-key-hint-group data-menu-shortcut separator="none" platform="mac"><tp-key-hint key="command"></tp-key-hint><tp-key-hint key="⌫"></tp-key-hint></tp-key-hint-group></tp-menu-item>`;
const source = `${sourceImports}
<tp-menu label="Document actions">
  <tp-button slot="trigger" variant="outline">Document actions</tp-button>${menuContent}
</tp-menu>`;
const iconSetup = `document.querySelectorAll('[data-menu-icon]').forEach((icon) => {
    icon.icon = icon.dataset.menuIcon === 'plus' ? plusIcon : navigationIcons[icon.dataset.menuIcon];
  });`;
const exampleSource = (args: Args): string =>
  configuredSource(source, args, 'open')
    .replace(
      "  import '@tweakpad/ui/register';",
      "  import '@tweakpad/ui/register';\n  import { navigationIcons } from '@tweakpad/ui/icons/navigation';\n  import { plusIcon } from '@tweakpad/ui/icons/plus';",
    )
    .replace('</script>', `  ${iconSetup}\n</script>`);
const setupIcons = (element: Element | undefined): void => {
  queueMicrotask(() => {
    for (const icon of element?.querySelectorAll<TpIcon>('[data-menu-icon]') ?? []) {
      const name = icon.dataset.menuIcon as keyof typeof navigationIcons | 'plus';
      icon.icon = name === 'plus' ? plusIcon : navigationIcons[name];
    }
  });
};
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
        transform: (_code: string, context: { args: Args }) => exampleSource(context.args),
      },
    },
  },
  args: {
    ...surfaceArgs,
    invocation: 'trigger',
    for: '',
    sideOffset: undefined,
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
    invocation: { control: 'select', options: ['trigger', 'context'] },
    for: { control: 'text' },
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
      ${ref(setupIcons)}
      .invocation=${args.invocation}
      .for=${args.for}
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
      ><tp-button slot="trigger" variant="outline"
        >${args.invocation === 'context' ? 'Right-click or press Shift+F10' : 'Document actions'}</tp-button
      >
      ${unsafeHTML(menuContent)}
    </tp-menu>`;
  },
};
export const Context: Story = {
  ...Default,
  args: { invocation: 'context', label: 'Context actions' },
  parameters: {
    docs: {
      description: {
        story:
          'The same Menu and command constituents, invoked from a context target. Right-click or focus the target and press Shift+F10.',
      },
    },
  },
};
