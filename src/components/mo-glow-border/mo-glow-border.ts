import type { PropertyValues } from 'lit';
import type { GlowFrame } from '../../foundation/border-ring/glow-renderer.js';
import { numberOrNull } from '../../foundation/converters.js';
import { scheduleLayoutPass } from '../../foundation/layout-batch.js';
import {
  ambientRole,
  prepareMotion,
  resolvesReducedMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { parseEasing, type EasingFunction } from '../../foundation/motion-easing.js';
import { observePointerPosition, type PointerPoint } from '../../foundation/pointer-position.js';
import { registerProperty } from '../../foundation/register-property.js';
import { SpringFollower2D } from '../../foundation/spring-follower.js';
import { moGlowBorderPresentation } from '../../presentation/families/mo-glow-border.js';
import { SurfaceBorderElement } from '../shared/surface-border.js';
import { Fade } from './fade.js';
import { cometHeads, cometTail, lightGlow, type GlowSources } from './lights.js';
import { moGlowBorderStyles, TAIL } from './styles.js';

export type GlowBorderTrigger = 'none' | 'always' | 'hover' | 'focus' | 'pointer';
export type GlowBorderMotion = 'comets' | 'sweep' | 'pulse' | 'glint';
export type GlowBorderRotation = 'cw' | 'ccw';

export const moGlowBorderMotionRoles = {
  loop: ambientRole('loop'),
} as const satisfies Record<string, MotionRoleDefinition>;

const TRIGGERS: readonly GlowBorderTrigger[] = ['none', 'always', 'hover', 'focus', 'pointer'];
const MOTIONS: readonly GlowBorderMotion[] = ['comets', 'sweep', 'pulse', 'glint'];
/** Share of a lap the glint takes to cross; it rests for the rest. */
const GLINT_SHARE = 0.45;
/** Half width of the glint band, as a share of the crossing. */
const GLINT_HALF = 0.16;

registerProperty({ name: TAIL, syntax: '<number>', inherits: false, initialValue: '0.22' });

interface Timing {
  readonly lap: number;
  readonly pause: number;
  readonly lapEasing: EasingFunction;
  readonly fade: number;
  readonly fadeEasing: EasingFunction;
  readonly fadeOutDelay: number;
}

/**
 * Replaces the border of the surface it wraps with a glow at the same place, radius and width:
 * the line is colored around the border from a list of colors and lit by a light that follows
 * the pointer, a point or an element, or by comets, a sweep, a pulse or a glint. `trigger` decides
 * when it lights. The surface keeps its size, focus ring and behavior; the drawing is hidden from
 * assistive technology and lets pointer events through.
 *
 * @slot - One surface: a Card, Button, Input, Text area, Select, Input group, Toggle or any element.
 * @csspart mo-glow-border-ring - The drawing over the surface border, hidden from assistive technology.
 * @csspart mo-glow-border-focus - The focus ring, outside the border, while keyboard focus is inside and the effect does not show it.
 * @csspart mo-glow-border-line - The border line where the glow does not light it.
 * @csspart mo-glow-border-glow - The canvas of the lit line and its wash.
 * @csspart mo-glow-border-bloom - The canvas of the blurred light around the line.
 * @cssprop --tp-mo-glow-border-color - Line color where it is not lit. Default `var(--tp-border)`.
 * @cssprop --tp-mo-glow-border-width - Line width. Default the surface's border width.
 * @cssprop --tp-mo-glow-border-radius - Corner radius without a surface child. Default `var(--tp-radius-lg)`.
 * @cssprop --tp-mo-glow-border-colors - The glow's colors, spread evenly around the border, each blending into the next along the hue circle and the last back into the first. Default the theme's sky, violet and pink chart colors (`--tp-chart-2`, `--tp-chart-1`, `--tp-chart-5`).
 * @cssprop --tp-mo-glow-border-angle - Where the first color sits, 0deg at the top and clockwise. Default `315deg` (the top-left corner).
 * @cssprop --tp-mo-glow-border-core - The color the glow turns toward where the light is hottest. Default white on dark color schemes, none on light ones.
 * @cssprop --tp-mo-glow-border-intensity - Glow opacity, 0 to 1. Default `1`.
 * @cssprop --tp-mo-glow-border-spread - Width of the bloom around the lit line. Default `12px`.
 * @cssprop --tp-mo-glow-border-fill - Opacity of the pointer light's wash over the surface. Default `0`.
 * @cssprop --tp-mo-glow-border-light-length - Length of a comet's tail, as a fraction of the border. Default `0.22`.
 * @cssprop --tp-mo-glow-border-loop-duration - Time of one lap: a comet's round, a sweep's turn, a breath or a glint's pass. Default eight times `var(--tp-duration-normal)`.
 * @cssprop --tp-mo-glow-border-loop-delay - Pause between laps, with the glow faded out. Default `0s`.
 * @cssprop --tp-mo-glow-border-loop-easing - Easing of each lap. Default `linear`.
 * @cssprop --tp-mo-glow-border-fade-duration - Time of the glow's fade in and out. Default `var(--tp-duration-normal)`.
 * @cssprop --tp-mo-glow-border-fade-easing - Easing of the fade. Default `var(--tp-easing-standard)`.
 * @cssprop --tp-mo-glow-border-fade-out-delay - Wait before fading out; fading in never waits. Default `var(--tp-duration-fast)`.
 */
export class TpMoGlowBorder extends SurfaceBorderElement {
  static tagName = 'tp-mo-glow-border';
  static override presentation = moGlowBorderPresentation;
  static override properties = {
    ...SurfaceBorderElement.properties,
    trigger: { type: String },
    motion: { type: String },
    lights: { type: Number },
    lightSpacing: { converter: numberOrNull, attribute: 'light-spacing' },
    rotation: { type: String, reflect: true },
    trackPoint: { attribute: false },
    trackTarget: { type: String, attribute: 'track-target' },
    trackReach: { type: Number, attribute: 'track-reach' },
  };
  static override styles = [...SurfaceBorderElement.styles, moGlowBorderStyles];

  /**
   * When the glow lights and moves: `none`, `always`, `hover`, `focus` (while focus is inside)
   * or `pointer` (lit by the pointer, `track-target` or `trackPoint`). Unset, `always` when
   * `motion` names a motion, and `pointer` otherwise.
   */
  trigger: GlowBorderTrigger | '' = '';
  /** Tokens of `comets`, `sweep`, `pulse` and `glint`, which combine. Unset, `comets`. */
  motion = '';
  /** Number of comets. */
  lights = 2;
  /** Distance between consecutive comets, as a fraction of the border; even when unset. */
  lightSpacing: number | null = null;
  /** Which way comets, the sweep and the glint go: `cw` or `ccw`. */
  rotation: GlowBorderRotation = 'cw';
  /** A point in viewport pixels that lights the border instead of the pointer. */
  trackPoint: PointerPoint | null = null;
  /** The id of an element whose center lights the border instead of the pointer. */
  trackTarget = '';
  /** Distance in pixels at which the tracked light fades to nothing. */
  trackReach = 160;

  protected readonly parts = {
    ring: 'mo-glow-border-ring',
    focus: 'mo-glow-border-focus',
    line: 'mo-glow-border-line',
    glow: 'mo-glow-border-glow',
    bloom: 'mo-glow-border-bloom',
  };
  #releasePointer: (() => void) | null = null;
  #pointer: PointerPoint | null = null;
  readonly #follower = new SpringFollower2D();
  /** The tracked light is within reach of the line. */
  #lit = false;
  #loop: MotionHandle | null = null;
  #looping = '';
  readonly #fade = new Fade();
  #timing: Timing | null = null;
  /** Milliseconds the loop has run; it advances only while the glow shows. */
  #clock = 0;
  readonly #trackPass = {};

  protected get glows(): boolean {
    return true;
  }

  get #named(): GlowBorderMotion[] {
    const list = this.motion.split(/\s+/);
    return MOTIONS.filter((motion) => list.includes(motion));
  }

  get #trigger(): GlowBorderTrigger {
    if ((TRIGGERS as readonly string[]).includes(this.trigger))
      return this.trigger as GlowBorderTrigger;
    // A named motion plays on its own; a bare glow follows the pointer.
    return this.#named.length ? 'always' : 'pointer';
  }

  get #motions(): GlowBorderMotion[] {
    const named = this.#named;
    return named.length ? named : ['comets'];
  }

  /** The motions run from the trigger rather than from a tracked light. */
  get #looped(): boolean {
    const trigger = this.#trigger;
    return trigger === 'always' || trigger === 'hover' || trigger === 'focus';
  }

  /** Whether the trigger has the glow on now. */
  get #on(): boolean {
    switch (this.#trigger) {
      case 'always':
        return true;
      case 'hover':
        return this.hovered;
      case 'focus':
        return this.focused;
      case 'pointer':
        return this.#lit;
      default:
        return false;
    }
  }

  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      this.#syncLoop();
      this.#syncTracking();
    });
  }

  override disconnectedCallback(): void {
    this.#releasePointer?.();
    this.#releasePointer = null;
    this.#loop?.cancel();
    this.#loop = null;
    this.#looping = '';
    this.#fade.snap(false);
    super.disconnectedCallback();
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (
      changed.has('trigger') ||
      changed.has('motion') ||
      changed.has('trackPoint') ||
      changed.has('trackTarget') ||
      changed.has('trackReach')
    )
      this.#syncTracking();
    if (changed.has('motion') || changed.has('trigger')) {
      this.#syncLoop();
      this.triggerChanged();
    }
  }

  /** With `trigger="focus"` the glow itself shows focus. */
  protected override effectShowsFocus(): boolean {
    return this.#trigger === 'focus';
  }

  protected override geometryChanged(): void {
    this.#trackChanged();
  }

  /** Turns the glow on or off from the trigger, through the fade. */
  protected triggerChanged(): void {
    const view = this.ownerDocument.defaultView;
    if (!view || !this.isConnected) return;
    this.#timing = null;
    this.#timingNow();
    const on = this.#on;
    // A glow that comes back from dark starts its loop at the beginning.
    if (on && !this.#fade.on && this.#fade.value === 0) this.#clock = 0;
    if (resolvesReducedMotion(this)) this.#fade.snap(on);
    else this.#fade.set(on, view.performance.now());
    this.wake();
  }

  protected step(elapsed: number, now: number): boolean {
    const renderer = this.renderer;
    if (!renderer || !this.geometry) return false;
    const timing = this.#timingNow();
    const level = this.#fade.step(now);
    const following = this.#followTarget();
    const moving = this.#follower.step(elapsed);
    const held = this.#held();
    const looping = this.#looped && !held && this.near && level > 0;
    if (looping) this.#clock += elapsed;
    if (level <= 0) {
      renderer.paint(null, null);
      return this.#fade.moving || moving || following;
    }
    const look = this.glowLook();
    const { sources, rotation, visibility } = this.#sources(timing, held);
    const shown = level * visibility;
    const lit = Boolean(
      sources.pointer || sources.comets || sources.glint || sources.sweep || sources.pulse,
    );
    if (shown > 0 && lit && look) {
      const frame: GlowFrame = {
        light: (field, samples, box) => lightGlow(field, samples, box, sources),
        rotation,
        level: shown,
        spots: sources.comets?.heads,
        wash: sources.pointer,
      };
      renderer.paint(frame, look);
    } else renderer.paint(null, null);
    return this.#fade.moving || moving || following || looping;
  }

  // --- Timing -----------------------------------------------------------------------------

  /** The loop and fade timings, read from the timing probe. */
  #readTiming(): Timing {
    const [lap, fade] = this.timings();
    return {
      lap: Math.max(1, lap?.duration ?? 0),
      pause: lap?.delay ?? 0,
      lapEasing: parseEasing(lap?.easing ?? 'linear'),
      fade: fade?.duration ?? 0,
      fadeEasing: parseEasing(fade?.easing ?? 'linear'),
      fadeOutDelay: fade?.delay ?? 0,
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

  /** The glow's own animation rests under reduced motion and while a driver claims the loop. */
  #held(): boolean {
    return Boolean(this.#loop?.claimed) || resolvesReducedMotion(this);
  }

  /** The comet tail length, resolved by the stylesheet. */
  #tail(): number {
    const view = this.ownerDocument.defaultView;
    const value = view ? parseFloat(view.getComputedStyle(this).getPropertyValue(TAIL)) : NaN;
    return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0.22;
  }

  /** The light sources at the current loop time. */
  #sources(
    timing: Timing,
    held: boolean,
  ): { sources: GlowSources; rotation: number; visibility: number } {
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
    const motions = this.#motions;
    const sources: { -readonly [K in keyof GlowSources]: GlowSources[K] } = {};
    let rotation = 0;
    if (motions.includes('comets') && !held) {
      const count = Math.max(1, Math.floor(Number(this.lights) || 0));
      sources.comets = {
        heads: cometHeads(phase * direction, count, this.lightSpacing),
        tail: cometTail(this.#tail(), count, this.lightSpacing),
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

  /** An element source can move on its own: it is measured every frame while near the view. */
  #followTarget(): boolean {
    const following =
      this.#trigger === 'pointer' &&
      !this.trackPoint &&
      this.#targetElement() !== null &&
      this.near;
    if (following) this.#trackChanged();
    return following;
  }

  /** Subscribes to the pointer only while a tracked light lights the glow. */
  #syncTracking(): void {
    const listen = this.isConnected && this.#trigger === 'pointer';
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
        if (this.#trigger !== 'pointer') return null;
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
    const geometry = this.geometry;
    if (!geometry) return;
    let lit = false;
    if (measured) {
      // The source is in screen pixels; the ring is laid out in CSS pixels.
      const x = (measured.source.x - measured.origin.left) / geometry.scale.x;
      const y = (measured.source.y - measured.origin.top) / geometry.scale.y;
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
    if (changed) this.triggerChanged();
    else this.wake();
  }

  // --- Loop -------------------------------------------------------------------------------

  /** The loop role starts while the glow's motions run from the trigger. */
  #syncLoop(): void {
    if (!this.isConnected || !this.hasUpdated) return;
    const motions = (this.#looped ? this.#motions : []).join(' ');
    if (motions === this.#looping) return;
    const previous = this.#looping;
    this.#looping = motions;
    this.#loop?.cancel();
    this.#loop = prepareMotion(this, this, moGlowBorderMotionRoles.loop, {
      phase: motions ? 'start' : 'stop',
      fromState: previous || 'none',
      toState: motions || 'none',
      context: { motion: motions || previous },
    });
    this.#loop.start();
    this.wake();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-glow-border': TpMoGlowBorder;
  }
}
