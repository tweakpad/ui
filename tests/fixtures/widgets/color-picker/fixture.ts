/* Color picker fixture bootstrap. Driven only through Chrome DevTools MCP (see README.md). */
const built = new URLSearchParams(location.search).has('built');
if (built)
  document.querySelector<HTMLLinkElement>('link[rel="stylesheet"]')!.href = '/dist/styles.css';
await import(/* @vite-ignore */ built ? '/dist/register.js' : '/src/register.ts');
await import(/* @vite-ignore */ built ? '/dist/register/widgets.js' : '/src/register/widgets.ts');
const api = await import(/* @vite-ignore */ built ? '/dist/widgets.js' : '/src/widgets/index.ts');
const checks = await import('./api.ts');

interface Recorded {
  readonly type: string;
  readonly target: string;
  readonly value: unknown;
  readonly previousValue: unknown;
  readonly reason: string;
  readonly cancelled: boolean;
  readonly metadata: unknown;
}
const events: Recorded[] = [];
const leaked: Recorded[] = [];
const record = (list: Recorded[]) => (event: Event) => {
  const custom = event as CustomEvent<Record<string, unknown>>;
  const target = event.target as HTMLElement;
  list.push({
    type: event.type,
    target: `${target.localName}${target.id ? `#${target.id}` : ''}`,
    value: custom.detail?.value,
    previousValue: custom.detail?.previousValue,
    reason: String(custom.detail?.reason ?? ''),
    cancelled: Boolean(custom.detail?.cancelled),
    metadata: custom.detail?.metadata,
  });
};
for (const type of [
  'tp-value-change',
  'tp-value-commit',
  'tp-format-change',
  'tp-view-change',
  'tp-harmony-change',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-field-value',
]) {
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    if (target.localName === 'tp-color-picker') record(events)(event);
    else leaked.push({ ...record([])(event), type } as unknown as Recorded);
  });
}

const settle = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  for (const picker of document.querySelectorAll<
    HTMLElement & { updateComplete: Promise<unknown> }
  >('tp-color-picker'))
    await picker.updateComplete;
};

Object.assign(window, {
  colorPickerAPI: {
    api,
    events,
    leaked,
    clear: () => {
      events.length = 0;
      leaked.length = 0;
    },
    settle,
    create: (
      attributes: Record<string, string>,
      container = document.getElementById('dynamic')!,
    ) => {
      const picker = document.createElement('tp-color-picker');
      for (const [name, value] of Object.entries(attributes)) picker.setAttribute(name, value);
      container.append(picker);
      return picker;
    },
    ...checks,
  },
});
// Saved swatches and consumer schemes for the swatches/schemes views (object properties).
const schemesInstance = document.getElementById('schemes') as HTMLElement & {
  swatches: unknown;
  schemes: unknown;
};
schemesInstance.swatches = [
  '#fb8c00',
  '#e53935',
  '#8e24aa',
  '#3949ab',
  '#039be5',
  '#00897b',
  '#7cb342',
  '#fdd835',
  { label: 'Brand', colors: ['#6d5dfc', '#2622a5', 'rgb(255 255 255 / 0.5)'] },
];
// Recent colors are application state: the popup instance receives five.
(document.getElementById('popup') as HTMLElement & { recent: readonly string[] }).recent = [
  '#e53935',
  '#fb8c00',
  '#43a047',
  '#039be5',
  '#8e24aa',
];
await customElements.whenDefined('tp-color-picker');
await settle();
document.documentElement.dataset.fixtureReady = '';
