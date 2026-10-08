# Select

`tp-select` chooses from a finite list. Add `searchable` for an editable query.
Both modes use the same collection, popup, selection and theme owners. Use
`tp-native-select` for native browser selection.

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
`autoComplete` (`autocomplete`) defaults to the empty string. `noAutofill`
(`no-autofill`, default `false`, also inherited from an enclosing Field or Form)
opts both the autofill channel and the searchable query out of browser and
password-manager autofill. `inputElement`
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

## Searchable selection

Searchable Select combines an editable query with a single selected value or an ordered set of values. The query, selection and open state are independent. Its editor uses Input Group; Trigger, Clear and Chip Remove use the library Button owner.

```js
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpSelect, TpField } from '@tweakpad/ui';

const field = new TpField();
field.label = 'Fruit';
const fruit = new TpSelect();
fruit.searchable = true;
fruit.name = 'fruit';
fruit.placeholder = 'Choose fruit';
fruit.items = ['Apple', 'Banana', 'Cherry', 'Grape'];
field.append(fruit);
document.body.append(field);
```

Set a controlled property before connection to select that lane's controlled mode. The owner accepts a proposal synchronously by updating the corresponding property in its callback. Leaving the proposal unaccepted or cancelling it restores that lane. Use `defaultValue`, `defaultInputValue` and `defaultOpen` for uncontrolled defaults; these are sampled initially and restored on form reset. `multiple` determines the selection shape: `null` or one value, versus an ordered unique array.

| Property                                     | Type / default                                                                  | Attribute                                                                      |
| -------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `value`, `defaultValue`                      | unknown; uncontrolled empty                                                     | `value`, `default-value` accept scalar text; use properties for records/arrays |
| `inputValue`, `defaultInputValue`            | string; uncontrolled `''`                                                       | `input-value`, `default-input-value`                                           |
| `open`, `defaultOpen`                        | boolean; uncontrolled `false`                                                   | `open`, `default-open`                                                         |
| `multiple`                                   | boolean; `false`                                                                | `multiple`                                                                     |
| `items`                                      | flat/grouped records or `SelectItemCollection`; registered options when absent  | property only                                                                  |
| `filteredItems`                              | authoritative ordered results; absent                                           | property only                                                                  |
| `filter`                                     | `(item, query, text) => boolean`; built-in collation filter; `null` disables it | property only                                                                  |
| `limit`, `locale`                            | integer `-1` means unlimited; inherited locale                                  | `limit`, `locale`                                                              |
| `matching`                                   | `'contains'`, `'prefix'`, `'exact'` or ranked `'fuzzy'`; `'contains'`           | `matching`                                                                     |
| `source`                                     | search source supplying results (server or another engine); absent              | property only                                                                  |
| `searchDelay`                                | milliseconds without typing before the source is queried; `0`                   | `search-delay`                                                                 |
| `highlightMatches`                           | marks matched ranges in option text; `false`                                    | `highlight-matches`                                                            |
| `matchFields`                                | `(item) => string \| string[]` extra searchable text, such as keywords; absent  | property only                                                                  |
| `messages`                                   | `{loading, error, empty, results(count)}` replacing the English texts           | property only                                                                  |
| `itemToText`, `itemToLabel`                  | text/form serializer and rich render resolver; scalar conversion                | property only                                                                  |
| `isItemEqual`                                | equality callback; `Object.is`                                                  | property only                                                                  |
| `placeholder`, `label`                       | `''`, `'Options'`; Field supplies its own accessible label                      | same names                                                                     |
| `identifier`, `autoComplete`                 | generated editor/list ID prefix; optional autofill hint                         | `identifier`, `autocomplete`                                                   |
| `autoHighlight`                              | `false`, `true` after typing, or `'always'`; `false`                            | `auto-highlight` (present = `true`, or `always`)                               |
| `keepHighlight`, `highlightItemOnHover`      | `false`, `true`                                                                 | `keep-highlight`, `highlight-item-on-hover`                                    |
| `loopFocus`, `grid`                          | `true`, `false`                                                                 | `loop-focus`, `grid`                                                           |
| `completionMode`                             | `'list'`, `'both'`, `'inline'`, `'none'`; `'list'`                              | `completion-mode`                                                              |
| `openOnInputClick`, `searchable`             | `true`, `false`                                                                 | `open-on-input-click`, `searchable`                                            |
| `closeOnSelect`                              | single closes; multiple remains open unless explicitly configured               | `close-on-select`                                                              |
| `clearBehavior`                              | `'query'`, `'selection'`, `'both'`, `'contextual'`; contextual                  | `clear-behavior`                                                               |
| `showTrigger`, `showClear`, `showChipRemove` | `true`, `false`, `true`; independent constituent visibility                     | `show-trigger`, `show-clear`, `show-chip-remove`                               |
| `nativeAction`, `clearKeepMounted`           | Trigger native action `true`; retained Clear `false`                            | `native-action`, `clear-keep-mounted`                                          |
| `virtualized`, `mountedItems`                | `false`; optional explicit mounted window within complete `items`               | `virtualized`; window property only                                            |
| `inline`, `loading`, `modal`                 | all `false`                                                                     | same names                                                                     |
| `keepMounted`                                | `false`; retain a closed inert surface                                          | `keep-mounted`                                                                 |

### Matching and search sources

Searchable Select shares [Text search](autocomplete.md#matching) with Autocomplete and Command palette. `matching` selects how the query matches options: `contains` (the default; locale collation, so case, accents and punctuation are ignored), `prefix` (every query word begins a word), `exact`, or `fuzzy`, which ranks options by relevance and tolerates typos and words typed out of order. Results come from, in order: `filteredItems`, a `source`, a `filter`, and otherwise `matching`; `limit` applies last. With `source`, the source's results are the options: a query waits `searchDelay` milliseconds without typing, a newer query aborts the previous one, previous results stay visible while loading, and `searchStatus` (`idle`, `loading`, `loaded`, `error`) with the `tp-search-status` and `tp-search-error` events report progress. While loading the list is busy and a status row (spinner and text) replaces the empty state; after a failure it shows the error text. `highlightMatches` marks matched text in the `select-match` part.

Filtering retains selected values even when their options are not visible. Both Select modes preserve the existing `SelectEntry` shape: `{value, label?, text?, disabled?, index?, row?}` and groups `{type:'group', label?, items}`. Object-valued choices use `{value: record, label: 'Display text'}`; use the factory for arbitrary application records with primitive IDs. `filteredItems` and `mountedItems` contain chosen values or factory-owned records. This avoids interpreting the same object differently between searchable and plain modes.

`createSelectItems(data, {getValue, getLabel, diagnostic?})` lazily projects application records onto non-null primitive identifiers. It accepts absent loading data, flat data or groups, ignores holes and retains the first duplicate. Leaf records cannot themselves declare an `items` array. The returned collection provides `value`, `itemLabel`, `hasValue` and `label` (including equality and fallback arguments). `createSelectFilter({locale?, sensitivity?, ignorePunctuation?, ...Intl.CollatorOptions})` exposes locale-aware `contains`, `startsWith` and `endsWith`.

In list mode, highlighting does not change text. Both mode filters and shows a temporary selected completion suffix; inline completion keeps the item set static; none keeps it static without a completion. IME input does not navigate or commit prematurely. Arrow keys, Home/End and Enter operate through the editor's active descendant while DOM focus stays in the editor. Grid records can specify `row`; actual Row containers match those logical rows. Virtualized mode requires the full ordered source; `mountedItems` controls only rendering. `onItemHighlighted` supplies the source value, logical index and reason so a window owner can bring an unmounted active record into view.

Single selection fills text unless that lane rejects it. Multiple selection clears the query with `input-clear` and metadata `itemPress: true`; automatic cleanup omits that flag. Contextual Clear clears a nonempty query, otherwise selection. Both Clear proposes both lanes atomically: cancelling either proposal leaves both committed values unchanged. Chip Remove has an accessible value-specific name; directional keys move between chips, and Backspace/Delete remove through the same selection owner.

| Floating property                           | Type / default                                                                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container`                                 | element, shadow root, ref or resolver; `null` keeps the surface local                                                                                      |
| `placement`, `side`, `align`                | `'block-end start'`; explicit logical side/alignment override placement                                                                                    |
| `sideOffset`, `alignOffset`                 | three theme spacing units for sideOffset; `0` for alignOffset; number or geometry resolver                                                                 |
| `anchor`                                    | element/virtual geometry, ref or resolver; editor group                                                                                                    |
| `positionMethod`                            | `'absolute'` or `'fixed'`; absolute                                                                                                                        |
| `collisionAvoidance`                        | `{side:'flip', align:'flip', fallbackAxisSide:'none'}`                                                                                                     |
| `collisionBoundary`, `collisionPadding`     | clipping ancestors; three theme spacing units or physical-side padding record                                                                              |
| `sticky`, `disableAnchorTracking`           | `false`, `false`                                                                                                                                           |
| `showArrow`, `arrowPadding`, `showBackdrop` | `false`, two theme spacing units, `false`                                                                                                                  |
| `initialFocus`, `finalFocus`                | `'trigger'`: editor default; element, ref, interaction resolver, boolean, numeric popup index or `'trigger'`, `'first'`, `'popup'`, `'previous'`, `'none'` |

Floating attributes use kebab case; element, record and resolver bindings use properties. Offset resolvers receive `{side, align, anchor:{width,height}, positioner:{width,height}}` during positioning. Modal mode preserves the editable control, contains Tab focus and leases outside inertness/scroll locking. Arrow and Backdrop visibility do not enable modality. Inline mode renders an in-flow list without its own portal, positioner or popup; accepted closing of its surrounding Dialog, Alert Dialog, Drawer or Popover resets transient query/highlight.

Form submission contains selected values, never the query. Multiple values submit repeated entries in selection order; Field-provided names and explicit `formOwner` work through the common form owner. Required validates selection. Disabled controls do not submit; read-only selection submits and remains focusable. Reset and form state restoration resolve records through the source and serializer. Inherited Foundation APIs include `name`, `formOwner`, `disabled`, `readOnly`, `required`, `invalid`, validity methods, Field association, input references, `motionPolicy`, `partPresentation` and `partContracts`.

| Method / callback                                                 | Contract                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------- |
| `setOpen(open, reason?, sourceEvent?)`, `actions.open/close()`    | cancelable open proposal                                        |
| `actions.unmount()`                                               | release retained closed content; does not close an open surface |
| `clear(sourceEvent?)`, `removeChip(value, sourceEvent?)`          | proposals through the configured lane(s)                        |
| `updatePosition()`                                                | update current geometry                                         |
| `inputElement`, `popupElement`, `listElement`, `highlightedValue` | current semantic targets/value; absent targets are `null`       |
| `onValueChange` / `tp-value-change`                               | selection proposal                                              |
| `onInputValueChange` / `tp-input-value-change`                    | independent text proposal                                       |
| `onOpenChange` / `tp-open-change`                                 | open proposal                                                   |
| `onOpenChangeComplete`                                            | accepted presence completion                                    |
| `onItemHighlighted`                                               | `(value, {index, reason})`                                      |
| `searchStatus`, `tp-search-status`                                | search source status; event detail `{status, query, total}`     |
| `tp-search-error`                                                 | source failure; detail `{error, query}`                         |

Value/text events include value, previousValue, reason, sourceEvent, cancellation and metadata. `preventDefault()` or event cancellation rejects a proposal. Public initiating handlers run before component handling; `preventComponentHandling()` suppresses that handling separately from native `preventDefault()`.

The optional authored `tp-select-option` registers a source value without adding another interactive surface. It accepts required `value` (a string attribute or any property value), optional rich `label`, `index`, `row`, `disabled=false`, `nativeAction=false`, `indicatorKeepMounted=false`, `onClick`, `textContract`, `indicatorContract` and `partContracts['select-option']`. Its text content is the label fallback. Native `option`, `optgroup` and `hr` sources are supported, including inherited optgroup disability. Their rendered options share the same model, keyboard, selection and presence owners.

The generated `tp-select-trigger`, `tp-select-clear` and `tp-select-chip-remove` inherit Button. Their own `partContracts.button` is a terminal override; Root ActionPart contracts are forwarded to the actual Button semantic control. Trigger/Clear remain out of the Tab sequence; Chip Remove remains keyboard accessible. Their icons use the existing Icon owner. Canonical Select action recipes and parent presentation contributions are consumed by the same Button controller; child terminal hooks apply last.

Parts: `select`, `select-anchor`, `select-input`, `select-trigger`, `select-clear`, `select-content`, `select-list`, `select-collection`, `select-option`, `select-group`, `select-label`, `select-separator`, `select-empty-state`, `select-status`, `select-match`, `select-chip-list`, `select-chip`, `select-chip-remove`; optional structural `select-row`, `select-list-container`, `item-text`, `indicator`, `arrow`, `backdrop`. Slots: `label` and `empty`; unnamed content supplies registered options.

Each part contract supports render delegates with the protected behavior bundle, host properties, state-dependent class/style/content hooks and an actual semantic element reference. Option/Group configuration can provide individual contracts; references release on removal. `partPresentation` and the shared presentation dictionary customize appearance without replacing state/focus/form owners. Part snapshots expose committed open/value/inputValue/multiple/disabled/readOnly/required/invalid/loading/empty/presence; Options add selected/highlighted/index/value. Open/closed, selected/highlighted/disabled and presence markers follow that snapshot. Retained content is hidden and inert. Motion, positioning, portal inheritance and observers use the owning document/window and clean up on disconnection.

Migration: the separate Combobox tag, class and catalog entry are removed. Use `TpSelect` with `searchable = true`, `createSelectItems`, `createSelectFilter`, and `select-*` parts. Plain Select defaults remain unchanged. Native Select remains a native selection control.
