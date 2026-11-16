# One reorder engine for every component that reorders

## Why

Drag drop list and Tree view (and through it Layers) each run their own reorder engine on the
shared drag manager. Each keeps its own session, projected order, target and side decision,
landing line, keyboard reorder and settle. Sharing rules, tokens and the drag feedback did not
stop the divergence, because the decisions are still made twice:

| Concern | Drag drop list | Tree view |
| --- | --- | --- |
| Session | `ListNetwork` on monitor events | `TreeReorder` session on its own events |
| Target | manager collisions (`pointerNearest`) | own resting-box hit test |
| Displace order | preview arrays, `arrayMove` | own `rows` + `placeRow` |
| Line | pending order + anchor slot | own `still`/`rows` + `#placeLine` |
| Keyboard | manager `KeyboardSensor` | own Control+Enter key loop |
| FLIP glides | `#animateSort` | `capture()`/`animate()` |
| Commit | value transaction | `TreeMove` commit |

Your screenshots (ghost jumping above Night sky, the line under Paper texture while the cursor is
above, Night sky marked as drop-into while the cursor is above it) come from Tree view's engine.
Drag drop list never shows them. The goal: **one engine**, so any behavior, correct or not, is
the same in both.

## Design

`src/foundation/drag-drop/reorder/` holds the one engine, extracted from `list-controller.ts`.

- **`ReorderEngine`** (from `ListNetwork`), one per manager. It owns:
  - the manager wiring: the sorting claim, the renderer composition, monitor events, rollback,
    completion, and routing `createPreview`, the motion owner and accessibility content;
  - the session: source container, item, initial/preview/pending orders, anchor slot, revision,
    landing;
  - projection: the target from the manager's collision, its index, `landingSide`, then displace
    (`arrayMove`) or line (pending + anchor);
  - the commit, which the engine asks of the containers.
- **`ReorderContainer`** (from `ListController`) is what a component registers: a group, its
  ordered item ids, the committed order, orientation, indicator, disabled and read-only, the
  container droppable, the stand-in (`createPreview`), element lookup, `changed()`, and a
  `commit(order, context)` the engine calls once for the whole change.
- **Refinement hook** (optional) `refine(landing)` runs after the engine picks target, side and
  slot, and returns extra landing data. A list has none. A tree returns:
  - the projected depth, from the drag's horizontal offset (`dragDepth`), the same for pointer
    and keyboard;
  - `into`: the target row's middle half when it takes children (`landingSide` with `into`);
  - the line inset.
- **Shared rendering helpers** both hosts call:
  - `reorderLine(engine, container)`: the line between the items around the anchor slot, measured
    with the stand-in standing for the source (`landingLine`), plus the refinement's inset;
  - `reorderGlides(container)`: the FLIP displacement glides (`dragMotion`), replacing
    `#animateSort` and `capture()`/`animate()`.
- **Keyboard:** both use the manager's `KeyboardSensor`. Tree view picks up with Control+Enter
  through the sensor's activator. Up and Down move by the row step, and Left and Right by the
  indentation step, which feeds the same depth rule as the pointer. The tree's own key loop goes.
- **Tree specifics stay in Tree view as data the container provides:**
  - the dragged set: the source plus its descendants, hidden while rows make room and carried in
    line mode;
  - the commit: projected order + depth → `TreeMove` (`resolveMove`/`intoMove`), checked by
    `accepts`;
  - announcements;
  - the 500 ms hover-expand.

  None of these decide where the item goes or how the drag looks.

## Delete

- `src/components/tree-view/reorder.ts`, all of it: session, `#track`, `#project`, `#placeLine`,
  settle, keyboard loop and its `capture`/`animate`. What remains is the Tree view container
  adapter, roughly 150 lines.
- `ListNetwork`/`ListController` logic in `list-controller.ts`; Drag drop list keeps a thin
  container adapter for its value lane and connected lists.
- Drag drop list's `#placeLine` and `#animateSort`, which the shared helpers replace.

## Guards (fail the build on divergence)

- **Parity fixture** `tests/fixtures/foundation/reorder-parity/`: the same flat items in a Drag
  drop list and in a Tree view, the same scripted drags (slow upward and downward drags in both
  modes, a grab near an edge, a keyboard move), recording at each step the ghost slot, the line
  slot, the target and the final order. A helper asserts the two sequences are identical. Tree
  view's extra checks (depth, `into`) run on a nested tree.
- **Unit guard:** no component file under `src/components` or `src/widgets` may own a reorder
  session, projection, line or glide. Only modules under `foundation/drag-drop/reorder/` import
  `arrayMove`, `landingSide`, `landingLine` or `dragMotion` for reordering, and components import
  the engine. This extends `drag-look.test.ts`.

## Spec

- **Foundation:** a new "Reorder engine" requirement owns the session, projection, keyboard
  steps, line and glides.
- **Tree reorder profile (§19.19):** keeps only its container data (depth from the offset, into,
  the dragged set, `TreeMove` commit) and references the engine.
- **Drag drop list:** references the engine for its projection and keyboard.
- **Layers:** inherits. This goes through the spec agent with a list of changed passages.

## Order of work

1. Extract the engine and container interfaces from `list-controller.ts` and move Drag drop list
   onto them. Its fixture and contract checks, and the docs demos (line, displace, connected,
   overlay, authorization), must pass unchanged.
2. Shared `reorderLine` and `reorderGlides`; Drag drop list uses them.
3. Tree view container adapter: Sortable registration stays, plus the refinement hook, the
   dragged set, the commit and keyboard through the sensor. Delete `reorder.ts`.
4. Parity fixture and unit guard.
5. Verification in Chrome with real-input-like drags on the parity fixture, Layers story/fixture
   and the Drag drop list docs. I look at the screenshots of each step, including your three
   scenarios: Moon under Night sky dragged slowly upward in line mode, in displace mode, and over
   a group's middle.
6. Spec amendment, changeset (patch for 0.5.2), records.

## Risks

- Tree view virtualization: collisions need mounted rows, and today's pinning of the source stays.
- Tree view's `still` render (line mode keeps the shown order) maps onto the engine's line mode,
  where preview stays and pending holds the landing.
- A keyboard drag in Tree view now announces through the manager's accessibility, and the tree's
  messages move into the container's announcement content.

## Outcome (2026-11-16)

- `foundation/drag-drop/reorder/engine.ts` (`ReorderEngine`, `ReorderContainer`, `reorderItemDefaults`) and
  `render.ts` (`placeReorderLine`, `ReorderGlides`) are the only reorder owners. Drag drop list and Tree view
  are containers; Tree view adds only the hooks `reorderDragItems`, `reorderHolds`, `reorderRefine` and
  `reorderCommit`, plus its announcements. `placeRow` and the tree's session, projection, line, glides and key
  loop are deleted.
- Shared fixes found on the way, so they apply to both:
  - the feedback stand-in takes the item's block size from the first frame; an async-rendered ghost let the
    next row close the gap, and the first keyboard step skipped a row;
  - a keyboard drop returns focus to its activator (the handle, or the row);
  - KeyboardSensor `activatorElements`.
- Tree-only fixes:
  - row sensors follow `dragActivation` changes;
  - under a landing line the ghost keeps the row's own level.
- Guards:
  - `drag-look.test.ts` "one reorder engine" fails when any component or widget imports the landing rules,
    `arrayMove`, `dragMotion` or `sort-displacement`, or when a reordering component stops being a container
    (`new ReorderContainer`, `placeReorderLine`, `new ReorderGlides`);
  - fixture `tests/fixtures/components/reorder-parity/` runs `reorderParity.assertParity()`: 8 scripted
    drags (pointer slow up/down, whole-row edge grabs, past the end, keyboard) × displace/line. The fixture
    gives both components the same row geometry, so any difference left belongs to the reorder.
    Result: 16/16 identical at every step (ghost slot, line slot, grip, final order).
- Verified in Chrome on Layers (`#markup`), with screenshots of each state:
  - nested Sun dragged slowly upward in line mode: no line over its own row or the no-op quarter, Scene's
    middle shows drop-into, its top quarter shows the line at root depth;
  - the drop into Scene;
  - displace drag of Ground;
  - keyboard pick-up, steps, drop and cancel, with announcements and focus.
- Open: Drag drop list names the pointer option `activation`, Tree view and Layers name it `dragActivation`.
  Not renamed without the user's decision.
