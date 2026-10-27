/**
 * Keyboard guards of the Lexical adapter (Widgets `uwg-te-req-engine-11`, `uwg-te-req-key-4`,
 * `uwg-te-req-engine-4`, `uwg-te-req-key-3`).
 *
 * - `reservedKeys`: the chords of the engine's keydown table that it binds to its format, undo and
 *   redo commands on the platform, which the widget consumes as a capture owner; never Mod+A or
 *   Escape.
 * - The Escape neutralizer: a `KEY_ESCAPE_COMMAND` listener at low priority answers `true` for a
 *   range selection, so the rich-text listener below it never blurs the root; it neither prevents
 *   nor stops the key. The table's own Escape on a cell range (a table selection) stays the
 *   engine's, which the widget's router pre-empts.
 * - Defence in depth where the engine binds keys the widget owns, at critical priority: every
 *   `FORMAT_TEXT_COMMAND` (the engine's Mod+B, Mod+I and Mod+U and its `formatBold`-style input
 *   path; the adapter's marks never dispatch it) does nothing, and an `UNDO_COMMAND` or
 *   `REDO_COMMAND` that the engine's keydown table dispatches (Mod+Z, Mod+Shift+Z, Ctrl+Y, each on
 *   the platform the engine binds it) does nothing either. The engine has prevented those keys'
 *   default already, as `reservedKeys` declares. Undo and redo from an action or another source,
 *   such as a `historyUndo` input event, still apply.
 * - Enter with Mod, Ctrl or Alt, with or without Shift, is no editing key: the engine binds Enter
 *   with any modifiers to its Enter command, which would split the block or insert a line break,
 *   so the adapter prevents those chords without any effect, as `reservedKeys` declares.
 * - A tab character arriving as text input (an input method or a text-injecting tool, never the
 *   Tab key) goes through the engine's controlled text insertion: left to the browser, the engine
 *   replaces the text before the caret with the tab.
 * - Mod+A while editable selects the whole document from any position, a table cell or a code
 *   block included; it is never swallowed. The adapter remembers that selection, which the state
 *   reports as text from the first to the last text point while the engine keeps its own, also
 *   where the engine's range is collapsed because the document is one empty textblock. It lasts
 *   while the engine keeps that selection (a press or a key that leaves it where it was keeps it,
 *   as on the other engine); one that `selection.set` places ends it. Undo and redo restore it with
 *   the state they restore: undoing a key that acted over it selects the whole document again, as
 *   on the other engine, whose history restores its own whole-document selection.
 * - A text selection from the first to the last text point of the document is the same
 *   whole-document selection, however it was made: by a press and drag, Shift with the keys or
 *   `selection.set` (the shared `isWholeDocumentSelection`). Text input, a line break, deletion, a
 *   paste or a cut over either first leaves one empty paragraph with a fresh identifier and a
 *   plain caret in it.
 */
import { isModifiedEnter, MODIFIED_ENTER_CHORDS } from '../shared/reserved-keys.js';
import {
  isWholeDocumentSelection,
  mayBeWholeDocument,
  placesClearedSelection,
} from '../shared/selection-state.js';
import { $wholeTextSelection } from './document.js';
import { $repairId } from './ids.js';
import type { LexicalNodeLike, LexicalPointLike } from './modules.js';
import type { LexicalRuntime } from './runtime.js';
import { $applySelection, $readSelection } from './selection.js';

/**
 * The chords the engine still prevents or acts on, which the adapter cannot turn off
 * (`uwg-te-req-engine-11`): `reservedKeys` lists exactly the chords the configured engine binds,
 * or whose native editing command it executes, derived from the engine's source, so that the
 * engine never acts on a chord the widget does not bind. Here: the chords of the engine's keydown
 * table bound to its format, undo and redo commands, each on the platform the engine binds it; the
 * engine binds Ctrl+Y to redo off Apple platforms only (`apple` is the engine's own platform
 * flag); and every Enter chord with a modifier other than Shift alone, which the engine binds to
 * its Enter command and the adapter prevents without effect. Select-all and Escape are never
 * reserved; the widget owns both.
 */
export function lexicalReservedKeys(apple: boolean): readonly string[] {
  return Object.freeze([
    'Mod+b',
    'Mod+i',
    'Mod+u',
    'Mod+z',
    'Mod+Shift+z',
    ...(apple ? [] : ['Ctrl+y']),
    ...MODIFIED_ENTER_CHORDS,
  ]);
}

/** Whether an input event inserts text holding a tab character. */
const insertsTab = (event: InputEvent): boolean =>
  event.inputType === 'insertText' && typeof event.data === 'string' && event.data.includes('\t');

/** The Escape neutralizer: consumes Escape at the command layer for a range selection. */
export function $neutralizeEscape(rt: LexicalRuntime): boolean {
  return rt.lexical.$isRangeSelection(rt.lexical.$getSelection());
}

// Whole-document selection (Mod+A)

/** Whether a point lies at the start (or end) of the document: nothing comes before (after) it. */
function $atDocumentEdge(
  rt: LexicalRuntime,
  point: LexicalPointLike,
  side: 'start' | 'end',
): boolean {
  let node: LexicalNodeLike | null = point.getNode();
  const { lexical } = rt;
  if (point.type === 'text') {
    if (point.offset !== (side === 'start' ? 0 : node.getTextContentSize())) return false;
  } else if (lexical.$isElementNode(node)) {
    if (point.offset !== (side === 'start' ? 0 : node.getChildrenSize())) return false;
  } else return false;
  while (node && !lexical.$isRootNode(node)) {
    if ((side === 'start' ? node.getPreviousSibling() : node.getNextSibling()) !== null)
      return false;
    node = node.getParent();
  }
  return node !== null;
}

/**
 * Whether the selection being read spans the whole document: nothing lies outside it. A collapsed
 * range spans it only in a document of one empty textblock, where the engine's whole-document
 * selection is that block's one point.
 */
export function $spansDocument(rt: LexicalRuntime): boolean {
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection)) return false;
  const backward = selection.isBackward();
  const start = backward ? selection.focus : selection.anchor;
  const end = backward ? selection.anchor : selection.focus;
  return $atDocumentEdge(rt, start, 'start') && $atDocumentEdge(rt, end, 'end');
}

/** Whether the engine holds the whole-document selection of Mod+A. */
export const $holdsSelectAll = (rt: LexicalRuntime): boolean => rt.selectAll && $spansDocument(rt);

/**
 * Whether the selection being read is the whole-document selection (`uwg-te-req-engine-4`): the
 * selection of Mod+A that the engine holds, or a range from the first to the last text point of
 * the document, either way round, however it was made (`isWholeDocumentSelection`). Only a range
 * that can be one (`mayBeWholeDocument`) maps the document's edges.
 */
export function $holdsWholeDocument(rt: LexicalRuntime): boolean {
  if ($holdsSelectAll(rt)) return true;
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || selection.isCollapsed()) return false;
  const read = $readSelection(rt);
  if (!mayBeWholeDocument(read)) return false;
  const whole = $wholeTextSelection(rt);
  return isWholeDocumentSelection(read, whole ? { first: whole.anchor, last: whole.head } : null);
}

/**
 * Replaces the whole document with one empty paragraph and puts the caret in it, when the
 * selection is the whole-document selection (`$holdsWholeDocument`); answers whether it did. The
 * paragraph gets its fresh identifier from the identifier repair right away, so the caret in it is
 * a text point while the update still runs: a paste inserts there in the same update
 * (`uwg-te-req-engine-6`).
 */
export function $clearWholeDocument(rt: LexicalRuntime): boolean {
  if (!$holdsWholeDocument(rt)) return false;
  const { lexical } = rt;
  const root = lexical.$getRoot();
  const paragraph = lexical.$createParagraphNode();
  root.clear();
  root.append(paragraph);
  $repairId(rt, paragraph);
  // Text typed in the fresh paragraph is plain (`uwg-te-req-engine-12`).
  const selection = paragraph.select(0, 0);
  selection.format = 0;
  selection.style = '';
  rt.selectAll = false;
  return true;
}

/** Registers the guards; called with the built editor. */
export function registerGuards(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const { COMMAND_PRIORITY_CRITICAL: CRITICAL, COMMAND_PRIORITY_LOW: LOW } = lexical;
  const clearThen = (handled: boolean) => () => {
    const cleared = $clearWholeDocument(rt);
    return cleared && handled;
  };
  // The keydown being dispatched: the engine's keydown table runs within its dispatch.
  let keydown: KeyboardEvent | null = null;
  const fromKeyboard = () => keydown !== null && rt.acting === null;
  // The committed states that held the whole-document selection; history entries keep them.
  const wholeStates = new WeakSet<object>();
  // Undo and redo restore a state whole, and with it whether it held that selection. A history
  // step from the engine's keydown table does nothing.
  const historyStep = (stack: 'undoStack' | 'redoStack') => () => {
    if (fromKeyboard()) return true;
    const entry = rt.history[stack].at(-1);
    if (entry) rt.selectAll = wholeStates.has(entry.editorState);
    return false;
  };
  return lexical.mergeRegister(
    // It never prevents or stops the key; a table selection keeps the table's Escape.
    editor.registerCommand(lexical.KEY_ESCAPE_COMMAND, () => $neutralizeEscape(rt), LOW),
    editor.registerCommand(
      lexical.KEY_DOWN_COMMAND,
      (event) => {
        rt.lastInput = { kind: 'key', key: event.key, shift: event.shiftKey };
        // A key that edits places a cleared selection's resting caret first, where it then acts.
        const resting = rt.cleared;
        if (resting && placesClearedSelection(event)) {
          rt.cleared = null;
          $applySelection(rt, resting);
        }
        keydown = event;
        queueMicrotask(() => {
          if (keydown === event) keydown = null;
        });
        return false;
      },
      CRITICAL,
    ),
    // While a selection is cleared, the engine's read of a DOM selection that no press and no key
    // that edits made, such as the caret a browser puts at the start of a focused root holding no
    // selection when a key arrives, leaves it cleared, and that caret where it is.
    editor.registerCommand(
      lexical.SELECTION_CHANGE_COMMAND,
      () => {
        if (!rt.cleared) return false;
        lexical.$setSelection(null);
        lexical.$addUpdateTag(lexical.SKIP_DOM_SELECTION_TAG);
        return true;
      },
      CRITICAL,
    ),
    // Enter with a modifier other than Shift alone is prevented without effect.
    editor.registerCommand(
      lexical.KEY_ENTER_COMMAND,
      (event) => {
        if (!isModifiedEnter(event)) return false;
        event.preventDefault();
        return true;
      },
      CRITICAL,
    ),
    // Text input holding a tab character is inserted under the adapter's control.
    editor.registerCommand(
      lexical.BEFORE_INPUT_COMMAND,
      (event) => {
        if (!insertsTab(event) || !lexical.$isRangeSelection(lexical.$getSelection())) return false;
        event.preventDefault();
        editor.dispatchCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, event.data!);
        return true;
      },
      CRITICAL,
    ),
    editor.registerCommand(lexical.UNDO_COMMAND, historyStep('undoStack'), CRITICAL),
    editor.registerCommand(lexical.REDO_COMMAND, historyStep('redoStack'), CRITICAL),
    editor.registerCommand(lexical.FORMAT_TEXT_COMMAND, () => true, CRITICAL),
    editor.registerCommand(
      lexical.SELECT_ALL_COMMAND,
      () => {
        if (!editor.isEditable()) return false;
        lexical.$selectAll(null);
        rt.selectAll = true;
        return true;
      },
      CRITICAL,
    ),
    // Backspace and Delete over the whole document leave one empty paragraph, and Enter acts at
    // its caret, ahead of every key rule for a caret: the engine's range is a caret in a document
    // of one empty textblock.
    editor.registerCommand(
      lexical.KEY_BACKSPACE_COMMAND,
      (event) => {
        if (!editor.isEditable() || !$clearWholeDocument(rt)) return false;
        event.preventDefault();
        return true;
      },
      CRITICAL,
    ),
    editor.registerCommand(
      lexical.KEY_DELETE_COMMAND,
      (event) => {
        if (!editor.isEditable() || !$clearWholeDocument(rt)) return false;
        event.preventDefault();
        return true;
      },
      CRITICAL,
    ),
    editor.registerCommand(
      lexical.KEY_ENTER_COMMAND,
      () => {
        if (editor.isEditable()) $clearWholeDocument(rt);
        return false;
      },
      CRITICAL,
    ),
    // Input over the whole document acts as at the caret in one empty paragraph.
    editor.registerCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, clearThen(false), CRITICAL),
    // A paste over it inserts at the caret of that paragraph.
    editor.registerCommand(lexical.PASTE_COMMAND, clearThen(false), CRITICAL),
    editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, clearThen(false), CRITICAL),
    editor.registerCommand(lexical.INSERT_LINE_BREAK_COMMAND, clearThen(false), CRITICAL),
    editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, clearThen(true), CRITICAL),
    editor.registerCommand(lexical.REMOVE_TEXT_COMMAND, clearThen(true), CRITICAL),
    // The remembered selection lasts while the engine holds it. A history step sets it from the
    // state it restores; the commit of the update in progress that runs before it keeps it.
    editor.registerUpdateListener(({ editorState, tags }) => {
      if (!rt.selectAll) return;
      if (editorState.read(() => $spansDocument(rt))) wholeStates.add(editorState);
      else if (!tags.has(lexical.HISTORIC_TAG)) rt.selectAll = false;
    }),
  );
}
