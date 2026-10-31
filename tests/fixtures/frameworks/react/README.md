# React bindings fixture

Served by the Vite dev server (`npm run dev`), driven only through Chrome DevTools MCP. Append
`?package` to load the built `@tweakpad/ui/react` (`npm run build` first). Everything renders with
React 19 under StrictMode, through the generated bindings only.

## Through Chrome DevTools MCP

1. Navigate to `http://localhost:5173/tests/fixtures/frameworks/react/` and wait for
   `html[data-ready]`.
2. `await reactBindings.runAll()` runs every scenario (`reactBindings.scenarios` lists them;
   `await reactBindings.run('<name>')` runs one). Each returns `{ scenario, passed, checks }`; a
   failed check carries its `detail`. Every scenario also fails on any `tp-diagnostic`, uncaught
   error or `console.error`/`warn` raised while it runs. The scenarios check, per binding:
   - the element is defined on first render and the ref is the element instance;
   - string and object props arrive as properties before the first update;
   - lane callbacks (`onCheckedChange`, `onValueChange`, `onOpenChange`) receive the proposal,
     and `onTp…` event props receive the event once;
   - a controlled owner that writes back through React state (a microtask later) publishes, one
     that does not write back keeps the value, a transforming owner publishes its own value, and
     `default…` props apply uncontrolled;
   - children React adds, removes and reorders inside an element that projects them (Dialog, a
     portaled Menu) stay consistent;
   - three mount/unmount rounds under StrictMode raise no error.
3. `await reactBindings.lane('<tag>')` runs one row of the lane matrix (`tests/fixtures/frameworks/lanes.ts`;
   `reactBindings.lanes` lists the tags): a controlled owner that writes the proposal back publishes it, one
   that does not keeps its value, and `default<Lane>` leaves the element free to commit it, with no
   diagnostic, warning or error. A `cancelable` row (Accordion, Collapsible, Description list) has
   no owner-held mode, so its rejecting owner cancels the `tp-<lane>-change` event; a `routed` row
   (Pagination) follows a link, so every owner prevents the original click and there is no
   uncontrolled case; `read` reads the committed value elsewhere (Calendar's `selection`).
4. `await reactBindings.prop('<tag>')` runs one row of the props matrix
   (`tests/fixtures/frameworks/props.ts`; `reactBindings.props` lists the tags), for entries without a
   lane: the element is defined and the ref is the element, its props arrive as properties, a
   second render's props and children reach the same element, and the row's `onTp…` event prop
   receives the event once, with no diagnostic, warning or error beyond the row's `expected`
   codes. Run each matrix on a fresh load: Lit reports a change-in-update warning once per tag
   and page.
5. `await reactBindings.smoke(start, count)` mounts every binding alone (in chunks:
   `smoke(0, 70)`, `smoke(70, 70)`, `smoke(140, 61)`): the element is defined and rendered, the ref
   is the element and no error or warning surfaces; diagnostics an element reports outside its
   composition are listed apart.
6. Tool-driven, on the showcase at the top: click `Snap to grid`, click `Layer name` and type,
   open `Fruit` and click `Cherry`, click `Rename` then press `Escape`, open `Layer` and click
   `Delete`. `#showcase-log` lists each change in order, newest first (`menu delete · dialog
false · dialog true · select cherry · input Base …`), each control shows its new value, and
   `reactBindings.problems` stays empty.
