/**
 * Actions on Lexical (Widgets `uwg-te-req-engine-5`, `uwg-te-tab-actions`, `uwg-te-tab-engine` r4,
 * `uwg-te-req-evt-3`).
 *
 * The shared action gate (`AD/shared/actions.ts`) decides what `can` and `execute` accept and how
 * a list routes: a sole `content.set` goes to the instance's `setContent`, a sole undo or redo to
 * the engine's history commands, every other list to one discrete update tagged `history-push`
 * and `tp-action` (and `skip-selection-focus` when `focus` is false). In that update each action is
 * prepared against the state the earlier ones left and applied; when one cannot apply, the update
 * throws a private abort, which the engine answers by restoring the committed state, so document,
 * selection and history stay as they were. A list that changes nothing adds no undo step and no
 * content notification: the update's own dirty nodes tell (`$documentChangedByUpdate`), its node
 * changes are discarded and only the selection it left is set. `can` prepares the action on the
 * committed state in a read, which never updates.
 */
import { isMutatingAction, type TextEditorAction, type TextEditorActionOf } from '../../actions.js';
import type { TextEditorCapability } from '../../capabilities.js';
import type {
  TextEditorDiagnostic,
  TextEditorExecuteOptions,
  TextEditorFormat,
  TextEditorSetContentOptions,
} from '../../engine.js';
import type { TextEditorSelectionInput } from '../../model.js';
import {
  actionCan,
  actionChange,
  documentKinds,
  planExecute,
  type TextEditorActionGate,
} from '../shared/actions.js';
import {
  $prepareAlign,
  $prepareDelete,
  $prepareDuplicate,
  $prepareIndent,
  $prepareInsert,
  $prepareMove,
  $prepareOutdent,
  $prepareSetAttrs,
  $prepareSetType,
  selectionInput,
} from './blocks.js';
import { $documentChangedByUpdate, $portableDocument } from './document.js';
import {
  $prepareLinkSet,
  $prepareLinkUnset,
  $prepareMarkClear,
  $prepareMarkColor,
  $prepareMarkToggle,
} from './marks.js';
import type { LexicalRuntime } from './runtime.js';
import { rootFocused } from './state.js';
import {
  $applySelection,
  $readSelection,
  $restingSelection,
  $selectionExists,
} from './selection.js';
import { $prepareTable, isTableAction } from './tables.js';
import {
  $prepareContentInsert,
  $prepareInlineInsert,
  $prepareTextDelete,
  $prepareTextInsert,
} from './text.js';

/** The tag of every update an action runs. */
export const ACTION_TAG = 'tp-action';

/** The tag of the empty update that closes the history after an action. */
export const HISTORY_BOUNDARY_TAG = 'tp-history-boundary';

/** Thrown inside an action update to discard it. */
class ActionAbort extends Error {
  constructor() {
    super('A text editor action could not apply; the update was discarded.');
    this.name = 'ActionAbort';
  }
}

/** Whether an engine error is the adapter's own abort, which is no failure of the engine. */
export const isActionAbort = (error: unknown): boolean => error instanceof ActionAbort;

type Prepared = (() => boolean) | null;

/** The step of an action on the state being read or updated, or `null` when it cannot apply. */
export function $prepareAction(
  rt: LexicalRuntime,
  action: TextEditorAction,
  capabilities: ReadonlySet<TextEditorCapability>,
): Prepared {
  switch (action.type) {
    case 'mark.toggle':
      return $prepareMarkToggle(rt, action);
    case 'mark.color':
      return $prepareMarkColor(rt, action);
    case 'mark.clear':
      return $prepareMarkClear(rt);
    case 'link.set':
      return $prepareLinkSet(rt, action);
    case 'link.unset':
      return $prepareLinkUnset(rt, action);
    case 'block.set-type':
      return $prepareSetType(rt, action);
    case 'block.set-attrs':
      return $prepareSetAttrs(rt, action);
    case 'block.align':
      return $prepareAlign(rt, action);
    case 'block.indent':
      return $prepareIndent(rt, action);
    case 'block.outdent':
      return $prepareOutdent(rt, action);
    case 'blocks.insert':
      return $prepareInsert(rt, action);
    case 'blocks.move':
      return $prepareMove(rt, action);
    case 'blocks.duplicate':
      return $prepareDuplicate(rt, action);
    case 'blocks.delete':
      return $prepareDelete(rt, action);
    case 'text.insert':
      return $prepareTextInsert(rt, action);
    case 'text.delete':
      return $prepareTextDelete(rt, action);
    case 'inline.insert':
      return $prepareInlineInsert(rt, action);
    case 'content.insert':
      return $prepareContentInsert(rt, action);
    case 'selection.set': {
      const { selection } = action;
      // No selection: the engine holds none, the root keeping focus, and remembers where the
      // next key that edits places the caret (`uwg-te-req-surfaces-6`).
      if (selection.kind === 'none')
        return () => {
          rt.selectAll = false;
          rt.cleared = $restingSelection(rt);
          rt.lexical.$setSelection(null);
          return true;
        };
      return $selectionExists(rt, selection)
        ? () => {
            // A placed selection ends the remembered selection of Mod+A, also where it names the
            // engine's own range; a placed text selection from the first to the last text point is
            // the whole-document selection all the same (`$holdsWholeDocument`,
            // `uwg-te-req-engine-4`). A discarded list restores the remembered one.
            rt.selectAll = false;
            const applied = $applySelection(rt, selection);
            if (applied && !rt.engine.isEditable())
              rt.awaitsSelectionEcho = selection.kind === 'blocks' || selection.kind === 'cells';
            return applied;
          }
        : null;
    }
    case 'content.set':
    case 'history.undo':
    case 'history.redo':
      // `content.set` goes through `setContent`; history steps are commands, not update steps.
      return null;
    default:
      return isTableAction(action)
        ? $prepareTable(rt, action, {
            move: capabilities.has('table.move'),
            merge: capabilities.has('table.merge'),
          })
        : null;
  }
}

/** What an instance does for a sole `content.set` action: its own `setContent`. */
export type LexicalSetContent = (
  content: unknown,
  format: TextEditorFormat,
  options: TextEditorSetContentOptions,
) => void;

/** What the actions of an instance read from it and report to it. */
export interface LexicalActionsHost {
  /** The capabilities of the mount: the engine's and those of its custom nodes. */
  readonly capabilities: () => ReadonlySet<TextEditorCapability>;
  /** Whether the instance is editable and not destroyed. */
  readonly editable: () => boolean;
  /** Reports a diagnostic of an applied action. */
  readonly report: (diagnostic: TextEditorDiagnostic) => void;
  /** The instance's `setContent`, for a sole `content.set`. */
  readonly setContent: LexicalSetContent;
  /** Notifies `state` outside an update. */
  readonly notifyState: () => void;
}

/** A selection an update left, to set again after its document changes were discarded. */
interface KeptSelection {
  readonly input: TextEditorSelectionInput | null;
  /** The caret format and style of a range selection. */
  readonly caret: { readonly format: number; readonly style: string } | null;
}

/** The actions surface of an instance: `can` and `execute` over one runtime. */
export class LexicalActions {
  readonly #rt: LexicalRuntime;
  readonly #host: LexicalActionsHost;

  constructor(rt: LexicalRuntime, host: LexicalActionsHost) {
    this.#rt = rt;
    this.#host = host;
  }

  /** What the shared gate reads from the mount now. */
  #gate(): TextEditorActionGate {
    const rt = this.#rt;
    return {
      capabilities: this.#host.capabilities(),
      editable: this.#host.editable(),
      urls: rt.urls,
      kindOf: (id) => rt.readCommitted(() => documentKinds($portableDocument(rt))(id)),
      canUndo: rt.canUndo,
      canRedo: rt.canRedo,
    };
  }

  /** Whether `execute` would apply the action alone: the gate, then a dry run in a read. */
  can(action: TextEditorAction): boolean {
    const rt = this.#rt;
    const available = this.#host.capabilities();
    return actionCan(action, this.#gate(), rt.glue, (allowed) =>
      rt.readCommitted(() => $prepareAction(rt, allowed, available) !== null),
    );
  }

  /** Applies a list as one update, all of it or none; throws what an action threw. */
  execute(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean {
    const rt = this.#rt;
    // Commit what the engine still holds pending, so it is reported as its own change.
    rt.engine.read(() => undefined);
    const plan = planExecute(actions, this.#gate());
    switch (plan.kind) {
      case 'refused':
        return false;
      case 'content':
        this.#host.setContent(plan.action.content, plan.action.format, {
          history: plan.action.history,
          reason: options.reason,
        });
        return true;
      case 'history':
        rt.cleared = null;
        this.#history(plan.action, options);
        return true;
      case 'actions': {
        // Any other list ends a cleared selection; one that does not apply keeps it.
        const cleared = rt.cleared;
        rt.cleared = null;
        let applied = false;
        try {
          applied = this.#apply(plan.actions, options);
        } finally {
          if (!applied) rt.cleared = cleared;
        }
        return applied;
      }
    }
  }

  /**
   * Moves one step through the history. The engine restores a history entry with a selection it
   * writes into the DOM, which focuses an unfocused editable root; with `focus: false` the root is
   * not editable while that commit runs (the adapter owns the attribute), so focus stays where it
   * is.
   */
  #history(
    action: TextEditorActionOf<'history.undo' | 'history.redo'>,
    options: TextEditorExecuteOptions,
  ): void {
    const rt = this.#rt;
    const undo = action.type === 'history.undo';
    const { lexical } = rt;
    const editor = rt.engine;
    const root = editor.getRootElement();
    const hold =
      options.focus === false &&
      root !== null &&
      !rootFocused(root) &&
      root.getAttribute('contenteditable') === 'true';
    rt.acting = actionChange([action], options);
    if (hold) root.setAttribute('contenteditable', 'false');
    try {
      editor.dispatchCommand(undo ? lexical.UNDO_COMMAND : lexical.REDO_COMMAND, undefined);
      editor.read(() => undefined);
    } finally {
      rt.acting = null;
      if (hold) root.setAttribute('contenteditable', 'true');
    }
  }

  /** Applies the actions of a list in one update, all of them or none. */
  #apply(actions: readonly TextEditorAction[], options: TextEditorExecuteOptions): boolean {
    const rt = this.#rt;
    const { lexical } = rt;
    const editor = rt.engine;
    const available = this.#host.capabilities();
    const mutating = actions.some(isMutatingAction);
    // The committed selection is the one the actions act on, never a stale DOM selection the
    // engine would read when the update begins outside an event.
    const committed = rt.readCommitted(() => lexical.$getSelection()?.clone() ?? null);
    const selectAll = rt.selectAll;
    let applied = true;
    let failure: { readonly error: unknown } | null = null;
    let kept: KeptSelection | null = null;
    const tags = [lexical.HISTORY_PUSH_TAG, ACTION_TAG];
    if (options.focus === false) {
      tags.push(lexical.SKIP_SELECTION_FOCUS_TAG);
      // Writing the DOM selection into an unfocused editable root focuses it in Chrome, so the
      // selection then stays in the model until the root has focus again.
      if (!rootFocused(editor.getRootElement())) tags.push(lexical.SKIP_DOM_SELECTION_TAG);
    }
    rt.acting = actionChange(actions, options);
    rt.diagnostics.length = 0;
    try {
      editor.update(
        () => {
          // A discarded attempt reports nothing; the engine may run the function again.
          rt.diagnostics.length = 0;
          rt.selectAll = selectAll;
          kept = null;
          lexical.$setSelection(committed?.clone() ?? null);
          for (const action of actions) {
            let ok: boolean;
            try {
              const step = $prepareAction(rt, action, available);
              ok = step !== null && step();
            } catch (error) {
              failure = { error };
              throw new ActionAbort();
            }
            if (!ok) {
              applied = false;
              throw new ActionAbort();
            }
          }
          if (mutating && !$documentChangedByUpdate(rt)) {
            // Nothing changed in the document (`uwg-te-req-evt-3`): the node changes are
            // discarded and only the selection the actions left is set, with no undo step and no
            // content change.
            kept = $keptSelection(rt);
            throw new ActionAbort();
          }
        },
        { discrete: true, tag: tags },
      );
      const unchanged = kept as KeptSelection | null;
      // A list that did not apply leaves the selection, and so its whole-document flag, as it was.
      if (!applied || failure) rt.selectAll = selectAll;
      if (unchanged) {
        // A list that changed nothing notifies `state` once, as the other engine does: through
        // the selection it set, or else on its own.
        const version = rt.version;
        this.#setKept(unchanged, tags);
        if (rt.version === version) this.#host.notifyState();
      } else if (applied && !failure && mutating) this.#closeHistory();
    } finally {
      rt.acting = null;
    }
    const diagnostics = rt.diagnostics.splice(0);
    if (failure) throw (failure as { readonly error: unknown }).error;
    if (applied) for (const diagnostic of diagnostics) this.#host.report(diagnostic);
    return applied;
  }

  /** Sets the selection a list that changed nothing left, merged into the history. */
  #setKept(kept: KeptSelection, tags: readonly string[]): void {
    const rt = this.#rt;
    const { lexical } = rt;
    rt.engine.update(
      () => {
        if (!kept.input || !$applySelection(rt, kept.input)) {
          lexical.$setSelection(null);
          return;
        }
        const selection = lexical.$getSelection();
        if (kept.caret && lexical.$isRangeSelection(selection)) {
          selection.format = kept.caret.format;
          selection.style = kept.caret.style;
        }
      },
      {
        discrete: true,
        tag: [lexical.HISTORY_MERGE_TAG, ...tags.filter((tag) => tag !== lexical.HISTORY_PUSH_TAG)],
      },
    );
  }

  /**
   * A history boundary after an action: an update that only marks the root dirty, merged into the
   * current history entry, so the engine's history classifies it as no typing and the next typed
   * text never merges into the action's undo step. The adapter does not notify it.
   */
  #closeHistory(): void {
    const rt = this.#rt;
    const { lexical } = rt;
    // It keeps the selection the action left, never a stale DOM selection.
    const kept = rt.readCommitted(() => lexical.$getSelection()?.clone() ?? null);
    rt.engine.update(
      () => {
        lexical.$setSelection(kept?.clone() ?? null);
        lexical.$getRoot().markDirty();
      },
      {
        discrete: true,
        tag: [lexical.HISTORY_MERGE_TAG, HISTORY_BOUNDARY_TAG, lexical.SKIP_DOM_SELECTION_TAG],
      },
    );
  }
}

/** The selection of the update being run, as it is set again after a discarded update. */
function $keptSelection(rt: LexicalRuntime): KeptSelection {
  const selection = rt.lexical.$getSelection();
  return {
    input: selectionInput($readSelection(rt)),
    caret: rt.lexical.$isRangeSelection(selection)
      ? { format: selection.format, style: selection.style }
      : null,
  };
}
