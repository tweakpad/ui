# Attribute, marker and event conventions

These rules apply to every component and widget.

## Properties and attributes

- A multi-word property is camelCase and declares its kebab-case attribute explicitly:
  `defaultValue` / `default-value`, `scrollRoot` / `scroll-root`.
- A property that mirrors a native DOM property keeps the DOM IDL spelling and the native
  attribute: `readOnly` / `readonly`, `srcSet` / `srcset`, `crossOrigin` / `crossorigin`,
  `autocomplete`, `colSpan` / `colspan`.
- Internal reactive state is declared with `state: true` (leading underscore by
  convention) and never becomes an attribute. Object-valued inputs use `attribute: false`.
- Boolean properties are positive (`showArrow`, `keepMounted`), except a few established
  negative names (`noAutofill`, `disableHoverablePopup`).
- A property that controls a layout relationship uses Alignment terminology (`align`,
  `alignment`); one that selects a discrete logical region uses Position terminology
  (`leading`, `trailing`).

## Reflection

- Canonical variant axes (`variant`, `size`, `orientation`, `align`, `side`) reflect on the
  public host so siblings, stylesheets and tooling observe the authored value.
- Configuration attributes (`keepMounted`, `nativeAction`, `placeholder`, offsets, delays)
  do not reflect unless a stylesheet or sibling must read them from the host.
- State is never expressed by reflecting a property; it is published as a `data-*` marker.

## State markers

- Marker names come from one shared state vocabulary (`open`/`closed`,
  `starting`/`ending`, `checked`/`unchecked`, `selected`, `highlighted`, `active`,
  `disabled`/`readonly`/`required`, `valid`/`invalid`/`dirty`/`touched`/`filled`/`focused`,
  `focus-visible`, `orientation`/`side`/`align`). One canonical name per state; no parallel
  aliases such as `data-state="open"`.
- Boolean markers are present only while the state is true and absent otherwise. Never
  serialize `"true"`/`"false"`; select the negative case with `:not([data-x])`.
- Enumeration markers carry exactly one declared value (`data-side="top"`,
  `data-orientation="vertical"`).
- Library-internal markers that are not part of a public contract use the `data-tp-` prefix.
- Published geometry outputs are read-only custom properties on the host, named
  `--tp-<component>-<measure>` (`--tp-cursor-x`, `--tp-cursor-stuck-width`); they are never part
  of the token set and never inputs.
- A disabled host is dimmed once, by the shared `:host([disabled])`/`:host([data-disabled])`
  rule in `TpElement`. Part recipes selected by the host's disabled state change cursor,
  background or color only; they never apply `--tp-opacity-disabled` again. Item-level
  parts whose own host is not disabled (menu items, tabs, select options) dim themselves.

## Events

- A cancelable proposal is `tp-<noun>-change` (`tp-value-change`, `tp-open-change`); the
  settled notification after motion is `tp-<noun>-change-complete`. Past-tense suffixes
  (`-changed`) are not used.
- Event detail carries `{ value, previousValue, reason, sourceEvent }` for value lanes, and
  `reason` is one of the shared change reasons or a reason documented on the component's
  page. `programmatic` is never a neutral fallback.
- `tp-diagnostic` detail is `{ code, message, severity }`; the code is prefixed with the
  component name (`tabs-missing-panel`).
- `tp-field-value` is the internal coordination event between a form control and its Field;
  it always carries the same detail as `tp-value-change`.
- `tp-field-validity` (empty detail) tells the enclosing Field that a control's validity
  changed without a value change, such as a rejected File upload item; the Field revalidates
  under its timing policy.
- A non-value lane is `tp-<noun>-<lane>-change` with the same detail shape
  (`tp-cursor-state-change` carries `{ value, previousValue, zone, reason, sourceEvent }`;
  `tp-cursor-follow-change` carries `{ value, previousValue, reason, sourceEvent }`). `hover` is
  the reason for pointer entry into and exit from a declared region.
