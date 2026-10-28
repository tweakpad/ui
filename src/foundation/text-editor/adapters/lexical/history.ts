/**
 * Undo grouping on Lexical (Widgets `uwg-te-req-engine-5`, `uwg-te-req-key-7`).
 *
 * Typing, deletion, Enter and Shift+Enter (code keys and the split at a block start included)
 * group into one undo step while each follows the last within 500 ms; typing over a selection
 * joins the step it starts. Everything else is a boundary: an action, a content load, an undo or
 * redo, a paste or cut, a selection the user moved, and a change that is an undo step of its own
 * (an applied input rule or autolink, list Tab and Shift+Tab, the list, heading, quote and code
 * conversions of Enter and Backspace, the code exits), so the text typed after it starts a new
 * step. The engine's own grouping (same kind of change within its delay, a new step at every
 * structural key) is replaced: a root transform, which runs last in every update that changes the
 * document, tags each grouped change to merge into the step before it or to start a new one.
 * Compositions stay the engine's. Backspace, Delete and their input events over a block selection
 * delete it as `blocks.delete` does, as an undo step of its own (`uwg-te-req-blocks-4`).
 */
import { $deleteSelectedBlocks } from './blocks.js';
import type { LexicalRuntime } from './runtime.js';

/** The pause, in milliseconds, after which typing starts a new undo step. */
export const LEXICAL_GROUP_DELAY = 500;

/** The tag of a change that is an undo step of its own and ends the typing group. */
export const OWN_STEP_TAG = 'tp-own-step';

/** The tag of a change the grouping placed, merged into the group or starting it. */
const GROUPED_TAG = 'tp-grouped';

/** Tags of updates the engine groups itself: clipboard, collaboration and composition input. */
const ENGINE_TAGS = ['paste', 'cut', 'collaboration', 'composition-start', 'composition-end'];

/** Makes the change of the update being run an undo step of its own that ends the typing group. */
export function $ownStep(rt: LexicalRuntime): void {
  rt.lexical.$addUpdateTag(rt.lexical.HISTORY_PUSH_TAG);
  rt.lexical.$addUpdateTag(OWN_STEP_TAG);
}

/** The root transform: a typing change merges into the open group, else it starts one. */
export function $groupTyping(rt: LexicalRuntime): void {
  const { lexical } = rt;
  if (rt.engine.isComposing()) return;
  // An update that names its history step keeps it: actions, loads, undo and redo, own steps.
  const named = [
    GROUPED_TAG,
    lexical.HISTORIC_TAG,
    lexical.HISTORY_PUSH_TAG,
    lexical.HISTORY_MERGE_TAG,
    ...ENGINE_TAGS,
  ];
  if (named.some((tag) => lexical.$hasUpdateTag(tag))) return;
  const open = rt.typingAt !== null && Date.now() - rt.typingAt <= LEXICAL_GROUP_DELAY;
  lexical.$addUpdateTag(open ? lexical.HISTORY_MERGE_TAG : lexical.HISTORY_PUSH_TAG);
  lexical.$addUpdateTag(GROUPED_TAG);
}

/**
 * Registers the grouping: the root transform, the bookkeeping of committed updates, and the
 * deletion of a block selection by a key as a step of its own, through the shared block deletion
 * and its caret, as `blocks.delete` deletes blocks, never through the engine's own deletion of the
 * selected nodes.
 */
export function registerUndoGrouping(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const CRITICAL = lexical.COMMAND_PRIORITY_CRITICAL;
  const blocksDeletion = () => {
    if (!lexical.$isNodeSelection(lexical.$getSelection())) return false;
    $ownStep(rt);
    return editor.isEditable() && $deleteSelectedBlocks(rt);
  };
  const blocksKey = (event: KeyboardEvent) => {
    if (!blocksDeletion()) return false;
    event.preventDefault();
    return true;
  };
  return lexical.mergeRegister(
    editor.registerNodeTransform(lexical.RootNode, () => $groupTyping(rt)),
    editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, blocksDeletion, CRITICAL),
    editor.registerCommand(lexical.KEY_BACKSPACE_COMMAND, blocksKey, CRITICAL),
    editor.registerCommand(lexical.KEY_DELETE_COMMAND, blocksKey, CRITICAL),
    editor.registerUpdateListener(({ tags, editorState, prevEditorState }) => {
      if (editorState === prevEditorState) return;
      if (tags.has(GROUPED_TAG)) rt.typingAt = Date.now();
      else if (!editor.isComposing() && !tags.has('composition-end')) rt.typingAt = null;
    }),
  );
}
