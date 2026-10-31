import { color, type ColorSpace, type ColorValue, type Coords } from './types.js';

type Triple = readonly [number, number, number];
type Matrix = readonly [Triple, Triple, Triple];

const triple = (coords: Coords): Triple => [coords[0], coords[1], coords[2]];
const multiply = (matrix: Matrix, [x, y, z]: Triple): Triple => [
  matrix[0][0] * x + matrix[0][1] * y + matrix[0][2] * z,
  matrix[1][0] * x + matrix[1][1] * y + matrix[1][2] * z,
  matrix[2][0] * x + matrix[2][1] * y + matrix[2][2] * z,
];

// CSS Color 4 §10.1 sRGB ↔ XYZ D65.
const LINEAR_TO_XYZ: Matrix = [
  [0.4123907992659595, 0.35758433938387796, 0.1804807884018343],
  [0.21263900587151036, 0.7151686787677559, 0.07219231536073371],
  [0.01933081871559185, 0.11919477979462599, 0.9505321522496606],
];
const XYZ_TO_LINEAR: Matrix = [
  [3.2409699419045213, -1.5373831775700935, -0.4986107602930033],
  [-0.9692436362808798, 1.8759675015077206, 0.04155505740717561],
  [0.05563007969699361, -0.20397695888897657, 1.0569715142428786],
];
// Bradford chromatic adaptation D65 ↔ D50.
const D65_TO_D50: Matrix = [
  [1.0479298208405488, 0.022946793341019088, -0.05019222954313557],
  [0.029627815688159344, 0.990434484573249, -0.01707382502938514],
  [-0.009243058152591178, 0.015055144896577895, 0.7518742899580008],
];
const D50_TO_D65: Matrix = [
  [0.9554734527042182, -0.023098536874261423, 0.0632593086610217],
  [-0.028369706963208136, 1.0099954580058226, 0.021041398966943008],
  [0.012314001688319899, -0.020507696433477912, 1.3303659366080753],
];
// OKLab (Björn Ottosson): XYZ D65 → LMS → cube root → Lab.
const XYZ_TO_LMS: Matrix = [
  [0.819022437996703, 0.3619062600528904, -0.1288737815209879],
  [0.0329836539323885, 0.9292868615863434, 0.0361446663245089],
  [0.0481771893596242, 0.2642395317527308, 0.6335478284694309],
];
const LMS_TO_OKLAB: Matrix = [
  [0.210454268309314, 0.7936177747023054, -0.0040720430116193],
  [1.9779985324311684, -2.42859224204858, 0.450593709617411],
  [0.0259040424655478, 0.7827717124575296, -0.8086757549230774],
];
const OKLAB_TO_LMS: Matrix = [
  [1, 0.3963377773761749, 0.2158037573099136],
  [1, -0.1055613458156586, -0.0638541728258133],
  [1, -0.0894841775298119, -1.2914855480194092],
];
const LMS_TO_XYZ: Matrix = [
  [1.2268798758459243, -0.5578149944602171, 0.2813910456659647],
  [-0.0405757452148008, 1.112286803280317, -0.0717110580655164],
  [-0.0763729366746601, -0.4214933324022432, 1.5869240198367816],
];
const D50_WHITE: Triple = [0.3457 / 0.3585, 1, (1 - 0.3457 - 0.3585) / 0.3585];
const LAB_EPSILON = 216 / 24389;
const LAB_KAPPA = 24389 / 27;
const ACHROMATIC = 1e-7;

const srgbExpand = (channel: number): number => {
  const sign = channel < 0 ? -1 : 1;
  const value = Math.abs(channel);
  return sign * (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
};
const srgbCompress = (channel: number): number => {
  const sign = channel < 0 ? -1 : 1;
  const value = Math.abs(channel);
  return sign * (value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055);
};

/** Normalizes a hue into [0, 360). */
export function normalizeHue(hue: number): number {
  const wrapped = hue % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

const toPolar = ([l, a, b]: Triple): Triple => {
  const chroma = Math.hypot(a, b);
  const hue = chroma < ACHROMATIC ? 0 : normalizeHue((Math.atan2(b, a) * 180) / Math.PI);
  return [l, chroma, hue];
};
const fromPolar = ([l, chroma, hue]: Triple): Triple => {
  const radians = (hue * Math.PI) / 180;
  return [l, chroma * Math.cos(radians), chroma * Math.sin(radians)];
};

function hslToRgb([hue, s, l]: Triple): Triple {
  const h = normalizeHue(hue);
  const saturation = s / 100;
  const lightness = l / 100;
  const f = (n: number): number => {
    const k = (n + h / 30) % 12;
    const a = saturation * Math.min(lightness, 1 - lightness);
    return lightness - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return [f(0), f(8), f(4)];
}
function rgbHue(r: number, g: number, b: number, max: number, delta: number): number {
  let hue: number;
  if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
  else if (max === g) hue = (b - r) / delta + 2;
  else hue = (r - g) / delta + 4;
  return normalizeHue(hue * 60);
}
function rgbToHsl([r, g, b]: Triple): Triple {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta <= ACHROMATIC) return [0, 0, lightness * 100];
  const saturation =
    lightness <= 0 || lightness >= 1 ? 0 : (max - lightness) / Math.min(lightness, 1 - lightness);
  return [rgbHue(r, g, b, max, delta), saturation * 100, lightness * 100];
}
function hsvToRgb([hue, s, v]: Triple): Triple {
  const h = normalizeHue(hue);
  const saturation = s / 100;
  const value = v / 100;
  const f = (n: number): number => {
    const k = (n + h / 60) % 6;
    return value - value * saturation * Math.max(0, Math.min(k, 4 - k, 1));
  };
  return [f(5), f(3), f(1)];
}
function rgbToHsv([r, g, b]: Triple): Triple {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  const hue = delta <= ACHROMATIC ? 0 : rgbHue(r, g, b, max, delta);
  const saturation = max <= 0 ? 0 : delta / max;
  return [hue, saturation * 100, max * 100];
}
function hwbToRgb([hue, w, b]: Triple): Triple {
  let white = w / 100;
  let black = b / 100;
  if (white + black >= 1) {
    const gray = white / (white + black);
    return [gray, gray, gray];
  }
  if (white < 0) white = 0;
  if (black < 0) black = 0;
  const rgb = hslToRgb([hue, 100, 50]);
  const scale = 1 - white - black;
  return [rgb[0] * scale + white, rgb[1] * scale + white, rgb[2] * scale + white];
}
function rgbToHwb(rgb: Triple): Triple {
  const [hue] = rgbToHsv(rgb);
  const white = Math.min(rgb[0], rgb[1], rgb[2]);
  const black = 1 - Math.max(rgb[0], rgb[1], rgb[2]);
  return [hue, white * 100, black * 100];
}
function cmykToRgb(coords: Coords): Triple {
  const [c, m, y] = coords;
  const key = (coords[3] ?? 0) / 100;
  return [(1 - c / 100) * (1 - key), (1 - m / 100) * (1 - key), (1 - y / 100) * (1 - key)];
}
function rgbToCmyk([r, g, b]: Triple): Coords {
  const key = 1 - Math.max(r, g, b);
  if (key >= 1 - ACHROMATIC) return [0, 0, 0, 100];
  const scale = 1 - key;
  return [
    ((1 - r - key) / scale) * 100,
    ((1 - g - key) / scale) * 100,
    ((1 - b - key) / scale) * 100,
    key * 100,
  ];
}

interface SpaceDefinition {
  readonly base: ColorSpace | null;
  readonly toBase: (coords: Coords) => Coords;
  readonly fromBase: (coords: Coords) => Coords;
}

const identity = (coords: Coords): Coords => coords;
const lift =
  (fn: (coords: Triple) => Coords): ((coords: Coords) => Coords) =>
  (coords) =>
    fn(triple(coords));

const SPACES: Readonly<Record<ColorSpace, SpaceDefinition>> = {
  'xyz-d65': { base: null, toBase: identity, fromBase: identity },
  'srgb-linear': {
    base: 'xyz-d65',
    toBase: lift((coords) => multiply(LINEAR_TO_XYZ, coords)),
    fromBase: lift((coords) => multiply(XYZ_TO_LINEAR, coords)),
  },
  srgb: {
    base: 'srgb-linear',
    toBase: lift(([r, g, b]) => [srgbExpand(r), srgbExpand(g), srgbExpand(b)]),
    fromBase: lift(([r, g, b]) => [srgbCompress(r), srgbCompress(g), srgbCompress(b)]),
  },
  hsl: { base: 'srgb', toBase: lift(hslToRgb), fromBase: lift(rgbToHsl) },
  hsv: { base: 'srgb', toBase: lift(hsvToRgb), fromBase: lift(rgbToHsv) },
  hwb: { base: 'srgb', toBase: lift(hwbToRgb), fromBase: lift(rgbToHwb) },
  cmyk: { base: 'srgb', toBase: cmykToRgb, fromBase: lift(rgbToCmyk) },
  'xyz-d50': {
    base: 'xyz-d65',
    toBase: lift((coords) => multiply(D50_TO_D65, coords)),
    fromBase: lift((coords) => multiply(D65_TO_D50, coords)),
  },
  lab: {
    base: 'xyz-d50',
    toBase: lift(([l, a, b]) => {
      const fy = (l + 16) / 116;
      const fx = a / 500 + fy;
      const fz = fy - b / 200;
      const x = fx ** 3 > LAB_EPSILON ? fx ** 3 : (116 * fx - 16) / LAB_KAPPA;
      const y = l > LAB_KAPPA * LAB_EPSILON ? ((l + 16) / 116) ** 3 : l / LAB_KAPPA;
      const z = fz ** 3 > LAB_EPSILON ? fz ** 3 : (116 * fz - 16) / LAB_KAPPA;
      return [x * D50_WHITE[0], y * D50_WHITE[1], z * D50_WHITE[2]];
    }),
    fromBase: lift((xyz) => {
      const f = (t: number): number =>
        t > LAB_EPSILON ? Math.cbrt(t) : (LAB_KAPPA * t + 16) / 116;
      const fx = f(xyz[0] / D50_WHITE[0]);
      const fy = f(xyz[1] / D50_WHITE[1]);
      const fz = f(xyz[2] / D50_WHITE[2]);
      return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
    }),
  },
  lch: { base: 'lab', toBase: lift(fromPolar), fromBase: lift(toPolar) },
  oklab: {
    base: 'xyz-d65',
    toBase: lift((lab) => {
      const lms = multiply(OKLAB_TO_LMS, lab);
      return multiply(LMS_TO_XYZ, [lms[0] ** 3, lms[1] ** 3, lms[2] ** 3]);
    }),
    fromBase: lift((xyz) => {
      const lms = multiply(XYZ_TO_LMS, xyz);
      return multiply(LMS_TO_OKLAB, [Math.cbrt(lms[0]), Math.cbrt(lms[1]), Math.cbrt(lms[2])]);
    }),
  },
  oklch: { base: 'oklab', toBase: lift(fromPolar), fromBase: lift(toPolar) },
};

function pathToRoot(space: ColorSpace): ColorSpace[] {
  const path: ColorSpace[] = [space];
  let current = SPACES[space].base;
  while (current) {
    path.push(current);
    current = SPACES[current].base;
  }
  return path;
}

/** Converts a color to another space through the common ancestor of both spaces. */
export function convertColor(value: ColorValue, space: ColorSpace): ColorValue {
  if (value.space === space) return value;
  const up = pathToRoot(value.space);
  const down = pathToRoot(space);
  const ancestor = up.find((candidate) => down.includes(candidate)) ?? 'xyz-d65';
  let coords = value.coords;
  for (const step of up) {
    if (step === ancestor) break;
    coords = SPACES[step].toBase(coords);
  }
  const descent = down.slice(0, down.indexOf(ancestor)).reverse();
  for (const step of descent) coords = SPACES[step].fromBase(coords);
  return color(space, coords, value.alpha);
}

/** Interpolates two colors in OKLab (perceptually uniform) at `t` in 0–1. */
export function mixColors(a: ColorValue, b: ColorValue, t: number): ColorValue {
  const from = convertColor(a, 'oklab');
  const to = convertColor(b, 'oklab');
  const lerp = (x: number, y: number): number => x + (y - x) * t;
  return color(
    'oklab',
    [
      lerp(from.coords[0], to.coords[0]),
      lerp(from.coords[1], to.coords[1]),
      lerp(from.coords[2], to.coords[2]),
    ],
    lerp(from.alpha, to.alpha),
  );
}
