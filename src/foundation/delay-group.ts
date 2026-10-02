export interface DelayGroupOptions {
  openDelay?: number;
  closeDelay?: number;
  restTimeout?: number;
}
interface Participant {
  close(): void;
}
/** Logical provider: no wrapper element, global singleton, or rendered UI. */
export class DelayGroup {
  openDelay: number | undefined;
  closeDelay: number | undefined;
  restTimeout: number;
  #current: Participant | undefined;
  #pending: { owner: Participant; cancel: () => void } | undefined;
  #lastClosed = -Infinity;
  constructor(options: DelayGroupOptions = {}) {
    this.openDelay = options.openDelay;
    this.closeDelay = options.closeDelay;
    this.restTimeout = options.restTimeout ?? 400;
  }
  get instant(): boolean {
    return Boolean(this.#current) || Date.now() - this.#lastClosed < this.restTimeout;
  }
  reserve(owner: Participant, cancel: () => void): void {
    if (this.#pending?.owner !== owner) this.#pending?.cancel();
    this.#pending = { owner, cancel };
  }
  activate(owner: Participant): void {
    if (this.#current !== owner) this.#current?.close();
    this.#current = owner;
    if (this.#pending?.owner === owner) this.#pending = undefined;
  }
  release(owner: Participant): void {
    if (this.#pending?.owner === owner) this.#pending = undefined;
    if (this.#current === owner) {
      this.#current = undefined;
      this.#lastClosed = Date.now();
    }
  }
  destroy(): void {
    this.#pending?.cancel();
    this.#current?.close();
    this.#current = undefined;
    this.#pending = undefined;
    this.#lastClosed = -Infinity;
  }
}
