/**
 * Block identifiers and normalization of the Tiptap adapter (Widgets `uwg-te-req-content-7`,
 * `uwg-te-req-engine-5`, `uwg-te-req-blocks-1`, `uwg-te-lis-up-i2`).
 *
 * One plugin repairs every transaction that changes the document, inside that transaction's
 * history event, so the repair adds no notification and no undo step: every block keeps a valid
 * identifier that is unique in the document, a block outside the changed ranges keeping its
 * identifier over a copy inside them (`planIdRepair` of the shared identifier rules); paragraphs
 * of list items and cells carry none; Enter at the start of a non-empty block other than a code
 * block leaves the identifier with the content and gives the new empty block before it a fresh
 * one; and the document keeps an empty paragraph after a final atom block or table.
 */
import { planIdRepair } from '../../ids.js';
import { holderIndex, holderTextblock, isListNode, type TiptapHolder } from './mapping.js';
import type {
  TextEditorTiptapModules,
  TiptapEditorStateLike,
  TiptapNodeLike,
  TiptapPluginLike,
  TiptapTransactionLike,
} from './modules.js';
import { NATIVE } from './schema.js';

/** The meta key of the repair transaction the plugin appends. */
export const ID_REPAIR_META = 'tp-block-ids';

interface Range {
  readonly from: number;
  readonly to: number;
}

/** The ranges of the last document that the transactions' steps changed, in its positions. */
export function changedRanges(transactions: readonly TiptapTransactionLike[]): Range[] {
  let ranges: Range[] = [];
  for (const tr of transactions)
    for (const map of tr.mapping.maps) {
      ranges = ranges.map((range) => ({ from: map.map(range.from, -1), to: map.map(range.to, 1) }));
      map.forEach((_oldStart, _oldEnd, newStart, newEnd) =>
        ranges.push({ from: newStart, to: newEnd }),
      );
    }
  return ranges;
}

/** A change to apply: an identifier for the node at a position, `null` clearing it. */
export interface TiptapIdFix {
  readonly pos: number;
  readonly id: string | null;
}

const hasIdAttribute = (node: TiptapNodeLike): boolean => Object.hasOwn(node.attrs, 'id');

const textOf = (holder: Pick<TiptapHolder, 'node' | 'pos'>): string | null =>
  holderTextblock(holder)?.node.textContent ?? null;

/**
 * Enter at the start of a non-empty block (`uwg-te-lis-up-i2`): the split leaves the identifier on the empty
 * block before the content. Where a changed holder holds the text that the block of its empty
 * previous sibling held before the change, the identifier moves to the content.
 */
function splitMoves(
  holders: readonly TiptapHolder[],
  previous: TiptapNodeLike | null,
  changed: (holder: TiptapHolder) => boolean,
): Map<TiptapHolder, string | null> {
  const moves = new Map<TiptapHolder, string | null>();
  if (!previous) return moves;
  const before = holderIndex(previous).byId;
  for (let index = 1; index < holders.length; index += 1) {
    const holder = holders[index]!;
    const sibling = holders[index - 1]!;
    if (!changed(holder) || sibling.parentId !== holder.parentId) continue;
    if (sibling.pos + sibling.node.nodeSize !== holder.pos) continue;
    const id = sibling.id;
    if (id === null || (holder.id !== null && holder.id !== id)) continue;
    if (sibling.node.type.name === NATIVE.code || holder.node.type.name === NATIVE.code) continue;
    const text = textOf(holder);
    if (!text || textOf(sibling) !== '') continue;
    const old = before.get(id);
    if (!old || textOf(old) !== text) continue;
    moves.set(holder, id);
    moves.set(sibling, null);
  }
  return moves;
}

/**
 * The identifier changes that make a document valid: holders without a valid identifier, and
 * later copies of one, get fresh ones from `create`, holders outside `changed` keeping theirs over
 * holders inside; paragraphs of list items and cells lose theirs; the split rule applies against
 * the `previous` document.
 */
export function planBlockIds(
  doc: TiptapNodeLike,
  changed: readonly Range[],
  create: () => string,
  previous: TiptapNodeLike | null = null,
): TiptapIdFix[] {
  const holders = holderIndex(doc).list.filter((holder) => hasIdAttribute(holder.node));
  const inChanged = (holder: TiptapHolder) =>
    changed.some((range) => holder.pos >= range.from && holder.pos < range.to);
  const moves = splitMoves(holders, previous, inChanged);
  const current = holders.map((holder) => (moves.has(holder) ? moves.get(holder)! : holder.id));
  // Holders outside the changed ranges come first, so that the existing block keeps its
  // identifier and a copy gets a fresh one.
  const order = holders
    .map((holder, index) => index)
    .sort((a, b) => Number(inChanged(holders[a]!)) - Number(inChanged(holders[b]!)) || a - b);
  const planned = planIdRepair(
    order.map((index) => current[index]!),
    create,
  ).ids;
  const fixes: TiptapIdFix[] = [];
  order.forEach((index, at) => {
    const id = planned[at]!;
    if (holders[index]!.id !== id) fixes.push({ pos: holders[index]!.pos, id });
  });
  const holderPositions = new Set(holders.map((holder) => holder.pos));
  doc.descendants((node, pos) => {
    if (hasIdAttribute(node) && node.attrs.id !== null && !holderPositions.has(pos))
      fixes.push({ pos, id: null });
    return !node.isTextblock;
  });
  return fixes;
}

/** Whether a document ends with an atom block or a table, which the trailing paragraph follows. */
export function needsTrailingParagraph(doc: TiptapNodeLike): boolean {
  const last = doc.lastChild;
  return last !== null && !last.isTextblock && !isListNode(last);
}

/** Applies identifier fixes and the trailing paragraph to a transaction; whether it changed. */
export function applyBlockNormalization(
  tr: TiptapTransactionLike,
  fixes: readonly TiptapIdFix[],
  create: () => string,
): boolean {
  for (const fix of fixes) tr.setNodeAttribute(fix.pos, 'id', fix.id);
  let changed = fixes.length > 0;
  if (needsTrailingParagraph(tr.doc)) {
    const paragraph = tr.doc.type.schema.nodes[NATIVE.paragraph]?.create({ id: create() });
    if (paragraph) {
      tr.insert(tr.doc.content.size, paragraph);
      changed = true;
    }
  }
  return changed;
}

/** The repair and normalization plugin of a mount. */
export function blockIdsPlugin(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  create: () => string,
): TiptapPluginLike {
  return new modules.state.Plugin({
    appendTransaction(
      transactions: readonly TiptapTransactionLike[],
      oldState: TiptapEditorStateLike,
      newState: TiptapEditorStateLike,
    ) {
      if (!transactions.some((tr) => tr.docChanged)) return null;
      const fixes = planBlockIds(newState.doc, changedRanges(transactions), create, oldState.doc);
      const tr = newState.tr;
      if (!applyBlockNormalization(tr, fixes, create)) return null;
      return tr.setMeta(ID_REPAIR_META, true);
    },
  });
}
