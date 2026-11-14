// Browser fixture for tp-layers, driven only through Chrome DevTools MCP (see README.md).
const built = new URLSearchParams(location.search).has('built');
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');
const icon = async (name: string, symbol: string) =>
  ((await import(/* @vite-ignore */ `/src/icons/${name}.ts`)) as Record<string, unknown>)[symbol];
const icons: Record<string, unknown> = {
  text: await icon('file-text', 'fileTextIcon'),
  eye: await icon('eye', 'eyeIcon'),
  'eye-off': await icon('eye-off', 'eyeOffIcon'),
  lock: await icon('lock', 'lockIcon'),
  'lock-open': await icon('unlock', 'unlockIcon'),
  plus: await icon('plus', 'plusIcon'),
  trash: await icon('trash', 'trashIcon'),
  target: await icon('pin', 'pinIcon'),
  power: await icon('circle-check', 'circleCheckIcon'),
  'power-off': await icon('ban', 'banIcon'),
};
// Icons arrive after the stacks read their markup, as in a page script.
for (const element of document.querySelectorAll<HTMLElement & { icon?: unknown }>(
  'tp-icon[data-icon], tp-button[data-icon]',
))
  element.icon = icons[element.dataset.icon!];

// The header lock: locks the selected layers, shows whether they are all locked, and follows the
// selection; a locked row's own lock unlocks it.
type Stack = HTMLElement & {
  value: readonly string[];
  getLayerState(id: string, name: string): string | undefined;
  setLayerState(ids: readonly string[], name: string, value: string): boolean;
  addLayer(layer: { id: string; label: string; children?: unknown[] }): void;
  removeLayers(ids?: readonly string[]): void;
};
const markup = document.querySelector<Stack>('#markup')!;
const lockToggle = document.querySelector<HTMLElement & { disabled: boolean }>('#lock-toggle')!;
const lockable = () =>
  markup.value.filter((id) => markup.getLayerState(id, 'locked') !== undefined);
const allLocked = (ids: readonly string[]) =>
  ids.length > 0 && ids.every((id) => markup.getLayerState(id, 'locked') === 'locked');
const syncLock = () => {
  const ids = lockable();
  const locked = allLocked(ids);
  lockToggle.disabled = ids.length === 0;
  (lockToggle as HTMLElement & { icon?: unknown }).icon = icons[locked ? 'lock' : 'lock-open'];
  lockToggle.setAttribute('aria-label', locked ? 'Unlock' : 'Lock');
};
lockToggle.addEventListener('click', () => {
  const ids = lockable();
  markup.setLayerState(ids, 'locked', allLocked(ids) ? 'unlocked' : 'locked');
});
for (const type of ['tp-value-commit', 'tp-layers-change'])
  markup.addEventListener(type, () => queueMicrotask(syncLock));
let added = 0;
for (const item of markup.querySelectorAll<HTMLElement>('[data-add]'))
  item.addEventListener('click', () => {
    added += 1;
    const group = item.dataset.add === 'group';
    markup.addLayer({
      id: `added-${added}`,
      label: group ? `Group ${added}` : `Layer ${added}`,
      ...(group ? { children: [] } : {}),
    });
  });
document.querySelector('#trash')!.addEventListener('click', () => markup.removeLayers());
await customElements.whenDefined('tp-layers');
syncLock();

// A long stack in a scroll area: dragging near its edges scrolls it.
const scroll = document.createElement('tp-layers') as HTMLElement & Record<string, unknown>;
scroll.id = 'scroll';
scroll.label = 'scroll';
scroll.defaultExpanded = ['scroll-g1'];
scroll.defaultLayers = Array.from({ length: 8 }, (_, group) => ({
  id: `scroll-g${group + 1}`,
  label: `Group ${group + 1}`,
  children: Array.from({ length: 4 }, (_, layer) => ({
    id: `scroll-g${group + 1}-${layer + 1}`,
    label: `Layer ${group + 1}.${layer + 1}`,
  })),
}));
document.querySelector('#scroll-area')!.append(scroll);

const events: { id: string; type: string; value: unknown; reason: string; change?: unknown }[] = [];
const leaked: string[] = [];
const LANES = [
  'tp-layers-change',
  'tp-value-change',
  'tp-value-commit',
  'tp-active-change',
  'tp-expanded-change',
];
for (const type of [...LANES, 'tp-items-change', 'tp-action'])
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    if (target.tagName !== 'TP-LAYERS') leaked.push(`${type} from ${target.tagName}`);
  });
for (const layers of document.querySelectorAll('tp-layers')) listen(layers);

function listen(layers: Element): void {
  for (const type of LANES)
    layers.addEventListener(type, (event) => {
      const detail = (event as CustomEvent).detail;
      events.push({
        id: layers.id,
        type,
        value:
          Array.isArray(detail.value) && typeof detail.value[0] === 'object'
            ? '[layers]'
            : detail.value,
        reason: detail.reason,
        change: detail.metadata?.change,
      });
    });
}

// A controlled owner of records that accepts every proposal, unless `reject` names its type.
const reject = new Set<string>();
const controlled = document.createElement('tp-layers') as HTMLElement & Record<string, unknown>;
controlled.id = 'controlled';
controlled.label = 'controlled';
controlled.canRemove = true;
controlled.layers = [
  { id: 'c-title', label: 'Title' },
  { id: 'c-scene', label: 'Scene', children: [{ id: 'c-sun', label: 'Sun' }] },
  { id: 'c-ground', label: 'Ground' },
];
controlled.value = ['c-title'];
controlled.active = 'c-title';
controlled.expanded = ['c-scene'];
const lanes: Record<string, string> = {
  'tp-layers-change': 'layers',
  'tp-value-change': 'value',
  'tp-active-change': 'active',
  'tp-expanded-change': 'expanded',
};
for (const [type, lane] of Object.entries(lanes))
  controlled.addEventListener(type, (event) => {
    if (reject.has(type)) return event.preventDefault();
    controlled[lane] = (event as CustomEvent).detail.value;
  });
listen(controlled);
document.querySelector('#controlled-card')!.append(controlled);

Object.assign(window, {
  layersAPI: {
    events,
    leaked,
    reject,
    clear: () => {
      events.length = 0;
      leaked.length = 0;
    },
    get: (id: string) => document.getElementById(id),
    /** The markup of a declared layer, without icons. */
    markup: (id: string) => document.getElementById(id)?.outerHTML.replace(/\s+/g, ' '),
  },
});
document.documentElement.toggleAttribute('data-fixture-ready', true);
