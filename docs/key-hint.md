Key Hint displays one keyboard key. Key Hint Group arranges individual keys or nested groups into a shortcut or sequence. Both are informative; neither registers shortcuts or receives keyboard focus.

```html
<tp-key-hint-group>
  <tp-key-hint key="mod"></tp-key-hint>
  <tp-key-hint>K</tp-key-hint>
</tp-key-hint-group>
```

This renders Command + K on macOS and Ctrl + K on Windows/Linux. Use `separator="none"` for the adjacent keycaps in the [shadcn Kbd examples](https://ui.shadcn.com/docs/components/base/kbd). Existing literal content remains supported, but compose one Key per key rather than placing an entire shortcut in one keycap.

## Key API — `tp-key-hint`

| Property / attribute | Type                              | Default | Meaning                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `key`                | string                            | `''`    | Generated notation when the default slot is empty. Supports `mod`, `command`/`cmd`/`meta`, `control`/`ctrl`, `alt`/`option`, `shift`, `enter`/`return`, `escape`/`esc`, `backspace`, `delete`, `tab`, `space`, and `arrowup`/`arrowdown`/`arrowleft`/`arrowright`. Other names remain literal. |
| `platform`           | `auto \| mac \| windows \| linux` | `auto`  | Inherits the parent Group or detects the browser platform. An explicit platform overrides the parent.                                                                                                                                                                                          |
| `label`              | string                            | `''`    | Accessible replacement for the visual key. Generated notation already supplies a readable name. Set a label for slotted icons or when replacing generated notation with a different meaning.                                                                                                   |
| `keyLabels`          | `KeyHintLabels` (property only)   | `{}`    | Localized display/name overrides, merged over the parent mapping.                                                                                                                                                                                                                              |

The default slot accepts text or actual `tp-icon` elements. Slotted content replaces generated visual notation, while `label` or the generated key name supplies its accessible equivalent. The public `key-hint` part renders native `<kbd>`. A key has no component-specific events or action methods.

## Group API — `tp-key-hint-group`

| Property / attribute | Type                              | Default | Meaning                                                                                        |
| -------------------- | --------------------------------- | ------- | ---------------------------------------------------------------------------------------------- |
| `separator`          | `plus \| then \| none`            | `plus`  | Separator between visible direct Keys or Groups. Each nested Group controls its own separator. |
| `platform`           | `auto \| mac \| windows \| linux` | `auto`  | Platform context inherited by descendants.                                                     |
| `keyLabels`          | `KeyHintLabels` (property only)   | `{}`    | Inherited localized key display/names. The `then` entry localizes sequence text.               |
| `label`              | string                            | `''`    | Optional accessible group name.                                                                |

The default slot accepts ordered `tp-key-hint` and `tp-key-hint-group` children. Keep these as direct children; arbitrary wrappers do not participate in separator/context calculation. Hidden children do not contribute separators. Reordering, moving, removing, and reconnecting children updates context without overwriting authored properties. The public `key-hint-group` part renders native `<kbd>` with no extra keycap background. Group has no component-specific events or action methods.

```js
const group = document.querySelector('tp-key-hint-group');
group.keyLabels = {
  control: { text: 'Ctrl', label: 'Contrôle' },
  command: { text: '⌘', label: 'Commande' },
  then: 'puis',
};
```

`KeyHintLabels` maps a supplied key or canonical name to a string or `{ text, label? }`. A string supplies both visible and accessible text. `mod` resolves to Command on Mac and Control elsewhere before canonical lookup. Literal slotted content is authored content and is not translated automatically. Keep essential shortcuts available in equivalent prose or the owning control's accessible description.

## Composition and presentation

Use Group in Button's `icon-end`, Input Group's `prefix`/`suffix` (or logical addon slots), Menu's `data-menu-shortcut`, and Tooltip content. The owning control handles interaction. Keys within Tooltip receive its contextual palette through the shared presentation system.

Default keys have a 20px height/minimum width, 12px text and default icons, muted colors, and logical insets. Group owns inter-key spacing. These dimensions scale with the theme's spacing/text tokens; do not add per-demo margins or icon sizing to repair them. Explicit `tp-icon size` values remain supported. `dir` controls sequence direction; set `dir="ltr"` on a group inside RTL prose when the notation needs a fixed direction.

Both components inherit `TpElement` presentation APIs (`partContracts`, dictionaries, tokens and render delegates). Customize `key-hint` or `key-hint-group` through their public contracts or CSS parts; keep native keyboard semantics when supplying a render delegate. They share the Key Hint presentation identity. There are no selected, pressed, expanded or disabled interaction states.

```js
const key = document.querySelector('tp-key-hint');
key.partContracts = { 'key-hint': { styleHook: { 'min-inline-size': '24px' } } };
```

Exported classes: `TpKeyHint`, `TpKeyHintGroup`. Exported types: `KeyHintPlatform`, `KeyHintSeparator`, `KeyHintLabels`. Import `@tweakpad/ui/register` to register both elements and `@tweakpad/ui/styles.css` for the theme.
