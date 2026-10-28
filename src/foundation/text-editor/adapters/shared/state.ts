/**
 * Normalized-state helpers of every engine adapter (Widgets `uwg-te-req-engine-4`,
 * `uwg-te-tab-engine` r3).
 *
 * Pure functions that both adapters feed with engine-neutral inputs read from their engines, so
 * that each rule of the normalized state has one owner: mark and color status, the common
 * alignment, the text before the caret and the block kinds of a selection. The adapters read
 * selection, history, focus and composition from their engines, take the states without a
 * selection or marks from the store (`NO_SELECTION`, `MARKS_OFF`) and deep-freeze the state they
 * build with `deepFreeze`.
 */
import { storedAlign, TOGGLE_MARKS } from '../../actions.js';
import type { TextEditorPortableBlock, TextEditorPortableMarks } from '../../content/portable.js';
import type {
  TextEditorAlign,
  TextEditorBlockKindKey,
  TextEditorBlockState,
  TextEditorMarkState,
  TextEditorMarkStatus,
  TextEditorSelection,
  TextEditorToggleMark,
} from '../../model.js';
import type { TextEditorColor } from '../../palette.js';
import { MARKS_OFF } from '../../state.js';
import { blockKindKey } from '../../tools.js';
import { isTextblock } from './blocks.js';

/** The most UTF-16 code units of the text before the caret that the state reports. */
export const TEXT_BEFORE_LIMIT = 64;

/**
 * The marks of the selection: `runs` holds the marks of each run of selected text, or for a
 * caret one entry, the marks that typed text takes (the stored marks, else those at the caret).
 * A mark is `on` when every run has it, `off` when none does and `mixed` otherwise; a color is
 * the name that every run has, `null` when no run has one and `mixed` otherwise. Without runs,
 * every mark is off and no color is set: the one `MARKS_OFF` state.
 */
export function markState(
  runs: Iterable<TextEditorPortableMarks | null | undefined>,
): TextEditorMarkState {
  const list = Array.from(runs, (marks): TextEditorPortableMarks => marks ?? {});
  if (list.length === 0) return MARKS_OFF;
  const status = (mark: TextEditorToggleMark): TextEditorMarkStatus => {
    const on = list.filter((marks) => marks[mark] === true).length;
    return on === 0 ? 'off' : on === list.length ? 'on' : 'mixed';
  };
  const color = (mark: 'textColor' | 'highlight'): TextEditorColor | 'mixed' | null => {
    const values = new Set(list.map((marks) => marks[mark] ?? null));
    if (values.size > 1) return 'mixed';
    const [only] = values;
    return only ?? null;
  };
  const state: Record<string, TextEditorMarkStatus> = {};
  for (const mark of TOGGLE_MARKS) state[mark] = status(mark);
  return Object.freeze({
    ...(state as Record<TextEditorToggleMark, TextEditorMarkStatus>),
    textColor: color('textColor'),
    highlight: color('highlight'),
  });
}

/**
 * The alignment that every selected textblock shares: the value of each, `null` or `start` for
 * the default. `null` for the default or no textblock, `mixed` when they differ.
 */
export function commonAlign(
  aligns: Iterable<TextEditorAlign | null | undefined>,
): TextEditorAlign | 'mixed' | null {
  let common: TextEditorAlign | null = null;
  let seen = false;
  for (const align of aligns) {
    const value = storedAlign(align) ?? null;
    if (!seen) {
      common = value;
      seen = true;
    } else if (value !== common) return 'mixed';
  }
  return common;
}

/**
 * The alignment a block contributes to `state.align` (`uwg-te-req-engine-4`): a textblock's own
 * alignment, `null` for the default (a custom textblock, which takes none, counts as the default);
 * `undefined` for a code block, an atom and a table, which `state.align` leaves out.
 */
export function alignOf(block: TextEditorPortableBlock): TextEditorAlign | null | undefined {
  if (block.type === 'code' || !isTextblock(block)) return undefined;
  return storedAlign((block as { readonly align?: unknown }).align) ?? null;
}

/**
 * `state.align` (`uwg-te-req-engine-4`): the `commonAlign` of `alignOf` over the blocks the selection
 * spans, `spanned` in document order, blocks that give `undefined` left out; `null` for a cell
 * range and for text whose two ends lie in table cells (cell paragraphs carry no alignment), and
 * without a selection.
 */
export function selectionAlign(
  selection: TextEditorSelection,
  spanned: Iterable<TextEditorPortableBlock>,
): TextEditorAlign | 'mixed' | null {
  if (selection.kind === 'none' || selection.kind === 'cells') return null;
  if (selection.kind === 'text' && selection.anchor.cell && selection.head.cell) return null;
  const aligns: (TextEditorAlign | null)[] = [];
  for (const block of spanned) {
    const align = alignOf(block);
    if (align !== undefined) aligns.push(align);
  }
  return commonAlign(aligns);
}

/** A unit of inline content: text, a hard break or an inline node. */
export type TextEditorInlineUnit =
  | { readonly type: 'text'; readonly text: string }
  | { readonly type: 'hard-break' }
  | { readonly type: 'custom' };

/**
 * The text of the inline content before the caret, `units` in document order: a hard break as a
 * line feed and an inline node as U+FFFC, at most its last `limit` UTF-16 code units (64, as the
 * state reports it; `Infinity` for the input rules).
 */
export function caretTextBefore(
  units: Iterable<TextEditorInlineUnit>,
  limit: number = TEXT_BEFORE_LIMIT,
): string {
  let text = '';
  for (const unit of units)
    text += unit.type === 'text' ? unit.text : unit.type === 'hard-break' ? '\n' : '\uFFFC';
  return text.length > limit ? text.slice(text.length - Math.max(0, limit)) : text;
}

/**
 * The distinct block kinds of the selected blocks, `blocks` in document order, as `blockKinds`
 * reports them: a heading qualified by its level. Frozen.
 */
export function blockKindKeys(
  blocks: Iterable<Pick<TextEditorBlockState, 'kind' | 'attrs'>>,
): readonly TextEditorBlockKindKey[] {
  const keys = new Set<TextEditorBlockKindKey>();
  for (const block of blocks) keys.add(blockKindKey(block) as TextEditorBlockKindKey);
  return Object.freeze([...keys]);
}
