# Toggle Group

`tp-toggle-group` coordinates actual `tp-toggle` action controls. Selection is always an ordered string list, in both single and multiple modes. It adds no implicit checkbox or form participation.

```html
<tp-toggle-group label="Text formatting" multiple variant="outline">
  <tp-toggle value="bold">Bold</tp-toggle>
  <tp-toggle value="italic">Italic</tp-toggle>
  <tp-toggle value="underline">Underline</tp-toggle>
</tp-toggle-group>
```

## Group properties

| Property / attribute                | Type                   | Default                 | Meaning                                                                                 |
| ----------------------------------- | ---------------------- | ----------------------- | --------------------------------------------------------------------------------------- |
| `value`                             | ordered string list    | uncontrolled empty list | Controlled selection. Property binding preserves spaces; attributes accept JSON arrays. |
| `defaultValue` / `default-value`    | ordered string list    | empty list              | Initial uncontrolled selection; use JSON arrays in HTML.                                |
| `onValueChange`                     | list change callback   | absent                  | Accept/rewrite/veto a group proposal.                                                   |
| `multiple`                          | Boolean                | false                   | Multiple selection when true.                                                           |
| `selectionMode` / `selection-mode`  | single or multiple     | single                  | Alias for the same mode.                                                                |
| `loopFocus` / `loop-focus`          | Boolean                | true                    | Wrap arrow navigation. Bind the property to false to disable wrapping.                  |
| `orientation`                       | horizontal or vertical | horizontal              | Layout and keyboard axis.                                                               |
| `variant`                           | ghost or outline       | ghost                   | Overrides grouped Toggle appearance.                                                    |
| `size`                              | `ToggleSize`           | default                 | Overrides grouped Toggle size; icon-only items use an `icon-*` size.                    |
| `spacing`                           | nonnegative number     | 2                       | Gap in shared spacing units. Zero reuses ButtonGroup logical seams.                     |
| `label`                             | string                 | empty                   | Accessible group name.                                                                  |
| `disabled`, `readOnly` / `readonly` | Boolean                | false                   | Interaction constraints; authored child flags remain intact.                            |
| `partContracts`, `partPresentation` | records                | empty                   | Group/Item customization.                                                               |

A scalar attribute value is treated as one identifier; it is never split on spaces. Use properties or JSON arrays for lists.

## Item and standalone Toggle

Use `tp-toggle` with a unique nonempty `value`. Grouped Toggle `pressed`, `variant` and `size` derive from the owner. Its optional `onPressedChange` callback can veto before the single Group event; the child does not emit a second composed value event. Removing a member releases ownership and preserves its authored variant/size/disabled settings.

Standalone Toggle has optional controlled `pressed`, `defaultPressed` / `default-pressed` (false), `onPressedChange`, `nativeAction` / `native-action` (true), `variant` (ghost), `size` (default), optional `value`, `disabled` (false) and `readOnly` / `readonly` (false). It renders a native button by default; a non-native action supplies Enter/Space activation. `setPressed(boolean, reason?, event?)` proposes standalone state. Group members instead use Group `setValue(list, reason?, event?)`.

## Interaction and state

Click, Enter and Space propose `trigger-press`. In single mode, pressing the selected Toggle clears selection. In multiple mode, membership is ordered by registered items and retains unmatched selected values. Missing or duplicate identities emit diagnostics and later invalid items are excluded. Single mode derives only the first controlled value and diagnoses larger cardinality.

In a standalone Group, arrow keys follow orientation/direction and skip disabled members; Home/End move to boundary items. Navigation changes focus without selecting. A standalone Group is one tab stop and exposes group semantics, while items remain buttons with `aria-pressed`. Nested groups isolate members. Removal preserves stored values for matching remount. Action controls never submit a value or reset on native form reset; consumer-owned form participation must be explicit.

Public methods include `setValue`, `focus(options?)`, `blur()` and shared Field association/context. Toggle exposes `controlElement`, `toggleDisabled` and label activation. The group forwards focus to its current tab stop.

## Inside a Toolbar

A Toggle group placed inside a `ToolbarController` root becomes one of its groups by itself; it needs no registration call. Its `toggle-group` part is registered as the toolbar group and keeps `role="group"` and the group's label, and its Toggles join the toolbar's single arrow-key sequence in order. The group then has no tab stop or arrow-key handling of its own: the toolbar's orientation, `loopFocus` and Home/End apply, while the group's `orientation` still lays out its Toggles. Selection mode, values and `tp-value-change` are unchanged. A disabled Toggle, or every Toggle of a disabled group, stays a focusable toolbar stop that does not activate; a Toggle excluded for a missing or duplicate value is skipped.

Do not register the group's host, its part or its Toggles with the toolbar yourself; a Toggle that is already registered keeps that registration, and the group reports a `tp-diagnostic`. A group added to the toolbar later, or present before the toolbar is created, joins it once; a group removed from the toolbar, or a disposed toolbar, restores the standalone tab stop and arrow keys. A Toggle group inside a popup or dialog placed within the toolbar stays independent.

```html
<div id="view-tools" aria-label="View">
  <tp-button id="fit">Fit</tp-button>
  <tp-toggle-group label="Layout" default-value='["single"]'>
    <tp-toggle value="single">Single</tp-toggle>
    <tp-toggle value="spread">Spread</tp-toggle>
  </tp-toggle-group>
</div>
```

```ts
import { ToolbarController } from '@tweakpad/ui';
import '@tweakpad/ui/register';

await customElements.whenDefined('tp-button');
const toolbar = new ToolbarController(document.getElementById('view-tools')!);
toolbar.registerItem(document.getElementById('fit')!, { kind: 'button' });
// The Layout group registers itself and its Toggles.
```

## Anatomy and customization

`toggle-group` is the Group part. Actual Toggle roots publish both `toggle` and `toggle-group-item`; content is `toggle-content`. Configure the Group's container contract on the Group; Item and Content contracts on the corresponding Toggle. `partContracts['toggle-group-item']` takes precedence over the Toggle root contract while grouped. Group item appearance hooks and zero-spacing seam contributions precede terminal child hooks.

Pressed/unpressed and disabled markers follow committed state. Group exposes orientation and multiple state. Default and outline paint, sizes, focus rings and icons match Toggle.

The host sizes to its members. An inline size set on the host (for example `inline-size: 100%` to span a column or a grid cell) is the group's own size: the `toggle-group` part fills the host, vertical members stretch across it, and a grid set on the part through `partPresentation` lays its tiles out over the full width.

## Ownership and notifications

The first update fixes controlled versus uncontrolled ownership. Supply either the controlled property or its default. A controlled callback accepts or rewrites a proposal by assigning the controlled property; without an owner return, committed state remains unchanged. Cancel with `event.preventDefault()` or `event.detail.cancelled = true`. Callbacks run before the composed, bubbling `tp-value-change` notification. Reentrant requests are queued after the current transaction.

Event detail includes `value`, `previousValue`, `reason`, `sourceEvent`, optional `trigger`, `cancelled`, `allowPropagation`, and optional `metadata`. Programmatic proposals use `programmatic`; an external controlled assignment publishes state without fabricating a proposal. Invalid ownership/composition emits `tp-diagnostic`.

## Shared customization

`partContracts` maps a public part to `renderDelegate`, `hostProperties`, `classHook`, `styleHook`, `elementReference`, and `content`. Class, style and content may resolve from the same committed state used for ARIA and markers. References accept a callback or `{ current }` and clear on replacement/disconnection. A delegate must bind the supplied `bind` directive to its semantic element and render `content`. Required roles, native state and ARIA remain protected. Consumer initiating handlers run first; `preventComponentHandling(event)` suppresses component handling independently from native `preventDefault()`.

`partPresentation`, `::part(...)`, semantic CSS tokens, and `setPresentationDictionary()` customize appearance. `direction` / `dir` follows inherited writing direction; `motionPolicy` / `motion-policy` defaults to `inherit` (also `normal`, `reduce`).

## Registration

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
```

## Icon compositions

Group items are actual `tp-toggle` controls. Put decorative `tp-icon` components in their default content and give icon-only items an `aria-label`; icon-with-label items use visible text. The Icon Only, Icon With Label and Stateful Artwork stories include complete copyable Lit artwork setup. Group size and appearance still take precedence over each item's authored values, and the same orientation, spacing, multiple, disabled and loopFocus APIs apply. Icon-only items take an icon size from the group: `icon-xs`, `icon-sm`, `icon` and `icon-lg` match the height of `xs`, `sm`, `default` and `lg` and draw square items with no inline padding, also when zero spacing joins them. Zero-spacing groups keep joined seams. An explicitly supplied Icon size remains authoritative.

The Font Weight Selector composes a real Field label and description, rich Toggle content through public part hooks, and a Badge showing the committed selection. Stateful Artwork uses each member's committed Content state to choose outline or filled Icon data.
