# Input Group

Input Group joins one Input or Textarea with text, icons, shortcuts and independent actions. It owns the outside border and focus/invalid indication. The editor retains its native editing, validation, form and selection behavior; actions remain real Buttons.

Use Field for the editor's label, description and error. A group label does not replace an editor label. Supply exactly one editor in the default slot; multiple or absent editors emit `tp-composition-diagnostic` with `{ component, expected, actual }` and set `data-invalid-composition`.

| Property / attribute               | Type                                                              | Default        | Meaning                                                                |
| ---------------------------------- | ----------------------------------------------------------------- | -------------- | ---------------------------------------------------------------------- |
| `addonPosition` / `addon-position` | `inline-start`, `inline-end`, `block-start`, `block-end`          | `inline-start` | Position of the compatibility `prefix` slot.                           |
| `actionSize` / `action-size`       | `xs`, `sm`, `icon-xs`, `icon-sm`                                  | `xs`           | Default for Buttons in `action`; an explicitly configured Button wins. |
| `actionVariant` / `action-variant` | `ghost`, `default`, `secondary`, `destructive`, `outline`, `link` | `ghost`        | Default for Buttons in `action`; an explicitly configured Button wins. |
| `invalid`                          | boolean                                                           | `false`        | Mark the group invalid, in addition to the editor's invalid state.     |

The default slot accepts one `tp-input`, `tp-text-area`, native input/textarea or editable element. `inline-start`, `inline-end`, `block-start` and `block-end` expose all four logical edges independently. `prefix` follows `addonPosition`; `suffix` is always at the inline end. `action` sits after the editor, before the inline-end addon. Empty regions occupy no space. Put a Button in a block edge for a multiline composer footer; it retains its own Button configuration.

Clicking a noninteractive addon focuses the editor. Interactive addons and actions keep their own focus and activation. Disabling or making the editor read-only never disables independent actions. The group has no second value, submit event, or validation controller: configure and observe those APIs on the editor or Form.

Public presentation parts are `input-group`, `input-group-control`, `input-group-addon`, `input-group-action`, and `input-group-text`. The control and action parts target their actual native elements; text targets plain slotted text containers. Root state markers `data-invalid` and `data-disabled` reflect the editor; addon `data-position` exposes its logical edge. These markers are styling hooks, not writable state APIs.

Default spacing, radius, typography and boundary paint use the shared theme and presentation dictionary. Use the normal theme or `partPresentation` mechanisms to customize the composition; there are no per-control spacing attributes. Moving or removing a control/action releases group-owned presentation and inherited action defaults without overwriting authored settings.
