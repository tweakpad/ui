// The Vue app, rendered on the server by `server.mjs` and hydrated by `vue-client.ts`.
import { defineComponent, h } from 'vue';
import { Checkbox, Dialog, Select } from '../../../../src/vue/index.js';
import { items } from './checks.js';

export const App = defineComponent({
  name: 'SsrApp',
  render: () =>
    h('div', { class: 'stack' }, [
      h(
        Dialog,
        { id: 'dialog', defaultOpen: true, label: 'Notice', showCloseControl: false },
        () => 'A dialog open from the server markup.',
      ),
      h(Select, { id: 'select', items, defaultValue: 'b', label: 'Fruit' }),
      h(Checkbox, { id: 'checked', checked: true, onCheckedChange() {} }, () => 'Controlled'),
      h(Checkbox, { id: 'default-checked', defaultChecked: true }, () => 'Uncontrolled'),
    ]),
});

/** Server only: the app's markup. */
export async function render(): Promise<string> {
  const { createSSRApp } = await import('vue');
  const { renderToString } = await import('vue/server-renderer');
  return renderToString(createSSRApp(App));
}
