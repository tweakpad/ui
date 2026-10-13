import { adjacencyOrder, reachable, type FlowAdjacency } from '../model/queries.js';
import type { FlowDocument, FlowModelLike } from '../types.js';
import type {
  FlowEdgeRunState,
  FlowEdgeRunStatus,
  FlowNodeRunState,
  FlowRun,
  FlowRunEvent,
  FlowRunGraph,
  FlowRunGraphEdge,
  FlowRunScope,
  FlowRunSummary,
} from './types.js';

/** Builds the run graph (node ids plus edges and adjacency) from a document or a model. */
export function flowRunGraph(source: FlowDocument | FlowModelLike): FlowRunGraph {
  const flow = 'document' in source ? source.document : source;
  const nodes = flow.nodes.map((node) => node.id);
  const edges: FlowRunGraphEdge[] = flow.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    sourcePort: edge.sourcePort,
    target: edge.target,
    targetPort: edge.targetPort,
  }));
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const id of nodes) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }
  for (const edge of edges) {
    outgoing.get(edge.source)?.push(edge.id);
    incoming.get(edge.target)?.push(edge.id);
  }
  return { nodes, edges, outgoing, incoming };
}

/** Node-to-node adjacency of a run graph, in its node order. */
function runAdjacency(graph: FlowRunGraph): FlowAdjacency {
  const outgoing = new Map<string, string[]>();
  const incoming = new Map<string, string[]>();
  for (const id of graph.nodes) {
    outgoing.set(id, []);
    incoming.set(id, []);
  }
  for (const edge of graph.edges) {
    const out = outgoing.get(edge.source);
    const inc = incoming.get(edge.target);
    if (!out || !inc) continue;
    out.push(edge.target);
    inc.push(edge.source);
  }
  return { order: graph.nodes, outgoing, incoming };
}

/**
 * The nodes a run request covers, in execution (topological) order: every node (`graph`), the node
 * alone (`node`), the node and everything downstream of it (`from`), or everything upstream of it
 * and the node (`to`). Nodes on cycles follow in graph order; an unknown node yields nothing.
 */
export function flowRunScope(graph: FlowRunGraph, scope: FlowRunScope, nodeId?: string): string[] {
  const adjacency = runAdjacency(graph);
  const order = adjacencyOrder(adjacency);
  if (scope === 'graph') return order;
  if (nodeId === undefined || !adjacency.outgoing.has(nodeId)) return [];
  if (scope === 'node') return [nodeId];
  const covered = reachable(adjacency, nodeId, scope === 'from' ? 'downstream' : 'upstream');
  covered.add(nodeId);
  return order.filter((id) => covered.has(id));
}

/** Node counts per status, plus the nodes carrying warnings, for a summary of a run. */
export function flowRunSummary(run: FlowRun | null | undefined): FlowRunSummary {
  const summary: FlowRunSummary = {
    idle: 0,
    pending: 0,
    running: 0,
    waiting: 0,
    success: 0,
    failed: 0,
    skipped: 0,
    cancelled: 0,
    warnings: 0,
    total: 0,
  };
  for (const node of run?.nodes.values() ?? []) {
    summary[node.status] += 1;
    summary.total += 1;
    if (node.warnings?.length) summary.warnings += 1;
  }
  return summary;
}

const FINISHED = new Set(['success', 'failed']);
const BUSY = new Set(['running', 'waiting']);

/** Whether the source finished through the port the edge leaves from. */
function finishedThrough(edge: FlowRunGraphEdge, source: FlowNodeRunState): boolean {
  if (!FINISHED.has(source.status)) return false;
  if (!source.ports || source.ports.length === 0) return source.status === 'success';
  if (edge.sourcePort === undefined) return true;
  return source.ports.includes(edge.sourcePort);
}

/**
 * Edge status from its endpoints: explicit `edge_taken` → taken; source skipped/cancelled →
 * disabled; source finished through this port and target running/waiting → active; finished
 * through this port → taken; finished through another port → not-taken; else inactive.
 */
export function deriveEdgeStatus(
  edge: FlowRunGraphEdge,
  source: FlowNodeRunState,
  target: FlowNodeRunState,
  explicit: boolean,
): FlowEdgeRunStatus {
  if (explicit) return 'taken';
  if (source.status === 'skipped' || source.status === 'cancelled') return 'disabled';
  if (!FINISHED.has(source.status)) return 'inactive';
  if (finishedThrough(edge, source)) return BUSY.has(target.status) ? 'active' : 'taken';
  return 'not-taken';
}

export interface FlowRunStateOptions {
  runId?: string | undefined;
  /** Gate sequenced events (default true); `false` applies them in arrival order. */
  strictOrder?: boolean | undefined;
  /** Status of nodes never reached when the run completes (default `skipped`). */
  unreachedOnComplete?: 'skipped' | 'idle' | undefined;
}

const idleNode = (): FlowNodeRunState => ({ status: 'idle', attempts: 0 });
const inactiveEdge = (): FlowEdgeRunState => ({ status: 'inactive', explicit: false });

/**
 * Applies run events idempotently and in sequence: duplicates (by `seq`) are ignored, gaps are
 * buffered until the missing events arrive, node transitions update the incident edges.
 * Snapshots are deep copies the player restores from.
 */
export class FlowRunState {
  #graph: FlowRunGraph;
  readonly #strict: boolean;
  readonly #unreached: 'skipped' | 'idle';
  readonly #initialRunId: string;
  #run: FlowRun;
  #pending: FlowRunEvent[] = [];
  readonly #seen = new Set<number>();

  constructor(graph: FlowRunGraph, options: FlowRunStateOptions = {}) {
    this.#graph = graph;
    this.#strict = options.strictOrder ?? true;
    this.#unreached = options.unreachedOnComplete ?? 'skipped';
    this.#initialRunId = options.runId ?? '';
    this.#run = this.#fresh(this.#initialRunId);
  }

  get graph(): FlowRunGraph {
    return this.#graph;
  }

  /** The live run record; treat it as read-only. */
  get run(): FlowRun {
    return this.#run;
  }

  /** Buffered events waiting for earlier sequence numbers, in sequence order. */
  get pending(): readonly FlowRunEvent[] {
    return this.#pending;
  }

  reset(): void {
    this.#run = this.#fresh(this.#initialRunId);
    this.#pending = [];
    this.#seen.clear();
  }

  /**
   * Follows an edited document: added nodes and edges join idle, removed ones leave the record,
   * and every edge status is derived again.
   */
  setGraph(graph: FlowRunGraph): void {
    this.#graph = graph;
    this.#run = reconcileRun(this.#run, graph);
    this.#refreshEdges(graph.edges.map((edge) => edge.id));
  }

  /** Applies one event; returns whether the state changed now (duplicates/buffered: false). */
  apply(event: FlowRunEvent): boolean {
    if (
      event.runId !== undefined &&
      this.#run.id !== '' &&
      event.runId !== this.#run.id &&
      event.type !== 'run_started'
    )
      return false;
    if (event.seq === undefined) {
      this.#applyNow(event);
      return true;
    }
    if (!this.#strict) {
      if (this.#seen.has(event.seq)) return false;
      this.#seen.add(event.seq);
      this.#applyNow(event);
      this.#run.lastSeq = Math.max(this.#run.lastSeq, event.seq);
      return true;
    }
    if (this.#run.lastSeq >= 0) {
      if (event.seq <= this.#run.lastSeq) return false;
      if (event.seq > this.#run.lastSeq + 1) {
        this.#buffer(event);
        return false;
      }
    }
    this.#applyNow(event);
    this.#run.lastSeq = event.seq;
    this.#drain();
    return true;
  }

  snapshot(): FlowRun {
    return cloneRun(this.#run);
  }

  restore(run: FlowRun): void {
    this.#run = cloneRun(run);
    this.#pending = [];
    this.#seen.clear();
  }

  #buffer(event: FlowRunEvent): void {
    const seq = event.seq!;
    if (this.#pending.some((candidate) => candidate.seq === seq)) return;
    let at = 0;
    while (at < this.#pending.length && this.#pending[at]!.seq! < seq) at += 1;
    this.#pending.splice(at, 0, event);
  }

  #drain(): void {
    while (this.#pending.length > 0 && this.#pending[0]!.seq! <= this.#run.lastSeq + 1) {
      const next = this.#pending.shift()!;
      if (next.seq! <= this.#run.lastSeq) continue;
      this.#applyNow(next);
      this.#run.lastSeq = next.seq!;
    }
  }

  #fresh(id: string): FlowRun {
    const nodes = new Map<string, FlowNodeRunState>();
    const edges = new Map<string, FlowEdgeRunState>();
    for (const node of this.#graph.nodes) nodes.set(node, idleNode());
    for (const edge of this.#graph.edges) edges.set(edge.id, inactiveEdge());
    return { id, status: 'idle', nodes, edges, lastSeq: -1, applied: 0 };
  }

  #node(id: string): FlowNodeRunState {
    let node = this.#run.nodes.get(id);
    if (!node) this.#run.nodes.set(id, (node = idleNode()));
    return node;
  }

  #applyNow(event: FlowRunEvent): void {
    const run = this.#run;
    const touched = new Set<string>();
    let all = false;
    switch (event.type) {
      case 'run_started': {
        const id = event.runId ?? run.id;
        const lastSeq = run.lastSeq;
        this.#run = this.#fresh(id);
        this.#run.lastSeq = lastSeq;
        this.#run.applied = run.applied;
        this.#run.status = 'running';
        this.#run.startedAt = event.at;
        if (event.scope) {
          // A partial run: nodes outside the scope keep their earlier results.
          const scope = new Set(event.scope);
          this.#run.scope = [...event.scope];
          for (const [nodeId, state] of run.nodes)
            if (!scope.has(nodeId) && this.#run.nodes.has(nodeId))
              this.#run.nodes.set(nodeId, state);
          for (const edge of this.#graph.edges) {
            const kept = run.edges.get(edge.id);
            if (kept && !scope.has(edge.source) && !scope.has(edge.target))
              this.#run.edges.set(edge.id, kept);
          }
        }
        all = true;
        break;
      }
      case 'node_started': {
        const node = this.#node(event.nodeId);
        node.status = 'running';
        node.attempts = event.attempt ?? node.attempts + 1;
        node.startedAt = event.at;
        node.endedAt = undefined;
        node.durationMs = undefined;
        node.progress = undefined;
        node.message = undefined;
        node.error = undefined;
        node.warnings = undefined;
        node.ports = undefined;
        node.waiting = undefined;
        if (run.status === 'idle') run.status = 'running';
        touched.add(event.nodeId);
        break;
      }
      case 'node_waiting': {
        const node = this.#node(event.nodeId);
        node.status = 'waiting';
        node.waiting = { reason: event.reason, options: event.options };
        touched.add(event.nodeId);
        break;
      }
      case 'node_warning': {
        const node = this.#node(event.nodeId);
        node.warnings = [...(node.warnings ?? []), event.message];
        touched.add(event.nodeId);
        break;
      }
      case 'node_progress': {
        const node = this.#node(event.nodeId);
        node.progress = event.progress;
        node.message = event.message;
        if (node.status === 'idle' || node.status === 'pending') node.status = 'running';
        touched.add(event.nodeId);
        break;
      }
      case 'node_completed':
      case 'node_failed': {
        const node = this.#node(event.nodeId);
        node.status = event.type === 'node_completed' ? 'success' : 'failed';
        node.endedAt = event.at;
        node.durationMs = node.startedAt !== undefined ? event.at - node.startedAt : undefined;
        node.waiting = undefined;
        if (event.type === 'node_completed') node.output = event.output;
        else node.error = event.error;
        if (event.port !== undefined) {
          node.ports ??= [];
          if (!node.ports.includes(event.port)) node.ports.push(event.port);
        }
        touched.add(event.nodeId);
        // Targets reached through the finished ports wait their turn, within a scoped run's scope.
        const scope = this.#run.scope;
        for (const edgeId of this.#graph.outgoing.get(event.nodeId) ?? []) {
          const edge = this.#edgeOf(edgeId);
          if (!edge || !finishedThrough(edge, node)) continue;
          const target = this.#node(edge.target);
          if (target.status === 'idle' && (!scope || scope.includes(edge.target)))
            target.status = 'pending';
          touched.add(edge.target);
        }
        break;
      }
      case 'node_skipped':
      case 'node_cancelled': {
        const node = this.#node(event.nodeId);
        node.status = event.type === 'node_skipped' ? 'skipped' : 'cancelled';
        node.endedAt = event.at;
        node.waiting = undefined;
        touched.add(event.nodeId);
        break;
      }
      case 'edge_taken': {
        let edge = run.edges.get(event.edgeId);
        if (!edge) run.edges.set(event.edgeId, (edge = inactiveEdge()));
        edge.explicit = true;
        edge.at = event.at;
        const record = this.#edgeOf(event.edgeId);
        if (record) {
          const target = this.#node(record.target);
          if (target.status === 'idle') target.status = 'pending';
          touched.add(record.source);
          touched.add(record.target);
        } else edge.status = 'taken';
        break;
      }
      case 'run_paused':
        run.status = 'paused';
        break;
      case 'run_resumed':
        run.status = 'running';
        break;
      case 'run_completed':
        run.status = 'completed';
        run.endedAt = event.at;
        for (const node of this.#scoped())
          if (node.status === 'idle' || node.status === 'pending') node.status = this.#unreached;
        all = true;
        break;
      case 'run_failed':
      case 'run_cancelled':
        run.status = event.type === 'run_failed' ? 'failed' : 'cancelled';
        run.endedAt = event.at;
        if (event.type === 'run_failed') run.error = event.error;
        for (const node of this.#scoped())
          if (BUSY.has(node.status) || node.status === 'pending') node.status = 'cancelled';
        all = true;
        break;
    }
    this.#run.applied += 1;
    if (all) this.#refreshEdges(this.#graph.edges.map((edge) => edge.id));
    else if (touched.size > 0) {
      const ids = new Set<string>();
      for (const nodeId of touched) {
        for (const edgeId of this.#graph.outgoing.get(nodeId) ?? []) ids.add(edgeId);
        for (const edgeId of this.#graph.incoming.get(nodeId) ?? []) ids.add(edgeId);
      }
      this.#refreshEdges([...ids]);
    }
  }

  /** The node records the run covers: its scope, or every node of a whole-graph run. */
  #scoped(): FlowNodeRunState[] {
    const { nodes, scope } = this.#run;
    if (!scope) return [...nodes.values()];
    return scope.flatMap((id) => {
      const node = nodes.get(id);
      return node ? [node] : [];
    });
  }

  #edgeOf(id: string): FlowRunGraphEdge | undefined {
    return this.#graph.edges.find((edge) => edge.id === id);
  }

  #refreshEdges(ids: readonly string[]): void {
    for (const id of ids) {
      const record = this.#edgeOf(id);
      if (!record) continue;
      let edge = this.#run.edges.get(id);
      if (!edge) this.#run.edges.set(id, (edge = inactiveEdge()));
      edge.status = deriveEdgeStatus(
        record,
        this.#node(record.source),
        this.#node(record.target),
        edge.explicit,
      );
    }
  }
}

export function cloneRun(run: FlowRun): FlowRun {
  const nodes = new Map<string, FlowNodeRunState>();
  for (const [id, node] of run.nodes)
    nodes.set(id, {
      ...node,
      ports: node.ports ? [...node.ports] : undefined,
      warnings: node.warnings ? [...node.warnings] : undefined,
      waiting: node.waiting ? { ...node.waiting } : undefined,
    });
  const edges = new Map<string, FlowEdgeRunState>();
  for (const [id, edge] of run.edges) edges.set(id, { ...edge });
  return { ...run, ...(run.scope ? { scope: [...run.scope] } : {}), nodes, edges };
}

/** A run record matched to a graph: new nodes and edges idle, removed ones dropped. */
export function reconcileRun(run: FlowRun, graph: FlowRunGraph): FlowRun {
  const nodes = new Map<string, FlowNodeRunState>();
  for (const id of graph.nodes) nodes.set(id, run.nodes.get(id) ?? idleNode());
  const edges = new Map<string, FlowEdgeRunState>();
  for (const edge of graph.edges) edges.set(edge.id, run.edges.get(edge.id) ?? inactiveEdge());
  return { ...run, nodes, edges };
}
