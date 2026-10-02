import { TpOpenChangeEvent } from './events.js';
import type { ChangeReason, ValueChangeDetail } from './types.js';

export interface SurfaceChangeDetail extends ValueChangeDetail<boolean> {
  preventUnmountOnClose(): void;
}

export class TpSurfaceOpenChangeEvent extends TpOpenChangeEvent {
  declare readonly detail: SurfaceChangeDetail;
  #retain = false;
  constructor(
    value: boolean,
    previous: boolean,
    reason: ChangeReason,
    sourceEvent?: Event,
    trigger?: Element,
  ) {
    super(value, previous, reason, sourceEvent);
    if (trigger) this.detail.trigger = trigger;
    this.detail.preventUnmountOnClose = () => {
      if (!value) this.#retain = true;
    };
  }
  get retainOnClose(): boolean {
    return this.#retain && !this.defaultPrevented && !this.detail.cancelled;
  }
}

interface SurfaceStateOptions {
  read: () => boolean | undefined;
  defaultOpen: () => boolean;
  dispatch: (event: TpSurfaceOpenChangeEvent) => void;
  commit: (open: boolean) => void;
  diagnostic: (message: string) => void;
}

/** Proposal acceptance and retention are shared surface behavior, independent of rendering. */
export class SurfaceState {
  #initialized = false;
  #controlled = false;
  #open = false;
  #pending: { open: boolean; retain: boolean; accept?: () => void } | undefined;
  #publishing = false;
  #queue: Array<() => void> = [];
  retained = false;
  constructor(private options: SurfaceStateOptions) {}
  get open(): boolean {
    return this.#open;
  }
  get controlled(): boolean {
    return this.#controlled;
  }
  initialize(): void {
    if (this.#initialized) return;
    this.#initialized = true;
    this.#controlled = this.options.read() !== undefined;
    this.#open = this.options.read() ?? this.options.defaultOpen();
  }
  sync(): void {
    this.initialize();
    const input = this.options.read();
    if ((input !== undefined) !== this.#controlled) {
      this.options.diagnostic(
        'Keep the initial controlled/uncontrolled mode. Use setOpen() for an uncontrolled surface.',
      );
      return;
    }
    if (!this.#controlled || input === this.#open) return;
    const pending = this.#pending?.open === input ? this.#pending : undefined;
    this.#pending = undefined;
    this.retained = !input && (pending?.retain ?? false);
    this.#open = input!;
    pending?.accept?.();
    this.options.commit(this.#open);
  }
  request(
    open: boolean,
    reason: ChangeReason,
    sourceEvent?: Event,
    trigger?: Element,
    accept?: () => void,
    associationChanged = false,
  ): void {
    this.initialize();
    if (this.#publishing) {
      this.#queue.push(() =>
        this.request(open, reason, sourceEvent, trigger, accept, associationChanged),
      );
      return;
    }
    if (open === this.#open && !associationChanged) {
      if (open) accept?.();
      return;
    }
    this.#pending = undefined;
    this.#publishing = true;
    try {
      const event = new TpSurfaceOpenChangeEvent(open, this.#open, reason, sourceEvent, trigger);
      this.options.dispatch(event);
      if (event.defaultPrevented || event.detail.cancelled) return;
      this.#pending = { open, retain: event.retainOnClose, ...(accept ? { accept } : {}) };
      if (this.#controlled && open !== this.#open) this.sync();
      else {
        this.retained = !open && event.retainOnClose;
        this.#open = open;
        this.#pending = undefined;
        accept?.();
        this.options.commit(open);
      }
    } finally {
      this.#publishing = false;
      this.#queue.splice(0).forEach((request) => request());
    }
  }
}
