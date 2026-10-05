import { bindPart } from '../../foundation/part.js';
import { html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { createId } from '../../foundation/id.js';
import { dateTimeFormatter } from '../../foundation/date-locale.js';
import { TpElement, TpFormElement } from '../../foundation/element.js';
import { TpValueChangeEvent } from '../../foundation/events.js';
import {
  calendarGridDates,
  calendarSelectionProposal,
  calendarValueDates,
  gregorianCalendarAdapter,
  isCalendarRange,
  normalizeCalendarValue,
  sameCalendarValue,
} from '../../foundation/calendar.js';
import type {
  CalendarAdapter,
  CalendarSelectionMode,
  CalendarValue,
} from '../../foundation/calendar.js';
import type { ChangeReason } from '../../foundation/types.js';

import { calendarStyles } from './styles.js';
import type {
  CalendarDateMatcher,
  CalendarDayState,
  CalendarFormatters,
  CalendarCaptionLayout,
  CalendarMessages,
  CalendarValidityCode,
} from './types.js';
import type { TpButton } from '../button.js';
import type { TpNativeSelect } from '../native-select/index.js';
import { compositeControl } from '../../foundation/composite-control.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import type { PartRenderOptions, PartState } from '../../foundation/part.js';
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

function localCalendarDate(): string {
  const now = new Date();
  return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function moduloCalendar(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** Developer diagnostics for rejected programmatic selections; not localized. */
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

export class TpCalendar extends TpFormElement<CalendarValue> {
  static tagName = 'tp-calendar';
  static override properties = {
    ...TpFormElement.properties,
    value: { converter: calendarValueConverter },
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
    onValueChange: { attribute: false },
    onDisplayedMonthChange: { attribute: false },
  };
  static override styles = [TpElement.styles, calendarStyles];
  override get value(): CalendarValue {
    const value = super.value;
    return value === ('' as unknown as CalendarValue) ? undefined : value;
  }
  override set value(value: CalendarValue) {
    super.value = value;
  }
  captionLayout: CalendarCaptionLayout = 'label';
  fixedWeeks = false;
  showWeekNumber = false;
  buttonVariant: TpButton['variant'] = 'ghost';
  renderDay: ((state: CalendarDayState) => unknown) | undefined;
  formatters: CalendarFormatters = {};
  messages: CalendarMessages = {};
  dayModifiers: Record<string, CalendarDateMatcher> = {};
  #hasFooter = false;
  #childGeneration = 0;
  #registered = new Map<HTMLElement, { release: () => void; member: TpButton | TpNativeSelect }>();
  selectionMode: CalendarSelectionMode = 'single';
  min = '';
  max = '';
  defaultValue: CalendarValue = undefined;
  visibleMonths = 1;
  displayedMonth: string | undefined = undefined;
  defaultDisplayedMonth = '';
  navigationStart = '';
  navigationEnd = '';
  minimumSelectionCount = 0;
  maximumSelectionCount = Number.POSITIVE_INFINITY;
  minimumNights = 0;
  maximumNights = Number.POSITIVE_INFINITY;
  rangeExclusion: 'reject' | 'restart' = 'reject';
  pagedNavigation = false;
  disabledNavigation: 'disable' | 'hide' = 'disable';
  showOutsideDays = true;
  locale = '';
  weekStartsOn = -1;
  today = localCalendarDate();
  label = 'Date';
  unavailableDates: CalendarDateMatcher;
  disabledDates: CalendarDateMatcher;
  hiddenDates: CalendarDateMatcher;
  calendarAdapter: CalendarAdapter = gregorianCalendarAdapter;
  onValueChange: ((event: TpValueChangeEvent<CalendarValue>) => void) | undefined;
  onDisplayedMonthChange:
    | ((event: CustomEvent<{ value: string; previousValue: string; sourceEvent: Event }>) => void)
    | undefined;

  #initialized = false;
  #selectionControlled = false;
  #monthControlled = false;
  #selection: CalendarValue = undefined;
  #defaultSelection: CalendarValue = undefined;
  #displayed = '';
  #focusedDate = '';
  #pendingFocusDate = '';
  #focusGeneration = 0;
  #lastDiagnostic = '';
  readonly #calendarId = createId('tp-calendar');

  get selection(): CalendarValue {
    return cloneCalendarValue(this.#selection);
  }

  get displayedMonthValue(): string {
    return this.#displayed;
  }

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
      },
      content: html`${this.#part('months', {
        properties: { class: 'months' },
        content: months.map((month, index) => this.#renderMonth(month, index)),
      })}
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
                        ${this.#yearMonths(month).map((date) => html`<option value=${date} ?disabled=${!this.#canDisplay(this.calendarAdapter.addMonths(date, -monthIndex))}>${monthLabel(date)}</option>`)}
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
                        ${this.#yearOptions(month).map((date) => html`<option value=${String(this.calendarAdapter.parts(date).year)}>${yearLabel(date)}</option>`)}
                      </tp-native-select>`
                    : this.#part('caption-label', { content: yearLabel(month) })
                }
              `,
            }),
    });
  }

  #captionChange(event: TpValueChangeEvent<string>, index: number, yearMonth?: string): void {
    event.stopPropagation();
    const date = yearMonth
      ? this.calendarAdapter.addYears(
          yearMonth,
          Number(event.detail.value) - this.calendarAdapter.parts(yearMonth).year,
        )
      : event.detail.value;
    this.#requestDisplayedMonth(
      this.calendarAdapter.addMonths(date, -index),
      event.detail.sourceEvent ?? event,
    );
    this.requestUpdate();
  }

  #yearMonths(month: string): string[] {
    const year = this.calendarAdapter.parts(month).year;
    let first = month;
    for (let i = 0; i < 24; i++) {
      const previous = this.calendarAdapter.addMonths(first, -1);
      if (this.calendarAdapter.parts(previous).year !== year) break;
      first = previous;
    }
    const dates: string[] = [];
    for (let i = 0; i < 24; i++) {
      const date = this.calendarAdapter.addMonths(first, i);
      if (this.calendarAdapter.parts(date).year !== year) break;
      dates.push(date);
    }
    return dates;
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
    return (
      this.locale ||
      this.ownerDocument.documentElement.lang ||
      this.ownerDocument.defaultView?.navigator.language
    );
  }
  #monthLabel(date: string): string {
    if (this.calendarAdapter === gregorianCalendarAdapter) {
      const value = new Date(0);
      const p = this.calendarAdapter.parts(date);
      value.setUTCFullYear(p.year, p.month - 1, p.day);
      return dateTimeFormatter(this.#locale(), {
        calendar: 'gregory',
        month: 'short',
        timeZone: 'UTC',
      }).format(value);
    }
    return this.calendarAdapter.format(date, this.#locale(), 'month');
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
          ${weekdays.map((day) => this.#part('weekday', { tag: 'span', properties: { class: 'weekday', role: 'columnheader' }, content: this.formatters.weekday?.(day) ?? this.calendarAdapter.weekdayLabel(day, this.#locale()) }))}`,
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
    const state: CalendarDayState = {
      date,
      month,
      label: this.calendarAdapter.format(date, this.#locale(), 'accessible'),
      selected: this.#isSelected(date),
      today: this.calendarAdapter.normalize(this.today) === date,
      outside,
      disabled,
      unavailable,
      focused: this.#focusedDate === date,
      rangeStart: range?.from === date,
      rangeEnd: (range?.to ?? range?.from) === date,
      rangeMiddle: !!(
        range?.to &&
        this.calendarAdapter.compare(date, range.from) > 0 &&
        this.calendarAdapter.compare(date, range.to) < 0
      ),
      modifiers: Object.fromEntries(
        Object.entries(this.dayModifiers)
          .filter(
            ([key]) =>
              /^[a-z][a-z0-9-]*$/.test(key) &&
              ![
                'selected',
                'today',
                'outside',
                'disabled',
                'unavailable',
                'hidden',
                'focused',
                'range-start',
                'range-middle',
                'range-end',
              ].includes(key),
          )
          .map(([key, matcher]) => [key, this.#matches(matcher, date)]),
      ),
    };
    const markers: Record<string, unknown> = {
      'data-date': date,
      'data-selected': state.selected,
      'data-today': state.today,
      'data-outside': outside,
      'data-disabled': disabledDate || this.effectiveDisabled,
      'data-unavailable': unavailable,
      'data-focused': state.focused,
      'data-range-start': state.rangeStart,
      'data-range-middle': state.rangeMiddle,
      'data-range-end': state.rangeEnd,
      ...Object.fromEntries(
        Object.entries(state.modifiers).map(([key, value]) => ['data-' + key, value]),
      ),
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
        .ariaLabel=${this.messages.day?.(state) ?? state.label}
        data-date=${date}
        data-roving=${date === rovingDate && !outside ? '0' : '-1'}
        .partContracts=${{ button: { ...this.partContracts['calendar-day'], hostProperties: { ...this.partContracts['calendar-day']?.hostProperties, ...markers, 'aria-current': state.today ? 'date' : null } } }}
        @click=${this.#dayClick}
        @keydown=${this.#dayKeyDown}
        @focusin=${this.#dayFocus}
      >
        ${this.renderDay?.(state) ?? this.formatters.day?.(date) ?? this.calendarAdapter.format(date, this.#locale(), 'day')}
      </tp-button>
    </span>`;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.#initialized) {
      this.#initialize();
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
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    void this.#syncChildren();
    this.#syncFormState();
    const error = this.#configurationError();
    if (error) this.#diagnose(error);
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

  override disconnectedCallback(): void {
    this.#childGeneration += 1;
    for (const { release, member } of this.#registered.values()) {
      release();
      compositeControl(member)?.release(this);
    }
    this.#registered.clear();
    this.#focusGeneration += 1;
    this.#pendingFocusDate = '';
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
      : this.calendarAdapter.startOfMonth(localCalendarDate());
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
    if (this.effectiveDisabled || this.#configurationError()) return;
    const current = (event.currentTarget as HTMLButtonElement).dataset.date;
    if (!current) return;
    let target: string | null = null;
    let direction = 1;
    const horizontal = this.direction === 'rtl' ? -1 : 1;
    if (event.key === 'ArrowRight') {
      direction = horizontal;
      target = this.calendarAdapter.addDays(current, horizontal);
    } else if (event.key === 'ArrowLeft') {
      direction = -horizontal;
      target = this.calendarAdapter.addDays(current, -horizontal);
    } else if (event.key === 'ArrowDown') {
      direction = 1;
      target = this.calendarAdapter.addDays(current, 7);
    } else if (event.key === 'ArrowUp') {
      direction = -1;
      target = this.calendarAdapter.addDays(current, -7);
    } else if (event.key === 'Home') {
      direction = -1;
      const offset = moduloCalendar(
        this.calendarAdapter.dayOfWeek(current) - this.#resolvedWeekStart(),
        7,
      );
      target = this.calendarAdapter.addDays(current, -offset);
    } else if (event.key === 'End') {
      direction = 1;
      const offset = moduloCalendar(
        this.calendarAdapter.dayOfWeek(current) - this.#resolvedWeekStart(),
        7,
      );
      target = this.calendarAdapter.addDays(current, 6 - offset);
    } else if (event.key === 'PageUp') {
      direction = -1;
      target = event.shiftKey
        ? this.calendarAdapter.addYears(current, -1)
        : this.calendarAdapter.addMonths(current, -1);
    } else if (event.key === 'PageDown') {
      direction = 1;
      target = event.shiftKey
        ? this.calendarAdapter.addYears(current, 1)
        : this.calendarAdapter.addMonths(current, 1);
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
    const targetMonth = this.calendarAdapter.startOfMonth(date);
    const visibleMonths = this.#visibleMonthStarts();
    const first = visibleMonths[0];
    const last = visibleMonths.at(-1);
    if (!first || !last) return;
    let display = this.#displayed;
    if (this.calendarAdapter.compare(targetMonth, first) < 0) display = targetMonth;
    else if (this.calendarAdapter.compare(targetMonth, last) > 0)
      display = this.calendarAdapter.addMonths(targetMonth, -(this.visibleMonths - 1));
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
    const last = this.calendarAdapter.addMonths(month, this.visibleMonths - 1);
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
    const normalized = this.calendarAdapter.startOfMonth(start);
    const last = this.calendarAdapter.addMonths(normalized, this.visibleMonths - 1);
    if (this.navigationStart) {
      const lower = this.calendarAdapter.startOfMonth(this.navigationStart);
      if (this.calendarAdapter.compare(normalized, lower) < 0) return false;
    }
    if (this.navigationEnd) {
      const upper = this.calendarAdapter.startOfMonth(this.navigationEnd);
      if (this.calendarAdapter.compare(last, upper) > 0) return false;
    }
    return true;
  }

  #navigationStep(): number {
    return this.pagedNavigation ? this.visibleMonths : 1;
  }

  #visibleMonthStarts(): string[] {
    return Array.from({ length: Math.max(0, this.visibleMonths) }, (_, index) =>
      this.calendarAdapter.addMonths(this.#displayed, index),
    );
  }

  #rovingDate(): string {
    const visible = this.#visibleMonthStarts();
    if (!visible.length) return '';
    const first = visible[0]!;
    const afterLast = this.calendarAdapter.addMonths(visible.at(-1)!, 1);
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
    return typeof matcher === 'function' ? matcher(date) : Boolean(matcher?.has(date));
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
    if (Number.isInteger(this.weekStartsOn) && this.weekStartsOn >= 0 && this.weekStartsOn <= 6)
      return this.weekStartsOn;
    try {
      const locale = new Intl.Locale(this.#locale() || 'en-US');
      const weekInfo =
        (
          locale as Intl.Locale & {
            weekInfo?: { firstDay: number };
            getWeekInfo?: () => { firstDay: number };
          }
        ).weekInfo ??
        (
          locale as Intl.Locale & {
            getWeekInfo?: () => { firstDay: number };
          }
        ).getWeekInfo?.();
      return weekInfo ? weekInfo.firstDay % 7 : 0;
    } catch {
      return 0;
    }
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
    if (this.showWeekNumber && !this.calendarAdapter.weekNumber)
      return 'Calendar adapter must supply weekNumber to show week numbers.';
    if (!Number.isInteger(this.visibleMonths) || this.visibleMonths <= 0)
      return 'Calendar visibleMonths must be a positive integer.';
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
    await Promise.all(members.map((member) => member.updateComplete));
    if (!this.isConnected || generation !== this.#childGeneration) return;
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
    try {
      const locale = new Intl.Locale(this.#locale() ?? 'en-US') as Intl.Locale & {
        getWeekInfo?: () => { minimalDays: number };
        weekInfo?: { minimalDays: number };
      };
      return (locale.getWeekInfo?.() ?? locale.weekInfo)?.minimalDays ?? 1;
    } catch {
      return 1;
    }
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

  #diagnose(message: string): void {
    if (!message || message === this.#lastDiagnostic) return;
    this.#lastDiagnostic = message;
    queueMicrotask(() =>
      this.emit('tp-diagnostic', {
        code: 'calendar-invalid-configuration',
        message,
        severity: 'error' as const,
      }),
    );
  }
}
