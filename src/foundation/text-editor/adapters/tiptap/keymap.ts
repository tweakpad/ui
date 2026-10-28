/**
 * Keys of the Tiptap adapter (Widgets `uwg-te-req-engine-11`, `uwg-te-req-key-4`,
 * `uwg-te-req-parity-1`, `uwg-te-req-key-7`, `uwg-te-req-content-7`, `uwg-te-req-tables-5`).
 *
 * Two extensions replace the engine's own key handling, whose keymap the editor leaves out:
 *
 * - The Escape neutralizer, the first of the adapter's plugins: for Escape outside a composition
 *   it claims the key event, so the engine's view neither prevents the default action nor blurs.
 *   It never prevents or stops the event, which reaches the widget and an enclosing dialog.
 * - The editing keymap: Enter, Shift+Enter, Backspace, Delete, Mod+A, Tab, Shift+Tab, the arrow
 *   keys, which over a block selection with no block beyond it in their direction are consumed
 *   without effect, ArrowUp and ArrowDown from a cell's first or last line into the cell above or
 *   below, which follow the shared rule and leave the selection where it is when they would leave a
 *   table that no block lies beyond, Shift with an arrow key in a table, which selects the cell
 *   range of the shared rule, and the platform's text editing keys, as the engine binds them,
 *   normalized where
 *   engines differ by the rules every engine shares: code blocks and list items take their keys
 *   first (`code.ts`, `lists.ts`); Backspace at a caret at the start of a heading, quote or code
 *   block turns it into a paragraph before it joins anything; Backspace and Delete at a list
 *   boundary follow the shared list rule (`listBoundaryEdit`), over a range across blocks the
 *   shared range deletion (`deleteRange`), and over a cell range they clear its cells, the range
 *   grown over merged cells and kept, never the table; a block selection or a node-selected block
 *   is deleted as the shared block deletion does; beside a table or an atom block they block-select
 *   it first, the textblock kept, an empty one included; a join with an empty textblock, and a join
 *   into a code block, follow the shared join (`joinBlocks`, `codeJoinEdit`); over the
 *   whole-document selection they leave one empty paragraph; at the edge of a cell or of the
 *   document they are consumed without effect; the chains end in a node selection only of a block,
 *   which the state reports as a block selection. Enter and Shift+Enter over a range delete it
 *   first, over the whole-document selection act in one empty paragraph, and
 *   link a URL that ends the text before the caret; Enter at the start of a heading or quote
 *   inserts a paragraph with its alignment before it. No mark, heading, list, alignment or history
 *   chord is bound, and the Backspace chain never undoes an input rule.
 */
import type { TextEditorPortableTable } from '../../content/portable.js';
import type { TextEditorTextPoint } from '../../model.js';
import { blockInline, inlineLength, locatedBlocks } from '../shared/blocks.js';
import { isRightToLeft } from '../shared/dom-geometry.js';
import { cellCaretKey, cellCaretStays, cellRangeKey } from '../shared/selection-state.js';
import {
  blockBesideKey,
  codeJoinEdit,
  joinBlocks,
  listBoundaryEdit,
  type TextEditorDeleteKey,
} from '../shared/text-edits.js';
import { applyDocument, editContext, restoreSelection } from './blocks.js';
import { TiptapGeometry } from './geometry.js';
import { listEnter, headItem, keyAction, keyEdit, listTab } from './lists.js';
import { codeArrow, codeEnter, codeSelection, codeTab } from './code.js';
import { clearDocument, crossBlockRange, deleteCrossBlockRange } from './inline.js';
import { applyAutolink, autolinkAtCaret, inputRulesExtension } from './input-rules.js';
import { holderBlock, holderIndex, isCellNode, posToPoint } from './mapping.js';
import {
  isInstance,
  type TextEditorTiptapModules,
  type TiptapCommandEditorLike,
  type TiptapCommandsLike,
  type TiptapEditorStateLike,
  type TiptapExtensionLike,
  type TiptapNodeLike,
  type TiptapPluginLike,
  type TiptapViewLike,
} from './modules.js';
import { NATIVE } from './schema.js';
import {
  isCellSelection,
  readSelection,
  selectedBlockIds,
  setSelection,
  wholeDocumentSelection,
} from './selection.js';
import { portableOf, type TiptapDispatchViewLike, type TiptapEnv } from './work.js';

/** The priority of the Escape neutralizer: its plugin runs before every other of the editor. */
export const ESCAPE_PRIORITY = 100_000;
/** The priority of the editing keymap: before the keymaps of every node and mark. */
export const KEYMAP_PRIORITY = 10_000;

/** The view that the neutralizer's handler receives. */
interface ComposingViewLike {
  readonly composing: boolean;
}

/** Whether the neutralizer claims a key event: Escape outside a composition. */
export function neutralizesEscape(view: ComposingViewLike, event: KeyboardEvent): boolean {
  return event.key === 'Escape' && !event.isComposing && !view.composing;
}

/** The Escape neutralizer plugin: claims Escape without preventing or stopping it. */
export function escapePlugin(modules: Pick<TextEditorTiptapModules, 'state'>): TiptapPluginLike {
  return new modules.state.Plugin({
    key: new modules.state.PluginKey('tpEscape'),
    props: { handleDOMEvents: { keydown: neutralizesEscape } },
  });
}

/** The extension of the Escape neutralizer. */
export function escapeExtension(
  modules: Pick<TextEditorTiptapModules, 'core' | 'state'>,
): TiptapExtensionLike {
  return modules.core.Extension.create({
    name: 'tpEscape',
    priority: ESCAPE_PRIORITY,
    addProseMirrorPlugins: () => [escapePlugin(modules)],
  });
}

// Editing keys

const COLLAPSING: ReadonlySet<string> = new Set([NATIVE.heading, NATIVE.quote, NATIVE.code]);

/**
 * Backspace at a caret at the start of a heading, quote or code block: the block becomes a
 * paragraph with its identifier, alignment and text, a code block's line breaks becoming hard
 * breaks (`uwg-te-req-parity-1`).
 */
export function collapseAtStart(env: TiptapEnv, view: TiptapDispatchViewLike): boolean {
  const { selection } = view.state;
  if (!selection.empty) return false;
  const { $head } = selection;
  if ($head.parentOffset !== 0 || !COLLAPSING.has($head.parent.type.name)) return false;
  const id = $head.parent.attrs.id;
  if (typeof id !== 'string') return false;
  return keyAction(env, view, { type: 'block.set-type', kind: 'paragraph', ids: [id] });
}

/**
 * Deletes the blocks of a block selection, a node-selected atom or table included
 * (`uwg-te-req-blocks-4`), as the
 * shared block deletion does.
 */
function deleteSelectedBlocks(env: TiptapEnv, view: TiptapDispatchViewLike): boolean {
  const { selection, doc } = view.state;
  const ids = selectedBlockIds(env.modules, doc, selection);
  if (!ids || ids.length === 0) return false;
  return keyAction(env, view, { type: 'blocks.delete', ids });
}

/**
 * The node that the engine's select-node step would select beside a caret at the edge of its
 * textblock, and the position before it, found as the engine finds it: the sibling before
 * (`backward`) or after the nearest ancestor that has one, never across an isolating node; `null`
 * when the caret is not at that edge or nothing selectable lies there.
 */
export function nodeBeside(
  state: TiptapEditorStateLike,
  direction: 'backward' | 'forward',
): { readonly node: TiptapNodeLike; readonly pos: number } | null {
  const { selection, doc } = state;
  if (!selection.empty) return null;
  const { $head } = selection;
  const textblock = $head.parent;
  if (!textblock.isTextblock || isolating(textblock)) return null;
  const backward = direction === 'backward';
  if ($head.parentOffset !== (backward ? 0 : textblock.content.size)) return null;
  for (let depth = $head.depth - 1; depth >= 0; depth -= 1) {
    const index = $head.index(depth);
    const parent = $head.node(depth);
    if (backward ? index > 0 : index + 1 < parent.childCount) {
      const cut = doc.resolve(backward ? $head.before(depth + 1) : $head.after(depth + 1));
      const node = backward ? cut.nodeBefore : cut.nodeAfter;
      if (!node || node.isText || (node.type.spec as { selectable?: boolean }).selectable === false)
        return null;
      return { node, pos: backward ? cut.pos - node.nodeSize : cut.pos };
    }
    if (isolating(parent)) return null;
  }
  return null;
}

const isolating = (node: TiptapNodeLike): boolean =>
  (node.type.spec as { isolating?: boolean }).isolating === true;

/**
 * A late step of the Backspace (`backward`) and Delete chains: the engine selects the node beside
 * the caret's block only when it is a block of the model (an atom block or another block holder),
 * which the state reports as a block selection. Beside any other node, such as a list or the
 * paragraph of a list item, the key is consumed without effect, so the chain never ends in a
 * selection that the state cannot report (`uwg-te-req-engine-4`). A table or an atom block beside
 * the caret is selected before the engine joins anything (`selectBlockBesideKey`).
 */
function selectBlockBeside(
  view: TiptapDispatchViewLike,
  commands: TiptapCommandsLike,
  direction: 'backward' | 'forward',
): boolean {
  const beside = nodeBeside(view.state, direction);
  if (beside && !holderIndex(view.state.doc).list.some((holder) => holder.pos === beside.pos))
    return true;
  return direction === 'backward' ? commands.selectNodeBackward() : commands.selectNodeForward();
}

/**
 * Backspace with a caret at the start of a textblock right after a table or an atom block, or
 * Delete at the end of one right before such a block, block-selects that block before the engine
 * joins or deletes anything (the shared `blockBesideKey`, `uwg-te-req-engine-9`), so that the
 * textblock stays, also when it is empty, and the next key deletes the selected block
 * (`uwg-te-req-blocks-4`). The engine's own join would delete an atom at once, delete an empty
 * textblock, or put the caret into a table.
 */
export function selectBlockBesideKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  key: TextEditorDeleteKey,
): boolean {
  const { state } = view;
  const { selection, doc } = state;
  if (!selection.empty || !isInstance(selection, env.modules.state.TextSelection)) return false;
  const { $head } = selection;
  if ($head.parentOffset !== (key === 'backspace' ? 0 : $head.parent.content.size)) return false;
  const point = posToPoint(doc, selection.head, env.tables);
  if (!point || point.cell) return false;
  const id = blockBesideKey(portableOf(doc, env), key, point);
  const holder = id === null ? undefined : holderIndex(doc).byId.get(id);
  if (!holder) return false;
  const block = env.modules.state.NodeSelection.create(doc, holder.pos);
  view.dispatch(state.tr.setSelection(block).scrollIntoView());
  return true;
}

const emptyTextblock = (content: ReturnType<typeof blockInline>): boolean =>
  content !== null && inlineLength(content) === 0;

/**
 * Backspace at the start of a textblock outside tables, or Delete at its end, when it or the
 * textblock it joins is empty: the shared join of two textblocks (`joinBlocks`), which keeps the
 * block holding the first character, so the earlier block when both are empty, with its kind and
 * identifier (`uwg-te-req-content-7`), grouped with typing as the engine's own join is. The
 * engine keeps the later of two empty blocks. `false` when the key joins no such pair; list
 * boundaries come first (`listBoundaryKey`).
 */
export function emptyJoinKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  key: TextEditorDeleteKey,
): boolean {
  const { selection, doc } = view.state;
  const { TextSelection } = env.modules.state;
  if (!selection.empty || !isInstance(selection, TextSelection)) return false;
  const { $head } = selection;
  const backward = key === 'backspace';
  if ($head.parentOffset !== (backward ? 0 : $head.parent.content.size)) return false;
  const point = posToPoint(doc, selection.head, env.tables);
  if (!point || point.cell) return false;
  return keyEdit(
    env,
    view,
    (work) => {
      const document = work.portable();
      const order = locatedBlocks(document.blocks);
      const index = order.findIndex(({ block }) => block.id === point.block);
      const [first, second] = backward
        ? [order[index - 1]?.block, order[index]?.block]
        : [order[index]?.block, order[index + 1]?.block];
      if (!first?.id || !second?.id) return false;
      if (!emptyTextblock(blockInline(first)) && !emptyTextblock(blockInline(second))) return false;
      const edit = joinBlocks(document, first.id, second.id, editContext(work));
      if (!edit || !applyDocument(work, edit.document)) return false;
      return restoreSelection(work, { kind: 'text', anchor: edit.caret });
    },
    { step: false },
  );
}

/**
 * Backspace at the start of a paragraph or a custom textblock right after a code block, or Delete
 * at the end of a code block right before a textblock: the shared join into a code block
 * (`codeJoinEdit`), so that each inline node of the joined text becomes the text the text format
 * writes for it where the engine's own join would drop it, grouped with typing as that join is
 * (`uwg-te-req-content-5`, `uwg-te-req-content-7`). Only a caret at that edge beside a code block
 * maps the document. `false` for any other key or point.
 */
export function codeJoinKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  key: TextEditorDeleteKey,
): boolean {
  const { selection, doc } = view.state;
  if (!selection.empty || !isInstance(selection, env.modules.state.TextSelection)) return false;
  const { $head } = selection;
  const backward = key === 'backspace';
  if ($head.depth !== 1 || $head.parentOffset !== (backward ? 0 : $head.parent.content.size))
    return false;
  const code = backward ? doc.resolve($head.before()).nodeBefore : $head.parent;
  if (code?.type.name !== NATIVE.code) return false;
  const point = posToPoint(doc, selection.head, env.tables);
  if (!point || point.cell) return false;
  return keyEdit(
    env,
    view,
    (work) => {
      const edit = codeJoinEdit(work.portable(), key, point, editContext(work));
      if (!edit || !applyDocument(work, edit.document)) return false;
      return restoreSelection(work, { kind: 'text', anchor: edit.caret });
    },
    { step: false },
  );
}

/**
 * Backspace at the start of a table cell or of the document, or Delete at its end, that no earlier
 * step consumed: the key is consumed without effect, so cells never join and the browser deletes
 * nothing across the edge (`uwg-te-req-tables-5`); between the paragraphs of a cell the engine
 * joins them.
 */
export function edgeKey(view: TiptapDispatchViewLike, direction: 'backward' | 'forward'): boolean {
  const { selection } = view.state;
  if (!selection.empty) return false;
  const { $head } = selection;
  const backward = direction === 'backward';
  if ($head.parentOffset !== (backward ? 0 : $head.parent.content.size)) return false;
  for (let depth = $head.depth - 1; depth >= 0; depth -= 1) {
    const parent = $head.node(depth);
    if (backward ? $head.index(depth) > 0 : $head.indexAfter(depth) < parent.childCount)
      return false;
    if (depth === 0 || isCellNode(parent)) return true;
  }
  return false;
}

/**
 * Backspace or Delete with a collapsed caret at a list boundary, outside tables: the shared rule
 * of every engine (`listBoundaryEdit`, `uwg-te-req-content-7`), as an undo step of its own with the caret it
 * leaves; `false` elsewhere, where the engine's own deletion applies.
 */
export function listBoundaryKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  key: TextEditorDeleteKey,
): boolean {
  const { selection, doc } = view.state;
  const { TextSelection } = env.modules.state;
  if (!selection.empty || !isInstance(selection, TextSelection)) return false;
  const point = posToPoint(doc, selection.head, env.tables);
  if (!point || point.cell) return false;
  return keyEdit(env, view, (work) => {
    const edit = listBoundaryEdit(
      work.portable(),
      key,
      { block: point.block, offset: point.offset },
      editContext(work),
    );
    if (!edit || !applyDocument(work, edit.document)) return false;
    return restoreSelection(work, { kind: 'text', anchor: edit.caret });
  });
}

/**
 * Deletes a text selection across blocks by the shared range deletion (`deleteRange`), grouped with
 * typing as the engine's own deletion is; `meta` marks the transaction, such as a cut's.
 */
export function deleteSelectedRange(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  meta: Readonly<Record<string, unknown>> = {},
): boolean {
  const { state } = view;
  const { selection } = state;
  const { TextSelection } = env.modules.state;
  if (selection.empty || !isInstance(selection, TextSelection)) return false;
  const range = crossBlockRange(env, state.doc, selection.anchor, selection.head);
  if (!range) return false;
  return keyEdit(env, view, (work) => deleteCrossBlockRange(work, range), { step: false, meta });
}

/**
 * Clears the cells of a cell range, grown over merged cells, keeping the range selected and the
 * table (`uwg-te-req-tables-5`); `meta` marks the transaction, such as a cut's.
 */
export function clearSelectedCells(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  meta: Readonly<Record<string, unknown>> = {},
): boolean {
  const { doc, selection } = view.state;
  if (!isCellSelection(env.tables, selection)) return false;
  const model = readSelection(env, doc, selection);
  if (model.kind !== 'cells') return false;
  return keyAction(
    env,
    view,
    { type: 'table.clear-cells', table: model.table, range: model.range },
    meta,
  );
}

/**
 * Backspace, Delete or a cut over the whole-document selection, however it was made
 * (`wholeDocumentSelection`): the document becomes one empty paragraph with a fresh identifier,
 * the caret in it, grouped with typing (`uwg-te-req-engine-4`); `meta` marks the transaction,
 * such as a cut's.
 */
export function clearWholeDocument(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  meta: Readonly<Record<string, unknown>> = {},
): boolean {
  if (!wholeDocumentSelection(env, view.state.doc, view.state.selection)) return false;
  return keyEdit(
    env,
    view,
    (work) => {
      clearDocument(work);
      return true;
    },
    { step: false, meta },
  );
}

/** Backspace and its variants, without the engine's revert of an input rule. */
export function backspaceKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  commands: TiptapCommandsLike,
): boolean {
  if (isCellSelection(env.tables, view.state.selection)) return clearSelectedCells(env, view);
  return (
    clearWholeDocument(env, view) ||
    deleteSelectedBlocks(env, view) ||
    collapseAtStart(env, view) ||
    listBoundaryKey(env, view, 'backspace') ||
    deleteSelectedRange(env, view) ||
    commands.deleteSelection() ||
    selectBlockBesideKey(env, view, 'backspace') ||
    emptyJoinKey(env, view, 'backspace') ||
    codeJoinKey(env, view, 'backspace') ||
    commands.joinBackward() ||
    selectBlockBeside(view, commands, 'backward') ||
    edgeKey(view, 'backward')
  );
}

/** Delete and its variants. */
export function deleteKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  commands: TiptapCommandsLike,
): boolean {
  if (isCellSelection(env.tables, view.state.selection)) return clearSelectedCells(env, view);
  return (
    clearWholeDocument(env, view) ||
    deleteSelectedBlocks(env, view) ||
    listBoundaryKey(env, view, 'delete') ||
    deleteSelectedRange(env, view) ||
    commands.deleteSelection() ||
    selectBlockBesideKey(env, view, 'delete') ||
    emptyJoinKey(env, view, 'delete') ||
    codeJoinKey(env, view, 'delete') ||
    commands.joinForward() ||
    selectBlockBeside(view, commands, 'forward') ||
    edgeKey(view, 'forward')
  );
}

/**
 * Enter (`shift` false) or Shift+Enter over the whole-document selection, however it was made
 * (`wholeDocumentSelection`): the document becomes one empty paragraph with a fresh identifier and
 * the key acts at its caret, in one transaction: Enter leaves two empty paragraphs with the caret
 * in the second, Shift+Enter one paragraph holding a hard break (`uwg-te-req-engine-11`).
 */
export function enterOverDocument(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  shift: boolean,
): boolean {
  const { state } = view;
  const { TextSelection } = env.modules.state;
  if (!wholeDocumentSelection(env, state.doc, state.selection)) return false;
  const paragraph = state.schema.nodes[NATIVE.paragraph];
  const hardBreak = state.schema.nodes[NATIVE.hardBreak];
  if (!paragraph || !hardBreak) return false;
  const blocks = shift
    ? [paragraph.create({ id: env.createId() }, hardBreak.create())]
    : [paragraph.create({ id: env.createId() }), paragraph.create({ id: env.createId() })];
  const tr = state.tr.replaceWith(0, state.doc.content.size, blocks);
  // After the hard break, or at the start of the second paragraph.
  tr.setSelection(TextSelection.create(tr.doc, shift ? 2 : 3));
  view.dispatch(tr);
  return true;
}

/**
 * Enter at a caret at the start of a non-empty block, which the key splits before its text
 * (`uwg-te-req-content-7`, `uwg-te-lis-up-i2`): a list item's first paragraph gets an empty item
 * with a fresh identifier before the item, and a top-level textblock other than a paragraph or a
 * code block (a heading, a quote, a custom textblock) an empty paragraph with a fresh identifier
 * and the block's alignment before it (the new block takes the alignment of the block it was split
 * from). The block or item keeps its identifier, kind, attributes and text, with the caret at its
 * start. The new block's markup is set before the split, so that the split is the transaction's
 * last step: the history then finds the next Enter, and the typing after it, adjacent to it and
 * groups them under the 500 ms rule (`uwg-te-req-engine-5`), as at a paragraph's start. The
 * engine's own splits set that markup after the split, which ends the history group there.
 */
export function enterAtBlockStart(env: TiptapEnv, view: TiptapDispatchViewLike): boolean {
  const { state } = view;
  const { selection } = state;
  if (!selection.empty || !isInstance(selection, env.modules.state.TextSelection)) return false;
  const { $head } = selection;
  const block = $head.parent;
  if ($head.parentOffset !== 0 || block.content.size === 0) return false;
  const { tr } = state;
  const item = headItem(state);
  if (item) {
    // The item's attributes but its identifier are those the engine gives an item split off at
    // its start: the defaults, unchecked for a task item.
    tr.setNodeMarkup($head.before($head.depth - 1), undefined, { id: env.createId() });
    tr.split($head.pos, 2, [{ type: item.type, attrs: item.attrs }]);
  } else {
    const paragraph = state.schema.nodes[NATIVE.paragraph];
    const kind = block.type.name;
    if ($head.depth !== 1 || !paragraph || kind === NATIVE.paragraph || kind === NATIVE.code)
      return false;
    tr.setNodeMarkup($head.before(), paragraph, {
      id: env.createId(),
      align: block.attrs.align ?? null,
    });
    tr.split($head.pos, 1, [{ type: block.type, attrs: block.attrs }]);
  }
  view.dispatch(tr.scrollIntoView());
  return true;
}

/**
 * Enter (`shift` false) or Shift+Enter: over the whole-document selection, the key in one empty
 * paragraph; the code block's line break or exit; else a URL before the caret is linked once the
 * key applied; Enter unnests an empty list item, inserts an empty item before a list item or an
 * aligned paragraph before another textblock at its start (`enterAtBlockStart`), splits a list
 * item, or splits the block; Shift+Enter inserts a hard break.
 */
export function enterKey(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  commands: TiptapCommandsLike,
  shift: boolean,
): boolean {
  if (enterOverDocument(env, view, shift) || codeEnter(env, view, shift)) return true;
  const link = autolinkAtCaret(env, view.state);
  const item = shift ? null : headItem(view.state);
  const done = shift
    ? commands.setHardBreak()
    : listEnter(env, view) ||
      enterAtBlockStart(env, view) ||
      (item !== null && commands.splitListItem(item.type.name)) ||
      commands.createParagraphNear() ||
      commands.liftEmptyBlock() ||
      commands.splitBlock();
  if (done && link) applyAutolink(env, view, link);
  return done;
}

/**
 * Before Enter or Shift+Enter over a text selection, other than one inside a code block, which the
 * code keys replace themselves, or the whole-document selection, which Enter replaces itself
 * (`enterOverDocument`): deletes it, a range across blocks by the shared rule, so that the key then
 * acts at the collapsed caret, the split rules of `uwg-te-req-content-7` included (`deleteRange`).
 * The deletion groups with the key's change.
 */
export function deleteBeforeEnter(env: TiptapEnv, view: TiptapDispatchViewLike): void {
  const { state } = view;
  const { selection } = state;
  const { TextSelection } = env.modules.state;
  if (selection.empty || !isInstance(selection, TextSelection)) return;
  if (codeSelection(env, state) || wholeDocumentSelection(env, state.doc, selection)) return;
  if (!deleteSelectedRange(env, view)) view.dispatch(state.tr.deleteSelection());
}

/**
 * Shift with an arrow key in a table (`uwg-te-req-tables-5`): the cell range of the shared rule
 * (`cellRangeKey`), set without an undo step, ahead of the engine's own cell-range keys; `false`
 * where the key moves or extends within a cell's text, which the engine then does.
 */
export function cellRangeArrow(env: TiptapEnv, view: TiptapViewLike, key: string): boolean {
  if (!env.tables) return false;
  const { doc, selection } = view.state;
  const geometry = new TiptapGeometry(env, () => view);
  const next = cellRangeKey({
    selection: readSelection(env, doc, selection),
    key,
    table: (id) => portableTable(env, doc, id),
    rtl: (id) => isRightToLeft(geometry.tableElements(id)?.table ?? null),
    onEdgeLine: (point, side) => geometry.onEdgeLine(point, side),
  });
  return next !== null && keyEdit(env, view, (work) => setSelection(work, next), { step: false });
}

/** The portable table of a table identifier of a document, or `null`. */
function portableTable(
  env: TiptapEnv,
  doc: TiptapNodeLike,
  id: string,
): TextEditorPortableTable | null {
  const holder = holderIndex(doc).byId.get(id);
  const block = holder ? holderBlock(doc, holder, env.nodes) : null;
  return block?.type === 'table' ? block : null;
}

/** Whether a block lies before (`up`) or after (`down`) a top-level block of a document. */
function blockBeyond(doc: TiptapNodeLike, id: string, step: 'up' | 'down'): boolean {
  const holder = holderIndex(doc).byId.get(id);
  if (!holder) return true;
  return step === 'up' ? holder.pos > 0 : holder.pos + holder.node.nodeSize < doc.content.size;
}

/**
 * Plain ArrowUp on the first line of a cell's first paragraph, or ArrowDown on the last line of its
 * last paragraph, with a row beyond the cell's span (`uwg-te-req-engine-9`): the caret goes to the
 * end of the cell above or the start of the cell below by the shared rule (`cellCaretKey`), named
 * by the grid's columns and set without an undo step, ahead of the engine's table keys, which land
 * at the start of the next cell either way. Where the key would leave a table that no block lies
 * beyond, it is consumed and the selection stays (`cellCaretStays`): the engine's table keys would
 * put the caret at the start of the table's first cell. `onEdgeLine` tells whether a text point
 * lies on the first or last line of its paragraph as laid out; the geometry measures it unless
 * given. `false` where the key moves within the cell or out of the table toward a block, which the
 * engine then does.
 */
export function cellCaretArrow(
  env: TiptapEnv,
  view: TiptapViewLike,
  key: 'ArrowUp' | 'ArrowDown',
  onEdgeLine?: (point: TextEditorTextPoint, side: 'first' | 'last') => boolean,
): boolean {
  if (!env.tables) return false;
  const { doc, selection } = view.state;
  const input = {
    selection: readSelection(env, doc, selection),
    key,
    table: (id: string) => portableTable(env, doc, id),
    onEdgeLine:
      onEdgeLine ??
      ((point: TextEditorTextPoint, side: 'first' | 'last') =>
        new TiptapGeometry(env, () => view).onEdgeLine(point, side)),
  };
  const target = cellCaretKey(input);
  if (!target)
    return cellCaretStays({ ...input, blockBeyond: (id, step) => blockBeyond(doc, id, step) });
  return keyEdit(
    env,
    view,
    (work) => {
      if (!setSelection(work, { kind: 'text', anchor: target })) return false;
      work.tr.scrollIntoView();
      return true;
    },
    { step: false },
  );
}

/** An arrow key without modifiers. */
export type TiptapArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

/**
 * An arrow key over a block selection, the adapter's own or a node-selected block, with no block
 * beyond it in the key's direction: consumed without effect, so the selection stays and neither
 * the caret nor the browser's selection leaves it (`uwg-te-req-engine-9`, `uwg-te-req-key-6`).
 * ArrowUp and the key that points to the inline start in the root's direction look before the
 * first selected block, the others after the last one, as the engine's own arrow keys do. Where a
 * block lies beyond, the engine selects it when it is an atom block, else places the caret in the
 * nearest textblock or cell; that search finding nothing is what leaves the key to the browser.
 */
export function blockEdgeArrow(env: TiptapEnv, view: TiptapViewLike, key: TiptapArrowKey): boolean {
  const { doc, selection } = view.state;
  if (selectedBlockIds(env.modules, doc, selection) === null) return false;
  const forward =
    key === 'ArrowLeft' || key === 'ArrowRight'
      ? (key === 'ArrowRight') !== isRightToLeft(view.dom)
      : key === 'ArrowDown';
  const side = forward ? selection.$to : selection.$from;
  return env.modules.state.Selection.findFrom(side, forward ? 1 : -1) === null;
}

/** The bindings of the editing keymap, by the engine's key names. */
export function editingBindings(
  env: TiptapEnv,
  editor: TiptapCommandEditorLike,
): Record<string, () => boolean> {
  const backspace = () => backspaceKey(env, editor.view, editor.commands);
  const remove = () => deleteKey(env, editor.view, editor.commands);
  // The engine's commands are read after the deletion, from the state it left.
  const enter = (shift: boolean) => () => {
    deleteBeforeEnter(env, editor.view);
    return enterKey(env, editor.view, editor.commands, shift);
  };
  const bindings: Record<string, () => boolean> = {
    Enter: enter(false),
    'Shift-Enter': enter(true),
    Backspace: backspace,
    'Mod-Backspace': backspace,
    'Shift-Backspace': backspace,
    Delete: remove,
    'Mod-Delete': remove,
    'Mod-a': () => editor.commands.selectAll(),
    Tab: () => codeTab(env, editor.view, false) || listTab(env, editor.view, false),
    'Shift-Tab': () => codeTab(env, editor.view, true) || listTab(env, editor.view, true),
    ArrowUp: () =>
      codeArrow(env, editor.view, 'up') ||
      cellCaretArrow(env, editor.view, 'ArrowUp') ||
      blockEdgeArrow(env, editor.view, 'ArrowUp'),
    ArrowDown: () =>
      codeArrow(env, editor.view, 'down') ||
      cellCaretArrow(env, editor.view, 'ArrowDown') ||
      blockEdgeArrow(env, editor.view, 'ArrowDown'),
    ArrowLeft: () => blockEdgeArrow(env, editor.view, 'ArrowLeft'),
    ArrowRight: () => blockEdgeArrow(env, editor.view, 'ArrowRight'),
    'Shift-ArrowUp': () => cellRangeArrow(env, editor.view, 'ArrowUp'),
    'Shift-ArrowDown': () => cellRangeArrow(env, editor.view, 'ArrowDown'),
    'Shift-ArrowLeft': () => cellRangeArrow(env, editor.view, 'ArrowLeft'),
    'Shift-ArrowRight': () => cellRangeArrow(env, editor.view, 'ArrowRight'),
  };
  const { core } = env.modules;
  if (!core.isMacOS() && !core.isiOS()) return bindings;
  // The text editing keys of Apple platforms, as the engine binds them.
  return {
    ...bindings,
    'Ctrl-h': backspace,
    'Alt-Backspace': backspace,
    'Ctrl-d': remove,
    'Ctrl-Alt-Backspace': remove,
    'Alt-Delete': remove,
    'Alt-d': remove,
    'Ctrl-a': () => editor.commands.selectTextblockStart(),
    'Ctrl-e': () => editor.commands.selectTextblockEnd(),
  };
}

/** The extension of the editing keymap. */
export function editingKeymap(env: TiptapEnv): TiptapExtensionLike {
  return env.modules.core.Extension.create({
    name: 'tpKeymap',
    priority: KEYMAP_PRIORITY,
    addKeyboardShortcuts(this: { readonly editor: TiptapCommandEditorLike }) {
      return editingBindings(env, this.editor);
    },
  });
}

/**
 * The extensions of the adapter's editing behavior: the Escape neutralizer, the editing keymap
 * and the input rules.
 */
export function behaviorExtensions(env: TiptapEnv): TiptapExtensionLike[] {
  return [escapeExtension(env.modules), editingKeymap(env), inputRulesExtension(env)];
}
