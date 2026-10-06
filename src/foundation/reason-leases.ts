/**
 * Reference-counted reason leases (Foundation `sec-1922-activity-and-idle` `mp-ai-leases`).
 *
 * A lease names the reason that holds a shared condition (controls visible, autoplay paused).
 * Each lease releases idempotently and only itself: releasing one reason never clears another,
 * and two leases for the same reason are counted separately. `onChange` reports each reason that
 * starts or stops being held, plus whether any lease remains, so an owner can restart its timer
 * when the last lease goes away.
 */
export interface ReasonLeaseChange<R extends string = string> {
  /** The reason whose held state changed. */
  readonly reason: R;
  /** Whether the reason is now held by at least one lease. */
  readonly active: boolean;
  /** Whether any reason is still held after this change. */
  readonly held: boolean;
}

export interface ReasonLeasesOptions<R extends string = string> {
  readonly onChange?: (change: ReasonLeaseChange<R>) => void;
}

export class ReasonLeases<R extends string = string> {
  readonly #counts = new Map<R, number>();
  readonly #toggles = new Map<R, () => void>();
  /** Every live lease token; a cleared lease's token is gone, so its release does nothing. */
  readonly #tokens = new Set<object>();
  readonly #onChange: ((change: ReasonLeaseChange<R>) => void) | undefined;

  constructor(options: ReasonLeasesOptions<R> = {}) {
    this.#onChange = options.onChange;
  }

  /** Whether any lease is held. */
  get active(): boolean {
    return this.#counts.size > 0;
  }

  /** Held reasons in first-acquired order. */
  get reasons(): readonly R[] {
    return Object.freeze([...this.#counts.keys()]);
  }

  has(reason: R): boolean {
    return this.#counts.has(reason);
  }

  /** Lease count for one reason, or for every reason when omitted. */
  count(reason?: R): number {
    if (reason !== undefined) return this.#counts.get(reason) ?? 0;
    let total = 0;
    for (const value of this.#counts.values()) total += value;
    return total;
  }

  /** Acquires a lease for `reason` and returns its idempotent release. */
  acquire(reason: R): () => void {
    const token = {};
    this.#tokens.add(token);
    const previous = this.#counts.get(reason) ?? 0;
    this.#counts.set(reason, previous + 1);
    if (!previous) this.#emit(reason, true);
    return () => {
      if (!this.#tokens.delete(token)) return;
      const count = (this.#counts.get(reason) ?? 1) - 1;
      if (count > 0) {
        this.#counts.set(reason, count);
        return;
      }
      this.#counts.delete(reason);
      this.#emit(reason, false);
    };
  }

  /**
   * Holds or releases the single switch-style lease for `reason` (for example, an explicit pause).
   * Switch leases coexist with counted leases of the same reason. Returns whether it changed.
   */
  set(reason: R, active: boolean): boolean {
    const release = this.#toggles.get(reason);
    if (active === Boolean(release)) return false;
    if (active) this.#toggles.set(reason, this.acquire(reason));
    else {
      this.#toggles.delete(reason);
      release!();
    }
    return true;
  }

  /** Releases every lease. Outstanding release callbacks become no-ops. */
  clear(): void {
    const reasons = [...this.#counts.keys()];
    this.#tokens.clear();
    this.#toggles.clear();
    this.#counts.clear();
    for (const reason of reasons) this.#emit(reason, false);
  }

  #emit(reason: R, active: boolean): void {
    this.#onChange?.({ reason, active, held: this.#counts.size > 0 });
  }
}
