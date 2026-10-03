import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { useArgs } from 'storybook/preview-api';
import { ref } from 'lit/directives/ref.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import {
  navigationPanelExampleMarkup,
  setupNavigationPanelExample,
} from './navigation-panel-example.js';
import exampleSource from './navigation-panel-example.js?raw';
import documentation from '../../docs/navigation-panel.md?raw';
import type { TpNavigationPanel } from '../components/navigation-panel/index.js';
interface Args {
  expanded: boolean;
  compact: boolean;
  variant: 'integrated' | 'floating' | 'inset';
  side: 'inline-start' | 'inline-end';
  collapseMode: 'off-canvas' | 'compact' | 'none';
  label: string;
  motionPolicy: 'inherit' | 'normal' | 'reduce';
}
function source(args: Args): string {
  const module = exampleSource
    .replaceAll("'../icons/navigation.js'", "'@tweakpad/ui/icons/navigation'")
    .replaceAll("'../icons/plus.js'", "'@tweakpad/ui/icons/plus'")
    .replaceAll('export ', '');
  return `import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
${module}
const example = document.createElement('div');
document.body.append(example);
example.innerHTML = navigationPanelExampleMarkup;
const panel = example.querySelector('tp-navigation-panel');
Object.assign(panel, ${JSON.stringify(args)});
await panel.updateComplete;
setupNavigationPanelExample(panel);
panel.addEventListener('tp-value-change', event => {
  if (event.target === panel && !event.defaultPrevented && !event.detail.cancelled)
    panel.expanded = event.detail.value;
});`;
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
    motionPolicy: 'inherit',
  },
  argTypes: {
    expanded: { control: 'boolean' },
    compact: { control: 'boolean' },
    variant: { control: 'select', options: ['integrated', 'floating', 'inset'] },
    side: { control: 'select', options: ['inline-start', 'inline-end'] },
    collapseMode: { control: 'select', options: ['off-canvas', 'compact', 'none'] },
    label: { control: 'text' },
    motionPolicy: { control: 'select', options: ['inherit', 'normal', 'reduce'] },
  },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    let cleanup: (() => void) | undefined;
    let connected = false;
    const mount = (container: Element | undefined): void => {
      cleanup?.();
      connected = !!container;
      if (!container) return;
      queueMicrotask(async () => {
        const panel = container.querySelector<TpNavigationPanel>('tp-navigation-panel');
        if (!connected || !panel?.isConnected) return;
        Object.assign(panel, args);
        await panel.updateComplete;
        if (!connected || !panel.isConnected) return;
        const release = setupNavigationPanelExample(panel);
        const change = (event: Event): void => {
          const proposal = event as CustomEvent;
          if (event.target !== panel || event.defaultPrevented || proposal.detail.cancelled) return;
          panel.expanded = proposal.detail.value;
          queueMicrotask(() => {
            if (!event.defaultPrevented && panel.isConnected)
              updateArgs({ expanded: panel.expanded });
          });
        };
        panel.addEventListener('tp-value-change', change);
        cleanup = () => {
          release();
          panel.removeEventListener('tp-value-change', change);
        };
      });
    };
    return html`<div ${ref(mount)}>${unsafeHTML(navigationPanelExampleMarkup)}</div>`;
  },
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
