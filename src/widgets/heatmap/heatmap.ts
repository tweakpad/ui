import { html, nothing, type PropertyValues, type TemplateResult } from 'lit';
import { guard } from 'lit/directives/guard.js';
import { TpElement } from '../../foundation/element.js';
import { ControllableState, orderedValuesEqual } from '../../foundation/controllable-state.js';
import { containNestedEvents } from '../../foundation/nested-events.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import type { ChangeReason } from '../../foundation/types.js';
import { defaultTrue } from '../../foundation/converters.js';
import { resolveLocale } from '../../foundation/services.js';
import { numberFormatter } from '../../foundation/intl.js';
import { observeResize, observeScroll } from '../../foundation/observation.js';
import { LabelFit } from '../../foundation/label-fit.js';
import {
  gridKeyMove,
  rowEdgeCell,
  stepGridCell,
  type GridCells,
} from '../../foundation/grid-navigation.js';
import {
  calendarSelectionProposal,
  calendarValueDates,
  gregorianCalendarAdapter,
  isCalendarRange,
  localeWeekInfo,
  matchesCalendarDate,
  normalizeCalendarValue,
  resolveWeekStart,
  sameCalendarValue,
  todayCalendarDate,
  type CalendarAdapter,
  type CalendarDateMatcher,
  type CalendarSelectionOrder,
  type CalendarValue,
} from '../../foundation/calendar.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { heatmapPresentation } from '../../presentation/families/heatmap.js';
import { TpTooltip } from '../../components/tooltip/tooltip.js';
import { TpScrollArea } from '../../components/scroll-area/scroll-area.js';
import { TpToggleGroup } from '../../components/toggle-group/toggle-group.js';
import { TpToggle } from '../../components/toggle/toggle.js';
import {
  buildHeatmapModel,
  groupStarts,
  type HeatmapCellModel,
  type HeatmapModel,
  type HeatmapTickModel,
} from './model.js';
import { DEFAULT_HEATMAP_MESSAGES, resolveHeatmapMessages } from './strings.js';
import { heatmapStyles } from './styles.js';
import type {
  HeatmapActivateDetail,
  HeatmapAggregate,
  HeatmapCellState,
  HeatmapColor,
  HeatmapDatum,
  HeatmapFit,
  HeatmapGroups,
  HeatmapFormatters,
  HeatmapInspectionDetail,
  HeatmapInteraction,
  HeatmapLabels,
  HeatmapMessages,
  HeatmapProjection,
  HeatmapScale,
  HeatmapSelectionMode,
  HeatmapShape,
  HeatmapSize,
  HeatmapSummary,
  HeatmapUnit,
} from './types.js';

/** The selected cell ids, with a range's ends. */
/** An axis's grid tracks: the group starts, the track list and a tick index's grid line. */
interface AxisLayout {
  readonly starts: readonly number[];
  readonly tracks: string;
  track(index: number): number;
}

interface SelectedCells {
  ids: Set<string>;
  from?: string;
  to?: string;
}

/** Calendar's value attribute form: dates separated by spaces, a range as `from/to`. */
const valueConverter = {
  fromAttribute(value: string | null): CalendarValue {
    if (value === null || !value.trim()) return undefined;
    if (value.includes('/')) {
      const [from, to] = value.split('/', 2);
      return from ? { from, ...(to ? { to } : {}) } : undefined;
    }
    const ids = value.split(/[\s,]+/u).filter(Boolean);
    return ids.length > 1 ? ids : ids[0];
  },
  toAttribute(value: CalendarValue): string | null {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
    if (value) return `${value.from}${value.to ? `/${value.to}` : ''}`;
    return null;
  },
};

/** A projection attribute: a number is a wrap count, any other text a projection name. */
const projectionConverter = {
  fromAttribute(value: string | null): HeatmapProjection | undefined {
    if (value === null || !value.trim()) return undefined;
    const number = Number(value);
    return Number.isFinite(number) ? number : (value.trim() as HeatmapProjection);
  },
  toAttribute(value: HeatmapProjection | undefined): string | null {
    return typeof value === 'object' || value === undefined ? null : String(value);
  },
};

/** A level list attribute: levels separated by spaces or commas, or a JSON array. */
const levelListConverter = {
  fromAttribute(value: string | null): readonly number[] | undefined {
    if (value === null) return undefined;
    const parts = value.trim().startsWith('[')
      ? (JSON.parse(value) as unknown[])
      : value.split(/[\s,]+/u).filter(Boolean);
    return normalizeLevels(parts.map(Number));
  },
  toAttribute(value: readonly number[] | null | undefined): string | null {
    return value ? value.join(' ') : null;
  },
};

/** Unique non-negative integer levels in ascending order. */
function normalizeLevels(levels: readonly number[]): number[] {
  return [...new Set(levels.filter((level) => Number.isInteger(level) && level >= 0))].sort(
    (a, b) => a - b,
  );
}

/**
 * The interface color roles a heatmap paints with, each a subtle and a strong color the theme
 * defines for both schemes. Levels run from the subtle color to the strong one, so every level
 * stays anchored to the theme's own colors.
 */
const COLOR_FAMILIES = [
  'primary',
  'success',
  'warning',
  'destructive',
] as const satisfies readonly HeatmapColor[];

function familyColors(family: HeatmapColor): { strong: string; subtle: string } {
  return { strong: `var(--tp-${family})`, subtle: `var(--tp-${family}-subtle)` };
}

/**
 * A library color by name, for an explicit ramp: `muted` (the empty color), a role (its strong
 * color) or `<role>-subtle`; undefined for any other text.
 */
function libraryColor(name: string): string | undefined {
  if (name === 'muted') return 'var(--tp-muted)';
  const subtle = name.endsWith('-subtle');
  const family = (subtle ? name.slice(0, -'-subtle'.length) : name) as HeatmapColor;
  if (!(COLOR_FAMILIES as readonly string[]).includes(family)) return undefined;
  const colors = familyColors(family);
  return subtle ? colors.subtle : colors.strong;
}

/**
 * Values as a grid of colored cells, such as activity over a year. Each datum has a key (a date,
 * an hour, a week, a month, a year, an index or any value of your own) and the `columns` and `rows`
 * projections place every key of the range on a column and a row: week columns by weekday rows,
 * months by days of the month, weekdays by hours of the day or a plain wrapped sequence. A cell
 * exists only where a key lands, and keys landing on one cell combine. Values map to a few color
 * levels shown in a legend; cells can be inspected with a tooltip and, optionally, selected.
 *
 * @slot footer - Content at the start of the legend row, such as a total.
 * @fires tp-value-change - Cancelable proposal of the selected cells (with `selection-mode`).
 * @fires tp-value-commit - After the selection changes.
 * @fires tp-level-filter-change - Cancelable proposal of the levels the legend filter shows.
 * @fires tp-inspection-change - The hovered or focused cell changed, or inspection ended.
 * @fires tp-cell-activate - A cell was clicked or activated with Enter or Space.
 * @cssprop --tp-heatmap-cell-size - The cell size, and the minimum cell size with `fit="stretch"`.
 * @cssprop --tp-heatmap-gap - The space between cells.
 * @cssprop --tp-heatmap-group-gap - The space between groups with `groups="separated"`.
 * @cssprop --tp-heatmap-radius - The cell corner radius; `shape` sets it by default.
 * @cssprop --tp-heatmap-color - The ramp's strong color; `color` sets it from an interface role.
 * @cssprop --tp-heatmap-subtle-color - The ramp's first color after the empty one; `color` sets it.
 * @cssprop --tp-heatmap-empty-color - The color of level 0, where the ramp starts.
 */
export class TpHeatmap extends TpElement {
  static tagName = 'tp-heatmap';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip, TpScrollArea, TpToggleGroup, TpToggle];
  }
  static override presentation = heatmapPresentation;
  static override properties = {
    ...TpElement.properties,
    data: { attribute: false },
    unit: { type: String, reflect: true },
    start: { type: String },
    end: { type: String },
    columns: { converter: projectionConverter },
    rows: { converter: projectionConverter },
    aggregate: { type: String },
    locale: { type: String },
    weekStartsOn: { type: Number, attribute: 'week-starts-on' },
    today: { type: String },
    calendarAdapter: { attribute: false },
    dayModifiers: { attribute: false },
    levels: { type: Number },
    scale: { type: String },
    thresholds: { attribute: false },
    domain: { attribute: false },
    color: { type: String },
    colors: { attribute: false },
    size: { type: String, reflect: true },
    shape: { type: String, reflect: true },
    fit: { type: String, reflect: true },
    groups: { type: String, reflect: true },
    scrollAnchor: { type: String, attribute: 'scroll-anchor' },
    columnLabels: { type: String, attribute: 'column-labels' },
    rowLabels: { type: String, attribute: 'row-labels' },
    legend: { type: Boolean, converter: defaultTrue },
    label: { type: String },
    loading: { type: Boolean, reflect: true },
    interaction: { type: String, reflect: true },
    tooltip: { type: Boolean, converter: defaultTrue },
    maxHints: { type: Number, attribute: 'max-hints' },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    value: { noAccessor: true, converter: valueConverter },
    defaultValue: { attribute: 'default-value', converter: valueConverter },
    required: { type: Boolean },
    minimumSelectionCount: { type: Number, attribute: 'minimum-selection-count' },
    maximumSelectionCount: { type: Number, attribute: 'maximum-selection-count' },
    rangeExclusion: { type: String, attribute: 'range-exclusion' },
    disabledCells: { attribute: false },
    renderTooltip: { attribute: false },
    formatters: { attribute: false },
    messages: { attribute: false },
    legendFilter: { type: Boolean, attribute: 'legend-filter' },
    levelFilter: { noAccessor: true, attribute: 'level-filter', converter: levelListConverter },
    defaultLevelFilter: { attribute: 'default-level-filter', converter: levelListConverter },
  };
  static override styles = [TpElement.styles, heatmapStyles];

  /** The values; values that land on one cell combine by `aggregate`. */
  data: readonly HeatmapDatum[] = [];
  /** The form and granularity of the keys, and of `start` and `end`. */
  unit: HeatmapUnit = 'day';
  /** The first key of the range; defaults to the start of the period ending `today`. */
  start: string | undefined;
  /** The last key of the range; defaults to `today` in the unit's form. */
  end: string | undefined;
  /**
   * The projection of keys onto columns: a built-in name (`week`, `month`, `weekday`,
   * `day-of-month`, `hour-of-day`…), a wrap count, or a custom axis; defaults by unit (`week`).
   */
  columns: HeatmapProjection | undefined;
  /** The projection of keys onto rows, as `columns`; defaults by unit (`weekday`). */
  rows: HeatmapProjection | undefined;
  /** How values landing on one cell combine. */
  aggregate: HeatmapAggregate = 'sum';
  /** The locale of labels and numbers; defaults to the inherited `lang`. */
  locale = '';
  /** The first day of the week from 0 (Sunday) to 6; -1 follows the locale. */
  weekStartsOn = -1;
  /** Today's ISO date: the default range end and the `data-today` cell. */
  today = todayCalendarDate();
  /** The calendar system of date keys, as on Calendar. */
  calendarAdapter: CalendarAdapter = gregorianCalendarAdapter;
  /** Named date sets or predicates published as `data-<name>` markers on date cells. */
  dayModifiers: Record<string, CalendarDateMatcher> = {};
  /** The number of color levels, level 0 (no value) included. */
  levels = 5;
  /** How values map to levels when `thresholds` is not set: equal steps or equal counts. */
  scale: HeatmapScale = 'linear';
  /** Ascending lower bounds of levels 1 and up; overrides `scale`. */
  thresholds: readonly number[] | undefined;
  /** The `[min, max]` of the linear scale; defaults to zero and the largest value. */
  domain: readonly [number, number] | undefined;
  /** The interface color role whose subtle and strong colors bound the ramp. */
  color: HeatmapColor = 'primary';
  /**
   * One library color per level, replacing the ramp: `muted`, a role (its strong color) or
   * `<role>-subtle`; its length sets the number of levels.
   */
  colors: readonly string[] | undefined;
  /** Cell size, gap and label text. */
  size: HeatmapSize = 'default';
  /** Cell shape. */
  shape: HeatmapShape = 'rounded';
  /**
   * How the grid meets its width: cells that grow to fill it (scrolling once they would shrink
   * below their size), fixed cells that scroll with shaded edges starting at the latest data, or
   * fixed cells without the oldest columns that do not fit.
   */
  fit: HeatmapFit = 'stretch';
  /**
   * How groups show (the months of week or day ticks, the days of hour ticks, a custom axis's
   * groups): side by side, or `separated` into blocks with space between them, a week that spans
   * two months split into one column per month.
   */
  groups: HeatmapGroups = 'joined';
  /** With `fit="scroll"`, the end shown first: the latest data (`end`) or the range start. */
  scrollAnchor: 'end' | 'start' = 'end';
  /** Which column labels show. */
  columnLabels: HeatmapLabels = 'auto';
  /** Which row labels show. */
  rowLabels: HeatmapLabels = 'auto';
  /** Shows the Less–More legend under the grid. */
  legend = true;
  /**
   * Makes each legend level with values a toggle that shows or hides its level's cells; at least
   * one level stays shown.
   */
  legendFilter = false;
  /** The levels the grid shows at first render, when the page does not own `levelFilter`. */
  defaultLevelFilter: readonly number[] | undefined;
  /** Called with each proposed level filter before it commits. */
  onLevelFilterChange: ((event: TpValueChangeEvent<readonly number[] | null>) => void) | undefined;
  /** The accessible name of the grid. */
  label = 'Heatmap';
  /** Shows the cells as loading placeholders. */
  loading = false;
  /** Whether the grid takes focus and shows a tooltip for its cells, or is a passive figure. */
  interaction: HeatmapInteraction = 'inspect';
  /** Shows a tooltip for the hovered or focused cell. */
  tooltip = true;
  /** The most dataset hints a tooltip lists before a "+n more" line. */
  maxHints = 3;
  /** Selection of cells, using Calendar's selection model; `none` keeps the heatmap display-only. */
  selectionMode: HeatmapSelectionMode = 'none';
  /** The selected cells at first render, when the page does not own `value`. */
  defaultValue: CalendarValue;
  /** Keeps at least one cell selected. */
  required = false;
  /** The fewest cells a multiple selection keeps. */
  minimumSelectionCount = 0;
  /** The most cells a multiple selection holds. */
  maximumSelectionCount = Number.POSITIVE_INFINITY;
  /** What a range across a disabled cell does: keep the start, or start a new range. */
  rangeExclusion: 'reject' | 'restart' = 'reject';
  /** Cell ids (or a predicate of them) that cannot be selected; they can still be inspected. */
  disabledCells: CalendarDateMatcher;
  /** Replaces the tooltip content of a cell. */
  renderTooltip: ((cell: HeatmapCellState) => unknown) | null = null;
  /** Display strings of values and labels. */
  formatters: HeatmapFormatters = {};
  /** User-facing text; English by default. */
  messages: Partial<HeatmapMessages> | undefined;
  /** Called with each proposed selection before it commits. */
  onValueChange: ((event: TpValueChangeEvent<CalendarValue>) => void) | undefined;
  /** Called when the inspected cell changes. */
  onInspectionChange: ((detail: HeatmapInspectionDetail) => void) | undefined;

  #providedValue: CalendarValue | null = null;
  #model: HeatmapModel | null = null;
  #focusedId = '';
  #inspected: { id: string; source: 'pointer' | 'keyboard' } | null = null;
  #trim = 0;
  #pinned = true;
  #anchored = false;
  #releaseResize: (() => void) | undefined;
  #releaseScroll: (() => void) | undefined;
  #observedViewport: HTMLElement | null = null;
  #observedRoot: Element | null = null;
  readonly #columnFit = new LabelFit(this);

  readonly #selection = new ControllableState<CalendarValue>({
    host: this,
    onChange: (event) => this.onValueChange?.(event),
    initialValue: undefined,
    readControlledValue: () => (this.#providedValue === null ? undefined : this.#providedValue),
    readDefaultValue: () => this.defaultValue,
    hasDefaultValue: () => this.defaultValue !== undefined,
    equals: (a, b) =>
      this.selectionMode === 'none' || sameCalendarValue(this.selectionMode, a, b, this.#order),
    onCommit: (value, previous, reason) => {
      this.requestUpdate('value', previous);
      this.dispatchEvent(new TpValueCommitEvent(value, previous, reason));
    },
    diagnostic: (message) => this.diagnose('value', message, { once: true }),
  });

  #providedLevelFilter: readonly number[] | null | undefined;
  readonly #levelFilter = new ControllableState<readonly number[] | null>({
    host: this,
    onChange: (event) => this.onLevelFilterChange?.(event),
    initialValue: null,
    readControlledValue: () => this.#providedLevelFilter,
    readDefaultValue: () => this.defaultLevelFilter,
    hasDefaultValue: () => this.defaultLevelFilter !== undefined,
    equals: (a, b) => (a === null || b === null ? a === b : orderedValuesEqual(a, b)),
    eventFactory: (value, previous, reason, source, options) =>
      new TpValueChangeEvent(value, previous, reason, source, options, 'tp-level-filter-change'),
    onCommit: (_value, previous) => this.requestUpdate('levelFilter', previous),
    diagnostic: (message) => this.diagnose('levelFilter', message, { once: true }),
  });

  /**
   * The levels the grid shows; the others paint as empty. Null shows every level; an empty list
   * shows none.
   */
  get levelFilter(): readonly number[] | null {
    return this.#levelFilter.value;
  }
  set levelFilter(value: readonly number[] | null | undefined) {
    const previous = this.levelFilter;
    this.#providedLevelFilter = value ? normalizeLevels(value) : value;
    if (this.hasUpdated) this.#levelFilter.sync();
    this.requestUpdate('levelFilter', previous);
  }

  constructor() {
    super();
    // The legend's Toggle group proposes its own value; the heatmap republishes it as its filter.
    containNestedEvents(this, {
      types: ['tp-value-change', 'tp-value-commit', 'tp-field-value'],
      on: 'root',
    });
  }

  /** The selected cells: an id, ids, or a `{ from, to }` range, by `selection-mode`. */
  get value(): CalendarValue {
    return this.#selection.value;
  }
  set value(value: CalendarValue) {
    const previous = this.value;
    this.#providedValue = value === undefined ? null : value;
    if (this.hasUpdated) this.#selection.sync();
    this.requestUpdate('value', previous);
  }

  /** Totals of the dataset over the displayed range. */
  get summary(): HeatmapSummary {
    return this.#ensureModel().summary;
  }

  /**
   * Proposes a selection from code, as a press would: it goes through `tp-value-change`, so a
   * controlled owner decides; returns whether it was accepted.
   */
  setValue(value: CalendarValue, sourceEvent?: Event): boolean {
    const mode = this.#mode();
    if (mode === 'none') return false;
    return this.#selection.set(
      normalizeCalendarValue(mode, value, this.#order),
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  /** The state of a cell by id, or undefined. */
  cellAt(id: string): HeatmapCellState | undefined {
    const cell = this.#ensureModel().byId.get(id);
    return cell ? this.#cellState(cell) : undefined;
  }

  /** Moves focus to a cell by id, scrolling it into view. */
  focusCell(id: string): void {
    if (!this.#ensureModel().byId.has(id)) return;
    void this.updateComplete.then(() => {
      this.#rove(id);
      this.#cellElement(id)?.focus();
    });
  }

  // Model --------------------------------------------------------------------------------------

  #locale(): string | undefined {
    return this.locale || resolveLocale(this);
  }

  #ensureModel(): HeatmapModel {
    if (this.#model) return this.#model;
    const locale = this.#locale();
    const model = buildHeatmapModel({
      unit: this.unit,
      start: this.start || undefined,
      end: this.end || undefined,
      today: this.today,
      columns: this.columns,
      rows: this.rows,
      groups: this.groups,
      data: this.data ?? [],
      aggregate: this.aggregate,
      adapter: this.calendarAdapter,
      weekStart: resolveWeekStart(this.weekStartsOn, locale),
      minimalDays: localeWeekInfo(locale).minimalDays,
      locale,
      levels: this.#explicitRamp()?.length ?? this.levels,
      scale: this.scale,
      thresholds: this.thresholds,
      domain: this.domain,
    });
    if (model.error) this.diagnose('configuration', model.error, { once: true, defer: true });
    this.#model = model;
    return model;
  }

  /** The order selection walks: cells in range order, identified by id. */
  readonly #order: CalendarSelectionOrder = {
    normalize: (id) => (this.#ensureModel().byId.has(id) ? id : null),
    compare: (a, b) => this.#sequence(a) - this.#sequence(b),
    differenceInDays: (later, earlier) => this.#sequence(later) - this.#sequence(earlier),
    addDays: (id, amount) => this.#ensureModel().cells[this.#sequence(id) + amount]?.id ?? id,
  };

  #sequenceIndex: Map<string, number> | null = null;
  #sequence(id: string): number {
    const model = this.#ensureModel();
    if (!this.#sequenceIndex)
      this.#sequenceIndex = new Map(model.cells.map((cell, index) => [cell.id, index]));
    return this.#sequenceIndex.get(id) ?? -1;
  }

  /** The selection mode in effect: a range needs one key per cell. */
  #mode(): HeatmapSelectionMode {
    if (this.selectionMode === 'range' && this.#ensureModel().aggregating) {
      this.diagnose(
        'range-selection',
        'Range selection needs one key per cell; this arrangement combines keys.',
        { once: true, defer: true },
      );
      return 'none';
    }
    return this.selectionMode;
  }

  #selectedIds(): SelectedCells {
    const mode = this.#mode();
    if (mode === 'none') return { ids: new Set() };
    const value = normalizeCalendarValue(mode, this.value, this.#order);
    if (mode !== 'range' || !isCalendarRange(value))
      return { ids: new Set(calendarValueDates(mode, value, this.#order)) };
    const cells = this.#ensureModel().cells;
    const first = this.#sequence(value.from);
    const last = value.to ? this.#sequence(value.to) : first;
    return {
      ids: new Set(cells.slice(first, last + 1).map((cell) => cell.id)),
      from: value.from,
      ...(value.to ? { to: value.to } : {}),
    };
  }

  #disabled(cell: HeatmapCellModel): boolean {
    return matchesCalendarDate(this.disabledCells, cell.id);
  }

  #formatValue(value: number): string {
    return this.formatters.value?.(value) ?? numberFormatter(this.#locale()).format(value);
  }

  #cellState(cell: HeatmapCellModel, selected = this.#selectedIds().ids): HeatmapCellState {
    const model = this.#ensureModel();
    const modifiers = cell.date
      ? Object.keys(this.dayModifiers).filter((name) =>
          matchesCalendarDate(this.dayModifiers[name], cell.date!),
        )
      : [];
    return {
      id: cell.id,
      keys: cell.keys,
      data: cell.data,
      column: model.columns[cell.column]!.id,
      row: model.rows[cell.row]!.id,
      columnLabel: model.columns[cell.column]!.label('long'),
      rowLabel: model.rows[cell.row]!.label('long'),
      value: cell.value,
      level: cell.level,
      hints: cell.data
        .map((datum) => datum.hint)
        .filter((hint) => hint !== undefined && hint !== null && hint !== ''),
      date: cell.date,
      today: cell.date === this.today,
      selected: selected.has(cell.id),
      disabled: this.#disabled(cell),
      modifiers,
    };
  }

  #cellName(state: HeatmapCellState): string {
    const messages = resolveHeatmapMessages(this.messages);
    const custom = state.data.find((datum) => datum.label)?.label;
    if (custom) return custom;
    const where =
      this.messages?.where?.(state) ??
      (state.date
        ? this.calendarAdapter.format(state.date, this.#locale(), 'accessible')
        : DEFAULT_HEATMAP_MESSAGES.where(state));
    const value = state.value === null ? messages.noValue : this.#formatValue(state.value);
    return messages.cell(state, value, where);
  }

  // Lifecycle ----------------------------------------------------------------------------------

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const modelInputs = [
      'data',
      'unit',
      'start',
      'end',
      'columns',
      'rows',
      'groups',
      'aggregate',
      'locale',
      'weekStartsOn',
      'today',
      'calendarAdapter',
      'levels',
      'scale',
      'thresholds',
      'domain',
      'colors',
    ] as const;
    if (modelInputs.some((name) => changed.has(name)) || changed.has('lang' as keyof TpHeatmap)) {
      this.#model = null;
      this.#sequenceIndex = null;
      this.#trim = 0;
    }
  }

  /** Whether the last render rebuilt the cells, so layout-dependent work must run again. */
  #cellsRendered = false;

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    // An update that only moved the inspection (the tooltip) changes no layout: skip the reads.
    const layout = this.#cellsRendered || changed.size > 0;
    this.#cellsRendered = false;
    if (!layout) return;
    this.#observeLayout();
    this.#columnFit.observe(this.renderRoot.querySelector<HTMLElement>('.column-label[data-fit]'), [
      ...this.renderRoot.querySelectorAll<HTMLElement>('.column-label[data-fit] .label-short'),
    ]);
    this.#clipColumnLabels();
    if (this.#scrolling) this.#anchorScroll();
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.ownerDocument.addEventListener('pointerdown', this.#outsidePress, true);
    if (this.hasUpdated) {
      this.#observedRoot = null;
      this.#observedViewport = null;
      this.#observeLayout();
    }
  }

  override disconnectedCallback(): void {
    this.ownerDocument.removeEventListener('pointerdown', this.#outsidePress, true);
    this.#releaseResize?.();
    this.#releaseScroll?.();
    this.#releaseHost?.();
    this.#releaseResize = undefined;
    this.#releaseScroll = undefined;
    this.#releaseHost = undefined;
    this.#observedRoot = null;
    this.#observedViewport = null;
    this.#columnFit.disconnect();
    super.disconnectedCallback();
  }

  /** Observes the plot's size (trim and label clipping) and, scrolling, the cells' viewport. */
  #observeLayout(): void {
    const plot = this.renderRoot.querySelector<HTMLElement>('.plot');
    if (plot !== this.#observedRoot) {
      this.#releaseResize?.();
      this.#observedRoot = plot;
      this.#releaseResize = plot ? observeResize(plot, this.#resized) : undefined;
    }
    if (!this.#releaseHost) this.#releaseHost = observeResize(this, this.#resized);
    const scroller = this.#scrolling
      ? this.renderRoot.querySelector<TpScrollArea>('.scroller')
      : null;
    const viewport = scroller?.viewportElement ?? null;
    if (scroller && !viewport) {
      // The Scroll area renders its viewport on its own first update.
      void scroller.updateComplete.then(() => {
        if (!this.isConnected) return;
        this.#observeLayout();
        this.#anchorScroll();
      });
      return;
    }
    if (viewport !== this.#observedViewport) {
      this.#releaseScroll?.();
      this.#observedViewport = viewport;
      const cells = viewport ? this.renderRoot.querySelector<HTMLElement>('.cells') : null;
      const releases = viewport
        ? [
            observeScroll(viewport, {
              scroll: this.#scrolled,
              userScroll: this.#userScrolled,
              timing: { immediate: true },
            }),
            observeResize(viewport, this.#resized),
            ...(cells ? [observeResize(cells, this.#resized)] : []),
          ]
        : [];
      this.#releaseScroll = releases.length
        ? () => {
            for (const release of releases) release();
          }
        : undefined;
      this.#anchored = false;
      this.#pinned = this.scrollAnchor === 'end';
    }
  }

  /** Whether the latest scroll came from the user, who may leave the anchored end. */
  #userScroll = false;
  readonly #userScrolled = (): void => {
    this.#userScroll = true;
  };

  readonly #resized = (): void => {
    this.#clipColumnLabels();
    if (this.fit === 'trim') this.#measureTrim();
    this.#measureStretch();
    if (this.#scrolling && this.#pinned) this.#scrollToAnchor();
  };

  /**
   * Whether stretched cells would shrink below their size; the grid then scrolls, as with
   * `fit="scroll"`, opening at the latest data with shaded edges.
   */
  #overflowing = false;
  get #scrolling(): boolean {
    return this.fit === 'scroll' || (this.fit === 'stretch' && this.#overflowing);
  }
  #releaseHost: (() => void) | undefined;

  #measureStretch(): void {
    const root = this.renderRoot.querySelector<HTMLElement>('.root');
    const plot = root?.querySelector<HTMLElement>('.plot');
    const probe = root?.querySelector<HTMLElement>('.probe');
    if (!root || !plot || !probe) return;
    let overflowing = false;
    if (this.fit === 'stretch') {
      const cell = probe.getBoundingClientRect().width;
      const gap = parseFloat(getComputedStyle(plot).columnGap) || 0;
      const labels = plot.querySelector<HTMLElement>('.row-labels')?.getBoundingClientRect().width;
      const columns = this.#ensureModel().columns;
      const spacers = this.#columnSpacers(columns).length;
      const needed =
        (labels === undefined ? 0 : labels + gap) +
        columns.length * (cell + gap) +
        spacers * (this.#groupSpace() + gap) -
        gap;
      overflowing = cell > 0 && needed > root.clientWidth + 0.5;
    }
    if (overflowing === this.#overflowing) return;
    this.#overflowing = overflowing;
    this.requestUpdate();
  }

  /** The column indices that start a separated group, where a spacer track sits before them. */
  #columnSpacers(columns: readonly HeatmapTickModel[]): number[] {
    return this.groups === 'separated' ? groupStarts(columns) : [];
  }

  /** The measured width of the spacer between separated groups. */
  #groupSpace(): number {
    return (
      this.renderRoot.querySelector<HTMLElement>('.probe[data-group]')?.getBoundingClientRect()
        .width ?? 0
    );
  }

  /** Drops the oldest columns that do not fit, keeping the latest ones. */
  #measureTrim(): void {
    const plot = this.#observedRoot as HTMLElement | null;
    const cell = plot?.querySelector<HTMLElement>('.cell');
    if (!plot || !cell) return;
    const rowLabels = plot.querySelector<HTMLElement>('.row-labels');
    const gap = parseFloat(getComputedStyle(plot).columnGap) || 0;
    const pitch = cell.getBoundingClientRect().width + gap;
    const available = plot.clientWidth - (rowLabels?.getBoundingClientRect().width ?? 0) - gap;
    const columns = this.#ensureModel().columns;
    const total = columns.length;
    // From the latest column back: each column takes a pitch, and a group it closes a spacer.
    const spacers = new Set(this.#columnSpacers(columns));
    const spacer = this.#groupSpace() + gap;
    let fits = total;
    if (pitch > 0) {
      let width = pitch - gap;
      fits = 1;
      for (let index = total - 2; index >= 0; index -= 1) {
        width += pitch + (spacers.has(index + 1) ? spacer : 0);
        if (width > available + 0.5) break;
        fits += 1;
      }
    }
    const trim = Math.max(0, total - fits);
    if (trim !== this.#trim) {
      this.#trim = trim;
      this.requestUpdate();
    }
  }

  /** Hides change-point labels whose span is narrower than their text. */
  #clipColumnLabels(): void {
    for (const label of this.renderRoot.querySelectorAll<HTMLElement>('.column-label[data-span]')) {
      const clipped = label.scrollWidth > label.clientWidth + 0.5;
      label.toggleAttribute('data-clipped', clipped);
    }
  }

  readonly #scrolled = (): void => {
    const viewport = this.#observedViewport;
    if (!viewport) return;
    const columns = this.renderRoot.querySelector<HTMLElement>('.column-labels .track');
    const rows = this.renderRoot.querySelector<HTMLElement>('.row-labels .track');
    if (columns) columns.style.transform = `translateX(${-viewport.scrollLeft}px)`;
    if (rows) rows.style.transform = `translateY(${-viewport.scrollTop}px)`;
    // Only the user moves the viewport off its anchor; layout changes keep it pinned.
    if (!this.#userScroll || this.scrollAnchor !== 'end') return;
    const target = this.#anchorTarget(viewport);
    this.#pinned =
      Math.abs(viewport.scrollLeft - target.left) <= 1 &&
      Math.abs(viewport.scrollTop - target.top) <= 1;
  };

  /** Where the anchored end puts the viewport: the axes the latest cell sits at the end of. */
  #anchorTarget(viewport: HTMLElement): { left: number; top: number } {
    const model = this.#ensureModel();
    const last = model.cells.at(-1);
    const maxX = viewport.scrollWidth - viewport.clientWidth;
    const maxY = viewport.scrollHeight - viewport.clientHeight;
    const rtl = this.direction === 'rtl';
    const latestX = last ? last.column >= model.columns.length / 2 : true;
    const latestY = last ? last.row >= model.rows.length / 2 : true;
    return {
      left: latestX ? (rtl ? -maxX : maxX) : 0,
      top: latestY ? maxY : 0,
    };
  }

  #scrollToAnchor(): void {
    const viewport = this.#observedViewport;
    if (!viewport) return;
    const target = this.scrollAnchor === 'end' ? this.#anchorTarget(viewport) : { left: 0, top: 0 };
    this.#userScroll = false;
    viewport.scrollLeft = target.left;
    viewport.scrollTop = target.top;
    this.#scrolled();
    if (this.scrollAnchor === 'end') this.#pinned = true;
  }

  /** Shows the anchored end on first layout, and keeps a pinned viewport at the latest data. */
  #anchorScroll(): void {
    if (!this.#observedViewport) return;
    if (!this.#anchored || this.#pinned) {
      this.#anchored = true;
      this.#scrollToAnchor();
    } else this.#scrolled();
  }

  // Interaction --------------------------------------------------------------------------------

  #cellElement(id: string): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>(`.cell[data-id="${CSS.escape(id)}"]`);
  }

  #cellFromEvent(event: Event): HeatmapCellModel | undefined {
    if (this.loading) return undefined;
    for (const target of event.composedPath()) {
      if (target === this) break;
      const id = (target as HTMLElement).dataset?.id;
      if (id !== undefined && (target as HTMLElement).classList.contains('cell'))
        return this.#ensureModel().byId.get(id);
    }
    return undefined;
  }

  #inspect(id: string | null, source: 'pointer' | 'keyboard'): void {
    if (this.interaction === 'none') id = null;
    if ((this.#inspected?.id ?? null) === id) return;
    // The marker moves without rendering the cells again; only the tooltip renders.
    if (this.#inspected) this.#cellElement(this.#inspected.id)?.removeAttribute('data-focused');
    if (id !== null) this.#cellElement(id)?.setAttribute('data-focused', '');
    this.#inspected = id === null ? null : { id, source };
    // A closing tooltip keeps the last cell's content and anchor while it fades out.
    if (id !== null) this.#tooltipId = id;
    this.requestUpdate();
    const cell = id === null ? undefined : this.#ensureModel().byId.get(id);
    const detail: HeatmapInspectionDetail = {
      cell: cell ? this.#cellState(cell) : null,
      source,
    };
    this.onInspectionChange?.(detail);
    this.emit('tp-inspection-change', detail);
  }

  readonly #pointerOver = (event: PointerEvent): void => {
    const cell = this.#cellFromEvent(event);
    if (cell) this.#inspect(cell.id, 'pointer');
  };

  readonly #pointerLeave = (): void => {
    if (this.#inspected?.source === 'pointer') this.#inspect(null, 'pointer');
  };

  readonly #focusIn = (event: FocusEvent): void => {
    const cell = this.#cellFromEvent(event);
    if (!cell) return;
    this.#rove(cell.id);
    this.#inspect(cell.id, 'keyboard');
  };

  readonly #focusOut = (event: FocusEvent): void => {
    const next = event.relatedTarget as Node | null;
    if (next && this.renderRoot.contains(next)) return;
    if (this.#inspected?.source === 'keyboard') this.#inspect(null, 'keyboard');
  };

  /** A press outside the heatmap clears the selection, unless one is required. */
  readonly #outsidePress = (event: PointerEvent): void => {
    if (event.composedPath().includes(this)) return;
    const mode = this.#mode();
    if (mode === 'none' || this.required) return;
    const empty = normalizeCalendarValue(mode, undefined, this.#order);
    if (sameCalendarValue(mode, this.value, empty, this.#order)) return;
    this.#selection.set(empty, 'outside-press', event);
  };

  /** The levels with values (1 and up), each a toggle of the legend filter. */
  #valueLevels(): number[] {
    return Array.from({ length: this.#ensureModel().levels - 1 }, (_, index) => index + 1);
  }

  /**
   * A legend toggle shows (pressed) or hides (unpressed) its level; showing every level is no
   * filter at all.
   */
  readonly #legendChange = (event: TpValueChangeEvent<readonly string[]>): void => {
    const shown = normalizeLevels(event.detail.value.map(Number)).filter((level) => level > 0);
    const all = shown.length === this.#valueLevels().length;
    this.#levelFilter.set(all ? null : shown, event.detail.reason, event);
  };

  readonly #click = (event: MouseEvent): void => {
    const cell = this.#cellFromEvent(event);
    if (cell) this.#activate(cell, 'selection', event);
  };

  #activate(cell: HeatmapCellModel, reason: ChangeReason, sourceEvent: Event): void {
    if (this.interaction === 'none') return;
    this.#rove(cell.id);
    const detail: HeatmapActivateDetail = { cell: this.#cellState(cell), sourceEvent };
    this.emit('tp-cell-activate', detail);
    const mode = this.#mode();
    if (mode === 'none' || this.#disabled(cell)) return;
    const proposal = calendarSelectionProposal({
      mode,
      current: this.value,
      date: cell.id,
      adapter: this.#order,
      required: this.required,
      minimumSelectionCount: this.minimumSelectionCount,
      maximumSelectionCount: this.maximumSelectionCount,
      minimumNights: 0,
      maximumNights: Number.POSITIVE_INFINITY,
      rangeExclusion: this.rangeExclusion,
      isExcluded: (id) => {
        const target = this.#ensureModel().byId.get(id);
        return !target || this.#disabled(target);
      },
    });
    if (proposal.accepted) this.#selection.set(proposal.value, reason, sourceEvent);
  }

  readonly #keyDown = (event: KeyboardEvent): void => {
    const cell = this.#cellFromEvent(event);
    if (!cell) return;
    // Keyboard movement scrolls the focused cell into view: the user's own scroll.
    this.#userScroll = true;
    const model = this.#ensureModel();
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.#activate(cell, 'keyboard', event);
      return;
    }
    if (event.key === 'Escape') {
      if (this.#inspected) {
        event.preventDefault();
        this.#inspect(null, 'keyboard');
      }
      return;
    }
    const move = gridKeyMove(event, this.direction === 'rtl');
    if (!move) return;
    const visible = this.#visibleGrid(model);
    const column = cell.column - this.#trim;
    let target: HeatmapCellModel | undefined;
    if (move.kind === 'step') {
      const next = stepGridCell(visible, column, cell.row, move.columns, move.rows);
      target = next ? model.at(next.column + this.#trim, next.row) : undefined;
      // A split tick ends its group short: a row step past its end continues with the next key,
      // the start of the next group's first tick (Saturday Jan 31 down to Sunday Feb 1).
      if (!target && move.columns === 0 && this.groups === 'separated') {
        const neighbor = model.cells[this.#sequence(cell.id) + Math.sign(move.rows)];
        if (
          neighbor &&
          neighbor.column >= this.#trim &&
          neighbor.row === cell.row + Math.sign(move.rows)
        )
          target = neighbor;
      }
    } else if (move.kind === 'line') {
      const next = rowEdgeCell(visible, move.edge, cell.row);
      target = next ? model.at(next.column + this.#trim, next.row) : undefined;
    } else if (move.kind === 'grid') {
      const cells = model.cells.filter((candidate) => candidate.column >= this.#trim);
      target = move.edge === 'start' ? cells[0] : cells.at(-1);
    } else {
      target = this.#pageTarget(cell, move.direction, move.large);
    }
    event.preventDefault();
    if (!target) return;
    this.#rove(target.id);
    const element = this.#cellElement(target.id);
    element?.focus();
    element?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  };

  /** Moves the grid's one tab stop to a cell, without rendering the cells again. */
  #rove(id: string): void {
    if (id === this.#focusedId) return;
    const previous = this.renderRoot.querySelector<HTMLElement>('.cell[tabindex="0"]');
    const next = this.#cellElement(id);
    this.#focusedId = id;
    if (!next || this.interaction === 'none') return;
    previous?.setAttribute('tabindex', '-1');
    next.setAttribute('tabindex', '0');
  }

  /** The visible cells as a sparse grid, the trimmed columns left out. */
  #visibleGrid(model: HeatmapModel): GridCells {
    return {
      columns: model.columns.length - this.#trim,
      rows: model.rows.length,
      present: (column, row) => model.at(column + this.#trim, row) !== undefined,
    };
  }

  /** A month (a year with Shift) away for date cells, otherwise a page of columns. */
  #pageTarget(
    cell: HeatmapCellModel,
    direction: -1 | 1,
    large: boolean,
  ): HeatmapCellModel | undefined {
    const model = this.#ensureModel();
    const index = this.#sequence(cell.id);
    if (cell.date) {
      const date = large
        ? this.calendarAdapter.addYears(cell.date, direction)
        : this.calendarAdapter.addMonths(cell.date, direction);
      const exact = model.byId.get(date);
      if (exact && exact.column >= this.#trim) return exact;
      // Past either end of the range, the first or last cell.
      return direction < 0
        ? model.cells.find((candidate) => candidate.column >= this.#trim)
        : model.cells.at(-1);
    }
    const page = Math.max(1, Math.round(model.columns.length / 4)) * (large ? 4 : 1);
    const next = model.at(
      Math.min(model.columns.length - 1, Math.max(this.#trim, cell.column + direction * page)),
      cell.row,
    );
    return next ?? model.cells[Math.min(model.cells.length - 1, Math.max(0, index + direction))];
  }

  // Rendering ----------------------------------------------------------------------------------

  /** The ramp's family; an unknown name reports a diagnostic and falls back to `primary`. */
  #family(): HeatmapColor {
    if ((COLOR_FAMILIES as readonly string[]).includes(this.color)) return this.color;
    this.diagnose('color', `"${String(this.color)}" is not a heatmap color role.`, {
      once: true,
      defer: true,
    });
    return 'primary';
  }

  /** The explicit ramp, resolved to library colors; undefined when `colors` names any other. */
  #explicitRamp(): string[] | undefined {
    if (!this.colors?.length) return undefined;
    const ramp = this.colors.map(libraryColor);
    if (ramp.every((color): color is string => color !== undefined)) return ramp;
    this.diagnose('colors', '`colors` takes library color names only.', {
      once: true,
      defer: true,
    });
    return undefined;
  }

  #colorStyle(): string {
    const { strong, subtle } = familyColors(this.#family());
    return `--_color: var(--tp-heatmap-color, ${strong}); --_color-subtle: var(--tp-heatmap-subtle-color, ${subtle})`;
  }

  /**
   * The color of a level: an explicit ramp entry, or level 0's empty color and then the family's
   * subtle color rising to its strong color.
   */
  #levelColor(level: number, levels: number): string {
    const ramp = this.#explicitRamp();
    if (ramp) return ramp[Math.min(level, ramp.length - 1)]!;
    if (level <= 0) return 'var(--tp-heatmap-empty-color, var(--_empty))';
    const share = Math.round(15 + (85 * (level - 1)) / Math.max(1, levels - 2));
    return `color-mix(in oklab, var(--_color) ${Math.min(100, share)}%, var(--_color-subtle))`;
  }

  #labelMode(axis: 'columns' | 'rows'): HeatmapLabels {
    const mode = axis === 'columns' ? this.columnLabels : this.rowLabels;
    if (mode !== 'auto') return mode;
    const projection = axis === 'columns' ? this.columns : this.rows;
    const model = this.#ensureModel();
    const ticks = axis === 'columns' ? model.columns : model.rows;
    if (typeof projection === 'number' || ticks.length === 0) return 'none';
    if (ticks.some((tick) => tick.group)) return 'auto';
    // The weekday rows of the default arrangement read Mon, Wed and Fri.
    const effective =
      projection ??
      (axis === 'rows' && this.unit === 'day' && this.columns === undefined
        ? 'weekday'
        : undefined);
    if (axis === 'rows' && effective === 'weekday' && this.size !== 'lg') return 'alternate';
    return ticks[0]!.label('short') ? 'all' : 'none';
  }

  /**
   * The grid tracks of an axis's ticks: one per tick and, with separated groups, a spacer where a
   * group starts. `track` maps a tick's index to its grid line.
   */
  #axisLayout(ticks: readonly HeatmapTickModel[], placeholder: string): AxisLayout {
    const starts = this.groups === 'separated' ? groupStarts(ticks) : [];
    const count = Math.max(1, ticks.length);
    if (!starts.length)
      return {
        starts,
        tracks: `repeat(${count}, var(${placeholder}))`,
        track: (index) => index + 1,
      };
    const runs = [0, ...starts, ticks.length].slice(1).map((end, index, ends) => {
      const start = index === 0 ? 0 : ends[index - 1]!;
      return `repeat(${end - start}, var(${placeholder}))`;
    });
    return {
      starts,
      tracks: runs.join(' var(--_group-space) '),
      track: (index) => index + 1 + starts.filter((start) => start <= index).length,
    };
  }

  #columnLayout: AxisLayout = { starts: [], tracks: '', track: (index) => index + 1 };
  #rowLayout: AxisLayout = { starts: [], tracks: '', track: (index) => index + 1 };

  #renderColumnLabels(model: HeatmapModel): TemplateResult | typeof nothing {
    const mode = this.#labelMode('columns');
    if (mode === 'none') return nothing;
    const ticks = model.columns.slice(this.#trim);
    const custom = this.formatters.columnLabel;
    let labels: TemplateResult[];
    if (mode === 'auto' && ticks.some((tick) => tick.group)) {
      // Change points: a label where the coarser group (a week's month) changes, spanning to the
      // next change point; a span narrower than its text hides it.
      const starts = ticks.filter(
        (tick, index) => index === 0 || tick.group?.id !== ticks[index - 1]!.group?.id,
      );
      const { track } = this.#columnLayout;
      labels = starts.map((tick, index) => {
        const column = tick.index - this.#trim;
        const next = starts[index + 1];
        const last = (next ? next.index - this.#trim : ticks.length) - 1;
        const text = custom?.({ id: tick.id, label: tick.group!.label }) ?? tick.group!.label;
        return html`<span
          class="column-label"
          part="heatmap-column-label"
          data-span
          style="grid-column: ${track(column)} / ${track(last) + 1}"
          ><span>${text}</span></span
        >`;
      });
    } else {
      labels = ticks.map((tick, index) => {
        if (mode === 'alternate' && index % 2) return html``;
        const short = custom?.({ id: tick.id, label: tick.label('short') }) ?? tick.label('short');
        const narrow = custom ? short : tick.label('narrow');
        return html`<span
          class="column-label"
          part="heatmap-column-label"
          data-fit
          style="grid-column: ${this.#columnLayout.track(index)}"
          ><span class="label-short">${short}</span
          ><span class="label-narrow">${narrow}</span></span
        >`;
      });
    }
    const content = html`${labels}`;
    return html`<div
      class="column-labels"
      part="heatmap-column-labels"
      aria-hidden="true"
      ?data-narrow=${this.#columnFit.narrow}
    >
      ${this.#scrolling ? html`<div class="track">${content}</div>` : content}
    </div>`;
  }

  #renderRowLabel(model: HeatmapModel, row: number, mode: HeatmapLabels): TemplateResult {
    const tick = model.rows[row]!;
    const changePoint =
      mode === 'auto' && tick.group && tick.group.id !== model.rows[row - 1]?.group?.id;
    const shown = mode === 'all' || (mode === 'alternate' && row % 2 === 1) || changePoint;
    const short = changePoint ? tick.group!.label : tick.label('short');
    const text = shown ? (this.formatters.rowLabel?.({ id: tick.id, label: short }) ?? short) : '';
    return html`<span
      class="row-label"
      part="heatmap-row-label"
      style="grid-row: ${this.#rowLayout.track(row)}"
      >${text}</span
    >`;
  }

  #renderCell(cell: HeatmapCellModel, selection: SelectedCells, focusable: string): TemplateResult {
    const model = this.#ensureModel();
    const state = this.#cellState(cell, selection.ids);
    const hints = state.hints.filter((hint): hint is string => typeof hint === 'string');
    const selectable = this.#mode() !== 'none';
    const inRange = selection.from !== undefined && state.selected;
    return html`<span
      class="cell"
      part="heatmap-cell"
      role="gridcell"
      data-id=${cell.id}
      data-level=${this.loading ? 0 : cell.level}
      ?data-empty=${cell.value === null}
      ?data-today=${state.today}
      ?data-filtered=${this.levelFilter !== null && !this.levelFilter.includes(cell.level)}
      ?data-selected=${state.selected}
      ?data-disabled=${state.disabled}
      ?data-range-start=${inRange && cell.id === selection.from}
      ?data-range-end=${inRange && cell.id === (selection.to ?? selection.from)}
      ?data-range-middle=${inRange && cell.id !== selection.from && cell.id !== (selection.to ?? selection.from)}
      data-modifiers=${state.modifiers.join(' ') || nothing}
      style="grid-column: ${this.#columnLayout.track(cell.column - this.#trim)}; --tp-heatmap-level-color: ${this.#levelColor(this.loading ? 0 : cell.level, model.levels)}"
      tabindex=${this.interaction === 'none' ? nothing : cell.id === focusable ? '0' : '-1'}
      aria-label=${this.loading ? nothing : [this.#cellName(state), ...hints].join('. ')}
      aria-selected=${selectable ? String(state.selected) : nothing}
      aria-disabled=${selectable && state.disabled ? 'true' : nothing}
    ></span>`;
  }

  /** The cell the tooltip shows: the inspected one, or the last one while the tooltip closes. */
  #tooltipId = '';

  #renderTooltipContent(): unknown {
    const id = this.#tooltipId;
    const cell = id === undefined ? undefined : this.#ensureModel().byId.get(id);
    if (!cell) return nothing;
    const state = this.#cellState(cell);
    if (this.renderTooltip) return this.renderTooltip(state);
    const messages = resolveHeatmapMessages(this.messages);
    const hints = state.hints.slice(0, Math.max(0, this.maxHints));
    const more = state.hints.length - hints.length;
    return html`<div class="tooltip-name">${this.#cellName(state)}</div>
      ${hints.map((hint) => html`<div class="tooltip-hint">${hint}</div>`)}
      ${more > 0 ? html`<div class="tooltip-hint">${messages.moreHints(more)}</div>` : nothing}`;
  }

  #renderLegend(model: HeatmapModel): TemplateResult | typeof nothing {
    if (!this.legend) return nothing;
    const messages = resolveHeatmapMessages(this.messages);
    const levels = Array.from({ length: model.levels }, (_, level) => level);
    // Levels the filter hides are crossed out.
    const filter = this.legendFilter ? this.levelFilter : null;
    const swatch = (level: number) =>
      html`<span
        class="legend-cell"
        part="heatmap-legend-cell"
        ?data-excluded=${level > 0 && filter !== null && !filter.includes(level)}
        data-level=${level}
        style="--tp-heatmap-level-color: ${this.#levelColor(level, model.levels)}"
      ></span>`;
    // Whole-number data reads in whole-number bounds: a level holds the integers in its range.
    const integral = model.cells.every(
      (cell) => cell.value === null || Number.isInteger(cell.value),
    );
    const title = (level: number) => {
      const range = level === 0 ? undefined : model.scale.ranges[level - 1];
      if (!range) return messages.levelRange(0, '', '');
      const to = integral ? Math.floor(range[1]) : range[1];
      const from = integral ? Math.min(to, Math.floor(range[0]) + 1) : range[0];
      return messages.levelRange(level, this.#formatValue(from), this.#formatValue(to));
    };
    if (this.legendFilter)
      // Each level with values is a Toggle of the library's Toggle group; the pressed ones filter
      // the grid. Level 0 (no value) already paints as empty, which is what a filtered cell
      // shows, so it stays a plain swatch with nothing to toggle.
      return html`<div class="legend" part="heatmap-legend">
        <span class="legend-text" aria-hidden="true">${messages.less}</span>
        <span title=${title(0)} aria-hidden="true">${swatch(0)}</span>
        <tp-toggle-group
          class="legend-filter"
          multiple
          size="icon-xs"
          spacing="0"
          .label=${messages.filter}
          .value=${(this.levelFilter ?? this.#valueLevels()).map(String)}
          @tp-value-change=${this.#legendChange}
        >
          ${levels
            .slice(1)
            .map(
              (level) =>
                html`<tp-toggle value=${level} aria-label=${title(level)}
                  >${swatch(level)}</tp-toggle
                >`,
            )}
        </tp-toggle-group>
        <span class="legend-text" aria-hidden="true">${messages.more}</span>
      </div>`;
    return html`<div class="legend" part="heatmap-legend" aria-hidden="true">
      <span class="legend-text">${messages.less}</span>
      ${levels.map((level) => html`<span title=${title(level)}>${swatch(level)}</span>`)}
      <span class="legend-text">${messages.more}</span>
    </div>`;
  }

  override render(): unknown {
    const model = this.#ensureModel();
    this.#columnLayout = this.#axisLayout(model.columns.slice(this.#trim), '--_column-track');
    this.#rowLayout = this.#axisLayout(model.rows, '--_row-track');
    // Computed only when the cells render (see the guard below), once per render.
    let selectionCache: SelectedCells | undefined;
    const selection = () => (selectionCache ??= this.#selectedIds());
    const visibleCells = () => model.cells.filter((cell) => cell.column >= this.#trim);
    // The tab stop: the focused cell, then a selected one, then today, then the latest cell.
    const visible = (id: string) => (model.byId.get(id)?.column ?? -1) >= this.#trim;
    let focusableCache: string | undefined;
    const focusable = () =>
      (focusableCache ??=
        [this.#focusedId, ...selection().ids, this.today].find((id) => id && visible(id)) ??
        visibleCells().at(-1)?.id ??
        '');
    const rowMode = this.#labelMode('rows');
    const rowLabels =
      rowMode === 'none'
        ? nothing
        : html`<div class="row-labels" part="heatmap-row-labels" aria-hidden="true">
            ${
              this.#scrolling
                ? html`<div class="track">
                    ${model.rows.map((_, row) => this.#renderRowLabel(model, row, rowMode))}
                  </div>`
                : model.rows.map((_, row) => this.#renderRowLabel(model, row, rowMode))
            }
          </div>`;
    const rowsOfCells = () => {
      const rows: HeatmapCellModel[][] = model.rows.map(() => []);
      for (const cell of visibleCells()) rows[cell.row]!.push(cell);
      return rows;
    };
    // The grid holds the rows; each row names itself with a hidden row header, while the visible
    // labels are a separate strip that scrolls with the cells.
    const multiselectable = this.#mode() === 'multiple' || this.#mode() === 'range';
    const cells = html`<div
      class="cells"
      part="heatmap-grid"
      role="grid"
      aria-label=${this.label}
      aria-busy=${this.loading ? 'true' : nothing}
      aria-multiselectable=${multiselectable ? 'true' : nothing}
      @pointerover=${this.#pointerOver}
      @pointerleave=${this.#pointerLeave}
      @focusin=${this.#focusIn}
      @focusout=${this.#focusOut}
      @click=${this.#click}
      @keydown=${this.#keyDown}
    >
      ${guard(
        [
          model,
          this.value,
          this.selectionMode,
          this.levelFilter,
          this.loading,
          this.#trim,
          this.interaction,
          this.messages,
          this.formatters,
          this.dayModifiers,
          this.disabledCells,
          this.colors,
          this.color,
          this.#locale(),
        ],
        () => {
          // Hovering and keyboard moves never come here: they update one marker and the tooltip.
          this.#cellsRendered = true;
          return rowsOfCells().map(
            (row, index) =>
              html`<div class="row" role="row" style="--_row: ${this.#rowLayout.track(index)}">
                ${
                  model.rows[index]!.label('long')
                    ? html`<span class="visually-hidden" role="rowheader"
                        >${model.rows[index]!.label('long')}</span
                      >`
                    : nothing
                }
                ${row.map((cell) => this.#renderCell(cell, selection(), focusable()))}
              </div>`,
          );
        },
      )}
    </div>`;
    const anchor = this.#tooltipId ? this.#cellElement(this.#tooltipId) : null;
    const footerFilled = this.legend || this.#footerFilled;
    return this.renderPart('heatmap', Object.freeze({ size: this.size, shape: this.shape }), {
      tag: 'div',
      properties: {
        part: 'heatmap',
        class: 'root',
        'data-size': this.size,
        'data-shape': this.shape,
        'data-scroll': this.#scrolling,
        style: this.#colorStyle(),
      },
      content: html`<div
          class="plot"
          style="--_column-tracks: ${this.#columnLayout.tracks}; --_row-tracks: ${this.#rowLayout.tracks}"
          ?data-error=${Boolean(model.error)}
          ?data-no-column-labels=${this.#labelMode('columns') === 'none'}
          ?data-no-row-labels=${rowMode === 'none'}
        >
          <span class="corner" aria-hidden="true"></span>
          ${this.#renderColumnLabels(model)} ${rowLabels}
          ${
            this.#scrolling
              ? html`<tp-scroll-area class="scroller" axis="both" scroll-edge-fade
                  >${cells}</tp-scroll-area
                >`
              : cells
          }
        </div>
        <span class="probe" aria-hidden="true"></span>
        <span class="probe" data-group aria-hidden="true"></span>
        <div class="footer" part="heatmap-footer" ?hidden=${!footerFilled}>
          <slot name="footer" @slotchange=${this.#footerChange}></slot>
          ${this.#renderLegend(model)}
        </div>
        ${
          this.tooltip && this.interaction !== 'none'
            ? html`<tp-tooltip
                part="heatmap-tooltip"
                describes="none"
                .open=${Boolean(this.#inspected && anchor)}
                .anchor=${anchor ?? undefined}
                .showArrow=${false}
              >
                ${this.#renderTooltipContent()}
              </tp-tooltip>`
            : nothing
        }`,
    });
  }

  #footerFilled = false;
  readonly #footerChange = (event: Event): void => {
    const filled = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).length > 0;
    if (filled === this.#footerFilled) return;
    this.#footerFilled = filled;
    this.requestUpdate();
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-heatmap': TpHeatmap;
  }
}
