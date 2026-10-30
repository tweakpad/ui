import type { RingBox } from '../../foundation/border-ring/ring-path.js';
import type { RingSamples } from '../../foundation/border-ring/ring-samples.js';
import { screen, smooth, wrap, type LightField } from '../../foundation/border-ring/light-field.js';

export interface PointerLight {
  /** Position in the ring box. */
  readonly x: number;
  readonly y: number;
  /** Distance in pixels from the line at which the light fades to nothing. */
  readonly reach: number;
}

export interface Comets {
  /** Head positions as fractions of the perimeter. */
  readonly heads: readonly number[];
  /** Tail length as a fraction of the perimeter. */
  readonly tail: number;
  /** 1 travels clockwise (along the line), -1 counterclockwise. */
  readonly direction: 1 | -1;
}

export interface Glint {
  /** Center of the band across the box, 0 at the starting corner and 1 at the opposite one. */
  readonly center: number;
  /** Half width of the band, as a fraction of the crossing. */
  readonly half: number;
  /** 1 crosses from the top-left corner to the bottom-right, -1 the other way. */
  readonly direction: 1 | -1;
}

/** What lights a Glow border now. */
export interface GlowSources {
  readonly pointer?: PointerLight | null;
  readonly comets?: Comets | null;
  readonly glint?: Glint | null;
  /** Lights the whole line. */
  readonly sweep?: boolean;
  /** Scales the whole glow; without another source it lights the whole line first. */
  readonly pulse?: number | null;
}

/**
 * The pointer lights a stretch of the line around its nearest point, a share of the perimeter
 * (within bounds in pixels), so a small control lights a highlight rather than its whole outline.
 */
const SPOT_SHARE = 0.12;
const SPOT_MIN = 40;
const SPOT_MAX = 160;
/** Share of the stretch at full strength, and the share that turns to the core color. */
const PLATEAU = 0.2;
const CORE_SHARE = 0.35;
/** The rounded glow in front of a comet's head, in pixels. */
const HEAD_PX = 6;
const SWEEP_LEVEL = 0.65;

/**
 * Head positions of `count` comets at `phase` (a fraction of the perimeter), `spacing` apart or
 * evenly spaced when it is null. Positions wrap, so the comets keep their spacing on every lap.
 */
export function cometHeads(phase: number, count: number, spacing: number | null): number[] {
  const gap = spacing ?? 1 / Math.max(1, count);
  return Array.from({ length: Math.max(0, count) }, (_, index) => wrap(phase + index * gap));
}

/**
 * The longest tail that stays clear of the comet behind: 90% of the smallest gap between
 * consecutive comets (with custom spacing, the gap that closes the loop may be the smaller one).
 */
export function cometTail(length: number, count: number, spacing: number | null): number {
  if (count <= 1) return Math.max(0, Math.min(length, 0.9));
  const gap = spacing ?? 1 / count;
  const closing = 1 - gap * (count - 1);
  const room = Math.max(0.02, closing > 0 ? Math.min(gap, closing) : gap);
  return Math.max(0, Math.min(length, room * 0.9));
}

/** Lights every sample of the line from `sources` into `field` (CL Glow border `mbx-glow`). */
export function lightGlow(
  field: LightField,
  samples: RingSamples,
  box: Pick<RingBox, 'width' | 'height'>,
  sources: GlowSources,
): void {
  const { intensity, core, swell } = field;
  const { pointer, comets, glint, sweep, pulse } = sources;
  const length = Math.max(samples.length, 1e-6);
  // The pointer lights around the nearest point of the line, as strongly as it is close to it.
  let nearest = 0;
  let level = 0;
  const spot = Math.min(SPOT_MAX, Math.max(SPOT_MIN, length * SPOT_SHARE));
  if (pointer) {
    let best = Infinity;
    for (let index = 0; index < samples.count; index++) {
      const distance = Math.hypot(samples.x[index]! - pointer.x, samples.y[index]! - pointer.y);
      if (distance < best) {
        best = distance;
        nearest = samples.s[index]!;
      }
    }
    level = 1 - smooth(Math.min(1, best / Math.max(pointer.reach, 1e-6)));
  }
  const lit = Boolean(pointer || comets || glint || sweep);
  for (let index = 0; index < samples.count; index++) {
    const x = samples.x[index]!;
    const y = samples.y[index]!;
    let light = 0;
    let hot = 0;
    let wide = 1;
    if (pointer && level > 0) {
      // Distance along the line from the nearest point, through the start of the path.
      const along = Math.abs(samples.s[index]! - nearest);
      const away = Math.min(along, length - along) / spot;
      if (away < 1) {
        const fall = Math.max(0, (away - PLATEAU) / (1 - PLATEAU));
        const k = (1 - smooth(fall)) * level;
        light = screen(light, k);
        wide = Math.max(wide, 1 + 0.25 * k);
        if (away < CORE_SHARE) {
          const heat = (1 - away / CORE_SHARE) ** 1.5 * level * level;
          hot = Math.max(hot, heat);
          wide = Math.max(wide, 1 + 0.25 * k + 0.25 * heat);
        }
      }
    }
    if (comets && comets.tail > 0) {
      const u = samples.s[index]! / length;
      for (const head of comets.heads) {
        const behind = wrap(comets.direction === 1 ? head - u : u - head);
        if (behind <= comets.tail) {
          const t = behind / comets.tail;
          light = screen(light, (1 - t) ** 1.4);
          hot = Math.max(hot, (1 - t) ** 6);
          wide = Math.max(wide, 1.8 - 0.8 * t);
        } else {
          const ahead = (1 - behind) * length;
          if (ahead < HEAD_PX) {
            const k = (1 - ahead / HEAD_PX) ** 2;
            light = screen(light, k);
            hot = Math.max(hot, k * 0.8);
            wide = Math.max(wide, 1 + 0.8 * k);
          }
        }
      }
    }
    if (glint) {
      const across = (x / Math.max(box.width, 1e-6) + y / Math.max(box.height, 1e-6)) / 2;
      const position = glint.direction === 1 ? across : 1 - across;
      const distance = Math.abs(position - glint.center) / Math.max(glint.half, 1e-6);
      if (distance < 1) {
        const k = 1 - distance;
        light = screen(light, smooth(k));
        hot = Math.max(hot, k ** 3);
        wide = Math.max(wide, 1 + 0.5 * k * k);
      }
    }
    if (sweep) light = screen(light, SWEEP_LEVEL);
    if (pulse !== undefined && pulse !== null) {
      if (!lit) light = 1;
      light *= pulse;
      wide = Math.max(wide, 1 + 0.3 * pulse);
    }
    intensity[index] = light;
    core[index] = hot;
    swell[index] = wide;
  }
}
