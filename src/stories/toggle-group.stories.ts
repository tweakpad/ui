import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import type { TpToggleGroup } from '../components/toggle-group/index.js';
import { useArgs } from 'storybook/preview-api';
import type { TpValueChangeEvent } from '../foundation/events.js';
import documentation from '../../docs/toggle-group.md?raw';
import {
  boldIcon,
  italicIcon,
  underlineIcon,
  bookmarkIcon,
  filledBookmarkIcon,
} from '../icons/text-formatting.js';
interface Args {
  value: readonly string[];
  multiple: boolean;
  orientation: 'horizontal' | 'vertical';
  variant: 'ghost' | 'outline';
  size: 'sm' | 'default' | 'lg';
  spacing: number;
  disabled: boolean;
  readOnly: boolean;
  loopFocus: boolean;
  label: string;
}
function renderGroup(args: Args, icons = false, labels = false) {
  const [, updateArgs] = useArgs<Args>();
  const group = createRef<TpToggleGroup>();
  const items = icons
    ? [
        { value: 'bold', label: 'Bold', icon: boldIcon },
        { value: 'italic', label: 'Italic', icon: italicIcon },
        { value: 'underline', label: 'Underline', icon: underlineIcon },
      ]
    : [
        { value: 'start', label: 'Start', icon: undefined },
        { value: 'center', label: 'Center', icon: undefined },
        { value: 'end', label: 'End', icon: undefined },
      ];
  return html`<tp-toggle-group
    ${ref(group)}
    .value=${args.value}
    .multiple=${args.multiple}
    .orientation=${args.orientation}
    .variant=${args.variant}
    .size=${args.size}
    .spacing=${args.spacing}
    .disabled=${args.disabled}
    .readOnly=${args.readOnly}
    .loopFocus=${args.loopFocus}
    .label=${args.label}
    .onValueChange=${(event: TpValueChangeEvent<readonly string[]>) => {
      const owner = group.value;
      if (!owner || event.defaultPrevented || event.detail.cancelled) return;
      owner.value = event.detail.value;
      queueMicrotask(() => {
        if (!owner.isConnected || event.defaultPrevented || event.detail.cancelled) return;
        updateArgs({ value: owner.value });
      });
    }}
    >${items.map((item) => html`<tp-toggle .value=${item.value} .ariaLabel=${icons && !labels ? item.label : ''}>${item.icon ? html`<tp-icon .icon=${item.icon}></tp-icon>` : ''}${!icons || labels ? item.label : ''}</tp-toggle>`)}</tp-toggle-group
  >`;
}
const iconGroupSource = (labels: boolean) =>
  `import { html, render } from 'lit';\nimport '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';\nconst items = ${JSON.stringify(
    [
      { value: 'bold', label: 'Bold', icon: boldIcon },
      { value: 'italic', label: 'Italic', icon: italicIcon },
      { value: 'underline', label: 'Underline', icon: underlineIcon },
    ],
    null,
    2,
  )};\nrender(html\`<tp-toggle-group label="Text formatting" multiple variant="outline">\${items.map(item => html\`<tp-toggle .value=\${item.value} .ariaLabel=\${${labels ? "''" : 'item.label'}}><tp-icon .icon=\${item.icon}></tp-icon>${labels ? ' ${item.label}' : ''}</tp-toggle>\`)}</tp-toggle-group>\`, document.querySelector('#app'));`;
const meta: Meta<Args> = {
  title: 'Components/Toggle group',
  component: 'tp-toggle-group',
  parameters: {
    layout: 'centered',
    docs: {
      source: {
        code: '<tp-toggle-group label="Text alignment">\n  <tp-toggle value="start">Start</tp-toggle>\n  <tp-toggle value="center">Center</tp-toggle>\n  <tp-toggle value="end">End</tp-toggle>\n</tp-toggle-group>',
      },
      description: { component: documentation },
    },
  },
  args: {
    value: [],
    multiple: false,
    orientation: 'horizontal',
    variant: 'ghost',
    size: 'default',
    spacing: 2,
    disabled: false,
    readOnly: false,
    loopFocus: true,
    label: 'Text alignment',
  },
  argTypes: {
    value: {
      control: 'object',
      description: 'Controlled ordered list in both modes; this example accepts proposals.',
    },
    multiple: { control: 'boolean' },
    orientation: { control: 'select', options: ['horizontal', 'vertical'] },
    variant: { control: 'select', options: ['ghost', 'outline'] },
    size: { control: 'select', options: ['sm', 'default', 'lg'] },
    spacing: { control: { type: 'number', min: 0 } },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    loopFocus: { control: 'boolean' },
    label: { control: 'text' },
  },
  render: (args) => renderGroup(args),
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};
export const IconOnly: Story = {
  args: { label: 'Text formatting', multiple: true, variant: 'outline' },
  render: (args) => renderGroup(args, true),
  parameters: { docs: { source: { code: iconGroupSource(false) } } },
};
export const IconWithLabel: Story = {
  args: { label: 'Text formatting', multiple: true, variant: 'outline' },
  render: (args) => renderGroup(args, true, true),
  parameters: { docs: { source: { code: iconGroupSource(true) } } },
};
export const FontWeightSelector: Story = {
  args: { label: 'Font weight', value: ['normal'], variant: 'outline', size: 'lg' },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const group = createRef<TpToggleGroup>();
    const result = createRef<HTMLElement>();
    const weights = [
      ['light', 'Light', '300'],
      ['normal', 'Normal', '400'],
      ['medium', 'Medium', '500'],
      ['bold', 'Bold', '700'],
    ];
    return html`<tp-field .label=${args.label} .disabled=${args.disabled}>
      <tp-toggle-group
        ${ref(group)}
        .value=${args.value}
        .multiple=${args.multiple}
        .orientation=${args.orientation}
        .variant=${args.variant}
        .size=${args.size}
        .spacing=${args.spacing}
        .readOnly=${args.readOnly}
        .loopFocus=${args.loopFocus}
        .onValueChange=${(event: TpValueChangeEvent<readonly string[]>) => {
          const owner = group.value;
          if (!owner || event.defaultPrevented || event.detail.cancelled) return;
          owner.value = event.detail.value;
          queueMicrotask(() => {
            if (!owner.isConnected || event.defaultPrevented || event.detail.cancelled) return;
            if (result.value) result.value.textContent = owner.value.join(', ') || 'None';
            updateArgs({ value: owner.value });
          });
        }}
      >
        ${weights.map(
          ([value, label, weight]) =>
            html`<tp-toggle
              .value=${value}
              .ariaLabel=${label}
              .partContracts=${{
                toggle: {
                  styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' },
                },
                'toggle-content': {
                  styleHook: { 'flex-direction': 'column', 'font-weight': weight },
                },
              }}
              ><span aria-hidden="true">Aa</span><span>${label}</span></tp-toggle
            >`,
        )}
      </tp-toggle-group>
      <span slot="description"
        >Selected:
        <tp-badge
          ${ref(result)}
          variant="secondary"
          .textContent=${args.value.join(', ') || 'None'}
        ></tp-badge
      ></span>
    </tp-field>`;
  },
  parameters: {
    layout: 'padded',
    docs: {
      source: {
        code: `import { html, render } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
const group = createRef();
const weights = [['light','Light','300'],['normal','Normal','400'],['medium','Medium','500'],['bold','Bold','700']];
function show(value = ['normal']) {
  render(html\`<tp-field label="Font weight">
    <tp-toggle-group \${ref(group)} .value=\${value} variant="outline" size="lg" .onValueChange=\${event => { const owner = group.value; if (!owner || event.defaultPrevented || event.detail.cancelled) return; owner.value = event.detail.value; queueMicrotask(() => { if (owner.isConnected && !event.defaultPrevented && !event.detail.cancelled) show(owner.value); }); }}>
      \${weights.map(([value,label,weight]) => html\`<tp-toggle .value=\${value} .ariaLabel=\${label} .partContracts=\${{ toggle: { styleHook: { 'block-size': 'auto', 'padding-block': 'var(--tp-space-2)' } }, 'toggle-content': { styleHook: { 'flex-direction': 'column', 'font-weight': weight } } }}><span aria-hidden="true">Aa</span><span>\${label}</span></tp-toggle>\`)}
    </tp-toggle-group>
    <span slot="description">Selected: <tp-badge variant="secondary">\${value.join(', ') || 'None'}</tp-badge></span>
  </tp-field>\`, document.querySelector('#app'));
}
show();`,
      },
    },
  },
};
export const StatefulArtwork: Story = {
  args: { label: 'Saved formatting', multiple: true, variant: 'outline' },
  render: (args) => {
    const [, updateArgs] = useArgs<Args>();
    const group = createRef<TpToggleGroup>();
    return html`<tp-toggle-group
      ${ref(group)}
      .value=${args.value}
      .multiple=${args.multiple}
      .orientation=${args.orientation}
      .variant=${args.variant}
      .size=${args.size}
      .spacing=${args.spacing}
      .disabled=${args.disabled}
      .readOnly=${args.readOnly}
      .loopFocus=${args.loopFocus}
      .label=${args.label}
      .onValueChange=${(event: TpValueChangeEvent<readonly string[]>) => {
        const owner = group.value;
        if (!owner || event.defaultPrevented || event.detail.cancelled) return;
        owner.value = event.detail.value;
        queueMicrotask(() => {
          if (!owner.isConnected || event.defaultPrevented || event.detail.cancelled) return;
          updateArgs({ value: owner.value });
        });
      }}
    >
      <tp-toggle
        value="bookmark"
        .partContracts=${{ 'toggle-content': { content: (state: Readonly<Record<string, unknown>>) => html`<tp-icon .icon=${state.pressed ? filledBookmarkIcon : bookmarkIcon}></tp-icon> Bookmark` } }}
      ></tp-toggle>
      <tp-toggle value="bold"><tp-icon .icon=${boldIcon}></tp-icon> Bold</tp-toggle>
    </tp-toggle-group>`;
  },
  parameters: {
    docs: {
      source: {
        code: `import { html, render } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
const bookmark = ${JSON.stringify(bookmarkIcon)};
const bold = ${JSON.stringify(boldIcon)};
const filled = { ...bookmark, paths: bookmark.paths.map(path => ({ ...path, fill: 'currentColor' })) };
const parts = { 'toggle-content': { content: state => html\`<tp-icon .icon=\${state.pressed ? filled : bookmark}></tp-icon> Bookmark\` } };
render(html\`<tp-toggle-group label="Saved formatting" multiple variant="outline"><tp-toggle value="bookmark" .partContracts=\${parts}></tp-toggle><tp-toggle value="bold"><tp-icon .icon=\${bold}></tp-icon> Bold</tp-toggle></tp-toggle-group>\`, document.querySelector('#app'));`,
      },
    },
  },
};
