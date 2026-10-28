/**
 * Lists of the Tiptap adapter (Widgets `uwg-te-req-parity-1`, `uwg-te-req-blocks-1`,
 * `uwg-te-tab-content-model` r4, `uwg-te-req-key-3`, `uwg-te-lis-up-i2`).
 *
 * The keys of a list item run the block edits that every engine shares, so a key and its
 * action reach one outcome: Tab nests the items the selection touches under their previous
 * siblings and is consumed without effect when none can nest; Shift+Tab unnests them, a nested
 * item following its parent with its following siblings as its children and a top-level item
 * becoming a paragraph (the shared `listTab`); Enter in an empty item unnests it. Each change is
 * an undo step of its own.
 * The engine splits a non-empty item on Enter; at the item's start the key puts an empty item
 * before it (`enterAtBlockStart`). After every change, adjacent lists of one kind merge into one
 * list, since the portable model has no list containers.
 */
import type { TextEditorAction } from '../../actions.js';
import { listTab as sharedListTab } from '../shared/block-edits.js';
import { applyAction } from './actions.js';
import { applyDocument, editContext, restoreSelection } from './blocks.js';
import { isItemNode, isListNode } from './mapping.js';
import type {
  TextEditorTiptapModules,
  TiptapEditorStateLike,
  TiptapNodeLike,
  TiptapPluginLike,
  TiptapTransactionLike,
} from './modules.js';
import { readSelection } from './selection.js';
import { ownStep, TiptapWork, type TiptapDispatchViewLike, type TiptapEnv } from './work.js';

/** The list item whose own paragraph holds the selection head, or `null`. */
export function headItem(state: TiptapEditorStateLike): TiptapNodeLike | null {
  const { $head } = state.selection;
  const depth = $head.depth - 1;
  if (depth < 1 || !$head.parent.isTextblock) return null;
  const item = $head.node(depth);
  return isItemNode(item) && $head.index(depth) === 0 ? item : null;
}

/** How a key's change enters the history. */
export interface TiptapKeyEditOptions {
  /** An undo step of its own (structural keys), else grouped as typing is; default true. */
  readonly step?: boolean | undefined;
  /** Transaction metadata, such as the cut that removed blocks. */
  readonly meta?: Readonly<Record<string, unknown>> | undefined;
}

/**
 * Applies a change of a key to the view's state, built on a work over it, and dispatches it;
 * whether it applied.
 */
export function keyEdit(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  apply: (work: TiptapWork) => boolean,
  options: TiptapKeyEditOptions = {},
): boolean {
  const work = new TiptapWork(env, view.state);
  if (!apply(work)) return false;
  const tr = options.step === false ? work.tr : ownStep(env, work.tr);
  for (const [key, value] of Object.entries(options.meta ?? {})) tr.setMeta(key, value);
  view.dispatch(tr);
  return true;
}

/**
 * Applies one block action to the view's state as an undo step of its own, as a key does it;
 * whether it applied. `meta` adds transaction metadata, such as the cut that removed blocks.
 */
export function keyAction(
  env: TiptapEnv,
  view: TiptapDispatchViewLike,
  action: TextEditorAction,
  meta: Readonly<Record<string, unknown>> = {},
): boolean {
  return keyEdit(env, view, (work) => applyAction(work, action), { meta });
}

/**
 * Tab (`outdent` false) or Shift+Tab with a text selection outside tables: the shared rule
 * (`listTab` of the shared block edits) nests or unnests the list items the selection
 * touches, the selection kept, and answers whether the key is consumed: when it touches list
 * items, with or without effect; otherwise it is no list key (the caller's code keys come first,
 * a table's Tab is the widget's, and elsewhere focus leaves the editing root).
 */
export function listTab(env: TiptapEnv, view: TiptapDispatchViewLike, outdent: boolean): boolean {
  const { state } = view;
  const selection = readSelection(env, state.doc, state.selection);
  if (selection.kind !== 'text' || selection.anchor.cell || selection.head.cell) return false;
  let consumed = false;
  keyEdit(env, view, (work) => {
    const result = sharedListTab(
      work.portable(),
      selection.anchor.block,
      selection.head.block,
      outdent,
      editContext(work),
    );
    if (!result) return false;
    consumed = true;
    if (!result.document || !applyDocument(work, result.document)) return false;
    restoreSelection(work, selection);
    return true;
  });
  return consumed;
}

/** Enter at a caret in an empty list item: unnests it by one level (`uwg-te-req-parity-1`). */
export function listEnter(env: TiptapEnv, view: TiptapDispatchViewLike): boolean {
  const { selection } = view.state;
  if (!selection.empty || selection.$head.parent.content.size !== 0) return false;
  if (!headItem(view.state)) return false;
  return keyAction(env, view, { type: 'block.outdent' });
}

// Adjacent lists

/**
 * The positions between adjacent sibling lists of one kind, at the top level and among the
 * nested lists of each item, the last first so that joining them in order keeps the others.
 */
export function adjacentListJoins(doc: TiptapNodeLike): number[] {
  const joins: number[] = [];
  const visit = (container: TiptapNodeLike, contentStart: number) => {
    let previous: TiptapNodeLike | null = null;
    container.forEach((child, offset) => {
      const pos = contentStart + offset;
      if (isListNode(child)) {
        if (previous !== null && previous.type === child.type) joins.push(pos);
        child.forEach((item, itemOffset) => {
          if (isItemNode(item)) visit(item, pos + 1 + itemOffset + 1);
        });
      }
      previous = child;
    });
  };
  visit(doc, 0);
  return joins.sort((a, b) => b - a);
}

/** The meta key of the merge transaction the plugin appends. */
export const LIST_MERGE_META = 'tp-list-merge';

/**
 * The plugin that merges adjacent lists of one kind after every change of the document, in a
 * transaction appended to that change, so it belongs to the change's undo step.
 */
export function listMergePlugin(modules: Pick<TextEditorTiptapModules, 'state'>): TiptapPluginLike {
  return new modules.state.Plugin({
    key: new modules.state.PluginKey('tpListMerge'),
    appendTransaction(
      transactions: readonly TiptapTransactionLike[],
      _old: TiptapEditorStateLike,
      state: TiptapEditorStateLike,
    ) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      const joins = adjacentListJoins(state.doc);
      if (joins.length === 0) return null;
      const { tr } = state;
      for (const pos of joins) tr.join(pos);
      return tr.setMeta(LIST_MERGE_META, true);
    },
  });
}
