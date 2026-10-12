import { describe, expect, it } from 'vitest';
import type { FlowDocument } from '../types.js';
import { FlowRunState, deriveEdgeStatus, flowRunGraph } from './state.js';
import type { FlowRunEvent, FlowRunGraph } from './types.js';

const document: FlowDocument = {
  version: 1,
  nodes: [
    { id: 'start', type: 't', position: { x: 0, y: 0 }, data: {} },
    { id: 'check', type: 't', position: { x: 0, y: 0 }, data: {} },
    { id: 'yes', type: 't', position: { x: 0, y: 0 }, data: {} },
    { id: 'no', type: 't', position: { x: 0, y: 0 }, data: {} },
    { id: 'end', type: 't', position: { x: 0, y: 0 }, data: {} },
  ],
  edges: [
    { id: 's-c', source: 'start', target: 'check' },
    { id: 'c-yes', source: 'check', sourcePort: 'yes', target: 'yes' },
    { id: 'c-no', source: 'check', sourcePort: 'no', target: 'no' },
    { id: 'yes-end', source: 'yes', target: 'end' },
    { id: 'no-end', source: 'no', target: 'end' },
  ],
};

const graph = (): FlowRunGraph => flowRunGraph(document);
const at = (
  type: FlowRunEvent['type'],
  extra: Record<string, unknown> = {},
  time = 0,
): FlowRunEvent => ({ type, at: time, ...extra }) as FlowRunEvent;

describe('flowRunGraph', () => {
  it('builds adjacency from a document or a model-like object', () => {
    const fromDocument = flowRunGraph(document);
    expect(fromDocument.nodes).toEqual(['start', 'check', 'yes', 'no', 'end']);
    expect(fromDocument.outgoing.get('check')).toEqual(['c-yes', 'c-no']);
    expect(fromDocument.incoming.get('end')).toEqual(['yes-end', 'no-end']);
    const fromModel = flowRunGraph({ document } as never);
    expect(fromModel.edges.length).toBe(5);
  });
});

describe('deriveEdgeStatus', () => {
  const edge = { id: 'e', source: 'a', sourcePort: 'yes', target: 'b' };
  const node = (status: string, ports?: string[]): Parameters<typeof deriveEdgeStatus>[1] =>
    ({ status, attempts: 1, ...(ports ? { ports } : {}) }) as never;

  it('applies the six rules in order', () => {
    expect(deriveEdgeStatus(edge, node('idle'), node('idle'), true)).toBe('taken');
    expect(deriveEdgeStatus(edge, node('skipped'), node('running'), false)).toBe('disabled');
    expect(deriveEdgeStatus(edge, node('cancelled'), node('idle'), false)).toBe('disabled');
    expect(deriveEdgeStatus(edge, node('success', ['yes']), node('running'), false)).toBe('active');
    expect(deriveEdgeStatus(edge, node('success', ['yes']), node('waiting'), false)).toBe('active');
    expect(deriveEdgeStatus(edge, node('success', ['yes']), node('success'), false)).toBe('taken');
    expect(deriveEdgeStatus(edge, node('success', ['no']), node('idle'), false)).toBe('not-taken');
    expect(deriveEdgeStatus(edge, node('running'), node('idle'), false)).toBe('inactive');
    expect(deriveEdgeStatus(edge, node('idle'), node('idle'), false)).toBe('inactive');
  });

  it('treats a completion without ports as every edge and a failure without ports as none', () => {
    expect(deriveEdgeStatus(edge, node('success'), node('pending'), false)).toBe('taken');
    expect(deriveEdgeStatus(edge, node('failed'), node('idle'), false)).toBe('not-taken');
    expect(deriveEdgeStatus(edge, node('failed', ['yes']), node('running'), false)).toBe('active');
    expect(
      deriveEdgeStatus(
        { ...edge, sourcePort: undefined },
        node('success', ['no']),
        node('idle'),
        false,
      ),
    ).toBe('taken');
  });
});

describe('FlowRunState', () => {
  it('walks node transitions and derives edge statuses', () => {
    const state = new FlowRunState(graph());
    expect(state.apply(at('run_started', { runId: 'r1' }, 0))).toBe(true);
    expect(state.run.status).toBe('running');
    expect(state.run.id).toBe('r1');
    state.apply(at('node_started', { nodeId: 'start' }, 1));
    expect(state.run.nodes.get('start')).toMatchObject({
      status: 'running',
      attempts: 1,
      startedAt: 1,
    });
    state.apply(at('node_completed', { nodeId: 'start' }, 5));
    expect(state.run.nodes.get('start')).toMatchObject({
      status: 'success',
      durationMs: 4,
      endedAt: 5,
    });
    expect(state.run.nodes.get('check')!.status).toBe('pending');
    expect(state.run.edges.get('s-c')!.status).toBe('taken');
    state.apply(at('node_started', { nodeId: 'check' }, 6));
    expect(state.run.edges.get('s-c')!.status).toBe('active');
    state.apply(
      at('node_waiting', { nodeId: 'check', reason: 'approval', options: ['yes', 'no'] }, 7),
    );
    expect(state.run.nodes.get('check')).toMatchObject({
      status: 'waiting',
      waiting: { reason: 'approval', options: ['yes', 'no'] },
    });
    expect(state.run.edges.get('s-c')!.status).toBe('active');
    state.apply(at('node_progress', { nodeId: 'check', progress: 0.5, message: 'half' }, 8));
    expect(state.run.nodes.get('check')).toMatchObject({
      progress: 0.5,
      message: 'half',
      status: 'waiting',
    });
    state.apply(at('node_completed', { nodeId: 'check', port: 'yes', output: 42 }, 9));
    expect(state.run.nodes.get('check')).toMatchObject({
      status: 'success',
      ports: ['yes'],
      output: 42,
      waiting: undefined,
    });
    expect(state.run.edges.get('c-yes')!.status).toBe('taken');
    expect(state.run.edges.get('c-no')!.status).toBe('not-taken');
    expect(state.run.nodes.get('yes')!.status).toBe('pending');
    expect(state.run.nodes.get('no')!.status).toBe('idle');
    state.apply(at('node_started', { nodeId: 'yes' }, 10));
    expect(state.run.edges.get('c-yes')!.status).toBe('active');
    state.apply(at('node_skipped', { nodeId: 'no' }, 10));
    expect(state.run.edges.get('no-end')!.status).toBe('disabled');
    state.apply(at('node_failed', { nodeId: 'yes', error: 'boom' }, 12));
    expect(state.run.nodes.get('yes')).toMatchObject({ status: 'failed', error: 'boom' });
    expect(state.run.edges.get('yes-end')!.status).toBe('not-taken');
    state.apply(at('edge_taken', { edgeId: 'yes-end' }, 13));
    expect(state.run.edges.get('yes-end')).toMatchObject({
      status: 'taken',
      explicit: true,
      at: 13,
    });
    expect(state.run.nodes.get('end')!.status).toBe('pending');
    state.apply(at('run_completed', {}, 14));
    expect(state.run.status).toBe('completed');
    expect(state.run.nodes.get('end')!.status).toBe('skipped');
    expect(state.run.applied).toBe(12);
  });

  it('retries bump attempts and clear the previous outcome', () => {
    const state = new FlowRunState(graph());
    state.apply(at('node_started', { nodeId: 'start' }, 1));
    state.apply(at('node_failed', { nodeId: 'start', error: 'x' }, 2));
    state.apply(at('node_started', { nodeId: 'start' }, 3));
    expect(state.run.nodes.get('start')).toMatchObject({
      status: 'running',
      attempts: 2,
      error: undefined,
      endedAt: undefined,
    });
    state.apply(at('node_started', { nodeId: 'start', attempt: 7 }, 4));
    expect(state.run.nodes.get('start')!.attempts).toBe(7);
    expect(state.run.status).toBe('running');
  });

  it('cancels busy nodes on run failure or cancellation and honours unreachedOnComplete', () => {
    const state = new FlowRunState(graph(), { unreachedOnComplete: 'idle' });
    state.apply(at('run_started', {}, 0));
    state.apply(at('node_started', { nodeId: 'start' }, 1));
    state.apply(at('node_completed', { nodeId: 'start' }, 2));
    state.apply(at('node_started', { nodeId: 'check' }, 3));
    state.apply(at('run_failed', { error: 'crash' }, 4));
    expect(state.run.status).toBe('failed');
    expect(state.run.nodes.get('check')!.status).toBe('cancelled');
    expect(state.run.nodes.get('yes')!.status).toBe('idle');
    expect(state.run.edges.get('s-c')!.status).toBe('taken');
    expect(state.run.edges.get('c-yes')!.status).toBe('disabled');
    const other = new FlowRunState(graph());
    other.apply(at('node_started', { nodeId: 'start' }, 1));
    other.apply(at('run_paused', {}, 2));
    expect(other.run.status).toBe('paused');
    other.apply(at('run_resumed', {}, 3));
    expect(other.run.status).toBe('running');
    other.apply(at('run_cancelled', {}, 4));
    expect(other.run.status).toBe('cancelled');
    expect(other.run.nodes.get('start')!.status).toBe('cancelled');
    const done = new FlowRunState(graph());
    done.apply(at('run_completed', {}, 1));
    expect([...done.run.nodes.values()].every((node) => node.status === 'skipped')).toBe(true);
  });

  it('ignores duplicates and drains out-of-order events by sequence', () => {
    const state = new FlowRunState(graph());
    expect(state.apply(at('run_started', { seq: 1 }, 0))).toBe(true);
    expect(state.apply(at('run_started', { seq: 1 }, 0))).toBe(false);
    expect(state.apply(at('node_completed', { seq: 4, nodeId: 'start' }, 3))).toBe(false);
    expect(state.apply(at('node_progress', { seq: 3, nodeId: 'start', progress: 1 }, 2))).toBe(
      false,
    );
    expect(state.pending.map((event) => event.seq)).toEqual([3, 4]);
    expect(state.run.nodes.get('start')!.status).toBe('idle');
    expect(state.apply(at('node_started', { seq: 2, nodeId: 'start' }, 1))).toBe(true);
    expect(state.pending).toEqual([]);
    expect(state.run.lastSeq).toBe(4);
    expect(state.run.applied).toBe(4);
    expect(state.run.nodes.get('start')).toMatchObject({ status: 'success', progress: 1 });
    expect(state.apply(at('node_started', { seq: 2, nodeId: 'check' }, 9))).toBe(false);
    expect(state.run.nodes.get('check')!.status).toBe('pending');
    // Buffered duplicates collapse.
    state.apply(at('node_started', { seq: 7, nodeId: 'check' }, 10));
    state.apply(at('node_started', { seq: 7, nodeId: 'check' }, 10));
    expect(state.pending.length).toBe(1);
  });

  it('applies in arrival order without strict ordering, still skipping repeats', () => {
    const state = new FlowRunState(graph(), { strictOrder: false });
    expect(state.apply(at('node_started', { seq: 5, nodeId: 'start' }, 1))).toBe(true);
    expect(state.apply(at('node_started', { seq: 5, nodeId: 'start' }, 1))).toBe(false);
    expect(state.apply(at('node_completed', { seq: 2, nodeId: 'start' }, 2))).toBe(true);
    expect(state.run.lastSeq).toBe(5);
  });

  it('ignores events of another run until a new run starts', () => {
    const state = new FlowRunState(graph(), { runId: 'a' });
    expect(state.apply(at('node_started', { runId: 'b', nodeId: 'start' }, 1))).toBe(false);
    expect(state.apply(at('node_started', { runId: 'a', nodeId: 'start' }, 1))).toBe(true);
    expect(state.apply(at('run_started', { runId: 'b' }, 2))).toBe(true);
    expect(state.run.id).toBe('b');
    expect(state.run.nodes.get('start')!.status).toBe('idle');
  });

  it('snapshots and restores independent copies', () => {
    const state = new FlowRunState(graph());
    state.apply(at('run_started', { seq: 1 }, 0));
    state.apply(at('node_started', { seq: 2, nodeId: 'start' }, 1));
    const snapshot = state.snapshot();
    state.apply(at('node_completed', { seq: 3, nodeId: 'start', port: 'p' }, 2));
    expect(snapshot.nodes.get('start')!.status).toBe('running');
    expect(snapshot.lastSeq).toBe(2);
    state.restore(snapshot);
    expect(state.run.nodes.get('start')!.status).toBe('running');
    expect(state.run.lastSeq).toBe(2);
    expect(state.run).not.toBe(snapshot);
    state.run.nodes.get('start')!.status = 'failed';
    expect(snapshot.nodes.get('start')!.status).toBe('running');
    state.reset();
    expect(state.run.status).toBe('idle');
    expect(state.run.applied).toBe(0);
  });

  it('tolerates events for nodes and edges outside the graph', () => {
    const state = new FlowRunState(graph());
    expect(state.apply(at('node_started', { nodeId: 'ghost' }, 1))).toBe(true);
    expect(state.run.nodes.get('ghost')!.status).toBe('running');
    expect(state.apply(at('edge_taken', { edgeId: 'ghost-edge' }, 2))).toBe(true);
    expect(state.run.edges.get('ghost-edge')!.status).toBe('taken');
  });
});
