# Theme switcher

`tp-theme-switcher` chooses the light, dark or system color scheme. It binds the shared Color scheme preference store, which applies the preference to a target (the document root by default), persists it, follows the device while on `system`, and keeps every control on the same target in sync. It composes the library's Switch, Button or Toggle group; it does not draw its own control.

```js
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpThemeSwitcher } from '@tweakpad/ui';
```

```html
<!-- A switch whose thumb shows the sun or the moon. -->
<tp-theme-switcher></tp-theme-switcher>
<!-- One icon button: dark → light → system. -->
<tp-theme-switcher variant="button"></tp-theme-switcher>
<!-- A segmented group with Light, Dark and System. -->
<tp-theme-switcher variant="group"></tp-theme-switcher>
```

| Variant  | Composes                                   | Behavior                                                                                                                                      |
| -------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `switch` | Switch, icons in its `thumb` slot          | Checked while the resolved scheme is dark. Activating sets the explicit opposite (`dark` or `light`); `system` is not selectable here.        |
| `button` | Button, `icon` size, `ghost` variant       | Each press advances `dark → light → system → dark`. The icon shows the current preference (moon, sun, monitor); the name reads "Theme: Dark". |
| `group`  | Toggle group (single) with one Toggle each | Light, Dark, System as icon-only Toggles named "Light", "Dark", "System". The selection cannot be cleared.                                    |

| Property / attribute             | Type                          | Default / behavior                                                                                                        |
| -------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `variant`                        | `switch`, `button` or `group` | `switch`.                                                                                                                 |
| `value`                          | `light`, `dark` or `system`   | Omitted chooses an uncontrolled control that follows the store. An authored value is controlled and applied to the store. |
| `defaultValue` / `default-value` | `light`, `dark` or `system`   | Used only when nothing is persisted; otherwise the persisted preference wins.                                             |
| `onValueChange`                  | callback                      | Receives the same cancelable `TpValueChangeEvent` as `tp-value-change`.                                                   |
| `storageKey` / `storage-key`     | string or `null` (property)   | `tp-theme`; `null` disables persistence. Controls with the same target and key share one store.                           |
| `target`                         | HTMLElement (property only)   | The document root. A scoped target themes only its subtree.                                                               |
| `size`                           | `sm` or `default`             | `default`. Button uses `icon-sm` / `icon`; Toggle group and Switch use their own sizes.                                   |
| `label`                          | string                        | "Dark mode" for the switch, "Theme" for the button and group.                                                             |
| `disabled`                       | Boolean                       | false; reaches the composed control.                                                                                      |
| `resolvedTheme`                  | readonly `light` or `dark`    | The scheme the preference resolves to on the target.                                                                      |

`tp-value-change` is cancelable. `event.detail.value` is the proposed preference and `event.detail.metadata.resolved` the scheme it resolves to; a canceled proposal changes nothing. The composed control's own change events stay inside the component.

```js
const switcher = document.querySelector('tp-theme-switcher');
switcher.onValueChange = (event) => {
  if (event.detail.value === 'system') event.preventDefault(); // keep an explicit choice
};
```

## How the preference is applied

`light` and `dark` set the target's inline `color-scheme` and its `data-theme` attribute. `system` sets `color-scheme: light dark` and removes `data-theme`, so the device decides, even inside an ancestor that forces one scheme. Tokens are never rewritten: every color role is a `light-dark()` pair, so the whole library, portaled popups included, follows the target's scheme. A change suppresses transitions for one frame so every color switches together, while the switcher's own thumb and icon motion still plays.

The preference is read from `localStorage` before the first render, but a module script runs after the first paint. To avoid a flash of the wrong scheme, apply it from `<head>`:

```html
<script>
  try {
    const value = localStorage.getItem('tp-theme');
    if (value === 'light' || value === 'dark') {
      document.documentElement.style.colorScheme = value;
      document.documentElement.dataset.theme = value;
    }
  } catch {}
</script>
```

The same logic is exported as `applyColorSchemePreference({ target, storageKey })`. For direct control without a component, use the store:

```js
import { colorSchemeStore } from '@tweakpad/ui';

const scheme = colorSchemeStore(); // document root, key `tp-theme`
scheme.subscribe(({ preference, resolved }) => console.log(preference, resolved));
scheme.set('dark');
```

## Parts, presentation and motion

| Part                    | Host                                       |
| ----------------------- | ------------------------------------------ |
| `theme-switcher`        | The element.                               |
| `theme-switcher-switch` | The composed Switch (switch variant).      |
| `theme-switcher-button` | The composed Button (button variant).      |
| `theme-switcher-group`  | The composed Toggle group (group variant). |
| `theme-switcher-option` | Each composed Toggle (group variant).      |
| `theme-switcher-icon`   | Each sun, moon or monitor Icon.            |

Each part has `-size-sm` and `-size-default` keys; `theme-switcher` also has `-variant-switch`, `-variant-button` and `-variant-group`. Dictionary replacement and `partPresentation` reach the composed controls, whose own parts (`switch`, `switch-thumb`, `button`, `toggle`) keep their recipes. The switch keeps a neutral `muted` track in both states, with no primary checked fill, and a `background` thumb, so it reads as the current mode.

The thumb slides with the Switch `thumb` motion role. Icons swap with a fast, standard-easing crossfade: the outgoing icon rotates a quarter turn and scales to zero while the incoming one turns in. The swap is the `icon` state motion role, so an external driver can replace it, and `motion-policy="reduce"` or the device's reduced-motion setting makes it instant.
