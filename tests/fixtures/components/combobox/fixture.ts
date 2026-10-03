import { html } from 'lit';
import type { TpCombobox } from '../../../../src/components/combobox/index.js';
import { runComboboxAssertions } from './assertions.js';
const built = new URL(location.href).searchParams.has('package');
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = built ? '/dist/styles.css' : '/src/styles.css';
document.head.append(link);
const api = await import(/* @vite-ignore */ built ? '/dist/index.js' : '/src/index.ts');
const { boldIcon, italicIcon } = await import(
  /* @vite-ignore */ built ? '/dist/icons/text-formatting.js' : '/src/icons/text-formatting.ts'
);
const byId = (id: string) => document.getElementById(id) as TpCombobox;
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
byId('factory').items = api.createComboboxItems(
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

const settle = async (host: TpCombobox) => {
  for (let n = 0; n < 3; n++)
    await Promise.race([
      host.updateComplete,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('render timeout')), 1800),
      ),
    ]);
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
};
const create = async (configure: (host: TpCombobox) => void = () => {}) => {
  const host = document.createElement('tp-combobox');
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
  comboboxAPI: {
    api,
    byId,
    fruit,
    create,
    settle,
    events,
    ready: true,
    runAssertions: () => runComboboxAssertions({ create, settle, api }),
  },
});
