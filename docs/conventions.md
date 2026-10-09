# Attribute, marker and event conventions

These rules apply to every component and widget (`src/components/`, `src/widgets/`).
`src/conventions.test.ts` checks the ones that can be read from the source; the rest are
reviewed against the live specification (Component Library §10 Variant system, §11 State
presentation; Foundation §5.3 ChangeEvent, Appendix B; the UI Widgets Specification for widgets).

## Properties and attributes

- A multi-word property is camelCase and declares its kebab-case attribute explicitly:
  `defaultValue` / `default-value`, `scrollRoot` / `scroll-root`.
- A property that mirrors a native DOM property keeps the DOM IDL spelling and the native
  attribute: `readOnly` / `readonly`, `srcSet` / `srcset`, `crossOrigin` / `crossorigin`,
  `autocomplete`, `colSpan` / `colspan`.
- Internal reactive state is declared with `state: true` (leading underscore by
  convention) and never becomes an attribute. Object-valued inputs use `attribute: false`.
- Boolean properties are positive (`showArrow`, `keepMounted`); a negative name is used only
  when the upstream contract defines it that way (`noAutofill`, `disableHoverablePopup`).
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

- Marker names come from the specification's state vocabulary (`open`/`closed`,
  `starting`/`ending`, `checked`/`unchecked`, `selected`, `highlighted`, `active`,
  `disabled`/`readonly`/`required`, `valid`/`invalid`/`dirty`/`touched`/`filled`/`focused`,
  `focus-visible`, `orientation`/`side`/`align`). One canonical name per state; no parallel
  aliases such as `data-state="open"`.
- Boolean markers are present only while the state is true and absent otherwise. Never
  serialize `"true"`/`"false"`; select the negative case with `:not([data-x])`.
- Enumeration markers carry exactly one declared value (`data-side="top"`,
  `data-orientation="vertical"`).
- Library-internal markers that are not part of a public contract use the `data-tp-` prefix.
- A disabled host is dimmed once, by the shared `:host([disabled])`/`:host([data-disabled])`
  rule in `TpElement`. Part recipes selected by the host's disabled state change cursor,
  background or color only; they never apply `--tp-opacity-disabled` again. Item-level
  parts whose own host is not disabled (menu items, tabs, select options) dim themselves.

## Events

- A cancelable proposal is `tp-<noun>-change` (`tp-value-change`, `tp-open-change`); the
  settled notification after motion is `tp-<noun>-change-complete`. Past-tense suffixes
  (`-changed`) are not used.
- Event detail carries `{ value, previousValue, reason, sourceEvent }` for value lanes, and
  `reason` is one of the registered change reasons (Foundation Appendix B.8 plus the
  component's own registry entries). `programmatic` is never a neutral fallback.
- `tp-diagnostic` detail is `{ code, message, severity }`; the code is prefixed with the
  component name (`tabs-missing-panel`).
- `tp-field-value` is the internal coordination event between a form control and its Field;
  it always carries the same detail as `tp-value-change`.
