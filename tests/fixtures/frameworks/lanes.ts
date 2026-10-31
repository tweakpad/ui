// The controllable lanes both framework fixtures verify, one row per catalog entry: the lane's
// property, an initial value, a proposal made through the element's public setter, and the
// composition the element needs. Each fixture renders the rows with its own bindings.

/** A child of a row's element: a binding by name, or a plain tag. */
export interface LaneChild {
  binding?: string;
  tag?: string;
  props: Record<string, unknown>;
  text?: string;
}

export interface LaneRow {
  /** The catalog entry the row verifies. */
  entry: string;
  /** The binding that renders it. */
  binding: string;
  /** The lane property; its callback is `on<Lane>Change` and its default `default<Lane>`. */
  lane: string;
  initial: unknown;
  /** Proposes another value through the element's public API. */
  propose: (element: HTMLElement) => void;
  props?: Record<string, unknown>;
  children?: LaneChild[];
  /** Milliseconds a proposal needs to settle (opening motion). */
  settle?: number;
}

type Setter = Record<string, (...args: unknown[]) => unknown>;
const call =
  (method: string, ...args: unknown[]) =>
  (element: HTMLElement) =>
    void (element as unknown as Setter)[method]!(...args);
const trigger: LaneChild = { binding: 'Button', props: { slot: 'trigger' }, text: 'Open' };

export const laneRows: LaneRow[] = [
  {
    entry: 'tp-switch',
    binding: 'Switch',
    lane: 'checked',
    initial: false,
    propose: call('setChecked', true),
    children: [{ tag: 'span', props: {}, text: 'Autosave' }],
  },
  {
    entry: 'tp-toggle',
    binding: 'Toggle',
    lane: 'pressed',
    initial: false,
    propose: call('setPressed', true),
    props: { 'aria-label': 'Bold' },
    children: [{ tag: 'span', props: {}, text: 'B' }],
  },
  {
    entry: 'tp-toggle-group',
    binding: 'ToggleGroup',
    lane: 'value',
    initial: ['left'],
    propose: call('setValue', ['right']),
    props: { 'aria-label': 'Alignment' },
    children: [
      { binding: 'Toggle', props: { value: 'left', 'aria-label': 'Left' }, text: 'L' },
      { binding: 'Toggle', props: { value: 'right', 'aria-label': 'Right' }, text: 'R' },
    ],
  },
  {
    entry: 'tp-radio-group',
    binding: 'RadioGroup',
    lane: 'value',
    initial: 'small',
    propose: call('setValue', 'large'),
    props: { 'aria-label': 'Size' },
    children: [
      { binding: 'RadioGroupItem', props: { value: 'small' }, text: 'Small' },
      { binding: 'RadioGroupItem', props: { value: 'large' }, text: 'Large' },
    ],
  },
  {
    entry: 'tp-tabs',
    binding: 'Tabs',
    lane: 'value',
    initial: 'layers',
    propose: call('setValue', 'assets'),
    children: [
      { tag: 'button', props: { slot: 'tab', value: 'layers' }, text: 'Layers' },
      { tag: 'button', props: { slot: 'tab', value: 'assets' }, text: 'Assets' },
      { tag: 'div', props: { slot: 'panel', value: 'layers' }, text: 'Layer list' },
      { tag: 'div', props: { slot: 'panel', value: 'assets' }, text: 'Asset list' },
    ],
  },
  {
    entry: 'tp-slider',
    binding: 'Slider',
    lane: 'value',
    initial: 20,
    propose: call('setValue', 60),
    props: { min: 0, max: 100, 'aria-label': 'Opacity' },
  },
  {
    entry: 'tp-text-area',
    binding: 'TextArea',
    lane: 'value',
    initial: 'Note',
    propose: call('setValue', 'Note two'),
    props: { label: 'Notes' },
  },
  {
    entry: 'tp-native-select',
    binding: 'NativeSelect',
    lane: 'value',
    initial: 'png',
    propose: call('setValue', 'jpg'),
    props: { label: 'Format' },
    children: [
      { tag: 'option', props: { value: 'png' }, text: 'PNG' },
      { tag: 'option', props: { value: 'jpg' }, text: 'JPG' },
    ],
  },
  {
    entry: 'tp-code-block',
    binding: 'CodeBlock',
    lane: 'expanded',
    initial: false,
    propose: call('setExpanded', true),
    props: {
      code: Array.from({ length: 40 }, (_, line) => `const line${line} = ${line};`).join('\n'),
      language: 'ts',
      label: 'Example',
    },
  },
  {
    entry: 'tp-alert-dialog',
    binding: 'AlertDialog',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    props: { label: 'Delete layer', description: 'The layer and its effects are removed.' },
    children: [
      trigger,
      { binding: 'Button', props: { slot: 'cancel', variant: 'outline' }, text: 'Cancel' },
      { binding: 'Button', props: { slot: 'confirm', variant: 'destructive' }, text: 'Delete' },
    ],
    settle: 400,
  },
  {
    entry: 'tp-popover',
    binding: 'Popover',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    props: { label: 'Layer options' },
    children: [trigger, { tag: 'p', props: {}, text: 'Options' }],
    settle: 400,
  },
  {
    entry: 'tp-tooltip',
    binding: 'Tooltip',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    children: [trigger, { tag: 'span', props: {}, text: 'Opens the layer' }],
    settle: 400,
  },
  {
    entry: 'tp-preview-card',
    binding: 'PreviewCard',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    children: [
      { tag: 'a', props: { slot: 'trigger', href: '#layer' }, text: 'Layer' },
      { tag: 'p', props: {}, text: 'Preview' },
    ],
    settle: 400,
  },
  {
    entry: 'tp-drawer',
    binding: 'Drawer',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    props: { label: 'Layers', description: 'Every layer of the document.' },
    children: [trigger, { tag: 'p', props: {}, text: 'Layers' }],
    settle: 500,
  },
  {
    entry: 'tp-navigation-panel',
    binding: 'NavigationPanel',
    lane: 'expanded',
    initial: true,
    propose: call('setExpanded', false),
    props: { compact: false },
  },
  {
    entry: 'tp-color-picker',
    binding: 'ColorPicker',
    lane: 'value',
    initial: '#336699',
    propose: call('setValue', '#993366'),
    props: { label: 'Fill' },
  },
];

/** Whether two lane values are the same (arrays by content). */
export const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
