import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { html } from 'lit';
import { createRef, ref } from 'lit/directives/ref.js';
import { useArgs } from 'storybook/preview-api';
import type { TpSelect, SelectEntry } from '../components/select/index.js';
import type { TpValueChangeEvent } from '../foundation/events.js';
import type { TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import { boldIcon, italicIcon, underlineIcon } from '../icons/text-formatting.js';
import documentation from '../../docs/select.md?raw';

interface Args {
  value: unknown;
  open: boolean;
  placeholder: string;
  label: string;
  disabled: boolean;
  readOnly: boolean;
  required: boolean;
  multiple: boolean;
  modal: boolean;
  highlightItemOnHover: boolean;
  keepMounted: boolean;
  alignItemWithTrigger: boolean;
  placement: string;
  sideOffset: number;
  alignOffset: number;
  scrollUpKeepMounted: boolean;
  scrollDownKeepMounted: boolean;
  showArrow: boolean;
}
const fruits = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'cherry', label: 'Cherry' },
  { value: 'grape', label: 'Grape' },
];
const sourceImports = `import '@tweakpad/ui/register';\nimport '@tweakpad/ui/styles.css';`;
const basicSource = `<script type="module">\n  ${sourceImports.replaceAll('\n', '\n  ')}\n</script>\n<tp-select label="Fruit" placeholder="Choose a fruit">\n  <option value="apple">Apple</option>\n  <option value="banana">Banana</option>\n  <option value="cherry">Cherry</option>\n  <option value="grape">Grape</option>\n</tp-select>`;
function control(args: Args, items: readonly SelectEntry[] = fruits) {
  const [, updateArgs] = useArgs<Args>();
  const owner = createRef<TpSelect>();
  const publish = (): void => {
    queueMicrotask(() => {
      if (owner.value) updateArgs({ value: owner.value.value, open: owner.value.open });
    });
  };
  return html`<tp-select
    ${ref(owner)}
    .items=${items}
    .value=${args.value}
    .open=${args.open}
    .placeholder=${args.placeholder}
    .label=${args.label}
    .disabled=${args.disabled}
    .readOnly=${args.readOnly}
    .required=${args.required}
    .multiple=${args.multiple}
    .modal=${args.modal}
    .highlightItemOnHover=${args.highlightItemOnHover}
    .keepMounted=${args.keepMounted}
    .alignItemWithTrigger=${args.alignItemWithTrigger}
    .placement=${args.placement}
    .sideOffset=${args.sideOffset}
    .alignOffset=${args.alignOffset}
    .scrollUpKeepMounted=${args.scrollUpKeepMounted}
    .scrollDownKeepMounted=${args.scrollDownKeepMounted}
    .showArrow=${args.showArrow}
    .onValueChange=${(event: TpValueChangeEvent<unknown>) => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.value = event.detail.value;
      publish();
    }}
    .onOpenChange=${(event: TpSurfaceOpenChangeEvent) => {
      if (!event.defaultPrevented && !event.detail.cancelled && owner.value)
        owner.value.open = event.detail.value;
      publish();
    }}
  ></tp-select>`;
}
const meta: Meta<Args> = {
  title: 'Components/Select',
  component: 'tp-select',
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
    docs: { description: { component: documentation }, source: { code: basicSource } },
  },
  args: {
    value: null,
    open: false,
    placeholder: 'Choose a fruit',
    label: 'Fruit',
    disabled: false,
    readOnly: false,
    required: false,
    multiple: false,
    modal: true,
    highlightItemOnHover: true,
    keepMounted: false,
    alignItemWithTrigger: true,
    placement: 'block-end start',
    sideOffset: 0,
    alignOffset: 0,
    scrollUpKeepMounted: false,
    scrollDownKeepMounted: false,
    showArrow: false,
  },
  argTypes: {
    value: {
      control: 'object',
      description:
        'Controlled selection. This example accepts proposals synchronously and publishes committed state to Controls after dispatch.',
    },
    open: {
      control: 'boolean',
      description: 'Controlled opening; the example accepts opening and closing proposals.',
    },
    placeholder: { control: 'text' },
    label: { control: 'text' },
    disabled: { control: 'boolean' },
    readOnly: { control: 'boolean' },
    required: { control: 'boolean' },
    multiple: { control: 'boolean' },
    modal: { control: 'boolean' },
    highlightItemOnHover: { control: 'boolean' },
    keepMounted: { control: 'boolean' },
    alignItemWithTrigger: { control: 'boolean' },
    placement: {
      control: 'select',
      options: [
        'block-end start',
        'block-end center',
        'block-end end',
        'block-start start',
        'inline-start start',
        'inline-end start',
      ],
    },
    sideOffset: { control: 'number' },
    alignOffset: { control: 'number' },
    scrollUpKeepMounted: { control: 'boolean' },
    scrollDownKeepMounted: { control: 'boolean' },
    showArrow: { control: 'boolean' },
  },
  render: (args) => control(args),
};
export default meta;
type Story = StoryObj<Args>;
export const Default: Story = {};

const richItems: readonly SelectEntry[] = [
  {
    type: 'group',
    label: 'Formatting',
    items: [
      {
        value: 'bold',
        text: 'Bold',
        label: html`<tp-icon size="var(--tp-icon-size-sm)" .icon=${boldIcon}></tp-icon>Bold`,
      },
      {
        value: 'italic',
        text: 'Italic',
        label: html`<tp-icon size="var(--tp-icon-size-sm)" .icon=${italicIcon}></tp-icon>Italic`,
      },
    ],
  },
  { type: 'separator' },
  {
    type: 'group',
    label: 'Decoration',
    items: [
      {
        value: 'underline',
        text: 'Underline',
        label: html`<tp-icon size="var(--tp-icon-size-sm)" .icon=${underlineIcon}></tp-icon
          >Underline <tp-badge variant="secondary">New</tp-badge>`,
      },
    ],
  },
];
export const RichGroups: Story = {
  args: { label: 'Text style', placeholder: 'Choose a style' },
  render: (args) => control(args, richItems),
  parameters: {
    docs: {
      source: {
        code: `import { html, render } from 'lit';\n${sourceImports}\nimport { boldIcon, italicIcon, underlineIcon } from '@tweakpad/ui/icons/text-formatting';\n\nconst items = [\n  { type: 'group', label: 'Formatting', items: [\n    { value: 'bold', text: 'Bold', label: html\`<tp-icon size="var(--tp-icon-size-sm)" .icon=\${boldIcon}></tp-icon>Bold\` },\n    { value: 'italic', text: 'Italic', label: html\`<tp-icon size="var(--tp-icon-size-sm)" .icon=\${italicIcon}></tp-icon>Italic\` },\n  ] },\n  { type: 'separator' },\n  { type: 'group', label: 'Decoration', items: [\n    { value: 'underline', text: 'Underline', label: html\`<tp-icon size="var(--tp-icon-size-sm)" .icon=\${underlineIcon}></tp-icon>Underline <tp-badge variant="secondary">New</tp-badge>\` },\n  ] },\n];\nrender(html\`<tp-select label="Text style" placeholder="Choose a style" .items=\${items}></tp-select>\`, document.body);`,
      },
    },
  },
};
export const Multiple: Story = {
  args: { multiple: true, value: [], label: 'Formatting', placeholder: 'Choose formatting' },
  render: (args) =>
    html`<div>
      <tp-field label="Formatting" description="Choose more than one style"
        >${control(args, richItems)}</tp-field
      >
    </div>`,
  parameters: {
    docs: {
      source: {
        code: `<script type="module">\n  ${sourceImports.replaceAll('\n', '\n  ')}\n</script>\n<tp-field label="Formatting" description="Choose more than one style">\n  <tp-select name="format" multiple placeholder="Choose formatting">\n    <option value="bold">Bold</option>\n    <option value="italic">Italic</option>\n    <option value="underline">Underline</option>\n  </tp-select>\n</tp-field>`,
      },
    },
  },
};
export const LargeList: Story = {
  args: { label: 'Country', placeholder: 'Choose a country' },
  render: (args) =>
    control(
      args,
      Array.from({ length: 100 }, (_, index) => ({
        value: `country-${index + 1}`,
        label: `Country ${index + 1}`,
      })),
    ),
  parameters: {
    docs: {
      source: {
        code: `${sourceImports}\nconst select = document.createElement('tp-select');\nselect.label = 'Country';\nselect.placeholder = 'Choose a country';\nselect.items = Array.from({ length: 100 }, (_, index) => ({\n  value: \`country-\${index + 1}\`, label: \`Country \${index + 1}\`,\n}));\ndocument.body.append(select);`,
      },
    },
  },
};
export const InDialog: Story = {
  render: (args) =>
    html`<tp-dialog label="Choose delivery fruit"
      ><tp-button slot="trigger" variant="outline">Choose fruit</tp-button
      ><tp-field label="Fruit" description="The Select popup belongs to this dialog"
        >${control(args)}</tp-field
      ><tp-button data-dialog-close variant="outline">Done</tp-button></tp-dialog
    >`,
  parameters: {
    docs: {
      source: {
        code: `<script type="module">\n  ${sourceImports.replaceAll('\n', '\n  ')}\n</script>\n<tp-dialog label="Choose delivery fruit">\n  <tp-button slot="trigger" variant="outline">Choose fruit</tp-button>\n  <tp-field label="Fruit" description="The Select popup belongs to this dialog">\n    <tp-select placeholder="Choose a fruit">\n      <option value="apple">Apple</option>\n      <option value="banana">Banana</option>\n      <option value="cherry">Cherry</option>\n    </tp-select>\n  </tp-field>\n  <tp-button data-dialog-close variant="outline">Done</tp-button>\n</tp-dialog>`,
      },
    },
  },
};
