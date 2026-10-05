import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { TpElement } from '../../foundation/element.js';
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
import type { TpTooltip } from '../tooltip/tooltip.js';

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

/** A native time element presenting one date, time, or duration with optional full description. */
export class TpTime extends TpElement implements TimeRefreshTarget {
  static tagName = 'tp-time';
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
    tooltip: { converter: { fromAttribute: (value: string | null) => value !== 'false' } },
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

  /** Instant object, epoch number, or text; light-DOM text is read when unset. */
  datetime: TimeInput = undefined;
  strict = false;
  mode: TimeMode = 'auto';
  threshold = 'P30D';
  preset: TimePreset = 'datetime';
  pattern = '';
  format: Intl.DateTimeFormatOptions | undefined;
  formatter: ((context: TimeFormatContext) => string) | undefined;
  relativeStyle: TimeStyle = 'long';
  numeric: 'auto' | 'always' = 'auto';
  tense: TimeTense = 'auto';
  precision: TimeUnit = 'second';
  rounding: TimeRounding = 'floor';
  nowThreshold = 'PT10S';
  locale = '';
  timeZone = '';
  hourCycle: TimeHourCycle | '' = '';
  updateInterval: TimeUpdateInterval = 'auto';
  /** Fixed reference instant; disables automatic refresh. */
  now: TimeInput = undefined;
  messages: Partial<TimeMessages> = {};
  tooltip = true;
  tooltipPattern = defaultDescription;
  tooltipFormatter: ((context: TimeFormatContext) => string) | undefined;

  #scheduler: TimeRefreshScheduler | undefined;
  #releaseScheduler: (() => void) | undefined;
  #observer: MutationObserver | undefined;
  #tooltip: TpTooltip | undefined;
  #tooltipTarget: HTMLElement | undefined;
  #releaseTrigger: (() => void) | undefined;
  #releaseDescriptionPart: (() => void) | undefined;
  #descriptionPopup: HTMLElement | undefined;
  #reported = new Set<string>();
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
      this.#observer = new owner.MutationObserver(() => {
        if (this.datetime === undefined || this.datetime === null) this.requestUpdate();
      });
      this.#observer.observe(this, { childList: true, characterData: true, subtree: true });
    }
    // Reconnection resumes refresh, tooltip registration and current text.
    if (this.hasUpdated) this.requestUpdate();
  }

  override disconnectedCallback(): void {
    this.#releaseScheduler?.();
    this.#releaseScheduler = undefined;
    this.#observer?.disconnect();
    this.#observer = undefined;
    this.#releaseTrigger?.();
    this.#releaseTrigger = undefined;
    this.#tooltipTarget = undefined;
    this.#releaseDescriptionPart?.();
    this.#releaseDescriptionPart = undefined;
    this.#descriptionPopup = undefined;
    super.disconnectedCallback();
  }

  /** Re-render against the current reference time. */
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
    const key = `${code}:${message}`;
    if (this.#reported.has(key)) return;
    this.#reported.add(key);
    queueMicrotask(() => this.emit('tp-diagnostic', { code, message }));
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
          tabindex: describing ? '0' : nothing,
          'data-presentation': this.#presentation,
          'data-kind': this.#value?.kind ?? nothing,
        },
        content,
      },
    )}${describing ? html`<tp-tooltip ${ref(this.#tooltipReference)} .content=${() => this.#description}></tp-tooltip>` : nothing}`;
  }

  readonly #tooltipReference = (element: Element | undefined): void => {
    this.#tooltip = element as TpTooltip | undefined;
  };

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.setAttribute('data-presentation', this.#presentation);
    this.#schedule();
    this.#bindTooltip();
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

  #bindTooltip(): void {
    const target = this.#describing
      ? (this.renderRoot.querySelector<HTMLElement>('[part~="time-value"]') ?? undefined)
      : undefined;
    const tooltip = this.#describing ? this.#tooltip : undefined;
    if (target !== this.#tooltipTarget || !tooltip) {
      this.#releaseTrigger?.();
      this.#releaseTrigger = undefined;
      this.#tooltipTarget = undefined;
      if (tooltip && target) {
        this.#tooltipTarget = target;
        this.#releaseTrigger = tooltip.registerTrigger(target);
      }
    }
    if (!tooltip) {
      this.#releaseDescriptionPart?.();
      this.#releaseDescriptionPart = undefined;
      this.#descriptionPopup = undefined;
      return;
    }
    void tooltip.updateComplete.then(() => {
      const popup = tooltip.popupElement ?? undefined;
      if (!this.isConnected || !popup || popup === this.#descriptionPopup) return;
      this.#releaseDescriptionPart?.();
      this.#descriptionPopup = popup;
      this.#releaseDescriptionPart = this.presentationController.registerPart(
        'time-description',
        popup,
      );
    });
  }
}
