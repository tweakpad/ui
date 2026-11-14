import { windowFrames } from '../../foundation/frame-loop.js';

/** A paint a plot registers with a scheduler, with the shortest time allowed between its paints. */
export interface PlotRenderJob {
  paint(timestamp: number): void;
  minimumInterval: number;
}
/**
 * Returned when a job registers with a scheduler: requests the next paint, retunes or suspends it,
 * and unregisters it.
 */
export interface PlotRenderHandle {
  invalidate(): void;
  configure(options: { minimumInterval: number; suspended: boolean }): void;
  dispose(): void;
}
/**
 * Paints the plots of one window within a shared frame budget; assign one to several plots through
 * `scheduler`.
 */
export interface PlotRenderScheduler {
  readonly owner: Window;
  readonly disposed?: boolean;
  register(job: PlotRenderJob): PlotRenderHandle;
}
export interface PlotSchedulerOptions {
  owner?: Window;
  budgetMs?: number;
  maxPlotsPerFrame?: number;
}
interface Job {
  paint: (time: number) => void;
  interval: number;
  suspended: boolean;
  dirty: boolean;
  last: number;
  disposed: boolean;
}
/** Preserve rate phase through normal frame jitter; late frames never trigger catch-up bursts. */
export function plotFrameDeadline(
  last: number,
  interval: number,
  time: number,
): number | undefined {
  const tolerance = Math.min(2, interval / 10);
  if (time + tolerance < last + interval) return undefined;
  if (!Number.isFinite(last) || interval === 0) return time;
  const periods = Math.max(1, Math.floor((time - last + tolerance) / interval));
  return last + periods * interval;
}
/** Shared deadline queue; clean jobs do not request frames, and due jobs rotate fairly. */
export class PlotScheduler implements PlotRenderScheduler {
  readonly owner: Window;
  readonly #jobs = new Set<Job>();
  readonly #budget: number;
  readonly #count: number;
  #timer: number | undefined;
  #frame: number | undefined;
  #disposed = false;
  constructor(options: PlotSchedulerOptions = {}) {
    const owner = options.owner ?? (typeof window !== 'undefined' ? window : undefined);
    if (!owner) throw new Error('PlotScheduler requires an owner Window.');
    this.owner = owner;
    this.#budget = options.budgetMs ?? 2;
    this.#count = options.maxPlotsPerFrame ?? 8;
    if (
      !Number.isFinite(this.#budget) ||
      this.#budget <= 0 ||
      !Number.isSafeInteger(this.#count) ||
      this.#count < 1
    )
      throw new RangeError('Plot scheduler needs a positive budget and job limit.');
    owner.document.addEventListener('visibilitychange', this.#schedule);
  }
  get disposed(): boolean {
    return this.#disposed;
  }
  register(job: PlotRenderJob): PlotRenderHandle {
    if (this.#disposed) throw new Error('Plot scheduler is disposed.');
    if (!Number.isFinite(job.minimumInterval) || job.minimumInterval < 0)
      throw new RangeError('Plot interval must be nonnegative.');
    const state: Job = {
      paint: job.paint,
      interval: job.minimumInterval,
      suspended: false,
      dirty: false,
      last: -Infinity,
      disposed: false,
    };
    this.#jobs.add(state);
    return {
      invalidate: () => {
        if (!state.disposed) {
          state.dirty = true;
          this.#schedule();
        }
      },
      configure: ({ minimumInterval, suspended }) => {
        state.interval = minimumInterval;
        state.suspended = suspended;
        this.#schedule();
      },
      dispose: () => {
        state.disposed = true;
        this.#jobs.delete(state);
        this.#schedule();
      },
    };
  }
  readonly #schedule = (): void => {
    if (this.#timer !== undefined) this.owner.clearTimeout(this.#timer);
    this.#timer = undefined;
    if (this.#disposed || this.owner.document.hidden) {
      if (this.#frame !== undefined) windowFrames(this.owner).cancelAnimationFrame(this.#frame);
      this.#frame = undefined;
      return;
    }
    let due = Infinity;
    for (const j of this.#jobs)
      if (j.dirty && !j.suspended) due = Math.min(due, j.last + j.interval);
    if (!Number.isFinite(due)) {
      if (due === Infinity) {
        if (this.#frame !== undefined) windowFrames(this.owner).cancelAnimationFrame(this.#frame);
        this.#frame = undefined;
        return;
      }
      due = 0;
    }
    if (this.#frame !== undefined) return;
    const delay = due - windowFrames(this.owner).now();
    // Request the next display frame before its deadline. Waiting the entire
    // interval and only then asking for rAF misses that refresh at 60 Hz.
    const frameLead = 1000 / 60;
    if (delay > frameLead + 2)
      this.#timer = this.owner.setTimeout(() => {
        this.#timer = undefined;
        this.#frame = windowFrames(this.owner).requestAnimationFrame(this.#run);
      }, delay - frameLead);
    else this.#frame = windowFrames(this.owner).requestAnimationFrame(this.#run);
  };
  readonly #run = (time: number): void => {
    this.#frame = undefined;
    const begin = windowFrames(this.owner).now();
    let count = 0;
    for (const job of [...this.#jobs]) {
      if (job.disposed || job.suspended || !job.dirty) continue;
      const deadline = plotFrameDeadline(job.last, job.interval, time);
      if (deadline === undefined) continue;
      job.dirty = false;
      job.last = deadline;
      this.#jobs.delete(job);
      this.#jobs.add(job);
      try {
        job.paint(time);
      } catch (error) {
        queueMicrotask(() => {
          throw error;
        });
      }
      if (++count >= this.#count || windowFrames(this.owner).now() - begin >= this.#budget) break;
    }
    this.#schedule();
  };
  dispose(): void {
    if (this.#disposed) return;
    this.#disposed = true;
    if (this.#timer !== undefined) this.owner.clearTimeout(this.#timer);
    if (this.#frame !== undefined) windowFrames(this.owner).cancelAnimationFrame(this.#frame);
    for (const job of this.#jobs) job.disposed = true;
    this.#jobs.clear();
    this.owner.document.removeEventListener('visibilitychange', this.#schedule);
  }
}
const shared = new WeakMap<Window, PlotScheduler>();
export function plotSchedulerFor(owner: Window): PlotScheduler {
  let s = shared.get(owner);
  if (!s || s.disposed) {
    s = new PlotScheduler({ owner });
    shared.set(owner, s);
  }
  return s;
}
export function createPlotScheduler(options: PlotSchedulerOptions = {}): PlotScheduler {
  return new PlotScheduler(options);
}
