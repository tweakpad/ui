# Widgets

Widgets are the library's specialized controls: color pickers, curve editors, audio graphs,
knobs, envelopes and similar editors whose primary surface is a continuous or multidimensional
value rather than text, a choice collection or a disclosure. They build on the foundational
components (Button, Slider, Popover, Input) and never re-implement them.

Widgets live in their own section so the core stays small and spec-governed on its own terms:

- Source: `src/widgets/<name>/`, beside `src/components/`. Foundation, presentation recipes and
  `src/components/shared` are shared with components.
- Package entries: `@tweakpad/ui/widgets` exports the widget classes, types, the widget catalog
  (`widgetEntries`) and the widget presentation aggregates; `@tweakpad/ui/register/widgets`
  defines every widget. The main `@tweakpad/ui` index and `@tweakpad/ui/register` never include a
  widget, so applications opt in with one extra import.
- Storybook: the `Widgets` section, one story file per widget titled `Widgets/<Name>`.
- Specification: the UI Widgets Specification in the Spec Blocks project governs widget
  contracts, beside the Foundation and Component Library documents.

```js
import '@tweakpad/ui/register'; // foundational components
import '@tweakpad/ui/register/widgets'; // widgets, opt-in
import '@tweakpad/ui/styles.css';
```

## Naming

Widgets use the same `tp-` tag prefix and `Tp` class prefix as components, and the same
[attribute, marker and event conventions](../conventions.md). The upstream tweakpane reference
uses a `tp-` CSS class prefix in light DOM; the coincidence is in name only, since widgets render
in shadow DOM and theme through `--tp-*` tokens.

## Shared contracts

Every widget follows the shared contracts of the UI Widgets Specification: a controlled and
uncontrolled value pair with `tp-value-change` proposals and `tp-value-commit` settlements;
pointer capture with cancellation and fine/coarse modifiers plus keyboard equivalents for every
pointer operation; canvas or WebGL surfaces sized at device pixel ratio that re-render on size,
pixel-ratio and theme changes; a role, accessible name and textual value per editable dimension;
appearance from the widget's presentation family through semantic tokens; and input coalesced to
one render per frame with every resource released on disconnect.

## Planned widgets

- Color picker (tweakpane reference: `packages/core/src/input-binding/color/view/`).
- Curve editor.
- Audio graph.

## Adding a widget

1. `src/widgets/<name>/index.ts` and `<name>.ts`: `static tagName = 'tp-<name>'`,
   `static get elementDependencies()`, `static override presentation` imported from
   `../../presentation/families/<name>.js`, and the element's own `HTMLElementTagNameMap` entry.
   Import foundation and component modules directly, never a barrel.
2. One tuple in `src/widgets/catalog.ts`; one `export * from './<name>/index.js'` in
   `src/widgets/index.ts`; the import and `defineElement` call in `src/register/widgets.ts`.
3. The family in `src/presentation/families/<name>.ts`, its recipe in
   `src/presentation/recipes/<name>.ts`, and the entry in `src/presentation/families/widgets.ts`.
4. `docs/widgets/<name>.md`, `src/stories/widgets/<name>.stories.ts` (title `Widgets/<Name>`,
   first story `Default`), `src/stories/widgets/<name>.examples.ts` and an entry in
   `src/stories/widgets/examples.ts`.
5. Browser fixtures under `tests/fixtures/widgets/<name>/` and the implementation record under
   `plans/widgets/<name>/implementation-checklist.md`.

The tests enforce the parity: `src/widgets/catalog.test.ts` (catalog, families, folders,
registration, and that the main entries never reach a widget), the extended source scanners, and
`src/stories/stories.test.ts`. `node scripts/size-report.mjs` measures each widget from
`@tweakpad/ui/widgets` and fails if `@tweakpad/ui/register` ships a widget module.
