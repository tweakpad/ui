import type { FlowModel } from '../../../foundation/flow/model/model.js';
import type {
  ConnectionLineState,
  FlowRenderHost,
  FlowRenderer,
  RenderedEdge,
  RenderedEdgeLabel,
} from '../../../foundation/flow/renderer.js';
import {
  edgePathThrough,
  type FlowEdgePath,
  type FlowPathEndpoint,
} from '../../../foundation/flow/edges/paths.js';
import { labelAnchor, pointAlongPath } from '../../../foundation/flow/edges/labels.js';
import { collectMarkers, type FlowMarkerSpec } from '../../../foundation/flow/edges/markers.js';
import { hitTestPaths } from '../../../foundation/flow/edges/hit-test.js';
import type {
  FlowEdge,
  FlowEdgeLabel,
  FlowMarker,
  FlowPoint,
  FlowRect,
  FlowViewport,
} from '../../../foundation/flow/types.js';
import type { FlowEdgeRunState } from '../../../foundation/flow/run/types.js';
import type { TpFlowEdgeLabel } from '../edge/edge-label.js';
import type { FlowEdgeTemplate, FlowStrings } from '../types.js';
import { format } from '../strings.js';

export interface EdgeLayerOptions {
  model: () => FlowModel;
  flowId: string;
  rendererHost: () => FlowRenderHost | null;
  renderer: () => FlowRenderer;
  labels: () => HTMLElement | null;
  proxies: () => HTMLElement | null;
  createLabel: () => TpFlowEdgeLabel;
  strings: () => FlowStrings;
  edgeTemplates: () => Readonly<Record<string, FlowEdgeTemplate>>;
  /** Routed path for orthogonal edges when the planner has one. */
  route: (edge: FlowEdge) => FlowEdgePath | undefined;
  selected: () => ReadonlySet<string>;
  hovered: () => string | undefined;
  focused: () => string | undefined;
  runEdge: (id: string) => FlowEdgeRunState | undefined;
  issueEdge: (id: string) => 'error' | 'warning' | undefined;
  interactive: () => boolean;
  addable: () => boolean;
  nodeLabel: (id: string) => string;
  edgeAriaLabel: (edge: FlowEdge) => string;
  viewport: () => FlowViewport;
}

const DEFAULT_LABEL_OFFSET = 12;

/**
 * The edge layer (Widgets 6.3 Anatomy edge rows): resolves the visible edges into renderer
 * records (paths, markers, labels, state markers), hands them to the renderer, places the label
 * pills in the label layer and keeps a hidden focus proxy per visible edge in the overlay so
 * edge focus works for every renderer.
 */
/** Path fractions tried, nearest the middle first, when a default anchor lands on a node. */
const ANCHOR_FALLBACKS = [0.4, 0.6, 0.3, 0.7, 0.2, 0.8] as const;

export class EdgeLayer {
  readonly #options: EdgeLayerOptions;
  readonly #labels = new Map<string, TpFlowEdgeLabel>();
  readonly #proxies = new Map<string, HTMLElement>();
  #paths = new Map<string, FlowEdgePath>();
  #rendered = new Map<string, RenderedEdge>();
  /** Memo keys per rendered edge: endpoints, kind, state markers and z (see `update`). */
  #keys = new Map<string, string>();
  #labelRecords = new Map<string, RenderedEdge>();
  #labelConfig: readonly unknown[] = [];
  #proxyRecords = new Map<string, RenderedEdge>();
  #proxyStrings: FlowStrings | undefined;
  #attached = false;

  constructor(options: EdgeLayerOptions) {
    this.#options = options;
  }

  get paths(): ReadonlyMap<string, FlowEdgePath> {
    return this.#paths;
  }

  get rendered(): ReadonlyMap<string, RenderedEdge> {
    return this.#rendered;
  }

  attach(): void {
    const host = this.#options.rendererHost();
    if (!host || this.#attached) return;
    this.#options.renderer().attach(host);
    this.#attached = true;
  }

  detach(): void {
    if (!this.#attached) return;
    this.#options.renderer().detach();
    this.#attached = false;
    for (const label of this.#labels.values()) label.remove();
    this.#labels.clear();
    for (const proxy of this.#proxies.values()) proxy.remove();
    this.#proxies.clear();
    this.#labelRecords.clear();
    this.#proxyRecords.clear();
    this.#paths = new Map();
    this.#rendered = new Map();
    this.#keys.clear();
  }

  /** Drops the memoized records so the next `update` resolves every edge again. */
  invalidate(): void {
    this.#keys.clear();
  }

  /**
   * Resolves and renders the given edges; ids without resolvable endpoints are skipped. Records
   * are memoized per edge by identity plus a key of everything else they derive from, so a pan
   * over an unchanged graph hands the renderer the same objects and skips the DOM writes.
   */
  update(ids: Iterable<string>): void {
    const model = this.#options.model();
    const selected = this.#options.selected();
    const hovered = this.#options.hovered();
    const focused = this.#options.focused();
    const interactive = this.#options.interactive();
    const prefix = this.#options.flowId;
    const paths = new Map<string, FlowEdgePath>();
    const rendered = new Map<string, RenderedEdge>();
    const keys = new Map<string, string>();
    const records: RenderedEdge[] = [];
    for (const id of ids) {
      const edge = model.getEdge(id);
      if (!edge || edge.hidden) continue;
      const endpoints = model.endpoints(edge);
      if (!endpoints) continue;
      const kind = model.edgeKind(edge);
      const routed = this.#options.route(edge);
      const run = this.#options.runEdge(id);
      const issue = this.#options.issueEdge(id);
      const isSelected = selected.has(id) || Boolean(edge.selected);
      const z =
        Math.max(model.nodeZ(edge.source), model.nodeZ(edge.target)) +
        (isSelected ? 1000 : 0) +
        (edge.zIndex ?? 0);
      const isInteractive = interactive && edge.selectable !== false;
      const key =
        `${endpoints.source.point.x},${endpoints.source.point.y},${endpoints.source.side},` +
        `${endpoints.target.point.x},${endpoints.target.point.y},${endpoints.target.side},` +
        `${kind},${z},${isSelected ? 1 : 0}${hovered === id ? 1 : 0}${focused === id ? 1 : 0}` +
        `${isInteractive ? 1 : 0},${run?.status ?? ''},${issue ?? ''},${prefix}`;
      const previous = this.#rendered.get(id);
      if (
        previous &&
        previous.edge === edge &&
        this.#keys.get(id) === key &&
        (routed ? previous.path === routed : !previous.routed)
      ) {
        paths.set(id, previous.path);
        rendered.set(id, previous);
        keys.set(id, key);
        records.push(previous);
        continue;
      }
      const options = model.edgeOptions(edge);
      const source: FlowPathEndpoint = {
        point: endpoints.source.point,
        side: endpoints.source.side,
      };
      const target: FlowPathEndpoint = {
        point: endpoints.target.point,
        side: endpoints.target.side,
      };
      // Unrouted kinds draw through their waypoints themselves; the router honors them otherwise.
      const path =
        routed ??
        edgePathThrough(
          kind === 'orthogonal' ? 'smoothstep' : kind,
          source,
          target,
          edge.waypoints ?? [],
          options,
        );
      const labels = this.#labelAnchors(edge, path);
      const record: RenderedEdge = {
        id,
        edge,
        kind,
        path,
        source: endpoints.source,
        target: endpoints.target,
        z,
        selected: isSelected,
        hovered: hovered === id,
        focused: focused === id,
        animated: Boolean(edge.animated) || run?.status === 'active',
        routed: routed !== undefined,
        fallback: kind === 'orthogonal' && routed === undefined,
        labels,
        interactive: isInteractive,
      };
      if (run) record.status = run.status;
      if (issue) record.issue = issue;
      const markerStart = edge.markerStart ? this.#marker(edge.markerStart, prefix) : undefined;
      // Flowing edges always show direction statically: the dash pauses under reduced motion
      // and forced colors drop the tint, so an unmarked active edge gets a closed arrow.
      const flowing = record.animated;
      const endMarker = edge.markerEnd ?? (flowing ? 'arrowclosed' : undefined);
      const markerEnd = endMarker ? this.#marker(endMarker, prefix) : undefined;
      if (markerStart) record.markerStart = markerStart;
      if (markerEnd) record.markerEnd = markerEnd;
      paths.set(id, path);
      rendered.set(id, record);
      keys.set(id, key);
      records.push(record);
    }
    records.sort((a, b) => a.z - b.z || (a.id < b.id ? -1 : 1));
    this.#paths = paths;
    this.#rendered = rendered;
    this.#keys = keys;
    if (this.#attached) this.#options.renderer().syncEdges(records);
    this.#syncLabels(records);
    this.#syncProxies(records);
  }

  setConnectionLine(line: ConnectionLineState | null): void {
    if (this.#attached) this.#options.renderer().setConnectionLine(line);
  }

  setViewport(viewport: FlowViewport): void {
    if (this.#attached) this.#options.renderer().setViewport(viewport);
  }

  hitTest(
    point: FlowPoint,
    tolerance: number,
  ):
    { edgeId: string; distance: number; segment: number; t: number; point: FlowPoint } | undefined {
    const renderer = this.#options.renderer();
    if (renderer.hitTest) {
      const hit = renderer.hitTest(point, tolerance);
      return hit && hit.hit ? hit : undefined;
    }
    const hit = hitTestPaths(this.#paths, point, tolerance, this.#options.viewport().zoom);
    return hit && hit.hit
      ? { edgeId: hit.id, distance: hit.distance, segment: hit.segment, t: hit.t, point: hit.point }
      : undefined;
  }

  labelElement(edgeId: string): TpFlowEdgeLabel | undefined {
    return this.#labels.get(edgeId);
  }

  proxyElement(edgeId: string): HTMLElement | undefined {
    return this.#proxies.get(edgeId);
  }

  bboxOf(edgeId: string): FlowRect | undefined {
    return this.#paths.get(edgeId)?.bbox;
  }

  #marker(marker: FlowMarker, prefix: string): FlowMarkerSpec | undefined {
    return collectMarkers([{ markerEnd: marker }], { prefix })[0];
  }

  #labelAnchors(edge: FlowEdge, path: FlowEdgePath): RenderedEdgeLabel[] {
    const labels: FlowEdgeLabel[] = edge.labels ?? (edge.label ? [{ text: edge.label }] : []);
    return labels.map((label) => {
      const anchor = labelAnchor(path, label, { offset: DEFAULT_LABEL_OFFSET });
      // A label at the default position must not sit on a node the path passes behind.
      return {
        ...anchor,
        ...(label.position === undefined ? { point: this.#clearOfNodes(path, anchor.point) } : {}),
        text: label.text,
      };
    });
  }

  /**
   * The point itself when it is outside every node (groups excluded), else the nearest path point
   * around the middle that is; a curve that runs behind a node keeps its pill readable.
   */
  #clearOfNodes(path: FlowEdgePath, point: FlowPoint): FlowPoint {
    const model = this.#options.model();
    const blocked = (candidate: FlowPoint): boolean => {
      const node = model.nodeAt(candidate);
      return node !== undefined && model.definitionOf(node)?.shape !== 'group';
    };
    if (!blocked(point)) return point;
    for (const t of ANCHOR_FALLBACKS) {
      const candidate = pointAlongPath(path, t).point;
      if (!blocked(candidate)) return candidate;
    }
    return point;
  }

  #syncLabels(records: readonly RenderedEdge[]): void {
    const container = this.#options.labels();
    if (!container) return;
    const seen = new Set<string>();
    const templates = this.#options.edgeTemplates();
    const addable = this.#options.addable();
    const strings = this.#options.strings();
    const config = [templates, addable, strings];
    const configChanged = config.some((item, index) => item !== this.#labelConfig[index]);
    this.#labelConfig = config;
    for (const record of records) {
      const first = record.labels[0];
      const template = templates[record.edge.id] ?? templates[record.kind];
      if (!first && !template && !addable) continue;
      seen.add(record.id);
      let label = this.#labels.get(record.id);
      if (label && !configChanged && this.#labelRecords.get(record.id) === record) continue;
      this.#labelRecords.set(record.id, record);
      if (!label) {
        label = this.#options.createLabel();
        label.edgeId = record.id;
        this.#labels.set(record.id, label);
        container.append(label);
      }
      const anchor = first ?? { point: this.#clearOfNodes(record.path, record.path.center) };
      label.style.transform = `translate(${anchor.point.x}px, ${anchor.point.y}px)`;
      label.text = first?.text ?? '';
      label.selected = record.selected;
      label.addable = addable;
      label.addLabel = strings.addNode;
      label.content = template
        ? template({
            edge: record.edge,
            kind: record.kind,
            selected: record.selected,
            label: first?.text,
          })
        : null;
      label.hidden = !first && !template && !addable;
    }
    for (const [id, label] of this.#labels)
      if (!seen.has(id)) {
        label.remove();
        this.#labels.delete(id);
        this.#labelRecords.delete(id);
      }
  }

  #syncProxies(records: readonly RenderedEdge[]): void {
    const container = this.#options.proxies();
    if (!container) return;
    const seen = new Set<string>();
    const strings = this.#options.strings();
    const stringsChanged = strings !== this.#proxyStrings;
    this.#proxyStrings = strings;
    for (const record of records) {
      seen.add(record.id);
      let proxy = this.#proxies.get(record.id);
      if (proxy && !stringsChanged && this.#proxyRecords.get(record.id) === record) continue;
      this.#proxyRecords.set(record.id, record);
      if (!proxy) {
        proxy = container.ownerDocument.createElement('div');
        proxy.setAttribute('part', 'flow-edge-focus');
        proxy.setAttribute('role', 'group');
        proxy.setAttribute('aria-roledescription', strings.edge);
        proxy.tabIndex = -1;
        proxy.dataset['edge'] = record.id;
        this.#proxies.set(record.id, proxy);
        container.append(proxy);
      }
      const base = this.#options.edgeAriaLabel(record.edge);
      const first = record.labels[0];
      const text = first?.text;
      proxy.setAttribute('aria-label', text ? `${base}, ${text}` : base);
      proxy.toggleAttribute('data-selected', record.selected);
      // Proxies live inside the transformed viewport: flow coordinates, written per record
      // change only, so a pan rewrites no proxy style.
      const point = first?.point ?? record.path.center;
      proxy.style.transform = `translate(${point.x}px, ${point.y}px)`;
    }
    for (const [id, proxy] of this.#proxies)
      if (!seen.has(id)) {
        proxy.remove();
        this.#proxies.delete(id);
        this.#proxyRecords.delete(id);
      }
  }

  /** Default accessible name of an edge. */
  static ariaLabel(
    edge: FlowEdge,
    strings: FlowStrings,
    nodeLabel: (id: string) => string,
  ): string {
    return format(strings.edgeFrom, {
      source: nodeLabel(edge.source),
      target: nodeLabel(edge.target),
    });
  }
}
