# Toggle

`tp-toggle` is a two-state action. It exposes a pressed button, uses one state owner inside or outside `tp-toggle-group`, and does not submit or reset a form value. Use Checkbox for a Boolean form field and Radio Group for a single form choice.

```html
<tp-toggle>Bold</tp-toggle> <tp-toggle variant="outline" default-pressed>Italic</tp-toggle>
```

| Property / attribute                 | Type                      | Default            | Meaning                                                                                                                             |
| ------------------------------------ | ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `pressed`                            | Boolean or undefined      | uncontrolled false | Controlled state; accept/rewrite proposals in the callback.                                                                         |
| `defaultPressed` / `default-pressed` | Boolean                   | false              | Initial uncontrolled state.                                                                                                         |
| `onPressedChange`                    | change callback           | absent             | Called before the cancelable `tp-value-change` event.                                                                               |
| `variant`                            | ghost or outline          | ghost              | Shared Toggle appearance.                                                                                                           |
| `size`                               | sm, default or lg         | default            | Control extent and default icon context.                                                                                            |
| `disabled`                           | Boolean                   | false              | Blocks activation and removes the native button from tab order. Group disabled state is inherited.                                  |
| `readOnly` / `readonly`              | Boolean                   | false              | Compatibility state that prevents changes while preserving focus.                                                                   |
| `nativeAction` / `native-action`     | Boolean                   | true               | Native button, or a synthesized button-semantic span when false. Set the property to false; a present Boolean attribute means true. |
| `ariaLabel` / `aria-label`           | text                      | absent             | Accessible action name, including dynamic changes. Required for icon-only content.                                                  |
| `value`                              | text                      | empty              | Unique nonempty identity when grouped; no standalone state or submission effect.                                                    |
| `partContracts`, `partPresentation`  | records                   | empty              | Render delegation/content and appearance customization.                                                                             |
| `motionPolicy` / `motion-policy`     | inherit, normal or reduce | inherit            | Shared motion policy.                                                                                                               |

Pointer activation, Space and Enter propose the inverse state with reason `trigger-press`. The semantic host exposes `aria-pressed` and `data-pressed`/`data-unpressed`, `data-disabled`, and `data-focus-visible`. Pressed paint remains distinct while hovered. A disabled or canceled request does not change committed state.

`setPressed(next, reason?, sourceEvent?)`, `focus(options?)`, `blur()` and `activateFromLabel()` are public. Grouped Toggles derive pressed state from the Group; use `group.setValue()` instead of `item.setPressed()`. Group variant and size take precedence, and removing an item restores its independently authored configuration. `controlElement`, `selectionOwner` and `toggleDisabled` are read-only integration channels. Inherited form APIs do not give Toggle implicit form participation.

The first update fixes controlled/uncontrolled ownership. A controlled callback accepts or rewrites by assigning `pressed`. Without an owner return, the committed state stays unchanged. Cancel with `event.preventDefault()` or `event.detail.cancelled = true`. Reentrant proposals are queued. Event detail includes `value`, `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation` and optional `metadata`.

## Icon content

Compose the existing `tp-icon` in the default slot. It is decorative by default, so put the accessible name on the Toggle or include visible text. Toggle has no separate icon property or icon-only size axis. An explicit `tp-icon.size` remains authoritative; an unspecified icon uses the control's size context. Icons and labels use the shared Content gap and alignment in LTR and RTL. The source-compatible `data-icon="inline-start"` / `data-icon="inline-end"` content hints adjust logical edge padding; they are ordinary content attributes, not an additional Toggle icon-position API.

```ts
import { html, render } from 'lit';
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';

const bold = {
  viewBox: '0 0 24 24',
  paths: [{ d: 'M6 12h8a4 4 0 0 1 0 8H6V4h7a4 4 0 0 1 0 8', strokeWidth: 2 }],
};
render(
  html`
    <tp-toggle aria-label="Bold"><tp-icon .icon=${bold}></tp-icon></tp-toggle>
    <tp-toggle variant="outline"><tp-icon .icon=${bold}></tp-icon> Bold</tp-toggle>
  `,
  document.querySelector('#app')!,
);
```

Use a real `tp-button` for an adjacent one-time action. The With Button example compares the existing Button and Toggle with text-only, icon-only and icon-plus-label content. Icon-only, icon-and-label and state-derived artwork are distinct content compositions; public Controls expose variants, sizes, disabled and pressed states. Those attribute variations stay in Controls instead of duplicating stories.

## Parts and customization

`toggle` is the Control part and `toggle-content` its optional Content. Each supports `renderDelegate({state, properties, content, bind})`, `hostProperties`, `classHook`, `styleHook`, `elementReference` and `content`. Place `bind` on a delegate's semantic host. Required role, pressed state, native flags and references remain owned by Toggle. Class/style/content resolvers receive the same committed state, including `pressed`, `disabled`, `readOnly` and `focusVisible`. References clear on replacement/disconnect.

`partContracts['toggle-content'].content` can render a filled bookmark Icon only while `state.pressed`, without a second pressed-state owner. The Stateful Icon story includes a complete copyable example. Consumer handlers run first: `preventComponentHandling(event)` suppresses component activation separately from native `event.preventDefault()`. Explicitly canceled Space gestures do not leave an armed release.

`partPresentation`, `::part(toggle)`, `::part(toggle-content)`, semantic tokens and `setPresentationDictionary()` customize paint without replacing owners. `direction` / `dir` follows inherited writing direction. For group Item contracts set the member's `partContracts['toggle-group-item']`; the member's own Content remains `toggle-content`.

Import `@tweakpad/ui/register` and `@tweakpad/ui/styles.css` once. Icon definitions are consumer data, not registered icon-name strings.
