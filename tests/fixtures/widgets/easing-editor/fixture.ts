/* Easing editor fixture bootstrap. Driven only through Chrome DevTools MCP (see README.md). */
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
  'tp-duration-change',
  'tp-adapter-change',
  'tp-open-change',
  'tp-field-value',
]) {
  document.addEventListener(type, (event) => {
    const target = event.target as HTMLElement;
    if (target.localName === 'tp-easing-editor') events.push(record(event));
    else leaked.push(record(event));
  });
}

const settle = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  for (const editor of document.querySelectorAll<HTMLElement & { updateComplete: Promise<unknown> }>(
    'tp-easing-editor',
  ))
    await editor.updateComplete;
};

Object.assign(window, {
  easingEditorAPI: {
    api,
    events,
    leaked,
    clear: () => {
      events.length = 0;
      leaked.length = 0;
    },
    settle,
    create: (attributes: Record<string, string>, container = document.getElementById('dynamic')!) => {
      const editor = document.createElement('tp-easing-editor');
      for (const [name, value] of Object.entries(attributes)) editor.setAttribute(name, value);
      container.append(editor);
      return editor;
    },
    ...checks,
  },
});
await customElements.whenDefined('tp-easing-editor');
await settle();
document.documentElement.dataset.fixtureReady = '';
