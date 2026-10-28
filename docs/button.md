# Button

`<tp-button>` is one action control or navigation target. It does not own selection, open, or pending state.

## Properties

| Property                | Attribute                              | Values                                                               | Default   |
| ----------------------- | -------------------------------------- | -------------------------------------------------------------------- | --------- |
| `variant`               | `variant`                              | `default`, `secondary`, `destructive`, `outline`, `ghost`, `link`    | `default` |
| `size`                  | `size`                                 | `xs`, `sm`, `default`, `lg`, `icon-xs`, `icon-sm`, `icon`, `icon-lg` | `default` |
| `type`                  | `type`                                 | `button`, `submit`, `reset`                                          | `button`  |
| `disabled`              | `disabled`                             | Boolean                                                              | `false`   |
| `focusableWhenDisabled` | `focusable-when-disabled`              | Boolean                                                              | `false`   |
| `nativeAction`          | `native-action` or JavaScript property | Boolean                                                              | `true`    |
| `ariaLabel`             | `aria-label`                           | Accessible name text                                                 | none      |
| `name`                  | `name`                                 | Submitter name                                                       | empty     |
| `value`                 | `value`                                | Submitter value                                                      | empty     |
| `icon`                  | JavaScript property                    | `IconDefinition`                                                     | none      |
| `iconPosition`          | `icon-position`                        | `leading`, `trailing`                                                | `leading` |
| `loadingPosition`       | `loading-position`                     | `leading`, `trailing`, `null`                                        | `null`    |
| `href`                  | `href`                                 | URL string or `null`                                                 | `null`    |
| `target`                | `target`                               | Browsing-context name or `null`                                      | `null`    |
| `rel`                   | `rel`                                  | Link-type token list or `null`                                       | `null`    |
| `download`              | `download`                             | Filename, empty string, or `null`                                    | `null`    |

`nativeAction` uses a native button by default. Set the JavaScript property to `false` for a non-native button host with synthesized Enter and Space activation. A disabled Button blocks activation. `focusableWhenDisabled` keeps it focusable and exposes `aria-disabled` without allowing activation.

## Content and naming

Default content is the visible label. For common single-mark cases, set `icon` with `iconPosition`, or set `loadingPosition` to compose the shared Spinner. `leading` and `trailing` are logical positions that follow writing direction.

Optional `icon-start` and `icon-end` slots remain available for custom marks. Mark sources use this precedence: `loadingPosition`, then `icon`, then the slots. Clearing a higher-priority property restores the next source without removing slotted content. The convenience icon is decorative because the label names the control; custom decorative marks should use `aria-hidden="true"`.

`loadingPosition` sets `aria-busy="true"` and renders one Spinner at the requested side. The Spinner inherits the Button's resolved text color in every variant and state. Loading does not set `disabled`; set `disabled` and, when appropriate, `focusableWhenDisabled` explicitly for a pending operation.

In an icon size only the marks are visible: the label content is hidden visually and stays the accessible name, so write the action as the label (or set `aria-label`). The icon itself is never used as the accessible name. An unnamed Button emits a `tp-diagnostic` warning.

In a text size (`xs`, `sm`, `default`, `lg`), a label with no text, no element and no `content` contract takes no space: the Button sets `hidden` on the `button-label` part, as it does on an empty mark. A trigger that shows only an `icon-start` icon and an `icon-end` chevron then has one gap between the marks and the icon padding at both edges. Name it with `aria-label`. Content added to the label later shows again.

```js
import { html } from 'lit';
import { chevronDownIcon } from '@tweakpad/ui/icons/chevron-down';
import { plusIcon } from '@tweakpad/ui/icons/plus';

html`<tp-button variant="ghost" aria-label="Add a section">
  <tp-icon slot="icon-start" .icon=${plusIcon}></tp-icon>
  <tp-icon slot="icon-end" .icon=${chevronDownIcon}></tp-icon>
</tp-button>`;
```

The public shadow parts are `button`, `button-leading-mark`, `button-label`, and `button-trailing-mark`. Each part also receives its `-variant-*` and `-size-*` presentation keys. The host publishes `data-disabled` and `data-focus-visible` state markers.

## Hover colors

Enabled Buttons derive hover color from existing roles, without hover-specific tokens. For filled variants, `light-dark(var(--tp-foreground), var(--tp-background))` is the mode-aware second operand; the variant keeps its paired foreground and boundary role.

| Variant       | OKLab hover mix                                                    |
| ------------- | ------------------------------------------------------------------ |
| `default`     | `primary` 80% with the mode-aware operand                          |
| `secondary`   | `secondary` 80% with the mode-aware operand                        |
| `destructive` | `destructive` 85% with the mode-aware operand                      |
| `outline`     | `input` 50% with `transparent`, over the outline fill              |
| `ghost`       | `input` 50% with `transparent`, over the surface behind the Button |

Each hover mix is a layer between the Button's own fill and its content, so a translucent mix lets that fill show through. Outline and ghost share the layer color and the `--tp-foreground` content color, but their layers sit on different fills. A ghost Button has no fill and no painted boundary, so its layer sits on the surface behind it.

An outline Button's layer sits on the outline fill, which depends on the color scheme. In the light scheme the fill is `--tp-background` inside a `--tp-border` boundary, so on the page background a hovered outline Button and a hovered ghost Button show the same color. In the dark scheme the outline takes the fill and boundary of Input and Select: `input` 30% with `transparent` inside an `--tp-input` boundary. The hover layer then adds to that fill, so a hovered outline Button carries more of the `input` color than a hovered ghost Button on the same surface.

Hover colors transition with the library's fast motion role and become instant under reduced motion. `link` has no painted background at rest or on hover, and disabled Buttons receive no hover mix.

## Actions and forms

Each completed pointer or keyboard gesture activates at most once. A consumer may cancel the initiating `click` with `preventDefault()` before a submit or reset action runs. `type="button"` has no form action. A named submit button contributes its `name` and `value` as the submitter.

```html
<form>
  <tp-button type="submit" name="intent" value="save">Save</tp-button>
  <tp-button type="reset" variant="outline">Reset</tp-button>
</form>
```

## Navigation

Set `href` to make the Button render a native `<a>` while retaining any visual `variant`. `target`, `rel`, and `download` are forwarded to that anchor. Link hosting ignores `type`, `name`, `value`, and `nativeAction`; removing `href` restores action behavior.

```html
<tp-button variant="link" href="/settings">Settings</tp-button>
<tp-button href="/report.csv" download="report.csv">Download report</tp-button>
```

`variant="link"` alone changes appearance only, so an action can still use link styling without becoming navigation. A disabled link retains its `href` for inspection but prevents navigation; `focusableWhenDisabled` controls whether it remains in the tab order.

## Part customization

`partContracts` configures each of `button`, `button-label`, `button-leading-mark`, and `button-trailing-mark`. Contracts accept `hostProperties`, `classHook`, `styleHook`, `content`, `elementReference`, and `renderDelegate`. The reference receives the actual rendered element and becomes `null` when it is replaced or disconnected. `focus()`, `blur()`, and `click()` follow the actual control.

A delegate must apply its supplied `bind` to the semantic host. A substituted action host retains Button semantics and receives synthesized Enter/Space activation. A Button with `href` requires an actual anchor; a non-anchor delegate emits a diagnostic and falls back to the native anchor. Owned action type, disabled/focus policy, ARIA, state and part markers, and the `hidden` state of the label and the marks survive neutral property and appearance overrides.

```js
import { html } from 'lit';
button.partContracts = {
  button: {
    hostProperties: { title: 'Save changes' },
    renderDelegate: ({ bind, content }) => html`<span ${bind}>${content}</span>`,
    elementReference: (element) => console.log(element),
  },
};
```

Consumer handlers run before the corresponding Button handler. Call `event.preventComponentHandling()` to suppress that component action while preserving native default prevention as a separate channel. `preventDefault()` still cancels a queued submit/reset. Disabled controls block activation before consumer click handlers. For a link, suppressing its click action also prevents navigation.
