// The React app, rendered on the server by `server.mjs` and hydrated by `react-client.ts`.
import { createElement as h, type ReactElement } from 'react';
import { Checkbox, Dialog, Select } from '../../../../src/react/index.js';
import { items } from './checks.js';

export function App(): ReactElement {
  return h(
    'div',
    { className: 'stack' },
    h(
      Dialog,
      { id: 'dialog', defaultOpen: true, label: 'Notice', showCloseControl: false },
      'A dialog open from the server markup.',
    ),
    h(Select, { id: 'select', items, defaultValue: 'b', label: 'Fruit' }),
    h(Checkbox, { id: 'checked', checked: true, onCheckedChange() {} }, 'Controlled'),
    h(Checkbox, { id: 'default-checked', defaultChecked: true }, 'Uncontrolled'),
  );
}

/** Server only: the app's markup. */
export async function render(): Promise<string> {
  const { renderToString } = await import('react-dom/server');
  return renderToString(h(App));
}
