# Drag-and-drop source traceability

Scope and baseline: drag-drop.md §§1–2. MIT dnd-kit e522d9c6a3cbe39e6e980ee3b6fd7a78f238ab94.

Each row remains pending until the named implementation and execution evidence exists.

| Requirement | Upstream file / symbol / branch | Local owner | Adaptation | Test IDs | Execution evidence |
| --- | --- | --- | --- | --- | --- |
| C-01 Typed identity and registry | external/dnd-kit/packages/abstract/src/core/entities/entity/{entity,registry}.ts | registry.ts; entities.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-01–V-06 | pending |
| C-02 Manager state machine and async boundaries | external/dnd-kit/packages/abstract/src/core/manager/{actions,operation,status,events}.ts | manager.ts; actions.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-07–V-17 | pending |
| C-03 Entity acceptance and dynamic eligibility | external/dnd-kit/packages/abstract/src/core/entities/droppable/droppable.ts; packages/dom/src/core/entities/droppable/droppable.ts | entities.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-32–V-33, V-45–V-47 | pending |
| C-04 Pointer eligibility and activation | external/dnd-kit/packages/dom/src/core/sensors/pointer/{PointerSensor,DelayConstraint,DistanceConstraint}.ts | sensors/pointer.ts; sensors/activation.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-18–V-26 | pending |
| C-05 Keyboard and directional sorting | external/dnd-kit/packages/dom/src/core/sensors/keyboard/KeyboardSensor.ts; packages/dom/src/sortable/plugins/SortableKeyboardPlugin.ts | sensors/keyboard.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-27–V-31 | pending |
| C-06 Collision selection and notification | external/dnd-kit/packages/collision/src/algorithms/*.ts; packages/abstract/src/core/collision/{observer,notifier}.ts | collision.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-34–V-38 | pending |
| C-07 Geometry, transforms and owner realms | external/dnd-kit/packages/geometry/src/shapes/Rectangle.ts; packages/dom/src/utilities/ | geometry.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-37–V-42 | pending |
| C-08 Modifier configuration and lifetime | external/dnd-kit/packages/abstract/src/modifiers/; packages/dom/src/modifiers/ | modifiers.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-43–V-44 | pending |
| C-09 Sortable composition and transition | external/dnd-kit/packages/dom/src/sortable/sortable.ts | sortable.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-40, V-45–V-47, V-62 | pending |
| C-10 Immutable helpers and reconciliation | external/dnd-kit/packages/helpers/src/move.ts: arrayMove/arraySwap/mutate/move/swap | sorting.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-48–V-51 | pending |
| C-11 Preview and controlled connected transactions | external/dnd-kit/packages/dom/src/sortable/plugins/OptimisticSortingPlugin.ts; src/foundation/controllable-state.ts | sorting.ts; list-controller.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-52–V-56 | pending |
| C-12 Feedback/overlay/clone fidelity | external/dnd-kit/packages/dom/src/core/plugins/feedback/; packages/react/src/core/ | feedback.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-57–V-61 | pending |
| C-13 Scroll intent, reveal and compensation | external/dnd-kit/packages/dom/src/core/plugins/scrolling/; packages/dom/src/utilities/scroll/ | scrolling.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-63–V-65 | pending |
| C-14 Announcements, semantics and focus | external/dnd-kit/packages/dom/src/core/plugins/accessibility/ | accessibility.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-31, V-66–V-68 | pending |
| C-15 Motion completion | external/dnd-kit/packages/dom/src/sortable/sortable.ts; packages/dom/src/core/plugins/feedback/ | src/foundation/motion.ts integration | drag-drop.md A01–A24 where applicable; refine at source port | V-40, V-62 | pending |
| C-16 Reactive binding and renderer lifecycle | external/dnd-kit/packages/react/src/{core,sortable}/; packages/state/src/ | renderer.ts; drag-drop-list.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-06, V-09, V-52, V-70 | pending |
| C-17 Failure cleanup and environment leases | external/dnd-kit/packages/dom/src/utilities/; src/foundation/services.ts | shared services.ts and owned resources | drag-drop.md A01–A24 where applicable; refine at source port | V-14–V-17, V-60, V-65, V-69 | pending |
| C-18 Public control API and presentation | external/dnd-kit/drag-drop.md §§13–14; list-item/ and empty-state/ local owners | drag-drop-list.ts; types.ts; presentation/ | drag-drop.md A01–A24 where applicable; refine at source port | V-54–V-56, V-67–V-72 | pending |
| C-19 Packaging and dependency boundary | external/dnd-kit/packages/dom/src/index.ts; package.json | src/index.ts; src/register.ts; src/elements.ts; src/catalog.ts | drag-drop.md A01–A24 where applicable; refine at source port | V-72 | pending |

## Contract adoption

Foundation sec-1919-drag-drop; list ucl21-drag-drop-list. Current direct-tool candidate, not committed. Adoption and the source-correct bounding-clamp amendment have zero diagnostics and canCommit=true at candidate 0ce91b33497d6ca9599bdb63e5b070f3fceccd9680152723182b75bee83f5fa3. No project commit was performed. Runtime verification is ongoing; this is not a conformance claim.
