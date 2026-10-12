/**
 * Run visualization types (Widgets §6.3 Run state): node and edge statuses, the event union a
 * host pushes (live) or replays (trace) and the derived run record.
 */
export type FlowNodeRunStatus =
  'idle' | 'pending' | 'running' | 'waiting' | 'success' | 'failed' | 'skipped' | 'cancelled';

export type FlowEdgeRunStatus = 'inactive' | 'active' | 'taken' | 'not-taken' | 'disabled';

export type FlowRunStatus = 'idle' | 'running' | 'paused' | 'completed' | 'failed' | 'cancelled';

export interface FlowRunEventBase {
  /** Sequence number; gaps are buffered and duplicates ignored. */
  seq?: number | undefined;
  /** Timestamp (ms) used for durations and playback pacing. */
  at: number;
  runId?: string | undefined;
}

export type FlowRunEventBody =
  | { type: 'run_started' }
  | { type: 'node_started'; nodeId: string; attempt?: number | undefined }
  | {
      type: 'node_waiting';
      nodeId: string;
      reason?: string | undefined;
      options?: readonly string[] | undefined;
    }
  | { type: 'node_progress'; nodeId: string; progress: number; message?: string | undefined }
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

export type FlowRunEvent = FlowRunEventBase & FlowRunEventBody;
export type FlowRunEventType = FlowRunEventBody['type'];

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
  /** Output ports the node finished through; absent means every outgoing edge. */
  ports?: string[] | undefined;
  waiting?: { reason?: string | undefined; options?: readonly string[] | undefined } | undefined;
}

export interface FlowEdgeRunState {
  status: FlowEdgeRunStatus;
  /** Set by an `edge_taken` event. */
  explicit: boolean;
  at?: number | undefined;
}

export interface FlowRun {
  id: string;
  status: FlowRunStatus;
  startedAt?: number | undefined;
  endedAt?: number | undefined;
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

export type FlowTrace = readonly FlowRunEvent[];

/** Injectable clock for playback; tests pass a fake, hosts the timer of their environment. */
export interface FlowTicker {
  now(): number;
  schedule(callback: () => void, delayMs: number): () => void;
}
