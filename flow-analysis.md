# Flow analysis: xyflow and Workflow Builder

A structural decomposition of the two node-graph references in `external/`, organised by code logic. It covers routing, layout, schemas, composition, steppers, rendering and state.

| Source                                                                 | Path                       | Commit      | Date       |
| ---------------------------------------------------------------------- | -------------------------- | ----------- | ---------- |
| xyflow (`@xyflow/system`, `@xyflow/react`, `@xyflow/svelte`, examples) | `external/xyflow`          | `3d35b5731` | 2026-09-24 |
| Workflow Builder (sdk 3.0.0, ui 1.0.0, temporal 0.2.0, apps)           | `external/workflowbuilder` | `4bbe6512`  | 2026-10-02 |

**Reading order.**

- The synthesis below compares both projects by topic.
- Part A covers the framework-agnostic xyflow core.
- Part B covers the React and Svelte bindings.
- Part C covers the Workflow Builder editor packages.
- Part D covers the Workflow Builder apps, the execution engine and deployment.

Every part ends with a key file index. Paths in each part are relative to that project's root.

## Contents

- [Synthesis](#synthesis)
- [Part A. xyflow core](#part-a-xyflow-core-xyflowsystem-commit-3d35b5731)
- [Part B. xyflow bindings](#part-b-xyflow-bindings-xyflowreact-and-xyflowsvelte)
- [Part C. Workflow Builder packages](#part-c-workflow-builder-packages-sdk-ui-types-tokens-ai-config-commit-4bbe6512)
- [Part D. Workflow Builder apps and execution](#part-d-workflow-builder-apps-execution-engine-starter-and-deploy-commit-4bbe6512)

## Synthesis

### How the layers stack

```
@xyflow/system   geometry, lookups, edge path math, XYDrag / XYHandle / XYPanZoom / XYResizer
      │          (owns no state: reads through getters, writes through callbacks)
      ├── @xyflow/react   zustand store, controlled/uncontrolled changes, components
      └── @xyflow/svelte  runes store, direct mutation, components
              │
@workflowbuilder/sdk   controlled <ReactFlow> + one global zustand store + plugin registries
      │                + JSON Schema / JSON Forms property panel + persistence strategies
      ├── apps/demo        reference editor (localStorage, 3 real plugins)
      ├── apps/ai-studio   editor + run view (HTTP + SSE to the backend)
      │        │
      │   apps/backend (Hono)  ──Temporal──▶  apps/execution-worker
      │        └────────── shared Postgres (events + pg_notify) ──────────┘
      └── examples/workflow-builder-starter  (outside the workspace, npm SDK)
```

**What each layer owns.**

- **xyflow** owns an interactive, measured canvas. It provides no layout, no routing beyond per-edge path geometry, and no semantics.
- **Workflow Builder's SDK** adds the semantics an editor needs:
  - node definitions with JSON Schema properties;
  - validation;
  - branch-per-handle ports;
  - persistence and plugins.
- **Workflow Builder's apps** add execution: a topological runner on Temporal that streams progress back over Server-Sent Events (SSE).

### By topic

| Topic                 | xyflow                                                                                                                                                                                                                                                                   | Workflow Builder                                                                                                                                                                                                                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Routing: edges**    | Pure path functions from endpoints and handle sides: bezier, simple bezier (React only), straight, step, smoothstep. The source calls smoothstep a cheap imitation of orthogonal routing. No obstacle avoidance. Culling tests endpoint boxes, never the path (A.3, B.5) | Every edge is xyflow smoothstep (radius 16, offset 20), plus a hand-built self-loop. No router; the demo's `avoid-nodes-edges` plugin is an empty placeholder (C.6, D.6)                                                                                                                           |
| **Routing: semantic** | None. Handles are geometric connection points with ids and validation hooks (A.2, A.5)                                                                                                                                                                                   | The edge's `sourceHandle` is the port. Decision branches and AI tools each own a handle id. The runner follows edges whose `sourceHandle` equals the executor's `nextPort`. `errorRoute` is a reserved port (C.6, D.2c)                                                                            |
| **Routing: app**      | Examples only: `react-router-dom` in React, SvelteKit file routes in Svelte (B.5)                                                                                                                                                                                        | No router. ai-studio routes by query string (`executionId`, `workflowId`, local). The backend is a Hono REST + SSE API (D.2)                                                                                                                                                                       |
| **Layout**            | No automatic layout. It provides coordinates, origin, extents, snapping, bounds, fit view, `expandParent` and the measurement pipeline. Only dagre appears, in the examples (A.4, B.6)                                                                                   | No auto-layout runs anywhere. `layoutDirection` (`RIGHT`/`DOWN`) changes handle sides and alignment, and the toggle is "a naive mirror". elkjs and libavoid-js are listed in the demo but unused (C.7, D.7)                                                                                        |
| **Schemas**           | TypeScript types only: `NodeBase`/`InternalNodeBase`, `EdgeBase`, handles, `NodeChange`/`EdgeChange`, lookups built by `adoptUserNodes` (A.2, A.6)                                                                                                                       | Editor: `NodeDefinition` + JSON Schema draft-07 + JSON Forms UI schema, validated by a CSP-safe cfworker validator. Persistence format has no version field. Backend: Drizzle tables, zod snapshot and decision-request schemas, `mapToExecutionModel` (C.2, D.3)                                  |
| **Composition**       | Custom `nodeTypes`/`edgeTypes`, `Handle`, `NodeToolbar`, `NodeResizer`, panels, providers, sub-flows, experimental change middleware (B.4)                                                                                                                               | `WorkflowBuilder.{Root, TopBar, Palette, Canvas, PropertiesBar, DefaultLayout}` compound component. Synchronous plugins write into module registries of component decorators (before, after, wrapper, `modifyProps`) and function decorators (C.3, D.6)                                            |
| **Steppers**          | None. Staged lifecycles only: measurement before render, queued fit view, connection and drag state machines (A.8, B.7)                                                                                                                                                  | No stepper or wizard UI. The "stepping" is execution: topological waves, joins, skip propagation, parking for human decisions, Temporal activities with retry profiles, and an event log rendered as a step list (C.8, D.4)                                                                        |
| **Rendering**         | DOM nodes + one SVG edge layer, viewport `translate() scale()` transform, label/toolbar portals, edge z elevation, marker `<defs>` (A.7, B.3)                                                                                                                            | Fully controlled `<ReactFlow>` with `Background` only (no MiniMap, Controls, Toolbar or Resizer). `NodePanel` templates, a whole-node drop port while connecting, and a status badge. Execution status is drawn by ai-studio through an injected `<style>` plus node-content decorators (C.5, D.8) |
| **State**             | React: zustand store, controlled (`onNodesChange` + `applyNodeChanges`) or uncontrolled (`defaultNodes`). Svelte: runes store that mutates directly. The core holds no state (A.6, B.2)                                                                                  | One global zustand singleton per page. Selection is stored as id lists. `trackFutureChange` is the hook point for undo, which lives in the apps. Persistence is localStorage, API or props. Run state is a separate ai-studio store fed by SSE (C.4, D.5)                                          |

### Architectural takeaways

1. **The split is geometry, then semantics, then execution.**
   - xyflow never interprets a graph.
   - Workflow Builder attaches meaning through node definitions and handle ids.
   - A separate engine interprets the persisted snapshot.
   - The editor and the runner share only the snapshot shape and the event types.
2. **Ports are handles.** Branches, tools, human-decision actions and the error route all encode control flow as `sourceHandle` ids. Deleting a branch in the form therefore deletes its edges (`removeEdgesForDeletedHandles`).
3. **Layout and routing are left to plugins, and none is implemented.**
   - Neither project ships auto-layout or obstacle-aware routing.
   - Their only real auto-layout is dagre, in the xyflow examples.
4. **Measurement gates rendering.**
   - xyflow will not draw an edge until both endpoints have handle bounds.
   - It forces unmeasured nodes into the render set so they get measured.
   - Fit view waits for initialisation.
5. **Execution is event-sourced.**
   - The worker writes sequenced, idempotent events.
   - Postgres `NOTIFY` fans them out to the backend's SSE route.
   - The client replays a snapshot and then the live events.
   - The canvas only colours nodes from that state.

### Verified quirks and stale details

**xyflow**

- **Swapped accessibility keys:** `a11yDescription.default` and `.keyboardDisabled` are swapped in naming. The text users see is correct (B, top).
- **Svelte loses `pathOptions`:** Svelte's `EdgeWrapper` never forwards `pathOptions` to built-in edges. Svelte also has no `simplebezier` edge (B, top).
- **Deletion depends on order:** a child cascades only when its parent appears before it in the list (A.6).

**Workflow Builder**

- **Wrong comment in handle CSS:** a source comment points to a handle rule in `sdk/src/index.css` that does not exist. The real rule is in `ui` (C.5).
- **Stale demo docs:** `apps/demo/CLAUDE.md` still describes in-demo ai-studio and flow-runner plugins. The flow-runner plugin is now an empty stub (D.1).
- **Broken demo Dockerfile:** `apps/demo/Dockerfile` copies `tools/deployment/nginx`, and that directory does not exist (D.9).
- **Unused event types:** `branch_spawned` and `branches_joined` are declared but never emitted (D.2c).
- **Deadline not enforced:** the decision-request `deadline` is validated but never acted on (D.3).
- **Autosave needs the top bar:** autosave is mounted inside `SaveButton`, so a custom layout without the top bar never autosaves (C.4).
- **Starter is outside the workspace:** the starter installs the SDK from npm, so it does not track workspace changes (D.1).

---

# Part A. xyflow core: `@xyflow/system` (commit 3d35b5731)

Paths are relative to `external/xyflow`. `S/` means `packages/system/src/`. The package is about 6,600 lines of TypeScript plus 4 CSS files. `S/index.ts` re-exports `constants`, `types`, `utils`, `xydrag`, `xyhandle`, `xyminimap`, `xypanzoom` and `xyresizer`.

## A.1 Package map

| Module                                       | Responsibility                                      | Main exports                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `S/constants.ts`                             | Error catalog, infinite extent, a11y strings        | `errorMessages` (error001–error016), `infiniteExtent`, `elementSelectionKeys` (`['Enter',' ','Escape']`), `defaultAriaLabelConfig`                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `S/types/`                                   | Framework-agnostic schema                           | `nodes.ts` (`NodeBase`, `InternalNodeBase`, `NodeHandle`, `NodeOrigin`, `NodeLookup`, `ParentLookup`, `NodeDragItem`); `edges.ts` (`EdgeBase`, `ConnectionLineType`, `MarkerType`, `EdgeMarker`, `EdgePosition`, path options); `handles.ts` (`Handle`, `HandleType`); `general.ts` (`Connection`, `ConnectionMode`, `ConnectionState`, `initialConnection`, `Viewport`, `FitViewOptionsBase`, `Padding`, `ConnectionLookup`, `ZIndexMode`); `utils.ts` (`Position`, `oppositePosition`, `XYPosition`, `Rect`, `Box`, `Transform`, `CoordinateExtent`); `panzoom.ts`; `changes.ts` (`NodeChange`, `EdgeChange`) |
| `S/utils/general.ts`                         | Geometry, clamping, coordinate conversion, fit math | `clamp`, `clampPosition`, `clampPositionToParent`, `calcAutoPan`, `rectToBox`/`boxToRect`, `getBoundsOfRects`, `getOverlappingArea`, `snapPosition`, `pointToRendererPoint`, `rendererPointToPoint`, `getViewportForBounds`, `getNodeDimensions`, `evaluateAbsolutePosition`                                                                                                                                                                                                                                                                                                                                    |
| `S/utils/graph.ts`                           | Graph queries, bounds, fit, position, deletion      | `getOutgoers`, `getIncomers`, `getNodePositionWithOrigin`, `getNodesBounds`, `getInternalNodesBounds`, `getNodesInside`, `getConnectedEdges`, `fitViewport`, `calculateNodePosition`, `getElementsToRemove`                                                                                                                                                                                                                                                                                                                                                                                                     |
| `S/utils/store.ts`                           | Building and updating lookup maps                   | `adoptUserNodes`, `updateAbsolutePositions`, `updateNodeInternals`, `handleExpandParent`, `updateConnectionLookup`, `panBy`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `S/utils/edges/`                             | Edge path math                                      | `getBezierPath`, `getBezierEdgeCenter`, `getSmoothStepPath`, `getStraightPath`, `getEdgeCenter`, `getElevatedEdgeZIndex`, `isEdgeVisible`, `getEdgeId`, `addEdge`, `reconnectEdge`, `getEdgePosition`, `getHandlePosition`                                                                                                                                                                                                                                                                                                                                                                                      |
| `S/utils/dom.ts`                             | DOM measurement and events                          | `getPointerPosition`, `getDimensions`, `getHandleBounds`, `getHostForElement`, `isInputDOMNode`, `getEventPosition`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `S/utils/marker.ts`                          | SVG marker ids                                      | `getMarkerId`, `createMarkerIds`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `S/utils/connections.ts`                     | Connection-map diffing                              | `areConnectionMapsEqual`, `handleConnectionChange`, `getConnectionStatus`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `S/utils/node-toolbar.ts`, `edge-toolbar.ts` | Overlay transforms                                  | `getNodeToolbarTransform`, `getEdgeToolbarTransform`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `S/xydrag/`                                  | Node and selection dragging (d3-drag)               | `XYDrag`, `getDragItems`, `calculateSnapOffset`, `isParentSelected`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `S/xyhandle/`                                | Connection and reconnection dragging                | `XYHandle` (`{ onPointerDown, isValid }`), `getClosestHandle`, `isConnectionValid`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `S/xypanzoom/`                               | d3-zoom wrapper for the viewport                    | `XYPanZoom`, wheel/pan/zoom handlers, `createFilter`, `viewportToTransform`, `transformToViewport`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| `S/xyresizer/`                               | Node resizing (d3-drag)                             | `XYResizer`, `getDimensionsAfterResize`, `getControlDirection`, `getResizeDirection`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| `S/xyminimap/index.ts`                       | Minimap pan and zoom                                | `XYMinimap`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `S/styles/`                                  | Shared CSS                                          | `base.css`, `init.css`, `style.css`, `node-resizer.css`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |

Every interaction module follows one pattern. A factory takes callbacks plus a getter (`getStoreItems`, `getTransform`, …) and returns `{ update(params), destroy() }`. The framework owns all state. The modules read it on demand and write it back through callbacks.

## A.2 Data model and schemas

**User node (`NodeBase`, `S/types/nodes.ts`).** Fields:

- identity and content: `id`, `position`, `data`, `type`;
- sides: `sourcePosition`, `targetPosition`;
- flags: `hidden`, `selected`, `dragging`, `draggable`, `selectable`, `connectable`, `deletable`;
- `dragHandle` (a selector);
- size: `width`/`height`, `initialWidth`/`initialHeight`, and `measured?: {width, height}`;
- nesting and order: `parentId`, `zIndex`, `extent?: 'parent' | CoordinateExtent | null`, `expandParent`;
- `ariaLabel`, `origin?: NodeOrigin`;
- `handles?: NodeHandle[]`: declared handles that let edges render without DOM measurement, for example in SSR.

React's `Node` adds `style`, `className`, `resizing`, `focusable` and `domAttributes`.

**Internal node (`InternalNodeBase`).** `Omit<NodeType,'measured'>` plus a required `measured`, plus:

```ts
internals: { positionAbsolute: XYPosition; z: number; rootParentIndex?: number;
             userNode: NodeType; handleBounds?: NodeHandleBounds; bounds?: NodeBounds }
```

`userNode` points back to the original object. Comparing against it by identity lets unchanged nodes skip recomputation. `handleBounds` is `{source: Handle[]|null, target: Handle[]|null}`, with handle `x`/`y` relative to the node in flow units.

**Edge (`EdgeBase`).**

- endpoints: `id`, `type`, `source`, `target`, `sourceHandle?`, `targetHandle?`;
- flags: `animated`, `hidden`, `deletable`, `selectable`, `selected`;
- `data`, `markerStart`/`markerEnd` (`string | EdgeMarker`), `zIndex`, `ariaLabel`, `interactionWidth`.

Edges have no internal variant. `EdgeLookup` is `Map<string, Edge>`.

**Other types.**

- `Handle`: `{ id?, nodeId, x, y, position, type: 'source'|'target', width, height }`.
- `Connection`: `{source, target, sourceHandle: string|null, targetHandle: string|null}`.
- `Viewport = {x, y, zoom}`; `Transform = [tx, ty, scale]`.
- `CoordinateExtent = [[x1,y1],[x2,y2]]`.
- `NodeOrigin = [ox, oy]`: `[0,0]` is the top-left corner, `[0.5,0.5]` the center.
- Enums: `Position` (Left/Top/Right/Bottom with `oppositePosition`), `MarkerType` (`arrow`, `arrowclosed`), `ConnectionMode` (Strict/Loose), `ConnectionLineType` (`default` bezier, `straight`, `step`, `smoothstep`, `simplebezier`).
- `ZIndexMode`: `'auto' | 'basic' | 'manual'`.

**Parent and child nodes.**

- A child's `position` is relative to its parent's `positionAbsolute`.
- `ParentLookup` is `Map<parentId, Map<childId, InternalNode>>`.
- `extent: 'parent'` clamps a child inside its parent's rectangle. A coordinate extent on a child is interpreted relative to the parent (`calculateNodePosition`).
- `expandParent` grows the parent instead of clamping the child (`handleExpandParent`).
- `adoptUserNodes` warns when a parent appears after its child in the array (`updateChildNode`).

**Building the lookups (`S/utils/store.ts`).**

- **`adoptUserNodes(nodes, nodeLookup, parentLookup, options)`:**
  1. Snapshots the old lookup, then clears both maps.
  2. Reuses an internal node when `userNode` is identical; otherwise builds `{...defaults, ...userNode, measured, internals}`.
  3. Sets `positionAbsolute = clampPosition(getNodePositionWithOrigin(node, origin), extent, dims)`.
  4. Fills `handleBounds` from declared `handles` and computes `z = calculateZ(...)`.
  5. Children get `parentAbs + clampedRelative`, clamped to `nodeExtent`, then to the parent rectangle when `extent==='parent'`.
  6. Returns `{ nodesInitialized, hasSelectedNodes }`. `nodesInitialized` is false while any visible node lacks `measured` size.
- **Z rules:**
  - A node's z is `zIndex + (selected ? 1000 : 0)`, unless the mode is `manual` or `elevateNodesOnSelect` is off.
  - A child's z is `parentZ >= childZ ? parentZ + 1 : childZ`.
  - In `auto` mode each root parent adds `rootParentIndex * 10`.
- **`updateAbsolutePositions`** recomputes `positionAbsolute` in place for every node.
- **`updateConnectionLookup(connectionLookup, edgeLookup, edges)`:**
  - Rebuilds both maps.
  - Indexes each edge per endpoint under `nodeId`, `${nodeId}-${type}` and `${nodeId}-${type}-${handleId}`.
  - Each inner map is keyed by the opposite endpoint. `ConnectionLookup` is `Map<string, Map<string, HandleConnection>>`.

**Validation.**

- `isValidConnection(edge | connection) => boolean` is the user hook.
- Strict and loose rules are applied in `XYHandle.isValid` (section A.5).
- `addEdge` rejects a missing source or target (`error006`) and de-duplicates by endpoints and handles. The default id is `xy-edge__${source}${sourceHandle}-${target}${targetHandle}`.
- `reconnectEdge` swaps an edge's endpoints and optionally regenerates its id.

## A.3 Routing (edge paths)

**There is no obstacle-avoiding or orthogonal router.** The source of `getSmoothStepPath` says so: "we try to mimic an orthogonal edge routing behaviour. It's not as good as a real orthogonal edge routing, but it's faster and good enough" (`S/utils/edges/smoothstep-edge.ts`). Every path function is a pure function of the two endpoints and their handle sides. Each returns `[path, labelX, labelY, offsetX, offsetY]`.

**`getBezierPath`** (curvature 0.25 by default):

- Each control point sits along its own handle side, `calculateControlOffset(d, c) = d >= 0 ? 0.5*d : c * 25 * sqrt(-d)`, where `d` is the signed distance toward the other point along that side's axis. A backwards edge therefore bulges out by `25c·√|d|`.
- Path: `M sx,sy C scx,scy tcx,tcy tx,ty`.
- The label sits at the cubic midpoint t = 0.5 (`getBezierEdgeCenter`): `0.125s + 0.375sc + 0.375tc + 0.125t`.

**`getSimpleBezierPath`** exists only in React (`packages/react/src/components/Edges/SimpleBezierEdge.tsx`). Its control point is `[0.5*(x1+x2), y1]` for horizontal sides and `[x1, 0.5*(y1+y2)]` for vertical sides.

**`getStraightPath`**: `M sx,sy L tx,ty`. The label goes at the midpoint (`getEdgeCenter`).

**`getSmoothStepPath`** (defaults `borderRadius = 5`, `offset = 20`, `stepPosition = 0.5`, optional `centerX/centerY`). `getPoints` builds the corner points:

- **Gap.** Each endpoint is pushed out by `offset` along its handle direction, giving `sourceGapped` and `targetGapped`.
- **Opposite-facing handles.**
  - The split point on the main axis is `gappedSource + (gappedTarget - gappedSource) * stepPosition`.
  - The other axis takes the average of the two points.
  - `centerX`/`centerY` override the split.
  - The result is a two-corner vertical or horizontal split.
- **Same or perpendicular sides.**
  - One corner, at `{sourceGapped.x, targetGapped.y}` or its mirror.
  - A `gapOffset` corrects same-side pairs that are closer than `offset`.
  - Mixed sides use the `flipSourceTarget` logic.
- **Label.** Placed on the longest segment.
- **Point list.** `[source, sourceGapped, ...corners, targetGapped, target]`, with duplicates removed.
- **Rendering.** `getBend(a,b,c)` draws an `L` line and a quadratic `Q` corner, with `bendSize = min(|ab|/2, |bc|/2, borderRadius)`.

**Step edge.** It is smoothstep with `borderRadius: 0`.

**Endpoint resolution (`S/utils/edges/positions.ts`).**

- `getEdgePosition(...)` returns `null` until both nodes have handle bounds (measured or declared) and a width.
- It resolves the handle by id, falling back to the first handle when the id is null. A missing handle raises `error008`.
- Sides default to Bottom for the source and Top for the target.
- `getHandlePosition(node, handle, fallback, center)` returns the midpoint of the handle on its side. With `center = true` it returns the handle center instead; connection lines use that.

**Edge z-index (`getElevatedEdgeZIndex`).**

- `manual` mode returns `zIndex` unchanged.
- Otherwise the result is `zIndex + (elevateOnSelect && selected ? 1000 : 0) + nodeZ`.
- `nodeZ` is the highest internal z of the endpoints that have a parent, or are selected while elevation is on. Edges between sub-flow nodes therefore render above their parent.

**Culling (`isEdgeVisible`).** The union box of both endpoint nodes is tested against the view rectangle `(-tx/k, -ty/k, w/k, h/k)`. The path itself is never tested.

**Markers.**

- `getMarkerId(marker, flowId)` keeps string markers as they are. Object markers become `${flowId}__` plus their sorted `key=value` pairs.
- `createMarkerIds` produces the de-duplicated `<defs>` list.
- Symbol geometry is framework code. React draws `arrow` as the polyline `-5,-4 0,0 -5,4`, and `arrowclosed` as the same shape closed and filled.

## A.4 Layout and coordinates

**xyflow does no automatic layout.** Positions always come from the user. The system computes only coordinates, bounds, clamping, snapping and fit.

**Coordinate conversion.**

- `pointToRendererPoint` maps screen to flow coordinates: `((x - tx)/k, (y - ty)/k)`, optionally snapped. `rendererPointToPoint` is the inverse.
- `getPointerPosition` subtracts the container offset and returns both the raw and the snapped point.
- `snapPosition(p, [gx,gy])` rounds each axis to the grid.

**Node origin.** `getNodePositionWithOrigin` returns `position - [w,h]*origin`. Sizes are taken from `measured`, then `width/height`, then `initialWidth/Height`, then 0.

**Clamping.**

- `clampPosition(pos, extent, dims)` keeps `x` within `[e0x, e1x - w]`, and `y` likewise.
- **`calculateNodePosition`** is used by drag and keyboard moves:
  - Resolves the extent: the parent rectangle for `extent: 'parent'`, or a parent-relative extent.
  - Clamps by the measured size.
  - Returns `{position, positionAbsolute}`.
  - Reports `error015` for unmeasured nodes.

**Bounds.**

- `getNodesBounds` and `getInternalNodesBounds` compute the min/max union of node boxes.
- Without a node lookup, sub-flow positions are wrong; `getNodesBounds` warns about this in development.

**Fit view.**

- **`getViewportForBounds(bounds, W, H, minZoom, maxZoom, padding)`:**
  - Padding is a number `p` (meaning `(V - V/(1+p))/2` per side), `'Npx'`, `'N%'`, or a per-side object.
  - Zoom: `zoom = clamp(min((W - px)/bw, (H - py)/bh), minZoom, maxZoom)`.
  - The bounds are then centered, with corrections for asymmetric padding.
- **`fitViewport`:**
  - Filters measured, visible nodes (or the `options.nodes` subset).
  - Computes the bounds with padding 0.1 by default.
  - Calls `panZoom.setViewport` with duration and easing.

**Intersections and visibility.**

- `getNodesInside(nodes, rect, transform, partially, excludeNonSelectable)` drives both render culling and the selection rectangle. It always includes nodes not yet measured, so they get a chance to render and be measured, and nodes being dragged.
- `getIntersectingNodes` and `isNodeIntersecting` live in the framework hooks, not in the system. They use `nodeToRect` and `getOverlappingArea`.

**Auto-pan.**

- `calcAutoPan(pos, bounds, speed = 15, distance = 40)` returns a velocity that ramps up near the container edges.
- XYDrag and XYHandle run it in a `requestAnimationFrame` loop through `panBy`.

**expandParent.** `handleExpandParent` unions a parent's rectangle with its children. It emits a `position` change for the parent, compensating position changes for its other children so they do not move visually, and a `dimensions` change with `setAttributes: true`.

**Measurement pipeline.**

1. One `ResizeObserver` watches every node element (React `useResizeObserver`, Svelte `NodeRenderer`).
2. **`updateNodeInternals(updates, …)`:**
   - Reads the zoom from the computed transform of `.xyflow__viewport` (`m22`).
   - Reads `offsetWidth`/`offsetHeight`.
   - When the size changed, `handleBounds` is missing, or the update is forced: re-clamps the position and recomputes `handleBounds` via `getHandleBounds`. That function queries `.source`/`.target` elements and their `data-handleid`/`data-handlepos`, dividing by zoom.
   - Emits `{type:'dimensions'}` changes plus any expand-parent changes.
3. The store then runs `updateAbsolutePositions`, resolves a queued fit view, and forwards the changes.

## A.5 Interaction state machines

### XYDrag (`S/xydrag/XYDrag.ts`)

Created with `XYDrag({getStoreItems, onDragStart, onDrag, onDragStop, onNodeMouseDown})`. Without a `nodeId` it drags the whole selection box.

1. **filter:** primary button only. Not inside `.nodrag`, and inside the `dragHandle` selector when one is set.
2. **start:** caches the container bounds and records `lastPos`. It starts immediately when `nodeDragThreshold === 0`.
3. **startDrag:**
   - Resolves selection: unselects others when appropriate and selects on drag.
   - Builds drag items with `getDragItems`. These are the selected nodes, or the grabbed node, minus nodes whose ancestor is selected, honoring `draggable`. Each stores the pointer-to-node distance.
   - Fires `onNodeDragStart` and `onSelectionDragStart`.
4. **drag:**
   - Aborts on multi-touch or when the node was deleted.
   - Runs the auto-pan RAF loop and enforces the threshold.
   - Updates only when the snapped pointer moved.
5. **updateNodes:**
   - Computes `next = pointer - distance`.
   - A single node snaps directly. A multi-node drag takes the first item's snap delta and applies it to all, keeping their offsets.
   - With `nodeExtent`, each item gets an extent derived from the selection box, so the group stays inside it.
   - Clamps through `calculateNodePosition`.
   - Calls `updateNodePositions(items, dragging: true)` and fires `onNodeDrag`.
6. **end:** calls `updateNodePositions(items, false)` and fires the `*Stop` callbacks.

### XYHandle (`S/xyhandle/XYHandle.ts`)

The connection and reconnect gesture: `XYHandle = { onPointerDown, isValid }`.

- **Initialization:**
  - Resolves the root document, so shadow DOM works.
  - Determines the handle type from `edgeUpdaterType` or from the `.source`/`.target` class.
  - Finds the origin handle; loose mode searches both handle lists.
  - Sets `from` to the handle center.
  - Seeds a `ConnectionInProgress`.
- **Threshold:** `dragThreshold` defaults to 1 px. Crossing it starts the connection and fires `onConnectStart`.
- **pointermove** (document listeners):
  1. Converts the pointer to flow units.
  2. `getClosestHandle(pos, connectionRadius, …)`:
     - Pre-filters nodes near `radius + 250`.
     - Measures the Euclidean distance to every handle center, excluding the origin handle.
     - Keeps handles within the radius; ties prefer the opposite handle type.
  3. Runs auto-pan.
  4. Validates with `isValidHandle`.
  5. Sets `isValid` to a tri-state: `true` valid, `false` near but invalid, `null` nothing near.
  6. Moves `to`: snapped to the target handle when valid, otherwise the raw pointer.
- **pointerup:**
  - Calls `onConnect(connection)` if the connection is valid.
  - Fires `onConnectEnd(event, FinalConnectionState)`, or `onReconnectEnd` for a reconnect.
  - Calls `cancelConnection()` and removes its listeners.

**`isValidHandle`.**

- Prefers the handle element under the pointer (`elementFromPoint`). Otherwise it uses `[data-id="${flowId}-${nodeId}-${handleId}-${type}"]`.
- Orients the connection by the origin handle type.
- Requires the `connectable` and `connectableend` classes.
- Strict mode allows only source↔target. Loose mode allows anything except the same handle on the same node.
- Then applies the user's `isValidConnection`.
- Clicking two handles in turn to connect reuses the same function.

**Reconnect.** The anchor at the fixed end of the edge calls `onPointerDown` with that endpoint and `edgeUpdaterType`, so `onConnect` becomes `onReconnect(edge, connection)`.

### XYPanZoom (`S/xypanzoom/XYPanZoom.ts`)

A d3-zoom wrapper with `scaleExtent`, `translateExtent` and a pane size cached by ResizeObserver.

- **Wheel delta:** `-deltaY * (lineMode ? 0.05 : pageMode ? 1 : 0.002) * (ctrl && mac ? 10 : 1)`.
- **`update(opts)`:**
  - Detaches during a user selection.
  - Picks `createPanOnScrollHandler` or `createZoomOnScrollHandler`. Pan-on-scroll handles ctrl-pinch zoom, shift-scroll horizontal on non-macOS, and synthesizes start/end with a 150 ms debounce.
  - Installs the start, zoom and end handlers. The zoom handler emits `onTransformChange` unless the event is a sync event.
  - Installs `createFilter`. It rejects events for selection, an active connection, `nowheel`/`nopan`, disabled pinch, mouse buttons not in `panOnDrag`, and ctrl without the pan key.
  - Toggles `dblclick.zoom`.
- **API:**
  - `setViewport` (animated, with linear or smooth interpolation) and `setViewportConstrained`.
  - `syncViewport` applies an external viewport without echoing it back.
  - `getViewport`, `scaleTo`, `scaleBy`, `setScaleExtent`, `setTranslateExtent`, `setClickDistance`, `destroy`.

### XYResizer (`S/xyresizer/XYResizer.ts`)

A d3-drag gesture.

- **Start:** snapshots the start values and the aspect ratio. Resolves `nodeExtent`, or the parent's size for `extent: 'parent'`. Computes `childExtent` as the union of children with `extent:'parent'` or `expandParent`, so the parent cannot shrink past them.
- **Drag (`getDimensionsAfterResize`):**
  - Computes the pointer deltas on the axes the control affects.
  - Applies the strongest clamp among min/max size, extent, child extent and the aspect-coupled limits.
  - Re-applies the aspect ratio (diagonal controls follow the dominant axis) and offsets by the node origin.
  - Shifts children so they stay in place visually.
  - `shouldResize` can veto a step.
  - Emits `onChange(change, childChanges)`.

### XYMinimap

Uses d3-zoom on the minimap SVG for input only:

- Wheel input calls `panZoom.scaleTo`.
- Drag input calls `setViewportConstrained`, scaled by `viewScale·max(k, log k)` and optionally inverted.

## A.6 Change and state model

**Change types (`S/types/changes.ts`).**

- `NodeChange` is one of:
  - `dimensions`: `dimensions`, `resizing`, `setAttributes`;
  - `position`: `position`, `positionAbsolute`, `dragging`;
  - `select`, `remove`, `add` (`item`, `index`), `replace`.
- `EdgeChange` is `select`, `remove`, `add` or `replace`.

**The appliers are React-only** (`packages/react/src/utils/changes.ts`). `applyNodeChanges`/`applyEdgeChanges`:

- Group changes by id; a `remove` or `replace` supersedes everything else.
- Pass untouched elements through by reference.
- Shallow-copy each changed element once, then apply its changes:
  - `select` sets `selected`;
  - `position` sets `position` and `dragging`;
  - `dimensions` sets `measured`, plus `width/height` when `setAttributes`.
- Splice adds at `index`, or append them.

Other React-side helpers:

- `getSelectionChanges` emits `select` changes only for real differences.
- `getElementsDiffChanges` turns batched `setNodes`/`setEdges` into add, replace and remove changes.

**Controlled vs uncontrolled flows.**

- **React:**
  - `triggerNodeChanges` applies changes to the store itself only when `defaultNodes` was used (uncontrolled). It always calls `onNodesChange`.
  - In a controlled flow the user applies the changes and passes back new `nodes`. `setNodes` then runs `adoptUserNodes`, which reuses internals by identity.
- **Svelte:** mutates `store.nodes` directly, without change arrays.

**Deletion (`getElementsToRemove`).**

- Skips elements with `deletable: false`.
- Cascades to children. Because a child is matched only if its parent was matched earlier, this depends on parent-before-child order.
- Adds the connected edges.
- `onBeforeDelete` can veto the deletion or replace the set to remove.

## A.7 Rendering helpers

- **Viewport transform:** the CSS string `translate(${tx}px,${ty}px) scale(${k})` is built in the framework containers.
- **Node toolbar (`getNodeToolbarTransform`):** maps the node rectangle to the screen, offsets it to the chosen side, and appends a percentage shift for alignment.
- **Edge toolbar (`getEdgeToolbarTransform`):** `translate(x,y) scale(1/zoom) translate(-a%,-b%)`, which keeps a constant screen size.
- **Accessibility:**
  - `defaultAriaLabelConfig` and `mergeAriaLabelConfig`.
  - `isInputDOMNode` suppresses shortcuts in inputs, contenteditable and `.nokey`, and works through shadow DOM.
  - Arrow-key moves live in React `useMoveSelectedNodes`. They step 5 px, or one grid step when snapping.
- **Connection status:** `getConnectionStatus` returns the handle CSS status. `handleConnectionChange` diffs the connection lookup for `useNodeConnections`.

## A.8 Steppers and staged processes

**There is no stepper or wizard concept.** The only staged processes are these:

1. **Initialization.**
   - `nodesInitialized` stays false until every visible node is measured.
   - Edges stay unrenderable until both endpoints have handle bounds.
   - Unmeasured nodes are forced into the render set so they can be measured.
2. **Fit view on init.**
   - `fitViewQueued` is resolved either in `setNodes`, once nodes are initialized, or after `updateNodeInternals`.
   - React resolves a `fitViewResolver` promise.
3. **Connection.** idle → armed (pointerdown) → started (threshold, `onConnectStart`) → moving (tri-state `isValid`) → pointerup (`onConnect`?, `onConnectEnd`) → cancel.
4. **Drag.** filter → armed → threshold → `startDrag` → drag ticks (`dragging: true`) → end (`dragging: false`). Multi-touch or deletion aborts the drag.
5. **Pan on scroll.** Start and end are synthesized with a 150 ms debounce.

## A.9 Design decisions and extension points

- **Framework-agnostic core.**
  - The core never owns state. It reads through getters and writes through callbacks, and React (zustand) and Svelte (runes) adapt it.
  - The lookup maps are mutated in place, but changed nodes become new objects so selectors still notice them.
- **DOM contract.**
  - Classes: `source`/`target`, `connectable`, `connectableend`, `${lib}-flow__handle`.
  - Data attributes: `data-handleid`, `data-handlepos`, `data-nodeid`, and `data-id="${flowId}-${nodeId}-${handleId}-${type}"`.
  - The `.xyflow__viewport` element is required for measurement.
- **Custom edges.**
  - The exported path functions are pure, so custom edges reuse them with the coordinates and sides they receive.
  - Built-in edge keys: `default`, `straight`, `step`, `smoothstep`, `simplebezier`.
  - Path shapes are tuned through `pathOptions`.
- **Validation hooks:**
  - `isValidConnection`, `connectionMode`, `connectionRadius`, `connectionDragThreshold`;
  - `isConnectableStart`/`isConnectableEnd`;
  - `onBeforeDelete`, `shouldResize`;
  - React's `onNodesChangeMiddlewareMap`.
- **Event shapes:**
  - `OnConnectStart(event, {nodeId, handleId, handleType})`, `OnConnect(connection)`, `OnConnectEnd(event, FinalConnectionState)`;
  - `OnReconnect(oldEdge, connection)`;
  - node drag `(event, node, nodes)`, `OnMove(event, viewport)`;
  - `OnError(id, message)`.
- **Deliberate scope limit.** Layout and routing are left to external libraries that write `position`.

## A.10 Key file index

| Path                                                                                       | Responsibility                                                                                                              |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/system/src/types/nodes.ts`, `edges.ts`, `handles.ts`, `general.ts`, `changes.ts` | Data model and change types                                                                                                 |
| `packages/system/src/utils/store.ts`                                                       | `adoptUserNodes`, `updateAbsolutePositions`, `updateNodeInternals`, `handleExpandParent`, `updateConnectionLookup`, `panBy` |
| `packages/system/src/utils/general.ts`                                                     | Clamp, auto-pan, snap, screen↔flow, `getViewportForBounds`                                                                  |
| `packages/system/src/utils/graph.ts`                                                       | Bounds, `getNodesInside`, `fitViewport`, `calculateNodePosition`, `getElementsToRemove`                                     |
| `packages/system/src/utils/edges/*.ts`                                                     | Bezier, smoothstep, straight paths; endpoint resolution; edge z and culling; `addEdge`/`reconnectEdge`                      |
| `packages/system/src/utils/dom.ts`                                                         | Pointer position, handle measurement, input detection                                                                       |
| `packages/system/src/utils/marker.ts`                                                      | Marker ids                                                                                                                  |
| `packages/system/src/xydrag/`, `xyhandle/`, `xypanzoom/`, `xyresizer/`, `xyminimap/`       | Interaction state machines                                                                                                  |
| `packages/react/src/utils/changes.ts`                                                      | `applyNodeChanges`/`applyEdgeChanges` (React)                                                                               |
| `packages/react/src/store/index.ts`, `packages/svelte/src/lib/store/index.ts`              | Framework wiring of the system functions                                                                                    |

---

# Part B. xyflow bindings: `@xyflow/react` and `@xyflow/svelte`

Paths are relative to `external/xyflow`. The core algorithms (XYDrag, XYHandle, XYPanZoom, XYResizer, `adoptUserNodes`, `updateNodeInternals`, `getEdgePosition`, the path functions) are covered in Part A and named here only.

**Findings that deviate from what you might expect (verified against source):**

- Most root components live in `packages/react/src/container/`, not `components/`: ReactFlow, Wrapper, GraphView, FlowRenderer, ZoomPane, Pane, Viewport, NodeRenderer, EdgeRenderer.
- **A11y description keys are swapped.** With `disableKeyboardA11y` true the description shows `node.a11yDescription.default`; otherwise it shows `node.a11yDescription.keyboardDisabled`, which is the text that mentions arrow keys (`packages/system/src/constants.ts`, `packages/react/src/components/A11yDescriptions/index.tsx`). What users see is correct; the names are inverted. Svelte copies the same pattern.
- **Svelte drops `pathOptions` on built-in edges.** `EdgeWrapper.svelte` does not forward `edge.pathOptions`, and `SmoothStepEdgeInternal.svelte` does not read it. React's `EdgeWrapper` forwards it.
- Svelte has no `simplebezier` edge.
- Neither package nor the examples contain a stepper or wizard.

## B.1 Package map

**React (`packages/react/src`).** `index.ts` exports:

- **Components:** `ReactFlow`, `Handle`, the edges (`BaseEdge`, `BezierEdge`, `SmoothStepEdge`, `StepEdge`, `StraightEdge`, `SimpleBezierEdge` + `getSimpleBezierPath`), `EdgeText`, `ReactFlowProvider`, `Panel`, `EdgeLabelRenderer`, `ViewportPortal`.
- **Hooks:** `useReactFlow`, `useNodes`, `useEdges`, `useViewport`, `useStore`, `useStoreApi`, `useNodesState`, `useEdgesState`, `useNodesInitialized`, `useNodeConnections` (`useHandleConnections` is deprecated), `useNodesData`, `useConnection`, `useInternalNode`, `useNodeId`, `useKeyPress`, `useUpdateNodeInternals`, `useOnViewportChange`, `useOnSelectionChange`, and the experimental change middleware hooks.
- **Utilities:** `applyNodeChanges`, `applyEdgeChanges`, `addEdge`, `reconnectEdge`, `isNode`, `isEdge`.
- **Additional components:** `Background`, `Controls`, `MiniMap`, `NodeResizer`/`NodeResizeControl`, `NodeToolbar`, `EdgeToolbar`.

Folders:

| Folder        | Contents                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `container/`  | ReactFlow (root, `Wrapper`, `init-values`), GraphView, FlowRenderer, ZoomPane, Pane, Viewport, NodeRenderer (+ `useResizeObserver`), EdgeRenderer (+ `MarkerDefinitions`, `MarkerSymbols`)                                                                                                                                                                                                          |
| `components/` | `ReactFlowProvider`, `BatchProvider`, `StoreUpdater`, `SelectionListener`, `A11yDescriptions`, `Attribution`, `NodeWrapper` (+ `useNodeObserver`; `builtinNodeTypes`), `Nodes/` (Default, Input, Output, Group), `EdgeWrapper` (+ `EdgeUpdateAnchors`; `builtinEdgeTypes`), `Edges/`, `ConnectionLine`, `Handle`, `NodesSelection`, `UserSelection`, `Panel`, `EdgeLabelRenderer`, `ViewportPortal` |
| `contexts/`   | `StoreContext`, `NodeIdContext` (`useNodeId`), `HandleConfigContext` (selects `connectOnClick`, `noPanClassName`, `rfId` once instead of per Handle)                                                                                                                                                                                                                                                |
| `hooks/`      | Public hooks above, plus internal `useDrag`, `useMoveSelectedNodes`, `useGlobalKeyHandler`, `useResizeHandler`, `useViewportHelper`, `useViewportSync`, `useVisibleNodeIds`, `useVisibleEdgeIds`, `useOnInitHandler`, `useColorModeClass`                                                                                                                                                           |
| `store/`      | `createStore` (`index.ts`) and `getInitialState` (`initialState.ts`)                                                                                                                                                                                                                                                                                                                                |
| `types/`      | `store.ts`, `component-props.ts`, `nodes.ts`, `edges.ts`, `general.ts`, `instance.ts`                                                                                                                                                                                                                                                                                                               |
| `utils/`      | `changes.ts`, `edges.ts`, `general.ts`                                                                                                                                                                                                                                                                                                                                                              |

**Svelte (`packages/svelte/src/lib`).**

- **Components:** `SvelteFlow`, `SvelteFlowProvider`, `Panel`, `ViewportPortal`, `Handle`, `EdgeLabel`, `EdgeReconnectAnchor`, the edges (`BaseEdge`, `BezierEdge`, `StepEdge`, `SmoothStepEdge`, `StraightEdge`).
- **Plugins:** `Controls`, `Background`, `Minimap`, `NodeToolbar`, `EdgeToolbar`, `NodeResizer`.
- **Hooks:** `useStore`, `useSvelteFlow` and rune hooks returning `{ current }`.
- **Actions:** `drag` (XYDrag), `zoom` (XYPanZoom), `portal` (`'viewport-back'|'viewport-front'|'root'|'edge-labels'`).
- **Store:** `store/index.ts#createStore`, `initial-store.svelte.ts#getInitialStore` (a runes class), `visibleElements.ts` (`getVisibleNodes`, `getLayoutedEdges`), `context.ts`.

## B.2 State

### React store

`createStore` returns `createWithEqualityFn<ReactFlowState>(…, Object.is)` from `zustand/traditional`. `ReactFlowProvider` creates it once and wraps the tree in `Provider > BatchProvider > HandleConfigProvider`.

**Store shape (`types/store.ts#ReactFlowStore`):**

- **Viewport and size:** `rfId`, `width`, `height`, `transform`, `domNode`, `panZoom`, `minZoom`, `maxZoom`, `translateExtent`, `nodeExtent`, `nodeOrigin`.
- **Graph:** `nodes`, `nodesInitialized`, `nodeLookup`, `parentLookup`, `edges`, `edgeLookup`, `connectionLookup`, `hasDefaultNodes`/`hasDefaultEdges`, `onNodesChange`, `onEdgesChange`.
- **Selection:** `nodesSelectionActive`, `userSelectionActive`, `userSelectionRect`, `multiSelectionActive`.
- **Connection:** `connection: ConnectionState`, `connectionMode` (default Strict), `connectionClickStartHandle`, `connectOnClick`, `connectionRadius`, `connectionDragThreshold`, `isValidConnection`, `autoPanOnConnect`.
- **Behaviour flags:** draggable/connectable/focusable/selectable/elevation flags, `snapToGrid`, `snapGrid` (default `[15,15]`), auto-pan settings, `nodeDragThreshold`, `zIndexMode`.
- **Fit view:** `fitViewQueued`, `fitViewOptions`, `fitViewResolver`.
- **Callbacks and a11y:** all callbacks, `ariaLiveMessage`, `ariaLabelConfig`, and the change middleware maps.
- **SSR:** when `fitView`, `width` and `height` are all given, `getInitialState` precomputes `transform` with `getViewportForBounds`.

**Actions:**

- `setNodes`: runs `adoptUserNodes` with `checkEquality: true`, then resolves a queued fitView once initialized.
- `setEdges`: rebuilds `connectionLookup`.
- `updateNodeInternals`: system measure → `updateAbsolutePositions` → dimension changes.
- `updateNodePositions(dragItems, dragging)`: emits `position` changes, applies `handleExpandParent` and the middleware.
- `triggerNodeChanges` / `triggerEdgeChanges`: apply the changes internally only when uncontrolled; always call `onNodesChange` / `onEdgesChange`.
- Selection actions, zoom and extent setters, `panBy`, `setCenter`, `updateConnection`, `cancelConnection`, `reset`.

**Prop synchronisation (`StoreUpdater`).**

- About 57 tracked fields are diffed against the previous render in a single effect.
- Changed fields go to dedicated setters (`nodes`→`setNodes`, `fitView`→`fitViewQueued`, …) or to `setState`.
- On mount it seeds `defaultNodes`/`defaultEdges`; on unmount it calls `reset()`.

**Controlled vs uncontrolled.**

- **Controlled:** `nodes` + `onNodesChange` + `applyNodeChanges`. `useNodesState` wraps exactly that.
- **Uncontrolled:** `defaultNodes`; the store applies changes itself.

**Batching (`BatchProvider`).**

- `useReactFlow().setNodes`, `addNodes`, `updateNode*` and `fitView` push onto queues.
- A layout effect flushes the queues.
- `getElementsDiffChanges` turns each batch into add, replace and remove changes, which are emitted through `onNodesChange`.

**Selectors.**

- `useStore(selector, eq)` throws `error001` outside a provider.
- Internal components use `shallow`, plus custom equality where needed (`SelectionListener`, `NodeToolbar`, `useNodesData`, `useNodeConnections`).

**`useReactFlow`.**

- **Access:** `getNodes`, `getNode`, `getInternalNode`, `getEdges`, `getEdge`, `setNodes`, `setEdges`, `addNodes`, `addEdges`, `toObject`.
- **Changes:** `deleteElements` (runs `getElementsToRemove` and `onBeforeDelete`), `updateNode`, `updateNodeData`, `updateEdge`, `updateEdgeData`.
- **Geometry and connections:** `getIntersectingNodes`, `isNodeIntersecting`, `getNodesBounds`, `getNodeConnections`.
- **Fit view:** `fitView` returns a Promise.
- **Viewport:** `zoomIn`/`zoomOut` (factor 1.2), `zoomTo`, `setViewport`, `getViewport`, `setCenter`, `fitBounds`, `screenToFlowPosition`, `flowToScreenPosition`.

**Data flow.**

1. An interaction (XYDrag, XYResizer, a click or a key) calls a store action.
2. The action builds `NodeChange[]` and runs the middleware.
3. `triggerNodeChanges` calls `onNodesChange`.
4. The user applies the changes and passes new `nodes`.
5. `StoreUpdater` calls `setNodes`, which runs `adoptUserNodes`.
6. Selectors re-render only the affected `NodeWrapper`s.

### Svelte store

- **Runes.** The store is a class built with runes, with actions attached via `Object.assign`.
- **Raw state.** `$state.raw` holds the viewport, connection, size, DOM and key flags.
- **Derived from props.** Prop-backed values are `$derived`.
- **Derived graph.**
  - `nodesInitialized` is `$derived.by(adoptUserNodes …)` and also resolves fitView.
  - `_edges` rebuilds the connection lookup.
  - `visible` is `{nodes, edges}`, culled when needed. Edge layout objects are reused when unchanged.
- **Binding.**
  - `SvelteFlow.svelte` declares `nodes`, `edges` and `viewport` as `$bindable`. The store writes straight back to the parent's `$state.raw` arrays.
  - **There are no change events and no `applyNodeChanges` in Svelte.**
  - In development, `warnIfDeeplyReactive` warns against deep `$state`.
- **Provider.** `SvelteFlowProvider` holds a swappable store. The inner `SvelteFlow` registers its store via `setStore` and re-scopes the context for its children.
- **Instance API.** `useSvelteFlow()` mirrors `useReactFlow`, with `setZoom` instead of `zoomTo` and `getNodes(ids?)`.

## B.3 Rendering

**React render tree:**

```
div.react-flow[role=application]                    ReactFlow
└ Wrapper → (ReactFlowProvider) → BatchProvider → HandleConfigProvider
   ├ StoreUpdater (renders nothing)
   ├ GraphView (memo; onInit, viewport sync, type warnings)
   │  └ FlowRenderer (memo; selection/pan keys, global key handler)
   │     └ ZoomPane  div.react-flow__renderer        XYPanZoom lives here
   │        └ Pane   div.react-flow__pane            pane clicks, box selection, auto-pan
   │           ├ Viewport div.react-flow__viewport   CSS transform
   │           │  ├ EdgeRenderer → MarkerDefinitions <defs> + EdgeWrapper* (one <svg> per edge)
   │           │  ├ ConnectionLineWrapper <svg>
   │           │  ├ div.react-flow__edgelabel-renderer   portal target
   │           │  ├ NodeRenderer → NodeWrapper* → node component
   │           │  └ div.react-flow__viewport-portal       portal target
   │           └ NodesSelection
   └ SelectionListener, children (Panel, Background, Controls…), Attribution, A11yDescriptions
```

**Viewport.**

- `Viewport` seeds its transform from `getState()`, then writes `translate() scale()` to the DOM from `store.subscribe`. Panning and zooming never re-render React.
- In controlled-viewport mode, `onTransformChange` calls `onViewportChange`, and `useViewportSync` pushes the new viewport into `panZoom.syncViewport`.

**Nodes.**

- `NodeRenderer` subscribes only to the list of visible node ids (`useVisibleNodeIds`), so a drag re-renders just the dragged node.
- `NodeWrapper`:
  - Selects its node and internals.
  - Resolves the component as `nodeTypes[type] || builtinNodeTypes[type]` (`input`, `default`, `output`, `group`), falling back with `onError('003')`.
  - Styles: `transform: translate(positionAbsolute)`, `zIndex: internals.z`, and `visibility: hidden` until measured.
  - Classes: `react-flow__node-${type}`, `selected`, `selectable`, `parent`, `draggable`, `dragging`.
  - Wraps the component in `NodeIdContext`.
- `NodeProps`: `id`, `data`, `type`, `positionAbsoluteX/Y`, `selected`, `dragging`, `isConnectable`, `sourcePosition`, `targetPosition`, `zIndex`, `parentId`, `width`, `height`, …

**Measurement.**

- One shared ResizeObserver batches entries by `data-id` and calls `updateNodeInternals`.
- `useNodeObserver` observes a node until it is initialised, and forces a re-measure when `type`, `sourcePosition` or `targetPosition` changes.
- The pane size comes from `useResizeHandler`, which reports `error004` on zero size.

**Edges.**

- `EdgeRenderer` maps visible edge ids to `EdgeWrapper`.
- `EdgeWrapper`:
  - Merges `defaultEdgeOptions`.
  - Resolves `edgeTypes[type] || builtinEdgeTypes[type]` (`default` bezier, `straight`, `step`, `smoothstep`, `simplebezier`).
  - In a memoised selector, computes `getEdgePosition` and `getElevatedEdgeZIndex`.
  - Renders its own `<svg style={{zIndex}}>`, which is how edges layer.
  - Renders reconnect anchors when `onReconnect` is set.
- `BaseEdge`: the visible path, an invisible interaction path (default width 20) and an SVG `EdgeText`.
- Markers resolve to `url(#…)` ids; prefixing with `rfId` keeps several flows on one page separate.
- `EdgeLabelRenderer` and `ViewportPortal` render through `createPortal` into the viewport layers. `NodeToolbarPortal` renders into `.react-flow__renderer`, so toolbars are not scaled by the zoom.

**Other rendering.**

- **Connection line:** rendered only while a connection is in progress. It picks a path by `connectionLineType` or uses a custom `connectionLineComponent`.
- **Memoisation:** GraphView, FlowRenderer, NodeRenderer, EdgeRenderer, NodeWrapper, EdgeWrapper, Handle, MarkerDefinitions and every built-in edge are memoised.
- **Type-map warnings:** `useNodeOrEdgeTypesWarning` reports `error002` when the `nodeTypes`/`edgeTypes` object identity changes between renders.

**Svelte rendering.**

- `Wrapper` binds `clientWidth`/`clientHeight`, so the pane needs no ResizeObserver.
- Tree: `Zoom > Pane > Viewport > [viewport-back, EdgeRenderer, edge-labels, ConnectionLine, NodeRenderer, NodeSelection, viewport-front]`.
- The viewport transform is applied reactively.
- `NodeWrapper` uses `use:drag`.
- `EdgeWrapper` receives an already laid-out `EdgeLayouted` edge.

## B.4 Composition

**Custom nodes.**

- Write a component typed `NodeProps<NodeType>` and register it with `nodeTypes={{ myType: Comp }}`. Keep that object stable to avoid warning 002.
- **Handle:**
  - Props: `type` (default source), `position` (default Top), `id` (required when a node has several handles of the same type), `isConnectable`, `isConnectableStart`, `isConnectableEnd`, `isValidConnection`, `onConnect`.
  - DOM attributes: `data-handleid`, `data-nodeid`, `data-handlepos`.
  - Classes: `source`/`target`, `connectingfrom`/`connectingto`, `valid`.
  - Outside a node, React reports `error010` and Svelte throws.
- **NodeToolbar:**
  - Props: `nodeId`, `isVisible`, `position` (default Top), `offset` (default 10), `align`.
  - Shown by default only when its node is the single selected node.
- **NodeResizer:**
  - Line and handle controls, min/max sizes, `keepAspectRatio`, `autoScale`, `shouldResize`.
  - `NodeResizeControl` turns XYResizer output into `position`/`dimensions` changes and handles `expandParent`.

**Custom edges.**

- `EdgeProps<EdgeType>`: `sourceX/Y`, `targetX/Y`, `sourcePosition`, `targetPosition`, markers already as `url(#…)`, `pathOptions`, `data`, label props, `interactionWidth`.
- Pattern: call a path helper, render `<BaseEdge path markerEnd/>`, and add `<EdgeLabelRenderer>` for HTML labels. Those labels need `pointerEvents: all` and the `nodrag nopan` classes.
- Svelte uses `EdgeLabel`, plus `EdgeReconnectAnchor` inside custom edges.

**Providers and multiple flows.**

- `Wrapper` skips creating a provider when one already exists.
- Use one provider per flow, with a unique `id` (examples `MultiFlows`, `Provider`).

**Sub-flows.**

- `parentId`, `extent: 'parent'` and `expandParent`, plus the built-in `group` type.
- Examples: `examples/react/src/examples/Subflow`, `examples/svelte/src/routes/examples/subflows`.

**Plugins and panels.**

- Additional components read the store from context.
- `Panel` positions by corner: React defaults to `'top-left'`, Svelte to `'top-right'`.
- `Controls` defaults to `'bottom-left'` and `MiniMap` to `'bottom-right'`.

**Change middleware.** `experimental_useOnNodesChangeMiddleware` and its edge equivalent register into maps keyed by `Symbol`.

## B.5 Routing

**(a) Edge routing in the bindings.**

| Type key       | React component                                | Path function               | `pathOptions`                            |
| -------------- | ---------------------------------------------- | --------------------------- | ---------------------------------------- |
| `default`      | `BezierEdge`                                   | `getBezierPath`             | `curvature`                              |
| `smoothstep`   | `SmoothStepEdge`                               | `getSmoothStepPath`         | `borderRadius`, `offset`, `stepPosition` |
| `step`         | `StepEdge` (SmoothStep with `borderRadius: 0`) | `getSmoothStepPath`         | `offset`                                 |
| `straight`     | `StraightEdge`                                 | `getStraightPath`           | none                                     |
| `simplebezier` | `SimpleBezierEdge` (React only)                | local `getSimpleBezierPath` | none                                     |

- Default sides are Bottom for the source and Top for the target.
- `examples/react/src/examples/EdgeRouting` demonstrates handle-side combinations and `stepPosition` values of 0.2, 0.5 and 0.8.

**(b) App routing in the examples.**

- **React** (`examples/react`, Vite + `react-router-dom` 6):
  - `src/App/index.tsx`: `BrowserRouter`; `/` redirects to `/examples`.
  - `Header` is a `<select>` that navigates among 67 routes listed in `src/App/routes.ts`.
  - `tests/generic/*` loads config files with `import.meta.glob` for Cypress.
- **Svelte** (`examples/svelte`, SvelteKit):
  - `ssr = false`; `/` redirects to `/examples/overview`.
  - 27 example slugs, each a `routes/examples/<slug>/+page.svelte`.
  - Generic tests live under `routes/tests/generic/[topic]`.

## B.6 Layout

**The only auto-layout library in the examples is dagre.** There is no elkjs, d3-hierarchy or d3-force in the examples.

- **React** (`examples/react/src/examples/Layouting`, `dagre` 0.8.5):
  - `onLayout(direction)` uses a fixed node size of 150×50 and sets `rankdir`.
  - It maps dagre's coordinates onto the nodes, sets `sourcePosition`/`targetPosition` to Right/Left or Bottom/Top, and calls `setNodes`.
  - It runs from `onInit`. Panel buttons call `fitView`.
- **Svelte** (`examples/svelte/.../dagre`, `@dagrejs/dagre`):
  - Centres each node (`x - w/2`).
  - Lays out before the first render, then uses `bind:nodes` together with the `fitView` prop.

Layout primitives the integrations rely on:

- **Measured sizes:** `useNodesInitialized()` (`examples/react/src/examples/UseNodesInit`).
- **fitView:**
  - The `fitView` prop queues a fit.
  - The fit resolves in `setNodes` or after `updateNodeInternals`.
  - `FitViewOptionsBase`: `padding`, `includeHiddenNodes`, `minZoom`, `maxZoom`, `duration`, `ease`, `interpolate`, `nodes`.
- **Origin and extents:**
  - `nodeOrigin` defaults to `[0,0]` and can be set per node (`AddNodeOnEdgeDrop` uses `[0.5, 0]`).
  - `nodeExtent` and `translateExtent` bound node positions and panning.
- **Sub-flow layout:** child positions are relative to the parent; `expandParent` grows the parent.

## B.7 Steppers and staged processes

There is **no stepper or wizard UI.** These are the staged lifecycles:

1. **Initialisation:**
   - `ZoomPane` creates `panZoom`, which makes `viewportInitialized` true.
   - `useOnInitHandler` calls `onInit(instance)` once, via `setTimeout(…,1)`.
   - The ResizeObserver measures nodes; `updateNodeInternals` sets `nodesInitialized` and resolves the queued fitView.
   - In Svelte, `oninit()` takes no arguments.
2. **Connection:**
   - `onConnectStart`, then `isValidConnection` (handle prop, else store prop, else true), then `onConnect`, then `onConnectEnd`.
   - `onConnectExtended` merges `defaultEdgeOptions` and calls `addEdge` when uncontrolled.
   - Click-to-connect: the first click calls `onClickConnectStart`; the second click validates and calls `onClickConnectEnd`.
   - Svelte adds `onbeforeconnect(connection) => edge | void`.
   - Examples: `Validation`, `CancelConnection` (a countdown), `AddNodeOnEdgeDrop` (an `onConnectEnd` that drops on the pane, converts with `screenToFlowPosition`, then adds a node and an edge).
3. **Drag:** `onNodeDragStart` → `onNodeDrag` → `onNodeDragStop`, with `onSelectionDrag*` for multi-node drags.
4. **Delete:** `onBeforeDelete` (veto or filter) → `onEdgesDelete` → edge removals → `onNodesDelete` → node removals → `onDelete`.

## B.8 Accessibility and keyboard

**Focusable nodes.**

- `tabIndex=0` when focusable.
- `role` defaults to `group`, with `aria-roledescription="node"`.
- `aria-describedby` points to the hidden description; `aria-label` comes from `ariaLabel`; `domAttributes` are passed through.

**Focusable edges.**

- `role` is `group` when focusable, otherwise `img`.
- The default `aria-label` is "Edge from X to Y"; `null` suppresses it.

**Node keys.**

- Enter, Space and Escape select or deselect.
- Arrow keys move selected nodes 5 px, or one grid step, ×4 with Shift. Each move announces itself through the live region.
- On focus-visible, a node scrolls into view (`autoPanOnNodeFocus`).

**Global keys.**

- `deleteKeyCode` (default Backspace), `multiSelectionKeyCode` (Meta on Mac, Control elsewhere), `selectionKeyCode` (Shift), `panActivationKeyCode` (Space), `zoomActivationKeyCode`.
- Svelte uses `KeyHandler.svelte` with `@svelte-put/shortcut` and names the props `deleteKey`, `selectionKey`, etc. Window blur and contextmenu reset them.

**ARIA config.** `ariaLabelConfig` is merged by `mergeAriaLabelConfig` and also covers the Controls and MiniMap labels.

## B.9 React vs Svelte

| Aspect             | React                                                               | Svelte                                                        |
| ------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Store              | zustand in context; `useStore(selector, eq)`                        | Runes class in context; `useStore()` returns the object       |
| Ownership          | Controlled (`onNodesChange` + `applyNodeChanges`) or `defaultNodes` | `bind:nodes` on `$state.raw`; direct writes; no change events |
| Prop sync          | `StoreUpdater` effect diffs ~57 fields                              | `$derived` getters                                            |
| Batching           | `BatchProvider` queues                                              | Direct assignment                                             |
| Viewport           | Imperative DOM transform via subscribe                              | `style:transform`; `bind:viewport`                            |
| Culling            | `useVisibleNodeIds`/`useVisibleEdgeIds`                             | `store.visible`, edge layouts cached                          |
| Edge position      | Computed in an `EdgeWrapper` selector                               | Precomputed (`EdgeLayouted`)                                  |
| Built-in edges     | default, straight, step, smoothstep, simplebezier                   | default, straight, step, smoothstep                           |
| Edge `pathOptions` | Forwarded                                                           | Not forwarded                                                 |
| Reconnect          | `onReconnect` → `EdgeUpdateAnchors`                                 | `EdgeReconnectAnchor` in custom edges; `onbeforereconnect`    |
| HTML labels        | `EdgeLabelRenderer` (portal)                                        | `EdgeLabel` (`use:portal`)                                    |
| Event style        | camelCase, `(event, node)`                                          | lowercase, object argument `{node, event}`                    |
| Key props          | `deleteKeyCode`, …                                                  | `deleteKey`, … (also `{key, modifier}`)                       |
| Defaults           | `selectionMode` Full, `nodeClickDistance` 0                         | `selectionMode` Partial, `nodeClickDistance` 1                |
| Instance           | `useReactFlow()`                                                    | `useSvelteFlow()`                                             |
| Hook returns       | Plain values                                                        | `{ current }` getters                                         |
| Gesture glue       | `useDrag` hook, `ZoomPane` effect                                   | `drag`/`zoom` actions                                         |
| Pane size          | ResizeObserver                                                      | `bind:clientWidth`/`clientHeight`                             |

## B.10 Key file index

| Path                                                                                             | Responsibility                                    |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| `packages/react/src/container/ReactFlow/index.tsx`, `Wrapper.tsx`                                | Root, prop defaults, auto-provider                |
| `packages/react/src/components/ReactFlowProvider/index.tsx`                                      | Store creation, provider stack                    |
| `packages/react/src/components/BatchProvider/index.tsx`                                          | Instance-API queues, diff into changes            |
| `packages/react/src/components/StoreUpdater/index.tsx`                                           | Prop→store sync                                   |
| `packages/react/src/store/index.ts`, `initialState.ts`, `types/store.ts`                         | Store, actions, defaults                          |
| `packages/react/src/container/{GraphView,FlowRenderer,ZoomPane,Pane,Viewport}/index.tsx`         | Render tree, keys, pan/zoom, selection, transform |
| `packages/react/src/container/NodeRenderer/*`, `components/NodeWrapper/*`                        | Node rendering, measurement, keyboard, a11y       |
| `packages/react/src/container/EdgeRenderer/*`, `components/EdgeWrapper/*`, `components/Edges/*`  | Edge rendering, markers, built-in edges           |
| `packages/react/src/components/Handle/index.tsx`, `ConnectionLine/index.tsx`                     | Handles, connection line                          |
| `packages/react/src/hooks/useReactFlow.ts`, `useNodesEdgesState.ts`, `useGlobalKeyHandler.ts`    | Instance API, state hooks, keys                   |
| `packages/react/src/utils/changes.ts`                                                            | Change appliers and diffs                         |
| `packages/react/src/additional-components/{NodeToolbar,NodeResizer,MiniMap,Controls,Background}` | Plugins                                           |
| `packages/svelte/src/lib/container/SvelteFlow/SvelteFlow.svelte`                                 | Svelte root, bindable state                       |
| `packages/svelte/src/lib/store/{index.ts,initial-store.svelte.ts,visibleElements.ts}`            | Runes store, derived visibility                   |
| `packages/svelte/src/lib/components/{NodeWrapper,EdgeWrapper,KeyHandler,SvelteFlowProvider}`     | Svelte wrappers, keys, provider                   |
| `packages/svelte/src/lib/actions/{drag,zoom,portal}`                                             | Gesture and portal actions                        |
| `examples/react/src/App/*`, `examples/svelte/src/routes/*`                                       | Example routing                                   |
| `examples/react/src/examples/Layouting`, `examples/svelte/src/routes/examples/dagre`             | dagre layout                                      |

---

# Part C. Workflow Builder packages: sdk, ui, types, tokens, ai-config (commit 4bbe6512)

Paths are relative to `external/workflowbuilder`.

## C.1 Overview and package map

**It is built directly on React Flow.**

- `packages/sdk/package.json` declares `@xyflow/react ^12` as a peer dependency, next to `react`/`react-dom` 18–19 and `zustand ^5`.
- The canvas renders xyflow's `<ReactFlow>` in `packages/sdk/src/features/diagram/diagram.tsx` (`DiagramContainerComponent`).
- The model types are xyflow types: `WorkflowBuilderNode = Node<NodeData>` and `WorkflowBuilderEdge = Edge<EdgeData>` (`packages/sdk/src/node/node-data.ts`).
- The SDK wraps React Flow as a **fully controlled canvas**: the SDK store owns nodes, edges and change handlers.
- Consumers can pass any other React Flow prop through `reactFlowProps`, typed `Omit<ReactFlowProps, SdkOwnedReactFlowKey>`.

| Package              | npm name / visibility                           | Purpose                                                                                                                | Key dependencies                                                                                                                                                                                                                                    |
| -------------------- | ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/sdk`       | `@workflowbuilder/sdk` 3.0.0, public            | Embeddable editor: `WorkflowBuilder` compound component, plugin API, store, JSON Forms property panel, persistence     | peers `@xyflow/react`, `zustand`, `react`; `@jsonforms/core`/`react` ^3.4, `@cfworker/json-schema` 4.1.1, `immer`, `i18next`, `@base-ui/react`, `notistack`, `react-ace`, `react-mentions-ts`, `remeda`, `date-fns`. Bundles `ui`, `types`, `icons` |
| `packages/ui`        | `@workflowbuilder/ui` 1.0.0                     | Base UI component library plus diagram parts (`NodePanel`, `NodeAsPortWrapper`, `EdgeLabel`, `useEdgeStyle`, `Status`) | `@base-ui/react`, `@phosphor-icons/react`. Does not import xyflow; only targets `.react-flow__handle` in CSS                                                                                                                                        |
| `packages/tokens`    | `@workflowbuilder/ui-tokens`, private           | Figma Tokens Studio → Style Dictionary → `--wb-ds-*` CSS variables                                                     | `style-dictionary` ^4, `@tokens-studio/sd-transforms`                                                                                                                                                                                               |
| `packages/types`     | `@workflow-builder/types`, private, source-only | Execution and backend contracts (`exports: {"./*": "./src/*.ts"}`)                                                     | none                                                                                                                                                                                                                                                |
| `packages/ai-config` | `@workflow-builder/ai-config`, private          | `AI_API_KEY`/`AI_BASE_URL`/`AI_MODEL` contract for backend and worker only                                             | none                                                                                                                                                                                                                                                |

**Dependency direction:** tokens → ui → sdk.

- The UI library is compiled into the SDK bundle.
- The SDK imports `@workflow-builder/types` in exactly one place (`utils/shared-properties.ts`, for `NODE_ERROR_POLICIES`).
- `vite.config.mts` keeps `react`, `@xyflow/react`, `@jsonforms/*`, `i18next*`, `immer`, `zustand`, `@base-ui/react` and `@phosphor-icons/react` external, to avoid duplicate singletons.

**Public surface (`packages/sdk/src/index.ts`).**

- `WorkflowBuilder = Object.freeze({ Root, TopBar, Palette, Canvas, PropertiesPanel, DefaultLayout })`.
- Plugin API: `registerComponentDecorator`, `registerFunctionDecorator`, `registerPluginTranslation`.
- JSON Forms authoring primitives.
- Store helpers: `useStore`, `getStoreNodes`/`setStoreNodes`, `getStoreEdges`/`setStoreEdges`, `getStoreLayoutDirection`/`setStoreLayoutDirection`, `getStoreDataForIntegration`, `getStoreSelection`, `openModal`.
- Change listeners: `addNodeChangedListener`, `useNodeChangedListener`, …
- Building blocks: `LabelEdge`, `EnhancedBaseEdge`, `EdgeLabel`, `SelfConnectingEdge`, `NodeSection`, `OptionalNodeContent`, `PropertiesBar`, `defineNodeTemplate`, `getHandleId`, `getScope`, `generalInformation`, `sharedProperties`, `errorPolicyProperty`.

**Bootstrap (`bootstrap.ts`).**

- `bootstrap-immer.ts` runs first and calls `setAutoFreeze(false)` globally, because React Flow mutates node objects.
- Initialises i18next (en, pl).
- Runs two internal plugins: a language selector in `OptionalAppBarControls`, and `ModalProvider` after `DiagramContainer`.

## C.2 Schemas

**Node definitions (palette items).** `PaletteItem<T> = NodeDefinition<T>` (`packages/sdk/src/node/common.ts`):

```ts
type NodeDefinition<T extends NodeSchema> = {
  schema: T;
  defaultPropertiesData: NodeDataProperties<T>;
  uischema?: UISchema;
  outputSchema?: NodeOutputSchema;
} & Required<Omit<BaseNodeProperties, 'errors' | 'customErrors'>> & // label, description
  Pick<NodeData, 'type' | 'icon' | 'templateType' | 'isStartNode'>;
```

- `PaletteGroup = { label, groupItems, isOpen? }`, passed through `<WorkflowBuilder.Root nodeTypes>`.
- `type` is the product node id, a free string.
- `templateType: NodeType` picks a built-in renderer: `node`, `start-node`, `ai-node` or `decision-node` (`node/node-types.ts`).
- `isStartNode` is copied onto the node when it is dropped.
- **The SDK ships no concrete node types.** They live in the apps (sdk-restructuring decision log, "Scope boundary").

**Property schema (JSON Schema draft-07, no zod).**

- `NodeSchema = ObjectFieldRequiredValidationSchema & { properties; allOf?: IfThenElseSchema[] }` (`node/node-schema.ts`).
- `FieldSchema` covers string, number and boolean (with optional select `options`), object and array.
- Validation keywords are typed in `node/node-validation-schema.ts`.
- Conditional validation uses `if/then/else`.
- `NodeDataProperties<T>` infers the TypeScript type of a node's properties from its schema (`types/default-properties.ts`).

**Validation engine (`workflowBuilderValidator`, `utils/validation/workflow-builder-validator.ts`).**

- A duck-typed Ajv object (`compile`, `validate`) backed by `@cfworker/json-schema` `Validator(schema,'7')`. It needs no `eval`, so it is CSP-safe.
- Compiled validators are cached in a `WeakMap` keyed by schema.
- The same validator is used by JSON Forms and by `getNodeErrors`.
- Errors are flattened into `node.data.properties.errors`; external errors go in `customErrors`.
- `getIsValidFromProperties` returns false when either list is non-empty.
- Validation re-runs on load, in `setStoreNodes`, and after the palette loads (deferred `refreshNodesErrorsIfNeeded`).

**Schema-driven forms: JSON Forms, not rjsf** (`features/json-form/json-form.tsx`).

- Renders `<JsonForms validationMode="ValidateAndShow" ajv={workflowBuilderValidator} config={{readonly}}>`, with custom renderers placed before the built-in ones.
- Built-in renderers (`createControlRenderer`/`createLayoutRenderer`, rank 1 via `uiTypeIs`):
  - **Controls:** Text, Switch, Select, DatePicker, TextArea, DynamicConditions, DecisionBranches, AiTools, VariableText, VariableTextArea (mentions), MessageOnError.
  - **Layouts:** VerticalLayout, HorizontalLayout, Group, Accordion.
  - **Labels:** Label, RichText.
  - **Fallback:** an unknown-type renderer.
- The UI schema is a custom union (`types/uischema.ts`, `controls.ts`, `layouts.ts`, `rules.ts`) that reuses JSON Forms rules.
- Helper fragments: `generalInformation` (Title, Status, Description), `sharedProperties`, `errorPolicyProperty`, and `getScope<typeof schema>('properties.label')`.

**Outputs and variables.**

- `NodeOutputSchema` is either `{type:'default', properties}` or `{type:'variant', variants, variantRule}`.
- `getAvailableVariablesByNodeId` walks the edges backwards (BFS) to collect upstream outputs.
- These feed the `{{nodes.*}}` and `{{global.*}}` suggestions.
- Workflow variables are `VariablesIndex`, stored in `globalVariables`.

**Document formats.**

- **Persistence:** `IntegrationDataFormat = { name, globalVariables, layoutDirection, nodes, edges }` (`types/integration.ts`), produced by `getStoreDataForIntegration()`. Runtime fields are stripped: `measured`, `dragging`, `selected`, `routerPointsFromAvoidNodes`, `layoutPoints`.
- **Templates:** `DiagramModel = { name, layoutDirection, diagram: ReactFlowJsonObject }`, wrapped as `TemplateModel = { id, name, value, icon }`. Template positions snap to an 18×18 grid.
- **Export:** `JSON.stringify(getStoreDataForIntegration())`.
- **Import (`validateIntegrationData`):**
  - Nodes with no palette definition are errors.
  - Schema-invalid nodes are warnings, with an "ignore and import" option.
  - `layoutDirection` defaults to `'RIGHT'`.

**Versioning.** There is no document version field. The only migration removes the SDK 2.0 `<uuid>:` prefix from handle ids, on edges and inside `data.properties` (`features/diagram/handles/migrate-legacy-handle-id.ts`). It runs on every load.

**`packages/types`.**

- `workflow-execution/execution-model.ts`: `NODE_ERROR_POLICIES = ['fail','continue','errorRoute']`, `NodeRole='start'`, `BaseNode`, `WorkflowEdgeDefinition {sourceNodeId, targetNodeId, sourceHandle?}`, `WorkflowDefinition<TNode>`.
- `execution-events.ts`: the event union, `ExecutionStatus`, terminal tuples.
- `api.ts`, `decision-request.ts`, `errors.ts`, `node-output-schema.ts`.

## C.3 Composition and extension

**`<WorkflowBuilder.Root>`** (`workflow-builder-root/workflow-builder-root.tsx`) takes:

| Prop group  | Props                                                             |
| ----------- | ----------------------------------------------------------------- |
| Content     | `nodeTypes`, `nodeTemplates`, `edgeTemplates`, `diagramTemplates` |
| Extension   | `plugins`, `jsonForm{renderers,cells,translations}`               |
| Persistence | `integration`                                                     |
| Document    | `name`, `layoutDirection`, `initialNodes`, `initialEdges`         |
| Branding    | `logo`, `logoHref`                                                |
| Canvas      | `isValidConnection`, `reactFlowProps`                             |
| Layout      | `children`                                                        |

On each render, Root:

1. Boots plugins once, behind a `useRef` guard.
2. Calls `resetWorkflowStore()` in a mount-only `useLayoutEffect`.
3. Calls `initTheme()`.
4. Writes props **during render** into module-level holders (`data/*.ts`: palette, templates, node and edge templates, React Flow config, branding).
5. Renders `RuntimeIntegrationWrapper` → `ReactFlowProvider` → `RootShell`.

**`RootShell`** renders `children ?? <DefaultLayout/>`, plus the snackbar, loader, `OptionalHooks` and `OptionalAppChildren`.

**`DefaultLayout`** floats lazily loaded AppBar, Palette and PropertiesBar over `DiagramWrapper > DiagramContainer`. A `#viewport-bounds` div defines the fit-view padding. Custom layouts arrange `TopBar`, `Palette`, `Canvas` and `PropertiesPanel` themselves; `useWorkflowBuilderActions()` supplies the top-bar commands.

**Plugins** (`type WorkflowBuilderPlugin = () => void`, synchronous) write into module registries once per Root lifetime.

- **`registerComponentDecorator(slot, { content, place: 'before'|'after'|'wrapper', modifyProps, priority, name })`** (`features/plugins-core/adapters/adapter-components.tsx`):
  - `withOptionalComponentPlugins(Component, slot)` runs `modifyProps` in priority order, then stacks the before, wrapper and after content.
  - Deduplication is by `name`, or by a content fingerprint when unnamed.
- **`registerFunctionDecorator(name, { place, callback })`:** before-callbacks may return `{replacedParams}`; after-callbacks may return `{replacedReturn}`.
- **Component slots:** `DiagramContainer`, `PropertiesBar`, `WorkflowNodeTemplate`, `StartNodeTemplate`, `ProjectSelection`, `OptionalHooks`, `OptionalAppChildren`, `OptionalAppBarTools`, `OptionalAppBarControls`, `OptionalFooterContent`, `OptionalEdgeProperties`, `OptionalNodeContent` (inside node bodies; receives `nodeId`).
- **Function slots:** `trackFutureChange`, `getPaletteData`, `getTemplates`, `getControlsDotsItems`.
- **`registerPluginTranslation`** merges i18n resources.

**Custom nodes.**

- `nodeTemplates: Record<data.type, ComponentType<WorkflowNodeTemplateProps>>`.
- `adaptCustomNodeTemplate` maps `NodeProps` to `{id, icon, label, description, data, selected, isValid, layoutDirection}`.
- Custom templates are merged over the built-ins (`node`, `start-node`, `ai-node`, `decision-node`).
- `resolveReactFlowNodeType` uses the palette `type` as the React Flow node type when a custom template exists, and `templateType` otherwise.

**Custom edges.** `edgeTemplates` are merged over `{ labelEdge: LabelEdge }`, with no adapter.

**Property panel.** `PropertiesBar` accepts tabs `{label, value, components: {when, component}[]}`, extended via `modifyProps`, plus a footer portal. Custom JSON Forms renderers come from `jsonForm.renderers`.

**Connection validation.** `isValidConnection({connection, sourceNode, targetNode})` is adapted to xyflow by `useIsValidConnection`. It fails open when a node cannot be resolved.

**Theming.**

- `packages/tokens` runs Style Dictionary transforms (`wb/css-variable-name`, `wb/font-size-rem`, `wb/dimension-rem`) and emits `dist/tokens.css`.
- `config.ts` maps sets to selectors: `Primitives` and `Canvas` to `:root`; `Tokens/Light|Dark` and `Effects/*` to `html[data-theme='light'|'dark']`.
- Components consume `--wb-ds-*` (generated) and `--wb-public-*` (hand-authored).
- Library CSS sits in `@layer ui.base, ui.component`, so unlayered consumer CSS wins.
- The theme is persisted under `wb-theme` and applied as `<html data-theme>`.

## C.4 State

**One global zustand store.** `useStore = createWithEqualityFn(devtools(storeInitializer), shallow)` (`store/store.ts`).

- It is a module singleton: one editor per page.
- Root resets it on mount.
- An intercepting middleware chain exists but is empty.

| Slice                                | State                                                                                                                                                                                      | Actions                                                                                                                                            |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `diagram-slice.ts`                   | `nodes`, `edges`, `reactFlowInstance`, `documentName`, `globalVariables`, `isReadOnlyMode`, `layoutDirection` (default `'RIGHT'`), `connectionBeingDragged`, `draggedSegmentDestinationId` | `onConnect` (`addEdge` with `type:'labelEdge'` and a computed z-index), `onInit`, `setDiagramModel`, `setToggleReadOnlyMode`, `setLayoutDirection` |
| `diagram-data-modification-slice.ts` | none                                                                                                                                                                                       | `onNodesChange`/`onEdgesChange` (xyflow appliers), `setNodeProperties`, `setNodeData`, `setEdgeData` (immer), `removeElements`                     |
| `diagram-selection-slice.ts`         | `selectedNodesIds`, `selectedEdgesIds`, `hoveredElement`                                                                                                                                   | `onSelectionChange`, edge hover                                                                                                                    |
| `palette/palette-slice.ts`           | `isSidebarExpanded`, `data`, `fetchDataStatus`, `draggedItem`                                                                                                                              | `fetchData`, `getNodeDefinition(type)`                                                                                                             |
| `user-preferences-slice.ts`          | `shouldSkipShowingConfirmation`                                                                                                                                                            | setter                                                                                                                                             |

**Other stores:** changes tracker, integration (`savingStatus`), modal (one at a time), and an actions-index cache.

**Data flow.**

- `<ReactFlow nodes edges onNodesChange …>` is fully controlled.
- `handleOnNodesChange` → `trackFutureChange('nodeDragChange')` → node-changed listeners → store `onNodesChange`.
- **Selection** is stored as id lists. `useSingleSelectedElement` derives fresh objects with custom equality, because xyflow's `onSelectionChange` hands back stale objects (`features/properties-bar/selection.decison-log.md`).
- **Property edits:** JSON Forms `onChange` → `NodeProperties`:
  - Skips phantom changes with `isDeepEqual`.
  - Calls `trackFutureChange('dataUpdate')` and `setNodeProperties`.
  - Calls `removeEdgesForDeletedHandles`, so deleting a branch or tool deletes its edges.
- **Layout direction:** a change triggers `useUpdateNodeInternals()` on every node.

**Read-only mode** disables connecting, dragging, deleting (`onBeforeDelete` returns false), palette dragging and form editing. **There is no execution-status state in the SDK.**

**Persistence (`RuntimeIntegrationWrapper`).**

- **Strategies:**
  - `localStorage`, under `workflowBuilderDiagram`.
  - `api`: GET `endpoints.load` / POST `endpoints.save`.
  - `props`: the host's `onDataSave(data, {isAutoSave})`.
- **Load:** `loadData` hydrates the store, or opens the template selector when there is no data.
- **Autosave:**
  - Runs 400 ms after a change, but only when more than 10 s have passed since the last save.
  - Skips drag noise and also saves on `beforeunload`.
  - It is mounted inside `SaveButton`, so it only runs when the top bar is rendered.

**Undo/redo is not implemented in the SDK.** The SDK provides the hook point:

- `trackFutureChange(name, params)` fires before every mutation (`addEdge`, `addNode`, the drag events, `delete`, `dataUpdate`, `setDiagramModel`, `import`, `selectTemplate`, `manualSave`).
- It is decoratable; the changes-tracker README describes the snapshot-before-change pattern.
- The undo-redo plugin itself lives in the apps.

## C.5 Rendering

**Canvas defaults (`diagram.tsx`).**

- `fitView` (`maxZoom` 1), `panOnScroll`, `minZoom` 0.1, `snapToGrid` with `[18,18]`, `selectionOnDrag`, `SelectionMode.Partial`, `deleteKeyCode ['Backspace','Delete']`, `panOnDrag [1,2]`.
- The only child is `<Background>`. **There is no MiniMap, Controls, NodeToolbar or NodeResizer anywhere in the SDK.**
- Deleting opens a confirmation modal through `onBeforeDelete`.
- The connection line is `TemporaryEdge`.
- Keyboard: Ctrl/Cmd+A selects all; + and − zoom.

**Nodes.**

- Each container computes `isValid`, `layoutDirection` and `connectionBeingDragged`.
- It wraps the template in UI `NodeAsPortWrapper`. During a connection drag, that component grows the target handle's `::before` to cover the whole node, so the body acts as a drop port.
- Templates are composed from `NodePanel.Root/Header/Content/Handles`, `NodeIcon`, `NodeDescription`, `Collapsible` and `Status` (a badge when invalid).

| Template               | Handles                                                                  |
| ---------------------- | ------------------------------------------------------------------------ |
| `WorkflowNodeTemplate` | target + source                                                          |
| `StartNodeTemplate`    | source only                                                              |
| `DecisionNodeTemplate` | target + one source per branch (`BranchesContainer` → `ConnectableItem`) |
| `AiAgentNodeTemplate`  | target + source + one source per tool; Chat Model and Memory info        |

**Handles.**

- `getHandleId({handleType, innerId})` returns `'source'`/`'target'`, or `'source:inner:<id>'` for inner handles.
- `getHandlePosition` maps RIGHT to Left/Right sides and DOWN to Top/Bottom.
- Alignment is `'header'` for RIGHT and `'center'` for DOWN.
- The CSS lives in `packages/ui/src/components/node/node-panel/handle.module.css`. A source comment points to `sdk/src/index.css` instead; that rule does not exist there.

**Edges.**

- `LabelEdge` renders `EnhancedBaseEdge` (a wide transparent hit path plus `BaseEdge`) and an `EdgeLabel` at the path midpoint, through `EdgeLabelRenderer`.
- Self-loops (`source === target`) render `SelfConnectingEdge`, a hand-built loop with its apex 48 px above the node.
- Hover and selection styles map to `--wb-public-edge-color*`.
- The edge panel edits only the label.

**Palette drag-and-drop.**

- The palette renders groups as accordions.
- Mousedown sets `draggedItem` and renders a `DraggedItem` preview, used as the drag image.
- `usePaletteDrop`:
  - Converts the drop point with `screenToFlowPosition`.
  - Builds `data`: translated label, default properties, `isStartNode`.
  - Creates the id with `crypto.randomUUID()`.
  - Applies an add change with `selected:true`.

**Visual states.** Validation (Status badge, form errors, `MessageOnError`), selection, and read-only. **No execution highlighting in the SDK or UI.**

## C.6 Routing

**(a) Edge routing.**

- Every built-in edge uses xyflow `getSmoothStepPath`, with `EDGE_CURVE_RADIUS = 16` and `EDGE_OFFSET = 20`.
- `TemporaryEdge` adds an offset tweak to avoid an S-curve.
- Edges from inner handles get `zIndex 1001`.
- **No obstacle-avoiding router.** The SDK only strips `routerPointsFromAvoidNodes`/`layoutPoints`; those fields belong to app plugins.
- There is no "add node on edge" affordance.

**(b) Branch semantics.**

```ts
type DecisionBranch = { id; sourceHandle; label; conditions: DynamicCondition[] };
type DynamicCondition = { x; comparisonOperator; y; logicalOperator };
```

- Each branch owns its source handle: `createDecisionBranch()` sets `sourceHandle = getHandleId({innerId, handleType:'source'})`.
- Edges store that id as `sourceHandle`, so routing at execution time means "follow the edges whose `sourceHandle` equals the chosen port".
- AI tools follow the same pattern.
- `errorPolicy: 'errorRoute'` follows edges whose `sourceHandle === 'errorRoute'`. The SDK exposes it only as a select field and renders no dedicated handle for it.
- Evaluating conditions is the engine's job (Part D).

**(c) App routing.** None; no router dependency.

## C.7 Layout

**There is no auto-layout in the SDK, UI or types.** elkjs and libavoid-js were moved to the demo (restructuring decision log §8). What the SDK does provide:

- `LayoutDirection = 'DOWN' | 'RIGHT'`, stored and persisted per document. It drives handle sides, handle alignment and `ConnectableItem` orientation.
- `toggleLayoutDirection({flipPositions, fitView})`, which swaps x and y: "a naive mirror, not a layout algorithm".
- `setStoreLayoutDirection`, documented as "call your auto-layout helper after this".
- Grid snapping: `snapToGridIfNeeded` for templates, plus xyflow `snapToGrid`.
- `useFitView()`: an animated 800 ms fit (`maxZoom` 1), padded by `#viewport-bounds`, run after a template is chosen.

## C.8 Steppers

**None.** Nothing named stepper, wizard or step exists in sdk or ui. The closest patterns are:

- the template-selector modal shown when the document is empty;
- the settings modal with tabs, including a list → add → edit → remove pane switch for global variables.

No step-by-step execution view exists in the packages; the event types are defined only in `packages/types`.

## C.9 Design decisions

- **`packages/sdk/sdk-restructuring.decision-log.md`:**
  - The editor moved into the SDK and the demo became a consumer.
  - Plugins are synchronous `() => void`.
  - `nodes` was renamed `nodeTypes`.
  - Concrete nodes, templates and plugins stay in the apps.
  - The public API is barrel-only.
  - Module holders are set during render, not in effects.
- **`packages/sdk/DECISION-LOG.md`:** externals strategy, CSS layer issues, single instance per page.
- **`form-generation.decision-log.md`:** JSON Forms over rjsf and React Hook Form, so node properties are backend-servable JSON.
- **`form-validation.decision-log.md`:** validation comes only from JSON Schema `if/then/else`; UI visibility never affects it.
- **`workflow-builder-validator-16-04-2026.decision-log.md`:** Ajv's `new Function()` was replaced by the cfworker wrapper for CSP.
- **`selection.decison-log.md`:** selection as id lists with a custom-equality hook.
- **`i18next.decision-log.md`:** i18next with a detector and localStorage cache.
- **`connectable-item-width.decision-log.md`:** row widths come from real insets.
- **`workspace-layout.decision-log.md`:** `apps/` holds runnable apps, `packages/` holds libraries.
- **UI build:** `packages/ui/css-layers.md` and related logs.

## C.10 Key file index

| Path                                                                                            | Responsibility                                                       |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/sdk/package.json`, `vite.config.mts`                                                  | Peers, externals, library build                                      |
| `packages/sdk/src/index.ts`, `bootstrap.ts`                                                     | Public barrel, immer and i18n bootstrap                              |
| `packages/sdk/src/workflow-builder-root/*`                                                      | Root props, plugin boot, holders, shell                              |
| `packages/sdk/src/data/*.ts`                                                                    | Module-level config holders                                          |
| `packages/sdk/src/node/*.ts`, `types/*.ts`                                                      | Palette item, node/edge data, schemas, UI schema, integration format |
| `packages/sdk/src/store/**`                                                                     | Global store and slices                                              |
| `packages/sdk/src/features/changes-tracker/**`                                                  | `trackFutureChange` (undo, autosave hook point)                      |
| `packages/sdk/src/features/diagram/**`                                                          | ReactFlow wrapper, node/edge types, templates, handles, edges        |
| `packages/sdk/src/features/palette/**`, `hooks/use-palette-drop.ts`                             | Palette and drag-to-canvas                                           |
| `packages/sdk/src/features/properties-bar/**`, `features/json-form/**`                          | Property panel and JSON Forms renderers                              |
| `packages/sdk/src/utils/validation/**`                                                          | CSP-safe validator, node errors                                      |
| `packages/sdk/src/features/plugins-core/**`                                                     | Component, function and i18n decorators                              |
| `packages/sdk/src/features/integration/**`                                                      | Persistence, autosave, import/export                                 |
| `packages/sdk/src/features/variables/**`                                                        | Variables and condition operators                                    |
| `packages/sdk/src/hooks/{use-workflow-builder-actions,use-fit-view,use-set-selection,theme}.ts` | Imperative actions, fit, selection, theme                            |
| `packages/ui/src/components/node/**`, `edge/**`                                                 | NodePanel, NodeAsPortWrapper, EdgeLabel, edge styles                 |
| `packages/tokens/{config.ts,tokens.json,src/*.ts}`                                              | Token pipeline                                                       |
| `packages/types/src/workflow-execution/*.ts`                                                    | Execution model, events, DTOs, decisions                             |
| `packages/ai-config/src/index.ts`                                                               | AI env contract                                                      |

---

# Part D. Workflow Builder apps, execution engine, starter and deploy (commit 4bbe6512)

Paths are relative to `external/workflowbuilder`. The SDK and UI packages are covered in Part C.

## D.1 Overview and app map

`pnpm-workspace.yaml` includes only `apps/*` and `packages/*`. **`examples/workflow-builder-starter` is outside the workspace** and installs `@workflowbuilder/sdk@2.2.0` from npm.

| Unit                           | Purpose                                                                               | Framework / entry                                        | Consumes                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/demo`                    | UI-only reference editor, port 4200, no backend                                       | React 19 + Vite; `src/main.tsx` → `src/app/app.tsx`      | SDK source through a Vite alias (`vite.config.mts`), `ui`, `@xyflow/react`, zustand; `elkjs` and `libavoid-js` are listed but unused |
| `apps/ai-studio`               | AI workflow product, port 4201; runs graphs on the backend                            | React 19 + Vite; `main.tsx` → `OpenedApp` → `App`        | SDK alias, `ui`, `types`, zustand, mermaid, recharts, react-markdown, `@jsonforms/*`                                                 |
| `apps/backend`                 | REST + SSE, port 3001; Drizzle on Postgres; Temporal client                           | Hono 4 on `@hono/node-server`; `src/server.ts` via `tsx` | `temporal/client`, `execution-core/workflow` (types), `types`, `ai-config`, `temporal-connection`, zod 4, `ai` SDK                   |
| `apps/execution-worker`        | Temporal worker: node executors and a DB store                                        | Node + `tsx`; `src/engines/temporal/worker.ts`           | `@workflowbuilder/temporal` (dist), `@temporalio/worker`, `execution-core`, `ai-config`, `temporal-connection`, `postgres` (raw SQL) |
| `apps/tools`                   | Regenerates `DECISION-LOGS.md` from `*decision-log.md` files                          | tsx                                                      | none                                                                                                                                 |
| `apps/docs`                    | Astro + Starlight docs at `/docs`, TypeDoc over the SDK                               | Astro                                                    | Aliases `@wb/nodes` to the demo node schemas                                                                                         |
| `apps/icons`                   | Lazy icon generator (`@workflow-builder/icons`)                                       | tsx + tsc                                                | Phosphor                                                                                                                             |
| `packages/execution-core`      | Pure topological graph runner, ports, executor registry, template resolver            | `"."` and `"./workflow"` (sandbox-safe)                  | `types`                                                                                                                              |
| `packages/temporal`            | `@workflowbuilder/temporal` 0.2.0: plugin, activities, workflow runner, client engine | tsup; `.`, `./client`, `./workflow`                      | Bundles `execution-core` and `types` through `core-contract.ts`                                                                      |
| `packages/temporal-connection` | Turns `TEMPORAL_*` env into `{connection, namespace}` (TLS, API key)                  | source-only                                              | none                                                                                                                                 |

**Dependency graph.**

- demo → sdk, ui.
- ai-studio → sdk, ui, types; it talks to the backend over HTTP and SSE.
- backend → temporal/client, …; it reaches the worker through Temporal.
- worker → temporal, execution-core, …
- **Backend and worker share Postgres but no code.** The worker uses raw SQL "to avoid coupling worker to backend's Drizzle schema" (`apps/execution-worker/src/database.ts`).

**Stale documentation.** `apps/demo/CLAUDE.md` still describes an `ai-studio/` plugin and a working `flow-runner/` inside the demo. In fact ai-studio was extracted to its own app, and `apps/demo/src/app/plugins/flow-runner/plugin-exports.ts` is an empty `plugin(): void {}`.

## D.2 Routing

### (a) Application routing

**No router library is used** in demo, ai-studio or the starter.

- **demo:** a single page.
- **ai-studio:** routing is query-string based. `openFromUrl(search)` (`apps/ai-studio/src/app/open-from-url.ts`) runs before the first render and returns an `OpenedSource`:
  - `?executionId=`: fetches `GET /api/executions/:id/snapshot`, then `setExecutionStarted(id, streamUrl)`. This is the run view (`{kind:'execution'}`).
  - `?workflowId=`: fetches `GET /api/workflows/:id`; the diagram is `draftJson ?? publishedJson ?? empty`.
  - otherwise: `{kind:'local'}`.
- `OpenedApp` resolves the promise with React 19 `use()` inside Suspense and `AppBoundary`.
- URL sync uses `history.replaceState`. Leaving the run view calls `location.reload()`, because the editor fixes its diagram at mount.
- **docs:** Astro file routing; `/` redirects to `/docs/overview/`.

### (b) Backend API (`apps/backend/src/server.ts`, Hono)

**Middleware order:**

1. `cors`.
2. 1 MB body limit on `/api/*`.
3. Error mapping: `AuthDeniedError` → 401/403; anything else → structured 500.
4. `GET /api/health`, registered before authentication.
5. Auth and tenant middleware on `/api/*`.
6. Optional rate limit on execute and visualize-adapt.
7. Listing guard.
8. The routers.

| Method | Path                                   | Handler                                                                                                             | Auth action         |
| ------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| POST   | `/api/workflows`                       | `routes/workflows.ts`                                                                                               | `workflows:create`  |
| GET    | `/api/workflows`                       | same                                                                                                                | `workflows:list`    |
| GET    | `/api/workflows/:id`                   | same                                                                                                                | `workflows:read`    |
| PATCH  | `/api/workflows/:id/draft`             | same                                                                                                                | `workflows:update`  |
| POST   | `/api/workflows/:id/publish`           | same, validates with `parseSnapshot`                                                                                | `workflows:publish` |
| POST   | `/api/workflows/:id/execute`           | Turnstile guard → insert execution → `mapToExecutionModel` → `engine.submit` → 202 `{executionId,status,streamUrl}` | `workflows:execute` |
| GET    | `/api/executions`                      | cursor pagination (default 50, max 200)                                                                             | `executions:list`   |
| GET    | `/api/executions/:id`, `/:id/snapshot` | `routes/executions.ts`                                                                                              | `executions:read`   |
| GET    | `/api/executions/:id/stream`           | SSE (`streamSSE`)                                                                                                   | `executions:stream` |
| DELETE | `/api/executions/:id`                  | guarded `status='cancelling'`, then `engine.cancel`                                                                 | `executions:cancel` |
| POST   | `/api/executions/:id/decision`         | `routes/decision.ts`                                                                                                | `executions:decide` |
| POST   | `/api/visualize/adapt`                 | LLM reshape into diagram/chart/table/json/stat-cards/markdown/text                                                  | `workflows:execute` |

**Ports and guards.**

- `AuthPort { identify, authorize }`. The default `AllowAllAuthPort` refuses to boot unless `WB_AUTH_PORT=allow-all`.
- `TenantContextPort`, with a no-op default. The tenant id is written to executions, and a stream for another tenant returns 404.
- Listing returns 403 under allow-all unless `ENABLE_WB_LISTING=true`.
- Cloudflare Turnstile guards execution when `TURNSTILE_SECRET_KEY` is set.
- **There is no tRPC and no WebSocket; live progress is SSE only.**

### (c) Execution-time routing (`packages/execution-core/src/graph-runner.ts`)

```ts
export async function runGraph<TNode extends BaseNode>(
  input: WorkflowExecutionInput<TNode>,
  runner: ActivityRunnerPort<TNode>,
  rawEvents: EventEmitterPort,
): Promise<RunGraphOutcome>;
```

**Setup.**

- Adjacency and in-degrees are built from `definition.edges` (`sourceNodeId`, `targetNodeId`, `sourceHandle`).
- `resolveStartNode` requires exactly one `role:'start'` node, no edges into it, and no other node with in-degree 0 ("orphaned nodes"). A violation fails the execution.

**Scheduling: topological waves.**

- Each wave runs `Promise.all(ready.map(runNode))` against a snapshot of `nodeOutputs`, so parallel branches run concurrently within a wave.
- **Join:** a node becomes ready only when all incoming edges have resolved and at least one is live (`liveIncoming > 0`).
  - If every incoming edge resolved and none is live, the node is skipped.
  - Skips propagate breadth-first, so a dead branch never stalls a downstream join.

**Branch selection (`isEdgeLive`).**

- An executor returns `nextPort`. A normal edge fires when `!nextPort || sourceHandle === nextPort`.
- The reserved handle `RESERVED_ERROR_HANDLE = 'errorRoute'` fires only when the node failed under policy `errorRoute`.
- Skip reasons: `branch_not_taken`, `error_route_not_taken`, `upstream_skipped`.

**Error policy** (`'fail' | 'continue' | 'errorRoute'`, default `fail`).

- `fail` aborts the run once the wave's skips are emitted.
- `continue` and `errorRoute` write `{error:{message, code}}` into the node's outputs.

**Dead ends and outcomes.**

- If a node chooses a port with no live edge, a `DeadEnd` is recorded and the run ends `incomplete`.
- An `outcome: {value, resolvedBy}` excuses the dead end and is written on `execution_completed`.

**Loops.** There is no loop construct. A cycle leaves nodes pending, and the run fails with "Workflow stalled: nodes never became ready".

**Human-in-the-loop.**

- An executor may return `{ waiting: true }`.
- `parkUntilResolved` then calls `runner.awaitResolution(nodeId)` and emits `node_waiting`.
- A parked-node counter drives the advisory `waiting`/`running` status.
- An adapter without `awaitResolution` makes the node fail with `waiting_unsupported`.

**Retries** are not handled by the runner; the engine adapter handles them (D.4). `extractDeepestError` walks the `cause` chain (depth ≤ 16) and reads the `NodeErrorEnvelope` `{wbNodeError:1, classification, code, attempt}`.

**Branching executors in the worker.**

- **`executeDecision`** (`apps/execution-worker/src/executors/decision.ts`):
  - Takes the first matching branch and returns `{output:{matchedBranch}, nextPort: branch.sourceHandle}`.
  - Conditions `{x, y, comparisonOperator, logicalOperator?}` are template-resolved, then folded left with AND/OR.
  - Operators: `isEqual`, `isNotEqual`, `isContaining`, `isNotContaining`, `isBefore`, `isAfter`, `isGreaterThan`, `isLessThan`, `isGreaterThanOrEqual`, `isLessThanOrEqual`.
  - No match throws `PermanentNodeExecutionError('no_branch_matched')`.
- **`executeHumanDecision`:**
  - Returns `{waiting:true}`.
  - The backend's `toNodeResolution` later supplies `nextPort: action.port`, and for `reject` also `outcome: {value:'rejected', resolvedBy}`.

The `branch_spawned` and `branches_joined` event types are declared but never emitted (`packages/execution-core/topological-scheduling.decision-log.md`).

## D.3 Schemas

**Database (`apps/backend/src/db/schema.ts`; migrations `drizzle/0000…0002`, applied at boot).**

- **`workflows`:** `id`, `name`, `draft_json`, `published_json`, `published_at`, timestamps.
- **`executions`:** `id`, `workflow_id`, `source_version` (`draft|published`), `workflow_snapshot_json`, `status` (default `pending`), `trigger_payload_json`, `tenant_id`, `started_at`, `finished_at`, `error_message`, `outcome`, `resolved_by`. Indexed on workflow, status and tenant.
- **`execution_events`:** `id`, `execution_id`, `sequence`, `timestamp`, `type`, `node_id`, `path_id`, `payload_json`, `tenant_id`.
  - A unique index on `(execution_id, sequence)` makes activity retries idempotent: the worker inserts with `ON CONFLICT DO NOTHING`.

**API payloads (zod 4).**

- `createWorkflowSchema`, `updateDraftSchema`, and `executeSchema` (`{sourceVersion, triggerPayload?}`). Drafts are stored without validation.
- **`workflowSnapshotSchema`** (`domain/mapper/snapshot-schema.ts`):
  - Shape: `{nodes:[{id, data:{type, isStartNode?, properties?}}], edges:[{id, source, target, sourceHandle?}]}`.
  - `superRefine` forbids `errorPolicy:'continue'` on decision nodes and resolves the proposal source.
  - Wrapped by `rejectingOwnProtoKey`.
  - Shared by publish and execute.
- **`decisionRequestSchema`:**
  - `version: 1`.
  - `actions` is a discriminated union on `effect`: `resume`+`port`, `reject`+`port`+`reasonRequired`, `rerun-source`+`maxIterations`.
  - Also a form JSON Schema and UI schema, `proposalSourceNodeId?`, and `deadline?`.
  - Rules: exactly one resume action, unique action names, the reject port differs from the resume port, and no port may be `errorRoute`.
  - **The deadline is validated but never enforced.**
- **Decision POST:** `{nodeId, attempt, action, edits?, reason?}`. Refusals include `decision_attempt_mismatch` (409), `effect_not_supported` (501) and `decision_delivery_timeout` (503 with `Retry-After`).

**Execution definition.**

- `mapToExecutionModel` turns the editor snapshot into `WorkflowDefinition<BaseNode>`.
  - It lifts `label`, `errorPolicy` and `decisionRequest` out of `data.properties` and maps `isStartNode` to `role:'start'`.
  - Everything else becomes `config`.
- The worker narrows `config` per node type in `AiStudioNode`: `ai-studio/trigger`, `ai-studio/ai-agent` (`{systemPrompt, webSearch?, outputSchema?}`), `ai-studio/decision`, `ai-studio/visualize`, `ai-studio/human-decision`.

**Run state.**

- `ExecutionStatus = pending|running|waiting|cancelling|completed|incomplete|failed|cancelled`.
- Events: `execution_started`, `node_started`, `node_waiting`, `node_completed`, `node_failed`, `node_skipped`, plus the terminal events.
- `ExecutionSnapshot = {executionId, status, lastSequence, events}`.
- `reconstructNodeInputs(events, nodeId)` rebuilds a step's inputs from history.

**Template variables (`resolveTemplate`).**

- Syntax: `{{ns.path}}` (strict), `{{ns.path?}}` (empty when missing) and `{{ns.path | default:'x'}}`.
- Namespaces: `nodes`, `trigger`, `variables`, `global`.
- Failures throw permanent errors.
- Every emitted payload is redacted by `SENSITIVE_KEY_RULES`.

**AI configuration.**

- Only the server knows the model (`AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL`).
- The frontend contributes node JSON Schemas and output-schema presets.
- There is one tool: Tavily web search, at most 4 tool steps, with `toolChoice:'none'` on the last step.

## D.4 Steppers and execution

**Engine port and its Temporal adapter.**

- `WorkflowEnginePort { submit, cancel, resolveNode }`.
- **`TemporalWorkflowEngine`:**
  - `submit` starts one Temporal workflow per execution, with id `execution-<id>`.
  - `cancel` calls `handle.cancel()`.
  - `resolveNode` calls `executeUpdate(RESOLVE_NODE_UPDATE_NAME)` under a 10 s deadline.
- The backend opens the Temporal connection lazily, on the first submit.

**Workflow side (V8 sandbox, `packages/temporal/src/workflow/run-workflow.ts`).**

- **Human verdicts:** the `resolveNodeUpdate` **Update** (not a Signal) is validated by `validateVerdict` (shape, known node, waiting state, no double delivery).
- **`ActivityRunnerPort`:**
  - `executeNode` uses `proxyActivities` with per-node-type timeout and retry profiles, and an activity summary taken from the node label.
  - `awaitResolution` uses `condition(() => resolved)`.
- **Event ordering:** `createSequencedEventEmitter` assigns dense sequence numbers and serialises writes, so events commit in order.
- **Termination:**
  - Cancellation runs in a non-cancellable scope that emits `execution_cancelled`.
  - `failed` becomes a non-retryable `ApplicationFailure`.
  - `incomplete` closes the workflow as Completed.

| Profile                             | Timeout | Max attempts |
| ----------------------------------- | ------- | ------------ |
| `DEFAULT_NODE_ACTIVITY_PROFILE`     | `10m`   | 2            |
| `DEFAULT_DATABASE_ACTIVITY_PROFILE` | `30s`   | 5            |

**Activities (worker side).**

- `createActivities({executors, store})` provides `executeNode`, `emitEvent` and `updateStatus`.
- `executeNode` resolves the executor through the registry (`Object.hasOwn`).
- Classified errors map to `ApplicationFailure`, with `nonRetryable` when permanent.
- `WorkflowBuilderPlugin` registers the activities on task queue `workflow-execution`.
- `ExecutionStore` port: `emitExecutionEvent`, `updateExecutionStatus`.

**Worker (`apps/execution-worker/src/engines/temporal/worker.ts`).**

- Registers the five AI Studio executors through `new WorkflowBuilderPlugin<AiStudioNode>({executors, store})`.
- Connects with `NativeConnection.connect(temporalConfig().connection)` and calls `Worker.create(...)`.
- **Database (`database.ts`):**
  - Inserts events with `ON CONFLICT DO NOTHING`, then `pg_notify('execution_events', id)`.
  - Status updates never overwrite a terminal status; the first `running` stamps `started_at`.
- **AI agent:**
  - `generateText` with `maxRetries: 0`; Temporal retries instead.
  - Structured output via `Output.object` when an output schema is set.
  - Provider errors are classified transient (408/429/5xx) or permanent.

**Progress reporting (SSE).** The path is: worker insert → `pg_notify` → one backend `LISTEN` connection (`events/execution-event-bus.ts`) → the SSE route.

1. The route first sends an `execution_snapshot`, catching up from sequence 0.
2. A serialized drainer coalesces notify bursts and stops on a terminal event.
3. A 15 s heartbeat keeps the stream alive; `X-Accel-Buffering: no` disables proxy buffering.

There is no polling and no WebSocket.

**Visualisation in ai-studio.**

- `connectExecutionStream` (an `EventSource`, up to 5 retries) feeds `applySnapshot` and `applyEvent` in `use-execution-store.ts`.
  - State: `nodeStates[nodeId] = {status: idle|running|waiting|completed|failed|skipped, output?, error?}`.
  - The run-level `waiting`/`running` status is derived from node states.
- **Highlighting:** `ExecutionHighlighting` injects a `<style>` that colours nodes by status and highlights an edge when both its endpoints are non-idle.
- **Node markers:** `ExecutionNodeMarkers` uses the `OptionalNodeContent` decorator to show spinner, flag, warning or skip icons.
- **Step log:** `ExecutionLogPanel` lists events with skip reasons, outputs, errors, dead ends and outcomes, and scrolls to the selected node.
- **Human decision:**
  - A snackbar and footer prompt the user.
  - A JSON Forms decision form posts `{nodeId, attempt, action, edits?, reason?}`.
  - `attempt` is the number of `node_waiting` events for that node. The backend counts the same way.

**Stepper or wizard UI: none** in demo, ai-studio or the starter.

## D.5 State

- **ai-studio:**
  - `useExecutionStore`: zustand with `devtools` and `persist`. Only `isLogCollapsed` persists, to sessionStorage. It also holds decision drafts and sends keyed `executionId:nodeId:attempt`.
  - A notices store.
  - An undo/redo store holding `past`/`future` snapshots of `{nodes, edges, layoutDirection}`.
  - SDK store access through `useStore` and its getters.
  - Plain `fetch`, with no react-query or SWR.
- **Persistence per opened source** (`app/root-props.ts`):

| Source    | `integration`                                     | Behaviour                                                                                                                     |
| --------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| local     | SDK default                                       | localStorage `workflowBuilderDiagram`                                                                                         |
| workflow  | `{strategy:'props', onDataSave: saveDraftOf(id)}` | Backend draft. `PATCH` uses `keepalive` under 64 KiB, skips unchanged autosaves, and `haltSaves()` stops saving after a crash |
| execution | `RUN_VIEW_INTEGRATION` (`neverSaves`)             | Save, autosave and save-on-close are hidden                                                                                   |

- **Run start** (`useBackendExecution` → `executeFromCanvas`):
  1. Create the workflow or patch its draft.
  2. Fetch a Turnstile token.
  3. `POST …/execute` with `{sourceVersion:'draft', triggerPayload:{input}}`.
  4. Mark the run started, sync the URL, and open the stream.
  - Cancel sends `DELETE`.
  - The canvas is read-only whenever an `executionId` exists.
- **demo and starter:** SDK defaults (localStorage). The demo also has an undo-redo store.

## D.6 Composition

- **demo** (`apps/demo/src/app/app.tsx`):
  - `<WorkflowBuilder.Root>` props:
    - 8 palette items in the 4-file node pattern (`data/nodes/<n>/`).
    - A `multi-port` node template with four handles via `getHandleId`.
    - A `dashed` edge built on `EnhancedBaseEdge`.
    - 4 diagram templates.
    - `isValidConnection`, where start nodes are never targets.
    - `reactFlowProps={{zoomOnDoubleClick:false}}`.
    - 12 plugins.
  - Only 3 of the 12 plugins are real: copy-paste, undo-redo (`trackFutureChange` decorator, toolbar, translations) and help (watermark).
  - The other 9 are placeholders, among them elk-layout, avoid-nodes-edges, reshapable-edges, validation, flow-runner and download-pdf. A missing plugin folder resolves to a stub (`file-fallback-for-missing-plugins.ts`).
- **ai-studio** (`apps/ai-studio/src/app/app.tsx`):
  - `<WorkflowBuilder.Root>` props:
    - logo and `layoutDirection`;
    - `initialNodes`/`initialEdges` from the opened source;
    - one palette group;
    - a `human-decision` node template that renders one source handle per decision action port, so ports equal edge `sourceHandle`s;
    - custom JSON Forms renderers (DecisionForm, ResponseSelect, DecisionFields);
    - 6 diagram templates.
  - Children: `DefaultLayout` plus the execution overlays.
  - Plugins:
    - node-content decorators for markers and the Visualize card;
    - a `PropertiesBar` `modifyProps` that removes delete;
    - a run-view plugin that hides Save;
    - undo-redo.
- **Starter** (`examples/workflow-builder-starter/src/app.tsx`), the minimal integration:
  - `<WorkflowBuilder.Root name nodeTypes initialNodes initialEdges isValidConnection/>` plus the CSS import.
  - Three nodes (trigger, action, condition) in the 4-file pattern, with a module-level stable `nodeTypes` array.
  - No plugins, templates or backend.

## D.7 Layout

- **App shell:** `<WorkflowBuilder.DefaultLayout/>`, with absolutely positioned app overlays.
- **Panel anchoring:** `useRightPanelAnchor` measures the DOM next to `#viewport-bounds` with a ResizeObserver to offset the log panel. It exists because "the SDK does not expose the properties panel's expanded state".
- **Graph auto-layout: none is invoked by any app.**
  - The demo's elk-layout and avoid-nodes-edges plugins are empty placeholders; their READMEs point to paid overflow.dev plugins.
  - ai-studio only passes `layoutDirection`, and its undo store snapshots it.
  - Templates carry explicit positions.

## D.8 Rendering

- **Visualize node:**
  - `VisualizeCard` reads the first upstream node's output from the execution store.
  - It picks a renderer: markdown, text, json, table, stat-cards, a chart (recharts) or a diagram (mermaid).
  - `useAdaptedVisualization` can reshape the text through `/api/visualize/adapt`.
  - Actions: expand, copy, PNG download.
- **Human-decision node:**
  - Shows action labels with source handles and a "Waiting for decision / Decide" footer.
  - The properties panel shows an editable `DecisionForm`, pre-filled from the source node's structured output, or a read-only `DecisionRecord` once decided.
- **Run view:** the snapshot renders read-only, named `Run <id8>`.
- **AI chat panel:** none. AI happens at node level, plus the adapt endpoint.

## D.9 Runtime topology

**Local** (`apps/backend/docker-compose.yml`, all bound to 127.0.0.1):

- `app-db`: Postgres on 5432.
- `temporal-db`: Postgres on 5433.
- `temporal`: on 7233.
- `temporal-ui`: on 8233.

The backend, worker and ai-studio run on the host under `concurrently`.

**Production** (`deploy/ai-studio/`):

- **Multi-stage Dockerfile:** build the temporal package; install production deps for backend and worker (run with `tsx`); build the frontend; serve it with nginx 1.31-alpine.
- **`docker-compose.yml`:** `app-db`, `backend` (`allow-all` auth, rate limits 10/min and 50/day by default), `worker`, `web` on 8080.
- **`docker-compose.override.yml`:** adds a bundled Temporal (`auto-setup:1.29.6.1`, ui 2.51.0).
- **`nginx/default.conf`:** turns off proxy buffering for `/api/executions/*/stream`, with a 1 h read timeout and no gzip.

**Constraints.**

- The migrator assumes a single backend replica.
- SSE fan-out uses one `LISTEN` connection per backend process.
- `apps/demo/Dockerfile` copies `./tools/deployment/nginx/*`, and that directory does not exist (verified).

## D.10 Key file index

| Path                                                                                                                                  | Responsibility                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `packages/execution-core/src/graph-runner.ts`                                                                                         | Waves, joins, skip propagation, `isEdgeLive`, error policies, dead ends, parking |
| `packages/execution-core/src/resolve-start-node.ts`                                                                                   | Single-start, no-orphan validation                                               |
| `packages/execution-core/src/{ports,registry,errors.ts,templates,reconstruct-node-inputs.ts,redact.ts}`                               | Ports, executor registry, error classes, templates, history, redaction           |
| `packages/temporal/src/workflow/{run-workflow,sequenced-event-emitter,activity-profiles,node-activity-options,verdict-validation}.ts` | Durable workflow runner                                                          |
| `packages/temporal/src/{activities,plugin,store,constants}.ts`, `client/index.ts`                                                     | Activities, plugin, store port, engine client                                    |
| `apps/execution-worker/src/{engines/temporal/worker.ts,executors/*,activities/*,database.ts}`                                         | Worker, executors, LLM call, raw-SQL store                                       |
| `apps/backend/src/{server.ts,routes/*,db/*,domain/*,events/*,auth/*,tenant/*,security/*,middleware/*}`                                | API, schema, mapping, SSE, ports, guards                                         |
| `apps/ai-studio/src/app/{app.tsx,root-props.ts,open-from-url.ts}`                                                                     | Composition and query-string routing                                             |
| `apps/ai-studio/src/{stores,hooks,adapters,components/execution,components/human-decision,components/visualize}`                      | Run state, SSE, highlighting, log, decisions, visualisation                      |
| `apps/demo/src/app/{app.tsx,data/*,plugins/*}`                                                                                        | Demo composition, reference nodes, plugins                                       |
| `examples/workflow-builder-starter/src/*`                                                                                             | Minimal integration                                                              |
| `deploy/ai-studio/*`, `apps/backend/docker-compose.yml`                                                                               | Topology                                                                         |
