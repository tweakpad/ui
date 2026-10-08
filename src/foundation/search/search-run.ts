import { Scheduler } from '../services.js';
import { searchResults, type SearchSource } from './source.js';
import type { SearchHit, SearchStatus } from './types.js';

export interface SearchRunOptions<T> {
  /** Results of the latest query, in order. */
  readonly results: (hits: SearchHit<T>[], query: string, total: number) => void;
  /** Every status change. */
  readonly status: (status: SearchStatus, query: string, total: number, error?: unknown) => void;
  readonly scheduler?: Scheduler;
}

/**
 * Runs queries against a search source: waits `delay` milliseconds without a newer query, aborts
 * the previous query's signal when a newer one starts, ignores results that settle for a
 * superseded query, and tracks the status. Synchronous sources settle immediately.
 */
export class SearchRun<T> {
  status: SearchStatus = 'idle';
  query = '';
  total = 0;
  error: unknown = undefined;
  readonly #options: SearchRunOptions<T>;
  readonly #scheduler: Scheduler;
  #generation = 0;
  #controller: AbortController | undefined;
  #cancelTimer: (() => void) | undefined;
  #reported: string | undefined;

  constructor(options: SearchRunOptions<T>) {
    this.#options = options;
    this.#scheduler = options.scheduler ?? new Scheduler();
  }

  request(
    source: SearchSource<T>,
    query: string,
    options: { delay?: number; limit?: number; locale?: string | undefined } = {},
  ): void {
    this.#abort();
    const generation = ++this.#generation;
    this.query = query;
    const run = () => this.#run(source, query, generation, options);
    const delay = Math.max(0, options.delay ?? 0);
    if (delay > 0) {
      this.#set('loading');
      this.#cancelTimer = this.#scheduler.timeout(run, delay);
    } else run();
  }

  /** Stops any pending query and returns to idle. */
  cancel(): void {
    this.#abort();
    this.#generation++;
    if (this.status !== 'idle') this.#set('idle');
  }

  #run(
    source: SearchSource<T>,
    query: string,
    generation: number,
    options: { limit?: number; locale?: string | undefined },
  ): void {
    this.#cancelTimer = undefined;
    const controller = new AbortController();
    this.#controller = controller;
    const settle = (result: Parameters<typeof searchResults<T>>[0]) => {
      if (generation !== this.#generation || controller.signal.aborted) return;
      this.#controller = undefined;
      const { hits, total } = searchResults(result);
      this.total = total;
      this.error = undefined;
      this.#options.results(hits, query, total);
      this.#set('loaded');
    };
    const fail = (error: unknown) => {
      if (generation !== this.#generation || controller.signal.aborted) return;
      this.#controller = undefined;
      this.error = error;
      this.#set('error', error);
    };
    let result: ReturnType<SearchSource<T>['search']>;
    try {
      result = source.search(query, {
        signal: controller.signal,
        limit: options.limit ?? -1,
        locale: options.locale,
      });
    } catch (error) {
      fail(error);
      return;
    }
    if (result && typeof (result as PromiseLike<unknown>).then === 'function') {
      this.#set('loading');
      (result as PromiseLike<Parameters<typeof settle>[0]>).then(settle, fail);
    } else settle(result as Parameters<typeof settle>[0]);
  }

  #abort(): void {
    this.#cancelTimer?.();
    this.#cancelTimer = undefined;
    this.#controller?.abort();
    this.#controller = undefined;
  }

  /** Reports a status change; the same status for a newer query is a change too. */
  #set(status: SearchStatus, error?: unknown): void {
    if (status === this.status && this.query === this.#reported && status !== 'error') return;
    this.status = status;
    this.#reported = this.query;
    this.#options.status(status, this.query, this.total, error);
  }
}
