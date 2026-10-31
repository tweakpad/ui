# Vue bindings fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?package` to load the built `@tweakpad/ui/vue` (`npm run build` first). Everything renders with
Vue 3 render functions (`h`), through the generated bindings only; `v-model:<lane>` is written as
the `<lane>` prop with its `onUpdate:<lane>` listener, as templates compile it.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/frameworks/vue/` and wait for
   `html[data-ready]`.
2. `await vueBindings.runAll()` runs every scenario (`vueBindings.scenarios` lists them;
   `await vueBindings.run('<name>')` runs one). Each returns `{ scenario, passed, checks }` and
   fails on any `tp-diagnostic`, Vue error or warning, uncaught error or `console.error`/`warn`
   raised while it runs. The scenarios check, per binding:
   - the element is defined on first render; string, object and shorthand boolean props
     (`<Button disabled />`) arrive as properties; omitted props keep the element's defaults;
   - `v-model:<lane>` and `v-model` update the model and the element publishes the write-back,
     an own lane callback still runs, and `@tp-…` listeners receive the event once;
   - a transforming model publishes its own value; children Vue adds, removes and reorders
     inside an element that projects them (Dialog, a portaled Menu) stay consistent;
   - three mount/unmount rounds raise no error.
3. `await vueBindings.lane('<tag>')` runs one row of the lane matrix (`tests/fixtures/frameworks/lanes.ts`;
   `vueBindings.lanes` lists the tags): a controlled owner that writes the proposal back publishes it, one
   that does not keeps its value, and `default<Lane>` leaves the element free to commit it, with no
   diagnostic, warning or error.
4. `await vueBindings.smoke(start, count)` mounts every binding alone (in chunks: `smoke(0, 70)`,
   `smoke(70, 70)`, `smoke(140, 60)`) and lists failures apart from the diagnostics an element
   reports outside its composition.
5. Tool-driven, on the showcase at the top: click `Snap to grid`, click `Layer name` and type,
   open `Fruit` and click `Banana`, click `Rename` then press `Escape`, open `Layer` and click
   `Duplicate`. `#showcase-log` lists each change, newest first, and `vueBindings.problems`
   holds nothing but the dev server's Vue feature-flag notice.
