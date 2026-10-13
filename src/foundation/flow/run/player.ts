import { FlowRunState, reconcileRun, type FlowRunStateOptions } from './state.js';
import type { FlowRun, FlowRunEvent, FlowRunGraph, FlowTicker, FlowTrace } from './types.js';

export interface FlowRunPlayerOptions extends FlowRunStateOptions {
  trace?: FlowTrace | undefined;
  /** Events between snapshots (default 64). */
  snapshotInterval?: number | undefined;
  /** Snapshot cap; past it the interval doubles and every other snapshot is dropped (default 256). */
  maxSnapshots?: number | undefined;
  ticker?: FlowTicker | undefined;
  /** Longest pause between two events while playing, in ms (default 2000). */
  maxStepDelay?: number | undefined;
  /** Live mode: apply pushed events immediately while positioned at the end (default true). */
  follow?: boolean | undefined;
}

export type FlowRunPlayerMode = 'trace' | 'live';

/** Ticker over the environment's timers; the engine never schedules on its own. */
export function timeoutTicker(): FlowTicker {
  const host = globalThis as unknown as {
    setTimeout?: (callback: () => void, ms: number) => unknown;
    clearTimeout?: (handle: unknown) => void;
  };
  if (typeof host.setTimeout !== 'function')
    throw new Error('FlowRunPlayer: no timer available; pass a ticker');
  return {
    now: () => Date.now(),
    schedule: (callback, delayMs) => {
      const handle = host.setTimeout!(callback, delayMs);
      return () => host.clearTimeout?.(handle);
    },
  };
}

/**
 * Plays a run trace: `seek` restores the nearest earlier snapshot and replays forward, `step`
 * and `back` move by one event, `play` paces events by their timestamps on an injected ticker,
 * `push` appends live events and follows them while the player sits at the end.
 */
export class FlowRunPlayer {
  readonly #state: FlowRunState;
  readonly #ticker: FlowTicker | undefined;
  readonly #maxStepDelay: number;
  readonly #maxSnapshots: number;
  #interval: number;
  #trace: FlowRunEvent[];
  #index = 0;
  #mode: FlowRunPlayerMode = 'trace';
  #snapshots: Array<{ index: number; run: FlowRun }> = [];
  #playing = false;
  #speed = 1;
  #follow: boolean;
  #cancel: (() => void) | undefined;
  readonly #listeners = new Set<(player: FlowRunPlayer) => void>();
  #disposed = false;

  constructor(graph: FlowRunGraph, options: FlowRunPlayerOptions = {}) {
    const { trace, snapshotInterval, maxSnapshots, ticker, maxStepDelay, follow, ...stateOptions } =
      options;
    this.#state = new FlowRunState(graph, stateOptions);
    this.#ticker = ticker;
    this.#maxStepDelay = maxStepDelay ?? 2000;
    this.#maxSnapshots = Math.max(2, maxSnapshots ?? 256);
    this.#interval = Math.max(1, snapshotInterval ?? 64);
    this.#follow = follow ?? true;
    this.#trace = trace ? [...trace] : [];
    this.#snapshots = [{ index: 0, run: this.#state.snapshot() }];
  }

  get mode(): FlowRunPlayerMode {
    return this.#mode;
  }

  get length(): number {
    return this.#trace.length;
  }

  /** Events applied so far (0 … length). */
  get index(): number {
    return this.#index;
  }

  get state(): FlowRun {
    return this.#state.run;
  }

  get trace(): FlowTrace {
    return this.#trace;
  }

  get playing(): boolean {
    return this.#playing;
  }

  get speed(): number {
    return this.#speed;
  }

  get follow(): boolean {
    return this.#follow;
  }

  set follow(value: boolean) {
    this.#follow = value;
    if (value && !this.#playing && this.#index < this.#trace.length) this.seek(this.#trace.length);
  }

  get snapshotCount(): number {
    return this.#snapshots.length;
  }

  seek(index: number): void {
    const target = Math.max(0, Math.min(this.#trace.length, Math.floor(index)));
    if (target === this.#index) return;
    if (target < this.#index) {
      const snapshot = this.#snapshotBefore(target);
      this.#state.restore(snapshot.run);
      this.#index = snapshot.index;
    }
    this.#advance(target);
    this.#notify();
  }

  step(): boolean {
    if (this.#index >= this.#trace.length) return false;
    this.seek(this.#index + 1);
    return true;
  }

  back(): boolean {
    if (this.#index <= 0) return false;
    this.seek(this.#index - 1);
    return true;
  }

  toStart(): void {
    this.seek(0);
  }

  toEnd(): void {
    this.seek(this.#trace.length);
  }

  play(speed = this.#speed): void {
    this.#speed = speed > 0 ? speed : 1;
    if (this.#playing) {
      this.#cancel?.();
      this.#scheduleNext();
      return;
    }
    this.#playing = true;
    this.#scheduleNext();
    this.#notify();
  }

  pause(): void {
    if (!this.#playing) return;
    this.#playing = false;
    this.#cancel?.();
    this.#cancel = undefined;
    this.#notify();
  }

  /** Appends a live event; applied at once while following at the end and not playing. */
  push(event: FlowRunEvent): void {
    this.#mode = 'live';
    this.#trace.push(event);
    const atEnd = this.#index === this.#trace.length - 1;
    if (this.#follow && !this.#playing && atEnd) {
      this.#advance(this.#trace.length);
      this.#notify();
      return;
    }
    if (this.#playing && this.#cancel === undefined) this.#scheduleNext();
    this.#notify();
  }

  setTrace(trace: FlowTrace): void {
    this.pause();
    this.#mode = 'trace';
    this.#trace = [...trace];
    this.#state.reset();
    this.#index = 0;
    this.#snapshots = [{ index: 0, run: this.#state.snapshot() }];
    this.#notify();
  }

  /** Follows an edited document; the position and the snapshots stay, matched to the graph. */
  setGraph(graph: FlowRunGraph): void {
    this.#state.setGraph(graph);
    this.#snapshots = this.#snapshots.map((snapshot) => ({
      index: snapshot.index,
      run: reconcileRun(snapshot.run, graph),
    }));
    this.#notify();
  }

  subscribe(listener: (player: FlowRunPlayer) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }

  dispose(): void {
    this.#disposed = true;
    this.pause();
    this.#listeners.clear();
  }

  #advance(target: number): void {
    while (this.#index < target) {
      const event = this.#trace[this.#index]!;
      this.#state.apply(event);
      this.#index += 1;
      if (
        this.#index % this.#interval === 0 &&
        this.#index > (this.#snapshots[this.#snapshots.length - 1]?.index ?? -1)
      )
        this.#takeSnapshot();
    }
  }

  #takeSnapshot(): void {
    this.#snapshots.push({ index: this.#index, run: this.#state.snapshot() });
    if (this.#snapshots.length > this.#maxSnapshots) {
      this.#interval *= 2;
      this.#snapshots = this.#snapshots.filter((snapshot) => snapshot.index % this.#interval === 0);
    }
  }

  #snapshotBefore(index: number): { index: number; run: FlowRun } {
    let low = 0;
    let high = this.#snapshots.length - 1;
    while (low < high) {
      const mid = (low + high + 1) >> 1;
      if (this.#snapshots[mid]!.index <= index) low = mid;
      else high = mid - 1;
    }
    return this.#snapshots[low]!;
  }

  #scheduleNext(): void {
    this.#cancel?.();
    this.#cancel = undefined;
    if (this.#disposed || !this.#playing) return;
    if (this.#index >= this.#trace.length) {
      if (this.#mode !== 'live') {
        this.#playing = false;
        this.#notify();
      }
      return;
    }
    const ticker = this.#ticker ?? timeoutTicker();
    const next = this.#trace[this.#index]!;
    const previous = this.#index > 0 ? this.#trace[this.#index - 1]!.at : next.at;
    const delay = Math.min(this.#maxStepDelay, Math.max(0, (next.at - previous) / this.#speed));
    this.#cancel = ticker.schedule(() => {
      this.#cancel = undefined;
      if (!this.#playing) return;
      this.#advance(this.#index + 1);
      this.#notify();
      this.#scheduleNext();
    }, delay);
  }

  #notify(): void {
    for (const listener of [...this.#listeners]) listener(this);
  }
}
