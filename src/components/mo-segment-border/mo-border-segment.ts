import { css, nothing, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { moSegmentBorderPresentation } from '../../presentation/families/mo-segment-border.js';

/** Segment border's hook for a segment that changed: it collects its segments again. */
export const segmentChanged = Symbol('tp-mo-border-segment-notify');

interface SegmentOwner {
  [segmentChanged]?(): void;
}

/** A bare number of milliseconds becomes a CSS time; anything else is passed to CSS as written. */
const time = (value: string | null | undefined) => {
  const text = (value ?? '').trim();
  return /^-?\d*\.?\d+$/.test(text) ? `${text}ms` : text;
};

/**
 * One piece of a Segment border's line: a stretch from a start to an end that moves through its
 * `draw` states with its own timing, plain or glowing. It renders nothing itself; the Segment
 * border it is a child of draws it.
 *
 * @cssprop --tp-mo-border-segment-duration - Time of the whole run of states. Default `var(--tp-duration-slow)`.
 * @cssprop --tp-mo-border-segment-delay - Wait before the run. Default `0s`.
 * @cssprop --tp-mo-border-segment-easing - Easing of each step between two states. Default `var(--tp-easing-standard)`.
 * @cssprop --tp-mo-border-segment-color - Color of a plain segment. Default `var(--tp-primary)`.
 * @cssprop --tp-mo-border-segment-width - Width of a plain segment. Default the line width.
 * @cssprop --tp-mo-border-segment-cap - Line cap of a plain segment: `butt` or `round`. Default `butt`.
 */
export class TpMoBorderSegment extends TpElement {
  static tagName = 'tp-mo-border-segment';
  static override presentation = moSegmentBorderPresentation;
  static override properties = {
    ...TpElement.properties,
    draw: { type: String },
    leave: { type: String },
    duration: { type: String },
    delay: { type: String },
    easing: { type: String },
    repeat: { type: String },
    alternate: { type: Boolean },
    glow: { type: Boolean },
    origin: { type: String },
  };
  static override styles = [
    TpElement.styles,
    css`
      /* The timing probe: the transition resolves the attributes and the custom properties to
         computed times and an easing, which the Segment border reads. */
      :host {
        display: none !important;
        transition: --_tp-mo-border-segment-run
          calc(
            var(
                --_tp-mo-border-segment-duration,
                var(--tp-mo-border-segment-duration, var(--tp-duration-slow))
              ) *
              var(--tp-motion-scale, 1)
          )
          var(
            --_tp-mo-border-segment-easing,
            var(--tp-mo-border-segment-easing, var(--tp-easing-standard))
          )
          var(--_tp-mo-border-segment-delay, var(--tp-mo-border-segment-delay, 0s));
      }
    `,
  ];

  /**
   * The states the segment moves through, comma-separated: each `start end`, or a single `end`
   * starting at 0, in percent of the border or pixels. Below 0% or past 100% it wraps through the
   * origin. Unset, `0% 0%, 0% 100%`.
   */
  draw = '';
  /** The states it runs from where it is when its trigger turns off; unset, it plays backwards. */
  leave = '';
  /** Time of the whole run: a CSS time, a number of milliseconds, or a `var()`. */
  duration = '';
  /** Wait before the run: a CSS time, a number of milliseconds, or a `var()`. */
  delay = '';
  /** Easing of each step between two states. */
  easing = '';
  /** Repeats after the first run: a number, or `infinite`. */
  repeat = '';
  /** Every other repeat runs backwards. */
  alternate = false;
  /** Draws the segment as glow, in the Segment border's glow colors, instead of a plain line. */
  glow = false;
  /**
   * Where 0% sits on the border: `top-left` (default), `top`, `top-right`, `right`,
   * `bottom-right`, `bottom`, `bottom-left`, `left`, or a percentage. Percentages run clockwise.
   */
  origin = '';

  override connectedCallback(): void {
    super.connectedCallback();
    this.#notify();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const values = {
      duration: time(this.duration),
      delay: time(this.delay),
      easing: this.easing.trim(),
    };
    for (const [name, value] of Object.entries(values)) {
      if (value) this.style.setProperty(`--_tp-mo-border-segment-${name}`, value);
      else this.style.removeProperty(`--_tp-mo-border-segment-${name}`);
    }
    this.#notify();
  }

  protected override render() {
    return nothing;
  }

  #notify(): void {
    (this.parentElement as (HTMLElement & SegmentOwner) | null)?.[segmentChanged]?.();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-border-segment': TpMoBorderSegment;
  }
}
