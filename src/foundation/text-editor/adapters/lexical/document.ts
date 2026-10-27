/**
 * The document of a Lexical state as the portable model, and portable edits applied back
 * (Widgets `uwg-te-req-content-1`, `uwg-te-req-engine-5`, `uwg-te-req-perf-1`).
 *
 * Reading maps the root's JSON through the pure mapper. Applying a new portable document replaces
 * only the children of the root whose blocks changed: the unchanged leading and trailing children
 * keep their nodes, keys and elements, and every block keeps its identifier through NodeState.
 * The blocks at the selection are read one top-level node at a time, mapped once per committed
 * state, and whether an update changed the document is read from the engine's own dirty nodes, so
 * neither a keystroke nor an action maps the whole document to tell. Everything here runs inside
 * an engine read or update.
 */
import {
  canonicalize,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
} from '../../content/portable.js';
import type {
  TextEditorLinkState,
  TextEditorSelection,
  TextEditorTextPoint,
  TextEditorTextSelection,
} from '../../model.js';
import { locatedBlocks } from '../shared/blocks.js';
import { firstTextEdge, inlineAtCell, linkAtSelection } from '../shared/selection-state.js';
import { $holderById, $holdersIn } from './ids.js';
import { lexicalToPortable, portableBlockSegments, type LexicalJsonNode } from './mapping.js';
import type { LexicalElementLike, LexicalNodeLike } from './modules.js';
import type { LexicalRuntime } from './runtime.js';

/** The deep JSON of a node: its own JSON with its children's. */
export function $deepJson(rt: LexicalRuntime, node: LexicalNodeLike): LexicalJsonNode {
  const json: LexicalJsonNode = node.exportJSON();
  if (rt.lexical.$isElementNode(node))
    return { ...json, children: node.getChildren().map((child) => $deepJson(rt, child)) };
  return json;
}

/** The canonical portable blocks of JSON children of the root. */
export function portableOf(
  rt: LexicalRuntime,
  children: readonly LexicalJsonNode[],
): TextEditorPortableDocument {
  const draft = lexicalToPortable({ root: { type: 'root', version: 1, children } });
  return canonicalize(draft, { nodes: rt.nodes, createId: rt.createId }).document;
}

/** The portable documents of committed states, which never change. */
const committed = new WeakMap<object, TextEditorPortableDocument>();

/**
 * Carries the portable document of a committed state over to the next one, which an update that
 * left the document as it was (a selection change, focus) committed: the dry runs of the tools
 * after a press then map no document again (`uwg-te-req-perf-1`).
 */
export function keepPortableDocument(previous: object, next: object): void {
  const document = committed.get(previous);
  if (document && !committed.has(next)) committed.set(next, document);
}

/**
 * The portable document of the state being read or updated; in a read of the committed state it is
 * mapped once per state.
 */
export function $portableDocument(rt: LexicalRuntime): TextEditorPortableDocument {
  const state = rt.reading ? rt.engine.getEditorState() : null;
  const cached = state ? committed.get(state) : undefined;
  if (cached) return cached;
  const document = portableOf(
    rt,
    rt.lexical
      .$getRoot()
      .getChildren()
      .map((child) => $deepJson(rt, child)),
  );
  if (state) committed.set(state, document);
  return document;
}

const keyOf = (blocks: readonly TextEditorPortableBlock[]): string => JSON.stringify(blocks);

/**
 * Applies a canonical document to the state being updated: the children of the root between the
 * unchanged prefix and suffix are replaced by nodes parsed from the document's JSON. Answers
 * whether anything changed.
 */
export function $applyDocument(rt: LexicalRuntime, next: TextEditorPortableDocument): boolean {
  const { lexical } = rt;
  const root = lexical.$getRoot();
  const children = root.getChildren();
  const current = children.map((child) => keyOf(portableOf(rt, [$deepJson(rt, child)]).blocks));
  const segments = portableBlockSegments(next.blocks);
  const wanted = segments.map((segment) => keyOf(segment.blocks));
  let prefix = 0;
  while (prefix < current.length && prefix < wanted.length && current[prefix] === wanted[prefix])
    prefix += 1;
  let suffix = 0;
  while (
    suffix < current.length - prefix &&
    suffix < wanted.length - prefix &&
    current[current.length - 1 - suffix] === wanted[wanted.length - 1 - suffix]
  )
    suffix += 1;
  const removed = children.slice(prefix, children.length - suffix);
  const added = segments.slice(prefix, segments.length - suffix);
  if (removed.length === 0 && added.length === 0) return false;
  const nodes = added.map((segment) => lexical.$parseSerializedNode(segment.node));
  const before = prefix > 0 ? children[prefix - 1]! : null;
  for (const node of removed) node.remove();
  if (before) {
    let anchor = before;
    for (const node of nodes) anchor = anchor.insertAfter(node);
  } else if (root.getFirstChild()) {
    const first = root.getFirstChild()!;
    for (const node of nodes) first.insertBefore(node);
  } else root.append(...nodes);
  return true;
}

/**
 * Replaces every child of the root with the nodes of a document, built from its native JSON
 * objects in the update being run (no text round trip, no comparison with the current children):
 * the mount's load of the initial content.
 */
export function $loadDocument(rt: LexicalRuntime, document: TextEditorPortableDocument): void {
  const { lexical } = rt;
  const nodes = portableBlockSegments(document.blocks).map((segment) =>
    lexical.$parseSerializedNode(segment.node),
  );
  const root = lexical.$getRoot();
  root.clear();
  root.append(...nodes);
}

// One top-level node at a time

/** A block of the portable model found by identifier, with its nesting depth. */
export interface LexicalLocatedBlock {
  readonly block: TextEditorPortableBlock;
  readonly depth: number;
}

/** The portable blocks of a top-level node, and every block among them with its depth. */
interface LexicalTopBlocks {
  readonly blocks: readonly TextEditorPortableBlock[];
  readonly located: readonly LexicalLocatedBlock[];
}

/** The portable blocks of committed top-level nodes, per committed state and node key. */
const committedTops = new WeakMap<object, Map<string, LexicalTopBlocks>>();

/** The child of the root that holds a node, the node itself included; `null` when detached. */
function $topLevelNode(rt: LexicalRuntime, node: LexicalNodeLike): LexicalNodeLike | null {
  let top = node;
  for (let parent = top.getParent(); parent; parent = top.getParent()) {
    if (rt.lexical.$isRootNode(parent)) return top;
    top = parent;
  }
  return null;
}

/**
 * The portable blocks of a top-level node (a list with its items), mapped once per committed state
 * in a read of the committed state.
 */
function $topBlocks(rt: LexicalRuntime, top: LexicalNodeLike): LexicalTopBlocks {
  const state = rt.reading ? rt.engine.getEditorState() : null;
  let tops = state ? committedTops.get(state) : undefined;
  if (state && !tops) committedTops.set(state, (tops = new Map()));
  let found = tops?.get(top.getKey());
  if (!found) {
    const blocks = portableOf(rt, [$deepJson(rt, top)]).blocks;
    found = {
      blocks,
      located: locatedBlocks(blocks).map(({ block, depth }) => ({ block, depth })),
    };
    tops?.set(top.getKey(), found);
  }
  return found;
}

/**
 * The portable form of the block a holder stands for, with its depth: the holder's top-level node
 * is mapped alone, so reading the blocks at the selection never maps the whole document.
 */
export function $locateHolder(
  rt: LexicalRuntime,
  holder: LexicalNodeLike,
): LexicalLocatedBlock | null {
  const id = rt.lexical.$getState(holder, rt.states.id);
  if (id === '') return null;
  const top = $topLevelNode(rt, holder) ?? holder;
  return $topBlocks(rt, top).located.find(({ block }) => block.id === id) ?? null;
}

/** The located portable block of an identifier, through its holder. */
export function $locateBlock(rt: LexicalRuntime, id: string): LexicalLocatedBlock | null {
  const holder = $holderById(rt, id);
  return holder ? $locateHolder(rt, holder) : null;
}

/**
 * The link at a text selection within one textblock or cell paragraph, edges included: the state's
 * `link` and the link the link actions act on at a caret (the shared `linkAtSelection`,
 * `uwg-te-tab-actions` r1).
 */
export function $linkAt(
  rt: LexicalRuntime,
  selection: TextEditorSelection,
): TextEditorLinkState | null {
  return linkAtSelection(selection, (block, cell) => {
    const located = $locateBlock(rt, block)?.block;
    return located ? inlineAtCell(located, cell) : null;
  });
}

// What an update changed (`uwg-te-req-engine-5`, `uwg-te-req-evt-3`)

/** A node of one state as far as the change check reads it: itself and its top-level node. */
interface LexicalDirtyEntry {
  readonly node: LexicalNodeLike | null;
  readonly top: string | null;
}

/** The own JSON and the child keys of the root, as one comparable string. */
const rootSignature = (root: LexicalElementLike): string =>
  JSON.stringify([root.exportJSON(), root.getChildrenKeys()]);

/**
 * Whether the update being run has changed the document since the committed state, from the
 * engine's own change tracking: only the nodes the update marked dirty are read. A dirty node that
 * the update did not rewrite is an ancestor of a change and is skipped; the root changed when its
 * own JSON or its children's keys differ; any other rewritten node stands for the top-level block
 * holding it before and after the update, and those blocks are compared by their portable form, so
 * content that the engine split and joined again, or rewrote unchanged, is no change.
 */
export function $documentChangedByUpdate(rt: LexicalRuntime): boolean {
  const { lexical } = rt;
  const editor = rt.engine;
  const keys = [...new Set([...editor._dirtyLeaves, ...editor._dirtyElements.keys()])];
  if (keys.length === 0) return false;
  const entryOf = (key: string): LexicalDirtyEntry => {
    const node = lexical.$getNodeByKey(key);
    return { node, top: node ? ($topLevelNode(rt, node)?.getKey() ?? null) : null };
  };
  const before = rt.readCommitted(() => {
    const root = lexical.$getRoot();
    return { entries: keys.map(entryOf), root: rootSignature(root) };
  });
  const tops = new Set<string>();
  for (const [index, key] of keys.entries()) {
    const was = before.entries[index]!;
    const now = entryOf(key);
    if (now.node === was.node) continue;
    if (lexical.$isRootNode(now.node)) {
      if (rootSignature(now.node) !== before.root) return true;
      continue;
    }
    if (now.top !== null) tops.add(now.top);
    if (was.top !== null) tops.add(was.top);
  }
  for (const top of tops) {
    const now = lexical.$getNodeByKey(top);
    if (!now || $topLevelNode(rt, now) !== now) return true;
    const was = rt.readCommitted(() => {
      const node = lexical.$getNodeByKey(top);
      return node && $topLevelNode(rt, node) === node ? keyOf($topBlocks(rt, node).blocks) : null;
    });
    if (was !== keyOf(portableOf(rt, [$deepJson(rt, now)]).blocks)) return true;
  }
  return false;
}

// Text edges (uwg-te-req-engine-4)

/** The portable blocks of holders, mapped one at a time as they are reached. */
export function* $portableHolders(rt: LexicalRuntime, holders: Iterable<LexicalNodeLike>) {
  for (const holder of holders) {
    const located = $locateHolder(rt, holder);
    if (located) yield located.block;
  }
}

/**
 * The shared first text point (`start`) or last (`end`) of children of the root
 * (`firstTextEdge`): of the first or last of their blocks that holds text, a table's edge cell
 * included; each block is mapped only when it is reached.
 */
export function $textEdgeIn(
  rt: LexicalRuntime,
  children: readonly LexicalNodeLike[],
  side: 'start' | 'end',
): TextEditorTextPoint | null {
  const holders = $holdersIn(rt, children);
  return firstTextEdge($portableHolders(rt, side === 'start' ? holders : holders.reverse()), side);
}

/** The whole document as text from its first to its last text point (`uwg-te-req-engine-4`). */
export function $wholeTextSelection(rt: LexicalRuntime): TextEditorTextSelection | null {
  const children = rt.lexical.$getRoot().getChildren();
  const first = $textEdgeIn(rt, children, 'start');
  const last = $textEdgeIn(rt, children, 'end');
  return first && last ? { kind: 'text', anchor: first, head: last, empty: false } : null;
}
