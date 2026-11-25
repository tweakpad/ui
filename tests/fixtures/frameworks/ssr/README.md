# Server rendering fixture

Renders the React and Vue bindings on the server and hydrates that markup in the browser. Driven
only through Chrome DevTools MCP.

## Run

1. `node tests/fixtures/frameworks/ssr/server.mjs` (in the background). It starts Vite in
   middleware mode on `http://127.0.0.1:5191` (`PORT` changes it) and server-renders each page at
   request time from the current source: `react-app.ts` with `renderToString` from
   `react-dom/server`, `vue-app.ts` with `renderToString` from `vue/server-renderer`.
2. Navigate to `http://127.0.0.1:5191/react` or `http://127.0.0.1:5191/vue` and wait for
   `html[data-ready]`. The client script (`react-client.ts` with `hydrateRoot`, `vue-client.ts` with
   `createSSRApp().mount()`) hydrates the markup, then `checks.ts` publishes `window.ssrFixture`:
   `{ framework, passed, checks }`, each failed check with its `detail`.

Both apps render the same props: a Dialog with `defaultOpen`, `label` and `showCloseControl={false}`,
a Select with `items`, `defaultValue` and `label`, a controlled Checkbox (`checked` with
`onCheckedChange`) and an uncontrolled one (`defaultChecked`).

## Checks

- The server markup carries each primitive prop under the element's own attribute name
  (`default-open`, `default-value`, `default-checked`, `label`, `checked`) and no prop name in its
  place (`defaultopen`).
- After hydration the elements hold every prop, including the ones with no attribute form: the
  Dialog is open and `showCloseControl` is `false`, the Select has its items and starts at `b`, both
  Checkboxes are checked.
- Hydration raises no warning or error (React's hydration mismatch report and recoverable errors,
  Vue's mismatch warnings). Development notices about the environment (Lit dev mode, Vue feature
  flags) are not counted.

With `showCloseControl={false}` the Dialog still shows its corner close control: it has no other
way to close, so the control stays. The check reads the property, not the control.

Stop the server when done.
