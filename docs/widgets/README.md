# Widgets

Widgets are the library's specialized controls: color pickers, curve editors, audio graphs,
knobs, envelopes and similar editors whose primary surface is a continuous or multidimensional
value rather than text, a choice collection or a disclosure. They build on the foundational
components (Button, Slider, Popover, Input).

Widgets ship from their own entries, so applications opt in with one extra import.
`@tweakpad/ui/widgets` exports the widget classes, types, the widget catalog (`widgetEntries`)
and the widget presentation aggregates; `@tweakpad/ui/register/widgets` defines every widget.
The main `@tweakpad/ui` index and `@tweakpad/ui/register` never include a widget.

The text editor extends this to one structured rich-text document, whose model, editing
commands, input handling, history and native format belong to an editing engine that the
application supplies through an engine adapter; the library's converters produce the portable
formats (HTML, Markdown and text). The library provides no editing engine and no real-time
collaboration.

```js
import '@tweakpad/ui/register'; // foundational components
import '@tweakpad/ui/register/widgets'; // widgets, opt-in
import '@tweakpad/ui/styles.css';
```

## Naming

Widgets use the same `tp-` tag prefix and `Tp` class prefix as components, and the same
[attribute, marker and event conventions](../conventions.md).

## Shared behavior

Every widget, unless an editing engine owns its document, has a controlled and uncontrolled
value pair with `tp-value-change` proposals and `tp-value-commit` settlements; pointer capture
with cancellation and fine/coarse modifiers plus keyboard equivalents for every pointer
operation; canvas or WebGL surfaces sized at device pixel ratio that re-render on size,
pixel-ratio and theme changes; a role, accessible name and textual value per editable dimension;
appearance from the widget's presentation family through semantic tokens; and input coalesced to
one render per frame with every resource released on disconnect.

A widget whose document an editing engine owns, the text editor, has no controlled value
instead: `value` is a snapshot handle of the committed document, changes the widget initiates
pass a cancelable request while changes the engine makes are published without being
cancelable, content is serialized only on request, and the engine renders the document instead
of a canvas.

## Published widgets

- [Color picker](./color-picker.md): `tp-color-picker`.
- [Easing editor](./easing-editor.md): `tp-easing-editor`.
- [Emoji picker](./emoji-picker.md): `tp-emoji-picker`, with the data helpers in `@tweakpad/ui/emoji`.
- [Flow](./flow.md): `tp-flow` with the public constituents `tp-flow-node`, `tp-flow-edge` and
  `tp-flow-port`, and the DOM-free engine `@tweakpad/ui/flow`.
- [Text editor](./text-editor.md): `tp-text-editor`, with the engine contract, the engine
  adapters and the editor tools in `@tweakpad/ui/text-editor`.

## Planned widgets

- Audio graph.
