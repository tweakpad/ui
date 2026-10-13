import { WIDGET_REGISTER_IMPORTS, interactiveMarkupExample } from '../documentation-examples.js';
import { setupFlowExample } from './flow-example.js';
import setupSource from './flow-example.js?raw';

function example(title: string, content: string, description: string) {
  const id = 'flow-' + title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return interactiveMarkupExample(
    title,
    `<div id="${id}">${content}</div>`,
    setupFlowExample,
    `${setupSource}\nsetupFlowExample(document.getElementById('${id}'));`,
    description,
    { registerImports: WIDGET_REGISTER_IMPORTS },
  );
}

export const flowExamples = [
  example(
    'Material graph',
    '<tp-flow label="Material" show-port-labels fit-view data-schema="material" data-document="material" data-output></tp-flow>',
    'Panel nodes from the schema: a toned header, rows of label + Select, Slider, Color picker, Checkbox or NumberField control, labelled typed ports and Bézier edges (`rules.defaultEdgeKind`). A control inside a node proposes a `node-data` change on the document lane with `metadata.nodeId` and `property`; the Material node is resizable.',
  ),
  example(
    'Vertical pipeline',
    '<tp-flow label="Release pipeline" palette fit-view data-schema="pipeline" data-document="pipeline" data-output></tp-flow>',
    'Compact icon nodes with ports on their top and bottom sides, orthogonal edges routed around the nodes, arrow markers and branch labels as Badge pills. The build path is `animated`: its dashed stroke marches from source to target (a closed arrow keeps the direction when reduced motion pauses it). With `palette` on, every label carries a "+" Button that opens the node library and inserts the chosen node on that edge; releasing a connection on the empty pane offers the same palette at the drop point.',
  ),
  example(
    'Pipeline with inspector',
    `<tp-flow label="Release pipeline" inspector="auto" inspector-commit="explicit" default-inspector-open default-selection='{"nodes":["p3"],"edges":[]}' fit-view data-schema="pipeline" data-document="pipeline" data-output></tp-flow>`,
    'The inspector holds the settings the schema keeps off the node: compact nodes have no body rows, so their properties default to `placement: "inspector"`. Double press a step or the approval (or use Settings in the node toolbar or the context menu) to open it; it docks inline-end inside the widget as a Resizable panel, follows a single selected node with settings and closes when the selection leaves them. Settings edits those properties through the library control each one names, Wiring lists the connections, Run shows the status. `inspector-commit="explicit"` keeps edits local until Save (one proposal per edited key) and Cancel reverts them.',
  ),
  example(
    'Animated edges',
    '<tp-flow label="Edge kinds" fit-view controls="" data-schema="workflow" data-document="edges"></tp-flow>',
    'An `animated` edge draws its stroke dashed and marches the dash from source to target, so the direction of flow reads at a glance on every kind (`bezier`, `smoothstep`, `step`, `straight`, `orthogonal`). An animated edge without its own `markerEnd` gets a closed arrow, which keeps the direction visible when reduced motion pauses the dash. Set it per edge (`animated: true`, or the `animated` attribute of a `tp-flow-edge`); a running node animates its active edges the same way.',
  ),
  example(
    'Toolbars and panels',
    `<tp-flow label="Lead pipeline" fit-view controls="zoom-out zoom zoom-in fit" controls-position="bottom-center" controls-orientation="horizontal" data-schema="workflow" data-document="workflow" data-history-readout>
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
<tp-flow id="flow-auto-layout" label="Lead pipeline" auto-layout="horizontal" controls="zoom-in zoom-out fit tool lock layout undo redo" fit-view data-schema="workflow" data-document="workflow" data-pin="notify" data-layout-readout></tp-flow>`,
    'In an automatic layout mode a dropped node is pinned and the rest of the graph flows around it as one `layout` transaction, animated under the layout motion role (one step under reduced motion). "Notify sales" starts pinned. The Toggle group sets `autoLayout` and calls `layout()`; the layout control and Undo/Redo are opted in through `controls`; `tp-layout-complete` reports the direction and the statistics.',
  ),
  example(
    'Read-only dependency viewer',
    '<tp-flow label="Dependencies" mode="view" readonly minimap fit-view data-schema="workflow" data-generate="30"></tp-flow>',
    'A generated grid of orthogonal edges through `router="orthogonal"`: every edge avoids the padded node boxes and parallel segments are spread apart. `mode="view"` hides the ports, the node toolbar and the editing actions; `readonly` refuses edits while pan, zoom, selection and focus keep working; the minimap pans on press and drag and zooms on wheel.',
  ),
  example(
    'Controlled owner',
    `<tp-flow label="Lead pipeline" fit-view data-schema="workflow" data-document="workflow" data-controlled data-validate data-confirm-delete="flow-delete-dialog" data-output></tp-flow>
<tp-dialog id="flow-delete-dialog" label="Delete from the pipeline?" description="Dependent edges are removed with their nodes.">
  <tp-button slot="footer" variant="destructive" data-confirm>Delete</tp-button>
  <tp-button slot="close" variant="outline">Cancel</tp-button>
</tp-dialog>`,
    'A controlled owner holds the document and writes every accepted proposal back to `value`; the widget keeps the proposed geometry while the owner is late and drops it when the owner refuses. `isValidConnection` refuses a connection into "Notify sales" from anything but the condition. Deleting cancels `tp-delete`, asks in a Dialog and then deletes the same nodes and dependent edges through `deleteElements()`.',
  ),
  example(
    'Declarative nodes',
    `<tp-flow label="Notifications" fit-view data-schema="workflow" data-output>
  <tp-flow-node id="hook" type="trigger" x="40" y="80" label="Webhook"></tp-flow-node>
  <tp-flow-node id="send" type="action" x="400" y="80" label="Send email">
    <tp-field orientation="horizontal" label="Urgent">
      <tp-switch data-flow-property="urgent"></tp-switch>
    </tp-field>
  </tp-flow-node>
  <tp-flow-edge id="hook-send" source="hook" source-port="out" target="send" target-port="in" label="then" marker-end="arrowclosed"></tp-flow-edge>
  <tp-button slot="top-end" variant="outline" size="sm">Publish</tp-button>
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
