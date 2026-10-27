/**
 * Text, inline node and content insertion on Lexical (Widgets `uwg-te-tab-actions` r4, r5,
 * `uwg-te-req-content-6`, `uwg-te-req-engine-4`, `uwg-te-lis-up-i2`).
 *
 * Text outside tables goes through the shared range replacement, and editing input over a range
 * across blocks through the shared range deletion, so every engine removes and joins the same
 * text; in a table cell text goes through the engine's range selection, line feeds becoming line
 * breaks. A custom inline node is inserted with one space after it and the caret after the space.
 * A fragment inserted at a point outside tables merges a text range's first and last paragraphs
 * into the surrounding text, or inserts whole blocks, through the shared fragment insertion;
 * inside a table cell its blocks enter the cell as paragraphs.
 */
import type {
  TextEditorContentInsertAction,
  TextEditorInlineInsertAction,
  TextEditorTextDeleteAction,
  TextEditorTextInsertAction,
} from '../../actions.js';
import { $caretChosen, $caretColors, $colorTypedText, $typeWith } from './caret.js';
import { formatBits, LEXICAL_FORMAT, writeInline } from './mapping.js';
import type { TextEditorBlockTextPoint } from '../shared/blocks.js';
import {
  cellParagraphs,
  replaceBlocksWithFragment,
  insertFragmentAtPoint,
  prepareFragment,
} from '../shared/fragment-insert.js';
import { sameTextPoint } from '../shared/selection-state.js';
import { deleteRange, insertionMarks, replaceRange } from '../shared/text-edits.js';
import { $commitDocument, editContext } from './blocks.js';
import { $portableDocument } from './document.js';
import { $rangeExists, $selectRange } from './marks.js';
import type { LexicalRangeSelectionLike } from './modules.js';
import { $textblockAt, $textPointOf } from './points.js';
import { $clearWholeDocument, $holdsWholeDocument } from './guards.js';
import type { TextEditorSelection, TextEditorTextPoint } from '../../model.js';
import type { LexicalRuntime } from './runtime.js';
import { $caretMarks, $stateSelection } from './state.js';
import { $applySelection, $selectionExists } from './selection.js';
import { $prepareCellRangeInsert } from './tables.js';

type Prepared = (() => boolean) | null;

function $range(rt: LexicalRuntime): LexicalRangeSelectionLike | null {
  const selection = rt.lexical.$getSelection();
  return rt.lexical.$isRangeSelection(selection) ? selection : null;
}

// Text across blocks (`uwg-te-req-engine-12`)

/** The two ends of a text range outside tables, as the shared edits take them. */
interface BlockRange {
  readonly anchor: TextEditorBlockTextPoint;
  readonly head: TextEditorBlockTextPoint;
}

/** The ends of a range selection when both lie outside tables, or `null`. */
function $blockRange(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): BlockRange | null {
  const anchor = $textPointOf(rt, selection.anchor);
  const head = $textPointOf(rt, selection.focus);
  if (!anchor || !head || anchor.cell || head.cell) return null;
  return {
    anchor: { block: anchor.block, offset: anchor.offset },
    head: { block: head.block, offset: head.offset },
  };
}

/**
 * The ends of the selection being read when it is a range across blocks outside tables, which the
 * shared range deletion removes; `null` for a caret, a range in one block or in a table, and the
 * selection of Mod+A (one empty paragraph replaces the document).
 */
export function $rangeAcrossBlocks(rt: LexicalRuntime): BlockRange | null {
  const selection = $range(rt);
  if (!selection || selection.isCollapsed() || $holdsWholeDocument(rt)) return null;
  const range = $blockRange(rt, selection);
  return range && range.anchor.block !== range.head.block ? range : null;
}

/** Removes a range across blocks by the shared rule (`deleteRange`), the caret at the join. */
export function $deleteAcross(rt: LexicalRuntime, range: BlockRange): boolean {
  const edit = deleteRange($portableDocument(rt), range.anchor, range.head, editContext(rt));
  return edit !== null && $commitDocument(rt, edit.document, { kind: 'text', anchor: edit.caret });
}

/**
 * Registers the shared range deletion for the editing input over a range across blocks: the
 * deletion commands remove it; typed text replaces it with the text taking `insertionMarks`; Enter
 * and Shift+Enter over any range outside a code block first remove it (in one block, the engine's
 * removal), then act as at the caret, so the split rules of `uwg-te-req-content-7` apply.
 */
export function registerRangeEdits(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  const { COMMAND_PRIORITY_CRITICAL: CRITICAL, COMMAND_PRIORITY_HIGH: HIGH } = lexical;
  const deletion = () => {
    if (!editor.isEditable()) return false;
    const range = $rangeAcrossBlocks(rt);
    return range !== null && $deleteAcross(rt, range);
  };
  const typing = () => {
    const range = editor.isEditable() ? $rangeAcrossBlocks(rt) : null;
    if (!range) return false;
    const marks = insertionMarks($portableDocument(rt), range.anchor, range.head);
    if (!$deleteAcross(rt, range)) return false;
    const caret = $range(rt);
    if (caret)
      $typeWith(caret, formatBits(marks), {
        color: marks?.textColor,
        highlight: marks?.highlight,
      });
    // The engine inserts the text at the caret.
    return false;
  };
  const enter = () => {
    const selection = $range(rt);
    if (!editor.isEditable() || !selection || selection.isCollapsed() || $holdsWholeDocument(rt))
      return false;
    const range = $blockRange(rt, selection);
    if (!range) return false;
    if (range.anchor.block !== range.head.block) $deleteAcross(rt, range);
    else if (!rt.isCode($textblockAt(rt, selection.anchor)?.block)) selection.removeText();
    // The Enter rules then act at the caret.
    return false;
  };
  return lexical.mergeRegister(
    editor.registerCommand(lexical.DELETE_CHARACTER_COMMAND, deletion, HIGH),
    editor.registerCommand(lexical.DELETE_WORD_COMMAND, deletion, HIGH),
    editor.registerCommand(lexical.DELETE_LINE_COMMAND, deletion, HIGH),
    editor.registerCommand(lexical.REMOVE_TEXT_COMMAND, deletion, HIGH),
    editor.registerCommand(lexical.CONTROLLED_TEXT_INSERTION_COMMAND, typing, HIGH),
    editor.registerCommand(lexical.INSERT_PARAGRAPH_COMMAND, enter, CRITICAL),
    editor.registerCommand(lexical.INSERT_LINE_BREAK_COMMAND, enter, CRITICAL),
  );
}

/**
 * `text.insert`: outside tables the shared range replacement: the range removed by the shared
 * rule, the text inserted with the marks chosen at the caret, else `insertionMarks` (a link only
 * inside it), a line feed a hard break; in a table cell the engine's insertion with the
 * selection's format and colors.
 */
export function $prepareTextInsert(
  rt: LexicalRuntime,
  action: TextEditorTextInsertAction,
): Prepared {
  const range = action.range;
  if (range ? !$rangeExists(rt, range) : !$range(rt)) return null;
  return () => {
    if (range && !$selectRange(rt, range)) return false;
    // Text over the whole-document selection goes into one empty paragraph (`uwg-te-req-engine-4`).
    const whole = !range && $clearWholeDocument(rt);
    const selection = $range(rt);
    if (!selection) return false;
    const ends = whole ? null : $blockRange(rt, selection);
    if (ends) {
      const chosen = selection.isCollapsed() && $caretChosen(rt, selection);
      const edit = replaceRange(
        $portableDocument(rt),
        ends.anchor,
        ends.head,
        action.text,
        editContext(rt),
        chosen ? $caretMarks(rt, selection) : undefined,
      );
      return (
        edit !== null && $commitDocument(rt, edit.document, { kind: 'text', anchor: edit.caret })
      );
    }
    if (action.text === '') {
      selection.removeText();
      return true;
    }
    // Text takes the selection's format and colors; a line feed is a line break.
    action.text.split('\n').forEach((line, index) => {
      const current = $range(rt);
      if (!current) return;
      if (index > 0) current.insertLineBreak();
      const target = $range(rt) ?? current;
      $colorTypedText(rt, target);
      if (line !== '') target.insertText(line);
    });
    return true;
  };
}

export function $prepareTextDelete(
  rt: LexicalRuntime,
  action: TextEditorTextDeleteAction,
): Prepared {
  if (!$rangeExists(rt, action.range)) return null;
  return () => {
    if (!$selectRange(rt, action.range)) return false;
    const selection = $range(rt);
    if (!selection) return false;
    selection.removeText();
    return true;
  };
}

/** Whether whitespace other than a line break starts the text right after the selection's end. */
function $whitespaceFollows(rt: LexicalRuntime, selection: LexicalRangeSelectionLike): boolean {
  const end = selection.isBackward() ? selection.anchor : selection.focus;
  if (end.type !== 'text') return false;
  const node = end.getNode();
  const within = end.offset < node.getTextContentSize();
  const text = within ? node : node.getNextSibling();
  if (!rt.lexical.$isTextNode(text)) return false;
  return /^[^\S\n]/u.test(text.getTextContent().slice(within ? end.offset : 0));
}

export function $prepareInlineInsert(
  rt: LexicalRuntime,
  action: TextEditorInlineInsertAction,
): Prepared {
  const binding = rt.customInlines.get(action.kind);
  if (!binding) return null;
  const range = action.range;
  if (range ? !$rangeExists(rt, range) : !$range(rt)) return null;
  return () => {
    if (range && !$selectRange(rt, range)) return false;
    const selection = $range(rt);
    if (!selection) return false;
    const node = binding.create(action.attrs);
    // Whitespace that already follows is the space (`uwg-te-req-inline-2`); the caret goes after it.
    if ($whitespaceFollows(rt, selection)) {
      selection.insertNodes([node]);
      const next = node.getNextSibling();
      if (rt.lexical.$isTextNode(next)) next.select(1, 1);
      else node.selectEnd();
      return true;
    }
    // The space takes the caret's format and colors, so text typed after it continues them.
    const space = rt.lexical.$createTextNode(' ');
    const colors = selection.isCollapsed() ? $caretColors(rt, selection) : {};
    space.setFormat(selection.format & ~LEXICAL_FORMAT.code);
    if (colors.color && colors.color !== 'none')
      rt.lexical.$setState(space, rt.states.color, colors.color);
    if (colors.highlight && colors.highlight !== 'none' && selection.hasFormat('highlight'))
      rt.lexical.$setState(space, rt.states.highlight, colors.highlight);
    selection.insertNodes([node, space]);
    space.selectEnd();
    return true;
  };
}

/**
 * `content.insert` (`uwg-te-tab-actions` r5): at a text point or over a text range, whose text goes
 * first, over a block selection, which it replaces, or over a cell range
 * (`$prepareCellRangeInsert`). The fragment is prepared by the shared step (URL policy, then
 * conversion of what the mount cannot represent), whose converted diagnostic is reported once the
 * action applied.
 */
export function $prepareContentInsert(
  rt: LexicalRuntime,
  action: TextEditorContentInsertAction,
): Prepared {
  const at = action.at;
  if (at.kind === 'cells') return $prepareCellRangeInsert(rt, { ...action, at }, editContext(rt));
  if (!$selectionExists(rt, at)) return null;
  if (action.content.blocks.length === 0) return null;
  const context = editContext(rt);
  if (at.kind === 'blocks') {
    const result = replaceBlocksWithFragment(
      $portableDocument(rt),
      at.ids,
      action.content,
      context,
    );
    if (!result) return null;
    return () => {
      rt.diagnostics.push(...result.diagnostics);
      return $commitDocument(rt, result.document, result.selection);
    };
  }
  // Content pasted over the whole-document selection, which the state reports as `at`, goes into
  // one empty paragraph (`uwg-te-req-engine-4`).
  const whole = at.kind === 'text' && $holdsWholeDocument(rt) && sameText(at, $stateSelection(rt));
  return () => {
    if (whole ? !$clearWholeDocument(rt) : !$applySelection(rt, at)) return false;
    const selection = $range(rt);
    if (!selection) return false;
    // A range's text goes first, across blocks by the shared rule.
    const across = $rangeAcrossBlocks(rt);
    if (across) $deleteAcross(rt, across);
    else if (!selection.isCollapsed()) selection.removeText();
    const caret = $range(rt);
    if (!caret) return false;
    const point = $textPointOf(rt, caret.anchor);
    if (!point) return false;
    if (point.cell) return $insertIntoCell(rt, caret, action);
    const result = insertFragmentAtPoint(
      $portableDocument(rt),
      { block: point.block, offset: point.offset },
      action.content,
      context,
    );
    if (!result) return false;
    rt.diagnostics.push(...result.diagnostics);
    return $commitDocument(rt, result.document, result.selection);
  };
}

/** Whether a text selection input names the reported text selection. */
function sameText(
  input: { readonly anchor: TextEditorTextPoint; readonly head?: TextEditorTextPoint | undefined },
  reported: TextEditorSelection,
): boolean {
  return (
    reported.kind === 'text' &&
    sameTextPoint(input.anchor, reported.anchor) &&
    sameTextPoint(input.head ?? input.anchor, reported.head)
  );
}

/**
 * Blocks entering a table cell become its paragraphs (`uwg-te-req-tables-1`: cells hold
 * paragraphs only): the first merges into the paragraph at the caret, the others follow it as
 * paragraphs of the cell.
 */
function $insertIntoCell(
  rt: LexicalRuntime,
  caret: LexicalRangeSelectionLike,
  action: TextEditorContentInsertAction,
): boolean {
  const prepared = prepareFragment(action.content, editContext(rt));
  rt.diagnostics.push(...prepared.diagnostics);
  const paragraphs = cellParagraphs(prepared.blocks, editContext(rt));
  const { lexical } = rt;
  const [first, ...rest] = paragraphs;
  if (!first) return false;
  const nodes = writeInline(first.content).map((json) => lexical.$parseSerializedNode(json));
  if (nodes.length > 0) caret.insertNodes(nodes);
  for (const paragraph of rest) {
    // Each further paragraph splits the cell paragraph at the caret and starts the part after it.
    const created = $range(rt)?.insertParagraph();
    if (!created) return false;
    const inline = writeInline(paragraph.content).map((json) => lexical.$parseSerializedNode(json));
    created.splice(0, 0, inline);
    const last = inline[inline.length - 1];
    if (last) last.selectEnd();
    else created.selectStart();
  }
  return true;
}
