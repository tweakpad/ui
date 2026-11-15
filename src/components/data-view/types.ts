import type { TpValueChangeEvent } from '../../foundation/events.js';

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
  /** The cell's content; the text by default. */
  render?(row: T, cell: DataViewCellContext<T>): unknown;
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

/** What a cell renderer receives. */
export interface DataViewCellContext<T = unknown> {
  readonly row: T;
  readonly rowId: string;
  /** The row's position among the rows shown. */
  readonly rowIndex: number;
  readonly column: DataViewColumn<T>;
  readonly value: unknown;
  readonly text: string;
  readonly selected: boolean;
  readonly focused: boolean;
}

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
