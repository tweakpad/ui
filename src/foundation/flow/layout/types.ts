import { DEFAULT_LAYOUT_OPTIONS } from '../defaults.js';
import type {
  FlowChange,
  FlowEdge,
  FlowLayoutDirection,
  FlowNode,
  FlowNodeDefinition,
  FlowPoint,
  FlowRect,
  FlowResolvedPort,
  FlowSide,
  FlowSize,
} from '../types.js';

/**
 * Layout engine contract (Widgets §6.3 Layout). A request is plain data: measured sizes,
 * parents, pins and the port order each edge attaches to; the result maps ids to absolute
 * positions and carries the parent-relative `node-position` / `node-size` changes.
 */
export interface FlowLayoutPort {
  id: string;
  direction: 'input' | 'output';
  /** Position among the ports of the same direction. */
  index: number;
  side?: FlowSide | undefined;
}

export interface FlowLayoutNode {
  id: string;
  size: FlowSize;
  /** Only when the parent is part of the request. */
  parentId?: string | undefined;
  pinned?: boolean | undefined;
  /** Container node (`shape: 'group'`); its size is derived from its children. */
  group?: boolean | undefined;
  /** Current absolute position; the layout keeps the previous top-left and pinned nodes. */
  position?: FlowPoint | undefined;
  /** Absolute position of a parent outside the request, for parent-relative output. */
  offset?: FlowPoint | undefined;
  ports: FlowLayoutPort[];
}

export interface FlowLayoutEdge {
  id: string;
  source: string;
  sourcePort?: string | undefined;
  target: string;
  targetPort?: string | undefined;
}

export type FlowLayoutRequestDirection = FlowLayoutDirection | 'smart';

export interface FlowLayoutGroupPadding {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface FlowLayoutOptions {
  /** Cross-axis gap between nodes of a rank (default 40). */
  nodeSpacing?: number | undefined;
  /** Main-axis gap between ranks (default 80). */
  rankSpacing?: number | undefined;
  /** Gap between packed components (default 60). */
  componentSpacing?: number | undefined;
  /** Group content padding (default top 40 for the label, 16 elsewhere). */
  groupPadding?: number | Partial<FlowLayoutGroupPadding> | undefined;
  /** Cross-axis alignment of the Brandes–Köpf result (default `center`, the median). */
  align?: 'start' | 'center' | 'end' | undefined;
  pack?: 'grid' | 'rows' | 'none' | undefined;
  /** Crossing minimization sweeps (default 8, capped at 24). */
  iterations?: number | undefined;
  /** Transpose pass after each sweep (default true). */
  transpose?: boolean | undefined;
  /** Long edges stop receiving dummies past this count (default 20000). */
  maxDummies?: number | undefined;
  /** Width/height the `smart` direction aims for (default 1.6). */
  viewportAspect?: number | undefined;
  /** Top-left of the result; defaults to the previous bounds of the laid-out nodes. */
  origin?: FlowPoint | undefined;
  /** Report the dummy positions of long edges as bend points. */
  bendPoints?: boolean | undefined;
}

export interface FlowLayoutRequest {
  nodes: FlowLayoutNode[];
  edges: FlowLayoutEdge[];
  direction: FlowLayoutRequestDirection;
  options?: FlowLayoutOptions | undefined;
}

export interface FlowLayoutStats {
  layers: number;
  dummies: number;
  crossings: number;
  components: number;
  elapsed: number;
}

export interface FlowLayoutResult {
  direction: FlowLayoutDirection;
  /** Absolute top-left positions of every laid-out node. */
  positions: Map<string, FlowPoint>;
  /** Derived group sizes. */
  sizes: Map<string, FlowSize>;
  /** Parent-relative changes for differences above 0.5. */
  changes: FlowChange[];
  bendPoints?: Map<string, FlowPoint[]>;
  bounds: FlowRect;
  stats: FlowLayoutStats;
}

export interface FlowLayoutEngine {
  layout(request: FlowLayoutRequest): FlowLayoutResult;
}

/** The model surface the request builder reads; `FlowModel` satisfies it structurally. */
export interface FlowLayoutSource {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  nodeRect(id: string): FlowRect;
  absolutePosition(id: string): FlowPoint;
  ports(id: string): readonly FlowResolvedPort[];
  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined;
  getNode(id: string): FlowNode | undefined;
}

export interface ResolvedLayoutOptions {
  nodeSpacing: number;
  rankSpacing: number;
  componentSpacing: number;
  groupPadding: FlowLayoutGroupPadding;
  align: 'start' | 'center' | 'end';
  pack: 'grid' | 'rows' | 'none';
  iterations: number;
  transpose: boolean;
  maxDummies: number;
  viewportAspect: number;
  origin: FlowPoint | undefined;
  bendPoints: boolean;
}

/** Vertical room kept for a group label above its content. */
export const GROUP_HEADER_PADDING = 40;
export const MAX_ITERATIONS = 24;

export function resolveLayoutOptions(options: FlowLayoutOptions = {}): ResolvedLayoutOptions {
  const padding = options.groupPadding;
  const groupPadding: FlowLayoutGroupPadding =
    typeof padding === 'number'
      ? { top: padding, right: padding, bottom: padding, left: padding }
      : {
          top: padding?.top ?? GROUP_HEADER_PADDING,
          right: padding?.right ?? DEFAULT_LAYOUT_OPTIONS.groupPadding,
          bottom: padding?.bottom ?? DEFAULT_LAYOUT_OPTIONS.groupPadding,
          left: padding?.left ?? DEFAULT_LAYOUT_OPTIONS.groupPadding,
        };
  return {
    nodeSpacing: options.nodeSpacing ?? DEFAULT_LAYOUT_OPTIONS.nodeSpacing,
    rankSpacing: options.rankSpacing ?? DEFAULT_LAYOUT_OPTIONS.rankSpacing,
    componentSpacing: options.componentSpacing ?? DEFAULT_LAYOUT_OPTIONS.componentSpacing,
    groupPadding,
    align: options.align ?? 'center',
    pack: options.pack ?? DEFAULT_LAYOUT_OPTIONS.pack,
    iterations: Math.max(
      1,
      Math.min(MAX_ITERATIONS, Math.round(options.iterations ?? DEFAULT_LAYOUT_OPTIONS.iterations)),
    ),
    transpose: options.transpose ?? true,
    maxDummies: options.maxDummies ?? 20000,
    viewportAspect: options.viewportAspect ?? 1.6,
    origin: options.origin,
    bendPoints: options.bendPoints ?? false,
  };
}
