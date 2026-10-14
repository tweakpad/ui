# Flow

`tp-flow` edits and monitors a node graph: nodes with typed ports on a pannable, zoomable canvas,
edges routed between them, a schema that describes the node library and the control each property
shows, optional execution state on nodes and edges, design and view modes, automatic layout and
visible-only rendering for thousands of nodes. Nodes are built from the library's own components
(Card, List item, Badge, Marker, Slider, Select, Switch, Color picker and so on) and any library
control can be composed inside a node. The value is the flow document; the engine behind it,
`@tweakpad/ui/flow`, is DOM-free and owns the document, its indices, the history, the routing, the
layout and the run state.

```html
<script type="module">
  import '@tweakpad/ui/styles.css';
  import '@tweakpad/ui/register';
  import '@tweakpad/ui/register/widgets';
  import { zapIcon } from '@tweakpad/ui/icons/zap.js';
  import { mailIcon } from '@tweakpad/ui/icons/mail.js';

  const flow = document.querySelector('tp-flow');
  flow.schema = {
    nodes: [
      {
        type: 'trigger',
        label: 'Trigger',
        icon: 'zap',
        ports: [{ id: 'out', direction: 'output' }],
      },
      {
        type: 'notify',
        label: 'Notify',
        icon: 'mail',
        ports: [{ id: 'in', direction: 'input' }],
        properties: [{ key: 'channel', label: 'Channel', control: 'text' }],
      },
    ],
  };
  flow.icons = { zap: zapIcon, mail: mailIcon };
  flow.load({
    version: 1,
    nodes: [
      { id: 'a', type: 'trigger', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'notify', position: { x: 320, y: 0 }, data: { channel: '#ops' } },
    ],
    edges: [{ id: 'ab', source: 'a', sourcePort: 'out', target: 'b', targetPort: 'in' }],
  });
</script>
<tp-flow label="Pipeline" name="pipeline" fit-view></tp-flow>
```

`@tweakpad/ui/widgets` exports the classes and types (`TpFlow`, `TpFlowNode`, `TpFlowEdge`,
`TpFlowPort`, `svgRenderer`, `defaultPropertyControls`, `flowStrings`, `flowMotionRoles`) and
re-exports the engine;
`@tweakpad/ui/flow` exports the engine alone (`FlowModel`, `layoutFlow`, `createRoutingPlanner`,
`FlowRunState`, `FlowRunPlayer`, `parseFlowDocument`, `serializeFlowDocument`, the viewport and
geometry helpers and the `FlowRenderer` contract) for workers and servers. Icons are keys of the
`icons` record the schema's definitions name, resolved to library icon definitions.

Supply `value` for a controlled widget or `defaultValue` for an uncontrolled one; the mode stays
fixed for the element's lifetime. The same rule applies to the `viewport`, `selection`, `tool`,
`mode`, `inspectorOpen` and `paletteOpen` lanes. `load()` and `setValue()` replace the document programmatically
on either kind of instance.

## Value and the document

The value is a `FlowDocument`: `{ version: 1, nodes, edges, viewport?, layout?, metadata? }`.
Nodes carry `id`, `type` (a definition of the schema), `position` (relative to the parent when
`parentId` is set), the persisted `size`, `data` (the property values), `parentId`, `extent`
(`'parent'` or a rectangle), `zIndex`, `hidden`, `label`, `pinned`, per-instance `ports` overrides
and the flags `draggable`, `selectable`, `connectable`, `deletable` and `resizable`. Edges carry
`id`, `source`, `sourcePort`, `target`, `targetPort`, `kind`, `options`, `waypoints`, `label` or
`labels`, `markerStart`, `markerEnd`, `animated`, `data`, `hidden`, `selectable`, `deletable`,
`reconnectable` (`true`, `'source'` or `'target'`) and `zIndex`. `layout` holds the direction the
graph was laid out in (`none`, `horizontal`, `vertical`, `smart`) with its spacing settings; the
direction decides the derived port sides and the default of `layout()`. Parents precede their
children in `nodes`.

The attribute takes the document as JSON (`default-value='{"version":1,…}'`). A `value` supplied
before the element connects (the attribute, or the property on an element created in script) makes
the lane controlled, `defaultValue` seeds an uncontrolled instance, and `load(document)` or
`setValue(document, reason)` replace the document programmatically on both; the mode is fixed when
the element connects and a later switch is refused with a `flow-state` diagnostic. Text that is not a flow document
loads the empty document and reports a `tp-diagnostic` with the code `flow-state`. `toJSON()`
returns the canonical document: runtime state (measurements, routes, selection) stripped, parents
before children, the current viewport included unless `{ viewport: false }`, selection flags kept
with `{ selection: true }`. `parseFlowDocument` also accepts a document without `version` whose
edges name their ports with `sourceHandle`/`targetHandle` and their kind with `type`, and whose
nodes use `parentNode` and `width`/`height`/`measured`; it converts such a document to version 1.

Every change is a cancelable `tp-value-change` proposal carrying the next document and
`metadata.changes`, the fine-grained `FlowChange` list (`node-add`, `node-remove`, `node-replace`,
`node-update`, `node-position`, `node-size`, `node-data`, `node-select`, `edge-add`, `edge-remove`,
`edge-replace`, `edge-update`, `edge-waypoints`, `edge-select`, `viewport`, `layout-settings`).
A controlled owner
writes the accepted document back to `value` synchronously and the widget adopts it by identity; an
owner that publishes later keeps the proposed geometry on screen as a transient overlay until it
does, and the interaction commits once it has; an owner that never writes the accepted proposals
back sees them rolled back 120 ms after the interaction settles, without a commit or a history
entry; an owner that cancels a proposal in the middle of a drag leaves the node at its last accepted
position without ending the gesture, and a cancelled release emits no commit. `tp-value-commit`
follows once per settled interaction (a drag release, a connection, a key, a field commit), and one
history entry records it. `onValueChange` and `onValueCommitted` are the callback forms.

## Schema

`schema` is a `FlowSchema`: `{ nodes, categories?, dataTypes?, edgeKinds?, rules? }`.

- A node definition (`FlowNodeDefinition`) names its `type`, `label`, `description`, `icon` (a
  key of `icons`), `tone` (`chart-1` to `chart-5`, `success`, `warning`, `destructive` or
  `primary`), `category` (its group in the node library), `shape` (`card` by default, `compact`, `panel` or
  `group`), its `ports`, its `properties`, a `size` hint before measurement with `minSize` and
  `maxSize`, `resizable` and an optional `validate(node, context)` returning issues.
- `categories` (`FlowCategoryDefinition[]`) orders and names the groups of the node library:
  `{ id, label?, tone?, open? }` matches the `category` of definitions, `tone` colors the group's
  heading and `open: false` starts its sidebar section collapsed. Groups follow this order, then
  the first use of other categories (named by their id); definitions without a category gather
  under `strings.uncategorized` ("Other"), and groups without definitions are left out.
- A port definition (`FlowPortDefinition`) has an `id`, a `label`, a `direction` (`input` or
  `output`), a `dataType`, a `side` (derived from the layout direction when absent: inputs on the
  left and outputs on the right of a horizontal graph, top and bottom of a vertical one),
  `multiple` (inputs accept one connection by default, outputs many), `required`, `control` (a
  property key rendered inline on the port's row of a panel node) and `hidden`.
- A data type (`FlowDataTypeDefinition`) has an `id`, a `label`, a `tone` that paints its ports and
  `accepts`, the ids an input of this type takes; without it an input takes its own type and
  `any`, and a port without a data type connects to anything. Types without a tone take the chart
  tones in turn.
- `rules` sets `connectionMode` (`strict` connects outputs to inputs only, `loose` any pair but the
  same port), `cycles` (`allow` or `forbid`), `selfLoops`, `duplicateEdges`, `defaultEdgeKind`
  (`smoothstep`) and `typeCompatibility(from, to, schema)` for compatibility beyond `accepts`.
- `edgeKinds` holds per-kind option defaults: `curvature` (0.25), `borderRadius` (5 for smoothstep,
  8 for orthogonal, 0 for step), `offset` (20), `stepPosition` (0.5) and `stub` (24).

A property definition (`FlowPropertyDefinition`) names the `key` of the node data it edits, its
`label`, the `control` (`number`, `slider`, `text`, `textarea`, `select`, `switch`, `checkbox`,
`color`, `easing` or `custom`), a `description`, a `placeholder`, `min`, `max`, `step`, the
`options` of a select, a `default`, `visibleWhen` (a condition `{ key, equals, in, truthy }` or a
predicate over the data), `port`, the input port whose connection overrides the property, and
`placement`: `node` renders the control in the node body, `inspector` only in the inspector, never
both. Without it a property goes where its shape can show it
(`DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE`): card and panel bodies hold their properties, compact and
group nodes keep theirs in the inspector. Put the settings a reader scans on the node and the
secondary ones in the inspector; a node whose definition places nothing there has no inspector. The
built-in controls are library components: `slider` is a Slider, `number` an Input with the
NumberField behavior (`min`, `max` and `step` form its validity grid), `text` an Input, `textarea`
a Text area, `select` a Select, `switch` a Switch, `checkbox` a Checkbox, `color` a Color picker
and `easing` an Easing editor. `propertyControls` replaces any of them (and must supply `custom`):
a factory `(context) => TemplateResult` receives
`{ node, definition, value, disabled, readOnly, propose, commit, port, id }` and renders a control
that proposes through `propose(value, reason)`
and settles with `commit(reason)`. A node whose type has no definition renders as a card with the
shape's default size and no ports.

## Nodes

Shapes come from the definition: `card` composes a Card with an icon tile, the title, the
description and a status footer (the workflow monitor); `compact` is an icon tile with a caption
(pipelines); `panel` is a Card with a toned header and List item rows of label and control, each
row's port aligned with it (material and shader graphs); `group` is a dashed, resizable container
with a label whose children are positioned relative to it. Before measurement a node takes its
definition's `size`, else the shape default: card 240 × 96, compact 96 × 68, panel 220 × 160, group
320 × 240. Measurement follows the rendered box and the port positions; a persisted `size` comes
from a resize or a declaration.

`nodeTemplates` replaces the body per type: a template `(context) => TemplateResult` receives
`{ node, definition, selected, dragging, lod, status, ports(side), control(key) }` and renders what
it likes, calling `ports('left')` for the port elements of a side and `control('retries')` for the
library control bound to a property. The host keeps the group role, the focus, the drag grip, the
ports and the resizer.

Nodes and edges can also be authored as light-DOM children.
`<tp-flow-node id type x y width height parent label pinned hidden data draggable selectable connectable deletable resizable>`
and
`<tp-flow-edge id source target source-port target-port kind label animated waypoints data marker-start marker-end hidden>`
are adopted into the document by `id` (`data` is JSON, `waypoints`
is `x,y x,y …`), attribute changes update the model, and the authored node element stays the
rendered host while the node is visible (it is unassigned, not removed, off-screen). A gesture
writes back only the owned `x`, `y`, `width` and `height` attributes. An authored id that clashes
with a document node reports `tp-diagnostic` `flow-adoption-conflict`. Authored content renders in
the node body; a library control carrying `data-flow-property="key"` is adopted as the control of
that data key (its lane events stop at the node and become `node-data` proposals), other content
keeps its own events, and a press on an interactive element or inside `[data-no-drag]` never starts
a drag.

Groups are nodes whose definition has `shape: 'group'`; membership is `parentId`, positions are
parent-relative, `extent: 'parent'` keeps a child inside, a dragged child near the border expands
the parent, deleting a group deletes its descendants and the dependent edges, and a child paints
above its parent with the selection elevated.

A press on a node selects it (Shift adds, Command or Control toggles) and a drag moves every
selected draggable node by the same delta, keeping the press offset, snapping to `snapGrid` when
`snap` is on, clamped by the parent extent, auto-panning near the pane edge; the drag proposes
once per frame and commits once on release. Escape restores the pre-drag positions
(`escape-key`), a cancelled pointer restores them (`pointer`), and a lost capture settles at the
last position. A selected resizable node shows the resizer: four focusable corner handles, the
definition's `minSize` and `maxSize`, Shift keeping the aspect ratio, arrows resizing by a grid
step and Escape restoring; the result is a `node-size` change. `pinned` keeps a node in place
during automatic layout (the node toolbar and the context menu pin and unpin).

Only the nodes and edges inside the viewport plus an overscan margin have DOM: `virtualize`
(default) pools `tp-flow-node` hosts and rebinds them as the view moves, unmeasured nodes are
materialized until measured, the focused node stays materialized, and `visibleNodeIds` and
`visibleEdgeIds` list the current set; `virtualize="false"` renders everything. Below `detailZoom`
(0.3) nodes render at low detail (`lod`, `data-lod="low"`) without changing their box, so zooming
out never reflows the graph.

## Ports and connections

A port is a `tp-flow-port`: a native button named "Node: Port input" or "… output", painted with
its data type's tone, with `show-port-labels` showing the label text beside it and a hit area that
grows on coarse pointers. A press on a port starts a connection: the connection line follows the
pointer, the nearest valid port within `connectionRadius` (20 px) becomes the candidate (a node
with exactly one compatible port acts as a drop target as a whole), the candidate port shows
`data-valid` or `data-invalid`, and the release connects. Validation runs in this order: both
nodes exist and are connectable, the ports exist and are visible, `connectionMode` (`strict`
reorients an input-to-output drag, `loose` accepts any pair but the same port), `rules.selfLoops`,
`rules.duplicateEdges`, occupancy (`multiple`), data types (`accepts`, `any`,
`typeCompatibility`), `rules.cycles` and finally `isValidConnection(connection, context)`, which
returns `true`, `false` or a message. A release then dispatches the cancelable `tp-connect` with
`{ connection, edge, reason, sourceEvent }` (a handler may change `detail.edge`, for instance its
`kind` or `label`), proposes the `edge-add` with the reason `connect` and commits. Releasing on the
empty pane with a node library (`palette`) opens it at the drop point so a node can be inserted
and connected at once.

With `connectOnClick` (default) a click on a port starts a connection (`aria-pressed`) and a click
on another port completes it. From the keyboard, Enter on a focused port starts a connection,
arrows and Tab cycle the valid candidates (each announced), Enter confirms and Escape cancels. A
selected edge has a reconnect anchor at each end `reconnectable` allows: an invisible
grab area on the edge just beyond the socket (a move cursor), so the socket itself keeps starting
new connections. Dragging an anchor re-targets the edge after the same validation
(`metadata.reconnect: { edgeId, end }`); the old edge hides while dragging and comes back when the
drop lands nowhere. A focused anchor shows its ring, and Enter or Space on it starts a keyboard
reconnect: the arrows cycle the valid sockets (each announced), Enter or Space confirms and
Escape cancels. `connect(connection, edge?)` and
`reconnect(edgeId, end, connection)` do the same from code; `getNodeConnections(id)` lists a node's
edges.

## Edges

The edge `kind` is `bezier`, `straight`, `step`, `smoothstep` (default) or `orthogonal`, with
per-edge `options` merged over the schema's `edgeKinds`. `markerStart` and `markerEnd` take
`arrow`, `arrowclosed`, `circle`, `diamond` or a definition
`{ type, width, height, color, strokeWidth, orient, units }`; markers are defined once per flow
and paint with the edge's stroke.
`animated` edges flow their dash toward the target; an animated or active edge without its own
`markerEnd` gets a closed arrow, so the direction stays visible when the dash pauses under reduced
motion. `label` is a shorthand for `labels: [{ text }]`; each label sits at
`position` (0–1 along the path, 0.5 by default) with `align` and `placement` (`on`, `above`,
`below`) and renders as an outline Badge pill. With a node library (`palette`), every label carries a "+"
Button that opens it for an insertion on that edge. `edgeTemplates`, keyed by edge id or
kind, replaces the label content with a template `(context) => TemplateResult` over
`{ edge, kind, selected, label }`.

Each edge has a 20 px invisible hit path: a click selects it, hovering marks it, a double press on
a segment adds a waypoint there (`track-press`), and `waypoints` are must-pass points the path
visits in order: a `straight` edge becomes a polyline through them, `step` and `smoothstep` an
axis-aligned path with their corners that leaves and enters along the port sides, a `bezier` a
smooth curve, and routed edges route through them (`edgePathThrough` in the engine). A selected
edge shows its waypoint handles (focusable; arrows nudge, Delete
removes) and, on a routed (orthogonal) path, a handle on each interior segment that moves the
segment along its normal while the rest re-routes (the segments at the sockets stay put); both
produce `edge-waypoints` changes. The handles sit above the paths, sockets and labels, and a press
released without moving only selects a handle: the selected handle (the one a press or the
keyboard last focused) wears the active ring and is what Delete and the arrows act on. Delete
removes a selected waypoint and selects the next one (else the previous one); with none left,
focus returns to the selected edge. Edges take focus through hidden proxies
(`E` cycles the focused node's edges, `focusEdge(id)` from code) and Delete removes the focused or
selected edges.

## Routing

`router` selects the routing policy: `auto` (default) routes the `orthogonal` kind through the
obstacle-aware router and draws the other kinds directly, `orthogonal` routes every edge,
`none` draws every kind directly, and a `FlowRouter` instance
(`{ route(request), nudge?(routes, context) }`) replaces the built-in router. The orthogonal
router treats the padded node boxes as
obstacles (groups excluded), leaves each port through a fixed stub, searches a visibility grid with
costs for length, bends, hugging an obstacle, crossing and overlapping already routed edges, honors
waypoints as legs, draws self-loops as a fixed loop and falls back to a smoothstep path (flagged
`fallback`) when the region cannot be grown further. A stub facing a node closer than two stubs
takes half the gap, so the facing node's stub never shares its line; an overlap with an already
routed edge is priced by its length, so a long shared run costs more than a short detour.
Nudging then spreads colinear overlapping segments apart by the edge spacing within their
corridor, keeping the stubs fixed; a run that lies a pixel or two from another edge's run steps
aside, by at most two lanes, as long as neither of its legs then runs along another edge. When a
corridor is too narrow for lanes at least half the edge spacing apart, lanes may use half of the
neighbouring nodes' padding. Routes therefore keep at least half the edge spacing between
parallel runs wherever the gaps between nodes are at least two paddings plus half the edge spacing
(30 px with the defaults); in a narrower gap, edges that meet at facing ports can share a short
run, and an edge between facing ports closer than two paddings has no lane at all and takes the
smoothstep fallback (which loops out past both ports). Routing and nudging run within a
per-frame budget and resume on the next frame, so a drag re-routes only what moved. Routed edges
carry `data-routed`; `routeEdges()` routes everything synchronously and `routes` reads the current
paths.

## Layout

`layout(direction?, { ids?, sourceEvent?, before? })` runs the layout engine and applies its
positions, together with the laid-out direction in the document's `layout.direction` (a
`layout-settings` change that moves the default port sides) and any `before` changes, as one
transaction with the reason `layout`, then dispatches `tp-layout-complete` with
`{ direction, stats: { layers, dummies, crossings, components, elapsed }, bounds }`; without a
direction it uses `autoLayout`, else the document's `layout.direction`, else `horizontal`. The
document's `layout` settings (`nodeSpacing` 40, `rankSpacing` 80, `componentSpacing` 60, `pack`)
feed the engine, `layoutEngine` injects another implementation of `FlowLayoutEngine`, and the root
is `aria-busy` while the engine runs.

The layered engine removes cycles by reversing back edges, assigns layers by longest path with a
promotion pass, inserts dummies for long edges, orders each layer by weighted medians (port order
included) with transposition, places nodes with Brandes–Köpf coordinates over their measured sizes,
lays groups out bottom-up with their boundary edges lifted to the parent level, packs disconnected
components on shelves (`grid`), in `rows` or not at all, and keeps pinned nodes where they are,
flowing the rest around them. The result is deterministic and translated so the top-left of the
laid-out nodes stays where it was. `smart` picks the axis the explicit port sides imply, else the
orientation whose aspect is closest to the viewport, and packs several components as a grid.

After a layout the focused node (else the single selected node) keeps its screen position: the
viewport is compensated in the same frame. The transition plays the `flow-layout` state role
(`flowMotionRoles.layout`): moved nodes glide from where they were while the edge and label layers
fade in at their final routes, which the router computed on the committed positions. It takes
`--tp-duration-normal` and `--tp-easing-standard`, is a single step under reduced motion, and a
consumer can claim it through `tp-motion-request`.

`autoLayout` (`none`, `horizontal`, `vertical`, `smart`; reflected) turns automatic layout on:
nodes can still be dragged; the drag commits as `drag`, then the pin of the dropped node and the
re-flow commit together as one `layout` transaction. `alignSelection(mode)` (`left`, `center-x`,
`right`, `top`, `center-y`, `bottom`) and `distributeSelection(axis, spacing?)` (`x` or `y`,
`even` by default or a gap) arrange the selected nodes as one transaction; the context menu of a
multi-node selection offers align left, align top and distribute horizontally or vertically. The
engine also exports `alignNodes`, `distributeNodes` and `snapNodesToGrid`.

## Viewport

The viewport lane is `{ x, y, zoom }` (`viewport="x y zoom"` as an attribute), proposed through the
cancelable `tp-viewport-change` at most once per frame with `metadata.animated` during animations.
It starts at `0 0 1`, or at the first fit when `fitView` is set (later resizes keep the current
viewport so nothing moves under the pointer); `minZoom` (0.1) and `maxZoom` (4) clamp it;
`fitPadding` (48 px) pads the fit. `setViewport(viewport, { duration, reason })`,
`fitViewTo({ padding, duration, nodes, maxZoom })` (the fit never magnifies past a zoom of 1 unless
`maxZoom` allows), `zoomTo(zoom, { point, duration })`, `zoomIn()` and `zoomOut()` (a factor of
1.2), `setCenter(point, { zoom, duration })` animate and resolve when the viewport settles,
instantly under reduced motion. Without `duration` the move takes `--tp-duration-normal` on
`--tp-easing-standard`; `setViewport` is instant unless given a `duration`. `screenToFlow(point)` and `flowToScreen(point)` convert client
coordinates, `canvasSize` is the pane's size and `getNodesBounds(ids?)`,
`getIntersectingNodes(rect, partially?)` read the engine's indices.

A left drag pans in the pan tool, while Space is held or with the middle button. `wheel` sets what
a plain wheel does: `pan` (default), `zoom` toward the pointer, or `none` to leave the page's
scrolling alone; Control or Command with the wheel (a trackpad pinch) always zooms toward the
pointer and Shift swaps the axes. The wheel works anywhere over the canvas, nodes and panels
included: a wheel over a node or panel goes to its content only when something there can scroll
in that direction (a long list, a textarea), and otherwise moves the canvas. A wheel stream keeps
the owner its first wheel chose, the way the browser latches native scrolling, so nodes that pan
under a stationary pointer never stop it; the stream ends after a 500 ms pause, when the pointer
moves more than 10 px, or when Control or Command changes. On touch, one finger on the empty pane pans in either tool and
a second finger pinches around the midpoint (a touch press never starts a marquee); a double press
on the empty pane zooms in by 1.2, and `cooperativeGestures` hands plain wheel and one-finger pane
gestures to the page. Node, connection, marquee and resize drags auto-pan near the pane edges.

## Selection and editing

The selection lane is `{ nodes, edges }` (`tp-selection-change`): a press selects, Shift adds,
Command or Control toggles, and a press on a control inside a node selects that node while the
control keeps the press; in the select tool a press on the empty pane starts a marquee that
selects nodes it touches (`selectionMode="partial"`) or encloses (`full`), Shift extends it, a press
without movement clears, and Shift with a press in the pan tool also starts a marquee. Command or
Control with A selects everything and Escape clears. `select({ nodes, edges })`, `selectAll()` and
`clearSelection()` do the same from code; selection is never written into the document.

Copy, cut, paste and duplicate (`Mod+C`, `Mod+X`, `Mod+V`, `Mod+D`; `copy()`, `cut()`,
`paste(payload?, { at })`, `duplicate()`) exchange `application/x-tweakpad-flow+json` with a JSON
text fallback through the clipboard: a paste remaps ids, drops the nodes one grid step
away or at the pointer, keeps the edges among them and selects what it pasted. Keys typed into an
editable control inside a node stay with the control. `nudgeSelection(delta)` moves the selection
by a delta; keyboard nudges coalesce into one history entry.

Undo and redo (`Mod+Z`, `Mod+Shift+Z`, the Undo and Redo controls; `undo()`, `redo()`, `canUndo`,
`canRedo`) replay the engine's history: one entry per gesture, nudges coalesced, measurements,
viewport and selection never recorded. `tp-history-change` reports every history change with
`{ canUndo, canRedo, undoLabel?, redoLabel?, depth }` (the labels name the step, such as `move` or
`connect`), so a consumer bar can enable its own buttons. Each step is proposed through the value lane with `metadata.history` set to
`undo` or `redo`, so a controlled owner can veto it. Delete and Backspace, the node toolbar and
the context menu delete the selection: the cancelable `tp-delete` carries the nodes (with their
descendants) and the dependent edges, the deletion is one transaction, focus moves to the nearest
remaining node, and `deletable: false` keeps an element out of it. With `confirmDelete`
(`confirm-delete`) such a deletion that removes nodes asks first, after `tp-delete`: an Alert
Dialog modal to the widget (`modality="container"`, `backdrop="blur"`) blurs the whole widget,
names the node or the count (`strings.confirmDeleteNode`, `confirmDeleteNodes`,
`confirmDeleteDescription`), Delete removes the nodes as they are then and moves focus to the
nearest remaining node, and Cancel or Escape keeps everything and returns focus. Edge-only
deletions, Cut and `deleteElements({ nodes, edges })` never ask; the method runs the deletion at
once, after `tp-delete`.

The context menu is a Menu with the context invocation (right click, Shift+F10, the ContextMenu
key, a long press). Its subject comes from the press: a node (or the selection it belongs to), an
edge or the pane. A press anywhere outside the open menu, the canvas included, closes it and keeps
its meaning (a press on the pane also clears the selection); a right press elsewhere moves the
menu to the new subject. Pointer presses focus nodes without the keyboard focus ring. The default items are duplicate, copy, cut, pin or unpin (in automatic layout)
and delete for a node (preceded by align left, align top, distribute horizontally and distribute
vertically when two or more nodes are selected); add waypoint and delete for an edge; paste, select
all, fit view and lay out for the pane. With `runnable`, Run node, Run from here and Run up to
here lead the node items and Run graph the pane items. Each item carries its icon and, where a key binding
exists, its shortcut as a Key hint (Mod+D, Mod+C, Mod+X, Mod+V, Mod+A, Shift+1, Backspace); delete is
the destructive variant. `contextMenu(subject)` renders the items instead: `subject` is
`{ kind: 'node', nodeId, selection }`, `{ kind: 'edge', edgeId, selection }` or
`{ kind: 'pane', point, selection }`;
items with the built-in values (`duplicate`, `copy`, `cut`, `delete`, `pin`, `unpin`,
`align-left`, `align-top`, `distribute-x`, `distribute-y`, `add-waypoint`, `paste`, `select-all`,
`fit`, `layout`, `run-node`, `run-from`, `run-to`, `run-graph`) keep their behavior, items with other
values handle their own activation, and `contextMenu = false` removes the menu. A node with
inspector settings gets a Settings item first (`settings`; it opens the inspector and focuses its
first field). The node toolbar appears above a single selected node with Settings (only when the
node has inspector settings), duplicate, pin (in automatic layout; pressed while pinned) and
delete, led by Run node with `runnable` (which also shows the toolbar, with Run alone, when the
widget is read-only or in view mode); `nodeToolbar(context)` renders its
content from `{ node, definition }` and `nodeToolbar = false` hides it.

## Run state and execution

The widget shows execution; it never runs anything. A backend (or a mock) owns the run and reports
it as events, and every run control is opt-in.

`run` binds execution state: a `FlowRun` snapshot
(`{ id, status, startedAt, endedAt, error, scope, nodes, edges, lastSeq, applied }` with a `Map` of
node states and one of edge states) or a `FlowTrace`, an array of run events (`run_started`,
`node_started`, `node_waiting`, `node_progress`, `node_warning`, `node_completed`, `node_failed`,
`node_skipped`, `node_cancelled`, `edge_taken`, `run_paused`, `run_resumed`, `run_completed`,
`run_failed`, `run_cancelled`, each with `at` and an optional `seq`) that the built-in stepper
plays. `pushRunEvent(event)` feeds a live run one event at a time: the first event starts a live
player on the current graph, which follows later edits (added nodes join idle, removed ones leave).
`clearRun()`, or `run = null`, clears it.

- `node_progress` reports a fraction from 0 to 1 and an optional `message`; `node_waiting` a
  `reason` (an approval, an external system); `node_warning` a `message` that does not fail the
  node. Warnings accumulate until the node starts again.
- `run_started` with `scope: string[]` is a partial run: only those nodes reset, the others keep
  their earlier results, and the end of the run marks unreached and cancelled nodes inside the scope
  only. `run_failed` keeps its `error` on the run.

Node statuses (`idle`, `pending`, `running`, `waiting`, `success`, `failed`, `skipped`,
`cancelled`) show in the status footer: a Spinner or a Marker, the detail and a status Badge. The
detail is the error of a failed node, "Waiting for: reason" for a waiting one, a Progress bar while a
running node reports progress, else its message or duration; a warning Badge counts its warnings. A
running, waiting or failed node gets a ring in its status tone, and the host carries `data-status`
and `data-warnings`. Edge statuses derive from their nodes: an explicit `edge_taken` marks an edge
`taken`; a skipped or cancelled source makes it `disabled`; a source finished through this port with
its target running or waiting makes it `active` (the dash flows), finished makes it `taken`,
finished through another port makes it `not-taken`; otherwise `inactive`. Edges carry `data-status`
and the not-taken and disabled ones dim; under reduced motion the dash stays still and the markers
show the direction. No status is conveyed by color alone.

A trace gets a `player` (`FlowRunPlayer`: `seek(index)`, `step()`, `back()`, `toStart()`,
`toEnd()`, `play(speed)`, `pause()`, `push(event)`, `setTrace(trace)`, `setGraph(graph)`), and
listing `run` in `controls` shows a transport in the controls toolbar: step back, play or pause,
step forward and a position Slider over the steps. `runTransport(action, index?, speed?)` drives it
from code (`play`, `pause`, `step`, `back`, `seek`, `start`, `end`), `runState` is the run currently
shown, `runSummary` counts its nodes per status (plus `warnings` and `total`), `tp-run-change`
reports every transition with `{ run, summary, index, length, playing, mode }`, the inspector's Run
tab shows the selected node's status, attempts, duration, progress, waiting reason, message, error
and warnings, the root carries `data-running`, and status transitions are announced.

### Run requests

`runnable` lets people ask for runs. The node toolbar gets Run node, the context menu Run node,
Run from here and Run up to here (and Run graph on the pane), Mod+Enter runs the graph, and the
`execute` control offers Run and its scopes. These work in read-only and view mode, for monitors,
but not when the widget is disabled. Each asks through `tp-run-request` with
`{ action, scope, nodeId, nodeIds, reason, sourceEvent }`:

- `action` is `run`, `stop` (Stop, while a run is going) or `clear` (Clear run).
- `scope` is `graph`, `node` (the node alone), `from` (the node and everything downstream of it) or
  `to` (everything upstream of it, then the node); `nodeIds` lists the scope in execution order
  (`flowRunScope(graph, scope, nodeId)` computes the same from the engine).
- `requestRun(scope, nodeId?)` and `requestStop()` ask the same from your own controls.

```js
flow.addEventListener('tp-run-request', async (event) => {
  const { action, scope, nodeIds } = event.detail;
  if (action === 'clear') return flow.clearRun();
  if (action === 'stop') return backend.cancel();
  flow.pushRunEvent({
    type: 'run_started',
    at: Date.now(),
    ...(scope === 'graph' ? {} : { scope: nodeIds }),
  });
  for await (const runEvent of backend.run(nodeIds)) flow.pushRunEvent(runEvent);
});
```

## Problems

`validate` shows the document's validation issues: the widget validates after loading and after
every change that is not geometry (the schema's rules, required ports left unconnected, missing
endpoints, a definition's own `validate(node, context)`). `issues` adds problems from elsewhere,
such as a backend's lint, as `FlowIssue` objects
(`{ code, severity, message, nodeId, edgeId, portId }`). `problems` is the merged list, and
`tp-issues-change` reports it whenever it changes.

- A node with problems carries `data-problem` (`error` or `warning`) and, without a run status, a
  dashed outline in that tone; an icon Button in its header opens a Tooltip that lists the problems
  and its run warnings (part `flow-node-problem`). Its accessible name includes them.
- A port named by a problem carries `data-issue` and takes the problem's tone.
- An edge named by a problem carries `data-issue` and draws dashed in the problem's tone.

## Modes

`readOnly` keeps pan, zoom, selection, focus and run visualization and refuses every edit (drags,
connections, deletion, paste, the inspector's fields); the host carries `data-readonly`.
`mode="view"` (the mode lane, `tp-mode-change`) goes further for monitors: it also hides the ports,
the node toolbar, the palette and the editing actions. `locked` (the lock control toggles it,
`data-locked` reflects it) refuses edits the same way while the controls stay usable. `disabled`
makes the canvas inert: nothing receives focus or pointer input and the form value is withheld.
`editable` reads the combined result.

## Panels

- Panels anchor to the four corners and the middle of the four edges: `top-start`, `top-center`,
  `top-end`, `center-start`, `center-end`, `bottom-start`, `bottom-center` and `bottom-end`
  (`FlowPanelPosition`, logical `block-inline` pairs). Every built-in panel takes a position, and a
  slot of each name places consumer content there.
- Header (opt-in): the slots `header-start`, `header-center` and `header-end` place content in a bar
  above the canvas (part `flow-header`): a breadcrumb at the start, the run summary in the center,
  actions at the end. The bar renders only while one of its slots has content; the canvas, the
  sidebars and the panels then start below it. An authored `tp-flow-controls` in a header slot is
  kept in sync like one in a panel, and its menus open downward.
- Controls: `controls` lists the actions of the built-in bar in display order:
  `zoom-in zoom-out fit tool undo redo lock` by default, with `zoom`, `layout` and `run` opting in
  and `controls=""` rendering no bar. Adjacent actions of one set (view, history) share a Button
  group of outline icon Buttons; the select and pan tools are a Toggle group, the lock a Toggle,
  `zoom` the zoom field, `run` the transport (a Slider with its Buttons), `palette` the node
  library's "+" Toggle, `execute` the Run split Button and `run-summary` the status counts (both
  below). Undo and Redo are
  disabled until the history has a step to take. The bar sits in `controlsPosition`
  (`bottom-start`) laid out along `controlsOrientation` (`vertical`).
- Zoom field (`zoom`): an Input group showing the current level; type a percentage and press Enter
  (Escape or leaving the field restores it). Its Menu offers Zoom in (+), Zoom out (-) and Zoom to
  fit (Shift+1) with their icons, then the levels of `zoomPresets` (`[0.5, 1, 2]`; 100% is
  Shift+0) as inset items aligned with them. In a bar at the bottom the menu opens upward,
  at the top downward and on a side edge toward the canvas.
- Run (`execute`): a split Button, the Button group split pattern. Run asks for the whole graph
  (Stop while a run is going); its Menu offers Run graph (Mod+Enter), Run selected node, Run from
  selected node and Run up to selected node (with one selected node) and, once a run exists, Clear
  run. It is disabled without `runnable`.
- Run summary (`run-summary`): one status Badge per non-zero count of the run, in the variants of
  the node status pills: failed, warnings, waiting, pending, running (a Spinner) and completed,
  each with its icon and number on screen and its full label ("Failed: 1") for assistive
  technology (part `flow-run-summary`). It shows nothing without a run.
- Further bars: an authored `tp-flow-controls` child slotted into any panel
  (`<tp-flow-controls slot="center-end" actions="tool lock" orientation="vertical">`) is another
  standard bar; the widget keeps its tool, lock, history, zoom, run and disabled state in sync and
  handles its presses. Consumer Buttons inside a `tp-flow-controls` (or a Button group of them)
  follow its built-in sets and join its roving focus. Any other slotted content is a bar of its own,
  such as a Button group whose Buttons call `selectAll()`, `undo()` or `layout()` and follow
  `tp-history-change` for their state.
- Minimap: `minimap` shows a canvas overview (an image named by `strings.minimap`) of the node
  boxes in their tones and the viewport mask, in `minimapPosition` (`bottom-end`); a press or drag
  pans, the wheel zooms, four named Buttons pan from the keyboard, and it repaints on theme and
  pixel-ratio changes.
- Node library: `palette` picks its layout, `none` (default), `sidebar` (the bare attribute) or
  `menu`. A floating "+" Toggle named by `strings.palette` ("Node library") sits in
  `paletteTrigger` (`top-start`; `none` leaves opening to the API), pressed while the library
  shows; `palette` is also a `controls` action for authored bars. Opening and closing go through
  the `paletteOpen` lane (`palette-open`, `default-palette-open`,
  `setPaletteOpen(open, reason?, sourceEvent?)`, `tp-open-change` with
  `metadata.surface: 'palette'`), and opening moves focus to the library's search.
  - `sidebar`: a bar floating over the canvas at the inline start, on the same surface and inset as
    the inspector, its width set by the size axis, with a "Node library" header and a Close
    Button (Escape closes it too). Under the search an Accordion section per group (several may be
    open; `open` of the category sets the start) lists the definitions; while searching, the
    matching groups replace the sections. It stays open after an insertion; the panels at the
    inline start move clear of it, and fitting the view centers the graph in the canvas it leaves
    uncovered.
  - `menu`: an "Add node" Dialog modal to the widget over a blurred backdrop (container modality:
    the canvas behind it is inert, Escape and its Close Button close it) whose groups lay out as columns under their
    headings, wrapping to further rows when they do not fit. It closes after an insertion and
    focus moves to the new node.
- Library items: each definition is a compact outline Button chip with its icon and label (the
  description, or `strings.dragToPlace`, as its tooltip) under the toned heading of its group; the
  search filters by label, description, type and group. Chips are dragged onto the canvas and a
  drop inserts the node centered on the drop point; the menu turns transparent while a chip is
  dragged, so the whole canvas takes the drop, and comes back when the drag is cancelled. A click on
  a chip arms placement instead, the single-pointer alternative to dragging: the pane shows a copy
  cursor, the live region reads `strings.announcePlacing`, the next press on the pane places the
  node there and Escape cancels. Enter or Space on a focused chip inserts at the center of the
  uncovered canvas. With a pending anchor (the "+" of an edge label or the point of a released
  connection) any activation inserts there and connects. An insertion proposes with
  `metadata.insert: { type, at }` and selects the new node.
- Inspector: a panel floating over the canvas at the inline end, inset like the other panels and
  painted on the shared floating surface, for the settings the schema keeps off the node. It
  enters and leaves fading while it slides 2.5rem from the inline end (instant under reduced
  motion), keeps showing its node while it leaves, and reports the end of either
  motion through `tp-open-change-complete`. The canvas keeps its size: while it is open, panels at
  the inline end move clear of it and middle panels center in the space it leaves, and a node it
  covers when it opens on that node (or follows the selection to it) pans the least distance to sit
  clear of it. Only a node whose definition places at least one property in the inspector
  (`placement`, see Schema) has one; its header shows the node's title, and Tabs switch Settings
  (one Field per visible inspector property, edited by the control its definition names; the node
  body shows the others), Wiring (the node's incoming and outgoing connections as List items;
  activating one focuses the edge) and Run (the node's status, attempts, duration, message and
  error). `inspector` is the policy: `auto` (default) opens it on a double press on such a node (not
  on its ports or its own controls), from the node toolbar's Settings or the context menu's Settings
  item; while open it follows a single selected node with inspector settings and closes when the
  selection leaves them. `manual` leaves opening and closing to the `inspectorOpen` lane
  (`inspector-open`, `default-inspector-open`, `setInspectorOpen()`, `tp-open-change` with
  `metadata.surface: 'inspector'`; the double press, Settings and the menu item propose on it);
  `none` never renders it. A selection alone never opens it. `inspectorCommit` is `live` (every edit
  proposes and commits at once) or `explicit` (edits stay local until Save proposes one change per
  edited key; Cancel reverts them). Opened by a double press the inspector leaves focus on the
  canvas; opened from Settings or the menu it focuses its first field; closing returns focus to the
  node.
- Panel slots: `slot="top-start"` and the seven other positions place consumer panels (a Button, a
  Badge, a Card, a bar) over the canvas beside the built-in ones; the layers only intercept the
  pointer over their content.
- Background: `background` draws `dots` (default), `lines`, `cross` or `none` behind the graph at
  the `snapGrid` spacing, following the viewport.

## Hooks

| Hook                | Signature                                                       | Purpose                                                                                                                                  |
| ------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `isValidConnection` | `(connection, { model, schema, edgeId? }) => boolean \| string` | Final validation of a connection or reconnection after the schema rules; a string is a rejection message                                 |
| `middleware`        | `FlowMiddleware[]` (`{ name?, before?, after? }`)               | Engine hooks: `before(changes, { reason, origin, transaction, model, preview() })` rewrites or vetoes (`false`), `after(event)` observes |
| `nodeTemplates`     | `Record<type, (context) => TemplateResult>`                     | Node bodies per definition type                                                                                                          |
| `edgeTemplates`     | `Record<id \| kind, (context) => TemplateResult>`               | Edge label content per edge id or kind                                                                                                   |
| `propertyControls`  | `Partial<Record<control, (context) => TemplateResult>>`         | Control factories per property control name                                                                                              |
| `icons`             | `Record<key, IconDefinition>`                                   | Icon definitions the schema's `icon` keys name                                                                                           |
| `renderer`          | `'svg' \| FlowRenderer`                                         | Edge, connection-line and marquee painter                                                                                                |
| `router`            | `'auto' \| 'orthogonal' \| 'none' \| FlowRouter`                | Routing policy or implementation                                                                                                         |
| `layoutEngine`      | `FlowLayoutEngine`                                              | Layout implementation used by `layout()` and `autoLayout`                                                                                |
| `nodeToolbar`       | `(context: { node, definition }) => TemplateResult \| false`    | Node toolbar content; `false` hides the toolbar                                                                                          |
| `contextMenu`       | `(subject) => TemplateResult \| false`                          | Context menu items; `false` removes the menu                                                                                             |
| `getNodeAriaLabel`  | `(node, definition, status) => string`                          | Accessible name of a node (default: label, definition label, status and "selected")                                                      |
| `getEdgeAriaLabel`  | `(edge) => string`                                              | Accessible name of an edge (default: "Edge from A to B, label")                                                                          |
| `onValueChange`     | `(event: TpValueChangeEvent<FlowDocument>) => void`             | Callback form of `tp-value-change`                                                                                                       |
| `onValueCommitted`  | `(value, previous, reason) => void`                             | Callback form of `tp-value-commit`                                                                                                       |

Middleware runs inside the engine for every change, including undo and redo, before the proposal
reaches the owner: it can veto a deletion, rewrite positions, or log every transaction. A
`FlowChangeEvent` carries `changes`, `inverse`, `reason`, `origin` (`user`, `undo`, `redo`,
`rollback`, `layout`, `route`, `external`, `measure`), `transaction`, `document`,
`previousDocument`, `affectedNodes`, `affectedEdges` and `dirtyRects`. The `model` getter exposes
the live `FlowModel` for queries (`incomers`, `outgoers`, `topologicalOrder`, `hasCycle`,
`nodeRect`, `ports`, `validate`); mutate it through the widget's methods so the lanes, history and
owners stay in step.

## Renderer

The widget resolves what to draw and a renderer draws it; the default SVG renderer keeps one
`<svg>` per flow with a group per visible edge, and a WebGL renderer implements the same
`FlowRenderer` interface:

```ts
interface FlowRenderer {
  readonly capabilities: { edgeFocus: boolean };
  attach(host: FlowRenderHost): void;
  detach(): void;
  setViewport(viewport: FlowViewport): void;
  syncEdges(edges: readonly RenderedEdge[]): void; // the full visible set; diff by id
  setConnectionLine(line: ConnectionLineState | null): void;
  setSelectionBox(rect: FlowRect | null): void; // the marquee, in flow coordinates
  resize(size: FlowSize, devicePixelRatio: number): void;
  themeChanged(): void;
  hitTest?(point: FlowPoint, tolerance: number): FlowRendererHit | undefined;
}
```

On `attach` the host supplies the layer element to append to, the owner `window`, a per-instance
`id` for marker names, the size, the pixel ratio, the viewport, the reduced-motion and
forced-colors flags, `token(name)` to read a design token (`--tp-primary`) through the host's
computed style and `requestRender()` to ask the widget for a pass; renderers never schedule frames
or read globals themselves. Each `RenderedEdge` carries the edge, its kind, the resolved path
(`points`, `d`, `bbox`, `center`, `length`), both endpoints, the stacking `z`, the `selected`,
`hovered`, `focused`, `animated`, `routed` and `fallback` flags, the run `status`, the dash
`direction`, the tone, the stroke width, the marker specs, the resolved labels and whether it is
`interactive`. Nodes, labels, panels, the edge editor and the focus proxies stay DOM whatever the
renderer; a renderer that reports `edgeFocus` paints focus itself, otherwise the widget's proxies
carry it and set `data-focus-visible` on the edge; without `hitTest` the engine hit-tests the
paths. Assign an instance to `renderer`, read `rendererCapabilities`, and find the active kind on
the root as `data-renderer`.

## Events

| Event                     | Cancelable | Detail                                                                                                                                                                    |
| ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tp-value-change`         | yes        | `value`, `previousValue`, `reason`, `sourceEvent`, `metadata: { changes, transaction?, surface?, nodeId?, edgeId?, property?, history?, reconnect?, insert?, animated? }` |
| `tp-value-commit`         | no         | the settled document with the same `reason` and `metadata`                                                                                                                |
| `tp-viewport-change`      | yes        | `{ x, y, zoom }`, `metadata.animated`                                                                                                                                     |
| `tp-selection-change`     | yes        | `{ nodes, edges }`                                                                                                                                                        |
| `tp-tool-change`          | yes        | `'select'` or `'pan'`                                                                                                                                                     |
| `tp-mode-change`          | yes        | `'design'` or `'view'`                                                                                                                                                    |
| `tp-open-change`          | yes        | the open state with `metadata.surface`: `inspector`, `palette` or `context-menu`                                                                                          |
| `tp-open-change-complete` | no         | `{ open, surface: 'inspector' }` once the inspector's enter or exit motion finished                                                                                       |
| `tp-connect`              | yes        | `{ connection, edge, reason, sourceEvent }`; cancelling drops the connection, mutating `edge` changes what is added                                                       |
| `tp-delete`               | yes        | `{ nodes, edges, reason, sourceEvent }`: the nodes with their descendants and every dependent edge                                                                        |
| `tp-layout-complete`      | no         | `{ direction, stats, bounds }`                                                                                                                                            |
| `tp-history-change`       | no         | `{ canUndo, canRedo, undoLabel?, redoLabel?, depth }`                                                                                                                     |
| `tp-run-change`           | no         | `{ run, summary, index?, length?, playing?, mode? }`                                                                                                                      |
| `tp-run-request`          | no         | `{ action, scope?, nodeId?, nodeIds, reason, sourceEvent? }` (`runnable`)                                                                                                 |
| `tp-issues-change`        | no         | `{ issues }`: the problems shown changed                                                                                                                                  |
| `tp-field-value`          | no         | the form value for a surrounding Field                                                                                                                                    |
| `tp-diagnostic`           | no         | `{ code, message, severity }` with the codes `flow-state` and `flow-adoption-conflict`                                                                                    |

`metadata.surface` names where a proposal came from: `node` (a drag, a resize, a control inside a
node), `edge`, `pane`, `inspector`, `toolbar`, `menu`, `palette`, `keyboard` or `api`. Reasons per
lane: the value lane uses `drag`, `track-press`, `keyboard`, `item-press`, `trigger-press`,
`input`, `input-blur`, `input-paste`, `increment`, `decrement`, `scrub`, `wheel`, `hotkey`,
`connect`, `layout`, `escape-key`, `pointer`, `form-reset`, `imperative-action` and
`programmatic`; the viewport lane `drag`, `wheel`, `gesture`, `keyboard`, `hotkey`,
`trigger-press`, `window-resize`, `imperative-action` and `programmatic`; the selection lane
`item-press`, `selection`, `keyboard`, `hotkey`, `imperative-action` and `programmatic`; the tool
lane `trigger-press`, `hotkey` and `programmatic`; the mode lane `trigger-press` and
`programmatic`; the inspector lane `trigger-press`, `item-press`, `keyboard`, `outside-press`,
`escape-key`, `close-action`, `focus-outside`, `imperative-action` and `programmatic`; the palette
lane `trigger-press`, `item-press`, `escape-key`, `close-action`, `outside-press`,
`focus-outside`, `close-watcher`, `imperative-action` and `programmatic`.

Lane events of the composed controls never leave the widget: a Slider inside a node stops at the
node and becomes a `node-data` proposal with `metadata.nodeId`, `property` and `surface`; a vetoed
widget proposal cancels the control's own proposal so the control reverts; the inspector's fields,
the controls toolbar, the minimap, the palette and the context menu report through the widget's
lanes the same way. Events of consumer content inside an authored node pass through unless the
element carries `data-flow-property`.

## Keyboard

The canvas is one tab stop that enters at the last focused node (the first node at first). `Mod`
is Command on macOS and Control elsewhere.

<table>
  <thead>
    <tr><th>Keys</th><th>Action</th></tr>
  </thead>
  <tbody>
    <tr><td><tp-key-hint-group separator="none"><tp-key-hint label="Arrow left">←</tp-key-hint><tp-key-hint label="Arrow up">↑</tp-key-hint><tp-key-hint label="Arrow right">→</tp-key-hint><tp-key-hint label="Arrow down">↓</tp-key-hint></tp-key-hint-group></td><td>Move focus between nodes (the nearest node in that direction)</td></tr>
    <tr><td><tp-key-hint>Home</tp-key-hint> <tp-key-hint>End</tp-key-hint></td><td>Focus the first or the last node</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Shift</tp-key-hint><tp-key-hint label="Arrow key">→</tp-key-hint></tp-key-hint-group></td><td>Nudge the selection by one grid step</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>Shift</tp-key-hint><tp-key-hint label="Arrow key">→</tp-key-hint></tp-key-hint-group></td><td>Nudge the selection by four grid steps</td></tr>
    <tr><td><tp-key-hint>Enter</tp-key-hint></td><td>Enter the focused node (Tab then cycles its ports and controls); on a port, start or confirm a connection</td></tr>
    <tr><td><tp-key-hint>Space</tp-key-hint></td><td>Toggle the focused node in the selection; held, pan with the pointer</td></tr>
    <tr><td><tp-key-hint>Escape</tp-key-hint></td><td>Cancel the gesture or an armed placement, leave the node, clear the selection, close the inspector or the node library</td></tr>
    <tr><td><tp-key-hint>Delete</tp-key-hint> <tp-key-hint>Backspace</tp-key-hint></td><td>Delete the selection (after <code>tp-delete</code>)</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>Z</tp-key-hint></tp-key-hint-group> <tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>Shift</tp-key-hint><tp-key-hint>Z</tp-key-hint></tp-key-hint-group></td><td>Undo, redo</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>C</tp-key-hint></tp-key-hint-group> <tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>X</tp-key-hint></tp-key-hint-group> <tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>V</tp-key-hint></tp-key-hint-group> <tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>D</tp-key-hint></tp-key-hint-group></td><td>Copy, cut, paste, duplicate the selection</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint>A</tp-key-hint></tp-key-hint-group></td><td>Select everything</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Mod</tp-key-hint><tp-key-hint key="Enter"></tp-key-hint></tp-key-hint-group></td><td>Ask to run the graph (<code>runnable</code>)</td></tr>
    <tr><td><tp-key-hint>+</tp-key-hint> <tp-key-hint>-</tp-key-hint></td><td>Zoom in, zoom out</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint key="shift"></tp-key-hint><tp-key-hint>1</tp-key-hint></tp-key-hint-group> <tp-key-hint-group><tp-key-hint key="shift"></tp-key-hint><tp-key-hint>0</tp-key-hint></tp-key-hint-group></td><td>Zoom to fit, zoom to 100% (the digit key, whatever character Shift types on the layout)</td></tr>
    <tr><td><tp-key-hint>V</tp-key-hint> <tp-key-hint>H</tp-key-hint></td><td>Select tool, pan tool</td></tr>
    <tr><td><tp-key-hint>E</tp-key-hint></td><td>Cycle the focused node's edges</td></tr>
    <tr><td><tp-key-hint-group><tp-key-hint>Shift</tp-key-hint><tp-key-hint>F10</tp-key-hint></tp-key-hint-group> <tp-key-hint>ContextMenu</tp-key-hint></td><td>Open the context menu</td></tr>
  </tbody>
</table>

Inside a node, Tab moves through its ports and controls and Escape returns to the node; keys typed
into an editable control stay with it. Waypoint handles and resize handles take arrows, Delete and
Escape of their own. Focusing a node outside the viewport (`focusNode(id)`, an arrow key) reveals
it through `setCenter`. The hidden instructions paragraph (`flow-instructions`, described by the
root) summarizes this table for assistive technology.

## Constituents and accessibility

The root is an application region (`role="application"`) named by `label` ("Flow" by default)
with a role description and the hidden instructions; it is `aria-busy` while the engine lays out.
Each node is a group with the role description "node", named by `getNodeAriaLabel` or its label,
definition label, run status and ", selected"; the nodes form one roving tab stop over the model
order. Ports are native buttons named "Node: Port input" or "… output" with `aria-keyshortcuts`
and `aria-pressed` while click-connecting. Edges are groups with the role description "edge" named
"Edge from A to B, label", focusable through overlay proxies so focus works with every renderer.
The controls toolbar and the node toolbar are toolbars with arrow navigation, the minimap an image
with named pan buttons, the node library a region named "<label> node library" with a search field, headed groups
(Accordion sections in the sidebar) and Button chips, inside a Dialog in the `menu` layout, the
inspector a labelled panel whose Tabs and Fields keep their own semantics, the context menu a Menu.
A polite live region announces moves ("Moved Send auto-reply to 700, 380"), connections, the
candidate during a keyboard connection, deletions, the selection count, layout completion, the
zoom level after a keyboard zoom and run transitions. Under reduced motion the dash flow, the
viewport and layout tweens and the selection transitions are off; under forced colors the strokes
use `CanvasText` and `Highlight` and every status keeps its text and icon. `strings` overrides
every visible and accessible string (`FlowStrings`), `locale` formats the fields.

## Forms and Field

The widget is a form control: `name` submits the canonical document as JSON (nothing when the
document is empty or the widget is disabled), `required` fails on an empty document,
`form.reset()` restores the default with the reason `form-reset`, and a restored form state applies
non-cancelably. Inside `tp-field` the Field's label names the graph (over `label`) and focuses
the canvas when pressed, and the description and the error describe it. `readOnly` keeps the canvas focusable and refuses edits; `disabled` makes it inert.

## Parts and customization

One presentation family, `tp-flow`, covers the root and every constituent with the axis `size`
(`sm`, `default`, `lg`), which scales the node width, the ports, the handles, the edge width, the
markers, the grid, the minimap, the palette, the inspector and the intrinsic height (the widget fills its box
and has a minimum height on its own, so it needs no inline size). Public parts: `flow`,
`flow-header`, `flow-pane`, `flow-viewport`, `flow-background`, `flow-background-pattern`,
`flow-node`,
`flow-node-card`, `flow-node-shell`, `flow-node-header`, `flow-node-icon`, `flow-node-title`,
`flow-node-description`, `flow-node-body`, `flow-node-row`, `flow-node-row-label`,
`flow-node-row-control`, `flow-node-footer`, `flow-node-status`, `flow-node-problem`,
`flow-node-group`,
`flow-node-toolbar`, `flow-node-resizer`, `flow-node-resizer-line`, `flow-node-resizer-handle`,
`flow-port`, `flow-port-dot`, `flow-port-label`, `flow-edge`, `flow-edge-path`, `flow-edge-hit`,
`flow-edge-halo`, `flow-edge-marker`, `flow-edge-label`, `flow-edge-focus`, `flow-edge-waypoint`,
`flow-edge-segment-handle`, `flow-edge-reconnect`, `flow-connection-line`, `flow-selection`,
`flow-selection-bounds`, `flow-minimap`, `flow-minimap-node`, `flow-minimap-viewport`,
`flow-controls`, `flow-control`, `flow-run-summary`, `flow-palette`, `flow-palette-header`, `flow-palette-body`,
`flow-palette-search`, `flow-palette-sections`, `flow-palette-group`, `flow-palette-group-label`,
`flow-palette-items`, `flow-palette-item`, `flow-inspector`,
`flow-inspector-header`, `flow-inspector-tabs`, `flow-inspector-body`, `flow-inspector-footer`,
`flow-panel-top-start`, `flow-panel-top-center`, `flow-panel-top-end`, `flow-panel-center-start`,
`flow-panel-center-end`, `flow-panel-bottom-start`, `flow-panel-bottom-center`,
`flow-panel-bottom-end` and `flow-instructions`.
The composed Card of a node is registered as `flow-node-card`, its List item rows as
`flow-node-row`, the toolbar Buttons and Toggles as `flow-control` and the node library's chips as
`flow-palette-item`; `tp-flow-node` exports its parts, so `tp-flow::part(flow-node-title)` reaches
rendered and authored nodes alike and `partPresentation` hooks reach the widget parts and the
registered nested parts.

State markers: the root carries `data-mode`, `data-tool`, `data-dragging`, `data-connecting`,
`data-selecting`, `data-resizing`, `data-readonly`, `data-disabled`, `data-locked`, `data-empty`,
`data-auto-layout`, `data-lod`, `data-renderer`, `data-inspector-open`, `data-palette` (the
sidebar shows), `data-placing`, `data-running` and
`data-pan-active`; a node `data-selected`, `data-focused`, `data-focus-visible`, `data-dragging`,
`data-connecting`, `data-shape`, `data-tone`, `data-status`, `data-problem`, `data-warnings`,
`data-lod`, `data-pinned`, `data-parent`, `data-measured` and `data-resizable`; a port
`data-direction`, `data-side`, `data-issue`,
`data-connected`, `data-candidate`, `data-candidate-focused`, `data-valid`, `data-invalid`,
`data-click-connecting`, `data-multiple` and `data-required`; an edge `data-kind`,
`data-selected`, `data-hover`, `data-focus-visible`, `data-animated`, `data-status`,
`data-issue`, `data-direction`, `data-reconnecting` and `data-routed`.

Every color resolves through tokens: the frame and the background through `--tp-background`,
`--tp-foreground` and `--tp-border`, cards through the Card recipe, rows through List item, pills
through Badge and Marker, ports, waypoints and handles through the shared thumb recipe painted with
`--tp-primary`, edges through a foreground mix that turns `--tp-primary` when selected or focused,
run statuses through `--tp-warning` (pending, waiting), `--tp-primary` (running, active),
`--tp-success` (success, taken), `--tp-destructive` (failed) and `--tp-muted-foreground` (skipped,
cancelled, not taken, disabled), typed tones through `--tp-chart-1` to `--tp-chart-5` and the
status tokens. Override the tokens on the host or in a scoped theme; the `--_tp-flow-*` custom
properties the recipe derives from them are private and change with `size`.

## Engine

`@tweakpad/ui/flow` is pure TypeScript without DOM, Lit or timers, so it runs in Node, in a Worker
and on a server. Its modules: the types and defaults (`FLOW_DOCUMENT_VERSION`,
`DEFAULT_NODE_SIZE_BY_SHAPE`, `DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE`, `propertyPlacement`,
`inspectorProperties`, `DEFAULT_EDGE_KIND`, `DEFAULT_ROUTER_OPTIONS`, `DEFAULT_LAYOUT_OPTIONS`,
`DEFAULT_ZOOM_LIMITS`); geometry and viewport math (`screenToFlow`,
`flowToScreen`, `visibleRect`, `viewportForBounds`, `zoomToPoint`, `zoomBy`, `panBy`, `centerOn`,
`clampViewport`, `snapPoint`, `wheelZoomFactor`, `autoPanVelocity`, `interpolateViewport`) and the
`SpatialIndex`; the model (`FlowModel` with `apply`, `transaction`, `undo`, `redo`, `load`,
`reconcile`, `connect`, `select`, `measure`, the queries and `validateConnection`, plus
`applyFlowChanges`, `invertFlowChanges`, `squashFlowChanges`, `FlowHistory`, `validateDocument`,
`serializeFlowDocument`, `parseFlowDocument`, `migrateFlowDocument`, `normalizeNodeOrder`); edge
geometry (`bezierPath`, `straightPath`, `stepPath`, `smoothStepPath`, `orthogonalPath`,
`resolveEndpoint`, `pointAlongPath`, `labelAnchor`, `collectMarkers`, `hitTestPath`); the router
(`OrthogonalRouter`, `createRoutingPlanner`, `routeGeometryHash`, `packRoutes`, `unpackRoutes`);
the layout (`LayeredLayoutEngine`, `flowLayoutRequest`, `layoutFlow`, `alignNodes`,
`distributeNodes`, `snapNodesToGrid`); the run state (`flowRunGraph`, `FlowRunState`,
`deriveEdgeStatus`, `FlowRunPlayer`, `timeoutTicker`) and the `FlowRenderer` contract.

Routing and layout can leave the main thread. In a Worker, build a `FlowModel` from the document,
create a planner with `createRoutingPlanner(model, options)`, run it in slices (`run(budgetMs)`
returns `{ done, routed, remaining, elapsed }` and resumes where it stopped; `pending` stays true
until routing and nudging are both finished) and send the routes
back as typed arrays: `packRoutes(planner.routes.values())` packs ids, kinds, offsets, coordinates,
flags, hashes, radii and stubs into transferable buffers, and `unpackRoutes(packed)` rebuilds the
`FlowRoute` map on the other side. `layoutFlow(model, direction, options)` returns positions,
sizes and the `changes` list; post the changes and apply them with
`flow.propose(changes, 'layout')` followed by `flow.commit('layout')` so the lanes, the history and
a controlled owner see one layout transaction.

## API reference

### `tp-flow`

| Property                                   | Attribute                                      | Type                                                   | Default                                    |
| ------------------------------------------ | ---------------------------------------------- | ------------------------------------------------------ | ------------------------------------------ |
| `value` / `defaultValue`                   | `value` / `default-value` (JSON)               | `FlowDocument`                                         | `{ version: 1, nodes: [], edges: [] }`     |
| `viewport` / `defaultViewport`             | `viewport` / `default-viewport` (`"x y zoom"`) | `FlowViewport`                                         | `0 0 1`, or the first fit                  |
| `selection` / `defaultSelection`           | `selection` / `default-selection` (JSON)       | `{ nodes: string[], edges: string[] }`                 | empty                                      |
| `tool` / `defaultTool`                     | `tool` / `default-tool`                        | `'select' \| 'pan'`                                    | `'select'`                                 |
| `mode` / `defaultMode`                     | `mode` / `default-mode`                        | `'design' \| 'view'`                                   | `'design'`                                 |
| `inspectorOpen` / `defaultInspectorOpen`   | `inspector-open` / `default-inspector-open`    | `boolean`                                              | `false`                                    |
| `schema`                                   | —                                              | `FlowSchema`                                           | `undefined`                                |
| `icons`                                    | —                                              | `Record<string, IconDefinition>`                       | `{}`                                       |
| `nodeTemplates`, `edgeTemplates`           | —                                              | `Record<string, FlowNodeTemplate \| FlowEdgeTemplate>` | `{}`                                       |
| `propertyControls`                         | —                                              | `FlowPropertyControls`                                 | `defaultPropertyControls`                  |
| `renderer`                                 | —                                              | `'svg' \| FlowRenderer`                                | `'svg'`                                    |
| `router`                                   | —                                              | `'auto' \| 'orthogonal' \| 'none' \| FlowRouter`       | `'auto'`                                   |
| `layoutEngine`                             | —                                              | `FlowLayoutEngine`                                     | layered engine                             |
| `autoLayout`                               | `auto-layout` (reflected)                      | `'none' \| 'horizontal' \| 'vertical' \| 'smart'`      | `'none'`                                   |
| `isValidConnection`                        | —                                              | `FlowConnectionPredicate`                              | `undefined`                                |
| `middleware`                               | —                                              | `FlowMiddleware[]`                                     | `[]`                                       |
| `nodeToolbar`, `contextMenu`               | —                                              | template or `false`                                    | built-in content                           |
| `getNodeAriaLabel`, `getEdgeAriaLabel`     | —                                              | functions                                              | built-in names                             |
| `run`                                      | —                                              | `FlowRun \| FlowTrace \| null`                         | `null`                                     |
| `snap`, `snapGrid`                         | `snap`, `snap-grid`                            | `boolean`, `number`                                    | `false`, `16`                              |
| `minZoom`, `maxZoom`, `detailZoom`         | `min-zoom`, `max-zoom`, `detail-zoom`          | `number`                                               | `0.1`, `4`, `0.3`                          |
| `virtualize`                               | `virtualize` (`"false"` to turn off)           | `boolean`                                              | `true`                                     |
| `fitView`, `fitPadding`                    | `fit-view`, `fit-padding`                      | `boolean`, `number`                                    | `false`, `48`                              |
| `background`                               | `background` (reflected)                       | `'dots' \| 'lines' \| 'cross' \| 'none'`               | `'dots'`                                   |
| `controls`                                 | `controls` (space-separated)                   | `FlowControlAction[]`                                  | `zoom-in zoom-out fit tool undo redo lock` |
| `controlsPosition`, `controlsOrientation`  | `controls-position`, `controls-orientation`    | `FlowPanelPosition`, `'vertical' \| 'horizontal'`      | `'bottom-start'`, `'vertical'`             |
| `zoomPresets`                              | —                                              | `number[]`                                             | `[0.5, 1, 2]`                              |
| `minimap`, `minimapPosition`               | `minimap`, `minimap-position`                  | `boolean`, `FlowPanelPosition`                         | `false`, `'bottom-end'`                    |
| `palette`                                  | `palette` (bare means `sidebar`)               | `'none' \| 'sidebar' \| 'menu'`                        | `'none'`                                   |
| `paletteOpen` / `defaultPaletteOpen`       | `palette-open` / `default-palette-open`        | `boolean`                                              | `false`                                    |
| `paletteTrigger`                           | `palette-trigger`                              | `FlowPanelPosition \| 'none'`                          | `'top-start'`                              |
| `confirmDelete`                            | `confirm-delete`                               | `boolean`                                              | `false`                                    |
| `runnable`                                 | `runnable`                                     | `boolean`                                              | `false`                                    |
| `validate`, `issues`                       | `validate`, —                                  | `boolean`, `FlowIssue[]`                               | `false`, `[]`                              |
| `inspector`, `inspectorCommit`             | `inspector`, `inspector-commit`                | `'none' \| 'auto' \| 'manual'`, `'live' \| 'explicit'` | `'auto'`, `'live'`                         |
| `locked`                                   | `locked` (reflected)                           | `boolean`                                              | `false`                                    |
| `wheel`, `cooperativeGestures`             | `wheel`, `cooperative-gestures`                | `'pan' \| 'zoom' \| 'none'`, `boolean`                 | `'pan'`, `false`                           |
| `connectionRadius`, `connectionMode`       | `connection-radius`, `connection-mode`         | `number`, `'strict' \| 'loose'`                        | `20`, `'strict'`                           |
| `connectOnClick`, `selectionMode`          | `connect-on-click`, `selection-mode`           | `boolean`, `'partial' \| 'full'`                       | `true`, `'partial'`                        |
| `showPortLabels`                           | `show-port-labels`                             | `boolean`                                              | `false`                                    |
| `size`                                     | `size` (reflected)                             | `'sm' \| 'default' \| 'lg'`                            | `'default'`                                |
| `label`, `locale`, `strings`               | `label`, `locale`, —                           | `string`, `string`, `Partial<FlowStrings>`             | `''`, `''`, `{}`                           |
| `name`, `disabled`, `readOnly`, `required` | `name`, `disabled`, `readonly`, `required`     | `string`, `boolean`, `boolean`, `boolean`              | `''`, `false`, `false`, `false`            |
| `onValueChange`, `onValueCommitted`        | —                                              | callbacks                                              | `undefined`                                |

Read-only: `model`, `nodes`, `edges`, `routes`, `player`, `runState`, `runSummary`, `problems`,
`controlled`, `editable`,
`dragging`, `connecting`, `selecting`, `canUndo`, `canRedo`, `focusedNodeId`, `visibleNodeIds`,
`visibleEdgeIds`, `rendererCapabilities`, `lod`, `canvasSize`.

Methods: `setValue(document, reason?, sourceEvent?)`, `load(document)`,
`toJSON({ selection?, viewport? })`, `propose(changes, reason?, metadata?, sourceEvent?)`,
`commit(reason?, sourceEvent?, metadata?)`, `addNodes(nodes, reason?)`, `addEdges(edges, reason?)`,
`updateNode(id, patch, reason?)`, `updateNodeData(id, data, reason?)`,
`updateEdge(id, patch, reason?)`, `deleteElements({ nodes?, edges? }, reason?, sourceEvent?)`,
`connect(connection, edge?, reason?, sourceEvent?)`,
`reconnect(edgeId, end, connection, sourceEvent?)`, `undo(reason?)`, `redo(reason?)`,
`select({ nodes?, edges? }, reason?)`, `selectAll(reason?)`, `clearSelection(reason?)`,
`setTool(tool, reason?)`, `setMode(mode, reason?)`, `setInspectorOpen(open, reason?)`,
`setPaletteOpen(open, reason?, sourceEvent?)`,
`setViewport(viewport, { duration?, reason? })`,
`fitViewTo({ padding?, duration?, nodes?, reason?, maxZoom? })`,
`zoomTo(zoom, { duration?, point?, reason? })`, `zoomIn(options?)`, `zoomOut(options?)`,
`setCenter(point, { zoom?, duration?, reason? })`, `screenToFlow(point)`, `flowToScreen(point)`,
`getNodesBounds(ids?)`, `getIntersectingNodes(rect, partially?)`, `getNodeConnections(id)`,
`focusNode(id, { reveal? })`, `focusEdge(id)`, `focusPort(nodeId, portId)`, `focus()`, `copy()`,
`cut(reason?)`, `paste(payload?, { at?, reason? })`, `duplicate(reason?)`,
`nudgeSelection(delta, reason?)`, `alignSelection(mode, reason?)`,
`distributeSelection(axis, spacing?, reason?)`, `layout(direction?, { ids?, sourceEvent?, before? })`,
`routeEdges()`,
`runTransport(action, index?, speed?)`, `pushRunEvent(event)`, `clearRun()`,
`requestRun(scope?, nodeId?, sourceEvent?, reason?)`, `requestStop(sourceEvent?, reason?)`.

Events: `tp-value-change`, `tp-value-commit`, `tp-viewport-change`, `tp-selection-change`,
`tp-tool-change`, `tp-mode-change`, `tp-open-change`, `tp-connect`, `tp-delete`,
`tp-layout-complete`, `tp-history-change`, `tp-run-change`, `tp-run-request`, `tp-issues-change`,
`tp-field-value`, `tp-diagnostic`.
Slots: `top-start`, `top-center`, `top-end`, `center-start`, `center-end`, `bottom-start`,
`bottom-center`, `bottom-end`, `header-start`, `header-center`, `header-end`; the default slot takes
`tp-flow-node` and `tp-flow-edge` children.

### `tp-flow-controls`

The built-in bar, and an authored standard bar when slotted into a panel of `tp-flow`. Attributes:
`actions` (space-separated `FlowControlAction` list in display order) and `orientation`
(`horizontal` or `vertical`). The widget writes `tool`, `locked`, `canUndo`, `canRedo`, `zoom`,
`zoomPresets`, `runState`, `readOnly`, `disabled` and `strings`; presses reach the widget, never
the page. The default slot takes consumer Buttons, Toggles or Button groups, which follow the
built-in sets and join the bar's roving focus. Part: `flow-controls`; its Buttons and Toggles are
`flow-control`.

### `tp-flow-node`

Authoring attributes (light-DOM children of `tp-flow`): `id` (required), `type`, `x`, `y`,
`width` and `height` (both for a persisted size), `parent`, `label`, `data` (JSON), `pinned`,
`hidden`, `draggable`, `selectable`, `connectable`, `deletable` and `resizable` (`"false"` turns
a flag off). The default slot holds authored content; a control with `data-flow-property="key"`
edits that key. As a host the element exposes `node`, `definition`, `shape`, `label`, `nodeId`,
`ports`, `status`, `selected`, `focused`, `dragging`, `lod`, `editable`, `connectable` and
`portElement(portId)`; its role is group and it is the focusable, measured, positioned box the
widget moves. It exports the node and port parts.

### `tp-flow-edge`

A declarative record only (`display: none`): `id` (required), `source`, `target`,
`source-port`, `target-port`, `kind`, `label`, `animated`, `waypoints` (`x,y x,y …`), `data`
(JSON), `marker-start`, `marker-end` and `hidden`. The renderer paints the edge; the element
renders nothing.

### `tp-flow-port`

Rendered by the node host for each resolved port: `nodeId` (`node-id`), `portId` (`port-id`),
`portDirection` (`port-direction`, reflected), `side` (reflected), `label`, `showLabel`
(`show-label`), `labelPlacement` (`label-placement`: `before` or `after`), `accessibleName`
(`accessible-name`), `dataType` (`data-type`), `tone` (reflected), `connectable`, `connected`,
`multiple`, `required`, `candidate`, `candidateFocused` (`candidate-focused`), `valid` (tri-state)
and `clickConnecting` (`click-connecting`). `button` is the native button, `focus()` focuses it.
Parts `flow-port`, `flow-port-dot` and `flow-port-label`.

### Engine exports (`@tweakpad/ui/flow`)

| Group    | Exports                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Types    | `FlowDocument`, `FlowNode`, `FlowEdge`, `FlowPortInstance`, `FlowSchema`, `FlowNodeDefinition`, `FlowPortDefinition`, `FlowPropertyDefinition`, `FlowPropertyPlacement`, `FlowDataTypeDefinition`, `FlowSchemaRules`, `FlowChange`, `FlowChangeOrigin`, `FlowConnection`, `FlowViewport`, `FlowRect`, `FlowPoint`, `FlowSize`, `FlowIssue`, `FlowSelection`                                                                                            |
| Defaults | `FLOW_DOCUMENT_VERSION`, `DEFAULT_NODE_SIZE_BY_SHAPE`, `DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE`, `propertyPlacement`, `inspectorProperties`, `DEFAULT_EDGE_KIND`, `DEFAULT_ROUTER_OPTIONS`, `DEFAULT_LAYOUT_OPTIONS`, `DEFAULT_ZOOM_LIMITS`                                                                                                                                                                                                               |
| Model    | `FlowModel`, `FlowHistory`, `applyFlowChanges`, `invertFlowChanges`, `squashFlowChanges`, `pruneNoopChanges`, `expandRemoveCascade`, `runBeforeHooks`, `runAfterHooks`, `validateConnection`, `validateDocument`, `serializeFlowDocument`, `parseFlowDocument`, `migrateFlowDocument`, `normalizeNodeOrder`, `topologicalOrder`, `adjacencyOrder`, `hasCycle`, `wouldCreateCycle`, `reachable`, `connectedComponents`, `nodesBounds`, `nodeZ`, `edgeZ` |
| Geometry | `clamp`, `rectsIntersect`, `expandRect`, `unionRects`, `overlapArea`, `snapPoint`, `SpatialIndex`                                                                                                                                                                                                                                                                                                                                                      |
| Viewport | `screenToFlow`, `flowToScreen`, `visibleRect`, `viewportForBounds`, `zoomToPoint`, `zoomBy`, `panBy`, `centerOn`, `clampViewport`, `wheelZoomFactor`, `autoPanVelocity`, `interpolateViewport`, `viewportsEqual`                                                                                                                                                                                                                                       |
| Edges    | `bezierPath`, `straightPath`, `stepPath`, `smoothStepPath`, `orthogonalPath`, `flattenBezier`, `resolveEndpoint`, `defaultPortGeometry`, `resolveSide`, `fallbackSide`, `pointAlongPath`, `labelAnchor`, `longestSegmentAnchor`, `markerId`, `collectMarkers`, `markerGeometry`, `distanceToSegment`, `distanceToPolyline`, `hitTestPath`                                                                                                              |
| Router   | `FlowRouter`, `FlowRoute`, `FlowRouteRequest`, `FlowRoutingPlanner`, `OrthogonalRouter`, `createRoutingPlanner`, `routeGeometryHash`, `packRoutes`, `unpackRoutes`, `PackedRoutes`                                                                                                                                                                                                                                                                     |
| Layout   | `FlowLayoutEngine`, `FlowLayoutRequest`, `FlowLayoutOptions`, `FlowLayoutResult`, `LayeredLayoutEngine`, `flowLayoutRequest`, `layoutFlow`, `alignNodes`, `distributeNodes`, `snapNodesToGrid`                                                                                                                                                                                                                                                         |
| Run      | `FlowRun`, `FlowRunEvent`, `FlowTrace`, `FlowNodeRunStatus`, `FlowEdgeRunStatus`, `FlowRunScope`, `FlowRunSummary`, `flowRunGraph`, `flowRunScope`, `flowRunSummary`, `FlowRunState`, `deriveEdgeStatus`, `cloneRun`, `reconcileRun`, `FlowRunPlayer`, `FlowTicker`, `timeoutTicker`                                                                                                                                                                   |
| Renderer | `FlowRenderer`, `FlowRenderHost`, `FlowRendererCapabilities`, `RenderedEdge`, `RenderedEdgeLabel`, `ConnectionLineState`, `FlowRendererHit`                                                                                                                                                                                                                                                                                                            |
