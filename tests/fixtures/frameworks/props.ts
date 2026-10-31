// The props matrix both framework fixtures verify for catalog entries without a controllable
// lane: one row per entry, rendered through the entry's binding with the composition it needs.
// A row's properties must arrive on the element, a second render's changed properties and
// children must reach it, and an event the element dispatches must reach its `onTp…` prop once.
import { boldIcon } from '../../../src/icons/text-formatting.js';
import type { LaneChild } from './lanes.js';

export interface PropRow {
  /** The catalog entry the row verifies. */
  entry: string;
  /** The binding that renders it. */
  binding: string;
  /** Properties the binding sets; each must arrive on the element (attributes for `aria-*`). */
  props: Record<string, unknown>;
  children?: LaneChild[];
  /** A second render with changed properties or children, which must reach the element. */
  update?: { props?: Record<string, unknown>; children?: LaneChild[] };
  /** Text the element's light tree must hold after each render, proving the children arrived. */
  text?: [first: string, second?: string];
  /** An event the element dispatches when `fire` runs; its `onTp…` prop must receive it once. */
  event?: { type: string; fire: (element: HTMLElement) => void };
  /** Milliseconds the element needs to settle after mounting or firing. */
  settle?: number;
  /** Prepares what the element needs in the page, such as its targets; returns the cleanup. */
  setup?: () => () => void;
  /** Diagnostic codes the row's composition reports by design, such as a missing engine. */
  expected?: string[];
}

const child = (
  binding: string,
  props: Record<string, unknown> = {},
  text?: string,
  children?: LaneChild[],
): LaneChild => ({
  binding,
  props,
  ...(text === undefined ? {} : { text }),
  ...(children ? { children } : {}),
});
const tag = (
  name: string,
  props: Record<string, unknown> = {},
  text?: string,
  children?: LaneChild[],
): LaneChild => ({
  tag: name,
  props,
  ...(text === undefined ? {} : { text }),
  ...(children ? { children } : {}),
});
/** Clicks the first native button in the element's shadow root. */
const press =
  (selector = 'button') =>
  (element: HTMLElement) =>
    element.shadowRoot!.querySelector<HTMLElement>(selector)!.click();

export const propRows: PropRow[] = [
  {
    entry: 'tp-copy-button',
    binding: 'CopyButton',
    props: { value: 'kb_live_7d21', label: 'Copy access key', showLabel: true },
    update: { props: { label: 'Copy key' } },
    event: { type: 'tp-copy', fire: press('tp-button') },
  },
  {
    entry: 'tp-field',
    binding: 'Field',
    props: { label: 'Billing email', description: 'Receipts go here.' },
    children: [child('Input', { name: 'billing-email', type: 'email' })],
    update: { props: { label: 'Invoice email', error: 'Enter an address.' } },
  },
  {
    entry: 'tp-form',
    binding: 'Form',
    props: { 'aria-label': 'Report an outage' },
    children: [
      child('Field', { label: 'Region' }, undefined, [child('Input', { name: 'region' })]),
      child('Button', { type: 'submit' }, 'Send report'),
    ],
    text: ['Send report'],
  },
  {
    entry: 'tp-input-group',
    binding: 'InputGroup',
    props: { addonPosition: 'inline-end' },
    children: [
      child('Input', { label: 'Coupon', placeholder: 'SPRING-25' }),
      child('Button', { slot: 'action', variant: 'ghost' }, 'Apply'),
    ],
    text: ['Apply'],
  },
  {
    entry: 'tp-one-time-code-field',
    binding: 'OneTimeCodeField',
    props: { length: 6, groupLengths: [3, 3], 'aria-label': 'Sign-in code' },
    update: { props: { length: 4, groupLengths: [2, 2] } },
  },
  {
    entry: 'tp-questionnaire',
    binding: 'Questionnaire',
    props: {
      label: 'Studio intake',
      questions: [
        {
          name: 'room',
          title: 'Which room are you booking?',
          type: 'choice',
          choices: [
            { value: 'a', label: 'Room A' },
            { value: 'b', label: 'Room B' },
          ],
        },
      ],
    },
    update: { props: { label: 'Booking intake' } },
  },
  {
    entry: 'tp-file-upload',
    binding: 'FileUpload',
    props: { multiple: true, accept: 'image/*,application/pdf', maxFileSize: 5_000_000 },
    update: { props: { maxFiles: 3 } },
  },
  {
    entry: 'tp-breadcrumb',
    binding: 'Breadcrumb',
    props: { label: 'Location' },
    children: [tag('a', { href: '#home' }, 'Home'), tag('span', {}, 'Archive')],
    update: {
      children: [
        tag('a', { href: '#home' }, 'Home'),
        tag('a', { href: '#archive' }, 'Archive'),
        tag('span', {}, 'March'),
      ],
    },
    text: ['Archive', 'March'],
  },
  {
    entry: 'tp-avatar',
    binding: 'Avatar',
    props: { fallback: 'RT', alt: 'Rosa Tran', size: 'lg' },
    update: { props: { fallback: 'RO', size: 'sm' } },
  },
  {
    entry: 'tp-carousel',
    binding: 'Carousel',
    props: { label: 'Featured routes' },
    children: [tag('div', {}, 'Coastal loop'), tag('div', {}, 'Ridge trail')],
    update: { props: { loop: true } },
    text: ['Coastal loop'],
  },
  {
    entry: 'tp-data-visualization',
    binding: 'DataVisualization',
    props: {
      label: 'Weekly visits',
      description: 'Visits rose every week.',
      data: [
        { week: 'W1', visits: 120 },
        { week: 'W2', visits: 180 },
      ],
      series: { visits: { label: 'Visits' } },
    },
    update: { props: { label: 'Weekly sessions' } },
  },
  {
    entry: 'tp-message-scroller',
    binding: 'MessageScroller',
    props: { label: 'Trip chat' },
    children: [
      child('MessageScrollerViewport', {}, undefined, [
        child('MessageScrollerContent', {}, undefined, [
          child('MessageScrollerItem', { messageId: 'm1' }, undefined, [
            child('Message', { 'aria-label': 'Guide' }, undefined, [
              child('Bubble', {}, 'Meet at the north gate.'),
            ]),
          ]),
        ]),
      ]),
    ],
    text: ['Meet at the north gate.'],
  },
  {
    entry: 'tp-progress',
    binding: 'Progress',
    props: { value: 40, label: 'Exporting route.gpx' },
    update: { props: { value: 80 } },
  },
  {
    entry: 'tp-resizable-panel-group',
    binding: 'ResizablePanelGroup',
    props: { keyboardStep: 5 },
    children: [
      child('ResizablePanel', { defaultSize: '30%' }, 'Folders'),
      child('ResizableHandle', { label: 'Resize folders', withHandle: true }),
      child('ResizablePanel', {}, 'Messages'),
    ],
    text: ['Folders'],
    event: {
      type: 'tp-layout-change',
      fire: (element) =>
        void (element as unknown as { setLayout(l: number[]): void }).setLayout([45, 55]),
    },
  },
  {
    entry: 'tp-scroll-area',
    binding: 'ScrollArea',
    props: { label: 'Changelog', scrollbarVisibility: 'always' },
    children: [tag('p', {}, 'v3.1 · Offline maps')],
    text: ['Offline maps'],
  },
  {
    entry: 'tp-separator',
    binding: 'Separator',
    props: { decorative: true },
    update: { props: { decorative: false } },
  },
  {
    entry: 'tp-spinner',
    binding: 'Spinner',
    props: { label: 'Syncing', size: 'lg' },
    update: { props: { size: 'sm' } },
  },
  {
    entry: 'tp-toast',
    binding: 'Toast',
    props: { label: 'Alerts', position: 'bottom-end', timeout: 2000 },
    update: { props: { position: 'top-end' } },
  },
  {
    entry: 'tp-alert',
    binding: 'Alert',
    props: { severity: 'warning', title: 'Storage almost full' },
    children: [tag('p', {}, 'Archive old exports to free space.')],
    update: { props: { severity: 'danger' } },
    text: ['Archive old exports'],
  },
  {
    entry: 'tp-aspect-ratio',
    binding: 'AspectRatio',
    props: { ratio: 16 / 9, fit: 'cover' },
    children: [tag('div', {}, 'Map preview')],
    update: { props: { ratio: 1 } },
    text: ['Map preview'],
  },
  {
    entry: 'tp-attachment',
    binding: 'Attachment',
    props: { filename: 'itinerary.pdf', fileSize: 48_000, status: 'complete', removable: true },
    update: { props: { status: 'error', errorMessage: 'Upload failed.' } },
  },
  {
    entry: 'tp-badge',
    binding: 'Badge',
    props: { variant: 'secondary' },
    children: [tag('span', {}, 'Beta')],
    update: { props: { variant: 'outline' } },
    text: ['Beta'],
  },
  {
    entry: 'tp-bubble',
    binding: 'Bubble',
    props: { align: 'end', variant: 'secondary' },
    children: [tag('span', {}, 'On my way.')],
    text: ['On my way.'],
  },
  {
    entry: 'tp-button-group',
    binding: 'ButtonGroup',
    props: { label: 'Zoom', joined: true },
    children: [
      child('Button', { variant: 'outline' }, 'In'),
      child('Button', { variant: 'outline' }, 'Out'),
    ],
    update: {
      children: [
        child('Button', { variant: 'outline' }, 'Out'),
        child('Button', { variant: 'outline' }, 'In'),
        child('Button', { variant: 'outline' }, 'Fit'),
      ],
    },
    text: ['In', 'Fit'],
  },
  {
    entry: 'tp-field-group',
    binding: 'FieldGroup',
    props: { label: 'Coordinates', joined: true },
    children: [child('Input', { label: 'Latitude' }), child('Input', { label: 'Longitude' })],
  },
  {
    entry: 'tp-card',
    binding: 'Card',
    props: { elevated: true, size: 'sm' },
    children: [tag('h3', { slot: 'header' }, 'Trail report'), tag('p', {}, 'Muddy after rain.')],
    update: { props: { borders: 'off' } },
    text: ['Trail report'],
  },
  {
    entry: 'tp-citation',
    binding: 'Citation',
    props: { href: '#source-1', index: 1, sourceTitle: 'Park service bulletin' },
    children: [tag('span', {}, 'bulletin')],
    update: { props: { index: 2 } },
  },
  {
    entry: 'tp-markdown',
    binding: 'Markdown',
    props: { source: '## Packing list\n\n- Water\n- Map' },
    update: { props: { source: '## Packing list\n\n- Water\n- Map\n- Snacks' } },
  },
  {
    entry: 'tp-image',
    binding: 'Image',
    props: { alt: 'Trail map', width: 320, height: 180 },
    update: { props: { alt: 'Updated trail map' } },
  },
  {
    entry: 'tp-qr-code',
    binding: 'QrCode',
    props: { value: 'https://trails.example/loop-7', label: 'Loop 7 guide', size: 'sm' },
    update: { props: { value: 'https://trails.example/loop-8' } },
  },
  {
    entry: 'tp-scroll-trigger',
    binding: 'ScrollTrigger',
    props: { reveal: 'fade-up', stagger: 40 },
    children: [tag('p', {}, 'Day one: lakeshore')],
    text: ['lakeshore'],
  },
  {
    entry: 'tp-timeline',
    binding: 'Timeline',
    props: { align: 'start' },
    children: [
      child('TimelineItem', { value: 'start', status: 'complete' }, 'Trailhead'),
      child('TimelineItem', { value: 'camp', status: 'current' }, 'Camp'),
    ],
    update: {
      children: [
        child('TimelineItem', { value: 'start', status: 'complete' }, 'Trailhead'),
        child('TimelineItem', { value: 'camp', status: 'complete' }, 'Camp'),
        child('TimelineItem', { value: 'summit', status: 'current' }, 'Summit'),
      ],
    },
    text: ['Camp', 'Summit'],
  },
  {
    entry: 'tp-mo-text-split',
    binding: 'MoTextSplit',
    props: { split: 'words', stagger: 30 },
    children: [tag('span', {}, 'Into the canyon')],
  },
  {
    entry: 'tp-mo-text-mirror',
    binding: 'MoTextMirror',
    props: { stagger: 20 },
    children: [tag('span', {}, 'High desert')],
  },
  {
    entry: 'tp-mo-text-stroke',
    binding: 'MoTextStroke',
    props: { split: 'words' },
    children: [tag('span', {}, 'Night sky')],
  },
  {
    entry: 'tp-mo-glow-border',
    binding: 'MoGlowBorder',
    props: { trigger: 'hover', lights: 2 },
    children: [child('Card', {}, undefined, [tag('p', {}, 'Featured hike')])],
    update: { props: { lights: 3 } },
    text: ['Featured hike'],
  },
  {
    entry: 'tp-mo-segment-border',
    binding: 'MoSegmentBorder',
    props: { trigger: 'hover' },
    children: [
      child('MoBorderSegment', { draw: '0% 25%', duration: '400ms' }),
      child('Card', {}, undefined, [tag('p', {}, 'Ranger pick')]),
    ],
    text: ['Ranger pick'],
  },
  {
    entry: 'tp-cursor',
    binding: 'Cursor',
    props: { stiffness: 320, damping: 30, hideNative: false },
    update: { props: { stiffness: 200 } },
  },
  {
    entry: 'tp-table-of-contents',
    binding: 'TableOfContents',
    setup: () => {
      const targets = ['approach', 'descent'].map((id) => {
        const section = document.createElement('h2');
        section.id = id;
        section.textContent = id;
        document.body.append(section);
        return section;
      });
      return () => targets.forEach((target) => target.remove());
    },
    props: { label: 'On this trail', navigation: 'scroll' },
    children: [
      child('TableOfContentsItem', { href: '#approach' }, 'Approach'),
      child('TableOfContentsItem', { href: '#descent' }, 'Descent'),
    ],
    text: ['Descent'],
  },
  {
    entry: 'tp-tree-view',
    binding: 'TreeView',
    props: { label: 'Regions', selectionMode: 'single' },
    children: [
      child('TreeItem', { value: 'north', label: 'North' }, undefined, [
        child('TreeItem', { value: 'lakes', label: 'Lakes' }),
      ]),
      child('TreeItem', { value: 'south', label: 'South' }),
    ],
    event: {
      type: 'tp-expanded-change',
      fire: (element) =>
        void (element as unknown as { expandItem(id: string): void }).expandItem('north'),
    },
  },
  {
    entry: 'tp-empty-state',
    binding: 'EmptyState',
    props: { title: 'No saved routes', description: 'Routes you save appear here.' },
    update: { props: { title: 'No routes yet' } },
  },
  {
    entry: 'tp-icon',
    binding: 'Icon',
    props: { icon: boldIcon, label: 'Bold', size: '20px' },
    update: { props: { label: 'Strong' } },
  },
  {
    entry: 'tp-kbd',
    binding: 'Kbd',
    props: { value: 'mod', platform: 'mac' },
    update: { props: { platform: 'windows' } },
  },
  {
    entry: 'tp-label',
    binding: 'Label',
    props: { optional: true },
    children: [tag('span', {}, 'Trail name')],
    text: ['Trail name'],
  },
  {
    entry: 'tp-list',
    binding: 'List',
    props: { 'aria-label': 'Saved trails' },
    children: [
      child('ListItem', { value: 'loop', description: '7 km' }, 'Lake loop'),
      child('ListItem', { value: 'ridge', description: '12 km' }, 'Ridge line'),
    ],
    update: {
      children: [
        child('ListItem', { value: 'ridge', description: '12 km' }, 'Ridge line'),
        child('ListItem', { value: 'loop', description: '7 km' }, 'Lake loop'),
        child('ListItem', { value: 'falls', description: '4 km' }, 'Falls walk'),
      ],
    },
    text: ['Lake loop', 'Falls walk'],
  },
  {
    entry: 'tp-drag-drop-list',
    binding: 'DragDropList',
    props: {
      label: 'Stops',
      value: [
        { id: 'spring', label: 'Spring' },
        { id: 'meadow', label: 'Meadow' },
      ],
      getItemId: (item: { id: string }) => item.id,
      getItemLabel: (item: { label: string }) => item.label,
    },
  },
  {
    entry: 'tp-marker',
    binding: 'Marker',
    props: { variant: 'separator', label: 'Day two' },
    update: { props: { label: 'Day three' } },
  },
  {
    entry: 'tp-message',
    binding: 'Message',
    props: { align: 'end', author: 'Ines' },
    children: [child('Bubble', { align: 'end' }, 'Packed and ready.')],
    text: ['Packed and ready.'],
  },
  {
    entry: 'tp-overflow-list',
    binding: 'OverflowList',
    props: { limit: 2 },
    children: [
      child('Badge', {}, 'Lakes'),
      child('Badge', {}, 'Forest'),
      child('Badge', {}, 'Ridge'),
      child('Badge', {}, 'Coast'),
    ],
    update: { props: { limit: 3 } },
  },
  {
    entry: 'tp-skeleton',
    binding: 'Skeleton',
    props: { label: 'Loading routes', motion: 'pulse' },
    update: { props: { motion: 'none' } },
  },
  {
    entry: 'tp-status-dot',
    binding: 'StatusDot',
    props: { variant: 'success', label: 'Open', showLabel: true },
    update: { props: { variant: 'warning', label: 'Closing soon' } },
  },
  {
    entry: 'tp-table',
    binding: 'Table',
    props: { label: 'Campsites', stickyHeader: true },
    children: [
      child('TableHeader', {}, undefined, [
        child('TableRow', {}, undefined, [
          child('TableHead', {}, 'Site'),
          child('TableHead', {}, 'Spots'),
        ]),
      ]),
      child('TableBody', {}, undefined, [
        child('TableRow', {}, undefined, [
          child('TableCell', {}, 'Pine Flat'),
          child('TableCell', {}, '12'),
        ]),
      ]),
    ],
    text: ['Pine Flat'],
  },
  {
    entry: 'tp-text-transform',
    binding: 'TextTransform',
    props: { preset: 'currency', currency: 'EUR', locale: 'de-DE' },
    children: [tag('span', {}, '1234.5')],
    update: { props: { currency: 'USD' } },
  },
  {
    entry: 'tp-time',
    binding: 'Time',
    props: { datetime: '2026-04-12T08:30:00Z', mode: 'absolute' },
    update: { props: { datetime: '2026-04-13T08:30:00Z' } },
  },
  {
    entry: 'tp-visually-hidden',
    binding: 'VisuallyHidden',
    props: {},
    children: [tag('span', {}, 'Opens in a new tab')],
    text: ['Opens in a new tab'],
  },
  {
    entry: 'tp-media-player',
    binding: 'MediaPlayer',
    props: { contentTitle: 'Sunrise timelapse', seekStep: 5 },
    children: [tag('video', { muted: true, playsInline: true })],
    update: { props: { contentTitle: 'Sunset timelapse' } },
  },
  {
    entry: 'tp-text-editor',
    binding: 'TextEditor',
    props: { label: 'Trip notes', placeholder: 'Write a note' },
    // Without an installed engine the editor stays idle and says so.
    expected: ['text-editor-engine-missing'],
    update: { props: { placeholder: 'Add details' } },
  },
];

/** Converts an event type (`tp-layout-change`) to its framework prop (`onTpLayoutChange`). */
export const eventProp = (type: string): string =>
  'on' + type.replace(/(^|-)([a-z])/g, (_, __, letter: string) => letter.toUpperCase());

/** Whether an element carries a row's property: by value for properties, by text for attributes. */
export function carries(element: HTMLElement, key: string, value: unknown): boolean {
  if (key.startsWith('aria-') || key.startsWith('data-') || !(key in element))
    return element.getAttribute(key) === String(value);
  const actual = (element as unknown as Record<string, unknown>)[key];
  if (typeof value === 'function' || (typeof value === 'object' && value !== null))
    return actual === value || JSON.stringify(actual) === JSON.stringify(value);
  return actual === value;
}
