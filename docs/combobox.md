# Combobox

Combobox combines an editable query with a single selected value or an ordered set of values. The query, selection and open state are independent. Its editor uses Input Group; Trigger, Clear and Chip Remove use the library Button owner.

```js
import '@tweakpad/ui/styles.css';
import '@tweakpad/ui/register';
import { TpCombobox, TpField } from '@tweakpad/ui';

const field = new TpField();
field.label = 'Fruit';
const fruit = new TpCombobox();
fruit.name = 'fruit';
fruit.placeholder = 'Choose fruit';
fruit.items = ['Apple', 'Banana', 'Cherry', 'Grape'];
field.append(fruit);
document.body.append(field);
```

Set a controlled property before connection to select that lane's controlled mode. The owner accepts a proposal synchronously by updating the corresponding property in its callback. Leaving the proposal unaccepted or cancelling it restores that lane. Use `defaultValue`, `defaultInputValue` and `defaultOpen` for uncontrolled defaults; these are sampled initially and restored on form reset. `multiple` determines the selection shape: `null` or one value, versus an ordered unique array.

| Property                                     | Type / default                                                                   | Attribute                                                                      |
| -------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `value`, `defaultValue`                      | unknown; uncontrolled empty                                                      | `value`, `default-value` accept scalar text; use properties for records/arrays |
| `inputValue`, `defaultInputValue`            | string; uncontrolled `''`                                                        | `input-value`, `default-input-value`                                           |
| `open`, `defaultOpen`                        | boolean; uncontrolled `false`                                                    | `open`, `default-open`                                                         |
| `multiple`                                   | boolean; `false`                                                                 | `multiple`                                                                     |
| `items`                                      | flat/grouped records or `ComboboxItemCollection`; registered options when absent | property only                                                                  |
| `filteredItems`                              | authoritative ordered results; absent                                            | property only                                                                  |
| `filter`                                     | `(item, query, text) => boolean`; built-in collation filter; `null` disables it  | property only                                                                  |
| `limit`, `locale`                            | integer `-1` means unlimited; inherited locale                                   | `limit`, `locale`                                                              |
| `itemToText`, `itemToLabel`                  | text/form serializer and rich render resolver; scalar conversion                 | property only                                                                  |
| `isItemEqual`                                | equality callback; `Object.is`                                                   | property only                                                                  |
| `placeholder`, `label`                       | `''`, `'Options'`; Field supplies its own accessible label                       | same names                                                                     |
| `identifier`, `autoComplete`                 | generated editor/list ID prefix; optional autofill hint                          | `identifier`, `autocomplete`                                                   |
| `autoHighlight`                              | `false`, `true` after typing, or `'always'`; `false`                             | property only                                                                  |
| `keepHighlight`, `highlightItemOnHover`      | `false`, `true`                                                                  | `keep-highlight`, `highlight-item-on-hover`                                    |
| `loopFocus`, `grid`                          | `true`, `false`                                                                  | `loop-focus`, `grid`                                                           |
| `completionMode`                             | `'list'`, `'both'`, `'inline'`, `'none'`; `'list'`                               | `completion-mode`                                                              |
| `openOnInputClick`, `searchable`             | `true`, `true`                                                                   | `open-on-input-click`, `searchable`                                            |
| `closeOnSelect`                              | single closes; multiple remains open unless explicitly configured                | `close-on-select`                                                              |
| `clearBehavior`                              | `'query'`, `'selection'`, `'both'`, `'contextual'`; contextual                   | `clear-behavior`                                                               |
| `showTrigger`, `showClear`, `showChipRemove` | `true`, `false`, `true`; independent constituent visibility                      | `show-trigger`, `show-clear`, `show-chip-remove`                               |
| `nativeAction`, `clearKeepMounted`           | Trigger native action `true`; retained Clear `false`                             | `native-action`, `clear-keep-mounted`                                          |
| `virtualized`, `mountedItems`                | `false`; optional explicit mounted window within complete `items`                | `virtualized`; window property only                                            |
| `inline`, `loading`, `modal`                 | all `false`                                                                      | same names                                                                     |
| `keepMounted`                                | `false`; retain a closed inert surface                                           | `keep-mounted`                                                                 |

Filtering retains a selected value even when its option disappears from the visible results. Object records remain the actual selected values; a `{value, label}` application object is not implicitly converted into its `value` member. Use `itemToText` for records and form serialization, and `itemToLabel` or a record's rich `label` for icons or other content. Groups use `{label?, items}`. `null` and `undefined` source holes are ignored. Duplicate values retain the first record and produce a diagnostic. A removed highlight clears without changing the query.

`createComboboxItems(data, {getValue, getLabel, diagnostic?})` lazily projects application records onto non-null primitive identifiers. It accepts absent loading data, flat data or groups, ignores holes and retains the first duplicate. Leaf records cannot themselves declare an `items` array. The returned collection provides `value`, `itemLabel`, `hasValue` and `label` (including equality and fallback arguments). `createComboboxFilter({locale?, sensitivity?, ignorePunctuation?, ...Intl.CollatorOptions})` exposes locale-aware `contains`, `startsWith` and `endsWith`.

In list mode, highlighting does not change text. Both mode filters and shows a temporary selected completion suffix; inline completion keeps the item set static; none keeps it static without a completion. IME input does not navigate or commit prematurely. Arrow keys, Home/End and Enter operate through the editor's active descendant while DOM focus stays in the editor. Grid records can specify `row`; actual Row containers match those logical rows. Virtualized mode requires the full ordered source; `mountedItems` controls only rendering. `onItemHighlighted` supplies the source value, logical index and reason so a window owner can bring an unmounted active record into view.

Single selection fills text unless that lane rejects it. Multiple selection clears the query with `input-clear` and metadata `itemPress: true`; automatic cleanup omits that flag. Contextual Clear clears a nonempty query, otherwise selection. Both Clear proposes both lanes atomically: cancelling either proposal leaves both committed values unchanged. Chip Remove has an accessible value-specific name; directional keys move between chips, and Backspace/Delete remove through the same selection owner.

| Floating property                           | Type / default                                                                                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container`                                 | element, shadow root, ref or resolver; `null` keeps the surface local                                                                                 |
| `placement`, `side`, `align`                | `'bottom center'`; explicit logical side/alignment override placement                                                                                 |
| `sideOffset`, `alignOffset`                 | `0`; number or geometry resolver                                                                                                                      |
| `anchor`                                    | element/virtual geometry, ref or resolver; editor group                                                                                               |
| `positionMethod`                            | `'absolute'` or `'fixed'`; absolute                                                                                                                   |
| `collisionAvoidance`                        | `{side:'flip', align:'flip', fallbackAxisSide:'none'}`                                                                                                |
| `collisionBoundary`, `collisionPadding`     | clipping ancestors; `5` or physical-side padding record                                                                                               |
| `sticky`, `disableAnchorTracking`           | `false`, `false`                                                                                                                                      |
| `showArrow`, `arrowPadding`, `showBackdrop` | `false`, `5`, `false`                                                                                                                                 |
| `initialFocus`, `finalFocus`                | `true`: editor default; element, ref, interaction resolver, boolean, numeric popup index or `'trigger'`, `'first'`, `'popup'`, `'previous'`, `'none'` |

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

Value/text events include value, previousValue, reason, sourceEvent, cancellation and metadata. `preventDefault()` or event cancellation rejects a proposal. Public initiating handlers run before component handling; `preventComponentHandling()` suppresses that handling separately from native `preventDefault()`.

The optional authored `tp-combobox-option` registers a source value without adding another interactive surface. It accepts required `value` (a string attribute or any property value), optional rich `label`, `index`, `row`, `disabled=false`, `nativeAction=false`, `indicatorKeepMounted=false`, `onClick`, `textContract`, `indicatorContract` and `partContracts['combobox-option']`. Its text content is the label fallback. Native `option`, `optgroup` and `hr` sources are supported, including inherited optgroup disability. Their rendered options share the same model, keyboard, selection and presence owners.

The generated `tp-combobox-trigger`, `tp-combobox-clear` and `tp-combobox-chip-remove` inherit Button. Their own `partContracts.button` is a terminal override; Root ActionPart contracts are forwarded to the actual Button semantic control. Trigger/Clear remain out of the Tab sequence; Chip Remove remains keyboard accessible. Their icons use the existing Icon owner. Canonical Combobox action recipes and parent presentation contributions are consumed by the same Button controller; child terminal hooks apply last.

Parts: `combobox`, `combobox-anchor`, `combobox-input`, `combobox-trigger`, `combobox-clear`, `combobox-content`, `combobox-list`, `combobox-collection`, `combobox-option`, `combobox-group`, `combobox-label`, `combobox-separator`, `combobox-empty-state`, `combobox-chip-list`, `combobox-chip`, `combobox-chip-remove`; optional structural `combobox-row`, `combobox-list-container`, `item-text`, `item-indicator`, `arrow`, `backdrop`. Slots: `label` and `empty`; unnamed content supplies registered options.

Each part contract supports render delegates with the protected behavior bundle, host properties, state-dependent class/style/content hooks and an actual semantic element reference. Option/Group configuration can provide individual contracts; references release on removal. `partPresentation` and the shared presentation dictionary customize appearance without replacing state/focus/form owners. Part snapshots expose committed open/value/inputValue/multiple/disabled/readOnly/required/invalid/loading/empty/presence; Options add selected/highlighted/index/value. Open/closed, selected/highlighted/disabled and presence markers follow that snapshot. Retained content is hidden and inert. Motion, positioning, portal inheritance and observers use the owning document/window and clean up on disconnection.
