import type { CalendarAdapter, CalendarLabelWidth } from '../../foundation/calendar.js';
import {
  builtInTickLabel,
  changePointGroup,
  customTicks,
  defaultProjections,
  defaultRange,
  enumerateRange,
  fullCycle,
  MAX_HEATMAP_CELLS,
  normalizeKey,
  project,
  projectionError,
  type ProjectionContext,
  type SequenceKey,
} from './projection.js';
import { heatmapLevelScale, type HeatmapLevelScale } from './scale.js';
import type {
  HeatmapAggregate,
  HeatmapAxis,
  HeatmapDatum,
  HeatmapGroup,
  HeatmapGroups,
  HeatmapProjection,
  HeatmapScale,
  HeatmapSummary,
  HeatmapTick,
  HeatmapUnit,
} from './types.js';

export interface HeatmapModelInput {
  unit: HeatmapUnit;
  start: string | undefined;
  end: string | undefined;
  today: string;
  columns: HeatmapProjection | undefined;
  rows: HeatmapProjection | undefined;
  /** With `separated`, a tick whose keys fall in two groups splits into one tick per group. */
  groups: HeatmapGroups;
  data: readonly HeatmapDatum[];
  aggregate: HeatmapAggregate;
  adapter: CalendarAdapter;
  weekStart: number;
  minimalDays: number;
  locale: string | undefined;
  levels: number;
  scale: HeatmapScale;
  thresholds: readonly number[] | undefined;
  domain: readonly [number, number] | undefined;
}

/** One tick of an axis, in axis order. */
export interface HeatmapTickModel {
  readonly id: string | number;
  readonly index: number;
  /** Its label in a form; empty when the axis has no label for it. */
  label(width: CalendarLabelWidth): string;
  /** The coarser group whose changes `auto` labels mark (a week's month), when it has one. */
  readonly group: HeatmapGroup | undefined;
}

/** The indices of the ticks that start a group, the first tick excluded. */
export function groupStarts(ticks: readonly Pick<HeatmapTickModel, 'group'>[]): number[] {
  const starts: number[] = [];
  for (let index = 1; index < ticks.length; index += 1)
    if (ticks[index]!.group?.id !== ticks[index - 1]!.group?.id) starts.push(index);
  return starts;
}

/** One cell: a column and row pair that at least one key of the range lands on. */
export interface HeatmapCellModel {
  readonly id: string;
  readonly column: number;
  readonly row: number;
  readonly keys: readonly unknown[];
  readonly data: readonly HeatmapDatum[];
  readonly value: number | null;
  readonly level: number;
  /** The cell's place in range order: the position of its first key. */
  readonly sequence: number;
  /** The ISO date of a date-keyed cell holding one key. */
  readonly date: string | undefined;
}

export interface HeatmapModel {
  readonly columns: readonly HeatmapTickModel[];
  readonly rows: readonly HeatmapTickModel[];
  /** Cells in range order. */
  readonly cells: readonly HeatmapCellModel[];
  readonly byId: ReadonlyMap<string, HeatmapCellModel>;
  /** The cell at a column and row, if any. */
  at(column: number, row: number): HeatmapCellModel | undefined;
  /** Whether some cell holds several keys of the range, so cells are identified by position. */
  readonly aggregating: boolean;
  readonly levels: number;
  readonly scale: HeatmapLevelScale;
  readonly summary: HeatmapSummary;
  /** The configuration error that leaves the grid empty, if any. */
  readonly error: string | undefined;
}

const EMPTY_SUMMARY: HeatmapSummary = Object.freeze({ total: 0, max: 0, cells: 0, nonZero: 0 });

function emptyModel(levels: number, error: string | undefined): HeatmapModel {
  return {
    columns: [],
    rows: [],
    cells: [],
    byId: new Map(),
    at: () => undefined,
    aggregating: false,
    levels,
    scale: heatmapLevelScale({ values: [], levels, scale: 'linear' }),
    summary: EMPTY_SUMMARY,
    error,
  };
}

function combine(values: readonly number[], aggregate: HeatmapAggregate): number {
  switch (aggregate) {
    case 'count':
      return values.length;
    case 'max':
      return Math.max(...values);
    case 'min':
      return Math.min(...values);
    case 'mean':
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    default:
      return values.reduce((sum, value) => sum + value, 0);
  }
}

interface TickAccumulator {
  id: string | number;
  order: number;
  date: string | undefined;
  hour: number | undefined;
  custom: HeatmapTick | undefined;
}

interface CellAccumulator {
  column: TickAccumulator;
  row: TickAccumulator;
  keys: unknown[];
  sequence: number;
  date: string | undefined;
  data: HeatmapDatum[];
}

/** Places the range and the dataset on the two projections. */
export function buildHeatmapModel(input: HeatmapModelInput): HeatmapModel {
  const levels = Math.max(2, Math.floor(input.levels) || 5);
  const { unit, adapter } = input;
  const [defaultColumns, defaultRows] = defaultProjections(unit);
  let columns = input.columns ?? (input.rows === undefined ? defaultColumns : undefined);
  const rows = input.rows ?? (input.columns === undefined ? defaultRows : undefined);
  // A wrap count on one axis makes the other count the lines; two lines axes cannot both wrap.
  if (columns === undefined && typeof rows !== 'number') columns = 'index';
  for (const projection of [columns, rows])
    if (projection !== undefined) {
      const error = projectionError(projection, unit);
      if (error) return emptyModel(levels, error);
    }
  if (unit === 'custom' && (typeof columns !== 'object' || typeof rows !== 'object'))
    return emptyModel(levels, 'A custom unit needs a custom axis for both columns and rows.');

  const origin = '1970-01-01';
  const context: ProjectionContext = {
    unit,
    adapter,
    weekStart: input.weekStart,
    minimalDays: input.minimalDays,
    locale: input.locale,
    origin,
  };

  const range = { unit, start: input.start, end: input.end };
  const axisOrders = new Map<HeatmapProjection, Map<string | number, number>>();
  const axisTickRecords = new Map<HeatmapProjection, Map<string | number, HeatmapTick>>();
  for (const projection of [columns, rows])
    if (typeof projection === 'object') {
      const ticks = customTicks(projection as HeatmapAxis<unknown>, range);
      axisOrders.set(projection, new Map(ticks.map((tick, index) => [tick.id, index])));
      axisTickRecords.set(projection, new Map(ticks.map((tick) => [tick.id, tick])));
    }

  const wrap = typeof columns === 'number' ? columns : typeof rows === 'number' ? rows : undefined;
  const columnTicks = new Map<string | number, TickAccumulator>();
  const rowTicks = new Map<string | number, TickAccumulator>();
  const cells = new Map<string, CellAccumulator>();
  const keyCells = new Map<string | number, CellAccumulator>();

  // With separated groups, the parts of a tick that spans two groups (a week across a month's
  // start) are ticks of their own: the first keeps the tick's id, a later one takes its first
  // key's date, and they follow each other in the tick's place.
  const separated = input.groups === 'separated';
  const parts = new Map<Map<string | number, TickAccumulator>, Map<string | number, number>>();
  const place = (item: SequenceKey, raw: unknown): CellAccumulator | undefined => {
    const column = project(columns, item, context, wrap, raw, axisOrders.get(columns!));
    const row = project(rows, item, context, wrap, raw, axisOrders.get(rows!));
    if (!column || !row) return undefined;
    const tick = (
      map: Map<string | number, TickAccumulator>,
      projected: typeof column,
      axis: HeatmapProjection | undefined,
    ) => {
      const group = separated ? changePointGroup(axis, item.date, context) : undefined;
      const mapKey = group ? `${String(projected.id)}\u0000${group.id}` : projected.id;
      let record = map.get(mapKey);
      if (!record) {
        let counts = parts.get(map);
        if (!counts) parts.set(map, (counts = new Map()));
        const part = group ? (counts.get(projected.id) ?? 0) : 0;
        if (group) counts.set(projected.id, part + 1);
        record = {
          id: part ? (item.date ?? String(item.key)) : projected.id,
          order: projected.order + part / 16,
          date: item.date,
          hour: item.hour,
          custom:
            typeof axis === 'object' ? axisTickRecords.get(axis)?.get(projected.id) : undefined,
        };
        map.set(mapKey, record);
      }
      return record;
    };
    const columnTick = tick(columnTicks, column, columns);
    const rowTick = tick(rowTicks, row, rows);
    const cellKey = `${String(columnTick.id)}\u0000${String(rowTick.id)}`;
    let cell = cells.get(cellKey);
    if (!cell) {
      cell = {
        column: columnTick,
        row: rowTick,
        keys: [],
        sequence: item.position,
        date: item.date,
        data: [],
      };
      cells.set(cellKey, cell);
    }
    return cell;
  };

  if (unit === 'custom') {
    // Every pair of the two custom axes' ticks is a cell.
    const columnRecords = axisTickRecords.get(columns!)!;
    const rowRecords = axisTickRecords.get(rows!)!;
    if (columnRecords.size * rowRecords.size > MAX_HEATMAP_CELLS)
      return emptyModel(levels, `The axes hold more than ${MAX_HEATMAP_CELLS} cells.`);
    let sequence = 0;
    for (const row of rowRecords.values())
      for (const column of columnRecords.values()) {
        const columnTick: TickAccumulator = columnTicks.get(column.id) ?? {
          id: column.id,
          order: axisOrders.get(columns!)!.get(column.id)!,
          date: undefined,
          hour: undefined,
          custom: column,
        };
        const rowTick: TickAccumulator = rowTicks.get(row.id) ?? {
          id: row.id,
          order: axisOrders.get(rows!)!.get(row.id)!,
          date: undefined,
          hour: undefined,
          custom: row,
        };
        columnTicks.set(column.id, columnTick);
        rowTicks.set(row.id, rowTick);
        cells.set(`${String(column.id)}\u0000${String(row.id)}`, {
          column: columnTick,
          row: rowTick,
          keys: [],
          sequence: sequence++,
          date: undefined,
          data: [],
        });
      }
    for (const datum of input.data) {
      const projectedColumn = (columns as HeatmapAxis<unknown>).of(datum.key, -1);
      const projectedRow = (rows as HeatmapAxis<unknown>).of(datum.key, -1);
      if (projectedColumn === undefined || projectedRow === undefined) continue;
      const cell = cells.get(`${String(projectedColumn)}\u0000${String(projectedRow)}`);
      if (cell) {
        cell.data.push(datum);
        cell.keys.push(datum.key);
      }
    }
  } else {
    const fallback = defaultRange(input.today, context);
    let startText = input.start;
    let endText = input.end;
    if (unit === 'index') {
      const indices = input.data.map((datum) => Number(datum.key)).filter(Number.isInteger);
      startText ??= '0';
      endText ??= String(indices.length ? Math.max(...indices) : 0);
    } else {
      startText ??= fallback.start;
      endText ??= fallback.end;
    }
    const start = normalizeKey(startText, context);
    const end = normalizeKey(endText, context);
    if (!start || !end)
      return emptyModel(levels, `The range ${startText}–${endText} holds no ${unit} keys.`);
    const sequence = enumerateRange(start, end, context);
    if (!sequence)
      return emptyModel(levels, `The range holds more than ${MAX_HEATMAP_CELLS} keys.`);
    for (const item of sequence) {
      const cell = place(item, item.key);
      if (!cell) continue;
      cell.keys.push(item.key);
      keyCells.set(item.key, cell);
    }
    for (const datum of input.data) {
      const key = normalizeKey(datum.key, context);
      const cell = key && keyCells.get(key.key);
      if (cell && Number.isFinite(datum.value)) cell.data.push(datum);
    }
    // A fixed cycle shows every tick, so a partial range keeps its seven weekdays.
    for (const [projection, map] of [
      [columns, columnTicks],
      [rows, rowTicks],
    ] as const) {
      const cycle = projection === undefined ? undefined : fullCycle(projection);
      if (!cycle || map.size >= cycle) continue;
      const sample = sequence[0];
      for (let offset = 0; offset < cycle && sample; offset += 1) {
        const probe = cycleProbe(projection!, sample, offset, context);
        const projected = probe && project(projection, probe, context, wrap, probe.key);
        if (projected && !map.has(projected.id))
          map.set(projected.id, {
            id: projected.id,
            order: projected.order,
            date: probe.date,
            hour: probe.hour,
            custom: undefined,
          });
      }
    }
  }

  const order = (map: Map<string | number, TickAccumulator>) =>
    [...map.values()].sort((a, b) => a.order - b.order);
  const sortedColumns = order(columnTicks);
  const sortedRows = order(rowTicks);
  const columnIndex = new Map(sortedColumns.map((tick, index) => [tick.id, index]));
  const rowIndex = new Map(sortedRows.map((tick, index) => [tick.id, index]));

  const tickModels = (ticks: TickAccumulator[], projection: HeatmapProjection | undefined) =>
    ticks.map<HeatmapTickModel>((tick, index) => ({
      id: tick.id,
      index,
      group:
        typeof projection === 'object'
          ? (projection as HeatmapAxis<unknown>).group?.(tick.custom ?? { id: tick.id })
          : changePointGroup(projection, tick.date, context),
      label: (width) => {
        if (typeof projection === 'object') {
          const record = tick.custom ?? { id: tick.id };
          return (projection as HeatmapAxis<unknown>).label?.(record, width) ?? record.label ?? '';
        }
        return builtInTickLabel(projection, tick, width, context, tick.date, tick.hour);
      },
    }));

  const accumulated = [...cells.values()];
  const aggregating = accumulated.some((cell) => cell.keys.length > 1) && unit !== 'custom';
  const values: number[] = [];
  const preliminary = accumulated.map((cell) => {
    const finite = cell.data.map((datum) => datum.value).filter(Number.isFinite);
    const value = finite.length ? combine(finite, input.aggregate) : null;
    if (value !== null) values.push(value);
    return value;
  });
  const scale = heatmapLevelScale({
    values,
    levels,
    scale: input.scale,
    thresholds: input.thresholds,
    domain: input.domain,
  });

  const grid: (HeatmapCellModel | undefined)[] = new Array(
    sortedColumns.length * sortedRows.length,
  );
  const byId = new Map<string, HeatmapCellModel>();
  let total = 0;
  let max = 0;
  let nonZero = 0;
  const built = accumulated.map((cell, index): HeatmapCellModel => {
    const value = preliminary[index]!;
    const explicit = cell.data
      .map((datum) => datum.level)
      .filter((level): level is number => Number.isInteger(level));
    const level = explicit.length
      ? Math.min(levels - 1, Math.max(0, ...explicit))
      : scale.level(value);
    const column = columnIndex.get(cell.column.id)!;
    const row = rowIndex.get(cell.row.id)!;
    const single = cell.keys.length === 1 && unit !== 'custom';
    const id =
      single && !aggregating
        ? String(cell.keys[0])
        : `${String(cell.column.id)}:${String(cell.row.id)}`;
    if (value !== null) {
      total += value;
      max = Math.max(max, value);
      if (value > 0) nonZero += 1;
    }
    const model: HeatmapCellModel = {
      id,
      column,
      row,
      keys: cell.keys,
      data: cell.data,
      value,
      level,
      sequence: cell.sequence,
      date: single && (unit === 'day' || unit === 'week') ? cell.date : undefined,
    };
    grid[row * sortedColumns.length + column] = model;
    byId.set(id, model);
    return model;
  });
  built.sort((a, b) => a.sequence - b.sequence);

  return {
    columns: tickModels(sortedColumns, columns),
    rows: tickModels(sortedRows, rows),
    cells: built,
    byId,
    at: (column, row) =>
      column < 0 || row < 0 || column >= sortedColumns.length || row >= sortedRows.length
        ? undefined
        : grid[row * sortedColumns.length + column],
    aggregating,
    levels,
    scale,
    summary: { total, max, cells: built.length, nonZero },
    error: undefined,
  };
}

/** A key standing for one tick of a fixed cycle, for labeling a tick no key of the range reaches. */
function cycleProbe(
  projection: HeatmapProjection,
  sample: SequenceKey,
  offset: number,
  context: ProjectionContext,
): SequenceKey | undefined {
  const date = sample.date;
  if (!date) return undefined;
  if (projection === 'weekday')
    return {
      key: context.adapter.addDays(date, offset),
      position: 0,
      date: context.adapter.addDays(date, offset),
      hour: sample.hour,
    };
  if (projection === 'month-of-year') {
    const month = context.adapter.addMonths(context.adapter.startOfMonth(date), offset);
    return { key: month, position: 0, date: month };
  }
  if (projection === 'hour-of-day')
    return { key: `${date}T${offset}`, position: 0, date, hour: offset };
  return undefined;
}
