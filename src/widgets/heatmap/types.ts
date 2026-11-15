import type { CalendarLabelWidth, CalendarSelectionMode } from '../../foundation/calendar.js';

/**
 * The granularity and form of a datum's key: `day` an ISO date (`2026-03-04`), `hour` an ISO
 * local date and hour (`2026-03-04T14`), `week` the ISO date of a week's first day, `month` an
 * ISO year and month (`2026-03`), `year` an ISO year (`2026`), `index` an integer, `custom` any
 * value the custom axes understand.
 */
export type HeatmapUnit = 'day' | 'hour' | 'week' | 'month' | 'year' | 'index' | 'custom';

/**
 * A built-in projection of a key onto an axis. Absolute projections are positions along the range
 * (`year`, `month`, `week`, `day`, `hour`, `index`); cyclic ones repeat (`month-of-year`,
 * `week-of-year`, `day-of-month`, `weekday`, `hour-of-day`).
 */
export type HeatmapProjectionName =
  | 'year'
  | 'month'
  | 'week'
  | 'day'
  | 'hour'
  | 'index'
  | 'month-of-year'
  | 'week-of-year'
  | 'day-of-month'
  | 'weekday'
  | 'hour-of-day';

/** One position of an axis. */
export interface HeatmapTick {
  /** Identity of the position, unique on its axis. */
  id: string | number;
  /** The text shown for it; without it, the tick has no label. */
  label?: string;
}

/** The inclusive range a heatmap enumerates its cells over, in the keys of its unit. */
export interface HeatmapRange {
  unit: HeatmapUnit;
  start: string | undefined;
  end: string | undefined;
}

/**
 * A custom projection: the ticks of the axis, in order, and the tick a key lands on. `position`
 * is the key's place in the enumerated range, or -1 for a `custom` unit, which has no range.
 */
export interface HeatmapAxis<K = never> {
  ticks: readonly HeatmapTick[] | ((range: HeatmapRange) => readonly HeatmapTick[]);
  /** The tick id the key lands on; undefined puts the key in no cell. */
  of(key: K, position: number): string | number | undefined;
  /** The text of a tick in a given form; defaults to the tick's `label`. */
  label?(tick: HeatmapTick, width: CalendarLabelWidth): string;
  /**
   * The group a tick belongs to: `auto` labels mark where the group changes, and
   * `groups="separated"` spaces the groups apart. Undefined leaves the tick in no group.
   */
  group?(tick: HeatmapTick): HeatmapGroup | undefined;
}

/** A run of ticks that belong together, such as the weeks of a month. */
export interface HeatmapGroup {
  /** Identity of the group, unique on its axis. */
  id: string;
  /** The text a change-point label shows for it. */
  label: string;
}

/**
 * What an axis shows: a built-in projection, a number `n` (the position in the range modulo `n`,
 * the other axis then counting the lines) or a custom axis.
 */
export type HeatmapProjection = HeatmapProjectionName | number | HeatmapAxis<any>;

/** One value of the dataset. */
export interface HeatmapDatum<K = unknown> {
  /** Where the value belongs, in the form of the heatmap's unit. */
  key: K;
  /** The value; values that land on one cell are combined by `aggregate`. */
  value: number;
  /** A level that bypasses the scale, from 0 to `levels - 1`. */
  level?: number;
  /** Replaces the cell's accessible date and value text. */
  label?: string;
  /** Extra content shown when the cell is hovered or focused; a string is also read out. */
  hint?: unknown;
}

/** An interface color role pair a heatmap paints with, from its subtle to its strong color. */
export type HeatmapColor = 'primary' | 'success' | 'warning' | 'destructive';

/** How the values that land on one cell combine. */
export type HeatmapAggregate = 'sum' | 'mean' | 'max' | 'min' | 'count';
/** How values map to the levels when no thresholds are given. */
export type HeatmapScale = 'linear' | 'quantile';
/** How the grid meets its inline size. */
export type HeatmapFit = 'stretch' | 'scroll' | 'trim';
/**
 * How an axis shows its groups (the months of week or day ticks, the days of hour ticks, or a
 * custom axis's groups): side by side like every other tick, or as blocks with space between them,
 * a tick that spans two groups split into one tick per group.
 */
export type HeatmapGroups = 'joined' | 'separated';
/** Which tick labels an axis shows. */
export type HeatmapLabels = 'auto' | 'all' | 'alternate' | 'none';
/** The cell size, gap, radius and label text. */
export type HeatmapSize = 'xs' | 'sm' | 'default' | 'lg';
/** The cell shape. */
export type HeatmapShape = 'square' | 'rounded' | 'circle';
/** Selection of cells; `none` makes the heatmap display-only. */
export type HeatmapSelectionMode = 'none' | CalendarSelectionMode;
/** Hover and keyboard inspection, or a passive figure. */
export type HeatmapInteraction = 'inspect' | 'none';

/** The state of one cell, as events, messages and `renderTooltip` see it. */
export interface HeatmapCellState {
  /** The cell's id: its key, or `column:row` when the arrangement combines keys on cells. */
  id: string;
  /** The keys of the range that land on the cell. */
  keys: readonly unknown[];
  /** The data that land on the cell, in dataset order. */
  data: readonly HeatmapDatum[];
  /** The column and row tick ids. */
  column: string | number;
  row: string | number;
  /** The column and row labels in their long form, for messages. */
  columnLabel: string;
  rowLabel: string;
  /** The combined value, or null when no datum lands on the cell. */
  value: number | null;
  /** From 0 (no value) to `levels - 1`. */
  level: number;
  /** The string and renderable hints of the cell's data, in dataset order. */
  hints: readonly unknown[];
  /** The ISO date of a date-keyed cell holding one key, otherwise undefined. */
  date: string | undefined;
  today: boolean;
  selected: boolean;
  disabled: boolean;
  /** Names of the `dayModifiers` that match the cell's date. */
  modifiers: readonly string[];
}

/** User-facing text; each entry is optional and falls back to English. */
export interface HeatmapMessages {
  /** The cell's accessible name and the tooltip's first line. */
  cell(state: HeatmapCellState, value: string, where: string): string;
  /**
   * Where a cell is. Without it, a date cell holding one key reads its full date and any other cell
   * its row and column labels.
   */
  where?(state: HeatmapCellState): string;
  /** The value text of a cell without data. */
  noValue: string;
  less: string;
  more: string;
  /** The legend swatch of one level. */
  levelRange(level: number, from: string, to: string): string;
  /** The accessible name of the legend's level toggles. */
  filter: string;
  /** The hints line past `maxHints`. */
  moreHints(count: number): string;
}

/** Display strings only; never identity. */
export interface HeatmapFormatters {
  value?(value: number): string;
  columnLabel?(tick: HeatmapTick): string | undefined;
  rowLabel?(tick: HeatmapTick): string | undefined;
}

/** `tp-inspection-change` detail. */
export interface HeatmapInspectionDetail {
  cell: HeatmapCellState | null;
  source: 'pointer' | 'keyboard';
}

/** `tp-cell-activate` detail. */
export interface HeatmapActivateDetail {
  cell: HeatmapCellState;
  sourceEvent: Event;
}

/** Totals of the current dataset over the displayed range. */
export interface HeatmapSummary {
  total: number;
  max: number;
  cells: number;
  nonZero: number;
}
