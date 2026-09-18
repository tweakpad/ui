# Button

`<tp-button>` is one action control. Its contract is UI Foundation §13.5 and UI Component Library §16.2. It does not own selection, open, or pending state.

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

`nativeAction` uses a native button by default. Set the JavaScript property to `false` for a non-native button host with synthesized Enter and Space activation. A disabled Button blocks activation. `focusableWhenDisabled` keeps it focusable and exposes `aria-disabled` without allowing activation.

## Content and naming

Default content is the visible label. Optional `icon-start` and `icon-end` slots render the leading and trailing marks. Marks are non-text visual content; keep decorative marks `aria-hidden="true"`. For an icon-only size, provide `aria-label`; the icon itself is not used as the accessible name. An unnamed Button emits a `tp-diagnostic` warning.

The public shadow parts are `button`, `button-leading-mark`, `button-label`, and `button-trailing-mark`. Each part also receives its `-variant-*` and `-size-*` presentation keys. The host publishes `data-disabled` and `data-focus-visible` state markers.

## Actions and forms

Each completed pointer or keyboard gesture activates at most once. A consumer may cancel the initiating `click` with `preventDefault()` before a submit or reset action runs. `type="button"` has no form action. A named submit button contributes its `name` and `value` as the submitter.

```html
<form>
  <tp-button type="submit" name="intent" value="save">Save</tp-button>
  <tp-button type="reset" variant="outline">Reset</tp-button>
</form>
```

`variant="link"` changes appearance only. Use an `<a href="…">` for navigation; do not use Button as a link substitute. Consumers own pending or loading state and may set `aria-busy` and `disabled` when appropriate.
