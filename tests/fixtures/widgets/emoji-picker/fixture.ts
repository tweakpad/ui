/* Emoji picker fixture bootstrap. Driven only through Chrome DevTools MCP (see README.md). */
const params = new URLSearchParams(location.search);
const built = params.has('built');
// `?only=<id>` keeps one instance (smaller accessibility snapshots for real pointer input).
const only = params.get('only');
if (only)
  for (const picker of document.querySelectorAll('tp-emoji-picker'))
    if (picker.id !== only) picker.remove();
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
const record = (event: Event): Recorded => {
  const custom = event as CustomEvent<Record<string, unknown>>;
  const target = event.target as HTMLElement;
  return {
    type: event.type,
    target: `${target.localName}${target.id ? `#${target.id}` : ''}`,
    value: custom.detail?.value,
    previousValue: custom.detail?.previousValue,
    reason: String(custom.detail?.reason ?? ''),
    cancelled: Boolean(custom.detail?.cancelled),
    metadata: custom.detail?.metadata,
  };
};
for (const type of [
  'tp-value-change',
  'tp-value-commit',
  'tp-query-change',
  'tp-skin-tone-change',
  'tp-action',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-loading-status-change',
  'tp-field-value',
  'tp-input-value-change',
  'tp-search-status',
]) {
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    if (target.localName === 'tp-emoji-picker') events.push(record(event));
    else leaked.push(record(event));
  });
}

const settle = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  for (const picker of document.querySelectorAll<
    HTMLElement & { updateComplete: Promise<unknown> }
  >('tp-emoji-picker'))
    await picker.updateComplete;
};

checks.setupInstances(api);

Object.assign(window, {
  emojiPickerAPI: {
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
      const picker = document.createElement('tp-emoji-picker');
      for (const [name, value] of Object.entries(attributes)) picker.setAttribute(name, value);
      container.append(picker);
      return picker;
    },
    ...checks,
  },
});
await customElements.whenDefined('tp-emoji-picker');
await settle();
document.documentElement.dataset.fixtureReady = '';
