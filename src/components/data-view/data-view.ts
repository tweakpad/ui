import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { Draggable, Droppable } from '../../foundation/drag-drop/entities.js';
import type { DragEvent } from '../../foundation/drag-drop/types.js';
import { TpElement } from '../../foundation/element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { gridKeyMove } from '../../foundation/grid-navigation.js';
import { INTERACTIVE_TARGET_SELECTOR } from '../../foundation/interactive-target.js';
import { adoptStyleText } from '../../foundation/generated-style.js';
import { observeResize } from '../../foundation/observation.js';
import { Scrollable } from '../../foundation/scrollable.js';
import { resolveLocale } from '../../foundation/services.js';
import type { ChangeReason } from '../../foundation/types.js';
import { normalizeIds, rangeIds, toggleId, unionIds } from '../../foundation/tree/selection.js';
import { VirtualList } from '../../foundation/virtual-list.js';
import { checkIcon } from '../../icons/check.js';
import { minusIcon } from '../../icons/minus.js';
import { dataViewPresentation } from '../../presentation/families/data-view.js';
import { TpButton } from '../button/button.js';
import { TpEmptyState } from '../empty-state/empty-state.js';
import { TpIcon } from '../icon/icon.js';
import { NativeScrollEdges } from '../shared/scroll-edges.js';
import { TpSkeleton } from '../skeleton/skeleton.js';
import { TpProgress } from '../progress/progress.js';
import {
  cellText,
  cellValue,
  columnTracks,
  defaultRowId,
  duplicateColumnIds,
  rowIdentities,
  type RowIdentities,
} from './columns.js';
import { resolveDataViewMessages } from './messages.js';
import { DATA_VIEW_BUILT_IN_LAYERS, dataViewLayerCss, runDataViewHook } from './middleware.js';
import {
  clampPosition,
  firstPosition,
  moveTile,
  movePosition,
  type DataViewGrid,
  type DataViewPosition,
} from './navigation.js';
import { nextSort, sortDataViewRows } from './sort.js';
import { dataViewStyles } from './styles.js';
import type {
  DataViewActivateDetail,
  DataViewBorders,
  DataViewCellContext,
  DataViewColumn,
  DataViewDragAndDrop,
  DataViewHeaderContext,
  DataViewHeaderVisibility,
  DataViewLayout,
  DataViewMessages,
  DataViewMiddleware,
  DataViewNavigation,
  DataViewPin,
  DataViewRowState,
  DataViewSelectionBehavior,
  DataViewSelectionMode,
  DataViewSize,
  DataViewSort,
  DataViewSortChangeCallback,
  DataViewSorting,
  DataViewStateContext,
  DataViewTileContext,
  DataViewValueChangeCallback,
} from './types.js';

/** Row heights of the size axis before the first row is measured, in CSS pixels. */
const ROW_HEIGHT: Record<DataViewSize, number> = { sm: 32, default: 40, lg: 48 };
/** Skeleton rows shown while the first rows load. */
const SKELETON_ROWS = 6;

const sameSort = (a: DataViewSort | null, b: DataViewSort | null) =>
  a === b || (!!a && !!b && a.column === b.column && a.direction === b.direction);

function normalizeSort(value: unknown): DataViewSort | null {
  if (!value || typeof value !== 'object') return null;
  const { column, direction } = value as Partial<DataViewSort>;
  return typeof column === 'string' && (direction === 'ascending' || direction === 'descending')
    ? { column, direction }
    : null;
}

/** A selection attribute: a JSON array, or identifiers separated by whitespace. */
const idListConverter = {
  fromAttribute: (value: string | null) => (value === null ? undefined : normalizeIds(value)),
  toAttribute: (value: readonly string[] | undefined) =>
    value === undefined ? null : JSON.stringify(value),
};

/** The id of the selection column, which no application column can take (not a part token). */
const SELECTION_COLUMN = '#selection';

/** On unless the attribute says `false`; reflected as present or `false`. */
const fadeOnByDefault = {
  fromAttribute: (value: string | null): boolean => value !== 'false',
  toAttribute: (value: boolean): string => (value ? '' : 'false'),
};

/** A sort attribute: `column` (ascending) or `column:descending`. */
const sortConverter = {
  fromAttribute(value: string | null): DataViewSort | null {
    if (!value?.trim()) return null;
    const [column, direction] = value.trim().split(':');
    return normalizeSort({ column, direction: direction || 'ascending' });
  },
  toAttribute(value: DataViewSort | null): string | null {
    return value ? `${value.column}:${value.direction}` : null;
  },
};

/** Where a focus position is kept: by row and column identity, so it survives sorting and updates. */
interface FocusKey {
  /** Null for the header row. */
  readonly row: string | null;
  /** Null for a whole row under row navigation. */
  readonly column: string | null;
}

/**
 * Application records as a compact, read-only grid of rows and columns: stable row identities,
 * configured columns with an optional cell renderer, a bounded scrolling viewport that mounts only
 * the rows near it, keyboard navigation by cell or by row, single-column sorting (local by default)
 * and optional single-row selection, with loading, empty and error states. Filters, search,
 * pagination and actions belong to the application around it.
 *
 * Rendering is layered: `middleware` wraps or replaces the content of cells, cell text, column
 * headers, sort indicators and the empty and error states around the built-in rendering, and
 * `partContracts` reach the element of every part below with the part's state.
 *
 * @summary A read-only, virtualized grid of application records with sorting and selection.
 * @slot empty - Content shown when there are no rows; a default Empty state otherwise.
 * @slot error - Content shown when `error` is set; a default Empty state with a Retry Button otherwise.
 * @slot header-action-<column id> - An action in a column's header, after its text, such as a Menu
 * whose trigger is an icon Button; Alt+ArrowDown on the header moves into it.
 * @fires tp-sort-change - A cancelable proposal of a new sort from a header press or key, or `sortBy`. `detail.value` is the sort or `null`.
 * @fires tp-value-change - A cancelable proposal of a new selected row id (or `null`); `detail.metadata.row` is the row.
 * @fires tp-row-activate - Enter on a row or a double click on it; `detail` holds the `row` and its `rowId`.
 * @fires tp-retry - The Retry Button of the default error state was pressed.
 * @cssprop --tp-data-view-row-height - The fixed height of every row.
 * @cssprop --tp-data-view-header-height - The height of the header row.
 * @cssprop --tp-data-view-tile-size - The least width of a tile under `layout="grid"`.
 * @cssprop --tp-data-view-tile-gap - The space between and around tiles under `layout="grid"`.
 * @csspart data-view - The root: the viewport and the state layer.
 * @csspart data-view-viewport - The scroller of the rows, under the header.
 * @csspart data-view-header - The header row, above the viewport, following the rows sideways.
 * @csspart data-view-column-header - One column header; it also carries `data-view-column-header-<column id>`.
 * @csspart data-view-sort-indicator - The sort indicator of a sortable header: a chevron up while ascending, down while descending.
 * @csspart data-view-body - The rows.
 * @csspart data-view-row - One row.
 * @csspart data-view-cell - One cell; it also carries `data-view-cell-<column id>`.
 * @csspart data-view-state - The empty or error layer under the header, or the loading Progress bar along the header's bottom edge.
 * @csspart data-view-skeleton - A placeholder bar of a loading row.
 * @csspart data-view-tile - A row as a tile under `layout="grid"`.
 * @csspart data-view-selection-header - The selection column's header, holding the select-all box.
 * @csspart data-view-selection-cell - A row's cell in the selection column.
 * @csspart data-view-selection-box - A selection box, checked, unchecked or mixed.
 */
export class TpDataView<T = unknown> extends Scrollable(TpElement) {
  static tagName = 'tp-data-view';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpEmptyState, TpIcon, TpProgress, TpSkeleton];
  }
  static override presentation = dataViewPresentation;
  static override properties = {
    ...TpElement.properties,
    rows: { attribute: false },
    columns: { attribute: false },
    getRowId: { attribute: false },
    sort: { converter: sortConverter, noAccessor: true },
    defaultSort: { converter: sortConverter, attribute: 'default-sort' },
    value: { noAccessor: true, converter: idListConverter },
    defaultValue: { attribute: 'default-value', converter: idListConverter },
    sorting: { type: String },
    striped: { type: Boolean, reflect: true },
    borders: { type: String, reflect: true },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    selectionBehavior: { type: String, attribute: 'selection-behavior' },
    selectionCheckboxes: { type: Boolean, attribute: 'selection-checkboxes', reflect: true },
    header: { type: String, reflect: true },
    layout: { type: String, reflect: true },
    dragAndDrop: { attribute: false },
    navigation: { type: String, reflect: true },
    size: { type: String, reflect: true },
    overscan: { type: Number },
    stickyStartColumns: { type: Number, attribute: 'sticky-start-columns' },
    stickyEndColumns: { type: Number, attribute: 'sticky-end-columns' },
    middleware: { attribute: false },
    loading: { type: Boolean, reflect: true },
    error: { type: String },
    label: { type: String },
    scrollEdgeFade: { converter: fadeOnByDefault, attribute: 'scroll-edge-fade', reflect: true },
    messages: { attribute: false },
    onValueChange: { attribute: false },
    onSortChange: { attribute: false },
  };
  static override styles = [TpElement.styles, dataViewStyles];

  /** The rows to show, in the application's order; the view never changes the array or its records. */
  rows: readonly T[] = [];
  /** The columns, in order. */
  columns: readonly DataViewColumn<T>[] = [];
  /** A row's stable identity; `row.id` by default. */
  getRowId: (row: T, index: number) => string | number | undefined | null = (row) =>
    defaultRowId(row);
  /** The sort an uncontrolled view starts with: `column` or `column:descending` as an attribute. */
  defaultSort: DataViewSort | null = null;
  /** The row ids an uncontrolled view starts with selected. */
  defaultValue: readonly string[] | undefined;
  /** Who orders the rows: the view, as a sorted copy, or the application. */
  sorting: DataViewSorting = 'local';
  /** Whether rows can be selected: none, one, or several. */
  selectionMode: DataViewSelectionMode = 'none';
  /**
   * How a press selects several rows: it toggles the pressed row, or replaces the selection with
   * it while Ctrl or Cmd toggles and Shift extends; under `replace`, arrow keys also select.
   */
  selectionBehavior: DataViewSelectionBehavior = 'toggle';
  /** A leading, pinned column of selection boxes, with a select-all box in its header. */
  selectionCheckboxes = false;
  /** Whether the header row shows; a hidden header still names each cell's column. */
  header: DataViewHeaderVisibility = 'visible';
  /**
   * A table of columns, or a grid of tiles at least `--tp-data-view-tile-size` wide that flows
   * into as many columns as fit; tiles render through the middleware's `tile` hook.
   */
  layout: DataViewLayout = 'table';
  /** Makes rows draggable or drop targets on a drag and drop manager shared with other surfaces. */
  dragAndDrop: DataViewDragAndDrop<T> | undefined;
  /** Fills alternate rows, apart from the hover and selected fills. */
  striped = false;
  /** The cell lines: row lines, a grid of row and column lines, or none. A flat appearance clears them. */
  borders: DataViewBorders = 'rows';
  /** What arrow keys move: a cell, header cells included, or a whole row. */
  navigation: DataViewNavigation = 'cell';
  /** Row height, cell inset and text. */
  size: DataViewSize = 'default';
  /** Rows mounted beyond each edge of the viewport. */
  overscan = 4;
  /** How many leading columns stay at the inline start while the others scroll sideways. */
  stickyStartColumns = 0;
  /** How many trailing columns stay at the inline end while the others scroll sideways. */
  stickyEndColumns = 0;
  /**
   * Rendering layers, outermost first, around the built-in rendering of cells, column headers,
   * sort indicators and the empty and error states; see `DataViewMiddleware`.
   */
  middleware: readonly DataViewMiddleware<T>[] = [];
  /** The rows are loading: placeholders without rows, a busy grid with them. */
  loading = false;
  /** An error message; shown with a Retry Button instead of the rows. */
  error: string | null = null;
  /** The grid's accessible name; `Data` by default. */
  label = '';
  /** Fades the rows at the scroller's edges where more rows lie beyond; `scroll-edge-fade="false"` turns them off. */
  override scrollEdgeFade = true;
  /** User-facing text; English by default. */
  messages: Partial<DataViewMessages> | undefined;
  /** Called with each `tp-value-change` proposal. */
  onValueChange: DataViewValueChangeCallback | undefined;
  /** Called with each `tp-sort-change` proposal. */
  onSortChange: DataViewSortChangeCallback | undefined;

  #providedValue: readonly string[] | undefined;
  /** The selected ids as a set, rebuilt when the value changes. */
  #selectedSet = new Set<string>();
  #selectedFor: readonly string[] | null = null;
  get #selected(): ReadonlySet<string> {
    const value = this.value;
    if (value !== this.#selectedFor) {
      this.#selectedFor = value;
      this.#selectedSet = new Set(value);
    }
    return this.#selectedSet;
  }
  /** The row a range extends from: the last pressed or toggled row. */
  #anchor: string | null = null;
  /** Drag and drop entities of the mounted rows, by row id. */
  #dnd = new Map<
    string,
    { element: HTMLElement; draggable: Draggable | undefined; droppable: Droppable | undefined }
  >();
  #dndReferences = new Map<string, (element: HTMLElement | null) => void>();
  #dndScope = `data-view-${Math.random().toString(36).slice(2, 8)}`;
  #dndManager: DataViewDragAndDrop<T>['manager'] | undefined;
  #releaseDndMonitor: (() => void) | undefined;
  #dropTarget: string | null = null;
  /** Tiles per row under `layout="grid"`, from the viewport's width. */
  #tileColumns = 1;
  #providedSort: DataViewSort | null | undefined;
  #focus: FocusKey | null = null;
  #rowHeight = 0;
  #identities: RowIdentities = rowIdentities([], () => undefined);
  #shown: readonly T[] = [];
  #shownKey: unknown[] = [];
  #viewport: HTMLElement | null = null;
  #releaseResize: (() => void) | undefined;
  /** The tile probe of the grid layout, observed for the tile size. */
  #tileProbe: HTMLElement | null = null;
  #releaseTileProbe: (() => void) | undefined;
  #pendingFocus = false;
  #announcer: LiveAnnouncer | undefined;
  /** The adopted styles of the middleware, and their release. */
  #layerCss = '';
  #releaseLayerCss: (() => void) | undefined;
  readonly #scrollEdges: NativeScrollEdges;

  readonly #virtual = new VirtualList(this, {
    list: () => this.renderRoot?.querySelector<HTMLElement>('.body') ?? null,
    viewport: () => this.#viewport,
    estimate: () => this.#rowHeight || ROW_HEIGHT[this.size] || ROW_HEIGHT.default,
    overscan: () => Math.max(0, Math.floor(this.overscan) || 0),
    enabled: () => true,
  });

  readonly #valueState = new ControllableState<readonly string[]>({
    host: this,
    initialValue: [],
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () =>
      this.defaultValue === undefined ? undefined : normalizeIds(this.defaultValue),
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: orderedValuesEqual,
    onChange: (event) => this.onValueChange?.(event),
    diagnostic: (message) => this.diagnose('data-view-value', message),
  });

  readonly #sortState = new ControllableState<DataViewSort | null>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedSort,
    readDefaultValue: () => normalizeSort(this.defaultSort),
    hasDefaultValue: () => !!normalizeSort(this.defaultSort),
    equals: sameSort,
    eventFactory: (value, previous, reason, sourceEvent, options) =>
      new TpValueChangeEvent(value, previous, reason, sourceEvent, options, 'tp-sort-change'),
    onChange: (event) => this.onSortChange?.(event),
    onCommit: (value, _previous, reason) => {
      if (reason === 'programmatic') return;
      const column = this.columns.find(
        (candidate) => candidate.id === (value ?? this.#lastSorted)?.column,
      );
      if (column) this.#announce(this.#messages.sorted(column.header, value?.direction ?? null));
    },
    diagnostic: (message) => this.diagnose('data-view-sort', message),
  });
  #lastSorted: DataViewSort | null = null;

  constructor() {
    super();
    this.#scrollEdges = new NativeScrollEdges(this, {
      viewports: () => (this.#viewport ? [this.#viewport] : []),
      // A pinned edge never fades: its column covers it. The fades are a mask on the rows that
      // follows them a frame late, so pinned cells fade with their rows rather than being masked
      // out of it, which would clip them while the columns scroll.
      threshold: () => ({
        xStart: this.#pinOf(0) === 'start' ? Number.MAX_SAFE_INTEGER : 0,
        xEnd: this.#pinOf(this.#columns.length - 1) === 'end' ? Number.MAX_SAFE_INTEGER : 0,
      }),
    });
  }

  // ---- lanes ---------------------------------------------------------------------------------

  /** The selected row ids, in the order they were selected. */
  get value(): readonly string[] {
    return this.#valueState.value ?? [];
  }
  set value(value: readonly string[]) {
    const previous = this.value;
    this.#providedValue = value === undefined ? undefined : normalizeIds(value);
    if (this.hasUpdated) this.#valueState.sync();
    this.requestUpdate('value', previous);
  }

  /** The sort: a column id and a direction, or `null`. */
  get sort(): DataViewSort | null {
    return this.#sortState.value ?? null;
  }
  set sort(value: DataViewSort | null) {
    const previous = this.sort;
    this.#providedSort = value === undefined ? undefined : normalizeSort(value);
    if (this.hasUpdated) this.#sortState.sync();
    this.requestUpdate('sort', previous);
  }

  /** The ids of the rows in the order they are shown, mounted or not. */
  get visibleRowIds(): readonly string[] {
    this.#prepareRows();
    return this.#identities.ids;
  }

  /** Proposes a sort as a header press does; a missing direction cycles the column's sort. */
  sortBy(columnId: string | null, direction?: DataViewSort['direction']): boolean {
    const next =
      columnId === null
        ? null
        : direction
          ? { column: columnId, direction }
          : nextSort(this.sort, columnId);
    return this.#setSort(next, 'imperative-action');
  }

  /** Proposes a selection of only this row, or `null` to clear the selection. */
  selectRow(id: string | null): boolean {
    return id === null
      ? this.#setSelection([], 'imperative-action')
      : this.#select(id, 'replace', 'imperative-action');
  }

  /** Proposes selecting every row, under `multiple`. */
  selectAll(): boolean {
    if (this.selectionMode !== 'multiple') return false;
    return this.#setSelection(this.#identities.ids, 'imperative-action');
  }

  /** Proposes an empty selection. */
  clearSelection(): boolean {
    return this.#setSelection([], 'imperative-action');
  }

  /** Scrolls a row into view, mounting it. */
  scrollToRow(id: string, align: 'nearest' | 'start' | 'center' = 'nearest'): boolean {
    this.#prepareRows();
    const index = this.#identities.index.get(id);
    return index === undefined ? false : this.#virtual.scrollToIndex(this.#unitOf(index), align);
  }

  /** Moves focus to a row, or one of its cells under cell navigation, mounting it first. */
  async focusRow(id: string, columnId?: string): Promise<boolean> {
    this.#prepareRows();
    if (!this.#identities.index.has(id)) return false;
    const column =
      this.navigation === 'row'
        ? null
        : (columnId ?? this.#focus?.column ?? this.columns[0]?.id ?? null);
    this.#moveFocus({ row: id, column });
    await this.updateComplete;
    return true;
  }

  // ---- lifecycle -----------------------------------------------------------------------------

  override disconnectedCallback(): void {
    this.#releaseResize?.();
    this.#releaseResize = undefined;
    this.#releaseTileProbe?.();
    this.#releaseTileProbe = undefined;
    this.#tileProbe = null;
    this.#viewport?.removeEventListener('scroll', this.#syncHead);
    this.#viewport = null;
    this.#announcer?.dispose();
    this.#announcer = undefined;
    this.#releaseLayerCss?.();
    this.#releaseLayerCss = undefined;
    this.#layerCss = '';
    this.#releaseDragAndDrop();
    super.disconnectedCallback();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // A reconnected view adopts its middleware styles again.
    if (this.hasUpdated && this.middleware.length) this.requestUpdate();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.#valueState.initialize();
    this.#sortState.initialize();
    if (changed.has('columns')) {
      const repeated = duplicateColumnIds(this.columns as readonly DataViewColumn<never>[]);
      if (repeated.length)
        this.diagnose(
          'data-view-column-id',
          `Column ids must be unique; repeated: ${repeated.join(', ')}.`,
          {
            once: true,
          },
        );
    }
    if (changed.has('size') || changed.has('layout')) this.#rowHeight = 0;
    if (changed.has('layout')) {
      this.#virtual.setKeys(this.#virtualKeys());
      this.#revealAfterLayout = this.hasUpdated;
    }
    // Fades are on by default: a removed attribute means the default, which the fade owner reads
    // from the attribute's presence.
    if (this.scrollEdgeFade && this.getAttribute('scroll-edge-fade') === null)
      this.setAttribute('scroll-edge-fade', '');
    this.#prepareRows();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const viewport = this.renderRoot.querySelector<HTMLElement>('.viewport');
    if (viewport !== this.#viewport) {
      this.#releaseResize?.();
      this.#viewport?.removeEventListener('scroll', this.#syncHead);
      this.#viewport = viewport;
      viewport?.addEventListener('scroll', this.#syncHead, { passive: true });
      this.#releaseResize = viewport
        ? observeResize(viewport, () => {
            this.#measureGutter();
            this.#measurePins();
            if (this.layout === 'grid') this.#measureTiles();
            this.#virtual.refresh();
          })
        : undefined;
      this.#measureGutter();
      this.#virtual.refresh();
    }
    if (
      changed.has('columns') ||
      changed.has('stickyStartColumns') ||
      changed.has('stickyEndColumns') ||
      changed.has('selectionCheckboxes') ||
      changed.has('selectionMode') ||
      changed.has('size')
    )
      this.#measurePins();
    this.#syncHead();
    this.#adoptLayerCss();
    if (changed.has('dragAndDrop') || changed.has('rows') || changed.has('columns'))
      this.#refreshDragAndDrop();
    // Rows have one fixed height; the first mounted row tells it once its styles apply.
    const row = this.renderRoot.querySelector<HTMLElement>('.body > [role="row"]');
    // Tiles per row follow the probe's laid-out size, read once layout settles (a new probe is
    // observed at once), so the measurement never schedules an update from inside this one.
    const probe = this.renderRoot.querySelector<HTMLElement>('.tile-probe');
    if (probe !== this.#tileProbe) {
      this.#releaseTileProbe?.();
      this.#tileProbe = probe;
      this.#tilesMeasured = false;
      this.#releaseTileProbe = probe ? observeResize(probe, () => this.#measureTiles()) : undefined;
    }
    const height = row?.offsetHeight ?? 0;
    if (height && Math.abs(height - this.#rowHeight) > 0.5) {
      this.#rowHeight = height;
      this.#virtual.setKeys(this.#virtualKeys());
    }
    // Mounted rows and states change the scroll extent the edge fades follow.
    this.#scrollEdges.invalidateContent();
    // The grid is one tab stop: header actions are reached with Alt+ArrowDown.
    for (const slot of this.renderRoot.querySelectorAll<HTMLSlotElement>('.header slot.action'))
      for (const element of actionTargets(slot))
        if (!element.hasAttribute('tabindex')) element.setAttribute('tabindex', '-1');
    // The grid is one tab stop: interactive content of a cell is reached with Enter.
    for (const element of this.renderRoot.querySelectorAll<HTMLElement>('.body [data-column] *'))
      if (element.matches(INTERACTIVE_TARGET_SELECTOR) && element.tabIndex >= 0)
        element.tabIndex = -1;
    if (this.#pendingFocus) {
      this.#pendingFocus = false;
      this.#focusTabStop();
    }
    // A new layout keeps the focused row in view, else starts at the top.
    if (
      this.#revealAfterLayout &&
      this.#viewport &&
      (this.layout !== 'grid' || this.#tilesMeasured)
    ) {
      this.#revealAfterLayout = false;
      const index = this.#focus?.row ? this.#identities.index.get(this.#focus.row) : undefined;
      if (index === undefined) this.#viewport.scrollTop = 0;
      else this.#virtual.scrollToIndex(this.#unitOf(index), 'nearest');
    }
  }
  #revealAfterLayout = false;
  /** Whether the tiles per row follow the current probe; a reveal waits for it. */
  #tilesMeasured = false;

  /**
   * The rows scroll under a header that stays out of the scroller, so the scrollbar never covers
   * it: the header follows the rows sideways, and a classic scrollbar's width pads its end so the
   * columns line up.
   */
  readonly #syncHead = (): void => {
    const head = this.renderRoot.querySelector<HTMLElement>('.head');
    const viewport = this.#viewport;
    if (head && viewport && head.scrollLeft !== viewport.scrollLeft)
      head.scrollLeft = viewport.scrollLeft;
    // Which inline edges have columns scrolled past them, for the pinned columns' edge.
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    if (!root || !viewport) return;
    const offset = Math.abs(viewport.scrollLeft);
    const range = viewport.scrollWidth - viewport.clientWidth;
    const scrolled = [offset > 0.5 ? 'start' : '', offset < range - 0.5 ? 'end' : '']
      .filter(Boolean)
      .join(' ');
    if ((root.getAttribute('data-overflow') ?? '') !== scrolled)
      if (scrolled) root.setAttribute('data-overflow', scrolled);
      else root.removeAttribute('data-overflow');
  };

  /**
   * Pinned columns stay at their edge at the summed widths of the pinned columns before them; the
   * offsets and the pinned extents (which keep focused cells clear of them) live on the root.
   */
  #measurePins(): void {
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    if (!root) return;
    const headers = [
      ...this.renderRoot.querySelectorAll<HTMLElement>('.header > [role="columnheader"]'),
    ];
    const widths = headers.map((header) => header.getBoundingClientRect().width);
    let start = 0;
    let end = 0;
    for (let index = 0; index < widths.length; index++)
      if (this.#pinOf(index) === 'start') {
        root.style.setProperty(`--_pin-${index}`, `${start}px`);
        start += widths[index]!;
      }
    for (let index = widths.length - 1; index >= 0; index--)
      if (this.#pinOf(index) === 'end') {
        root.style.setProperty(`--_pin-${index}`, `${end}px`);
        end += widths[index]!;
      }
    root.style.setProperty('--_pinned-start', `${start}px`);
    root.style.setProperty('--_pinned-end', `${end}px`);
  }

  #measureGutter(): void {
    const viewport = this.#viewport;
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    if (!viewport || !root) return;
    const gutter = Math.max(0, viewport.offsetWidth - viewport.clientWidth);
    root.style.setProperty('--_gutter', `${gutter}px`);
  }

  /** Adopts the middleware's styles into the shadow root, replacing them when they change. */
  #adoptLayerCss(): void {
    const css = dataViewLayerCss(this.middleware as readonly DataViewMiddleware<unknown>[]);
    if (css === this.#layerCss) return;
    this.#releaseLayerCss?.();
    this.#releaseLayerCss = undefined;
    this.#layerCss = css;
    if (css && this.renderRoot instanceof ShadowRoot)
      this.#releaseLayerCss = adoptStyleText(this, this.renderRoot, css);
  }

  /** A wheel over the header scrolls the rows, as it would over a header inside them. */
  readonly #headWheel = (event: WheelEvent): void => {
    const viewport = this.#viewport;
    if (!viewport || event.ctrlKey) return;
    const lines = event.deltaMode === 1 ? this.#rowHeight || ROW_HEIGHT.default : 1;
    const dx = (event.shiftKey && !event.deltaX ? event.deltaY : event.deltaX) * lines;
    const dy = (event.shiftKey && !event.deltaX ? 0 : event.deltaY) * lines;
    const top = viewport.scrollTop;
    const left = viewport.scrollLeft;
    viewport.scrollBy(dx, dy);
    if (viewport.scrollTop !== top || viewport.scrollLeft !== left) event.preventDefault();
  };

  /** Recomputes the shown rows and their identities when an input changed. */
  #prepareRows(): void {
    const key = [this.rows, this.columns, this.sorting, this.sort, this.getRowId];
    if (key.every((part, index) => part === this.#shownKey[index])) return;
    this.#shownKey = key;
    const rows = Array.isArray(this.rows) ? this.rows : [];
    this.#shown =
      this.sorting === 'manual'
        ? rows
        : sortDataViewRows(rows, this.sort, this.columns, localeOption(resolveLocale(this)));
    const identities = rowIdentities(this.#shown, (row, index) => this.getRowId(row, index));
    if (identities.missing)
      this.diagnose(
        'data-view-row-id',
        `${identities.missing} row(s) have no id; getRowId must return one.`,
        {
          once: true,
        },
      );
    if (identities.duplicates.length)
      this.diagnose(
        'data-view-row-id',
        `Row ids must be unique; repeated: ${identities.duplicates.slice(0, 5).join(', ')}.`,
        { once: true },
      );
    this.#identities = identities;
    this.#virtual.setKeys(this.#virtualKeys());
    // An uncontrolled selection drops the ids of rows that are gone.
    if (!this.#valueState.controlled && this.hasUpdated) {
      const kept = this.value.filter((id) => identities.index.has(id));
      if (kept.length !== this.value.length) this.#valueState.reconcile(kept);
    }
  }

  /** Whether rows can be selected. */
  get #selectable(): boolean {
    return this.selectionMode === 'single' || this.selectionMode === 'multiple';
  }

  #selectionColumn: DataViewColumn<T> | undefined;
  /** The columns as laid out: the selection column first when it shows, then the application's. */
  get #columns(): readonly DataViewColumn<T>[] {
    if (!this.selectionCheckboxes || !this.#selectable) return this.columns;
    this.#selectionColumn ??= {
      id: SELECTION_COLUMN,
      header: '',
      width: 'var(--tp-space-10)',
      align: 'center',
    };
    return [this.#selectionColumn, ...this.columns];
  }

  /** The virtual window's units: rows of the table, or rows of tiles. */
  #virtualKeys(): string[] {
    const ids = this.#identities.ids;
    if (this.layout !== 'grid') return [...ids];
    const rows = Math.ceil(ids.length / this.#tileColumns);
    return Array.from({ length: rows }, (_, row) => `tiles:${row}`);
  }

  /** The virtual unit of a shown row: itself, or its row of tiles. */
  #unitOf(index: number): number {
    return this.layout === 'grid' ? Math.floor(index / this.#tileColumns) : index;
  }

  /** How many tiles fit a row: the probes hold a tile with its gap, and the gap alone. */
  #measureTiles(): void {
    const tile = this.renderRoot.querySelector<HTMLElement>('.tile-probe');
    const gap = this.renderRoot.querySelector<HTMLElement>('.gap-probe');
    const body = this.renderRoot.querySelector<HTMLElement>('.body');
    if (!tile || !gap || !body || !this.#viewport) return;
    const style = getComputedStyle(body);
    const available =
      this.#viewport.clientWidth -
      (parseFloat(style.paddingInlineStart) || 0) -
      (parseFloat(style.paddingInlineEnd) || 0);
    const columns = Math.max(
      1,
      Math.floor((available + gap.offsetWidth) / (tile.offsetWidth || 1)),
    );
    const first = !this.#tilesMeasured;
    this.#tilesMeasured = true;
    if (columns === this.#tileColumns) {
      if (first && this.#revealAfterLayout) this.requestUpdate();
      return;
    }
    this.#tileColumns = columns;
    this.#virtual.setKeys(this.#virtualKeys());
    this.requestUpdate();
  }

  /** Whether all, none or only some rows are selected. */
  #selectionState(): boolean | 'mixed' {
    const ids = this.#identities.ids;
    let count = 0;
    for (const id of ids) if (this.#selected.has(id)) count++;
    return count === 0 ? false : count === ids.length ? true : 'mixed';
  }

  // ---- model ---------------------------------------------------------------------------------

  get #messages(): DataViewMessages {
    return resolveDataViewMessages(this.messages);
  }

  /** The navigation grid; `measure` reads the viewport for the page size (key handling only). */
  #grid(measure = false): DataViewGrid {
    let page = 10;
    const viewport = this.#viewport;
    if (measure && viewport) {
      const rowHeight = this.#rowHeight || ROW_HEIGHT[this.size] || ROW_HEIGHT.default;
      page = Math.max(1, Math.floor(viewport.clientHeight / rowHeight) - 1);
    }
    return {
      mode: this.navigation === 'row' ? 'row' : 'cell',
      rows: this.#state === 'rows' ? this.#identities.ids.length : 0,
      columns: this.#columns.length,
      page,
      header: (column) =>
        this.header !== 'hidden' &&
        (this.navigation !== 'row' ||
          !!this.#columns[column]?.sortable ||
          this.#columns[column]?.id === SELECTION_COLUMN),
    };
  }

  #positionOf(key: FocusKey | null): DataViewPosition | null {
    if (!key) return null;
    const column = key.column === null ? -1 : this.#columns.findIndex((c) => c.id === key.column);
    if (key.row === null) return column < 0 ? null : { row: -1, column };
    const row = this.#identities.index.get(key.row);
    if (row === undefined) return null;
    return { row, column };
  }

  #keyOf(position: DataViewPosition): FocusKey {
    return {
      row: position.row < 0 ? null : (this.#identities.ids[position.row] ?? null),
      column: position.column < 0 ? null : (this.#columns[position.column]?.id ?? null),
    };
  }

  /** The roving tab stop: the focused position kept by id, else the nearest valid one, else the first. */
  #tabStop(): FocusKey | null {
    if (this.layout === 'grid') {
      const ids = this.#identities.ids;
      if (this.#state !== 'rows' || !ids.length) return null;
      if (this.#focus?.row && this.#identities.index.has(this.#focus.row))
        return { row: this.#focus.row, column: null };
      const near = Math.min(this.#lastFocusIndex ?? 0, ids.length - 1);
      return { row: ids[near]!, column: null };
    }
    const grid = this.#grid();
    const kept = this.#positionOf(this.#focus);
    if (kept) {
      const clamped = clampPosition(grid, kept);
      return clamped ? this.#keyOf(clamped) : null;
    }
    // A removed row: stay near where it was.
    if (this.#focus?.row && this.#lastFocusIndex !== null) {
      const clamped = clampPosition(grid, {
        row: Math.min(this.#lastFocusIndex, grid.rows - 1),
        column:
          this.#focus.column === null
            ? -1
            : Math.max(
                0,
                this.#columns.findIndex((c) => c.id === this.#focus!.column),
              ),
      });
      if (clamped && clamped.row >= 0) return this.#keyOf(clamped);
    }
    const first = firstPosition(grid);
    return first ? this.#keyOf(first) : null;
  }
  #lastFocusIndex: number | null = null;

  get #state(): 'rows' | 'loading' | 'empty' | 'error' {
    if (this.error !== null && this.error !== undefined && this.error !== '') return 'error';
    if (this.rows.length) return 'rows';
    return this.loading ? 'loading' : 'empty';
  }

  // ---- proposals -----------------------------------------------------------------------------

  #setSort(next: DataViewSort | null, reason: ChangeReason, source?: Event): boolean {
    if (sameSort(next, this.sort)) return false;
    this.#lastSorted = this.sort;
    return this.#sortState.set(next, reason, source);
  }

  /** Proposes a selection, narrowed to the mode; `metadata.rows` carries the selected rows. */
  #setSelection(next: readonly string[], reason: ChangeReason, source?: Event): boolean {
    if (!this.#selectable) return false;
    const ids = this.selectionMode === 'single' ? next.slice(0, 1) : [...next];
    if (orderedValuesEqual(ids, this.value)) return false;
    const rows = ids.flatMap((id) => {
      const index = this.#identities.index.get(id);
      return index === undefined ? [] : [this.#shown[index]!];
    });
    return this.#valueState.set(ids, reason, source, { metadata: { rows } });
  }

  /**
   * Selects by the row a press or key acts on: `replace` selects only it, `toggle` flips it,
   * `range` selects from the anchor to it (added to the selection with `union`).
   */
  #select(
    id: string,
    mode: 'replace' | 'toggle' | 'range',
    reason: ChangeReason,
    source?: Event,
    union = false,
  ): boolean {
    if (!this.#selectable || !this.#identities.index.has(id)) return false;
    const multiple = this.selectionMode === 'multiple';
    if (!multiple || mode === 'replace') {
      this.#anchor = id;
      if (!multiple && mode === 'toggle' && this.#selected.has(id))
        return this.#setSelection([], reason, source);
      return this.#setSelection([id], reason, source);
    }
    if (mode === 'range') {
      const index = this.#identities.index;
      const anchor = this.#anchor !== null && index.has(this.#anchor) ? this.#anchor : id;
      const range = rangeIds(this.#identities.ids, index.get(anchor)!, index.get(id)!, () => true);
      return this.#setSelection(union ? unionIds(this.value, range) : range, reason, source);
    }
    this.#anchor = id;
    return this.#setSelection(toggleId(this.value, id), reason, source);
  }

  /** The select-all box: selects every row, or clears when every row is selected. */
  #toggleAll(reason: ChangeReason, source?: Event): void {
    if (this.selectionMode !== 'multiple') return;
    this.#setSelection(this.#selectionState() === true ? [] : this.#identities.ids, reason, source);
  }

  #activate(rowId: string, source: Event): void {
    const index = this.#identities.index.get(rowId);
    if (index === undefined) return;
    const detail: DataViewActivateDetail<T> = {
      row: this.#shown[index]!,
      rowId,
      sourceEvent: source,
    };
    this.emit('tp-row-activate', detail);
  }

  #announce(message: string): void {
    this.#announcer ??= new LiveAnnouncer({ document: () => this.ownerDocument });
    this.#announcer.announce(message);
  }

  #sortColumn(column: DataViewColumn<T>, reason: ChangeReason, source: Event): void {
    if (!column.sortable) return;
    this.#setSort(nextSort(this.sort, column.id), reason, source);
  }

  // ---- focus ---------------------------------------------------------------------------------

  #moveFocus(key: FocusKey): void {
    this.#focus = key;
    const position = this.#positionOf(key);
    if (position && position.row >= 0) {
      this.#lastFocusIndex = position.row;
      this.#virtual.scrollToIndex(this.#unitOf(position.row));
    }
    this.#pendingFocus = true;
    this.requestUpdate();
  }

  #focusTabStop(): void {
    const element = this.#elementOf(this.#focus);
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    // A revealed header cell scrolled the header; the rows follow it.
    const head = this.renderRoot.querySelector<HTMLElement>('.head');
    if (head && this.#viewport && this.#focus?.row === null)
      this.#viewport.scrollLeft = head.scrollLeft;
  }

  #elementOf(key: FocusKey | null): HTMLElement | null {
    if (!key) return null;
    const root = this.renderRoot;
    if (key.row === null)
      return root.querySelector<HTMLElement>(
        `.header [data-column="${CSS.escape(key.column ?? '')}"]`,
      );
    const row = root.querySelector<HTMLElement>(`.body [data-row="${CSS.escape(key.row)}"]`);
    if (!row || key.column === null) return row;
    return row.querySelector<HTMLElement>(`[data-column="${CSS.escape(key.column)}"]`);
  }

  /** The focus key of a grid element in an event's path, and that element. */
  #target(event: Event): { key: FocusKey; element: HTMLElement } | null {
    for (const node of event.composedPath()) {
      if (!(node instanceof HTMLElement)) continue;
      if (node.classList.contains('grid')) return null;
      const column = node.dataset.column;
      const rowElement = node.closest<HTMLElement>('[data-row]');
      if (column !== undefined && node.closest('.header'))
        return { key: { row: null, column }, element: node };
      if (column !== undefined && rowElement)
        return {
          key: { row: rowElement.dataset.row!, column: this.navigation === 'row' ? null : column },
          element: this.navigation === 'row' ? rowElement : node,
        };
      if (node.dataset.row !== undefined)
        return { key: { row: node.dataset.row, column: null }, element: node };
    }
    return null;
  }

  readonly #focusIn = (event: FocusEvent): void => {
    const target = this.#target(event);
    if (!target) return;
    const same = this.#focus?.row === target.key.row && this.#focus?.column === target.key.column;
    if (same) return;
    this.#focus = target.key;
    const position = this.#positionOf(target.key);
    if (position && position.row >= 0) this.#lastFocusIndex = position.row;
    this.requestUpdate();
  };

  readonly #keydown = (event: KeyboardEvent): void => {
    const target = this.#target(event);
    if (!target) return;
    // Keys inside a cell's own interactive content belong to it; Escape brings focus back.
    if (contentTarget(event)) {
      if (event.key === 'Escape') {
        event.preventDefault();
        target.element.focus();
      }
      return;
    }
    const { key } = target;
    const multiple = this.selectionMode === 'multiple';
    const mod = event.ctrlKey || event.metaKey;
    if (key.row === null) {
      if (key.column === SELECTION_COLUMN) {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          this.#toggleAll('keyboard', event);
          return;
        }
      } else {
        const column = this.columns.find((candidate) => candidate.id === key.column);
        // Alt with ArrowDown moves into the column's header action, such as its menu trigger.
        if (event.altKey && event.key === 'ArrowDown') {
          const action = headerAction(target.element);
          if (action) {
            event.preventDefault();
            action.focus();
            return;
          }
        }
        if ((event.key === 'Enter' || event.key === ' ') && column?.sortable) {
          event.preventDefault();
          this.#sortColumn(column, 'keyboard', event);
          return;
        }
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      if (!this.#selectable) return;
      if (multiple && event.shiftKey) this.#select(key.row, 'range', 'keyboard', event, mod);
      else if (multiple || mod) this.#select(key.row, 'toggle', 'keyboard', event);
      else this.#select(key.row, 'replace', 'keyboard', event);
      return;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      if (key.column === SELECTION_COLUMN) {
        this.#select(key.row, 'toggle', 'keyboard', event);
        return;
      }
      // A cell with interactive content: Enter moves into it.
      const content = this.navigation === 'cell' ? firstInteractive(target.element) : null;
      if (content) content.focus();
      else this.#activate(key.row, event);
      return;
    }
    if (multiple && mod && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault();
      this.#setSelection(this.#identities.ids, 'keyboard', event);
      return;
    }
    if (multiple && event.key === 'Escape' && this.value.length) {
      event.preventDefault();
      this.#setSelection([], 'keyboard', event);
      return;
    }
    const move = gridKeyMove(event, this.direction === 'rtl');
    if (!move) return;
    const from = this.#positionOf(key);
    if (!from) return;
    let nextKey: FocusKey;
    if (this.layout === 'grid') {
      const rowHeight = this.#rowHeight || ROW_HEIGHT.default;
      const page = Math.max(1, Math.floor((this.#viewport?.clientHeight ?? 0) / rowHeight) - 1);
      const index = moveTile(from.row, this.#identities.ids.length, this.#tileColumns, move, page);
      event.preventDefault();
      if (index === null) return;
      nextKey = { row: this.#identities.ids[index]!, column: null };
    } else {
      const next = movePosition(this.#grid(true), from, move);
      event.preventDefault();
      if (!next) return;
      nextKey = this.#keyOf(next);
    }
    this.#moveFocus(nextKey);
    // Moving between rows extends the selection with Shift, and selects under `replace`.
    if (nextKey.row !== null && nextKey.row !== key.row && this.#selectable) {
      if (multiple && event.shiftKey) this.#select(nextKey.row, 'range', 'keyboard', event);
      else if (this.selectionBehavior === 'replace' && !mod)
        this.#select(nextKey.row, 'replace', 'keyboard', event);
    }
  };

  readonly #click = (event: MouseEvent): void => {
    const target = this.#target(event);
    if (!target) return;
    const { key } = target;
    // The select-all box is drawn, not a control of its own: its press is the header's.
    if (key.row === null && key.column === SELECTION_COLUMN) {
      this.#toggleAll('item-press', event);
      return;
    }
    if (contentTarget(event)) return;
    if (key.row === null) {
      const column = this.columns.find((candidate) => candidate.id === key.column);
      if (column) this.#sortColumn(column, 'item-press', event);
      return;
    }
    if (!this.#selectable) return;
    const mod = event.ctrlKey || event.metaKey;
    const box = event
      .composedPath()
      .some(
        (node) =>
          node instanceof HTMLElement &&
          (node.dataset.column === SELECTION_COLUMN || node.hasAttribute('data-selection-box')),
      );
    if (this.selectionMode === 'single') {
      this.#select(key.row, mod || box ? 'toggle' : 'replace', 'item-press', event);
      return;
    }
    if (event.shiftKey) this.#select(key.row, 'range', 'item-press', event, mod);
    else if (box || mod || this.selectionBehavior === 'toggle')
      this.#select(key.row, 'toggle', 'item-press', event);
    else this.#select(key.row, 'replace', 'item-press', event);
  };

  readonly #doubleClick = (event: MouseEvent): void => {
    const target = this.#target(event);
    if (!target || target.key.row === null || contentTarget(event)) return;
    this.#activate(target.key.row, event);
  };

  // ---- drag and drop -------------------------------------------------------------------------

  /** The reference that binds a mounted row to the drag and drop manager, stable per row. */
  #rowReference(id: string): ((element: HTMLElement | null) => void) | undefined {
    if (!this.dragAndDrop) return undefined;
    let reference = this.#dndReferences.get(id);
    if (!reference) {
      reference = (element) => this.#bindRow(id, element);
      this.#dndReferences.set(id, reference);
    }
    return reference;
  }

  /** Registers a row as a drag source or drop target, per the hooks; `null` releases it. */
  #bindRow(id: string, element: HTMLElement | null): void {
    const previous = this.#dnd.get(id);
    previous?.draggable?.destroy();
    previous?.droppable?.destroy();
    this.#dnd.delete(id);
    const config = this.dragAndDrop;
    const index = this.#identities.index.get(id);
    if (!element || !config || index === undefined) return;
    const row = this.#shown[index]!;
    const entity = `${this.#dndScope}:${id}`;
    const data = config.source?.(row, id) ?? null;
    const draggable = data
      ? new Draggable(
          { id: entity, element, type: 'data-view-row', data: { ...data, rowId: id, view: this } },
          config.manager,
        )
      : undefined;
    const droppable = config.target?.(row, id)
      ? new Droppable({ id: entity, element, data: { rowId: id, row, view: this } }, config.manager)
      : undefined;
    this.#dnd.set(id, { element, draggable, droppable });
  }

  /** Rebinds the mounted rows after their rows or the hooks changed. */
  #refreshDragAndDrop(): void {
    const manager = this.dragAndDrop?.manager;
    if (manager !== this.#dndManager) {
      this.#releaseDndMonitor?.();
      this.#releaseDndMonitor = undefined;
      this.#dndManager = manager;
      if (manager) {
        const over = (event: DragEvent) => this.#markDropTarget(event);
        const end = () => this.#markDropTarget(null);
        const releases = [
          manager.monitor.addEventListener('dragover', over),
          manager.monitor.addEventListener('dragend', end),
        ];
        this.#releaseDndMonitor = () => releases.forEach((release) => release());
      }
    }
    for (const [id, entry] of [...this.#dnd]) this.#bindRow(id, entry.element);
    if (!this.dragAndDrop) this.#dndReferences.clear();
  }

  /** Marks the row under a drag, never the dragged row itself. */
  #markDropTarget(event: DragEvent | null): void {
    const target = event?.operation.target;
    const source = event?.operation.source;
    const prefix = `${this.#dndScope}:`;
    const id =
      target && String(target.id).startsWith(prefix) && target.id !== source?.id
        ? String(target.id).slice(prefix.length)
        : null;
    if (id === this.#dropTarget) return;
    this.#dropTarget = id;
    this.requestUpdate();
  }

  #releaseDragAndDrop(): void {
    for (const entry of this.#dnd.values()) {
      entry.draggable?.destroy();
      entry.droppable?.destroy();
    }
    this.#dnd.clear();
    this.#releaseDndMonitor?.();
    this.#releaseDndMonitor = undefined;
    this.#dndManager = undefined;
  }

  // ---- render --------------------------------------------------------------------------------

  /** The rendering layers: the view's middleware, then the built-in layers. */
  get #layers(): readonly DataViewMiddleware<T>[] {
    const own = Array.isArray(this.middleware) ? this.middleware : [];
    return [...own, ...(DATA_VIEW_BUILT_IN_LAYERS as readonly DataViewMiddleware<T>[])];
  }

  /** The pinned edge of a column, from the sticky counts. */
  #pinOf(index: number): DataViewPin | null {
    const columns = this.#columns;
    const count = columns.length;
    const whole = (value: number) =>
      Number.isFinite(value) ? Math.max(0, Math.min(count, Math.floor(value))) : 0;
    // The selection column always stays at the start, before the pinned application columns.
    const selection = columns[0]?.id === SELECTION_COLUMN ? 1 : 0;
    const start = Math.min(count, whole(this.stickyStartColumns) + selection);
    const end = Math.min(whole(this.stickyEndColumns), count - start);
    return index < start ? 'start' : index >= count - end ? 'end' : null;
  }

  /** Placement of a pinned header or body cell: its sticky offset and edge marker. */
  #pinProperties(index: number, pin: DataViewPin | null): Record<string, unknown> {
    if (!pin) return {};
    const edge =
      (pin === 'start' && this.#pinOf(index + 1) !== 'start') ||
      (pin === 'end' && this.#pinOf(index - 1) !== 'end');
    return {
      'data-pinned': pin,
      'data-pin-edge': edge ? pin : nothing,
      style: { [`inset-inline-${pin}`]: `var(--_pin-${index}, 0px)` },
    };
  }

  #headerContext(column: DataViewColumn<T>, index: number, stop: FocusKey | null) {
    const sort = this.sort;
    const direction = sort?.column === column.id ? sort.direction : null;
    const context: DataViewHeaderContext<T> = {
      column,
      columnIndex: index,
      direction,
      sortable: !!column.sortable,
      focused: stop?.row === null && stop.column === column.id,
      pinned: this.#pinOf(index),
      sortIndicator: () =>
        column.sortable
          ? this.renderPart('data-view-sort-indicator', context, {
              tag: 'span',
              properties: { 'aria-hidden': 'true', 'data-active': !!direction },
              content: runDataViewHook(this.#layers, 'sortIndicator', context),
            })
          : nothing,
      action: html`<slot class="action" name=${`header-action-${column.id}`}></slot>`,
    };
    return context;
  }

  /** A selection box: checked, unchecked or mixed, drawn without a control of its own. */
  #renderBox(checked: boolean | 'mixed', properties: Record<string, unknown> = {}): unknown {
    return this.renderPart(
      'data-view-selection-box',
      { checked },
      {
        tag: 'span',
        properties: {
          'aria-hidden': 'true',
          'data-checked': checked === true,
          'data-indeterminate': checked === 'mixed',
          ...properties,
        },
        content: html`<span class="box"
          ><span class="check"
            ><tp-icon .icon=${checked === 'mixed' ? minusIcon : checkIcon}></tp-icon></span
        ></span>`,
      },
    );
  }

  /** The selection column's header: the select-all box under `multiple`. */
  #renderSelectionHeader(index: number, stop: FocusKey | null): unknown {
    const checked = this.#selectionState();
    const multiple = this.selectionMode === 'multiple';
    const focused = stop?.row === null && stop.column === SELECTION_COLUMN;
    const messages = this.#messages;
    return this.renderPart(
      'data-view-selection-header',
      { checked },
      {
        properties: {
          part: 'data-view-column-header data-view-selection-header',
          role: 'columnheader',
          'aria-colindex': index + 1,
          'aria-label': messages.selection,
          tabindex: focused ? '0' : '-1',
          'data-column': SELECTION_COLUMN,
          'data-align': 'center',
          ...this.#pinProperties(index, this.#pinOf(index)),
        },
        content: multiple
          ? html`<span
              role="checkbox"
              aria-checked=${checked === 'mixed' ? 'mixed' : String(checked)}
              aria-label=${messages.selectAll}
              >${this.#renderBox(checked)}</span
            >`
          : nothing,
      },
    );
  }

  #renderHeader(stop: FocusKey | null): unknown {
    const cellMode = this.navigation !== 'row';
    const headers = this.#columns.map((column, index) => {
      if (column.id === SELECTION_COLUMN) return this.#renderSelectionHeader(index, stop);
      const context = this.#headerContext(column, index, stop);
      const focusable = cellMode || !!column.sortable;
      return this.renderPart('data-view-column-header', context, {
        properties: {
          part: columnParts('data-view-column-header', column.id),
          role: 'columnheader',
          'aria-colindex': index + 1,
          'aria-sort': column.sortable ? (context.direction ?? 'none') : nothing,
          tabindex:
            focusable && this.header !== 'hidden' ? (context.focused ? '0' : '-1') : nothing,
          'data-column': column.id,
          'data-align': column.align ?? 'start',
          'data-sortable': !!column.sortable,
          'data-sorted': context.direction ?? nothing,
          ...this.#pinProperties(index, context.pinned),
        },
        content: runDataViewHook(this.#layers, 'columnHeader', context),
      });
    });
    return this.renderPart(
      'data-view-header',
      { sort: this.sort },
      {
        properties: { class: 'header', role: 'row', 'aria-rowindex': 1 },
        content: headers,
      },
    );
  }

  #renderRow(index: number, stop: FocusKey | null): unknown {
    const row = this.#shown[index]!;
    const id = this.#identities.ids[index]!;
    const selected = this.#selectable && this.#selected.has(id);
    const rowMode = this.navigation === 'row';
    const focusRow = this.#focus?.row === id;
    const rowStop = stop?.row === id;
    const striped = this.striped && index % 2 === 1;
    const state: DataViewRowState<T> = {
      row,
      rowId: id,
      rowIndex: index,
      selected,
      focused: rowMode && focusRow,
      striped,
    };
    const layers = this.#layers;
    const cells = this.#columns.map((column, columnIndex) => {
      const pinned = this.#pinOf(columnIndex);
      if (column.id === SELECTION_COLUMN)
        return this.renderPart('data-view-selection-cell', state, {
          properties: {
            part: 'data-view-cell data-view-selection-cell',
            role: 'gridcell',
            'aria-colindex': columnIndex + 1,
            tabindex: rowMode ? nothing : rowStop && stop?.column === column.id ? '0' : '-1',
            'data-column': column.id,
            'data-align': 'center',
            ...this.#pinProperties(columnIndex, pinned),
          },
          content: this.#renderBox(selected),
        });
      const context = this.#cellContext(
        row,
        id,
        index,
        column,
        columnIndex,
        selected,
        !rowMode && focusRow && this.#focus?.column === column.id,
        layers,
      );
      return this.renderPart('data-view-cell', context, {
        properties: {
          part: columnParts('data-view-cell', column.id),
          role: column.rowHeader ? 'rowheader' : 'gridcell',
          'aria-colindex': columnIndex + 1,
          tabindex: rowMode ? nothing : rowStop && stop?.column === column.id ? '0' : '-1',
          'data-column': column.id,
          'data-align': column.align ?? 'start',
          'data-row-header': !!column.rowHeader,
          'data-focused': context.focused,
          ...this.#pinProperties(columnIndex, pinned),
        },
        content: runDataViewHook(layers, 'cell', context),
      });
    });
    const reference = this.#rowReference(id);
    return this.renderPart('data-view-row', state, {
      properties: {
        role: 'row',
        'aria-rowindex': index + 2,
        'aria-selected': this.#selectable ? String(selected) : nothing,
        tabindex: rowMode ? (rowStop ? '0' : '-1') : nothing,
        'data-row': id,
        'data-stripe': striped,
        'data-selected': selected,
        'data-focused': state.focused,
        'data-drop-target': this.#dropTarget === id,
      },
      content: cells,
      ...(reference ? { reference } : {}),
    });
  }

  /** A body cell's context: what its renderers and its part contract receive. */
  #cellContext(
    row: T,
    rowId: string,
    rowIndex: number,
    column: DataViewColumn<T>,
    columnIndex: number,
    selected: boolean,
    focused: boolean,
    layers: readonly DataViewMiddleware<T>[],
  ): DataViewCellContext<T> {
    const value = cellValue(column, row);
    const context: DataViewCellContext<T> = {
      row,
      rowId,
      rowIndex,
      column,
      columnIndex,
      value,
      text: cellText(column, row, value),
      selected,
      focused,
      pinned: this.layout === 'grid' ? null : this.#pinOf(columnIndex),
      renderText: () => runDataViewHook(layers, 'text', context),
    };
    return context;
  }

  #renderTile(index: number, column: number, stop: FocusKey | null): unknown {
    const row = this.#shown[index]!;
    const id = this.#identities.ids[index]!;
    const selected = this.#selectable && this.#selected.has(id);
    const focused = this.#focus?.row === id;
    const layers = this.#layers;
    const columnOf = (target: DataViewColumn<T> | string) =>
      typeof target === 'string' ? this.columns.find((c) => c.id === target) : target;
    const context: DataViewTileContext<T> = {
      row,
      rowId: id,
      rowIndex: index,
      columns: this.columns,
      selected,
      focused,
      renderCell: (target) => {
        const found = columnOf(target);
        if (!found) return nothing;
        const at = this.columns.indexOf(found);
        return runDataViewHook(
          layers,
          'cell',
          this.#cellContext(row, id, index, found, at, selected, focused, layers),
        );
      },
      text: (target) => {
        const found = columnOf(target);
        return found ? cellText(found, row, cellValue(found, row)) : '';
      },
    };
    const reference = this.#rowReference(id);
    return this.renderPart('data-view-tile', context, {
      properties: {
        role: 'gridcell',
        'aria-colindex': column + 1,
        'aria-selected': this.#selectable ? String(selected) : nothing,
        tabindex: stop?.row === id ? '0' : '-1',
        'data-row': id,
        'data-selected': selected,
        'data-focused': focused,
        'data-drop-target': this.#dropTarget === id,
      },
      content: html`${
        this.selectionCheckboxes && this.#selectable
          ? html`<span class="tile-box" data-selection-box>${this.#renderBox(selected)}</span>`
          : nothing
      }${runDataViewHook(layers, 'tile', context)}`,
      ...(reference ? { reference } : {}),
    });
  }

  /** The rows of tiles near the viewport, keyed by their row, with spacers for the rest. */
  #renderTiles(stop: FocusKey | null): unknown {
    const columns = this.#tileColumns;
    const count = this.#identities.ids.length;
    const pinned: number[] = [];
    const stopIndex = stop?.row ? this.#identities.index.get(stop.row) : undefined;
    if (stopIndex !== undefined) pinned.push(this.#unitOf(stopIndex));
    return repeat(
      this.#virtual.slots(pinned),
      (slot) => (slot.kind === 'space' ? slot.key : `tiles:${slot.index}`),
      (slot) => {
        if (slot.kind === 'space')
          return html`<div
            class="space"
            aria-hidden="true"
            style=${`block-size:${slot.extent}px`}
          ></div>`;
        const first = slot.index * columns;
        const tiles: unknown[] = [];
        for (let at = first; at < Math.min(count, first + columns); at++)
          tiles.push(this.#renderTile(at, at - first, stop));
        return html`<div class="tile-row" role="row" aria-rowindex=${slot.index + 1}>
          ${tiles}
        </div>`;
      },
    );
  }

  #renderBody(stop: FocusKey | null): unknown {
    const pinned: number[] = [];
    const stopIndex = stop?.row ? this.#identities.index.get(stop.row) : undefined;
    if (stopIndex !== undefined) pinned.push(stopIndex);
    // The row holding DOM focus stays mounted until focus has moved on.
    const active = this.shadowRoot?.activeElement?.closest?.('[data-row]') as HTMLElement | null;
    const holder = active?.dataset.row ? this.#identities.index.get(active.dataset.row) : undefined;
    if (holder !== undefined) pinned.push(holder);
    return repeat(
      this.#virtual.slots(pinned),
      (slot) => (slot.kind === 'space' ? slot.key : this.#identities.ids[slot.index]!),
      (slot) =>
        slot.kind === 'space'
          ? html`<div
              class="space"
              aria-hidden="true"
              style=${`block-size:${slot.extent}px`}
            ></div>`
          : this.#renderRow(slot.index, stop),
    );
  }

  #renderSkeleton(): TemplateResult[] {
    if (this.layout === 'grid')
      return Array.from(
        { length: 2 },
        () =>
          html`<div class="tile-row" aria-hidden="true">
            ${Array.from(
              { length: this.#tileColumns },
              () =>
                html`<div class="skeleton-tile">
                  ${this.renderPart(
                    'data-view-skeleton',
                    { columnIndex: 0 },
                    { tag: 'tp-skeleton', properties: { label: '' } },
                  )}
                </div>`,
            )}
          </div>`,
      );
    return Array.from(
      { length: SKELETON_ROWS },
      () =>
        html`<div class="skeleton-row" aria-hidden="true">
          ${this.#columns.map(
            (column, index) =>
              html`<div
                class="skeleton-cell"
                data-align=${column.align ?? 'start'}
                data-pinned=${this.#pinOf(index) ?? nothing}
                style=${
                  this.#pinOf(index)
                    ? `inset-inline-${this.#pinOf(index)}:var(--_pin-${index}, 0px)`
                    : nothing
                }
              >
                ${this.renderPart(
                  'data-view-skeleton',
                  { columnIndex: index },
                  { tag: 'tp-skeleton', properties: { label: '' } },
                )}
              </div>`,
          )}
        </div>`,
    );
  }

  #renderState(state: 'loading' | 'empty' | 'error' | 'rows'): unknown {
    const messages = this.#messages;
    if (state === 'error' || state === 'empty') {
      const context: DataViewStateContext = {
        status: state,
        message: state === 'error' ? (this.error ?? '') : messages.emptyDescription,
        messages,
        retry: () => this.emit('tp-retry', {}),
      };
      return this.renderPart(
        'data-view-state',
        { status: state },
        {
          properties: {
            class: 'state',
            'data-status': state,
            role: state === 'error' ? 'alert' : 'status',
          },
          content: html`<slot name=${state}
            >${runDataViewHook(this.#layers, state, context)}</slot
          >`,
        },
      );
    }
    if (this.loading)
      return this.renderPart(
        'data-view-state',
        { status: 'loading' },
        {
          tag: 'tp-progress',
          properties: {
            class: 'busy',
            'data-status': 'loading',
            '.value': null,
            '.label': messages.loading,
          },
        },
      );
    return nothing;
  }

  protected override render() {
    const state = this.#state;
    const stop = this.#tabStop();
    const text = this.#messages;
    const tracks = columnTracks(this.#columns as readonly DataViewColumn<never>[]);
    const grid = this.layout === 'grid';
    const count = state === 'rows' ? this.#identities.ids.length : 0;
    const rowCount = grid ? Math.ceil(count / this.#tileColumns) : count;
    return this.renderPart(
      'data-view',
      {
        size: this.size,
        borders: this.borders,
        navigation: this.navigation,
        loading: this.loading,
        state,
      },
      {
        tag: 'div',
        properties: {
          part: 'data-view',
          class: 'root',
          'data-status': state,
          'data-navigation': this.navigation,
          'data-header': this.header === 'hidden' || grid ? 'hidden' : nothing,
          'data-layout': this.layout,
          style: { '--_columns': tracks, '--_tile-columns': String(this.#tileColumns) },
        },
        content: html`<div
            class="grid"
            role="grid"
            aria-label=${this.label || this.getAttribute('aria-label') || text.label}
            aria-readonly="true"
            aria-rowcount=${grid ? rowCount : rowCount + 1}
            aria-colcount=${grid ? this.#tileColumns : this.#columns.length}
            aria-multiselectable=${this.selectionMode === 'multiple' ? 'true' : nothing}
            aria-busy=${this.loading ? 'true' : nothing}
            @focusin=${this.#focusIn}
            @keydown=${this.#keydown}
            @click=${this.#click}
            @dblclick=${this.#doubleClick}
          >
            ${
              grid
                ? nothing
                : html`<div class="head" role="rowgroup" @wheel=${this.#headWheel}>
                    ${this.#renderHeader(stop)}
                  </div>`
            }
            ${this.renderPart(
              'data-view-viewport',
              { state },
              {
                // The grid's cells are its one tab stop; the scroller never takes one of its own.
                // A focusable element in a grid needs a grid role: the scroller is the rows' group.
                properties: { class: 'viewport', role: 'rowgroup', tabindex: '-1' },
                content: this.renderPart(
                  'data-view-body',
                  { rowCount },
                  {
                    properties: { class: 'body' },
                    content:
                      state === 'rows'
                        ? grid
                          ? this.#renderTiles(stop)
                          : this.#renderBody(stop)
                        : state === 'loading'
                          ? this.#renderSkeleton()
                          : nothing,
                  },
                ),
              },
            )}
          </div>
          ${this.#renderState(state)}${
            grid
              ? html`<div class="tile-probe" aria-hidden="true"></div>
                  <div class="gap-probe" aria-hidden="true"></div>`
              : nothing
          }`,
      },
    );
  }
}

/** A part's name, and a per-column name when the column id is a valid part token. */
function columnParts(part: string, id: string): string {
  return /^[\w-]+$/.test(id) ? `${part} ${part}-${id}` : part;
}

/**
 * The interactive element of a cell's own content in an event's path, stopping at the first cell or
 * row: cells and rows carry grid roles, which the interactive selector would count.
 */
function contentTarget(event: Event): HTMLElement | null {
  for (const node of event.composedPath()) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.dataset.column !== undefined || node.dataset.row !== undefined) return null;
    if (node.matches(INTERACTIVE_TARGET_SELECTOR)) return node;
  }
  return null;
}

function localeOption(locale: string | undefined): { locale?: string } {
  return locale ? { locale } : {};
}

/** Focusable controls of a header action: the slotted elements and their descendants. */
const ACTION_TARGET = 'tp-button, button, a[href], input, select, textarea, [tabindex]';

function actionTargets(slot: HTMLSlotElement): HTMLElement[] {
  return slot
    .assignedElements({ flatten: true })
    .flatMap((element) => [
      ...(element.matches(ACTION_TARGET) ? [element as HTMLElement] : []),
      ...element.querySelectorAll<HTMLElement>(ACTION_TARGET),
    ]);
}

/** The first focusable control of a header cell's action, such as a Menu's trigger. */
function headerAction(cell: HTMLElement): HTMLElement | null {
  const slot = cell.querySelector<HTMLSlotElement>('slot.action');
  return slot ? (actionTargets(slot)[0] ?? null) : null;
}

/** The first focusable element inside a cell's own content. */
function firstInteractive(cell: HTMLElement): HTMLElement | null {
  return cell.querySelector<HTMLElement>(
    'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"]), tp-button, tp-checkbox, tp-switch',
  );
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-data-view': TpDataView;
  }
}
