import {
  WIDGET_REGISTER_IMPORTS,
  interactiveMarkupExample,
  publishedSource,
} from '../documentation-examples.js';
import { setupFlowExample } from './flow-example.js';
import setupSource from './flow-example.js?raw';

function example(title: string, content: string, description: string) {
  const id = 'flow-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return interactiveMarkupExample(
    title,
    `<div id="${id}">${content}</div>`,
    setupFlowExample,
    `${publishedSource(setupSource)}\nsetupFlowExample(document.getElementById('${id}'));`,
    description,
    { registerImports: WIDGET_REGISTER_IMPORTS },
  );
}

export const flowExamples = [
  example(
    'Stage lighting',
    '<tp-flow label="Stage lighting" palette="menu" show-port-labels fit-view data-schema="lighting" data-document="lighting" data-output></tp-flow>',
    'Panel nodes from the schema: a toned header, rows of label + Select, Slider, Color picker, Checkbox or NumberField control, labelled typed ports and Bézier edges (`rules.defaultEdgeKind`). A control inside a node proposes a `node-data` change on the document lane with `metadata.nodeId` and `property`; the Fixture group node is resizable. `palette="menu"` puts the node library in a Dialog over the widget, opened by the floating "+": the schema\'s `categories` become columns, and a node is dragged onto the canvas (or clicked, then placed with a click on the canvas).',
  ),
  example(
    'Vertical pipeline',
    '<tp-flow label="Order fulfillment" palette fit-view data-schema="pipeline" data-document="pipeline" data-output></tp-flow>',
    'Compact icon nodes with ports on their top and bottom sides, orthogonal edges routed around the nodes, arrow markers and branch labels as Badge pills. The build path is `animated`: its dashed stroke marches from source to target (a closed arrow keeps the direction when reduced motion pauses it). `palette` puts the node library in a sidebar at the inline start, opened by the floating "+", with a section per category of the schema; drag a chip onto the canvas, or click it and then the canvas. Every label carries a "+" Button that opens the library for an insertion on that edge, and releasing a connection on the empty pane does the same at the drop point.',
  ),
  example(
    'Pipeline with inspector',
    `<tp-flow label="Order fulfillment" inspector="auto" inspector-commit="explicit" default-inspector-open default-selection='{"nodes":["p3"],"edges":[]}' fit-view data-schema="pipeline" data-document="pipeline" data-output></tp-flow>`,
    'The inspector holds the settings the schema keeps off the node: compact nodes have no body rows, so their properties default to `placement: "inspector"`. Double press a step or the approval (or use Settings in the node toolbar or the context menu) to open it; it floats over the canvas at the inline end and slides in like a Sheet, follows a single selected node with settings and closes when the selection leaves them. Settings edits those properties through the library control each one names, Wiring lists the connections, Run shows the status. `inspector-commit="explicit"` keeps edits local until Save (one proposal per edited key) and Cancel reverts them.',
  ),
  example(
    'Execution and debugging',
    `<tp-flow label="Product photo import" runnable validate palette palette-trigger="none" fit-view data-schema="photo" data-document="photo" data-execute>
  <tp-breadcrumb slot="header-start" label="Location"><a href="#">Workflows</a><span>Product photo import</span></tp-breadcrumb>
  <tp-flow-controls slot="header-center" actions="run-summary" orientation="horizontal"></tp-flow-controls>
  <tp-tooltip slot="header-end" side="bottom">
    <tp-button slot="trigger" variant="ghost" size="icon" aria-label="Help"><tp-icon slot="icon-start" data-flow-icon="circle-help"></tp-icon></tp-button>
    Run the whole graph with Run, or select a node and run it, everything from it or everything up to it from its toolbar, its context menu or the Run menu.
  </tp-tooltip>
  <tp-button slot="header-end" variant="outline" data-flow-palette><tp-icon slot="icon-start" data-flow-icon="plus"></tp-icon>Add step</tp-button>
  <tp-flow-controls slot="header-end" actions="execute" orientation="horizontal"></tp-flow-controls>
</tp-flow>`,
    'Everything here is opt-in. `runnable` turns on run requests: Run in the `execute` control (Stop while a run is going, and a menu of scopes), Run node in the node toolbar, Run node, Run from here and Run up to here in the context menu, and Mod+Enter. The widget never executes anything: it dispatches `tp-run-request` with the action, the scope and the node ids in execution order, and the backend answers with run events through `pushRunEvent()`. This example\'s mock backend streams them with short delays: a node waits for an approval and reports a warning, another fails. Nodes show their progress, waiting reason, warnings and errors; `run-summary` counts the nodes per status. `validate` shows design problems before any run: "Purge CDN cache" has an unconnected required input. The header slots (`header-start`, `header-center`, `header-end`) hold the breadcrumb, the summary and the actions, and the header only appears when one of them has content.',
  ),
  example(
    'Animated edges',
    '<tp-flow label="Edge kinds" fit-view controls="" data-schema="workflow" data-document="edges"></tp-flow>',
    'An `animated` edge draws its stroke dashed and marches the dash from source to target, so the direction of flow reads at a glance on every kind (`bezier`, `smoothstep`, `step`, `straight`, `orthogonal`). An animated edge without its own `markerEnd` gets a closed arrow, which keeps the direction visible when reduced motion pauses the dash. Set it per edge (`animated: true`, or the `animated` attribute of a `tp-flow-edge`); a running node animates its active edges the same way.',
  ),
  example(
    'Toolbars and panels',
    `<tp-flow label="Support triage" fit-view controls="zoom-out zoom zoom-in fit" controls-position="bottom-center" controls-orientation="horizontal" data-schema="workflow" data-document="workflow" data-history-readout>
  <tp-flow-controls slot="top-end" actions="undo redo" orientation="horizontal">
    <tp-button variant="outline" size="sm">Publish</tp-button>
  </tp-flow-controls>
  <tp-flow-controls slot="center-end" actions="tool lock" orientation="vertical"></tp-flow-controls>
  <tp-button-group slot="top-center" label="Selection">
    <tp-button variant="outline" size="sm" data-flow-call="selectAll">Select all</tp-button>
    <tp-button variant="outline" size="sm" data-flow-call="clearSelection">Clear</tp-button>
  </tp-button-group>
</tp-flow>`,
    'Panels anchor to the four corners and the middle of the four edges (`top-start`, `top-center`, `top-end`, `center-start`, `center-end`, `bottom-start`, `bottom-center`, `bottom-end`). The built-in bar takes `controls`, `controls-position` and `controls-orientation`; `zoom` is the zoom field: the current level (type a percentage and press Enter) and a menu of fit (Shift+1) and preset levels (100% is Shift+0). Authored `tp-flow-controls` children slotted into any panel are further standard bars the widget keeps in sync (`actions` lists their items; consumer Buttons inside join them), and any other slotted content, such as this Button group calling `selectAll()` and `clearSelection()`, is a consumer bar. Undo and Redo enable as the history fills; `tp-history-change` reports `canUndo`, `canRedo` and the step labels (readout below).',
  ),
  example(
    'Auto-layout modes',
    `<tp-toggle-group label="Layout direction" variant="outline" default-value='["horizontal"]' data-layout-switch="flow-auto-layout">
  <tp-toggle value="horizontal">Horizontal</tp-toggle>
  <tp-toggle value="vertical">Vertical</tp-toggle>
  <tp-toggle value="smart">Smart</tp-toggle>
</tp-toggle-group>
<tp-flow id="flow-auto-layout" label="Support triage" auto-layout="horizontal" controls="zoom-in zoom-out fit tool lock layout undo redo" fit-view data-schema="workflow" data-document="workflow" data-pin="reply" data-layout-readout></tp-flow>`,
    'In an automatic layout mode a dropped node is pinned and the rest of the graph flows around it as one `layout` transaction, animated under the layout motion role (one step under reduced motion). "Send auto-reply" starts pinned. The Toggle group sets `autoLayout` and calls `layout()`; the layout control and Undo/Redo are opted in through `controls`; `tp-layout-complete` reports the direction and the statistics.',
  ),
  example(
    'Read-only dependency viewer',
    '<tp-flow label="Dependencies" mode="view" readonly minimap fit-view data-schema="workflow" data-generate="30"></tp-flow>',
    'A generated grid of orthogonal edges through `router="orthogonal"`: every edge avoids the padded node boxes and parallel segments are spread apart. `mode="view"` hides the ports, the node toolbar and the editing actions; `readonly` refuses edits while pan, zoom, selection and focus keep working; the minimap pans on press and drag and zooms on wheel.',
  ),
  example(
    'Controlled owner',
    '<tp-flow label="Support triage" fit-view confirm-delete data-schema="workflow" data-document="workflow" data-controlled data-validate data-output></tp-flow>',
    'A controlled owner holds the document and writes every accepted proposal back to `value`; the widget keeps the proposed geometry while the owner is late and drops it when the owner refuses. `isValidConnection` refuses a connection into "Send auto-reply" from anything but the condition. `confirm-delete` asks before nodes are deleted from the keyboard, the node toolbar or the context menu: an Alert dialog over the blurred widget names the node (or the count), and Delete removes the nodes with their edges in one change.',
  ),
  example(
    'Declarative nodes',
    `<tp-flow label="Front door" fit-view data-schema="workflow" data-output>
  <tp-flow-node id="bell" type="trigger" x="40" y="80" label="Doorbell pressed"></tp-flow-node>
  <tp-flow-node id="light" type="action" x="400" y="80" label="Turn on porch light">
    <tp-field orientation="horizontal" label="Only after dark">
      <tp-switch data-flow-property="afterDark"></tp-switch>
    </tp-field>
  </tp-flow-node>
  <tp-flow-edge id="bell-light" source="bell" source-port="out" target="light" target-port="in" label="then" marker-end="arrowclosed"></tp-flow-edge>
  <tp-button slot="top-end" variant="outline" size="sm">Save</tp-button>
</tp-flow>`,
    'Light-DOM `tp-flow-node` and `tp-flow-edge` children are adopted into the document by id and the authored node elements stay the rendered hosts. Authored content renders inside the card; a library control marked `data-flow-property` edits that key of the node data through the document lane. Dragging writes back only the owned `x`, `y`, `width` and `height` attributes. Panel slots (the four corners and the four edge middles) hold consumer panels.',
  ),
  example(
    'In a form',
    `<tp-form data-form-output>
  <tp-field label="Pipeline" description="The document submits as JSON under its name.">
    <tp-flow name="pipeline" size="sm" required fit-view data-schema="workflow" data-document="workflow"></tp-flow>
  </tp-field>
  <div slot="actions">
    <tp-button type="submit">Save</tp-button>
    <tp-button type="reset" variant="outline">Reset</tp-button>
  </div>
</tp-form>`,
    'The widget is a form control: the canonical document submits as JSON under `name`, `required` fails on an empty document, Reset restores the default through `form-reset`, and the Field label focuses the canvas. `size="sm"` tightens the node width, ports, handles and the intrinsic height.',
  ),
];
