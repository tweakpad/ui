/**
 * Code block keys on Lexical (Widgets `uwg-te-req-parity-1`, `uwg-te-req-key-3`).
 *
 * The engine's code indentation, which inserts tab characters, is not installed. The outcome of
 * each key comes from the shared code edits (`AD/shared/code-keys.ts`) over the code block's text:
 * Tab and Shift+Tab indent and outdent by two spaces, Enter and Shift+Enter insert a line break
 * with the caret line's leading spaces and tabs, and Enter at the end of a text ending with two
 * line breaks removes them and moves the caret into a new paragraph after the block. ArrowDown at
 * the end of a code block that no block follows appends a paragraph, and ArrowUp at the start of
 * one that no block precedes inserts one, the caret moving into it. Backspace at the start of a
 * paragraph or a custom textblock after a code block, and Delete at the end of a code block before
 * a textblock, join it into the code block by the shared join (`codeJoinEdit`): its inline nodes
 * become the text the text format writes for them, where the engine's own join would drop them.
 */
import {
  codeExitText,
  codeLineBreak,
  indentCode,
  type TextEditorCodeEdit,
} from '../shared/code-keys.js';
import { codeJoinEdit, type TextEditorDeleteKey } from '../shared/text-edits.js';
import { $commitDocument, editContext } from './blocks.js';
import { $portableDocument } from './document.js';
import { $ownStep } from './history.js';
import type { LexicalElementLike, LexicalRangeSelectionLike } from './modules.js';
import {
  $inlineUnits,
  $lexicalPoint,
  $offsetIn,
  $textblockAt,
  $textblockLength,
  $textPointOf,
} from './points.js';
import type { LexicalRuntime } from './runtime.js';
import { $selectPoints } from './selection.js';

/** A selection inside one code block: the block, its text and the selection's offsets in it. */
interface CodeSelection {
  readonly code: LexicalElementLike;
  readonly text: string;
  readonly anchor: number;
  readonly head: number;
  readonly collapsed: boolean;
}

/** The text of a code block: its text nodes, a line break as a line feed. */
export function $codeText(rt: LexicalRuntime, code: LexicalElementLike): string {
  return $inlineUnits(rt, code)
    .map((unit) => (unit.text ? unit.node.getTextContent() : '\n'))
    .join('');
}

/** The selection when both its points lie in one code block, or `null`. */
export function $codeSelection(rt: LexicalRuntime): CodeSelection | null {
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection)) return null;
  const range = selection as LexicalRangeSelectionLike;
  const anchor = $textblockAt(rt, range.anchor);
  const focus = $textblockAt(rt, range.focus);
  if (!anchor || !focus || !anchor.block.is(focus.block) || !rt.isCode(anchor.block)) return null;
  const code = anchor.block;
  const from = $offsetIn(rt, code, range.anchor);
  const to = $offsetIn(rt, code, range.focus);
  if (from === null || to === null) return null;
  return {
    code,
    text: $codeText(rt, code),
    anchor: from,
    head: to,
    collapsed: range.isCollapsed(),
  };
}

/** Writes a code block's text, a line feed as a line break, and selects the edit's offsets. */
function $writeCode(rt: LexicalRuntime, code: LexicalElementLike, edit: TextEditorCodeEdit): void {
  const { lexical } = rt;
  const nodes = edit.text
    .split('\n')
    .flatMap((line, index) => [
      ...(index > 0 ? [lexical.$createLineBreakNode()] : []),
      ...(line === '' ? [] : [lexical.$createTextNode(line)]),
    ]);
  code.clear();
  if (nodes.length > 0) code.append(...nodes);
  const anchor = $lexicalPoint(rt, code, edit.anchor);
  const head = $lexicalPoint(rt, code, edit.head);
  if (anchor && head) $selectPoints(rt, anchor, head);
}

/** Tab or Shift+Tab in a code block; answers whether the key is consumed (always in code). */
export function $codeTab(rt: LexicalRuntime, outdent: boolean): boolean {
  const selection = $codeSelection(rt);
  if (!selection) return false;
  const edit = indentCode(selection.text, selection.anchor, selection.head, outdent);
  if (edit) $writeCode(rt, selection.code, edit);
  return true;
}

/**
 * Enter (`lineBreak` false) or Shift+Enter (`lineBreak` true) in a code block; answers whether
 * the selection was in one.
 */
export function $codeEnter(rt: LexicalRuntime, lineBreak: boolean): boolean {
  const selection = $codeSelection(rt);
  if (!selection) return false;
  const { code, text, anchor, head } = selection;
  const exit = !lineBreak && selection.collapsed ? codeExitText(text, anchor) : null;
  if (exit !== null) {
    // Leaving the block is an undo step of its own.
    $ownStep(rt);
    $writeCode(rt, code, { text: exit, anchor: exit.length, head: exit.length });
    const paragraph = rt.lexical.$createParagraphNode();
    code.insertAfter(paragraph);
    paragraph.select(0, 0);
    return true;
  }
  $writeCode(rt, code, codeLineBreak(text, anchor, head));
  return true;
}

/**
 * ArrowDown at the end of a code block that no block follows, or ArrowUp at the start of one that
 * no block precedes: a paragraph after (before) it takes the caret; answers whether it applied.
 */
export function $codeArrow(rt: LexicalRuntime, direction: 'up' | 'down'): boolean {
  const selection = $codeSelection(rt);
  if (!selection || !selection.collapsed) return false;
  const { code, text, anchor } = selection;
  const paragraph = rt.lexical.$createParagraphNode();
  if (direction === 'down') {
    if (anchor !== text.length || code.getNextSibling() !== null) return false;
    code.insertAfter(paragraph);
  } else {
    if (anchor !== 0 || code.getPreviousSibling() !== null) return false;
    code.insertBefore(paragraph);
  }
  $ownStep(rt);
  paragraph.select(0, 0);
  return true;
}

/**
 * Backspace with a caret at the start of a paragraph or a custom textblock right after a code
 * block, or Delete at the end of a code block right before a textblock: the shared join into a
 * code block (`codeJoinEdit`, `uwg-te-req-content-5`, `uwg-te-req-content-7`), so that each inline
 * node of the joined text becomes its text. Only a caret at that edge beside a code block maps the
 * document. Answers whether it applied; elsewhere the engine's own deletion acts.
 */
export function $codeJoin(rt: LexicalRuntime, key: TextEditorDeleteKey): boolean {
  const selection = rt.lexical.$getSelection();
  if (!rt.lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const found = $textblockAt(rt, selection.anchor);
  if (!found || found.address.cell) return false;
  const backward = key === 'backspace';
  const offset = $offsetIn(rt, found.block, selection.anchor);
  if (offset !== (backward ? 0 : $textblockLength(rt, found.block))) return false;
  const code = backward ? found.block.getPreviousSibling() : found.block;
  if (!rt.isCode(code)) return false;
  const point = $textPointOf(rt, selection.anchor);
  if (!point) return false;
  const edit = codeJoinEdit($portableDocument(rt), key, point, editContext(rt));
  return edit !== null && $commitDocument(rt, edit.document, { kind: 'text', anchor: edit.caret });
}

/** Whether a key carries no modifier but, where allowed, Shift. */
const plain = (event: KeyboardEvent, shift: boolean): boolean =>
  !event.altKey && !event.ctrlKey && !event.metaKey && (shift || !event.shiftKey);

/** Registers the code block keys at high priority, ahead of the engine's own handling. */
export function registerCodeKeys(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const HIGH = lexical.COMMAND_PRIORITY_HIGH;
  const editable = () => editor.isEditable();
  const consume = (event: KeyboardEvent | null, handled: boolean) => {
    if (handled) event?.preventDefault();
    return handled;
  };
  return lexical.mergeRegister(
    editor.registerCommand(
      lexical.KEY_TAB_COMMAND,
      (event) => editable() && plain(event, true) && consume(event, $codeTab(rt, event.shiftKey)),
      HIGH,
    ),
    // Enter and Shift+Enter in code are the adapter's, so the engine's own exit never runs.
    editor.registerCommand(
      lexical.KEY_ENTER_COMMAND,
      (event) =>
        editable() &&
        $codeSelection(rt) !== null &&
        consume(event, $codeEnter(rt, event?.shiftKey === true)),
      HIGH,
    ),
    editor.registerCommand(
      lexical.INSERT_PARAGRAPH_COMMAND,
      () => editable() && $codeEnter(rt, false),
      HIGH,
    ),
    editor.registerCommand(
      lexical.INSERT_LINE_BREAK_COMMAND,
      () => editable() && $codeEnter(rt, true),
      HIGH,
    ),
    editor.registerCommand(
      lexical.KEY_ARROW_DOWN_COMMAND,
      (event) => editable() && plain(event, false) && consume(event, $codeArrow(rt, 'down')),
      HIGH,
    ),
    editor.registerCommand(
      lexical.KEY_ARROW_UP_COMMAND,
      (event) => editable() && plain(event, false) && consume(event, $codeArrow(rt, 'up')),
      HIGH,
    ),
    // A join into a code block, from the key or from the deletion input.
    editor.registerCommand(
      lexical.KEY_BACKSPACE_COMMAND,
      (event) => editable() && consume(event, $codeJoin(rt, 'backspace')),
      HIGH,
    ),
    editor.registerCommand(
      lexical.KEY_DELETE_COMMAND,
      (event) => editable() && consume(event, $codeJoin(rt, 'delete')),
      HIGH,
    ),
    editor.registerCommand(
      lexical.DELETE_CHARACTER_COMMAND,
      (backward) => editable() && $codeJoin(rt, backward ? 'backspace' : 'delete'),
      HIGH,
    ),
  );
}
