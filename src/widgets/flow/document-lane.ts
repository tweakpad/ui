import type { ReactiveControllerHost } from 'lit';
import { ControllableState } from '../../foundation/controllable-state.js';
import { TpValueCommitEvent, type TpValueChangeEvent } from '../../foundation/events.js';
import type { TpChangeEventOptions } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import type {
  FlowModel,
  FlowApplyOptions,
  FlowApplyResult,
} from '../../foundation/flow/model/model.js';
import type { FlowChangeEvent, FlowMiddleware } from '../../foundation/flow/model/hooks.js';
import type { FlowChange, FlowDocument } from '../../foundation/flow/types.js';
import type { FlowChangeMetadata } from './types.js';

export interface DocumentLaneOptions {
  host: ReactiveControllerHost & EventTarget;
  model: FlowModel;
  readControlledValue: () => FlowDocument | undefined;
  readDefaultValue: () => FlowDocument | undefined;
  hasDefaultValue: () => boolean;
  /** Runs after every committed interaction (form value, announcements). */
  onCommitted?: (value: FlowDocument, previous: FlowDocument, reason: ChangeReason) => void;
  onChange?: (event: TpValueChangeEvent<FlowDocument>) => void;
  diagnostic?: (message: string) => void;
}

export interface ProposeOptions extends FlowApplyOptions {
  sourceEvent?: Event;
  metadata?: Partial<FlowChangeMetadata>;
}

/**
 * The value lane of the flow widget (Widgets 6.3 Events). The engine model is the render source
 * of truth; every model change runs through a `before` hook that publishes the resulting
 * document on the controlled/uncontrolled lane as a cancelable `tp-value-change` proposal. A
 * vetoed proposal vetoes the model change; an accepted proposal lets the model adopt the very
 * document the lane published. A controlled owner that writes a different document back is
 * reconciled into the model without history. `tp-value-commit` is dispatched by the widget
 * when an interaction settles.
 */
export class DocumentLane {
  readonly state: ControllableState<FlowDocument>;
  readonly model: FlowModel;
  readonly #options: DocumentLaneOptions;
  #committed: FlowDocument;
  #pending: ProposeOptions | undefined;
  #proposing = false;
  #reconciling = false;
  #release: (() => void) | undefined;
  #unsubscribe: (() => void) | undefined;
  /**
   * Proposals a controlled owner accepted but has not written back yet (a late owner): the
   * model keeps showing them as a transient overlay until the owner publishes. `depth` is the
   * history depth when the first one was made, for discarding them if it never does.
   */
  #awaiting: { proposals: FlowDocument[]; depth: number } | undefined;
  #deferred:
    | { reason: ChangeReason; sourceEvent?: Event; metadata?: Partial<FlowChangeMetadata> }
    | undefined;
  #graceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(options: DocumentLaneOptions) {
    this.#options = options;
    this.model = options.model;
    this.#committed = options.model.document;
    this.state = new ControllableState<FlowDocument>({
      host: options.host,
      initialValue: options.model.document,
      readControlledValue: options.readControlledValue,
      readDefaultValue: options.readDefaultValue,
      hasDefaultValue: options.hasDefaultValue,
      equals: Object.is,
      ...(options.onChange ? { onChange: options.onChange } : {}),
      onCommit: (value) => this.#laneCommitted(value),
      ...(options.diagnostic ? { diagnostic: options.diagnostic } : {}),
    });
  }

  get value(): FlowDocument {
    return this.state.value;
  }

  get controlled(): boolean {
    return this.state.controlled;
  }

  /** Installs the model hook and adopts the lane's initial document into the model. */
  install(): void {
    const middleware: FlowMiddleware = {
      name: 'tp-flow-lane',
      before: (changes, context) => {
        if (this.#reconciling) return undefined;
        const pending = this.#pending;
        const metadata: FlowChangeMetadata = {
          ...(pending?.metadata ?? {}),
          changes,
          ...(context.transaction !== undefined ? { transaction: context.transaction } : {}),
          ...(context.origin === 'undo' || context.origin === 'redo'
            ? { history: context.origin }
            : {}),
        };
        const eventOptions: TpChangeEventOptions = { metadata };
        const preview = context.preview();
        const ownerBefore = this.#options.readControlledValue();
        this.#proposing = true;
        let accepted: boolean;
        try {
          accepted = this.state.set(preview, context.reason, pending?.sourceEvent, eventOptions);
        } finally {
          this.#proposing = false;
        }
        if (accepted && this.state.controlled) {
          if (this.#options.readControlledValue() === ownerBefore) {
            // Accepted but not written back yet: keep it on screen until the owner publishes.
            this.#awaiting ??= { proposals: [], depth: this.model.history.depth };
            this.#awaiting.proposals.push(preview);
          } else this.#awaiting = undefined;
        }
        return accepted ? undefined : false;
      },
    };
    this.#release = this.model.use(middleware);
    this.#unsubscribe = this.model.subscribe((event) => this.#modelChanged(event));
    this.state.initialize();
    const initial = this.state.value;
    if (initial !== this.model.document) this.#adopt(initial);
    this.#committed = this.model.document;
  }

  dispose(): void {
    if (this.#graceTimer !== undefined) clearTimeout(this.#graceTimer);
    this.#graceTimer = undefined;
    this.#awaiting = undefined;
    this.#deferred = undefined;
    this.#release?.();
    this.#unsubscribe?.();
    this.#release = undefined;
    this.#unsubscribe = undefined;
  }

  /** Re-reads a controlled or default input after the host property changed. */
  sync(): void {
    this.state.sync();
  }

  /** Applies user changes through the model, publishing the proposal on the lane. */
  propose(changes: readonly FlowChange[], options: ProposeOptions = {}): FlowApplyResult {
    const { sourceEvent, metadata, ...apply } = options;
    const previous = this.#pending;
    this.#pending = { ...(sourceEvent ? { sourceEvent } : {}), ...(metadata ? { metadata } : {}) };
    try {
      return this.model.apply(changes, { origin: 'user', ...apply });
    } finally {
      this.#pending = previous;
    }
  }

  /** Runs an engine operation (connect, undo, layout…) with the lane's source event and metadata. */
  withProposal<T>(options: ProposeOptions, operation: () => T): T {
    const previous = this.#pending;
    this.#pending = options;
    try {
      return operation();
    } finally {
      this.#pending = previous;
    }
  }

  /** Dispatches `tp-value-commit` for the settled interaction when the document changed. */
  commit(
    reason: ChangeReason,
    sourceEvent?: Event,
    metadata?: Partial<FlowChangeMetadata>,
  ): boolean {
    if (this.#awaiting) {
      // A late owner commits once it publishes; one that never does is rolled back.
      this.#deferred = {
        reason,
        ...(sourceEvent ? { sourceEvent } : {}),
        ...(metadata ? { metadata } : {}),
      };
      if (this.#graceTimer === undefined)
        this.#graceTimer = setTimeout(() => this.#graceExpired(), LATE_OWNER_GRACE);
      return false;
    }
    return this.#dispatchCommit(reason, sourceEvent, metadata);
  }

  #dispatchCommit(
    reason: ChangeReason,
    sourceEvent?: Event,
    metadata?: Partial<FlowChangeMetadata>,
  ): boolean {
    const value = this.model.document;
    const previous = this.#committed;
    if (value === previous) return false;
    this.#committed = value;
    const options: TpChangeEventOptions = metadata ? { metadata: { ...metadata } } : {};
    this.#options.host.dispatchEvent(
      new TpValueCommitEvent(value, previous, reason, sourceEvent, options),
    );
    this.#options.onCommitted?.(value, previous, reason);
    return true;
  }

  /** The committed document for the next commit's previous value. */
  get committed(): FlowDocument {
    return this.#committed;
  }

  /** Loads a document programmatically (API or attribute), publishing it on the lane. */
  load(
    document: FlowDocument,
    reason: ChangeReason = 'programmatic',
    sourceEvent?: Event,
  ): boolean {
    this.#pending = sourceEvent ? { sourceEvent } : undefined;
    try {
      const accepted = this.state.set(document, reason, sourceEvent, { cancelable: true });
      if (!accepted) return false;
      if (this.model.document !== this.state.value) this.#adopt(this.state.value);
      this.#committed = this.model.document;
      return true;
    } finally {
      this.#pending = undefined;
    }
  }

  #laneCommitted(value: FlowDocument): void {
    // The lane adopted a value: during a proposal the model adopts it itself; otherwise an owner
    // wrote a document back (controlled write, late write) and the model follows.
    if (this.#proposing) return;
    const awaiting = this.#awaiting;
    if (awaiting) {
      const index = awaiting.proposals.indexOf(value);
      if (index >= 0 && index < awaiting.proposals.length - 1) {
        // An earlier proposal published while newer ones are on screen: keep the overlay.
        awaiting.proposals.splice(0, index + 1);
        return;
      }
      this.#awaiting = undefined;
    }
    if (value !== this.model.document) this.#adopt(value);
    if (this.#deferred) {
      const deferred = this.#deferred;
      this.#deferred = undefined;
      if (this.#graceTimer !== undefined) clearTimeout(this.#graceTimer);
      this.#graceTimer = undefined;
      this.#dispatchCommit(deferred.reason, deferred.sourceEvent, deferred.metadata);
      return;
    }
    this.#committed = this.model.document;
  }

  /** The owner never published the settled proposals: roll them back without a commit. */
  #graceExpired(): void {
    this.#graceTimer = undefined;
    const awaiting = this.#awaiting;
    this.#deferred = undefined;
    if (!awaiting) return;
    this.#awaiting = undefined;
    this.#adopt(this.state.value);
    this.model.discardHistory(awaiting.depth);
    this.#committed = this.model.document;
  }

  #modelChanged(event: FlowChangeEvent): void {
    if (this.#reconciling || event.origin === 'measure') return;
    const lane = this.state.value;
    if (lane !== event.document && this.state.controlled && !this.#awaiting) {
      // The owner transformed the proposal: adopt the owner's document.
      this.#adopt(lane);
    }
  }

  #adopt(document: FlowDocument): void {
    if (this.#reconciling) return;
    this.#reconciling = true;
    try {
      this.model.reconcile(document);
    } finally {
      this.#reconciling = false;
    }
  }
}

/**
 * How long a settled interaction waits for a controlled owner that accepted its proposals but
 * has not written them back (a late owner) before treating it as never publishing.
 */
const LATE_OWNER_GRACE = 120;
