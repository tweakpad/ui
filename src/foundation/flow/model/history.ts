import type { ChangeReason, FlowChange, FlowChangeOrigin } from '../types.js';
import { squashFlowChanges } from './changes.js';

/**
 * Undo/redo stack of change lists. Entries hold forward and inverse changes; coalescing merges
 * an entry into its predecessor when both carry the same key within `coalesceWindow`. Limits
 * apply by entry count and by total recorded changes. Measurement is never recorded; viewport
 * and selection changes only when opted in.
 */
export interface FlowHistoryOptions {
  /** Maximum entries (default 200). */
  limit?: number;
  /** Maximum total forward changes across entries (default 20000). */
  maxChanges?: number;
  /** Milliseconds within which same-key entries merge (default 300). */
  coalesceWindow?: number;
  /** Record `node-select` / `edge-select` (default false). */
  recordSelection?: boolean;
  /** Record `viewport` (default false). */
  recordViewport?: boolean;
}

export interface FlowHistoryEntry {
  changes: FlowChange[];
  inverse: FlowChange[];
  reason: ChangeReason;
  origin: FlowChangeOrigin;
  label?: string;
  coalesceKey?: string;
  at: number;
}

export interface FlowHistoryState {
  canUndo: boolean;
  canRedo: boolean;
  undoLabel?: string;
  redoLabel?: string;
  depth: number;
}

export type FlowHistoryRecord = Omit<FlowHistoryEntry, 'at'> & { at?: number };

export class FlowHistory {
  readonly #past: FlowHistoryEntry[] = [];
  readonly #future: FlowHistoryEntry[] = [];
  readonly #limit: number;
  readonly #maxChanges: number;
  readonly #coalesceWindow: number;
  readonly #recordSelection: boolean;
  readonly #recordViewport: boolean;
  readonly #now: () => number;
  #changeCount = 0;

  constructor(options: FlowHistoryOptions = {}, now: () => number = () => Date.now()) {
    this.#limit = Math.max(0, options.limit ?? 200);
    this.#maxChanges = Math.max(0, options.maxChanges ?? 20000);
    this.#coalesceWindow = Math.max(0, options.coalesceWindow ?? 300);
    this.#recordSelection = options.recordSelection ?? false;
    this.#recordViewport = options.recordViewport ?? false;
    this.#now = now;
  }

  get canUndo(): boolean {
    return this.#past.length > 0;
  }

  get canRedo(): boolean {
    return this.#future.length > 0;
  }

  get depth(): number {
    return this.#past.length;
  }

  get undoLabel(): string | undefined {
    return this.#past[this.#past.length - 1]?.label;
  }

  get redoLabel(): string | undefined {
    return this.#future[this.#future.length - 1]?.label;
  }

  get entries(): readonly FlowHistoryEntry[] {
    return this.#past;
  }

  get state(): FlowHistoryState {
    const state: FlowHistoryState = {
      canUndo: this.canUndo,
      canRedo: this.canRedo,
      depth: this.depth,
    };
    const undoLabel = this.undoLabel;
    const redoLabel = this.redoLabel;
    if (undoLabel !== undefined) state.undoLabel = undoLabel;
    if (redoLabel !== undefined) state.redoLabel = redoLabel;
    return state;
  }

  /** Whether a change belongs in history under the current options. */
  recordable(change: FlowChange): boolean {
    switch (change.type) {
      case 'node-measure':
        return false;
      case 'node-select':
      case 'edge-select':
        return this.#recordSelection;
      case 'viewport':
        return this.#recordViewport;
      default:
        return true;
    }
  }

  /** Records an entry (filtered to recordable changes); returns whether anything was stored. */
  record(record: FlowHistoryRecord): boolean {
    const changes = record.changes.filter((change) => this.recordable(change));
    const inverse = record.inverse.filter((change) => this.recordable(change));
    if (changes.length === 0) return false;
    this.#future.length = 0;
    const at = record.at ?? this.#now();
    const last = this.#past[this.#past.length - 1];
    if (
      record.coalesceKey !== undefined &&
      last?.coalesceKey === record.coalesceKey &&
      at - last.at <= this.#coalesceWindow
    ) {
      this.#changeCount -= last.changes.length;
      last.changes = squashFlowChanges([...last.changes, ...changes]);
      last.inverse = squashFlowChanges([...inverse, ...last.inverse]);
      last.at = at;
      if (record.label !== undefined) last.label = record.label;
      this.#changeCount += last.changes.length;
      this.#trim();
      return true;
    }
    const entry: FlowHistoryEntry = {
      changes,
      inverse,
      reason: record.reason,
      origin: record.origin,
      at,
    };
    if (record.label !== undefined) entry.label = record.label;
    if (record.coalesceKey !== undefined) entry.coalesceKey = record.coalesceKey;
    this.#past.push(entry);
    this.#changeCount += changes.length;
    this.#trim();
    return true;
  }

  peekUndo(): FlowHistoryEntry | undefined {
    return this.#past[this.#past.length - 1];
  }

  peekRedo(): FlowHistoryEntry | undefined {
    return this.#future[this.#future.length - 1];
  }

  /** Moves the newest entry to the redo stack and returns it. */
  undo(): FlowHistoryEntry | undefined {
    const entry = this.#past.pop();
    if (!entry) return undefined;
    this.#changeCount -= entry.changes.length;
    this.#future.push(entry);
    return entry;
  }

  redo(): FlowHistoryEntry | undefined {
    const entry = this.#future.pop();
    if (!entry) return undefined;
    this.#past.push(entry);
    this.#changeCount += entry.changes.length;
    return entry;
  }

  /** Drops the newest `count` undo entries (changes that were rolled back by their owner). */
  discardNewest(count: number): number {
    let dropped = 0;
    while (dropped < count && this.#past.length > 0) {
      const entry = this.#past.pop()!;
      this.#changeCount -= entry.changes.length;
      dropped += 1;
    }
    return dropped;
  }

  clear(): void {
    this.#past.length = 0;
    this.#future.length = 0;
    this.#changeCount = 0;
  }

  #trim(): void {
    while (this.#past.length > this.#limit) this.#dropOldest();
    while (this.#changeCount > this.#maxChanges && this.#past.length > 1) this.#dropOldest();
  }

  #dropOldest(): void {
    const dropped = this.#past.shift();
    if (dropped) this.#changeCount -= dropped.changes.length;
  }
}
