/**
 * How strongly each point of a ring's line is lit, how far it turns to the core color and how
 * wide it swells. Light sources fill it, one value per ring sample; the glow renderer paints it.
 */
export interface LightField {
  /** 0 to 1. */
  readonly intensity: Float32Array;
  /** 0 to 1: the share of the core color. */
  readonly core: Float32Array;
  /** Width factor of the line, 1 at rest. */
  readonly swell: Float32Array;
}

/** A dark field for `count` samples. */
export function emptyField(count: number): LightField {
  return {
    intensity: new Float32Array(count),
    core: new Float32Array(count),
    swell: new Float32Array(count).fill(1),
  };
}

/** Light added the way light adds on a screen: never past 1. */
export const screen = (a: number, b: number) => 1 - (1 - a) * (1 - b);

/** A position along the ring as a fraction of its length, wrapped into [0, 1). */
export const wrap = (value: number) => value - Math.floor(value);

/** Eases 0 to 1 in and out (smoothstep). */
export const smooth = (t: number) => t * t * (3 - 2 * t);
