/**
 * The transaction that the actions of one `execute` or `can` build (Widgets `uwg-te-req-engine-5`).
 *
 * Every action of a list appends to one engine transaction over the current state, so the list
 * applies all or nothing: `execute` dispatches the transaction only when every action applied, and
 * `can` builds the same transaction and drops it. Actions address blocks and text through the
 * engine-neutral points of the model, resolved against the transaction's current document, and
 * structural block changes rewrite the affected top-level blocks from the portable model.
 */
import type { TextEditorCapability } from '../../capabilities.js';
import {
  canonicalize,
  type TextEditorPortableBlock,
  type TextEditorPortableDocument,
  type TextEditorPortableDraft,
} from '../../content/portable.js';
import type { TextEditorDiagnostic, TextEditorUrlPolicy } from '../../engine.js';
import type { TextEditorTextPoint, TextEditorTextRange } from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import {
  fromTiptapJson,
  holderIndex,
  pointToPos,
  posToPoint,
  rangeToPositions,
  toTiptapBlocks,
  type TiptapHolder,
} from './mapping.js';
import type {
  TextEditorTiptapModules,
  TiptapEditorStateLike,
  TiptapNodeLike,
  TiptapSchemaLike,
  TiptapSelectionLike,
  TiptapTablesLike,
  TiptapTransactionLike,
} from './modules.js';

/** What the actions of a mount work with. */
export interface TiptapEnv {
  readonly modules: TextEditorTiptapModules;
  /** The table helpers, when the mount has both table modules. */
  readonly tables: TiptapTablesLike | undefined;
  readonly createId: () => string;
  /** The custom node definitions of the mount. */
  readonly nodes: readonly TextEditorNodeDefinition[];
  readonly urls: TextEditorUrlPolicy;
  /** What the mount represents: the engine's capabilities and those of its nodes. */
  readonly capabilities: ReadonlySet<TextEditorCapability>;
}

/** The meta key that marks a transaction built by `execute`: `{ reason, type }`. */
export const TP_ACTION_META = 'tp-action';

/**
 * The meta key of a transaction that forms an undo step of its own without being an action: an
 * applied input rule, or a structural change of an editing key. The history boundary closes the
 * history event after it, as after an action.
 */
export const TP_STEP_META = 'tp-step';

/**
 * The meta key with which the engine's view marks a transaction of composed text, also the one
 * that inserts what it reads once the composition has ended.
 */
export const COMPOSITION_META = 'composition';

/** Makes a transaction its own undo step: the history event closes before and after it. */
export function ownStep(
  env: Pick<TiptapEnv, 'modules'>,
  tr: TiptapTransactionLike,
): TiptapTransactionLike {
  env.modules.history.closeHistory(tr);
  return tr.setMeta(TP_STEP_META, true);
}

/** What a key or an input rule dispatches through: the view, or a structural stand-in in tests. */
export interface TiptapDispatchViewLike {
  readonly state: TiptapEditorStateLike;
  readonly composing: boolean;
  dispatch(tr: TiptapTransactionLike): void;
}

const portables = new WeakMap<object, TextEditorPortableDocument>();

/**
 * The portable document of a revision, canonical; mapped once per revision. Identifiers are those
 * of the revision, which the repair keeps valid and unique.
 */
export function portableOf(
  doc: TiptapNodeLike,
  env: Pick<TiptapEnv, 'nodes' | 'createId'>,
): TextEditorPortableDocument {
  let document = portables.get(doc);
  if (!document) {
    document = canonicalize(fromTiptapJson(doc.toJSON()), {
      nodes: env.nodes,
      createId: env.createId,
    }).document;
    portables.set(doc, document);
  }
  return document;
}

/** The number of leading and trailing children two fragments share. */
function sharedEdges(
  before: TiptapNodeLike,
  after: readonly TiptapNodeLike[],
): { readonly start: number; readonly end: number } {
  let start = 0;
  while (start < before.childCount && start < after.length && before.child(start).eq(after[start]!))
    start += 1;
  let end = 0;
  while (
    end < before.childCount - start &&
    end < after.length - start &&
    before.child(before.childCount - 1 - end).eq(after[after.length - 1 - end]!)
  )
    end += 1;
  return { start, end };
}

/** How a work starts: whether a selection is placed and the mount is editable. */
export interface TiptapWorkOptions {
  /** Default true, as for keys and input rules, which run with a placed selection. */
  readonly placed?: boolean | undefined;
  /** Default true, as for keys and input rules, which the engine runs only while editable. */
  readonly editable?: boolean | undefined;
  /**
   * `can`'s dry run, whose transaction is dropped: an action whose answer is settled once its
   * shared edit computes may answer without committing it, as the Lexical adapter's preparation
   * does (`uwg-te-req-perf-1`).
   */
  readonly dry?: boolean | undefined;
}

/** The transaction that one list of actions builds. */
export class TiptapWork {
  readonly tr: TiptapTransactionLike;
  /** Diagnostics of the actions, which `execute` reports once the transaction applied. */
  readonly diagnostics: TextEditorDiagnostic[] = [];
  /**
   * Whether the selection is placed: until focus, a user selection or `selection.set` places one
   * after a mount or `setContent`, the state reports none and actions on the selection do not
   * apply (`uwg-te-req-blocks-1`).
   */
  placed: boolean;
  /**
   * Whether `selection.set` cleared the selection: the state then reports none until a key or a
   * press places the selection again, the engine's own selection resting at a text point.
   */
  cleared = false;
  /** Whether the mount is editable, which the action gate reads. */
  readonly editable: boolean;
  /** Whether this work is `can`'s dry run (`TiptapWorkOptions.dry`). */
  readonly dry: boolean;

  constructor(
    readonly env: TiptapEnv,
    readonly state: TiptapEditorStateLike,
    options: TiptapWorkOptions = {},
  ) {
    this.tr = state.tr;
    this.placed = options.placed ?? true;
    this.editable = options.editable ?? true;
    this.dry = options.dry ?? false;
  }

  get doc(): TiptapNodeLike {
    return this.tr.doc;
  }

  get schema(): TiptapSchemaLike {
    return this.state.schema;
  }

  get selection(): TiptapSelectionLike {
    return this.tr.selection;
  }

  holder(id: string): TiptapHolder | null {
    return holderIndex(this.doc).byId.get(id) ?? null;
  }

  pointPos(point: TextEditorTextPoint): number | null {
    return pointToPos(this.doc, point, this.env.tables);
  }

  pointAt(pos: number): TextEditorTextPoint | null {
    return posToPoint(this.doc, pos, this.env.tables);
  }

  rangePositions(
    range: TextEditorTextRange,
  ): { readonly from: number; readonly to: number } | null {
    return rangeToPositions(this.doc, range, this.env.tables);
  }

  /** The portable document of the transaction's current revision. */
  portable(): TextEditorPortableDocument {
    return portableOf(this.doc, this.env);
  }

  /** Canonicalizes a draft with the mount's nodes, filling missing identifiers. */
  canonical(draft: TextEditorPortableDraft): TextEditorPortableDocument {
    return canonicalize(draft, { nodes: this.env.nodes, createId: this.env.createId }).document;
  }

  /** The engine nodes of portable blocks; throws for a node the schema cannot hold. */
  nodesOf(blocks: readonly TextEditorPortableBlock[]): TiptapNodeLike[] {
    return toTiptapBlocks(blocks).map((json) => {
      const node = this.schema.nodeFromJSON(json);
      node.check();
      return node;
    });
  }

  /**
   * Replaces the document with a portable one in this transaction: only the top-level nodes that
   * differ are replaced, so unchanged blocks keep their nodes. Returns whether it changed.
   */
  commit(document: TextEditorPortableDocument): boolean {
    const nodes = this.nodesOf(document.blocks);
    const doc = this.doc;
    const { start, end } = sharedEdges(doc, nodes);
    if (start === doc.childCount && start === nodes.length) return false;
    let from = 0;
    for (let index = 0; index < start; index += 1) from += doc.child(index).nodeSize;
    let to = doc.content.size;
    for (let index = 0; index < end; index += 1)
      to -= doc.child(doc.childCount - 1 - index).nodeSize;
    this.tr.replaceWith(from, to, nodes.slice(start, nodes.length - end));
    return true;
  }
}
