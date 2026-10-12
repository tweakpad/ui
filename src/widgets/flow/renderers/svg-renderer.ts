import type {
  ConnectionLineState,
  FlowRenderHost,
  FlowRenderer,
  FlowRendererCapabilities,
  FlowRendererHit,
  RenderedEdge,
} from '../../../foundation/flow/renderer.js';
import { markerGeometry, type FlowMarkerSpec } from '../../../foundation/flow/edges/markers.js';
import { hitTestPaths } from '../../../foundation/flow/edges/hit-test.js';
import type { FlowEdgePath } from '../../../foundation/flow/edges/paths.js';
import type { FlowPoint, FlowViewport } from '../../../foundation/flow/types.js';

const SVG_NS = 'http://www.w3.org/2000/svg';

interface EdgeGroup {
  group: SVGGElement;
  halo: SVGPathElement;
  path: SVGPathElement;
  hit: SVGPathElement;
  z: number;
  id: string;
  /** The record last written; identical records skip the attribute writes. */
  record?: RenderedEdge;
}

const MARKERS: ReadonlyArray<[keyof RenderedEdge, string]> = [
  ['selected', 'data-selected'],
  ['hovered', 'data-hover'],
  ['focused', 'data-focus-visible'],
  ['animated', 'data-animated'],
  ['routed', 'data-routed'],
  ['fallback', 'data-fallback'],
];

/**
 * The default edge renderer (Widgets 6.3 Anatomy edge row): one `<svg>` per flow inside the
 * transformed viewport, a `<g part="flow-edge">` per visible edge with halo, visible and hit
 * paths, `<defs>` markers per flow id, and the connection line. Elements are created through
 * the SVG namespace with `part` attributes so the family's generated rules style them; the
 * marquee, labels, focus proxies and panels stay DOM in the root. Edge focus is proxied by the
 * root (`capabilities.edgeFocus` is false), so a canvas renderer can take over without
 * touching the model or the widget logic.
 */
export class SvgFlowRenderer implements FlowRenderer {
  readonly capabilities: FlowRendererCapabilities = { edgeFocus: false };

  #svg: SVGSVGElement | undefined;
  #defs: SVGDefsElement | undefined;
  #edges: SVGGElement | undefined;
  #connection: SVGPathElement | undefined;
  readonly #groups = new Map<string, EdgeGroup>();
  readonly #markers = new Set<string>();
  #paths = new Map<string, FlowEdgePath>();
  #viewport: FlowViewport = { x: 0, y: 0, zoom: 1 };

  attach(host: FlowRenderHost): void {
    this.detach();
    const document = host.element.ownerDocument;
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('overflow', 'visible');
    const defs = document.createElementNS(SVG_NS, 'defs');
    const edges = document.createElementNS(SVG_NS, 'g');
    edges.setAttribute('class', 'edges');
    const connection = document.createElementNS(SVG_NS, 'path');
    connection.setAttribute('part', 'flow-connection-line');
    connection.setAttribute('class', 'connection');
    connection.setAttribute('display', 'none');
    svg.append(defs, edges, connection);
    host.element.append(svg);
    this.#svg = svg;
    this.#defs = defs;
    this.#edges = edges;
    this.#connection = connection;
    this.#viewport = host.viewport;
  }

  detach(): void {
    this.#svg?.remove();
    this.#svg = undefined;
    this.#defs = undefined;
    this.#edges = undefined;
    this.#connection = undefined;
    this.#groups.clear();
    this.#markers.clear();
    this.#paths = new Map();
  }

  setViewport(viewport: FlowViewport): void {
    // The svg lives inside the transformed viewport container: strokes keep their screen size
    // through `vector-effect`, so only the zoom is kept for hit testing.
    this.#viewport = viewport;
  }

  /**
   * Records arrive sorted by z then id; the group order is reconciled in one walk that moves
   * only out-of-place groups, so an edge entering or leaving the view during a pan costs one
   * DOM insertion or removal, never a re-append of every group.
   */
  syncEdges(edges: readonly RenderedEdge[]): void {
    const container = this.#edges;
    if (!container) return;
    const wanted = new Set<string>();
    for (const edge of edges) wanted.add(edge.id);
    for (const [id, group] of this.#groups)
      if (!wanted.has(id)) {
        group.group.remove();
        this.#groups.delete(id);
      }
    const paths = new Map<string, FlowEdgePath>();
    let cursor: Element | null = container.firstElementChild;
    for (const edge of edges) {
      paths.set(edge.id, edge.path);
      let group = this.#groups.get(edge.id);
      if (!group) {
        group = this.#createGroup(edge.id);
        this.#groups.set(edge.id, group);
      }
      if (group.record !== edge) {
        this.#writeEdge(group, edge);
        group.record = edge;
      }
      group.z = edge.z;
      if (group.group === cursor) cursor = cursor.nextElementSibling;
      else container.insertBefore(group.group, cursor);
    }
    this.#paths = paths;
  }

  setConnectionLine(line: ConnectionLineState | null): void {
    const path = this.#connection;
    if (!path) return;
    if (!line) {
      path.setAttribute('display', 'none');
      return;
    }
    path.removeAttribute('display');
    path.setAttribute('d', line.path.d);
    path.toggleAttribute('data-valid', line.valid === true);
    path.toggleAttribute('data-invalid', line.valid === false);
  }

  setSelectionBox(): void {
    // The root draws the marquee in its DOM overlay for every renderer.
  }

  resize(): void {
    // Vector output: nothing to rasterize.
  }

  themeChanged(): void {
    // Colors resolve through the family's generated rules and tokens.
  }

  hitTest(point: FlowPoint, tolerance: number): FlowRendererHit | undefined {
    const hit = hitTestPaths(this.#paths, point, tolerance, this.#viewport.zoom);
    if (!hit) return undefined;
    const { id, ...rest } = hit;
    return { ...rest, edgeId: id };
  }

  /** The `<g>` element of an edge, for the root's hover and hit-target handling. */
  groupOf(edgeId: string): SVGGElement | undefined {
    return this.#groups.get(edgeId)?.group;
  }

  #createGroup(id: string): EdgeGroup {
    const document = this.#svg!.ownerDocument;
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('part', 'flow-edge');
    group.setAttribute('data-edge', id);
    const halo = document.createElementNS(SVG_NS, 'path');
    halo.setAttribute('part', 'flow-edge-halo');
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('part', 'flow-edge-path');
    const hit = document.createElementNS(SVG_NS, 'path');
    hit.setAttribute('part', 'flow-edge-hit');
    hit.setAttribute('data-edge', id);
    group.append(halo, path, hit);
    return { group, halo, path, hit, z: 0, id };
  }

  #writeEdge(group: EdgeGroup, edge: RenderedEdge): void {
    const d = edge.path.d;
    if (group.path.getAttribute('d') !== d) {
      group.path.setAttribute('d', d);
      group.halo.setAttribute('d', d);
      group.hit.setAttribute('d', d);
    }
    group.group.setAttribute('data-kind', edge.kind);
    for (const [key, attribute] of MARKERS)
      group.group.toggleAttribute(attribute, Boolean(edge[key]));
    this.#setOrRemove(group.group, 'data-status', edge.status);
    this.#setOrRemove(group.group, 'data-direction', edge.direction);
    this.#setOrRemove(group.group, 'data-tone', edge.tone);
    group.group.toggleAttribute('data-interactive', edge.interactive);
    group.hit.setAttribute('pointer-events', edge.interactive ? 'stroke' : 'none');
    if (edge.strokeWidth !== undefined)
      group.path.style.setProperty('--_tp-flow-edge-width', `${edge.strokeWidth}px`);
    else group.path.style.removeProperty('--_tp-flow-edge-width');
    this.#marker(group.path, 'marker-start', edge.markerStart);
    this.#marker(group.path, 'marker-end', edge.markerEnd);
  }

  #setOrRemove(element: Element, name: string, value: string | undefined): void {
    if (value === undefined) element.removeAttribute(name);
    else if (element.getAttribute(name) !== value) element.setAttribute(name, value);
  }

  #marker(
    path: SVGPathElement,
    attribute: 'marker-start' | 'marker-end',
    spec: FlowMarkerSpec | undefined,
  ): void {
    if (!spec) {
      path.removeAttribute(attribute);
      return;
    }
    this.#ensureMarker(spec);
    const url = `url(#${spec.id})`;
    if (path.getAttribute(attribute) !== url) path.setAttribute(attribute, url);
  }

  #ensureMarker(spec: FlowMarkerSpec): void {
    if (this.#markers.has(spec.id) || !this.#defs) return;
    const document = this.#defs.ownerDocument;
    const geometry = markerGeometry(spec);
    const marker = document.createElementNS(SVG_NS, 'marker');
    marker.setAttribute('id', spec.id);
    marker.setAttribute('viewBox', geometry.viewBox.join(' '));
    marker.setAttribute('refX', String(geometry.refX));
    marker.setAttribute('refY', String(geometry.refY));
    marker.setAttribute('markerWidth', String(spec.width));
    marker.setAttribute('markerHeight', String(spec.height));
    marker.setAttribute('markerUnits', spec.units);
    marker.setAttribute('orient', String(spec.orient));
    const shape = document.createElementNS(SVG_NS, 'path');
    shape.setAttribute('part', 'flow-edge-marker');
    shape.setAttribute('d', geometry.d);
    shape.setAttribute('data-shape', geometry.shape.kind);
    if (spec.color) shape.style.setProperty('fill', spec.color);
    if (!geometry.shape.filled) {
      shape.style.setProperty('fill', 'none');
      shape.setAttribute('stroke', spec.color ?? 'context-stroke');
      shape.setAttribute('stroke-width', String(spec.strokeWidth));
      shape.setAttribute('stroke-linecap', 'round');
      shape.setAttribute('stroke-linejoin', 'round');
    }
    marker.append(shape);
    this.#defs.append(marker);
    this.#markers.add(spec.id);
  }
}

export function svgRenderer(): FlowRenderer {
  return new SvgFlowRenderer();
}
