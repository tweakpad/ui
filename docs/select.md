# Select

`tp-select` chooses from a finite list without an editable search field. Use
`tp-combobox` when the user needs to filter choices by typing into an input, or
`tp-native-select` when native browser selection is the intended interaction.

```html
<script type="module">
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/styles.css';
</script>
<tp-field label="Fruit" description="Choose a fruit">
  <tp-select name="fruit" placeholder="Choose a fruit">
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
    <option value="cherry">Cherry</option>
  </tp-select>
</tp-field>
```

The default selected-item alignment is established when the popup opens. Hovering
an option changes its highlight without moving the popup or scrolling the list.
Keyboard navigation reveals the focused option within the list.

Native `option` and `optgroup` children are source declarations. Select renders
their text and values through its own semantic option parts. `items` supports
rich labels and arbitrary values. Import Lit's `html` for rich content and use
the library's actual Icon, Badge, and other components inside that content.
Icon's `size` accepts a CSS length; use `size="var(--tp-icon-size-sm)"` for the
source's small artwork and inherited sizing overrides.

```js
select.items = [
  {
    type: 'group',
    label: 'Fruit',
    items: [
      { value: 'apple', label: 'Apple' },
      { value: 'banana', label: 'Banana', disabled: true },
    ],
  },
  { type: 'separator' },
  { value: 'other', label: 'Other' },
];
```

Supply either `defaultValue` for an uncontrolled Select or `value` plus an owner
that accepts proposals. Ownership is fixed when the component initializes.
The getter exposes committed state, including during a callback. A controlled
owner publishes an accepted proposal synchronously; a later listener can still
veto the proposal. DOM events bubble across the shadow boundary.

```js
select.value = 'apple'; // configure before connecting the element
select.onValueChange = (event) => {
  if (event.defaultPrevented || event.detail.cancelled) return;
  select.value = event.detail.value;
  queueMicrotask(() => console.log('Committed:', select.value));
};
```

For multiple selection, set `multiple` and use an array value. Selecting an
option toggles it while keeping the popup open. Values stay unique and retain
selection order. A named multiple Select contributes one form entry per selected
value, in that order. `isItemEqual` defines identity for object values; labels and
the form's serialized values are separate concerns. Form serialization uses
`String(value)`, including unmatched controlled values.

## Root properties

| Property / attribute                                 | Type                                                                                                | Default                              | Behavior                                                                                                                                                                                                                                                     |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `value` / `value`                                    | unknown or unknown[]; attribute is a string                                                         | uncontrolled                         | Controlled committed selection. `null` is empty for single selection.                                                                                                                                                                                        |
| `defaultValue` / `default-value`                     | unknown or unknown[]; attribute is a string                                                         | `undefined` (effective empty `null`) | Uncontrolled initial/reset selection; multiple empty normalizes to `[]`.                                                                                                                                                                                     |
| `multiple`                                           | boolean                                                                                             | `false`                              | Ordered unique multiple selection. Configure ownership/domain before connection.                                                                                                                                                                             |
| `items`                                              | readonly SelectEntry[]                                                                              | native children                      | Source records, grouped records, separator records, or scalar choices.                                                                                                                                                                                       |
| `isItemEqual`                                        | `(a, b) => boolean`                                                                                 | `Object.is`                          | Equality used for selection, duplicates and highlight identity.                                                                                                                                                                                              |
| `itemToText`                                         | `(value) => string`                                                                                 | scalar string                        | Text for typeahead and fallback display.                                                                                                                                                                                                                     |
| `itemToLabel`                                        | `(value) => unknown`                                                                                | text resolver                        | Rich fallback label. Explicit item labels take precedence.                                                                                                                                                                                                   |
| `placeholder`                                        | string                                                                                              | `''`                                 | Empty Value content.                                                                                                                                                                                                                                         |
| `label`                                              | string                                                                                              | `'Options'`                          | Accessible fallback name; Field supplies its associated name.                                                                                                                                                                                                |
| `identifier`                                         | string                                                                                              | generated                            | Trigger identifier; list uses a related unique identifier.                                                                                                                                                                                                   |
| `open`                                               | boolean or undefined                                                                                | uncontrolled                         | Controlled open state, independent of value control.                                                                                                                                                                                                         |
| `defaultOpen` / `default-open`                       | boolean                                                                                             | `false`                              | Initial uncontrolled opening.                                                                                                                                                                                                                                |
| `onValueChange`                                      | value event callback                                                                                | none                                 | Selection proposal before DOM notification.                                                                                                                                                                                                                  |
| `onOpenChange`                                       | surface event callback                                                                              | none                                 | Opening/closing proposal, with the same cancelable event as DOM notification.                                                                                                                                                                                |
| `onOpenChangeComplete`                               | `(open: boolean) => void`                                                                           | none                                 | Once after each completed accepted transition.                                                                                                                                                                                                               |
| `nativeAction` / `native-action`                     | boolean                                                                                             | `true`                               | Trigger's native button action policy; set false with a nonnative render delegate.                                                                                                                                                                           |
| `highlightItemOnHover` / `highlight-item-on-hover`   | boolean                                                                                             | `true`                               | Pointer movement highlights enabled options.                                                                                                                                                                                                                 |
| `modal`                                              | boolean                                                                                             | `true`                               | Owns outside inertness and non-touch scroll-lock leases while open.                                                                                                                                                                                          |
| `keepMounted` / `keep-mounted`                       | boolean                                                                                             | `false`                              | Retains inactive popup content after exit.                                                                                                                                                                                                                   |
| `container`                                          | element, ShadowRoot, ref, resolver or null                                                          | `null`                               | Optional explicit portal; null keeps the popup in the host's top layer. Container must share the owner document.                                                                                                                                             |
| `initialFocus`                                       | element/ref, resolver, ordered tabbable index, `'first'`, `'trigger'`, `'popup'`, `'none'`, boolean | `'trigger'`                          | Default control focus; keyboard opening starts at the selected/first enabled option. `first` also requests that option on pointer opening. True/null resolver results use the same default; undefined/false suppresses focus.                                |
| `finalFocus`                                         | element/ref, resolver, `'trigger'`, `'previous'`, `'none'`, boolean                                 | `'trigger'`                          | Closing return target; false/none suppresses restoration, true uses default. Resolvers receive the closing interaction type, or an empty string for programmatic changes. Returning undefined/false suppresses focus; null or an empty ref uses the default. |
| `scrollUpKeepMounted` / `scroll-up-keep-mounted`     | boolean                                                                                             | `false`                              | Independently retain inactive upward scroll control.                                                                                                                                                                                                         |
| `scrollDownKeepMounted` / `scroll-down-keep-mounted` | boolean                                                                                             | `false`                              | Independently retain inactive downward scroll control.                                                                                                                                                                                                       |

`disabled`, `readOnly` (`readonly`), `required`, `invalid`, `name`, `formOwner`
(`form`), and `inputElementReference` use the shared FormControl binding.
`autoComplete` (`autocomplete`) defaults to the empty string. `inputElement`
exposes the visually hidden native autofill channel; `triggerElement` is the
visible focus/label target. `form`, `labels`, `validity`, `validationMessage`,
`checkValidity()`, `reportValidity()`, `focus()` and `blur()` retain their shared
FormControl meanings. Disabled fieldsets and Field context preserve independently
authored flags. Read-only Select can open and navigate but cannot change value.

## Positioning and hidden constituents

The Library flattens Foundation Positioner, Portal, Arrow, Backdrop and Indicator
configuration onto their nearest public owners. These options preserve their
behavior without adding catalog identities.

| Root property / attribute                           | Type                                                                | Default                   |
| --------------------------------------------------- | ------------------------------------------------------------------- | ------------------------- |
| `placement`                                         | logical side and alignment separated by a space                     | `'block-end start'`       |
| `side`                                              | top/right/bottom/left/inline-start/inline-end/block-start/block-end | placement side            |
| `align`                                             | start/center/end                                                    | placement alignment       |
| `sideOffset` / `side-offset`                        | number                                                              | three theme spacing units |
| `alignOffset` / `align-offset`                      | number                                                              | 0                         |
| `alignItemWithTrigger` / `align-item-with-trigger`  | boolean                                                             | `true`                    |
| `anchor`                                            | element, virtual anchor, ref, resolver or null                      | Trigger                   |
| `disableAnchorTracking` / `disable-anchor-tracking` | boolean                                                             | `false`                   |
| `collisionAvoidance`                                | `{side, align, fallbackAxisSide}`                                   | flip, flip, none          |
| `collisionBoundary`                                 | clipping ancestors, element(s), rectangle                           | `'clipping-ancestors'`    |
| `collisionPadding`                                  | number or per-side record                                           | three theme spacing units |
| `sticky`                                            | boolean                                                             | `false`                   |
| `positionMethod` / `position-method`                | absolute/fixed                                                      | `'absolute'`              |
| `showArrow` / `show-arrow`                          | boolean                                                             | `false`                   |
| `arrowPadding` / `arrow-padding`                    | number                                                              | two theme spacing units   |
| `arrowWidth` / `arrow-width`                        | number                                                              | four theme spacing units  |
| `arrowHeight` / `arrow-height`                      | number                                                              | two theme spacing units   |
| `arrowTipRadius` / `arrow-tip-radius`               | number                                                              | 0                         |
| `arrowPath` / `arrow-path`                          | SVG path string                                                     | generated triangle        |
| `arrowBorderColor` / `arrow-border-color`           | CSS color                                                           | none                      |
| `arrowBorderWidth` / `arrow-border-width`           | number                                                              | 0                         |
| `showBackdrop` / `show-backdrop`                    | boolean                                                             | `false`                   |

Item alignment attempts to place the selected/highlighted option against the
Trigger. Collision correction also adjusts list scroll; unusable items or
insufficient room fall back to ordinary placement. Disable item alignment when
demonstrating independent side and offset behavior. `updatePosition()` explicitly
remeasures even when automatic tracking is disabled. Anchor loss requests close.

## Option, group and separator records

An option has `value`, optional `label`/`text`, `disabled=false`,
`nativeAction=false`, and `indicatorKeepMounted=false`. `partContract` configures
its Option, `textContract` its Foundation ItemText, and `indicatorContract` its
Foundation Indicator. Text is the typeahead string when the label is rich content.
Later duplicate values are diagnosed and excluded from navigation and selection.

A group has `type:'group'`, `items`, optional `label`,
`partContract`, and an independent `labelContract`. A separator has
`type:'separator'`, `orientation='horizontal'`, and `partContract`.
Option records are declarations; no separate custom element registration is
required. The `items` array is the complete source, while mounted option hosts
and highlighted/selected state remain distinct.

## Events, actions and lifecycle

`tp-value-change` carries `value`, `previousValue`, `reason`, `sourceEvent`,
`cancelled`, `allowPropagation`, and optional metadata. Item activation uses
`item-press`. Cancel with `event.preventDefault()` or `event.detail.cancelled`.
A single selection closes only after the selection commits; multiple selection
stays open. A controlled rejection keeps the committed markers and form value.

`tp-open-change` uses the same value detail shape and adds `trigger` and
`detail.preventUnmountOnClose()`. The latter retains an accepted closed popup
after exit; it has no effect on a canceled close. Reasons include trigger press,
keyboard, item press, outside press, Escape, focus outside, disabled and anchor
removal. Opening and closing proposals can be controlled and canceled separately
from selection.

`actions.open()`, `actions.close()` and `actions.unmount()` provide an imperative
handle. `setOpen(boolean, reason?, event?)`, `close()`, and `unmount()` are also
available directly. Unmount while open proposes close before removing content.
`popupElement`, `listElement`, `highlightedValue`, and `presenceState` expose the
current binding; absent content has no stale element. Presence is absent,
starting, open, ending, or retained. Inactive content is inert and inaccessible.

The `select.presence` motion request supports enter/exit and participates in
blocking completion. Use the common `tp-motion-request`, `motionPolicy`
(`motion-policy`), and shared motion tokens. A new transition or disconnection
cancels superseded work. `tp-diagnostic` reports invalid ownership/duplicate
source usage; it is not a selection event.

## Parts and customization

Published parts are `select`, `select-trigger`, `select-value`, `select-content`,
`select-list`, `select-group`, `select-label`, `select-option`, `select-separator`,
`select-scroll-up-button`, and `select-scroll-down-button`.

Use `partPresentation` or the presentation dictionary for replaceable appearance.
Select has no visual size/variant axis; use public part presentation for deliberate
consumer sizing. Source light/dark defaults reuse shared input/surface recipes.
Tokens, scoped themes and dictionaries reach explicit portals as well as local
shadow parts.

Each `partContracts[name]` accepts `renderDelegate({state, properties, content,
bind})`, `hostProperties`, `classHook`, `styleHook`, `elementReference`, and
`content`. Put `${bind}` on the delegate's semantic host. Per-record contracts
refine their specific repeated constituent. Hidden Foundation `arrow`, `backdrop`,
`indicator`, and `item-text` contracts use the same binding, with no new Library
presentation identity. Preserve the appropriate `nativeAction` policy when
replacing a native action host.

Component-owned role, ARIA, native state, part and data markers are protected.
Consumer handlers run before component handling. Native `preventDefault()` and
`preventComponentHandling()` are separate: the latter cancels the component's
initiating action. References are cleared on actual replacement/disconnection.
State hooks include open/closed, selected, highlighted, disabled, invalid,
placeholder, presence, and starting/ending style; use their presence as boolean
markers instead of string-valued false.

## Keyboard and composition

Enter, Space or Alt+ArrowDown opens. Arrow keys move through enabled options;
Home/End go to the boundaries. Typeahead appends exact keys, matches a locale lower-case prefix, and resets after 750 ms, on opening, or immediately after unmatched non-space input. Repeated-key cycling is available only when no non-null label starts with two identical characters. Printable text performs typeahead and does not
filter the list. Composition input does not select. Enter/Space activates the
highlighted option. Escape closes without selecting; Tab closes and continues
normal traversal. Scroll controls respond only while their direction has overflow
and stop repeating when the pointer leaves, the popup closes or the host detaches.

Use actual `tp-field` for labels/descriptions/errors, `tp-icon` for rich choice
artwork, `tp-button` for adjacent actions and `tp-dialog` for modal composition.
Root/part API changes do not require reproducing any of these components locally.
