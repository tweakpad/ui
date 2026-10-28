/**
 * Normalized-state store of the text editor (Widgets `uwg-te-req-perf-1`, `uwg-te-req-prop-2`,
 * `uwg-te-req-engine-4`; Foundation `map-f-store`).
 *
 * The store holds the frozen normalized state that the editor publishes, and publishes it at most
 * once per animation frame however many engine updates occur: each update stages the latest
 * state, which requests one frame, and that frame publishes the state staged last. The published
 * state is the same object until the next publication. A subscriber derives a slice of the state
 * and is called at most once per publication, when that slice changed under shallow equality.
 * The state holds no content, so publishing never serializes the document.
 */
import { deepFreeze } from '../freeze.js';
import type { FrameSource } from '../frame-loop.js';
import { ObservableStore, shallowEqual } from '../store.js';
import { TOGGLE_MARKS } from './actions.js';
import type {
  TextEditorBlockKindKey,
  TextEditorEngineState,
  TextEditorHistoryState,
  TextEditorMarkState,
  TextEditorNoSelection,
  TextEditorToggleMark,
} from './model.js';

// Pre-ready state (`uwg-te-req-prop-2`)

/** The selection while there is none. */
export const NO_SELECTION: TextEditorNoSelection = Object.freeze({ kind: 'none' });

/** The marks without selected text: every toggle mark off and no color. */
export const MARKS_OFF: TextEditorMarkState = Object.freeze({
  ...(Object.fromEntries(TOGGLE_MARKS.map((mark) => [mark, 'off'])) as Record<
    TextEditorToggleMark,
    'off'
  >),
  textColor: null,
  highlight: null,
});

const NO_BLOCK_KINDS: readonly TextEditorBlockKindKey[] = Object.freeze([]);

const NO_HISTORY: TextEditorHistoryState = Object.freeze({ undo: false, redo: false });

export interface PreReadyStateOptions {
  /** The editability that the widget passes to the mount. */
  readonly editable: boolean;
  /** Whether the document is empty: false while content that is not empty is pending. */
  readonly empty: boolean;
  /** Default 0; a controller may keep the numbers of the state that this one replaces. */
  readonly version?: number | undefined;
  /** Default 0. */
  readonly contentVersion?: number | undefined;
}

/**
 * The state while the editor is not ready, with no engine included: the editability that the
 * widget passes to the mount, an empty document unless content that is not empty is pending
 * (pending native JSON counting as not empty), every mark off, and no focus, composition,
 * selection, text color, highlight, alignment, block, link, table, caret, undo or redo. The state
 * is deep-frozen, and its nested parts are the same objects in every pre-ready state.
 */
export function preReadyState(options: PreReadyStateOptions): TextEditorEngineState {
  return deepFreeze({
    version: options.version ?? 0,
    contentVersion: options.contentVersion ?? 0,
    editable: options.editable,
    focused: false,
    composing: false,
    empty: options.empty,
    selection: NO_SELECTION,
    marks: MARKS_OFF,
    block: null,
    blockKinds: NO_BLOCK_KINDS,
    align: null,
    link: null,
    table: null,
    caret: null,
    emptyBlock: null,
    history: NO_HISTORY,
  });
}

// Store (`uwg-te-req-perf-1`, `uwg-te-req-prop-2`)

/**
 * The published normalized state. States staged in one frame publish once, at that frame; while
 * paused, as a disconnected widget is, the store requests no frame. A staged state must be
 * deep-frozen, as an engine adapter's state and the pre-ready state are; the store publishes it as
 * it is.
 */
export class TextEditorStore {
  readonly #frames: FrameSource;
  readonly #store: ObservableStore<TextEditorEngineState>;
  #staged: TextEditorEngineState | null = null;
  #frame: number | undefined;
  #paused = false;
  #disposed = false;

  constructor(frames: FrameSource, initial: TextEditorEngineState) {
    this.#frames = frames;
    this.#store = new ObservableStore(initial);
  }

  /** The latest published state: the same object until the next publication. */
  get state(): TextEditorEngineState {
    return this.#store.value;
  }

  /** The state staged last, or the published state when nothing is staged. */
  get current(): TextEditorEngineState {
    return this.#staged ?? this.#store.value;
  }

  /**
   * Stages the latest state for the next frame, which this requests unless one is pending or the
   * store is paused; a later state staged before that frame replaces this one. Ignored once
   * disposed.
   */
  stage(next: TextEditorEngineState): void {
    if (this.#disposed) return;
    this.#staged = next;
    if (!this.#paused) this.#request();
  }

  /** Pauses publication: cancels the pending frame, and later states stage without one. */
  pause(): void {
    this.#paused = true;
    this.#cancelFrame();
  }

  /** Resumes publication: a state staged before or while paused publishes at the next frame. */
  resume(): void {
    this.#paused = false;
    if (this.#staged) this.#request();
  }

  /**
   * Publishes the staged state now and cancels the frame it requested. A staged state that equals
   * the published one under shallow equality publishes nothing, so the published object stays.
   * Publishing outside the frame can publish more than once per frame, so a caller flushes only
   * where the published state must be current at once.
   */
  flush(): void {
    this.#cancelFrame();
    const staged = this.#staged;
    this.#staged = null;
    if (!staged || this.#disposed || shallowEqual(staged, this.#store.value)) return;
    this.#store.set(staged);
  }

  /**
   * Calls `callback` with the slice that `selector` derives, at most once per publication, when
   * that slice changed under shallow equality since the last call or since subscribing. Returns
   * the function that ends the subscription; after it, `callback` is not called again, also not
   * later in a publication that is running. The first selection runs at once, so its error reaches
   * the caller; an error of a later selection or of `callback` is reported outside the
   * publication, and a selection that failed leaves the slice as it was.
   */
  subscribe<S>(
    selector: (state: TextEditorEngineState) => S,
    callback: (selected: S) => void,
  ): () => void {
    return this.#store.subscribe<S>((selected) => callback(selected), {
      selector,
      equality: shallowEqual,
    });
  }

  /** Cancels the pending frame and drops the staged state; later states are ignored. */
  dispose(): void {
    this.#disposed = true;
    this.#staged = null;
    this.#cancelFrame();
  }

  /** Requests the frame that publishes the staged state, unless one is pending. */
  #request(): void {
    if (this.#frame !== undefined || this.#disposed) return;
    this.#frame = this.#frames.requestAnimationFrame(() => {
      this.#frame = undefined;
      this.flush();
    });
  }

  #cancelFrame(): void {
    if (this.#frame === undefined) return;
    this.#frames.cancelAnimationFrame(this.#frame);
    this.#frame = undefined;
  }
}
