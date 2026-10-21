/**
 * What one mount of the Lexical adapter works with: the modules, the namespace's NodeState
 * configurations and node classes, the editor, the mount's custom nodes, the identifier index and
 * the counters of the normalized state. Every module of the adapter reads the engine through it.
 */
import type {
  TextEditorContentChange,
  TextEditorDiagnostic,
  TextEditorUrlPolicy,
} from '../../engine.js';
import type { TextEditorTextPoint } from '../../model.js';
import type { TextEditorNodeDefinition } from '../../nodes.js';
import type { TextEditorContentGlue } from '../shared/content.js';
import type { TextEditorLexicalNodeOverride } from './index.js';
import type {
  LexicalCoreLike,
  LexicalEditorLike,
  LexicalElementLike,
  LexicalHistoryStateLike,
  LexicalKlassLike,
  LexicalLinkLike,
  LexicalListItemLike,
  LexicalListLike,
  LexicalNodeLike,
  LexicalTableCellLike,
  LexicalTableLike,
  TextEditorLexicalModules,
} from './modules.js';
import { lexicalNodeKit, type LexicalCustomBinding, type LexicalNodeKit } from './nodes.js';
import { lexicalStates, type LexicalStates } from './states.js';

/** A key or a press in the editing root. */
export type LexicalLastInput =
  | { readonly kind: 'key'; readonly key: string; readonly shift: boolean }
  | { readonly kind: 'press'; readonly x: number; readonly y: number; readonly shift: boolean };

export class LexicalRuntime {
  readonly modules: TextEditorLexicalModules;
  readonly lexical: LexicalCoreLike;
  readonly states: LexicalStates;
  readonly kit: LexicalNodeKit;
  readonly nodes: readonly TextEditorNodeDefinition[];
  /** The bindings of the mount's custom nodes by node name. */
  readonly customBlocks: ReadonlyMap<string, LexicalCustomBinding>;
  readonly customInlines: ReadonlyMap<string, LexicalCustomBinding>;
  readonly createId: () => string;
  readonly urls: TextEditorUrlPolicy;
  readonly glue: TextEditorContentGlue;
  /** Set by the adapter's extension when the editor is built. */
  editor: LexicalEditorLike | null = null;
  /** The editing root of the mount, which the engine renders into; `null` without a container. */
  root: HTMLElement | null = null;
  /** Block identifier → node key, as the identifier transforms last saw them. */
  readonly idIndex = new Map<string, string>();
  /**
   * Calls of the identifier transforms, which a keystroke keeps to the holders it changed
   * (`uwg-te-req-perf-1`); a holder whose identifier the transform wrote is visited again.
   */
  idVisits = 0;
  /** The keys of the holders the identifier transforms visited. */
  readonly idVisited = new Set<string>();
  version = 1;
  contentVersion = 1;
  /** The change an `execute` or `setContent` in progress reports. */
  acting: TextEditorContentChange | null = null;
  /** Diagnostics of the action in progress, reported once it applied (converted fragments). */
  readonly diagnostics: TextEditorDiagnostic[] = [];
  /** The engine's history, which the history extension takes as its initial history. */
  readonly history: LexicalHistoryStateLike;
  canUndo = false;
  canRedo = false;
  focused = false;
  /**
   * Whether the content's links and table wrappers are tab stops and its task checkboxes enabled:
   * while the editing root is a tab stop, by the last root attribute record (`uwg-te-req-prop-3`).
   */
  contentStopsActive = true;
  /** Notifications flow once the mount reported ready and until it is destroyed. */
  live = false;
  /** A read of the committed state is running, whose portable document may be cached. */
  reading = false;
  /**
   * Mod+A selected the whole document and the engine still holds that selection, which the state
   * reports as text from the first to the last text point (`uwg-te-req-engine-4`).
   */
  selectAll = false;
  /**
   * When the last change of the open typing group committed (`Date.now()`), or `null`
   * (`uwg-te-req-engine-5`).
   */
  typingAt: number | null = null;
  /** The last key or press in the editing root, which tells where a block cursor came from. */
  lastInput: LexicalLastInput | null = null;
  /**
   * The text point under the last plain press of the primary button, without Shift and not the
   * second press of a double press: where the press put the anchor of the selection it makes
   * (`uwg-te-req-engine-4`); `null` for any other press or outside text.
   */
  pressPoint: TextEditorTextPoint | null = null;
  /** The cleanups of the custom atom views on screen, by node key. */
  readonly views = new Map<string, { readonly host: HTMLElement; cleanup: (() => void) | null }>();

  constructor(input: {
    readonly modules: TextEditorLexicalModules;
    readonly nodes: readonly TextEditorNodeDefinition[];
    readonly createId: () => string;
    readonly urls: TextEditorUrlPolicy;
    readonly glue: TextEditorContentGlue;
    /** Classes that replace the generated ones, by custom node name. */
    readonly overrides: Readonly<Record<string, TextEditorLexicalNodeOverride>>;
  }) {
    this.modules = input.modules;
    this.lexical = input.modules.lexical;
    this.states = lexicalStates(this.lexical);
    this.kit = lexicalNodeKit(this.lexical);
    this.nodes = input.nodes;
    this.createId = input.createId;
    this.urls = input.urls;
    this.glue = input.glue;
    this.history = input.modules.history.createEmptyHistoryState();
    const blocks = new Map<string, LexicalCustomBinding>();
    const inlines = new Map<string, LexicalCustomBinding>();
    const overrides = input.overrides;
    for (const definition of input.nodes) {
      const target = definition.kind === 'block' ? blocks : inlines;
      if (target.has(definition.name)) continue;
      const override = Object.hasOwn(overrides, definition.name)
        ? overrides[definition.name]
        : undefined;
      target.set(
        definition.name,
        override ? this.kit.override(definition, override.klass) : this.kit.custom(definition),
      );
    }
    this.customBlocks = blocks;
    this.customInlines = inlines;
  }

  /** Reads the committed state without flushing pending updates and without updating. */
  readCommitted<V>(read: () => V): V {
    const reading = this.reading;
    this.reading = true;
    try {
      return this.engine.read('latest', read);
    } finally {
      this.reading = reading;
    }
  }

  /** The built editor; throws before the build. */
  get engine(): LexicalEditorLike {
    if (!this.editor) throw new Error('The Lexical editor is not built.');
    return this.editor;
  }

  // Node classes

  isList(node: LexicalNodeLike | null | undefined): node is LexicalListLike {
    return node instanceof this.modules.list.ListNode;
  }

  isListItem(node: LexicalNodeLike | null | undefined): node is LexicalListItemLike {
    return node instanceof this.modules.list.ListItemNode;
  }

  isTable(node: LexicalNodeLike | null | undefined): node is LexicalTableLike {
    const table = this.modules.table;
    return table !== undefined && node instanceof table.TableNode;
  }

  isTableRow(node: LexicalNodeLike | null | undefined): node is LexicalElementLike {
    const table = this.modules.table;
    return table !== undefined && node instanceof table.TableRowNode;
  }

  isTableCell(node: LexicalNodeLike | null | undefined): node is LexicalTableCellLike {
    const table = this.modules.table;
    return table !== undefined && node instanceof table.TableCellNode;
  }

  isCode(node: LexicalNodeLike | null | undefined): node is LexicalElementLike {
    return node instanceof this.modules.code.CodeNode;
  }

  isLink(node: LexicalNodeLike | null | undefined): node is LexicalLinkLike {
    return node instanceof this.modules.link.LinkNode;
  }

  /** The block classes whose nodes may hold a block identifier. */
  holderClasses(): readonly LexicalKlassLike[] {
    const { lexical, modules, kit } = this;
    return [
      lexical.ParagraphNode,
      modules.richText.HeadingNode,
      modules.richText.QuoteNode,
      modules.code.CodeNode,
      modules.list.ListItemNode,
      modules.extension.HorizontalRuleNode,
      kit.image,
      ...(modules.table ? [modules.table.TableNode] : []),
      ...[...this.customBlocks.values()].map((binding) => binding.klass),
    ];
  }
}
