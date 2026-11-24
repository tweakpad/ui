import type { TemplateResult } from 'lit';
import type { ChangeReason } from '../../foundation/types.js';
import type {
  FlowChange,
  FlowConnection,
  FlowEdge,
  FlowEdgeKind,
  FlowIssue,
  FlowNode,
  FlowNodeDefinition,
  FlowPoint,
  FlowPortInstance,
  FlowPropertyControl,
  FlowPropertyDefinition,
  FlowResolvedPort,
  FlowSelection,
  FlowSide,
  FlowViewport,
} from '../../foundation/flow/types.js';
import type {
  FlowNodeRunState,
  FlowRunScope,
  FlowRunSummary,
} from '../../foundation/flow/run/types.js';

export type { FlowViewport, FlowSelection };

export const FLOW_TOOLS = ['select', 'pan'] as const;
/** The pointer tool: select, where a pane drag draws a marquee, or pan. */
export type FlowTool = (typeof FLOW_TOOLS)[number];
export const FLOW_MODES = ['design', 'view'] as const;
/** Design mode for editing, or view mode for reading and monitoring with editing off. */
export type FlowMode = (typeof FLOW_MODES)[number];
export const FLOW_AUTO_LAYOUTS = ['none', 'horizontal', 'vertical', 'smart'] as const;
/** Whether the graph lays itself out after every change, and in which direction. */
export type FlowAutoLayout = (typeof FLOW_AUTO_LAYOUTS)[number];
export const FLOW_BACKGROUNDS = ['dots', 'lines', 'cross', 'none'] as const;
/** The pattern drawn behind the canvas. */
export type FlowBackground = (typeof FLOW_BACKGROUNDS)[number];
/**
 * Where a floating panel anchors: the four corners and the middle of the four edges, as
 * `block-inline` pairs in logical directions.
 */
export const FLOW_PANEL_POSITIONS = [
  'top-start',
  'top-center',
  'top-end',
  'center-start',
  'center-end',
  'bottom-start',
  'bottom-center',
  'bottom-end',
] as const;
/** Where a floating panel anchors over the canvas. */
export type FlowPanelPosition = (typeof FLOW_PANEL_POSITIONS)[number];
/** The opt-in header's slots above the canvas: its start, center and end. */
export const FLOW_HEADER_SLOTS = ['header-start', 'header-center', 'header-end'] as const;
export type FlowHeaderSlot = (typeof FLOW_HEADER_SLOTS)[number];
/** Named slots for authored content: the panels and the header. */
export type FlowSlotRegion = FlowPanelPosition | FlowHeaderSlot;
export const FLOW_SLOT_REGIONS: readonly FlowSlotRegion[] = [
  ...FLOW_PANEL_POSITIONS,
  ...FLOW_HEADER_SLOTS,
];
export const FLOW_WHEEL_POLICIES = ['pan', 'zoom', 'none'] as const;
/** What a plain mouse wheel does over the canvas: pan, zoom, or nothing so the page scrolls. */
export type FlowWheelPolicy = (typeof FLOW_WHEEL_POLICIES)[number];
export const FLOW_INSPECTOR_POLICIES = ['none', 'auto', 'manual'] as const;
/** When the inspector panel shows: opened from a node, only through the open state, or never. */
export type FlowInspectorPolicy = (typeof FLOW_INSPECTOR_POLICIES)[number];
/** How the node library shows: none, a sidebar at the inline start or a menu over the widget. */
export const FLOW_PALETTE_LAYOUTS = ['none', 'sidebar', 'menu'] as const;
/** How the node library shows. */
export type FlowPaletteLayout = (typeof FLOW_PALETTE_LAYOUTS)[number];
export const FLOW_CONTROL_ACTIONS = [
  'zoom-in',
  'zoom-out',
  'zoom',
  'fit',
  'tool',
  'lock',
  'layout',
  'undo',
  'redo',
  'run',
  'palette',
  'execute',
  'run-summary',
] as const;
/** A built-in control the controls bar can show. */
export type FlowControlAction = (typeof FLOW_CONTROL_ACTIONS)[number];
/** Whether the marquee selects the nodes it touches or only those it encloses. */
export type FlowSelectionMode = 'partial' | 'full';
/** The level of detail nodes render at; low below the detail zoom. */
export type FlowLod = 'high' | 'low';

/** Metadata carried by every value-lane proposal. */
export interface FlowChangeMetadata extends Record<string, unknown> {
  changes: readonly FlowChange[];
  transaction?: string;
  surface?:
    'node' | 'edge' | 'pane' | 'inspector' | 'toolbar' | 'menu' | 'palette' | 'keyboard' | 'api';
  nodeId?: string;
  edgeId?: string;
  property?: string;
  history?: 'undo' | 'redo';
  reconnect?: { edgeId: string; end: 'source' | 'target' };
  insert?: { type: string; at: FlowPoint };
  animated?: boolean;
  /** A group command: what it did and the group it acted on. */
  group?: {
    action: 'group' | 'ungroup' | 'collapse' | 'expand' | 'expose' | 'reparent' | 'port';
    groupId: string;
  };
}

/**
 * Metadata of a `tp-path-change` proposal: where the move into or out of a group came from and the
 * group it entered or left.
 */
export interface FlowPathChangeMetadata extends Record<string, unknown> {
  surface: 'node' | 'breadcrumb' | 'keyboard' | 'menu' | 'api';
  groupId?: string;
}

/**
 * `tp-connect`: a cancelable connection about to be added. A listener may change `edge`. When the
 * connection crosses group borders, `exposed` lists the group ports and the edges the widget adds
 * to carry it through them.
 */
export interface FlowConnectDetail {
  connection: FlowConnection;
  edge: FlowEdge;
  reason: ChangeReason;
  sourceEvent: Event | undefined;
  exposed?: {
    ports: { nodeId: string; port: FlowPortInstance }[];
    edges: FlowEdge[];
  };
}

/**
 * What a node template receives: the node, its definition and state, and helpers that render its
 * ports and controls.
 */
export interface FlowNodeRenderContext {
  node: FlowNode;
  definition: FlowNodeDefinition | undefined;
  selected: boolean;
  dragging: boolean;
  lod: FlowLod;
  status: FlowNodeRunState | undefined;
  /** Renders the ports declared for one side. */
  ports: (side: FlowSide) => TemplateResult;
  /** Renders the library control bound to a property key. */
  control: (key: string) => TemplateResult;
}
/** Renders the body of a node type in place of the built-in body. */
export type FlowNodeTemplate = (context: FlowNodeRenderContext) => TemplateResult;

/** What an edge template receives: the edge, its kind, selection and label text. */
export interface FlowEdgeRenderContext {
  edge: FlowEdge;
  kind: FlowEdgeKind;
  selected: boolean;
  label: string | undefined;
}
/** Renders an edge's label content in place of the plain text. */
export type FlowEdgeTemplate = (context: FlowEdgeRenderContext) => TemplateResult;

/**
 * What a property control factory receives: the node, the property, its value and callbacks to
 * propose and commit edits.
 */
export interface FlowPropertyControlContext {
  node: FlowNode;
  definition: FlowPropertyDefinition;
  value: unknown;
  disabled: boolean;
  readOnly: boolean;
  /** Proposes a new value for the property with the control's own reason. */
  propose: (value: unknown, reason: ChangeReason, sourceEvent?: Event) => boolean;
  /** Announces that the control's interaction settled. */
  commit: (reason: ChangeReason) => void;
  /** Connected input port overriding this property, if any. */
  port: FlowResolvedPort | undefined;
  id: string;
  /**
   * The control is a node body row: a control with an inline variant renders it and shows the
   * property's label itself. In the inspector a Field labels the control instead.
   */
  inline: boolean;
}
/** Renders the control that edits one node property. */
export type FlowPropertyControlFactory = (context: FlowPropertyControlContext) => TemplateResult;
/**
 * Property control factories keyed by control name, replacing built-in ones or supplying `custom`.
 */
export type FlowPropertyControls = Partial<Record<FlowPropertyControl, FlowPropertyControlFactory>>;

/** What a node toolbar template receives: the selected node and its definition. */
export interface FlowToolbarContext {
  node: FlowNode;
  definition: FlowNodeDefinition | undefined;
}
/** Renders the content of the toolbar over a selected node. */
export type FlowNodeToolbarTemplate = (context: FlowToolbarContext) => TemplateResult;

/**
 * What a context menu opened on: a node, an edge or a point on the pane, with the current
 * selection.
 */
export type FlowContextSubject =
  | {
      kind: 'node';
      nodeId: string;
      selection: FlowSelection;
      /** The node is a group, so its menu offers the group commands. */
      group?: boolean;
    }
  | { kind: 'edge'; edgeId: string; selection: FlowSelection }
  | { kind: 'pane'; point: FlowPoint; selection: FlowSelection };
/** Renders the context menu items for a node, an edge or the pane. */
export type FlowContextMenuTemplate = (subject: FlowContextSubject) => TemplateResult;

export interface FlowStrings {
  label: string;
  instructions: string;
  node: string;
  edge: string;
  edgeFrom: string;
  input: string;
  output: string;
  port: string;
  selected: string;
  zoomIn: string;
  zoomOut: string;
  fitView: string;
  /** Zoom field name and its menu (`{percent}` in `zoomToLevel`). */
  zoomLevel: string;
  zoomOptions: string;
  zoomToFit: string;
  zoomToLevel: string;
  selectTool: string;
  panTool: string;
  lock: string;
  unlock: string;
  layout: string;
  undo: string;
  redo: string;
  play: string;
  pause: string;
  stepBack: string;
  stepForward: string;
  position: string;
  minimap: string;
  panUp: string;
  panDown: string;
  panLeft: string;
  panRight: string;
  palette: string;
  /** Region name of the palette, `{flow}` = the graph's name (landmarks must be unique). */
  paletteLabel: string;
  /** Shown when the library's search matches nothing. */
  noResults: string;
  /** Section of definitions without a category. */
  uncategorized: string;
  /** Announced when a click arms placement, `{label}` = the definition. */
  announcePlacing: string;
  /** Tooltip of a library item. */
  dragToPlace: string;
  /** Region name of the inspector, `{flow}` = the graph's name. */
  inspectorLabel: string;
  searchNodes: string;
  inspector: string;
  settings: string;
  wiring: string;
  run: string;
  save: string;
  cancel: string;
  close: string;
  addNode: string;
  duplicate: string;
  copy: string;
  cut: string;
  paste: string;
  delete: string;
  /** Delete confirmation title for one node (`{name}`) and for several (`{count}`). */
  confirmDeleteNode: string;
  confirmDeleteNodes: string;
  confirmDeleteDescription: string;
  pin: string;
  unpin: string;
  editLabel: string;
  addWaypoint: string;
  alignLeft: string;
  alignTop: string;
  distributeHorizontally: string;
  distributeVertically: string;
  reverse: string;
  selectAll: string;
  waypoint: string;
  resize: string;
  reconnectSource: string;
  reconnectTarget: string;
  custom: string;
  announceMoved: string;
  announceConnected: string;
  announceCandidate: string;
  announceDeleted: string;
  announceSelected: string;
  announceCleared: string;
  announceLayout: string;
  announceZoom: string;
  announceStatus: string;
  statusIdle: string;
  statusPending: string;
  statusRunning: string;
  statusWaiting: string;
  statusSuccess: string;
  statusFailed: string;
  statusSkipped: string;
  statusCancelled: string;
}

// ---- Constituent panels and handles ------------------------------------------------------------

/**
 * `tp-run-request`: a user (or `requestRun()`) asked the backend to run, stop or clear. The widget
 * never executes anything; `nodeIds` is the scope in execution order over the current graph.
 */
export interface FlowRunRequestDetail {
  action: 'run' | 'stop' | 'clear';
  scope?: FlowRunScope;
  nodeId?: string;
  nodeIds: readonly string[];
  reason: ChangeReason;
  sourceEvent?: Event;
}

/** `tp-issues-change`: the problems shown changed (computed with `validate` plus `issues`). */
export interface FlowIssuesChangeDetail {
  issues: readonly FlowIssue[];
}

/** What the `execute` and `run-summary` controls show. */
export interface FlowRunControlState {
  /** The widget accepts run requests (`runnable`, not disabled). */
  runnable: boolean;
  /** A run is in progress (running or paused): Run becomes Stop. */
  running: boolean;
  /** A run exists to clear. */
  hasRun: boolean;
  /** The single selected node the node-scoped commands use. */
  selectedNode: string | undefined;
  summary: FlowRunSummary;
}

/** Playback state the controls' run transport shows while the `run` action is listed. */
export interface FlowRunTransportState {
  playing: boolean;
  /** Current step, 0 to `length`. */
  index: number;
  length: number;
}

/** Phase of a handle gesture (pointer or keyboard). */
export type FlowGesturePhase = 'start' | 'move' | 'end' | 'cancel';

export type FlowResizeCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Strings of the constituent panels and handles; merged into `FlowStrings`. */
export interface FlowStrings {
  controls: string;
  tool: string;
  nodeToolbar: string;
  resizeTopLeft: string;
  resizeTopRight: string;
  resizeBottomLeft: string;
  resizeBottomRight: string;
  horizontal: string;
  vertical: string;
  segment: string;
  incoming: string;
  outgoing: string;
  noConnections: string;
  noSelection: string;
  focusEdge: string;
  status: string;
  attempts: string;
  duration: string;
  message: string;
  error: string;
  noRun: string;
  warnings: string;
  progress: string;
  waitingFor: string;
  runGraph: string;
  runNode: string;
  runFrom: string;
  runTo: string;
  runSelected: string;
  runFromSelected: string;
  runToSelected: string;
  runOptions: string;
  stop: string;
  clearRun: string;
  runSummary: string;
  summaryFailed: string;
  summaryWarnings: string;
  summaryWaiting: string;
  summaryPending: string;
  summaryRunning: string;
  summarySuccess: string;
  problems: string;
  ariaWarnings: string;
  ariaError: string;
}

/** Strings of groups, their boundary terminals and the path; merged into `FlowStrings`. */
export interface FlowStrings {
  /** Name of a group, as the default label of a new one. */
  group: string;
  /** Name of the terminal that lists a group's inputs inside it. */
  groupInputs: string;
  /** Name of the terminal that lists a group's outputs inside it. */
  groupOutputs: string;
  /** Role description of a group's Inputs and Outputs terminals. */
  terminal: string;
  /** Command that opens the sub-view of a group. */
  enterGroup: string;
  /** Command that returns to the view the current group sits in. */
  exitGroup: string;
  /** Command that wraps the selected nodes in a new group. */
  groupSelection: string;
  /** Command that dissolves a group and keeps its members. */
  ungroup: string;
  /** Command and Button name that collapses a group to one node. */
  collapseGroup: string;
  /** Command and Button name that shows a collapsed group's members again. */
  expandGroup: string;
  /** Command that moves a member to the view its group sits in. */
  moveOutOfGroup: string;
  /** Command that adds an input to a group. */
  addInput: string;
  /** Command that adds an output to a group. */
  addOutput: string;
  /** Name of the Button that removes a group port, `{name}` = the port. */
  removePort: string;
  /** Name of the field that renames a group port. */
  portName: string;
  /** Heading of a group's port list in the inspector. */
  ports: string;
  /** Member count of a group, `{count}` = the number of direct members. */
  groupMembers: string;
  /** Name of the path Breadcrumb, `{flow}` = the graph's name (landmarks must be unique). */
  groupPath: string;
  /** Command that returns a moved terminal to its automatic place. */
  resetPosition: string;
  /** State in the name of a group that shows its members. */
  ariaGroupExpanded: string;
  /** State in the name of a group shown as one node. */
  ariaGroupCollapsed: string;
  /** Announced on entering a group, `{label}` = the group. */
  announceEntered: string;
  /** Announced on leaving a group, `{label}` = the group. */
  announceExited: string;
  /** Announced after grouping, `{label}` = the new group, `{count}` = its members. */
  announceGrouped: string;
  /** Announced after ungrouping, `{label}` = the dissolved group. */
  announceUngrouped: string;
  /** Announced after collapsing, `{label}` = the group. */
  announceCollapsed: string;
  /** Announced after expanding, `{label}` = the group. */
  announceExpanded: string;
  /** Announced after moving nodes in or out, `{count}` = the nodes, `{label}` = their new parent. */
  announceMovedToGroup: string;
}
