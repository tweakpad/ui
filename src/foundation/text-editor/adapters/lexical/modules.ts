/**
 * The Lexical modules that the adapter receives (Widgets `uwg-te-req-engine-1`,
 * `uwg-te-par-engine-1`).
 *
 * The library imports no engine package: the application passes the module namespaces it imported
 * itself, and these structural types name only the members the adapter uses, each typed as the
 * adapter calls it, so that the real packages satisfy them and a wrong argument fails to compile.
 * The probes run at mount, never in the factory: a missing module, a module without the members
 * the adapter calls or a node class from a second engine copy rejects the mount with an error that
 * names the module, and an engine version the adapter was not verified with gives one
 * `text-editor-engine-version` diagnostic.
 */

// Commands, tags and states

/** A command; the payload type only guides the listeners. */
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- the payload is phantom
export interface LexicalCommandLike<P = unknown> {
  readonly type?: string | undefined;
}

/** A NodeState configuration from `createState`. */
export interface LexicalStateConfigLike<V> {
  readonly key: string;
  readonly defaultValue: V;
  parse(value?: unknown): V;
}

/** What `createState` receives. */
export interface LexicalStateValueConfigLike<V> {
  parse: (jsonValue: unknown) => V;
  isEqual?: ((a: V, b: V) => boolean) | undefined;
  resetOnCopyNode?: boolean | undefined;
}

// Serialized nodes

/** A serialized node, as `exportJSON` writes it and `$parseSerializedNode` reads it. */
export interface LexicalSerializedNodeLike {
  readonly type: string;
  readonly version: number;
  readonly [member: string]: unknown;
}

// Nodes

/** A NodeState configuration that a generated class stores flat among its JSON members. */
export interface LexicalFlatStateLike {
  readonly stateConfig: LexicalStateConfigLike<unknown>;
  readonly flat: true;
}

/** The static configuration of a generated node class: its base class and its NodeState. */
export interface LexicalNodeConfigLike {
  readonly extends: LexicalKlassLike;
  readonly stateConfigs: readonly LexicalFlatStateLike[];
}

/** What the engine passes to the DOM methods of a node: the editor's namespace and theme. */
export interface LexicalEditorConfigLike {
  readonly namespace: string;
}

export interface LexicalNodeLike {
  getKey(): string;
  getType(): string;
  getParent(): LexicalElementLike | null;
  getIndexWithinParent(): number;
  getPreviousSibling(): LexicalNodeLike | null;
  getNextSibling(): LexicalNodeLike | null;
  getTextContent(): string;
  getTextContentSize(): number;
  isAttached(): boolean;
  isInline(): boolean;
  is(object: LexicalNodeLike | null | undefined): boolean;
  isBefore(targetNode: LexicalNodeLike): boolean;
  remove(preserveEmptyParent?: boolean): void;
  replace(replaceWith: LexicalNodeLike, includeChildren?: boolean): LexicalNodeLike;
  insertAfter(nodeToInsert: LexicalNodeLike, restoreSelection?: boolean): LexicalNodeLike;
  insertBefore(nodeToInsert: LexicalNodeLike, restoreSelection?: boolean): LexicalNodeLike;
  selectStart(): LexicalRangeSelectionLike;
  selectEnd(): LexicalRangeSelectionLike;
  exportJSON(): LexicalSerializedNodeLike;
  markDirty(): void;
  /** The static configuration, which generated classes declare. */
  $config(): unknown;
  /** Builds a static configuration of a node type. */
  config(type: string, config: LexicalNodeConfigLike): unknown;
}

export interface LexicalElementLike extends LexicalNodeLike {
  getChildren(): LexicalNodeLike[];
  getChildrenKeys(): string[];
  getChildrenSize(): number;
  getFirstChild(): LexicalNodeLike | null;
  getLastChild(): LexicalNodeLike | null;
  getChildAtIndex(index: number): LexicalNodeLike | null;
  getAllTextNodes(): LexicalTextLike[];
  isEmpty(): boolean;
  getFormatType(): string;
  setFormat(type: string): unknown;
  append(...nodesToAppend: LexicalNodeLike[]): unknown;
  clear(): unknown;
  splice(start: number, deleteCount: number, nodesToInsert: LexicalNodeLike[]): unknown;
  select(anchorOffset?: number, focusOffset?: number): LexicalRangeSelectionLike;
}

export interface LexicalTextLike extends LexicalNodeLike {
  getFormat(): number;
  getStyle(): string;
  hasFormat(type: string): boolean;
  setFormat(format: number): unknown;
  setStyle(style: string): unknown;
  setTextContent(text: string): unknown;
  select(anchorOffset?: number, focusOffset?: number): LexicalRangeSelectionLike;
}

export interface LexicalListLike extends LexicalElementLike {
  getListType(): string;
}

export interface LexicalListItemLike extends LexicalElementLike {
  getChecked(): boolean | undefined;
}

export interface LexicalLinkLike extends LexicalElementLike {
  getURL(): string;
}

export interface LexicalTableCellLike extends LexicalElementLike {
  getColSpan(): number;
  getRowSpan(): number;
}

export interface LexicalTableLike extends LexicalElementLike {
  getColWidths(): readonly number[] | undefined;
  setColWidths(colWidths: readonly number[] | undefined): unknown;
}

/** The DOM methods that the generated element and decorator classes implement. */
interface LexicalRenderedLike extends LexicalNodeLike {
  createDOM(config: LexicalEditorConfigLike, editor: LexicalEditorLike): HTMLElement;
  updateDOM(prevNode: unknown, dom: HTMLElement, config: LexicalEditorConfigLike): boolean;
}

/** The element node the generated textblock classes extend. */
export interface LexicalElementInstanceLike extends LexicalElementLike, LexicalRenderedLike {}

/** The decorator node the generated atom classes extend. */
export interface LexicalDecoratorLike extends LexicalRenderedLike {
  decorate(editor: LexicalEditorLike, config: LexicalEditorConfigLike): unknown;
}

/**
 * A node class, as `instanceof`, transforms and `extends` see it: a constructor of any
 * parameters, which the adapter never calls with arguments.
 */
export type LexicalKlassLike<T extends LexicalNodeLike = LexicalNodeLike> = abstract new (
  ...args: never[]
) => T;

// Selections

export interface LexicalPointLike {
  readonly key: string;
  readonly offset: number;
  readonly type: 'text' | 'element';
  getNode(): LexicalNodeLike;
  set(key: string, offset: number, type: 'text' | 'element'): void;
  is(point: LexicalPointLike): boolean;
}

export interface LexicalBaseSelectionLike {
  /** Whether another selection is the same: kind, points and, for a range, format and style. */
  is(selection: LexicalBaseSelectionLike | null): boolean;
  getNodes(): LexicalNodeLike[];
  getTextContent(): string;
  isCollapsed(): boolean;
  isBackward(): boolean;
  clone(): LexicalBaseSelectionLike;
  insertNodes(nodes: LexicalNodeLike[]): void;
}

export interface LexicalRangeSelectionLike extends LexicalBaseSelectionLike {
  readonly anchor: LexicalPointLike;
  readonly focus: LexicalPointLike;
  format: number;
  style: string;
  hasFormat(type: string): boolean;
  formatText(formatType: string, alignWithFormat?: number | null): void;
  setFormat(format: number): void;
  setStyle(style: string): void;
  insertText(text: string): void;
  removeText(): void;
  insertParagraph(): LexicalElementLike | null;
  insertLineBreak(selectStart?: boolean): void;
  extract(): LexicalNodeLike[];
}

export interface LexicalNodeSelectionLike extends LexicalBaseSelectionLike {
  add(key: string): void;
  has(key: string): boolean;
  clear(): void;
}

export interface LexicalTableSelectionLike extends LexicalBaseSelectionLike {
  readonly tableKey: string;
  readonly anchor: LexicalPointLike;
  readonly focus: LexicalPointLike;
}

/** The points of a DOM selection, as the engine resolves them into a range selection. */
export type LexicalDomPointsLike = Pick<
  Selection,
  'anchorNode' | 'anchorOffset' | 'focusNode' | 'focusOffset'
>;

// Editor

export interface LexicalEditorStateLike {
  read<V>(callbackFn: () => V): V;
  toJSON(): { readonly root: LexicalSerializedNodeLike };
  isEmpty(): boolean;
}

export interface LexicalUpdatePayloadLike {
  readonly dirtyElements: ReadonlyMap<string, boolean>;
  readonly dirtyLeaves: ReadonlySet<string>;
  readonly editorState: LexicalEditorStateLike;
  readonly prevEditorState: LexicalEditorStateLike;
  readonly tags: ReadonlySet<string>;
}

export interface LexicalUpdateOptionsLike {
  readonly discrete?: true | undefined;
  readonly tag?: string | string[] | undefined;
  readonly skipTransforms?: true | undefined;
}

/** The editor, as the engine passes it to node methods, render overrides and its helpers. */
export interface LexicalEditorLike {
  readonly constructor: { readonly version?: string | undefined };
  /**
   * The keys of the text and decorator nodes that the update being run has marked dirty: the
   * engine's own change tracking, which its update listeners receive as `dirtyLeaves`.
   */
  readonly _dirtyLeaves: ReadonlySet<string>;
  /** The keys of the element nodes the update being run has marked dirty, ancestors included. */
  readonly _dirtyElements: ReadonlyMap<string, boolean>;
  update(updateFn: () => void, options?: LexicalUpdateOptionsLike): void;
  read<V>(callbackFn: () => V): V;
  read<V>(mode: 'force-commit' | 'pending' | 'latest', callbackFn: () => V): V;
  getEditorState(): LexicalEditorStateLike;
  setRootElement(nextRootElement: HTMLElement | null): void;
  getRootElement(): HTMLElement | null;
  getElementByKey(key: string): HTMLElement | null;
  registerUpdateListener(listener: (payload: LexicalUpdatePayloadLike) => void): () => void;
  registerEditableListener(listener: (editable: boolean) => void): () => void;
  registerCommand<P>(
    command: LexicalCommandLike<P>,
    listener: (payload: P) => boolean,
    priority: number,
  ): () => void;
  registerNodeTransform(
    klass: LexicalKlassLike,
    listener: (node: LexicalNodeLike) => void,
  ): () => void;
  /** Mutations of a class's nodes after each reconciliation: `created`, `updated`, `destroyed`. */
  registerMutationListener(
    klass: LexicalKlassLike,
    listener: (nodes: ReadonlyMap<string, 'created' | 'updated' | 'destroyed'>) => void,
    options?: { readonly skipInitialization?: boolean | undefined },
  ): () => void;
  dispatchCommand(command: LexicalCommandLike, payload?: unknown): boolean;
  isEditable(): boolean;
  setEditable(editable: boolean): void;
  isComposing(): boolean;
}

/** The editor that `buildEditorFromExtensions` builds, which the adapter disposes. */
export interface LexicalBuiltEditorLike extends LexicalEditorLike {
  dispose(): void;
}

// Extensions

/** An extension object; the adapter only passes them through. */
export interface LexicalExtensionLike {
  readonly name: string;
}

/** An extension, or an extension with a partial configuration (`configExtension`). */
export type LexicalExtensionArgumentLike =
  LexicalExtensionLike | [LexicalExtensionLike, ...Readonly<Record<string, unknown>>[]];

/** A node entry of an extension: a node class, or a replacement of one. */
export type LexicalNodeEntryLike = LexicalKlassLike | { readonly replace: LexicalKlassLike };

/** What the adapter's own extension declares; the engine reads every member but `name` as optional. */
export interface LexicalExtensionInitLike {
  readonly name: string;
  readonly namespace?: string | undefined;
  readonly theme?: Readonly<Record<string, unknown>> | undefined;
  readonly editable?: boolean | undefined;
  readonly nodes?:
    | readonly LexicalNodeEntryLike[]
    | (() => readonly LexicalNodeEntryLike[] | undefined)
    | undefined;
  readonly dependencies?: readonly LexicalExtensionArgumentLike[] | undefined;
  /** The initial state: JSON text, an editor state or a function that writes it. */
  readonly $initialEditorState?: string | object | null | undefined;
  onError?(error: Error, editor: LexicalEditorLike): void;
  onWarn?(error: Error, editor: LexicalEditorLike): void;
  /**
   * Called with the editor, the extension's configuration and its state while the editor is
   * built, before its initial state; the adapter reads the editor only.
   */
  register?(editor: LexicalEditorLike, config: unknown, state: unknown): () => void;
}

/** The DOM slot of a node: where the engine reconciles its children and text. */
export interface LexicalDomSlotLike {
  withElement(element: Element): LexicalDomSlotLike;
  withAfter(after: Node | null | undefined): LexicalDomSlotLike;
}

/** What a DOM render override declares (`@lexical/html`, experimental), for nodes of type `N`. */
export interface LexicalDomOverrideConfigLike<N extends LexicalNodeLike> {
  $createDOM?(node: N, $next: () => HTMLElement, editor: LexicalEditorLike): HTMLElement;
  $updateDOM?(
    nextNode: N,
    prevNode: N,
    dom: HTMLElement,
    $next: () => boolean,
    editor: LexicalEditorLike,
  ): boolean;
  $decorateDOM?(nextNode: N, prevNode: N | null, dom: HTMLElement, editor: LexicalEditorLike): void;
  $getDOMSlot?(
    node: N,
    dom: HTMLElement,
    $next: () => LexicalDomSlotLike,
    editor: LexicalEditorLike,
  ): LexicalDomSlotLike;
}

/** A Markdown shortcut transformer of a block rule, decided by the adapter. */
export interface LexicalElementTransformerLike {
  readonly type: 'element';
  readonly dependencies: [];
  export(): null;
  readonly regExp: RegExp;
  replace(): boolean;
}

/** A Markdown shortcut transformer completed by a trigger character, decided by the adapter. */
export interface LexicalTextMatchTransformerLike {
  readonly type: 'text-match';
  readonly dependencies: [];
  readonly trigger: string;
  readonly importRegExp: RegExp;
  readonly regExp: RegExp;
  replace(): void;
}

export type LexicalTransformerLike =
  LexicalElementTransformerLike | LexicalTextMatchTransformerLike;

// Modules

/** `lexical`. */
export interface LexicalCoreLike {
  readonly ElementNode: LexicalKlassLike<LexicalElementInstanceLike>;
  readonly DecoratorNode: LexicalKlassLike<LexicalDecoratorLike>;
  readonly TextNode: LexicalKlassLike<LexicalTextLike>;
  readonly ParagraphNode: LexicalKlassLike<LexicalElementLike>;
  readonly RootNode: LexicalKlassLike<LexicalElementLike>;
  readonly LineBreakNode: LexicalKlassLike;
  readonly TabNode: LexicalKlassLike<LexicalTextLike>;

  defineExtension(extension: LexicalExtensionInitLike): LexicalExtensionLike;
  configExtension(
    extension: LexicalExtensionLike,
    config: Readonly<Record<string, unknown>>,
  ): LexicalExtensionArgumentLike;
  mergeRegister(...func: (() => void)[]): () => void;
  createState<V>(key: string, config: LexicalStateValueConfigLike<V>): LexicalStateConfigLike<V>;
  $getState<V>(
    node: LexicalNodeLike,
    stateConfig: LexicalStateConfigLike<V>,
    version?: 'latest' | 'direct',
  ): V;
  $setState<V>(node: LexicalNodeLike, stateConfig: LexicalStateConfigLike<V>, value: V): unknown;

  $getRoot(): LexicalElementLike;
  $getNodeByKey(key: string): LexicalNodeLike | null;
  $getSelection(): LexicalBaseSelectionLike | null;
  $setSelection(selection: LexicalBaseSelectionLike | null): void;
  $createRangeSelection(): LexicalRangeSelectionLike;
  $createNodeSelection(): LexicalNodeSelectionLike;
  $isRangeSelection(x: unknown): x is LexicalRangeSelectionLike;
  $isNodeSelection(x: unknown): x is LexicalNodeSelectionLike;
  $isElementNode(node: LexicalNodeLike | null | undefined): node is LexicalElementLike;
  $isTextNode(node: LexicalNodeLike | null | undefined): node is LexicalTextLike;
  $isLineBreakNode(node: LexicalNodeLike | null | undefined): boolean;
  $isDecoratorNode(node: LexicalNodeLike | null | undefined): boolean;
  $isParagraphNode(node: LexicalNodeLike | null | undefined): node is LexicalElementLike;
  $isRootNode(node: LexicalNodeLike | null | undefined): node is LexicalElementLike;
  $createParagraphNode(): LexicalElementLike;
  $createTextNode(text?: string): LexicalTextLike;
  $createLineBreakNode(): LexicalNodeLike;
  $parseSerializedNode(serializedNode: LexicalSerializedNodeLike): LexicalNodeLike;
  $getDocument(): Document;
  $getNearestNodeFromDOMNode(startingDOM: Node): LexicalNodeLike | null;
  /**
   * The anchor and focus of a DOM selection resolved through the shadow roots around a root
   * element; the selection itself outside shadow trees.
   */
  getDOMSelectionPoints(
    domSelection: Selection,
    rootElement: HTMLElement | null,
  ): LexicalDomPointsLike;
  /** The range selection of DOM points, as the engine resolves a DOM selection. */
  $createRangeSelectionFromDom(
    domSelection: LexicalDomPointsLike | null,
    editor: LexicalEditorLike,
  ): LexicalRangeSelectionLike | null;

  readonly UNDO_COMMAND: LexicalCommandLike<void>;
  readonly REDO_COMMAND: LexicalCommandLike<void>;
  readonly CLEAR_HISTORY_COMMAND: LexicalCommandLike<void>;
  readonly CAN_UNDO_COMMAND: LexicalCommandLike<boolean>;
  readonly CAN_REDO_COMMAND: LexicalCommandLike<boolean>;
  readonly FOCUS_COMMAND: LexicalCommandLike<FocusEvent>;
  readonly BLUR_COMMAND: LexicalCommandLike<FocusEvent>;
  readonly INSERT_PARAGRAPH_COMMAND: LexicalCommandLike<void>;
  readonly INSERT_LINE_BREAK_COMMAND: LexicalCommandLike<boolean>;
  readonly KEY_DOWN_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_ESCAPE_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_TAB_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_ENTER_COMMAND: LexicalCommandLike<KeyboardEvent | null>;
  readonly KEY_BACKSPACE_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_DELETE_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_ARROW_UP_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_ARROW_DOWN_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_ARROW_LEFT_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly KEY_ARROW_RIGHT_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly FORMAT_TEXT_COMMAND: LexicalCommandLike<string>;
  readonly SELECT_ALL_COMMAND: LexicalCommandLike<KeyboardEvent>;
  readonly COPY_COMMAND: LexicalCommandLike<ClipboardEvent | KeyboardEvent | null>;
  readonly CUT_COMMAND: LexicalCommandLike<ClipboardEvent | KeyboardEvent | null>;
  readonly PASTE_COMMAND: LexicalCommandLike<ClipboardEvent | InputEvent | KeyboardEvent>;
  readonly DELETE_CHARACTER_COMMAND: LexicalCommandLike<boolean>;
  readonly DELETE_WORD_COMMAND: LexicalCommandLike<boolean>;
  readonly DELETE_LINE_COMMAND: LexicalCommandLike<boolean>;
  readonly REMOVE_TEXT_COMMAND: LexicalCommandLike<InputEvent | null>;
  readonly CONTROLLED_TEXT_INSERTION_COMMAND: LexicalCommandLike<InputEvent | string>;
  /** Every `beforeinput` event of the editing root, before the engine's own handling. */
  readonly BEFORE_INPUT_COMMAND: LexicalCommandLike<InputEvent>;
  readonly SELECTION_CHANGE_COMMAND: LexicalCommandLike<void>;
  readonly CLICK_COMMAND: LexicalCommandLike<MouseEvent>;

  /** Adds a tag to the update being run. */
  $addUpdateTag(tag: string): void;
  /** Whether the update being run carries a tag. */
  $hasUpdateTag(tag: string): boolean;
  /** Selects the whole document (the selection argument scopes it; the adapter passes none). */
  $selectAll(selection?: null): LexicalRangeSelectionLike;

  readonly COMMAND_PRIORITY_EDITOR: number;
  readonly COMMAND_PRIORITY_LOW: number;
  readonly COMMAND_PRIORITY_HIGH: number;
  readonly COMMAND_PRIORITY_CRITICAL: number;

  /** The engine's platform flag: its keydown table binds Ctrl+Y to redo only without it. */
  readonly IS_APPLE?: boolean | undefined;

  readonly HISTORY_PUSH_TAG: string;
  readonly HISTORY_MERGE_TAG: string;
  readonly HISTORIC_TAG: string;
  readonly SKIP_SELECTION_FOCUS_TAG: string;
  readonly SKIP_DOM_SELECTION_TAG: string;
}

/** `@lexical/extension`. */
export interface LexicalExtensionModuleLike {
  buildEditorFromExtensions(...extensions: LexicalExtensionArgumentLike[]): LexicalBuiltEditorLike;
  readonly HorizontalRuleExtension: LexicalExtensionLike;
  readonly HorizontalRuleNode: LexicalKlassLike<LexicalDecoratorLike>;
}

/** `@lexical/rich-text`. */
export interface LexicalRichTextLike {
  readonly RichTextExtension: LexicalExtensionLike;
  readonly HeadingNode: LexicalKlassLike<LexicalElementLike>;
  readonly QuoteNode: LexicalKlassLike<LexicalElementLike>;
  $createQuoteNode(): LexicalElementLike;
}

/** `@lexical/history`. */
export interface LexicalHistoryLike {
  readonly HistoryExtension: LexicalExtensionLike;
  /** An empty history, which the history extension takes as its initial history. */
  createEmptyHistoryState(): LexicalHistoryStateLike;
}

/** A history's stacks: each entry holds the committed state that undo or redo restores. */
export interface LexicalHistoryStateLike {
  readonly undoStack: readonly LexicalHistoryEntryLike[];
  readonly redoStack: readonly LexicalHistoryEntryLike[];
}

export interface LexicalHistoryEntryLike {
  readonly editorState: object;
}

/** `@lexical/selection`. */
export interface LexicalSelectionLike {
  /** A DOM range between two engine points; `null` when either has no DOM. */
  createDOMRange(
    editor: LexicalEditorLike,
    anchorNode: LexicalNodeLike,
    anchorOffset: number,
    focusNode: LexicalNodeLike,
    focusOffset: number,
  ): Range | null;
  $setBlocksType(
    selection: LexicalBaseSelectionLike | null,
    $createElement: () => LexicalElementLike,
    $afterCreateElement?: (
      prevNodeSrc: LexicalElementLike,
      newNodeDest: LexicalElementLike,
    ) => void,
  ): void;
}

/** `@lexical/list`. */
export interface LexicalListModuleLike {
  readonly ListExtension: LexicalExtensionLike;
  readonly ListNode: LexicalKlassLike<LexicalListLike>;
  readonly ListItemNode: LexicalKlassLike<LexicalListItemLike>;
}

/** `@lexical/link`. */
export interface LexicalLinkModuleLike {
  readonly LinkExtension: LexicalExtensionLike;
  readonly LinkNode: LexicalKlassLike<LexicalLinkLike>;
  /** Links the selection to a destination with no other attribute, or unlinks it with `null`. */
  $toggleLink(urlOrAttributes: null | { url: string; rel: null; target: null; title: null }): void;
}

/** `@lexical/markdown`; the input rules install its shortcuts. */
export interface LexicalMarkdownLike {
  registerMarkdownShortcuts(
    editor: LexicalEditorLike,
    transformers: LexicalTransformerLike[],
  ): () => void;
}

/** `@lexical/code`. */
export interface LexicalCodeModuleLike {
  readonly CodeExtension: LexicalExtensionLike;
  readonly CodeNode: LexicalKlassLike<LexicalElementLike>;
}

/** `@lexical/a11y`: the live-region owner silences every engine announcer. */
export interface LexicalA11yLike {
  readonly AriaLiveRegionExtension: LexicalExtensionLike;
}

/** `@lexical/html`: the DOM render overrides of `render.ts` (experimental API). */
export interface LexicalHtmlLike {
  readonly DOMRenderExtension: LexicalExtensionLike;
  domOverride(
    nodes: readonly LexicalKlassLike[],
    config: LexicalDomOverrideConfigLike<LexicalNodeLike>,
  ): unknown;
}

/** `@lexical/table`, optional: tables, merging and, with `$moveTableRow`, moves. */
export interface LexicalTableModuleLike {
  readonly TableExtension: LexicalExtensionLike;
  readonly TableNode: LexicalKlassLike<LexicalTableLike>;
  readonly TableRowNode: LexicalKlassLike<LexicalElementLike>;
  readonly TableCellNode: LexicalKlassLike<LexicalTableCellLike>;
  $createTableSelectionFrom(
    tableNode: LexicalTableLike,
    anchorCell: LexicalTableCellLike,
    focusCell: LexicalTableCellLike,
  ): LexicalTableSelectionLike;
  $isTableSelection(x: unknown): x is LexicalTableSelectionLike;
  /** Its presence gives `table.move`; the adapter moves lines through the shared table edits. */
  $moveTableRow?(tableNode: LexicalTableLike, originRow: number, targetRow: number): void;
}

/** The engine modules of `createLexicalEngine` (`uwg-te-par-engine-1`). */
export interface TextEditorLexicalModules {
  readonly lexical: LexicalCoreLike;
  readonly extension: LexicalExtensionModuleLike;
  readonly richText: LexicalRichTextLike;
  readonly history: LexicalHistoryLike;
  readonly selection: LexicalSelectionLike;
  readonly list: LexicalListModuleLike;
  readonly link: LexicalLinkModuleLike;
  readonly markdown: LexicalMarkdownLike;
  readonly code: LexicalCodeModuleLike;
  readonly a11y: LexicalA11yLike;
  readonly html: LexicalHtmlLike;
  /** Tables: `block.table` and `table.merge`, and `table.move` with `$moveTableRow`. */
  readonly table?: LexicalTableModuleLike | undefined;
}

// Probes (`uwg-te-req-engine-1`)

type MemberKind = 'function' | 'object' | 'string' | 'number';

/** The members each module must hold, by the kind of value `typeof` reports. */
const REQUIRED_MEMBERS: {
  readonly [K in keyof TextEditorLexicalModules]-?: readonly (readonly [string, MemberKind])[];
} = {
  lexical: [
    ['ElementNode', 'function'],
    ['DecoratorNode', 'function'],
    ['TextNode', 'function'],
    ['ParagraphNode', 'function'],
    ['RootNode', 'function'],
    ['LineBreakNode', 'function'],
    ['TabNode', 'function'],
    ['defineExtension', 'function'],
    ['configExtension', 'function'],
    ['mergeRegister', 'function'],
    ['createState', 'function'],
    ['$getState', 'function'],
    ['$setState', 'function'],
    ['$getRoot', 'function'],
    ['$getNodeByKey', 'function'],
    ['$getSelection', 'function'],
    ['$setSelection', 'function'],
    ['$createRangeSelection', 'function'],
    ['$createNodeSelection', 'function'],
    ['$parseSerializedNode', 'function'],
    ['$getNearestNodeFromDOMNode', 'function'],
    ['$createRangeSelectionFromDom', 'function'],
    ['getDOMSelectionPoints', 'function'],
    ['UNDO_COMMAND', 'object'],
    ['REDO_COMMAND', 'object'],
    ['CLEAR_HISTORY_COMMAND', 'object'],
    ['CAN_UNDO_COMMAND', 'object'],
    ['CAN_REDO_COMMAND', 'object'],
    ['INSERT_PARAGRAPH_COMMAND', 'object'],
    ['INSERT_LINE_BREAK_COMMAND', 'object'],
    ['KEY_DOWN_COMMAND', 'object'],
    ['KEY_ESCAPE_COMMAND', 'object'],
    ['KEY_TAB_COMMAND', 'object'],
    ['KEY_ENTER_COMMAND', 'object'],
    ['KEY_BACKSPACE_COMMAND', 'object'],
    ['KEY_DELETE_COMMAND', 'object'],
    ['KEY_ARROW_UP_COMMAND', 'object'],
    ['KEY_ARROW_DOWN_COMMAND', 'object'],
    ['KEY_ARROW_LEFT_COMMAND', 'object'],
    ['KEY_ARROW_RIGHT_COMMAND', 'object'],
    ['FORMAT_TEXT_COMMAND', 'object'],
    ['SELECT_ALL_COMMAND', 'object'],
    ['COPY_COMMAND', 'object'],
    ['CUT_COMMAND', 'object'],
    ['PASTE_COMMAND', 'object'],
    ['DELETE_CHARACTER_COMMAND', 'object'],
    ['DELETE_WORD_COMMAND', 'object'],
    ['DELETE_LINE_COMMAND', 'object'],
    ['REMOVE_TEXT_COMMAND', 'object'],
    ['CONTROLLED_TEXT_INSERTION_COMMAND', 'object'],
    ['BEFORE_INPUT_COMMAND', 'object'],
    ['SELECTION_CHANGE_COMMAND', 'object'],
    ['CLICK_COMMAND', 'object'],
    ['$addUpdateTag', 'function'],
    ['$hasUpdateTag', 'function'],
    ['$selectAll', 'function'],
    ['COMMAND_PRIORITY_LOW', 'number'],
    ['COMMAND_PRIORITY_HIGH', 'number'],
    ['COMMAND_PRIORITY_CRITICAL', 'number'],
    ['HISTORY_PUSH_TAG', 'string'],
    ['HISTORY_MERGE_TAG', 'string'],
    ['HISTORIC_TAG', 'string'],
    ['SKIP_SELECTION_FOCUS_TAG', 'string'],
  ],
  extension: [
    ['buildEditorFromExtensions', 'function'],
    ['HorizontalRuleExtension', 'object'],
    ['HorizontalRuleNode', 'function'],
  ],
  richText: [
    ['RichTextExtension', 'object'],
    ['HeadingNode', 'function'],
    ['QuoteNode', 'function'],
  ],
  history: [
    ['HistoryExtension', 'object'],
    ['registerHistory', 'function'],
    ['createEmptyHistoryState', 'function'],
  ],
  selection: [
    ['$setBlocksType', 'function'],
    ['createDOMRange', 'function'],
    ['$isAtNodeEnd', 'function'],
  ],
  list: [
    ['ListExtension', 'object'],
    ['ListNode', 'function'],
    ['ListItemNode', 'function'],
  ],
  link: [
    ['LinkExtension', 'object'],
    ['LinkNode', 'function'],
    ['$toggleLink', 'function'],
  ],
  markdown: [['registerMarkdownShortcuts', 'function']],
  code: [
    ['CodeExtension', 'object'],
    ['CodeNode', 'function'],
  ],
  a11y: [['AriaLiveRegionExtension', 'object']],
  html: [
    ['DOMRenderExtension', 'object'],
    ['domOverride', 'function'],
  ],
  table: [
    ['TableExtension', 'object'],
    ['TableNode', 'function'],
    ['TableRowNode', 'function'],
    ['TableCellNode', 'function'],
    ['$createTableSelectionFrom', 'function'],
    ['$isTableSelection', 'function'],
  ],
};

/** A module as the copy checks read it. */
type ModuleRecord = Readonly<Record<string, unknown>>;

/**
 * A check that ties a module to the `lexical` module: whether the module's classes or
 * registrations are of it, and what fails otherwise.
 */
interface CopyCheck {
  readonly key: keyof TextEditorLexicalModules;
  readonly agrees: (module: ModuleRecord, lexical: ModuleRecord) => boolean;
  readonly problem: string;
}

/** A node class of a module must extend a class of the `lexical` module. */
const nodeClass = (
  key: keyof TextEditorLexicalModules,
  member: string,
  base: 'ElementNode' | 'DecoratorNode',
): CopyCheck => ({
  key,
  agrees: (module, lexical) => {
    const klass = module[member] as { readonly prototype?: unknown } | undefined;
    const Base = lexical[base];
    return (
      isObject(klass?.prototype) &&
      typeof Base === 'function' &&
      klass.prototype instanceof (Base as abstract new () => unknown)
    );
  },
  problem: `its ${member} does not extend the ${base} of the "lexical" module`,
});

/**
 * Whether the history module registers the commands of the `lexical` module: its
 * `registerHistory` run on a recording editor, which registers nothing in any engine.
 */
function historyAgrees(module: ModuleRecord, lexical: ModuleRecord): boolean {
  const commands: unknown[] = [];
  const editor = {
    registerCommand: (command: unknown) => (commands.push(command), () => undefined),
    registerUpdateListener: () => () => undefined,
    dispatchCommand: () => false,
  };
  const create = module['createEmptyHistoryState'] as () => unknown;
  const register = module['registerHistory'] as (
    editor: object,
    state: unknown,
    delay: number,
  ) => () => void;
  register(editor, create(), 0)();
  return commands.includes(lexical['UNDO_COMMAND']);
}

/**
 * Whether the selection module recognizes the element nodes of the `lexical` module: its
 * `$isAtNodeEnd` at offset 0 of an empty element, which a module of another copy refuses.
 */
function selectionAgrees(module: ModuleRecord, lexical: ModuleRecord): boolean {
  const ElementNode = lexical['ElementNode'] as { readonly prototype: object };
  const element = Object.create(ElementNode.prototype, {
    getChildrenSize: { value: () => 0 },
  }) as object;
  const atEnd = module['$isAtNodeEnd'] as (point: object) => boolean;
  return atEnd({ type: 'element', offset: 0, getNode: () => element }) === true;
}

/**
 * The checks that tie each module to the `lexical` module, so that every module comes from one
 * engine copy (`uwg-te-req-engine-1`): element classes extend its `ElementNode` and the divider its
 * `DecoratorNode`; the history registers its commands; the selection helpers recognize its nodes.
 */
const COPY_CHECKS: readonly CopyCheck[] = [
  nodeClass('richText', 'HeadingNode', 'ElementNode'),
  nodeClass('richText', 'QuoteNode', 'ElementNode'),
  nodeClass('list', 'ListNode', 'ElementNode'),
  nodeClass('list', 'ListItemNode', 'ElementNode'),
  nodeClass('link', 'LinkNode', 'ElementNode'),
  nodeClass('code', 'CodeNode', 'ElementNode'),
  nodeClass('extension', 'HorizontalRuleNode', 'DecoratorNode'),
  nodeClass('table', 'TableNode', 'ElementNode'),
  nodeClass('table', 'TableRowNode', 'ElementNode'),
  nodeClass('table', 'TableCellNode', 'ElementNode'),
  {
    key: 'history',
    agrees: historyAgrees,
    problem: 'its registerHistory does not register the commands of the "lexical" module',
  },
  {
    key: 'selection',
    agrees: selectionAgrees,
    problem: 'its $isAtNodeEnd does not recognize the ElementNode of the "lexical" module',
  },
];

/** The import path of each module, for messages. */
export const LEXICAL_MODULE_PATHS: { readonly [K in keyof TextEditorLexicalModules]-?: string } =
  Object.freeze({
    lexical: 'lexical',
    extension: '@lexical/extension',
    richText: '@lexical/rich-text',
    history: '@lexical/history',
    selection: '@lexical/selection',
    list: '@lexical/list',
    link: '@lexical/link',
    markdown: '@lexical/markdown',
    code: '@lexical/code',
    a11y: '@lexical/a11y',
    html: '@lexical/html',
    table: '@lexical/table',
  });

const OPTIONAL_MODULES: ReadonlySet<string> = new Set(['table']);

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

const moduleName = (key: keyof TextEditorLexicalModules): string =>
  `"${key}" (${LEXICAL_MODULE_PATHS[key]})`;

/**
 * Checks the modules before a mount: each required module is present and holds the members the
 * adapter uses, and every module comes from the same engine copy as the `lexical` module
 * (`COPY_CHECKS`). Throws an Error naming the first module that fails, or `lexical` when no module
 * agrees with it; the optional `table` is checked only when given.
 */
export function probeLexicalModules(modules: unknown): asserts modules is TextEditorLexicalModules {
  if (!isObject(modules)) throw new Error('The Lexical engine received no modules object.');
  for (const key of Object.keys(REQUIRED_MEMBERS) as (keyof TextEditorLexicalModules)[]) {
    const module = modules[key];
    if (module === undefined && OPTIONAL_MODULES.has(key)) continue;
    if (!isObject(module))
      throw new Error(`The Lexical module ${moduleName(key)} is missing from the engine modules.`);
    for (const [member, kind] of REQUIRED_MEMBERS[key]) {
      const value = module[member];
      const ok = kind === 'object' ? isObject(value) : typeof value === kind;
      if (!ok)
        throw new Error(
          `The Lexical module ${moduleName(key)} is incompatible: it lacks "${member}".`,
        );
    }
  }
  const lexical = modules['lexical'] as ModuleRecord;
  const checks = COPY_CHECKS.filter(({ key }) => isObject(modules[key]));
  const failed = checks.filter(({ key, agrees }) => {
    try {
      return !agrees(modules[key] as ModuleRecord, lexical);
    } catch {
      return true;
    }
  });
  const [first] = failed;
  if (!first) return;
  // When no module agrees with it, the `lexical` module is the other copy.
  if (failed.length === checks.length)
    throw new Error(
      `The Lexical module ${moduleName('lexical')} comes from another copy than the other modules: none of their classes or registrations is of it.`,
    );
  throw new Error(
    `The Lexical module ${moduleName(first.key)} comes from another copy of "lexical": ${first.problem}.`,
  );
}

/** The engine versions the adapter was verified with. */
export const LEXICAL_VERIFIED_VERSION = /^0\.52\./;

/**
 * The message of the version diagnostic for an editor's reported version, or `null` when the
 * version was verified (`0.52.0+dev.esm` included) or is not reported.
 */
export function lexicalVersionProblem(version: string | undefined): string | null {
  if (version === undefined || LEXICAL_VERIFIED_VERSION.test(version)) return null;
  return `The Lexical engine reports version ${version}; the adapter was verified with 0.52.`;
}
