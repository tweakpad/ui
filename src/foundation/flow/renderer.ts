import type { FlowEdgePath } from './edges/paths.js';
import type { FlowLabelAnchor } from './edges/labels.js';
import type { FlowMarkerSpec } from './edges/markers.js';
import type { FlowPathHit } from './edges/hit-test.js';
import type {
  FlowEdge,
  FlowEdgeKind,
  FlowEndpoint,
  FlowPoint,
  FlowRect,
  FlowSide,
  FlowSize,
  FlowViewport,
} from './types.js';

/**
 * Renderer contract. The widget resolves what to draw (visible edges, their routed paths,
 * states, markers and label anchors) and a renderer draws it; the default SVG renderer and a
 * WebGL renderer implement the same interface. This module only names DOM types in type
 * positions so the engine stays loadable in Node and in workers.
 */
export interface FlowRendererCapabilities {
  /** The renderer paints edge focus itself; otherwise the widget uses DOM focus proxies. */
  edgeFocus: boolean;
}

/** What the widget hands a renderer on `attach`. */
export interface FlowRenderHost {
  /** Element the renderer appends its surface to (the edge layer). */
  readonly element: HTMLElement;
  /** Owner window (for `devicePixelRatio`, `matchMedia`); the renderer never reads globals. */
  readonly window: Window;
  /** Per-instance id that namespaces marker ids. */
  readonly id: string;
  readonly size: FlowSize;
  readonly devicePixelRatio: number;
  readonly viewport: FlowViewport;
  readonly reducedMotion: boolean;
  readonly forcedColors: boolean;
  /** Reads a design token (`--tp-primary`) through the host's computed style. */
  token(name: string): string;
  /** Asks the widget to run a render pass (renderers never schedule frames themselves). */
  requestRender(): void;
}

export type FlowEdgeRunStatusMarker = 'inactive' | 'active' | 'taken' | 'not-taken' | 'disabled';

export interface RenderedEdgeLabel extends FlowLabelAnchor {
  text: string;
}

/** One visible edge resolved for drawing. */
export interface RenderedEdge {
  id: string;
  edge: FlowEdge;
  kind: FlowEdgeKind;
  path: FlowEdgePath;
  source: FlowEndpoint;
  target: FlowEndpoint;
  z: number;
  selected: boolean;
  hovered: boolean;
  focused: boolean;
  animated: boolean;
  /** The path came from the obstacle-aware router. */
  routed: boolean;
  /** The router fell back to smoothstep. */
  fallback: boolean;
  /** Run visualization status, when a run is bound. */
  status?: FlowEdgeRunStatusMarker;
  /** The worst problem reported for the edge (a missing endpoint, a backend's issue). */
  issue?: 'error' | 'warning';
  /** Flow direction for dash animation (`forward` by default). */
  direction?: 'forward' | 'backward';
  tone?: string;
  strokeWidth?: number;
  markerStart?: FlowMarkerSpec;
  markerEnd?: FlowMarkerSpec;
  labels: readonly RenderedEdgeLabel[];
  /** Receives pointer events (hit path); off in view mode and for disabled canvases. */
  interactive: boolean;
}

/** The provisional edge drawn during a connection gesture. */
export interface ConnectionLineState {
  from: FlowPoint;
  fromSide: FlowSide;
  to: FlowPoint;
  toSide?: FlowSide;
  kind: FlowEdgeKind;
  path: FlowEdgePath;
  /** `undefined` while no candidate port is near. */
  valid?: boolean;
  candidate?: { nodeId: string; portId: string | undefined };
}

export interface FlowRendererHit extends FlowPathHit {
  edgeId: string;
}

export interface FlowRenderer {
  readonly capabilities: FlowRendererCapabilities;
  attach(host: FlowRenderHost): void;
  detach(): void;
  setViewport(viewport: FlowViewport): void;
  /** The full visible set; the renderer diffs by id. */
  syncEdges(edges: readonly RenderedEdge[]): void;
  setConnectionLine(line: ConnectionLineState | null): void;
  /** Marquee rectangle in flow coordinates. */
  setSelectionBox(rect: FlowRect | null): void;
  resize(size: FlowSize, devicePixelRatio: number): void;
  themeChanged(): void;
  /** Optional renderer-side hit test in flow coordinates (`tolerance` in screen pixels). */
  hitTest?(point: FlowPoint, tolerance: number): FlowRendererHit | undefined;
}
