/**
 * Mark and link actions of the Tiptap adapter, and the marks of typed text (Widgets
 * `uwg-te-tab-actions` r1, `uwg-te-req-content-2`, `uwg-te-req-engine-11`, `uwg-te-lis-up-i2`).
 *
 * Marks apply to the runs of the selected text that the shared rules give (`markTargets`): of
 * a text or whole-document selection, of the cells of a cell range grown over merged cells, or of
 * every textblock of a block selection, code-block text skipped; at a caret they change the stored
 * marks that typed text takes. The shared rule of marks in code comes first (`markActionAllowed`):
 * without text outside code blocks no mark action and no link applies, in inline code only
 * toggling code, clearing and links; a link action with an explicit `range` takes that rule from
 * the range alone. A mark that the text cannot take does not count: an action
 * that reaches no such text does not apply. Colors are palette names; a link keeps its `href`,
 * which must pass the link policy, and the link at a caret includes its edges (`linkAtSelection`).
 * A block selection or a cell range has no text to link, and `link.unset` removes the links of
 * every block or cell it holds.
 * Text typed at a caret takes the marks and colors of the text before it, none at a textblock's
 * start or after a hard break or an inline node, and a link only inside it (`caretMarksPlugin`).
 */
import type { TextEditorAction, TextEditorActionOf } from '../../actions.js';
import type { TextEditorTextRange, TextEditorToggleMark } from '../../model.js';
import type { TextEditorPortableMarks } from '../../content/portable.js';
import { findBlock } from '../shared/blocks.js';
import {
  blockMarkRuns,
  cellMarkRuns,
  linkAtSelection,
  markActionAllowed,
  markTargets,
  rangeMarkRuns,
  textRangePoints,
  type TextEditorMarkRun,
  type TextEditorMarkScope,
} from '../shared/selection-state.js';
import type { TiptapActionHandlers } from './actions.js';
import { modelSelection } from './blocks.js';
import { holdsWholeDocument } from './inline.js';
import { inlineAt } from './mapping.js';
import {
  isInstance,
  type TextEditorTiptapModules,
  type TiptapEditorStateLike,
  type TiptapMarkLike,
  type TiptapMarkTypeLike,
  type TiptapNodeLike,
  type TiptapPluginLike,
  type TiptapResolvedPosLike,
  type TiptapSelectionLike,
  type TiptapTransactionLike,
} from './modules.js';
import { NATIVE, NATIVE_MARKS } from './schema.js';
import { isBlockSelection, isCellSelection } from './selection.js';
import { TP_ACTION_META, type TiptapWork } from './work.js';

interface Range {
  readonly from: number;
  readonly to: number;
}

/** The caret position of a collapsed text selection, or `null`. */
export function caretOf(work: TiptapWork): TiptapResolvedPosLike | null {
  const { selection } = work;
  const { TextSelection } = work.env.modules.state;
  return selection.empty && isInstance(selection, TextSelection) ? selection.$head : null;
}

/** A run of selected text in engine positions, as the shared mark runs give it. */
interface TiptapMarkRun extends Range {
  readonly codeBlock: boolean;
  readonly marks: TextEditorPortableMarks | null;
}

/**
 * The runs of the selected text (`uwg-te-tab-actions` r1): of a text selection between its two text
 * points (`rangeMarkRuns`), of the whole document, of a block selection or a node-selected block
 * (`blockMarkRuns`), or of a cell range grown over merged cells (`cellMarkRuns`), each in engine
 * positions; `null` at a caret.
 */
function selectedRuns(work: TiptapWork): readonly TiptapMarkRun[] | null {
  if (caretOf(work)) return null;
  const document = work.portable();
  const selection = modelSelection(work);
  let runs: readonly TextEditorMarkRun[] | null = null;
  if (holdsWholeDocument(work))
    runs = blockMarkRuns(
      document,
      document.blocks.flatMap((block) => (block.id ? [block.id] : [])),
    );
  else if (selection.kind === 'text')
    runs = rangeMarkRuns(document, selection.anchor, selection.head);
  else if (selection.kind === 'blocks') runs = blockMarkRuns(document, selection.ids);
  else if (selection.kind === 'cells') {
    const table = findBlock(document.blocks, selection.table);
    runs = table?.type === 'table' ? cellMarkRuns(selection.table, table, selection.range) : null;
  }
  return (runs ?? []).flatMap((run) => {
    const positions = work.rangePositions(run.range);
    return positions ? [{ ...positions, codeBlock: run.codeBlock, marks: run.marks }] : [];
  });
}

/**
 * The ranges whose text the marks of an action change: the selected runs outside code blocks
 * (`markTargets`), or `null` at a caret.
 */
export function markRanges(work: TiptapWork): readonly Range[] | null {
  const runs = selectedRuns(work);
  return runs ? markTargets(runs).runs : null;
}

/**
 * Whether a set of marks lets a mark type join it: a mark already there that excludes the type,
 * without the type excluding it in turn, keeps it out (inline code keeps out every mark but a link).
 */
function blocks(marks: readonly TiptapMarkLike[], type: TiptapMarkTypeLike): boolean {
  return marks.some(
    (mark) => mark.type !== type && mark.type.excludes(type) && !type.excludes(mark.type),
  );
}

/** Calls `f` for each text node within the ranges that can take a mark type. */
function eachMarkable(
  doc: TiptapNodeLike,
  ranges: readonly Range[],
  type: TiptapMarkTypeLike,
  f: (node: TiptapNodeLike) => void,
): void {
  for (const { from, to } of ranges)
    doc.nodesBetween(from, to, (node, _pos, parent) => {
      if (!node.isText) return true;
      if (parent?.type.allowsMarkType(type) && !blocks(node.marks, type)) f(node);
      return false;
    });
}

/**
 * Whether text typed at a caret position carries no marks over (`uwg-te-req-engine-11`,
 * `uwg-te-lis-up-i2`): at the start of its textblock and right after a hard break or an inline
 * node, even before a marked run, where the engine would take the marks of the node after the
 * position. Elsewhere the engine's own reading holds: the marks and colors of the text before the
 * caret, and a link only inside it, never at either edge.
 */
const startsUnmarked = ($pos: TiptapResolvedPosLike): boolean =>
  $pos.parent.inlineContent && ($pos.parentOffset === 0 || $pos.nodeBefore?.isText === false);

/** The marks that text typed at a caret position takes when no marks are stored there. */
const caretMarksAt = ($pos: TiptapResolvedPosLike): readonly TiptapMarkLike[] =>
  startsUnmarked($pos) ? [] : $pos.marks();

/**
 * The marks that text typed at a caret takes: those set at the caret since it was placed (the
 * stored marks), else those of the caret position (`caretMarksAt`).
 */
export const typedMarks = (
  state: { readonly storedMarks: readonly TiptapMarkLike[] | null },
  $pos: TiptapResolvedPosLike,
): readonly TiptapMarkLike[] => state.storedMarks ?? caretMarksAt($pos);

/** The marks typed text takes at a caret of the work. */
const caretMarks = (work: TiptapWork, $pos: TiptapResolvedPosLike): readonly TiptapMarkLike[] =>
  typedMarks(work.tr, $pos);

/**
 * Whether a caret needs empty stored marks under the caret rule: it lies where typed text starts
 * unmarked (`startsUnmarked`), but the engine would carry marks there, those of the run after it
 * or those it kept on a split or a hard break.
 */
export function needsUnmarkedCaret(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  selection: TiptapSelectionLike,
  storedMarks: readonly TiptapMarkLike[] | null,
): boolean {
  if (!isInstance(selection, modules.state.TextSelection) || !selection.empty) return false;
  const { $head } = selection;
  if (!startsUnmarked($head) || storedMarks?.length === 0) return false;
  return $head.marks().length > 0 || (storedMarks?.length ?? 0) > 0;
}

/**
 * The plugin of the caret rule (`uwg-te-req-engine-11`, `uwg-te-lis-up-i2`). After a change that
 * moves the caret or the text around it, a caret where typed text starts unmarked stores no marks
 * (`needsUnmarkedCaret`), so that the engine's own text input, composition included, types plain
 * text there: before a marked run, and after the engine's splits and hard breaks, which keep the
 * marks of the text before them. Marks that an action set at the caret stay.
 */
export function caretMarksPlugin(
  modules: Pick<TextEditorTiptapModules, 'state'>,
): TiptapPluginLike {
  return new modules.state.Plugin({
    key: new modules.state.PluginKey('tpCaretMarks'),
    appendTransaction(
      transactions: readonly TiptapTransactionLike[],
      _old: TiptapEditorStateLike,
      state: TiptapEditorStateLike,
    ) {
      if (!transactions.some((tr) => tr.docChanged || tr.selectionSet)) return null;
      let stored: TiptapTransactionLike | undefined;
      for (const tr of transactions) if (tr.storedMarksSet) stored = tr;
      if (stored?.getMeta(TP_ACTION_META) !== undefined && stored.storedMarks !== null) return null;
      return needsUnmarkedCaret(modules, state.selection, state.storedMarks)
        ? state.tr.setStoredMarks([])
        : null;
    },
  });
}

/** Adds or removes a mark at a caret, if its textblock takes marks of that type. */
function storeMark(
  work: TiptapWork,
  $pos: TiptapResolvedPosLike,
  mark: TiptapMarkLike | null,
  type: TiptapMarkTypeLike,
): boolean {
  if (!$pos.parent.type.allowsMarkType(type)) return false;
  if (mark) {
    if (blocks(caretMarks(work, $pos), type)) return false;
    work.tr.addStoredMark(mark);
  } else work.tr.removeStoredMark(type);
  return true;
}

/** `mark.toggle`: on over the selection, or off when every character that can take it has it. */
function toggleMark(work: TiptapWork, name: TextEditorToggleMark): boolean {
  const type = work.schema.marks[NATIVE_MARKS[name]];
  if (!type) return false;
  const $caret = caretOf(work);
  if ($caret) {
    const on = type.isInSet(caretMarks(work, $caret)) !== undefined;
    return storeMark(work, $caret, on ? null : type.create(), type);
  }
  const ranges = markRanges(work) ?? [];
  let any = false;
  let all = true;
  eachMarkable(work.doc, ranges, type, (node) => {
    any = true;
    if (!type.isInSet(node.marks)) all = false;
  });
  if (!any) return false;
  for (const { from, to } of ranges)
    if (all) work.tr.removeMark(from, to, type);
    else work.tr.addMark(from, to, type.create());
  return true;
}

/** `mark.color`: a palette name on the text color or the highlight, or neither with `null`. */
function colorMark(
  work: TiptapWork,
  channel: 'text-color' | 'highlight',
  color: string | null,
): boolean {
  const type =
    work.schema.marks[channel === 'text-color' ? NATIVE_MARKS.textColor : NATIVE_MARKS.highlight];
  if (!type) return false;
  const mark = color === null ? null : type.create({ color });
  const $caret = caretOf(work);
  if ($caret) return storeMark(work, $caret, mark, type);
  const ranges = markRanges(work) ?? [];
  let any = false;
  eachMarkable(work.doc, ranges, type, () => (any = true));
  if (!any) return false;
  for (const { from, to } of ranges)
    if (mark) work.tr.addMark(from, to, mark);
    else work.tr.removeMark(from, to, type);
  return true;
}

/** `mark.clear`: every mark but links, over the selection or at the caret. */
function clearMarks(work: TiptapWork): boolean {
  const link = work.schema.marks[NATIVE_MARKS.link];
  const types = Object.values(work.schema.marks).filter((type) => type !== link);
  const $caret = caretOf(work);
  if ($caret) {
    work.tr.setStoredMarks(caretMarks(work, $caret).filter((mark) => mark.type === link));
    return true;
  }
  const ranges = markRanges(work) ?? [];
  let text = false;
  for (const { from, to } of ranges)
    work.doc.nodesBetween(from, to, (node) => {
      if (node.isText) text = true;
      return !text;
    });
  if (!text) return false;
  for (const { from, to } of ranges) for (const type of types) work.tr.removeMark(from, to, type);
  return true;
}

/**
 * The link at the selection, its edges included (`linkAtSelection`): the run of a link that holds
 * a caret or the selected text, in engine positions; `null` without one.
 */
export function linkAt(work: TiptapWork): Range | null {
  const link = linkAtSelection(modelSelection(work), inlineAt(work.doc, work.env.tables));
  return link ? work.rangePositions(link.range) : null;
}

/** Whether some text in a range can take a mark type. */
function markable(work: TiptapWork, range: Range, type: TiptapMarkTypeLike): boolean {
  let any = false;
  eachMarkable(work.doc, [range], type, () => (any = true));
  return any;
}

/**
 * `link.set` (`uwg-te-tab-actions` r1): links `range`, else changes the link at the selection, a caret at its
 * edge included, replacing its text with `text` when given, else links the selected text; at a
 * caret outside a link it inserts `text` as linked text, the caret after it. Over a range the
 * selection stays as it is. A block selection or a cell range has no text to link
 * (`uwg-te-req-surfaces-3`: the link goes on the link at the selection, the selected text or a
 * collapsed selection). An explicit `range` is the whole target, whatever the selection holds: a
 * collapsed one is a point, where `text` goes in with the marks a caret there takes.
 */
function setLink(
  work: TiptapWork,
  action: {
    readonly href: string;
    readonly text?: string | undefined;
    readonly range?: Parameters<TiptapWork['rangePositions']>[0] | undefined;
  },
): boolean {
  const type = work.schema.marks[NATIVE_MARKS.link];
  if (!type) return false;
  const mark = type.create({ href: action.href });
  const { tr, selection } = work;
  const { TextSelection } = work.env.modules.state;
  let range: Range | null = null;
  let link = false;
  if (action.range) range = work.rangePositions(action.range);
  else if (isCellSelection(work.env.tables, selection)) return false;
  else {
    const around = linkAt(work);
    if (around) {
      range = around;
      link = true;
    } else if (!selection.empty && !isBlockSelection(work.env.modules, selection))
      range = { from: selection.from, to: selection.to };
    else if (selection.empty) range = { from: selection.from, to: selection.from };
  }
  if (!range) return false;
  if (range.from === range.to || (link && action.text)) {
    if (!action.text) return false;
    const $pos = tr.doc.resolve(range.from);
    if (!$pos.parent.type.allowsMarkType(type)) return false;
    // An explicit range is a point of its own: the marks stored at the current caret stay there.
    const around =
      range.from !== range.to
        ? textMarks(work, range)
        : action.range
          ? caretMarksAt($pos)
          : typedMarks(tr, $pos);
    const marks = mark.addToSet(around.filter((other) => other.type !== type));
    tr.replaceWith(range.from, range.to, work.schema.text(action.text, marks));
    tr.setSelection(TextSelection.create(tr.doc, range.from + action.text.length));
    return true;
  }
  if (!markable(work, range, type)) return false;
  tr.removeMark(range.from, range.to, type);
  tr.addMark(range.from, range.to, mark);
  return true;
}

/** The marks of the first text of a range, which text replacing the range takes. */
function textMarks(work: TiptapWork, range: Range): readonly TiptapMarkLike[] {
  let marks: readonly TiptapMarkLike[] | null = null;
  work.doc.nodesBetween(range.from, range.to, (node) => {
    if (marks === null && node.isText) marks = node.marks;
    return marks === null;
  });
  return marks ?? [];
}

/**
 * The ranges whose links `link.unset` removes when no range is given and no link is at the
 * selection: the selected runs of every cell of a cell range grown over merged cells, whose own
 * engine positions span its head cell only, else the selected range; none at a caret.
 */
function unlinkRanges(work: TiptapWork): readonly Range[] {
  const { selection } = work;
  if (isCellSelection(work.env.tables, selection)) return selectedRuns(work) ?? [];
  return selection.empty ? [] : [{ from: selection.from, to: selection.to }];
}

/**
 * `link.unset`: removes the link over `range`, else the link at the selection, else the links of
 * the selected text, every cell of a cell range included.
 */
function unsetLink(
  work: TiptapWork,
  action: { readonly range?: Parameters<TiptapWork['rangePositions']>[0] | undefined },
): boolean {
  const type = work.schema.marks[NATIVE_MARKS.link];
  if (!type) return false;
  const around = action.range ? work.rangePositions(action.range) : linkAt(work);
  const ranges = action.range || around ? (around ? [around] : []) : unlinkRanges(work);
  const linked = ranges.filter(({ from, to }) => work.doc.rangeHasMark(from, to, type));
  for (const { from, to } of linked) work.tr.removeMark(from, to, type);
  return linked.length > 0;
}

/** The scope of a caret position: its code block, and whether text typed there takes code. */
function caretScope(
  work: TiptapWork,
  $pos: TiptapResolvedPosLike,
  marks: readonly TiptapMarkLike[],
): TextEditorMarkScope {
  const code = work.schema.marks[NATIVE_MARKS.code];
  return {
    codeBlock: $pos.parent.type.name === NATIVE.code,
    inlineCode: code !== undefined && code.isInSet(marks) !== undefined,
  };
}

/**
 * Where the mark actions act, as the shared rule takes it: at a caret, its code block and whether
 * typed text takes inline code; over a selection, the scope of its runs (`markTargets`): no text
 * outside code blocks, or inline code on every such run.
 */
export function markScope(work: TiptapWork): TextEditorMarkScope {
  const $caret = caretOf(work);
  if ($caret) return caretScope(work, $caret, caretMarks(work, $caret));
  return markTargets(selectedRuns(work) ?? []).scope;
}

/**
 * Where a link action with an explicit range acts (`uwg-te-tab-actions` r1): the range is its
 * whole target, taken literally, and the selection plays no part. A collapsed range is a point,
 * whose scope is that of a caret there; any other range has the scope of its runs
 * (`rangeMarkRuns`, `markTargets`), so that it applies only to text outside code blocks. `null`
 * for a range that names no text.
 */
function rangeScope(work: TiptapWork, range: TextEditorTextRange): TextEditorMarkScope | null {
  const positions = work.rangePositions(range);
  if (!positions) return null;
  if (positions.from === positions.to) {
    const $pos = work.doc.resolve(positions.from);
    return caretScope(work, $pos, caretMarksAt($pos));
  }
  const runs = rangeMarkRuns(work.portable(), ...textRangePoints(range));
  return runs ? markTargets(runs).scope : null;
}

/** The mark actions, as the shared rule of marks in code names them. */
type MarkActionType = 'mark.toggle' | 'mark.color' | 'mark.clear' | 'link.set' | 'link.unset';

/** A mark or link handler behind the shared rule of marks in code. */
function inCodeRule<T extends MarkActionType>(
  type: T,
  handler: (work: TiptapWork, action: TextEditorActionOf<T>) => boolean,
): (work: TiptapWork, action: TextEditorActionOf<T>) => boolean {
  return (work, action) => {
    const generic = action as TextEditorAction;
    const mark = generic.type === 'mark.toggle' ? generic.mark : null;
    const range =
      generic.type === 'link.set' || generic.type === 'link.unset' ? generic.range : undefined;
    const scope = range ? rangeScope(work, range) : markScope(work);
    return scope !== null && markActionAllowed(type, mark, scope) && handler(work, action);
  };
}

export const MARK_HANDLERS: TiptapActionHandlers = {
  'mark.toggle': inCodeRule('mark.toggle', (work, action) => toggleMark(work, action.mark)),
  'mark.color': inCodeRule('mark.color', (work, action) =>
    colorMark(work, action.mark, action.color),
  ),
  'mark.clear': inCodeRule('mark.clear', (work) => clearMarks(work)),
  'link.set': inCodeRule('link.set', setLink),
  'link.unset': inCodeRule('link.unset', unsetLink),
};
