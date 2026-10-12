import { describe, expect, it } from 'vitest';
import { rectsIntersect } from '../geometry.js';
import type {
  FlowChange,
  FlowEdge,
  FlowNode,
  FlowNodeDefinition,
  FlowRect,
  FlowResolvedPort,
} from '../types.js';
import { LayeredLayoutEngine, flowLayoutRequest, layoutFlow } from './layered-layout.js';
import type {
  FlowLayoutEdge,
  FlowLayoutNode,
  FlowLayoutRequest,
  FlowLayoutResult,
  FlowLayoutSource,
} from './types.js';

function node(id: string, extra: Partial<FlowLayoutNode> = {}): FlowLayoutNode {
  return { id, size: { width: 120, height: 60 }, ports: [], ...extra };
}

function edge(source: string, target: string, extra: Partial<FlowLayoutEdge> = {}): FlowLayoutEdge {
  return { id: `${source}>${target}`, source, target, ...extra };
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomDag(seed: number, count: number, extraEdges = 0.5): FlowLayoutRequest {
  const next = random(seed);
  const nodes = Array.from({ length: count }, (_, index) =>
    node(`n${index}`, {
      size: { width: 80 + Math.floor(next() * 100), height: 40 + Math.floor(next() * 60) },
      position: { x: next() * 1000, y: next() * 1000 },
    }),
  );
  const edges: FlowLayoutEdge[] = [];
  for (let index = 1; index < count; index += 1) {
    const parent = Math.floor(next() * index);
    edges.push(edge(`n${parent}`, `n${index}`));
    if (next() < extraEdges) {
      const other = Math.floor(next() * index);
      if (other !== parent)
        edges.push({ ...edge(`n${other}`, `n${index}`), id: `x${other}>${index}` });
    }
  }
  return { nodes, edges, direction: 'horizontal' };
}

/** The id of a node change (viewport changes have none). */
function changeId(change: FlowChange): string | undefined {
  return 'id' in change ? change.id : undefined;
}

function rectsOf(request: FlowLayoutRequest, result: FlowLayoutResult): Map<string, FlowRect> {
  const rects = new Map<string, FlowRect>();
  for (const item of request.nodes) {
    const position = result.positions.get(item.id)!;
    const size = result.sizes.get(item.id) ?? item.size;
    rects.set(item.id, { ...position, ...size });
  }
  return rects;
}

function expectNoOverlap(rects: Map<string, FlowRect>, request: FlowLayoutRequest): void {
  const byId = new Map(request.nodes.map((item) => [item.id, item]));
  const ancestor = (id: string, candidate: string): boolean => {
    let current = byId.get(id)?.parentId;
    while (current) {
      if (current === candidate) return true;
      current = byId.get(current)?.parentId;
    }
    return false;
  };
  const ids = [...rects.keys()];
  for (let i = 0; i < ids.length; i += 1)
    for (let j = i + 1; j < ids.length; j += 1) {
      const a = ids[i]!;
      const b = ids[j]!;
      if (ancestor(a, b) || ancestor(b, a)) continue;
      expect(rectsIntersect(rects.get(a)!, rects.get(b)!), `${a} overlaps ${b}`).toBe(false);
    }
}

function expectFlow(
  request: FlowLayoutRequest,
  result: FlowLayoutResult,
  rects: Map<string, FlowRect>,
): void {
  const main = result.direction === 'horizontal' ? 'x' : 'y';
  const extent = result.direction === 'horizontal' ? 'width' : 'height';
  // Count edges flowing forward; a DAG must flow entirely forward.
  for (const item of request.edges) {
    const source = rects.get(item.source)!;
    const target = rects.get(item.target)!;
    expect(target[main], `${item.id} flows backwards`).toBeGreaterThanOrEqual(
      source[main] + source[extent],
    );
  }
}

describe('LayeredLayoutEngine', () => {
  const engine = new LayeredLayoutEngine();

  it('lays out a chain along the main axis with rank spacing', () => {
    const request: FlowLayoutRequest = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [edge('a', 'b'), edge('b', 'c')],
      direction: 'horizontal',
      options: { rankSpacing: 50 },
    };
    const result = engine.layout(request);
    expect(result.direction).toBe('horizontal');
    expect(result.positions.get('a')).toEqual({ x: 0, y: 0 });
    expect(result.positions.get('b')).toEqual({ x: 170, y: 0 });
    expect(result.positions.get('c')).toEqual({ x: 340, y: 0 });
    expect(result.stats.layers).toBe(3);
    expect(result.stats.components).toBe(1);
    expect(result.bounds).toEqual({ x: 0, y: 0, width: 460, height: 60 });
    const vertical = engine.layout({ ...request, direction: 'vertical' });
    expect(vertical.positions.get('b')).toEqual({ x: 0, y: 110 });
    expect(vertical.direction).toBe('vertical');
  });

  it('emits only positions that differ by more than half a unit, parent-relative', () => {
    const request: FlowLayoutRequest = {
      nodes: [
        node('a', { position: { x: 0, y: 0 } }),
        node('b', { position: { x: 200.3, y: 0.2 } }),
        node('c', { position: { x: 500, y: 0 } }),
      ],
      edges: [edge('a', 'b'), edge('b', 'c')],
      direction: 'horizontal',
    };
    const result = engine.layout(request);
    expect(result.changes).toEqual([
      { type: 'node-position', id: 'c', position: { x: 400, y: 0 } },
    ]);
    const grouped: FlowLayoutRequest = {
      nodes: [
        node('g', { group: true, size: { width: 10, height: 10 }, position: { x: 100, y: 100 } }),
        node('a', { parentId: 'g', position: { x: 116, y: 140 } }),
        node('b', { parentId: 'g', position: { x: 0, y: 0 } }),
        node('out', { offset: { x: 1000, y: 1000 }, position: { x: 1100, y: 1100 } }),
      ],
      edges: [edge('a', 'b')],
      direction: 'horizontal',
      options: { origin: { x: 100, y: 100 }, pack: 'rows' },
    };
    const groupedResult = engine.layout(grouped);
    expect(groupedResult.changes.find((change) => changeId(change) === 'a')).toBeUndefined();
    expect(groupedResult.changes.find((change) => changeId(change) === 'b')).toEqual({
      type: 'node-position',
      id: 'b',
      position: { x: 216, y: 40 },
    });
    expect(
      groupedResult.changes.find((change) => change.type === 'node-size' && change.id === 'g'),
    ).toEqual({
      type: 'node-size',
      id: 'g',
      size: { width: 16 + 120 + 80 + 120 + 16, height: 40 + 60 + 16 },
    });
    const outChange = groupedResult.changes.find((change) => changeId(change) === 'out');
    expect(outChange?.type).toBe('node-position');
    if (outChange?.type === 'node-position') {
      expect(outChange.position.x).toBeCloseTo(groupedResult.positions.get('out')!.x - 1000);
      expect(outChange.position.y).toBeCloseTo(groupedResult.positions.get('out')!.y - 1000);
    }
  });

  it('keeps the previous top-left (no jump) unless an origin is given', () => {
    const request: FlowLayoutRequest = {
      nodes: [
        node('a', { position: { x: 300, y: 200 } }),
        node('b', { position: { x: 900, y: 250 } }),
      ],
      edges: [edge('a', 'b')],
      direction: 'horizontal',
    };
    const result = engine.layout(request);
    expect(result.bounds.x).toBe(300);
    expect(result.bounds.y).toBe(200);
    const origin = engine.layout({ ...request, options: { origin: { x: 10, y: 20 } } });
    expect(origin.bounds.x).toBe(10);
    expect(origin.bounds.y).toBe(20);
  });

  it('keeps pinned nodes and flows the rest around them', () => {
    const request: FlowLayoutRequest = {
      nodes: [
        node('pin', { pinned: true, position: { x: 0, y: 0 } }),
        node('a', { position: { x: 0, y: 0 } }),
        node('b', { position: { x: 0, y: 0 } }),
      ],
      edges: [edge('a', 'b')],
      direction: 'horizontal',
    };
    const result = engine.layout(request);
    expect(result.positions.get('pin')).toEqual({ x: 0, y: 0 });
    expect(result.changes.find((change) => changeId(change) === 'pin')).toBeUndefined();
    const rects = rectsOf(request, result);
    expectNoOverlap(rects, request);
    expect(rects.get('a')!.x).toBeGreaterThanOrEqual(120 + 60);
  });

  it('separates components by the pack mode', () => {
    const request: FlowLayoutRequest = {
      nodes: [node('a'), node('b'), node('c'), node('d'), node('e')],
      edges: [edge('a', 'b'), edge('c', 'd')],
      direction: 'horizontal',
      options: { componentSpacing: 30 },
    };
    const grid = engine.layout(request);
    expect(grid.stats.components).toBe(3);
    expectNoOverlap(rectsOf(request, grid), request);
    const rows = engine.layout({ ...request, options: { componentSpacing: 30, pack: 'rows' } });
    const rowRects = rectsOf(request, rows);
    expect(rowRects.get('c')!.y).toBe(90);
    expect(rowRects.get('e')!.y).toBe(180);
    expectNoOverlap(rowRects, request);
    const none = engine.layout({
      ...request,
      nodes: request.nodes.map((item, index) => ({ ...item, position: { x: 0, y: index * 500 } })),
      options: { pack: 'none' },
    });
    expect(none.positions.get('c')!.y).toBe(1000);
    expect(none.positions.get('e')!.y).toBe(2000);
  });

  it('derives group sizes bottom-up and lifts boundary edges', () => {
    const request: FlowLayoutRequest = {
      nodes: [
        node('g', { group: true, size: { width: 10, height: 10 } }),
        node('a', { parentId: 'g' }),
        node('b', { parentId: 'g' }),
        node('c'),
      ],
      edges: [edge('a', 'b'), edge('b', 'c')],
      direction: 'horizontal',
    };
    const result = engine.layout(request);
    const rects = rectsOf(request, result);
    expect(result.sizes.get('g')).toEqual({
      width: 16 + 120 + 80 + 120 + 16,
      height: 40 + 60 + 16,
    });
    expect(rects.get('a')!.x).toBe(rects.get('g')!.x + 16);
    expect(rects.get('a')!.y).toBe(rects.get('g')!.y + 40);
    expect(rects.get('c')!.x).toBeGreaterThanOrEqual(
      rects.get('g')!.x + rects.get('g')!.width + 80,
    );
    expectNoOverlap(rects, request);
  });

  it('resolves smart direction from port sides, else the viewport aspect', () => {
    const wide: FlowLayoutRequest = {
      nodes: Array.from({ length: 6 }, (_, i) => node(`n${i}`)),
      edges: Array.from({ length: 5 }, (_, i) => edge(`n${i}`, `n${i + 1}`)),
      direction: 'smart',
    };
    expect(engine.layout({ ...wide, options: { viewportAspect: 1.6 } }).direction).toBe('vertical');
    expect(engine.layout({ ...wide, options: { viewportAspect: 20 } }).direction).toBe(
      'horizontal',
    );
    const sided: FlowLayoutRequest = {
      ...wide,
      nodes: wide.nodes.map((item) => ({
        ...item,
        ports: [{ id: 'o', direction: 'output', index: 0, side: 'right' }],
      })),
    };
    expect(engine.layout({ ...sided, options: { viewportAspect: 0.1 } }).direction).toBe(
      'horizontal',
    );
    // Several components force grid packing in smart mode.
    const multi: FlowLayoutRequest = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [edge('a', 'b'), edge('c', 'd')],
      direction: 'smart',
      options: { pack: 'rows' },
    };
    const result = engine.layout(multi);
    expectNoOverlap(rectsOf(multi, result), multi);
  });

  it('reports bend points for long edges when asked', () => {
    const request: FlowLayoutRequest = {
      nodes: [node('a'), node('b'), node('c'), node('d')],
      edges: [
        edge('a', 'b'),
        edge('b', 'c'),
        edge('c', 'd'),
        { id: 'long', source: 'a', target: 'd' },
        { id: 'back', source: 'd', target: 'a' },
      ],
      direction: 'horizontal',
      options: { bendPoints: true },
    };
    const result = engine.layout(request);
    expect(result.bendPoints?.get('long')?.length).toBe(2);
    expect(result.bendPoints?.get('a>b')).toBeUndefined();
    const points = result.bendPoints!.get('long')!;
    expect(points[0]!.x).toBeLessThan(points[1]!.x);
    const back = result.bendPoints!.get('back')!;
    expect(back[0]!.x).toBeGreaterThan(back[1]!.x);
  });

  it('handles cycles, multi-edges, self-loops and empty requests', () => {
    const request: FlowLayoutRequest = {
      nodes: [node('a'), node('b'), node('c')],
      edges: [
        edge('a', 'b'),
        edge('b', 'c'),
        edge('c', 'a'),
        { ...edge('a', 'b'), id: 'dup' },
        { id: 'loop', source: 'b', target: 'b' },
      ],
      direction: 'horizontal',
    };
    const result = engine.layout(request);
    expectNoOverlap(rectsOf(request, result), request);
    expect(result.stats.layers).toBe(3);
    const empty = engine.layout({ nodes: [], edges: [], direction: 'horizontal' });
    expect(empty.positions.size).toBe(0);
    expect(empty.changes).toEqual([]);
    expect(empty.bounds).toEqual({ x: 0, y: 0, width: 0, height: 0 });
  });

  describe('invariants over seeded random DAGs', () => {
    for (const seed of [1, 2, 3, 11]) {
      it(`seed ${seed}`, () => {
        const request = randomDag(seed, 40);
        const result = engine.layout(request);
        const rects = rectsOf(request, result);
        expectNoOverlap(rects, request);
        expectFlow(request, result, rects);
        const again = new LayeredLayoutEngine().layout(randomDag(seed, 40));
        expect([...again.positions]).toEqual([...result.positions]);
        expect(again.stats.crossings).toBe(result.stats.crossings);
        const vertical = engine.layout({ ...request, direction: 'vertical' });
        const verticalRects = rectsOf(request, vertical);
        expectNoOverlap(verticalRects, request);
        expectFlow(request, vertical, verticalRects);
      });
    }
  });

  it.skipIf(!process.env.FLOW_PERF)('lays out 1000 nodes within 300 ms (FLOW_PERF)', () => {
    const request = randomDag(5, 1000, 0.3);
    const warm = new LayeredLayoutEngine();
    warm.layout(request);
    const start = performance.now();
    const result = warm.layout(request);
    const elapsed = performance.now() - start;
    process.stdout.write(
      `[FLOW_PERF] layout: 1000 nodes / ${request.edges.length} edges in ${elapsed.toFixed(1)} ms (${result.stats.layers} layers, ${result.stats.dummies} dummies, ${result.stats.crossings} crossings)\n`,
    );
    expect(elapsed).toBeLessThan(300);
    expectNoOverlap(rectsOf(request, result), request);
  });
});

describe('flowLayoutRequest / layoutFlow', () => {
  const definitions: FlowNodeDefinition[] = [
    {
      type: 'step',
      label: 'Step',
      ports: [
        { id: 'in', direction: 'input' },
        { id: 'out', direction: 'output', side: 'right' },
      ],
    },
    { type: 'group', label: 'Group', shape: 'group', ports: [] },
  ];
  class FakeSource implements FlowLayoutSource {
    nodes: FlowNode[] = [];
    edges: FlowEdge[] = [];
    getNode(id: string): FlowNode | undefined {
      return this.nodes.find((candidate) => candidate.id === id);
    }
    definitionOf(node: FlowNode | string): FlowNodeDefinition | undefined {
      const type = typeof node === 'string' ? this.getNode(node)?.type : node.type;
      return definitions.find((definition) => definition.type === type);
    }
    absolutePosition(id: string): { x: number; y: number } {
      const current = this.getNode(id)!;
      if (!current.parentId) return current.position;
      const parent = this.absolutePosition(current.parentId);
      return { x: parent.x + current.position.x, y: parent.y + current.position.y };
    }
    nodeRect(id: string): FlowRect {
      const current = this.getNode(id)!;
      return { ...this.absolutePosition(id), ...(current.size ?? { width: 100, height: 50 }) };
    }
    ports(id: string): readonly FlowResolvedPort[] {
      const definition = this.definitionOf(id);
      return (definition?.ports ?? []).map((port, index) => ({
        ...port,
        nodeId: id,
        geometry: { id: port.id, x: 0, y: 0, width: 8, height: 8, side: port.side ?? 'left' },
        index,
        count: 1,
      }));
    }
  }

  it('builds the request from visible nodes with parent-relative conversion data', () => {
    const source = new FakeSource();
    source.nodes.push(
      {
        id: 'g',
        type: 'group',
        position: { x: 100, y: 100 },
        size: { width: 300, height: 200 },
        data: {},
      },
      { id: 'a', type: 'step', position: { x: 10, y: 10 }, data: {}, parentId: 'g', pinned: true },
      { id: 'b', type: 'step', position: { x: 200, y: 10 }, data: {}, parentId: 'g' },
      { id: 'hidden', type: 'step', position: { x: 0, y: 0 }, data: {}, hidden: true },
      { id: 'c', type: 'step', position: { x: 500, y: 0 }, data: {} },
    );
    source.edges.push(
      { id: 'ab', source: 'a', target: 'b', sourcePort: 'out', targetPort: 'in' },
      { id: 'bc', source: 'b', target: 'c' },
      { id: 'hc', source: 'hidden', target: 'c' },
    );
    const request = flowLayoutRequest(source, 'smart', { nodeSpacing: 10 });
    expect(request.nodes.map((item) => item.id)).toEqual(['g', 'a', 'b', 'c']);
    expect(request.nodes[0]).toMatchObject({ group: true, size: { width: 300, height: 200 } });
    expect(request.nodes[1]).toMatchObject({
      parentId: 'g',
      pinned: true,
      position: { x: 110, y: 110 },
    });
    expect(request.nodes[1]!.ports).toEqual([
      { id: 'in', direction: 'input', index: 0, side: undefined },
      { id: 'out', direction: 'output', index: 1, side: 'right' },
    ]);
    expect(request.edges.map((item) => item.id)).toEqual(['ab', 'bc']);
    expect(request.options).toEqual({ nodeSpacing: 10 });
    const subset = flowLayoutRequest(source, 'horizontal', undefined, ['b', 'c']);
    expect(subset.nodes.map((item) => item.id)).toEqual(['b', 'c']);
    expect(subset.nodes[0]!.parentId).toBeUndefined();
    expect(subset.nodes[0]!.offset).toEqual({ x: 100, y: 100 });
    expect(subset.edges.map((item) => item.id)).toEqual(['bc']);
  });

  it('runs the engine through layoutFlow with a custom engine', () => {
    const source = new FakeSource();
    source.nodes.push(
      { id: 'a', type: 'step', position: { x: 0, y: 0 }, data: {} },
      { id: 'b', type: 'step', position: { x: 0, y: 0 }, data: {} },
    );
    source.edges.push({ id: 'ab', source: 'a', target: 'b' });
    const result = layoutFlow(source, 'horizontal', { rankSpacing: 20 });
    expect(result.positions.get('b')).toEqual({ x: 120, y: 0 });
    expect(result.changes).toEqual([
      { type: 'node-position', id: 'b', position: { x: 120, y: 0 } },
    ]);
    let called = 0;
    const custom = {
      layout: (request: FlowLayoutRequest) => {
        called += 1;
        return new LayeredLayoutEngine().layout(request);
      },
    };
    layoutFlow(source, 'vertical', { engine: custom, ids: ['a'] });
    expect(called).toBe(1);
  });
});
