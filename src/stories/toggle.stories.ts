import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { TpToggle } from '../components/toggle.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import {
  boldIcon,
  italicIcon,
  bookmarkIcon,
  filledBookmarkIcon,
} from '../icons/text-formatting.js';
import documentation from '../../docs/toggle.md?raw';

interface Args {
  pressed: boolean;
  variant: 'ghost' | 'outline';
  size: 'sm' | 'default' | 'lg';
  disabled: boolean;
  readOnly: boolean;
  nativeAction: boolean;
  ariaLabel: string;
  value: string;
}
function renderToggle(args: Args, content: unknown = 'Bold', stateful = false) {
  const [, updateArgs] = useArgs<Args>();
  const toggle = createRef<TpToggle>();
  return html`<tp-toggle
    ${ref(toggle)}
    .pressed=${args.pressed}
    .variant=${args.variant}
    .size=${args.size}
    .disabled=${args.disabled}
    .readOnly=${args.readOnly}
    .nativeAction=${args.nativeAction}
    .ariaLabel=${args.ariaLabel}
    .value=${args.value}
    .partContracts=${stateful ? { 'toggle-content': { content: (state: Readonly<Record<string, unknown>>) => html`<tp-icon .icon=${state.pressed ? filledBookmarkIcon : bookmarkIcon}></tp-icon> Bookmark` } } : {}}
    .onPressedChange=${(event: TpValueChangeEvent<boolean>) => {
      const owner = toggle.value;
      if (!owner || event.defaultPrevented || event.detail.cancelled) return;
      owner.pressed = event.detail.value;
      queueMicrotask(() => {
        if (!owner.isConnected || event.defaultPrevented || event.detail.cancelled) return;
        updateArgs({ pressed: owner.pressed });
      });
    }}
    >${content}</tp-toggle
  >`;
}
function iconSource(iconName: string, icon: unknown, text: string, label = '') {
  return `import { html, render } from 'lit';\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nconst ${iconName} = ${JSON.stringify(icon, null, 2)};\nrender(html\`<tp-toggle${text ? ' variant="outline"' : ''}${label ? ` aria-label="${label}"` : ''}><tp-icon${text ? ' data-icon="inline-start"' : ''} .icon=\${${iconName}}></tp-icon>${text ? ` ${text}` : ''}</tp-toggle>\`, document.querySelector('#app'));`;
}
const meta: Meta<Args> = {
  title: 'Components/Toggle',
  component: 'tp-toggle',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: {
      description: { component: documentation },
      source: { code: '<tp-toggle>Bold</tp-toggle>' },
    },
  },
  args: {
    pressed: false,
    variant: 'ghost',
    size: 'default',
    disabled: false,
    readOnly: false,
    nativeAction: true,
    ariaLabel: '',
    value: '',
  },
  argTypes: {
    pressed: {
      control: 'boolean',
      description: 'Controlled pressed state; this example accepts proposals.',
    },
    variant: { control: 'select', options: ['ghost', 'outline'] },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    nativeAction: { control: 'boolean' },
    ariaLabel: {
      control: 'text',
      description: 'Accessible action name; required when content is only a decorative Icon.',
    },
    value: {
      control: 'text',
      description: 'Identifier for a Toggle Group; no standalone form or state effect.',
    },
  },
  render: (args) => renderToggle(args),
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
export const SyntheticAction: Story = {
  args: { nativeAction: false },
  parameters: {
    docs: {
      source: {
        code: "import { html, render } from 'lit';\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nrender(html`<tp-toggle .nativeAction=${false}>Bold</tp-toggle>`, document.querySelector('#app'));",
      },
    },
  },
};
export const IconOnly: Story = {
  args: { ariaLabel: 'Bold' },
  render: (args) => renderToggle(args, html`<tp-icon .icon=${boldIcon}></tp-icon>`),
  parameters: { docs: { source: { code: iconSource('boldIcon', boldIcon, '', 'Bold') } } },
};
export const IconWithLabel: Story = {
  args: { variant: 'outline' },
  render: (args) =>
    renderToggle(
      args,
      html`<tp-icon data-icon="inline-start" .icon=${italicIcon}></tp-icon> Italic`,
    ),
  parameters: { docs: { source: { code: iconSource('italicIcon', italicIcon, 'Italic') } } },
};
export const StatefulIcon: Story = {
  args: { variant: 'outline' },
  render: (args) => renderToggle(args, 'Bookmark', true),
  parameters: {
    docs: {
      source: {
        code: `import { html, render } from 'lit';\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nconst bookmark = ${JSON.stringify(bookmarkIcon)};\nconst filled = { ...bookmark, paths: bookmark.paths.map(path => ({ ...path, fill: 'currentColor' })) };\nconst parts = { 'toggle-content': { content: state => html\`<tp-icon .icon=\${state.pressed ? filled : bookmark}></tp-icon> Bookmark\` } };\nrender(html\`<tp-toggle variant="outline" .partContracts=\${parts}></tp-toggle>\`, document.querySelector('#app'));`,
      },
    },
  },
};
export const WithButton: Story = {
  render: (args) => {
    const iconSize = args.size === 'default' ? 'icon' : `icon-${args.size}`;
    return html`<div>
      <p>
        <tp-button .variant=${args.variant} .size=${args.size} .disabled=${args.disabled}
          >Apply bold</tp-button
        >
        ${renderToggle({ ...args, ariaLabel: '' }, 'Bold')}
      </p>
      <p>
        <tp-button
          .variant=${args.variant}
          .size=${iconSize}
          .disabled=${args.disabled}
          .icon=${boldIcon}
          aria-label="Apply bold"
        ></tp-button>
        ${renderToggle({ ...args, ariaLabel: 'Bold' }, html`<tp-icon .icon=${boldIcon}></tp-icon>`)}
      </p>
      <p>
        <tp-button
          .variant=${args.variant}
          .size=${args.size}
          .disabled=${args.disabled}
          .icon=${boldIcon}
          >Apply bold</tp-button
        >
        ${renderToggle({ ...args, ariaLabel: '' }, html`<tp-icon data-icon="inline-start" .icon=${boldIcon}></tp-icon> Bold`)}
      </p>
    </div>`;
  },
  parameters: {
    controls: { exclude: ['ariaLabel', 'value'] },
    docs: {
      source: {
        code: `import { html, render } from 'lit';\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nconst boldIcon = ${JSON.stringify(boldIcon)};\nrender(html\`<div>
  <p><tp-button variant="ghost">Apply bold</tp-button> <tp-toggle>Bold</tp-toggle></p>
  <p><tp-button variant="ghost" size="icon" .icon=\${boldIcon} aria-label="Apply bold"></tp-button> <tp-toggle aria-label="Bold"><tp-icon .icon=\${boldIcon}></tp-icon></tp-toggle></p>
  <p><tp-button variant="ghost" .icon=\${boldIcon}>Apply bold</tp-button> <tp-toggle><tp-icon data-icon="inline-start" .icon=\${boldIcon}></tp-icon> Bold</tp-toggle></p>
</div>\`, document.querySelector('#app'));`,
      },
    },
  },
};
