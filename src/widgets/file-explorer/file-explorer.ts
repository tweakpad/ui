import { html, nothing, render, type PropertyValues, type TemplateResult } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { defaultTrue } from '../../foundation/converters.js';
import { type Draggable, Droppable } from '../../foundation/drag-drop/entities.js';
import { DragDropManager } from '../../foundation/drag-drop/manager.js';
import { DistanceConstraint } from '../../foundation/drag-drop/sensors/activation.js';
import { PointerSensor } from '../../foundation/drag-drop/sensors/pointer.js';
import type { DragEvent as DropEvent } from '../../foundation/drag-drop/types.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import {
  createFilePipeline,
  FileOperationError,
  type FilePipeline,
} from '../../foundation/file-explorer/pipeline.js';
import { defaultFileLayers } from '../../foundation/file-explorer/layers.js';
import type {
  FileEntry,
  FileLayer,
  FileSearchHit,
  FileSearchScope,
  FileSource,
} from '../../foundation/file-explorer/types.js';
import { formatBytes } from '../../foundation/format-bytes.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { renderHighlighted } from '../../foundation/search/highlight.js';
import { resolveLocale } from '../../foundation/services.js';
import { normalizeIds } from '../../foundation/tree/selection.js';
import type { ChangeReason } from '../../foundation/types.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { folderIcon } from '../../icons/folder.js';
import {
  layoutColumnsIcon,
  layoutGalleryIcon,
  layoutGridIcon,
  layoutListIcon,
  layoutRowsIcon,
} from '../../icons/files.js';
import { navigationIcons } from '../../icons/navigation.js';
import type { IconDefinition } from '../../icons/types.js';
import { fileExplorerPresentation } from '../../presentation/families/file-explorer.js';
import { TpBreadcrumb } from '../../components/breadcrumb/breadcrumb.js';
import { TpBadge } from '../../components/badge/badge.js';
import { TpButton } from '../../components/button/button.js';
import { TpDataView } from '../../components/data-view/data-view.js';
import type {
  DataViewColumn,
  DataViewDragAndDrop,
  DataViewFocusDetail,
  DataViewMiddleware,
  DataViewSort,
  DataViewTileContext,
} from '../../components/data-view/types.js';
import { TpDescriptionList } from '../../components/description-list/description-list.js';
import { TpDescriptionListItem } from '../../components/description-list/description-list-item.js';
import { TpEmptyState } from '../../components/empty-state/empty-state.js';
import { TpIcon } from '../../components/icon/icon.js';
import { TpImage } from '../../components/image/image.js';
import { TpInput } from '../../components/input/input.js';
import { TpInputGroup } from '../../components/input-group/input-group.js';
import { TpProgress } from '../../components/progress/progress.js';
import { TpResizableHandle } from '../../components/resizable-panel-group/handle.js';
import { TpResizablePanel } from '../../components/resizable-panel-group/panel.js';
import { TpResizablePanelGroup } from '../../components/resizable-panel-group/group.js';
import { TpScrollArea } from '../../components/scroll-area/scroll-area.js';
import { TpSkeleton } from '../../components/skeleton/skeleton.js';
import { TpSpinner } from '../../components/spinner/spinner.js';
import { TpTime } from '../../components/time/time.js';
import { TpToggle } from '../../components/toggle/toggle.js';
import { TpToggleGroup } from '../../components/toggle-group/toggle-group.js';
import { TpTreeView } from '../../components/tree-view/tree-view.js';
import type { TreeViewDragAndDrop } from '../../components/tree-view/types.js';
import { BUILT_IN_COLUMNS, builtInColumns, kindText } from './columns.js';
import { fileIconOf } from './icons.js';
import { resolveFileExplorerMessages } from './strings.js';
import { fileExplorerStyles } from './styles.js';
import type {
  FileExplorerChangeCallback,
  FileExplorerColumn,
  FileExplorerErrorDetail,
  FileExplorerMessages,
  FileExplorerMiddleware,
  FileExplorerOpenDetail,
  FileExplorerOperation,
  FileExplorerOperationDetail,
  FileExplorerSort,
  FileExplorerView,
} from './types.js';

const VIEWS: readonly FileExplorerView[] = ['details', 'compact', 'icons', 'gallery', 'columns'];
const OPERATIONS: readonly FileExplorerOperation[] = [
  'rename',
  'move',
  'create',
  'delete',
  'upload',
];
const VIEW_ICONS: Readonly<Record<FileExplorerView, IconDefinition>> = {
  details: layoutListIcon,
  compact: layoutRowsIcon,
  icons: layoutGridIcon,
  gallery: layoutGalleryIcon,
  columns: layoutColumnsIcon,
};
/** The columns fill the scroll area's height, which scrolls them sideways. */
const COLUMNS_CONTENT = { 'scroll-area-content': { styleHook: { 'block-size': '100%' } } };
/** The tree's id for the top folder, which has no id when it is the source's root. */
/** Disabled entries show and open, but are never selected. */
const selectable = (entry: FileEntry): boolean => !entry.disabled;

const ROOT = '\u0000root';
const NESTED_EVENT_TYPES = [
  'tp-value-change',
  'tp-value-commit',
  'tp-sort-change',
  'tp-expanded-change',
  'tp-row-activate',
  'tp-retry',
  'tp-action',
  'tp-loading-status-change',
  'tp-layout-change',
  'tp-layout-change-complete',
];

const idListConverter = {
  fromAttribute: (value: string | null) => (value === null ? undefined : normalizeIds(value)),
  toAttribute: (value: readonly string[] | undefined) =>
    value === undefined ? null : JSON.stringify(value),
};
const wordList = <T extends string>(allowed: readonly T[]) => ({
  fromAttribute: (value: string | null): T[] | undefined =>
    value === null
      ? undefined
      : (value
          .split(/[\s,]+/)
          .filter((word) => (allowed as readonly string[]).includes(word)) as T[]),
  toAttribute: (value: readonly T[] | undefined) => (value === undefined ? null : value.join(' ')),
});
const sortConverter = {
  fromAttribute(value: string | null): DataViewSort | null {
    if (!value?.trim()) return null;
    const [column, direction] = value.trim().split(':');
    return column
      ? { column, direction: direction === 'descending' ? 'descending' : 'ascending' }
      : null;
  },
  toAttribute: (value: DataViewSort | null) =>
    value ? `${value.column}:${value.direction}` : null,
};

/** A folder's listing as the explorer shows it. */
interface Listing {
  status: 'loading' | 'ready' | 'error';
  entries: readonly FileEntry[];
  error: string | null;
  controller: AbortController | null;
}

/** A tree record for a folder. */
interface FolderRecord {
  readonly id: string;
  readonly label: string;
  readonly hasChildren: boolean;
  readonly children?: readonly FolderRecord[] | null;
  readonly entry: FileEntry | null;
}

/**
 * Files and folders from any source, as an operating system shows them: a folder tree beside the
 * open folder, shown as details, a compact list, icons, a gallery or columns, with a path, fuzzy
 * search, sorting, configurable columns, selection with a status bar and a details pane. The data
 * comes from a `source` through a pipeline of layers (cache, lazy metadata, client search, sort)
 * that the application can replace or extend; the explorer proposes renames, moves, new folders,
 * deletions and uploads, and the source performs them.
 *
 * @summary A file and folder explorer over an application-owned source.
 * @slot toolbar-start - Controls before the path, such as a back button.
 * @slot toolbar-end - Application actions after the view switcher, such as New folder or Upload.
 * @slot sidebar-start - Content above the folder tree, such as shortcuts.
 * @slot sidebar-end - Content below the folder tree, such as a storage meter.
 * @slot details-actions - Actions in the details pane for the selected entry.
 * @fires tp-folder-change - A cancelable proposal of the open folder (`null` for the root).
 * @fires tp-value-change - A cancelable proposal of the selected entry ids; `metadata.entries` holds them.
 * @fires tp-view-change - A cancelable proposal of the view.
 * @fires tp-sort-change - A cancelable proposal of the sort.
 * @fires tp-open - A file was opened with Enter or a double click; `detail.entry` is the file.
 * @fires tp-query-change - The search text changed; `detail.value` is the query.
 * @fires tp-rename - A cancelable proposal to rename an entry; `detail.name` is the new name.
 * @fires tp-move - A cancelable proposal to move entries; `detail.to` is the destination folder.
 * @fires tp-create-folder - A cancelable proposal of a new folder; `detail.name` is its name.
 * @fires tp-delete - A cancelable proposal to delete entries; confirming belongs to the application.
 * @fires tp-upload - A cancelable proposal to add files; `detail.files` are the files.
 * @fires tp-operation-error - An operation failed; `detail.message` shows in the status bar.
 * @csspart file-explorer - The root.
 * @csspart file-explorer-toolbar - The row with the path, the search field and the view switcher.
 * @csspart file-explorer-sidebar - The folder tree's panel.
 * @csspart file-explorer-main - The open folder's panel.
 * @csspart file-explorer-details - The details pane.
 * @csspart file-explorer-status - The status bar.
 * @csspart file-explorer-match - A matched run of a name in search results.
 * @csspart file-explorer-view - The Data view that lists the open folder.
 * @csspart file-explorer-column - One folder's Data view in the columns view.
 * @csspart file-explorer-columns - The scrolling row of the columns view.
 * @csspart file-explorer-drag-preview - The chip under the pointer while entries are dragged.
 * @csspart file-explorer-tile-media - A tile's icon or preview, in the icons and gallery views.
 * @cssprop --tp-file-explorer-tile-size - The least width of a tile in the icons view.
 * @cssprop --tp-file-explorer-gallery-tile-size - The least width of a tile in the gallery view.
 */
export class TpFileExplorer extends TpElement {
  static tagName = 'tp-file-explorer';
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [
      TpBreadcrumb,
      TpBadge,
      TpButton,
      TpDataView,
      TpDescriptionList,
      TpDescriptionListItem,
      TpEmptyState,
      TpIcon,
      TpImage,
      TpInput,
      TpInputGroup,
      TpProgress,
      TpResizableHandle,
      TpResizablePanel,
      TpResizablePanelGroup,
      TpScrollArea,
      TpSkeleton,
      TpSpinner,
      TpTime,
      TpToggle,
      TpToggleGroup,
      TpTreeView,
    ] as unknown as readonly CustomElementConstructorWithTag[];
  }
  static override presentation = fileExplorerPresentation;
  static override properties = {
    ...TpElement.properties,
    source: { attribute: false },
    layers: { attribute: false },
    columns: { attribute: false },
    middleware: { attribute: false },
    messages: { attribute: false },
    folder: { noAccessor: true },
    defaultFolder: { attribute: 'default-folder' },
    root: { type: String },
    value: { noAccessor: true, converter: idListConverter },
    defaultValue: { attribute: 'default-value', converter: idListConverter },
    view: { noAccessor: true },
    defaultView: { attribute: 'default-view' },
    views: { converter: wordList(VIEWS) },
    sort: { noAccessor: true, converter: sortConverter },
    defaultSort: { attribute: 'default-sort', converter: sortConverter },
    visibleColumns: { attribute: 'visible-columns', converter: wordList<string>([]) },
    operations: { converter: wordList(OPERATIONS) },
    selectionMode: { type: String, attribute: 'selection-mode' },
    searchScope: { type: String, attribute: 'search-scope' },
    sidebar: { type: Boolean, converter: defaultTrue },
    search: { type: Boolean, converter: defaultTrue },
    statusBar: { type: Boolean, attribute: 'status-bar', converter: defaultTrue },
    details: { type: Boolean, reflect: true },
    showHidden: { type: Boolean, attribute: 'show-hidden' },
    label: { type: String },
  };
  static override styles = [TpElement.styles, fileExplorerStyles];

  /** Where entries come from; see `FileSource`. */
  source: FileSource | undefined;
  /** The layers in front of the source, outermost first; the built-in four by default. */
  layers: readonly FileLayer[] | undefined;
  /** Application columns after the built-in name, size, modified and kind columns. */
  columns: readonly FileExplorerColumn[] = [];
  /** Rendering layers for the views' cells, text and tiles; see Data view `middleware`. */
  middleware: readonly FileExplorerMiddleware[] = [];
  /** User-facing text; English by default. */
  messages: Partial<FileExplorerMessages> | undefined;
  /** The folder an uncontrolled explorer opens first; `root` by default. */
  defaultFolder: string | null | undefined;
  /** The top folder: navigation never leaves it. The source's root by default. */
  root: string | null = null;
  /** The entry ids an uncontrolled explorer starts with selected. */
  defaultValue: readonly string[] | undefined;
  /** The view an uncontrolled explorer starts with; the first of `views` by default. */
  defaultView: FileExplorerView | undefined;
  /** The views the switcher offers; every view by default, and none shows for a single view. */
  views: readonly FileExplorerView[] = VIEWS;
  /** The sort an uncontrolled explorer starts with: `column` or `column:descending`; name order by default. */
  defaultSort: FileExplorerSort | null = null;
  /** The columns the details view shows, by id; the name always shows. Every column by default. */
  visibleColumns: readonly string[] | undefined;
  /** The changes the explorer proposes, when the source implements them; all by default. */
  operations: readonly FileExplorerOperation[] = OPERATIONS;
  /** Whether entries can be selected: none, one, or several. */
  selectionMode: 'none' | 'single' | 'multiple' = 'multiple';
  /** Where a search looks: the open folder, its subtree, or everywhere under `root`. */
  searchScope: FileSearchScope = 'subtree';
  /** The folder tree beside the view; `sidebar="false"` hides it. */
  sidebar = true;
  /** The search field; `search="false"` hides it. */
  search = true;
  /** The status bar; `status-bar="false"` hides it. */
  statusBar = true;
  /** The details pane for the selection. */
  details = false;
  /** Shows entries marked hidden. */
  showHidden = false;
  /** The explorer's accessible name; `Files` by default. */
  label = '';
  /** Receives each proposed folder before it opens. */
  onFolderChange: FileExplorerChangeCallback<string | null> | undefined;
  /** Receives each proposed selection before it commits. */
  onValueChange: FileExplorerChangeCallback<readonly string[]> | undefined;
  /** Receives each proposed view before it shows. */
  onViewChange: FileExplorerChangeCallback<FileExplorerView> | undefined;
  /** Receives each proposed sort before it applies. */
  onSortChange: FileExplorerChangeCallback<FileExplorerSort | null> | undefined;

  #providedFolder: string | null | undefined;
  #providedValue: readonly string[] | undefined;
  #providedView: FileExplorerView | undefined;
  #providedSort: FileExplorerSort | null | undefined;
  #pipeline: FilePipeline | null = null;
  #pipelineKey: unknown[] = [];
  /** Every entry seen, by id. */
  readonly #known = new Map<string, FileEntry>();
  /** Listings by folder key. */
  readonly #listings = new Map<string, Listing>();
  /** Lazy metadata by entry id. */
  readonly #metadata = new Map<string, Record<string, unknown>>();
  readonly #metadataQueue = new Map<string, Set<string>>();
  readonly #metadataAsked = new Set<string>();
  #expanded: readonly string[] = [ROOT];
  #query = '';
  #search: {
    status: 'idle' | 'searching' | 'ready' | 'error';
    hits: readonly FileSearchHit[];
    partial: boolean;
    error: string | null;
    controller: AbortController | null;
    timer: ReturnType<typeof setTimeout> | undefined;
  } = { status: 'idle', hits: [], partial: false, error: null, controller: null, timer: undefined };
  #statusMessage = '';
  /** The entry being renamed, its draft name and an error from the last attempt. */
  #renaming: { id: string; draft: string; error: string | null; busy: boolean } | null = null;
  /** Entries cut with Ctrl or Cmd+X, moved by the next paste. */
  #clipboard: readonly string[] = [];
  /** Files uploading, with their progress. */
  #uploads: { name: string; loaded: number; total: number }[] | null = null;
  /** The folder an operating system drag would drop into, while one is over the explorer. */
  #nativeTarget: string | null | undefined;
  #manager: DragDropManager | null = null;
  /** The pipeline whose listings the views show. */
  #sourceListed: FilePipeline | null = null;
  #announcer: LiveAnnouncer | undefined;

  readonly #folderState = new ControllableState<string | null>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedFolder,
    readDefaultValue: () => this.defaultFolder ?? this.root ?? null,
    hasDefaultValue: () => this.defaultFolder !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-folder-change'),
    onCommit: (value, previous) => {
      this.#inspected = null;
      this.requestUpdate('folder', previous);
      this.#openListing(value);
    },
    onChange: (event) => this.onFolderChange?.(event),
    diagnostic: (message) => this.diagnose('folder', message, { once: true }),
  });

  readonly #valueState = new ControllableState<readonly string[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : normalizeIds(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: orderedValuesEqual,
    onCommit: (_value, previous) => this.requestUpdate('value', previous),
    onChange: (event) => this.onValueChange?.(event),
    diagnostic: (message) => this.diagnose('value', message, { once: true }),
  });

  readonly #viewState = new ControllableState<FileExplorerView>({
    host: this,
    initialValue: 'details',
    readControlledValue: () => this.#providedView,
    readDefaultValue: () => this.defaultView ?? this.views[0] ?? 'details',
    hasDefaultValue: () => this.defaultView !== undefined,
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-view-change'),
    onCommit: (_value, previous) => this.requestUpdate('view', previous),
    onChange: (event) => this.onViewChange?.(event),
    diagnostic: (message) => this.diagnose('view', message, { once: true }),
  });

  readonly #sortState = new ControllableState<FileExplorerSort | null>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedSort,
    readDefaultValue: () => this.defaultSort,
    hasDefaultValue: () => this.defaultSort !== null,
    equals: (a, b) =>
      a === b || (!!a && !!b && a.column === b.column && a.direction === b.direction),
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-sort-change'),
    onCommit: (_value, previous) => {
      this.requestUpdate('sort', previous);
      this.#openListing(this.folder);
    },
    onChange: (event) => this.onSortChange?.(event),
    diagnostic: (message) => this.diagnose('sort', message, { once: true }),
  });

  constructor() {
    super();
    // Constituent events stop at this shadow root; the explorer publishes its own.
    containNestedEvents(this, { types: NESTED_EVENT_TYPES, on: 'root' });
  }

  // ---- lanes ---------------------------------------------------------------------------------

  /** The open folder's id, or `null` for the source's root. */
  get folder(): string | null {
    return this.#folderState.value ?? null;
  }
  set folder(value: string | null) {
    const previous = this.folder;
    this.#providedFolder = value === undefined ? undefined : value === '' ? null : value;
    if (this.hasUpdated) this.#folderState.sync();
    this.requestUpdate('folder', previous);
  }

  /** The selected entry ids. */
  get value(): readonly string[] {
    return this.#valueState.value ?? [];
  }
  set value(value: readonly string[]) {
    const previous = this.value;
    this.#providedValue = value === undefined ? undefined : normalizeIds(value);
    if (this.hasUpdated) this.#valueState.sync();
    this.requestUpdate('value', previous);
  }

  /** The view of the open folder. */
  get view(): FileExplorerView {
    return this.#viewState.value ?? 'details';
  }
  set view(value: FileExplorerView) {
    const previous = this.view;
    this.#providedView = value;
    if (this.hasUpdated) this.#viewState.sync();
    this.requestUpdate('view', previous);
  }

  /** The sort of the open folder: a column and a direction, or `null` for name order. */
  get sort(): FileExplorerSort | null {
    return this.#sortState.value ?? null;
  }
  set sort(value: FileExplorerSort | null) {
    const previous = this.sort;
    this.#providedSort = value;
    if (this.hasUpdated) this.#sortState.sync();
    this.requestUpdate('sort', previous);
  }

  /** The search text; an empty query shows the open folder. */
  get query(): string {
    return this.#query;
  }
  set query(value: string) {
    this.#setQuery(value ?? '');
  }

  // ---- methods -------------------------------------------------------------------------------

  /** Proposes opening a folder, `null` for the top folder. */
  openFolder(id: string | null, reason: ChangeReason = 'imperative-action'): boolean {
    const target = id ?? this.root ?? null;
    if (!this.#insideRoot(target)) return false;
    if (this.#query) this.#setQuery('');
    return this.#folderState.set(target, reason);
  }

  /** Proposes a view, as the view switcher does. */
  setView(view: FileExplorerView): boolean {
    return VIEWS.includes(view) && this.#viewState.set(view, 'imperative-action');
  }

  /** Proposes a sort by a column, as a header press does; `null` sorts by name. */
  sortBy(column: string | null, direction: FileExplorerSort['direction'] = 'ascending'): boolean {
    return this.#sortState.set(column === null ? null : { column, direction }, 'imperative-action');
  }

  /** Lists a folder again from the source, the open folder by default. */
  refresh(folder: string | null = this.folder): void {
    this.#openListing(folder, true);
    this.#tree?.reloadChildren(folder ?? ROOT);
  }

  /** Proposes selecting every entry shown. */
  selectAll(): boolean {
    if (this.selectionMode !== 'multiple') return false;
    return this.#select(
      this.#rows().map((entry) => entry.id),
      'imperative-action',
    );
  }

  /** Proposes an empty selection. */
  clearSelection(): boolean {
    return this.#select([], 'imperative-action');
  }

  /** Starts renaming an entry, the selected one by default, when renaming is allowed. */
  async startRename(id: string | undefined = this.value[0]): Promise<boolean> {
    const entry = id === undefined ? undefined : this.#known.get(id);
    if (!entry || !this.#allows('rename', entry)) return false;
    this.#renaming = { id: entry.id, draft: entry.name, error: null, busy: false };
    this.requestUpdate();
    await this.updateComplete;
    await this.#focusRenameInput();
    return true;
  }

  /** Proposes a new folder in the open folder, then starts renaming it. */
  async createFolder(
    name: string = this.#uniqueName(this.#messages.newFolder),
  ): Promise<FileEntry | null> {
    if (!this.supports('create')) return null;
    const parent = this.folder;
    const detail: FileExplorerOperationDetail = { operation: 'create', entries: [], name };
    if (!this.emit('tp-create-folder', detail, { cancelable: true })) return null;
    const created = await this.#perform('createFolder', () =>
      this.pipeline!.run('createFolder', { parent, name, signal: new AbortController().signal }),
    );
    if (!created) return null;
    this.#remember([created]);
    await this.#afterChange([parent]);
    await this.updateComplete;
    this.#select([created.id], 'imperative-action');
    await this.startRename(created.id);
    return created;
  }

  /** Proposes deleting the selected entries. */
  async deleteSelection(): Promise<boolean> {
    const entries = this.#entriesOf(this.value).filter((entry) => this.#allows('delete', entry));
    if (!entries.length || !this.supports('delete')) return false;
    const detail: FileExplorerOperationDetail = { operation: 'delete', entries };
    if (!this.emit('tp-delete', detail, { cancelable: true })) return false;
    const done = await this.#perform('remove', () =>
      this.pipeline!.run('remove', {
        ids: entries.map((entry) => entry.id),
        signal: new AbortController().signal,
      }),
    );
    if (done === null) return false;
    this.#select([], 'imperative-action');
    this.#afterChange(entries.map((entry) => entry.parentId));
    return true;
  }

  /** Proposes moving entries into a folder (`null` for the top of the source). */
  async moveEntries(ids: readonly string[], to: string | null): Promise<boolean> {
    const entries = this.#entriesOf(ids).filter(
      (entry) => entry.parentId !== to && entry.id !== to && this.#allows('move', entry),
    );
    if (!entries.length || !this.supports('move')) return false;
    const detail: FileExplorerOperationDetail = { operation: 'move', entries, to };
    if (!this.emit('tp-move', detail, { cancelable: true })) return false;
    const done = await this.#perform('move', () =>
      this.pipeline!.run('move', {
        ids: entries.map((entry) => entry.id),
        to,
        signal: new AbortController().signal,
      }),
    );
    if (done === null) return false;
    this.#afterChange([...entries.map((entry) => entry.parentId), to]);
    return true;
  }

  /** Proposes adding files to a folder, the open folder by default, showing their progress. */
  async upload(files: readonly File[], folder: string | null = this.folder): Promise<boolean> {
    if (!files.length || !this.supports('upload')) return false;
    const detail: FileExplorerOperationDetail = {
      operation: 'upload',
      entries: [],
      files,
      to: folder,
    };
    if (!this.emit('tp-upload', detail, { cancelable: true })) return false;
    this.#uploads = files.map((file) => ({ name: file.name, loaded: 0, total: file.size }));
    this.requestUpdate();
    const added = await this.#perform('upload', () =>
      this.pipeline!.run('upload', {
        folder,
        files,
        signal: new AbortController().signal,
        progress: (index, loaded, total) => {
          const item = this.#uploads?.[index];
          if (!item) return;
          item.loaded = loaded;
          item.total = total;
          this.requestUpdate();
        },
      }),
    );
    this.#uploads = null;
    if (!added) {
      this.requestUpdate();
      return false;
    }
    this.#remember(added);
    this.#afterChange([folder]);
    return true;
  }

  /** Moves focus to the search field. */
  focusSearch(): void {
    this.renderRoot.querySelector<HTMLElement>('.search tp-input')?.focus();
  }

  // ---- data ----------------------------------------------------------------------------------

  get #messages(): FileExplorerMessages {
    return resolveFileExplorerMessages(this.messages);
  }

  get #locale(): string | undefined {
    return resolveLocale(this);
  }

  /** The pipeline of the current source and layers. */
  get pipeline(): FilePipeline | null {
    const key = [this.source, this.layers];
    if (!this.source) return null;
    if (!this.#pipeline || key.some((part, index) => part !== this.#pipelineKey[index])) {
      this.#pipeline = createFilePipeline(this.source, this.layers ?? defaultFileLayers());
      this.#pipelineKey = key;
    }
    return this.#pipeline;
  }

  /** Whether the explorer proposes an operation: allowed, implemented and not read-only. */
  supports(operation: FileExplorerOperation): boolean {
    if (this.readOnly || !this.operations.includes(operation)) return false;
    const pipeline = this.pipeline;
    const method = {
      rename: 'rename',
      move: 'move',
      create: 'createFolder',
      delete: 'remove',
      upload: 'upload',
    } as const;
    return !!pipeline?.supports(method[operation]);
  }

  #key(folder: string | null): string {
    return folder ?? ROOT;
  }

  #insideRoot(folder: string | null): boolean {
    if (this.root === null) return true;
    for (let at = folder; at !== null; at = this.#known.get(at)?.parentId ?? null)
      if (at === this.root) return true;
    // An unknown folder is allowed until its path says otherwise.
    return folder !== null && !this.#known.has(folder);
  }

  #remember(entries: readonly FileEntry[]): void {
    for (const entry of entries) this.#known.set(entry.id, entry);
  }

  /** Lists a folder into the listings, aborting an older listing of it. */
  #openListing(folder: string | null, refresh = false): Promise<void> {
    const pipeline = this.pipeline;
    if (!pipeline || !this.isConnected) return Promise.resolve();
    const key = this.#key(folder);
    const previous = this.#listings.get(key);
    previous?.controller?.abort();
    const controller = new AbortController();
    const listing: Listing = {
      status: 'loading',
      entries: previous?.entries ?? [],
      error: null,
      controller,
    };
    this.#listings.set(key, listing);
    this.requestUpdate();
    const sort = this.sort;
    const done = pipeline
      .run('list', {
        folder,
        signal: controller.signal,
        refresh,
        sort: sort ? this.#fileSort(sort) : null,
      })
      .then((result) => {
        if (controller.signal.aborted) return;
        this.#remember(result.entries);
        this.#listings.set(key, {
          status: 'ready',
          entries: result.entries,
          error: null,
          controller: null,
        });
        this.#pruneSelection();
        this.requestUpdate();
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        this.#listings.set(key, {
          status: 'error',
          entries: [],
          error: this.#errorMessage(error),
          controller: null,
        });
        this.requestUpdate();
      });
    if (folder !== null && !this.#pathKnown(folder)) void this.#loadPath(folder);
    return done;
  }

  #fileSort(sort: FileExplorerSort) {
    const compare = this.#comparatorOf(sort.column);
    return compare ? { ...sort, compare } : { ...sort };
  }

  /** The ascending comparator of a column, for the client-side sort layer. */
  #comparatorOf(column: string): ((a: FileEntry, b: FileEntry) => number) | undefined {
    const found = this.#allColumns().find((candidate) => candidate.id === column);
    if (!found || column === 'name') return undefined;
    if (found.compare) return (a, b) => found.compare!(a, b);
    const valueOf = (entry: FileEntry) =>
      found.value
        ? found.value(this.#withMetadata(entry))
        : (entry as unknown as Record<string, unknown>)[found.id];
    return (a, b) => {
      const x = valueOf(a);
      const y = valueOf(b);
      if (x === y) return 0;
      if (x === null || x === undefined || x === '') return 1;
      if (y === null || y === undefined || y === '') return -1;
      if (x instanceof Date && y instanceof Date) return x.getTime() - y.getTime();
      if (typeof x === 'number' && typeof y === 'number') return x - y;
      return String(x).localeCompare(String(y), this.#locale, { numeric: true });
    };
  }

  #pathKnown(folder: string): boolean {
    for (let at: string | null = folder; at !== null && at !== this.root;) {
      const entry = this.#known.get(at);
      if (!entry) return false;
      at = entry.parentId;
    }
    return true;
  }

  async #loadPath(folder: string): Promise<void> {
    const pipeline = this.pipeline;
    if (!pipeline?.supports('path')) return;
    try {
      const path = await pipeline.run('path', { id: folder, signal: new AbortController().signal });
      this.#remember(path);
      this.#expanded = [...new Set([...this.#expanded, ...this.#ancestorIds(folder)])];
      this.requestUpdate();
    } catch {
      // The breadcrumb shows what is known.
    }
  }

  /** The folders from the top folder down to `folder`, both included. */
  #path(folder: string | null): FileEntry[] {
    const path: FileEntry[] = [];
    for (let at = folder; at !== null && at !== this.root;) {
      const entry = this.#known.get(at);
      if (!entry) break;
      path.unshift(entry);
      at = entry.parentId;
    }
    if (this.root !== null) {
      const top = this.#known.get(this.root);
      if (top) path.unshift(top);
    }
    return path;
  }

  #location(entry: FileEntry): string {
    const path = this.#path(entry.parentId).map((folder) => folder.name);
    return [this.#rootLabel(), ...path.filter((_, index) => index > 0 || this.root === null)].join(
      ' / ',
    );
  }

  #rootLabel(): string {
    return this.root !== null
      ? (this.#known.get(this.root)?.name ?? this.#messages.root)
      : this.#messages.root;
  }

  #withMetadata(entry: FileEntry): FileEntry {
    const extra = this.#metadata.get(entry.id);
    return extra ? { ...entry, metadata: { ...entry.metadata, ...extra } } : entry;
  }

  #visible(entries: readonly FileEntry[]): FileEntry[] {
    return entries
      .filter((entry) => this.showHidden || !entry.hidden)
      .map((entry) => this.#withMetadata(entry));
  }

  /** The entries the main view shows: search hits while searching, else the open folder. */
  #rows(): FileEntry[] {
    if (this.#query) return this.#visible(this.#search.hits.map((hit) => hit.entry));
    return this.#visible(this.#listings.get(this.#key(this.folder))?.entries ?? []);
  }

  /** Proposes a selection; disabled entries are never part of one. */
  #select(ids: readonly string[], reason: ChangeReason, source?: Event): boolean {
    const allowed = ids.filter((id) => !this.#known.get(id)?.disabled);
    const entries = allowed.flatMap((id) => {
      const entry = this.#known.get(id);
      return entry ? [entry] : [];
    });
    return this.#valueState.set(allowed, reason, source, { metadata: { entries } });
  }

  /** An uncontrolled selection drops entries that left the view. */
  #pruneSelection(): void {
    if (this.#valueState.controlled || !this.value.length) return;
    const shown = new Set(this.#rows().map((entry) => entry.id));
    const kept = this.value.filter((id) => shown.has(id));
    if (kept.length !== this.value.length) this.#valueState.reconcile(kept);
  }

  #errorMessage(error: unknown): string {
    const messages = this.#messages;
    if (error instanceof FileOperationError)
      return messages.errors[error.code] ?? error.message ?? messages.errors['failed']!;
    return error instanceof Error && error.message ? error.message : messages.errors['failed']!;
  }

  #announce(message: string): void {
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(message);
  }

  // ---- operations ----------------------------------------------------------------------------

  /** Whether an entry allows an operation: the explorer offers it and the entry permits it. */
  #allows(operation: 'rename' | 'move' | 'delete', entry: FileEntry): boolean {
    if (!this.supports(operation) || entry.disabled) return false;
    const permissions = entry.permissions;
    if (permissions?.write === false && operation !== 'move') return false;
    return permissions?.[operation] !== false;
  }

  #entriesOf(ids: readonly string[]): FileEntry[] {
    return ids.flatMap((id) => {
      const entry = this.#known.get(id);
      return entry ? [entry] : [];
    });
  }

  /** A name not yet used in the open folder: the base, then the base and a number. */
  #uniqueName(base: string): string {
    const taken = new Set(this.#rows().map((entry) => entry.name.toLocaleLowerCase()));
    if (!taken.has(base.toLocaleLowerCase())) return base;
    for (let count = 2; ; count++) {
      const name = `${base} ${count}`;
      if (!taken.has(name.toLocaleLowerCase())) return name;
    }
  }

  /** Runs an operation, reporting a failure in the status bar and as `tp-operation-error`. */
  async #perform<R>(operation: string, run: () => Promise<R>): Promise<R | null> {
    this.#statusMessage = '';
    try {
      const result = await run();
      this.requestUpdate();
      return result === undefined ? (true as R) : result;
    } catch (error) {
      const message = this.#errorMessage(error);
      this.#statusMessage = message;
      const detail: FileExplorerErrorDetail = { operation, error, message };
      this.emit('tp-operation-error', detail);
      this.#announce(message);
      this.requestUpdate();
      return null;
    }
  }

  /**
   * Lists the touched folders again and reloads their branches of the tree, and their parents'
   * branches, since a folder may have gained or lost its first subfolder.
   */
  async #afterChange(folders: readonly (string | null)[]): Promise<void> {
    const pipeline = this.pipeline;
    const touched = new Set(folders);
    const parents = new Set<string | null>();
    for (const folder of touched)
      if (folder !== null && folder !== this.root)
        parents.add(this.#known.get(folder)?.parentId ?? null);
    // Parents list again past the cache: their entries carry the touched folders' counts.
    const fresh = [...parents].filter((folder) => !touched.has(folder));
    await Promise.all([
      ...[...touched]
        .filter((folder) => this.#listings.has(this.#key(folder)) || folder === this.folder)
        .map((folder) => this.#openListing(folder, true)),
      ...fresh.map((folder) =>
        this.#listings.has(this.#key(folder))
          ? this.#openListing(folder, true)
          : pipeline
              ?.run('list', { folder, refresh: true, signal: new AbortController().signal })
              .then((result) => this.#remember(result.entries))
              .catch(() => undefined),
      ),
    ]);
    const branchOf = (folder: string | null) =>
      folder === this.root || folder === null ? ROOT : folder;
    for (const folder of new Set([...touched, ...parents]))
      this.#tree?.reloadChildren(branchOf(folder));
  }

  async #focusRenameInput(): Promise<void> {
    for (const view of this.renderRoot.querySelectorAll<TpDataView<FileEntry>>('tp-data-view')) {
      await view.updateComplete;
      const input = view.shadowRoot?.querySelector<HTMLElement & { select?: () => void }>(
        '.rename-input',
      );
      if (!input) continue;
      input.focus();
      // The Input's native field is its own child, in the view's shadow root.
      const field = input.querySelector('input');
      const name = this.#renaming?.draft ?? '';
      const dot = name.lastIndexOf('.');
      field?.setSelectionRange(0, dot > 0 ? dot : name.length);
      return;
    }
  }

  /** The rename field is uncontrolled, so typing keeps its caret; the draft follows it. */
  readonly #renameInput = (event: TpValueChangeEvent<string>): void => {
    if (!this.#renaming) return;
    const hadError = !!this.#renaming.error;
    this.#renaming = { ...this.#renaming, draft: event.detail.value ?? '', error: null };
    if (hadError) this.requestUpdate();
  };

  readonly #renameKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      void this.#commitRename();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      this.#cancelRename(true);
    }
  };

  readonly #renameBlur = (): void => {
    if (this.#renaming && !this.#renaming.busy && !this.#renaming.error) void this.#commitRename();
  };

  #cancelRename(refocus: boolean): void {
    const id = this.#renaming?.id;
    if (this.#renaming?.error) this.#statusMessage = '';
    this.#renaming = null;
    this.requestUpdate();
    if (refocus && id) void this.#focusEntry(id);
  }

  async #focusEntry(id: string): Promise<void> {
    await this.updateComplete;
    const view = this.renderRoot.querySelector<TpDataView<FileEntry>>(
      'tp-data-view.view, tp-data-view.column',
    );
    await view?.focusRow(id);
  }

  async #commitRename(): Promise<void> {
    const renaming = this.#renaming;
    if (!renaming || renaming.busy) return;
    const entry = this.#known.get(renaming.id);
    const name = renaming.draft.trim();
    if (!entry || !name || name === entry.name) {
      this.#cancelRename(true);
      return;
    }
    const detail: FileExplorerOperationDetail = { operation: 'rename', entries: [entry], name };
    if (!this.emit('tp-rename', detail, { cancelable: true })) {
      this.#cancelRename(true);
      return;
    }
    this.#renaming = { ...renaming, busy: true };
    this.requestUpdate();
    try {
      const renamed = await this.pipeline!.run('rename', {
        id: entry.id,
        name,
        signal: new AbortController().signal,
      });
      this.#remember([renamed]);
      this.#renaming = null;
      this.#statusMessage = '';
      this.#afterChange([entry.parentId]);
      void this.#focusEntry(entry.id);
    } catch (error) {
      const message = this.#errorMessage(error);
      this.#renaming = { ...renaming, busy: false, error: message };
      this.#statusMessage = message;
      const errorDetail: FileExplorerErrorDetail = { operation: 'rename', error, message };
      this.emit('tp-operation-error', errorDetail);
      this.#announce(message);
      this.requestUpdate();
      await this.#focusRenameInput();
    }
  }

  /** The inline name field of the entry being renamed. */
  #renderRenameInput(entry: FileEntry): TemplateResult {
    const renaming = this.#renaming!;
    return html`<tp-input
      class="rename-input"
      size="sm"
      aria-label=${this.#messages.rename}
      .defaultValue=${renaming.draft}
      ?invalid=${!!renaming.error}
      title=${renaming.error ?? nothing}
      ?disabled=${renaming.busy}
      data-entry=${entry.id}
      @tp-value-change=${this.#renameInput}
      @keydown=${this.#renameKeydown}
      @focusout=${this.#renameBlur}
    ></tp-input>`;
  }

  /** Keys of the views: rename, delete, cut and paste, a new folder, and the parent folder. */
  readonly #viewKeydown = (event: KeyboardEvent): void => {
    if (this.#renaming) return;
    const path = event.composedPath();
    if (path.some((node) => node instanceof HTMLElement && node.classList.contains('rename-input')))
      return;
    const mod = event.ctrlKey || event.metaKey;
    const view = event.currentTarget as TpDataView<FileEntry>;
    const focused = (view.shadowRoot?.activeElement as HTMLElement | null)?.closest<HTMLElement>(
      '[data-row]',
    )?.dataset.row;
    if (event.key === 'F2') {
      event.preventDefault();
      void this.startRename(focused ?? this.value[0]);
    } else if (event.key === 'Delete' || (mod && event.key === 'Backspace')) {
      event.preventDefault();
      void this.deleteSelection();
    } else if (mod && event.key.toLowerCase() === 'x' && this.supports('move')) {
      event.preventDefault();
      this.#clipboard = [...this.value];
      this.#statusMessage = this.#clipboard.length
        ? this.#messages.selected(this.#clipboard.length, '')
        : '';
      this.requestUpdate();
    } else if (mod && event.key.toLowerCase() === 'v' && this.#clipboard.length) {
      event.preventDefault();
      const ids = this.#clipboard;
      this.#clipboard = [];
      void this.moveEntries(ids, this.folder);
    } else if (event.altKey && event.key === 'ArrowUp') {
      event.preventDefault();
      const parent =
        this.folder === null || this.folder === this.root
          ? undefined
          : this.#known.get(this.folder)?.parentId;
      if (parent !== undefined) this.openFolder(parent, 'keyboard');
    }
  };

  // ---- drag and drop -------------------------------------------------------------------------

  /** The manager that moves entries between the views, the tree and the path. */
  get #dragManager(): DragDropManager | null {
    if (!this.supports('move')) return null;
    if (!this.#manager) {
      this.#manager = new DragDropManager({
        sensors: [
          PointerSensor.configure({
            activationConstraints: [new DistanceConstraint({ value: 6 })],
            preventActivation: () => false,
          }),
        ],
        accessibility: false,
        feedback: 'clone',
      });
      this.#manager.monitor.addEventListener('dragend', (event: DropEvent) => this.#dropped(event));
      this.#manager.monitor.addEventListener('beforedragstart', (event: DropEvent) =>
        this.#beginDrag(event),
      );
      this.#manager.monitor.addEventListener('settled', () => this.#endDrag());
    }
    return this.#manager;
  }

  /** The entries the current drag carries, read when it starts. */
  #dragIds: string[] | null = null;
  #dragOverlay: { element: HTMLElement; source: Draggable } | null = null;

  /**
   * A drag shows a chip under the pointer (the entry's icon and name, and how many entries move)
   * while the rows and tiles stay in place, so no row or tile is lifted out of its layout.
   */
  #beginDrag(event: DropEvent): void {
    this.#endDrag();
    const snapshot = event.operation.source;
    const source = snapshot ? this.#manager?.registry.draggables.get(snapshot.id) : undefined;
    const rowId = (snapshot?.data as { rowId?: string } | undefined)?.rowId;
    const entry = rowId === undefined ? undefined : this.#known.get(rowId);
    if (!source || !entry || !source.element) return;
    const ids = (this.#dragIds = this.#dragged(entry.id));
    const frame = this.ownerDocument.createElement('div');
    frame.className = 'drag-frame';
    frame.setAttribute('inert', '');
    frame.setAttribute('aria-hidden', 'true');
    const press = event.operation.activatorEvent as PointerEvent | null;
    const bounds = source.element.getBoundingClientRect();
    const offset = (value: number | undefined, start: number) =>
      value === undefined ? 0 : Math.max(0, value - start);
    render(
      html`<div
        class="drag-chip"
        part="file-explorer-drag-preview"
        style=${`left: ${offset(press?.clientX, bounds.left)}px; top: ${offset(press?.clientY, bounds.top)}px`}
      >
        <tp-icon aria-hidden="true" .icon=${fileIconOf(entry)}></tp-icon>
        <span class="drag-chip-name">${entry.name}</span>
        ${ids.length > 1 ? html`<tp-badge>${ids.length}</tp-badge>` : nothing}
      </div>`,
      frame,
      { host: this },
    );
    this.renderRoot.append(frame);
    source.update({ overlay: frame });
    this.#dragOverlay = { element: frame, source };
  }

  #endDrag(): void {
    this.#dragIds = null;
    if (!this.#dragOverlay) return;
    this.#dragOverlay.source.update({ overlay: null });
    this.#dragOverlay.element.remove();
    this.#dragOverlay = null;
  }

  /** The entries a drag carries: the selection when it holds the dragged entry. */
  #dragged(id: string): string[] {
    return this.value.includes(id) ? [...this.value] : [id];
  }

  #folderTarget(id: string | null): boolean {
    if (id === null) return this.supports('move');
    const entry = this.#known.get(id);
    return (
      !!entry && entry.kind === 'folder' && !entry.disabled && entry.permissions?.write !== false
    );
  }

  /** The hooks connecting the views' rows and the tree's folders to the manager, kept per manager. */
  #viewHooks: DataViewDragAndDrop<FileEntry> | undefined;
  #treeHooks: TreeViewDragAndDrop<FolderRecord> | undefined;
  #viewDragAndDrop() {
    const manager = this.#dragManager;
    if (!manager) return undefined;
    if (this.#viewHooks?.manager === manager) return this.#viewHooks;
    return (this.#viewHooks = {
      manager,
      source: (entry: FileEntry) =>
        this.#allows('move', entry) ? { ids: this.#dragged(entry.id), label: entry.name } : null,
      target: (entry: FileEntry) => this.#folderTarget(entry.id),
    });
  }

  #treeDragAndDrop() {
    const manager = this.#dragManager;
    if (!manager) return undefined;
    if (this.#treeHooks?.manager === manager) return this.#treeHooks;
    return (this.#treeHooks = {
      manager,
      target: (record: FolderRecord) =>
        this.#folderTarget(record.id === ROOT ? this.root : record.id),
    });
  }

  /** A path segment is a drop target for its folder. */
  #crumbTargets = new Map<string, Droppable>();
  #crumbReference(id: string) {
    return (element: Element | undefined) => {
      this.#crumbTargets.get(id)?.destroy();
      this.#crumbTargets.delete(id);
      const manager = this.#dragManager;
      if (element && manager)
        this.#crumbTargets.set(
          id,
          new Droppable(
            { id: `crumb:${id}`, element, data: { folder: id === ROOT ? this.root : id } },
            manager,
          ),
        );
    };
  }

  /** A drop moves the dragged entries into the folder under it. */
  #dropped(event: DropEvent): void {
    const { source, target } = event.operation;
    if (event.canceled || !source || !target) return;
    const ids = this.#dragIds ?? (source.data as { ids?: string[] } | undefined)?.ids ?? [];
    const data = target.data as
      { rowId?: string; itemId?: string; folder?: string | null } | undefined;
    const to =
      data?.rowId !== undefined
        ? data.rowId
        : data?.itemId !== undefined
          ? data.itemId === ROOT
            ? this.root
            : data.itemId
          : data?.folder !== undefined
            ? data.folder
            : undefined;
    if (to === undefined || ids.includes(to ?? '')) return;
    void this.moveEntries(ids, to);
  }

  /** Files dragged from the operating system: a folder row under the pointer, else the open folder. */
  #nativeFolder(event: DragEvent): string | null | undefined {
    if (!event.dataTransfer?.types.includes('Files') || !this.supports('upload')) return undefined;
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      const row = node.dataset.row;
      if (row !== undefined) {
        const entry = this.#known.get(row);
        if (entry?.kind === 'folder') return entry.id;
        break;
      }
      if (node.localName === 'tp-tree-item') {
        const id = (node as HTMLElement & { value?: string }).value;
        return id === ROOT ? this.root : (id ?? this.folder);
      }
    }
    return this.folder;
  }

  readonly #nativeDragOver = (event: DragEvent): void => {
    const folder = this.#nativeFolder(event);
    if (folder === undefined) return;
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    if (folder !== this.#nativeTarget) {
      this.#nativeTarget = folder;
      this.requestUpdate();
    }
  };

  readonly #nativeDragLeave = (event: DragEvent): void => {
    if (event.relatedTarget && this.contains(event.relatedTarget as Node)) return;
    if (this.#nativeTarget !== undefined) {
      this.#nativeTarget = undefined;
      this.requestUpdate();
    }
  };

  readonly #nativeDrop = (event: DragEvent): void => {
    const folder = this.#nativeFolder(event);
    this.#nativeTarget = undefined;
    this.requestUpdate();
    if (folder === undefined) return;
    event.preventDefault();
    void this.upload([...(event.dataTransfer?.files ?? [])], folder);
  };

  // ---- search --------------------------------------------------------------------------------

  #setQuery(value: string): void {
    if (value === this.#query) return;
    this.#query = value;
    this.emit('tp-query-change', { value });
    const search = this.#search;
    clearTimeout(search.timer);
    search.controller?.abort();
    if (!value.trim()) {
      this.#search = {
        status: 'idle',
        hits: [],
        partial: false,
        error: null,
        controller: null,
        timer: undefined,
      };
      this.requestUpdate();
      return;
    }
    this.#search = { ...search, status: 'searching', controller: null };
    this.#search.timer = setTimeout(() => this.#runSearch(value), 150);
    this.requestUpdate();
  }

  #runSearch(query: string): void {
    const pipeline = this.pipeline;
    if (!pipeline?.supports('search')) return;
    const controller = new AbortController();
    this.#search.controller = controller;
    pipeline
      .run('search', {
        query,
        folder: this.searchScope === 'all' ? this.root : this.folder,
        scope: this.searchScope === 'all' && this.root !== null ? 'subtree' : this.searchScope,
        limit: 500,
        signal: controller.signal,
      })
      .then((result) => {
        if (controller.signal.aborted || query !== this.#query) return;
        this.#remember(result.hits.map((hit) => hit.entry));
        this.#search = {
          status: 'ready',
          hits: result.hits,
          partial: !!result.partial,
          error: null,
          controller: null,
          timer: undefined,
        };
        this.#announce(
          result.hits.length
            ? this.#messages.items(result.hits.length)
            : this.#messages.searchEmpty(query),
        );
        this.requestUpdate();
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        this.#search = {
          ...this.#search,
          status: 'error',
          error: this.#errorMessage(error),
          controller: null,
        };
        this.requestUpdate();
      });
  }

  /** The search field is controlled: each proposal becomes the query. */
  readonly #searchInput = (event: TpValueChangeEvent<string>): void => {
    this.#setQuery(event.detail.value ?? '');
  };

  readonly #searchKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.#query) {
      event.preventDefault();
      this.#setQuery('');
    }
  };

  // ---- metadata ------------------------------------------------------------------------------

  /** Queues the missing fields of an entry; the queue flushes after the render. */
  #needMetadata(entry: FileEntry, fields: readonly string[]): boolean {
    const known = { ...entry.metadata, ...this.#metadata.get(entry.id) };
    const missing = fields.filter(
      (field) => !(field in known) && !this.#metadataAsked.has(`${entry.id}\u0000${field}`),
    );
    if (!missing.length) return fields.some((field) => !(field in known));
    for (const field of missing) {
      this.#metadataAsked.add(`${entry.id}\u0000${field}`);
      const key = field;
      let ids = this.#metadataQueue.get(key);
      if (!ids) this.#metadataQueue.set(key, (ids = new Set()));
      ids.add(entry.id);
    }
    return true;
  }

  #flushMetadata(): void {
    const pipeline = this.pipeline;
    if (!pipeline?.supports('metadata') || !this.#metadataQueue.size) {
      this.#metadataQueue.clear();
      return;
    }
    for (const [field, ids] of this.#metadataQueue)
      void pipeline
        .run('metadata', { ids: [...ids], fields: [field], signal: new AbortController().signal })
        .then((values) => {
          for (const [id, fields] of Object.entries(values))
            this.#metadata.set(id, { ...this.#metadata.get(id), ...fields });
          this.requestUpdate();
        })
        .catch(() => undefined);
    this.#metadataQueue.clear();
  }

  // ---- lifecycle -----------------------------------------------------------------------------

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) this.#openListing(this.folder);
  }

  override disconnectedCallback(): void {
    for (const listing of this.#listings.values()) listing.controller?.abort();
    this.#search.controller?.abort();
    clearTimeout(this.#search.timer);
    this.#announcer?.dispose();
    this.#announcer = undefined;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#folderState.initialize();
    this.#valueState.initialize();
    this.#viewState.initialize();
    this.#sortState.initialize();
    if (changed.has('source') || changed.has('layers')) {
      this.#listings.clear();
      this.#known.clear();
      this.#metadata.clear();
      this.#metadataAsked.clear();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // A new source or pipeline lists the open folder and the tree's top again.
    if ((changed.has('source') || changed.has('layers')) && this.#sourceListed !== this.pipeline) {
      this.#sourceListed = this.pipeline;
      this.#openListing(this.folder);
      this.#tree?.reloadChildren(ROOT);
    }
    // The top folder's own name comes from its path when it is not the source's root.
    if (this.root !== null && !this.#known.has(this.root) && this.#rootPathFor !== this.root) {
      this.#rootPathFor = this.root;
      void this.#loadPath(this.root);
    }
    this.#flushMetadata();
  }
  #rootPathFor: string | null = null;

  get #tree(): TpTreeView<FolderRecord> | null {
    return (
      (this.renderRoot?.querySelector('tp-tree-view') as TpTreeView<FolderRecord> | null) ?? null
    );
  }

  // ---- events from the parts -----------------------------------------------------------------

  /**
   * Whether a lane event is the listening element's own, not one from its content: a field inside
   * a view is retargeted to the view, so the origin is the head of the composed path.
   */
  #own(event: Event): boolean {
    return event.composedPath()[0] === event.currentTarget;
  }

  readonly #viewValueChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (!this.#own(event)) return;
    event.preventDefault();
    this.#inspected = null;
    this.#select(event.detail.value, event.detail.reason, event);
  };

  readonly #viewSortChange = (event: TpValueChangeEvent<DataViewSort | null>): void => {
    if (!this.#own(event)) return;
    event.preventDefault();
    this.#sortState.set(event.detail.value, event.detail.reason, event);
  };

  readonly #rowActivate = (event: CustomEvent<{ row: FileEntry; sourceEvent: Event }>): void => {
    this.#open(event.detail.row, event.detail.sourceEvent);
  };

  #open(entry: FileEntry, source: Event | null): void {
    if (entry.kind === 'folder') {
      this.#folderState.set(
        entry.id,
        source instanceof KeyboardEvent ? 'keyboard' : 'item-press',
        source ?? undefined,
      );
      if (this.#query) this.#setQuery('');
      return;
    }
    const detail: FileExplorerOpenDetail = { entry, sourceEvent: source };
    this.emit('tp-open', detail);
  }

  readonly #treeValueChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (!this.#own(event)) return;
    event.preventDefault();
    const id = event.detail.value[0];
    if (id === undefined) return;
    this.openFolder(id === ROOT ? this.root : id, event.detail.reason);
  };

  readonly #treeExpandedChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (!this.#own(event)) return;
    event.preventDefault();
    this.#expanded = event.detail.value;
    this.requestUpdate();
  };

  readonly #viewChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    if (!this.#own(event)) return;
    event.preventDefault();
    const next = event.detail.value[0] as FileExplorerView | undefined;
    if (next) this.#viewState.set(next, event.detail.reason, event);
  };

  readonly #crumbClick = (event: MouseEvent): void => {
    const link = (event.target as HTMLElement).closest<HTMLElement>('[data-folder]');
    if (!link) return;
    event.preventDefault();
    const id = link.dataset.folder!;
    this.openFolder(id === ROOT ? this.root : id, 'item-press');
  };

  readonly #retry = (): void => this.refresh();

  readonly #loadFolders = async (record: FolderRecord, { signal }: { signal: AbortSignal }) => {
    const pipeline = this.pipeline;
    if (!pipeline) return [];
    const folder = record.id === ROOT ? this.root : record.id;
    const result = await pipeline.run('list', { folder, signal });
    this.#remember(result.entries);
    return result.entries
      .filter((entry) => entry.kind === 'folder' && (this.showHidden || !entry.hidden))
      .map((entry) => this.#folderRecord(entry));
  };

  #folderRecord(entry: FileEntry): FolderRecord {
    return {
      id: entry.id,
      label: entry.name,
      hasChildren: entry.hasChildren ?? true,
      children: null,
      entry,
    };
  }

  // ---- render --------------------------------------------------------------------------------

  /** Every column: name, the built-in ones, the application's. */
  #allColumns(): FileExplorerColumn[] {
    const messages = this.#messages;
    const builtIn = builtInColumns(messages, this.#locale, (entry) => this.#location(entry));
    return [
      this.#nameColumn(),
      builtIn.size,
      builtIn.modified,
      builtIn.kind,
      builtIn.location,
      ...this.columns,
    ];
  }

  #nameColumn(): FileExplorerColumn {
    const messages = this.#messages;
    return {
      id: 'name',
      header: messages.name,
      sortable: true,
      rowHeader: true,
      width: 'minmax(12rem, 3fr)',
      value: (entry) => entry.name,
      render: (entry, cell) =>
        html`<tp-icon class="entry-icon" aria-hidden="true" .icon=${fileIconOf(entry)}></tp-icon>${
            this.#renaming?.id === entry.id
              ? this.#renderRenameInput(entry)
              : html`<span>${cell.renderText()}</span>`
          }`,
    };
  }

  /** The columns the details view shows, in order. */
  #shownColumns(): DataViewColumn<FileEntry>[] {
    const all = this.#allColumns();
    const visible = this.visibleColumns ?? [
      ...BUILT_IN_COLUMNS,
      ...this.columns.map((column) => column.id),
    ];
    const shown = all.filter(
      (column) =>
        column.id === 'name' ||
        (column.id === 'location' ? !!this.#query : visible.includes(column.id)),
    );
    return shown;
  }

  /** The explorer's own rendering layer: search marks, lazy metadata and tiles. */
  #explorerLayer(): DataViewMiddleware<FileEntry> {
    const ranges = new Map(
      this.#search.hits.flatMap((hit) => (hit.ranges ? [[hit.entry.id, hit.ranges] as const] : [])),
    );
    const searching = !!this.#query;
    const columns = new Map(this.#allColumns().map((column) => [column.id, column]));
    const messages = this.#messages;
    const gallery = this.view === 'gallery';
    return {
      name: 'file-explorer',
      // What the explorer renders inside a view lives in that view's shadow root.
      css: `
        .search-match { background: var(--tp-primary-subtle); color: inherit; border-radius: var(--tp-radius-sm); }
        /* A disabled entry reads as unavailable: its name, details and icon take the muted color. */
        [data-unselectable], [data-unselectable] [role='gridcell'], [data-unselectable] .tile-subtitle { color: var(--tp-muted-foreground); }
        .entry-icon { flex: none; inline-size: var(--tp-icon-size-md); block-size: var(--tp-icon-size-md); }
        .metadata-skeleton { inline-size: 60%; block-size: 0.75em; }
        .rename-input { flex: 1 1 auto; min-inline-size: 0; }
        .entry-chevron { flex: none; margin-inline-start: auto; inline-size: var(--tp-icon-size-sm); block-size: var(--tp-icon-size-sm); color: var(--tp-muted-foreground); }
        .entry-chevron:dir(rtl) { scale: -1 1; }
        .tile-media {
          display: grid; place-items: center; overflow: hidden;
          block-size: ${gallery ? 'calc(var(--tp-spacing) * 32)' : 'calc(var(--tp-spacing) * 14)'};
          border-radius: var(--tp-radius-sm);
          ${gallery ? 'background: var(--tp-muted);' : ''}
          color: var(--tp-muted-foreground);
        }
        .tile-icon { inline-size: ${gallery ? 'var(--tp-space-10)' : 'var(--tp-space-8)'}; block-size: ${gallery ? 'var(--tp-space-10)' : 'var(--tp-space-8)'}; }
        .tile-preview { inline-size: 100%; block-size: 100%; }
        /* The selection box sits inside the media's corner, one step in from its edges. */
        .tile-box { inset-block-start: calc(var(--tp-space-2) * 2); inset-inline-start: calc(var(--tp-space-2) * 2); }
        .tile-title, .tile-subtitle { text-align: ${gallery ? 'start' : 'center'}; }
      `,
      text: (cell, next) => {
        const found = searching && cell.column.id === 'name' ? ranges.get(cell.rowId) : undefined;
        return found ? renderHighlighted(cell.text, found, 'file-explorer-match') : next();
      },
      cell: (cell, next) => {
        const fields = columns.get(cell.column.id)?.fields;
        if (fields?.length && this.#needMetadata(cell.row, fields))
          return html`<tp-skeleton class="metadata-skeleton" label=""></tp-skeleton>`;
        return next();
      },
      tile: (tile) => this.#renderTile(tile, messages),
    };
  }

  #renderTile(
    tile: DataViewTileContext<FileEntry>,
    messages: FileExplorerMessages,
  ): TemplateResult {
    const entry = tile.row;
    const gallery = this.view === 'gallery';
    const meta =
      entry.kind === 'folder'
        ? entry.childCount === undefined
          ? messages.folder
          : messages.items(entry.childCount)
        : [
            kindText(entry, messages),
            entry.size === undefined ? '' : formatBytes(entry.size, this.#locale),
          ]
            .filter(Boolean)
            .join(' · ');
    const media =
      gallery && entry.thumbnail
        ? html`<tp-image
            class="tile-preview"
            src=${entry.thumbnail}
            alt=""
            fit="cover"
            loading="lazy"
          ></tp-image>`
        : html`<tp-icon class="tile-icon" aria-hidden="true" .icon=${fileIconOf(entry)}></tp-icon>`;
    return html`<span class="tile-media" part="file-explorer-tile-media">${media}</span>${
        this.#renaming?.id === entry.id
          ? this.#renderRenameInput(entry)
          : html`<span class="tile-title">${this.#highlightedName(entry)}</span>`
      }<span class="tile-subtitle">${meta}</span>`;
  }

  #highlightedName(entry: FileEntry): unknown {
    const hit = this.#query
      ? this.#search.hits.find((candidate) => candidate.entry.id === entry.id)
      : undefined;
    return hit?.ranges
      ? renderHighlighted(entry.name, hit.ranges, 'file-explorer-match')
      : entry.name;
  }

  #renderToolbar(): TemplateResult {
    const messages = this.#messages;
    const path = this.#path(this.folder);
    const crumbs = [
      { id: ROOT, name: this.#rootLabel() },
      ...path
        .filter((entry) => entry.id !== this.root)
        .map((entry) => ({ id: entry.id, name: entry.name })),
    ];
    const searching = this.#search.status === 'searching';
    const views = this.views.filter((view) => VIEWS.includes(view));
    return html`<div class="toolbar" part="file-explorer-toolbar">
      <slot name="toolbar-start"></slot>
      <tp-breadcrumb
        class="path"
        label=${messages.path(this.label || messages.label)}
        @click=${this.#crumbClick}
      >
        ${crumbs.map((crumb, index) =>
          index === crumbs.length - 1 && !this.#query
            ? html`<span>${crumb.name}</span>`
            : html`<a href="#" data-folder=${crumb.id} ${ref(this.#crumbReference(crumb.id))}
                >${crumb.name}</a
              >`,
        )}
      </tp-breadcrumb>
      ${
        this.search && this.pipeline?.supports('search')
          ? html`<tp-input-group class="search">
              <tp-icon
                slot="inline-start"
                aria-hidden="true"
                .icon=${navigationIcons.search}
              ></tp-icon>
              <tp-input
                type="search"
                aria-label=${messages.search}
                placeholder=${messages.search}
                .value=${this.#query}
                @tp-value-change=${this.#searchInput}
                @keydown=${this.#searchKeydown}
              ></tp-input>
              ${searching ? html`<tp-spinner slot="inline-end" label=${messages.searching}></tp-spinner>` : nothing}
            </tp-input-group>`
          : nothing
      }
      ${
        views.length > 1
          ? html`<tp-toggle-group
              class="views"
              label=${messages.views}
              size="icon-sm"
              .value=${[this.view]}
              @tp-value-change=${this.#viewChange}
            >
              ${views.map(
                (view) =>
                  html`<tp-toggle value=${view} aria-label=${messages.view[view]}
                    ><tp-icon .icon=${VIEW_ICONS[view]}></tp-icon
                  ></tp-toggle>`,
              )}
            </tp-toggle-group>`
          : nothing
      }
      <slot name="toolbar-end"></slot>
    </div>`;
  }

  #renderTree(): TemplateResult {
    const messages = this.#messages;
    const rootRecord: FolderRecord = {
      id: ROOT,
      label: this.#rootLabel(),
      hasChildren: true,
      children: null,
      entry: this.root !== null ? (this.#known.get(this.root) ?? null) : null,
    };
    const current = this.folder === null || this.folder === this.root ? ROOT : this.folder;
    const expanded = [...new Set([...this.#expanded, ...this.#ancestorIds(this.folder)])];
    return html`<tp-tree-view
      class="tree"
      label=${messages.folders}
      size="sm"
      selection-mode="single"
      expansion-trigger="indicator"
      .items=${[rootRecord]}
      .loadChildren=${this.#loadFolders}
      .renderItem=${(record: FolderRecord) =>
        html`<tp-icon slot="leading" aria-hidden="true" .icon=${folderIcon}></tp-icon
          >${record.label}`}
      .value=${[current]}
      .expanded=${expanded}
      .isItemCurrent=${(record: FolderRecord) => record.id === current}
      .dragAndDrop=${this.#treeDragAndDrop()}
      @tp-value-change=${this.#treeValueChange}
      @tp-expanded-change=${this.#treeExpandedChange}
    ></tp-tree-view>`;
  }

  /** Tree ids to expand so the open folder shows: the top folder and every ancestor. */
  #ancestorIds(folder: string | null): string[] {
    const ids = [ROOT];
    const path = this.#path(folder);
    for (const entry of path.slice(0, -1)) if (entry.id !== this.root) ids.push(entry.id);
    return ids;
  }

  /** The folders the columns view lists, from the top folder down to the open folder. */
  #levels(): (string | null)[] {
    return [
      this.root,
      ...this.#path(this.folder)
        .filter((entry) => entry.id !== this.root)
        .map((entry) => entry.id),
    ];
  }

  /** The column of a level: its folder's entries, the next level's folder selected in it. */
  #renderColumn(
    folder: string | null,
    index: number,
    levels: readonly (string | null)[],
  ): TemplateResult {
    const messages = this.#messages;
    const listing = this.#listings.get(this.#key(folder));
    if (!listing) queueMicrotask(() => this.#openListing(folder));
    const next = levels[index + 1];
    const selected =
      next !== undefined && next !== null
        ? [next]
        : index === levels.length - 1
          ? this.value.slice(0, 1)
          : [];
    const name = this.#nameColumn();
    const column: DataViewColumn<FileEntry> = {
      ...name,
      render: (entry, cell) =>
        html`${name.render!(entry, cell)}${
          entry.kind === 'folder'
            ? html`<tp-icon
                class="entry-chevron"
                aria-hidden="true"
                .icon=${chevronRightIcon}
              ></tp-icon>`
            : nothing
        }`,
    };
    const label =
      folder === this.root ? this.#rootLabel() : (this.#known.get(folder ?? '')?.name ?? '');
    return html`<tp-data-view
      class="column"
      part="file-explorer-column"
      data-level=${index}
      label=${label}
      header="hidden"
      navigation="row"
      size="sm"
      sorting="manual"
      selection-mode="single"
      selection-behavior="replace"
      .rows=${this.#visible(listing?.entries ?? [])}
      .columns=${[column]}
      .getRowId=${(entry: FileEntry) => entry.id}
      .isRowSelectable=${selectable}
      .value=${selected}
      .middleware=${[this.#explorerLayer(), ...this.middleware]}
      .messages=${{ label: messages.label, empty: messages.emptyFolder, emptyDescription: '', errorTitle: messages.loadError }}
      ?loading=${listing?.status === 'loading' && !listing.entries.length}
      .error=${listing?.status === 'error' ? listing.error : null}
      @tp-value-change=${(event: TpValueChangeEvent<readonly string[]>) => this.#columnSelect(event, index)}
      @tp-row-activate=${this.#rowActivate}
      .dragAndDrop=${this.#viewDragAndDrop()}
      @keydown=${(event: KeyboardEvent) => {
        this.#columnKeydown(event, index);
        if (!event.defaultPrevented) this.#viewKeydown(event);
      }}
    ></tp-data-view>`;
  }

  /** Selecting in a column opens a folder in the next column, or selects a file. */
  #columnSelect(event: TpValueChangeEvent<readonly string[]>, index: number): void {
    if (!this.#own(event)) return;
    event.preventDefault();
    const id = event.detail.value[0];
    if (id === undefined) return;
    const entry = this.#known.get(id);
    if (!entry) return;
    if (entry.kind === 'folder') {
      this.#folderState.set(entry.id, event.detail.reason, event);
      this.#select([], event.detail.reason, event);
    } else {
      const levels = this.#levels();
      const folder = levels[index] ?? null;
      if (folder !== this.folder) this.#folderState.set(folder, event.detail.reason, event);
      this.#select([id], event.detail.reason, event);
    }
  }

  /** Right moves into the selected folder's column, Left back to the parent's (mirrored in RTL). */
  #columnKeydown(event: KeyboardEvent, index: number): void {
    const rtl = this.direction === 'rtl';
    const forward = event.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    const back = event.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    if (!forward && !back) return;
    const levels = this.#levels();
    const target = forward ? index + 1 : index - 1;
    if (target < 0) return;
    event.preventDefault();
    if (back) {
      const folder = levels[index - 1] ?? null;
      const child = levels[index];
      this.#folderState.set(folder, 'keyboard', event);
      this.#focusColumn(target, child ?? undefined);
      return;
    }
    const next = levels[index + 1];
    if (next === undefined) return;
    void this.#ensureFocusFirst(target);
  }

  async #ensureFocusFirst(index: number): Promise<void> {
    await this.updateComplete;
    const column = this.renderRoot.querySelector<TpDataView<FileEntry>>(
      `.column[data-level="${index}"]`,
    );
    const first = column?.visibleRowIds[0];
    if (column && first) {
      await column.focusRow(first);
    }
  }

  async #focusColumn(index: number, id?: string): Promise<void> {
    await this.updateComplete;
    const column = this.renderRoot.querySelector<TpDataView<FileEntry>>(
      `.column[data-level="${index}"]`,
    );
    const target = id ?? column?.visibleRowIds[0];
    if (column && target) await column.focusRow(target);
  }

  #renderColumns(): TemplateResult {
    const levels = this.#levels();
    return html`<tp-scroll-area
      class="columns"
      part="file-explorer-columns"
      axis="x"
      label=${this.#messages.view.columns}
      .partPresentation=${COLUMNS_CONTENT}
    >
      <div class="column-track">
        ${levels.map((folder, index) => this.#renderColumn(folder, index, levels))}
      </div>
    </tp-scroll-area>`;
  }

  #renderMain(): TemplateResult {
    const view = this.view;
    if (view === 'columns') return this.#renderColumns();
    const messages = this.#messages;
    const listing = this.#listings.get(this.#key(this.folder));
    const searching = !!this.#query;
    const rows = this.#rows();
    const grid = view === 'icons' || view === 'gallery';
    const compact = view === 'compact';
    const loading = searching ? this.#search.status === 'searching' : listing?.status === 'loading';
    const error = searching
      ? this.#search.error
      : listing?.status === 'error'
        ? listing.error
        : null;
    const columns = compact ? [this.#nameColumn()] : this.#shownColumns();
    return html`<tp-data-view
      class="view"
      part="file-explorer-view"
      label=${searching ? messages.search : (this.#path(this.folder).at(-1)?.name ?? this.#rootLabel())}
      layout=${grid ? 'grid' : 'table'}
      header=${compact ? 'hidden' : 'visible'}
      size=${compact ? 'sm' : 'default'}
      data-view=${view}
      sorting="manual"
      navigation="row"
      selection-mode=${this.selectionMode}
      selection-behavior="replace"
      ?selection-checkboxes=${this.selectionMode === 'multiple' && !compact}
      sticky-start-columns="1"
      .rows=${rows}
      .columns=${columns}
      .getRowId=${(entry: FileEntry) => entry.id}
      .isRowSelectable=${selectable}
      .sort=${this.sort}
      .value=${this.value}
      .middleware=${[this.#explorerLayer(), ...this.middleware]}
      .messages=${{
        label: messages.label,
        empty: searching ? messages.searchEmpty(this.#query) : messages.emptyFolder,
        emptyDescription: searching ? '' : messages.emptyFolderDescription,
        errorTitle: messages.loadError,
      }}
      ?loading=${loading}
      .error=${error}
      .dragAndDrop=${this.#viewDragAndDrop()}
      @keydown=${this.#viewKeydown}
      @tp-value-change=${this.#viewValueChange}
      @tp-sort-change=${this.#viewSortChange}
      @tp-row-activate=${this.#rowActivate}
      @tp-row-focus=${this.#rowFocus}
      @tp-retry=${this.#retry}
    ></tp-data-view>`;
  }

  /** A disabled entry cannot be selected; while it has focus, the details pane describes it. */
  #inspected: FileEntry | null = null;
  readonly #rowFocus = (event: CustomEvent<DataViewFocusDetail<FileEntry>>): void => {
    const inspected = event.detail.row.disabled ? event.detail.row : null;
    if (inspected === this.#inspected) return;
    this.#inspected = inspected;
    this.requestUpdate();
  };

  #renderDetails(): TemplateResult {
    const messages = this.#messages;
    const inspected = this.#inspected && this.#known.get(this.#inspected.id);
    const selected = inspected
      ? [this.#withMetadata(inspected)]
      : this.value.flatMap((id) => {
          const entry = this.#known.get(id);
          return entry ? [this.#withMetadata(entry)] : [];
        });
    const entry = selected.length === 1 ? selected[0]! : null;
    if (!entry)
      return html`<div class="details" part="file-explorer-details">
        <tp-empty-state
          .title=${selected.length ? messages.selected(selected.length, this.#sizeOf(selected)) : messages.details}
          .description=${selected.length ? '' : messages.noSelection}
        ></tp-empty-state>
      </div>`;
    const modified = entry.modified === undefined ? undefined : new Date(entry.modified);
    const extra = this.columns.filter((column) => this.#cellText(column, entry));
    return html`<div class="details" part="file-explorer-details">
      <div class="preview">
        ${
          entry.thumbnail
            ? html`<tp-image .src=${entry.thumbnail} alt="" fit="contain"></tp-image>`
            : html`<tp-icon
                class="preview-icon"
                aria-hidden="true"
                .icon=${fileIconOf(entry)}
              ></tp-icon>`
        }
      </div>
      <strong class="details-name">${entry.name}</strong>
      <slot name="details-actions"></slot>
      <tp-description-list>
        <tp-description-list-item label=${messages.kind}
          >${kindText(entry, messages)}</tp-description-list-item
        >
        ${
          entry.kind === 'file' && entry.size !== undefined
            ? html`<tp-description-list-item label=${messages.size}
                >${formatBytes(entry.size, this.#locale)}</tp-description-list-item
              >`
            : entry.childCount !== undefined
              ? html`<tp-description-list-item label=${messages.size}
                  >${messages.items(entry.childCount)}</tp-description-list-item
                >`
              : nothing
        }
        ${
          modified
            ? html`<tp-description-list-item label=${messages.modified}
                ><tp-time mode="relative" .datetime=${modified}></tp-time
              ></tp-description-list-item>`
            : nothing
        }
        <tp-description-list-item label=${messages.location}
          >${this.#location(entry)}</tp-description-list-item
        >
        ${extra.map(
          (column) =>
            html`<tp-description-list-item label=${column.header}
              >${this.#cellText(column, entry)}</tp-description-list-item
            >`,
        )}
      </tp-description-list>
    </div>`;
  }

  #cellText(column: FileExplorerColumn, entry: FileEntry): string {
    const value = column.value ? column.value(entry) : entry.metadata?.[column.id];
    if (value === undefined || value === null || value === '') return '';
    return column.format ? column.format(value, entry) : String(value);
  }

  #sizeOf(entries: readonly FileEntry[]): string {
    const files = entries.filter((entry) => entry.kind === 'file' && entry.size !== undefined);
    return files.length
      ? formatBytes(
          files.reduce((sum, entry) => sum + (entry.size ?? 0), 0),
          this.#locale,
        )
      : '';
  }

  #renderStatus(): TemplateResult {
    const messages = this.#messages;
    const rows = this.#rows();
    const folders = rows.filter((entry) => entry.kind === 'folder').length;
    const files = rows.length - folders;
    const selected = rows.filter((entry) => this.value.includes(entry.id));
    const partial = this.#query && this.#search.partial ? messages.searchPartial : '';
    return html`<div class="status" part="file-explorer-status" role="status">
      <span>${messages.status(folders, files, this.#sizeOf(rows))}</span>
      ${selected.length ? html`<span>${messages.selected(selected.length, this.#sizeOf(selected))}</span>` : nothing}
      ${partial ? html`<span>${partial}</span>` : nothing}
      ${
        this.#uploads
          ? html`<span class="uploads"
              >${messages.uploading(this.#uploads.length)}<tp-progress
                class="upload-progress"
                .label=${messages.uploading(this.#uploads.length)}
                .value=${Math.round(
                  (100 * this.#uploads.reduce((sum, item) => sum + item.loaded, 0)) /
                    Math.max(
                      1,
                      this.#uploads.reduce((sum, item) => sum + item.total, 0),
                    ),
                )}
              ></tp-progress
            ></span>`
          : nothing
      }
      ${this.#statusMessage ? html`<span class="status-message" role="alert">${this.#statusMessage}</span>` : nothing}
    </div>`;
  }

  protected override render() {
    const messages = this.#messages;
    return this.renderPart(
      'file-explorer',
      { view: this.view, details: this.details },
      {
        properties: {
          class: 'root',
          role: 'region',
          'aria-label': this.label || messages.label,
          'data-view': this.view,
        },
        content: html`${this.#renderToolbar()}
          <tp-resizable-panel-group
            class="panels"
            @dragover=${this.#nativeDragOver}
            @dragleave=${this.#nativeDragLeave}
            @drop=${this.#nativeDrop}
          >
            ${
              this.sidebar
                ? html`<tp-resizable-panel default-size="24%" min-size="10rem">
                      <div class="pane sidebar" part="file-explorer-sidebar">
                        <slot name="sidebar-start"></slot>
                        ${this.#renderTree()}
                        <slot name="sidebar-end"></slot>
                      </div>
                    </tp-resizable-panel>
                    <tp-resizable-handle></tp-resizable-handle>`
                : nothing
            }
            <tp-resizable-panel min-size="16rem">
              <div
                class="pane main"
                part="file-explorer-main"
                ?data-drop-files=${this.#nativeTarget !== undefined}
              >
                ${this.#renderMain()}
              </div>
            </tp-resizable-panel>
            ${
              this.details
                ? html`<tp-resizable-handle></tp-resizable-handle>
                    <tp-resizable-panel default-size="26%" min-size="12rem">
                      ${this.#renderDetails()}
                    </tp-resizable-panel>`
                : nothing
            }
          </tp-resizable-panel-group>
          ${this.statusBar ? this.#renderStatus() : nothing}`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-file-explorer': TpFileExplorer;
  }
}
