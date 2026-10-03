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
  hasDefaultOpen?: () => boolean;
  dispatch: (event: TpSurfaceOpenChangeEvent) => void;
  commit: (open: boolean) => void;
  diagnostic: (message: string) => void;
}

/** Proposal acceptance and retention are shared surface behavior, independent of rendering. */
export class SurfaceState {
  #initialized = false;
  #controlled = false;
  #open = false;
  #lastRead: boolean | undefined;
  #pending: { open: boolean; retain: boolean; accept?: () => void } | undefined;
  #publishing = false;
  #committing = false;
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
    this.#lastRead = this.options.read();
    this.#controlled = this.#lastRead !== undefined;
    if (this.#controlled && this.options.hasDefaultOpen?.())
      this.options.diagnostic(
        'Supply either open or defaultOpen, not both. The initial controlled open owner is preserved.',
      );
    this.#open = this.#lastRead ?? this.options.defaultOpen();
  }
  /** Explicit setters may republish a value consumed by a previously vetoed proposal. */
  sync(explicit = false): void {
    this.initialize();
    const input = this.options.read();
    if ((input !== undefined) !== this.#controlled) {
      this.options.diagnostic(
        'Keep the initial controlled/uncontrolled mode. Use setOpen() for an uncontrolled surface.',
      );
      return;
    }
    if (!this.#controlled || (!explicit && input === this.#lastRead)) return;
    this.#lastRead = input;
    if (this.#publishing) {
      if (this.#committing) this.#queue.push(() => this.sync(true));
      return;
    }
    if (input === this.#open) return;
    this.#publishing = true;
    try {
      this.#commit(input!);
    } finally {
      this.#publishing = false;
      this.#drain();
    }
  }
  #commit(input: boolean): void {
    const pending = this.#pending?.open === input ? this.#pending : undefined;
    this.#pending = undefined;
    this.retained = !input && (pending?.retain ?? false);
    this.#open = input;
    this.#committing = true;
    try {
      pending?.accept?.();
      this.options.commit(this.#open);
    } finally {
      this.#committing = false;
    }
  }
  /**
   * Adopt an already accepted parent transaction without proposing a second lane.
   * The coordinating owner must publish its scalar value before calling this;
   * participating component getters derive from that owner, not this passive view.
   */
  acceptCoordinated(event: TpSurfaceOpenChangeEvent, accept?: () => void): boolean {
    this.initialize();
    if (event.defaultPrevented || event.detail.cancelled) return false;
    if (this.#publishing) {
      this.#queue.push(() => this.acceptCoordinated(event, accept));
      return false;
    }
    this.#publishing = true;
    try {
      this.#pending = {
        open: event.detail.value,
        retain: event.retainOnClose,
        ...(accept ? { accept } : {}),
      };
      // Consume the current external input; ordinary render sync must not replay
      // a stale standalone value after a parent-coordinated commit.
      this.#lastRead = this.options.read();
      this.#commit(event.detail.value);
      return true;
    } finally {
      this.#publishing = false;
      this.#drain();
    }
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
    this.sync();
    if (open === this.#open && !associationChanged) {
      if (open) accept?.();
      return;
    }
    this.#pending = undefined;
    this.#publishing = true;
    try {
      const event = new TpSurfaceOpenChangeEvent(open, this.#open, reason, sourceEvent, trigger);
      this.options.dispatch(event);
      // Consume owner writes even when a later listener vetoes. Automatic render sync
      // must not replay them; a later explicit property publication is still allowed.
      const ownerValue = this.options.read();
      if (this.#controlled) this.#lastRead = ownerValue;
      if (event.defaultPrevented || event.detail.cancelled) return;
      this.#pending = { open, retain: event.retainOnClose, ...(accept ? { accept } : {}) };
      if (!this.#controlled) this.#commit(open);
      else if (ownerValue !== undefined && ownerValue !== this.#open) this.#commit(ownerValue);
      else if (open === this.#open) this.#commit(open);
    } finally {
      this.#publishing = false;
      this.#drain();
    }
  }
  #drain(): void {
    while (!this.#publishing && this.#queue.length) this.#queue.shift()!();
  }
}
