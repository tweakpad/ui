/**
 * Block identifiers on Lexical (Widgets `uwg-te-req-content-7`, `uwg-te-lis-up-i2`,
 * `uwg-te-req-perf-1`).
 *
 * A holder is a node that stands for a block: a child of the root other than a list, and a list
 * item that is not a wrapper of nested lists. Each holder carries NodeState `tp-id`, which the
 * engine resets when it copies a node. Transforms on the holder classes repair identifiers in the
 * update that changed them: the engine runs element transforms only on elements that changed
 * themselves, so typing visits no holder and a keystroke never walks the document. An index from
 * identifier to node key decides duplicates: the holder that owned the identifier keeps it, a copy
 * gets a fresh one (the shared `freshBlockId`). Identifiers on nodes that are no holders (cell
 * paragraphs, wrapper items) are cleared. Enter at the start of a non-empty block other than a
 * code block inserts the new empty block before it, so the identifier stays with the content.
 */
import { freshBlockId, isValidBlockId } from '../../ids.js';
import type { LexicalElementLike, LexicalNodeLike, LexicalUpdatePayloadLike } from './modules.js';
import type { LexicalRuntime } from './runtime.js';

// Holders

/** Whether a list item only wraps nested lists, the engine's form of nesting. */
export function $isWrapperItem(rt: LexicalRuntime, node: LexicalNodeLike): boolean {
  if (!rt.isListItem(node)) return false;
  const children = (node as LexicalElementLike).getChildren();
  return children.length > 0 && children.every((child) => rt.isList(child));
}

/** Whether a node stands for a block of the block tree. */
export function $isHolder(rt: LexicalRuntime, node: LexicalNodeLike): boolean {
  if (rt.isListItem(node)) return !$isWrapperItem(rt, node);
  const parent = node.getParent();
  return parent !== null && rt.lexical.$isRootNode(parent) && !rt.isList(node);
}

/**
 * The holders of children of the root in document order, each list item before its nested items:
 * a list gives its items, any other child itself.
 */
export function $holdersIn(
  rt: LexicalRuntime,
  children: readonly LexicalNodeLike[],
): LexicalNodeLike[] {
  const found: LexicalNodeLike[] = [];
  const visitList = (list: LexicalNodeLike) => {
    for (const item of (list as LexicalElementLike).getChildren()) {
      if (!rt.isListItem(item)) continue;
      if (!$isWrapperItem(rt, item)) found.push(item);
      for (const child of (item as LexicalElementLike).getChildren())
        if (rt.isList(child)) visitList(child);
    }
  };
  for (const child of children) {
    if (rt.isList(child)) visitList(child);
    else found.push(child);
  }
  return found;
}

/** Every holder in document order, each list item before its nested items. */
export const $holders = (rt: LexicalRuntime): LexicalNodeLike[] =>
  $holdersIn(rt, rt.lexical.$getRoot().getChildren());

/** The identifier a node carries, `''` for none. */
export const $blockId = (rt: LexicalRuntime, node: LexicalNodeLike): string =>
  rt.lexical.$getState(node, rt.states.id);

/** The holder of an identifier, through the index or else a walk that renews it. */
export function $holderById(rt: LexicalRuntime, id: string): LexicalNodeLike | null {
  const key = rt.idIndex.get(id);
  if (key !== undefined) {
    const node = rt.lexical.$getNodeByKey(key);
    if (node && node.isAttached() && $blockId(rt, node) === id && $isHolder(rt, node)) return node;
  }
  for (const holder of $holders(rt))
    if ($blockId(rt, holder) === id) {
      rt.idIndex.set(id, holder.getKey());
      return holder;
    }
  return null;
}

/** The nearest holder that contains a node, the node itself included. */
export function $nearestHolder(
  rt: LexicalRuntime,
  node: LexicalNodeLike | null,
): LexicalNodeLike | null {
  let current = node;
  while (current && !rt.lexical.$isRootNode(current)) {
    if ($isHolder(rt, current)) return current;
    current = current.getParent();
  }
  return null;
}

// Repair (`uwg-te-req-content-7`)

/**
 * The identifiers a fresh one must avoid: those of the index, read through it rather than copied,
 * so a repair costs nothing per block of the document.
 */
class IndexedIds extends Set<string> {
  readonly #index: ReadonlyMap<string, string>;

  constructor(index: ReadonlyMap<string, string>) {
    super();
    this.#index = index;
  }

  override has(id: string): boolean {
    return this.#index.has(id) || super.has(id);
  }
}

/** Whether another live holder owns an identifier. */
function ownedElsewhere(rt: LexicalRuntime, id: string, key: string): boolean {
  const owner = rt.idIndex.get(id);
  if (owner === undefined || owner === key) return false;
  const node = rt.lexical.$getNodeByKey(owner);
  return node !== null && node.isAttached() && $blockId(rt, node) === id && $isHolder(rt, node);
}

/** The transform of a holder class: one visit per changed holder. */
export function $repairId(rt: LexicalRuntime, node: LexicalNodeLike): void {
  rt.idVisits += 1;
  if (!node.isAttached()) return;
  const id = $blockId(rt, node);
  if (!$isHolder(rt, node)) {
    if (id !== '') rt.lexical.$setState(node, rt.states.id, '');
    return;
  }
  const key = node.getKey();
  rt.idVisited.add(key);
  if (isValidBlockId(id) && !ownedElsewhere(rt, id, key)) {
    rt.idIndex.set(id, key);
    return;
  }
  const fresh = freshBlockId(new IndexedIds(rt.idIndex), rt.createId);
  rt.lexical.$setState(node, rt.states.id, fresh);
  rt.idIndex.set(fresh, key);
}

/** Rebuilds the index from the holders of a state, after a whole state replaced the last one. */
export function rebuildIdIndex(rt: LexicalRuntime, payload: LexicalUpdatePayloadLike): void {
  rt.idIndex.clear();
  payload.editorState.read(() => {
    for (const holder of $holders(rt)) {
      const id = $blockId(rt, holder);
      if (id !== '' && !rt.idIndex.has(id)) rt.idIndex.set(id, holder.getKey());
    }
  });
}

/** Registers the identifier transforms and the index upkeep. */
export function registerIdRepair(rt: LexicalRuntime): () => void {
  const { lexical } = rt;
  const editor = rt.engine;
  return lexical.mergeRegister(
    ...rt
      .holderClasses()
      .map((klass) => editor.registerNodeTransform(klass, (node) => $repairId(rt, node))),
    editor.registerUpdateListener((payload) => {
      if (payload.tags.has(lexical.HISTORIC_TAG)) rebuildIdIndex(rt, payload);
    }),
  );
}

// The split rule at the start of a block (`uwg-te-req-content-7`)

/**
 * Enter at offset 0 of a non-empty holder other than a code block or a table inserts an empty
 * block before it (a paragraph, or an empty list item before a list item) and keeps the caret in
 * the block, so the block keeps its identifier with its content; other splits stay the engine's,
 * a split in a table cell included (cell paragraphs are no blocks).
 */
export function $splitAtStart(rt: LexicalRuntime): boolean {
  const { lexical } = rt;
  const selection = lexical.$getSelection();
  if (!lexical.$isRangeSelection(selection) || !selection.isCollapsed()) return false;
  const anchor = selection.anchor;
  const holder = $nearestHolder(rt, anchor.getNode());
  // A cell paragraph is no block: Enter in a cell is the engine's split there.
  if (!holder || rt.isCode(holder) || rt.isTable(holder) || !lexical.$isElementNode(holder))
    return false;
  if (holder.getTextContentSize() === 0 && holder.getChildrenSize() === 0) return false;
  if (!$atStart(holder, anchor.getNode(), anchor.offset)) return false;
  const empty = (
    rt.isListItem(holder)
      ? lexical.$parseSerializedNode({ type: 'listitem', version: 1, children: [] })
      : lexical.$createParagraphNode()
  ) as LexicalElementLike;
  // The new block takes the alignment of the block it was split from (`uwg-te-req-engine-12`).
  const align = holder.getFormatType();
  if (align !== '') empty.setFormat(align);
  holder.insertBefore(empty);
  holder.selectStart();
  return true;
}

/** Whether a point lies at the start of a holder's text. */
function $atStart(holder: LexicalElementLike, node: LexicalNodeLike, offset: number): boolean {
  if (offset !== 0) return false;
  let current: LexicalNodeLike | null = node;
  while (current && !current.is(holder)) {
    if (current.getPreviousSibling() !== null) return false;
    current = current.getParent();
  }
  return current !== null;
}
