import { bindPart } from '../../foundation/part.js';
import { html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { createId } from '../../foundation/id.js';
import { resolveLocale } from '../../foundation/services.js';
import { TpElement } from '../../foundation/element.js';
import { TpFormElement } from '../../foundation/form-element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import {
  prepareMotion,
  resolveMotionTiming,
  stateRole,
  type MotionHandle,
} from '../../foundation/motion.js';
import {
  calendarGridDates,
  calendarMonthLabel,
  calendarSelectionProposal,
  calendarValueDates,
  gregorianCalendarAdapter,
  isCalendarRange,
  localeWeekInfo,
  matchesCalendarDate,
  normalizeCalendarValue,
  resolveWeekStart,
  sameCalendarValue,
  startOfWeek,
  todayCalendarDate,
} from '../../foundation/calendar.js';
import type {
  CalendarAdapter,
  CalendarSelectionMode,
  CalendarValue,
} from '../../foundation/calendar.js';
import type { ChangeReason } from '../../foundation/types.js';

import { calendarStyles } from './styles.js';
import {
  calendarBuiltInDayMarkers,
  calendarCanDisplay,
  calendarDayMarkers,
  calendarNearestYearMonth,
  calendarStripAnchorInMonth,
  calendarStripClamp,
  calendarStripDates,
  calendarStripReveal,
  calendarStripStart,
  calendarYearMonths,
  calendarYearNavigable,
  containsInteractiveContent,
  partitionCalendarModifiers,
} from './policy.js';
import type {
  CalendarDateMatcher,
  CalendarDayState,
  CalendarFormatters,
  CalendarCaptionLayout,
  CalendarMessages,
  CalendarValidityCode,
  CalendarVariant,
  CalendarDayMarker,
  CalendarDayMarkers,
  CalendarTodayIndicator,
} from './types.js';

import { compositeControl } from '../../foundation/composite-control.js';
import { LabelFit } from '../../foundation/label-fit.js';
import { gridKeyMove } from '../../foundation/grid-navigation.js';
import { navigationKeyPreempted } from '../../foundation/collection.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import type { PartRenderOptions, PartState } from '../../foundation/part.js';
import { calendarPresentation } from '../../presentation/families/calendar.js';
import { TpButton } from '../button/button.js';
import { TpNativeSelect } from '../native-select/native-select.js';
import { TpStatusDot } from '../status-dot/status-dot.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
const calendarValueConverter = {
  fromAttribute(value: string | null): CalendarValue {
    if (value === null || !value.trim()) return undefined;
    if (value.includes('/')) {
      const [from, to] = value.split('/', 2);
      return from ? { from, ...(to ? { to } : {}) } : undefined;
    }
    const dates = value.split(/[\s,]+/u).filter(Boolean);
    return dates.length > 1 ? dates : dates[0];
  },
  toAttribute(value: CalendarValue): string | null {
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.join(' ');
    if (value) return `${value.from}${value.to ? `/${value.to}` : ''}`;
    return null;
  },
};

function cloneCalendarValue(value: CalendarValue): CalendarValue {
  if (Array.isArray(value)) return [...value];
  if (isCalendarRange(value)) return { ...value };
  return value;
}

/**
 * Calendar motion roles. `strip` slides the strip's days to their new place when they move; a
 * `tp-motion-request` listener can claim it, and reduced motion settles it at once.
 */
export const calendarMotionRoles = {
  strip: stateRole('strip'),
};

/** Developer diagnostics for rejected programmatic selections; not localized. */
/** Calendars whose `value` was written since their last update; see `#revealSelection`. */
const valueWritten = new WeakSet<TpCalendar>();

const selectionDiagnostics: Record<Exclude<CalendarValidityCode, 'value-missing'>, string> = {
  'excluded-date': 'Calendar selection contains an excluded date.',
  'selection-count': 'Calendar selection violates its count limits.',
  'range-excluded-date': 'Calendar range contains an excluded date.',
  'range-nights': 'Calendar range violates its night limits.',
};

/** English validity messages; `messages.validity` replaces them. */
const defaultValidityMessages: Record<CalendarValidityCode, string> = {
  'value-missing': 'Select a date.',
  ...selectionDiagnostics,
};

/**
 * Month grids that select one date, several dates or a date range, as date-only ISO strings that
 * never shift with time zones; the `strip` variant shows a few consecutive days under the month
 * caption instead. Days and navigation are Buttons; caption dropdowns are Native Selects.
 *
 * @slot footer - Content under the months, such as a summary of the selection; an empty footer
 * takes no space.
 * @fires tp-value-change - Cancelable proposal of a new selection, before it commits;
 * `detail.value`, `detail.previousValue` and `detail.reason`.
 * @fires tp-displayed-month-change - Cancelable proposal to show another month, from the
 * navigation, the caption dropdowns or the keyboard; `detail.value` and `detail.previousValue`.
 * @cssprop --tp-calendar-cell-size - Size of every day, weekday and navigation cell; raise it for
 * richer day content.
 */
export class TpCalendar extends TpFormElement<CalendarValue> {
  static tagName = 'tp-calendar';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton, TpNativeSelect, TpStatusDot];
  }
  static override presentation = calendarPresentation;
  static override properties = {
    ...TpFormElement.properties,
    value: { converter: calendarValueConverter },
    variant: { type: String, reflect: true },
    visibleDays: { type: Number, attribute: 'visible-days' },
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true },
    min: { type: String },
    max: { type: String },
    defaultValue: { converter: calendarValueConverter, attribute: 'default-value' },
    visibleMonths: { type: Number, attribute: 'visible-months' },
    displayedMonth: { type: String, attribute: 'displayed-month' },
    defaultDisplayedMonth: { type: String, attribute: 'default-displayed-month' },
    navigationStart: { type: String, attribute: 'navigation-start' },
    navigationEnd: { type: String, attribute: 'navigation-end' },
    minimumSelectionCount: { type: Number, attribute: 'minimum-selection-count' },
    maximumSelectionCount: { type: Number, attribute: 'maximum-selection-count' },
    minimumNights: { type: Number, attribute: 'minimum-nights' },
    maximumNights: { type: Number, attribute: 'maximum-nights' },
    rangeExclusion: { type: String, attribute: 'range-exclusion', reflect: true },
    pagedNavigation: { type: Boolean, attribute: 'paged-navigation' },
    disabledNavigation: { type: String, attribute: 'disabled-navigation', reflect: true },
    showOutsideDays: { type: Boolean, attribute: 'show-outside-days' },
    locale: { type: String },
    weekStartsOn: { type: Number, attribute: 'week-starts-on' },
    today: { type: String },
    label: { type: String },
    unavailableDates: { attribute: false },
    crossedOutDates: { attribute: false },
    dayMarkers: { attribute: false },
    todayIndicator: { type: String, attribute: 'today-indicator' },
    disabledDates: { attribute: false },
    hiddenDates: { attribute: false },
    calendarAdapter: { attribute: false },
    captionLayout: { type: String, attribute: 'caption-layout' },
    fixedWeeks: { type: Boolean, attribute: 'fixed-weeks' },
    showWeekNumber: { type: Boolean, attribute: 'show-week-number' },
    buttonVariant: { type: String, attribute: 'button-variant' },
    renderDay: { attribute: false },
    formatters: { attribute: false },
    messages: { attribute: false },
    dayModifiers: { attribute: false },
  };
  static override styles = [TpElement.styles, calendarStyles];
  override get value(): CalendarValue {
    const value = super.value;
    return value === ('' as unknown as CalendarValue) ? undefined : value;
  }
  override set value(value: CalendarValue) {
    super.value = value;
    // Writing the selection brings it into view, even when it rewrites the committed value.
    valueWritten.add(this);
    this.requestUpdate();
  }
  /**
   * Month grids, or a strip of consecutive days under the month caption. In single selection the
   * strip keeps the selected day in its middle and its arrows select the previous or next day;
   * otherwise its arrows move the days a day at a time.
   */
  variant: CalendarVariant = 'grid';
  /** How many consecutive days the strip shows, centered on the day whose month the caption names. */
  visibleDays = 5;
  /**
   * The month caption as text, or as dropdowns for the month and year, the month only or the year
   * only.
   */
  captionLayout: CalendarCaptionLayout = 'label';
  /** Always shows six weeks, so the height does not change between months; grids only. */
  fixedWeeks = false;
  /** Adds a column of week numbers, following the locale's week rules; grids only. */
  showWeekNumber = false;
  /** Button variant of the previous and next month and strip controls. */
  buttonVariant: TpButton['variant'] = 'ghost';
  /**
   * Renders passive content inside each day button from its state; return `undefined` for the plain
   * day number.
   */
  renderDay: ((state: CalendarDayState) => unknown) | undefined;
  /**
   * Display functions for the caption, dropdown entries, weekdays, day numbers and week numbers.
   */
  formatters: CalendarFormatters = {};
  /** Control names and validity messages, replacing the English texts. */
  messages: CalendarMessages = {};
  /**
   * Named sets or tests of dates, each marking its days with a `data-` attribute and a flag in the
   * day state.
   */
  dayModifiers: Record<string, CalendarDateMatcher> = {};
  #hasFooter = false;
  #childGeneration = 0;
  #registered = new Map<HTMLElement, { release: () => void; member: TpButton | TpNativeSelect }>();
  /**
   * Whether a click selects a single date, toggles one of several dates, or starts and completes a
   * range.
   */
  selectionMode: CalendarSelectionMode = 'single';
  /** Earliest selectable date; earlier days are shown but disabled. */
  min = '';
  /** Latest selectable date; later days are shown but disabled. */
  max = '';
  /**
   * The initial selection of an uncontrolled calendar, restored on form reset. As an attribute,
   * several dates are separated by spaces and a range is written `from/to`.
   */
  defaultValue: CalendarValue = undefined;
  /** How many consecutive months are shown side by side; grids only. */
  visibleMonths = 1;
  /**
   * The first month shown, as any date in it; accept navigation proposals in
   * `onDisplayedMonthChange`.
   */
  displayedMonth: string | undefined = undefined;
  /** The first month shown initially, when it should not follow the selection or today. */
  defaultDisplayedMonth = '';
  /** Earliest month navigation reaches, independent of the selectable dates. */
  navigationStart = '';
  /** Latest month navigation reaches, independent of the selectable dates. */
  navigationEnd = '';
  /** In multiple selection, the fewest dates the selection can shrink to. */
  minimumSelectionCount = 0;
  /** In multiple selection, the most dates that can be selected. */
  maximumSelectionCount = Number.POSITIVE_INFINITY;
  /** In range selection, the shortest range in nights. */
  minimumNights = 0;
  /** In range selection, the longest range in nights. */
  maximumNights = Number.POSITIVE_INFINITY;
  /**
   * What completing a range across an excluded date does: reject the click, or restart the range
   * there.
   */
  rangeExclusion: 'reject' | 'restart' = 'reject';
  /**
   * Moves the previous and next controls by all visible months instead of one; in the strip, moves
   * its day controls by all visible days.
   */
  pagedNavigation = false;
  /** Whether a previous or next control that cannot move is disabled or removed. */
  disabledNavigation: 'disable' | 'hide' = 'disable';
  /** Shows the days of adjacent months that fill the first and last weeks; grids only. */
  showOutsideDays = true;
  /**
   * Locale of captions, weekdays, day numbers and accessible dates, when it differs from the
   * page's.
   */
  locale = '';
  /** First day of the week, from 0 for Sunday to 6; negative follows the locale. */
  weekStartsOn = -1;
  /** The date marked as today. */
  today = todayCalendarDate();
  /** Accessible name of the calendar. */
  label = 'Date';
  /**
   * Dates that cannot be chosen because they are taken, such as booked nights; crossed out and
   * dimmed, apart from disabled dates, which are only dimmed.
   */
  unavailableDates: CalendarDateMatcher;
  /** Dates that are shown dimmed and cannot be focused or selected. */
  disabledDates: CalendarDateMatcher;
  /** Dates crossed out that can still be selected; disabled ones are crossed out and dimmed. */
  crossedOutDates: CalendarDateMatcher;
  /**
   * Small colored dots under each date's number, at most three; their labels are read after the
   * date.
   */
  dayMarkers: CalendarDayMarkers;
  /** How today is marked: the muted fill, an underlined number, a dot under it, or nothing. */
  todayIndicator: CalendarTodayIndicator = 'fill';
  /** Dates left as empty cells, keeping the grid's shape. */
  hiddenDates: CalendarDateMatcher;
  /** Date arithmetic and formatting, to show a calendar system other than the Gregorian one. */
  calendarAdapter: CalendarAdapter = gregorianCalendarAdapter;
  /**
   * Called with each proposed selection before `tp-value-change`; a controlled owner accepts it by
   * setting `value`.
   */
  onValueChange: ((event: TpValueChangeEvent<CalendarValue>) => void) | undefined;
  /**
   * Called with each proposed month before `tp-displayed-month-change`; a controlled owner accepts
   * it by setting `displayedMonth`.
   */
  onDisplayedMonthChange:
    | ((event: CustomEvent<{ value: string; previousValue: string; sourceEvent: Event }>) => void)
    | undefined;

  #initialized = false;
  #selectionControlled = false;
  #monthControlled = false;
  #selection: CalendarValue = undefined;
  #defaultSelection: CalendarValue = undefined;
  #displayed = '';
  /** The strip's middle day, always in the displayed month. */
  #stripAnchor = '';
  /** A middle day whose month a controlled owner has not accepted yet; used when it does. */
  #proposedStripAnchor = '';
  #focusedDate = '';
  #pendingFocusDate = '';
  #focusGeneration = 0;
  #lastDiagnostic = '';
  /** Last emitted message per nonblocking diagnostic code; cleared when the condition ends. */
  #warnings = new Map<string, string>();
  #modifierNames: string[] = [];
  #ignoredModifiers: string[] = [];
  readonly #calendarId = createId('tp-calendar');

  /** A copy of the committed selection. */
  get selection(): CalendarValue {
    return cloneCalendarValue(this.#selection);
  }

  /** The first month shown, as the ISO date of its first day. */
  get displayedMonthValue(): string {
    return this.#displayed;
  }

  /** Proposes a selection as if made on the grid, and returns whether it was committed. */
  setValue(value: CalendarValue, sourceEvent?: Event): boolean {
    return this.#requestSelection(
      value,
      'programmatic',
      sourceEvent ?? new Event('tp-programmatic-source'),
    );
  }

  protected override associationTarget(): HTMLElement | null {
    return this.#dayButtons().find((button) => button.tabIndex === 0) ?? null;
  }

  /** focus(), label activation and surface initial focus land on the roving day. */
  protected override focusTarget(): HTMLElement | null {
    return this.associationTarget();
  }

  #part(name: string, options: PartRenderOptions, state: PartState = {}): unknown {
    return this.renderPart(`calendar${name ? `-${name}` : ''}`, state, options);
  }

  protected override render() {
    const modifiers = partitionCalendarModifiers(Object.keys(this.dayModifiers ?? {}));
    this.#modifierNames = modifiers.accepted;
    this.#ignoredModifiers = modifiers.ignored;
    const months = this.#visibleMonthStarts();
    return this.#part('', {
      properties: {
        class: 'root',
        role: 'group',
        'aria-label': this.label,
        'data-disabled': this.effectiveDisabled,
        'data-readonly': this.readOnly,
        'data-required': this.required,
        'data-invalid': this.invalid,
        'data-markers': !!this.dayMarkers || this.todayIndicator === 'dot',
      },
      content: html`${
        this.#isStrip()
          ? this.#renderStrip()
          : this.#part('months', {
              properties: { class: 'months' },
              content: months.map((month, index) => this.#renderMonth(month, index)),
            })
      }
      ${this.#part('footer', {
        properties: { class: 'footer', hidden: !this.#hasFooter },
        content: html`<slot name="footer" @slotchange=${this.#footerChanged}></slot>`,
      })}`,
    });
  }

  #footerChanged = (event: Event): void => {
    const has = (event.target as HTMLSlotElement).assignedNodes({ flatten: true }).length > 0;
    if (has !== this.#hasFooter) {
      this.#hasFooter = has;
      this.requestUpdate();
    }
  };

  #renderNavigation(previous: boolean): unknown {
    const available = this.#canNavigate((previous ? -1 : 1) * this.#navigationStep());
    if (!available && this.disabledNavigation === 'hide') return nothing;
    const name = previous ? 'previous' : 'next';
    return html`<tp-button
      class=${`navigation ${name}`}
      data-calendar-part=${`calendar-${name}`}
      exportparts=${`button:calendar-${name}`}
      .variant=${this.buttonVariant}
      size="icon-sm"
      .icon=${chevronRightIcon}
      .ariaLabel=${this.#navigationLabel(name)}
      .disabled=${this.effectiveDisabled || !available}
      .partContracts=${{ button: this.partContracts[`calendar-${name}`] ?? {} }}
      @click=${previous ? this.#previousMonth : this.#nextMonth}
    ></tp-button>`;
  }

  /**
   * The month header over one row of consecutive days, with controls at both ends that move the row
   * a day, or a page of days, at a time.
   */
  #renderStrip(): unknown {
    const slide = this.#slideRange;
    const dates = slide
      ? Array.from({ length: slide.count }, (_, index) =>
          this.calendarAdapter.addDays(slide.start, index),
        )
      : calendarStripDates(this.calendarAdapter, this.#stripAnchor, this.visibleDays);
    const rovingDate = this.#rovingDate();
    return html`${this.#part('header', {
      properties: { class: 'header' },
      content: html`${this.#renderNavigation(true)} ${this.#renderCaption(this.#displayed, 0)}
      ${this.#renderNavigation(false)}`,
    })}
    ${this.#part('strip', {
      properties: { class: 'strip' },
      content: html`${this.#renderStripNavigation(true)}
      ${this.#part('days', {
        properties: {
          class: 'days',
          role: 'grid',
          'aria-labelledby': `${this.#calendarId}-month-0`,
          'aria-multiselectable': this.selectionMode !== 'single' ? 'true' : null,
          style: { '--_tp-calendar-visible-days': String(this.visibleDays) },
        },
        // Days are keyed by date, so a move keeps every shown day, and its focus, in place.
        content: html`<div
          class="strip-row"
          role="row"
          ?data-sliding=${!!slide}
          style=${slide ? `--_tp-calendar-strip-count:${slide.count};--_tp-calendar-strip-track:${slide.track}px` : nothing}
        >
          ${repeat(
            dates,
            (date) => date,
            (date) => this.#renderDay(date, this.calendarAdapter.startOfMonth(date), rovingDate),
          )}
        </div>`,
      })}
      ${this.#renderStripNavigation(false)}`,
    })}`;
  }

  #renderStripNavigation(previous: boolean): unknown {
    const name = previous ? 'strip-previous' : 'strip-next';
    let available: boolean;
    let label: string;
    if (this.#arrowsSelect()) {
      // Single selection: the controls select the previous or next selectable day.
      const date = this.#arrowDate(previous ? -1 : 1);
      available = date !== null;
      const message = previous ? this.messages.previousDay : this.messages.nextDay;
      label =
        typeof message === 'function'
          ? message(date ?? '')
          : (message ?? (previous ? 'Previous day' : 'Next day'));
    } else {
      const step = (previous ? -1 : 1) * this.#stripStep();
      const target = calendarStripClamp(
        this.calendarAdapter,
        this.calendarAdapter.addDays(this.#stripAnchor, step),
        this.visibleDays,
        this.navigationStart,
        this.navigationEnd,
      );
      available = this.calendarAdapter.compare(target, this.#stripAnchor) !== 0;
      const start = calendarStripStart(this.calendarAdapter, target, this.visibleDays);
      const message = previous ? this.messages.previousDays : this.messages.nextDays;
      label =
        typeof message === 'function'
          ? message(start)
          : (message ?? (previous ? 'Earlier days' : 'Later days'));
    }
    if (!available && this.disabledNavigation === 'hide') return nothing;
    return html`<tp-button
      class=${`navigation ${previous ? 'previous' : 'next'} strip-navigation`}
      data-calendar-part=${`calendar-${name}`}
      exportparts=${`button:calendar-${name}`}
      .variant=${this.buttonVariant}
      size="icon-sm"
      .icon=${chevronRightIcon}
      .ariaLabel=${label}
      .disabled=${this.effectiveDisabled || !available}
      .partContracts=${{ button: this.partContracts[`calendar-${name}`] ?? {} }}
      @click=${previous ? this.#previousDays : this.#nextDays}
    ></tp-button>`;
  }

  #renderCaption(month: string, monthIndex: number): unknown {
    const monthDropdown = ['dropdown', 'dropdown-months'].includes(this.captionLayout);
    const yearDropdown = ['dropdown', 'dropdown-years'].includes(this.captionLayout);
    const captionId = `${this.#calendarId}-month-${monthIndex}`;
    const caption =
      this.formatters.caption?.(month) ??
      this.calendarAdapter.format(month, this.#locale(), 'month');
    const pieces = this.calendarAdapter.parts(month);
    const monthLabel = (date: string) =>
      this.formatters.monthDropdown?.(date) ?? this.#monthLabel(date);
    const yearLabel = (date: string) =>
      this.formatters.yearDropdown?.(date) ??
      new Intl.NumberFormat(this.#locale(), { useGrouping: false }).format(
        this.calendarAdapter.parts(date).year,
      );
    return this.#part('caption', {
      properties: { class: 'caption', id: captionId },
      content:
        !monthDropdown && !yearDropdown
          ? this.#part('caption-label', {
              properties: { class: 'caption-label', 'aria-live': 'polite' },
              content: caption,
            })
          : this.#part('dropdowns', {
              properties: { class: 'dropdowns', role: 'group', 'aria-label': caption },
              content: html`
                ${
                  monthDropdown
                    ? html`<tp-native-select
                        class="dropdown"
                        data-calendar-part="calendar-month-dropdown"
                        exportparts="native-select-control:calendar-month-dropdown"
                        size="sm"
                        .label=${this.messages.monthDropdown ?? 'Month'}
                        .value=${month}
                        .disabled=${this.effectiveDisabled}
                        .partContracts=${{ 'native-select-control': this.partContracts['calendar-month-dropdown'] ?? {} }}
                        @tp-value-change=${(e: TpValueChangeEvent<string>) => this.#captionChange(e, monthIndex)}
                      >
                        ${calendarYearMonths(this.calendarAdapter, month).map((date) => html`<option value=${date} ?disabled=${!this.#canDisplay(this.calendarAdapter.addMonths(date, -monthIndex))}>${monthLabel(date)}</option>`)}
                      </tp-native-select>`
                    : this.#part('caption-label', { content: monthLabel(month) })
                }
                ${
                  yearDropdown
                    ? html`<tp-native-select
                        class="dropdown"
                        data-calendar-part="calendar-year-dropdown"
                        exportparts="native-select-control:calendar-year-dropdown"
                        size="sm"
                        .label=${this.messages.yearDropdown ?? 'Year'}
                        .value=${String(pieces.year)}
                        .disabled=${this.effectiveDisabled}
                        .partContracts=${{ 'native-select-control': this.partContracts['calendar-year-dropdown'] ?? {} }}
                        @tp-value-change=${(e: TpValueChangeEvent<string>) => this.#captionChange(e, monthIndex, month)}
                      >
                        ${this.#yearOptions(month).map((date) => html`<option value=${String(this.calendarAdapter.parts(date).year)} ?disabled=${!this.#yearSelectable(date, month, monthIndex)}>${yearLabel(date)}</option>`)}
                      </tp-native-select>`
                    : this.#part('caption-label', { content: yearLabel(month) })
                }
              `,
            }),
    });
  }

  #captionChange(event: TpValueChangeEvent<string>, index: number, yearMonth?: string): void {
    event.stopPropagation();
    let date = event.detail.value;
    if (yearMonth) {
      const sameMonth = this.calendarAdapter.addYears(
        yearMonth,
        Number(event.detail.value) - this.calendarAdapter.parts(yearMonth).year,
      );
      // A year change lands on the nearest displayable month of that year.
      date =
        calendarNearestYearMonth(this.calendarAdapter, sameMonth, index, (start) =>
          this.#canDisplay(start),
        ) ?? sameMonth;
    }
    this.#requestDisplayedMonth(
      this.calendarAdapter.addMonths(date, -index),
      event.detail.sourceEvent ?? event,
    );
    this.requestUpdate();
  }

  /**
   * A year choice is offered when at least one of its months can be displayed at
   * this caption's position within the navigation bounds. The displayed year stays
   * enabled so the current value remains representable.
   */
  #yearSelectable(date: string, displayed: string, monthIndex: number): boolean {
    if (!this.navigationStart && !this.navigationEnd) return true;
    if (this.calendarAdapter.parts(date).year === this.calendarAdapter.parts(displayed).year)
      return true;
    return calendarYearNavigable(this.calendarAdapter, date, monthIndex, (start) =>
      this.#canDisplay(start),
    );
  }

  #yearOptions(month: string): string[] {
    const current = this.calendarAdapter.parts(month).year;
    const today = this.calendarAdapter.normalize(this.today) ?? month;
    const year = this.calendarAdapter.parts(today).year;
    const start = this.navigationStart
      ? this.calendarAdapter.parts(this.navigationStart).year
      : Math.min(year - 100, current);
    const end = this.navigationEnd
      ? this.calendarAdapter.parts(this.navigationEnd).year
      : Math.max(year, current);
    return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) =>
      this.calendarAdapter.addYears(month, start + index - current),
    );
  }

  #locale(): string | undefined {
    return this.locale || resolveLocale(this);
  }
  #monthLabel(date: string): string {
    return calendarMonthLabel(this.calendarAdapter, date, this.#locale(), 'short');
  }

  /**
   * A weekday column header. Without a weekday formatter it holds the short label and the narrow
   * one: the short label shows while every short label fits its cell, and stays laid out (hidden)
   * otherwise so its width keeps being measured; the header is named by the short label.
   */
  #renderWeekday(day: number): unknown {
    const custom = this.formatters.weekday?.(day);
    if (custom !== undefined)
      return this.#part('weekday', {
        tag: 'span',
        properties: { class: 'weekday', role: 'columnheader' },
        content: custom,
      });
    const locale = this.#locale();
    const short = this.calendarAdapter.weekdayLabel(day, locale);
    return this.#part('weekday', {
      tag: 'span',
      properties: { class: 'weekday', role: 'columnheader', 'aria-label': short },
      // The hidden form leaves the accessibility tree with its visibility; the label names both.
      content: html`<span class="weekday-short">${short}</span
        ><span class="weekday-narrow"
          >${this.calendarAdapter.weekdayLabel(day, locale, 'narrow')}</span
        >`,
    });
  }

  /** Whether a short weekday label overflows its cell, so the headers show the narrow labels. */
  readonly #weekdayFit = new LabelFit(this);

  /** Observes the first month's short labels and their cell, whose sizes decide the label form. */
  #observeWeekdays(): void {
    const labels = [
      ...this.renderRoot.querySelectorAll<HTMLElement>('.month:first-of-type .weekday-short'),
    ];
    this.#weekdayFit.observe(labels[0]?.parentElement, labels);
  }

  #renderMonth(month: string, monthIndex: number): unknown {
    const weekStart = this.#resolvedWeekStart();
    const weekdays = Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);
    const dates = calendarGridDates(month, weekStart, this.calendarAdapter, this.fixedWeeks);
    const rovingDate = this.#rovingDate();
    const weekNumbers = this.showWeekNumber && !!this.calendarAdapter.weekNumber;
    return this.#part('month', {
      tag: 'section',
      properties: { class: 'month', 'data-month': month },
      content: html` ${this.#part('header', {
        properties: { class: 'header' },
        content: html` ${monthIndex === 0 ? this.#renderNavigation(true) : nothing}
        ${this.#renderCaption(month, monthIndex)}
        ${monthIndex === this.visibleMonths - 1 ? this.#renderNavigation(false) : nothing}`,
      })}
      ${this.#part('month-grid', {
        properties: {
          class: 'grid',
          role: 'grid',
          'aria-labelledby': `${this.#calendarId}-month-${monthIndex}`,
          'aria-multiselectable': this.selectionMode !== 'single' ? 'true' : null,
          'data-week-numbers': weekNumbers,
          'data-narrow-weekdays': this.#weekdayFit.narrow,
        },
        content: html` ${this.#part('weekdays', {
          properties: { class: 'weekdays', role: 'row' },
          content: html` ${
            weekNumbers
              ? this.#part('week-number', {
                  properties: { class: 'weekday', role: 'columnheader' },
                  content: html`<span class="visually-hidden"
                    >${this.messages.weekNumberHeader ?? 'Week number'}</span
                  >`,
                })
              : nothing
          }
          ${weekdays.map((day) => this.#renderWeekday(day))}`,
        })}
        ${this.#part('weeks', {
          properties: { class: 'weeks', role: 'rowgroup' },
          content: Array.from({ length: dates.length / 7 }, (_, week) => {
            const weekDates = dates.slice(week * 7, week * 7 + 7);
            const number = weekNumbers
              ? this.calendarAdapter.weekNumber!(weekDates[0]!, weekStart, this.#minimalWeekDays())
              : 0;
            return this.#part('week', {
              properties: { class: 'week', role: 'row' },
              content: html` ${weekNumbers ? this.#part('week-number', { properties: { class: 'week-number', role: 'rowheader' }, content: this.formatters.weekNumber?.(number, weekDates[0]!) ?? new Intl.NumberFormat(this.#locale(), { minimumIntegerDigits: 2 }).format(number) }) : nothing}
              ${weekDates.map((date) => this.#renderDay(date, month, rovingDate))}`,
            });
          }),
        })}`,
      })}`,
    });
  }

  #renderDay(date: string, month: string, rovingDate: string): unknown {
    const outside = !this.#sameMonth(date, month);
    const hidden = this.#matches(this.hiddenDates, date) || (outside && !this.showOutsideDays);
    if (hidden)
      return html`<span class="day-cell" role="gridcell" data-date=${date} data-hidden></span>`;
    const unavailable = this.#matches(this.unavailableDates, date);
    const disabledDate =
      this.#matches(this.disabledDates, date) || !this.#withinSelectionBounds(date);
    const disabled = this.effectiveDisabled || unavailable || disabledDate;
    const range = isCalendarRange(this.#selection) ? this.#selection : undefined;
    const today = this.calendarAdapter.normalize(this.today) === date;
    const dayMarkers = calendarDayMarkers(this.dayMarkers, date);
    const state: CalendarDayState = {
      date,
      month,
      label: this.calendarAdapter.format(date, this.#locale(), 'accessible'),
      selected: this.#isSelected(date),
      today,
      outside,
      disabled,
      unavailable,
      crossedOut: unavailable || this.#matches(this.crossedOutDates, date),
      focused: this.#focusedDate === date,
      rangeStart: range?.from === date,
      rangeEnd: (range?.to ?? range?.from) === date,
      rangeMiddle: !!(
        range?.to &&
        this.calendarAdapter.compare(date, range.from) > 0 &&
        this.calendarAdapter.compare(date, range.to) < 0
      ),
      modifiers: Object.fromEntries(
        this.#modifierNames.map((key) => [key, this.#matches(this.dayModifiers[key], date)]),
      ),
      markers:
        today && this.todayIndicator === 'dot' ? Object.freeze([{}, ...dayMarkers]) : dayMarkers,
    };
    // Custom markers first (names already exclude built-ins): built-in state and
    // date identity always win.
    const markers: Record<string, unknown> = {
      ...Object.fromEntries(
        Object.entries(state.modifiers).map(([key, value]) => ['data-' + key, value]),
      ),
      'data-date': date,
      'data-selected': state.selected,
      'data-today': state.today,
      'data-outside': outside,
      'data-disabled': disabledDate || this.effectiveDisabled,
      'data-unavailable': unavailable,
      'data-crossed-out': state.crossedOut,
      'data-today-indicator': today ? this.todayIndicator : null,
      'data-markers': state.markers.length > 0,
      'data-focused': state.focused,
      'data-range-start': state.rangeStart,
      'data-range-middle': state.rangeMiddle,
      'data-range-end': state.rangeEnd,
    };
    return html`<span
      class="day-cell"
      role="gridcell"
      aria-selected=${String(state.selected)}
      ${bindPart(markers)}
    >
      <tp-button
        class="day"
        data-calendar-part="calendar-day"
        exportparts="button:calendar-day"
        variant="ghost"
        size="sm"
        .disabled=${disabled}
        .ariaLabel=${this.messages.day?.(state) ?? this.#dayName(state)}
        data-date=${date}
        data-roving=${date === rovingDate && !outside ? '0' : '-1'}
        .partContracts=${{ button: { ...this.partContracts['calendar-day'], hostProperties: { ...this.partContracts['calendar-day']?.hostProperties, ...markers, 'aria-current': state.today ? 'date' : null } } }}
        @click=${this.#dayClick}
        @keydown=${this.#dayKeyDown}
        @focusin=${this.#dayFocus}
      >
        ${this.renderDay?.(state) ?? this.#dayContent(date, markers)}${this.#renderMarkers(state.markers)}
      </tp-button>
    </span>`;
  }

  /** The date, then the labels of its markers. */
  #dayName(state: CalendarDayState): string {
    const labels = state.markers.map((marker) => marker.label).filter(Boolean);
    return labels.length ? `${state.label}, ${labels.join(', ')}` : state.label;
  }

  /** The day number, under its weekday in the strip. */
  #dayContent(date: string, markers: Record<string, unknown>): unknown {
    const state = {
      'data-selected': markers['data-selected'],
      'data-today-indicator': markers['data-today-indicator'],
      'data-range-middle': markers['data-range-middle'],
      'data-crossed-out': markers['data-crossed-out'],
    };
    const number = this.#part('day-number', {
      tag: 'span',
      properties: { class: 'day-number', 'data-strip': this.#isStrip(), ...state },
      content:
        this.formatters.day?.(date) ?? this.calendarAdapter.format(date, this.#locale(), 'day'),
    });
    if (!this.#isStrip()) return number;
    const day = this.calendarAdapter.dayOfWeek(date);
    return html`${this.#part('day-weekday', {
      tag: 'span',
      properties: { class: 'day-weekday', ...state },
      content:
        this.formatters.weekday?.(day) ?? this.calendarAdapter.weekdayLabel(day, this.#locale()),
    })}${number}`;
  }

  /**
   * Up to three passive dots centered under the day's content. A marker with neither a variant nor
   * a color takes the theme's foreground: white on dark themes, black on light ones.
   */
  #renderMarkers(markers: readonly CalendarDayMarker[]): unknown {
    if (!markers.length) return nothing;
    return this.#part('day-markers', {
      tag: 'span',
      properties: { class: 'day-markers' },
      content: markers
        .slice(0, 3)
        .map(
          (marker) =>
            html`<tp-status-dot
              .variant=${marker.variant ?? 'default'}
              .tooltip=${false}
              style=${marker.color || !marker.variant ? `--_tp-calendar-marker-color:${marker.color ?? 'var(--tp-foreground)'}` : nothing}
            ></tp-status-dot>`,
        ),
    });
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.#initialized) {
      this.#initialize();
      valueWritten.delete(this);
      this.#syncStripAnchor();
      this.#centeredSelection = (this.#isStrip() && this.#singleSelection()) || '';
      this.#prepareSlide();
      return;
    }
    if (changed.has('calendarAdapter') || changed.has('selectionMode')) {
      this.#selection = normalizeCalendarValue(
        this.selectionMode,
        this.#selection,
        this.calendarAdapter,
      );
      this.#defaultSelection = normalizeCalendarValue(
        this.selectionMode,
        this.defaultValue,
        this.calendarAdapter,
      );
    }
    if (this.#selectionControlled && changed.has('value')) {
      if (this.value === undefined)
        this.#diagnose('Calendar cannot change from controlled to uncontrolled selection.');
      else
        this.#selection = normalizeCalendarValue(
          this.selectionMode,
          this.value,
          this.calendarAdapter,
        );
    } else if (!this.#selectionControlled && changed.has('value') && this.value !== undefined) {
      this.#diagnose('Calendar cannot change from uncontrolled to controlled selection.');
    }
    if (!this.#selectionControlled && changed.has('defaultValue')) {
      this.#defaultSelection = normalizeCalendarValue(
        this.selectionMode,
        this.defaultValue,
        this.calendarAdapter,
      );
    }
    if (this.#monthControlled && changed.has('displayedMonth')) {
      if (!this.displayedMonth)
        this.#diagnose('Calendar cannot change from controlled to uncontrolled displayed month.');
      else this.#displayed = this.calendarAdapter.startOfMonth(this.displayedMonth);
    } else if (!this.#monthControlled && changed.has('displayedMonth') && this.displayedMonth) {
      this.#diagnose('Calendar cannot change from uncontrolled to controlled displayed month.');
    }
    this.#syncStripAnchor();
    if (valueWritten.delete(this) && this.#selectionControlled) this.#revealSelection();
    this.#centerSelection(changed);
    this.#prepareSlide();
  }

  /** The strip's first day at the last render; empty for grids. */
  #renderedStart = '';
  /** While the strip slides: the days it renders, the moved-away ones included, and their width. */
  #slideRange: { start: string; count: number; track: number } | null = null;
  /** A slide to start after the render: its translations, or a fade-in for a jump. */
  #pendingSlide: { from: number; to: number } | { fade: number } | null = null;
  #slideMotion: MotionHandle | undefined;
  #slideAnimation: Animation | undefined;

  /**
   * Prepares the slide from the strip as it is seen, mid-slide included, to its new first day.
   * Moves within two strips render the days in between, so leaving days slide out as new ones
   * slide in; longer jumps fade the new days in from their side. Reduced motion, a disabled motion
   * policy or a missing token set move the strip at once.
   */
  #prepareSlide(): void {
    const adapter = this.calendarAdapter;
    const strip = this.#isStrip() && !this.#configurationError();
    const start = strip ? calendarStripStart(adapter, this.#stripAnchor, this.visibleDays) : '';
    const previous = this.#renderedStart;
    this.#renderedStart = start;
    if (!previous || !start || !this.hasUpdated || adapter.compare(previous, start) === 0) {
      if (!strip) this.#endSlide();
      return;
    }
    const row = this.renderRoot.querySelector<HTMLElement>('.strip-row');
    const cell = row?.querySelector<HTMLElement>('.day-cell');
    const sign = this.direction === 'rtl' ? -1 : 1;
    // Layout widths, which a scaling entrance transform leaves untouched.
    const track = cell ? Number.parseFloat(getComputedStyle(cell).width) : 0;
    let visible = adapter.differenceInDays(previous, start);
    const running = this.#slideRange;
    if (running && row && track > 0) {
      const offset = new DOMMatrixReadOnly(getComputedStyle(row).transform).m41;
      visible = adapter.differenceInDays(running.start, start) - (sign * offset) / track;
    }
    this.#endSlide();
    this.#renderedFrom = previous;
    if (!row || !(track > 0) || resolveMotionTiming(this).duration <= 0) return;
    if (Math.abs(visible) > this.visibleDays * 2) {
      this.#pendingSlide = { fade: Math.sign(visible) };
      return;
    }
    const first = Math.min(0, Math.floor(visible));
    const last = Math.max(0, Math.ceil(visible));
    this.#slideRange = {
      start: adapter.addDays(start, first),
      count: this.visibleDays + last - first,
      track,
    };
    this.#pendingSlide = { from: -sign * (visible - first) * track, to: sign * first * track };
  }

  /** Plays the prepared slide on the rendered row, through the claimable strip motion role. */
  #playSlide(): void {
    const pending = this.#pendingSlide;
    this.#pendingSlide = null;
    const row = this.renderRoot.querySelector<HTMLElement>('.strip-row');
    if (!pending || !row) return this.#endSlide(true);
    const keyframes =
      'fade' in pending
        ? [
            {
              opacity: 0,
              transform: `translateX(${(this.direction === 'rtl' ? 1 : -1) * pending.fade * this.#slideTrack(row) * 0.5}px)`,
            },
            { opacity: 1, transform: 'none' },
          ]
        : [
            { transform: `translateX(${pending.from}px)` },
            { transform: `translateX(${pending.to}px)` },
          ];
    const motion = prepareMotion(
      this,
      row,
      calendarMotionRoles.strip,
      {
        phase: 'change',
        fromState: this.#renderedFrom,
        toState: this.#renderedStart,
      },
      {
        play: () => {
          const animation = row.animate(keyframes, {
            ...resolveMotionTiming(this),
            fill: 'forwards',
          });
          this.#slideAnimation = animation;
          return {
            finished: animation.finished.then(() => undefined),
            cancel: () => animation.cancel(),
          };
        },
      },
    );
    this.#slideMotion = motion;
    void motion.finished.then(() => {
      if (this.#slideMotion === motion) this.#endSlide(true);
    });
    motion.start();
  }

  #slideTrack(row: HTMLElement): number {
    const cell = row.querySelector<HTMLElement>('.day-cell');
    return cell ? Number.parseFloat(getComputedStyle(cell).width) || 0 : 0;
  }

  /** The strip's first day before the latest move, reported as the motion's from-state. */
  #renderedFrom = '';

  /**
   * Ends a slide: the strip drops the moved-away days and its translation in the same render, so
   * the last frame and the settled strip match.
   */
  #endSlide(render = false): void {
    const animation = this.#slideAnimation;
    const motion = this.#slideMotion;
    this.#slideMotion = undefined;
    this.#slideAnimation = undefined;
    this.#pendingSlide = null;
    if (motion) motion.cancel();
    if (!this.#slideRange) {
      animation?.cancel();
      return;
    }
    this.#slideRange = null;
    if (!render) {
      animation?.cancel();
      return;
    }
    // The settled render lands in this frame; the held last frame is released after it.
    this.requestUpdate();
    void this.updateComplete.then(() => animation?.cancel());
  }

  /**
   * Keeps the strip's middle day in the displayed month: a month changed by its controls, caption
   * dropdowns or owner keeps the day number, and the strip stays inside the navigation bounds.
   */
  #syncStripAnchor(): void {
    const adapter = this.calendarAdapter;
    if (!this.#stripAnchor || !adapter.normalize(this.#stripAnchor))
      this.#stripAnchor = this.#displayed;
    if (adapter.compare(adapter.startOfMonth(this.#stripAnchor), this.#displayed) !== 0) {
      const proposed = this.#proposedStripAnchor;
      this.#stripAnchor =
        proposed && adapter.compare(adapter.startOfMonth(proposed), this.#displayed) === 0
          ? proposed
          : calendarStripAnchorInMonth(adapter, this.#stripAnchor, this.#displayed);
      this.#proposedStripAnchor = '';
    }
    if (!this.#isStrip() || this.#configurationError()) return;
    const clamped = calendarStripClamp(
      adapter,
      this.#stripAnchor,
      this.visibleDays,
      this.navigationStart,
      this.navigationEnd,
    );
    // Clamping never moves the middle day out of the displayed month.
    if (adapter.compare(adapter.startOfMonth(clamped), this.#displayed) === 0)
      this.#stripAnchor = clamped;
  }

  #isStrip(): boolean {
    return this.variant === 'strip';
  }

  /** Months the displayed-month bounds and reveals cover: one under the strip. */
  #monthCount(): number {
    return this.#isStrip() ? 1 : this.visibleMonths;
  }

  #stripStep(): number {
    return this.pagedNavigation ? this.visibleDays : 1;
  }

  #previousDays = (event: MouseEvent): void => this.#stripControl(-1, event);

  #nextDays = (event: MouseEvent): void => this.#stripControl(1, event);

  #stripControl(direction: number, event: MouseEvent): void {
    if (!this.#arrowsSelect()) {
      this.#moveStrip(
        this.calendarAdapter.addDays(this.#stripAnchor, direction * this.#stripStep()),
        event,
      );
      return;
    }
    const date = this.#arrowDate(direction);
    if (date) this.#requestSelection(date, 'selection', event);
  }

  /** Whether the strip controls change a single selection instead of moving the days. */
  #arrowsSelect(): boolean {
    return this.#isStrip() && this.selectionMode === 'single' && !this.readOnly;
  }

  /** The single selection's date, or none. */
  #singleSelection(): string | undefined {
    if (this.selectionMode !== 'single') return undefined;
    return calendarValueDates('single', this.#selection, this.calendarAdapter)[0];
  }

  /**
   * The selectable day a strip control selects: one day (a row with `paged-navigation`) from the
   * selection, or from the middle day without one, then on to the next selectable day that
   * navigation can show.
   */
  #arrowDate(direction: number): string | null {
    const adapter = this.calendarAdapter;
    const step = this.pagedNavigation ? this.visibleDays : 1;
    let date = adapter.addDays(this.#singleSelection() ?? this.#stripAnchor, direction * step);
    for (let attempt = 0; attempt < 3660; attempt += 1) {
      if (!this.#canReveal(date)) return null;
      if (this.#isDateSelectable(date)) return date;
      date = adapter.addDays(date, direction);
    }
    return null;
  }

  /** The single selection the strip last centered; a new one is centered once. */
  #centeredSelection = '';

  /**
   * Keeps a single selection in the middle of the strip: a newly committed or written date, from
   * a press, a strip control or the owner, slides to the center.
   */
  #centerSelection(changed: PropertyValues<this>): void {
    if (changed.has('variant') || changed.has('selectionMode') || changed.has('visibleDays'))
      this.#centeredSelection = '';
    const date = this.#isStrip() ? this.#singleSelection() : undefined;
    if (!date || date === this.#centeredSelection) return;
    this.#centeredSelection = date;
    if (this.calendarAdapter.compare(date, this.#stripAnchor) !== 0)
      this.#moveStrip(date, new Event('value'));
  }

  /**
   * Moves the strip's middle day, kept inside the navigation bounds; a move into another month is
   * the cancelable displayed-month proposal, and a rejected one leaves the strip where it was.
   * Returns whether the strip shows the requested middle day.
   */
  #moveStrip(anchor: string, sourceEvent: Event): boolean {
    const adapter = this.calendarAdapter;
    const next = calendarStripClamp(
      adapter,
      anchor,
      this.visibleDays,
      this.navigationStart,
      this.navigationEnd,
    );
    if (adapter.compare(next, this.#stripAnchor) === 0) return false;
    this.#proposedStripAnchor = '';
    const previous = this.#stripAnchor;
    this.#stripAnchor = next;
    const month = adapter.startOfMonth(next);
    if (
      adapter.compare(month, this.#displayed) !== 0 &&
      (!this.#requestDisplayedMonth(month, sourceEvent) ||
        adapter.compare(month, this.#displayed) !== 0)
    ) {
      this.#stripAnchor = previous;
      this.#proposedStripAnchor = next;
      this.requestUpdate();
      return false;
    }
    this.requestUpdate();
    return true;
  }

  /**
   * Shows the committed selection when none of its dates is on a displayed grid: the displayed
   * month moves to its first date through the cancelable displayed-month proposal.
   */
  #revealSelection(): void {
    const dates = calendarValueDates(this.selectionMode, this.#selection, this.calendarAdapter);
    const months = this.#visibleMonthStarts();
    const first = dates[0];
    if (!first || !months.length) return;
    if (this.#isStrip()) {
      // The strip centers on the selection when none of its dates is shown.
      if (!dates.some((date) => this.#inStrip(date))) this.#moveStrip(first, new Event('value'));
      return;
    }
    const weekStart = this.#resolvedWeekStart();
    const shown = (date: string) =>
      months.some(
        (month) =>
          this.#sameMonth(date, month) ||
          (this.showOutsideDays &&
            calendarGridDates(month, weekStart, this.calendarAdapter, this.fixedWeeks).includes(
              date,
            )),
      );
    if (dates.some(shown)) return;
    const target = this.calendarAdapter.startOfMonth(first);
    const display =
      this.calendarAdapter.compare(target, months[0]!) < 0
        ? target
        : this.calendarAdapter.addMonths(target, -(months.length - 1));
    this.#requestDisplayedMonth(display, new Event('value'));
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.#pendingSlide) this.#playSlide();
    this.#observeWeekdays();
    void this.#syncChildren();
    this.#syncFormState();
    const error = this.#configurationError();
    if (error) this.#diagnose(error);
    this.#warn(
      'calendar-week-number-unavailable',
      this.showWeekNumber && !this.calendarAdapter.weekNumber
        ? 'Calendar showWeekNumber needs an adapter weekNumber(date, weekStartsOn, minimalDays); the week-number column is omitted until calendarAdapter supplies it.'
        : null,
    );
    this.#warn(
      'calendar-ignored-day-modifier',
      this.#ignoredModifiers.length
        ? `Calendar dayModifiers ${this.#ignoredModifiers.map((name) => `"${name}"`).join(', ')} ignored: names must be lowercase (a-z, 0-9, -) and must not reuse built-in day markers (${calendarBuiltInDayMarkers.join(', ')}).`
        : null,
    );
    if (this.#pendingFocusDate) {
      const date = this.#pendingFocusDate;
      this.#pendingFocusDate = '';
      const generation = ++this.#focusGeneration;
      queueMicrotask(() => {
        if (generation !== this.#focusGeneration || !this.isConnected) return;
        this.#dayButton(date)?.focus();
      });
    }
  }

  protected resetFormValue(): void {
    if (this.#selectionControlled) return;
    this.#requestSelection(this.#defaultSelection, 'form-reset', new Event('reset'));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // A moved calendar does not render again; it resumes measuring its weekday labels.
    if (this.hasUpdated) this.#observeWeekdays();
  }

  override disconnectedCallback(): void {
    this.#childGeneration += 1;
    for (const { release, member } of this.#registered.values()) {
      release();
      compositeControl(member)?.release(this);
    }
    this.#registered.clear();
    this.#focusGeneration += 1;
    this.#pendingFocusDate = '';
    this.#weekdayFit.disconnect();
    this.#endSlide();
    this.#renderedStart = '';
    super.disconnectedCallback();
  }

  #initialize(): void {
    this.#initialized = true;
    this.#selectionControlled = this.value !== undefined;
    this.#selection = normalizeCalendarValue(
      this.selectionMode,
      this.#selectionControlled ? this.value : this.defaultValue,
      this.calendarAdapter,
    );
    this.#defaultSelection = normalizeCalendarValue(
      this.selectionMode,
      this.defaultValue,
      this.calendarAdapter,
    );
    this.#monthControlled = Boolean(this.displayedMonth);
    const firstSelection = calendarValueDates(
      this.selectionMode,
      this.#selection,
      this.calendarAdapter,
    )[0];
    const initialMonth =
      this.displayedMonth ||
      this.defaultDisplayedMonth ||
      firstSelection ||
      this.calendarAdapter.normalize(this.today);
    this.#displayed = initialMonth
      ? this.calendarAdapter.startOfMonth(initialMonth)
      : this.calendarAdapter.startOfMonth(todayCalendarDate());
    // The strip centers on the selection or today, moved to the same day of a displayed month
    // that does not hold it.
    this.#stripAnchor =
      firstSelection || this.calendarAdapter.normalize(this.today) || this.#displayed;
  }

  #requestSelection(value: CalendarValue, reason: ChangeReason, sourceEvent: Event): boolean {
    const next = normalizeCalendarValue(this.selectionMode, value, this.calendarAdapter);
    if (
      this.required &&
      reason !== 'form-reset' &&
      calendarValueDates(this.selectionMode, this.#selection, this.calendarAdapter).length &&
      !calendarValueDates(this.selectionMode, next, this.calendarAdapter).length
    )
      return false;
    const error = this.#selectionError(next);
    if (error) {
      this.#diagnose(selectionDiagnostics[error]);
      return false;
    }
    const previous = this.#selection;
    if (sameCalendarValue(this.selectionMode, next, previous, this.calendarAdapter)) return false;
    const event = new TpValueChangeEvent(next, previous, reason, sourceEvent);
    this.onValueChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) {
      this.requestUpdate();
      return false;
    }
    if (!this.#selectionControlled) this.#selection = next;
    else if (this.value !== undefined)
      this.#selection = normalizeCalendarValue(
        this.selectionMode,
        this.value,
        this.calendarAdapter,
      );
    this.requestUpdate();
    return true;
  }

  #activateDate(date: string, reason: ChangeReason, sourceEvent: Event): void {
    if (this.effectiveDisabled || this.readOnly || this.#configurationError()) return;
    const proposal = calendarSelectionProposal({
      mode: this.selectionMode,
      current: this.#selection,
      date,
      adapter: this.calendarAdapter,
      required: this.required,
      minimumSelectionCount: this.minimumSelectionCount,
      maximumSelectionCount: this.maximumSelectionCount,
      minimumNights: this.minimumNights,
      maximumNights: this.maximumNights,
      rangeExclusion: this.rangeExclusion,
      isExcluded: (candidate) => !this.#isDateSelectable(candidate),
    });
    if (!proposal.accepted) return;
    this.#requestSelection(proposal.value, reason, sourceEvent);
  }

  #dayClick = (event: MouseEvent): void => {
    const date = (event.currentTarget as HTMLButtonElement).dataset.date;
    if (date) this.#activateDate(date, 'selection', event);
  };

  #dayKeyDown = (event: KeyboardEvent): void => {
    if (this.effectiveDisabled || this.#configurationError() || navigationKeyPreempted(event))
      return;
    const current = (event.currentTarget as HTMLButtonElement).dataset.date;
    if (!current) return;
    const move = gridKeyMove(event, this.direction === 'rtl');
    let target: string | null = null;
    let direction = 1;
    if (move?.kind === 'step') {
      // A column is one day, a row one week; the step's sign is the direction in time.
      const days = move.columns + move.rows * 7;
      direction = days < 0 ? -1 : 1;
      target = this.calendarAdapter.addDays(current, days);
    } else if (move && move.kind !== 'page' && this.#isStrip()) {
      // The strip's Home and End reach its first and last day.
      const dates = calendarStripDates(this.calendarAdapter, this.#stripAnchor, this.visibleDays);
      direction = move.edge === 'start' ? 1 : -1;
      target = (move.edge === 'start' ? dates[0] : dates.at(-1)) ?? null;
    } else if (move && move.kind !== 'page') {
      const weekStart = startOfWeek(current, this.#resolvedWeekStart(), this.calendarAdapter);
      direction = move.edge === 'start' ? -1 : 1;
      target = move.edge === 'start' ? weekStart : this.calendarAdapter.addDays(weekStart, 6);
    } else if (move) {
      direction = move.direction;
      target = move.large
        ? this.calendarAdapter.addYears(current, move.direction)
        : this.calendarAdapter.addMonths(current, move.direction);
    }
    if (!target) return;
    event.preventDefault();
    const focusable = this.#nextFocusableDate(target, direction);
    if (focusable) this.#revealAndFocus(focusable, event);
  };

  #dayFocus = (event: FocusEvent): void => {
    this.#focusedDate = (event.currentTarget as HTMLButtonElement).dataset.date ?? '';
    this.requestUpdate();
  };

  #previousMonth = (event: MouseEvent): void => {
    this.#requestDisplayedMonth(
      this.calendarAdapter.addMonths(this.#displayed, -this.#navigationStep()),
      event,
    );
  };

  #nextMonth = (event: MouseEvent): void => {
    this.#requestDisplayedMonth(
      this.calendarAdapter.addMonths(this.#displayed, this.#navigationStep()),
      event,
    );
  };

  #requestDisplayedMonth(value: string, sourceEvent: Event): boolean {
    const next = this.calendarAdapter.startOfMonth(value);
    if (!this.#canDisplay(next) || this.calendarAdapter.compare(next, this.#displayed) === 0)
      return false;
    const detail = { value: next, previousValue: this.#displayed, sourceEvent };
    const event = new CustomEvent('tp-displayed-month-change', {
      bubbles: true,
      composed: true,
      cancelable: true,
      detail,
    });
    this.onDisplayedMonthChange?.(event);
    if (event.defaultPrevented || !this.dispatchEvent(event)) return false;
    if (!this.#monthControlled) this.#displayed = next;
    else if (this.displayedMonth)
      this.#displayed = this.calendarAdapter.startOfMonth(this.displayedMonth);
    this.requestUpdate();
    return this.calendarAdapter.compare(next, this.#displayed) === 0;
  }

  #revealAndFocus(date: string, sourceEvent: Event): void {
    if (this.#isStrip()) {
      const anchor = calendarStripReveal(
        this.calendarAdapter,
        this.#stripAnchor,
        this.visibleDays,
        date,
      );
      if (this.calendarAdapter.compare(anchor, this.#stripAnchor) !== 0)
        this.#moveStrip(anchor, sourceEvent);
      if (!this.#inStrip(date)) return;
      this.#focusedDate = date;
      this.#pendingFocusDate = date;
      this.requestUpdate();
      return;
    }
    const targetMonth = this.calendarAdapter.startOfMonth(date);
    const visibleMonths = this.#visibleMonthStarts();
    const first = visibleMonths[0];
    const last = visibleMonths.at(-1);
    if (!first || !last) return;
    let display = this.#displayed;
    if (this.calendarAdapter.compare(targetMonth, first) < 0) display = targetMonth;
    else if (this.calendarAdapter.compare(targetMonth, last) > 0)
      display = this.calendarAdapter.addMonths(targetMonth, -(this.#monthCount() - 1));
    if (!this.#canDisplay(display)) return;
    if (
      this.calendarAdapter.compare(display, this.#displayed) !== 0 &&
      !this.#requestDisplayedMonth(display, sourceEvent)
    )
      return;
    this.#focusedDate = date;
    this.#pendingFocusDate = date;
    this.requestUpdate();
  }

  #nextFocusableDate(start: string, direction: number): string | null {
    let date = start;
    for (let attempt = 0; attempt < 3660; attempt += 1) {
      if (this.#isDateFocusable(date) && this.#canReveal(date)) return date;
      date = this.calendarAdapter.addDays(date, direction < 0 ? -1 : 1);
    }
    return null;
  }

  #canReveal(date: string): boolean {
    const month = this.calendarAdapter.startOfMonth(date);
    const last = this.calendarAdapter.addMonths(month, this.#monthCount() - 1);
    if (this.navigationStart) {
      const lower = this.calendarAdapter.startOfMonth(this.navigationStart);
      if (this.calendarAdapter.compare(last, lower) < 0) return false;
    }
    if (this.navigationEnd) {
      const upper = this.calendarAdapter.startOfMonth(this.navigationEnd);
      if (this.calendarAdapter.compare(month, upper) > 0) return false;
    }
    return true;
  }

  #canNavigate(amount: number): boolean {
    return this.#canDisplay(this.calendarAdapter.addMonths(this.#displayed, amount));
  }

  #canDisplay(start: string): boolean {
    return calendarCanDisplay(
      this.calendarAdapter,
      start,
      this.#monthCount(),
      this.navigationStart,
      this.navigationEnd,
    );
  }

  #navigationStep(): number {
    return this.pagedNavigation && !this.#isStrip() ? this.visibleMonths : 1;
  }

  #visibleMonthStarts(): string[] {
    return Array.from({ length: Math.max(0, this.#monthCount()) }, (_, index) =>
      this.calendarAdapter.addMonths(this.#displayed, index),
    );
  }

  /** Whether the strip shows `date`. */
  #inStrip(date: string): boolean {
    const start = calendarStripStart(this.calendarAdapter, this.#stripAnchor, this.visibleDays);
    const offset = this.calendarAdapter.differenceInDays(date, start);
    return offset >= 0 && offset < this.visibleDays;
  }

  #rovingDate(): string {
    const visible = this.#visibleMonthStarts();
    if (!visible.length) return '';
    const strip = this.#isStrip();
    const first = strip
      ? calendarStripStart(this.calendarAdapter, this.#stripAnchor, this.visibleDays)
      : visible[0]!;
    const afterLast = strip
      ? this.calendarAdapter.addDays(first, this.visibleDays)
      : this.calendarAdapter.addMonths(visible.at(-1)!, 1);
    const inInterval = (date: string) =>
      this.calendarAdapter.compare(date, first) >= 0 &&
      this.calendarAdapter.compare(date, afterLast) < 0;
    if (
      this.#focusedDate &&
      inInterval(this.#focusedDate) &&
      this.#isDateFocusable(this.#focusedDate)
    )
      return this.#focusedDate;
    const selected = calendarValueDates(
      this.selectionMode,
      this.#selection,
      this.calendarAdapter,
    ).find((date) => inInterval(date) && this.#isDateFocusable(date));
    if (selected) return selected;
    const today = this.calendarAdapter.normalize(this.today);
    if (today && inInterval(today) && this.#isDateFocusable(today)) return today;
    if (strip)
      return (
        calendarStripDates(this.calendarAdapter, this.#stripAnchor, this.visibleDays).find((date) =>
          this.#isDateFocusable(date),
        ) ?? ''
      );
    for (const month of visible) {
      const dates = calendarGridDates(month, this.#resolvedWeekStart(), this.calendarAdapter);
      const candidate = dates.find(
        (date) => this.#sameMonth(date, month) && this.#isDateFocusable(date),
      );
      if (candidate) return candidate;
    }
    return '';
  }

  #isSelected(date: string): boolean {
    const selection = normalizeCalendarValue(
      this.selectionMode,
      this.#selection,
      this.calendarAdapter,
    );
    if (typeof selection === 'string') return selection === date;
    if (Array.isArray(selection)) return selection.includes(date);
    if (!selection) return false;
    return (
      this.calendarAdapter.compare(date, selection.from) >= 0 &&
      this.calendarAdapter.compare(date, selection.to ?? selection.from) <= 0
    );
  }

  #isDateFocusable(date: string): boolean {
    return this.#isDateSelectable(date) && !this.effectiveDisabled;
  }

  #isDateSelectable(date: string): boolean {
    return (
      this.#withinSelectionBounds(date) &&
      !this.#matches(this.unavailableDates, date) &&
      !this.#matches(this.disabledDates, date) &&
      !this.#matches(this.hiddenDates, date)
    );
  }

  #withinSelectionBounds(date: string): boolean {
    if (this.min && this.calendarAdapter.compare(date, this.min) < 0) return false;
    if (this.max && this.calendarAdapter.compare(date, this.max) > 0) return false;
    return true;
  }

  #matches(matcher: CalendarDateMatcher, date: string): boolean {
    return matchesCalendarDate(matcher, date);
  }

  #sameMonth(left: string, right: string): boolean {
    return (
      this.calendarAdapter.compare(
        this.calendarAdapter.startOfMonth(left),
        this.calendarAdapter.startOfMonth(right),
      ) === 0
    );
  }

  #resolvedWeekStart(): number {
    return resolveWeekStart(this.weekStartsOn, this.#locale());
  }

  #navigationLabel(direction: 'previous' | 'next'): string {
    const target = this.calendarAdapter.addMonths(
      this.#displayed,
      direction === 'previous' ? -this.#navigationStep() : this.#navigationStep(),
    );
    const caption = this.calendarAdapter.format(target, this.#locale(), 'month');
    const message = this.messages[direction];
    if (typeof message === 'function') return message(target, caption);
    return message ?? `${direction === 'previous' ? 'Previous' : 'Next'} ${caption}`;
  }

  #configurationError(): string | null {
    if (!Number.isInteger(this.visibleMonths) || this.visibleMonths <= 0)
      return 'Calendar visibleMonths must be a positive integer.';
    if (!Number.isInteger(this.visibleDays) || this.visibleDays <= 0)
      return 'Calendar visibleDays must be a positive integer.';
    if (
      !Number.isInteger(this.minimumSelectionCount) ||
      this.minimumSelectionCount < 0 ||
      this.maximumSelectionCount < this.minimumSelectionCount
    )
      return 'Calendar selection-count limits are invalid.';
    if (
      !Number.isInteger(this.minimumNights) ||
      this.minimumNights < 0 ||
      this.maximumNights < this.minimumNights
    )
      return 'Calendar night limits are invalid.';
    if (this.min && !this.calendarAdapter.normalize(this.min))
      return 'Calendar minimum selection date is invalid.';
    if (this.max && !this.calendarAdapter.normalize(this.max))
      return 'Calendar maximum selection date is invalid.';
    if (this.min && this.max && this.calendarAdapter.compare(this.min, this.max) > 0)
      return 'Calendar minimum selection date must not follow maximum.';
    if (this.navigationStart && !this.calendarAdapter.normalize(this.navigationStart))
      return 'Calendar navigation start is invalid.';
    if (this.navigationEnd && !this.calendarAdapter.normalize(this.navigationEnd))
      return 'Calendar navigation end is invalid.';
    if (
      this.navigationStart &&
      this.navigationEnd &&
      this.calendarAdapter.compare(this.navigationStart, this.navigationEnd) > 0
    )
      return 'Calendar navigation start must not follow navigation end.';
    return null;
  }

  #selectionError(
    value: CalendarValue,
    committed = false,
  ): Exclude<CalendarValidityCode, 'value-missing'> | null {
    const dates = calendarValueDates(this.selectionMode, value, this.calendarAdapter);
    if (dates.some((date) => !this.#isDateSelectable(date))) return 'excluded-date';
    if (this.selectionMode === 'multiple') {
      if (
        (committed && dates.length < this.minimumSelectionCount) ||
        dates.length > this.maximumSelectionCount
      )
        return 'selection-count';
    }
    if (this.selectionMode === 'range' && isCalendarRange(value) && value.to) {
      const nights = this.calendarAdapter.differenceInDays(value.to, value.from);
      for (let offset = 1; offset < nights; offset++)
        if (!this.#isDateSelectable(this.calendarAdapter.addDays(value.from, offset)))
          return 'range-excluded-date';
      if (nights < this.minimumNights || nights > this.maximumNights) return 'range-nights';
    }
    return null;
  }

  #syncFormState(): void {
    const configurationError = this.#configurationError();
    const selectionError = configurationError ? null : this.#selectionError(this.#selection, true);
    const anchor = this.associationTarget() ?? undefined;
    const dates = calendarValueDates(this.selectionMode, this.#selection, this.calendarAdapter);
    const message = (code: CalendarValidityCode) =>
      this.messages.validity?.(code) ?? defaultValidityMessages[code];
    if (configurationError) this.setValidity({ customError: true }, configurationError, anchor);
    else if (selectionError)
      this.setValidity({ customError: true }, message(selectionError), anchor);
    else if (this.required && !dates.length)
      this.setValidity({ valueMissing: true }, message('value-missing'), anchor);
    else this.setValidity();

    if (this.effectiveDisabled || !this.name || !dates.length) {
      this.setFormValue(null);
      return;
    }
    if (dates.length === 1) {
      this.setFormValue(dates[0]!);
      return;
    }
    const data = new FormData();
    for (const date of dates) data.append(this.name, date);
    this.setFormValue(data);
  }

  #dayButtons(): HTMLButtonElement[] {
    return [...this.renderRoot.querySelectorAll<TpButton>('tp-button.day')]
      .map((member) => member.shadowRoot?.querySelector<HTMLButtonElement>('button') ?? null)
      .filter((target): target is HTMLButtonElement => target !== null);
  }

  async #syncChildren(): Promise<void> {
    const generation = ++this.#childGeneration;
    const members = [
      ...this.renderRoot.querySelectorAll<TpButton | TpNativeSelect>('[data-calendar-part]'),
    ];
    // Custom day content may contain library elements; wait for their shadow content.
    const content = this.renderDay
      ? members
          .filter((member) => member.classList.contains('day'))
          .flatMap((member) => [...member.children])
      : [];
    await Promise.all([
      ...members.map((member) => member.updateComplete),
      ...content
        .flatMap((element) => [element, ...element.querySelectorAll('*')])
        .map((element) => (element as Partial<TpElement>).updateComplete),
    ]);
    if (!this.isConnected || generation !== this.#childGeneration) return;
    this.#warn(
      'calendar-interactive-day-content',
      content.some((element) => element.isConnected && containsInteractiveContent(element))
        ? 'Calendar renderDay content must not contain links, controls or focusable elements: the day Button is the only activation and focus target. Render passive content and use messages.day for extra accessible information.'
        : null,
    );
    const active = new Set<HTMLElement>();
    for (const member of members) {
      const target = member.shadowRoot?.querySelector<HTMLElement>('button,select');
      if (!target) continue;
      active.add(target);
      const name = member.dataset.calendarPart!;
      target.part.add(name);
      if (!this.#registered.has(target))
        this.#registered.set(target, {
          member,
          release: this.presentationController.registerPart(name, target),
        });
      if (member.classList.contains('day'))
        compositeControl(member)?.apply(
          this,
          {
            disabled: member.disabled,
            focusableWhenDisabled: false,
            tabIndex: Number(member.dataset.roving),
          },
          () => {},
        );
    }
    for (const [target, { release, member }] of this.#registered) {
      if (!active.has(target)) {
        release();
        compositeControl(member)?.release(this);
        this.#registered.delete(target);
      }
    }
    this.#syncFormState();
  }

  #minimalWeekDays(): number {
    return localeWeekInfo(this.#locale()).minimalDays;
  }

  #dayButton(date: string): HTMLButtonElement | null {
    return (
      this.#dayButtons().find(
        (button) =>
          button.dataset.date === date && !button.disabled && !button.hasAttribute('data-outside'),
      ) ??
      this.#dayButtons().find((button) => button.dataset.date === date && !button.disabled) ??
      null
    );
  }

  /** Nonblocking, actionable development diagnostic; emitted once per distinct condition. */
  #warn(code: string, message: string | null): void {
    if (message === null) {
      this.#warnings.delete(code);
      return;
    }
    if (this.#warnings.get(code) === message) return;
    this.#warnings.set(code, message);
    queueMicrotask(() => this.diagnose(code, message));
  }

  #diagnose(message: string): void {
    if (!message || message === this.#lastDiagnostic) return;
    this.#lastDiagnostic = message;
    queueMicrotask(() =>
      this.diagnose('calendar-invalid-configuration', message, { severity: 'error' }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-calendar': TpCalendar;
  }
}
