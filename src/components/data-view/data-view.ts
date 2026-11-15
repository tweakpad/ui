import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { LiveAnnouncer } from '../../foundation/announcer.js';
import { ControllableState } from '../../foundation/controllable-state.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import { gridKeyMove } from '../../foundation/grid-navigation.js';
import { INTERACTIVE_TARGET_SELECTOR } from '../../foundation/interactive-target.js';
import { observeResize } from '../../foundation/observation.js';
import { Scrollable } from '../../foundation/scrollable.js';
import { resolveLocale } from '../../foundation/services.js';
import type { ChangeReason } from '../../foundation/types.js';
import { VirtualList } from '../../foundation/virtual-list.js';
import { arrowDownIcon, arrowUpIcon } from '../../icons/arrows.js';
import { circleAlertIcon } from '../../icons/circle-alert.js';
import { navigationIcons } from '../../icons/navigation.js';
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
import {
  clampPosition,
  firstPosition,
  movePosition,
  type DataViewGrid,
  type DataViewPosition,
} from './navigation.js';
import { nextSort, sortDataViewRows } from './sort.js';
import { dataViewStyles } from './styles.js';
import type {
  DataViewActivateDetail,
  DataViewColumn,
  DataViewMessages,
  DataViewNavigation,
  DataViewSelectionMode,
  DataViewSize,
  DataViewSort,
  DataViewSortChangeCallback,
  DataViewSorting,
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
 * @summary A read-only, virtualized grid of application records with sorting and selection.
 * @slot empty - Content shown when there are no rows; a default Empty state otherwise.
 * @slot error - Content shown when `error` is set; a default Empty state with a Retry Button otherwise.
 * @fires tp-sort-change - A cancelable proposal of a new sort from a header press or key, or `sortBy`. `detail.value` is the sort or `null`.
 * @fires tp-value-change - A cancelable proposal of a new selected row id (or `null`); `detail.metadata.row` is the row.
 * @fires tp-row-activate - Enter on a row or a double click on it; `detail` holds the `row` and its `rowId`.
 * @fires tp-retry - The Retry Button of the default error state was pressed.
 * @cssprop --tp-data-view-row-height - The fixed height of every row.
 * @cssprop --tp-data-view-header-height - The height of the header row.
 * @csspart data-view - The root: the viewport and the state layer.
 * @csspart data-view-viewport - The scroller of the rows, under the header.
 * @csspart data-view-header - The header row, pinned to the top of the viewport.
 * @csspart data-view-column-header - One column header.
 * @csspart data-view-sort-indicator - The sort arrow of a sortable header.
 * @csspart data-view-body - The rows.
 * @csspart data-view-row - One row.
 * @csspart data-view-cell - One cell.
 * @csspart data-view-state - The empty or error layer under the header, or the loading Progress bar along the header's bottom edge.
 * @csspart data-view-skeleton - A placeholder bar of a loading row.
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
    value: { type: String, noAccessor: true },
    defaultValue: { type: String, attribute: 'default-value' },
    sorting: { type: String },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    navigation: { type: String, reflect: true },
    size: { type: String, reflect: true },
    overscan: { type: Number },
    loading: { type: Boolean, reflect: true },
    error: { type: String },
    label: { type: String },
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
  /** The row id an uncontrolled view starts with selected. */
  defaultValue: string | null = null;
  /** Who orders the rows: the view, as a sorted copy, or the application. */
  sorting: DataViewSorting = 'local';
  /** Whether a row can be selected. */
  selectionMode: DataViewSelectionMode = 'none';
  /** What arrow keys move: a cell, header cells included, or a whole row. */
  navigation: DataViewNavigation = 'cell';
  /** Row height, cell inset and text. */
  size: DataViewSize = 'default';
  /** Rows mounted beyond each edge of the viewport. */
  overscan = 4;
  /** The rows are loading: placeholders without rows, a busy grid with them. */
  loading = false;
  /** An error message; shown with a Retry Button instead of the rows. */
  error: string | null = null;
  /** The grid's accessible name; `Data` by default. */
  label = '';
  /** User-facing text; English by default. */
  messages: Partial<DataViewMessages> | undefined;
  /** Called with each `tp-value-change` proposal. */
  onValueChange: DataViewValueChangeCallback | undefined;
  /** Called with each `tp-sort-change` proposal. */
  onSortChange: DataViewSortChangeCallback | undefined;

  #providedValue: string | null | undefined;
  #providedSort: DataViewSort | null | undefined;
  #focus: FocusKey | null = null;
  #rowHeight = 0;
  #identities: RowIdentities = rowIdentities([], () => undefined);
  #shown: readonly T[] = [];
  #shownKey: unknown[] = [];
  #viewport: HTMLElement | null = null;
  #releaseResize: (() => void) | undefined;
  #pendingFocus = false;
  #announcer: LiveAnnouncer | undefined;
  readonly #scrollEdges: NativeScrollEdges;

  readonly #virtual = new VirtualList(this, {
    list: () => this.renderRoot?.querySelector<HTMLElement>('.body') ?? null,
    viewport: () => this.#viewport,
    estimate: () => this.#rowHeight || ROW_HEIGHT[this.size] || ROW_HEIGHT.default,
    overscan: () => Math.max(0, Math.floor(this.overscan) || 0),
    enabled: () => true,
  });

  readonly #valueState = new ControllableState<string | null>({
    host: this,
    initialValue: null,
    readControlledValue: () => this.#providedValue,
    readDefaultValue: () => this.defaultValue ?? null,
    hasDefaultValue: () => this.defaultValue !== null && this.defaultValue !== undefined,
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
    });
  }

  // ---- lanes ---------------------------------------------------------------------------------

  /** The selected row id, or `null`. */
  get value(): string | null {
    return this.#valueState.value ?? null;
  }
  set value(value: string | null) {
    const previous = this.value;
    this.#providedValue = value === undefined ? undefined : value;
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

  /** Proposes a selected row id, or `null` to clear the selection. */
  selectRow(id: string | null): boolean {
    return this.#select(id, 'imperative-action');
  }

  /** Scrolls a row into view, mounting it. */
  scrollToRow(id: string, align: 'nearest' | 'start' | 'center' = 'nearest'): boolean {
    this.#prepareRows();
    const index = this.#identities.index.get(id);
    return index === undefined ? false : this.#virtual.scrollToIndex(index, align);
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
    this.#viewport?.removeEventListener('scroll', this.#syncHead);
    this.#viewport = null;
    this.#announcer?.dispose();
    this.#announcer = undefined;
    super.disconnectedCallback();
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
    if (changed.has('size')) this.#rowHeight = 0;
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
            this.#virtual.refresh();
          })
        : undefined;
      this.#measureGutter();
      this.#virtual.refresh();
    }
    this.#syncHead();
    // Rows have one fixed height; the first mounted row tells it once its styles apply.
    const row = this.renderRoot.querySelector<HTMLElement>('.body > [role="row"]');
    const height = row?.offsetHeight ?? 0;
    if (height && Math.abs(height - this.#rowHeight) > 0.5) {
      this.#rowHeight = height;
      this.#virtual.setKeys([...this.#identities.ids]);
    }
    // Mounted rows and states change the scroll extent the edge fades follow.
    this.#scrollEdges.invalidateContent();
    // The grid is one tab stop: interactive content of a cell is reached with Enter.
    for (const element of this.renderRoot.querySelectorAll<HTMLElement>('.body [data-column] *'))
      if (element.matches(INTERACTIVE_TARGET_SELECTOR) && element.tabIndex >= 0)
        element.tabIndex = -1;
    if (this.#pendingFocus) {
      this.#pendingFocus = false;
      this.#focusTabStop();
    }
  }

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
  };

  #measureGutter(): void {
    const viewport = this.#viewport;
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    if (!viewport || !root) return;
    const gutter = Math.max(0, viewport.offsetWidth - viewport.clientWidth);
    root.style.setProperty('--_gutter', `${gutter}px`);
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
    this.#virtual.setKeys(identities.ids);
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
      columns: this.columns.length,
      page,
      header: (column) => this.navigation !== 'row' || !!this.columns[column]?.sortable,
    };
  }

  #positionOf(key: FocusKey | null): DataViewPosition | null {
    if (!key) return null;
    const column = key.column === null ? -1 : this.columns.findIndex((c) => c.id === key.column);
    if (key.row === null) return column < 0 ? null : { row: -1, column };
    const row = this.#identities.index.get(key.row);
    if (row === undefined) return null;
    return { row, column };
  }

  #keyOf(position: DataViewPosition): FocusKey {
    return {
      row: position.row < 0 ? null : (this.#identities.ids[position.row] ?? null),
      column: position.column < 0 ? null : (this.columns[position.column]?.id ?? null),
    };
  }

  /** The roving tab stop: the focused position kept by id, else the nearest valid one, else the first. */
  #tabStop(): FocusKey | null {
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
                this.columns.findIndex((c) => c.id === this.#focus!.column),
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

  #select(id: string | null, reason: ChangeReason, source?: Event): boolean {
    if (this.selectionMode !== 'single' || id === this.value) return false;
    const index = id === null ? undefined : this.#identities.index.get(id);
    if (id !== null && index === undefined) return false;
    return this.#valueState.set(id, reason, source, {
      metadata: { row: index === undefined ? null : this.#shown[index] },
    });
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
      this.#virtual.scrollToIndex(position.row);
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
    if (key.row === null) {
      const column = this.columns.find((candidate) => candidate.id === key.column);
      if ((event.key === 'Enter' || event.key === ' ') && column?.sortable) {
        event.preventDefault();
        this.#sortColumn(column, 'keyboard', event);
        return;
      }
    } else if (event.key === ' ') {
      event.preventDefault();
      if (this.selectionMode === 'single')
        this.#select(event.ctrlKey || event.metaKey ? null : key.row, 'keyboard', event);
      return;
    } else if (event.key === 'Enter') {
      event.preventDefault();
      // A cell with interactive content: Enter moves into it.
      const content = this.navigation === 'cell' ? firstInteractive(target.element) : null;
      if (content) content.focus();
      else this.#activate(key.row, event);
      return;
    }
    const move = gridKeyMove(event, this.direction === 'rtl');
    if (!move) return;
    const from = this.#positionOf(key);
    if (!from) return;
    const next = movePosition(this.#grid(true), from, move);
    event.preventDefault();
    if (next) this.#moveFocus(this.#keyOf(next));
  };

  readonly #click = (event: MouseEvent): void => {
    const target = this.#target(event);
    if (!target || contentTarget(event)) return;
    const { key } = target;
    if (key.row === null) {
      const column = this.columns.find((candidate) => candidate.id === key.column);
      if (column) this.#sortColumn(column, 'item-press', event);
      return;
    }
    if (this.selectionMode !== 'single') return;
    const clear = (event.ctrlKey || event.metaKey) && key.row === this.value;
    this.#select(clear ? null : key.row, 'item-press', event);
  };

  readonly #doubleClick = (event: MouseEvent): void => {
    const target = this.#target(event);
    if (!target || target.key.row === null || contentTarget(event)) return;
    this.#activate(target.key.row, event);
  };

  readonly #retry = (event: Event): void => {
    event.stopPropagation();
    this.emit('tp-retry', {});
  };

  // ---- render --------------------------------------------------------------------------------

  #renderHeader(stop: FocusKey | null): TemplateResult {
    const sort = this.sort;
    const cellMode = this.navigation !== 'row';
    return html`<div class="header" part="data-view-header" role="row" aria-rowindex="1">
      ${this.columns.map((column, index) => {
        const sorted = sort?.column === column.id ? sort.direction : null;
        const focusable = cellMode || !!column.sortable;
        const isStop = stop?.row === null && stop.column === column.id;
        return html`<div
          part="data-view-column-header"
          role="columnheader"
          aria-colindex=${index + 1}
          aria-sort=${column.sortable ? (sorted ?? 'none') : nothing}
          tabindex=${focusable ? (isStop ? '0' : '-1') : nothing}
          data-column=${column.id}
          data-align=${column.align ?? 'start'}
          ?data-sortable=${!!column.sortable}
          data-sorted=${sorted ?? nothing}
        >
          <span class="label">${column.header}</span>${
            column.sortable
              ? html`<tp-icon
                  part="data-view-sort-indicator"
                  aria-hidden="true"
                  ?data-active=${!!sorted}
                  .icon=${
                    sorted === 'ascending'
                      ? arrowUpIcon
                      : sorted === 'descending'
                        ? arrowDownIcon
                        : navigationIcons.selector
                  }
                ></tp-icon>`
              : nothing
          }
        </div>`;
      })}
    </div>`;
  }

  #renderRow(index: number, stop: FocusKey | null): TemplateResult {
    const row = this.#shown[index]!;
    const id = this.#identities.ids[index]!;
    const selected = this.selectionMode === 'single' && this.value === id;
    const rowMode = this.navigation === 'row';
    const focusRow = this.#focus?.row === id;
    const rowStop = stop?.row === id;
    return html`<div
      part="data-view-row"
      role="row"
      aria-rowindex=${index + 2}
      aria-selected=${this.selectionMode === 'single' ? String(selected) : nothing}
      tabindex=${rowMode ? (rowStop ? '0' : '-1') : nothing}
      data-row=${id}
      ?data-selected=${selected}
      ?data-focused=${rowMode && focusRow}
    >
      ${this.columns.map((column, columnIndex) => {
        const value = cellValue(column, row);
        const text = cellText(column, row, value);
        const focused = !rowMode && focusRow && this.#focus?.column === column.id;
        const content = column.render
          ? column.render(row, {
              row,
              rowId: id,
              rowIndex: index,
              column,
              value,
              text,
              selected,
              focused,
            })
          : html`<span class="text">${text}</span>`;
        return html`<div
          part="data-view-cell"
          role=${column.rowHeader ? 'rowheader' : 'gridcell'}
          aria-colindex=${columnIndex + 1}
          tabindex=${rowMode ? nothing : rowStop && stop?.column === column.id ? '0' : '-1'}
          data-column=${column.id}
          data-align=${column.align ?? 'start'}
          ?data-row-header=${!!column.rowHeader}
          ?data-focused=${focused}
        >
          ${content}
        </div>`;
      })}
    </div>`;
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
    return Array.from(
      { length: SKELETON_ROWS },
      () =>
        html`<div class="skeleton-row" aria-hidden="true">
          ${this.columns.map(
            (column) =>
              html`<div class="skeleton-cell" data-align=${column.align ?? 'start'}>
                <tp-skeleton part="data-view-skeleton" label=""></tp-skeleton>
              </div>`,
          )}
        </div>`,
    );
  }

  #renderState(state: 'loading' | 'empty' | 'error' | 'rows'): unknown {
    const text = this.#messages;
    if (state === 'error')
      return html`<div class="state" part="data-view-state" data-status="error" role="alert">
        <slot name="error"
          ><tp-empty-state
            .title=${text.errorTitle}
            .description=${this.error ?? ''}
            media-treatment="icon"
            ><tp-icon slot="media" .icon=${circleAlertIcon} aria-hidden="true"></tp-icon
            ><tp-button slot="actions" variant="outline" size="sm" @click=${this.#retry}
              >${text.retry}</tp-button
            ></tp-empty-state
          ></slot
        >
      </div>`;
    if (state === 'empty')
      return html`<div class="state" part="data-view-state" data-status="empty" role="status">
        <slot name="empty"
          ><tp-empty-state
            .title=${text.empty}
            .description=${text.emptyDescription}
          ></tp-empty-state
        ></slot>
      </div>`;
    if (this.loading)
      return html`<tp-progress
        class="busy"
        part="data-view-state"
        data-status="loading"
        .value=${null}
        .label=${text.loading}
      ></tp-progress>`;
    return nothing;
  }

  protected override render() {
    const state = this.#state;
    const stop = this.#tabStop();
    const text = this.#messages;
    const tracks = columnTracks(this.columns as readonly DataViewColumn<never>[]);
    const rowCount = state === 'rows' ? this.#identities.ids.length : 0;
    return this.renderPart(
      'data-view',
      { size: this.size, navigation: this.navigation, loading: this.loading, state },
      {
        tag: 'div',
        properties: {
          part: 'data-view',
          class: 'root',
          'data-status': state,
          'data-navigation': this.navigation,
          style: { '--_columns': tracks },
        },
        content: html`<div
            class="grid"
            role="grid"
            aria-label=${this.label || this.getAttribute('aria-label') || text.label}
            aria-readonly="true"
            aria-rowcount=${rowCount + 1}
            aria-colcount=${this.columns.length}
            aria-busy=${this.loading ? 'true' : nothing}
            @focusin=${this.#focusIn}
            @keydown=${this.#keydown}
            @click=${this.#click}
            @dblclick=${this.#doubleClick}
          >
            <div class="head" role="rowgroup" @wheel=${this.#headWheel}>
              ${this.#renderHeader(stop)}
            </div>
            <div class="viewport" part="data-view-viewport">
              <div class="body" part="data-view-body" role="rowgroup">
                ${
                  state === 'rows'
                    ? this.#renderBody(stop)
                    : state === 'loading'
                      ? this.#renderSkeleton()
                      : nothing
                }
              </div>
            </div>
          </div>
          ${this.#renderState(state)}`,
      },
    );
  }
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
