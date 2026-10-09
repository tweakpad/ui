import { css, type PropertyDeclarations, type PropertyValues } from 'lit';
import { nearestOwner } from '../../foundation/portal-ownership.js';
import type { MediaMessagesResolver } from '../../foundation/media/messages.js';
import { formatMediaPercent } from '../../foundation/media/messages.js';
import type { ChangeReason, Orientation } from '../../foundation/types.js';
import { MediaSliderElement, type MediaSliderConfig } from './slider-base.js';

/** Volume (0–1) as the 0–100 slider value. */
export function volumeSliderValue(volume: number): number {
  return Number.isFinite(volume) ? Math.min(100, Math.max(0, volume * 100)) : 0;
}

/** Muted, or audible at zero volume: the fill is drawn at zero. */
export function volumeEffectivelyMuted(state: { volume: number; muted: boolean }): boolean {
  return state.muted || state.volume <= 0;
}

/** `aria-valuetext`: the localized percent, or `mutedValue({percent})` when muted. */
export function volumeSliderValueText(
  value: number,
  muted: boolean,
  messages: Pick<MediaMessagesResolver, 'get'>,
  locale?: string | string[],
): string {
  const percent = formatMediaPercent(value / 100, locale);
  return muted ? messages.get('mutedValue', { percent }) : messages.get('volumeValue', { percent });
}

/** The value after one wheel notch: up (negative `deltaY`) raises, down lowers; clamped. */
export function wheelSteppedValue(value: number, deltaY: number, wheelStep: number): number {
  const direction = Math.sign(deltaY);
  if (!direction || !(wheelStep > 0)) return value;
  return Math.min(100, Math.max(0, value - direction * wheelStep));
}

/**
 * `tp-media-volume-slider`: volume control composing `tp-slider` (Library mp-l-volume-slider).
 *
 * - Range 0–100 with `step` 5, `large-step` 10 and `wheel-step` 5 (the wheel proposes through
 *   the Slider with reason `wheel`). Every accepted change requests `set-volume` live with the
 *   change reason.
 * - The value is the volume; the fill is drawn at zero while muted (or at zero volume), and
 *   the host carries `data-muted`.
 * - Label `volume`; value text the localized percent, or `mutedValue` while muted.
 * - Hidden when volume is unsupported; disabled (focusable Slider semantics) while unavailable.
 * - `orientation` defaults to `vertical` inside `tp-media-volume-popover` and to `horizontal`
 *   elsewhere; an authored orientation wins.
 *
 * @fires tp-value-change - Re-emitted cancelable Slider proposal (`detail.value` 0–100).
 * @fires tp-value-commit - Re-emitted Slider commit.
 * @csspart slider - Forwarded Slider root; also `slider-track`, `slider-range` and `slider-thumb`.
 */
export class TpMediaVolumeSlider extends MediaSliderElement {
  static tagName = 'tp-media-volume-slider';

  static override properties: PropertyDeclarations = {
    ...MediaSliderElement.properties,
    step: { type: Number },
    largeStep: { type: Number, attribute: 'large-step' },
    wheelStep: { type: Number, attribute: 'wheel-step' },
  };

  static override styles = [
    ...MediaSliderElement.styles,
    css`
      /* Muted: the fill is drawn at zero while the value keeps the volume. */
      :host([data-muted]) tp-slider::part(slider-range) {
        visibility: hidden;
      }
    `,
  ];

  /** Arrow-key step (percent). */
  step = 5;
  /** Page Up/Down and Shift+Arrow step (percent). */
  largeStep = 10;
  /** Wheel step (percent). */
  wheelStep = 5;

  readonly #volume = this.select((state) => ({
    volume: state.volume,
    muted: state.muted,
    volumeAvailability: state.volumeAvailability,
  }));
  #orientationAuthored = false;
  #applyingOrientation = false;

  constructor() {
    super();
    this.addEventListener('wheel', this.#wheel, { passive: false });
  }

  override connectedCallback(): void {
    // Before the first update the attribute is authored, not reflected.
    if (!this.hasUpdated && this.hasAttribute('orientation')) this.#orientationAuthored = true;
    super.connectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (changed.has('orientation') && this.hasUpdated && !this.#applyingOrientation)
      this.#orientationAuthored = true;
    if (!this.#orientationAuthored) {
      const inPopover =
        nearestOwner(this, (node) => (node as Element).localName === 'tp-media-volume-popover') !==
        null;
      const orientation: Orientation = inPopover ? 'vertical' : 'horizontal';
      if (orientation !== this.orientation) {
        this.#applyingOrientation = true;
        this.orientation = orientation;
        this.#applyingOrientation = false;
      }
    }
    super.willUpdate(changed);
    this.controlAvailability(this.#volume.value.volumeAvailability);
  }

  protected sliderConfig(): MediaSliderConfig {
    const state = this.#volume.value;
    const muted = volumeEffectivelyMuted(state);
    const messages = this.mediaMessages;
    const locale = this.mediaLocale;
    const value = volumeSliderValue(state.volume);
    return {
      minimum: 0,
      maximum: 100,
      step: Number.isFinite(this.step) && this.step > 0 ? this.step : 5,
      largeStep: Number.isFinite(this.largeStep) && this.largeStep > 0 ? this.largeStep : 10,
      value,
      label: messages.get('volume'),
      valueText: (current) => volumeSliderValueText(current, muted, messages, locale),
      indeterminateText: '',
      buffered: [],
      segments: [],
      orientation: this.orientation,
      disabled: this.availability?.disabled ?? true,
      fill: muted ? 0 : value,
      buffer: null,
    };
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    this.toggleAttribute('data-muted', volumeEffectivelyMuted(this.#volume.value));
  }

  protected override valueChanged(value: number, reason: ChangeReason, source: Event): void {
    this.request('set-volume', value / 100, { reason, sourceEvent: source }).catch(() => undefined);
  }

  /** One wheel notch proposes `wheel-step` through the Slider (reason `wheel`). */
  #wheel = (event: WheelEvent): void => {
    const slider = this.slider;
    if (!slider || this.availability?.disabled !== false || slider.indeterminate) return;
    const current = typeof slider.value === 'number' ? slider.value : 0;
    const next = wheelSteppedValue(current, event.deltaY, this.wheelStep);
    if (next === current && Math.sign(event.deltaY) !== 0) {
      event.preventDefault();
      return;
    }
    if (!Math.sign(event.deltaY)) return;
    event.preventDefault();
    slider.setValue(next, 'wheel', event);
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-media-volume-slider': TpMediaVolumeSlider;
  }
}
