import { svg, type PropertyValues } from 'lit';
import { ringSamples } from '../../foundation/border-ring/ring-samples.js';
import {
  prepareMotion,
  resolvesReducedMotion,
  stateRole,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { moSegmentBorderPresentation } from '../../presentation/families/mo-segment-border.js';
import { SurfaceBorderElement, type SurfaceBorderGeometry } from '../shared/surface-border.js';
import { segmentChanged, TpMoBorderSegment } from './mo-border-segment.js';
import { BorderSegments, spanDash } from './segments.js';
import { lightSpans } from './spans.js';
import { moSegmentBorderStyles } from './styles.js';

export type SegmentBorderTrigger = 'none' | 'always' | 'hover' | 'focus';

export const moSegmentBorderMotionRoles = {
  segments: stateRole('segments'),
} as const satisfies Record<string, MotionRoleDefinition>;

const TRIGGERS: readonly SegmentBorderTrigger[] = ['none', 'always', 'hover', 'focus'];

/**
 * Replaces the border of the surface it wraps with a line at the same place, radius and width,
 * and draws its `tp-mo-border-segment` children over it: pieces of the line that move through
 * their states while the trigger is on and back when it turns off, each with its own timing,
 * plain or glowing. The surface keeps its size, focus ring and behavior; the drawing is hidden
 * from assistive technology and lets pointer events through.
 *
 * @slot - One surface (a Card, Button, Input, Text area, Select, Input group, Toggle or any element), and the `tp-mo-border-segment` children that describe the pieces.
 * @csspart mo-segment-border-ring - The drawing over the surface border, hidden from assistive technology.
 * @csspart mo-segment-border-focus - The focus ring, outside the border, while keyboard focus is inside and the effect does not show it.
 * @csspart mo-segment-border-line - The border line under the segments.
 * @csspart mo-segment-border-glow - The canvas of the glowing segments.
 * @csspart mo-segment-border-bloom - The canvas of the blurred light around the glowing segments.
 * @cssprop --tp-mo-segment-border-color - Color of the line under the segments; `transparent` leaves only the segments. Default `var(--tp-border)`.
 * @cssprop --tp-mo-segment-border-width - Line width. Default the surface's border width.
 * @cssprop --tp-mo-segment-border-radius - Corner radius without a surface child. Default `var(--tp-radius-lg)`.
 * @cssprop --tp-mo-segment-border-glow-colors - Colors of glowing segments, spread evenly around the border, each blending into the next along the hue circle. Default the theme's sky, violet and pink chart colors (`--tp-chart-2`, `--tp-chart-1`, `--tp-chart-5`).
 * @cssprop --tp-mo-segment-border-glow-angle - Where the first glow color sits, 0deg at the top and clockwise. Default `315deg` (the top-left corner).
 * @cssprop --tp-mo-segment-border-glow-core - The color glowing segments turn toward at their ends. Default white on dark color schemes, none on light ones.
 * @cssprop --tp-mo-segment-border-glow-intensity - Glow opacity, 0 to 1. Default `1`.
 * @cssprop --tp-mo-segment-border-glow-spread - Width of the bloom around glowing segments. Default `12px`.
 */
export class TpMoSegmentBorder extends SurfaceBorderElement {
  static tagName = 'tp-mo-segment-border';
  static override presentation = moSegmentBorderPresentation;
  static override properties = {
    ...SurfaceBorderElement.properties,
    trigger: { type: String },
  };
  static override styles = [...SurfaceBorderElement.styles, moSegmentBorderStyles];

  /**
   * When the segments play: `hover` (default), `focus` (while focus is inside), `always` (once the
   * border is in view) or `none` (they rest at their first state).
   */
  trigger: SegmentBorderTrigger | '' = '';

  protected readonly parts = {
    ring: 'mo-segment-border-ring',
    focus: 'mo-segment-border-focus',
    line: 'mo-segment-border-line',
    glow: 'mo-segment-border-glow',
    bloom: 'mo-segment-border-bloom',
  };
  readonly #segments = new BorderSegments(this, (code, message) =>
    this.diagnose(code, message, { once: true, defer: true }),
  );
  /** `always` plays once the border has been in view. */
  #seen = false;
  #on = false;
  #motion: MotionHandle | null = null;

  protected get glows(): boolean {
    return this.#segments.hasGlow;
  }

  get #trigger(): SegmentBorderTrigger {
    return (TRIGGERS as readonly string[]).includes(this.trigger)
      ? (this.trigger as SegmentBorderTrigger)
      : 'hover';
  }

  /** Whether the trigger has the segments on now. */
  get #active(): boolean {
    switch (this.#trigger) {
      case 'always':
        return this.#seen;
      case 'hover':
        return this.hovered;
      case 'focus':
        return this.focused;
      default:
        return false;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#segments.collect();
  }

  override disconnectedCallback(): void {
    this.#segments.set(false, true);
    this.#on = false;
    this.#seen = false;
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('trigger')) this.triggerChanged();
  }

  /** With `trigger="focus"` the segments themselves show focus. */
  protected override effectShowsFocus(): boolean {
    return this.#trigger === 'focus';
  }

  protected override describesDrawing(element: Element): boolean {
    return element.matches(TpMoBorderSegment.tagName);
  }

  protected override ringContent(d: string) {
    return this.#segments.plainStyles.map(
      (look) =>
        svg`<path part="mo-segment-border-segment-line" class="segment" d=${d} pathLength="1" style=${look} visibility="hidden"></path>`,
    );
  }

  protected override geometryChanged(geometry: SurfaceBorderGeometry): void {
    this.#segments.setGeometry(
      ringSamples(geometry.box, geometry.stroke / 2),
      geometry.box.width,
      geometry.box.height,
    );
  }

  protected override childrenChanged(): void {
    this.#collect();
  }

  /** @internal A segment child changed (CL Segment border `mbs-segments`). */
  [segmentChanged](): void {
    this.#collect();
  }

  /**
   * Plays the segments forward or back as their trigger turns on or off (the `segments` role);
   * under reduced motion or a claimed driver they jump.
   */
  protected triggerChanged(): void {
    if (!this.isConnected) return;
    if (this.inView) this.#seen = true;
    this.#changed(false);
  }

  /** Draws every segment where it is now: plain ones as dashes on their lines, glowing ones as glow. */
  protected step(elapsed: number): boolean {
    const moving = this.#segments.step(elapsed);
    const perimeter = this.#segments.perimeter;
    const { plain, glow } = this.#segments.spans();
    const lines = this.renderRoot.querySelectorAll<SVGPathElement>('path.segment');
    plain.forEach((span, index) => {
      const line = lines[index];
      if (!line) return;
      const dash = spanDash(span, perimeter);
      line.setAttribute('visibility', dash ? 'visible' : 'hidden');
      if (!dash) return;
      line.setAttribute('stroke-dasharray', dash.dasharray);
      line.setAttribute('stroke-dashoffset', dash.dashoffset);
    });
    const renderer = this.renderer;
    if (renderer) {
      const look = glow.length ? this.glowLook() : null;
      renderer.paint(
        look
          ? { light: (field, samples) => lightSpans(field, samples, glow), rotation: 0, level: 1 }
          : null,
        look,
      );
    }
    return moving;
  }

  #collect(): void {
    if (!this.isConnected) return;
    if (this.#segments.collect()) this.requestUpdate();
    const geometry = this.geometry;
    if (geometry) this.geometryChanged(geometry);
    this.#changed(true);
  }

  /** `refreshed` re-applies the current state to segments that were just read again. */
  #changed(refreshed: boolean): void {
    const on = this.#active;
    if (on !== this.#on) {
      this.#motion = prepareMotion(this, this, moSegmentBorderMotionRoles.segments, {
        phase: 'change',
        fromState: on ? 'rest' : 'active',
        toState: on ? 'active' : 'rest',
        context: { count: this.#segments.count },
      });
      this.#motion.start();
      this.#on = on;
      this.#segments.retime();
      this.#segments.set(on, this.#held());
    } else if (refreshed) this.#segments.set(on, this.#held());
    this.wake();
  }

  #held(): boolean {
    return Boolean(this.#motion?.claimed) || resolvesReducedMotion(this);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-segment-border': TpMoSegmentBorder;
  }
}
