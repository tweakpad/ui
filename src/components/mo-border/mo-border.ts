import { html, nothing, svg, type PropertyValues } from 'lit';
import { numberOrNull } from '../../foundation/converters.js';
import { TpElement } from '../../foundation/element.js';
import { frameLoopFor, type FrameSubscription } from '../../foundation/frame-loop.js';
import { scheduleLayoutPass } from '../../foundation/layout-batch.js';
import {
  ambientRole,
  cssTimeMs,
  prepareMotion,
  resolvesReducedMotion,
  stateRole,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { parseEasing, type EasingFunction } from '../../foundation/motion-easing.js';
import { observeIntersection, observeResize } from '../../foundation/observation.js';
import { observePointerPosition, type PointerPoint } from '../../foundation/pointer-position.js';
import { registerProperty } from '../../foundation/register-property.js';
import { RevealMembership, type RevealMember } from '../../foundation/reveal-coordination.js';
import {
  RevealPlayback,
  revealsImmediately,
  StandaloneReveal,
  transitionSpan,
} from '../../foundation/reveal-playback.js';
import { SpringFollower2D } from '../../foundation/spring-follower.js';
import { moBorderPresentation } from '../../presentation/families/mo-border.js';
import { Fade } from './fade.js';
import { GlowRenderer, type GlowLook } from './glow-renderer.js';
import { cometHeads, cometTail, type LightSources } from './light-field.js';
import { segmentChanged } from './mo-border-segment.js';
import { splitColorList } from './palette.js';
import { fitDashPattern, ringPath } from './ring-path.js';
import { ringSamples } from './ring-samples.js';
import { BorderSegments, spanDash } from './segments.js';
import { moBorderStyles } from './styles.js';
import { BorderSurface, type SurfaceGeometry } from './surface.js';

export type BorderEffect = 'glow' | 'dash' | 'segments';
export type BorderTrigger = 'none' | 'always' | 'hover' | 'focus' | 'pointer';
export type BorderGlowMotion = 'comets' | 'sweep' | 'pulse' | 'glint';
export type BorderDashMotion = 'march' | 'breathe' | 'draw';
export type BorderRotation = 'cw' | 'ccw';

export const moBorderMotionRoles = {
  loop: ambientRole('loop'),
  reveal: stateRole('reveal'),
  segments: stateRole('segments'),
} as const satisfies Record<string, MotionRoleDefinition>;

const TRIGGERS: readonly BorderTrigger[] = ['none', 'always', 'hover', 'focus', 'pointer'];
const GLOW_MOTIONS: readonly BorderGlowMotion[] = ['comets', 'sweep', 'pulse', 'glint'];
const DASH_MOTIONS: readonly BorderDashMotion[] = ['march', 'breathe', 'draw'];
/** Share of a lap the glint takes to cross; it rests for the rest. */
const GLINT_SHARE = 0.45;
/** Half width of the glint band, as a share of the crossing. */
const GLINT_HALF = 0.16;
/** The glow's look, resolved by the stylesheet into values the script reads. */
const LOOK = {
  colors: '--_tp-mo-border-colors',
  core: '--_tp-mo-border-core',
  angle: '--_tp-mo-border-angle',
  intensity: '--_tp-mo-border-intensity',
  fill: '--_tp-mo-border-fill',
  spread: '--_tp-mo-border-spread',
  tail: '--_tp-mo-border-tail',
} as const;

// Values the script reads resolve wherever they are set: lengths to pixels, colors to colors.
registerProperty({
  name: '--tp-mo-border-width',
  syntax: '<length> | auto',
  inherits: true,
  initialValue: 'auto',
});
registerProperty({
  name: '--tp-mo-border-dash',
  syntax: '<length>',
  inherits: true,
  initialValue: '6px',
});
registerProperty({
  name: '--tp-mo-border-gap',
  syntax: '<length>',
  inherits: true,
  initialValue: '4px',
});
registerProperty({
  name: '--tp-mo-border-dash-to',
  syntax: '<length>',
  inherits: true,
  initialValue: '2px',
});
registerProperty({
  name: LOOK.colors,
  syntax: '<color>#',
  inherits: false,
  initialValue: 'transparent',
});
registerProperty({
  name: LOOK.core,
  syntax: '<color>',
  inherits: false,
  initialValue: 'transparent',
});
registerProperty({ name: LOOK.angle, syntax: '<angle>', inherits: false, initialValue: '0deg' });
registerProperty({ name: LOOK.intensity, syntax: '<number>', inherits: false, initialValue: '1' });
registerProperty({ name: LOOK.fill, syntax: '<number>', inherits: false, initialValue: '0' });
registerProperty({ name: LOOK.tail, syntax: '<number>', inherits: false, initialValue: '0.22' });
registerProperty({
  name: LOOK.spread,
  syntax: '<length>',
  inherits: false,
  initialValue: '12px',
});
// Animated on the draw mask: a number, so it interpolates; not inherited.
registerProperty({
  name: '--_tp-mo-border-drawn',
  syntax: '<number>',
  inherits: false,
  initialValue: '0',
});

const tokens = <T extends string>(value: string | null | undefined, allowed: readonly T[]): T[] => {
  const list = (value ?? '').split(/\s+/);
  return allowed.filter((token) => list.includes(token));
};

interface Geometry extends SurfaceGeometry {
  readonly stroke: number;
  readonly spread: number;
  readonly dash: number;
  readonly gap: number;
  readonly dashTo: number;
}

interface Timing {
  readonly lap: number;
  readonly pause: number;
  readonly lapEasing: EasingFunction;
  readonly fade: number;
  readonly fadeEasing: EasingFunction;
  readonly fadeOutDelay: number;
}

/**
 * Replaces the border of the surface it wraps with a drawn one at the same place, radius and
 * width: either a glow, colored around the border from a list of colors and lit by a light that
 * follows the pointer, a point or an element, or by comets, a sweep, a pulse or a glint; or dashes
 * that march, breathe or draw the border in. `trigger` decides when it shows and moves. The surface
 * keeps its size, focus ring and behavior; the drawing is hidden from assistive technology and lets
 * pointer events through. Inside a Scroll trigger the trigger decides when the draw plays.
 *
 * @slot - One surface: a Card, Button, Input, Text area, Select, Input group, Toggle or any element.
 * @fires tp-reveal-change - `{ revealed, effect }` when the draw starts, hides or a repeat resets it.
 * @fires tp-reveal-change-complete - `{ revealed }` after the draw settles.
 * @cssprop --tp-mo-border-color - Line color. Default `var(--tp-border)`.
 * @cssprop --tp-mo-border-width - Line width. Default the surface's border width.
 * @cssprop --tp-mo-border-radius - Corner radius without a surface child. Default `var(--tp-radius-lg)`.
 * @cssprop --tp-mo-border-glow-colors - The glow's colors, spread evenly around the border, each blending into the next along the hue circle and the last back into the first. Default the theme's sky, violet and pink chart colors (`--tp-chart-2`, `--tp-chart-1`, `--tp-chart-5`).
 * @cssprop --tp-mo-border-glow-angle - Where the first color sits, 0deg at the top and clockwise. Default `315deg` (the top-left corner).
 * @cssprop --tp-mo-border-glow-core - The color the glow turns toward where the light is hottest. Default white on dark color schemes, none on light ones.
 * @cssprop --tp-mo-border-glow-intensity - Glow opacity, 0 to 1. Default `1`.
 * @cssprop --tp-mo-border-glow-spread - Width of the bloom around the lit line. Default `12px`.
 * @cssprop --tp-mo-border-glow-fill - Opacity of the pointer light's wash over the surface. Default `0`.
 * @cssprop --tp-mo-border-light-length - Length of a comet's tail, as a fraction of the border. Default `0.22`.
 * @cssprop --tp-mo-border-loop-duration - Time of one lap: a comet's round, a sweep's turn, a breath or a glint's pass. Default eight times `var(--tp-duration-normal)`.
 * @cssprop --tp-mo-border-loop-delay - Pause between laps, with the glow faded out. Default `0s`.
 * @cssprop --tp-mo-border-loop-easing - Easing of each lap. Default `linear`.
 * @cssprop --tp-mo-border-fade-duration - Time of the glow's fade in and out. Default `var(--tp-duration-normal)`.
 * @cssprop --tp-mo-border-fade-easing - Easing of the fade. Default `var(--tp-easing-standard)`.
 * @cssprop --tp-mo-border-fade-out-delay - Wait before fading out; fading in never waits. Default `var(--tp-duration-fast)`.
 * @cssprop --tp-mo-border-dash - Dash length. Default `6px`.
 * @cssprop --tp-mo-border-gap - Gap between dashes. Default `4px`.
 * @cssprop --tp-mo-border-dash-to - Dash length that breathing alternates with. Default `2px`.
 * @cssprop --tp-mo-border-march-duration - Time for the dashes to move one dash and gap. Default `var(--tp-duration-slow)`.
 * @cssprop --tp-mo-border-breathe-duration - Time of one breath of the dashes. Default eight times `var(--tp-duration-normal)`.
 * @cssprop --tp-mo-border-draw-duration - Draw duration. Default `var(--tp-duration-slow)`.
 * @cssprop --tp-mo-border-draw-easing - Draw easing. Default `var(--tp-easing-enter)`.
 */
export class TpMoBorder extends TpElement {
  static tagName = 'tp-mo-border';
  static override presentation = moBorderPresentation;
  static override properties = {
    ...TpElement.properties,
    effect: { type: String },
    trigger: { type: String },
    motion: { type: String },
    lights: { type: Number },
    lightSpacing: { converter: numberOrNull, attribute: 'light-spacing' },
    rotation: { type: String, reflect: true },
    trackPoint: { attribute: false },
    trackTarget: { type: String, attribute: 'track-target' },
    trackReach: { type: Number, attribute: 'track-reach' },
    revealRepeat: { type: Boolean, attribute: 'reveal-repeat', reflect: true },
    revealHold: { type: Boolean, attribute: 'reveal-hold', reflect: true },
  };
  static override styles = [TpElement.styles, moBorderStyles];

  /**
   * The effect drawn on the border: `glow` or `dash`, never both. Unset, `dash` when `motion`
   * names only dash motions, and `glow` otherwise.
   */
  effect: BorderEffect | '' = '';
  /**
   * When the effect shows and moves: `none`, `always`, `hover`, `focus` (while focus is inside)
   * or `pointer` (lit by the pointer, `track-target` or `trackPoint`). Unset, `always` for dashes
   * and for a named glow motion, and `pointer` otherwise.
   */
  trigger: BorderTrigger | '' = '';
  /**
   * Motions: for the glow, tokens of `comets`, `sweep`, `pulse` and `glint` (default `comets`),
   * which combine; for dashes, tokens of `march`, `breathe` and `draw` (default `march`).
   */
  motion = '';
  /** Number of comets. */
  lights = 2;
  /** Distance between consecutive comets, as a fraction of the border; even when unset. */
  lightSpacing: number | null = null;
  /** Which way comets, the sweep, the glint and marching dashes go: `cw` or `ccw`. */
  rotation: BorderRotation = 'cw';
  /** A point in viewport pixels that lights the border instead of the pointer. */
  trackPoint: PointerPoint | null = null;
  /** The id of an element whose center lights the border instead of the pointer. */
  trackTarget = '';
  /** Distance in pixels at which the tracked light fades to nothing. */
  trackReach = 160;
  /** Draws again on every viewport entry. */
  revealRepeat = false;
  /** A ready draw waits until cleared; set on a drawn border, it draws the border out. */
  revealHold = false;

  readonly #surface = new BorderSurface(this, () => this.refresh());
  #geometry: Geometry | null = null;
  #path = '';
  #releaseResize: (() => void)[] = [];
  #observed: Element | null = null;
  #releaseIntersection: (() => void) | null = null;
  #releasePointer: (() => void) | null = null;
  #pointer: PointerPoint | null = null;
  readonly #follower = new SpringFollower2D();
  /** The tracked light is within reach of the line. */
  #lit = false;
  #hovered = false;
  #focused = false;
  #frame: FrameSubscription | null = null;
  #loop: MotionHandle | null = null;
  #looping = '';
  #renderer: GlowRenderer | null = null;
  readonly #fade = new Fade();
  #timing: Timing | null = null;
  /** Milliseconds the loop has run; it advances only while the glow shows. */
  #clock = 0;
  readonly #geometryPass = {};
  readonly #trackPass = {};
  readonly #segments = new BorderSegments(this, (code, message) =>
    this.diagnose(code, message, { once: true, defer: true }),
  );
  /** Segments with trigger `always` play once the border has been in view. */
  #seen = false;
  #segmentsOn = false;
  #segmentsMotion: MotionHandle | null = null;

  /** Whether the draw has played. */
  get revealed(): boolean {
    return this.#playback.revealed;
  }

  get #effect(): BorderEffect {
    if (this.effect === 'glow' || this.effect === 'dash' || this.effect === 'segments')
      return this.effect;
    // Segment children ask for segments.
    if (this.#segments.present) return 'segments';
    // Naming only dash motions asks for dashes.
    const dash = tokens(this.motion, DASH_MOTIONS).length > 0;
    return dash && !tokens(this.motion, GLOW_MOTIONS).length ? 'dash' : 'glow';
  }

  get #trigger(): BorderTrigger {
    if ((TRIGGERS as readonly string[]).includes(this.trigger))
      return this.trigger as BorderTrigger;
    // Segments answer the pointer; a named glow motion plays on its own; a bare glow follows the
    // pointer.
    if (this.#effect === 'segments') return 'hover';
    if (this.#effect === 'dash' || tokens(this.motion, GLOW_MOTIONS).length) return 'always';
    return 'pointer';
  }

  get #glowMotions(): BorderGlowMotion[] {
    if (this.#effect !== 'glow') return [];
    const motions = tokens(this.motion, GLOW_MOTIONS);
    return motions.length ? motions : ['comets'];
  }

  get #dashMotions(): BorderDashMotion[] {
    if (this.#effect !== 'dash') return [];
    const motions = tokens(this.motion, DASH_MOTIONS);
    return motions.length ? motions : ['march'];
  }

  get #comets(): number {
    return Math.max(1, Math.floor(Number(this.lights) || 0));
  }

  /** The draw plays as a reveal (on entering the view, or from a coordinator). */
  get #revealing(): boolean {
    return this.#dashMotions.includes('draw') && this.#trigger === 'always';
  }

  /** The glow's motions run from the trigger rather than from a tracked light. */
  get #looped(): boolean {
    const trigger = this.#trigger;
    return (
      this.#effect === 'glow' &&
      (trigger === 'always' || trigger === 'hover' || trigger === 'focus')
    );
  }

  /** Whether the trigger has the glow on now. */
  get #on(): boolean {
    if (this.#effect !== 'glow') return false;
    switch (this.#trigger) {
      case 'always':
        return true;
      case 'hover':
        return this.#hovered;
      case 'focus':
        return this.#focused;
      case 'pointer':
        return this.#lit;
      default:
        return false;
    }
  }

  /** Measures the surface again (after a change the element cannot observe). */
  refresh(): void {
    if (!this.isConnected) return;
    if (this.#surface.resolve()) this.#observeBoundary();
    scheduleLayoutPass(this.#geometryPass, {
      active: () => this.isConnected,
      measure: () => this.#measure(),
      apply: (geometry) => this.#apply(geometry),
    });
  }

  override connectedCallback(): void {
    super.connectedCallback();
    this.#membership.connect();
    this.#releaseResize.push(observeResize(this, () => this.refresh()));
    this.#releaseIntersection = observeIntersection(
      this,
      (entry) => {
        this.toggleAttribute('data-tp-offscreen', !entry.isIntersecting);
        if (entry.isIntersecting && !this.#seen) {
          this.#seen = true;
          if (this.#effect === 'segments' && this.#trigger === 'always') this.#triggerChanged();
        }
        this.#syncTracking();
        this.#wake();
      },
      { rootMargin: '25%' },
    );
    this.#frame = frameLoopFor(this.ownerDocument.defaultView!).subscribe((elapsed, now) =>
      this.#step(elapsed, now),
    );
    this.addEventListener('pointerenter', this.#hover);
    this.addEventListener('pointerleave', this.#hover);
    this.addEventListener('focusin', this.#focus);
    this.addEventListener('focusout', this.#focus);
    this.#hovered = this.matches(':hover');
    this.#focused = this.matches(':focus-within');
    this.#renderer?.connect();
    this.#segments.collect();
    this.refresh();
    void this.updateComplete.then(() => {
      this.#syncLoop();
      this.#triggerChanged();
    });
  }

  override disconnectedCallback(): void {
    this.#standalone.release();
    this.#membership.disconnect();
    this.#surface.release();
    for (const release of this.#releaseResize) release();
    this.#releaseResize = [];
    this.#observed = null;
    this.#releaseIntersection?.();
    this.#releaseIntersection = null;
    this.#releasePointer?.();
    this.#releasePointer = null;
    this.#frame?.release();
    this.#frame = null;
    this.#loop?.cancel();
    this.#loop = null;
    this.#looping = '';
    this.removeEventListener('pointerenter', this.#hover);
    this.removeEventListener('pointerleave', this.#hover);
    this.removeEventListener('focusin', this.#focus);
    this.removeEventListener('focusout', this.#focus);
    this.#renderer?.disconnect();
    this.#fade.snap(false);
    this.#segments.set(false, true);
    this.#segmentsOn = false;
    this.#seen = false;
    super.disconnectedCallback();
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    const motions = this.#dashMotions;
    this.toggleAttribute('data-tp-march', motions.includes('march'));
    this.toggleAttribute('data-tp-breathe', motions.includes('breathe'));
    this.toggleAttribute('data-tp-draw', motions.includes('draw'));
    this.setAttribute('data-effect', this.#effect);
    this.setAttribute('data-trigger', this.#trigger);
    if ((changed.has('motion') || changed.has('effect')) && this.#effect !== 'segments') {
      const other = this.#effect === 'glow' ? DASH_MOTIONS : GLOW_MOTIONS;
      const ignored = tokens(this.motion, other as readonly string[]);
      if (ignored.length)
        this.diagnose(
          'mo-border-motion-ignored',
          `Motion "${ignored.join(' ')}" does not apply to the ${this.#effect} effect.`,
          { once: true, defer: true },
        );
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncRenderer();
    // Holding a drawn border again draws it out.
    if (changed.has('revealHold') && this.revealHold && this.#playback.revealed)
      void this.#playback.hide();
    if (
      changed.has('revealHold') ||
      changed.has('revealRepeat') ||
      changed.has('effect') ||
      changed.has('motion') ||
      changed.has('trigger')
    )
      this.#revealChanged();
    if (
      changed.has('effect') ||
      changed.has('trigger') ||
      changed.has('trackPoint') ||
      changed.has('trackTarget') ||
      changed.has('trackReach')
    )
      this.#syncTracking();
    if (changed.has('effect') || changed.has('motion') || changed.has('trigger')) {
      this.#syncLoop();
      this.#triggerChanged();
    }
    if (changed.has('motion') || changed.has('effect')) this.refresh();
    this.#wake();
  }

  protected override render() {
    const geometry = this.#geometry;
    const d = this.#path;
    const motions = this.#dashMotions;
    const dashed = motions.includes('march') || motions.includes('breathe');
    const draw = motions.includes('draw');
    const segments = this.#effect === 'segments';
    const glow = this.#effect === 'glow' || (segments && this.#segments.hasGlow);
    const style = geometry
      ? `inset-inline-start:${geometry.inlineStart}px;inset-block-start:${geometry.y}px;width:${geometry.box.width}px;height:${geometry.box.height}px`
      : 'display:none';
    const margin = this.#margin(geometry);
    const canvas = geometry
      ? `inset-inline-start:${geometry.inlineStart - margin}px;inset-block-start:${geometry.y - margin}px;width:${geometry.box.width + margin * 2}px;height:${geometry.box.height + margin * 2}px`
      : 'display:none';
    return html`<slot @slotchange=${this.#slotChanged}></slot
      ><svg part="mo-border-ring" class="ring" aria-hidden="true" focusable="false" style=${style}>
        <defs>
          ${
            draw
              ? svg`<mask id="tp-mo-border-draw" maskUnits="userSpaceOnUse" x="-50%" y="-50%" width="200%" height="200%"><path class="draw" d=${d} pathLength="1"></path></mask>`
              : nothing
          }
        </defs>
        <g class="timing"></g>
        <g mask=${draw ? 'url(#tp-mo-border-draw)' : nothing}>
          <path part="mo-border-line" class="line ${dashed ? 'dashes' : ''}" d=${d}></path>
        </g>
        ${
          segments
            ? this.#segments.plainStyles.map(
                (look) =>
                  svg`<path part="mo-border-segment-line" class="segment" d=${d} pathLength="1" style=${look} visibility="hidden"></path>`,
              )
            : nothing
        }</svg
      >${
        glow
          ? html`<canvas
                part="mo-border-bloom"
                class="bloom"
                aria-hidden="true"
                style=${canvas}
              ></canvas
              ><canvas
                part="mo-border-glow"
                class="glow"
                aria-hidden="true"
                style=${canvas}
              ></canvas>`
          : nothing
      }`;
  }

  // --- Geometry ---------------------------------------------------------------------------

  /** Room around the ring box for the bloom, in CSS pixels. */
  #margin(geometry: Geometry | null): number {
    return geometry ? Math.ceil(geometry.spread * 1.5 + geometry.stroke * 3 + 4) : 0;
  }

  #observeBoundary(): void {
    const boundary = this.#surface.boundary;
    if (boundary === this.#observed) return;
    for (const release of this.#releaseResize.splice(1)) release();
    this.#observed = boundary;
    if (boundary !== this) this.#releaseResize.push(observeResize(boundary, () => this.refresh()));
  }

  /** Layout reads only. */
  #measure(): Geometry {
    const surface = this.#surface.measure();
    const view = this.ownerDocument.defaultView!;
    const style = view.getComputedStyle(this);
    const length = (name: string) => parseFloat(style.getPropertyValue(name)) || 0;
    const width = style.getPropertyValue('--tp-mo-border-width').trim();
    const theme = length('--tp-border-width') || 1;
    return {
      ...surface,
      stroke: width && width !== 'auto' ? parseFloat(width) || 0 : surface.borderWidth || theme,
      spread: length(LOOK.spread),
      dash: length('--tp-mo-border-dash'),
      gap: length('--tp-mo-border-gap'),
      dashTo: length('--tp-mo-border-dash-to'),
    };
  }

  #apply(geometry: Geometry): void {
    this.toggleAttribute('data-tp-inline', geometry.inline);
    const path = ringPath(geometry.box, geometry.stroke / 2);
    const pattern = fitDashPattern(path.length, geometry.dash, geometry.gap);
    const scale = pattern.period / Math.max(0.5, geometry.dash + geometry.gap);
    const vars: Record<string, string> = {
      '--_tp-mo-border-w': `${geometry.stroke}px`,
      '--_tp-mo-border-dash': `${pattern.dash}px`,
      '--_tp-mo-border-period': `${pattern.period}px`,
      '--_tp-mo-border-dash-to': `${Math.min(pattern.period, geometry.dashTo * scale)}px`,
    };
    for (const [name, value] of Object.entries(vars)) this.style.setProperty(name, value);
    const previous = this.#geometry;
    this.#geometry = geometry;
    this.#timing = null;
    if (this.#effect === 'segments')
      this.#segments.setGeometry(
        ringSamples(geometry.box, geometry.stroke / 2),
        geometry.box.width,
        geometry.box.height,
      );
    if (
      path.d !== this.#path ||
      !previous ||
      previous.inlineStart !== geometry.inlineStart ||
      previous.y !== geometry.y ||
      previous.box.width !== geometry.box.width ||
      previous.box.height !== geometry.box.height ||
      previous.spread !== geometry.spread ||
      previous.stroke !== geometry.stroke
    ) {
      this.#path = path.d;
      this.#renderer?.setGeometry(
        geometry.box,
        geometry.stroke,
        geometry.spread,
        this.#margin(geometry),
      );
      this.requestUpdate();
    }
    this.#trackChanged();
    this.#wake();
  }

  // --- Glow -------------------------------------------------------------------------------

  /** Creates the renderer once the glow's canvases exist, and drops it with them. */
  #syncRenderer(): void {
    const line = this.renderRoot.querySelector<HTMLCanvasElement>('canvas.glow');
    const bloom = this.renderRoot.querySelector<HTMLCanvasElement>('canvas.bloom');
    if (!line || !bloom) {
      this.#renderer?.disconnect();
      this.#renderer = null;
      return;
    }
    if (this.#renderer) return;
    this.#renderer = new GlowRenderer(line, bloom);
    this.#renderer.connect();
    const geometry = this.#geometry;
    if (geometry)
      this.#renderer.setGeometry(
        geometry.box,
        geometry.stroke,
        geometry.spread,
        this.#margin(geometry),
      );
  }

  /** The loop and fade timings, read from the timing probe's transition lists. */
  #readTiming(): Timing {
    const view = this.ownerDocument.defaultView;
    const probe = this.renderRoot.querySelector('.timing');
    const style = view && probe ? view.getComputedStyle(probe) : null;
    const list = (value: string | undefined) => splitColorList(value ?? '');
    const [lap = '0s', fade = '0s'] = list(style?.transitionDuration);
    const [pause = '0s', outDelay = '0s'] = list(style?.transitionDelay);
    const [lapEasing = 'linear', fadeEasing = 'linear'] = list(style?.transitionTimingFunction);
    return {
      lap: Math.max(1, cssTimeMs(lap)),
      pause: Math.max(0, cssTimeMs(pause)),
      lapEasing: parseEasing(lapEasing),
      fade: Math.max(0, cssTimeMs(fade)),
      fadeEasing: parseEasing(fadeEasing),
      fadeOutDelay: Math.max(0, cssTimeMs(outDelay)),
    };
  }

  #timingNow(): Timing {
    const timing = (this.#timing ??= this.#readTiming());
    this.#fade.timing = {
      duration: timing.fade,
      easing: timing.fadeEasing,
      outDelay: timing.fadeOutDelay,
    };
    return timing;
  }

  /** The look, read from the computed style at each paint; nothing is written per frame. */
  #look(): (GlowLook & { readonly tail: number }) | null {
    const view = this.ownerDocument.defaultView;
    if (!view) return null;
    const style = view.getComputedStyle(this);
    const number = (name: string, fallback: number) => {
      const value = parseFloat(style.getPropertyValue(name));
      return Number.isFinite(value) ? value : fallback;
    };
    const clamp = (value: number) => Math.min(1, Math.max(0, value));
    return {
      colors: style.getPropertyValue(LOOK.colors),
      core: style.getPropertyValue(LOOK.core),
      angle: number(LOOK.angle, 0),
      intensity: clamp(number(LOOK.intensity, 1)),
      fill: clamp(number(LOOK.fill, 0)),
      tail: clamp(number(LOOK.tail, 0.22)),
    };
  }

  /** Turns the glow on or off from the trigger, through the fade. */
  #triggerChanged(): void {
    const view = this.ownerDocument.defaultView;
    if (!view || !this.isConnected) return;
    if (this.#effect === 'segments') {
      this.#segmentsChanged(false);
      return;
    }
    this.#timing = null;
    this.#timingNow();
    const on = this.#on;
    // A glow that comes back from dark starts its loop at the beginning.
    if (on && !this.#fade.on && this.#fade.value === 0) this.#clock = 0;
    if (resolvesReducedMotion(this)) this.#fade.snap(on);
    else this.#fade.set(on, view.performance.now());
    this.#wake();
  }

  readonly #hover = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.#hovered = event.type === 'pointerenter';
    const trigger = this.#trigger;
    if (trigger === 'hover' || (trigger === 'pointer' && this.#effect === 'segments'))
      this.#triggerChanged();
  };

  readonly #focus = (): void => {
    // Focus moving between the surface's own parts settles before the check.
    queueMicrotask(() => {
      const focused = this.matches(':focus-within');
      if (focused === this.#focused) return;
      this.#focused = focused;
      if (this.#trigger === 'focus') this.#triggerChanged();
    });
  };

  #wake(): void {
    if (this.#effect !== 'dash') this.#frame?.wake();
  }

  // --- Segments ---------------------------------------------------------------------------

  readonly #slotChanged = (): void => {
    this.refresh();
    this.#collectSegments();
  };

  /** A segment child changed (CL Border `mbs-segments`). */
  [segmentChanged](): void {
    this.#collectSegments();
  }

  #collectSegments(): void {
    if (!this.isConnected) return;
    const changed = this.#segments.collect();
    if (changed) this.requestUpdate();
    if (this.#effect === 'segments') {
      const geometry = this.#geometry;
      if (geometry)
        this.#segments.setGeometry(
          ringSamples(geometry.box, geometry.stroke / 2),
          geometry.box.width,
          geometry.box.height,
        );
      this.#segmentsChanged(true);
    }
  }

  /** Whether the trigger has the segments on now. */
  get #segmentsActive(): boolean {
    switch (this.#trigger) {
      case 'always':
        return this.#seen;
      case 'hover':
      case 'pointer':
        return this.#hovered;
      case 'focus':
        return this.#focused;
      default:
        return false;
    }
  }

  /**
   * Plays the segments forward or back as their trigger turns on or off (the `segments` role);
   * under reduced motion or a claimed driver they jump. `refreshed` re-applies the current state to
   * segments that were just read again.
   */
  #segmentsChanged(refreshed: boolean): void {
    const on = this.#segmentsActive;
    if (on !== this.#segmentsOn) {
      this.#segmentsMotion = prepareMotion(this, this, moBorderMotionRoles.segments, {
        phase: 'change',
        fromState: on ? 'rest' : 'active',
        toState: on ? 'active' : 'rest',
        context: { effect: 'segments', count: this.#segments.count },
      });
      this.#segmentsMotion.start();
      this.#segmentsOn = on;
      this.#segments.retime();
      this.#segments.set(on, this.#segmentsHeld());
    } else if (refreshed) this.#segments.set(on, this.#segmentsHeld());
    this.#wake();
  }

  #segmentsHeld(): boolean {
    return Boolean(this.#segmentsMotion?.claimed) || resolvesReducedMotion(this);
  }

  /** Draws every segment where it is now: plain ones as dashes on their lines, glowing ones as glow. */
  #stepSegments(elapsed: number): boolean {
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
    const renderer = this.#renderer;
    if (renderer) {
      const look = glow.length ? this.#look() : null;
      renderer.paint(look ? { sources: { spans: glow }, rotation: 0, level: 1 } : null, look);
    }
    return moving;
  }

  /** The glow's own animation rests under reduced motion and while a driver claims the loop. */
  #held(): boolean {
    return Boolean(this.#loop?.claimed) || resolvesReducedMotion(this);
  }

  #step(elapsed: number, now: number): boolean {
    if (!this.isConnected) return false;
    if (this.#effect === 'segments') return this.#stepSegments(elapsed);
    const renderer = this.#renderer;
    const geometry = this.#geometry;
    if (this.#effect !== 'glow' || !renderer || !geometry) return false;
    const timing = this.#timingNow();
    const offscreen = this.hasAttribute('data-tp-offscreen');
    const level = this.#fade.step(now);
    const following = this.#followTarget();
    const moving = this.#follower.step(elapsed);
    const held = this.#held();
    const looping = this.#looped && !held && !offscreen && level > 0;
    if (looping) this.#clock += elapsed;
    if (level <= 0) {
      renderer.paint(null, null);
      return this.#fade.moving || moving || following;
    }
    const look = this.#look();
    const { sources, rotation, visibility } = this.#sources(timing, held, look?.tail ?? 0.22);
    const shown = level * visibility;
    const lit = Boolean(
      sources.pointer || sources.comets || sources.glint || sources.sweep || sources.pulse,
    );
    if (shown > 0 && lit && look) renderer.paint({ sources, rotation, level: shown }, look);
    else renderer.paint(null, null);
    return this.#fade.moving || moving || following || looping;
  }

  /** The light sources at the current loop time. */
  #sources(
    timing: Timing,
    held: boolean,
    tail: number,
  ): { sources: LightSources; rotation: number; visibility: number } {
    if (this.#trigger === 'pointer') {
      const reach = Math.max(1, Number(this.trackReach) || 0);
      return {
        sources: { pointer: { x: this.#follower.x, y: this.#follower.y, reach } },
        rotation: 0,
        visibility: 1,
      };
    }
    if (!this.#looped) return { sources: {}, rotation: 0, visibility: 0 };
    // Every light shares one lap: the phase restarts each lap, so comets keep their spacing.
    let visibility = 1;
    let lapTime: number;
    if (timing.pause > 0) {
      const time = this.#clock % (timing.lap + timing.pause);
      lapTime = Math.min(time, timing.lap);
      const edge = Math.min(timing.fade, timing.lap / 4);
      visibility =
        time >= timing.lap
          ? 0
          : edge > 0
            ? Math.min(1, time / edge, (timing.lap - time) / edge)
            : 1;
    } else lapTime = this.#clock % timing.lap;
    const progress = lapTime / timing.lap;
    const phase = timing.lapEasing(progress);
    const direction: 1 | -1 = this.rotation === 'ccw' ? -1 : 1;
    const motions = this.#glowMotions;
    const sources: { -readonly [K in keyof LightSources]: LightSources[K] } = {};
    let rotation = 0;
    if (motions.includes('comets') && !held) {
      const count = this.#comets;
      sources.comets = {
        heads: cometHeads(phase * direction, count, this.lightSpacing),
        tail: cometTail(tail, count, this.lightSpacing),
        direction,
      };
    }
    if (motions.includes('glint') && !held) {
      const pass = progress / GLINT_SHARE;
      if (pass < 1)
        sources.glint = {
          center: -GLINT_HALF + timing.lapEasing(pass) * (1 + GLINT_HALF * 2),
          half: GLINT_HALF,
          direction,
        };
    }
    if (motions.includes('sweep')) {
      sources.sweep = true;
      rotation = held ? 0 : phase * 360 * direction;
    }
    if (motions.includes('pulse'))
      sources.pulse = held ? 1 : 0.35 + 0.65 * (0.5 - 0.5 * Math.cos(phase * Math.PI * 2));
    return { sources, rotation, visibility };
  }

  // --- Tracked light ----------------------------------------------------------------------

  #targetElement(): Element | null {
    if (!this.trackTarget) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.getElementById?.(this.trackTarget) ?? null;
  }

  /** An element source can move on its own: it is measured every frame while in view. */
  #followTarget(): boolean {
    const following =
      this.#effect === 'glow' &&
      this.#trigger === 'pointer' &&
      !this.trackPoint &&
      this.#targetElement() !== null &&
      !this.hasAttribute('data-tp-offscreen');
    if (following) this.#trackChanged();
    return following;
  }

  /** Subscribes to the pointer only while a tracked light lights the glow. */
  #syncTracking(): void {
    const listen = this.isConnected && this.#effect === 'glow' && this.#trigger === 'pointer';
    if (listen && !this.#releasePointer)
      this.#releasePointer = observePointerPosition(this.ownerDocument, (point) => {
        // Touches have no hover: the light follows a mouse or a pen only.
        this.#pointer = point && point.pointerType !== 'touch' ? point : null;
        this.#trackChanged();
      });
    else if (!listen && this.#releasePointer) {
      this.#releasePointer();
      this.#releasePointer = null;
      this.#pointer = null;
    }
    this.#trackChanged();
  }

  /** Measures the light source against the ring in the shared layout batch. */
  #trackChanged(): void {
    if (!this.isConnected) return;
    scheduleLayoutPass(this.#trackPass, {
      active: () => this.isConnected,
      measure: () => {
        if (this.#effect !== 'glow' || this.#trigger !== 'pointer') return null;
        const target = this.#targetElement();
        let source: PointerPoint | null = this.trackPoint;
        if (!source && target) {
          const rect = target.getBoundingClientRect();
          source = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
        } else if (!source && !this.trackTarget) source = this.#pointer;
        const ring = this.renderRoot.querySelector('.ring');
        if (!source || !ring) return null;
        return { source, origin: ring.getBoundingClientRect() };
      },
      apply: (measured) => this.#light(measured),
    });
  }

  #light(measured: { source: PointerPoint; origin: DOMRect } | null): void {
    const geometry = this.#geometry;
    if (!geometry) return;
    let lit = false;
    if (measured) {
      const x = measured.source.x - measured.origin.left;
      const y = measured.source.y - measured.origin.top;
      const { width, height } = geometry.box;
      const outside = Math.hypot(Math.max(-x, 0, x - width), Math.max(-y, 0, y - height));
      const inside = Math.min(x, width - x, y, height - y);
      const distance = outside > 0 ? outside : Math.max(0, inside);
      lit = distance <= Math.max(0, Number(this.trackReach) || 0);
      // Out of reach, the light holds its last lit position while it waits and fades out.
      if (lit) {
        // A light that comes back after fading out starts where it is, not where it left.
        if (this.#fade.value === 0 || resolvesReducedMotion(this)) this.#follower.snap(x, y);
        else this.#follower.setTarget(x, y);
      }
    }
    const changed = lit !== this.#lit;
    this.#lit = lit;
    this.toggleAttribute('data-tp-lit', lit);
    if (changed) this.#triggerChanged();
    else this.#wake();
  }

  // --- Loops ------------------------------------------------------------------------------

  /** The loop role starts while the glow's motions or the dashes' march and breathe run. */
  #syncLoop(): void {
    if (!this.isConnected || !this.hasUpdated) return;
    const dash = this.#dashMotions.filter((motion) => motion !== 'draw');
    const motions = (
      this.#looped
        ? this.#glowMotions
        : this.#effect === 'dash' && this.#trigger !== 'none'
          ? dash
          : []
    ).join(' ');
    if (motions === this.#looping) return;
    const previous = this.#looping;
    this.#looping = motions;
    this.#loop?.cancel();
    this.#loop = prepareMotion(this, this, moBorderMotionRoles.loop, {
      phase: motions ? 'start' : 'stop',
      fromState: previous || 'none',
      toState: motions || 'none',
      context: { effect: this.#effect, motion: motions || previous },
    });
    this.#loop.start();
    this.#wake();
  }

  // --- Draw reveal ------------------------------------------------------------------------

  #revealChanged(): void {
    // A draw that is no longer a reveal hands the drawing to its trigger's own states.
    if (!this.#revealing && this.#playback.revealed) this.#playback.reset();
    // A mask created in this update gets its undrawn style first, so the reveal animates it.
    const path = this.#drawPath();
    if (path)
      this.ownerDocument.defaultView
        ?.getComputedStyle(path)
        .getPropertyValue('--_tp-mo-border-drawn');
    if (this.#membership.coordinated) this.#membership.update();
    else this.#standalone.update();
  }

  #drawPath(): Element | null {
    return this.renderRoot.querySelector('.draw');
  }

  readonly #playback = new RevealPlayback({
    owner: this,
    role: moBorderMotionRoles.reveal,
    emit: (type, detail) => this.emit(type, detail),
    effect: () => this.#effect,
    apply: (revealed, delay, animated) => {
      if (revealed && delay > 0) this.style.setProperty('--_tp-mo-border-delay', `${delay}ms`);
      else this.style.removeProperty('--_tp-mo-border-delay');
      this.toggleAttribute('data-tp-hiding', !revealed && animated === true);
      this.toggleAttribute('data-revealed', revealed);
    },
    span: () => {
      const view = this.ownerDocument.defaultView;
      const path = this.#drawPath();
      return view && path ? transitionSpan(view.getComputedStyle(path)) : 0;
    },
  });

  /** What this border offers its coordinator (a Scroll trigger). */
  readonly #member: RevealMember = {
    element: this,
    ready: () => this.hasUpdated,
    revealing: () => this.#revealing,
    revealed: () => this.#playback.revealed,
    held: () => this.revealHold,
    prepare: () => {},
    reveal: (delay) => this.#playback.play(delay),
    reset: () => this.#playback.reset(),
    refresh: () => this.requestUpdate(),
    duration: () => {
      const view = this.ownerDocument.defaultView;
      const path = this.#drawPath();
      if (!view || !path || !this.#revealing) return 0;
      this.toggleAttribute('data-tp-scrub', true);
      this.style.setProperty('--_tp-mo-border-time', '0ms');
      return cssTimeMs(view.getComputedStyle(path).animationDuration.split(',')[0]!);
    },
    scrub: (time) => {
      if (time === null) {
        this.removeAttribute('data-tp-scrub');
        this.style.removeProperty('--_tp-mo-border-time');
        return;
      }
      this.toggleAttribute('data-tp-scrub', true);
      this.style.setProperty('--_tp-mo-border-time', `${Math.max(0, time)}ms`);
    },
  };

  readonly #membership = new RevealMembership(this, this.#member, () => this.requestUpdate());

  readonly #standalone = new StandaloneReveal(this, {
    playback: this.#playback,
    repeat: () => this.revealRepeat,
    revealing: () => this.#revealing,
    ready: () => this.hasUpdated,
    held: () => this.revealHold,
    coordinated: () => this.#membership.coordinated,
  });

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    // The draw starts undrawn; reduced motion or no observer draws it before the first paint.
    if (revealsImmediately(this)) this.#standalone.update();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-border': TpMoBorder;
  }
}
