# Drag Drop List

`tp-drag-drop-list` reorders immutable collections and transfers items between connected lists. It renders an ordered list with the shared List Item, Button, Icon and Empty State components. Hovering changes preview order; a successful drop commits the value. Escape, an outside drop or a rejected proposal restores the committed order.

```ts
import '@tweakpad/ui/register';
import '@tweakpad/ui/styles.css';
import { DragDropManager } from '@tweakpad/ui/drag-drop';

const manager = new DragDropManager();
const backlog = document.createElement('tp-drag-drop-list');
const ready = document.createElement('tp-drag-drop-list');
Object.assign(backlog, {
  manager,
  group: 'backlog',
  label: 'Backlog',
  defaultValue: [
    { id: 'research', label: 'Research' },
    { id: 'design', label: 'Design' },
  ],
});
Object.assign(ready, { manager, group: 'ready', label: 'Ready', defaultValue: [] });
document.body.append(backlog, ready);
// On application teardown: remove the lists, then manager.destroy().
```

A list without `manager` owns its manager. A supplied manager remains application-owned when a list disconnects. Connected group IDs must be unique. Numeric and string item IDs remain distinct, including `0`, `''`, `1` and `'1'`. IDs must remain stable across reordering; an index is unsuitable as an identity. Only the first coherent duplicate participates.

## Value and rendering API

Arrays, functions, entities and option objects are JavaScript properties, not serialized attributes. Set initial properties before connecting the element. Scalar attributes use the spelling shown below.

| Property               | Type / default                                      | Behavior                                                                                                                                                                                           |
| ---------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                | `readonly T[] \| undefined`                         | A defined initial value selects lifetime-controlled mode. The component never mutates this array.                                                                                                  |
| `defaultValue`         | `readonly T[] \| undefined`, effective `[]`         | Initial uncontrolled value. Supply either `value` or `defaultValue`. Later default changes do not reset the list.                                                                                  |
| `getItemId`            | `(item, index) => string \| number`                 | Defaults to a primitive string/finite number or an object's own `id`.                                                                                                                              |
| `getItemLabel`         | `(item, index) => string`                           | Defaults to useful `item.label`, then the ID. Return nonempty human-readable text.                                                                                                                 |
| `renderItem`           | `(item, context) => unknown`                        | Lit content inside the existing List Item. Use public components for actions, badges, media and other UI.                                                                                          |
| `getItemOptions`       | `(item, context) => DragDropItemOptions`            | Per-item sensors, modifiers, acceptance, disabled flags, feedback and service settings. Cannot override list-owned identity, membership, element, source, target, handle, manager or registration. |
| `manager`              | `DragDropManager \| undefined`                      | Share one instance for connected transfer.                                                                                                                                                         |
| `group`                | string/finite number; generated                     | Stable, unique connected lane identity.                                                                                                                                                            |
| `label`                | string; `Items`                                     | Accessible name of the native ordered list.                                                                                                                                                        |
| `orientation`          | `vertical` / `horizontal`; `vertical`               | Logical insertion and layout. Horizontal lists honor RTL. Reflected attribute.                                                                                                                     |
| `activation`           | `handle` / `item`; `handle`                         | Pointer activation area. The named keyboard handle remains available. Reflected attribute.                                                                                                         |
| `reorderMode`          | `move` / `swap`; `move`                             | Attribute `reorder-mode`. Swap exchanges within a lane; cross-lane swap transfers.                                                                                                                 |
| `variant`              | `ghost` / `outline` / `subdued`; `ghost`            | Shared List Item treatment. Reflected attribute. The default story uses `outline` for demonstration.                                                                                               |
| `size`                 | `xs` / `sm` / `default`; `default`                  | Shared List Item density. Reflected attribute.                                                                                                                                                     |
| `disabled`, `readOnly` | boolean; false                                      | Disable reordering and invalidate a pending drag while preserving unrelated content actions. Attribute `read-only`.                                                                                |
| `onValueChange`        | `(event: TpValueChangeEvent<readonly T[]>) => void` | Direct synchronous proposal callback, before the DOM value-change event.                                                                                                                           |
| `committedValue`       | readonly array getter                               | Current canonical array.                                                                                                                                                                           |
| `previewValue`         | readonly array getter                               | Projected array during an operation; otherwise canonical value.                                                                                                                                    |

Rendering context contains `id`, `index`, `committedIndex`, `previewIndex`, `dragging`, `dropping`, `dropTarget`, `disabled`, `preview` and `list`. Preview content must not create live drag registrations. The list renders opaque shadow content through Lit rather than relying on `cloneNode`.

`moveItem(id, { list?, group?, index })` uses the same atomic value protocol without synthesizing a pointer drag. It returns `accepted`, `no-op` or `rejected`. Indices must be finite nonnegative integers: an existing index for same-list movement, or zero through destination length for transfer. The default destination is this list. `cancelDrag()` cancels an operation involving the list; both are safe when no drag is active.

## Interaction and service options

The following are properties. Undefined inherits manager → list → item settings. Arrays replace, or a defaults-transform function can explicitly extend them. Declared partial objects merge fields. Null disables only the nullable motion options; it is not a universal disable value.

| Property             | Type / default                                                                                                                                        |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`               | string / number / symbol; connected-network type                                                                                                      |
| `accept`             | one type, readonly type array, or `(source: Draggable) => boolean`; connected-network type. `[]` rejects all. Predicates run for untyped sources too. |
| `sensors`            | readonly sensor instances/factories or `(defaults) => sensors`; Pointer and Keyboard sensors                                                          |
| `modifiers`          | readonly modifier instances/factories or `(defaults) => modifiers`; none                                                                              |
| `collisionDetector`  | `CollisionDetector`; pointer intersection, then shape intersection                                                                                    |
| `collisionPriority`  | finite number; detector priority. Item targets outrank the list container.                                                                            |
| `alignment`          | `{ x: 'start' \| 'center' \| 'end', y: 'start' \| 'center' \| 'end' }`; geometry default                                                              |
| `feedback`           | `default` / `clone` / `move` / `none`, or `(source, manager) => mode`; `default`                                                                      |
| `renderOverlay`      | `(item, context) => unknown`; none                                                                                                                    |
| `rootElement`        | connected Element or `(source) => Element`; list owner document body                                                                                  |
| `overlayDisabled`    | boolean or `(source) => boolean`; false. Disables only the custom overlay.                                                                            |
| `transition`         | `{ duration?, easing?, idle? } \| null`; 250 ms, `cubic-bezier(0.25, 1, 0.5, 1)`, idle false                                                          |
| `keyboardTransition` | `{ duration?, easing? } \| null`; 250 ms, `cubic-bezier(0.25, 1, 0.5, 1)`                                                                             |
| `dropAnimation`      | `{ duration?, easing? }`, async callback, or null; 250 ms, `ease`                                                                                     |
| `autoScroll`         | boolean or `{ acceleration?, threshold? }`; true, acceleration 25, threshold `{x: .2, y: .2}`                                                         |
| `accessibility`      | false or `{ id?, idPrefix?: { description?, announcement? }, debounce? }`; enabled, generated IDs, 500 ms movement debounce                           |
| `instructions`       | `{ draggable: string }`; generated from configured keyboard codes                                                                                     |
| `announcements`      | partial callbacks `dragstart`, `dragmove`, `dragover`, `dragend`, each `(event, manager) => string \| undefined`; localized overrides of defaults     |

`default` feedback moves the source with a hidden layout placeholder; `clone` shows the placeholder; `move` has no placeholder and needs a separate stationary target; `none` performs no visual feedback mutation while geometry and sorting continue. Custom overlays remain through drop completion. Drop callback context includes `source`, `originalElement`, `feedbackElement`, `placeholder`, `translate` and `moved`. Rejected animation promises still finalize. Motion uses the existing `sort-displacement`, `keyboard-feedback` and `drop-settlement` roles, shared driver overrides and inherited `motion-policy`.

Space or Enter picks up a focused handle. Arrow keys choose a directional sortable destination. Space/Enter drops; Escape cancels. Tab/Shift+Tab finishes and continues normal traversal without delayed focus theft. Mouse handles activate immediately; touch waits 250 ms with 5 px tolerance. Ordinary item activation uses a 200 ms/10 px delay or distance strictly greater than 5 px. Nested controls retain their own interaction. Native handle buttons retain their semantics; rows remain list items.

## Events and controlled transactions

Drag observation events bubble and cross shadow boundaries. Their `detail` is the Foundation drag event, with immutable operation snapshots and `nativeEvent`. Metadata objects and DOM elements retain their references; numeric snapshots do not mutate later.

| Event                  | Cancelable | Default action                                                                                            |
| ---------------------- | ---------- | --------------------------------------------------------------------------------------------------------- |
| `tp-before-drag-start` | yes        | Initialize the operation. Preventing it acquires no feedback.                                             |
| `tp-drag-start`        | no         | Observe ready source geometry before first collision.                                                     |
| `tp-drag-move`         | yes        | Apply proposed coordinates/modifiers.                                                                     |
| `tp-collision`         | yes        | Select from sorted collisions. Evaluations remain observable even when typed candidate IDs are unchanged. |
| `tp-drag-over`         | yes        | Project sorting toward the selected target. Preventing it retains target identity.                        |
| `tp-drag-end`          | no         | Begin terminal completion; `detail.suspend()` defers authorization.                                       |
| `tp-drag-settled`      | no         | Terminal `outcome`: `committed`, `canceled` or `rejected`; resources released.                            |
| `tp-value-change`      | yes        | Canonical immutable lane proposal.                                                                        |
| `tp-value-commit`      | no         | Accepted canonical value; all changed lanes are already published.                                        |

Value details follow the common event contract: `value`, `previousValue`, `reason`, `sourceEvent`, cancellation and metadata. Reasons are `drag`, `keyboard` or `imperative-action`. Metadata contains `operationId`, `itemId`, `sourceGroup`, `destinationGroup`, `fromIndex`, `toIndex` and `input`. A same-list change emits one change/commit pair; transfer emits one pair per changed lane. Hover, no-op and canceled/rejected drops emit no commit.

Controlled owners acknowledge every changed lane synchronously during value-change dispatch. The exact typed ID order must match each proposal; fresh item objects with those IDs are accepted. Missing acknowledgment, veto, duplicates or incompatible normalization reject every lane. Library atomicity covers committed component values and commit notifications. Application stores must stage their own connected update; unrelated external side effects in listeners cannot be rolled back by the component. The **One controlled owner** example shows staged acknowledgment followed by one application snapshot.

For asynchronous authorization, call `const decision = event.detail.suspend()` synchronously inside `tp-drag-end`, then `decision.resume()` or `decision.abort()`. Repeated calls return one handle; the first result wins. Feedback stays visible, input stops, and values remain unchanged while waiting. Explicit cancellation, disconnect or manager destruction aborts the decision; no timer silently accepts it. Use `try/catch` around application work and abort on failure.

Direct Foundation callbacks and `onValueChange` exceptions are observed and cancel the default action. Native DOM listener exceptions follow browser dispatch semantics and cannot reliably become vetoes; use `preventDefault()`, the common event cancellation API or a caught suspension rejection.

## Foundation API

`@tweakpad/ui/drag-drop` exports the services without requiring custom-element registration. The root package also exports them; its existing positioning `Alignment` retains that name and the drag type is available there as `DragAlignment`.

- `new DragDropManager(options?)`: `registry.draggables`/`droppables`, `dragOperation`, `monitor`, `renderer`, `subscribe(callback, emitCurrent?)`, `actions` and `destroy()`.
- `new Draggable(input, manager?)`, `new Droppable(input, manager?)`, `new Sortable(input, manager?)`: deferred registration by default, `register()`/`unregister()`/`destroy()`, mutable `id`, `manager`, `element`, `data`, `type` and `disabled`. `register:false` opts into explicit registration. Optional `effects` return owned registration effects/disposers. First coherent registration wins; batched ID permutations are atomic.
- Draggable: `handle`, `sensors`, `modifiers`, `alignment`, feedback/service options through `update()`, `status`, `isDragSource`, `isDragging`, `isDropping`.
- Droppable: `accept`, `collisionDetector`, `collisionPriority`, `shape`, `proxy`, `accepts(source)`, `refreshShape()`, `isDropTarget`.
- Sortable: required nonnegative integer `index`, optional `group`; `initialIndex`/`initialGroup` during a drag; composed `draggable`/`droppable`; `element`, independent `source`/`target`/`handle`; boolean or `{draggable?, droppable?}` disabled flags; `transition`. Replacing the common element updates following references and preserves explicit references.
- `actions.start({ source, coordinates, event?, input? })` returns an AbortController. Invalid source, coordinates or busy-manager starts fail before mutation.
- `actions.move({ to?, by?, event?, cancelable?, propagate? })`: `to` wins; propagation defaults true. False suppresses the move notification while preserving movement/collision work.
- `actions.setDropTarget(id | null)` awaits rendering and returns `{prevented, changed}`. `actions.stop({event?, canceled?})` returns terminal completion.
- `monitor.addEventListener(name, callback)` returns an unsubscribe function. Names are `beforedragstart`, `dragstart`, `dragmove`, `collision`, `dragover`, `dragend`, `settled`. `removeEventListener` is also available. `subscribe` publishes coherent immutable operation snapshots.
- `LitDragDropRenderer.add(host)` returns a host-registration disposer. Its `rendering` promise waits for affected Lit updates; other renderers provide that same promise boundary.
- `PointerSensor.configure(options)` and `KeyboardSensor.configure(options)` return factories. Pointer options: `activationConstraints`, `activatorElements`, `preventActivation`. Keyboard options: scalar/axis `offset` (10), partial `keyboardCodes`, `preventActivation`. Shift multiplies free movement by five. Logical keys are case insensitive and support Space/Spacebar, KeyW and Digit1 aliases.
- `DelayConstraint({value, tolerance})` and `DistanceConstraint({value})` create independent gesture state. Distance may be scalar, x, y or both axes (both thresholds required). Multiple constraints activate with OR semantics; comparisons use strict `>`.
- `AxisModifier({axis, value?})`, `RestrictToVerticalAxis`, `RestrictToHorizontalAxis`, `SnapModifier({size?})` (20, ceil rounding), `RestrictToElement({element?})`, `RestrictToWindow`. Instances or factories form an ordered pipeline. Manager instances persist; source-owned instances release at operation end. Invalid output cannot publish non-finite geometry.
- `Point`, `Rectangle`, `Position`, `DOMRectangle`, `revealElement(element, {block?, inline?})`, `isSortable`, `isSortableOperation`; reveal accepts nearest/center/none.
- Detectors: `defaultCollisionDetection`, `pointerIntersection`, `shapeIntersection`, `closestCenter`, `closestCorners`, `pointerDistance`, `directionBiased`. `CollisionPriority` is Lowest=0 through Highest=4; `CollisionType` is Collision=0, ShapeIntersection=1, PointerIntersection=2. Sort by priority, type, score, then stable source order. Exact zero-distance positive infinity is valid.
- Immutable helpers: `arrayMove`, `arraySwap`, `move`, `swap`. The grouped helpers preserve the upstream vertical midpoint behavior. Invalid indices return the original input with diagnostics; no-op and unaffected lanes retain references. The list adds logical horizontal/RTL insertion.
- `dragDropDiagnostics` is an EventTarget emitting `diagnostic` with `{code, message, severity, context?}` detail. No general plugin registry is exported.

Foundation supports consumer-owned DOM, including same-origin frames and shadow roots. Use a custom overlay for opaque shadow components. Plain Foundation Sortables can project ordinary DOM siblings; the list adapter exclusively updates keyed Lit previews. Dispose bindings and managers when their owning application is removed.

## Presentation and accessibility hooks

The host/root and public parts are `list`, `item`, `handle`, `empty`, `placeholder`, `overlay`, `instructions`, `announcements`; canonical dictionary/contract names use `drag-drop-list-` prefixes. `renderPart`/`partContracts`, per-instance hooks, scoped themes, semantic tokens, dictionary replacement, inherited direction/locale, CSP style policy and motion overrides follow the common Foundation contract. The handle's behavior targets its actual native Button control. Complex properties are not attributes.

State markers: root `data-dragging`/`data-pending`; item `data-dragging`/`data-dropping`/`data-drop-target`/`data-drop-disabled`; handle `data-drag-disabled`; preview `data-preview`. Appearance belongs to shared recipes and nested component recipes. Layout uses an actual `ol`/`li` structure, not generic button rows. Feedback is inert and aria-hidden, excludes forms and entity registration, and owns temporary styles only until cleanup. Existing described-by tokens and newer consumer style/attribute writes survive cleanup.

Instructions are associated with native activators; a polite atomic live region announces operations. Return `undefined` from an announcement callback to suppress that message. Empty lists keep a meaningful accessible name and transfer target. Tree inspection and automated accessibility results are distinct from actual assistive-technology testing.

## Source and license

Behavior is ported from the local dnd-kit baseline `e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94`; its MIT notice ships as `dist/LICENSE.dnd-kit`. There is no dnd-kit or React runtime dependency. Lit owns component rendering; Foundation owns behavior, state, cleanup and motion. Local corrections include typed identity handling, immutable commit-on-drop transactions, pointer ownership, stale-work protection, native semantics and ownership-aware restoration.
