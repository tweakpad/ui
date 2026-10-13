import { html, nothing, render, type PropertyValues, type TemplateResult } from 'lit';
import { TpFormElement } from '../../foundation/form-element.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { TpValueChangeEvent, type TpChangeEventOptions } from '../../foundation/events.js';
import { Scheduler, CleanupScope } from '../../foundation/services.js';
import { observeResize } from '../../foundation/observation.js';
import { createId } from '../../foundation/id.js';
import {
  interactiveTargetInPath,
  editableTargetInPath,
} from '../../foundation/interactive-target.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import {
  resolvesReducedMotion,
  prepareMotion,
  stateRole,
  type MotionDriver,
  type MotionPlayback,
} from '../../foundation/motion.js';
import type { ChangeReason } from '../../foundation/types.js';
import type { PanZoomPolicy } from '../../foundation/pan-zoom.js';
import { wheelScrollContainer } from '../../foundation/scroll.js';
import { surfaceInteraction } from '../../foundation/surface-focus.js';
import { inspectorProperties } from '../../foundation/flow/defaults.js';
import {
  createRoutingPlanner,
  type FlowRoutingPlannerOptions,
} from '../../foundation/flow/router/planner.js';
import type {
  FlowRouter,
  FlowRoutingPlanner,
  FlowRoutingSource,
} from '../../foundation/flow/router/types.js';
import { resolveEndpoint } from '../../foundation/flow/edges/endpoints.js';
import { FlowModel, type FlowTransaction } from '../../foundation/flow/model/model.js';
import { KeyBindingOwner } from '../../foundation/key-bindings.js';
import { copyData } from '../../foundation/clipboard.js';
import { layoutFlow } from '../../foundation/flow/layout/layered-layout.js';
import { cssTimeMs } from '../../foundation/reveal-playback.js';
import {
  alignNodes,
  distributeNodes,
  type AlignItem,
  type AlignMode,
  type MovedItem,
} from '../../foundation/flow/layout/align.js';
import type {
  FlowLayoutEngine,
  FlowLayoutRequestDirection,
  FlowLayoutResult,
  FlowLayoutSource,
} from '../../foundation/flow/layout/types.js';
import type { FlowPortDirection } from '../../foundation/flow/edges/endpoints.js';
import { FlowPointerArbiter } from './interaction/arbiter.js';
import type { FlowInteractionHost } from './interaction/host.js';
type ConnectionStartInfo = {
  nodeId: string;
  portId: string | undefined;
  direction: FlowPortDirection;
};
import {
  FLOW_CLIPBOARD_TYPE,
  parseClipboardPayload,
  pasteChanges,
  serializeSelection,
  type FlowClipboardPayload,
} from './interaction/clipboard.js';
import { nextNodeInDirection, type FlowArrowKey } from './interaction/keyboard.js';
import { insertWaypoint } from './interaction/waypoints.js';
import { TpMenu } from '../../components/menu/menu.js';
import { TpMenuItem } from '../../components/menu/menu-item.js';
import { TpSeparator } from '../../components/separator/separator.js';
import { TpOpenChangeEvent } from '../../foundation/events.js';
import { TpButton } from '../../components/button/button.js';
import { copyIcon } from '../../icons/copy.js';
import { trashIcon } from '../../icons/trash.js';
import { pinIcon } from '../../icons/pin.js';
import { settingsIcon } from '../../icons/settings.js';
import {
  TpFlowControls,
  CONTROL_ACTION,
  TOOL_REQUEST,
  RUN_ACTION,
  ZOOM_REQUEST,
  ZOOM_FIT_KEYS,
  ZOOM_RESET_KEYS,
  DEFAULT_ZOOM_PRESETS,
  controlActionsConverter,
  type FlowControlActionDetail,
  type FlowToolRequestDetail,
  type FlowRunActionDetail,
  type FlowZoomRequestDetail,
} from './panels/controls.js';
import {
  TpFlowMinimap,
  MINIMAP_STEP,
  MINIMAP_PAN,
  type FlowMinimapStepDetail,
  type FlowMinimapPanDetail,
} from './panels/minimap.js';
import {
  TpFlowPalette,
  PALETTE_INSERT,
  PALETTE_CLOSE,
  PALETTE_DRAG_TYPE,
  type FlowPaletteInsertDetail,
} from './panels/palette.js';
import {
  TpFlowInspector,
  INSPECTOR_CHANGE,
  INSPECTOR_COMMIT,
  INSPECTOR_FOCUS_EDGE,
  INSPECTOR_CLOSE,
  INSPECTOR_PRESENCE,
  type FlowInspectorChangeDetail,
  type FlowInspectorCommitDetail,
  type FlowInspectorFocusEdgeDetail,
  type FlowInspectorPresenceDetail,
} from './panels/inspector.js';
import { TpFlowNodeResizer, NODE_RESIZE, type FlowNodeResizeDetail } from './node/resizer.js';
import { TpFlowNodeToolbar } from './node/toolbar.js';
import {
  TpFlowEdgeEditor,
  EDGE_WAYPOINT,
  EDGE_WAYPOINT_REMOVE,
  EDGE_SEGMENT,
  EDGE_RECONNECT,
  EDGE_RECONNECT_KEY,
  type FlowEdgeWaypointDetail,
  type FlowEdgeWaypointRemoveDetail,
  type FlowEdgeSegmentDetail,
  type FlowEdgeReconnectDetail,
  type FlowEdgeReconnectKeyDetail,
} from './edge/edge-editor.js';
import type { ConnectionSession, ConnectionStart } from './interaction/connect.js';
import type { FlowChangeEvent, FlowMiddleware } from '../../foundation/flow/model/hooks.js';
import {
  parseFlowDocument,
  serializeFlowDocument,
} from '../../foundation/flow/model/serialization.js';
import type { FlowConnectionPredicate } from '../../foundation/flow/model/validation.js';
import { rectsIntersect, expandRect, snapPoint } from '../../foundation/flow/geometry.js';
import { DEFAULT_NODE_SIZE_BY_SHAPE } from '../../foundation/flow/defaults.js';
import {
  clampViewport,
  visibleRect,
  zoomToPoint,
  centerOn,
} from '../../foundation/flow/viewport.js';
import type { FlowRenderHost, FlowRenderer } from '../../foundation/flow/renderer.js';
import { pathPolyline, type FlowEdgePath } from '../../foundation/flow/edges/paths.js';
import type {
  FlowChange,
  FlowConnection,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowPoint,
  FlowPortGeometry,
  FlowRect,
  FlowSchema,
  FlowSelection,
  FlowSize,
  FlowViewport,
} from '../../foundation/flow/types.js';
import type {
  FlowEdgeRunState,
  FlowNodeRunState,
  FlowRun,
  FlowTrace,
} from '../../foundation/flow/run/types.js';
import { FlowRunPlayer } from '../../foundation/flow/run/player.js';
import { flowRunGraph } from '../../foundation/flow/run/state.js';
import type { IconDefinition } from '../../icons/types.js';
import { flowPresentation } from '../../presentation/families/flow.js';
import { setPartComposition } from '../../presentation/controller.js';
import {
  TpFlowNode,
  NODE_PROPERTY,
  NODE_PORTS_MOVED,
  type FlowNodePropertyDetail,
  type FlowPortState,
} from './node/node.js';
import { TpFlowPort, PORT_ACTIVATE, type FlowPortActivateDetail } from './node/port.js';
import { TpFlowEdge } from './edge/flow-edge.js';
import { TpFlowEdgeLabel, LABEL_PRESS, LABEL_ADD } from './edge/edge-label.js';
import { TpFlowBackground } from './panels/background.js';
import { DocumentLane } from './document-lane.js';
import { ViewportOwner } from './viewport-owner.js';
import { NodeLayer } from './layers/node-layer.js';
import { EdgeLayer } from './layers/edge-layer.js';
import { LightDomAdoption } from './adoption.js';
import { SvgFlowRenderer } from './renderers/svg-renderer.js';
import { defaultPropertyControls } from './node/property-controls.js';
import { flowStyles } from './styles.js';
import { DEFAULT_STRINGS, format, resolveStrings } from './strings.js';
import {
  FLOW_PANEL_POSITIONS,
  type FlowControlAction,
  type FlowAutoLayout,
  type FlowBackground,
  type FlowChangeMetadata,
  type FlowContextMenuTemplate,
  type FlowContextSubject,
  type FlowPanelPosition,
  type FlowRunTransportState,
  type FlowEdgeTemplate,
  type FlowInspectorPolicy,
  type FlowLod,
  type FlowMode,
  type FlowNodeTemplate,
  type FlowNodeToolbarTemplate,
  type FlowPropertyControls,
  type FlowSelectionMode,
  type FlowStrings,
  type FlowTool,
  type FlowWheelPolicy,
} from './types.js';

const EMPTY_DOCUMENT: FlowDocument = { version: 1, nodes: [], edges: [] };
const EMPTY_SELECTION: FlowSelection = { nodes: [], edges: [] };
const IDENTITY: FlowViewport = { x: 0, y: 0, zoom: 1 };
const MATERIALIZE_PER_FRAME = 12;
/**
 * New full hosts created per frame while the view moves; the overscan hides the lag. The cap
 * adapts to the measured frame interval: a frame that missed its deadline after creating hosts
 * halves it, frames within budget grow it back. Low-detail shells are cheap and take a flat cap.
 */
const CREATE_PER_FRAME_MAX = 8;
/** Quiet time after the last viewport change before deferred detail work resumes. */
const VIEW_SETTLE_MS = 120;
/** Selection changes announced to assistive technology (keyboard, marquee and Escape). */
const ANNOUNCED_SELECTION_REASONS: ReadonlySet<ChangeReason> = new Set([
  'keyboard',
  'hotkey',
  'selection',
  'escape-key',
]);
/** Properties whose change re-renders already materialized hosts and edges. */
const RENDER_HOOK_PROPERTIES = [
  'getNodeAriaLabel',
  'getEdgeAriaLabel',
  'nodeTemplates',
  'edgeTemplates',
  'propertyControls',
  'icons',
  'strings',
  'showPorts',
] as const;
/**
 * Motion roles of the flow widget. `flow-layout` is the presentational transition after a layout
 * commit: moved nodes glide from their previous positions and the edge layers fade in at their
 * final routes; one step under reduced motion. A consumer may claim it through
 * `tp-motion-request`.
 */
export const flowMotionRoles = {
  layout: stateRole('flow-layout'),
} as const;

/** Margins and gap kept between stacked panels (two panel margins plus a gap). */
const PANEL_RESERVE_GAP = 40;
const CREATE_PER_FRAME_MIN = 1;
const CREATE_SHELLS_PER_FRAME = 16;
/** Frame interval (ms) treated as a missed deadline / as comfortably within budget. */
const FRAME_SLOW_MS = 20;
const FRAME_FAST_MS = 17;
const DEFAULT_CONTROLS: readonly FlowControlAction[] = [
  'zoom-in',
  'zoom-out',
  'fit',
  'tool',
  'undo',
  'redo',
  'lock',
];

/** Last copied payload, so paste works where the clipboard API is unavailable. */
let clipboardFallback: FlowClipboardPayload | undefined;

/** Milliseconds of routing work per frame; the planner resumes on the next frame. */
const ROUTE_BUDGET_MS = 4;
const OVERSCAN = 0.5;

const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-field-value',
  'tp-open-change',
  'tp-open-change-complete',
  'tp-selection-change',
  'tp-viewport-change',
  'tp-tool-change',
  'tp-mode-change',
] as const;

function parseViewport(value: string | null): FlowViewport | undefined {
  if (value === null) return undefined;
  const [x, y, zoom] = value
    .trim()
    .split(/[\s,]+/)
    .map(Number);
  if (![x, y, zoom].every((part) => Number.isFinite(part))) return undefined;
  return { x: x!, y: y!, zoom: zoom! };
}

function parseSelection(value: string | null): FlowSelection | undefined {
  if (value === null) return undefined;
  try {
    const parsed = JSON.parse(value) as Partial<FlowSelection>;
    return {
      nodes: Array.isArray(parsed.nodes) ? parsed.nodes.map(String) : [],
      edges: Array.isArray(parsed.edges) ? parsed.edges.map(String) : [],
    };
  } catch {
    return undefined;
  }
}

function selectionsEqual(a: FlowSelection, b: FlowSelection): boolean {
  return orderedValuesEqual(a.nodes, b.nodes) && orderedValuesEqual(a.edges, b.edges);
}

function viewportsEqual(a: FlowViewport, b: FlowViewport): boolean {
  return a.x === b.x && a.y === b.y && a.zoom === b.zoom;
}

const documentConverter = {
  fromAttribute: (value: string | null): FlowDocument | undefined => {
    if (value === null) return undefined;
    try {
      return parseFlowDocument(value).document;
    } catch {
      return undefined;
    }
  },
  toAttribute: (): null => null,
};

/**
 * The flow widget (Widgets Specification 6.3): a node graph on a pannable, zoomable canvas with
 * typed ports, routed edges, schema-driven nodes, optional execution state, design and view
 * modes, automatic layout and visible-only rendering. The engine (`@tweakpad/ui/flow`) owns the
 * document, indices, history, routing, layout and run state; this element owns the lanes, the
 * layers and the interaction.
 */
export class TpFlow extends TpFormElement<FlowDocument> {
  static tagName = 'tp-flow';
  static override presentation = flowPresentation;
  static override shadowRootOptions: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static get elementDependencies() {
    return [
      TpFlowNode,
      TpFlowPort,
      TpFlowEdge,
      TpFlowEdgeLabel,
      TpFlowBackground,
      TpMenu,
      TpMenuItem,
      TpSeparator,
      TpButton,
      TpFlowControls,
      TpFlowMinimap,
      TpFlowPalette,
      TpFlowInspector,
      TpFlowNodeResizer,
      TpFlowNodeToolbar,
      TpFlowEdgeEditor,
    ];
  }
  static override properties = {
    ...TpFormElement.properties,
    value: { converter: documentConverter, noAccessor: true },
    defaultValue: { converter: documentConverter, attribute: 'default-value' },
    viewport: {
      converter: { fromAttribute: parseViewport, toAttribute: () => null },
      noAccessor: true,
    },
    defaultViewport: {
      converter: { fromAttribute: parseViewport, toAttribute: () => null },
      attribute: 'default-viewport',
    },
    selection: {
      converter: { fromAttribute: parseSelection, toAttribute: () => null },
      noAccessor: true,
    },
    defaultSelection: {
      converter: { fromAttribute: parseSelection, toAttribute: () => null },
      attribute: 'default-selection',
    },
    tool: { type: String, noAccessor: true },
    defaultTool: { type: String, attribute: 'default-tool' },
    mode: { type: String, noAccessor: true },
    defaultMode: { type: String, attribute: 'default-mode' },
    inspectorOpen: { type: Boolean, noAccessor: true, attribute: 'inspector-open' },
    defaultInspectorOpen: { type: Boolean, attribute: 'default-inspector-open' },
    schema: { attribute: false },
    nodeTemplates: { attribute: false },
    edgeTemplates: { attribute: false },
    propertyControls: { attribute: false },
    icons: { attribute: false },
    renderer: { attribute: false },
    router: { attribute: false },
    layoutEngine: { attribute: false },
    autoLayout: { type: String, attribute: 'auto-layout', reflect: true },
    isValidConnection: { attribute: false },
    middleware: { attribute: false },
    nodeToolbar: { attribute: false },
    contextMenu: { attribute: false },
    getNodeAriaLabel: { attribute: false },
    getEdgeAriaLabel: { attribute: false },
    run: { attribute: false },
    snap: { type: Boolean },
    snapGrid: { type: Number, attribute: 'snap-grid' },
    minZoom: { type: Number, attribute: 'min-zoom' },
    maxZoom: { type: Number, attribute: 'max-zoom' },
    detailZoom: { type: Number, attribute: 'detail-zoom' },
    virtualize: {
      type: Boolean,
      converter: {
        fromAttribute: (value: string | null) => value !== 'false',
        toAttribute: (value: boolean) => (value ? null : 'false'),
      },
    },
    fitView: { type: Boolean, attribute: 'fit-view' },
    fitPadding: { type: Number, attribute: 'fit-padding' },
    background: { type: String, reflect: true },
    wheel: { type: String },
    cooperativeGestures: { type: Boolean, attribute: 'cooperative-gestures' },
    connectionRadius: { type: Number, attribute: 'connection-radius' },
    connectionMode: { type: String, attribute: 'connection-mode' },
    connectOnClick: { type: Boolean, attribute: 'connect-on-click' },
    selectionMode: { type: String, attribute: 'selection-mode' },
    size: { type: String, reflect: true },
    label: { type: String },
    locale: { type: String },
    strings: { attribute: false },
    showPortLabels: { type: Boolean, attribute: 'show-port-labels' },
    showPorts: { type: Boolean, attribute: 'show-ports' },
    inspector: { type: String },
    inspectorCommit: { type: String, attribute: 'inspector-commit' },
    controls: { converter: controlActionsConverter },
    zoomPresets: { attribute: false },
    controlsPosition: { type: String, attribute: 'controls-position' },
    controlsOrientation: { type: String, attribute: 'controls-orientation' },
    minimap: { type: Boolean },
    minimapPosition: { type: String, attribute: 'minimap-position' },
    palette: { type: Boolean },
    palettePosition: { type: String, attribute: 'palette-position' },
    locked: { type: Boolean, reflect: true },
    onValueChange: { attribute: false },
    onValueCommitted: { attribute: false },
  };
  static override styles = [TpFormElement.styles, flowStyles];

  // ---- lanes -----------------------------------------------------------------------------------

  #providedValue: FlowDocument | undefined;
  defaultValue: FlowDocument | undefined;
  #providedViewport: FlowViewport | undefined;
  defaultViewport: FlowViewport | undefined;
  #providedSelection: FlowSelection | undefined;
  defaultSelection: FlowSelection | undefined;
  #providedTool: FlowTool | undefined;
  defaultTool: FlowTool | undefined;
  #providedMode: FlowMode | undefined;
  defaultMode: FlowMode | undefined;
  #providedInspectorOpen: boolean | undefined;
  defaultInspectorOpen: boolean | undefined;

  // ---- configuration ---------------------------------------------------------------------------

  schema: FlowSchema | undefined;
  nodeTemplates: Readonly<Record<string, FlowNodeTemplate>> = {};
  edgeTemplates: Readonly<Record<string, FlowEdgeTemplate>> = {};
  propertyControls: FlowPropertyControls = defaultPropertyControls;
  icons: Readonly<Record<string, IconDefinition>> = {};
  renderer: 'svg' | FlowRenderer = 'svg';
  router: 'auto' | 'orthogonal' | 'none' | FlowRouter = 'auto';
  layoutEngine: FlowLayoutEngine | undefined;
  autoLayout: FlowAutoLayout = 'none';
  isValidConnection: FlowConnectionPredicate | undefined;
  middleware: readonly FlowMiddleware[] = [];
  nodeToolbar: FlowNodeToolbarTemplate | false | undefined;
  contextMenu: FlowContextMenuTemplate | false | undefined;
  getNodeAriaLabel:
    | ((
        node: FlowNode,
        definition: ReturnType<FlowModel['definitionOf']>,
        status: FlowNodeRunState | undefined,
      ) => string)
    | undefined;
  getEdgeAriaLabel: ((edge: FlowEdge) => string) | undefined;
  /** A run snapshot, or a trace of run events played through the built-in stepper. */
  run: FlowRun | FlowTrace | null = null;
  snap = false;
  snapGrid = 16;
  minZoom = 0.1;
  maxZoom = 4;
  detailZoom = 0.3;
  virtualize = true;
  fitView = false;
  fitPadding = 48;
  background: FlowBackground = 'dots';
  wheel: FlowWheelPolicy = 'pan';
  cooperativeGestures = false;
  connectionRadius = 20;
  connectionMode: 'strict' | 'loose' = 'strict';
  connectOnClick = true;
  selectionMode: FlowSelectionMode = 'partial';
  size: 'sm' | 'default' | 'lg' = 'default';
  label = '';
  locale = '';
  strings: Partial<FlowStrings> = {};
  showPortLabels = false;
  /** Keeps ports visible in `mode="view"` (they hide there by default). */
  showPorts = false;
  inspector: FlowInspectorPolicy = 'auto';
  inspectorCommit: 'live' | 'explicit' = 'live';
  /** Built-in controls; `layout`, `undo`, `redo` and `run` opt in. */
  controls: readonly FlowControlAction[] = DEFAULT_CONTROLS;
  /** Zoom levels the zoom field's menu offers (1 is 100%). */
  zoomPresets: readonly number[] = DEFAULT_ZOOM_PRESETS;
  controlsPosition: FlowPanelPosition = 'bottom-start';
  controlsOrientation: 'vertical' | 'horizontal' = 'vertical';
  minimap = false;
  minimapPosition: FlowPanelPosition = 'bottom-end';
  palette = false;
  palettePosition: FlowPanelPosition = 'top-start';
  /** The lock control: editing refused while locked (pan, zoom and selection stay). */
  locked = false;
  onValueChange: ((event: TpValueChangeEvent<FlowDocument>) => void) | undefined;
  onValueCommitted:
    ((value: FlowDocument, previous: FlowDocument, reason: ChangeReason) => void) | undefined;

  // ---- internals -------------------------------------------------------------------------------

  readonly flowId = createId('tp-flow');
  readonly #model: FlowModel;
  readonly #lane: DocumentLane;
  readonly #viewportState: ControllableState<FlowViewport>;
  readonly #selectionState: ControllableState<FlowSelection>;
  readonly #toolState: ControllableState<FlowTool>;
  readonly #modeState: ControllableState<FlowMode>;
  readonly #inspectorState: ControllableState<boolean>;
  readonly #viewportOwner: ViewportOwner;
  readonly #nodeLayer: NodeLayer;
  readonly #edgeLayer: EdgeLayer;
  readonly #adoption: LightDomAdoption;
  readonly #announcer: LiveAnnouncer;
  #renderer: FlowRenderer = new SvgFlowRenderer();
  #rendererInstance: 'svg' | FlowRenderer = 'svg';
  #scheduler: Scheduler | undefined;
  #scope: CleanupScope | undefined;
  #frame: (() => void) | undefined;
  #createCap = CREATE_PER_FRAME_MAX;
  #movedAt = Number.NEGATIVE_INFINITY;
  #settleTimer: (() => void) | undefined;
  #controlsExtent = 0;
  #createdLastFrame = 0;
  #lastFrameAt = 0;
  #size: FlowSize = { width: 0, height: 0 };
  #fitted = false;
  #userPanned = false;
  #laneTick = false;
  #resolvedStrings: FlowStrings = DEFAULT_STRINGS;
  #focusedNode: string | undefined;
  #hoveredEdge: string | undefined;
  /** The edge whose focus proxy holds DOM focus (keyboard Delete and E cycling start there). */
  #focusedEdge: string | undefined;
  /** The same edge while its proxy shows keyboard focus: the only one drawn as focused. */
  #focusVisibleEdge: string | undefined;
  /** The node the inspector shows; kept while the panel slides out after closing. */
  #inspectorNode: FlowNode | undefined;
  /** The inspected node last kept clear of the panel (one reveal per node while open). */
  #revealedInspectorNode: string | undefined;
  /** Reveals start after the first update: an inspector open from the start keeps that view. */
  #revealArmed = false;
  #portStates = new Map<string, Record<string, FlowPortState>>();
  #composed = new WeakSet<HTMLElement>();
  #composition: unknown;
  #unsubscribeModel: (() => void) | undefined;
  #pendingPaths = new Map<string, FlowEdgePath>();
  #planner: FlowRoutingPlanner | undefined;
  #unsubscribePlanner: (() => void) | undefined;
  #arbiter: FlowPointerArbiter | undefined;
  #keys: KeyBindingOwner | undefined;
  #contextSubject: FlowContextSubject | undefined;
  #player: FlowRunPlayer | undefined;
  #unsubscribePlayer: (() => void) | undefined;
  #runState: FlowRun | undefined;
  #pendingInsert: { at: FlowPoint; source?: ConnectionStartInfo } | undefined;
  #resize:
    | {
        id: string;
        start: FlowRect;
        min: FlowSize;
        max: FlowSize | undefined;
        transaction: FlowTransaction;
      }
    | undefined;
  #waypointTransaction: FlowTransaction | undefined;
  /** After a waypoint is deleted: the waypoint to select next (-1 returns focus to the edge). */
  #refocusWaypoint: { edgeId: string; index: number } | undefined;
  #segment: { waypoints: FlowPoint[]; a: FlowPoint; b: FlowPoint } | undefined;
  #reconnectSession: ConnectionSession | undefined;
  readonly #viewportTicks = new Set<() => void>();

  constructor() {
    super();
    this.#model = new FlowModel({ history: {} });
    this.#lane = new DocumentLane({
      host: this,
      model: this.#model,
      readControlledValue: () => this.#providedValue,
      readDefaultValue: () => this.defaultValue,
      hasDefaultValue: () => this.defaultValue !== undefined,
      onChange: (event) => this.onValueChange?.(event),
      onCommitted: (value, previous, reason) => this.#committed(value, previous, reason),
      diagnostic: (message) => this.diagnose('flow-state', message),
    });
    this.#viewportState = new ControllableState<FlowViewport>({
      host: this,
      initialValue: IDENTITY,
      readControlledValue: () => this.#providedViewport,
      readDefaultValue: () => this.defaultViewport,
      hasDefaultValue: () => this.defaultViewport !== undefined,
      equals: viewportsEqual,
      eventFactory: (value, previous, reason, sourceEvent, options) =>
        new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-viewport-change'),
      onCommit: () => this.#viewportCommitted(),
    });
    this.#selectionState = new ControllableState<FlowSelection>({
      host: this,
      initialValue: EMPTY_SELECTION,
      readControlledValue: () => this.#providedSelection,
      readDefaultValue: () => this.defaultSelection,
      hasDefaultValue: () => this.defaultSelection !== undefined,
      equals: selectionsEqual,
      eventFactory: (value, previous, reason, sourceEvent, options) =>
        new TpValueChangeEvent(
          value,
          previous,
          reason,
          sourceEvent,
          options,
          'tp-selection-change',
        ),
      onCommit: (value, previous, reason) => {
        this.#nodeLayer.rebind(new Set([...previous.nodes, ...value.nodes]));
        this.#edgeLayer.invalidate();
        this.#selectionChanged(value, reason);
        this.#schedule();
      },
    });
    this.#toolState = new ControllableState<FlowTool>({
      host: this,
      initialValue: 'select',
      readControlledValue: () => this.#providedTool,
      readDefaultValue: () => this.defaultTool,
      hasDefaultValue: () => this.defaultTool !== undefined,
      eventFactory: (value, previous, reason, sourceEvent, options) =>
        new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-tool-change'),
    });
    this.#modeState = new ControllableState<FlowMode>({
      host: this,
      initialValue: 'design',
      readControlledValue: () => this.#providedMode,
      readDefaultValue: () => this.defaultMode,
      hasDefaultValue: () => this.defaultMode !== undefined,
      eventFactory: (value, previous, reason, sourceEvent, options) =>
        new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-mode-change'),
    });
    this.#inspectorState = new ControllableState<boolean>({
      host: this,
      initialValue: false,
      readControlledValue: () => this.#providedInspectorOpen,
      readDefaultValue: () => this.defaultInspectorOpen,
      hasDefaultValue: () => this.defaultInspectorOpen !== undefined,
      eventFactory: (value, previous, reason, sourceEvent, options) =>
        new TpValueChangeEvent(
          value,
          previous,
          reason,
          sourceEvent,
          { ...options, metadata: { ...options?.metadata, surface: 'inspector' } },
          'tp-open-change',
        ),
      onCommit: () => this.requestUpdate(),
    });
    this.#viewportOwner = new ViewportOwner({
      pane: () => this.#pane,
      wheelTarget: () => this.#canvas,
      transformTarget: () => this.#viewportElement,
      viewport: () => this.#viewportState.value,
      size: () => this.#size,
      limits: () => ({ minZoom: this.minZoom, maxZoom: this.maxZoom }),
      policy: () => this.#panPolicy(),
      filter: (event) => this.#panFilter(event),
      propose: (viewport, reason, sourceEvent, animated) =>
        this.#proposeViewport(viewport, reason, sourceEvent, animated),
      onFrame: () => this.#frameNow(),
      onGestureStart: () => {
        this.#userPanned = true;
        this.#pane?.toggleAttribute('data-panning', true);
      },
      onGestureEnd: () => this.#pane?.toggleAttribute('data-panning', false),
      reducedMotion: () => this.#reducedMotion(),
    });
    this.#nodeLayer = new NodeLayer({
      model: () => this.#model,
      container: () => this.#nodesContainer,
      slot: () => this.#nodeSlot,
      authored: () => this.#adoption.nodes,
      createHost: () => this.ownerDocument.createElement('tp-flow-node') as TpFlowNode,
      bind: (host, node) => this.#bindNode(host, node),
      zoom: () => this.#viewportState.value.zoom,
      lod: () => this.lod,
      onMeasured: (id, size, ports) => this.#measured(id, size, ports),
      onHostAdded: (host) => this.#hostAdded(host),
    });
    this.#edgeLayer = new EdgeLayer({
      model: () => this.#model,
      flowId: this.flowId,
      rendererHost: () => this.#rendererHost(),
      renderer: () => this.#renderer,
      labels: () => this.#labelsContainer,
      proxies: () => this.#proxiesContainer,
      createLabel: () => this.ownerDocument.createElement('tp-flow-edge-label') as TpFlowEdgeLabel,
      strings: () => this.#resolvedStrings,
      edgeTemplates: () => this.edgeTemplates,
      route: (edge) => this.#pendingPaths.get(edge.id),
      selected: () => new Set(this.#selectionState.value.edges),
      hovered: () => this.#hoveredEdge,
      focused: () => this.#focusVisibleEdge,
      runEdge: (id) => this.#runEdge(id),
      interactive: () => !this.effectiveDisabled,
      addable: () => this.palette && this.editable,
      nodeLabel: (id) => this.#nodeLabel(id),
      edgeAriaLabel: (edge) =>
        this.getEdgeAriaLabel?.(edge) ??
        EdgeLayer.ariaLabel(edge, this.#resolvedStrings, (id) => this.#nodeLabel(id)),
      viewport: () => this.#viewportState.value,
    });
    this.#adoption = new LightDomAdoption({
      host: this,
      model: () => this.#model,
      adopt: (changes) => this.#adoptChanges(changes),
      conflict: (id) =>
        this.diagnose(
          'flow-adoption-conflict',
          `Duplicate node or edge id "${id}" in the authored children.`,
        ),
      onChanged: () => {
        this.assignPanels();
        // Authored control bars take the current state as soon as they are slotted.
        this.#syncAuthoredControlBars();
        this.#schedule();
      },
    });
    this.#announcer = new LiveAnnouncer({
      root: () => (this.renderRoot instanceof ShadowRoot ? this.renderRoot : this),
    });
    for (const type of NESTED_EVENT_TYPES) this.addEventListener(type, this.#containNested, true);
    // Internal constituent events are not composed: authored (light-DOM) hosts reach the
    // element, pooled hosts reach the shadow root. Listen on both.
    this.#listenInternal(this);
  }

  #listenInternal(target: EventTarget): void {
    target.addEventListener(NODE_PROPERTY, this.#nodeProperty as EventListener);
    target.addEventListener(NODE_PORTS_MOVED, this.#nodePortsMoved as EventListener);
    target.addEventListener(LABEL_PRESS, this.#labelPress as EventListener);
    target.addEventListener(LABEL_ADD, this.#labelAdd as EventListener);
    target.addEventListener(PORT_ACTIVATE, this.#portActivate as EventListener);
    target.addEventListener(CONTROL_ACTION, this.#controlAction as EventListener);
    target.addEventListener(TOOL_REQUEST, this.#toolRequest as EventListener);
    target.addEventListener(RUN_ACTION, this.#runAction as EventListener);
    target.addEventListener(ZOOM_REQUEST, this.#zoomRequest as EventListener);
    target.addEventListener(MINIMAP_STEP, this.#minimapStep as EventListener);
    target.addEventListener(MINIMAP_PAN, this.#minimapPan as EventListener);
    target.addEventListener(PALETTE_INSERT, this.#paletteInsert as EventListener);
    target.addEventListener(PALETTE_CLOSE, this.#paletteClose as EventListener);
    target.addEventListener(INSPECTOR_CHANGE, this.#inspectorChange as EventListener);
    target.addEventListener(INSPECTOR_COMMIT, this.#inspectorCommit as EventListener);
    target.addEventListener(INSPECTOR_FOCUS_EDGE, this.#inspectorFocusEdge as EventListener);
    target.addEventListener(INSPECTOR_CLOSE, this.#inspectorClose as EventListener);
    target.addEventListener(INSPECTOR_PRESENCE, this.#inspectorPresence as EventListener);
    target.addEventListener(NODE_RESIZE, this.#nodeResize as EventListener);
    target.addEventListener(EDGE_WAYPOINT, this.#edgeWaypoint as EventListener);
    target.addEventListener(EDGE_WAYPOINT_REMOVE, this.#edgeWaypointRemove as EventListener);
    target.addEventListener(EDGE_SEGMENT, this.#edgeSegment as EventListener);
    target.addEventListener(EDGE_RECONNECT, this.#edgeReconnect as EventListener);
    target.addEventListener(EDGE_RECONNECT_KEY, this.#edgeReconnectKey as EventListener);
  }
  #internalRoot: EventTarget | undefined;

  // ---- lane accessors --------------------------------------------------------------------------

  override get value(): FlowDocument {
    return this.#lane.state.value;
  }

  override set value(next: FlowDocument | string | undefined) {
    const previous = this.value;
    const document = typeof next === 'string' ? documentConverter.fromAttribute(next) : next;
    if (typeof next === 'string' && !document)
      this.diagnose('flow-state', 'The value is not a flow document; the empty document is used.');
    // Assigning `value` makes the lane controlled (the owner writes back); programmatic loads
    // use `load()`/`setValue()` and `defaultValue` seeds an uncontrolled instance.
    this.#providedValue = document ?? (typeof next === 'string' ? EMPTY_DOCUMENT : undefined);
    if (this.hasUpdated) this.#lane.sync();
    this.requestUpdate('value', previous);
  }

  get viewport(): FlowViewport {
    return this.#viewportState.value;
  }

  set viewport(next: FlowViewport | string | undefined) {
    const previous = this.viewport;
    const viewport = typeof next === 'string' ? parseViewport(next) : next;
    if (!this.hasUpdated || this.#viewportState.controlled) {
      this.#providedViewport = viewport;
      if (this.hasUpdated) this.#viewportState.sync();
    } else if (viewport) this.#proposeViewport(this.#clamp(viewport), 'programmatic', null, false);
    this.requestUpdate('viewport', previous);
  }

  get selection(): FlowSelection {
    return this.#selectionState.value;
  }

  set selection(next: FlowSelection | string | undefined) {
    const previous = this.selection;
    const selection = typeof next === 'string' ? parseSelection(next) : next;
    if (!this.hasUpdated || this.#selectionState.controlled) {
      this.#providedSelection = selection;
      if (this.hasUpdated) this.#selectionState.sync();
    } else if (selection)
      this.#selectionState.set(this.#normalizeSelection(selection), 'programmatic');
    this.requestUpdate('selection', previous);
  }

  get tool(): FlowTool {
    return this.#toolState.value;
  }

  set tool(next: FlowTool | undefined) {
    const previous = this.tool;
    if (!this.hasUpdated || this.#toolState.controlled) {
      this.#providedTool = next;
      if (this.hasUpdated) this.#toolState.sync();
    } else if (next) this.#toolState.set(next, 'programmatic');
    this.requestUpdate('tool', previous);
  }

  get mode(): FlowMode {
    return this.#modeState.value;
  }

  set mode(next: FlowMode | undefined) {
    const previous = this.mode;
    if (!this.hasUpdated || this.#modeState.controlled) {
      this.#providedMode = next;
      if (this.hasUpdated) this.#modeState.sync();
    } else if (next) this.#modeState.set(next, 'programmatic');
    this.requestUpdate('mode', previous);
  }

  get inspectorOpen(): boolean {
    return this.#inspectorState.value;
  }

  set inspectorOpen(next: boolean | undefined) {
    const previous = this.inspectorOpen;
    if (!this.hasUpdated || this.#inspectorState.controlled) {
      this.#providedInspectorOpen = next;
      if (this.hasUpdated) this.#inspectorState.sync();
    } else if (next !== undefined) this.#inspectorState.set(next, 'programmatic');
    this.requestUpdate('inspectorOpen', previous);
  }

  // ---- read-only API ---------------------------------------------------------------------------

  get model(): FlowModel {
    return this.#model;
  }

  get nodes(): readonly FlowNode[] {
    return this.#model.nodes;
  }

  get edges(): readonly FlowEdge[] {
    return this.#model.edges;
  }

  get controlled(): boolean {
    return this.#lane.state.controlled;
  }

  get canUndo(): boolean {
    return this.#model.history.canUndo;
  }

  get canRedo(): boolean {
    return this.#model.history.canRedo;
  }

  get focusedNodeId(): string | undefined {
    return this.#focusedNode;
  }

  get visibleNodeIds(): readonly string[] {
    return [...this.#nodeLayer.visibleIds];
  }

  get visibleEdgeIds(): readonly string[] {
    return [...this.#edgeLayer.rendered.keys()];
  }

  get rendererCapabilities() {
    return this.#renderer.capabilities;
  }

  get dragging(): boolean {
    return this.#arbiter?.dragging ?? false;
  }

  get connecting(): boolean {
    return this.#arbiter?.connection !== undefined;
  }

  get selecting(): boolean {
    return this.#arbiter?.selecting ?? false;
  }

  get editable(): boolean {
    return this.mode === 'design' && !this.readOnly && !this.effectiveDisabled && !this.locked;
  }

  get lod(): FlowLod {
    return this.viewport.zoom < this.detailZoom ? 'low' : 'high';
  }

  /** The canvas box in screen pixels. */
  get canvasSize(): FlowSize {
    return this.#size;
  }

  get nodeLayer(): NodeLayer {
    return this.#nodeLayer;
  }

  get edgeLayer(): EdgeLayer {
    return this.#edgeLayer;
  }

  get announcer(): LiveAnnouncer {
    return this.#announcer;
  }

  get resolvedStrings(): FlowStrings {
    return this.#resolvedStrings;
  }

  get viewportOwner(): ViewportOwner {
    return this.#viewportOwner;
  }

  get lane(): DocumentLane {
    return this.#lane;
  }

  // ---- methods ---------------------------------------------------------------------------------

  setValue(
    document: FlowDocument | string,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    const parsed = this.#coerceDocument(document);
    if (!parsed) {
      this.diagnose('flow-state', 'The value is not a flow document.');
      return false;
    }
    return this.#lane.load(parsed, reason, sourceEvent);
  }

  /** Lenient parse of a JSON string or object: missing arrays become empty, issues are diagnosed. */
  #coerceDocument(document: unknown): FlowDocument | undefined {
    try {
      const { document: parsed, issues } = parseFlowDocument(document);
      for (const issue of issues.slice(0, 3)) this.diagnose('flow-state', issue.message);
      return parsed;
    } catch {
      return undefined;
    }
  }

  load(document: FlowDocument | string): boolean {
    return this.setValue(document, 'programmatic');
  }

  toJSON(options: { selection?: boolean; viewport?: boolean } = {}): FlowDocument {
    const serialized = serializeFlowDocument(this.#model.document, {
      selection: options.selection ?? false,
      viewport: false,
    });
    if (options.viewport !== false) serialized.viewport = { ...this.viewport };
    return serialized;
  }

  propose(
    changes: readonly FlowChange[],
    reason: ChangeReason = 'imperative-action',
    metadata: Partial<FlowChangeMetadata> = {},
    sourceEvent?: Event,
  ) {
    return this.#lane.propose(changes, {
      reason,
      ...(sourceEvent ? { sourceEvent } : {}),
      metadata,
    });
  }

  commit(
    reason: ChangeReason = 'imperative-action',
    sourceEvent?: Event,
    metadata?: Partial<FlowChangeMetadata>,
  ): boolean {
    return this.#lane.commit(reason, sourceEvent, metadata);
  }

  addNodes(
    nodes: readonly (Omit<FlowNode, 'id'> & { id?: string })[],
    reason: ChangeReason = 'imperative-action',
  ): string[] {
    const ids: string[] = [];
    const changes: FlowChange[] = nodes.map((input) => {
      const id = input.id ?? createId('tp-flow-node');
      ids.push(id);
      return { type: 'node-add', node: { ...input, id } as FlowNode };
    });
    const result = this.propose(changes, reason, { surface: 'api' });
    if (result.applied) this.commit(reason);
    return result.applied ? ids : [];
  }

  addEdges(
    edges: readonly (Omit<FlowEdge, 'id'> & { id?: string })[],
    reason: ChangeReason = 'imperative-action',
  ): string[] {
    const ids: string[] = [];
    const changes: FlowChange[] = edges.map((input) => {
      const id = input.id ?? createId('tp-flow-edge');
      ids.push(id);
      return { type: 'edge-add', edge: { ...input, id } as FlowEdge };
    });
    const result = this.propose(changes, reason, { surface: 'api' });
    if (result.applied) this.commit(reason);
    return result.applied ? ids : [];
  }

  updateNode(
    id: string,
    patch: Extract<FlowChange, { type: 'node-update' }>['patch'] & {
      position?: FlowPoint;
      data?: Record<string, unknown>;
    },
    reason: ChangeReason = 'imperative-action',
  ): boolean {
    const { position, data, ...rest } = patch;
    const changes: FlowChange[] = [];
    if (position) changes.push({ type: 'node-position', id, position });
    if (data) changes.push({ type: 'node-data', id, data });
    if (Object.keys(rest).length) changes.push({ type: 'node-update', id, patch: rest });
    const result = this.propose(changes, reason, { surface: 'api', nodeId: id });
    if (result.applied) this.commit(reason);
    return result.applied;
  }

  updateNodeData(
    id: string,
    data: Record<string, unknown>,
    reason: ChangeReason = 'imperative-action',
  ): boolean {
    const node = this.#model.getNode(id);
    if (!node) return false;
    const result = this.propose(
      [{ type: 'node-data', id, data: { ...node.data, ...data } }],
      reason,
      { surface: 'api', nodeId: id },
    );
    if (result.applied) this.commit(reason);
    return result.applied;
  }

  updateEdge(
    id: string,
    patch: Extract<FlowChange, { type: 'edge-update' }>['patch'],
    reason: ChangeReason = 'imperative-action',
  ): boolean {
    const result = this.propose([{ type: 'edge-update', id, patch }], reason, {
      surface: 'api',
      edgeId: id,
    });
    if (result.applied) this.commit(reason);
    return result.applied;
  }

  /** Deletes nodes (with descendants and incident edges) and edges after a cancelable `tp-delete`. */
  deleteElements(
    ids: { nodes?: readonly string[]; edges?: readonly string[] },
    reason: ChangeReason = 'imperative-action',
    sourceEvent?: Event,
  ): boolean {
    const nodes = (ids.nodes ?? [])
      .map((id) => this.#model.getNode(id))
      .filter((node): node is FlowNode => Boolean(node) && node!.deletable !== false);
    const nodeIds = new Set(nodes.map((node) => node.id));
    for (const node of nodes)
      for (const child of this.#model.descendants(node.id)) nodeIds.add(child);
    const edgeIds = new Set(
      (ids.edges ?? []).filter((id) => this.#model.getEdge(id)?.deletable !== false),
    );
    for (const edge of this.#model.connectedEdges([...nodeIds])) edgeIds.add(edge.id);
    const edges = [...edgeIds]
      .map((id) => this.#model.getEdge(id))
      .filter((edge): edge is FlowEdge => Boolean(edge));
    const nodeRecords = [...nodeIds]
      .map((id) => this.#model.getNode(id))
      .filter((node): node is FlowNode => Boolean(node));
    if (!nodeRecords.length && !edges.length) return false;
    const event = new CustomEvent('tp-delete', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { nodes: nodeRecords, edges, reason, sourceEvent },
    });
    if (!this.dispatchEvent(event)) return false;
    const changes: FlowChange[] = [
      ...edges.map((edge): FlowChange => ({ type: 'edge-remove', id: edge.id })),
      ...nodeRecords.map((node): FlowChange => ({ type: 'node-remove', id: node.id })),
    ];
    const result = this.propose(changes, reason, { surface: 'api' }, sourceEvent);
    if (!result.applied) return false;
    this.#selectionState.set(this.#normalizeSelection(this.selection), reason, sourceEvent);
    this.commit(reason, sourceEvent);
    this.#announcer.announce(
      format(this.#resolvedStrings.announceDeleted, {
        nodes: nodeRecords.length,
        edges: edges.length,
      }),
    );
    return true;
  }

  /** The widget's `isValidConnection` predicate joins every validation (gesture or API). */
  #validationOptions(ignoreEdge?: string): {
    ignoreEdge?: string;
    isValidConnection?: FlowConnectionPredicate;
  } {
    return {
      ...(ignoreEdge ? { ignoreEdge } : {}),
      ...(this.isValidConnection ? { isValidConnection: this.isValidConnection } : {}),
    };
  }

  /** Connects two ports after validation and a cancelable `tp-connect`. */
  connect(
    connection: FlowConnection,
    edge: Partial<FlowEdge> = {},
    reason: ChangeReason = 'connect',
    sourceEvent?: Event,
  ): string | undefined {
    const validation = this.#model.validateConnection(connection, this.#validationOptions());
    if (!validation.valid) return undefined;
    const proposed: FlowEdge = {
      id: edge.id ?? createId('tp-flow-edge'),
      ...edge,
      source: connection.source,
      target: connection.target,
    };
    if (connection.sourcePort !== undefined) proposed.sourcePort = connection.sourcePort;
    if (connection.targetPort !== undefined) proposed.targetPort = connection.targetPort;
    const event = new CustomEvent('tp-connect', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail: { connection, edge: proposed, reason, sourceEvent },
    });
    if (!this.dispatchEvent(event)) return undefined;
    const result = this.propose(
      [{ type: 'edge-add', edge: proposed }],
      reason,
      { surface: 'api', edgeId: proposed.id },
      sourceEvent,
    );
    if (!result.applied) return undefined;
    this.commit(reason, sourceEvent);
    this.#announcer.announce(
      format(this.#resolvedStrings.announceConnected, {
        source: this.#nodeLabel(connection.source),
        target: this.#nodeLabel(connection.target),
      }),
    );
    return proposed.id;
  }

  undo(reason: ChangeReason = 'imperative-action', sourceEvent?: Event): boolean {
    if (!this.editable) return false;
    const done = this.#lane.withProposal(
      { ...(sourceEvent ? { sourceEvent } : {}), metadata: { surface: 'api' } },
      () => this.#model.undo(reason),
    );
    if (done) this.commit(reason, sourceEvent, { history: 'undo' });
    return done;
  }

  redo(reason: ChangeReason = 'imperative-action', sourceEvent?: Event): boolean {
    if (!this.editable) return false;
    const done = this.#lane.withProposal(
      { ...(sourceEvent ? { sourceEvent } : {}), metadata: { surface: 'api' } },
      () => this.#model.redo(reason),
    );
    if (done) this.commit(reason, sourceEvent, { history: 'redo' });
    return done;
  }

  select(
    selection: Partial<FlowSelection>,
    reason: ChangeReason = 'imperative-action',
    sourceEvent?: Event,
  ): boolean {
    return this.#selectionState.set(
      this.#normalizeSelection({ nodes: selection.nodes ?? [], edges: selection.edges ?? [] }),
      reason,
      sourceEvent,
    );
  }

  selectAll(reason: ChangeReason = 'imperative-action', sourceEvent?: Event): boolean {
    return this.select(
      {
        nodes: this.#model.nodes.filter((node) => node.selectable !== false).map((node) => node.id),
        edges: this.#model.edges.filter((edge) => edge.selectable !== false).map((edge) => edge.id),
      },
      reason,
      sourceEvent,
    );
  }

  clearSelection(reason: ChangeReason = 'imperative-action', sourceEvent?: Event): boolean {
    return this.select({}, reason, sourceEvent);
  }

  setTool(tool: FlowTool, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    return this.#toolState.set(tool, reason, sourceEvent);
  }

  setMode(mode: FlowMode, reason: ChangeReason = 'programmatic', sourceEvent?: Event): boolean {
    return this.#modeState.set(mode, reason, sourceEvent);
  }

  setInspectorOpen(
    open: boolean,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    return this.#inspectorState.set(open, reason, sourceEvent);
  }

  async setViewport(
    viewport: FlowViewport,
    options: { duration?: number; reason?: ChangeReason } = {},
  ): Promise<boolean> {
    return this.#viewportOwner.animateTo(
      this.#clamp(viewport),
      options.reason ?? 'imperative-action',
      options.duration ?? 0,
    );
  }

  async fitViewTo(
    options: {
      padding?: number;
      duration?: number;
      nodes?: readonly string[];
      reason?: ChangeReason;
      /** Upper zoom bound of the fit; defaults to 1 so small graphs do not magnify. */
      maxZoom?: number;
    } = {},
  ): Promise<boolean> {
    const bounds = this.#model.bounds(options.nodes);
    if (!bounds.width && !bounds.height) return false;
    const target = this.#viewportOwner.fitViewport(
      bounds,
      `${options.padding ?? this.fitPadding}px`,
      Math.min(options.maxZoom ?? 1, this.maxZoom),
    );
    return this.#viewportOwner.animateTo(
      target,
      options.reason ?? 'imperative-action',
      options.duration ?? 250,
    );
  }

  async zoomTo(
    zoom: number,
    options: { duration?: number; point?: FlowPoint; reason?: ChangeReason } = {},
  ): Promise<boolean> {
    const point = options.point ?? { x: this.#size.width / 2, y: this.#size.height / 2 };
    const target = zoomToPoint(this.viewport, zoom, point, {
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    });
    return this.#viewportOwner.animateTo(
      target,
      options.reason ?? 'imperative-action',
      options.duration ?? 250,
    );
  }

  zoomIn(options: { duration?: number; reason?: ChangeReason } = {}): Promise<boolean> {
    return this.zoomTo(this.viewport.zoom * 1.2, options);
  }

  zoomOut(options: { duration?: number; reason?: ChangeReason } = {}): Promise<boolean> {
    return this.zoomTo(this.viewport.zoom / 1.2, options);
  }

  async setCenter(
    point: FlowPoint,
    options: { zoom?: number; duration?: number; reason?: ChangeReason } = {},
  ): Promise<boolean> {
    const target = centerOn(point, this.#size, options.zoom ?? this.viewport.zoom);
    return this.#viewportOwner.animateTo(
      this.#clamp(target),
      options.reason ?? 'imperative-action',
      options.duration ?? 250,
    );
  }

  /** Client (viewport) coordinates → flow coordinates, like xyflow's `screenToFlowPosition`. */
  screenToFlow(point: FlowPoint): FlowPoint {
    return this.#viewportOwner.screenToFlow(
      this.#viewportOwner.paneOffset({ clientX: point.x, clientY: point.y }),
    );
  }

  /** Flow coordinates → client (viewport) coordinates. */
  flowToScreen(point: FlowPoint): FlowPoint {
    const local = this.#viewportOwner.flowToScreen(point);
    const origin = this.#viewportOwner.paneOffset({ clientX: 0, clientY: 0 });
    return { x: local.x - origin.x, y: local.y - origin.y };
  }

  getNodesBounds(ids?: readonly string[]): FlowRect {
    return this.#model.bounds(ids);
  }

  getIntersectingNodes(rect: FlowRect, partially = true): string[] {
    return this.#model.nodesInRect(rect, partially);
  }

  getNodeConnections(id: string): FlowEdge[] {
    return this.#model.connectedEdges([id]);
  }

  async focusNode(id: string, options: { reveal?: boolean } = {}): Promise<void> {
    if (!this.#model.getNode(id)) return;
    this.#setFocusedNode(id);
    if (options.reveal !== false) {
      const rect = this.#model.nodeRect(id);
      const visible = visibleRect(this.viewport, this.#size);
      if (rect && !rectsIntersect(rect, visible))
        await this.setCenter({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    }
    this.#frameNow();
    this.#nodeLayer.hostOf(id)?.focus({ preventScroll: true });
  }

  focusEdge(id: string, options?: FocusOptions): void {
    this.#frameNow();
    const proxy = this.#edgeLayer.proxyElement(id);
    if (proxy) {
      this.#focusedEdge = id;
      proxy.focus({ preventScroll: true, ...options });
    }
  }

  focusPort(nodeId: string, portId: string): void {
    this.#setFocusedNode(nodeId);
    this.#frameNow();
    this.#nodeLayer.hostOf(nodeId)?.portElement(portId)?.focus({ preventScroll: true });
  }

  override focus(options?: FocusOptions): void {
    if (this.#focusedNode && this.#nodeLayer.hostOf(this.#focusedNode))
      this.#nodeLayer.hostOf(this.#focusedNode)!.focus(options);
    // The canvas is the focusable element (`tabindex`); the pane inside it only takes pointers.
    else this.#canvas?.focus(options);
  }

  // ---- lifecycle ---------------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    // Field discovers its control through this marker (Field's selector list is closed).
    this.setAttribute('data-field-control', '');
    if (this.#internalRoot !== this.renderRoot) {
      this.#internalRoot = this.renderRoot;
      this.#listenInternal(this.renderRoot);
    }
    const view = this.ownerDocument.defaultView;
    this.#scheduler = new Scheduler(view ?? undefined);
    this.#scope = new CleanupScope();
    this.#lane.install();
    this.#unsubscribeModel = this.#model.subscribe((event) => this.#modelChanged(event));
    this.#adoption.connect();
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#viewportOwner.disconnect();
    this.#edgeLayer.detach();
    this.#nodeLayer.clear();
    this.#disposePlanner();
    this.#arbiter?.disconnect();
    this.#arbiter = undefined;
    this.#unsubscribePlayer?.();
    this.#unsubscribePlayer = undefined;
    this.#player?.dispose();
    this.#player = undefined;
    this.#keys?.dispose();
    this.#keys = undefined;
    this.#adoption.disconnect();
    this.#unsubscribeModel?.();
    this.#unsubscribeModel = undefined;
    this.#lane.dispose();
    this.#scope?.dispose();
    this.#scope = undefined;
    this.#frame?.();
    this.#frame = undefined;
    this.#scheduler?.dispose();
    this.#settleTimer = undefined;
    this.#scheduler = undefined;
    this.#announcer.dispose();
  }

  protected override shouldUpdate(changed: PropertyValues<this>): boolean {
    if (this.#laneTick && changed.size === 0) {
      this.#laneTick = false;
      return false;
    }
    this.#laneTick = false;
    return super.shouldUpdate(changed);
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#lane.state.initialize();
    this.#viewportState.initialize();
    this.#selectionState.initialize();
    this.#toolState.initialize();
    this.#modeState.initialize();
    this.#inspectorState.initialize();
    if (changed.has('strings')) this.#resolvedStrings = resolveStrings(this.strings);
    if (changed.has('schema')) this.#model.schema = this.schema;
    if (changed.has('middleware')) this.#syncMiddleware();
    if (changed.has('renderer')) this.#syncRenderer();
    if (changed.has('router')) this.#syncRouter();
    if (changed.has('run')) this.#syncRun();
    if (changed.has('locked')) {
      this.#nodeLayer.rebind();
      this.#schedule();
    }
    // Render hooks assigned after the first render re-bind the materialized hosts and edges.
    if (this.hasUpdated && RENDER_HOOK_PROPERTIES.some((key) => changed.has(key))) {
      this.#nodeLayer.rebind();
      this.#edgeLayer.invalidate();
      this.#schedule();
    }
    if (changed.has('minZoom') || changed.has('maxZoom')) {
      const clamped = this.#clamp(this.viewport);
      if (!viewportsEqual(clamped, this.viewport)) this.#viewportState.reconcile(clamped);
    }
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    const canvas = this.#canvas;
    if (canvas && this.#scope) {
      this.#scope.add(
        observeResize(canvas, (entry) => {
          const box = entry.borderBoxSize?.[0];
          this.#size = {
            width: box ? box.inlineSize : entry.contentRect.width,
            height: box ? box.blockSize : entry.contentRect.height,
          };
          this.#sizeChanged();
        }),
      );
      const rect = canvas.getBoundingClientRect();
      this.#size = { width: rect.width, height: rect.height };
    }
    this.#viewportOwner.connect();
    this.#edgeLayer.attach();
    this.#syncRouter();
    this.#syncFormValue(this.#model.document);
    this.#arbiter = new FlowPointerArbiter(this.#interactionHost());
    this.#arbiter.connect();
    this.#installKeys();
    this.assignPanels();
    this.#scope?.add(
      this.#model.on('history', (state) => {
        this.requestUpdate();
        this.dispatchEvent(
          new CustomEvent('tp-history-change', { bubbles: true, composed: true, detail: state }),
        );
      }),
    );
    this.#schedule();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncAuthoredControlBars();
    this.#measureControls();
    this.#revealInspectedNode();
    this.#revealArmed = true;
    this.#syncComposition();
    if (
      changed.has('run') ||
      changed.has('tool') ||
      changed.has('mode') ||
      changed.has('disabled') ||
      changed.has('readOnly') ||
      changed.has('detailZoom') ||
      changed.has('virtualize') ||
      changed.has('icons') ||
      changed.has('nodeTemplates') ||
      changed.has('propertyControls') ||
      changed.has('showPortLabels') ||
      changed.has('showPorts') ||
      changed.has('strings') ||
      changed.has('schema')
    ) {
      this.#nodeLayer.rebind();
      this.#edgeLayer.invalidate();
      this.#schedule();
    }
    // A minimap turned on later paints its scene on the next frame, not at the next pan.
    if (changed.has('edgeTemplates') || changed.has('minimap')) this.#schedule();
  }

  override formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state !== 'string') return;
    const document = documentConverter.fromAttribute(state);
    if (document) this.#lane.load(document, 'programmatic');
  }

  protected override resetFormValue(): void {
    this.#lane.state.reset();
  }

  protected override focusTarget(): HTMLElement | null {
    return this.#canvas ?? super.focusTarget();
  }

  /** A Field's label names the application region; the association writes the same name. */
  override setFieldAssociation(association: {
    label?: string;
    description?: string;
    error?: string;
  }): void {
    if ('label' in association && (association.label ?? '') !== this.#fieldLabel) {
      this.#fieldLabel = association.label ?? '';
      this.requestUpdate();
    }
    super.setFieldAssociation(association);
  }
  #fieldLabel = '';

  /** The graph's name: a Field label wins (as for every library control), else `label`. */
  get #name(): string {
    return this.#fieldLabel || this.label || this.#resolvedStrings.label;
  }

  protected override associationTarget(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="flow"]');
  }

  // ---- model and lanes ---------------------------------------------------------------------------

  #committed(value: FlowDocument, _previous: FlowDocument, reason: ChangeReason): void {
    this.#syncFormValue(value);
    this.onValueCommitted?.(value, _previous, reason);
  }

  /** The form value is the canonical JSON of the committed (or loaded) document. */
  #syncFormValue(value: FlowDocument): void {
    const json = JSON.stringify(serializeFlowDocument(value));
    this.setFormValue(value.nodes.length ? json : null, json);
    this.setRequiredValidity(
      this.required && value.nodes.length === 0,
      'Please add at least one node.',
    );
  }

  #modelChanged(event: FlowChangeEvent): void {
    if (event.origin === 'external' && !this.#userPanned) this.#fitted = false;
    if (
      event.origin === 'external' ||
      event.reason === 'form-reset' ||
      event.reason === 'programmatic'
    )
      this.#syncFormValue(event.document);
    if (event.origin !== 'measure') {
      for (const change of event.changes)
        if (change.type === 'node-position' || change.type === 'node-size') {
          const node = this.#model.getNode(change.id);
          if (node) this.#adoption.writeBack(node);
        }
      if (this.#nodeLayer.visibleIds.size) {
        const affected = new Set(event.affectedNodes);
        for (const edge of this.#edgeEndpointsOf(event)) affected.add(edge);
        this.#nodeLayer.rebind(affected);
      }
      if (event.changes.some((change) => change.type === 'layout-settings'))
        this.#remeasureVisiblePorts();
    }
    this.#schedule();
  }

  /**
   * A direction change moves ports to other sides without resizing the hosts, so no resize
   * observation fires: re-measure every materialized host once it has rendered its new ports.
   */
  #remeasureVisiblePorts(): void {
    for (const id of this.#nodeLayer.visibleIds) {
      const host = this.#nodeLayer.hostOf(id);
      if (!host) continue;
      void host.updateComplete.then(() =>
        this.#scheduler?.animationFrame(() => {
          if (this.#nodeLayer.hostOf(id) === host) this.#nodeLayer.remeasurePorts(id);
        }),
      );
    }
  }

  /** Nodes whose port connectivity changed because an incident edge was added, removed or re-targeted. */
  #edgeEndpointsOf(event: FlowChangeEvent): Set<string> {
    const ids = new Set<string>();
    if (event.affectedEdges.size === 0) return ids;
    const previousEdges = new Map(event.previousDocument.edges.map((edge) => [edge.id, edge]));
    for (const edgeId of event.affectedEdges) {
      for (const edge of [this.#model.getEdge(edgeId), previousEdges.get(edgeId)])
        if (edge) {
          ids.add(edge.source);
          ids.add(edge.target);
        }
    }
    return ids;
  }

  #adoptChanges(changes: readonly FlowChange[]): void {
    if (this.#lane.state.controlled) {
      // Controlled: the owner's document wins; authored children only supply hosts.
      return;
    }
    const result = this.#lane.propose(changes, {
      reason: 'programmatic',
      history: false,
      metadata: { surface: 'api' },
    });
    if (result.applied) this.#lane.commit('programmatic');
  }

  #proposeViewport(
    viewport: FlowViewport,
    reason: ChangeReason,
    sourceEvent: Event | null,
    animated: boolean,
  ): boolean {
    this.#laneTick = true;
    const options: TpChangeEventOptions = { metadata: { animated } };
    return this.#viewportState.set(viewport, reason, sourceEvent ?? undefined, options);
  }

  #lastLod: FlowLod = 'high';
  /** The viewport the previous frame rendered; a different object means the view is moving. */
  #framedViewport: FlowViewport | undefined;

  /** Keyboard zoom changes are announced as a percentage (pointer zoom is self-evident). */
  #announceZoom(): void {
    this.#announcer.announce(
      format(this.#resolvedStrings.announceZoom, { percent: Math.round(this.viewport.zoom * 100) }),
    );
  }

  #viewportCommitted(): void {
    this.#viewportOwner.apply(this.viewport);
    const lod = this.lod;
    if (lod !== this.#lastLod) {
      this.#lastLod = lod;
      this.#root?.setAttribute('data-lod', lod);
      this.#nodeLayer.rebind();
    }
    for (const listener of this.#viewportTicks) listener();
  }

  #clamp(viewport: FlowViewport): FlowViewport {
    return clampViewport(viewport, {
      size: this.#size,
      minZoom: this.minZoom,
      maxZoom: this.maxZoom,
    });
  }

  #normalizeSelection(selection: FlowSelection): FlowSelection {
    return {
      nodes: selection.nodes.filter((id) => this.#model.getNode(id)),
      edges: selection.edges.filter((id) => this.#model.getEdge(id)),
    };
  }

  #syncMiddleware(): void {
    for (const release of this.#middlewareReleases) release();
    this.#middlewareReleases = this.middleware.map((entry) => this.#model.use(entry));
  }
  #middlewareReleases: Array<() => void> = [];
  #unknownTypes = new Set<string>();

  #syncRenderer(): void {
    if (this.renderer === this.#rendererInstance) return;
    this.#edgeLayer.detach();
    this.#rendererInstance = this.renderer;
    this.#renderer = this.renderer === 'svg' ? new SvgFlowRenderer() : this.renderer;
    if (this.hasUpdated) {
      this.#edgeLayer.attach();
      this.#schedule();
    }
  }

  // ---- editing: clipboard, nudging, layout, reconnect ----------------------------------------

  /** Copies the selection to the clipboard (and an in-memory fallback). */
  async copy(): Promise<boolean> {
    const payload = this.#copyPayload();
    if (!payload) return false;
    const json = JSON.stringify(payload);
    const result = await copyData(this.ownerDocument, {
      [FLOW_CLIPBOARD_TYPE]: json,
      'text/plain': json,
    });
    return result.copied || clipboardFallback === payload;
  }

  async cut(reason: ChangeReason = 'imperative-action', sourceEvent?: Event): Promise<boolean> {
    if (!this.editable) return false;
    const copied = await this.copy();
    if (!copied) return false;
    return this.deleteElements(
      { nodes: this.selection.nodes, edges: this.selection.edges },
      reason,
      sourceEvent,
    );
  }

  /** Pastes a payload (default: the last copied one) one grid step away or at `at`. */
  paste(
    payload: FlowClipboardPayload | undefined = clipboardFallback,
    options: { at?: FlowPoint; reason?: ChangeReason; sourceEvent?: Event } = {},
  ): string[] {
    if (!payload || !this.editable) return [];
    const reason = options.reason ?? 'input-paste';
    const step = this.snapGrid > 0 ? this.snapGrid : 16;
    let offset: FlowPoint = { x: step, y: step };
    if (options.at && payload.nodes.length) {
      const minX = Math.min(...payload.nodes.map((node) => node.position.x));
      const minY = Math.min(...payload.nodes.map((node) => node.position.y));
      offset = { x: options.at.x - minX, y: options.at.y - minY };
    }
    const { changes, nodeIds, edgeIds } = pasteChanges(payload, {
      idFactory: (kind) => createId(`tp-flow-${kind}`),
      offset,
      taken: (id) => Boolean(this.#model.getNode(id) || this.#model.getEdge(id)),
    });
    if (!changes.length) return [];
    const result = this.propose(changes, reason, { surface: 'keyboard' }, options.sourceEvent);
    if (!result.applied) return [];
    this.commit(reason, options.sourceEvent);
    this.#selectionState.set({ nodes: nodeIds, edges: edgeIds }, reason, options.sourceEvent);
    if (nodeIds[0]) this.#setFocusedNode(nodeIds[0]);
    return nodeIds;
  }

  /** Duplicates the selection one grid step away. */
  duplicate(reason: ChangeReason = 'imperative-action', sourceEvent?: Event): string[] {
    const payload = this.#copyPayload(false);
    if (!payload) return [];
    return this.paste(payload, { reason, ...(sourceEvent ? { sourceEvent } : {}) });
  }

  /** Moves the selected nodes by a delta in flow units (keyboard nudges coalesce in history). */
  /** Aligns the selected nodes (two or more) to the selection's edge or centre; one transaction. */
  alignSelection(
    mode: AlignMode,
    reason: ChangeReason = 'imperative-action',
    sourceEvent?: Event,
  ): boolean {
    return this.#moveSelection(alignNodes(this.#selectionItems(), mode), reason, sourceEvent);
  }

  /** Distributes the selected nodes (three or more) evenly, or by `spacing`, along an axis. */
  distributeSelection(
    axis: 'x' | 'y',
    spacing: number | 'even' = 'even',
    reason: ChangeReason = 'imperative-action',
    sourceEvent?: Event,
  ): boolean {
    return this.#moveSelection(
      distributeNodes(this.#selectionItems(), axis, spacing),
      reason,
      sourceEvent,
    );
  }

  #selectionItems(): AlignItem[] {
    const items: AlignItem[] = [];
    for (const id of this.selection.nodes) {
      const node = this.#model.getNode(id);
      const rect = this.#model.nodeRect(id);
      if (node && rect && node.draggable !== false) items.push({ id, rect });
    }
    return items;
  }

  #moveSelection(moved: readonly MovedItem[], reason: ChangeReason, sourceEvent?: Event): boolean {
    if (!this.editable || !moved.length) return false;
    const changes: FlowChange[] = moved.map(({ id, position }) => ({
      type: 'node-position',
      id,
      position: this.#model.toRelativePosition(position, this.#model.getNode(id)?.parentId),
    }));
    const result = this.propose(changes, reason, { surface: 'api' }, sourceEvent);
    if (!result.applied) return false;
    this.commit(reason, sourceEvent);
    return true;
  }

  nudgeSelection(
    delta: FlowPoint,
    reason: ChangeReason = 'keyboard',
    sourceEvent?: Event,
  ): boolean {
    if (!this.editable) return false;
    const ids = this.selection.nodes.length
      ? this.selection.nodes
      : this.#focusedNode
        ? [this.#focusedNode]
        : [];
    const changes: FlowChange[] = [];
    for (const id of ids) {
      const node = this.#model.getNode(id);
      if (!node || node.draggable === false) continue;
      changes.push({
        type: 'node-position',
        id,
        position: { x: node.position.x + delta.x, y: node.position.y + delta.y },
      });
    }
    if (!changes.length) return false;
    const result = this.#lane.propose(changes, {
      reason,
      coalesce: 'nudge',
      ...(sourceEvent ? { sourceEvent } : {}),
      metadata: { surface: 'keyboard' },
    });
    if (!result.applied) return false;
    this.commit(reason, sourceEvent);
    const moved = this.#model.getNode(ids[0]!)?.position;
    this.#announcer.announce(
      format(this.#resolvedStrings.announceMoved, {
        label: this.#nodeLabel(ids[0]!),
        x: Math.round(moved?.x ?? 0),
        y: Math.round(moved?.y ?? 0),
      }),
    );
    return true;
  }

  /** Re-targets one end of an edge after validation (`metadata.reconnect`). */
  reconnect(
    edgeId: string,
    end: 'source' | 'target',
    connection: FlowConnection,
    sourceEvent?: Event,
  ): boolean {
    const edge = this.#model.getEdge(edgeId);
    if (!edge || !this.editable) return false;
    if (!this.#model.validateConnection(connection, this.#validationOptions(edgeId)).valid)
      return false;
    const patch: Partial<FlowEdge> =
      end === 'source' ? { source: connection.source } : { target: connection.target };
    if (end === 'source' && connection.sourcePort !== undefined)
      patch.sourcePort = connection.sourcePort;
    if (end === 'target' && connection.targetPort !== undefined)
      patch.targetPort = connection.targetPort;
    const result = this.propose(
      [{ type: 'edge-update', id: edgeId, patch }],
      'connect',
      { surface: 'edge', edgeId, reconnect: { edgeId, end } },
      sourceEvent,
    );
    if (!result.applied) return false;
    this.commit('connect', sourceEvent, { reconnect: { edgeId, end } });
    return true;
  }

  /**
   * Keeps the anchor node at its screen position (viewport compensated the same frame) and plays
   * the `flow-layout` role: moved hosts glide from where they were, the edge and label layers
   * fade in at their final routes. Routing already runs on the committed positions.
   */
  #transitionLayout(
    previous: ReadonlyMap<string, FlowPoint>,
    anchorId: string | undefined,
    anchorBefore: FlowPoint | undefined,
  ): void {
    const viewport = this.viewport;
    let shift: FlowPoint = { x: 0, y: 0 };
    const anchorAfter = anchorId ? this.#model.absolutePosition(anchorId) : undefined;
    if (anchorBefore && anchorAfter) {
      shift = { x: anchorAfter.x - anchorBefore.x, y: anchorAfter.y - anchorBefore.y };
      if (shift.x || shift.y)
        void this.#viewportOwner.animateTo(
          this.#clamp({
            x: viewport.x - shift.x * viewport.zoom,
            y: viewport.y - shift.y * viewport.zoom,
            zoom: viewport.zoom,
          }),
          'programmatic',
          0,
        );
    }
    this.#frameNow();
    const moves: Array<{ host: HTMLElement; dx: number; dy: number }> = [];
    for (const [id, before] of previous) {
      const host = this.#nodeLayer.hostOf(id);
      const after = this.#model.absolutePosition(id);
      if (!host || !after) continue;
      // Old screen point expressed in the compensated viewport's flow space.
      const dx = before.x + shift.x - after.x;
      const dy = before.y + shift.y - after.y;
      if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) moves.push({ host, dx, dy });
    }
    const layers = [this.#edgesContainer, this.#labelsContainer].filter(
      (layer): layer is HTMLElement => Boolean(layer),
    );
    const target = this.#nodesContainer;
    if (!moves.length || !target) return;
    const style = getComputedStyle(this);
    const scale = Number.parseFloat(style.getPropertyValue('--tp-motion-scale'));
    const duration =
      cssTimeMs(style.getPropertyValue('--tp-duration-normal')) *
      (Number.isFinite(scale) ? scale : 1);
    const easing = style.getPropertyValue('--tp-easing-standard').trim() || 'ease';
    const driver: MotionDriver = {
      play: (): MotionPlayback => {
        const timing = { duration, easing };
        const animations = [
          ...moves.map(({ host, dx, dy }) =>
            host.animate([{ translate: `${dx}px ${dy}px` }, { translate: '0px 0px' }], timing),
          ),
          ...layers.map((layer) => layer.animate([{ opacity: 0 }, { opacity: 1 }], timing)),
        ];
        return {
          finished: Promise.all(animations.map((animation) => animation.finished)).then(
            () => undefined,
            () => undefined,
          ),
          cancel: () => {
            for (const animation of animations) animation.cancel();
          },
        };
      },
    };
    this.#layoutMotion?.cancel();
    if (!(duration > 0)) return;
    this.#layoutMotion = prepareMotion(
      this,
      target,
      flowMotionRoles.layout,
      { phase: 'change', context: { moved: moves.length } },
      driver,
    );
    this.#layoutMotion.start();
  }
  #layoutMotion: ReturnType<typeof prepareMotion> | undefined;

  /**
   * Runs the layout engine and applies its positions as one `layout` transaction, then
   * dispatches `tp-layout-complete`.
   */
  layout(
    direction?: FlowLayoutRequestDirection,
    options: { ids?: Iterable<string>; sourceEvent?: Event; before?: readonly FlowChange[] } = {},
  ): FlowLayoutResult | undefined {
    if (!this.editable) return undefined;
    const resolved: FlowLayoutRequestDirection =
      direction ??
      (this.autoLayout === 'none'
        ? ((this.#model.layoutDirection === 'none' ? undefined : this.#model.layoutDirection) ??
          'horizontal')
        : this.autoLayout);
    const settings = this.#model.document.layout;
    const proposal = {
      ...(options.sourceEvent ? { sourceEvent: options.sourceEvent } : {}),
      metadata: { surface: 'api' as const },
    };
    // The node that keeps its screen position (focused, else the single selected one) and the
    // materialized hosts' positions feed the transition after the commit.
    const anchorId =
      this.#focusedNode ??
      (this.selection.nodes.length === 1 ? this.selection.nodes[0] : undefined);
    const anchorBefore = anchorId ? this.#model.absolutePosition(anchorId) : undefined;
    const previous = new Map<string, FlowPoint>();
    for (const id of this.#nodeLayer.visibleIds) {
      const point = this.#model.absolutePosition(id);
      if (point) previous.set(id, { ...point });
    }
    // `before` changes (the pin of a dropped node) join the layout transaction: one entry,
    // one commit, and the engine sees them when it computes.
    const transaction = this.#model.transaction({ label: 'layout', reason: 'layout' });
    let changed = false;
    if (options.before?.length) {
      const before = options.before;
      changed = this.#lane.withProposal(proposal, () =>
        transaction.apply(before, { reason: 'layout', origin: 'user' }),
      ).applied;
    }
    this.#root?.setAttribute('aria-busy', 'true');
    let result: FlowLayoutResult;
    try {
      result = layoutFlow(this.#layoutSource(), resolved, {
        ...(this.layoutEngine ? { engine: this.layoutEngine } : {}),
        ...(options.ids ? { ids: options.ids } : {}),
        ...(settings?.nodeSpacing !== undefined ? { nodeSpacing: settings.nodeSpacing } : {}),
        ...(settings?.rankSpacing !== undefined ? { rankSpacing: settings.rankSpacing } : {}),
        ...(settings?.componentSpacing !== undefined
          ? { componentSpacing: settings.componentSpacing }
          : {}),
        ...(settings?.pack !== undefined ? { pack: settings.pack } : {}),
        viewportAspect: this.#size.height > 0 ? this.#size.width / this.#size.height : 1.6,
      });
    } catch (error) {
      transaction.rollback('layout');
      throw error;
    } finally {
      this.#root?.removeAttribute('aria-busy');
    }
    // The document keeps the direction it was laid out in: default port sides follow it.
    const directionChange: FlowChange[] =
      this.#model.document.layout?.direction !== result.direction
        ? [
            {
              type: 'layout-settings',
              layout: { ...(this.#model.document.layout ?? {}), direction: result.direction },
            },
          ]
        : [];
    const layoutChanges = [...directionChange, ...result.changes];
    if (layoutChanges.length)
      changed =
        this.#lane.withProposal(proposal, () =>
          transaction.apply(layoutChanges, { reason: 'layout', origin: 'layout' }),
        ).applied || changed;
    if (changed) {
      transaction.commit();
      this.commit('layout', options.sourceEvent);
      this.#transitionLayout(previous, anchorId, anchorBefore);
    } else transaction.rollback('layout');
    this.dispatchEvent(
      new CustomEvent('tp-layout-complete', {
        bubbles: true,
        composed: true,
        detail: { direction: result.direction, stats: result.stats, bounds: result.bounds },
      }),
    );
    this.#announcer.announce(
      format(this.#resolvedStrings.announceLayout, { count: result.positions.size }),
    );
    return result;
  }

  #copyPayload(remember = true): FlowClipboardPayload | undefined {
    const selection = this.selection;
    if (!selection.nodes.length && !selection.edges.length) return undefined;
    const payload = serializeSelection(this.#model, selection);
    if (!payload.nodes.length && !payload.edges.length) return undefined;
    if (remember) clipboardFallback = payload;
    return payload;
  }

  #clipboardCopy = (event: ClipboardEvent): void => {
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return;
    const payload = this.#copyPayload();
    if (!payload || !event.clipboardData) return;
    const json = JSON.stringify(payload);
    event.clipboardData.setData(FLOW_CLIPBOARD_TYPE, json);
    event.clipboardData.setData('text/plain', json);
    event.preventDefault();
  };

  #clipboardCut = (event: ClipboardEvent): void => {
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return;
    this.#clipboardCopy(event);
    if (event.defaultPrevented)
      this.deleteElements(
        { nodes: this.selection.nodes, edges: this.selection.edges },
        'hotkey',
        event,
      );
  };

  #clipboardPaste = (event: ClipboardEvent): void => {
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return;
    const text =
      event.clipboardData?.getData(FLOW_CLIPBOARD_TYPE) ||
      event.clipboardData?.getData('text/plain') ||
      '';
    const payload = parseClipboardPayload(text) ?? clipboardFallback;
    if (!payload) return;
    event.preventDefault();
    this.paste(payload, { reason: 'input-paste', sourceEvent: event });
  };

  #layoutSource(): FlowLayoutSource {
    const model = this.#model;
    const empty: FlowRect = { x: 0, y: 0, width: 0, height: 0 };
    return {
      get nodes() {
        return model.nodes;
      },
      get edges() {
        return model.edges;
      },
      nodeRect: (id) => model.nodeRect(id) ?? empty,
      absolutePosition: (id) => model.absolutePosition(id) ?? { x: 0, y: 0 },
      ports: (id) => model.ports(id),
      definitionOf: (node) => model.definitionOf(node),
      getNode: (id) => model.getNode(id),
    };
  }

  // ---- interaction host, keyboard --------------------------------------------------------------

  #endpointOf(nodeId: string, portId: string | undefined, direction: FlowPortDirection) {
    const model = this.#model;
    return resolveEndpoint({
      nodeId,
      rect: model.nodeRect(nodeId) ?? { x: 0, y: 0, width: 0, height: 0 },
      ports: model.ports(nodeId),
      portId,
      direction,
      layout: model.layoutDirection,
      kind: 'orthogonal',
      loose: true,
    });
  }

  #interactionHost(): FlowInteractionHost {
    const model = (): FlowModel => this.#model;
    const canvas = (): HTMLElement | null => this.#canvas;
    const editable = (): boolean => this.editable;
    const disabled = (): boolean => this.effectiveDisabled;
    const tool = (): FlowTool => this.tool;
    const zoom = (): number => this.viewport.zoom;
    const selection = (): FlowSelection => this.selection;
    const snap = (): boolean => this.snap;
    const snapGrid = (): number => this.snapGrid;
    const selectionMode = (): FlowSelectionMode => this.selectionMode;
    const connectionRadius = (): number => this.connectionRadius;
    const connectionMode = (): 'strict' | 'loose' => this.connectionMode;
    const connectOnClick = (): boolean => this.connectOnClick;
    const strings = (): FlowStrings => this.#resolvedStrings;
    return {
      get model() {
        return model();
      },
      get canvas() {
        return canvas();
      },
      get editable() {
        return editable();
      },
      get disabled() {
        return disabled();
      },
      get tool() {
        return tool();
      },
      get zoom() {
        return zoom();
      },
      get selection() {
        return selection();
      },
      get snap() {
        return snap();
      },
      get snapGrid() {
        return snapGrid();
      },
      get selectionMode() {
        return selectionMode();
      },
      get connectionRadius() {
        return connectionRadius();
      },
      get connectionMode() {
        return connectionMode();
      },
      get connectOnClick() {
        return connectOnClick();
      },
      get strings() {
        return strings();
      },
      screenToFlow: (point) => this.screenToFlow(point),
      paneOffset: (event) => this.#viewportOwner.paneOffset(event),
      propose: (changes, reason, metadata, sourceEvent) =>
        this.propose(changes, reason, metadata ?? {}, sourceEvent),
      proposeIn: (transaction, changes, reason, metadata, sourceEvent) =>
        this.#lane.withProposal(
          { ...(sourceEvent ? { sourceEvent } : {}), metadata: metadata ?? {} },
          () => transaction.apply(changes, { reason }),
        ),
      rollback: (transaction, reason, sourceEvent) => {
        this.#lane.withProposal(
          { ...(sourceEvent ? { sourceEvent } : {}), metadata: { surface: 'node' } },
          () => transaction.rollback(reason),
        );
        this.#lane.commit(reason, sourceEvent ?? undefined);
      },
      commit: (reason, sourceEvent, metadata) => this.commit(reason, sourceEvent, metadata),
      transaction: (label) => this.#model.transaction({ label, reason: 'drag' }),
      setSelection: (next, reason, sourceEvent, metadata) =>
        this.#selectionState.set(
          this.#normalizeSelection(next),
          reason,
          sourceEvent,
          metadata ? { metadata } : undefined,
        ),
      setDragging: (ids, dragging) => {
        for (const id of ids) {
          const host = this.#nodeLayer.hostOf(id);
          if (host) host.dragging = dragging;
        }
        this.#root?.toggleAttribute('data-dragging', dragging);
      },
      setPortState: (nodeId, portId, state) => this.setPortState(nodeId, portId, state),
      clearPortStates: () => this.clearPortStates(),
      setConnectionLine: (line) => {
        this.#edgeLayer.setConnectionLine(line);
        this.#root?.toggleAttribute('data-connecting', line !== null);
      },
      setMarquee: (rect) => this.#setMarquee(rect),
      autoPan: (point) => {
        if (point) this.#viewportOwner.autoPan(point);
        else this.#viewportOwner.stopAutoPan();
      },
      announce: (message) => this.#announcer.announce(message),
      nodeLabel: (id) => this.#nodeLabel(id),
      portLabel: (nodeId, portId) =>
        this.#model.ports(nodeId).find((port) => port.id === portId)?.label || portId || '',
      connect: (connection, edge, reason, sourceEvent) =>
        this.connect(connection, edge, reason, sourceEvent),
      reconnect: (edgeId, end, connection, sourceEvent) =>
        this.reconnect(edgeId, end, connection, sourceEvent),
      validateConnection: (connection, ignoreEdge) =>
        this.#model.validateConnection(connection, {
          fast: true,
          ...this.#validationOptions(ignoreEdge),
        }),
      portEndpoint: (nodeId, portId, direction) => this.#endpointOf(nodeId, portId, direction),
      edgeKind: () => this.schema?.rules?.defaultEdgeKind ?? 'smoothstep',
      nodeHostInPath: (event) => this.#nodeHostInPath(event),
      portInPath: (event) => this.#portInPath(event),
      edgeInPath: (event) => this.#edgeInPath(event),
      interactiveInPath: (event, within) => interactiveTargetInPath(event, within),
      setFocusedNode: (id) => this.#setFocusedNode(id),
      settleDrop: (ids, sourceEvent) => this.#settleDrop(ids, sourceEvent),
      openPaletteAt: (point, source) => {
        if (!this.palette) return;
        this.#pendingInsert = { at: point, source };
        this.#paletteElement?.focus();
      },
      onViewportTick: (listener) => {
        this.#viewportTicks.add(listener);
        return () => this.#viewportTicks.delete(listener);
      },
      schedule: () => this.#schedule(),
    };
  }

  #portInPath(event: Event): TpFlowPort | undefined {
    for (const target of event.composedPath()) {
      if (target instanceof Element && target.localName === 'tp-flow-port')
        return target as TpFlowPort;
      if (target === this.#canvas) break;
    }
    return undefined;
  }

  #setMarquee(rect: FlowRect | null): void {
    const marquee = this.renderRoot.querySelector<HTMLElement>('.marquee');
    const selecting = rect !== null;
    if (marquee) {
      marquee.hidden = !selecting;
      if (rect) {
        marquee.style.transform = `translate(${rect.x}px, ${rect.y}px)`;
        marquee.style.inlineSize = `${rect.width}px`;
        marquee.style.blockSize = `${rect.height}px`;
      }
    }
    this.#root?.toggleAttribute('data-selecting', selecting);
    this.#pane?.toggleAttribute('data-selecting', selecting);
  }

  /** Auto-layout modes: the dropped nodes stay pinned where they landed and the rest re-flows. */
  #settleDrop(ids: readonly string[], sourceEvent: Event): void {
    if (this.autoLayout === 'none') return;
    const before: FlowChange[] = ids
      .filter((id) => this.#model.getNode(id) && !this.#model.getNode(id)!.pinned)
      .map((id) => ({ type: 'node-update', id, patch: { pinned: true } }));
    this.layout(this.autoLayout, { sourceEvent, before });
  }

  #portActivate = (event: CustomEvent<FlowPortActivateDetail>): void => {
    const detail = event.detail;
    const arbiter = this.#arbiter;
    // Pointer presses on ports are arbitrated on pointerdown (drag or click-to-connect); only
    // keyboard activations arrive here.
    if (!arbiter || !this.editable || !detail.keyboard) return;
    const session = arbiter.connection;
    if (session) {
      if (session.isStart(detail.nodeId, detail.portId)) {
        if (session.mode === 'keyboard') session.confirm(event);
        else session.cancel();
      } else session.completeWith(detail.nodeId, detail.portId, event);
      arbiter.finishConnection();
      return;
    }
    const started = arbiter.startConnection(
      { nodeId: detail.nodeId, portId: detail.portId, direction: detail.direction },
      'keyboard',
    );
    if (started && !started.cycle(1)) {
      started.cancel();
      arbiter.finishConnection();
    }
  };

  #installKeys(): void {
    const canvas = this.#canvas;
    if (!canvas || this.#keys) return;
    const keys = new KeyBindingOwner(canvas, {
      disabled: () => this.effectiveDisabled,
      // Text fields inside nodes keep every key, modified ones too (select all, undo, copy).
      ownsKey: (event) => editableTargetInPath(event, canvas),
      ...(this.#scope ? { scope: this.#scope } : {}),
    });
    this.#keys = keys;
    const arrows: FlowArrowKey[] = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];
    keys.register({
      keys: arrows,
      action: 'focus-next',
      repeat: true,
      handler: (event) => this.#arrowKey(event, event.key as FlowArrowKey),
    });
    keys.register({ keys: 'Home', action: 'focus-first', handler: () => this.#focusEdgeNode(0) });
    keys.register({ keys: 'End', action: 'focus-last', handler: () => this.#focusEdgeNode(-1) });
    keys.register({
      keys: arrows.map((key) => `Shift+${key}`),
      action: 'nudge',
      repeat: true,
      handler: (event) => this.#nudgeKey(event, 1),
    });
    keys.register({
      keys: arrows.map((key) => `Mod+Shift+${key}`),
      action: 'nudge-large',
      repeat: true,
      handler: (event) => this.#nudgeKey(event, 4),
    });
    keys.register({ keys: 'Enter', action: 'enter', handler: (event) => this.#enterKey(event) });
    keys.register({
      keys: ['Delete', 'Backspace'],
      action: 'delete',
      handler: (event) => this.#deleteSelection(event),
    });
    keys.register({
      keys: 'Mod+Z',
      action: 'undo',
      handler: (event) => this.undo('hotkey', event),
    });
    keys.register({
      keys: 'Mod+Shift+Z',
      action: 'redo',
      handler: (event) => this.redo('hotkey', event),
    });
    keys.register({
      keys: 'Mod+D',
      action: 'duplicate',
      handler: (event) => this.duplicate('hotkey', event).length > 0,
    });
    keys.register({
      keys: 'Mod+A',
      action: 'select-all',
      handler: (event) => this.selectAll('hotkey', event),
    });
    keys.register({
      keys: ['+', '='],
      action: 'zoom-in',
      handler: () => void this.zoomIn({ reason: 'hotkey' }).then(() => this.#announceZoom()),
    });
    keys.register({
      keys: '-',
      action: 'zoom-out',
      handler: () => void this.zoomOut({ reason: 'hotkey' }).then(() => this.#announceZoom()),
    });
    keys.register({
      keys: ZOOM_FIT_KEYS,
      action: 'fit',
      handler: () => void this.fitViewTo({ reason: 'hotkey' }).then(() => this.#announceZoom()),
    });
    keys.register({
      keys: ZOOM_RESET_KEYS,
      action: 'zoom-reset',
      handler: () => void this.zoomTo(1, { reason: 'hotkey' }).then(() => this.#announceZoom()),
    });
    keys.register({
      keys: 'V',
      action: 'tool-select',
      handler: (event) => this.setTool('select', 'hotkey', event),
    });
    keys.register({
      keys: 'H',
      action: 'tool-pan',
      handler: (event) => this.setTool('pan', 'hotkey', event),
    });
    keys.register({ keys: 'E', action: 'edges', handler: () => this.#cycleFocusedEdges() });
  }

  #arrowKey(event: KeyboardEvent, key: FlowArrowKey): boolean {
    const connection = this.#arbiter?.connection;
    if (connection && connection.mode === 'keyboard') {
      connection.cycle(key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1);
      return true;
    }
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return false;
    const from = this.#focusedNode ?? this.selection.nodes[0];
    if (!from) return this.#focusEdgeNode(0);
    const next = nextNodeInDirection(this.#model, from, key);
    if (!next) return true;
    void this.focusNode(next, { reveal: true });
    return true;
  }

  #focusEdgeNode(index: 0 | -1): boolean {
    const nodes = this.#model.nodes.filter((node) => !node.hidden);
    const node = index === 0 ? nodes[0] : nodes[nodes.length - 1];
    if (!node) return false;
    void this.focusNode(node.id, { reveal: true });
    return true;
  }

  #nudgeKey(event: KeyboardEvent, factor: number): boolean {
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return false;
    const step = (this.snapGrid > 0 ? this.snapGrid : 16) * factor;
    const delta =
      event.key === 'ArrowRight'
        ? { x: step, y: 0 }
        : event.key === 'ArrowLeft'
          ? { x: -step, y: 0 }
          : event.key === 'ArrowDown'
            ? { x: 0, y: step }
            : { x: 0, y: -step };
    return this.nudgeSelection(delta, 'keyboard', event);
  }

  #enterKey(event: KeyboardEvent): boolean {
    const connection = this.#arbiter?.connection;
    if (connection && connection.mode === 'keyboard') {
      connection.confirm(event);
      this.#arbiter?.finishConnection();
      return true;
    }
    const host = this.#nodeHostInPath(event);
    if (!host || event.composedPath()[0] !== host) return false;
    const target = host.renderRoot.querySelector<HTMLElement>(
      'tp-flow-port, button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );
    if (!target) return false;
    target.focus();
    return true;
  }

  #toggleFocusedSelection(event: KeyboardEvent): boolean {
    const host = this.#nodeHostInPath(event);
    if (!host || event.composedPath()[0] !== host || !host.nodeId) return false;
    const id = host.nodeId;
    const current = this.selection;
    const nodes = current.nodes.includes(id)
      ? current.nodes.filter((item) => item !== id)
      : [...current.nodes, id];
    return this.#selectionState.set({ nodes, edges: current.edges }, 'keyboard', event, {
      metadata: { surface: 'keyboard' },
    });
  }

  #deleteSelection(event: KeyboardEvent): boolean {
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return false;
    const edges = [...this.selection.edges];
    if (this.#focusedEdge && !edges.includes(this.#focusedEdge)) edges.push(this.#focusedEdge);
    const nodes = this.selection.nodes.length
      ? this.selection.nodes
      : this.#focusedNode && !edges.length
        ? [this.#focusedNode]
        : [];
    if (!nodes.length && !edges.length) return false;
    const nearest = nodes[0] ? this.#nearestRemaining(nodes[0], new Set(nodes)) : undefined;
    const deleted = this.deleteElements({ nodes, edges }, 'hotkey', event);
    if (deleted && nearest) void this.focusNode(nearest);
    return deleted;
  }

  #nearestRemaining(id: string, removed: ReadonlySet<string>): string | undefined {
    const origin = this.#model.nodeRect(id);
    if (!origin) return undefined;
    let best: { id: string; distance: number } | undefined;
    for (const node of this.#model.nodes) {
      if (removed.has(node.id) || node.hidden) continue;
      const rect = this.#model.nodeRect(node.id);
      if (!rect) continue;
      const distance = Math.hypot(rect.x - origin.x, rect.y - origin.y);
      if (!best || distance < best.distance) best = { id: node.id, distance };
    }
    return best?.id;
  }

  #cycleFocusedEdges(): boolean {
    const from = this.#focusedNode ?? this.selection.nodes[0];
    if (!from) return false;
    const edges = this.#model.connectedEdges([from]);
    if (!edges.length) return false;
    const index = this.#focusedEdge ? edges.findIndex((edge) => edge.id === this.#focusedEdge) : -1;
    const next = edges[(index + 1) % edges.length]!;
    this.focusEdge(next.id);
    return true;
  }

  #keyboardContextReturn: HTMLElement | null = null;

  /**
   * Keyboard context invocation (Shift+F10, ContextMenu) anchors the menu at the focused node or
   * edge (the Menu's own keyboard anchor is its target, the canvas), focuses the first command
   * and returns focus when the menu closes.
   */
  #openContextMenuFromKeyboard(event: KeyboardEvent): boolean {
    if (this.contextMenu === false || this.effectiveDisabled) return false;
    const menu = this.renderRoot.querySelector<TpMenu>('tp-menu.context-menu');
    if (!menu) return false;
    const host = this.#nodeHostInPath(event);
    const proxy = this.#focusedEdge ? this.#edgeLayer.proxyElement(this.#focusedEdge) : undefined;
    const anchor: Element | null = host ?? proxy ?? this.#canvas;
    if (!anchor) return false;
    const rect = anchor.getBoundingClientRect();
    // Inside the anchor (not on its edge): an anchor point on the pane boundary reads as
    // clipped and the surface stays hidden.
    const point =
      anchor === this.#canvas
        ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
        : {
            x: rect.left + Math.min(24, rect.width / 2),
            y: rect.top + Math.min(24, rect.height / 2),
          };
    this.#keyboardContextReturn = (event.composedPath()[0] as HTMLElement | undefined) ?? null;
    anchor.dispatchEvent(
      new MouseEvent('contextmenu', {
        bubbles: true,
        composed: true,
        cancelable: true,
        button: 2,
        clientX: point.x,
        clientY: point.y,
      }),
    );
    void menu.updateComplete.then(() => {
      if (!menu.open) return;
      this.#scheduler?.animationFrame(() =>
        this.#scheduler?.animationFrame(() => {
          if (menu.open) menu.querySelector<HTMLElement>('tp-menu-item:not([disabled])')?.focus();
        }),
      );
    });
    return true;
  }

  // ---- constituents: panels, inspector, toolbar, editor ----------------------------------------

  #runTransportState(): FlowRunTransportState | undefined {
    const player = this.#player;
    return player
      ? { playing: player.playing, index: player.index, length: player.length }
      : undefined;
  }

  /** Bars the root keeps in sync: the built-in one and authored ones slotted into panels. */
  #controlBars(): TpFlowControls[] {
    const bars: TpFlowControls[] = [];
    const builtIn = this.renderRoot?.querySelector<TpFlowControls>('tp-flow-controls.controls');
    if (builtIn) bars.push(builtIn);
    for (const position of FLOW_PANEL_POSITIONS)
      for (const element of this.#adoption.panel(position))
        if (element.localName === 'tp-flow-controls') bars.push(element as TpFlowControls);
    return bars;
  }

  /** Authored bars receive the state the built-in bar gets from the template. */
  #syncAuthoredControlBars(): void {
    for (const bar of this.#controlBars()) {
      if (bar.classList.contains('controls') && bar.getRootNode() === this.renderRoot) continue;
      bar.tool = this.tool;
      bar.locked = this.locked;
      bar.canUndo = this.canUndo;
      bar.canRedo = this.canRedo;
      bar.readOnly = !this.editable;
      bar.disabled = this.effectiveDisabled;
      bar.strings = this.#resolvedStrings;
      bar.zoom = this.viewport.zoom;
      bar.zoomPresets = this.zoomPresets;
      bar.runState = this.#runTransportState();
    }
  }

  #renderBuiltInPanels(position: FlowPanelPosition): TemplateResult | typeof nothing {
    const strings = this.#resolvedStrings;
    const controls =
      this.controls.length && this.controlsPosition === position
        ? html`<tp-flow-controls
            class="controls"
            .actions=${this.controls}
            orientation=${this.controlsOrientation}
            .tool=${this.tool}
            .locked=${this.locked}
            .canUndo=${this.canUndo}
            .canRedo=${this.canRedo}
            .readOnly=${!this.editable}
            .strings=${strings}
            .zoom=${this.viewport.zoom}
            .zoomPresets=${this.zoomPresets}
            .runState=${this.#runTransportState()}
          ></tp-flow-controls>`
        : nothing;
    const minimap =
      this.minimap && this.minimapPosition === position
        ? html`<tp-flow-minimap class="minimap" .strings=${strings}></tp-flow-minimap>`
        : nothing;
    const palette =
      this.palette && this.palettePosition === position
        ? html`<tp-flow-palette
            class="palette"
            .definitions=${this.schema?.nodes ?? []}
            .icons=${this.icons}
            .strings=${strings}
            .label=${format(strings.paletteLabel, { flow: this.#name })}
            .open=${true}
          ></tp-flow-palette>`
        : nothing;
    if (controls === nothing && minimap === nothing && palette === nothing) return nothing;
    return html`${controls}${minimap}${palette}`;
  }

  #renderInspector(): TemplateResult {
    // Open, it follows the selection; closing, it keeps the last node through its exit motion.
    const node = this.inspectorOpen ? this.#inspectedNode() : this.#inspectorNode;
    if (this.inspectorOpen) this.#inspectorNode = node;
    const id = node?.id;
    const connected = id ? this.#model.connectedEdges([id]) : [];
    const label = (edge: FlowEdge) => this.#edgeAriaLabelOf(edge);
    return html`<tp-flow-inspector
      class="inspector"
      .node=${node}
      .definition=${node ? this.#model.definitionOf(node) : undefined}
      .propertyControls=${this.propertyControls}
      .icons=${this.icons}
      .strings=${this.#resolvedStrings}
      .label=${format(this.#resolvedStrings.inspectorLabel, { flow: this.#name })}
      .connections=${{
        incoming: connected
          .filter((edge) => edge.target === id)
          .map((edge) => ({ edge, label: label(edge) })),
        outgoing: connected
          .filter((edge) => edge.source === id)
          .map((edge) => ({ edge, label: label(edge) })),
      }}
      .run=${id ? this.#runNode(id) : undefined}
      commit=${this.inspectorCommit}
      .open=${this.inspectorOpen}
      .readOnly=${!this.editable}
    ></tp-flow-inspector>`;
  }

  #renderNodeToolbarContent(): TemplateResult | typeof nothing {
    const node = this.#singleSelectedNode();
    if (!node || this.nodeToolbar === false) return nothing;
    if (this.nodeToolbar)
      return this.nodeToolbar({ node, definition: this.#model.definitionOf(node) });
    const strings = this.#resolvedStrings;
    return html`
      ${
        this.#inspectable(node)
          ? html`<tp-button
              variant="ghost"
              size="icon-xs"
              .icon=${settingsIcon}
              .ariaLabel=${strings.settings}
              @click=${this.#toolbarSettings}
            ></tp-button>`
          : nothing
      }
      <tp-button
        variant="ghost"
        size="icon-xs"
        .icon=${copyIcon}
        .ariaLabel=${strings.duplicate}
        @click=${this.#toolbarDuplicate}
      ></tp-button>
      ${
        this.autoLayout === 'none'
          ? nothing
          : html`<tp-button
              variant="ghost"
              size="icon-xs"
              .icon=${pinIcon}
              .ariaLabel=${strings.pin}
              aria-pressed=${node.pinned ? 'true' : 'false'}
              @click=${this.#toolbarPin}
            ></tp-button>`
      }
      <tp-button
        variant="ghost"
        size="icon-xs"
        .icon=${trashIcon}
        .ariaLabel=${strings.delete}
        @click=${this.#toolbarDelete}
      ></tp-button>
    `;
  }

  #toolbarDuplicate = (event: Event): void => {
    this.duplicate('trigger-press', event);
  };

  /** Settings opens the inspector by activation: its first field takes focus once shown. */
  #toolbarSettings = (event: Event): void => {
    this.#openSettings('trigger-press', event);
  };

  #openSettings(reason: ChangeReason, event: Event): void {
    const opened = this.inspectorOpen || this.setInspectorOpen(true, reason, event);
    if (opened) this.#focusInspectorWhenShown();
  }

  /**
   * Whether a node offers the inspector: its definition places at least one property there
   * (the schema decides; a node that shows all of its settings has no panel to open).
   */
  #inspectable(node: FlowNode | undefined): boolean {
    return (
      this.inspector !== 'none' &&
      node !== undefined &&
      inspectorProperties(this.#model.definitionOf(node)).length > 0
    );
  }

  /** The panel mounts with the lane's render; focus lands once the panel can take it. */
  #focusInspectorWhenShown(attempts = 8): void {
    const inspector = this.#inspectorElement;
    if (!inspector || attempts <= 0 || !this.inspectorOpen) return;
    inspector.focus();
    // A shadow host matches :focus-within while focus is anywhere in its shadow tree.
    if (!inspector.matches(':focus-within'))
      this.#scheduler?.animationFrame(() => this.#focusInspectorWhenShown(attempts - 1));
  }

  /**
   * The inspector floats over the canvas at its inline end: when it opens on a node, or follows
   * the selection to another, a node it covers pans clear of it by the least distance.
   */
  #revealInspectedNode(): void {
    const id = this.inspectorOpen ? this.#inspectorNode?.id : undefined;
    if (id === this.#revealedInspectorNode) return;
    this.#revealedInspectorNode = id;
    if (!id || !this.#revealArmed) return;
    this.#scheduler?.animationFrame(() => {
      const inspector = this.#inspectorElement;
      const rect = this.#model.nodeRect(id);
      if (!inspector || !rect || id !== this.#revealedInspectorNode || !this.#canvas) return;
      const canvas = this.#canvas.getBoundingClientRect();
      const panel = inspector.getBoundingClientRect();
      const panelStart = panel.left - canvas.left;
      const panelEnd = panel.right - canvas.left;
      const start = this.#viewportOwner.flowToScreen(rect).x;
      const end = this.#viewportOwner.flowToScreen({ x: rect.x + rect.width, y: rect.y }).x;
      // Only a node the panel covers moves; it stops the panel's gap away from it.
      if (end <= panelStart || start >= panelEnd) return;
      const rtl = getComputedStyle(this).direction === 'rtl';
      const gap = rtl ? panelStart : canvas.width - panelEnd;
      // A node wider than the free extent keeps its start in view.
      const dx = rtl
        ? Math.min(panelEnd + gap - start, canvas.width - gap - end)
        : Math.max(panelStart - gap - end, gap - start);
      const viewport = this.viewport;
      void this.#viewportOwner.animateTo(
        this.#clamp({ ...viewport, x: viewport.x + dx }),
        'imperative-action',
        250,
      );
    });
  }

  #toolbarPin = (event: Event): void => {
    const node = this.#singleSelectedNode();
    if (!node || !this.editable) return;
    const result = this.propose(
      [{ type: 'node-update', id: node.id, patch: { pinned: !node.pinned } }],
      'trigger-press',
      { surface: 'toolbar', nodeId: node.id },
      event,
    );
    if (result.applied) this.commit('trigger-press', event);
  };

  #toolbarDelete = (event: Event): void => {
    this.deleteElements(
      { nodes: this.selection.nodes, edges: this.selection.edges },
      'trigger-press',
      event,
    );
  };

  #singleSelectedNode(): FlowNode | undefined {
    const selection = this.selection;
    if (selection.nodes.length !== 1 || selection.edges.length) return undefined;
    return this.#model.getNode(selection.nodes[0]!);
  }

  #inspectedNode(): FlowNode | undefined {
    const node = this.#singleSelectedNode();
    return this.#inspectable(node) ? node : undefined;
  }

  #singleSelectedEdge(): FlowEdge | undefined {
    const selection = this.selection;
    if (selection.edges.length !== 1 || selection.nodes.length) return undefined;
    return this.#model.getEdge(selection.edges[0]!);
  }

  #edgeAriaLabelOf(edge: FlowEdge): string {
    if (this.getEdgeAriaLabel) return this.getEdgeAriaLabel(edge);
    const strings = this.#resolvedStrings;
    const base = format(strings.edgeFrom, {
      source: this.#nodeLabel(edge.source),
      target: this.#nodeLabel(edge.target),
    });
    const text = edge.label ?? edge.labels?.[0]?.text;
    return text ? `${base}, ${text}` : base;
  }

  #selectionChanged(value: FlowSelection, reason: ChangeReason): void {
    const single = value.nodes.length === 1 && value.edges.length === 0;
    // Keyboard and marquee selections are announced; pointer presses are self-evident.
    if (ANNOUNCED_SELECTION_REASONS.has(reason)) {
      const count = value.nodes.length + value.edges.length;
      this.#announcer.announce(
        count
          ? format(this.#resolvedStrings.announceSelected, { count })
          : this.#resolvedStrings.announceCleared,
      );
    }
    // A double press opens the inspector; while open it follows a single node that has
    // inspector settings and closes when the selection leaves them.
    if (this.inspector === 'auto' && this.inspectorOpen) {
      const node = single ? this.#model.getNode(value.nodes[0]!) : undefined;
      if (!this.#inspectable(node))
        this.#inspectorState.set(false, reason, undefined, { metadata: { surface: 'inspector' } });
    }
    this.requestUpdate();
  }

  get #minimapElement(): TpFlowMinimap | null {
    return this.renderRoot.querySelector<TpFlowMinimap>('tp-flow-minimap.minimap');
  }

  get #toolbarElement(): TpFlowNodeToolbar | null {
    return this.renderRoot.querySelector<TpFlowNodeToolbar>('tp-flow-node-toolbar.node-toolbar');
  }

  get #editorElement(): TpFlowEdgeEditor | null {
    return this.renderRoot.querySelector<TpFlowEdgeEditor>('tp-flow-edge-editor.edge-editor');
  }

  get #inspectorElement(): TpFlowInspector | null {
    return this.renderRoot.querySelector<TpFlowInspector>('tp-flow-inspector');
  }

  get #paletteElement(): TpFlowPalette | null {
    return this.renderRoot.querySelector<TpFlowPalette>('tp-flow-palette.palette');
  }

  /** Per-frame state of the minimap, node toolbar and edge editor (no layout reads). */
  #syncOverlays(viewport: FlowViewport): void {
    const model = this.#model;
    // The zoom field follows the view without re-rendering the root.
    if (viewport.zoom !== this.#publishedZoom) {
      this.#publishedZoom = viewport.zoom;
      for (const bar of this.#controlBars()) bar.zoom = viewport.zoom;
    }
    const palette = this.#paletteElement;
    if (palette) {
      // The Command list reads this hook for its max height; keep the palette clear of the
      // opposite panel on short panes, including a controls bar docked on the same side.
      const available = Math.min(
        this.#size.height * 0.55,
        this.#size.height - this.#paletteReserve(),
      );
      const height = `${Math.round(Math.max(120, available))}px`;
      if (palette.style.getPropertyValue('--tp-available-height') !== height)
        palette.style.setProperty('--tp-available-height', height);
    }
    const minimap = this.#minimapElement;
    if (minimap) {
      const selected = new Set(this.selection.nodes);
      const nodes: { rect: FlowRect; tone?: string; selected?: boolean }[] = [];
      for (const node of model.nodes) {
        if (node.hidden) continue;
        const rect = model.nodeRect(node.id);
        if (!rect) continue;
        const tone = model.definitionOf(node)?.tone;
        nodes.push({
          rect,
          ...(tone ? { tone } : {}),
          ...(selected.has(node.id) ? { selected: true } : {}),
        });
      }
      minimap.setScene({
        bounds: model.bounds(),
        nodes,
        viewport: visibleRect(viewport, this.#size),
      });
    }
    const toolbar = this.#toolbarElement;
    if (toolbar) {
      const node = this.#singleSelectedNode();
      const rect =
        node && this.editable && this.nodeToolbar !== false ? model.nodeRect(node.id) : undefined;
      if (rect) {
        const origin = this.flowToScreen({ x: rect.x, y: rect.y });
        toolbar.setAnchor({
          x: origin.x,
          y: origin.y,
          width: rect.width * viewport.zoom,
          height: rect.height * viewport.zoom,
        });
        if (!toolbar.open) toolbar.open = true;
      } else if (toolbar.open || toolbar.anchor) {
        toolbar.setAnchor(null);
        toolbar.open = false;
      }
    }
    const editor = this.#editorElement;
    if (editor) {
      const edge = this.#singleSelectedEdge();
      const path = edge ? this.#edgeLayer.paths.get(edge.id) : undefined;
      if (edge && path && this.editable) {
        editor.hidden = false;
        editor.edgeId = edge.id;
        editor.points = path.points;
        editor.waypoints = edge.waypoints ?? [];
        const refocus = this.#refocusWaypoint;
        if (refocus?.edgeId === edge.id) {
          this.#refocusWaypoint = undefined;
          void editor.updateComplete.then(() => {
            if (refocus.index >= 0) editor.focusWaypoint(refocus.index);
            else this.focusEdge(refocus.edgeId);
          });
        }
        editor.kind = model.edgeKind(edge);
        editor.zoom = viewport.zoom;
        editor.editable = true;
        editor.reconnectable = edge.reconnectable ?? true;
        const rendered = this.#edgeLayer.rendered.get(edge.id);
        editor.routed = rendered?.routed ?? false;
        if (rendered) {
          editor.sourceSide = rendered.source.side;
          editor.targetSide = rendered.target.side;
        }
        editor.label = this.#edgeAriaLabelOf(edge);
      } else if (!editor.hidden) {
        editor.hidden = true;
        editor.edgeId = '';
      }
    }
  }

  // ---- constituent events ------------------------------------------------------------------------

  #controlAction = (event: CustomEvent<FlowControlActionDetail>): void => {
    event.stopPropagation();
    const source = event.detail.sourceEvent ?? undefined;
    switch (event.detail.action) {
      case 'zoom-in':
        void this.zoomIn({ reason: 'trigger-press' });
        break;
      case 'zoom-out':
        void this.zoomOut({ reason: 'trigger-press' });
        break;
      case 'fit':
        void this.fitViewTo({ reason: 'trigger-press' });
        break;
      case 'lock':
        this.locked = !this.locked;
        break;
      case 'layout':
        this.layout(undefined, { sourceEvent: source });
        break;
      case 'undo':
        this.undo('trigger-press', source);
        break;
      case 'redo':
        this.redo('trigger-press', source);
        break;
      default:
        break;
    }
  };

  /** The zoom field: a typed level (Enter) or a menu choice (fit, a preset). */
  #zoomRequest = (event: CustomEvent<FlowZoomRequestDetail>): void => {
    event.stopPropagation();
    const { zoom, fit, sourceEvent } = event.detail;
    const reason: ChangeReason = sourceEvent?.type.startsWith('key') ? 'keyboard' : 'trigger-press';
    if (fit) void this.fitViewTo({ reason });
    else if (zoom !== undefined) void this.zoomTo(zoom, { reason });
  };

  #toolRequest = (event: CustomEvent<FlowToolRequestDetail>): void => {
    event.stopPropagation();
    this.setTool(event.detail.tool, 'trigger-press', event.detail.sourceEvent ?? undefined);
    this.requestUpdate();
  };

  #runAction = (event: CustomEvent<FlowRunActionDetail>): void => {
    event.stopPropagation();
    const { action, index } = event.detail;
    this.runTransport(action, index);
  };

  #minimapStep = (event: CustomEvent<FlowMinimapStepDetail>): void => {
    event.stopPropagation();
    const viewport = this.viewport;
    void this.setViewport(
      {
        x: viewport.x - event.detail.dx * viewport.zoom,
        y: viewport.y - event.detail.dy * viewport.zoom,
        zoom: viewport.zoom,
      },
      { duration: 0, reason: 'trigger-press' },
    );
  };

  #minimapPan = (event: CustomEvent<FlowMinimapPanDetail>): void => {
    event.stopPropagation();
    if (event.detail.phase === 'cancel') return;
    void this.setCenter(event.detail.center, { duration: 0, reason: 'drag' });
  };

  #paletteInsert = (event: CustomEvent<FlowPaletteInsertDetail>): void => {
    event.stopPropagation();
    const pending = this.#pendingInsert;
    this.#pendingInsert = undefined;
    const at = pending?.at ?? this.#viewportCenter();
    this.#insertNode(
      event.detail.type,
      at,
      'item-press',
      event.detail.sourceEvent ?? undefined,
      pending?.source,
    );
  };

  #paletteClose = (event: Event): void => {
    event.stopPropagation();
    this.#pendingInsert = undefined;
    this.focus();
  };

  #canvasDragOver = (event: DragEvent): void => {
    if (!this.editable || !event.dataTransfer?.types.includes(PALETTE_DRAG_TYPE)) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  };

  #canvasDrop = (event: DragEvent): void => {
    const type = event.dataTransfer?.getData(PALETTE_DRAG_TYPE);
    if (!type || !this.editable) return;
    event.preventDefault();
    this.#insertNode(
      type,
      this.screenToFlow({ x: event.clientX, y: event.clientY }),
      'pointer',
      event,
    );
  };

  #viewportCenter(): FlowPoint {
    const viewport = this.viewport;
    return {
      x: (this.#size.width / 2 - viewport.x) / viewport.zoom,
      y: (this.#size.height / 2 - viewport.y) / viewport.zoom,
    };
  }

  /** Inserts a node of a schema type centered at a flow point, optionally connecting it. */
  #insertNode(
    type: string,
    at: FlowPoint,
    reason: ChangeReason,
    sourceEvent?: Event,
    source?: ConnectionStartInfo,
  ): string | undefined {
    const definition = this.schema?.nodes.find((item) => item.type === type);
    if (!definition || !this.editable) return undefined;
    const size = definition.size ?? DEFAULT_NODE_SIZE_BY_SHAPE[definition.shape ?? 'card'];
    let position = { x: at.x - size.width / 2, y: at.y - size.height / 2 };
    if (this.snap && this.snapGrid > 0)
      position = snapPoint(position, [this.snapGrid, this.snapGrid]);
    const data: Record<string, unknown> = {};
    for (const property of definition.properties ?? [])
      if (property.default !== undefined) data[property.key] = property.default;
    const [id] = this.addNodes([{ type, position, data }], reason);
    if (!id) return undefined;
    if (source) {
      const ports = definition.ports.filter(
        (port) => port.direction !== source.direction && !port.hidden,
      );
      for (const port of ports) {
        const connection: FlowConnection =
          source.direction === 'output'
            ? { source: source.nodeId, target: id, targetPort: port.id }
            : { source: id, target: source.nodeId, sourcePort: port.id };
        if (source.portId !== undefined) {
          if (source.direction === 'output') connection.sourcePort = source.portId;
          else connection.targetPort = source.portId;
        }
        if (this.connect(connection, {}, 'connect', sourceEvent)) break;
      }
    }
    this.#selectionState.set({ nodes: [id], edges: [] }, reason, sourceEvent, {
      metadata: { surface: 'palette' },
    });
    void this.focusNode(id, { reveal: true });
    return id;
  }

  #inspectorChange = (event: CustomEvent<FlowInspectorChangeDetail>): void => {
    event.stopPropagation();
    const { nodeId, key, value, reason } = event.detail;
    const node = this.#model.getNode(nodeId);
    if (!node || !this.editable) return;
    this.propose(
      [{ type: 'node-data', id: nodeId, data: { ...node.data, [key]: value } }],
      reason,
      { surface: 'inspector', nodeId, property: key },
      event.detail.sourceEvent ?? undefined,
    );
  };

  #inspectorCommit = (event: CustomEvent<FlowInspectorCommitDetail>): void => {
    event.stopPropagation();
    this.commit('input', event.detail.sourceEvent ?? undefined, {
      surface: 'inspector',
      nodeId: event.detail.nodeId,
    });
  };

  #inspectorFocusEdge = (event: CustomEvent<FlowInspectorFocusEdgeDetail>): void => {
    event.stopPropagation();
    this.focusEdge(event.detail.edgeId, {
      focusVisible: surfaceInteraction(event.detail.sourceEvent) === 'keyboard',
    });
  };

  /** The inspector's enter or exit motion finished (Dialog's `tp-open-change-complete`). */
  #inspectorPresence = (event: CustomEvent<FlowInspectorPresenceDetail>): void => {
    event.stopPropagation();
    this.emit('tp-open-change-complete', { open: event.detail.open, surface: 'inspector' });
  };

  #inspectorClose = (event: CustomEvent<{ sourceEvent?: Event }>): void => {
    event.stopPropagation();
    this.#inspectorState.set(false, 'close-action', event.detail?.sourceEvent, {
      metadata: { surface: 'inspector' },
    });
    const node = this.#singleSelectedNode();
    if (node) void this.focusNode(node.id);
  };

  // ---- resize, waypoints, reconnect --------------------------------------------------------------

  #nodeResize = (event: CustomEvent<FlowNodeResizeDetail & { nodeId: string }>): void => {
    event.stopPropagation();
    const detail = event.detail;
    const model = this.#model;
    if (detail.phase === 'start') {
      const node = model.getNode(detail.nodeId);
      const rect = model.nodeRect(detail.nodeId);
      if (!node || !rect || !this.editable) return;
      const definition = model.definitionOf(node);
      this.#resize = {
        id: node.id,
        start: { x: node.position.x, y: node.position.y, width: rect.width, height: rect.height },
        min: definition?.minSize ?? { width: 48, height: 32 },
        max: definition?.maxSize,
        transaction: model.transaction({ label: 'resize', reason: 'drag' }),
      };
      return;
    }
    const session = this.#resize;
    if (!session) return;
    const reason: ChangeReason = detail.input === 'keyboard' ? 'keyboard' : 'drag';
    if (detail.phase === 'move' || detail.phase === 'end') {
      const zoom = this.viewport.zoom || 1;
      const dx = detail.dx / zoom;
      const dy = detail.dy / zoom;
      const { start, min, max } = session;
      const left = detail.corner.endsWith('left');
      const top = detail.corner.startsWith('top');
      let width = left ? start.width - dx : start.width + dx;
      let height = top ? start.height - dy : start.height + dy;
      if (detail.shiftKey) {
        const ratio = start.width / start.height || 1;
        if (Math.abs(width - start.width) >= Math.abs(height - start.height) * ratio)
          height = width / ratio;
        else width = height * ratio;
      }
      width = Math.max(min.width, max ? Math.min(max.width, width) : width);
      height = Math.max(min.height, max ? Math.min(max.height, height) : height);
      if (this.snap && this.snapGrid > 0) {
        width = Math.round(width / this.snapGrid) * this.snapGrid;
        height = Math.round(height / this.snapGrid) * this.snapGrid;
      }
      const changes: FlowChange[] = [
        { type: 'node-size', id: session.id, size: { width, height } },
      ];
      if (left || top)
        changes.push({
          type: 'node-position',
          id: session.id,
          position: {
            x: left ? start.x + (start.width - width) : start.x,
            y: top ? start.y + (start.height - height) : start.y,
          },
        });
      this.#lane.withProposal(
        {
          ...(detail.sourceEvent ? { sourceEvent: detail.sourceEvent } : {}),
          metadata: { surface: 'node', nodeId: session.id },
        },
        () => session.transaction.apply(changes, { reason }),
      );
    }
    if (detail.phase === 'end') {
      this.#resize = undefined;
      if (detail.dx === 0 && detail.dy === 0) session.transaction.rollback(reason);
      else {
        session.transaction.commit();
        this.commit(reason, detail.sourceEvent ?? undefined, {
          surface: 'node',
          nodeId: session.id,
        });
      }
    } else if (detail.phase === 'cancel') {
      this.#resize = undefined;
      this.#lane.withProposal({ metadata: { surface: 'node', nodeId: session.id } }, () =>
        session.transaction.rollback('escape-key'),
      );
      this.#lane.commit('escape-key');
    }
  };

  #waypointsOf(edgeId: string): FlowPoint[] {
    return [...(this.#model.getEdge(edgeId)?.waypoints ?? [])];
  }

  #edgeWaypoint = (event: CustomEvent<FlowEdgeWaypointDetail>): void => {
    event.stopPropagation();
    const detail = event.detail;
    const edgeId = this.#editorElement?.edgeId;
    if (!edgeId || !this.editable) return;
    const reason: ChangeReason = detail.input === 'keyboard' ? 'keyboard' : 'drag';
    if (detail.phase === 'start') {
      this.#waypointTransaction = this.#model.transaction({ label: 'waypoint', reason });
      return;
    }
    const transaction = this.#waypointTransaction;
    if (!transaction) return;
    if (detail.phase === 'move' || detail.phase === 'end') {
      const waypoints = this.#waypointsOf(edgeId);
      let point = { x: detail.point.x, y: detail.point.y };
      if (this.snap && this.snapGrid > 0) point = snapPoint(point, [this.snapGrid, this.snapGrid]);
      waypoints[detail.index] = point;
      this.#lane.withProposal(
        {
          ...(detail.sourceEvent ? { sourceEvent: detail.sourceEvent } : {}),
          metadata: { surface: 'edge', edgeId },
        },
        () => transaction.apply([{ type: 'edge-waypoints', id: edgeId, waypoints }], { reason }),
      );
    }
    if (detail.phase === 'end') {
      this.#waypointTransaction = undefined;
      transaction.commit();
      this.commit(reason, detail.sourceEvent ?? undefined, { surface: 'edge', edgeId });
    } else if (detail.phase === 'cancel') {
      this.#waypointTransaction = undefined;
      this.#lane.withProposal({ metadata: { surface: 'edge', edgeId } }, () =>
        transaction.rollback('escape-key'),
      );
      this.#lane.commit('escape-key');
    }
  };

  #edgeWaypointRemove = (event: CustomEvent<FlowEdgeWaypointRemoveDetail>): void => {
    event.stopPropagation();
    const edgeId = this.#editorElement?.edgeId;
    if (!edgeId || !this.editable) return;
    const waypoints = this.#waypointsOf(edgeId);
    waypoints.splice(event.detail.index, 1);
    const result = this.propose(
      [{ type: 'edge-waypoints', id: edgeId, waypoints: waypoints.length ? waypoints : undefined }],
      'keyboard',
      { surface: 'edge', edgeId },
      event.detail.sourceEvent ?? undefined,
    );
    if (!result.applied) return;
    this.commit('keyboard', event.detail.sourceEvent ?? undefined, { surface: 'edge', edgeId });
    // The next waypoint (else the previous one) becomes the selected handle, so the next Delete
    // shows its target; with none left, focus returns to the edge.
    this.#refocusWaypoint = {
      edgeId,
      index: Math.min(event.detail.index, waypoints.length - 1),
    };
    this.#schedule();
  };

  #edgeSegment = (event: CustomEvent<FlowEdgeSegmentDetail>): void => {
    event.stopPropagation();
    const detail = event.detail;
    const editor = this.#editorElement;
    const edgeId = editor?.edgeId;
    if (!editor || !edgeId || !this.editable) return;
    const reason: ChangeReason = detail.input === 'keyboard' ? 'keyboard' : 'drag';
    if (detail.phase === 'start') {
      const a = editor.points[detail.index];
      const b = editor.points[detail.index + 1];
      if (!a || !b) return;
      this.#segment = { waypoints: this.#waypointsOf(edgeId), a: { ...a }, b: { ...b } };
      this.#waypointTransaction = this.#model.transaction({ label: 'segment', reason });
      return;
    }
    const transaction = this.#waypointTransaction;
    const segment = this.#segment;
    if (!transaction || !segment) return;
    if (detail.phase === 'move' || detail.phase === 'end') {
      const path = this.#edgeLayer.paths.get(edgeId);
      const shift = (point: FlowPoint): FlowPoint =>
        detail.axis === 'x'
          ? { x: point.x + detail.offset, y: point.y }
          : { x: point.x, y: point.y + detail.offset };
      const same = (a: FlowPoint, b: FlowPoint) =>
        Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
      let waypoints = segment.waypoints.filter(
        (point) => !same(point, segment.a) && !same(point, segment.b),
      );
      const base = path?.points ?? [segment.a, segment.b];
      waypoints = insertWaypoint(base, waypoints, shift(segment.a));
      waypoints = insertWaypoint(base, waypoints, shift(segment.b));
      this.#lane.withProposal(
        {
          ...(detail.sourceEvent ? { sourceEvent: detail.sourceEvent } : {}),
          metadata: { surface: 'edge', edgeId },
        },
        () => transaction.apply([{ type: 'edge-waypoints', id: edgeId, waypoints }], { reason }),
      );
    }
    if (detail.phase === 'end') {
      this.#waypointTransaction = undefined;
      this.#segment = undefined;
      transaction.commit();
      this.commit(reason, detail.sourceEvent ?? undefined, { surface: 'edge', edgeId });
    } else if (detail.phase === 'cancel') {
      this.#waypointTransaction = undefined;
      this.#segment = undefined;
      this.#lane.withProposal({ metadata: { surface: 'edge', edgeId } }, () =>
        transaction.rollback('escape-key'),
      );
      this.#lane.commit('escape-key');
    }
  };

  /** The connection start that keeps an edge's other end while `end` is re-targeted. */
  #reconnectStart(edgeId: string, end: 'source' | 'target'): ConnectionStart | undefined {
    const edge = this.#model.getEdge(edgeId);
    if (!edge) return undefined;
    const fixed: ConnectionStartInfo =
      end === 'target'
        ? { nodeId: edge.source, portId: edge.sourcePort, direction: 'output' }
        : { nodeId: edge.target, portId: edge.targetPort, direction: 'input' };
    return { ...fixed, reconnect: { edgeId, end } };
  }

  /**
   * Enter or Space on a reconnect anchor starts a keyboard reconnect: the arrows cycle the
   * valid sockets (each announced), Enter or Space on the anchor confirms (a button keeps its
   * activation keys, so the canvas never sees them) and Escape cancels.
   */
  #edgeReconnectKey = (event: CustomEvent<FlowEdgeReconnectKeyDetail>): void => {
    event.stopPropagation();
    const edgeId = this.#editorElement?.edgeId;
    const arbiter = this.#arbiter;
    if (!edgeId || !arbiter || !this.editable) return;
    const pending = arbiter.connection;
    if (pending) {
      if (pending.mode === 'keyboard') pending.confirm(event.detail.sourceEvent);
      else pending.cancel();
      arbiter.finishConnection();
      event.preventDefault();
      return;
    }
    const start = this.#reconnectStart(edgeId, event.detail.end);
    const session = start ? arbiter.startConnection(start, 'keyboard') : undefined;
    if (!session) return;
    event.preventDefault();
    if (!session.cycle(1)) {
      session.cancel();
      arbiter.finishConnection();
    }
  };

  #edgeReconnect = (event: CustomEvent<FlowEdgeReconnectDetail>): void => {
    event.stopPropagation();
    const detail = event.detail;
    const edgeId = this.#editorElement?.edgeId;
    const arbiter = this.#arbiter;
    if (!edgeId || !arbiter || !this.editable) return;
    if (detail.phase === 'start') {
      const start = this.#reconnectStart(edgeId, detail.end);
      if (!start) return;
      this.#reconnectSession = arbiter.startConnection(start, 'pointer');
      this.#reconnectSession?.moveTo(detail.point);
      return;
    }
    const session = this.#reconnectSession;
    if (!session) return;
    if (detail.phase === 'move') session.moveTo(detail.point);
    else if (detail.phase === 'end') {
      session.moveTo(detail.point);
      session.end(detail.sourceEvent, true);
      arbiter.finishConnection();
      this.#reconnectSession = undefined;
    } else {
      session.cancel();
      arbiter.finishConnection();
      this.#reconnectSession = undefined;
    }
  };

  // ---- routing ------------------------------------------------------------------------------

  /** Routes every routable edge now (synchronously) and returns the number of routes. */
  routeEdges(): number {
    const planner = this.#planner;
    if (!planner) return 0;
    planner.invalidateAll();
    while (!planner.run(50).done) {
      // resumable steps until the dirty set drains
    }
    this.#schedule();
    return planner.routes.size;
  }

  /** The routing planner's current routes by edge id (empty without a planner). */
  get routes(): ReadonlyMap<string, FlowEdgePath> {
    return this.#planner?.routes ?? new Map();
  }

  #syncRouter(): void {
    this.#disposePlanner();
    const router = this.router;
    if (router === 'none') {
      this.#edgeLayer.invalidate();
      this.#schedule();
      return;
    }
    const options: FlowRoutingPlannerOptions =
      router === 'orthogonal' ? { kinds: 'all' } : router === 'auto' ? {} : { router };
    const planner = createRoutingPlanner(this.#routingSource(), options);
    this.#planner = planner;
    this.#unsubscribePlanner = planner.subscribe((ids) => this.#routesUpdated(planner, ids));
    this.#schedule();
  }

  #disposePlanner(): void {
    this.#unsubscribePlanner?.();
    this.#unsubscribePlanner = undefined;
    this.#planner?.dispose();
    this.#planner = undefined;
    this.#pendingPaths.clear();
  }

  #routesUpdated(planner: FlowRoutingPlanner, ids: readonly string[]): void {
    for (const id of ids) {
      const route = planner.routes.get(id);
      if (route) this.#pendingPaths.set(id, route);
      else this.#pendingPaths.delete(id);
    }
  }

  /** The model surface the planner reads; endpoints resolve like the edge layer's. */
  #routingSource(): FlowRoutingSource {
    const model = this.#model;
    const empty: FlowRect = { x: 0, y: 0, width: 0, height: 0 };
    return {
      get nodes() {
        return model.nodes;
      },
      get edges() {
        return model.edges;
      },
      get schema() {
        return model.schema;
      },
      getEdge: (id) => model.getEdge(id),
      getNode: (id) => model.getNode(id),
      definitionOf: (node) => model.definitionOf(node),
      nodeRect: (id) => model.nodeRect(id) ?? empty,
      endpoint: (nodeId, portId, direction) =>
        resolveEndpoint({
          nodeId,
          rect: model.nodeRect(nodeId) ?? empty,
          ports: model.ports(nodeId),
          portId,
          direction,
          layout: model.layoutDirection,
          kind: 'orthogonal',
          loose: true,
        }),
      subscribe: (listener) => model.subscribe(listener),
      children: (id) => model.children(id),
    };
  }

  #rendererHost(): FlowRenderHost | null {
    const element = this.#edgesContainer;
    const view = this.ownerDocument.defaultView;
    if (!element || !view) return null;
    const size = (): FlowSize => this.#size;
    const viewport = (): FlowViewport => this.viewport;
    const reducedMotion = (): boolean => this.#reducedMotion();
    return {
      element,
      window: view,
      id: this.flowId,
      get size() {
        return size();
      },
      get devicePixelRatio() {
        return view.devicePixelRatio;
      },
      get viewport() {
        return viewport();
      },
      get reducedMotion() {
        return reducedMotion();
      },
      get forcedColors() {
        return view.matchMedia('(forced-colors: active)').matches;
      },
      token: (name) => getComputedStyle(this).getPropertyValue(name).trim(),
      requestRender: () => this.#schedule(),
    };
  }

  #reducedMotion(): boolean {
    return resolvesReducedMotion(this);
  }

  // ---- frames: culling, measurement, layers ---------------------------------------------------

  #schedule(): void {
    if (this.#frame || !this.#scheduler || !this.hasUpdated) return;
    this.#frame = this.#scheduler.animationFrame((time) => {
      this.#frame = undefined;
      this.#adaptCreateCap(time);
      this.#frameNow();
    });
  }

  /** Feeds the previous frame's interval back into the creation cap (consecutive frames only). */
  /** Runs one more frame once the viewport has been quiet for the settle window. */
  #settleFrame(): void {
    if (this.#settleTimer || !this.#scheduler) return;
    this.#settleTimer = this.#scheduler.timeout(() => {
      this.#settleTimer = undefined;
      this.#schedule();
    }, VIEW_SETTLE_MS + 16);
  }

  #adaptCreateCap(time: number): void {
    const last = this.#lastFrameAt;
    this.#lastFrameAt = time;
    if (!last || !this.#createdLastFrame) return;
    const interval = time - last;
    if (interval > 200) return;
    if (interval > FRAME_SLOW_MS)
      this.#createCap = Math.max(CREATE_PER_FRAME_MIN, Math.floor(this.#createCap / 2));
    else if (interval <= FRAME_FAST_MS)
      this.#createCap = Math.min(CREATE_PER_FRAME_MAX, this.#createCap + 1);
  }

  #frameNow(): void {
    if (!this.hasUpdated) return;
    const model = this.#model;
    const viewport = this.viewport;
    const wanted = new Set<string>();
    // Moving means the viewport changed within the settle window, not just since the last call:
    // a frame callback that runs before this frame's pan write must not count as settled.
    const now = performance.now();
    if (viewport !== this.#framedViewport) {
      this.#framedViewport = viewport;
      this.#movedAt = now;
    }
    const moving = now - this.#movedAt < VIEW_SETTLE_MS;
    if (moving) this.#settleFrame();
    if (this.virtualize && this.#size.width > 0) {
      const visible = visibleRect(viewport, this.#size);
      const expanded = expandRect(visible, Math.max(visible.width, visible.height) * OVERSCAN);
      for (const id of model.nodesInRect(expanded)) wanted.add(id);
      // Off-screen nodes are materialized a few per frame so their measurements settle edge
      // endpoints; while the viewport is moving the budget is deferred to keep the pan smooth.
      let budget = moving || this.lod === 'low' ? 0 : MATERIALIZE_PER_FRAME;
      let pending = false;
      if (this.lod !== 'low')
        for (const node of model.nodes) {
          if (node.hidden || wanted.has(node.id) || this.#nodeLayer.isMeasured(node.id)) continue;
          if (budget === 0) {
            pending = true;
            break;
          }
          wanted.add(node.id);
          budget -= 1;
        }
      if (pending) this.#schedule();
    } else {
      for (const node of model.nodes) if (!node.hidden) wanted.add(node.id);
    }
    // Progressive detail: hosts entering while the view moves are shells, upgraded a few per
    // frame once it settles (same box, so no layout shift).
    const provisional = moving && this.virtualize && this.lod !== 'low';
    this.#sliceCreation(wanted, viewport, provisional);
    this.#nodeLayer.update(wanted, { provisional });
    if (!moving && this.#nodeLayer.provisionalCount) {
      this.#createdLastFrame += Math.min(this.#createCap, this.#nodeLayer.provisionalCount);
      if (this.#nodeLayer.upgrade(this.#createCap)) this.#schedule();
    }
    const visibleNodes = this.#nodeLayer.visibleIds;
    const edgeIds = new Set<string>();
    if (this.virtualize && this.#size.width > 0) {
      const visible = visibleRect(viewport, this.#size);
      const expanded = expandRect(visible, Math.max(visible.width, visible.height) * OVERSCAN);
      for (const edge of model.edges) {
        if (edge.hidden) continue;
        if (visibleNodes.has(edge.source) || visibleNodes.has(edge.target)) {
          edgeIds.add(edge.id);
          continue;
        }
        const bbox = this.#edgeLayer.bboxOf(edge.id) ?? this.#edgeBounds(edge);
        if (bbox && rectsIntersect(bbox, expanded)) edgeIds.add(edge.id);
      }
    } else for (const edge of model.edges) if (!edge.hidden) edgeIds.add(edge.id);
    // Routing and then nudging run in budgeted slices; a frame with no dirty edge can still owe
    // the rest of a nudge.
    if (this.#planner?.pending) {
      const progress = this.#planner.run(ROUTE_BUDGET_MS);
      if (!progress.done) this.#schedule();
    }
    this.#edgeLayer.update(edgeIds);
    this.#edgeLayer.setViewport(viewport);
    this.#backgroundElement?.setViewport(viewport);
    this.#syncOverlays(viewport);
    const root = this.#root;
    if (root) {
      const lod = this.lod;
      if (root.getAttribute('data-lod') !== lod) root.setAttribute('data-lod', lod);
      const empty = model.nodes.length === 0;
      if (root.hasAttribute('data-empty') !== empty) root.toggleAttribute('data-empty', empty);
    }
  }

  /**
   * Keeps at most the current creation cap of not-yet-materialized nodes in `wanted`, nearest
   * to the view center first; the rest are created on the following frames.
   */
  #sliceCreation(wanted: Set<string>, viewport: FlowViewport, shells = false): void {
    this.#createdLastFrame = 0;
    if (!this.virtualize) return;
    const fresh: string[] = [];
    for (const id of wanted) if (!this.#nodeLayer.hostOf(id)) fresh.push(id);
    // Shells are cheaper to render, but a brand-new element still costs its construction:
    // they get a larger share of the same adaptive cap, not a flat allowance.
    const cap =
      this.lod === 'low' || shells
        ? Math.min(CREATE_SHELLS_PER_FRAME, this.#createCap * 2)
        : this.#createCap;
    this.#createdLastFrame = Math.min(fresh.length, cap);
    if (fresh.length <= cap) return;
    const center = {
      x: (this.#size.width / 2 - viewport.x) / viewport.zoom,
      y: (this.#size.height / 2 - viewport.y) / viewport.zoom,
    };
    const distance = (id: string): number => {
      const rect = this.#model.nodeRect(id);
      if (!rect) return Infinity;
      const dx = rect.x + rect.width / 2 - center.x;
      const dy = rect.y + rect.height / 2 - center.y;
      return dx * dx + dy * dy;
    };
    const ranked = fresh.map((id) => [id, distance(id)] as const).sort((a, b) => a[1] - b[1]);
    for (let index = cap; index < ranked.length; index += 1) wanted.delete(ranked[index]![0]);
    this.#schedule();
  }

  #edgeBounds(edge: FlowEdge): FlowRect | undefined {
    const source = this.#model.nodeRect(edge.source);
    const target = this.#model.nodeRect(edge.target);
    if (!source || !target) return undefined;
    const x = Math.min(source.x, target.x);
    const y = Math.min(source.y, target.y);
    return {
      x,
      y,
      width: Math.max(source.x + source.width, target.x + target.width) - x,
      height: Math.max(source.y + source.height, target.y + target.height) - y,
    };
  }

  #measured(id: string, size: FlowSize, ports: FlowPortGeometry[]): void {
    this.#model.measure(id, size, ports);
    if (this.fitView && !this.#fitted && !this.#userPanned && !this.#viewportState.controlled)
      this.#tryInitialFit();
  }

  #tryInitialFit(): void {
    if (!this.fitView || this.#fitted || this.#userPanned || this.#viewportState.controlled) return;
    if (!this.#size.width || !this.#size.height) return;
    const model = this.#model;
    const visible = this.#nodeLayer.visibleIds;
    if (!visible.size) return;
    if (
      model.nodes.some(
        (node) => !node.hidden && visible.has(node.id) && !this.#nodeLayer.isMeasured(node.id),
      )
    )
      return;
    const bounds = model.bounds();
    if (!bounds.width && !bounds.height) return;
    this.#fitted = true;
    const target = this.#viewportOwner.fitViewport(
      bounds,
      `${this.fitPadding}px`,
      Math.min(1, this.maxZoom),
    );
    if (this.#proposeViewport(target, 'window-resize', null, false))
      this.#viewportOwner.apply(this.viewport);
  }

  #sizeChanged(): void {
    // The initial fit runs once the pane has a size; later resizes (window changes) keep the
    // user's viewport instead of re-fitting mid-gesture.
    this.#measureControls();
    this.#frameNow();
    this.#tryInitialFit();
  }

  /** Block extent of the controls stack (read outside the frame loop: on size and root updates). */
  #measureControls(): void {
    const controls = this.renderRoot?.querySelector<HTMLElement>('tp-flow-controls');
    this.#controlsExtent = controls?.offsetHeight ?? 0;
  }

  /**
   * Height the palette leaves free when the controls share its inline side in another panel:
   * the controls' extent at the opposite end, the lower or upper half beside a centered bar, both
   * ends when the palette itself is centered.
   */
  #paletteReserve(): number {
    if (!this.#controlsExtent) return 0;
    const [paletteBlock, paletteInline] = this.palettePosition.split('-');
    const [controlsBlock, controlsInline] = this.controlsPosition.split('-');
    if (paletteInline !== controlsInline || paletteBlock === controlsBlock) return 0;
    const extent = this.#controlsExtent + PANEL_RESERVE_GAP;
    if (controlsBlock === 'center') return this.#size.height / 2 + extent / 2;
    if (paletteBlock === 'center') return extent * 2;
    return extent;
  }

  #bindNode(host: TpFlowNode, node: FlowNode): void {
    const definition = this.#model.definitionOf(node);
    if (!definition && !this.#unknownTypes.has(node.type)) {
      this.#unknownTypes.add(node.type);
      this.diagnose(
        'flow-schema',
        `No node definition for type "${node.type}"; a card is rendered from the node data.`,
      );
    }
    host.node = node;
    host.definition = definition;
    host.template = this.nodeTemplates[node.type];
    host.propertyControls = this.propertyControls;
    host.icons = this.icons;
    host.tones = this.#dataTypeTones();
    host.strings = this.#resolvedStrings;
    host.ports = this.mode === 'view' && !this.showPorts ? [] : this.#model.ports(node.id);
    host.portStates = this.#portStatesOf(node.id);
    host.status = this.#runNode(node.id);
    host.accessibleName = this.#nodeAriaLabel(node, definition);
    host.selected = this.selection.nodes.includes(node.id);
    host.focused = this.#focusedNode === node.id;
    host.lod = this.#nodeLayer.lodOf(node.id);
    host.editable = this.editable;
    host.connectable = this.editable && node.connectable !== false;
    host.disabled = this.effectiveDisabled;
    host.readOnly = this.readOnly || this.mode === 'view';
    host.showPortLabels = this.showPortLabels;
    const direction = this.#model.layoutDirection;
    host.layoutDirection = direction === 'vertical' ? 'vertical' : 'horizontal';
  }

  #hostAdded(host: TpFlowNode): void {
    host.addEventListener('focus', this.#nodeFocus);
    host.addEventListener('blur', this.#nodeBlur);
  }

  #nodeFocus = (event: FocusEvent): void => {
    const host = event.currentTarget as TpFlowNode;
    const id = host.nodeId;
    if (!id || !this.#model.getNode(id)) return;
    this.#setFocusedNode(id);
    host.focused = true;
  };

  #nodeBlur = (event: FocusEvent): void => {
    const host = event.currentTarget as TpFlowNode;
    host.focused = false;
  };

  #setFocusedNode(id: string | undefined): void {
    if (this.#focusedNode === id) return;
    const previous = this.#focusedNode;
    this.#focusedNode = id;
    this.#nodeLayer.focusedId = id;
    this.#nodeLayer.rebind([previous, id].filter((item): item is string => Boolean(item)));
  }

  #tonesCache: { schema: FlowSchema | undefined; tones: Record<string, string> } | undefined;

  /** Data-type tones; the object identity is stable while the schema is unchanged. */
  #dataTypeTones(): Record<string, string> {
    if (this.#tonesCache && this.#tonesCache.schema === this.schema) return this.#tonesCache.tones;
    const tones: Record<string, string> = {};
    this.schema?.dataTypes?.forEach((type, index) => {
      tones[type.id] = type.tone ?? `chart-${(index % 5) + 1}`;
    });
    this.#tonesCache = { schema: this.schema, tones };
    return tones;
  }

  readonly #portStatesCache = new Map<
    string,
    { key: string; states: Record<string, FlowPortState> }
  >();

  /** Port states keyed by port id; the object identity is stable while nothing changed. */
  #portStatesOf(nodeId: string): Record<string, FlowPortState> {
    const transient = this.#portStates.get(nodeId) ?? {};
    const states: Record<string, FlowPortState> = {};
    let key = '';
    for (const port of this.#model.ports(nodeId)) {
      const connected = this.#model.portConnections(nodeId, port.direction, port.id).length > 0;
      const state: FlowPortState = { ...(transient[port.id] ?? {}), connected };
      states[port.id] = state;
      key += `${port.id}:${JSON.stringify(state)};`;
    }
    const cached = this.#portStatesCache.get(nodeId);
    if (cached && cached.key === key) return cached.states;
    this.#portStatesCache.set(nodeId, { key, states });
    return states;
  }

  /** Sets transient port states (candidates, validity) and re-binds the affected host. */
  setPortState(nodeId: string, portId: string, state: FlowPortState | null): void {
    const states = this.#portStates.get(nodeId) ?? {};
    if (state) states[portId] = { ...(states[portId] ?? {}), ...state };
    else delete states[portId];
    this.#portStates.set(nodeId, states);
    const host = this.#nodeLayer.hostOf(nodeId);
    const node = this.#model.getNode(nodeId);
    if (host && node) this.#bindNode(host, node);
  }

  clearPortStates(): void {
    const ids = [...this.#portStates.keys()];
    this.#portStates.clear();
    for (const id of ids) {
      const host = this.#nodeLayer.hostOf(id);
      const node = this.#model.getNode(id);
      if (host && node) this.#bindNode(host, node);
    }
  }

  #runNode(id: string): FlowNodeRunState | undefined {
    return this.#runState?.nodes.get(id);
  }

  #runEdge(id: string): FlowEdgeRunState | undefined {
    return this.#runState?.edges.get(id);
  }

  // ---- run state and stepper -------------------------------------------------------------------

  /** The stepper over a trace given to `run`; undefined for a snapshot or no run. */
  get player(): FlowRunPlayer | undefined {
    return this.#player;
  }

  /** The run currently visualized (the player's state for traces). */
  get runState(): FlowRun | undefined {
    return this.#runState;
  }

  /** Drives the stepper: play/pause, step/back, seek, start/end. */
  runTransport(
    action: 'play' | 'pause' | 'step' | 'back' | 'seek' | 'start' | 'end',
    index?: number,
    speed?: number,
  ): boolean {
    const player = this.#player;
    if (!player) return false;
    switch (action) {
      case 'play':
        player.play(speed);
        return true;
      case 'pause':
        player.pause();
        return true;
      case 'step':
        return player.step();
      case 'back':
        return player.back();
      case 'seek':
        if (index === undefined) return false;
        player.seek(index);
        return true;
      case 'start':
        player.toStart();
        return true;
      case 'end':
        player.toEnd();
        return true;
      default:
        return false;
    }
  }

  #syncRun(): void {
    this.#unsubscribePlayer?.();
    this.#unsubscribePlayer = undefined;
    this.#player?.dispose();
    this.#player = undefined;
    const run = this.run;
    const trace = Array.isArray(run) ? (run as FlowTrace) : undefined;
    if (trace) {
      const player = new FlowRunPlayer(flowRunGraph(this.#model), { trace });
      this.#player = player;
      player.toEnd();
      this.#runState = player.state;
      this.#unsubscribePlayer = player.subscribe(() => {
        const previous = this.#runState;
        this.#runState = player.state;
        this.#runChanged(previous);
      });
    } else this.#runState = (run as FlowRun | null) ?? undefined;
    this.#runChanged(undefined);
  }

  #runChanged(previous: FlowRun | undefined): void {
    const run = this.#runState;
    this.#root?.toggleAttribute('data-running', Boolean(run && run.status !== 'idle'));
    this.#nodeLayer.rebind();
    this.#edgeLayer.invalidate();
    this.#schedule();
    // The controls' transport (index, length, playing) renders from the root template.
    this.requestUpdate();
    if (previous && run)
      for (const [id, state] of run.nodes)
        if (previous.nodes.get(id)?.status !== state.status)
          this.#announcer.announce(
            format(this.#resolvedStrings.announceStatus, {
              label: this.#nodeLabel(id),
              status: this.#statusLabel(state.status),
            }),
            { key: `status:${id}` },
          );
    const player = this.#player;
    this.dispatchEvent(
      new CustomEvent('tp-run-change', {
        bubbles: true,
        composed: true,
        detail: {
          run,
          ...(player
            ? {
                index: player.index,
                length: player.length,
                playing: player.playing,
                mode: player.mode,
              }
            : {}),
        },
      }),
    );
  }

  #statusLabel(status: FlowNodeRunState['status']): string {
    const strings = this.#resolvedStrings;
    const map: Record<FlowNodeRunState['status'], string> = {
      idle: strings.statusIdle,
      pending: strings.statusPending,
      running: strings.statusRunning,
      waiting: strings.statusWaiting,
      success: strings.statusSuccess,
      failed: strings.statusFailed,
      skipped: strings.statusSkipped,
      cancelled: strings.statusCancelled,
    };
    return map[status] ?? status;
  }

  #nodeLabel(id: string): string {
    const node = this.#model.getNode(id);
    if (!node) return id;
    return node.label ?? this.#model.definitionOf(node)?.label ?? node.type ?? id;
  }

  #nodeAriaLabel(node: FlowNode, definition: ReturnType<FlowModel['definitionOf']>): string {
    const status = this.#runNode(node.id);
    if (this.getNodeAriaLabel) return this.getNodeAriaLabel(node, definition, status);
    const parts = [this.#nodeLabel(node.id)];
    if (definition && definition.label !== parts[0]) parts.push(definition.label);
    if (status) parts.push(status.status);
    if (this.selection.nodes.includes(node.id)) parts.push(this.#resolvedStrings.selected);
    return parts.join(', ');
  }

  // ---- pointer policy -------------------------------------------------------------------------

  #panPolicy(): PanZoomPolicy {
    return {
      panButtons: this.tool === 'pan' ? [0, 1] : [1],
      wheel: this.wheel,
      pinch: true,
      doubleClickZoom: true,
      cooperative: this.cooperativeGestures,
      activationHeld: this.#spaceHeld,
      // One finger on the empty pane pans in either tool (a second finger pinches); a touch
      // marquee is not offered, as in xyflow without selection-on-drag.
      panOnTouch: true,
    };
  }
  #spaceHeld = false;
  #publishedZoom: number | undefined;

  /** Whether the pan/zoom owner may claim a pointer or wheel event. */
  #panFilter(event: PointerEvent | WheelEvent | MouseEvent): boolean {
    if (this.effectiveDisabled) return false;
    if (
      event.type === 'pointerdown' &&
      (event as PointerEvent).button === 0 &&
      event.shiftKey &&
      this.tool === 'pan'
    )
      return false;
    const path = event.composedPath();
    const canvas = this.#canvas;
    for (const target of path) {
      if (target === canvas) break;
      if (!(target instanceof Element)) continue;
      if (target.hasAttribute('data-no-pan') || target.localName === 'tp-menu') return false;
      // Wheels over nodes and panels pan the canvas unless their content can scroll that way;
      // the pan/zoom owner keeps a stream that started elsewhere whatever slides under it.
      if (
        target.localName === 'tp-flow-node' ||
        target.localName === 'tp-flow-port' ||
        target.localName === 'tp-flow-edge-label' ||
        target.classList.contains('panel')
      )
        return (
          event.type === 'wheel' &&
          (event.ctrlKey ||
            event.metaKey ||
            wheelScrollContainer(event as WheelEvent, target) === null)
        );
      if (target.getAttribute('part')?.includes('flow-edge-hit')) return event.type === 'wheel';
    }
    if (event.type === 'pointerdown' && interactiveTargetInPath(event, canvas ?? this))
      return false;
    return true;
  }

  // ---- selection on click (the drag arbiter extends this) ----------------------------------------

  #canvasPointerDown = (event: PointerEvent): void => {
    if (this.effectiveDisabled || event.button !== 0) return;
    const host = this.#nodeHostInPath(event);
    if (host) {
      if (interactiveTargetInPath(event, host)) return;
      this.#pressedNode = host.nodeId;
      this.#pressStart = { x: event.clientX, y: event.clientY };
      return;
    }
    const edge = this.#edgeInPath(event);
    if (edge) {
      this.#pressedEdge = edge;
      this.#pressStart = { x: event.clientX, y: event.clientY };
      return;
    }
    // Panels, the overlay and the editor layer are chrome: no pane semantics.
    for (const target of event.composedPath()) {
      if (target === this.#canvas) break;
      if (
        target instanceof Element &&
        (target.classList.contains('panel') ||
          target.classList.contains('overlay') ||
          target.classList.contains('editor') ||
          target.localName === 'tp-menu')
      )
        return;
    }
    if (interactiveTargetInPath(event, this.#canvas ?? this)) return;
    this.#pressedPane = this.tool === 'select';
    this.#pressStart = { x: event.clientX, y: event.clientY };
  };
  #pressedNode: string | undefined;
  #pressedEdge: string | undefined;
  #pressedPane = false;
  #pressStart: FlowPoint | undefined;

  #canvasPointerUp = (event: PointerEvent): void => {
    const start = this.#pressStart;
    const moved = start ? Math.hypot(event.clientX - start.x, event.clientY - start.y) > 3 : true;
    const node = this.#pressedNode;
    const edge = this.#pressedEdge;
    const pane = this.#pressedPane;
    this.#pressedNode = undefined;
    this.#pressedEdge = undefined;
    this.#pressedPane = false;
    this.#pressStart = undefined;
    if (moved || this.#viewportOwner.active) return;
    if (node) this.#selectOnPress(node, 'node', event);
    else if (edge) this.#selectOnPress(edge, 'edge', event);
    else if (pane && !event.shiftKey)
      this.#selectionState.set(EMPTY_SELECTION, 'item-press', event, {
        metadata: { surface: 'pane' },
      });
  };

  #selectOnPress(id: string, kind: 'node' | 'edge', event: PointerEvent): void {
    const current = this.selection;
    const list = kind === 'node' ? current.nodes : current.edges;
    let next: string[];
    if (event.metaKey || event.ctrlKey)
      next = list.includes(id) ? list.filter((item) => item !== id) : [...list, id];
    else if (event.shiftKey) next = list.includes(id) ? list : [...list, id];
    else next = [id];
    const selection: FlowSelection =
      kind === 'node'
        ? {
            nodes: next,
            edges: event.shiftKey || event.metaKey || event.ctrlKey ? current.edges : [],
          }
        : {
            nodes: event.shiftKey || event.metaKey || event.ctrlKey ? current.nodes : [],
            edges: next,
          };
    if (
      this.#selectionState.set(selection, 'item-press', event, { metadata: { surface: kind } }) &&
      kind === 'node'
    )
      this.#setFocusedNode(id);
  }

  #nodeHostInPath(event: Event): TpFlowNode | undefined {
    for (const target of event.composedPath()) {
      if (
        target instanceof Element &&
        target.localName === 'tp-flow-node' &&
        (target as TpFlowNode).node
      )
        return target as TpFlowNode;
      if (target === this.#canvas) break;
    }
    return undefined;
  }

  /** The node host under a pointer position (authored hosts through their light content). */
  #nodeHostAt(point: { clientX: number; clientY: number }): TpFlowNode | undefined {
    const root = this.renderRoot as ShadowRoot;
    const element = root.elementFromPoint?.(point.clientX, point.clientY);
    const host = element?.closest('tp-flow-node') as TpFlowNode | null | undefined;
    return host?.node ? host : undefined;
  }

  #edgeInPath(event: Event): string | undefined {
    for (const target of event.composedPath()) {
      if (target instanceof Element && target.getAttribute('part')?.includes('flow-edge-hit'))
        return target.getAttribute('data-edge') ?? undefined;
      if (target instanceof Element && target.getAttribute('part')?.includes('flow-edge-focus'))
        return target.getAttribute('data-edge') ?? undefined;
      if (target instanceof Element && target.localName === 'tp-flow-edge-label')
        return (target as TpFlowEdgeLabel).edgeId;
      if (target === this.#canvas) break;
    }
    return undefined;
  }

  #canvasPointerMove = (event: PointerEvent): void => {
    const connection = this.#arbiter?.connection;
    if (connection && connection.mode !== 'pointer') connection.move(event);
    if (this.#pressStart) return;
    const edge = this.#edgeInPath(event);
    if (edge !== this.#hoveredEdge) {
      this.#hoveredEdge = edge;
      this.#schedule();
    }
  };

  #canvasKeyDown = (event: KeyboardEvent): void => {
    if ((event.key === 'F10' && event.shiftKey) || event.key === 'ContextMenu') {
      if (this.#openContextMenuFromKeyboard(event)) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }
    if (event.key === ' ' && !interactiveTargetInPath(event, this.#canvas ?? this)) {
      if (!this.#spaceHeld) {
        this.#spaceHeld = true;
        this.#pane?.toggleAttribute('data-pan-active', true);
      }
      if (!event.repeat) this.#toggleFocusedSelection(event);
      event.preventDefault();
    }
    if (event.key === 'Escape') {
      if (this.#arbiter?.session) {
        this.#arbiter.cancel('escape', event);
        event.preventDefault();
        return;
      }
      const host = this.#nodeHostInPath(event);
      if (host && event.composedPath()[0] !== host) {
        // Leave the node's content and return to the host.
        host.focus();
        event.preventDefault();
        return;
      }
      if (this.selection.nodes.length + this.selection.edges.length)
        this.#selectionState.set(EMPTY_SELECTION, 'escape-key', event);
    }
  };

  #canvasKeyUp = (event: KeyboardEvent): void => {
    if (event.key === ' ' && this.#spaceHeld) {
      this.#spaceHeld = false;
      this.#pane?.toggleAttribute('data-pan-active', false);
    }
  };

  #proxyFocus = (event: FocusEvent): void => {
    const proxy = event.target as HTMLElement;
    const id = proxy.dataset['edge'];
    if (id) {
      this.#focusedEdge = id;
      // A pointer-driven focus (an edge chosen from the inspector by a click) draws no ring.
      this.#focusVisibleEdge = proxy.matches(':focus-visible') ? id : undefined;
      this.#schedule();
    }
  };

  #proxyBlur = (): void => {
    this.#focusedEdge = undefined;
    this.#focusVisibleEdge = undefined;
    this.#schedule();
  };

  // ---- nested events ----------------------------------------------------------------------------

  #containNested = (event: Event): void => {
    // Capture listeners on the host see the retargeted event; the real target is the path head.
    const target = event.composedPath()[0] as Node | undefined;
    if (!target || target === this) return;
    if (target.getRootNode() !== this.renderRoot) return;
    event.stopPropagation();
    if (
      event.type === 'tp-open-change' &&
      target instanceof Element &&
      target.classList.contains('context-menu')
    ) {
      // The context menu's open proposal surfaces on the widget with its surface named.
      const detail = (event as TpOpenChangeEvent).detail;
      const relayed = new TpOpenChangeEvent(
        detail.value,
        detail.previousValue,
        detail.reason,
        detail.sourceEvent,
      );
      Object.assign(relayed.detail, { metadata: { surface: 'context-menu' } });
      if (!this.dispatchEvent(relayed)) event.preventDefault();
      else if (!detail.value && this.#keyboardContextReturn) {
        const back = this.#keyboardContextReturn;
        this.#keyboardContextReturn = null;
        // A keyboard opening returns to its node; a pointer press that closed the menu shows no
        // keyboard focus ring there.
        const pointer = detail.sourceEvent?.type.startsWith('pointer') === true;
        if (back.isConnected)
          queueMicrotask(() => back.focus({ preventScroll: true, focusVisible: !pointer }));
      }
    }
  };

  // ---- context menu and waypoints --------------------------------------------------------------

  #canvasContextMenu = (event: MouseEvent): void => {
    if (this.contextMenu === false || this.effectiveDisabled) return;
    const selection = this.selection;
    const host = this.#nodeHostInPath(event);
    const edge = host ? undefined : this.#edgeInPath(event);
    this.#contextSubject = host?.nodeId
      ? { kind: 'node', nodeId: host.nodeId, selection }
      : edge
        ? { kind: 'edge', edgeId: edge, selection }
        : {
            kind: 'pane',
            point: this.screenToFlow({ x: event.clientX, y: event.clientY }),
            selection,
          };
    if (host?.nodeId && !selection.nodes.includes(host.nodeId))
      this.#selectionState.set({ nodes: [host.nodeId], edges: [] }, 'item-press', event, {
        metadata: { surface: 'node' },
      });
    this.#syncContextItems();
  };

  /**
   * Renders the subject's commands into the menu synchronously, before the invocation opens;
   * re-rendering them afterwards would replace the focused item and dismiss the menu.
   */
  #syncContextItems(): void {
    const menu = this.renderRoot.querySelector<HTMLElement>('tp-menu.context-menu');
    if (menu) render(this.#renderContextItems(), menu);
  }

  #renderContextItems(): TemplateResult | typeof nothing {
    const subject = this.#contextSubject;
    if (!subject) return nothing;
    if (this.contextMenu) return this.contextMenu(subject);
    const strings = this.#resolvedStrings;
    const editable = this.editable;
    if (subject.kind === 'node') {
      const node = this.#model.getNode(subject.nodeId);
      const count = this.#selectionItems().length;
      const arrange =
        count >= 2
          ? html`
              <tp-menu-item value="align-left" ?disabled=${!editable}
                >${strings.alignLeft}</tp-menu-item
              >
              <tp-menu-item value="align-top" ?disabled=${!editable}
                >${strings.alignTop}</tp-menu-item
              >
              <tp-menu-item value="distribute-x" ?disabled=${!editable || count < 3}
                >${strings.distributeHorizontally}</tp-menu-item
              >
              <tp-menu-item value="distribute-y" ?disabled=${!editable || count < 3}
                >${strings.distributeVertically}</tp-menu-item
              >
              <tp-separator></tp-separator>
            `
          : nothing;
      const settings =
        count < 2 && this.#inspectable(node)
          ? html`<tp-menu-item value="settings">${strings.settings}</tp-menu-item>
              <tp-separator></tp-separator>`
          : nothing;
      return html`
        ${settings}${arrange}
        <tp-menu-item value="duplicate" ?disabled=${!editable}>${strings.duplicate}</tp-menu-item>
        <tp-menu-item value="copy">${strings.copy}</tp-menu-item>
        <tp-menu-item value="cut" ?disabled=${!editable}>${strings.cut}</tp-menu-item>
        <tp-separator></tp-separator>
        ${
          this.autoLayout === 'none'
            ? nothing
            : html`<tp-menu-item value=${node?.pinned ? 'unpin' : 'pin'} ?disabled=${!editable}
                >${node?.pinned ? strings.unpin : strings.pin}</tp-menu-item
              >`
        }
        <tp-menu-item value="delete" ?disabled=${!editable}>${strings.delete}</tp-menu-item>
      `;
    }
    if (subject.kind === 'edge')
      return html`
        <tp-menu-item value="add-waypoint" ?disabled=${!editable}
          >${strings.addWaypoint}</tp-menu-item
        >
        <tp-menu-item value="delete" ?disabled=${!editable}>${strings.delete}</tp-menu-item>
      `;
    return html`
      <tp-menu-item value="paste" ?disabled=${!editable || !clipboardFallback}
        >${strings.paste}</tp-menu-item
      >
      <tp-menu-item value="select-all">${strings.selectAll}</tp-menu-item>
      <tp-separator></tp-separator>
      <tp-menu-item value="fit">${strings.fitView}</tp-menu-item>
      <tp-menu-item value="layout" ?disabled=${!editable}>${strings.layout}</tp-menu-item>
    `;
  }

  #contextAction = (event: CustomEvent<{ value: unknown; sourceEvent: Event }>): void => {
    event.stopPropagation();
    const subject = this.#contextSubject;
    const source = event.detail.sourceEvent;
    switch (event.detail.value) {
      case 'settings':
        if (subject?.kind === 'node') this.#openSettings('item-press', source);
        break;
      case 'duplicate':
        this.duplicate('item-press', source);
        break;
      case 'copy':
        void this.copy();
        break;
      case 'cut':
        void this.cut('item-press', source);
        break;
      case 'delete':
        if (subject?.kind === 'edge')
          this.deleteElements({ edges: [subject.edgeId] }, 'item-press', source);
        else if (subject?.kind === 'node')
          this.deleteElements(
            {
              nodes: this.selection.nodes.length ? this.selection.nodes : [subject.nodeId],
              edges: this.selection.edges,
            },
            'item-press',
            source,
          );
        break;
      case 'pin':
      case 'unpin':
        if (subject?.kind === 'node') {
          const result = this.propose(
            [
              {
                type: 'node-update',
                id: subject.nodeId,
                patch: { pinned: event.detail.value === 'pin' },
              },
            ],
            'item-press',
            { surface: 'menu', nodeId: subject.nodeId },
            source,
          );
          if (result.applied) this.commit('item-press', source);
        }
        break;
      case 'add-waypoint':
        if (subject?.kind === 'edge' && source instanceof MouseEvent)
          this.#addWaypoint(
            subject.edgeId,
            this.screenToFlow({ x: source.clientX, y: source.clientY }),
            'item-press',
            source,
          );
        break;
      case 'paste':
        this.paste(undefined, {
          reason: 'item-press',
          sourceEvent: source,
          ...(subject?.kind === 'pane' ? { at: subject.point } : {}),
        });
        break;
      case 'select-all':
        this.selectAll('item-press', source);
        break;
      case 'align-left':
        this.alignSelection('left', 'item-press', source);
        break;
      case 'align-top':
        this.alignSelection('top', 'item-press', source);
        break;
      case 'distribute-x':
        this.distributeSelection('x', 'even', 'item-press', source);
        break;
      case 'distribute-y':
        this.distributeSelection('y', 'even', 'item-press', source);
        break;
      case 'fit':
        void this.fitViewTo({ reason: 'trigger-press' });
        break;
      case 'layout':
        this.layout(undefined, { sourceEvent: source });
        break;
      default:
        break;
    }
  };

  #canvasDoubleClick = (event: MouseEvent): void => {
    const edgeId = this.#edgeInPath(event);
    // A press on a node body captures the pointer for the drag, so the click and the double
    // click that follow target the capturing element: find the node under the pointer.
    const host = this.#nodeHostInPath(event) ?? (edgeId ? undefined : this.#nodeHostAt(event));
    if (host) {
      this.#nodeDoubleClick(host, event);
      return;
    }
    if (!edgeId || !this.editable) return;
    event.preventDefault();
    this.#addWaypoint(
      edgeId,
      this.screenToFlow({ x: event.clientX, y: event.clientY }),
      'track-press',
      event,
    );
  };

  /**
   * A double press on a node opens the inspector when the schema places settings there; presses
   * on the node's own controls and ports keep their meaning (a double press selects text).
   */
  #nodeDoubleClick(host: TpFlowNode, event: MouseEvent): void {
    const node = this.#model.getNode(host.nodeId);
    if (
      this.effectiveDisabled ||
      event.button !== 0 ||
      !this.#inspectable(node) ||
      interactiveTargetInPath(event, host)
    )
      return;
    event.preventDefault();
    const selection = this.selection;
    if (selection.nodes.length !== 1 || selection.nodes[0] !== node!.id || selection.edges.length)
      this.#selectionState.set({ nodes: [node!.id], edges: [] }, 'item-press', event, {
        metadata: { surface: 'node' },
      });
    if (!this.inspectorOpen) this.setInspectorOpen(true, 'item-press', event);
  }

  /** Inserts a waypoint on an edge at the point, keeping existing waypoints ordered. */
  #addWaypoint(
    edgeId: string,
    point: FlowPoint,
    reason: ChangeReason,
    sourceEvent?: Event,
  ): boolean {
    const edge = this.#model.getEdge(edgeId);
    const path = this.#edgeLayer.paths.get(edgeId);
    if (!edge || !path || !this.editable) return false;
    // Ordered along the drawn line (a bezier's points are its control polygon).
    const waypoints = insertWaypoint(pathPolyline(path), edge.waypoints ?? [], point);
    const result = this.propose(
      [{ type: 'edge-waypoints', id: edgeId, waypoints }],
      reason,
      { surface: 'edge', edgeId },
      sourceEvent,
    );
    if (!result.applied) return false;
    this.commit(reason, sourceEvent, { surface: 'edge', edgeId });
    this.#selectionState.set({ nodes: [], edges: [edgeId] }, reason, sourceEvent, {
      metadata: { surface: 'edge' },
    });
    return true;
  }

  #nodeProperty = (event: CustomEvent<FlowNodePropertyDetail>): void => {
    const detail = event.detail;
    const node = this.#model.getNode(detail.nodeId);
    if (!node || !this.editable) {
      event.preventDefault();
      return;
    }
    if (detail.phase === 'propose') {
      const result = this.#lane.propose(
        [{ type: 'node-data', id: node.id, data: { ...node.data, [detail.key]: detail.value } }],
        {
          reason: detail.reason,
          sourceEvent: detail.sourceEvent,
          metadata: { surface: 'node', nodeId: node.id, property: detail.key },
        },
      );
      if (!result.applied && result.vetoedBy) event.preventDefault();
    } else {
      this.#lane.commit(detail.reason, detail.sourceEvent, {
        surface: 'node',
        nodeId: node.id,
        property: detail.key,
      });
    }
  };

  #nodePortsMoved = (event: CustomEvent<{ nodeId: string }>): void => {
    this.#nodeLayer.remeasurePorts(event.detail.nodeId);
  };

  #labelPress = (event: CustomEvent<{ edgeId: string; sourceEvent: Event }>): void => {
    this.#selectionState.set(
      { nodes: [], edges: [event.detail.edgeId] },
      'item-press',
      event.detail.sourceEvent,
      { metadata: { surface: 'edge' } },
    );
  };

  /** The edge label's "+" inserts a node from the palette on that edge (after its source). */
  #labelAdd = (event: CustomEvent<{ edgeId: string; sourceEvent: Event }>): void => {
    const edge = this.#model.getEdge(event.detail.edgeId);
    const path = this.#edgeLayer.paths.get(event.detail.edgeId);
    if (!edge || !path || !this.palette || !this.editable) return;
    this.#pendingInsert = {
      at: path.center,
      source: { nodeId: edge.source, portId: edge.sourcePort, direction: 'output' },
    };
    this.#paletteElement?.focus();
  };

  #syncComposition(): void {
    const changed = this.#composition !== this.partPresentation;
    this.#composition = this.partPresentation;
    for (const nested of this.renderRoot.querySelectorAll<
      HTMLElement & { partPresentation?: unknown }
    >('tp-flow-background, tp-flow-node, tp-flow-edge-label')) {
      if (!changed && this.#composed.has(nested)) continue;
      this.#composed.add(nested);
      setPartComposition(
        nested as Parameters<typeof setPartComposition>[0],
        this,
        this.partPresentation,
      );
    }
  }

  // ---- DOM lookups --------------------------------------------------------------------------------

  get #root(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.root') ?? null;
  }
  get #canvas(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.canvas') ?? null;
  }
  get #pane(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.pane') ?? null;
  }
  get #viewportElement(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.viewport') ?? null;
  }
  get #edgesContainer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.layer.edges') ?? null;
  }
  get #nodesContainer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.layer.nodes') ?? null;
  }
  get #nodeSlot(): HTMLSlotElement | null {
    return this.renderRoot?.querySelector<HTMLSlotElement>('slot.authored') ?? null;
  }
  get #labelsContainer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.layer.labels') ?? null;
  }
  get #proxiesContainer(): HTMLElement | null {
    return this.renderRoot?.querySelector<HTMLElement>('.focus-proxies') ?? null;
  }
  get #backgroundElement(): TpFlowBackground | null {
    return this.renderRoot?.querySelector<TpFlowBackground>('tp-flow-background') ?? null;
  }

  // ---- render ----------------------------------------------------------------------------------

  protected override render(): TemplateResult {
    const strings = this.#resolvedStrings;
    const instructionsId = `${this.flowId}-instructions`;
    const name = this.#name;
    return this.renderPart(
      'flow',
      { tool: this.tool, mode: this.mode, size: this.size },
      {
        tag: 'div',
        properties: {
          part: 'flow',
          class: 'root',
          role: 'application',
          'aria-label': name,
          'aria-roledescription': 'node graph',
          'aria-describedby': instructionsId,
          'data-tool': this.tool,
          'data-mode': this.mode,
          'data-auto-layout': this.autoLayout,
          'data-renderer': this.renderer === 'svg' ? 'svg' : 'custom',
          'data-readonly': this.readOnly,
          'data-disabled': this.effectiveDisabled,
          'data-inspector-open': this.inspectorOpen && this.inspector !== 'none',
          'data-running': Boolean(this.#runState && this.#runState.status !== 'idle'),
          'data-lod': this.lod,
        },
        content: html`
          ${this.#renderCanvas()} ${this.inspector === 'none' ? nothing : this.#renderInspector()}
          <p id=${instructionsId} class="visually-hidden" part="flow-instructions">
            ${strings.instructions}
          </p>
        `,
      },
    ) as TemplateResult;
  }

  #renderCanvas(): TemplateResult {
    const strings = this.#resolvedStrings;
    return html`
      <div
        class="canvas"
        tabindex=${this.effectiveDisabled ? -1 : 0}
        @dragover=${this.#canvasDragOver}
        @drop=${this.#canvasDrop}
        @pointerdown=${this.#canvasPointerDown}
        @pointerup=${this.#canvasPointerUp}
        @pointermove=${this.#canvasPointerMove}
        @keydown=${this.#canvasKeyDown}
        @keyup=${this.#canvasKeyUp}
        @copy=${this.#clipboardCopy}
        @cut=${this.#clipboardCut}
        @paste=${this.#clipboardPaste}
        @dblclick=${this.#canvasDoubleClick}
        @contextmenu=${this.#canvasContextMenu}
      >
        ${this.renderPart('flow-pane', { tool: this.tool }, { tag: 'div', properties: { part: 'flow-pane', class: 'pane', 'data-tool': this.tool, 'data-selecting': false } })}
        <tp-flow-background
          class="background"
          .pattern=${this.background}
          .gap=${this.snapGrid}
        ></tp-flow-background>
        ${this.renderPart(
          'flow-viewport',
          {},
          {
            tag: 'div',
            properties: { part: 'flow-viewport', class: 'viewport' },
            content: html`
              <div class="layer edges"></div>
              <div class="layer nodes"><slot class="authored" name="nodes"></slot></div>
              <div class="layer labels"></div>
              <div class="layer editor">
                <tp-flow-edge-editor
                  class="edge-editor"
                  .strings=${strings}
                  hidden
                ></tp-flow-edge-editor>
              </div>
              <div
                class="focus-proxies"
                @focusin=${this.#proxyFocus}
                @focusout=${this.#proxyBlur}
              ></div>
            `,
          },
        )}
        <div class="overlay">
          <div class="marquee" part="flow-selection" hidden></div>
          <tp-flow-node-toolbar class="node-toolbar" placement="top" .strings=${strings}
            >${this.#renderNodeToolbarContent()}</tp-flow-node-toolbar
          >
        </div>
        ${FLOW_PANEL_POSITIONS.map((position) => this.#renderPanel(position))}
        ${
          this.contextMenu === false
            ? nothing
            : html`<tp-menu
                class="context-menu"
                invocation="context"
                .portal=${false}
                @tp-action=${this.#contextAction}
              ></tp-menu>`
        }
      </div>
    `;
  }

  #renderPanel(position: FlowPanelPosition): TemplateResult {
    return this.renderPart(
      `flow-panel-${position}`,
      {},
      {
        tag: 'div',
        properties: { part: `flow-panel-${position}`, class: 'panel', 'data-position': position },
        content: html`${this.#renderBuiltInPanels(position)}<slot name=${position}></slot>`,
      },
    ) as TemplateResult;
  }

  /** Assigns authored panel children to their slots (manual slot assignment). */
  assignPanels(): void {
    for (const position of FLOW_PANEL_POSITIONS) {
      const slot = this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${position}"]`);
      const elements = this.#adoption.panel(position);
      if (slot) slot.assign(...elements);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow': TpFlow;
  }
}
