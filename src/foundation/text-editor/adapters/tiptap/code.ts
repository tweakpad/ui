/**
 * Code blocks of the Tiptap adapter (Widgets `uwg-te-req-parity-1`, `uwg-te-req-engine-11`).
 *
 * The keys of a code block apply the shared code edits (`AD/shared/code-keys.ts`) to the engine's
 * code block: Tab and Shift+Tab indent and outdent by two spaces at a caret or over the lines a
 * selection touches, never inserting a tab character; Enter and Shift+Enter insert a line break
 * followed by the caret line's leading spaces and tabs; Enter at the end of a text that ends with
 * two line breaks removes them and moves the caret into a new paragraph after the code block.
 * ArrowDown at the end of a last code block and ArrowUp at the start of a first one add a
 * paragraph there and move the caret into it. Leaving a code block is an undo step of its own.
 */
import {
  codeExitText,
  codeLineBreak,
  indentCode,
  type TextEditorCodeEdit,
} from '../shared/code-keys.js';
import { isInstance, type TiptapEditorStateLike, type TiptapNodeLike } from './modules.js';
import { NATIVE } from './schema.js';
import { ownStep, type TiptapDispatchViewLike, type TiptapEnv } from './work.js';

/** A text selection inside one code block: the block, its content start and the offsets. */
interface CodeSelection {
  readonly node: TiptapNodeLike;
  readonly start: number;
  readonly anchor: number;
  readonly head: number;
}

const isTextSelection = (env: TiptapEnv, state: TiptapEditorStateLike): boolean =>
  isInstance(state.selection, env.modules.state.TextSelection);

/** The code block that holds both ends of a text selection, or `null`. */
export function codeSelection(env: TiptapEnv, state: TiptapEditorStateLike): CodeSelection | null {
  if (!isTextSelection(env, state)) return null;
  const { $anchor, $head, anchor, head } = state.selection;
  const node = $head.parent;
  if (node.type.name !== NATIVE.code || $anchor.parent !== node) return null;
  const start = $head.start();
  return { node, start, anchor: anchor - start, head: head - start };
}

/** Replaces a code block's text and selection with an edit's. */
function applyCodeEdit(
  view: TiptapDispatchViewLike,
  code: CodeSelection,
  edit: TextEditorCodeEdit,
  env: TiptapEnv,
): void {
  const { state } = view;
  const tr = state.tr.replaceWith(
    code.start,
    code.start + code.node.content.size,
    edit.text === '' ? [] : [state.schema.text(edit.text)],
  );
  const { TextSelection } = env.modules.state;
  tr.setSelection(TextSelection.create(tr.doc, code.start + edit.anchor, code.start + edit.head));
  view.dispatch(tr);
}

/** Tab (`outdent` false) or Shift+Tab in a code block; consumed with or without effect. */
export function codeTab(env: TiptapEnv, view: TiptapDispatchViewLike, outdent: boolean): boolean {
  const code = codeSelection(env, view.state);
  if (!code) return false;
  const edit = indentCode(code.node.textContent, code.anchor, code.head, outdent);
  if (edit) applyCodeEdit(view, code, edit, env);
  return true;
}

/**
 * Enter (`shift` false) or Shift+Enter in a code block: a line break with the caret line's
 * indentation, or for Enter at the end of a text ending with two line breaks, the exit.
 */
export function codeEnter(env: TiptapEnv, view: TiptapDispatchViewLike, shift: boolean): boolean {
  const code = codeSelection(env, view.state);
  if (!code) return false;
  const text = code.node.textContent;
  const kept = !shift && code.anchor === code.head ? codeExitText(text, code.head) : null;
  if (kept === null) {
    applyCodeEdit(view, code, codeLineBreak(text, code.anchor, code.head), env);
    return true;
  }
  const { state } = view;
  const paragraph = state.schema.nodes[NATIVE.paragraph];
  if (!paragraph) return false;
  const tr = state.tr.replaceWith(
    code.start,
    code.start + code.node.content.size,
    kept === '' ? [] : [state.schema.text(kept)],
  );
  // The position after the code block, which now holds the kept text.
  const after = code.start + kept.length + 1;
  // Identified here, so that no repair follows the exit, which stays one undo step.
  tr.insert(after, paragraph.create({ id: env.createId() }));
  tr.setSelection(env.modules.state.TextSelection.create(tr.doc, after + 1));
  view.dispatch(ownStep(env, tr));
  return true;
}

/**
 * ArrowDown at the end of a code block that no block follows, or ArrowUp at the start of one that
 * no block precedes: a new paragraph there, holding the caret.
 */
export function codeArrow(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  direction: 'up' | 'down',
): boolean {
  const { state } = view;
  const { selection, doc } = state;
  if (!selection.empty || !isTextSelection(env, state)) return false;
  const { $head } = selection;
  if ($head.parent.type.name !== NATIVE.code || $head.depth !== 1) return false;
  const paragraph = state.schema.nodes[NATIVE.paragraph];
  if (!paragraph) return false;
  const index = $head.index(0);
  let pos: number;
  if (direction === 'down') {
    if ($head.parentOffset !== $head.parent.content.size || index !== doc.childCount - 1)
      return false;
    pos = $head.after(1);
  } else {
    if ($head.parentOffset !== 0 || index !== 0) return false;
    pos = 0;
  }
  const tr = state.tr.insert(pos, paragraph.create({ id: env.createId() }));
  tr.setSelection(env.modules.state.TextSelection.create(tr.doc, pos + 1));
  view.dispatch(ownStep(env, tr));
  return true;
}
