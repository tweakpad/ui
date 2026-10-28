import { css, html, nothing } from 'lit';
import { defaultTrue } from '../../foundation/converters.js';
import type { PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TpElement } from '../../foundation/element.js';
import { observeSubtree } from '../../foundation/observation.js';
import { resolveLocale } from '../../foundation/services.js';
import {
  defaultDescriptionPattern,
  formatPattern,
  formatTime,
  refreshDelay,
  type TimeFormatContext,
  type TimeFormatOptions,
  type TimeHourCycle,
  type TimeMessages,
  type TimeMode,
  type TimePreset,
  type TimePresentationKind,
  type TimeRounding,
  type TimeStyle,
  type TimeTense,
  type TimeUnit,
} from '../../foundation/time/format.js';
import {
  durationMilliseconds,
  parseDuration,
  resolveTime,
  type ResolvedTime,
  type TimeInput,
} from '../../foundation/time/parse.js';
import { TimeRefreshScheduler, type TimeRefreshTarget } from '../../foundation/time/scheduler.js';

import { timePresentation } from '../../presentation/families/time.js';
import { TpTooltip } from '../tooltip/tooltip.js';
import { DescriptionTooltipController } from '../shared/description-tooltip.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export type TimeUpdateInterval = 'auto' | 'none' | number;
export interface TimeUpdateDetail {
  text: string;
  previousText: string;
  value: ResolvedTime | null;
}

const defaultDescription = 'dd/MM/yy HH:mm';
const updateIntervalConverter = {
  fromAttribute(value: string | null): TimeUpdateInterval {
    if (value === null || value === 'auto') return 'auto';
    if (value === 'none') return 'none';
    const milliseconds = Number(value);
    return Number.isFinite(milliseconds) && milliseconds > 0 ? milliseconds : 'auto';
  },
};

/** Duration text in milliseconds, or the fallback when it cannot be read. */
function durationOption(text: string, fallback: number): number {
  const duration = parseDuration(text);
  return duration && !duration.years && !duration.months
    ? durationMilliseconds(duration)
    : fallback;
}

/**
 * One date, time or duration on a native time element, as relative ("5 minutes ago"), calendar
 * ("Yesterday at 16:20"), absolute or duration text. Relative text refreshes on one shared timer
 * when it can next change, and a tooltip shows the full date and time.
 *
 * @slot - The value as text, read when `datetime` is unset, so server-rendered dates upgrade in place; text it cannot read is shown unchanged.
 * @fires tp-time-update - The presented text changed after the first render; `detail` holds `text`, `previousText` and the resolved `value`.
 */
export class TpTime extends TpElement implements TimeRefreshTarget {
  static tagName = 'tp-time';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip];
  }
  static override presentation = timePresentation;
  static override properties = {
    ...TpElement.properties,
    datetime: {},
    strict: { type: Boolean },
    mode: { type: String, reflect: true },
    threshold: { type: String },
    preset: { type: String },
    pattern: { type: String },
    format: { attribute: false },
    formatter: { attribute: false },
    relativeStyle: { type: String, attribute: 'relative-style' },
    numeric: { type: String },
    tense: { type: String },
    precision: { type: String },
    rounding: { type: String },
    nowThreshold: { type: String, attribute: 'now-threshold' },
    locale: { type: String },
    timeZone: { type: String, attribute: 'time-zone' },
    hourCycle: { type: String, attribute: 'hour-cycle' },
    updateInterval: { attribute: 'update-interval', converter: updateIntervalConverter },
    now: { attribute: false },
    messages: { attribute: false },
    tooltip: { converter: defaultTrue },
    tooltipPattern: { type: String, attribute: 'tooltip-pattern' },
    tooltipFormatter: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline;
        color: inherit;
        font: inherit;
      }

      time {
        font-variant-numeric: tabular-nums;
        white-space: nowrap;
      }

      time[tabindex] {
        border-radius: var(--tp-radius-sm);
        cursor: default;
      }

      time[tabindex]:focus-visible {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: var(--tp-ring-offset);
      }
    `,
  ];

  /** The value: a `Date`, an epoch number, or ISO or duration text; the element's text is read when it is unset. */
  datetime: TimeInput = undefined;
  /** Rejects text that only the browser's lenient date parser can read. */
  strict = false;
  /** How the value is presented: `auto` is relative within `threshold` and absolute beyond it. */
  mode: TimeMode = 'auto';
  /** How far from now, as an ISO duration, `auto` stays relative. */
  threshold = 'P30D';
  /** A named, locale-aware absolute format. */
  preset: TimePreset = 'datetime';
  /** An exact absolute layout in Unicode date-field symbols, such as `yyyy-MM-dd`; quote literal words. */
  pattern = '';
  /** Date and time format options for absolute text, used when there is no `pattern`. */
  format: Intl.DateTimeFormatOptions | undefined;
  /** Returns the absolute text itself, ahead of `pattern`, `format` and `preset`. */
  formatter: ((context: TimeFormatContext) => string) | undefined;
  /** The length of relative and duration text; shorter forms keep the long one for assistive technology. */
  relativeStyle: TimeStyle = 'long';
  /** `always` writes counts ("1 day ago") where the locale would say "yesterday". */
  numeric: 'auto' | 'always' = 'auto';
  /** Clamps values on the other side of now to "now", such as a server clock running slightly ahead. */
  tense: TimeTense = 'auto';
  /** The smallest unit relative and duration text shows, which also sets how often it refreshes. */
  precision: TimeUnit = 'second';
  /** Whether relative counts round down or to the nearest unit. */
  rounding: TimeRounding = 'floor';
  /** How close to now, as an ISO duration, a value reads as "now". */
  nowThreshold = 'PT10S';
  /** The formatting locale, in place of the nearest `lang`. */
  locale = '';
  /** The time zone, such as `Europe/Berlin`, for instants and calendar days; the browser's zone by default. */
  timeZone = '';
  /** Forces a 12- or 24-hour clock in place of the locale's. */
  hourCycle: TimeHourCycle | '' = '';
  /** When the text refreshes: `auto` when it can next change, `none` never, or every given number of milliseconds. */
  updateInterval: TimeUpdateInterval = 'auto';
  /** A fixed reference instant in place of the current time, which stops the refresh. */
  now: TimeInput = undefined;
  /** Calendar and week phrases, such as `today: 'Hoy a las {time}'`; missing entries keep the defaults. */
  messages: Partial<TimeMessages> = {};
  /** Shows the full date and time in a tooltip and makes the value focusable; `tooltip="false"` removes both. */
  tooltip = true;
  /** The tooltip's layout in Unicode date-field symbols. */
  tooltipPattern = defaultDescription;
  /** Returns the tooltip's text itself. */
  tooltipFormatter: ((context: TimeFormatContext) => string) | undefined;

  #scheduler: TimeRefreshScheduler | undefined;
  #releaseScheduler: (() => void) | undefined;
  #releaseContent: (() => void) | undefined;
  readonly #descriptionTooltip = new DescriptionTooltipController(this, 'time-description');
  #value: ResolvedTime | null = null;
  #text = '';
  #accessibleText = '';
  #description = '';
  #presentation: TimePresentationKind | 'invalid' = 'invalid';
  #nextChange: number | undefined;
  #rendered = false;

  /** The resolved value, or null when the input cannot be resolved. */
  get value(): ResolvedTime | null {
    return this.#value;
  }
  /** The currently presented text. */
  get text(): string {
    return this.#text;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const owner = this.ownerDocument.defaultView;
    if (owner) {
      this.#scheduler = TimeRefreshScheduler.for(owner);
      this.#releaseScheduler = this.#scheduler.register(this);
    }
    this.#releaseContent = observeSubtree(
      this,
      () => {
        if (this.datetime === undefined || this.datetime === null) this.requestUpdate();
      },
      { content: true, attributes: false },
    );
    // Reconnection resumes refresh, tooltip registration and current text.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#releaseScheduler?.();
    this.#releaseScheduler = undefined;
    this.#releaseContent?.();
    this.#releaseContent = undefined;
    super.disconnectedCallback();
  }

  /** Updates the text against the current time now, outside the shared refresh. */
  refreshTime(): void {
    this.requestUpdate();
  }

  #reference(): number {
    if (this.now !== undefined && this.now !== null) {
      const fixed = resolveTime(this.now);
      if (fixed?.kind === 'instant') return fixed.instant!;
    }
    return this.#scheduler?.now() ?? Date.now();
  }

  #options(): TimeFormatOptions {
    return {
      locale: this.locale || resolveLocale(this),
      timeZone: this.timeZone || undefined,
      hourCycle: this.hourCycle || undefined,
      mode: this.mode,
      threshold: durationOption(this.threshold, 30 * 86_400_000),
      preset: this.preset,
      pattern: this.pattern || undefined,
      format: this.format,
      formatter: this.formatter,
      relativeStyle: this.relativeStyle,
      numeric: this.numeric,
      tense: this.tense,
      precision: this.precision,
      rounding: this.rounding,
      nowThreshold: durationOption(this.nowThreshold, 10_000),
      messages: this.messages,
    };
  }

  #input(): TimeInput {
    if (this.datetime !== undefined && this.datetime !== null && this.datetime !== '')
      return this.datetime;
    return this.textContent?.trim() || undefined;
  }

  #diagnose(code: string, message: string): void {
    this.diagnose(code, message, { once: true, defer: true });
  }

  #present(): void {
    const input = this.#input();
    const value = resolveTime(input, { strict: this.strict });
    this.#value = value;
    this.invalid = !value && input !== undefined;
    if (!value) {
      if (input !== undefined)
        this.#diagnose('invalid-datetime', `Time cannot resolve "${String(input)}".`);
      this.#text = this.textContent?.trim() ?? '';
      this.#accessibleText = this.#text;
      this.#description = '';
      this.#presentation = 'invalid';
      this.#nextChange = undefined;
      return;
    }
    const options = this.#options();
    const reference = this.#reference();
    let result;
    try {
      result = formatTime(value, reference, options);
    } catch (error) {
      this.#diagnose('format-failed', `Time formatting failed: ${String(error)}`);
      result = formatTime(value, reference, {
        ...options,
        formatter: undefined,
        pattern: undefined,
        format: undefined,
      });
    }
    for (const diagnostic of result.diagnostics) this.#diagnose('pattern', diagnostic);
    this.#text = result.text;
    this.#accessibleText = result.accessibleText;
    this.#presentation = result.presentation;
    this.#nextChange = result.nextChange;
    this.#description = this.tooltip ? this.#describe(value, reference, options) : '';
  }

  #describe(value: ResolvedTime, reference: number, options: TimeFormatOptions): string {
    try {
      if (this.tooltipFormatter)
        return this.tooltipFormatter({
          value,
          date: value.instant !== undefined ? new Date(value.instant) : null,
          reference,
          locale: options.locale,
          timeZone: options.timeZone,
        });
      const diagnostics: string[] = [];
      if (value.kind === 'duration' || value.kind === 'week') return '';
      const pattern =
        this.tooltipPattern === defaultDescription
          ? defaultDescriptionPattern(value)
          : this.tooltipPattern;
      if (!pattern) return '';
      const text = formatPattern(value, pattern, options, diagnostics);
      for (const diagnostic of diagnostics) this.#diagnose('tooltip-pattern', diagnostic);
      return text;
    } catch (error) {
      this.#diagnose('tooltip-failed', `Time description failed: ${String(error)}`);
      return '';
    }
  }

  get #describing(): boolean {
    return Boolean(this.#description) && this.#description !== this.#text;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const previous = this.#text;
    this.#present();
    if (this.#rendered && previous !== this.#text)
      queueMicrotask(() =>
        this.emit<TimeUpdateDetail>('tp-time-update', {
          text: this.#text,
          previousText: previous,
          value: this.#value,
        }),
      );
    this.#rendered = true;
  }

  protected override render() {
    const valid = this.#value !== null;
    const abbreviated = valid && this.#accessibleText !== this.#text;
    const describing = this.#describing;
    const content = !valid
      ? html`<slot></slot>`
      : abbreviated
        ? html`<span aria-hidden="true">${this.#text}</span
            ><span class="visually-hidden">${this.#accessibleText}</span>`
        : this.#text;
    return html`${this.renderPart(
      'time-value',
      { kind: this.#value?.kind ?? 'invalid', presentation: this.#presentation, invalid: !valid },
      {
        tag: 'time',
        properties: {
          part: describing ? 'time-value focusable' : 'time-value',
          class: 'value',
          datetime: this.#value?.machine || nothing,
          lang: this.locale || nothing,
          tabindex: describing ? '0' : nothing,
          'data-presentation': this.#presentation,
          'data-kind': this.#value?.kind ?? nothing,
        },
        content,
      },
    )}${describing ? html`<tp-tooltip ${ref(this.#descriptionTooltip.reference)} .content=${() => this.#description}></tp-tooltip>` : nothing}`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.setAttribute('data-presentation', this.#presentation);
    this.#schedule();
    this.#descriptionTooltip.sync(
      this.#describing
        ? (this.renderRoot.querySelector<HTMLElement>('[part~="time-value"]') ?? undefined)
        : undefined,
    );
  }

  #schedule(): void {
    const scheduler = this.#scheduler;
    if (!scheduler || !this.isConnected) return;
    const fixedReference = this.now !== undefined && this.now !== null;
    let delay: number | undefined;
    if (this.#value && !fixedReference && this.updateInterval !== 'none')
      delay =
        typeof this.updateInterval === 'number'
          ? Math.max(1000, this.updateInterval)
          : refreshDelay(this.#nextChange);
    if (delay === undefined) scheduler.cancel(this);
    else scheduler.schedule(this, delay);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-time': TpTime;
  }
}
