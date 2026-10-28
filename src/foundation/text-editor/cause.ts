/**
 * Cause tracker of the text editor (Widgets `uwg-te-req-engine-6`, `uwg-te-tab-reasons` r1, r2;
 * Foundation `map-reasons-3`).
 *
 * One engine-neutral tracker attributes each document change that an engine reports to the input
 * that preceded it. It observes the editing root in the capture phase and never cancels or stops
 * an event. Typing, Enter, deletion, composition and the deletion of a cut report reason `input`;
 * engine history that a command of the host environment triggered reports `engine`, as does a
 * change that no input explains; a change that a request applies reports the request's reason.
 * Paste and drops never reach the engine as its own input, because the widget turns them into
 * requests, so the tracker records neither.
 */
import { CleanupScope } from '../services.js';
import type { ChangeReason } from '../types.js';
import type { TextEditorActionType } from './actions.js';
import type { TextEditorChangeCause, TextEditorContentChange } from './engine.js';

/** A change that no input explains: cause and reason `engine`, with no source event. */
const UNEXPLAINED: TextEditorContentChange = Object.freeze({
  cause: 'engine',
  reason: 'engine',
  sourceEvent: undefined,
});

/** The tracker only observes: capture phase, and no listener that could cancel. */
const OBSERVE = { capture: true, passive: true } as const;

/** Input types of a composition (Input Events): inside one, they belong to it. */
const COMPOSITION_INPUTS: ReadonlySet<string> = new Set([
  'insertCompositionText',
  'deleteCompositionText',
  'insertFromComposition',
  'deleteByComposition',
]);

/** Paste and drops, which the widget turns into requests: never the engine's own input. */
const REQUEST_INPUTS: ReadonlySet<string> = new Set([
  'insertFromPaste',
  'insertFromPasteAsQuotation',
  'insertFromDrop',
  'deleteByDrag',
]);

/** The cause of a `beforeinput` by its input type; every other insertion or deletion is typing. */
function inputCause(inputType: string): TextEditorChangeCause {
  if (inputType === 'historyUndo' || inputType === 'historyRedo') return 'history';
  if (inputType === 'deleteByCut') return 'cut';
  if (COMPOSITION_INPUTS.has(inputType)) return 'composition';
  return 'input';
}

/** The reason of an engine-originated cause: engine history reports `engine`, every other `input`. */
const reasonOf = (cause: TextEditorChangeCause): ChangeReason =>
  cause === 'history' ? 'engine' : 'input';

/** An input's attribution, with the input that caused it. */
function intent(cause: TextEditorChangeCause, sourceEvent: Event): TextEditorContentChange {
  return Object.freeze({ cause, reason: reasonOf(cause), sourceEvent });
}

/** The causes of a change that an engine originated, which no adapter call made. */
export type TextEditorEngineCause = Extract<
  TextEditorChangeCause,
  'input' | 'history' | 'cut' | 'composition'
>;

const engineCause = (cause: TextEditorEngineCause): TextEditorContentChange =>
  Object.freeze({ cause, reason: reasonOf(cause) });

/**
 * The change an adapter reports for each engine-originated cause, without a source event: typing,
 * engine history (reason `engine`), the deletion of a cut and a composition (reason `input`).
 */
export const ENGINE_CHANGES: Readonly<Record<TextEditorEngineCause, TextEditorContentChange>> =
  Object.freeze({
    input: engineCause('input'),
    history: engineCause('history'),
    cut: engineCause('cut'),
    composition: engineCause('composition'),
  });

/** What an adapter reads from its engine about an update that no adapter call made. */
export interface TextEditorEngineSignals {
  /** The update is an undo or redo of the engine's history. */
  readonly history: boolean;
  /** The update deletes what a cut took. */
  readonly cut: boolean;
  /** The update belongs to a composition. */
  readonly composition: boolean;
}

/**
 * The change of an update that no adapter call made (`ENGINE_CHANGES`): history first, then a
 * cut, then a composition, else typing.
 */
export function engineChange(signals: TextEditorEngineSignals): TextEditorContentChange {
  if (signals.history) return ENGINE_CHANGES.history;
  if (signals.cut) return ENGINE_CHANGES.cut;
  if (signals.composition) return ENGINE_CHANGES.composition;
  return ENGINE_CHANGES.input;
}

/**
 * Attributes the document changes of one editing root. The latest input that no update consumed
 * yet is the intent; each update consumes it, and a newer input replaces it. While a composition
 * is in progress, every update belongs to it and consumes nothing: its change is reported once,
 * at its end, which the next update consumes. A request's expectation takes precedence over the
 * intent while its actions apply and leaves the intent in place.
 */
export class InputCauseTracker {
  #scope: CleanupScope | null = null;
  #intent: TextEditorContentChange | null = null;
  /** The composition in progress, attributed to its `compositionstart`. */
  #composition: TextEditorContentChange | null = null;
  #expected: TextEditorContentChange | null = null;

  /**
   * Whether a composition is in progress on the editing root. Its updates carry its attribution
   * without consuming it; the change they make is reported once, after the composition ends.
   */
  get composing(): boolean {
    return this.#composition !== null;
  }

  /**
   * Observes `target`, the editing root, in the capture phase: `beforeinput`, `cut`,
   * `compositionstart` and `compositionend`. Observing a new root ends the observation of the
   * previous one. Returns the function that ends this observation; ending it forgets the intent
   * and the composition of that root.
   */
  attach(target: EventTarget): () => void {
    this.#detach();
    const scope = new CleanupScope();
    scope.listen(target, 'beforeinput', this.#beforeInput, OBSERVE);
    scope.listen(target, 'cut', this.#cut, OBSERVE);
    scope.listen(target, 'compositionstart', this.#compositionStart, OBSERVE);
    scope.listen(target, 'compositionend', this.#compositionEnd, OBSERVE);
    this.#scope = scope;
    return () => {
      if (this.#scope === scope) this.#detach();
    };
  }

  /**
   * Expects the update of a request whose actions are about to apply: it reports the request's
   * reason and source event, with cause `content` for `content.set` and `action` otherwise, and
   * `action` the type given. Returns the function that withdraws the expectation when no update
   * consumed it, for the caller to run once the actions applied.
   */
  expectAction(
    reason: ChangeReason,
    sourceEvent: Event | undefined,
    action?: TextEditorActionType,
  ): () => void {
    const expected: TextEditorContentChange = Object.freeze({
      cause: action === 'content.set' ? 'content' : 'action',
      reason,
      sourceEvent,
      ...(action ? { action } : {}),
    });
    this.#expected = expected;
    return () => {
      if (this.#expected === expected) this.#expected = null;
    };
  }

  /**
   * Attributes one document change that the engine reports, and consumes what explained it: the
   * request's expectation, then the intent. Inside a composition the change belongs to the
   * composition, which stays; with nothing to explain it, the change reports `engine`. Call it once
   * for each content notification, never for an update that notifies `state` only, so that an
   * input whose change the engine applies later keeps its intent until then.
   */
  consume(): TextEditorContentChange {
    const expected = this.#expected;
    if (expected) {
      this.#expected = null;
      return expected;
    }
    if (this.#composition) return this.#composition;
    const consumed = this.#intent ?? UNEXPLAINED;
    this.#intent = null;
    return consumed;
  }

  #detach(): void {
    this.#scope?.dispose();
    this.#scope = null;
    this.#intent = null;
    this.#composition = null;
  }

  readonly #beforeInput = (event: InputEvent): void => {
    const type = event.inputType;
    if (this.#composition) {
      // An input inside a composition belongs to it, unless the input reports that none is
      // active, as after a composition end that this root never received.
      if (event.isComposing !== false || COMPOSITION_INPUTS.has(type)) return;
      this.#composition = null;
    }
    if (REQUEST_INPUTS.has(type)) return;
    this.#intent = intent(inputCause(type), event);
  };

  readonly #cut = (event: ClipboardEvent): void => {
    // A cut cannot happen inside a composition, so it also ends one this root never saw end.
    this.#composition = null;
    this.#intent = intent('cut', event);
  };

  readonly #compositionStart = (event: CompositionEvent): void => {
    this.#composition = intent('composition', event);
    this.#intent = null;
  };

  readonly #compositionEnd = (event: CompositionEvent): void => {
    this.#composition = null;
    this.#intent = intent('composition', event);
  };
}
