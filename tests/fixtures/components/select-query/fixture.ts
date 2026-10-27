import { html } from 'lit';
import type { TpSelect } from '../../../../src/components/select/index.js';
import { runSelectQueryAssertions } from './assertions.js';
const built = new URL(location.href).searchParams.has('package');
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(link);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
const { boldIcon, italicIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/text-formatting.js' : '/src/icons/text-formatting.ts'
);
const byId = (id: string) => document.getElementById(id) as TpSelect;
const fruit = ['Apple', 'Banana', 'Cherry', 'Grape'];
byId('single').items = fruit;
byId('multi').items = ['Ada', 'Grace', 'Linus'];
byId('multi').defaultValue = ['Ada'];
byId('rich').items = [
  {
    label: 'Text',
    items: [
      {
        id: 'bold',
        label: html`<tp-icon .icon=${boldIcon} size="var(--tp-icon-size-sm)"></tp-icon> Bold`,
        text: 'Bold',
      },
      {
        id: 'italic',
        label: html`<tp-icon .icon=${italicIcon} size="var(--tp-icon-size-sm)"></tp-icon> Italic`,
        text: 'Italic',
      },
    ],
  },
  { label: 'Other', items: [{ id: 'link', label: 'Link', text: 'Link' }] },
];
byId('rich').itemToText = (value) => (value as { text: string }).text;
byId('factory').items = api.createSelectItems(
  [
    { id: 'de', title: 'Germany' },
    { id: 'fr', title: 'France' },
    { id: 'es', title: 'Spain' },
  ],
  {
    getValue: (item: { id: string }) => item.id,
    getLabel: (item: { title: string }) => item.title,
  },
);
byId('options').items = fruit;
byId('options').defaultInputValue = 'Ap';
byId('portal').items = fruit;
byId('portal').container = document.getElementById('portal-target');
byId('inline').items = fruit;
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');

// External query owner (V-593, V-594, V-841): a fixture-only contenteditable keeps focus and
// supplies the query; its capture listener forwards the navigation keys to the list and logs the
// results. The owner controls `open` and applies the list's close proposals.
const [{ fileTextIcon }, { folderIcon }, { clockIcon }] = await Promise.all(
  ['file-text', 'folder', 'clock'].map(
    (name) => import(/* @vite-ignore */ built ? `/dist/icons/${name}.js` : `/src/icons/${name}.ts`),
  ),
);
type ExternalList = TpSelect & {
  queryOwner: HTMLElement | null;
  onExecute: ((record: unknown, event: Event) => void) | undefined;
  handleQueryKey(event: KeyboardEvent): boolean;
  activateHighlighted(event: Event): boolean;
  activeDescendantReference(): HTMLElement | null;
  updatePosition(): Promise<void>;
};
const owner = document.getElementById('external-owner')!;
// Created by script so that `open` is controlled from its first update.
const list = document.createElement('tp-command-list') as unknown as ExternalList;
list.id = 'external-list';
list.setAttribute('label', 'Log commands');
list.setAttribute('placement', 'block-end start');
list.open = false;
list.inputValue = '';
const externalLog: {
  kind: string;
  key?: string;
  result?: unknown;
  reason?: string;
  value?: unknown;
}[] = [];
const externalItems = [
  {
    value: 'note',
    text: 'Note',
    icon: fileTextIcon,
    description: 'A dated line in the log',
    shortcut: 'Mod+Alt+N',
  },
  { value: 'watch', text: 'Watch change', icon: clockIcon, description: 'Hands over the bridge' },
  {
    value: 'folder',
    text: 'Folder',
    icon: folderIcon,
    description: 'Groups entries by voyage',
    shortcut: 'Mod+Shift+F',
  },
  { value: 'tide', text: 'Tide table', description: 'Heights for the next harbour' },
  { value: 'crew', text: 'Crew roster' },
];
/** The caret of the owner as a client rectangle; the owner's box without a caret in it. */
const caretRect = (): DOMRect => {
  const selection = document.getSelection();
  if (selection && selection.rangeCount && owner.contains(selection.anchorNode)) {
    const range = selection.getRangeAt(0).cloneRange();
    range.collapse(false);
    const rect = range.getClientRects()[0];
    if (rect) return DOMRect.fromRect(rect);
  }
  const box = owner.getBoundingClientRect();
  return new DOMRect(box.left, box.top, 0, box.height);
};
/** The anchor the fixture can move: the caret rectangle unless a rectangle is set. */
const anchorState: { rect: DOMRect | null } = { rect: null };
list.queryOwner = owner;
list.inline = false;
// The rows the Command palette renders (icon, label, description, shortcut hint); source mode
// only, since the projection is internal.
const project = built
  ? null
  : (await import('../../../../src/components/command-palette/item.js')).projectCommandItem;
list.items = externalItems.map((item) =>
  project ? project({ ...item, label: item.text }) : { ...item, label: item.text },
);
list.itemToText = (value: unknown) =>
  externalItems.find((item) => item.value === value)?.text ?? String(value);
list.matchFields = (item: unknown) => {
  const entry = item as { text?: string; description?: string };
  return [entry.text ?? '', entry.description ?? ''];
};
(list as unknown as { anchor: unknown }).anchor = {
  getBoundingRectangle: () => anchorState.rect ?? caretRect(),
  getClientRectangles: () => [anchorState.rect ?? caretRect()],
  contextElement: owner,
};
list.onOpenChange = (event: Event) => {
  const { value, reason } = (event as CustomEvent<{ value: boolean; reason: string }>).detail;
  externalLog.push({ kind: 'open-proposal', result: value, reason });
  list.open = value;
};
list.onExecute = (record: unknown) => {
  externalLog.push({ kind: 'execute', value: (record as { value: unknown }).value });
  list.open = false;
};
document.getElementById('external-list-slot')!.replaceWith(list);
const query = () => (owner.textContent ?? '').trim();
owner.addEventListener('input', () => {
  list.inputValue = query();
  list.open = query().length > 0;
});
owner.addEventListener(
  'keydown',
  (event) => {
    if (['ArrowUp', 'ArrowDown', 'Home', 'End', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      const result = list.handleQueryKey(event);
      externalLog.push({ kind: 'key', key: event.key, result });
      if (result) event.preventDefault();
    } else if (event.key === 'Enter' || event.key === 'Tab') {
      const result = list.activateHighlighted(event);
      externalLog.push({ kind: 'key', key: event.key, result });
      if (result) event.preventDefault();
    }
  },
  { capture: true },
);
document.addEventListener('tp-open-change', (event) => {
  if (event.composedPath()[0] === list)
    externalLog.push({ kind: 'open-change', result: (event as CustomEvent).detail?.open });
});

const settle = async (host: TpSelect) => {
  for (let n = 0; n < 3; n++)
    await Promise.race([
      host.updateComplete,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('render timeout')), 1800),
      ),
    ]);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
};
const create = async (configure: (host: TpSelect) => void = () => {}) => {
  const host = document.createElement('tp-select');
  host.searchable = true;
  host.label = 'Test options';
  host.items = fruit;
  host.motionPolicy = 'reduce';
  configure(host);
  document.getElementById('sandbox')!.append(host);
  await settle(host);
  return host;
};
const events: unknown[] = [];
document.addEventListener('tp-value-change', (event) =>
  events.push({ type: event.type, detail: (event as CustomEvent).detail }),
);
document.addEventListener('tp-input-value-change', (event) =>
  events.push({ type: event.type, detail: (event as CustomEvent).detail }),
);
document.addEventListener('tp-open-change', (event) =>
  events.push({ type: event.type, detail: (event as CustomEvent).detail }),
);
Object.assign(window, {
  selectQueryAPI: {
    api,
    byId,
    fruit,
    create,
    settle,
    events,
    ready: true,
    external: {
      owner,
      list,
      log: externalLog,
      anchor: anchorState,
      caretRect,
      clear: () => void (externalLog.length = 0),
    },
    runAssertions: () => runSelectQueryAssertions({ create, settle, api }),
  },
});
