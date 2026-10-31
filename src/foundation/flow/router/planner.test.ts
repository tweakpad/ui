import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_SIZE_BY_SHAPE } from '../defaults.js';
import { expandRect, rectsIntersect } from '../geometry.js';
import type {
  FlowChange,
  FlowEdge,
  FlowEndpoint,
  FlowNode,
  FlowNodeDefinition,
  FlowRect,
  FlowSchema,
} from '../types.js';
import {
  createRoutingPlanner,
  packRoutes,
  packedRouteBuffers,
  routeGeometryHash,
  unpackRoutes,
} from './planner.js';
import type { FlowRoutingInvalidation, FlowRoutingSource } from './types.js';

const definitions: FlowNodeDefinition[] = [
  {
    type: 'step',
    label: 'Step',
    ports: [
      { id: 'in', direction: 'input' },
      { id: 'out', direction: 'output' },
    ],
  },
  { type: 'group', label: 'Group', shape: 'group', ports: [] },
];

/** Minimal in-memory model with the planner's routing source contract. */
class FakeSource implements FlowRoutingSource {
  nodes: FlowNode[] = [];
  edges: FlowEdge[] = [];
  schema: FlowSchema | undefined = { nodes: definitions, rules: { defaultEdgeKind: 'orthogonal' } };
  readonly #listeners = new Set<(event: FlowRoutingInvalidation) => void>();

  getEdge(id: string): FlowEdge | undefined {
    return this.edges.find((edge) => edge.id === id);
  }

  getNode(id: string): FlowNode | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined {
    const type = typeof node === 'string' ? this.getNode(node)?.type : node.type;
    return definitions.find((definition) => definition.type === type);
  }

  absolutePosition(id: string): { x: number; y: number } {
    const node = this.getNode(id)!;
    if (!node.parentId) return node.position;
    const parent = this.absolutePosition(node.parentId);
    return { x: parent.x + node.position.x, y: parent.y + node.position.y };
  }

  nodeRect(id: string): FlowRect {
    const node = this.getNode(id)!;
    const size = node.size ?? DEFAULT_NODE_SIZE_BY_SHAPE[this.definitionOf(node)?.shape ?? 'card'];
    return { ...this.absolutePosition(id), ...size };
  }

  endpoint(
    nodeId: string,
    portId: string | undefined,
    direction: 'input' | 'output',
  ): FlowEndpoint {
    const rect = this.nodeRect(nodeId);
    const side = direction === 'input' ? 'left' : 'right';
    const point = {
      x: direction === 'input' ? rect.x : rect.x + rect.width,
      y: rect.y + rect.height / 2,
    };
    return { point, side, nodeId, portId, rect };
  }

  children(id: string): readonly string[] {
    return this.nodes.filter((node) => node.parentId === id).map((node) => node.id);
  }

  subscribe(listener: (event: FlowRoutingInvalidation) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  addNode(node: FlowNode): void {
    this.nodes.push(node);
    this.emit(
      [{ type: 'node-add', node }],
      [node.id],
      [],
      [expandRect(this.nodeRect(node.id), 12)],
    );
  }

  addEdge(edge: FlowEdge): void {
    this.edges.push(edge);
    this.emit([{ type: 'edge-add', edge }], [], [edge.id], []);
  }

  removeEdge(id: string): void {
    this.edges = this.edges.filter((edge) => edge.id !== id);
    this.emit([{ type: 'edge-remove', id }], [], [id], []);
  }

  moveNode(id: string, position: { x: number; y: number }): void {
    const before = expandRect(this.nodeRect(id), 12);
    this.getNode(id)!.position = position;
    const after = expandRect(this.nodeRect(id), 12);
    const incident = this.edges
      .filter((edge) => edge.source === id || edge.target === id)
      .map((edge) => edge.id);
    this.emit([{ type: 'node-position', id, position }], [id], incident, [before, after]);
  }

  updateNodeData(id: string): void {
    const incident = this.edges
      .filter((edge) => edge.source === id || edge.target === id)
      .map((edge) => edge.id);
    this.emit([{ type: 'node-data', id, data: {} }], [id], incident, []);
  }

  emit(changes: FlowChange[], nodes: string[], edges: string[], dirtyRects: FlowRect[]): void {
    const event = {
      changes,
      affectedNodes: new Set(nodes),
      affectedEdges: new Set(edges),
      dirtyRects,
    };
    for (const listener of [...this.#listeners]) listener(event);
  }
}

function node(id: string, x: number, y: number, extra: Partial<FlowNode> = {}): FlowNode {
  return {
    id,
    type: 'step',
    position: { x, y },
    size: { width: 120, height: 60 },
    data: {},
    ...extra,
  };
}

function edge(id: string, source: string, target: string, extra: Partial<FlowEdge> = {}): FlowEdge {
  return { id, source, sourcePort: 'out', target, targetPort: 'in', ...extra };
}

function grid(source: FakeSource, rows: number, cols: number): void {
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1) source.nodes.push(node(`n${r}-${c}`, c * 220, r * 150));
  for (let r = 0; r < rows; r += 1)
    for (let c = 0; c < cols; c += 1) {
      if (c + 1 < cols)
        source.edges.push(edge(`n${r}-${c}>n${r}-${c + 1}`, `n${r}-${c}`, `n${r}-${c + 1}`));
      if (r + 1 < rows && c + 1 < cols)
        source.edges.push(
          edge(`n${r}-${c}>n${r + 1}-${c + 1}`, `n${r}-${c}`, `n${r + 1}-${c + 1}`),
        );
    }
}

describe('createRoutingPlanner', () => {
  it('routes every routable edge and publishes the updated ids', () => {
    const source = new FakeSource();
    grid(source, 3, 3);
    source.edges.push(edge('bezier', 'n0-0', 'n2-2', { kind: 'bezier' }));
    source.edges.push(edge('hidden', 'n0-0', 'n2-2', { hidden: true }));
    const planner = createRoutingPlanner(source);
    expect(planner.dirty.size).toBe(source.edges.length - 2);
    const published: string[][] = [];
    planner.subscribe((ids) => published.push([...ids]));
    const progress = planner.run();
    expect(progress.done).toBe(true);
    expect(progress.remaining).toBe(0);
    expect(progress.routed).toBe(source.edges.length - 2);
    expect(planner.routes.size).toBe(source.edges.length - 2);
    expect(planner.routes.has('bezier')).toBe(false);
    expect(planner.routes.has('hidden')).toBe(false);
    expect(published.flat().sort()).toEqual([...planner.routes.keys()].sort());
    for (const route of planner.routes.values()) {
      expect(route.fallback).toBe(false);
      expect(route.d.startsWith('M')).toBe(true);
    }
    planner.dispose();
  });

  it('resumes across budgets one edge at a time', () => {
    const source = new FakeSource();
    grid(source, 4, 4);
    let clock = 0;
    const planner = createRoutingPlanner(source, { now: () => (clock += 1) });
    const total = planner.dirty.size;
    let calls = 0;
    let routed = 0;
    let nudgeOnly = 0;
    for (;;) {
      const progress = planner.run(1);
      calls += 1;
      routed += progress.routed;
      if (progress.done) break;
      // A step is one routed edge or one nudge axis; nothing else may spend a call.
      if (progress.routed === 0) nudgeOnly += 1;
      else expect(progress.routed).toBe(1);
      expect(calls).toBeLessThan(total * 4 + 10);
    }
    expect(routed).toBe(total);
    expect(nudgeOnly).toBeGreaterThan(0);
    expect(nudgeOnly).toBeLessThanOrEqual(6);
    expect(calls).toBeGreaterThan(total / 2);
    expect(planner.routes.size).toBe(total);
    planner.dispose();
  });

  it('dirties routes touching dirty rects and incident edges with changed geometry', () => {
    const source = new FakeSource();
    source.nodes.push(
      node('a', 0, 0),
      node('b', 400, 0),
      node('c', 0, 300),
      node('d', 400, 300),
      node('far', 2000, 2000),
    );
    source.edges.push(edge('ab', 'a', 'b'), edge('cd', 'c', 'd'), edge('ad', 'a', 'd'));
    const planner = createRoutingPlanner(source);
    planner.run();
    expect(planner.dirty.size).toBe(0);
    const before = new Map(planner.routes);
    // Moving `far` touches nothing.
    source.moveNode('far', { x: 2100, y: 2100 });
    expect(planner.dirty.size).toBe(0);
    // A data change on `a` affects its edges but not their geometry: memo skips them.
    source.updateNodeData('a');
    expect(planner.dirty.size).toBe(0);
    // Moving `b` dirties its incident edge and whatever crosses the dirty rects.
    source.moveNode('b', { x: 400, y: 40 });
    expect(planner.dirty.has('ab')).toBe(true);
    expect(planner.dirty.has('cd')).toBe(false);
    const published: string[] = [];
    planner.subscribe((ids) => published.push(...ids));
    planner.run();
    expect(published).toContain('ab');
    expect(planner.routes.get('ab')).not.toBe(before.get('ab'));
    expect(planner.routes.get('cd')).toBe(before.get('cd'));
    planner.dispose();
  });

  it('drops routes of removed and hidden edges', () => {
    const source = new FakeSource();
    source.nodes.push(node('a', 0, 0), node('b', 400, 0));
    source.edges.push(edge('ab', 'a', 'b'), edge('ab2', 'a', 'b'));
    const planner = createRoutingPlanner(source);
    planner.run();
    expect(planner.routes.size).toBe(2);
    source.removeEdge('ab2');
    expect(planner.routes.has('ab2')).toBe(false);
    source.getEdge('ab')!.hidden = true;
    source.emit([{ type: 'edge-update', id: 'ab', patch: { hidden: true } }], [], ['ab'], []);
    expect(planner.routes.has('ab')).toBe(false);
    planner.run();
    expect(planner.routes.size).toBe(0);
    planner.dispose();
  });

  it('keeps groups out of the obstacles and re-syncs children of moved groups', () => {
    const source = new FakeSource();
    source.nodes.push(
      {
        id: 'g',
        type: 'group',
        position: { x: 0, y: 0 },
        size: { width: 600, height: 400 },
        data: {},
      },
      node('a', 20, 20, { parentId: 'g' }),
      node('b', 400, 20, { parentId: 'g' }),
    );
    source.edges.push(edge('ab', 'a', 'b'));
    const planner = createRoutingPlanner(source);
    expect(planner.obstacles.has('g')).toBe(false);
    expect(planner.obstacles.rectOf('a')).toEqual({ x: 8, y: 8, width: 144, height: 84 });
    source.moveNode('g', { x: 100, y: 100 });
    expect(planner.obstacles.rectOf('a')).toEqual({ x: 108, y: 108, width: 144, height: 84 });
    planner.run();
    expect(planner.routes.get('ab')!.points[0]).toEqual({ x: 240, y: 150 });
    planner.dispose();
  });

  it('routes in priority order', () => {
    const source = new FakeSource();
    grid(source, 2, 3);
    const planner = createRoutingPlanner(source, {
      now: (() => {
        let t = 0;
        return () => (t += 1);
      })(),
    });
    planner.setPriority((id) => (id.startsWith('n1-') ? 0 : 1));
    const first = planner.run(1);
    expect(first.routed).toBe(1);
    expect([...planner.routes.keys()][0]!.startsWith('n1-')).toBe(true);
    planner.run();
    planner.dispose();
  });

  it('previews a transient request against the live context', () => {
    const source = new FakeSource();
    source.nodes.push(
      node('a', 0, 0),
      node('wall', 200, -100, { size: { width: 60, height: 300 } }),
    );
    const planner = createRoutingPlanner(source);
    planner.run();
    const from = source.endpoint('a', 'out', 'output');
    const preview = planner.preview({
      edgeId: 'preview',
      kind: 'orthogonal',
      options: { curvature: 0, borderRadius: 8, offset: 0, stepPosition: 0.5, stub: 24 },
      source: from,
      target: {
        point: { x: 400, y: 30 },
        side: 'left',
        nodeId: '',
        portId: undefined,
        rect: { x: 400, y: 30, width: 0, height: 0 },
      },
    });
    expect(preview.fallback).toBe(false);
    expect(preview.points.length).toBeGreaterThan(2);
    expect(planner.routes.has('preview')).toBe(false);
    planner.dispose();
  });

  it('hashes request geometry stably', () => {
    const source = new FakeSource();
    source.nodes.push(node('a', 0, 0), node('b', 400, 0));
    const request = {
      kind: 'orthogonal' as const,
      options: { curvature: 0, borderRadius: 8, offset: 0, stepPosition: 0.5, stub: 24 },
      source: source.endpoint('a', 'out', 'output'),
      target: source.endpoint('b', 'in', 'input'),
    };
    expect(routeGeometryHash(request)).toBe(routeGeometryHash({ ...request }));
    expect(routeGeometryHash({ ...request, waypoints: [{ x: 1, y: 2 }] })).not.toBe(
      routeGeometryHash(request),
    );
    expect(routeGeometryHash({ ...request, options: { ...request.options, stub: 30 } })).not.toBe(
      routeGeometryHash(request),
    );
  });

  it('packs and unpacks routes losslessly', () => {
    const source = new FakeSource();
    grid(source, 2, 2);
    source.edges.push(edge('loop', 'n0-0', 'n0-0'));
    const planner = createRoutingPlanner(source);
    planner.run();
    const packed = packRoutes(planner.routes.values());
    expect(packed.ids.length).toBe(planner.routes.size);
    expect(packedRouteBuffers(packed).length).toBe(6);
    const restored = unpackRoutes(packed);
    for (const [id, route] of planner.routes) {
      const copy = restored.get(id)!;
      expect(copy.points).toEqual(route.points);
      expect(copy.d).toBe(route.d);
      expect(copy.hash).toBe(route.hash);
      expect(copy.selfLoop).toBe(route.selfLoop);
      expect(copy.fallback).toBe(route.fallback);
      expect(copy.stub).toBe(route.stub);
      expect(copy.kind).toBe(route.kind);
    }
    expect(restored.get('loop')!.selfLoop).toBe(true);
    planner.dispose();
  });

  it('stops listening after dispose', () => {
    const source = new FakeSource();
    source.nodes.push(node('a', 0, 0), node('b', 400, 0));
    source.edges.push(edge('ab', 'a', 'b'));
    const planner = createRoutingPlanner(source);
    planner.run();
    planner.dispose();
    source.moveNode('b', { x: 500, y: 50 });
    expect(planner.dirty.size).toBe(0);
  });

  it.skipIf(!process.env.FLOW_PERF)('re-routes 20 dirty edges within 8 ms (FLOW_PERF)', () => {
    const source = new FakeSource();
    grid(source, 25, 40);
    const planner = createRoutingPlanner(source);
    planner.run();
    const moved = ['n5-5', 'n5-6', 'n10-10', 'n10-11', 'n15-20', 'n15-21', 'n20-30'];
    // Warm up once, then measure several moves back and forth: one sample is at the mercy of
    // the other perf suites running in parallel workers, the median is not.
    const step = (dy: number): void => {
      for (const id of moved)
        source.moveNode(id, {
          x: source.getNode(id)!.position.x,
          y: source.getNode(id)!.position.y + dy,
        });
    };
    step(7);
    planner.run();
    const samples: Array<{ dirty: number; elapsed: number; done: boolean; routed: number }> = [];
    for (let round = 0; round < 7; round += 1) {
      step(round % 2 ? -9 : 9);
      const dirty = planner.dirty.size;
      const start = performance.now();
      const progress = planner.run();
      samples.push({
        dirty,
        elapsed: performance.now() - start,
        done: progress.done,
        routed: progress.routed,
      });
    }
    samples.sort((a, b) => a.elapsed - b.elapsed);
    const median = samples[3]!;
    process.stdout.write(
      `[FLOW_PERF] planner: ${median.dirty} dirty edges (${median.routed} routed) in ${median.elapsed.toFixed(2)} ms (median of 7)\n`,
    );
    for (const sample of samples) {
      expect(sample.done).toBe(true);
      expect(sample.dirty).toBeGreaterThanOrEqual(20);
    }
    expect(median.elapsed).toBeLessThan(8 * Math.max(1, median.dirty / 20));
  });
});

describe('planner route index', () => {
  it('keeps the route bounds index in sync for dirty rect queries', () => {
    const source = new FakeSource();
    source.nodes.push(node('a', 0, 0), node('b', 400, 0), node('c', 200, 300));
    source.edges.push(edge('ab', 'a', 'b'));
    const planner = createRoutingPlanner(source);
    planner.run();
    const bbox = planner.routes.get('ab')!.bbox;
    // `c` moves up through the route: the overlapping rect dirties `ab` without being incident.
    const target = { x: 200, y: 0 };
    source.moveNode('c', target);
    expect(rectsIntersect(expandRect(source.nodeRect('c'), 12), bbox)).toBe(true);
    expect(planner.dirty.has('ab')).toBe(true);
    planner.run();
    expect(planner.routes.get('ab')!.points.length).toBeGreaterThan(2);
    planner.dispose();
  });

  it('stays pending until a sliced nudge finishes', () => {
    const source = new FakeSource();
    grid(source, 4, 6);
    let clock = 0;
    // Every clock read advances it, so each `run(0.5)` takes exactly one step.
    const planner = createRoutingPlanner(source, { now: () => (clock += 1) });
    while (planner.dirty.size > 0) planner.run(0.5);
    planner.run(0.5);
    expect(planner.dirty.size).toBe(0);
    expect(planner.pending).toBe(true);
    let calls = 0;
    while (planner.pending) {
      planner.run(0.5);
      calls += 1;
      expect(calls).toBeLessThan(100);
    }
    expect(calls).toBeGreaterThan(0);
    planner.dispose();
  });

  it('never publishes a nudge that started before a later move', () => {
    // `n2-3` moves left while the first nudge is half done; that nudge still holds the old
    // route into `n2-3`, which now runs through the node, and must not publish it, not even for
    // a frame.
    const source = new FakeSource();
    grid(source, 4, 6);
    let clock = 0;
    const planner = createRoutingPlanner(source, { now: () => (clock += 1) });
    while (planner.dirty.size > 0) planner.run(0.5);
    planner.run(0.5);
    expect(planner.pending).toBe(true);
    const node = source.getNode('n2-3')!;
    source.moveNode('n2-3', { x: node.position.x - 60, y: node.position.y });
    // Once the dirty edges are routed, no later step may bring an old route back.
    let checked = 0;
    while (planner.pending) {
      planner.run(0.5);
      if (planner.dirty.size > 0) continue;
      expect(nodeCrossings(source, planner.routes)).toEqual([]);
      checked += 1;
    }
    expect(checked).toBeGreaterThan(1);
    planner.dispose();
  });

  it('keeps edges apart after node moves wherever the gaps leave room for two lanes', () => {
    // A 12 × 8 grid like the large fixture: each node feeds its right neighbour, the last of a
    // row wraps to the next row, and each node feeds the one below. Nodes are moved anywhere
    // that keeps two paddings plus half a lane (30 px) from every other node; no two edges may
    // then share a run or run within 4 px of each other (which reads as one line).
    const source = new FakeSource();
    const cols = 12;
    const rows = 8;
    for (let index = 0; index < cols * rows; index += 1)
      source.nodes.push(
        node(`n${index}`, (index % cols) * 300, Math.floor(index / cols) * 160, {
          size: { width: 240, height: 96 },
        }),
      );
    for (let index = 1; index < cols * rows; index += 1) {
      source.edges.push(edge(`g${index}`, `n${index - 1}`, `n${index}`));
      if (index >= cols) source.edges.push(edge(`v${index}`, `n${index - cols}`, `n${index}`));
    }
    const planner = createRoutingPlanner(source, { kinds: 'all' });
    planner.run();
    const gap = 30;
    let seed = 11;
    const random = (): number => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    let checked = 0;
    for (let trial = 0; trial < 1500; trial += 1) {
      const id = `n${Math.floor(random() * cols * rows)}`;
      const moved = source.getNode(id)!;
      const original = { ...moved.position };
      const position = {
        x: original.x + (random() - 0.5) * 200,
        y: original.y + (random() - 0.5) * 200,
      };
      const clear = source.nodes.every((other) => {
        if (other.id === id) return true;
        const r = source.nodeRect(other.id);
        return (
          position.x + 240 + gap <= r.x ||
          r.x + r.width + gap <= position.x ||
          position.y + 96 + gap <= r.y ||
          r.y + r.height + gap <= position.y
        );
      });
      if (!clear) continue;
      checked += 1;
      source.moveNode(id, position);
      planner.run();
      expect(colinearOverlaps(source, planner.routes, 4), `after moving ${id}`).toEqual([]);
      expect(nodeCrossings(source, planner.routes), `after moving ${id}`).toEqual([]);
      source.moveNode(id, original);
      planner.run();
    }
    expect(checked).toBeGreaterThan(100);
    planner.dispose();
    // About 1.5 s alone; the full suite shares the cores, which can stretch it past the 5 s default.
  }, 30_000);
});

/** Route segments that pass through the inside of a node (half a pixel in from its border). */
function nodeCrossings(
  source: FakeSource,
  routes: ReadonlyMap<string, { points: readonly { x: number; y: number }[] }>,
): string[] {
  const rects = source.nodes.map((item) => [item.id, source.nodeRect(item.id)] as const);
  const inside = (value: number, start: number, size: number): boolean =>
    value > start + 0.5 && value < start + size - 0.5;
  const spans = (lo: number, hi: number, start: number, size: number): boolean =>
    Math.min(hi, start + size) - Math.max(lo, start) > 0.5;
  const found: string[] = [];
  for (const [edgeId, route] of routes)
    for (let index = 1; index < route.points.length; index += 1) {
      const a = route.points[index - 1]!;
      const b = route.points[index]!;
      for (const [id, rect] of rects) {
        const crosses =
          a.x === b.x
            ? inside(a.x, rect.x, rect.width) &&
              spans(Math.min(a.y, b.y), Math.max(a.y, b.y), rect.y, rect.height)
            : inside(a.y, rect.y, rect.height) &&
              spans(Math.min(a.x, b.x), Math.max(a.x, b.x), rect.x, rect.width);
        if (crosses) found.push(`${edgeId} through ${id}`);
      }
    }
  return found;
}

/**
 * Parallel runs of two edges that share no port, overlapping by more than a pixel and closer
 * than `tolerance` across.
 */
function colinearOverlaps(
  source: FakeSource,
  routes: ReadonlyMap<string, { points: readonly { x: number; y: number }[] }>,
  tolerance = 0.5,
): string[] {
  const runs: { edge: string; horizontal: boolean; at: number; lo: number; hi: number }[] = [];
  for (const [edgeId, route] of routes)
    for (let index = 1; index < route.points.length; index += 1) {
      const a = route.points[index - 1]!;
      const b = route.points[index]!;
      if (Math.abs(a.y - b.y) < 0.5 && Math.abs(a.x - b.x) > 0.5)
        runs.push({
          edge: edgeId,
          horizontal: true,
          at: a.y,
          lo: Math.min(a.x, b.x),
          hi: Math.max(a.x, b.x),
        });
      else if (Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) > 0.5)
        runs.push({
          edge: edgeId,
          horizontal: false,
          at: a.x,
          lo: Math.min(a.y, b.y),
          hi: Math.max(a.y, b.y),
        });
    }
  const ends = (id: string): string[] => {
    const item = source.getEdge(id)!;
    return [`${item.source}:${item.sourcePort}`, `${item.target}:${item.targetPort}`];
  };
  const found: string[] = [];
  for (let i = 0; i < runs.length; i += 1)
    for (let j = i + 1; j < runs.length; j += 1) {
      const a = runs[i]!;
      const b = runs[j]!;
      if (a.edge === b.edge || a.horizontal !== b.horizontal || Math.abs(a.at - b.at) >= tolerance)
        continue;
      if (Math.min(a.hi, b.hi) - Math.max(a.lo, b.lo) <= 1) continue;
      const shared = ends(a.edge).filter((end) => ends(b.edge).includes(end));
      if (shared.length) continue;
      found.push(`${a.edge}/${b.edge} at ${Math.round(a.at)}`);
    }
  return found;
}
