# Widgets

Widgets are the library's specialized controls: color pickers, curve editors, audio graphs,
knobs, envelopes and similar editors whose primary surface is a continuous or multidimensional
value rather than text, a choice collection or a disclosure. They build on the foundational
components (Button, Slider, Popover, Input).

Widgets ship from their own entries, so applications opt in with one extra import.
`@tweakpad/ui/widgets` exports the widget classes, types, the widget catalog (`widgetEntries`)
and the widget presentation aggregates; `@tweakpad/ui/register/widgets` defines every widget.
The main `@tweakpad/ui` index and `@tweakpad/ui/register` never include a widget.

```js
import '@tweakpad/ui/register'; // foundational components
import '@tweakpad/ui/register/widgets'; // widgets, opt-in
import '@tweakpad/ui/styles.css';
```

## Naming

Widgets use the same `tp-` tag prefix and `Tp` class prefix as components, and the same
[attribute, marker and event conventions](../conventions.md).

## Shared behavior

Every widget has a controlled and uncontrolled value pair with `tp-value-change` proposals and
`tp-value-commit` settlements; pointer capture with cancellation and fine/coarse modifiers plus
keyboard equivalents for every pointer operation; canvas or WebGL surfaces sized at device pixel
ratio that re-render on size, pixel-ratio and theme changes; a role, accessible name and textual
value per editable dimension; appearance from the widget's presentation family through semantic
tokens; and input coalesced to one render per frame with every resource released on disconnect.

## Published widgets

- [Color picker](./color-picker.md): `tp-color-picker`.
- [Easing editor](./easing-editor.md): `tp-easing-editor`.
- [Flow](./flow.md): `tp-flow` with the public constituents `tp-flow-node`, `tp-flow-edge` and
  `tp-flow-port`, and the DOM-free engine `@tweakpad/ui/flow`.

## Planned widgets

- Audio graph.
