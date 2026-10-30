/** An sRGB color with alpha, every channel from 0 to 1. */
export type Rgba = readonly [number, number, number, number];
/** An OKLab color with alpha: lightness, a, b, alpha. */
export type Lab = [number, number, number, number];

const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const toGamma = (c: number) => {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.min(1, Math.max(0, v));
};

export function toLab([red, green, blue, alpha]: Rgba): Lab {
  const r = toLinear(red);
  const g = toLinear(green);
  const b = toLinear(blue);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    alpha,
  ];
}

export function toRgba([lightness, a, b, alpha]: Lab): Rgba {
  const l = (lightness + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (lightness - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (lightness - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    toGamma(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    toGamma(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    toGamma(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
    alpha,
  ];
}

/** Blends two OKLab colors into `out`; `amount` 0 keeps `from`, 1 gives `to`. */
export function mixLab(from: Lab, to: Lab, amount: number, out: Lab = [0, 0, 0, 0]): Lab {
  const t = Math.min(1, Math.max(0, amount));
  out[0] = from[0] + (to[0] - from[0]) * t;
  out[1] = from[1] + (to[1] - from[1]) * t;
  out[2] = from[2] + (to[2] - from[2]) * t;
  out[3] = from[3] + (to[3] - from[3]) * t;
  return out;
}

/** `rgb(r g b / a)` for a canvas style. */
export function cssColor(color: Lab): string {
  const [r, g, b, a] = toRgba(color);
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)} / ${Math.round(a * 1000) / 1000})`;
}

/** OKLCH: lightness, chroma, hue in radians, alpha. */
type Lch = [number, number, number, number];

const toLch = ([l, a, b, alpha]: Lab): Lch => [l, Math.hypot(a, b), Math.atan2(b, a), alpha];

/**
 * Colors spread evenly around the border by angle (0° at the top, clockwise), the first at
 * `start`, each blending into the next and the last back into the first. Neighbors blend in
 * OKLCH along the shorter way around the hue circle, so two far-apart hues pass through the hues
 * between them instead of turning gray; a gray stop keeps its neighbor's hue.
 */
export class GlowPalette {
  readonly #stops: Lch[];
  readonly #start: number;

  constructor(colors: readonly Rgba[], start = 0) {
    this.#stops = (colors.length ? colors : [[1, 1, 1, 1] as Rgba]).map((color) =>
      toLch(toLab(color)),
    );
    this.#start = start;
  }

  get size(): number {
    return this.#stops.length;
  }

  /** The color at `angle` degrees, turned by `rotation` degrees, written into `out`. */
  at(angle: number, rotation = 0, out: Lab = [0, 0, 0, 0]): Lab {
    const count = this.#stops.length;
    const turn = ((((angle - this.#start - rotation) % 360) + 360) % 360) / 360;
    const position = turn * count;
    const index = Math.floor(position) % count;
    const t = position - Math.floor(position);
    const from = this.#stops[index]!;
    const to = this.#stops[(index + 1) % count]!;
    const gray = 0.02;
    let fromHue = from[2];
    let toHue = to[2];
    if (from[1] < gray) fromHue = toHue;
    if (to[1] < gray) toHue = fromHue;
    let delta = toHue - fromHue;
    if (delta > Math.PI) delta -= Math.PI * 2;
    else if (delta < -Math.PI) delta += Math.PI * 2;
    const lightness = from[0] + (to[0] - from[0]) * t;
    const chroma = from[1] + (to[1] - from[1]) * t;
    const hue = fromHue + delta * t;
    out[0] = lightness;
    out[1] = chroma * Math.cos(hue);
    out[2] = chroma * Math.sin(hue);
    out[3] = from[3] + (to[3] - from[3]) * t;
    return out;
  }
}

/**
 * Resolves CSS colors of any syntax to sRGB through a 1×1 canvas, once per distinct string; a
 * string the canvas does not accept resolves to transparent.
 */
export function colorResolver(document: Document): (color: string) => Rgba {
  const cache = new Map<string, Rgba>();
  let context: CanvasRenderingContext2D | null | undefined;
  return (color) => {
    const cached = cache.get(color);
    if (cached) return cached;
    context ??= document.createElement('canvas').getContext('2d', { willReadFrequently: true });
    let rgba: Rgba = [0, 0, 0, 0];
    if (context) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = 'transparent';
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      const [r = 0, g = 0, b = 0, a = 0] = context.getImageData(0, 0, 1, 1).data;
      rgba = [r / 255, g / 255, b / 255, a / 255];
    }
    cache.set(color, rgba);
    return rgba;
  };
}
