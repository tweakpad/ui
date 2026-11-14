import type { ChangeReason } from '../types.js';

/**
 * Flow engine types (`@tweakpad/ui/flow`). The engine is framework-free: documents, nodes, edges,
 * ports and schema definitions are plain data; runtime measurements, routes and run state are
 * derived and never serialized.
 */

/** A side of a node box, where a port sits. */
export type FlowSide = 'top' | 'right' | 'bottom' | 'left';
/** A position in flow units. */
export interface FlowPoint {
  x: number;
  y: number;
}
/** A width and height in flow units. */
export interface FlowSize {
  width: number;
  height: number;
}
/** A rectangle in flow units, given by its top-left corner and size. */
export interface FlowRect extends FlowPoint, FlowSize {}
/** The view's pan offset in screen pixels and its zoom factor. */
export interface FlowViewport {
  x: number;
  y: number;
  zoom: number;
}
/** `[[x1, y1], [x2, y2]]` in flow units. */
export type FlowExtent = readonly [readonly [number, number], readonly [number, number]];

/** The axis a layout runs along: ranks left to right or top to bottom. */
export type FlowLayoutDirection = 'horizontal' | 'vertical';
/**
 * A document's layout direction; `smart` picks the direction that fits, `none` leaves nodes where
 * they are.
 */
export type FlowLayoutMode = 'none' | FlowLayoutDirection | 'smart';

/**
 * Layout settings saved with a document: the direction, which also sets default port sides, and the
 * spacing.
 */
export interface FlowLayoutSettings {
  direction: FlowLayoutMode;
  /** Cross-axis gap between nodes of a rank (default 40). */
  nodeSpacing?: number;
  /** Main-axis gap between ranks (default 80). */
  rankSpacing?: number;
  /** Gap between packed components (default 60). */
  componentSpacing?: number;
  /** Component packing (default `grid`). */
  pack?: 'grid' | 'rows' | 'none';
}

/** The serializable flow graph: its nodes, edges, viewport and layout settings. */
export interface FlowDocument<N extends FlowNode = FlowNode, E extends FlowEdge = FlowEdge> {
  version: 1;
  /** Parents precede their children (`normalizeNodeOrder`). */
  nodes: N[];
  edges: E[];
  viewport?: FlowViewport;
  layout?: FlowLayoutSettings;
  metadata?: Record<string, unknown>;
}

/** A per-node override or addition to a port of the node's definition, matched by port id. */
export type FlowPortInstance = Partial<Omit<FlowPortDefinition, 'id'>> & { id: string };

/** Measured port box relative to its node, in flow units (runtime only). */
export interface FlowPortGeometry {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  side: FlowSide;
}

/** One node of a flow document: its type, position, data and per-instance flags. */
export interface FlowNode<Data extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  /** `FlowNodeDefinition.type`. */
  type: string;
  /** Parent-relative when `parentId` is set. */
  position: FlowPoint;
  /** Persisted size (resize or declaration); measurement is runtime only. */
  size?: FlowSize;
  data: Data;
  parentId?: string;
  extent?: 'parent' | FlowExtent;
  zIndex?: number;
  hidden?: boolean;
  /** Stripped by `toJSON` unless `{ selection: true }`. */
  selected?: boolean;
  draggable?: boolean;
  selectable?: boolean;
  connectable?: boolean;
  deletable?: boolean;
  /** Defaults to the definition's `resizable`. */
  resizable?: boolean;
  /** Per-instance port overrides and additions, by port id. */
  ports?: FlowPortInstance[];
  /** Defaults to the definition label. */
  label?: string;
  /** Kept in place by automatic layout. */
  pinned?: boolean;
}

/** The path shape an edge is drawn with. */
export type FlowEdgeKind = 'bezier' | 'straight' | 'step' | 'smoothstep' | 'orthogonal';

/** Shape parameters of an edge kind, set per schema kind or per edge. */
export interface FlowEdgeKindOptions {
  /** Bezier control offset factor (default 0.25). */
  curvature?: number;
  /** Corner radius for smoothstep (5) and orthogonal (8); step uses 0. */
  borderRadius?: number;
  /** Smoothstep gap from the port before the first bend (default 20). */
  offset?: number;
  /** Smoothstep split position along the main axis (default 0.5). */
  stepPosition?: number;
  /** Orthogonal stub length out of the port (default 24). */
  stub?: number;
}

/** A text label placed along an edge. */
export interface FlowEdgeLabel {
  text: string;
  /** Path parameter in 0–1 (default 0.5). */
  position?: number;
  align?: 'center' | 'start' | 'end';
  placement?: 'on' | 'above' | 'below';
}

/** The built-in symbols an edge end can show. */
export type FlowMarkerType = 'arrow' | 'arrowclosed' | 'circle' | 'diamond';
/** An edge end marker with its own size, color and orientation. */
export interface FlowMarkerDefinition {
  type: FlowMarkerType;
  width?: number;
  height?: number;
  color?: string;
  strokeWidth?: number;
  orient?: 'auto' | 'auto-start-reverse' | number;
  units?: 'strokeWidth' | 'userSpaceOnUse';
}
/** An edge end marker, given as a built-in symbol name or a full definition. */
export type FlowMarker = FlowMarkerType | FlowMarkerDefinition;

/**
 * One edge of a flow document, connecting a source port to a target port, with its shape, labels
 * and markers.
 */
export interface FlowEdge<Data extends Record<string, unknown> = Record<string, unknown>> {
  id: string;
  source: string;
  sourcePort?: string;
  target: string;
  targetPort?: string;
  /** Defaults to `schema.rules.defaultEdgeKind`, then `smoothstep`. */
  kind?: FlowEdgeKind;
  /** Merged over `schema.edgeKinds[kind]`. */
  options?: FlowEdgeKindOptions;
  /** Absolute must-pass points, in order. */
  waypoints?: FlowPoint[];
  /** Shorthand for `labels: [{ text }]`. */
  label?: string;
  labels?: FlowEdgeLabel[];
  markerStart?: FlowMarker;
  markerEnd?: FlowMarker;
  animated?: boolean;
  data?: Data;
  hidden?: boolean;
  selected?: boolean;
  selectable?: boolean;
  deletable?: boolean;
  reconnectable?: boolean | 'source' | 'target';
  zIndex?: number;
}

/** A proposed link between two node ports, checked before it becomes an edge. */
export interface FlowConnection {
  source: string;
  sourcePort?: string;
  target: string;
  targetPort?: string;
}

/** A data type ports can carry, with its label, tone and the types its inputs accept. */
export interface FlowDataTypeDefinition {
  id: string;
  label?: string;
  /** Token key such as `chart-2`. */
  tone?: string;
  /** Data type ids an input of this type accepts; absent means the same id or `any`. */
  accepts?: readonly string[];
}

/**
 * Graph-wide rules a schema enforces on connections: direction, cycles, self loops, duplicates and
 * type compatibility.
 */
export interface FlowSchemaRules {
  /** `strict` connects outputs to inputs only (default). */
  connectionMode?: 'strict' | 'loose';
  cycles?: 'allow' | 'forbid';
  selfLoops?: boolean;
  duplicateEdges?: boolean;
  defaultEdgeKind?: FlowEdgeKind;
  typeCompatibility?: (
    from: string | undefined,
    to: string | undefined,
    schema: FlowSchema,
  ) => boolean;
}

/**
 * A group of node definitions (their `category`): its label, tone and order in the node library,
 * and whether its section starts open there.
 */
export interface FlowCategoryDefinition {
  /** The `category` value of the definitions in this group. */
  id: string;
  /** Default: the id. */
  label?: string;
  tone?: string;
  /** Whether the group's section starts open in the sidebar library (default true). */
  open?: boolean;
}

/**
 * Declares what a flow can contain: node types, categories, data types, edge kinds and connection
 * rules.
 */
export interface FlowSchema {
  nodes: FlowNodeDefinition[];
  /** Order, labels and tones of the categories; categories not listed follow in first-use order. */
  categories?: FlowCategoryDefinition[];
  dataTypes?: FlowDataTypeDefinition[];
  edgeKinds?: Partial<Record<FlowEdgeKind, FlowEdgeKindOptions>>;
  rules?: FlowSchemaRules;
}

/** How a node is drawn: a card, a compact chip, a panel or a group that contains other nodes. */
export type FlowNodeShape = 'card' | 'compact' | 'panel' | 'group';

/** A node type of the schema: its label, look, ports, editable properties and validation. */
export interface FlowNodeDefinition {
  type: string;
  label: string;
  description?: string;
  /** Icon key resolved by the widget. */
  icon?: string;
  tone?: string;
  category?: string;
  /** Default `card`. */
  shape?: FlowNodeShape;
  ports: FlowPortDefinition[];
  properties?: FlowPropertyDefinition[];
  /** Size hint before measurement; defaults per shape. */
  size?: FlowSize;
  minSize?: FlowSize;
  maxSize?: FlowSize;
  resizable?: boolean;
  validate?: (node: FlowNode, context: FlowValidationContext) => readonly FlowIssue[] | void;
}

/** A connection point a node type declares, with its direction, data type and connection limits. */
export interface FlowPortDefinition {
  id: string;
  label?: string;
  direction: 'input' | 'output';
  dataType?: string;
  /** Absent: derived from the layout direction (horizontal: input left, output right). */
  side?: FlowSide;
  /** Inputs default to a single connection, outputs to many. */
  multiple?: boolean;
  required?: boolean;
  /** Property key rendered inline on the port row. */
  control?: string;
  hidden?: boolean;
}

/** The control that edits a node property; `custom` uses a control you supply. */
export type FlowPropertyControl =
  | 'number'
  | 'slider'
  | 'text'
  | 'textarea'
  | 'select'
  | 'switch'
  | 'checkbox'
  | 'color'
  | 'easing'
  | 'custom';

/** A test on one node data key that decides whether a property shows. */
export interface FlowCondition {
  key: string;
  equals?: unknown;
  in?: readonly unknown[];
  truthy?: boolean;
}

/** An editable node property: the data key, its control and the control's settings. */
export interface FlowPropertyDefinition {
  key: string;
  label: string;
  control: FlowPropertyControl;
  description?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  options?: ReadonlyArray<{ value: string | number; label: string }>;
  /**
   * Edits the value with a mono Input or Text area: the mono font role and no spelling,
   * correction or capitalization hints, for code-like values such as expressions and paths.
   * Number properties default to `true`; text properties to `false`.
   */
  mono?: boolean;
  default?: unknown;
  visibleWhen?: FlowCondition | ((data: Record<string, unknown>) => boolean);
  /** Port whose connection overrides this property. */
  port?: string;
  /**
   * Where the control renders: in the node body or in the inspector, never both. Defaults per
   * shape (`DEFAULT_PROPERTY_PLACEMENT_BY_SHAPE`): card and panel bodies hold their properties,
   * compact and group nodes have no body rows. A node offers the inspector only when its
   * definition places at least one property there.
   */
  placement?: FlowPropertyPlacement;
}

/** Where a property's control renders: in the node body or in the inspector. */
export type FlowPropertyPlacement = 'node' | 'inspector';

/** A validation problem found in the document, pointing at the node, edge or port it concerns. */
export interface FlowIssue {
  code: string;
  severity: 'error' | 'warning';
  message: string;
  nodeId?: string;
  edgeId?: string;
  portId?: string;
  path?: string;
}

/** Provenance of a change batch; the `ChangeReason` names the input source. */
export type FlowChangeOrigin =
  'user' | 'undo' | 'redo' | 'rollback' | 'layout' | 'route' | 'external' | 'measure';

/** Keys set to `undefined` are removed from the node (inverse patches restore absent keys). */
export type FlowNodePatch = {
  [K in keyof Omit<FlowNode, 'id' | 'position' | 'data'>]?:
    Omit<FlowNode, 'id' | 'position' | 'data'>[K] | undefined;
};
/** Keys set to `undefined` are removed from the edge; endpoint keys reconnect it. */
export type FlowEdgePatch = {
  [K in keyof Omit<FlowEdge, 'id' | 'waypoints'>]?:
    Omit<FlowEdge, 'id' | 'waypoints'>[K] | undefined;
};

/** One atomic edit to a flow document; the model applies, records and emits changes in batches. */
export type FlowChange =
  | { type: 'node-add'; node: FlowNode; index?: number }
  | { type: 'node-remove'; id: string }
  | { type: 'node-replace'; id: string; node: FlowNode }
  | { type: 'node-update'; id: string; patch: FlowNodePatch }
  | { type: 'node-position'; id: string; position: FlowPoint; dragging?: boolean }
  | { type: 'node-size'; id: string; size: FlowSize | undefined }
  | { type: 'node-select'; id: string; selected: boolean }
  | { type: 'node-data'; id: string; data: Record<string, unknown> }
  /** Runtime measurement; never serialized or recorded in history. */
  | {
      type: 'node-measure';
      id: string;
      measured?: FlowSize | undefined;
      ports?: readonly FlowPortGeometry[];
    }
  | { type: 'edge-add'; edge: FlowEdge; index?: number }
  | { type: 'edge-remove'; id: string }
  | { type: 'edge-replace'; id: string; edge: FlowEdge }
  | { type: 'edge-update'; id: string; patch: FlowEdgePatch }
  | { type: 'edge-select'; id: string; selected: boolean }
  | { type: 'edge-waypoints'; id: string; waypoints: FlowPoint[] | undefined }
  | { type: 'viewport'; viewport: FlowViewport }
  /** Document layout settings (direction drives the default port sides); recorded in history. */
  | { type: 'layout-settings'; layout: FlowLayoutSettings | undefined };

export type FlowChangeType = FlowChange['type'];

/**
 * What a node definition's `validate` function receives besides the node: the model, the schema and
 * any edge being reconnected.
 */
export interface FlowValidationContext {
  // Declared structurally so `validation.ts` has no import cycle with the model.
  model: FlowModelLike;
  schema: FlowSchema | undefined;
  /** Edge being reconnected; its own occupancy is ignored. */
  edgeId?: string;
}

/** The subset of the model that validation and the layout/run helpers read. */
export interface FlowModelLike {
  readonly document: FlowDocument;
  readonly schema: FlowSchema | undefined;
  getNode(id: string): FlowNode | undefined;
  getEdge(id: string): FlowEdge | undefined;
  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined;
  ports(id: string): readonly FlowResolvedPort[];
  portConnections(
    nodeId: string,
    direction?: 'input' | 'output',
    portId?: string,
  ): readonly string[];
  wouldCreateCycle(source: string, target: string): boolean;
}

/** A port definition merged with its instance override and runtime geometry. */
export interface FlowResolvedPort extends FlowPortDefinition {
  nodeId: string;
  /** Measured or default geometry relative to the node. */
  geometry: FlowPortGeometry;
  /** Position among the ports on the same side (0-based) and that side's count. */
  index: number;
  count: number;
  /** `geometry` came from a `node-measure` change rather than the default distribution. */
  measured?: boolean;
}

/** The ids of the selected nodes and edges. */
export interface FlowSelection {
  nodes: string[];
  edges: string[];
}

/**
 * A resolved edge end in absolute flow units: the point, the side it faces and the node and port it
 * belongs to.
 */
export interface FlowEndpoint {
  point: FlowPoint;
  side: FlowSide;
  nodeId: string;
  portId: string | undefined;
  /** Absolute node rect. */
  rect: FlowRect;
}

export type { ChangeReason };
