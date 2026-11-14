/**
 * Run visualization types: node and edge statuses, the event union a host pushes (live) or
 * replays (trace) and the derived run record.
 */

/** The run state of one node, which the node's status marker shows. */
export type FlowNodeRunStatus =
  'idle' | 'pending' | 'running' | 'waiting' | 'success' | 'failed' | 'skipped' | 'cancelled';

/** How an edge shows during a run: inactive, active, taken, not taken or disabled. */
export type FlowEdgeRunStatus = 'inactive' | 'active' | 'taken' | 'not-taken' | 'disabled';

/** The overall state of a run, from idle through running or paused to how it ended. */
export type FlowRunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

/** Fields every run event carries: its timestamp and optional sequence number and run id. */
export interface FlowRunEventBase {
  /** Sequence number; gaps are buffered and duplicates ignored. */
  seq?: number | undefined;
  /** Timestamp (ms) used for durations and playback pacing. */
  at: number;
  runId?: string | undefined;
}

/** The kind-specific part of a run event, one variant per run, node or edge transition. */
export type FlowRunEventBody =
  /** `scope` limits the run to those nodes; nodes outside it keep their earlier results. */
  | { type: 'run_started'; scope?: readonly string[] | undefined }
  | { type: 'node_started'; nodeId: string; attempt?: number | undefined }
  | {
      type: 'node_waiting';
      nodeId: string;
      reason?: string | undefined;
      options?: readonly string[] | undefined;
    }
  | { type: 'node_progress'; nodeId: string; progress: number; message?: string | undefined }
  /** A problem the node reported without failing; warnings accumulate until it starts again. */
  | { type: 'node_warning'; nodeId: string; message: string }
  | { type: 'node_completed'; nodeId: string; port?: string | undefined; output?: unknown }
  | { type: 'node_failed'; nodeId: string; error: string; port?: string | undefined }
  | { type: 'node_skipped'; nodeId: string; reason?: string | undefined }
  | { type: 'node_cancelled'; nodeId: string }
  | { type: 'edge_taken'; edgeId: string }
  | { type: 'run_paused' }
  | { type: 'run_resumed' }
  | { type: 'run_completed'; output?: unknown }
  | { type: 'run_failed'; error: string }
  | { type: 'run_cancelled' };

/**
 * One step of a run that a host pushes live or replays from a trace, such as a node starting or
 * failing.
 */
export type FlowRunEvent = FlowRunEventBase & FlowRunEventBody;
export type FlowRunEventType = FlowRunEventBody['type'];

/** What a run knows about one node: its status, attempts, timing, progress, output and problems. */
export interface FlowNodeRunState {
  status: FlowNodeRunStatus;
  attempts: number;
  startedAt?: number | undefined;
  endedAt?: number | undefined;
  durationMs?: number | undefined;
  progress?: number | undefined;
  message?: string | undefined;
  output?: unknown;
  error?: string | undefined;
  warnings?: string[] | undefined;
  /** Output ports the node finished through; absent means every outgoing edge. */
  ports?: string[] | undefined;
  waiting?: { reason?: string | undefined; options?: readonly string[] | undefined } | undefined;
}

/** What a run knows about one edge: its status and when it changed. */
export interface FlowEdgeRunState {
  status: FlowEdgeRunStatus;
  /** Set by an `edge_taken` event. */
  explicit: boolean;
  at?: number | undefined;
}

/** The run record derived from the events applied so far, with the state of every node and edge. */
export interface FlowRun {
  id: string;
  status: FlowRunStatus;
  startedAt?: number | undefined;
  endedAt?: number | undefined;
  /** The `run_failed` error. */
  error?: string | undefined;
  /** The nodes a scoped `run_started` limited the run to; absent for a whole-graph run. */
  scope?: readonly string[] | undefined;
  nodes: Map<string, FlowNodeRunState>;
  edges: Map<string, FlowEdgeRunState>;
  /** Last applied sequence number, `-1` before the first sequenced event. */
  lastSeq: number;
  /** Events applied so far. */
  applied: number;
}

export interface FlowRunGraphEdge {
  id: string;
  source: string;
  sourcePort?: string | undefined;
  target: string;
  targetPort?: string | undefined;
}

export interface FlowRunGraph {
  nodes: string[];
  edges: FlowRunGraphEdge[];
  outgoing: Map<string, string[]>;
  incoming: Map<string, string[]>;
}

/** A recorded list of run events, replayed to show a past run. */
export type FlowTrace = readonly FlowRunEvent[];

/** What a run request covers: every node, one node, a node and its downstream, or its upstream and it. */
export type FlowRunScope = 'graph' | 'node' | 'from' | 'to';

/** Node counts per status, the nodes with warnings and the node total. */
export type FlowRunSummary = Record<FlowNodeRunStatus, number> & {
  warnings: number;
  total: number;
};

/** Injectable clock for playback; tests pass a fake, hosts the timer of their environment. */
export interface FlowTicker {
  now(): number;
  schedule(callback: () => void, delayMs: number): () => void;
}
