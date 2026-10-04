# Drag-and-drop Foundation and connected list specification

Status: implementation specification and execution plan. The requirements below are proposals for adoption into the live specifications; this Markdown file does not replace those specifications. Implementation and browser acceptance are not claimed by this document.

## 1. Objective and delivery boundary

Port the tested behavior of the supplied local dnd-kit implementation into Tweakpad's existing Foundation, then expose one reusable `tp-drag-drop-list` control. Preserve the upstream algorithms, ordering, validation branches, cancellation, measurement, and cleanup behavior. Replace framework and dependency mechanisms with existing Tweakpad owners. Do not recreate drag-and-drop from showcase examples or add runtime dependencies.

The Foundation exposes `DragDropManager`, `Draggable`, `Droppable`, and `Sortable`, with pointer and keyboard sensors, activation constraints, collision detection, geometry, modifiers, sorting helpers, feedback, scrolling, accessibility, and lifecycle services. These entities are programmatic behavior, not additional catalog controls or custom elements.

The single list control supports both isolated and connected instances, vertical and horizontal layouts, immutable data plus an item renderer, controlled and uncontrolled values, move and swap ordering, temporary sorting previews, and atomic commit on drop. Connected instances share an explicit manager. Multiple list instances remain one catalog control.

### 1.1 Included behavior despite the plugin exclusion

Upstream implements essential behavior as plugins. Excluding those implementations wholesale would remove the functionality being requested. The port therefore excludes the **public plugin registration/configuration system**, while preserving the following behavior as owned internal services with explicit configuration:

| Upstream owner                               | Required local behavior                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------- |
| `CollisionNotifier`                          | Collision ordering, notification, target reconciliation, cancellation      |
| `Feedback`                                   | Feedback modes, source geometry, placeholders, overlays, drop animation    |
| `AutoScroller`, `Scroller`, `ScrollListener` | Edge scrolling, keyboard reveal, scroll compensation and observation       |
| `Accessibility`                              | Instructions, announcements, actual activator semantics, focus restoration |
| `Cursor`, `PreventSelection`                 | Operation-scoped cursor and selection ownership                            |
| `StyleInjector`                              | Scoped, reference-counted, content-security-aware generated styles         |
| `SortableKeyboardPlugin`                     | Directional target navigation and target alignment                         |
| `OptimisticSortingPlugin`                    | Temporary reorder/transfer, membership checks, rollback                    |

No public `Plugin`, plugin registry, `plugins` property, debug plugin, or arbitrary plugin lifecycle is exposed. Custom sensors, modifiers, collision algorithms, announcements, renderers, and animation remain supported through their dedicated contracts. Internal implementation names must not accidentally export the excluded system.

### 1.2 Explicit exclusions

- React, Vue, Solid, and Svelte bindings as runtime APIs; their behavioral responsibilities are translated to Lit lifecycle and Foundation subscriptions.
- New grid, tree, board, virtualizer, or multi-selection controls. Foundation entities remain usable within consumer-owned layouts and virtualizers.
- Multiple simultaneous drag sources in one manager; separate managers can operate independently without sharing operation state.
- Native operating-system/file drag-and-drop and cross-origin frame traversal. The reference native `DragSensor` is not part of the published DOM entrypoint selected here.
- Automatic form serialization. Reordering a list does not turn it into a form value control.
- Unrelated component or specification rewrites.

Same-origin frames, transformed ancestors, shadow DOM, dynamic membership, source remounting, connected empty lists, reduced motion, and consumer customization are included; they are not optional polish.

## 2. Evidence, authority, and port discipline

### 2.1 Pinned sources

| Source                 | Baseline and use                                                                                                                                                                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| dnd-kit                | `external/dnd-kit`, commit `e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94`; local abstract/DOM/sortable generation, package version `0.5.0`. This is not the older `@dnd-kit/core` React API.                                                                                       |
| Foundation             | Direct Spec Blocks project `prj_c5a403a0-d1d5-4487-ac78-f4e545f46483`, document `doc_cd3c4721-9f9b-4531-abab-a8bfdbac75f1`.                                                                                                                                                    |
| Component Library      | Same project, document `doc_8077bf7c-0361-48f3-ac87-53b983bd89b3`.                                                                                                                                                                                                             |
| Live read baseline     | Project `0.3.15`, HEAD `8440bff24a97dbbc5c762ebf4bd6baa958b305e1`, state version `5daad6324d67f008ae378650a86e7e961fc91a1025d6107c89be7002caecdfe1`; existing dirty candidate, zero reported issues. Refresh before every mutation; do not commit unrelated candidate changes. |
| Presentation reference | `../specification/external/ui`, commit `63c1308d112b6b1205d86244a156cca1abef5087`; existing Tweakpad List Item/Button/Empty State definitions and recipes govern composition. No new upstream visual family is inferred from a drag demo.                                      |

`@external/dnd-kit` resolves to the library's `external/dnd-kit` checkout. The expected sibling `../specification/external/dnd-kit` path is absent. Read the actual checkout; do not fetch a replacement or update it during implementation.

The live specifications currently provide governing shared contracts but no dedicated drag-and-drop section. Sections 3–15 below define the concrete amendment to adopt before dependent implementation. Existing controlled-state, event, ownership, accessibility, environment, motion, and presentation contracts continue to apply.

### 2.2 Source map

All source paths in this table are relative to `external/dnd-kit/`.

| ID  | Source and symbols                                                                                      | Port responsibility                                                                           |
| --- | ------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| U1  | `packages/abstract/src/core/manager/{manager,actions,operation,status,renderer,events}.ts`              | State machine, monitor events, snapshots, render barriers, start/move/target/stop             |
| U2  | `packages/abstract/src/core/entities/`; `packages/dom/src/core/entities/`                               | Identity, registration, rekey, acceptance, DOM references, shape refresh                      |
| U3  | `packages/abstract/src/core/sensors/activation.ts`; `packages/dom/src/core/sensors/pointer/`            | Activation controller, delay/distance constraints, pointer ownership                          |
| U4  | `packages/dom/src/core/sensors/keyboard/{KeyboardSensor,KeyboardSensor.helpers}.ts`                     | Logical keys, start/end/cancel, displacement and focus boundary                               |
| U5  | `packages/abstract/src/core/collision/`; `packages/collision/src/algorithms/`; `packages/geometry/src/` | Filtering, ranking, collision sequences, detectors, rectangles and positions                  |
| U6  | `packages/abstract/src/modifiers/`; `packages/dom/src/modifiers/`                                       | Axis, grid snapping, element/window bounds                                                    |
| U7  | `packages/dom/src/sortable/`, including `sortable.ts` and `plugins/`                                    | Composed entities, transitions, optimistic sorting and directional keyboard sorting           |
| U8  | `packages/helpers/src/move.ts`                                                                          | Immutable `arrayMove`, `arraySwap`, grouped `move`/`swap`, optimistic reconciliation          |
| U9  | `packages/dom/src/core/plugins/feedback/`                                                               | Feedback modes, observation, proxy geometry, drop animation                                   |
| U10 | `packages/dom/src/core/plugins/scrolling/`; `packages/dom/src/utilities/scroll/`                        | Scroll intent, nested scrollers, compensation, reveal                                         |
| U11 | `packages/dom/src/core/plugins/accessibility/`                                                          | Announcements, instructions, accessibility ownership                                          |
| U12 | `packages/dom/src/utilities/`                                                                           | Owner realms, frames, transforms, DOM geometry, cloning, listeners, styles, scheduling        |
| U13 | `packages/react/src/{core,sortable}/`; `packages/state/src/`                                            | Provider/overlay/ref/subscription semantics; replacement of reactive implementation machinery |
| U14 | `packages/{abstract,dom,helpers}/tests/`; `apps/stories-shared/tests/`; package changelogs              | Regression obligations and test translation                                                   |

### 2.3 Rules for preserving logic

1. Port source routines with provenance comments identifying the original file, symbol, and pinned revision. Preserve the upstream MIT notice with adapted source. Review the checkout license when copying; do not remove attribution.
2. Preserve branch ordering, fallbacks, batching, comparison rules, and cleanup sequencing unless a numbered adaptation below changes them.
3. Replace imports from `@dnd-kit/*`, `@preact/signals-core`, and framework packages with local owners. Do not copy a dependency graph and hide it inside the package.
4. Translate upstream tests before changing the corresponding algorithm. Preserve test intent, edge inputs, and observable assertions; changing the test harness is allowed.
5. Add tests for each intentional correction. Upstream tests are evidence, not proof that every upstream branch is safe.
6. Keep a trace ledger with fields: requirement ID, upstream file/symbol/branch, local owner, adaptation ID or `unchanged`, test IDs, execution evidence. A whole-directory reference alone does not close a requirement.
7. Pure algorithms retain their source structure where practical. DOM services may require substantial lifecycle adaptation, but must retain the same observable geometry, ordering, acceptance, and restoration invariants.
8. No test or conformance claim may be based solely on a successful default drag, build, screenshot, or accessibility scan.

### 2.4 Governing live anchors

| Concern                                      | Stable live anchor                                                               |
| -------------------------------------------- | -------------------------------------------------------------------------------- |
| Controlled/default values                    | `sec-52-controlledvaluet`                                                        |
| Change reasons, cancellation and ordering    | `sec-53-changeeventt-and-changereason`                                           |
| Atomic ownership                             | `audit-sec-55-atomic-state-ownership`                                            |
| Coherent stores/subscriptions                | `sec-54-store-and-subscription-behavior`                                         |
| Direction, IDs and owner environment         | `sec-45-direction-identifiers-and-environment-ownership`                         |
| Semantics, disabled/read-only/inert          | `sec-71-semantic-invariants`, `sec-72-disabled-read-only-hidden-and-inert`       |
| Pointer capture                              | `sec-83-activation-and-pointer-behavior`                                         |
| Scheduling, cleanup and environment services | `sec-122-scheduling-and-cleanup`, `sec-123-environment-and-interaction-services` |
| Diagnostics and edge cases                   | `sec-125-diagnostics`, `sec-1915-common-edge-and-failure-matrix`                 |
| Composition coordination                     | `audit-sec-1918-composition-coordination`                                        |
| Component records and structural merge       | `sec-cl-81-definition-record`, `sec-cl-7-structural-layer-merge`                 |
| State vocabulary and motion roles            | `sec-cl-111-state-vocabulary`, `sec-cl-158-motion-roles`                         |
| Reused list row                              | `ucl22-list-item`                                                                |

## 3. Architecture and shared ownership

### 3.1 Proposed module boundaries

```text
src/foundation/drag-drop/
  index.ts                 public programmatic exports
  types.ts                 identity, options, snapshots, event contracts
  manager.ts               operation owner and coherent subscriptions
  registry.ts              typed identity and entity membership
  actions.ts               guarded state transitions and terminal flow
  entities.ts              Draggable and Droppable
  sortable.ts              composed entities and initial-position tracking
  geometry.ts              source-derived pure geometry and DOM adapter
  collision.ts             filtering, detectors and ranking
  modifiers.ts             source-derived transform pipeline
  sensors/                 pointer, keyboard and activation constraints
  sorting.ts               immutable helpers and preview coordinator
  feedback.ts              visual feedback and geometry proxy ownership
  scrolling.ts             nested scrolling, reveal and compensation
  accessibility.ts         instructions, announcements and focus completion
  renderer.ts              Lit render barrier / consumer adapter contract
  *.test.ts                pure and lifecycle regression tests
src/components/drag-drop-list/
  index.ts
  drag-drop-list.ts         TpElement binding and public API
  list-controller.ts       data lanes and connected transaction coordination
  styles.ts                structural geometry only
  types.ts
  *.test.ts
docs/drag-drop.md
src/stories/drag-drop-list.stories.ts
tests/fixtures/components/drag-drop-list/index.html
plans/components/drag-drop-list/implementation-checklist.md
plans/components/drag-drop-list/source-traceability.md
```

Split only when responsibilities justify it. These paths are delivery targets, not claims that files already exist. Public entities must be usable without mounting the list control.

### 3.2 Reuse and required shared repairs

| Responsibility                      | Existing local owner                                                           | Decision and affected consumers                                                                                                                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Committed values and atomic changes | `src/foundation/controllable-state.ts`, `ControllableState.transaction`        | Each list owns one existing state lane; connected transfers use its transaction protocol. No parallel controlled-value implementation. Existing state consumers receive regression tests if this owner needs extension. |
| Operation publication               | `src/foundation/store.ts`, `ObservableStore`                                   | One coherent operation store and derived subscriptions. Replace Preact reactivity; preserve batch and latest-callback semantics.                                                                                        |
| Cleanup and scheduling              | `src/foundation/services.ts`, `CleanupScope`, scheduler services               | Repair reverse-order cleanup to continue after a disposer throws; add owner-window/cancelable scheduling as needed in the shared owner, not a private competing scheduler.                                              |
| Attributes                          | `src/foundation/owned-attributes.ts`                                           | Use ownership-aware writes/restoration for activators, descriptions, markers and hidden feedback.                                                                                                                       |
| Content security and styles         | `src/foundation/generated-style.ts` and content-security services              | Nonce/disabled-style policy, root ownership and multi-manager leases; no global `!important` cursor override.                                                                                                           |
| Direction and environment           | `src/foundation/composed-environment.ts`, environment service                  | Owner document/window, composed direction, reduced motion, shadow roots and same-origin frames. Repair insufficient generic helpers in the existing owner.                                                              |
| Motion                              | `src/foundation/motion.ts`                                                     | Existing request/claim/cancel/finished protocol; sortable, keyboard and drop roles. No independent animation lifecycle.                                                                                                 |
| Overlay hosting                     | Existing portal/environment ownership                                          | Reuse portal scope and generated styles. Feedback descendants are excluded from entity registration without global monkey-patching.                                                                                     |
| Row appearance                      | `TpListItem` in `src/components/primitives.ts`, List Item presentation recipes | Render real `tp-list-item` inside native list anatomy. Forward supported variants and sizes.                                                                                                                            |
| Handle                              | Existing `TpButton` and icon registry                                          | Real `tp-button` with `type="button"` and accessible label. Add a grip icon to the existing icon registry if needed. No custom button-looking span or inline substitute icon system.                                    |
| Empty and scroll compositions       | `TpEmptyState`, `TpScrollArea`                                                 | Real controls in demos and implementation where the role exists. The list does not impose a second scroll container by default.                                                                                         |

The existing cleanup implementation needs exception-safe disposal before drag services depend on it. Store, scheduling, environment and motion owners must be tested with their existing consumers when changed. A drag-specific module is justified for drag policy, not for duplicating generic Foundation services.

## 4. Public Foundation contract

### 4.1 Common types and identity

- `UniqueIdentifier = string | number`. Identity is type-sensitive: `1` and `'1'` are different entity IDs. Reject non-finite numeric IDs and values of other types at runtime.
- Entity `type` supports string, number, or symbol. `undefined` denotes no type. Falsy valid values (`0`, `''`) are not absence.
- `Data` is consumer metadata. The Foundation does not serialize it or mutate it. Entity default data is an empty record; list item payload can be referenced inside this record without copying consumer objects.
- IDs are unique within each manager's draggable registry and within its droppable registry. A Sortable legitimately registers one entity of each kind with the same ID.
- First coherent registration wins on an accidental duplicate. The duplicate is nonparticipating and produces an actionable diagnostic; it must not replace or unregister the winner.
- IDs, indices, and groups never derive from label text, DOM position alone, or an array index when consumer identity is available.
- Group identifiers are type-sensitive in live registries. Legacy grouped-record helpers stringify own-property keys deliberately; callers needing simultaneous `1` and `'1'` groups use a map/registry representation rather than a JavaScript object record.

### 4.2 Manager

`DragDropManager` owns `actions`, `registry`, `dragOperation`, `collisionObserver`, `monitor`, and `renderer`. Construction does not require a global document or instantiate browser observers at import time.

| Member/configuration                                          | Contract/default                                                                                                                                                            |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sensors`                                                     | Pointer and keyboard by default; explicit array replaces defaults; a defaults-transform callback extends/replaces them.                                                     |
| `modifiers`                                                   | Empty by default; same replacement/extension convention.                                                                                                                    |
| `renderer`                                                    | Render synchronization adapter; Lit list adapter waits for the affected hosts' rendering, including connected targets.                                                      |
| Feedback/scroll/a11y options                                  | Explicit service options documented below; no plugin descriptors.                                                                                                           |
| `actions.start({ source, coordinates, event? })`              | Resolve a registered entity or ID, validate fully, return an `AbortController` for this operation. Invalid programmer input throws a documented error before state changes. |
| `actions.move({ to?, by?, event?, cancelable?, propagate? })` | Active drag only. `to` takes precedence over `by`; defaults for cancelable and propagation are true.                                                                        |
| `actions.setDropTarget(idOrNull)`                             | Normalize absent target to null, no-op if unchanged, return asynchronous prevented/result information after the render barrier.                                             |
| `actions.stop({ event?, canceled? })`                         | Idempotent terminal request; input ownership ends immediately, completion may await suspension and feedback.                                                                |
| `destroy()`                                                   | Idempotent cancel, resource release, listener disposal and snapshot reset. Further queued work cannot revive the manager.                                                   |
| Subscription/monitor                                          | Stable subscription API returning an idempotent disposer; callbacks observe coherent snapshots and the latest callback references.                                          |

Only one operation is active per manager. The list destroys only a manager it created; disconnecting a consumer of an external manager does not destroy other lists' manager.

### 4.3 Draggable

Input includes `id`, `data`, `disabled`, `register`, lifecycle effects, `type`, `sensors`, `modifiers`, `alignment`, `element`, and `handle`, plus explicit feedback/drop options replacing per-entity plugin options.

- Defaults: `disabled=false`, automatic registration enabled, data `{}`, no explicit type/handle/alignment; manager sensors/modifiers inherited when undefined.
- `sensors=[]` or `modifiers=[]` deliberately disables that inherited pipeline. Undefined and empty array are not interchangeable.
- Mutable `element`, `handle`, manager, metadata, type and options update bindings without duplicating listeners. Old refs are released before replacement refs become active.
- Read-only state includes `status: idle | dragging | dropping`, `isDragSource`, `isDragging`, `isDropping`.
- `register()`, `unregister()`, and `destroy()` are idempotent and instance-guarded. Registration returns a cleanup function.
- An unbound entity may exist before refs mount. It cannot activate without valid manager/element state. Destroy-before-deferred-register prevents registration permanently.

### 4.4 Droppable

Input includes common entity fields plus `type`, `accept`, `collisionDetector`, `collisionPriority`, and `element`. The DOM default detector is `defaultCollisionDetection`.

- `accept` is undefined for unrestricted acceptance, one type, an array of types, or a source predicate. Empty acceptance arrays accept none. A predicate is called even for an untyped draggable. Type equality is exact, including symbols and falsy valid values.
- `accepts(source)` applies current options. Disabled is a separate eligibility condition; consumers must not infer enabled state merely from acceptance.
- `shape` is unavailable until measurable in the initialized operation. Observation runs only with an eligible source, enabled accepting target and valid element.
- `refreshShape()` measures current geometry; equal rectangle values preserve stable shape identity where upstream does. Missing/disconnected/unmeasurable geometry clears participation rather than keeping a stale hit area.
- `proxy` temporarily replaces the measurement element during feedback; the authored element remains separately owned and is restored exactly once.
- `isDropTarget` derives from the current manager target; it is not independently writable.
- Target removal, disabling, acceptance changes, detector changes and geometry changes invalidate collisions even if the pointer has not moved.

### 4.5 Sortable

`Sortable` composes a `Draggable` and `Droppable`; it does not fork their logic. Both share ID, metadata, type and manager. Public inputs additionally include required finite nonnegative integer `index`, optional `group`, optional separate `target`, and `transition`.

| Surface                                 | Requirement                                                                                                                                                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `disabled`                              | Boolean disables both lanes; `{ draggable?, droppable? }` independently controls them, omitted flags false.                                                                                                                  |
| `element`, `source`, `target`, `handle` | Common element can feed both lanes. Replacing it updates only refs that still followed the previous common element, preserving explicit separate refs.                                                                       |
| `index`, `group`                        | Current projected membership, updated atomically with associated registry state. Sparse indices are allowed in Foundation.                                                                                                   |
| `initialIndex`, `initialGroup`          | Snapshot from the current operation, retained by manager and typed ID across source remounts; clear at operation completion.                                                                                                 |
| `draggable`, `droppable`                | Access to the actual composed entities, not copies of state.                                                                                                                                                                 |
| `transition`                            | Undefined merges defaults; null disables; partial object merges independently. Runtime baseline is 250 ms, `cubic-bezier(0.25, 1, 0.5, 1)`, `idle=false`. The upstream comment saying 300 ms is not the implemented default. |
| Forwarded configuration                 | Sensors, modifiers, alignment, type, accept, collision detector/priority and explicit service options retain constituent semantics.                                                                                          |
| Derived state/methods                   | `status`, drag/drop flags, `accepts`, `refreshShape`, `register`, `unregister`, `destroy` delegate to the composed owners.                                                                                                   |

Register, rekey, manager replacement and destruction operate on both entities as one coherent unit. Split disabling does not accidentally reset the other lane. In feedback `move` mode, the moving source cannot serve as its own stationary target unless an independent target is configured.

### 4.6 Extension and service option contracts

The plugin exclusion must not leave the supported customization surface implicit.

| Interface             | Complete required shape and behavior                                                                                                                                                                                                                                                                                                         |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renderer              | `readonly rendering: Promise<void>`; standalone default resolves immediately. List rendering waits for affected hosts, including pending keyed membership/ref updates. A rejected barrier cancels the action and cleans up.                                                                                                                  |
| Monitor               | `addEventListener(name, (event, manager) => void): () => void` and `removeEventListener(name, handler)`. Dispatch uses a stable listener snapshot: adding/removing a handler during dispatch affects later dispatches, not arbitrary iteration order.                                                                                        |
| Collision observer    | Read-only `collisions`; `computeCollisions(entries?, detectorOverride?)`; `forceUpdate(immediate = true)`. False clears coordinate deduplication for the next evaluation; true evaluates now. Temporary enable/disable ownership uses leases so nested users cannot re-enable another user's suppression.                                    |
| Collision result      | `{ id, priority, type, value, data? }`; ID belongs to the evaluated candidate; priority is finite numeric; type is the declared enum; value is a nonnegative score or valid positive infinity. Invalid result is diagnosed and excluded; thrown detector cancels the current default action.                                                 |
| Collision enums       | Priority `Lowest=0, Low=1, Normal=2, High=3, Highest=4`; type `Collision=0, ShapeIntersection=1, PointerIntersection=2`. Preserve numeric ordering in serialized diagnostics and tests.                                                                                                                                                      |
| Custom sensor         | Dedicated factory/instance owns `bind(source, options?) => cleanup`, active disabled state and `destroy()`. Constructor/configuration descriptors are sensor-specific; no general plugin descriptors. Bind/unbind follows entity registration/ref/options replacement.                                                                       |
| Activation constraint | Dedicated instance receives the activation controller, `onEvent(event)`, `activate(event)` and `abort(event?)`; single-operation ownership. Reusing a descriptor creates fresh timers/state, not one constraint instance shared by simultaneous managers.                                                                                    |
| Custom modifier       | Dedicated factory/instance implements `apply(operation) => Coordinates` and optional disposal. Operation transform passed to each modifier incorporates the previous modifier's result. Disabled modifiers pass through.                                                                                                                     |
| Alignment             | `{ x: 'start' \| 'center' \| 'end', y: 'start' \| 'center' \| 'end' }`; absent uses source rectangle-delta center alignment. Validate both axes; alignment affects target and drop positioning, not only CSS text alignment.                                                                                                                 |
| Feedback input        | Mode string or `(source, manager) => mode`; resolve against current source, validate returned mode.                                                                                                                                                                                                                                          |
| Feedback root         | `rootElement?: Element \| ((source) => Element)`; validate supported owner realm and connection. Default uses the source/overlay environment. Replacement releases old root style leases and remeasures.                                                                                                                                     |
| Overlay               | Existing element for programmatic Foundation use, or list renderer result; `overlayDisabled?: boolean \| ((source) => boolean)`. Disabled overlay falls back to the configured source feedback mode. Custom root/tag/style/class capabilities map to renderer output, portal root and existing part hooks.                                   |
| Drop animation        | `{duration?: number, easing?: string}` or `(context) => void \| Promise<void>`, plus null disable. Context contains source, original element, feedback element, placeholder, translate and moved flag. Default 250 ms/ease; validate finite nonnegative duration and valid CSS timing function.                                              |
| Keyboard transition   | `{duration?: number, easing?: string} \| null`; actual feedback default is 250 ms and `cubic-bezier(0.25, 1, 0.5, 1)`. Do not copy the unrelated generic Transition comment's ease-in-out default.                                                                                                                                           |
| Auto-scroll           | `boolean \| {acceleration?: number, threshold?: number \| {x:number,y:number}}`; default true, acceleration 25, threshold 0.2 both axes. Validate finite nonnegative acceleration and per-axis fractions in `[0,1]`; zero threshold disables that axis.                                                                                      |
| Accessibility         | `{id?: string, idPrefix?: {description?: string, announcement?: string}, debounce?: number}` plus instructions and announcements. Stable generated IDs by default, debounce 500 ms; explicit IDs must be unique in their owner root.                                                                                                         |
| Instructions          | `{draggable: string}` or an equivalent documented localizable resolver; reflect actual configured keys. Empty text is explicit consumer suppression, not a missing fallback accident.                                                                                                                                                        |
| Announcements         | `dragstart`, `dragend`, optional `dragmove`, `dragover` callbacks `(event, manager) => string \| undefined`; undefined suppresses that event. Partial overrides merge defaults by named event; explicit suppression requires a callback returning undefined.                                                                                 |
| Sortable type guards  | `isSortable(entity)` recognizes the actual composed local draggable/droppable types and handles null safely; `isSortableOperation(operation)` requires both source and target sortable. Do not infer sortability merely from arbitrary `index` metadata. Helpers' documented computed-index fallback is a separate guarded duck-typing path. |

`rootElement`, `overlayDisabled`, and `accessibility` are property-only list options in addition to the scalar/rendering properties in section 13. The Foundation owns explicit service enablement internally; imperative sensor/modifier disable operations must not bypass operation cancellation or resource release.

### 4.7 Boundary validation policy

Different failure kinds require different outcomes; one blanket silent fallback is insufficient.

| Boundary                                 | Validation timing                                              | Failure outcome                                                                                                                                       |
| ---------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Programmer construction/start parameters | Before acquisition or operation mutation                       | Documented error and diagnostic; last coherent state unchanged.                                                                                       |
| Mutable entity/list options              | Before rebinding refs, replacing membership or scheduling work | Diagnose once per distinct invalid configuration, retain previous coherent configuration; cancel an active gesture if its required owner disappeared. |
| Pointer/keyboard eligibility             | Before claiming event or preventing native default             | Ignore ineligible input; do not create an error merely because a user clicked a disabled area.                                                        |
| Consumer cancellation                    | At each event's specified default-action boundary              | Stop that default action with event-specific semantics, not indiscriminately cancel the entire drag.                                                  |
| Helper data/index mismatch               | Before every mutation branch                                   | Return original input, prevent applicable default, diagnose invalid shape/index; no splice coercion.                                                  |
| Unmeasurable/disconnected target         | Before collision and again before drop                         | Exclude/clear target; outside/no-target drop cannot commit.                                                                                           |
| Non-finite transform/coordinates         | Before publishing position and invoking geometry consumers     | Reject movement, retain last valid sample; never propagate NaN into CSS or sorting.                                                                   |
| Stale async continuation                 | Immediately after each await/deferred callback                 | Ignore old generation; run only its own idempotent resource release, never newer-operation cleanup.                                                   |
| Consumer callback invoked by Foundation  | Around direct invocation                                       | Cancel pending default action, run mandatory cleanup, report error.                                                                                   |
| Controlled acceptance                    | After all proposal callbacks, before any lane publication      | Validate all acknowledgments and typed identity conservation; reject all lanes on any failure.                                                        |
| Animation rejection/cleanup exception    | At completion/disposal                                         | Complete mandatory terminal cleanup; report failure; no stranded active state.                                                                        |

Native DOM `dispatchEvent` reports listener exceptions through the browser rather than throwing them back to the dispatcher. Do not claim that a catch around `dispatchEvent` can turn arbitrary application listener exceptions into a veto. DOM consumers must use cancellation or reject through the explicit suspension/transaction API; direct Foundation callbacks can be guarded normally. Test these channels separately and document their distinction.

## 5. Operation state machine, events, and terminal validation

### 5.1 Transitions

| State                    | Permitted transition and validation                                                                                                                            |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `idle`                   | Valid start enters `initialization-pending`; missing source, invalid coordinates, destroyed manager or active operation cannot partially mutate state.         |
| `initialization-pending` | Reset operation-local shape/cancellation/position, dispatch cancelable before-start; prevention aborts and restores idle.                                      |
| `initializing`           | Establish refs and geometry and await renderer. Abort/generation/identity checks run again after the await.                                                    |
| `dragging`               | Publish drag-start once before collision/drag-over effects; allow movement, target changes and preview.                                                        |
| Terminal requested       | Abort input immediately; flush final movement before terminal snapshot; issue drag-end once, optionally await explicit suspension. No new movement may commit. |
| `dropped`                | Await drop feedback while source can remain `dropping`; do not clear retained source needed for animation prematurely.                                         |
| `idle` after settlement  | Release operation resources, clear cached source/target/initial membership and publish settled outcome exactly once.                                           |

Every asynchronous callback carries an operation generation and relevant entity/membership version. After each microtask, renderer promise, animation promise, timer or suspended continuation, check generation, abort, manager lifetime and relevant membership before any write. An old operation cannot move, announce, focus, reorder, or clear a newer operation.

### 5.2 Event contract

Foundation names map to composed, bubbling list events. Event snapshots copy coordinates/rectangles/indices at dispatch; retaining an event must not reveal later mutation of numeric state. Consumer metadata remains consumer-owned by reference.

| Foundation event                      | List event             | Cancellation/default behavior                                                                                                       |
| ------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `beforedragstart`                     | `tp-before-drag-start` | Cancelable; prevention aborts before drag-start and before any committed value change.                                              |
| `dragstart`                           | `tp-drag-start`        | Notification after successful initialization; cannot undo initialization by treating it as before-start.                            |
| `dragmove`                            | `tp-drag-move`         | Cancelable by default; dispatch before movement, with requested `to`/`by` and pre-move snapshot; prevented movement is not applied. |
| `collision`                           | `tp-collision`         | Cancelable default target-selection effect; inspect ordered collision candidates.                                                   |
| `dragover`                            | `tp-drag-over`         | Cancelable sorting/default response after target changes; prevention does not restore the previous target.                          |
| `dragend`                             | `tp-drag-end`          | Terminal notification with canceled flag and synchronous `suspend()` facility; cannot keep input active.                            |
| `settled` (local completion contract) | `tp-drag-settled`      | Exactly once after transaction/feedback cleanup, with committed/canceled/rejected outcome.                                          |

Events include operation ID, source and target identities, initial/current position and transform, active input source, source event (synthetic event for imperative calls), relevant group/index snapshots, and cancellation/outcome data. In connected lists, dispatch one local observation per participating host without creating a second manager operation or duplicate commit. The source list is the initiating value-change owner; the destination receives its own lane proposal.

Direct Foundation callback exceptions stop the default action, report a diagnostic and enter cancellation cleanup; native DOM listener exceptions follow the separate platform boundary in section 4.7. Do not swallow a directly observed exception and proceed to commit. Cleanup exceptions are isolated: release all remaining resources, then report failure. Preventing a movement, collision or over event must not strand the operation.

### 5.3 Suspension

- `suspend()` is callable synchronously during drag-end dispatch. Repeated calls return the same operation-scoped handle.
- The handle exposes resume/abort completion; first settlement wins. Calls after settlement or from an old operation are inert.
- While suspended, no pointer/keyboard input moves the operation, no committed arrays change, and no new operation can reuse that manager.
- Manager destruction, explicit cancellation, loss of required entities or authoritative data replacement aborts pending completion.
- There is no timeout that silently accepts a drop. Consumer rejection, thrown/rejected asynchronous work, or incompatible controlled updates restore preview and settle rejected/canceled.
- Drop animation failure never prevents mandatory finalization. Motion-service completion bounds apply to visual work separately from a consumer decision suspension.

### 5.4 Registry and remount correctness

Deferred registration, rekey and unregistration check instance identity. Old cleanup for ID A cannot delete a newer registration for A. Rekey atomically removes the old key and installs the new key only after duplicate validation; failed rekey leaves the old coherent registration intact. Destroyed entities cannot return through queued effects.

Multiple same-turn rekeys form one transaction. Validate the **final mapping**, excluding keys relinquished by entities in that same batch, so a legitimate A↔B swap or larger permutation succeeds. Validate and remove old keys before installing new keys; observers see no intermediate duplicate/missing membership. Collisions/target selection defer while the rekey batch is pending. A collision with a nonparticipating incumbent rejects the conflicting batch coherently. V-03 and V-47 must include virtualized simultaneous ID swaps, not only one-at-a-time renames.

A source may remount with the same ID during a renderer transition. Preserve its operation snapshot and initial group/index, then bind the replacement instance. Permanent removal cancels the gesture. A render-barrier grace period is bounded by that transition; it is not indefinite retention of detached source elements. Target lookups always reflect current registration. Clear retained source references at final settlement.

## 6. Pointer activation and input specification

### 6.1 Eligibility and ownership

Before claiming a pointer-down, reject a disabled sensor/source, nonprimary pointer, nonzero button, non-element effective target, already claimed sensor event, non-idle manager, consumer-prevented event, or `preventActivation` veto. Resolve the effective composed target across supported shadow boundaries and owner realms.

Bind to `handle ?? element` by default. `activatorElements` can supply an array or resolver with multiple elements; ignore absent entries, deduplicate actual bindings, and remove previous bindings on replacement. Activator elements do not imply a new draggable identity.

Default nested-action exclusion permits the source itself, the handle and descendants of the handle. Other interactive descendants—buttons, inputs, links, editable content and their descendants—retain their own interaction. A source that is itself interactive is not rejected merely for its own semantic role. Custom `preventActivation` can refine this policy.

Once a pointer is claimed, only its `pointerId` can move, release or cancel that operation. Unrelated fingers/pens must not end it. Capture is deferred until activation and is owned by the source document; capture failure cancels safely. Explicitly release capture at every terminal path.

### 6.2 Default constraints

| Input/context                                    | Activation policy                                                                 |
| ------------------------------------------------ | --------------------------------------------------------------------------------- |
| Mouse on handle or its descendant                | Immediate, after eligibility/veto checks                                          |
| Touch                                            | Delay 250 ms with movement tolerance 5 px                                         |
| Eligible text input whose event is not prevented | Delay 200 ms, tolerance 0 px                                                      |
| Other pointer activation                         | Delay 200 ms/tolerance 10 px **OR** Euclidean distance strictly greater than 5 px |

The interactive-descendant filter runs before the text-input constraint branch. Do not mistakenly make all embedded inputs drag handles because a text-input constraint exists.

Activation constraints can be a list or a `(event, source) => constraints` resolver. A defined empty list/no constraints activates immediately after eligibility. Multiple constraints have OR activation semantics: the first activation wins, then all constraint resources are cleaned up. An individual delay tolerance failure cancels that delay branch; it does not invent AND semantics for a parallel distance branch.

Distance supports a scalar Euclidean threshold, an x-only threshold, a y-only threshold, or both x and y; the two-axis object requires both thresholds. Comparisons are strict `>` rather than `>=`. Delay and distance values/tolerances must be finite and nonnegative. Invalid configurations fail before listeners/timers are acquired.

### 6.3 Movement and cancellation

- Convert event coordinates through the source frame transform before storing them; do not mix local client coordinates with top-document rectangles.
- While pending, movement feeds activation constraints. Early pointer-up, pointercancel, native-drag conflict, disable, disconnect, or veto cancels every pending timer.
- Once active, coalesce pointer moves per frame but flush the most recent valid coordinates before drop evaluation. No movement from a canceled frame may execute later.
- Suppress scrolling, click, context menu and selection only for the owned active gesture. A click that never activated remains a click. Preserve unrelated controls and other managers.
- An explicitly native-draggable element's native drag-start cancels this activation; otherwise prevent conflicting native dragging for the owned gesture.
- Escape, pointercancel and lost required capture enter the same idempotent cancellation path. Initialization-pending cancellation is included, not just fully initialized dragging.
- Scope any touch workaround listener to a reference-counted owner window and release its lease. A process-global WeakSet must not leave unreleasable listeners.

## 7. Keyboard and focus specification

| Setting           | Default                                                                                                  |
| ----------------- | -------------------------------------------------------------------------------------------------------- |
| Start             | Space, Enter                                                                                             |
| End               | Space, Enter, Tab                                                                                        |
| Cancel            | Escape                                                                                                   |
| Directions        | ArrowUp, ArrowDown, ArrowLeft, ArrowRight                                                                |
| Free displacement | 10 px per direction; scalar or `{x,y}` option; Shift multiplies by 5                                     |
| Activation target | Actual handle, otherwise actual source element; unrelated bubbling descendant key events do not activate |

Normalize logical `event.key`, including Space/Spacebar aliases, named key casing and printable keys. Preserve supported `KeyW`/`Digit1` configuration aliases without turning the implementation into a physical-key-only sensor. Partial option objects retain defaults; per-source offset options must be used by movement as well as start/end handlers.

Before keyboard start, reveal the source and start at its measured center. Missing element cannot leave partial state. Disable edge auto-scrolling during keyboard operation with a lease and restore the previous setting afterward. Directional target reveal remains active.

For Sortable keyboard movement, preserve the source geometric selection algorithm: directional eligibility with 10 px tolerance, clipped candidate consideration with the reference 0.2 margin, accepting/enabled current registrations, closest-corner ranking, and final target alignment after rendering. The sorting handler prevents the free-displacement default when it handles movement. If no candidate qualifies, retain position and restore collision/scroller state in `finally`; no early return may leave observation disabled.

On Space/Enter drop or Escape cancel, restore focus to the surviving source handle after feedback completes; if transferred, resolve the destination handle by stable item ID. If the source was removed, use the explicit surviving list fallback without focusing a detached node. Pointer completion does not steal focus.

Tab ends the drag and permits normal forward/backward focus traversal. Do not retain upstream's unconditional Tab prevention if it traps focus. Delayed drop completion must not later pull focus back after Tab. Named instructions must describe the actual configured keys, and updated keyboard configuration must update those instructions.

## 8. Geometry, collision and modifiers

### 8.1 Coordinate and measurement invariants

- Rectangles preserve left/top/width/height, derived edges, center and ordered corners. Equality uses the source rectangle fields. Intersections require positive area; edge contact alone is not overlapping area.
- Positions preserve initial/previous/current samples, displacement from initial, direction and velocity. Dominant-axis direction uses the upstream tie behavior (vertical on equal magnitude). Zero elapsed time must not create NaN velocity.
- Reject NaN/infinite coordinates or rectangle dimensions, negative dimensions, and invalid modifier results. A zero-area/unmeasurable target is not an eligible hit region.
- Preserve existing CSS transforms, independent translate/scale, transform origin, box sizing, ancestor scale (including negative scale), nested scrolling, visual viewport zoom and frame offsets. Missing computed translate/scale values have explicit identity defaults.
- Measure final resting geometry after renderer completion. Cancel only conflicting transform/translate/scale transitions before final measurement; do not sample a mid-transition rect as the destination or cancel unrelated transitions.
- Use owner-window constructors or realm-safe checks, not global `instanceof HTMLElement` assumptions. Same-origin frame traversal handles inaccessible boundaries without throwing through the operation.
- Resize, scroll, layout shift, target replacement, frame/viewport changes and proxy changes can force collision recomputation with a stationary pointer. Deduplicating unchanged coordinates must not suppress these invalidations.

### 8.2 Detection and ranking

Candidate filtering requires initialized active geometry, current registration, enabled target, acceptance of the current source, available detector and valid target shape. Revalidate before adopting a candidate; removed or newly rejected targets cannot commit.

| Detector                    | Required source behavior                                                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultCollisionDetection` | `pointerIntersection` result when present, otherwise `shapeIntersection`                                                                            |
| `pointerIntersection`       | Inclusive point-in-rectangle boundaries; score `1 / distance(pointer, target.center)`; high priority                                                |
| `shapeIntersection`         | For positive intersection area I: score `(I / (source.area + target.area - I)) / distance(pointer, target.center)`; normal priority                 |
| `closestCenter`             | Reference intersection result first; otherwise reciprocal center distance                                                                           |
| `closestCorners`            | Reciprocal average distance between corresponding rectangle corners                                                                                 |
| `pointerDistance`           | Reciprocal distance from pointer to target center                                                                                                   |
| `directionBiased`           | Default detection without direction; otherwise reference directional edge/center comparison and reciprocal scoring, with its zero-distance fallback |

Port the actual formulas and numeric enum ordering from U5, not verbal approximations in this table. Candidate sorting is priority descending, collision type descending, score descending, then stable source order. A target's explicit priority overrides algorithm priority. Positive infinity from an exact zero-distance reciprocal is legitimate; NaN is not.

Target-selection deduplication compares the ordered sequence of **typed IDs**. Concatenating IDs is invalid: `[1, 23]` and `[12, 3]`, or numeric and string IDs, must not be collapsed. The upstream notifier dispatches the collision event before this sequence comparison: an updated collision evaluation can still notify consumers about changed scores/geometry when IDs are unchanged. Do not move deduplication ahead of event dispatch and silently remove that observation capability. Preserve the distinction between preventing collision target selection and preventing the sorting response to a target already selected.

### 8.3 Modifier pipeline

Modifiers run in configured order on the proposed transform. Manager-owned modifier instances persist across operations; per-source instances are released when ownership changes or the operation ends. Configuration uses dedicated modifier factories, not the excluded plugin registry.

| Modifier            | Contract                                                                                                                                                                                                                            |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Axis restriction    | `AxisModifier({axis, value})` fixes the specified axis to a finite value; vertical convenience fixes x=0, horizontal fixes y=0. It does not fix the named allowed axis by mistake.                                                  |
| Grid snap           | Default grid size 20, scalar or independent `{x,y}` sizes; `ceil(delta / size) * size`, including negative deltas; positive finite grid validation                                                                                  |
| Bounding rectangle  | Use source shape and initial/current transform as the reference does; clamp to bounds and preserve documented top/left precedence when the dragged shape exceeds the bounds                                                         |
| Element restriction | `element` is an element, null or operation resolver; absent/null is pass-through. Observe current bounding element geometry, resize and scroll; release observation and the reference 25 ms scroll-update timer on replacement/end. |
| Window restriction  | Use owner environment/viewport, including updates and embedded contexts                                                                                                                                                             |

The package must import in an environment without `ResizeObserver`, `window`, or `document`. Acquire browser services when an actual binding needs them. Unsupported measurement cannot silently produce fabricated bounds.

## 9. Sorting and immutable helper specification

### 9.1 Helpers

Port `arrayMove`, `arraySwap`, `move`, and `swap` from U8, including all current fallback/reconciliation branches. Preserve object/item identity and input arrays. Valid changes return new affected arrays; no-op returns the original reference. Unaffected grouped arrays preserve their references.

Validation occurs **before every splice/indexing branch**, including fallback and optimistic reconciliation paths:

| Input                                            | Required handling                                                                                        |
| ------------------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| Missing source/target or canceled operation      | No mutation; prevent the default when the supplied event supports prevention                             |
| Item lookup                                      | Primitive identity or non-null object with matching `id`; null entries cannot throw                      |
| Source index                                     | Finite integer within the existing source array                                                          |
| Same-array destination                           | Finite integer in `0..length-1`                                                                          |
| Cross-array insertion                            | Finite integer in `0..destination.length`                                                                |
| Negative, fractional, NaN or infinite index      | No mutation and diagnostic; never rely on `splice` coercion                                              |
| Group record lookup                              | Stringify identifier and require an own property; inherited `constructor`/prototype values are not lists |
| Missing group/array or invalid computed fallback | No mutation; no insertion of `undefined`                                                                 |
| Same position                                    | Preserve references and avoid value notifications                                                        |

Prefer item-ID lookup. If IDs are computed and do not occur in data, fall back to the source's initial/current sortable indices and groups after validation. When optimistic sorting makes target and source IDs equal, reconcile the source's projected index/group rather than treating every such event as a no-op.

For grouped records, use shape center, falling back to operation position, for target insertion. The upstream helper uses vertical midpoint rounding for transfers; preserve that exported helper behavior. The list adapter additionally resolves its horizontal/RTL logical insertion boundary without silently changing the legacy helper's semantics. Container-only targets insert at the relevant beginning/end boundary and include empty containers.

Same-group `swap` exchanges items. Cross-group `swap` follows upstream transfer semantics; it does not invent a two-way cross-list exchange.

### 9.2 Optimistic sorting

Capture group membership and actual indices before asynchronous rendering. Preserve sparse indices rather than treating registry iteration order as the index. Revalidate source/target registration, group, index and membership after every async boundary; if the consumer intervened, discard the stale projection.

The reference directly moves DOM siblings. In the Lit list, use a keyed renderer and preview ordering, then await both affected hosts. Do not call `insertAdjacentElement` on Lit-owned children and leave Lit's committed model disagreeing with the DOM.

After projection, update related index/group state coherently and preserve the reference source-target reconciliation behavior. On cancellation restore the operation's initial projected state only where the consumer has not supplied a newer authoritative state. A stale rollback cannot overwrite an external update.

### 9.3 Sort transitions

Record old geometry, await rendering, cancel conflicting transform transitions, measure new geometry, and animate the resulting FLIP displacement through the shared motion owner. Preserve authored translate/scale/transform. Null transition disables animation; partial options merge with runtime defaults; idle changes animate only with `idle=true`; reduced motion resolves to zero duration. Geometry observation/cleanup is required even when animation is disabled.

## 10. Feedback, overlay and style restoration

### 10.1 Modes

| Mode      | Behavior                                                                               |
| --------- | -------------------------------------------------------------------------------------- |
| `default` | Moving original with hidden layout placeholder, preserving source layout and geometry  |
| `clone`   | Moving feedback with a visible copy placeholder as in the reference                    |
| `move`    | Move source without placeholder; stationary target behavior requires a separate target |
| `none`    | No visual feedback mutation; source geometry and collision continue to function        |

Support a consumer-rendered overlay/root and disabled overlay predicate without disabling the operation. Overlay content may depend on the retained source and persists through drop completion. It must not register duplicate drag entities. Use an explicit feedback rendering scope, not a patched manager prototype or globally suppressed registration.

The source can be promoted to the top layer where supported and appropriate. Preserve parent/sibling placement, scroll position, containing-block behavior, source dimensions, box sizing, transforms, origin, translate and scale. Fallback hosting must preserve the same geometry when popovers/top-layer support is unavailable.

### 10.2 Placeholder and clone integrity

- Proxy all relevant contained droppable measurements, including multiple droppables sharing an element; restore each independently.
- Placeholder is inert, `aria-hidden`, and correctly uses `tabindex`, not upstream's `tab-index` typo. It is excluded from forms, focus navigation, hit testing and entity registration.
- Cloning cannot introduce duplicate document IDs or duplicate label/description targets. Rewrite/remove clone-local references coherently; do not disrupt the real source's IDs.
- Preserve applicable native values; never attempt to assign a file input value. Isolate radio names so clones cannot alter checked state in the real form. Copy canvas pixels and SVG content when using DOM clones.
- Arbitrary shadow-root component internals are not safely reproduced with `cloneNode`. The list uses its renderer for preview; Foundation consumers can supply a custom overlay for opaque components.
- Table-cell placeholders preserve measured fractional column widths and restore previous styles afterward.
- Sibling insertion/removal and reparenting during dragging must not orphan the placeholder or restore the source into an obsolete location.

### 10.3 Owned side effects

Record authored values before writes and restore only values still owned by the drag operation. A consumer style change during dragging wins over stale restoration. Read original transform values before mutating a live computed-style dependency. Preserve unrelated transition declarations and avoid global selector escalation.

Every observer, style lease, cursor override, selection lease, portal node, popover, placeholder, proxy, native attribute and pending frame is released on success, cancel, veto, exception, rejected animation, manager destruction and source removal. Shared generated styles remain while another manager owns a lease.

### 10.4 Drop and keyboard animation

Drop configuration precedence is entity override, overlay override, then manager default. Undefined inherits; null disables. The reference drop default is 250 ms with ease timing; keyboard feedback has its own default transition and can be configured independently. Custom drop animation can return a promise; catch rejection and always finalize.

Source `dropping` and retained overlay state last until animation completion/cancellation. Do not clear the overlay one frame before the source settles. Reduced motion, hidden/disconnected targets and explicit disabled animation all take a cleanup-correct immediate path. Focus restoration occurs after completion except Tab traversal as specified above.

## 11. Scrolling and environment

Port nested-scroller discovery, scroll intent and compensation from U10/U12, preserving the owner document and transformed coordinate systems.

- Auto-scroll uses the reference 10 ms interval scheduling coordinated with animation frames, acceleration 25 and edge threshold 0.2 per axis by default. Threshold zero disables that axis; options update live.
- Direction intent starts locked and unlocks according to actual movement. Preserve the current ancestor set while scrolling; do not oscillate scrollers as content moves beneath a stationary pointer.
- Choose the first eligible nested ancestor under the pointer/target context. When an inner scroller is at its boundary, allow the applicable ancestor to continue. Validate scrollability and boundary state from the current snapshot.
- Handle negative transform scales, the reference 10 px cross-axis tolerance and visual viewport dimensions for document scrolling.
- Keyboard operation suppresses pointer edge auto-scroll but retains target reveal. Reveal supports nearest, center and none on block/inline axes and respects nested offset-parent geometry.
- Scroll movement compensates the operation's geometry without fabricating user pointer movement. A stationary pointer can change collisions because a target moved under it.
- Preserve the reference scroll-listener throttling (50 ms) and position-observation scheduling (75 ms) where retained; canceled trailing callbacks must not execute after disposal.
- Observe source/target roots, same-origin documents and relevant viewports. Cross-origin traversal stops at the boundary; no attempt to access protected documents.
- Avoid process-global `window`/`document` assumptions. Resource ownership follows the element's actual realm and composed environment.

## 12. Accessibility contract

Provide localized/configurable hidden instructions and a polite atomic live region using stable owner-scoped IDs. Default announcements identify the item and, when available, destination and position. Never stringify arbitrary object payloads into spoken text.

Start and end/cancel announcements are immediate. Movement/over announcements use the reference 500 ms debounce. Terminal announcements cancel queued movement messages; an old operation cannot announce after a newer operation starts. Announcements can return no text to suppress a message explicitly.

Apply interaction semantics to the actual activator. A native handle button retains native button semantics and an item-specific name. Do not turn every list row into a button or add deprecated/inappropriate `aria-grabbed` or toggle `aria-pressed` semantics merely because upstream does. Merge owned instruction description IDs with authored `aria-describedby`; do not erase consumer IDs on cleanup or replacement.

Native ordered-list/list-item semantics remain intact. A drag preview is not a second announced list item. Disabled/read-only drag policy preserves navigation and unrelated item actions. Empty-list targets have a meaningful list label and keyboard-transfer destination description.

Accessibility verification has four separate evidence categories: accessibility-tree semantics, real keyboard/focus behavior, automated accessibility analysis, and actual assistive-technology testing if performed. A tree snapshot or zero automated violations cannot be described as screen-reader verification.

## 13. `tp-drag-drop-list` complete control contract

### 13.1 Value, identity and rendering

`TpDragDropList<T>` binds one canonical `readonly T[]` lane. Identity is stable through reorder/transfer; immutable arrays can contain the same object references after movement.

| Property                                              | Type/default and validation                                                                                                                                                       |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `value`                                               | `readonly T[] \| undefined`; defined on initialization selects controlled mode. Never mutate owner arrays.                                                                        |
| `defaultValue`                                        | `readonly T[] \| undefined`, effective `[]`; mutually exclusive with controlled `value`; mode does not switch over the host lifetime.                                             |
| `getItemId`                                           | `(item, index) => UniqueIdentifier`; default supports primitive string/number or an object's own `id`. Index argument is context, not permission to use unstable index identity.  |
| `getItemLabel`                                        | `(item, index) => string`; default uses a suitable label or stringified ID; require useful accessible text.                                                                       |
| `renderItem`                                          | `(item, context) => Lit content`; content is composed inside the real List Item. Context includes stable ID, committed/preview index, drag/drop/disabled state, and current list. |
| `getItemOptions`                                      | Resolver of item-level sortable/service configuration. It cannot override list-owned ID, index, group, manager, refs or registration.                                             |
| `manager`                                             | Optional `DragDropManager`; absent creates an isolated owned manager. Shared instance explicitly connects lists.                                                                  |
| `group`                                               | Optional typed identifier, stable generated default; must be unique among participating lists in the manager.                                                                     |
| `orientation`                                         | `'vertical' \| 'horizontal'`, default vertical; horizontal insertion and keyboard mapping respect direction.                                                                      |
| `disabled`                                            | Boolean false; both drag and drop participation disabled, native nested actions follow their own policy.                                                                          |
| `readOnly`                                            | Boolean false; no user reorder/transfer or imperative mutation through this control; content remains readable/navigable.                                                          |
| `activation`                                          | `'handle' \| 'item'`, default handle; item mode expands pointer activation while retaining a named keyboard handle/action.                                                        |
| `reorderMode`                                         | `'move' \| 'swap'`, default move; cross-list swap still transfers as upstream specifies.                                                                                          |
| `variant`                                             | `'ghost' \| 'outline' \| 'subdued'`, default ghost, forwarded to List Item.                                                                                                       |
| `size`                                                | `'xs' \| 'sm' \| 'default'`, default default, forwarded to List Item.                                                                                                             |
| `type`, `accept`                                      | Foundation type/acceptance configuration. Default list type is compatible only with list transfers in the same explicit manager.                                                  |
| `sensors`, `modifiers`                                | Foundation dedicated configuration; undefined inherits, empty arrays replace with none.                                                                                           |
| `collisionDetector`, `collisionPriority`, `alignment` | Foundation configuration with source defaults.                                                                                                                                    |
| `feedback`                                            | Mode string or source-aware resolver from section 4.6; default default.                                                                                                           |
| `renderOverlay`                                       | Optional source-aware Lit renderer with the same no-registration/inert-preview boundary.                                                                                          |
| `rootElement`, `overlayDisabled`                      | Feedback root and independent overlay suppression from section 4.6; default source environment and false.                                                                         |
| `transition`                                          | Sortable transition; default 250 ms/cubic-bezier/idle false, partial merge, null disables.                                                                                        |
| `keyboardTransition`, `dropAnimation`                 | Independent feedback motion configuration, undefined inherits and null disables.                                                                                                  |
| `autoScroll`                                          | Boolean/options configuration; enabled with source defaults, owner-scoped and live-updatable.                                                                                     |
| `instructions`, `announcements`                       | Localizable text/rendering callbacks; reference behavior with correct local semantics.                                                                                            |
| `accessibility`                                       | Optional stable ID/prefix and announcement debounce options from section 4.6.                                                                                                     |

Complex data, callbacks, manager instances and option objects are property-only (`attribute: false`), never JSON parsed from arbitrary attributes. Scalar public attributes follow existing naming conventions; `readOnly` maps to `readonly`, `reorderMode` to `reorder-mode`. IDs and renderer output are validated before replacing a coherent membership snapshot.

Configuration precedence is manager → list → item. Undefined inherits. Arrays replace unless supplied through an explicit defaults-transform function. Null disables only on documented nullable options. Partial objects merge declared fields; they do not erase unspecified keyboard codes, transition values or scroll settings. Invalid options diagnose and retain the last coherent configuration.

Duplicate item IDs produce a diagnostic and only the first coherent item participates in dragging. Rendered duplicates must not share activator IDs or corrupt keyed rendering. A connected transfer cannot create an ID already present in the destination. Resolver errors cancel the pending action without partially publishing data.

### 13.2 Methods and observable state

- `moveItem(id, destination)` requests the same validated transaction as a user drop. `destination` identifies a participating target list/group and insertion index; same-list movement may omit the target list. Validate manager, acceptance, disabled/read-only state, ID uniqueness and index bounds. Return an explicit accepted/no-op/rejected outcome, not a fabricated successful drag event.
- `cancelDrag()` cancels an operation involving this list and is inert otherwise. It also aborts a suspended completion involving this list.
- Read-only committed and preview snapshots are distinct. Reading the canonical value never returns transient reorder data.
- `updateComplete` participates in the manager render barrier. Dynamic renderer/option changes do not reset an otherwise valid committed value.

### 13.3 Anatomy, parts and composition

| Public part   | Foundation part                       | Part slot       | Exposure                                                  |
| ------------- | ------------------------------------- | --------------- | --------------------------------------------------------- |
| Root          | List controller host                  | `root`          | `tp-drag-drop-list` public host                           |
| List          | Native ordered list                   | `list`          | Public part; owns list semantics                          |
| Item          | Sortable + native `li` + `TpListItem` | `item`          | Repeated generated public part; renderer supplies content |
| Handle        | Draggable activator + `TpButton`      | `handle`        | Generated named button; public styling part               |
| Placeholder   | Feedback placeholder                  | `placeholder`   | Inert generated part, never a public entity               |
| Overlay       | Feedback rendering scope              | `overlay`       | Generated/custom-rendered feedback part                   |
| Empty         | Empty destination + `TpEmptyState`    | `empty`         | Empty-state presentation within the list boundary         |
| Instructions  | Accessibility service                 | `instructions`  | Hidden owned text                                         |
| Announcements | Accessibility service                 | `announcements` | Hidden polite atomic live region                          |

| Public control | Kind                   | Variant axes and defaults                         | Fixed or re-defaulted foundation properties             | Surfaced hidden-part properties                                                                          |
| -------------- | ---------------------- | ------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Drag Drop List | Data-driven collection | variant ghost; size default; orientation vertical | keyed immutable data, commit on drop, handle activation | entity acceptance/sensors/modifiers/collision, feedback, scroll, motion, a11y configuration listed above |

The control does not expose an alternative slotted-item ownership model. Renderer callbacks are the item-content extension point. Native `ol`/`li` provide list semantics; visual row/action/icon/empty roles use existing components. No local substitutes in implementation, documentation, examples or fixtures. A surrounding Scroll Area is a composition choice, not a required hidden wrapper.

### 13.4 State and presentation inventory

Proposed state markers, to register in the live vocabulary: `dragging`, `dropping`, `drop-target`, `drag-disabled`, `drop-disabled`, `preview`, `pending`. Define each on its owning part rather than stamping every marker on every descendant. Existing disabled/read-only markers continue to follow common contracts.

| Public part   | Cardinality and containment               | Presentation key inventory                                                 |
| ------------- | ----------------------------------------- | -------------------------------------------------------------------------- |
| Root          | One host                                  | `drag-drop-list-root`                                                      |
| List          | One within Root                           | `drag-drop-list-list`                                                      |
| Item          | Zero or more within List                  | `drag-drop-list-item`; delegates row appearance to existing List Item keys |
| Handle        | One per participating Item                | `drag-drop-list-handle`; delegates button appearance to Button             |
| Placeholder   | At most one per source feedback placement | `drag-drop-list-placeholder`                                               |
| Overlay       | At most one per active manager feedback   | `drag-drop-list-overlay`                                                   |
| Empty         | One when empty                            | `drag-drop-list-empty`; delegates appearance to Empty State                |
| Instructions  | One per applicable owner                  | `drag-drop-list-instructions`                                              |
| Announcements | One per manager/announcement owner        | `drag-drop-list-announcements`                                             |

Structural styles own list layout, hit geometry and feedback placement only. Appearance belongs in the presentation dictionary and shared recipes. No new global colors, magic spacing theme, or mandatory elevated row treatment. Use semantic tokens. Consumer dictionary replacement and per-part/per-instance hooks remain terminal presentation overrides and cannot reset behavioral state.

Register distinct motion roles for sort displacement, keyboard feedback and drop settlement. Role defaults map to the durations above, obey reduced motion, and permit existing motion-driver override/cancellation. A disabled animation does not disable finalization.

## 14. Commit-on-drop and connected transactions

### 14.1 Ownership model

At operation start, capture participating committed arrays, typed IDs, group ownership and membership versions. During dragging, derive preview arrays without writing `value`, uncontrolled committed state, or consumer data. Render preview order and update projected sortable geometry, but emit no value-change/commit notifications for hover movement.

If authoritative `value` data, identity resolver, manager, group or required membership changes incompatibly during a drag, cancel preview and preserve the new authoritative state. Do not restore the initial array over the owner's newer array. Compatible presentation-only changes can continue after remeasurement.

### 14.2 Successful drop algorithm

1. Flush the final input position and render/collision work for the current generation.
2. Resolve current source, accepted destination and final projected index; validate identity conservation, source ownership, target capacity/index, acceptance and current disabled/read-only state.
3. Dispatch drag-end with immutable proposed outcome; honor synchronous suspension if requested.
4. On continuation, revalidate generation, identities, versions and destination eligibility.
5. Build one lane proposal for a same-list change or two proposals for a transfer. Arrays are immutable and source item appears exactly once in the resulting connected set.
6. Submit proposals through `ControllableState.transaction`, preserving common cancellation and owner-acceptance semantics. All participating old values remain visible while approval is unresolved.
7. Validate controlled owner results against the proposal's typed identity order and transfer conservation. The owner may supply new item object references with the exact compatible IDs, but cannot acknowledge one side while rejecting the other.
8. Publish all accepted values before any commit notification. Then synchronize preview to committed state and run completion feedback/focus/announcements.
9. On veto, missing controlled acknowledgment, incompatible normalization, thrown handler or invalidation, reject the whole transaction and remove preview. No partial transfer, duplicated item or vanished item is allowed.

Controlled owners must respond synchronously to ordinary value-change requests using the existing state contract. Applications needing asynchronous authorization use drag-end suspension **before** the normal atomic transaction. Do not create a second uncontrolled shadow value to simulate controlled acceptance.

If the current shared transaction API cannot validate all resulting controlled arrays before publication, extend that existing owner with a prepublication validation facility and regression-test its other consumers. A validation callback executed before owner results are available does not satisfy this requirement. First inspect the existing participant `resolve()` hook: it runs after proposal dispatch and can read current owner properties, even though internal lane staging follows it. Reuse it when it can validate the complete owner result; do not assume its ordering requires a shared API change.

Atomicity covers the library's committed snapshots and commit notifications. The library cannot roll back unrelated application store writes performed inside consumer event listeners. Controlled applications must stage the connected proposal in one owner transaction, or restore their own rejected external writes; document this boundary and include an example with a single owner updating both lists. The shared lane owner consumes canceled synchronous input writes according to its existing contract, rather than publishing them on the next automatic host update. A later explicit authoritative owner update remains authoritative and is validated as a new input.

### 14.3 Value events

Use existing canonical `tp-value-change` / `tp-value-commit` event machinery and details: value, previous value, reason, source event, cancellation/propagation and metadata. Confirm actual names against the event owner before implementation. Register the list value lane's reasons: `drag` for pointer drop, `keyboard` for keyboard completion and `imperative-action` for `moveItem`.

Metadata identifies transaction/operation, source/destination group, item ID, old/new index and input kind. A successful same-list reorder emits one change/commit pair; a transfer emits one pair per changed lane. All committed lanes are observable before either commit callback. Outside drop, cancel, prevented proposal and no-op emit no commit. Preview notifications, if exposed for observation, are explicitly separate from value events.

### 14.4 Empty and connected-list behavior

Each list has a container droppable independent of item count. An empty accepting destination is reachable by pointer and keyboard, exposes meaningful geometry, and inserts at index zero. Nested item hits outrank the container according to declared collision priority; a container cannot oscillate with its child merely because a placeholder moves.

Connected lists require the same manager and compatible acceptance. Group IDs are unique, source item IDs cannot collide at the destination, and type predicates see the actual source metadata. Reordering across managers is rejected. Disconnecting a participating list aborts the transfer; disconnecting an unrelated list must not cancel another valid operation.

## 15. Explicit adaptations and upstream discrepancy register

These are deliberate local corrections, not claims that the reference already validates them.

| ID  | Source behavior/risk                                                  | Required local specification and regression                                               |
| --- | --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| A01 | Start can assign source before active-operation validation            | Validate without mutation; invalid second start preserves current operation.              |
| A02 | Queued movement/render callbacks lack complete generation checks      | Every deferred write verifies operation generation/lifetime.                              |
| A03 | Pointer stream is not consistently filtered by pointer ID             | Only owning pointer can move/end/cancel; unrelated pointer ignored.                       |
| A04 | Falsy acceptance/type checks conflate valid `0`/`''` with absence     | Use nullish/explicit checks; call predicates for untyped sources.                         |
| A05 | Collision sequence equality concatenates IDs                          | Compare typed ordered sequences, including length.                                        |
| A06 | Helper index checks differ across branches                            | Finite integer/range validation before every indexing/splice branch.                      |
| A07 | Registry replacement policy conflicts with shared duplicate rules     | First coherent registration wins; stale unregister is instance-guarded.                   |
| A08 | Per-source keyboard offset is not used uniformly                      | Resolve one complete operation option set for all handlers.                               |
| A09 | Keyboard no-candidate paths can leave temporary services disabled     | Restore collision/scroll leases in `finally`.                                             |
| A10 | Keyboard end prevents Tab                                             | Finish and allow normal traversal; no delayed focus theft.                                |
| A11 | Cleanup iteration/custom animation failures can interrupt restoration | Dispose all resources once; report failure; finish terminal state.                        |
| A12 | Style restore can overwrite consumer changes                          | Restore only still-owned writes through shared ownership mechanisms.                      |
| A13 | Placeholder `tab-index` and raw clones can break semantics/forms/IDs  | Correct tabindex, inert/hidden behavior and clone identity isolation.                     |
| A14 | Global browser assumptions and persistent workaround listeners        | Owner realm/environment and scoped/ref-counted leases.                                    |
| A15 | Visual feedback and geometry are coupled                              | `feedback='none'` still supports measuring, collisions and sorting.                       |
| A16 | Optimistic plugin mutates DOM siblings directly                       | Lit keyed preview renderer; preserve source sorting decisions and async validation.       |
| A17 | Upstream accessibility assigns generic role/pressed/grabbed state     | Use native semantics and merged owned descriptions; no incorrect toggle semantics.        |
| A18 | Framework provider may own/destroy a supplied manager                 | List only destroys its internally created manager.                                        |
| A19 | Sortable comment says 300 ms; runtime uses 250 ms                     | Specify and test actual 250 ms runtime default.                                           |
| A20 | Grouped helper is vertical                                            | Preserve helper API; list adapter handles horizontal and RTL insertion explicitly.        |
| A21 | Consumer data can change while preview/rollback awaits render         | Version-check projections; preserve authoritative replacement and cancel stale preview.   |
| A22 | Raw signal/framework dependency graph                                 | Replace with existing Foundation state/lifecycle owners, preserve subscription semantics. |
| A23 | Input-frame scheduling can miss the final pointer sample              | Flush last owned movement before terminal target/transaction snapshot.                    |
| A24 | Cached source can outlive an operation                                | Retain only through remount/drop lifecycle, then clear all source references.             |

## 16. Validation and regression acceptance matrix

### 16.1 Upstream test inventory

The inspected abstract/DOM/helpers suites contain 143 test cases: abstract drag-event-order 1, manager-modifiers 9, plugin-registry 16; DOM pointer 4, keyboard 6, sortable utilities 30, sortable transition 6, optimistic sorting 5, scroll utilities 5, modifiers import 1; helpers move 60. State comparator tests add 7. Counts describe the inspected baseline, not tests executed for this work, and parameterized test counts must be reconciled against the actual runner during porting.

Do not drop plugin-registry tests silently: classify public plugin API tests as excluded, and translate applicable singleton/configuration/disposal invariants into internal service lifecycle tests. Optimistic sorting and keyboard sorting plugin behavior is included in full.

Preserve shared-browser scenarios from `draggable.tests.ts`, `droppable.tests.ts`, `sortable-vertical.tests.ts`, `drag-offset.tests.ts`, `sortable-transformed.tests.ts`, and `deep-signal.tests.ts`. Read changelogs for regressions absent from current unit suites: virtual IDs, remount state, overlay flicker, sibling mutations, missing scale/translate values, nested scrolling, SVG cloning, Android capture cancellation, same-origin frames, RTL, style leases and duplicate drag-end races.

### 16.2 Capability index

| ID   | Capability                                    | Source                           | Acceptance scenarios        |
| ---- | --------------------------------------------- | -------------------------------- | --------------------------- |
| C-01 | Typed identity and registry                   | U2                               | V-01–V-06                   |
| C-02 | Manager state machine and async boundaries    | U1                               | V-07–V-17                   |
| C-03 | Entity acceptance and dynamic eligibility     | U2                               | V-32–V-33, V-45–V-47        |
| C-04 | Pointer eligibility and activation            | U3                               | V-18–V-26                   |
| C-05 | Keyboard and directional sorting              | U4, U7                           | V-27–V-31                   |
| C-06 | Collision selection and notification          | U5                               | V-34–V-38                   |
| C-07 | Geometry, transforms and owner realms         | U5, U12                          | V-37–V-42                   |
| C-08 | Modifier configuration and lifetime           | U6                               | V-43–V-44                   |
| C-09 | Sortable composition and transition           | U7                               | V-40, V-45–V-47, V-62       |
| C-10 | Immutable helpers and reconciliation          | U8                               | V-48–V-51                   |
| C-11 | Preview and controlled connected transactions | U7, U8, local state owner        | V-52–V-56                   |
| C-12 | Feedback/overlay/clone fidelity               | U9, U12, U13                     | V-57–V-61                   |
| C-13 | Scroll intent, reveal and compensation        | U10                              | V-63–V-65                   |
| C-14 | Announcements, semantics and focus            | U11                              | V-31, V-66–V-68             |
| C-15 | Motion completion                             | U7, U9, local motion owner       | V-40, V-62                  |
| C-16 | Reactive binding and renderer lifecycle       | U13                              | V-06, V-09, V-52, V-70      |
| C-17 | Failure cleanup and environment leases        | U1, U9–U12                       | V-14–V-17, V-60, V-65, V-69 |
| C-18 | Public control API and presentation           | Sections 13–14; live definitions | V-54–V-56, V-67–V-72        |
| C-19 | Packaging and dependency boundary             | Public entrypoints               | V-72                        |

### 16.3 Mandatory scenarios

Every row starts **pending**. Unit tests prove pure calculations/state; Chrome DevTools MCP proves actual browser behavior. Where a row has both kinds of evidence, neither substitutes for the other. Record setup, expected result, actual result, command/tool, artifact and status in the implementation checklist.

| ID   | Setup/input                                                                                                  | Required observable result                                                                                                               |
| ---- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| V-01 | Register IDs `0`, `''`, `1`, `'1'`; reject invalid numbers/types                                             | Valid typed IDs remain distinct; invalid ID never enters registry.                                                                       |
| V-02 | Duplicate draggable/droppable/list item/group IDs                                                            | First coherent participant survives, diagnostic emitted, duplicate cleanup cannot remove winner.                                         |
| V-03 | Rekey to free ID and colliding ID while registered                                                           | Atomic move or coherent rejection; no ghost old keys, partial Sortable lanes or oscillation.                                             |
| V-04 | Construct then destroy before deferred registration                                                          | No later registration/effect/listener; repeated destroy/unregister is safe.                                                              |
| V-05 | Missing manager/element, detached refs, SSR construction                                                     | No half-activated operation or eager browser access; explicit invalid-start result.                                                      |
| V-06 | Replace manager/element/handle and disconnect external-manager list                                          | Old listeners released; new ones bind once; shared manager and unrelated list survive.                                                   |
| V-07 | Start without source, with bad coordinates, or during active drag                                            | Error before mutation; current source/position/status preserved.                                                                         |
| V-08 | Prevent before-start                                                                                         | No drag-start, collision, preview or commit; all pending resources released.                                                             |
| V-09 | Cancel/unmount/start replacement while initialization/render promise pending                                 | Old continuation cannot start or reset a newer drag.                                                                                     |
| V-10 | Initialization causes immediate collision                                                                    | Drag-start observed before drag-over; one coherent start snapshot.                                                                       |
| V-11 | Prevent move; provide both `to` and `by`; disable propagation                                                | Prevented movement absent; `to` precedence and event propagation flags honored.                                                          |
| V-12 | Queue move then cancel/new operation before microtask/rAF                                                    | No stale coordinate, transform, collision or announcement write.                                                                         |
| V-13 | Pointer-up occurs before scheduled last move executes                                                        | Drop evaluates final owned pointer location exactly once.                                                                                |
| V-14 | Race pointer-up, Escape, pointercancel, destroy and animation finish                                         | One terminal event/settled outcome; one release per resource.                                                                            |
| V-15 | Repeated suspend/resume/abort, stale continuation, disconnect while suspended                                | One handle/first result; no stale commit; destruction aborts pending decision.                                                           |
| V-16 | Consumer handler/resolver/custom animation throws or rejects                                                 | No partial action/transaction; diagnostics and terminal cleanup still complete.                                                          |
| V-17 | One disposer throws among several resources                                                                  | Remaining cleanups execute reverse acquisition order; no retained listener/capture/style.                                                |
| V-18 | Right button, nonprimary pointer, veto, busy manager, claimed event                                          | No activation or unwanted default prevention.                                                                                            |
| V-19 | Second pointer moves/releases/cancels during owned drag                                                      | First pointer remains authoritative; unrelated pointer does not move/end it.                                                             |
| V-20 | Mouse handle, touch, eligible text input, ordinary pointer                                                   | Exact immediate/250 ms/200 ms/distance defaults; no accidental embedded-input activation.                                                |
| V-21 | At/below/above scalar and x/y distances; competing delay/distance                                            | Strict threshold and two-axis AND; constraints combine with OR activation.                                                               |
| V-22 | Release, leave eligibility, cancel or destroy during delay                                                   | Timers cannot activate later; delay-branch failure does not wrongly kill another valid constraint.                                       |
| V-23 | Capture throws; actual pointercancel/lost capture path                                                       | Operation cancels, capture/listeners/preview cleared; Android-relevant flow recorded separately if not device-tested.                    |
| V-24 | Nested button/link/input/editable versus source itself/handle descendant                                     | Nested action preserved; eligible source/handle still activates through composed tree.                                                   |
| V-25 | Click without reaching constraints; active drag followed by click                                            | Ordinary click works; owned post-drag click suppressed without permanent suppression.                                                    |
| V-26 | Partial options, source overrides, multiple/replaced activators                                              | Inheritance/replacement rules exact; latest per-source settings used by all handlers.                                                    |
| V-27 | Space/Spacebar/Enter, lowercase printable key, KeyW/Digit1 aliases                                           | Logical normalization works; consumer-prevented key does not activate.                                                                   |
| V-28 | Keydown from unrelated descendant action                                                                     | No parent drag activation or swallowed action.                                                                                           |
| V-29 | Free keyboard arrows with scalar/axis offsets and Shift                                                      | Correct configured displacement and 5x factor; no movement before shape readiness.                                                       |
| V-30 | Sortable directional candidates, clipping, disabled/rejected targets, none                                   | Correct geometry-ranked target/reveal; no-candidate path restores observers/scrollers.                                                   |
| V-31 | Space/Enter drop, Escape cancel, Tab and Shift+Tab                                                           | Correct commit/cancel; source focus restoration where appropriate; Tab traverses without later theft.                                    |
| V-32 | Acceptance predicate on untyped source; types `0`, `''`, symbol; empty array                                 | Exact acceptance semantics with no truthiness bug.                                                                                       |
| V-33 | Change acceptance/disabled/detector or remove target under stationary pointer                                | Recompute eligibility and target; invalid target cannot commit.                                                                          |
| V-34 | Overlapping candidates with differing priority/type/score and exact ties                                     | Reference priority ordering and stable ties; no arbitrary registry churn.                                                                |
| V-35 | Candidate sequences `[1,23]`, `[12,3]`, string/numeric variants; same IDs with changed scores                | Real sequence changes reconcile target; identical typed sequence deduplicates target work while collision evaluations remain observable. |
| V-36 | Prevent collision versus prevent drag-over                                                                   | First suppresses default target selection; second suppresses sorting without undoing target identity.                                    |
| V-37 | Zero area, negative/NaN/infinite geometry and zero-time samples                                              | Invalid candidates/moves rejected; velocity/calculations never leak NaN; valid exact-center scoring retained.                            |
| V-38 | Resize/scroll/layout shift with stationary pointer                                                           | Correct refreshed collision and proxy geometry without needing pointer movement.                                                         |
| V-39 | Existing translate/scale/transform, scaled/negative-scale ancestors, 3–5 px pickup offset                    | Source remains under intended pickup point; no transform loss or compounded offset.                                                      |
| V-40 | Active CSS transform/translate/scale transition while sorting                                                | Measure resting target, correct FLIP delta, retain unrelated transitions.                                                                |
| V-41 | Shadow-root controls and same-origin iframe source/target                                                    | Correct composed target, owner constructors, frame transform and cleanup; inaccessible boundary handled.                                 |
| V-42 | Visual viewport zoom, viewport resize, frame scale changes                                                   | Rectangles and pointer coordinates remain in one space; tolerance evidence recorded.                                                     |
| V-43 | Multiple drags with manager/source modifier configurations                                                   | Manager instances persist; source instances dispose on switch/end; order preserved.                                                      |
| V-44 | Positive/negative snap, zero/invalid grid, oversized source in bounds                                        | Exact ceil semantics; invalid grid rejected; top/left oversized clamp rule preserved.                                                    |
| V-45 | All boolean/object combinations of sortable disabled flags                                                   | Independent drag/drop participation; unspecified flags false.                                                                            |
| V-46 | Separate source/target/handle then replace common element                                                    | Explicit refs preserved; following refs update; no duplicate sensor bindings.                                                            |
| V-47 | Sparse indices, manager/ID remount and virtual membership replacement                                        | Initial index/group retained for current drag, invalidated at end; no registry-order substitution.                                       |
| V-48 | Move/swap forward/backward/same index on frozen arrays/objects                                               | Correct immutable result; unchanged inputs and no-op reference; cross-group swap transfers.                                              |
| V-49 | Computed IDs absent from raw data, flat and grouped inputs                                                   | Valid sortable fallback matches expected order; missing fallback safely no-ops.                                                          |
| V-50 | Negative/fractional/NaN/infinite/out-of-range indices in every helper branch                                 | No insertion of undefined, no coercion, no mutation; boundary insertion `length` accepted only for transfer.                             |
| V-51 | Source equals target after preview; numeric group keys, empty groups, null items                             | Correct reconciliation, own-key lookup, no crashes or inherited-property targets.                                                        |
| V-52 | Consumer changes group/index/membership while preview awaits renderer                                        | Stale sorting discarded; latest authoritative state preserved.                                                                           |
| V-53 | Escape/outside drop/veto after several same-list and cross-list previews                                     | Committed arrays unchanged, visual order restored coherently, zero commit events.                                                        |
| V-54 | Controlled/uncontrolled and mixed connected lanes; one veto/missing acknowledgment/incompatible owner result | Both arrays commit atomically or neither does; conservation/uniqueness and event ordering hold.                                          |
| V-55 | Pointer/keyboard transfer to empty list, duplicate destination ID, rejected type                             | Valid insert at zero; invalid destination rejected without item loss.                                                                    |
| V-56 | External value replacement/readOnly/disable/disconnect during drag or suspension                             | Cancel stale preview, preserve new value, reject invalid pending commit.                                                                 |
| V-57 | All four feedback modes plus custom/disabled overlay                                                         | Mode-specific visual behavior and fully functional geometry even with none.                                                              |
| V-58 | Contained and shared-element droppables under placeholder/overlay                                            | Every target measures intended proxy and restores authored ref exactly once.                                                             |
| V-59 | Inputs/radios/file inputs/canvas/SVG/IDs/custom-element content in feedback                                  | No form mutation, duplicate focus/IDs/entities, lost applicable content or file assignment.                                              |
| V-60 | Consumer edits inline styles/attributes during dragging                                                      | Cleanup preserves newer consumer writes and restores only still-owned changes.                                                           |
| V-61 | Table rows/cells with fractional widths and sibling DOM mutation                                             | Placeholder preserves geometry and restores widths/location without orphan nodes.                                                        |
| V-62 | Null/partial transitions, reduced motion, rejected custom drop promise, source removed during animation      | Defaults/disable rules exact; no flicker, hanging dropping state or leaked feedback.                                                     |
| V-63 | Nested scroll containers at inner/outer boundaries and keyboard reveal                                       | Correct ancestor scroll and compensation; keyboard auto-scroll suppression does not block reveal.                                        |
| V-64 | Threshold zero, live option updates, negative scale and pointer direction reversal                           | Per-axis disable, intent locks and direction/acceleration behave as source algorithm.                                                    |
| V-65 | End/cancel during scroll/throttle/observer callbacks                                                         | No trailing scroll, geometry writes, retained listeners or interval after terminal cleanup.                                              |
| V-66 | Fast over/move then end/cancel/new drag within debounce window                                               | Immediate correct terminal text; no stale movement announcement afterward.                                                               |
| V-67 | Existing descriptions/names, row semantics, inert preview, disabled/read-only                                | Correct tree and names, descriptions merged/restored, no false pressed/grabbed semantics.                                                |
| V-68 | Source reorders/transfers/remounts/removes; pointer and keyboard completion                                  | Focus survives by ID or explicit fallback; no detached focus or pointer focus theft.                                                     |
| V-69 | Multiple managers, nonce and generated-style-disabled policy                                                 | Independent operations and ref-counted resources; no global style/selection leakage or CSP violation.                                    |
| V-70 | Late subscriptions, callback replacement, conditional hide/unmount, reentrant writes                         | Coherent latest snapshots, queued reentrant changes, no stale closures or subscription leaks.                                            |
| V-71 | Both orientations, RTL, themes, sizes, variants, long text, narrow layouts, dictionary/part overrides        | Existing component appearance reused; public overrides work without state/focus reset; screenshots inspected.                            |
| V-72 | Server-side import without DOM/ResizeObserver; built package exports/registration and docs example           | No eager browser access or upstream/runtime dependency imports; public APIs usable outside Storybook setup.                              |

### 16.4 Required cross-products

Single-axis examples are insufficient. At minimum combine connected transfer with controlled state, keyboard, empty target, disabled/rejected destination and cancellation; transformed geometry with overlay modes and scrolling; reactivity with remount/rekey and pending async work; and presentation overrides with RTL/reduced motion. Run relevant scenarios again after any shared repair.

Reference browser tolerances must be preserved explicitly: pickup-offset scenarios exercise 3–5 px offsets; transformed scenarios distinguish initial error (reference tolerance 10 px) from movement drift (5 px). These are regression tolerances, not permission to accept visibly broken alignment. Record actual measured deltas.

## 17. Live specification adoption plan

Before runtime implementation, fresh-read the two complete relevant document ASTs, project/vocabulary and authoring schema through registered direct Spec Blocks tools. Use the current candidate's HEAD and state version for each mutation. The recorded version above is evidence, not a reusable concurrency token.

1. Add a Foundation drag-and-drop section beneath `sec-19-advanced-interaction-and-composition-contracts` with entities, manager state/events, sensors, collision/geometry, modifiers, sorting, feedback, scroll, a11y, connected transactions and validation requirements from this document.
2. Link governing shared anchors rather than duplicating their general rules. Add drag-specific reason lanes and explicit amendments for Tab, identity, async guards and service ownership where needed.
3. Add one Component Library definition for Drag Drop List, with the canonical anatomy/control/presentation tables from section 13, complete property defaults, methods, events, composition, customization and motion roles.
4. Extend the closed state/motion vocabulary, catalog/coverage tables, source baseline and discrepancy records. Add appropriate `references` and `review_on_change` relationships for state ownership, List Item, Button, motion and environment dependencies.
5. Validate the whole project candidate after each small coherent batch. Review diagnostics and dependent impacts. Do not commit another task's existing candidate changes as part of this task.
6. Record newly allocated stable anchors in the local implementation checklist and source ledger. The implementation cannot treat this Markdown proposal as an already adopted live contract.

If direct Spec Blocks tools become unavailable, report that exact limitation and continue source/test research; do not use a shell bridge, JSON-RPC, curl or another transport to mutate specifications. Missing direct Chrome tools similarly block browser evidence without authorizing another browser driver.

## 18. Ordered implementation work and completion gates

Each task produces reviewable artifacts and depends on the previous contract/ownership decisions. No task is complete merely because its files exist.

| Task                                    | Dependencies | Procedure and artifacts                                                                                                                                                 | Completion gate                                                                                                    |
| --------------------------------------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| P01 Source and contracts                | None         | Refresh source SHAs/dirty status and live ASTs; adopt section 17; preserve unrelated edits.                                                                             | Live amendments validate; scope/exclusions and discrepancies explicit.                                             |
| P02 Traceability and ownership          | P01          | Create checklist and branch-level source ledger; expand every public option/default and V-ID; record family/presentation/reuse maps.                                    | Skill gates 0–2 and `--stage implement` pass truthfully.                                                           |
| P03 Shared prerequisites                | P02          | Repair cleanup, owner scheduling/environment and any needed transaction validation in existing Foundation owners; add focused regressions for existing consumers.       | Exception-safe release, coherent transactions and owner-realm behavior verified.                                   |
| P04 Pure source port                    | P03          | Port geometry, detectors, modifiers' pure routines and immutable helpers with license/provenance; translate U5/U6/U8 tests and A04–A06/A20.                             | Unit parity plus validation matrix V-32–V-51 as applicable.                                                        |
| P05 Manager and entities                | P04          | Implement registry, operation/action state, renderer barriers, snapshots and entity composition using shared store/lifecycle.                                           | Start/event order, async race, rekey/remount, duplicate/terminal tests pass.                                       |
| P06 Sensors and environment integration | P05          | Port activation constraints, pointer/keyboard behavior, logical keys, realm/frame coordinate conversion and capture cleanup.                                            | Unit timing tests and first real input paths work; no partial activation leaks.                                    |
| P07 Built-in service port               | P06          | Feedback, geometry proxies, scroll/reveal, selection/cursor, announcements, sort preview/keyboard and motion; no public plugin API.                                     | Modes and terminal paths function together, including no-feedback geometry and animation rejection.                |
| P08 List transaction binding            | P07          | Data/resolvers, native anatomy with existing List Item/Button/Empty State, keyed preview, external manager ownership and atomic connected values.                       | Same-list and connected controlled/uncontrolled drop/cancel and empty target work through public APIs.             |
| P09 Presentation and early integration  | P08          | Add closed definition/recipe keys, state/motion hooks and first representative composition; inspect actual shared-owner diff.                                           | I-01 ownership, I-02 visuals and I-03 independent options pass; `--stage verify` passes before exhaustive testing. |
| P10 Exhaustive acceptance               | P09          | Execute V-01–V-72 and required cross-products, source/browser regressions, accessibility and visual inspection via Chrome DevTools MCP.                                 | All in-scope scenarios have actual passing evidence; unsupported required checks remain blocked.                   |
| P11 Docs and public packaging           | P08–P10      | Canonical base example, full API docs, distinct connected-list example, exports/catalog/register/elements/types, generator preservation; fixtures outside curated docs. | Docs match actual API; built package works independently of Storybook.                                             |
| P12 Reconciliation                      | P10–P11      | Required tests, lint/type/build/Storybook build, affected-owner regressions, no-new-dependency audit and final traceability review.                                     | Skill gates 0–8, capabilities/scenarios and `--stage complete` pass; no silently omitted branches.                 |

### 18.1 Checklist and evidence format

Create `plans/components/drag-drop-list/implementation-checklist.md` from the repository skill template. Preserve its headings, gate table, capability/scenario IDs, family map, presentation map, implementation/composition reuse map and early integration table. Expand broad C-IDs into individual constituent-option rows where the template requires it; retain references to this document's IDs.

Use only `pending`, `passed`, `failed`, `blocked`, or `not applicable`. Excluded public plugin APIs can be not applicable with section 1 evidence; included internal behavior cannot. Record actual failures and repairs; do not relabel unimplemented features as future enhancements.

Store logs, measured geometry, screenshots and inspected conclusions under `tmp/component-verification/drag-drop-list/<run>/`. They are local artifacts, not automatically shared with other machines. Durable fixtures belong in `tests/fixtures/components/drag-drop-list/`. Record actual served URL, browser version, viewport, direction, theme, reduced-motion state and source/built package version for every browser run.

```sh
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/drag-drop-list/implementation-checklist.md --stage implement
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/drag-drop-list/implementation-checklist.md --stage verify
node .agents/skills/tweakpad-component/scripts/check-gates.mjs plans/components/drag-drop-list/implementation-checklist.md --stage complete
```

Run commands only at their actual boundaries. Passing the structural checker does not prove that evidence is true or complete.

### 18.2 Verification procedure

- Translate and run focused upstream-derived unit tests first; then the affected existing Foundation and component suites.
- Inspect package scripts before running them. Existing browser scripts may launch Playwright; use registered Chrome DevTools MCP for browser verification instead.
- Use actual pointer/keyboard tool input for interaction claims. Page evaluation can set up fixtures and inspect public APIs, but synthetic input is not evidence of real pointer capture, keyboard focus or native default behavior.
- Inspect accessibility tree, real keyboard focus and automated accessibility results separately. Do not claim mobile/Safari/screen-reader coverage from desktop Chrome.
- Build/typecheck/package/Storybook checks are required after integration. Check exports and registration through the built package, not only source imports.
- Search compiled/source imports for `@dnd-kit`, `@preact/signals-core`, framework wrappers and unintended plugin exports; confirm package manifests/lockfile gained no runtime dependencies.
- Run `git diff --check`; inspect only task changes while preserving unrelated work. Do not run a repository-wide formatter that rewrites unrelated files.

## 19. Definition of done

The eventual implementation is complete only when all three Foundation entities, the manager and included built-in behavior are reusable independently; the list supports the complete declared API and connected atomic transactions; every source branch has a port/exclusion/adaptation disposition; every mandatory validation has an executable test and actual evidence; and the live specifications, implementation, docs, presentation definitions, catalog and built package agree.

No external runtime libraries are introduced. No public plugin mechanism is introduced. No required pointer, keyboard, feedback, scrolling, accessibility, transform, lifecycle or transaction behavior disappears because upstream happens to implement it inside a plugin.

This plan's acceptance matrix is an implementation obligation, not a report of tests run. Runtime implementation should begin only after the live contract and source/reuse gates above are satisfied.
