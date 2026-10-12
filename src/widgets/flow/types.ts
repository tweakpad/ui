import type { TemplateResult } from 'lit';
import type { ChangeReason } from '../../foundation/types.js';
import type {
  FlowChange,
  FlowEdge,
  FlowEdgeKind,
  FlowNode,
  FlowNodeDefinition,
  FlowPoint,
  FlowPropertyControl,
  FlowPropertyDefinition,
  FlowResolvedPort,
  FlowSelection,
  FlowSide,
  FlowViewport,
} from '../../foundation/flow/types.js';
import type { FlowNodeRunState } from '../../foundation/flow/run/types.js';

export type { FlowViewport, FlowSelection };

export const FLOW_TOOLS = ['select', 'pan'] as const;
export type FlowTool = (typeof FLOW_TOOLS)[number];
export const FLOW_MODES = ['design', 'view'] as const;
export type FlowMode = (typeof FLOW_MODES)[number];
export const FLOW_AUTO_LAYOUTS = ['none', 'horizontal', 'vertical', 'smart'] as const;
export type FlowAutoLayout = (typeof FLOW_AUTO_LAYOUTS)[number];
export const FLOW_BACKGROUNDS = ['dots', 'lines', 'cross', 'none'] as const;
export type FlowBackground = (typeof FLOW_BACKGROUNDS)[number];
export const FLOW_CORNERS = ['top-start', 'top-end', 'bottom-start', 'bottom-end'] as const;
export type FlowCorner = (typeof FLOW_CORNERS)[number];
export const FLOW_WHEEL_POLICIES = ['pan', 'zoom', 'none'] as const;
export type FlowWheelPolicy = (typeof FLOW_WHEEL_POLICIES)[number];
export const FLOW_INSPECTOR_POLICIES = ['none', 'auto', 'manual'] as const;
export type FlowInspectorPolicy = (typeof FLOW_INSPECTOR_POLICIES)[number];
export const FLOW_CONTROL_ACTIONS = [
  'zoom-in',
  'zoom-out',
  'fit',
  'tool',
  'lock',
  'layout',
  'undo',
  'redo',
  'run',
] as const;
export type FlowControlAction = (typeof FLOW_CONTROL_ACTIONS)[number];
export type FlowSelectionMode = 'partial' | 'full';
export type FlowLod = 'high' | 'low';

/** Metadata carried by every value-lane proposal (Widgets §6.3 Events). */
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
}

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
export type FlowNodeTemplate = (context: FlowNodeRenderContext) => TemplateResult;

export interface FlowEdgeRenderContext {
  edge: FlowEdge;
  kind: FlowEdgeKind;
  selected: boolean;
  label: string | undefined;
}
export type FlowEdgeTemplate = (context: FlowEdgeRenderContext) => TemplateResult;

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
}
export type FlowPropertyControlFactory = (context: FlowPropertyControlContext) => TemplateResult;
export type FlowPropertyControls = Partial<Record<FlowPropertyControl, FlowPropertyControlFactory>>;

export interface FlowToolbarContext {
  node: FlowNode;
  definition: FlowNodeDefinition | undefined;
}
export type FlowNodeToolbarTemplate = (context: FlowToolbarContext) => TemplateResult;

export type FlowContextSubject =
  | { kind: 'node'; nodeId: string; selection: FlowSelection }
  | { kind: 'edge'; edgeId: string; selection: FlowSelection }
  | { kind: 'pane'; point: FlowPoint; selection: FlowSelection };
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
}
