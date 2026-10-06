import { css, html, nothing, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpMediaElement } from './context.js';
import { applyMediaMarkers } from './media-button.js';
import { MediaPreviewController } from './preview.js';
import {
  initialMediaTimeShown,
  mediaTimeDuration,
  mediaTimeLabel,
  mediaTimeToggleText,
  mediaTimeView,
  nextMediaTimeShown,
  normalizeMediaTimeType,
  type MediaTimeShown,
  type MediaTimeType,
  type MediaTimeView,
} from './time-state.js';
import { TpButton } from '../button.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

/**
 * The time a `type="pointer"` display shows: its own `value`, else the preview source's pointer
 * time, else `null` (unknown).
 */
export function mediaPointerTime(
  value: number | null | undefined,
  previewTime: number | null | undefined,
): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  return typeof previewTime === 'number' && Number.isFinite(previewTime) ? previewTime : null;
}

const numberOrNull = {
  fromAttribute(value: string | null): number | null {
    if (value === null || value.trim() === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
  },
  toAttribute(value: number | null): string | null {
    return value === null ? null : String(value);
  },
};

/**
 * `tp-media-time`: current, duration, remaining or pointer time (Library mp-l-time).
 *
 * - Renders a native `<time datetime="PT…S">` (part `time`) with digital clock text (the duration is
 *   the layout guide) and tabular numerals. Remaining time renders `negative-sign` in an
 *   `aria-hidden` part. There is no live region.
 * - The accessible name is the `currentTime`, `duration` or `remainingTime` message, or
 *   `timeUnknown` before a time range exists.
 * - `toggle` composes a ghost `tp-button` that switches current ↔ remaining (`type="current"`) or
 *   duration ↔ remaining (`type="duration"`, or `type="remaining"`, which starts on remaining),
 *   as Video.js does. Its name is `showRemaining`/`showElapsed`/`showDuration` with the spoken
 *   value and its suffix (`elapsedSuffix`, `remainingSuffix`, `durationSuffix`); its
 *   `aria-description` is `toggleTimeDescription` (current) or `toggleDurationDescription`.
 * - `value` (seconds, property or attribute) replaces the media position for `current` and
 *   `remaining`, and supplies the time for `type="pointer"`. Without `value`, a pointer time
 *   reads the nearest preview source (`tp-media-time-slider-preview` or `tp-media-time-slider`,
 *   through `MediaPreviewController`); with neither it is unknown.
 * - Markers: `data-type` (the type shown), `data-negative`, `data-unavailable`, `data-toggle`.
 *
 * @csspart time - The native `<time>` element.
 * @csspart sign - The remaining-time sign (`aria-hidden`).
 * @csspart value - The clock text.
 * @csspart button - The toggle's native control (toggle mode).
 */
export class TpMediaTime extends TpMediaElement {
  static tagName = 'tp-media-time';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpButton];
  }

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    type: { type: String, reflect: true },
    toggle: { type: Boolean, reflect: true },
    negativeSign: { type: String, attribute: 'negative-sign' },
    value: { attribute: 'value', converter: numberOrNull },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        align-items: center;
        vertical-align: middle;
        white-space: nowrap;
      }

      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }

      time {
        display: inline-flex;
        align-items: baseline;
      }

      [part~='sign'][hidden] {
        display: none;
      }
    `,
  ];

  /** `current`, `duration`, `remaining`, or `pointer` (inside a time-slider preview). */
  type: MediaTimeType = 'current';
  /** Render a button that switches between elapsed (or duration) and remaining time. */
  toggle = false;
  /** Sign rendered before remaining time (`aria-hidden`). */
  negativeSign = '-';
  /** Seconds that replace the media position (`current`, `remaining`) or give the pointer time. */
  value: number | null = null;

  readonly #time = this.select((state) => ({
    currentTime: state.currentTime,
    duration: state.duration,
    seekable: state.seekable,
  }));
  /** Created on first use as `type="pointer"`; other types never follow a preview source. */
  #preview: MediaPreviewController | undefined;
  #shown: MediaTimeShown = 'current';
  #view: MediaTimeView | undefined;
  #markers = new Set<string>();

  /** The type currently shown (a toggle may show `remaining` for `type="current"`). */
  get shown(): MediaTimeShown {
    return this.#shown;
  }

  /** The current clock text, phrase and `datetime`. */
  get timeView(): MediaTimeView | undefined {
    return this.#view;
  }

  /** Switches a toggle between its two types (no-op without `toggle` or a time range). */
  toggleShown(): void {
    if (!this.toggle || this.#view?.unavailable) return;
    this.#shown = nextMediaTimeShown(this.#resolvedType(), this.#shown);
    this.requestUpdate();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    const type = this.#resolvedType();
    if (changed.has('type') || changed.has('toggle') || !this.hasUpdated)
      this.#shown = initialMediaTimeShown(type);
    const time = this.#time.value;
    if (type === 'pointer') this.#preview ??= new MediaPreviewController(this);
    this.#view = mediaTimeView({
      type: type === 'pointer' ? 'pointer' : this.#shown,
      duration: mediaTimeDuration(time),
      currentTime: time.currentTime,
      value: type === 'pointer' ? mediaPointerTime(this.value, this.#preview?.time) : this.value,
      locale: this.mediaLocale,
    });
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const view = this.#view;
    if (!view) return;
    this.#markers = applyMediaMarkers(
      this,
      {
        'data-type': this.#resolvedType() === 'pointer' ? 'pointer' : this.#shown,
        'data-negative': view.negative,
        'data-unavailable': view.unavailable,
        'data-toggle': this.#toggleActive(),
      },
      this.#markers,
    );
  }

  /** Toggle mode: focus goes to the composed Button's control. */
  override focus(options?: FocusOptions): void {
    const button = this.renderRoot.querySelector<HTMLElement>('tp-button');
    if (button) button.focus(options);
    else super.focus(options);
  }

  override blur(): void {
    const button = this.renderRoot.querySelector<HTMLElement>('tp-button');
    if (button) button.blur();
    else super.blur();
  }

  protected override render() {
    const view = this.#view;
    if (!view) return nothing;
    const type = this.#resolvedType();
    if (!this.#toggleActive())
      return this.#renderTime(
        view,
        type === 'pointer' ? null : mediaTimeLabel(type, view, this.mediaMessages),
      );
    const text = mediaTimeToggleText(type, this.#shown, view, this.mediaMessages);
    const contracts = {
      ...this.partContracts,
      button: {
        ...this.partContracts['button'],
        hostProperties: {
          ...this.partContracts['button']?.hostProperties,
          'aria-description': text.description,
        },
      },
    };
    return html`<tp-button
      exportparts="button"
      variant="ghost"
      .focusableWhenDisabled=${true}
      .disabled=${view.unavailable || this.mediaDisabled}
      .ariaLabel=${text.label}
      .partContracts=${contracts}
      @click=${this.#click}
      >${this.#renderTime(view, null)}</tp-button
    >`;
  }

  #renderTime(view: MediaTimeView, label: string | null) {
    return html`<time
      part="time"
      datetime=${view.unavailable ? nothing : view.datetime}
      aria-label=${label ?? nothing}
      ><span part="sign" aria-hidden="true" ?hidden=${!view.negative}
        >${view.negative ? this.negativeSign : ''}</span
      ><span part="value">${view.text}</span></time
    >`;
  }

  #resolvedType(): MediaTimeType {
    return normalizeMediaTimeType(this.type);
  }

  #toggleActive(): boolean {
    const type = this.#resolvedType();
    return this.toggle && type !== 'pointer';
  }

  #click = (event: MouseEvent): void => {
    if (event.defaultPrevented || this.mediaDisabled) return;
    this.toggleShown();
  };
}
