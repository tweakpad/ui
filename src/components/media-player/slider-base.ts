import { css, html, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpValueChangeEvent, TpValueCommitEvent } from '../../foundation/events.js';
import type { Orientation, ChangeReason } from '../../foundation/types.js';
import { sliderRatio } from '../../foundation/slider.js';
import { setPartComposition } from '../../presentation/controller.js';
import { TpSlider } from '../slider/slider.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import type {
  SliderBufferedRange,
  SliderPointerChangeDetail,
  SliderSegment,
  SliderValue,
} from '../slider/types.js';
import { TpMediaElement, type MediaPlayerApi } from './context.js';

/** Slider parts forwarded from the composed `tp-slider` (Library mp-l-sliders). */
export const MEDIA_SLIDER_EXPORTPARTS =
  'slider, slider-track, slider-range, slider-buffer, slider-chapter, slider-thumb';

/** What a media slider binding hands to the composed Slider on every update. */
export interface MediaSliderConfig {
  readonly minimum: number;
  readonly maximum: number;
  readonly step: number;
  readonly largeStep: number;
  /** The displayed value (media state, or the interaction value while pressed). */
  readonly value: number;
  /** Accessible label (`aria-label` of the Slider; no visible label part). */
  readonly label: string;
  /** `aria-valuetext` for a value. */
  readonly valueText: (value: number) => string;
  readonly indeterminateText: string;
  readonly buffered: readonly SliderBufferedRange[];
  readonly segments: readonly SliderSegment[];
  readonly orientation: Orientation;
  /** Forced direction of the Slider only (the time slider stays chronological LTR). */
  readonly direction?: 'ltr' | 'rtl' | undefined;
  /** Adjustment disabled (the indeterminate state is derived by Slider from the bounds). */
  readonly disabled: boolean;
  /** Fill percentage published as `--tp-media-slider-fill` (`null`: the value's position). */
  readonly fill?: number | null | undefined;
  /** Buffer percentage published as `--tp-media-slider-buffer` (`null`: not published). */
  readonly buffer?: number | null | undefined;
}

const percent = (fraction: number): string =>
  `${Number((Math.min(1, Math.max(0, fraction)) * 100).toFixed(4))}%`;

/**
 * Shared binding of a media slider to the composed `tp-slider` (Library mp-l-sliders,
 * `sec-148` mp-slider-media):
 *
 * - the Slider is controlled, not form-associated, and labelled without a visible label part;
 * - Slider `tp-value-change`/`tp-value-commit` are re-emitted from the media host (cancelable
 *   change proposals stay cancelable: canceling the re-emitted proposal cancels the Slider's);
 * - a primary press holds a `drag` controls lock until the pointer is released or capture is
 *   lost, and the press does not reach the gesture surface;
 * - the host publishes `--tp-media-slider-fill`, `--tp-media-slider-pointer` and (time only)
 *   `--tp-media-slider-buffer`, plus `data-dragging`, `data-pointing`, `data-interactive` and
 *   `data-orientation`; availability markers come from `TpMediaElement`.
 *
 * Subclasses supply `sliderConfig()` and react to accepted changes and commits.
 */
export abstract class MediaSliderElement extends TpMediaElement {
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpSlider];
  }
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        position: relative;
        min-inline-size: 0;
      }

      /* The composed Slider paints its own disabled state; do not dim twice. */
      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }

      :host([orientation='vertical']) {
        display: inline-block;
        block-size: 100%;
      }

      tp-slider {
        inline-size: 100%;
      }

      :host([orientation='vertical']) tp-slider {
        block-size: 100%;
      }
    `,
  ];

  #press:
    | { release: () => void; player: MediaPlayerApi; window: Window; cleanup: () => void }
    | undefined;
  #dragging = false;
  #focused = false;
  #pointerRatio = 0;
  #provided: number | undefined;
  #config: MediaSliderConfig | undefined;
  #composition: object | undefined;

  constructor() {
    super();
    // Capture: the press (and its lock) starts before the Slider proposes the pressed value.
    this.addEventListener('pointerdown', this.#pointerDown, true);
    // Bubble: the press never reaches the container's gesture surface.
    this.addEventListener('pointerdown', (event) => event.stopPropagation());
    this.addEventListener('focusin', () => this.#focus(true));
    this.addEventListener('focusout', () => this.#focus(false));
  }

  /** The composed Slider (inside this element's shadow root). */
  get slider(): TpSlider | null {
    return this.renderRoot?.querySelector?.<TpSlider>('tp-slider') ?? null;
  }

  /** A primary press is in progress (the controls lock is held). */
  get pressed(): boolean {
    return this.#press !== undefined;
  }

  /** A drag is in progress. */
  get dragging(): boolean {
    return this.#dragging;
  }

  /** The pointer is over the track without dragging. */
  get pointing(): boolean {
    return this.slider?.pointing ?? false;
  }

  /** The hovered value while pointing (unsnapped), else `null`. */
  get pointerValue(): number | null {
    return this.slider?.pointerValue ?? null;
  }

  /** The current Slider configuration. */
  protected abstract sliderConfig(): MediaSliderConfig;

  /** An accepted value proposal (keyboard, track press, drag, wheel or input). */
  protected valueChanged(value: number, reason: ChangeReason, source: Event): void {
    void value;
    void reason;
    void source;
  }

  /** A committed value (key press, release after a press or drag). */
  protected valueCommitted(value: number, reason: ChangeReason, source: Event): void {
    void value;
    void reason;
    void source;
  }

  /** A press started (`dragging` turns true on the first drag change). */
  protected pressStarted(): void {}

  /** The press ended or was lost; also runs on disconnection during a press. */
  protected pressEnded(wasDragging: boolean): void {
    void wasDragging;
  }

  override disconnectedCallback(): void {
    this.#endPress();
    super.disconnectedCallback();
  }

  protected override render() {
    const config = (this.#config = this.sliderConfig());
    return html`<tp-slider
        exportparts=${MEDIA_SLIDER_EXPORTPARTS}
        dir=${config.direction ?? nothing}
        orientation=${config.orientation}
        variant="bar"
        aria-label=${config.label}
        .formAssociatedValue=${false}
        .minimum=${config.minimum}
        .maximum=${config.maximum}
        .step=${config.step}
        .largeStep=${config.largeStep}
        .disabled=${config.disabled}
        .indeterminateText=${config.indeterminateText}
        .buffered=${config.buffered}
        .segments=${config.segments}
        .getAccessibleLabel=${this.#label}
        .getAccessibleValueText=${this.#valueText}
        @tp-value-change=${this.#change}
        @tp-value-commit=${this.#commit}
        @tp-slider-pointer-change=${this.#pointer}
      ></tp-slider
      ><slot></slot>`;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const config = this.#config;
    const slider = this.slider;
    if (!config || !slider) return;
    // Controlled: hand the Slider the displayed value only when it changed, so an unchanged
    // render never republishes (and never disturbs a pending interaction proposal).
    if (!Object.is(this.#provided, config.value)) {
      this.#provided = config.value;
      slider.value = config.value;
    }
    if (this.#composition !== this.partPresentation) {
      this.#composition = this.partPresentation;
      setPartComposition(slider, this, this.partPresentation);
    }
    const ratio = (value: number) => sliderRatio(value, config.minimum, config.maximum);
    const fill = config.fill ?? ratio(config.value) * 100;
    this.style.setProperty('--tp-media-slider-fill', percent(fill / 100));
    this.style.setProperty('--tp-media-slider-pointer', percent(this.#pointerRatio));
    if (config.buffer === undefined || config.buffer === null)
      this.style.removeProperty('--tp-media-slider-buffer');
    else this.style.setProperty('--tp-media-slider-buffer', percent(config.buffer / 100));
    const pointing = slider.pointing;
    this.toggleAttribute('data-dragging', this.#dragging);
    this.toggleAttribute('data-pointing', pointing);
    this.toggleAttribute(
      'data-interactive',
      this.#press !== undefined || this.#dragging || pointing || this.#focused,
    );
    this.setAttribute('data-orientation', config.orientation);
  }

  #label = (): string => this.#config?.label ?? '';

  #valueText = (_formatted: string, value: number): string =>
    this.#config?.valueText(value) ?? String(value);

  #ratioOf(value: number): number {
    const config = this.#config;
    return config ? sliderRatio(value, config.minimum, config.maximum) : 0;
  }

  /** Re-emits the Slider's proposal from this host; accepting it sets the controlled value. */
  #change = (event: TpValueChangeEvent<SliderValue | undefined>): void => {
    if (event.target !== this.slider) return;
    event.stopPropagation();
    const { value, previousValue, reason, sourceEvent, metadata } = event.detail;
    if (typeof value !== 'number') return;
    const proposal = new TpValueChangeEvent<number>(
      value,
      typeof previousValue === 'number' ? previousValue : value,
      reason,
      sourceEvent,
      metadata ? { metadata } : {},
    );
    this.dispatchEvent(proposal);
    if (proposal.defaultPrevented || proposal.detail.cancelled) {
      event.preventDefault();
      return;
    }
    const slider = this.slider!;
    this.#provided = value;
    slider.value = value;
    this.#pointerRatio = this.#ratioOf(value);
    if (reason === 'drag' && this.#press && !this.#dragging) this.#dragging = true;
    this.valueChanged(value, reason, sourceEvent);
    this.requestUpdate();
  };

  #commit = (event: TpValueCommitEvent<SliderValue | undefined>): void => {
    if (event.target !== this.slider) return;
    event.stopPropagation();
    const { value, previousValue, reason, sourceEvent, metadata } = event.detail;
    if (typeof value !== 'number') return;
    this.dispatchEvent(
      new TpValueCommitEvent<number>(
        value,
        typeof previousValue === 'number' ? previousValue : value,
        reason,
        sourceEvent,
        metadata ? { metadata } : {},
      ),
    );
    this.valueCommitted(value, reason, sourceEvent);
    this.requestUpdate();
  };

  #pointer = (event: CustomEvent<SliderPointerChangeDetail>): void => {
    if (event.detail.ratio !== null) this.#pointerRatio = event.detail.ratio;
    this.requestUpdate();
  };

  #focus(focused: boolean): void {
    if (this.#focused === focused) return;
    this.#focused = focused;
    this.requestUpdate();
  }

  /**
   * A primary press on the Slider holds a `drag` controls lock until release or lost capture.
   */
  #pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    const player = this.player;
    const slider = this.slider;
    if (!player || !slider || this.#press || this.#config?.disabled || slider.indeterminate) return;
    const window = this.ownerDocument.defaultView;
    if (!window) return;
    // Bubble-phase listeners run after the Slider's own release on its root, so its commit (the
    // seek) is proposed before the press ends and the displayed value returns to the playhead.
    // A capture listener plus microtask ran before that release under real input, and the commit
    // then saw no change and seeking never happened.
    const end = (pointerEvent: Event) => {
      if ((pointerEvent as PointerEvent).pointerId !== event.pointerId) return;
      this.#endPress();
    };
    const types = ['pointerup', 'pointercancel', 'lostpointercapture'] as const;
    for (const type of types) {
      this.addEventListener(type, end);
      window.addEventListener(type, end);
    }
    this.#press = {
      player,
      window,
      release: player.requestControlsLock('drag'),
      cleanup: () => {
        for (const type of types) {
          this.removeEventListener(type, end);
          window.removeEventListener(type, end);
        }
      },
    };
    this.pressStarted();
    this.requestUpdate();
  };

  #endPress(): void {
    const press = this.#press;
    if (!press) return;
    this.#press = undefined;
    press.cleanup();
    press.release();
    const wasDragging = this.#dragging;
    this.#dragging = false;
    this.pressEnded(wasDragging);
    if (this.isConnected) this.requestUpdate();
  }
}
