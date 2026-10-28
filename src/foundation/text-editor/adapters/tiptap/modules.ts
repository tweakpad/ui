/**
 * Engine modules of the Tiptap adapter (Widgets `uwg-te-req-engine-1`, `uwg-te-req-evt-5`).
 *
 * The library imports no engine package: the application passes the modules it imports, and the
 * adapter reaches the engine only through the structural types below, which name the members the
 * adapter uses and nothing else. Their methods use method syntax, so that the real modules, whose
 * signatures are richer, are assignable to them. The probes run when an instance mounts, never
 * when the factory runs: a missing or incompatible module, or modules from two copies of the
 * engine, reject the mount with an error that names the module.
 */

// Document model

/** A node type of the schema. */
export interface TiptapNodeTypeLike {
  readonly name: string;
  readonly isTextblock: boolean;
  readonly isBlock: boolean;
  readonly isInline: boolean;
  readonly isAtom: boolean;
  readonly isLeaf: boolean;
  readonly schema: TiptapSchemaLike;
  readonly spec: object;
  create(
    attrs?: Readonly<Record<string, unknown>> | null,
    content?: TiptapFragmentLike | TiptapNodeLike | readonly TiptapNodeLike[] | null,
    marks?: readonly TiptapMarkLike[] | null,
  ): TiptapNodeLike;
  createAndFill(
    attrs?: Readonly<Record<string, unknown>> | null,
    content?: TiptapFragmentLike | TiptapNodeLike | readonly TiptapNodeLike[] | null,
    marks?: readonly TiptapMarkLike[] | null,
  ): TiptapNodeLike | null;
  validContent(content: TiptapFragmentLike): boolean;
  allowsMarkType(markType: TiptapMarkTypeLike): boolean;
}

/** A mark type of the schema. */
export interface TiptapMarkTypeLike {
  readonly name: string;
  readonly spec: object;
  create(attrs?: Readonly<Record<string, unknown>> | null): TiptapMarkLike;
  isInSet(set: readonly TiptapMarkLike[]): TiptapMarkLike | undefined;
  excludes(other: TiptapMarkTypeLike): boolean;
}

export interface TiptapMarkLike {
  readonly type: TiptapMarkTypeLike;
  readonly attrs: Readonly<Record<string, unknown>>;
  eq(other: TiptapMarkLike): boolean;
  isInSet(set: readonly TiptapMarkLike[]): boolean;
  addToSet(set: readonly TiptapMarkLike[]): readonly TiptapMarkLike[];
  removeFromSet(set: readonly TiptapMarkLike[]): readonly TiptapMarkLike[];
}

export interface TiptapFragmentLike {
  readonly size: number;
  readonly childCount: number;
  readonly firstChild: TiptapNodeLike | null;
  readonly lastChild: TiptapNodeLike | null;
  child(index: number): TiptapNodeLike;
  maybeChild(index: number): TiptapNodeLike | null;
  forEach(f: (node: TiptapNodeLike, offset: number, index: number) => void): void;
}

export interface TiptapSliceLike {
  readonly content: TiptapFragmentLike;
  readonly openStart: number;
  readonly openEnd: number;
  readonly size: number;
}

export interface TiptapNodeLike {
  readonly type: TiptapNodeTypeLike;
  readonly attrs: Readonly<Record<string, unknown>>;
  readonly marks: readonly TiptapMarkLike[];
  readonly content: TiptapFragmentLike;
  readonly text: string | undefined;
  readonly nodeSize: number;
  readonly childCount: number;
  readonly textContent: string;
  readonly firstChild: TiptapNodeLike | null;
  readonly lastChild: TiptapNodeLike | null;
  readonly isText: boolean;
  readonly isTextblock: boolean;
  readonly isBlock: boolean;
  readonly isInline: boolean;
  readonly isAtom: boolean;
  readonly isLeaf: boolean;
  readonly inlineContent: boolean;
  child(index: number): TiptapNodeLike;
  maybeChild(index: number): TiptapNodeLike | null;
  forEach(f: (node: TiptapNodeLike, offset: number, index: number) => void): void;
  descendants(
    f: (
      node: TiptapNodeLike,
      pos: number,
      parent: TiptapNodeLike | null,
      index: number,
    ) => boolean | void,
  ): void;
  nodesBetween(
    from: number,
    to: number,
    f: (
      node: TiptapNodeLike,
      pos: number,
      parent: TiptapNodeLike | null,
      index: number,
    ) => boolean | void,
    startPos?: number,
  ): void;
  nodeAt(pos: number): TiptapNodeLike | null;
  resolve(pos: number): TiptapResolvedPosLike;
  slice(from: number, to?: number, includeParents?: boolean): TiptapSliceLike;
  textBetween(from: number, to: number, blockSeparator?: string | null): string;
  rangeHasMark(from: number, to: number, type: TiptapMarkLike | TiptapMarkTypeLike): boolean;
  copy(content?: TiptapFragmentLike | null): TiptapNodeLike;
  mark(marks: readonly TiptapMarkLike[]): TiptapNodeLike;
  eq(other: TiptapNodeLike): boolean;
  check(): void;
  toJSON(): unknown;
}

export interface TiptapResolvedPosLike {
  readonly pos: number;
  readonly depth: number;
  readonly parentOffset: number;
  readonly parent: TiptapNodeLike;
  readonly doc: TiptapNodeLike;
  readonly textOffset: number;
  readonly nodeAfter: TiptapNodeLike | null;
  readonly nodeBefore: TiptapNodeLike | null;
  node(depth?: number | null): TiptapNodeLike;
  index(depth?: number | null): number;
  indexAfter(depth?: number | null): number;
  start(depth?: number | null): number;
  end(depth?: number | null): number;
  before(depth?: number | null): number;
  after(depth?: number | null): number;
  marks(): readonly TiptapMarkLike[];
  sharedDepth(pos: number): number;
}

export interface TiptapSchemaLike {
  readonly nodes: Readonly<Record<string, TiptapNodeTypeLike>>;
  readonly marks: Readonly<Record<string, TiptapMarkTypeLike>>;
  readonly topNodeType: TiptapNodeTypeLike;
  text(text: string, marks?: readonly TiptapMarkLike[] | null): TiptapNodeLike;
  nodeFromJSON(json: unknown): TiptapNodeLike;
  markFromJSON(json: unknown): TiptapMarkLike;
}

// Transactions and selections

export interface TiptapStepMapLike {
  forEach(f: (oldStart: number, oldEnd: number, newStart: number, newEnd: number) => void): void;
  map(pos: number, assoc?: number): number;
}

export interface TiptapStepLike {
  getMap(): TiptapStepMapLike;
}

/** A position mapping, as selections and bookmarks take it. */
export interface TiptapMappableLike {
  map(pos: number, assoc?: number): number;
}

/** The mapping of a transaction: its step maps in order. */
export interface TiptapMappingLike extends TiptapMappableLike {
  readonly maps: readonly TiptapStepMapLike[];
}

export interface TiptapSelectionRangeLike {
  readonly $from: TiptapResolvedPosLike;
  readonly $to: TiptapResolvedPosLike;
}

export interface TiptapSelectionLike {
  readonly anchor: number;
  readonly head: number;
  readonly from: number;
  readonly to: number;
  readonly empty: boolean;
  readonly $anchor: TiptapResolvedPosLike;
  readonly $head: TiptapResolvedPosLike;
  readonly $from: TiptapResolvedPosLike;
  readonly $to: TiptapResolvedPosLike;
  readonly ranges: readonly TiptapSelectionRangeLike[];
  readonly visible: boolean;
  eq(other: TiptapSelectionLike): boolean;
  map(doc: TiptapNodeLike, mapping: TiptapMappableLike): TiptapSelectionLike;
  content(): TiptapSliceLike;
  toJSON(): unknown;
}

/**
 * A selection class of the state module, such as `TextSelection`, typed as a constructor of its
 * selections so that `instanceof` narrows a selection to them. Its construct signature takes no
 * arguments the adapter could pass, since the classes' own are checked strictly.
 */
export type TiptapSelectionClassLike<S extends TiptapSelectionLike = TiptapSelectionLike> =
  abstract new (...args: never[]) => S;

export interface TiptapTransactionLike {
  readonly doc: TiptapNodeLike;
  readonly before: TiptapNodeLike;
  readonly selection: TiptapSelectionLike;
  readonly storedMarks: readonly TiptapMarkLike[] | null;
  readonly steps: readonly TiptapStepLike[];
  readonly mapping: TiptapMappingLike;
  readonly docChanged: boolean;
  readonly selectionSet: boolean;
  readonly storedMarksSet: boolean;
  readonly time: number;
  insert(
    pos: number,
    content: TiptapFragmentLike | TiptapNodeLike | readonly TiptapNodeLike[],
  ): this;
  delete(from: number, to: number): this;
  replace(from: number, to?: number, slice?: TiptapSliceLike): this;
  replaceWith(
    from: number,
    to: number,
    content: TiptapFragmentLike | TiptapNodeLike | readonly TiptapNodeLike[],
  ): this;
  replaceRange(from: number, to: number, slice: TiptapSliceLike): this;
  deleteRange(from: number, to: number): this;
  insertText(text: string, from?: number, to?: number): this;
  split(
    pos: number,
    depth?: number,
    typesAfter?: readonly ({
      readonly type: TiptapNodeTypeLike;
      readonly attrs?: Readonly<Record<string, unknown>> | null;
    } | null)[],
  ): this;
  addMark(from: number, to: number, mark: TiptapMarkLike): this;
  removeMark(from: number, to: number, mark?: TiptapMarkLike | TiptapMarkTypeLike | null): this;
  setNodeMarkup(
    pos: number,
    type?: TiptapNodeTypeLike | null,
    attrs?: Readonly<Record<string, unknown>> | null,
    marks?: readonly TiptapMarkLike[],
  ): this;
  setNodeAttribute(pos: number, attr: string, value: unknown): this;
  setSelection(selection: TiptapSelectionLike): this;
  setStoredMarks(marks: readonly TiptapMarkLike[] | null): this;
  addStoredMark(mark: TiptapMarkLike): this;
  removeStoredMark(mark: TiptapMarkLike | TiptapMarkTypeLike): this;
  setMeta(key: string | TiptapPluginLike | TiptapPluginKeyLike, value: unknown): this;
  getMeta(key: string | TiptapPluginLike | TiptapPluginKeyLike): unknown;
  scrollIntoView(): this;
  deleteSelection(): this;
  /** Joins the blocks before and after `pos`. */
  join(pos: number, depth?: number): this;
}

export interface TiptapEditorStateLike {
  readonly doc: TiptapNodeLike;
  readonly selection: TiptapSelectionLike;
  readonly storedMarks: readonly TiptapMarkLike[] | null;
  readonly schema: TiptapSchemaLike;
  readonly plugins: readonly TiptapPluginLike[];
  readonly tr: TiptapTransactionLike;
  apply(tr: TiptapTransactionLike): TiptapEditorStateLike;
}

/** The configuration of a new editor state. */
export interface TiptapEditorStateConfigLike {
  readonly schema?: TiptapSchemaLike | undefined;
  readonly doc?: TiptapNodeLike | undefined;
  readonly selection?: TiptapSelectionLike | undefined;
  readonly storedMarks?: readonly TiptapMarkLike[] | null | undefined;
  readonly plugins?: readonly TiptapPluginLike[] | undefined;
}

export interface TiptapPluginLike {
  readonly spec: object;
}

export interface TiptapPluginKeyLike {
  getState(state: TiptapEditorStateLike): unknown;
}

// View and editor

/** The client rectangle of a document position. */
export interface TiptapCoordsLike {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

/** The editor view that the engine keeps over the editing root. */
export interface TiptapViewLike {
  readonly dom: HTMLElement;
  readonly state: TiptapEditorStateLike;
  readonly composing: boolean;
  readonly editable: boolean;
  readonly isDestroyed: boolean;
  dispatch(tr: TiptapTransactionLike): void;
  updateState(state: TiptapEditorStateLike): void;
  setProps(props: object): void;
  focus(): void;
  hasFocus(): boolean;
  domAtPos(pos: number, side?: number): { node: Node; offset: number };
  nodeDOM(pos: number): Node | null;
  posAtDOM(node: Node, offset: number, bias?: number): number;
  posAtCoords(coords: { left: number; top: number }): { pos: number; inside: number } | null;
  coordsAtPos(pos: number, side?: number): TiptapCoordsLike;
}

/** The engine's commands that the adapter's editing keymap runs. */
export interface TiptapCommandsLike {
  splitListItem(typeOrName: string): boolean;
  setHardBreak(): boolean;
  deleteSelection(): boolean;
  joinBackward(): boolean;
  selectNodeBackward(): boolean;
  deleteCurrentNode(): boolean;
  joinForward(): boolean;
  selectNodeForward(): boolean;
  createParagraphNear(): boolean;
  liftEmptyBlock(): boolean;
  splitBlock(): boolean;
  selectAll(): boolean;
  selectTextblockStart(): boolean;
  selectTextblockEnd(): boolean;
}

/** The editor that an extension's keyboard shortcuts receive as `this.editor`. */
export interface TiptapCommandEditorLike {
  readonly view: TiptapViewLike;
  readonly commands: TiptapCommandsLike;
}

export interface TiptapEditorLike {
  readonly state: TiptapEditorStateLike;
  readonly view: TiptapViewLike;
  readonly schema: TiptapSchemaLike;
  readonly isDestroyed: boolean;
  readonly isEditable: boolean;
  readonly extensionManager: { readonly plugins: readonly TiptapPluginLike[] };
  getJSON(): unknown;
  setEditable(editable: boolean, emitUpdate?: boolean): void;
  destroy(): void;
}

/** The editor class: the options are the adapter's `TiptapEditorOptions`. */
export interface TiptapEditorConstructorLike {
  readonly prototype: object;
  new (options: object): TiptapEditorLike;
}

/** An extension, node or mark of the engine, or a configured or extended copy. */
export interface TiptapExtensionLike {
  readonly name: string;
  readonly type: string;
  configure(options?: object): TiptapExtensionLike;
  extend(config?: object): TiptapExtensionLike;
}

export interface TiptapExtensionFactoryLike {
  create(config?: object): TiptapExtensionLike;
}

// Modules

/** `@tiptap/core`. */
export interface TiptapCoreLike {
  readonly Editor: TiptapEditorConstructorLike;
  readonly Extension: TiptapExtensionFactoryLike;
  readonly Node: TiptapExtensionFactoryLike;
  readonly Mark: TiptapExtensionFactoryLike;
  /** The decorations that extensions build in `addDecorations` (core 3.32 and later). */
  readonly Decoration?: TiptapDecorationFactoryLike | undefined;
  /** The platform tests of the engine's own keymap. */
  isMacOS(): boolean;
  isiOS(): boolean;
  /** Whether a value is a node selection of the engine's own state module (the copy probe). */
  isNodeSelection(value: unknown): boolean;
}

/** The factories of the engine's extension decorations. */
export interface TiptapDecorationFactoryLike {
  /** A decoration of the node from `pos` to `to`, its attributes written on the node's element. */
  Node(
    pos: number,
    to: number,
    attrs?: Readonly<Record<string, string>>,
    spec?: Record<string, unknown>,
  ): object;
}

/** `@tiptap/pm/state`. */
export interface TiptapStateLike {
  readonly EditorState: {
    create(config: TiptapEditorStateConfigLike): TiptapEditorStateLike;
  };
  readonly Selection: TiptapSelectionClassLike & {
    near(pos: TiptapResolvedPosLike, bias?: number): TiptapSelectionLike;
    atStart(doc: TiptapNodeLike): TiptapSelectionLike;
    atEnd(doc: TiptapNodeLike): TiptapSelectionLike;
    findFrom(
      pos: TiptapResolvedPosLike,
      dir: number,
      textOnly?: boolean,
    ): TiptapSelectionLike | null;
    jsonID(id: string, selectionClass: object): unknown;
  };
  readonly TextSelection: TiptapSelectionClassLike & {
    create(doc: TiptapNodeLike, anchor: number, head?: number): TiptapSelectionLike;
    between(
      anchor: TiptapResolvedPosLike,
      head: TiptapResolvedPosLike,
      bias?: number,
    ): TiptapSelectionLike;
  };
  readonly NodeSelection: TiptapSelectionClassLike & {
    create(doc: TiptapNodeLike, from: number): TiptapSelectionLike;
  };
  readonly AllSelection: TiptapSelectionClassLike;
  /** Construct signatures are checked strictly, so the parameters are cast where it is called. */
  readonly SelectionRange: abstract new (...args: never[]) => TiptapSelectionRangeLike;
  readonly Plugin: new (spec: object) => TiptapPluginLike;
  readonly PluginKey: new (name?: string) => TiptapPluginKeyLike;
}

/** `@tiptap/pm/history`. */
export interface TiptapHistoryLike {
  history(config?: { depth?: number; newGroupDelay?: number }): TiptapPluginLike;
  closeHistory(tr: TiptapTransactionLike): TiptapTransactionLike;
  undo(state: TiptapEditorStateLike, dispatch?: (tr: TiptapTransactionLike) => void): boolean;
  redo(state: TiptapEditorStateLike, dispatch?: (tr: TiptapTransactionLike) => void): boolean;
  undoDepth(state: TiptapEditorStateLike): number;
  redoDepth(state: TiptapEditorStateLike): number;
  /** Whether a transaction is an undo or a redo of the history. */
  isHistoryTransaction(tr: TiptapTransactionLike): boolean;
}

/** `@tiptap/starter-kit`. */
export interface TiptapStarterKitLike {
  readonly StarterKit: TiptapExtensionLike;
}

/** `@tiptap/extension-list`. */
export interface TiptapListLike {
  readonly BulletList: TiptapExtensionLike;
  readonly OrderedList: TiptapExtensionLike;
  readonly ListItem: TiptapExtensionLike;
  readonly TaskList: TiptapExtensionLike;
  readonly TaskItem: TiptapExtensionLike;
}

/** The view of a table node: its scroll wrapper, table, column group and content elements. */
export interface TiptapTableViewLike {
  readonly dom: HTMLElement;
  readonly table: HTMLTableElement;
  readonly colgroup: HTMLTableColElement;
  readonly contentDOM: HTMLElement;
}

/** `@tiptap/extension-table`. */
export interface TiptapTableLike {
  readonly Table: TiptapExtensionLike;
  readonly TableRow: TiptapExtensionLike;
  readonly TableCell: TiptapExtensionLike;
  readonly TableHeader: TiptapExtensionLike;
  /** Construct signatures are checked strictly, so the parameters are cast where it is extended. */
  readonly TableView: abstract new (...args: never[]) => TiptapTableViewLike;
}

/** A rectangle of table positions: rows `top` to `bottom`, columns `left` to `right`, exclusive ends. */
export interface TiptapTableRectLike {
  readonly left: number;
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
}

/** The position grid of a table node. */
export interface TiptapTableMapLike {
  readonly width: number;
  readonly height: number;
  readonly map: readonly number[];
  findCell(pos: number): TiptapTableRectLike;
}

export interface TiptapCellSelectionLike extends TiptapSelectionLike {
  readonly $anchorCell: TiptapResolvedPosLike;
  readonly $headCell: TiptapResolvedPosLike;
  forEachCell(f: (node: TiptapNodeLike, pos: number) => void): void;
}

/** `@tiptap/pm/tables`. */
export interface TiptapTablesLike {
  readonly TableMap: { get(table: TiptapNodeLike): TiptapTableMapLike };
  readonly CellSelection: TiptapSelectionClassLike<TiptapCellSelectionLike> & {
    create(doc: TiptapNodeLike, anchorCell: number, headCell?: number): TiptapCellSelectionLike;
  };
  /** Present from the engine version that moves rows and columns, which `table.move` needs. */
  readonly moveTableRow?: unknown;
}

/**
 * The engine modules that `createTiptapEngine` takes: `core` is `@tiptap/core`, `state`
 * `@tiptap/pm/state`, `history` `@tiptap/pm/history`, `starterKit` `@tiptap/starter-kit` and
 * `list` `@tiptap/extension-list`; tables need both `table`, `@tiptap/extension-table`, and
 * `tables`, `@tiptap/pm/tables`.
 */
export interface TextEditorTiptapModules {
  readonly core: TiptapCoreLike;
  readonly state: TiptapStateLike;
  readonly history: TiptapHistoryLike;
  readonly starterKit: TiptapStarterKitLike;
  readonly list: TiptapListLike;
  readonly table?: TiptapTableLike | undefined;
  readonly tables?: TiptapTablesLike | undefined;
}

/** The package of each module, as errors name it. */
export const TIPTAP_MODULE_PACKAGES = Object.freeze({
  core: '@tiptap/core',
  state: '@tiptap/pm/state',
  history: '@tiptap/pm/history',
  starterKit: '@tiptap/starter-kit',
  list: '@tiptap/extension-list',
  table: '@tiptap/extension-table',
  tables: '@tiptap/pm/tables',
} satisfies Record<keyof TextEditorTiptapModules, string>);

type ModuleName = keyof typeof TIPTAP_MODULE_PACKAGES;

const isObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  (typeof value === 'object' || typeof value === 'function') && value !== null;

const isFunction = (value: unknown): boolean => typeof value === 'function';

/** Whether the modules carry both table modules, which tables need. */
export function hasTiptapTables(
  modules: TextEditorTiptapModules,
): modules is TextEditorTiptapModules & {
  readonly table: TiptapTableLike;
  readonly tables: TiptapTablesLike;
} {
  return isObject(modules.table) && isObject(modules.tables);
}

const moduleError = (name: ModuleName, problem: string): Error =>
  new Error(`The Tiptap engine module "${name}" (${TIPTAP_MODULE_PACKAGES[name]}) ${problem}.`);

/** Each required member of a module, by module. */
const REQUIRED_MEMBERS: Readonly<
  Record<Exclude<ModuleName, 'table' | 'tables'>, readonly string[]>
> = {
  core: ['Editor', 'Extension', 'Node', 'Mark', 'isMacOS', 'isiOS', 'isNodeSelection'],
  state: [
    'EditorState',
    'Selection',
    'TextSelection',
    'NodeSelection',
    'AllSelection',
    'SelectionRange',
    'Plugin',
    'PluginKey',
  ],
  history: [
    'history',
    'closeHistory',
    'undo',
    'redo',
    'undoDepth',
    'redoDepth',
    'isHistoryTransaction',
  ],
  starterKit: ['StarterKit'],
  list: ['BulletList', 'OrderedList', 'ListItem', 'TaskList', 'TaskItem'],
};

const TABLE_MEMBERS: readonly string[] = ['Table', 'TableRow', 'TableCell', 'TableHeader'];
const TABLES_MEMBERS: readonly string[] = ['TableMap', 'CellSelection'];

function missingMember(module: unknown, members: readonly string[]): string | null {
  if (!isObject(module)) return '';
  for (const member of members) if (module[member] === undefined) return member;
  return null;
}

const COPY_PROBLEM = 'comes from another copy of the engine than the other modules';

/**
 * Whether a value is an instance of a class of the engine modules, such as a selection of the
 * state module's `TextSelection`, whatever the value's or the class's type. It answers a plain
 * boolean: the selection classes share one structural selection type, so `instanceof` would narrow
 * the other branch to nothing. A class that is no function, as in a broken module, holds no value.
 */
export const isInstance = (value: unknown, Class: unknown): boolean =>
  isFunction(Class) && value instanceof (Class as abstract new () => unknown);

/**
 * The module that comes from another copy of the engine, as the error that rejects a mount, or
 * `null` (`uwg-te-req-engine-1`). Each other module is checked against the classes of `state`:
 * the editor of `core` recognizes its node selections, the plugin of `history` is one of its
 * plugins, and the cell selection of `tables` extends its selection; and against the classes of
 * `core`: the StarterKit of `starterKit` is one of its extensions, and the nodes of `list` and of
 * `table` are its nodes. When no check against `state` agrees, `state` is the other copy;
 * otherwise the first module that disagrees is.
 */
function copyProblem(modules: Readonly<Record<string, unknown>>): Error | null {
  const core = modules.core as Readonly<Record<string, unknown>>;
  const state = modules.state as Readonly<Record<string, unknown>>;
  const history = modules.history as Readonly<Record<string, unknown>>;
  const nodeSelection = state.NodeSelection as { readonly prototype?: unknown } | undefined;
  const withTables = isObject(modules.table) && isObject(modules.tables);
  /** Whether each named member of a module is a node of `core`. */
  const coreNodes = (module: unknown, members: readonly string[]) => () =>
    isObject(module) && members.every((member) => isInstance(module[member], core.Node));
  const ofState: [ModuleName, () => boolean][] = [
    [
      'core',
      () =>
        isObject(nodeSelection?.prototype) &&
        (core.isNodeSelection as (value: unknown) => boolean)(
          Object.create(nodeSelection.prototype as object),
        ) === true,
    ],
    ['history', () => isInstance((history.history as () => unknown)(), state.Plugin)],
  ];
  const ofCore: [ModuleName, () => boolean][] = [
    [
      'starterKit',
      () =>
        isObject(modules.starterKit) && isInstance(modules.starterKit.StarterKit, core.Extension),
    ],
    ['list', coreNodes(modules.list, REQUIRED_MEMBERS.list)],
  ];
  if (withTables) {
    const cells = (modules.tables as Readonly<Record<string, unknown>>).CellSelection as {
      readonly prototype?: unknown;
    };
    ofState.push([
      'tables',
      () => isFunction(cells) && isInstance(cells.prototype, state.Selection),
    ]);
    ofCore.push(['table', coreNodes(modules.table, TABLE_MEMBERS)]);
  }
  const disagree = (checks: readonly [ModuleName, () => boolean][]) =>
    checks
      .filter(([, agrees]) => {
        try {
          return !agrees();
        } catch {
          return true;
        }
      })
      .map(([name]) => name);
  const odd = disagree(ofState);
  if (odd.length === ofState.length) return moduleError('state', COPY_PROBLEM);
  const first = [...odd, ...disagree(ofCore)][0];
  return first === undefined ? null : moduleError(first, COPY_PROBLEM);
}

/**
 * The problem of the modules, as the error that rejects a mount, or `null` when they are usable:
 * each required module present with the members the adapter uses; `core` of the engine version
 * whose editor mounts on an element (`Editor.prototype.mount`); a `history` with `closeHistory`;
 * with tables, a `table` with its `TableView`; and every module of one copy of the engine.
 */
export function probeTiptapModules(modules: unknown): Error | null {
  if (!isObject(modules)) return moduleError('core', 'is missing');
  for (const name of Object.keys(REQUIRED_MEMBERS) as (keyof typeof REQUIRED_MEMBERS)[]) {
    const module = modules[name];
    if (!isObject(module)) return moduleError(name, 'is missing');
    const missing = missingMember(module, REQUIRED_MEMBERS[name]);
    if (missing) return moduleError(name, `has no "${missing}"`);
  }
  const core = modules.core as Readonly<Record<string, unknown>>;
  const editor = core.Editor as { readonly prototype?: unknown } | undefined;
  if (!isFunction(editor) || !isObject(editor?.prototype) || !('mount' in editor.prototype))
    return moduleError('core', 'is not a supported version: its editor cannot mount on an element');
  const history = modules.history as Readonly<Record<string, unknown>>;
  if (!isFunction(history.closeHistory))
    return moduleError('history', 'is not a supported version: it has no closeHistory');
  const { table, tables } = modules;
  if (isObject(table) && isObject(tables)) {
    const tableMissing = missingMember(table, TABLE_MEMBERS);
    if (tableMissing) return moduleError('table', `has no "${tableMissing}"`);
    if (!isFunction(table.TableView))
      return moduleError('table', 'is not a supported version: it has no TableView');
    const tablesMissing = missingMember(tables, TABLES_MEMBERS);
    if (tablesMissing) return moduleError('tables', `has no "${tablesMissing}"`);
  }
  return copyProblem(modules);
}

/**
 * The problem of a constructed editor: its state must hold a selection of the `state` module,
 * which an editor of another copy of the engine fails (`uwg-te-req-engine-1`).
 */
export function editorCopyProblem(
  modules: Pick<TextEditorTiptapModules, 'state'>,
  editor: Pick<TiptapEditorLike, 'state'>,
): Error | null {
  return isInstance(editor.state.selection, modules.state.Selection)
    ? null
    : moduleError('core', COPY_PROBLEM);
}
