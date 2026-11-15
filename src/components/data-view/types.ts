import type { TpValueChangeEvent } from '../../foundation/events.js';
import type { ComponentPartContract } from '../../foundation/part.js';

/** A sort: the column it orders by and its direction. */
export interface DataViewSort {
  readonly column: string;
  readonly direction: 'ascending' | 'descending';
}

/** Who orders the rows: `local`, the view, shows a sorted copy; `manual` shows the rows as the application ordered them. */
export type DataViewSorting = 'local' | 'manual';

/** Whether a row can be selected. */
export type DataViewSelectionMode = 'none' | 'single';

/** What arrow keys move: a cell, header cells included, or a whole row. */
export type DataViewNavigation = 'cell' | 'row';

/** How the cells draw their lines: row lines, a grid of row and column lines, or none. */
export type DataViewBorders = 'rows' | 'grid' | 'none';

/** Row height, cell inset and text. */
export type DataViewSize = 'sm' | 'default' | 'lg';

/** How a cell's content aligns along the inline axis. */
export type DataViewAlign = 'start' | 'center' | 'end';

/** One column: what it reads from a row, how it shows it, and how it sorts. */
export interface DataViewColumn<T = unknown> {
  /** Stable identity; also the property a row is read by when there is no `value`. */
  readonly id: string;
  /** Header text, and the column's accessible name. */
  readonly header: string;
  /** The cell's value; `row[id]` by default. */
  value?(row: T): unknown;
  /** The cell's text; `String(value ?? '')` by default. */
  format?(value: unknown, row: T): string;
  /** The cell's content; the text by default. It runs inside the view's `middleware`. */
  render?(row: T, cell: DataViewCellContext<T>): unknown;
  /** The header's content; its text, sort indicator and action by default. */
  renderHeader?(header: DataViewHeaderContext<T>): unknown;
  /** A CSS grid track, such as `12rem`, `1fr` or `minmax(8rem, 2fr)`; `minmax(8rem, 1fr)` by default. */
  readonly width?: string;
  /** Inline alignment of the cell's content; `start` by default. */
  readonly align?: DataViewAlign;
  /** Whether the header sorts by this column. */
  readonly sortable?: boolean;
  /** Orders two rows for the local sort, ascending; the value comparison by default. */
  compare?(a: T, b: T): number;
  /** The cell names its row (a row header). */
  readonly rowHeader?: boolean;
}

/** The edge a pinned column stays at while the rest scroll sideways. */
export type DataViewPin = 'start' | 'end';

/** What a cell renderer receives; also the state of the `data-view-cell` part. */
export type DataViewCellContext<T = unknown> = {
  readonly row: T;
  readonly rowId: string;
  /** The row's position among the rows shown. */
  readonly rowIndex: number;
  readonly column: DataViewColumn<T>;
  readonly columnIndex: number;
  readonly value: unknown;
  readonly text: string;
  readonly selected: boolean;
  readonly focused: boolean;
  readonly pinned: DataViewPin | null;
  /** The cell's text through the middleware's `text` hooks, such as a search highlight. */
  renderText(): unknown;
};

/** What a header renderer receives; also the state of the column header and sort indicator parts. */
export type DataViewHeaderContext<T = unknown> = {
  readonly column: DataViewColumn<T>;
  readonly columnIndex: number;
  /** The column's sort direction, or `null` when another column or none sorts. */
  readonly direction: DataViewSort['direction'] | null;
  readonly sortable: boolean;
  readonly focused: boolean;
  readonly pinned: DataViewPin | null;
  /** The sort indicator through the middleware; nothing for a column that does not sort. */
  sortIndicator(): unknown;
  /** The header's action slot, `header-action-<column id>`. */
  readonly action: unknown;
};

/** The state of a row part. */
export type DataViewRowState<T = unknown> = {
  readonly row: T;
  readonly rowId: string;
  readonly rowIndex: number;
  readonly selected: boolean;
  readonly focused: boolean;
  readonly striped: boolean;
};

/** What an empty or error renderer receives. */
export interface DataViewStateContext {
  readonly status: 'empty' | 'error';
  /** The error message, or the empty description. */
  readonly message: string;
  readonly messages: DataViewMessages;
  /** Fires `tp-retry`, as the default Retry Button does. */
  retry(): void;
}

/** Renders the next layer: the remaining middleware, then the built-in content. */
export type DataViewNext = () => unknown;

/**
 * A layer of the view's rendering. Each hook receives its context and `next`, the content the inner
 * layers would render: return `next()` to keep it, wrap it, or return other content instead. The
 * built-in rendering is the innermost layer: column `render` and `renderHeader`, then the cell
 * text, the header's text, sort indicator and action, and the default empty and error states.
 */
export interface DataViewMiddleware<T = unknown> {
  /** Names the layer in diagnostics. */
  readonly name?: string;
  /**
   * Styles for the content the layer renders, adopted into the view's shadow root nested under
   * the `data-view` part: selectors are relative to it, as nested rules are.
   */
  readonly css?: string;
  /** A body cell's content. */
  cell?(context: DataViewCellContext<T>, next: DataViewNext): unknown;
  /** A cell's text, inside the default content and `renderText()`; the plain text by default. */
  text?(context: DataViewCellContext<T>, next: DataViewNext): unknown;
  /** A column header's content. */
  columnHeader?(context: DataViewHeaderContext<T>, next: DataViewNext): unknown;
  /** The sort indicator's content, for sortable columns. */
  sortIndicator?(context: DataViewHeaderContext<T>, next: DataViewNext): unknown;
  /** The empty state's content when the `empty` slot is not filled. */
  empty?(context: DataViewStateContext, next: DataViewNext): unknown;
  /** The error state's content when the `error` slot is not filled. */
  error?(context: DataViewStateContext, next: DataViewNext): unknown;
}

/** The hook points of `DataViewMiddleware`. */
export type DataViewHook = Exclude<keyof DataViewMiddleware, 'name' | 'css'>;

/** The state each part's contract hooks receive (`classHook`, `styleHook`, `content`, `renderDelegate`). */
export interface DataViewPartStates<T = unknown> {
  'data-view': {
    readonly size: DataViewSize;
    readonly borders: DataViewBorders;
    readonly navigation: DataViewNavigation;
    readonly loading: boolean;
    readonly state: 'rows' | 'loading' | 'empty' | 'error';
  };
  'data-view-viewport': { readonly state: 'rows' | 'loading' | 'empty' | 'error' };
  'data-view-header': { readonly sort: DataViewSort | null };
  'data-view-column-header': DataViewHeaderContext<T>;
  'data-view-sort-indicator': DataViewHeaderContext<T>;
  'data-view-body': { readonly rowCount: number };
  'data-view-row': DataViewRowState<T>;
  'data-view-cell': DataViewCellContext<T>;
  'data-view-state': { readonly status: 'empty' | 'error' | 'loading' };
  'data-view-skeleton': { readonly columnIndex: number };
}

/** Typed `partContracts` for a Data view: rendering contracts by part name. */
export type DataViewPartContracts<T = unknown> = {
  [K in keyof DataViewPartStates<T>]?: ComponentPartContract<DataViewPartStates<T>[K]>;
};

/** User-facing text. */
export interface DataViewMessages {
  readonly label: string;
  readonly empty: string;
  readonly emptyDescription: string;
  readonly loading: string;
  readonly retry: string;
  readonly errorTitle: string;
  /** Announced after a sort, for example "Sorted by Battery, descending". */
  sorted(column: string, direction: DataViewSort['direction'] | null): string;
}

/** Detail of `tp-row-activate`. */
export interface DataViewActivateDetail<T = unknown> {
  readonly row: T;
  readonly rowId: string;
  readonly sourceEvent: Event;
}

/** Called with each `tp-value-change` proposal of a selected row id. */
export type DataViewValueChangeCallback = (event: TpValueChangeEvent<string | null>) => void;
/** Called with each `tp-sort-change` proposal of a sort. */
export type DataViewSortChangeCallback = (event: TpValueChangeEvent<DataViewSort | null>) => void;
