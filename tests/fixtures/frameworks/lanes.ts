// The controllable lanes both framework fixtures verify, one row per catalog entry: the lane's
// property, an initial value, a proposal made through the element's public setter, and the
// composition the element needs. Each fixture renders the rows with its own bindings.

/** A child of a row's element: a binding by name, or a plain tag. */
export interface LaneChild {
  binding?: string;
  tag?: string;
  props: Record<string, unknown>;
  text?: string;
  /** Children of the child, after its text. */
  children?: LaneChild[];
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
  /**
   * The lane has no owner-held mode: an accepted proposal always commits, and an owner rejects it
   * by cancelling the `tp-<lane>-change` event (Accordion, Collapsible, Description list).
   */
  cancelable?: boolean;
  /**
   * The proposal follows a link the owner routes: every owner prevents the original click, and the
   * lane has no uncontrolled mode (Pagination).
   */
  routed?: boolean;
  /** Reads the committed lane value, when it is not the lane property itself. */
  read?: (element: HTMLElement) => unknown;
}

type Setter = Record<string, (...args: unknown[]) => unknown>;
const call =
  (method: string, ...args: unknown[]) =>
  (element: HTMLElement) =>
    void (element as unknown as Setter)[method]!(...args);
const trigger: LaneChild = { binding: 'Button', props: { slot: 'trigger' }, text: 'Open' };
/** Clicks the first match of each selector, entering one shadow root per step. */
const pressIn =
  (...path: string[]) =>
  (element: HTMLElement) => {
    let node: HTMLElement | null = element;
    for (const selector of path)
      node = (node?.shadowRoot ?? node)?.querySelector<HTMLElement>(selector) ?? null;
    node!.click();
  };
const stepSchema = {
  nodes: [
    {
      type: 'step',
      label: 'Step',
      ports: [
        { id: 'in', direction: 'input' },
        { id: 'out', direction: 'output' },
      ],
    },
  ],
};

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
    entry: 'tp-color-input',
    binding: 'ColorInput',
    lane: 'value',
    initial: '#0f766e',
    propose: call('setValue', '#6d5dfc'),
    props: { label: 'Fill', variant: 'inline' },
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
  {
    entry: 'tp-accordion',
    binding: 'Accordion',
    lane: 'value',
    cancelable: true,
    initial: ['gear'],
    propose: (element) =>
      pressIn(
        'tp-collapsible',
        'button',
      )(element.querySelectorAll<HTMLElement>('tp-accordion-item')[1]!),
    children: [
      {
        binding: 'AccordionItem',
        props: { value: 'gear' },
        children: [{ tag: 'span', props: { slot: 'label' }, text: 'What gear do I need?' }],
      },
      {
        binding: 'AccordionItem',
        props: { value: 'permits' },
        children: [{ tag: 'span', props: { slot: 'label' }, text: 'Do I need a permit?' }],
      },
    ],
    settle: 300,
  },
  {
    entry: 'tp-collapsible',
    binding: 'Collapsible',
    lane: 'open',
    cancelable: true,
    initial: false,
    propose: pressIn('button'),
    children: [
      { tag: 'span', props: { slot: 'label' }, text: 'Route details' },
      { tag: 'p', props: {}, text: '14 km, 600 m of climbing.' },
    ],
    settle: 300,
  },
  {
    entry: 'tp-theme-switcher',
    binding: 'ThemeSwitcher',
    lane: 'value',
    initial: 'light',
    propose: pressIn('tp-switch', 'button, input, [role="switch"]'),
    props: { storageKey: null, label: 'Dark mode' },
  },
  {
    entry: 'tp-calendar',
    binding: 'Calendar',
    lane: 'value',
    // `value` is the owner's selection; `selection` is the committed one in either mode.
    read: (element) => (element as unknown as { selection: unknown }).selection,
    initial: '2026-06-12',
    propose: call('setValue', '2026-06-15'),
    props: { label: 'Arrival', today: '2026-06-08' },
  },
  {
    entry: 'tp-command-palette',
    binding: 'CommandPalette',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    props: {
      label: 'Commands',
      items: [
        { value: 'new-trip', label: 'New trip' },
        { value: 'share', label: 'Share route' },
      ],
    },
    settle: 400,
  },
  {
    entry: 'tp-navigation-menu',
    binding: 'NavigationMenu',
    lane: 'value',
    initial: '',
    propose: (element) => element.querySelector<HTMLElement>('tp-button')!.click(),
    props: { 'aria-label': 'Main' },
    children: [
      {
        binding: 'NavigationMenuItem',
        props: { value: 'guides' },
        children: [
          { binding: 'Button', props: { slot: 'trigger', variant: 'ghost' }, text: 'Guides' },
          { tag: 'div', props: { slot: 'content' }, text: 'Trail guides by region' },
        ],
      },
    ],
    settle: 400,
  },
  {
    entry: 'tp-pagination',
    binding: 'Pagination',
    lane: 'page',
    routed: true,
    initial: 4,
    propose: pressIn('[part~="pagination-next"]'),
    props: { pages: 12, label: 'Results' },
  },
  {
    entry: 'tp-menubar',
    binding: 'Menubar',
    lane: 'value',
    initial: '',
    propose: (element) => element.querySelector<HTMLElement>('tp-button')!.click(),
    props: { 'aria-label': 'Editor' },
    children: [
      {
        binding: 'Menu',
        props: { value: 'file', label: 'File' },
        children: [
          { binding: 'Button', props: { slot: 'trigger', variant: 'ghost' }, text: 'File' },
          { binding: 'MenuItem', props: { value: 'export' }, text: 'Export route' },
        ],
      },
    ],
    settle: 400,
  },
  {
    entry: 'tp-description-list',
    binding: 'DescriptionList',
    lane: 'open',
    cancelable: true,
    initial: false,
    propose: pressIn('tp-button'),
    props: { limit: 1 },
    children: [
      { binding: 'DescriptionListItem', props: { label: 'Distance' }, text: '14 km' },
      { binding: 'DescriptionListItem', props: { label: 'Climb' }, text: '600 m' },
    ],
    settle: 300,
  },
  {
    entry: 'tp-autocomplete',
    binding: 'Autocomplete',
    lane: 'open',
    initial: false,
    propose: call('setOpen', true),
    props: {
      label: 'Trailhead',
      items: [
        { value: 'alder', label: 'Alder Creek' },
        { value: 'birch', label: 'Birch Point' },
      ],
    },
    settle: 400,
  },
  {
    entry: 'tp-easing-editor',
    binding: 'EasingEditor',
    lane: 'value',
    initial: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
    propose: call('setValue', 'cubic-bezier(0.42, 0, 0.58, 1)'),
    props: { label: 'Fade in' },
  },
  {
    entry: 'tp-emoji-picker',
    binding: 'EmojiPicker',
    lane: 'value',
    initial: '😀',
    propose: call('setValue', '🎉'),
    props: { label: 'Reaction' },
  },
  {
    entry: 'tp-flow',
    binding: 'Flow',
    lane: 'value',
    initial: { nodes: [{ id: 'a', type: 'step', position: { x: 0, y: 0 } }], edges: [] },
    propose: call('setValue', {
      nodes: [
        { id: 'a', type: 'step', position: { x: 0, y: 0 } },
        { id: 'b', type: 'step', position: { x: 240, y: 0 } },
      ],
      edges: [],
    }),
    props: {
      label: 'Pipeline',
      schema: stepSchema,
      style: { display: 'block', blockSize: '240px' },
    },
    settle: 200,
  },
  {
    entry: 'tp-map',
    binding: 'Map',
    lane: 'selectedPin',
    initial: 'camp',
    propose: call('selectPin', 'lodge'),
    props: { label: 'Camps', style: { display: 'block', blockSize: '200px' } },
    children: [
      {
        binding: 'MapPin',
        props: { value: 'camp', latitude: 46.5, longitude: 8.0, label: 'Camp' },
      },
      {
        binding: 'MapPin',
        props: { value: 'lodge', latitude: 46.6, longitude: 8.1, label: 'Lodge' },
      },
    ],
    settle: 200,
  },
];

/** Whether two lane values are the same (arrays by content). */
export const sameValue = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);
