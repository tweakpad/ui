import { bindPart } from '../foundation/part.js';
import { css, html, nothing } from 'lit';
import type { PropertyValues, TemplateResult } from 'lit';
import { createId } from '../foundation/id.js';
import { TpElement, TpFormElement } from '../foundation/element.js';
import { TpValueChangeEvent } from '../foundation/events.js';
import {
  calendarGridDates,
  calendarSelectionProposal,
  calendarValueDates,
  gregorianCalendarAdapter,
  isCalendarRange,
  normalizeCalendarValue,
  sameCalendarValue,
} from '../foundation/calendar.js';
import type {
  CalendarAdapter,
  CalendarSelectionMode,
  CalendarValue,
} from '../foundation/calendar.js';
import type { ChangeReason } from '../foundation/types.js';

export { TpInput } from './input/index.js';
export { TpTextArea } from './text-area/index.js';

export { TpNativeSelect } from './native-select/index.js';

export { TpSlider } from './slider/index.js';
export type { SliderValue } from './slider/index.js';
export { TpRadioGroup, TpRadioGroupItem } from './radio-group/index.js';

export { TpOtpField } from './one-time-code/index.js';
export type {
  CodeValidation,
  CodeCompleteDetail,
  CodeInvalidDetail,
} from './one-time-code/index.js';

export { TpField } from './field/index.js';

export { TpForm } from './form/index.js';

export { TpInputGroup } from './input-group/index.js';

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

type CalendarDateMatcher = ReadonlySet<string> | ((date: string) => boolean) | undefined;

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
    onValueChange: { attribute: false },
    onDisplayedMonthChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
      }

      .root {
        display: grid;
        min-inline-size: calc(var(--tp-spacing) * 85);
      }

      .header {
        display: grid;
        grid-template-columns: auto 1fr auto;
        align-items: center;
      }

      .caption {
        font-weight: var(--tp-font-semibold);
        text-align: center;
      }

      .navigation {
        display: grid;
        place-items: center;
        min-width: var(--tp-control-height-sm);
        min-height: var(--tp-control-height-sm);
        border: var(--tp-border-width) var(--tp-border-style) var(--tp-border);
        border-radius: var(--tp-radius-sm);
        color: var(--tp-foreground);
        background: var(--tp-background);
      }

      .months {
        display: grid;
        grid-template-columns: repeat(
          var(--tp-calendar-visible-months),
          minmax(calc(var(--tp-spacing) * 75), 1fr)
        );
      }

      .month {
        display: grid;
      }

      .month-caption {
        font-weight: var(--tp-font-semibold);
        text-align: center;
      }

      .weekdays,
      .week {
        display: grid;
        grid-template-columns: repeat(7, minmax(calc(var(--tp-spacing) * 10), 1fr));
      }

      .weekday {
        color: var(--tp-muted-foreground);
        font-size: var(--tp-text-xs);
        text-align: center;
      }

      .day-cell {
        display: grid;
        place-items: stretch;
        min-width: 0;
        min-height: var(--tp-target-size-min);
      }

      .day {
        min-width: var(--tp-target-size-min);
        min-height: var(--tp-target-size-min);
      }

      .day:focus-visible {
        position: relative;
        z-index: 1;
      }

      .day:disabled {
        cursor: not-allowed;
        opacity: var(--tp-opacity-disabled);
      }

      @media (width <= 42rem) {
        .months {
          grid-template-columns: 1fr;
        }
      }
    `,
  ];
  override get value(): CalendarValue {
    const value = super.value;
    return value === ('' as unknown as CalendarValue) ? undefined : value;
  }
  override set value(value: CalendarValue) {
    super.value = value;
  }
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

  protected override render() {
    const months = this.#visibleMonthStarts();
    const previousAvailable = this.#canNavigate(-this.#navigationStep());
    const nextAvailable = this.#canNavigate(this.#navigationStep());
    const hidePrevious = !previousAvailable && this.disabledNavigation === 'hide';
    const hideNext = !nextAvailable && this.disabledNavigation === 'hide';
    return html`<div
      class="root"
      part="calendar"
      role="group"
      aria-label=${this.label}
      ${bindPart({ style: { '--tp-calendar-visible-months': this.visibleMonths } })}
      ?data-disabled=${this.effectiveDisabled}
      ?data-readonly=${this.readOnly}
      ?data-required=${this.required}
      ?data-invalid=${this.invalid}
    >
      <header class="header" part="calendar-header">
        ${
          hidePrevious
            ? nothing
            : html`<button
                class="navigation"
                part="calendar-previous focusable"
                type="button"
                aria-label=${this.#navigationLabel('previous')}
                ?disabled=${this.effectiveDisabled || !previousAvailable}
                @click=${this.#previousMonth}
              >
                ‹
              </button>`
        }
        <span class="caption" aria-live="polite">${this.#intervalCaption(months)}</span>
        ${
          hideNext
            ? nothing
            : html`<button
                class="navigation"
                part="calendar-next focusable"
                type="button"
                aria-label=${this.#navigationLabel('next')}
                ?disabled=${this.effectiveDisabled || !nextAvailable}
                @click=${this.#nextMonth}
              >
                ›
              </button>`
        }
      </header>
      <div class="months" part="calendar-month-grid">
        ${months.map((month, index) => this.#renderMonth(month, index))}
      </div>
    </div>`;
  }

  #renderMonth(month: string, monthIndex: number): TemplateResult {
    const caption = this.calendarAdapter.format(month, this.locale || undefined, 'month');
    const captionId = `${this.#calendarId}-month-${monthIndex}`;
    const weekStart = this.#resolvedWeekStart();
    const weekdays = Array.from({ length: 7 }, (_, index) => (weekStart + index) % 7);
    const dates = calendarGridDates(month, weekStart, this.calendarAdapter);
    const rovingDate = this.#rovingDate();
    return html`<section class="month" data-month=${month}>
      <div id=${captionId} class="month-caption">${caption}</div>
      <div class="grid" role="grid" aria-labelledby=${captionId}>
        <div class="weekdays" role="row">
          ${weekdays.map(
            (day) =>
              html`<span class="weekday" role="columnheader"
                >${this.calendarAdapter.weekdayLabel(day, this.locale || undefined)}</span
              >`,
          )}
        </div>
        <div class="weeks" role="rowgroup">
          ${Array.from({ length: 6 }, (_, week) => {
            const weekDates = dates.slice(week * 7, week * 7 + 7);
            return html`<div class="week" role="row">
              ${weekDates.map((date) => this.#renderDay(date, month, rovingDate))}
            </div>`;
          })}
        </div>
      </div>
    </section>`;
  }

  #renderDay(date: string, month: string, rovingDate: string): TemplateResult {
    const outside = !this.#sameMonth(date, month);
    const hidden = this.#matches(this.hiddenDates, date) || (outside && !this.showOutsideDays);
    if (hidden)
      return html`<span class="day-cell" role="gridcell" data-date=${date} data-hidden></span>`;

    const unavailable = this.#matches(this.unavailableDates, date);
    const disabledDate =
      this.#matches(this.disabledDates, date) || !this.#withinSelectionBounds(date);
    const disabled = this.effectiveDisabled || unavailable || disabledDate;
    const selected = this.#isSelected(date);
    const range = isCalendarRange(this.#selection) ? this.#selection : undefined;
    const rangeStart = range?.from === date;
    const rangeEnd = range?.to === date;
    const rangeMiddle = Boolean(
      range?.to &&
      this.calendarAdapter.compare(date, range.from) > 0 &&
      this.calendarAdapter.compare(date, range.to) < 0,
    );
    const focused = this.#focusedDate === date;
    const today = this.calendarAdapter.normalize(this.today) === date;
    return html`<span
      class="day-cell"
      role="gridcell"
      aria-selected=${String(selected)}
      data-date=${date}
      ?data-selected=${selected}
      ?data-range-start=${rangeStart}
      ?data-range-middle=${rangeMiddle}
      ?data-range-end=${rangeEnd}
      ?data-outside=${outside}
      ?data-unavailable=${unavailable}
      ?data-disabled=${disabledDate}
      ?data-today=${today}
      ?data-focused=${focused}
    >
      <button
        class="day"
        part="calendar-day focusable"
        type="button"
        data-date=${date}
        aria-label=${this.calendarAdapter.format(date, this.locale || undefined, 'accessible')}
        aria-pressed=${String(selected)}
        tabindex=${date === rovingDate && !outside ? '0' : '-1'}
        ?disabled=${disabled}
        ?data-selected=${selected}
        ?data-range-start=${rangeStart}
        ?data-range-middle=${rangeMiddle}
        ?data-range-end=${rangeEnd}
        ?data-outside=${outside}
        ?data-unavailable=${unavailable}
        ?data-disabled=${disabledDate}
        ?data-today=${today}
        ?data-focused=${focused}
        @click=${this.#dayClick}
        @keydown=${this.#dayKeyDown}
        @focus=${this.#dayFocus}
      >
        ${this.calendarAdapter.format(date, this.locale || undefined, 'day')}
      </button>
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
    const error = this.#selectionError(next);
    if (error) {
      this.#diagnose(error);
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
    if (date) this.#activateDate(date, event.detail === 0 ? 'keyboard' : 'pointer', event);
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
    this.requestUpdate();
    return true;
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
    if (this.calendarAdapter.compare(display, this.#displayed) !== 0)
      this.#requestDisplayedMonth(display, sourceEvent);
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
      const locale = new Intl.Locale(this.locale || navigator.language);
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

  #intervalCaption(months: readonly string[]): string {
    return months
      .map((month) => this.calendarAdapter.format(month, this.locale || undefined, 'month'))
      .join(' – ');
  }

  #navigationLabel(direction: 'previous' | 'next'): string {
    const target = this.calendarAdapter.addMonths(
      this.#displayed,
      direction === 'previous' ? -this.#navigationStep() : this.#navigationStep(),
    );
    return `${direction === 'previous' ? 'Previous' : 'Next'} ${this.calendarAdapter.format(target, this.locale || undefined, 'month')}`;
  }

  #configurationError(): string | null {
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
    return this.#selectionError(this.#selection);
  }

  #selectionError(value: CalendarValue): string | null {
    const dates = calendarValueDates(this.selectionMode, value, this.calendarAdapter);
    if (dates.some((date) => !this.#isDateSelectable(date)))
      return 'Calendar selection contains an excluded date.';
    if (this.selectionMode === 'multiple') {
      if (dates.length < this.minimumSelectionCount || dates.length > this.maximumSelectionCount)
        return 'Calendar selection violates its count limits.';
    }
    if (this.selectionMode === 'range' && isCalendarRange(value) && value.to) {
      const nights = this.calendarAdapter.differenceInDays(value.to, value.from);
      if (nights < this.minimumNights || nights > this.maximumNights)
        return 'Calendar range violates its night limits.';
    }
    return null;
  }

  #syncFormState(): void {
    const error = this.#configurationError();
    const anchor = this.associationTarget() ?? undefined;
    const dates = calendarValueDates(this.selectionMode, this.#selection, this.calendarAdapter);
    if (error) this.setValidity({ customError: true }, error, anchor);
    else if (this.required && !dates.length)
      this.setValidity({ valueMissing: true }, 'Select a date.', anchor);
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
    return [...this.renderRoot.querySelectorAll<HTMLButtonElement>('button.day')];
  }

  #dayButton(date: string): HTMLButtonElement | null {
    return (
      this.#dayButtons().find((button) => button.dataset.date === date && !button.disabled) ?? null
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

export { TpQuestionnaire } from './questionnaire/index.js';
export type {
  QuestionnaireItemChangeDetail,
  QuestionnaireSubmitDetail,
} from './questionnaire/index.js';
