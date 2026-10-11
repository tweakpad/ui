import { normalizePoints } from './evaluate.js';
import {
  directionOfStepPosition,
  normalizeParameters,
  parametricParameterDefinitions,
} from './parametric.js';
import { serializeEasingCurve } from './serialize.js';
import {
  EASING_DIRECTIONS,
  PARAMETRIC_FAMILIES,
  STEP_POSITIONS,
  type BezierCurve,
  type EasingCurve,
  type EasingDirection,
  type EasingPoint,
  type ParametricFamily,
  type StepPosition,
} from './types.js';

const KEYWORDS: Readonly<Record<string, EasingCurve>> = {
  linear: {
    kind: 'custom',
    points: [
      { input: 0, output: 0 },
      { input: 1, output: 1 },
    ],
  },
  ease: { kind: 'bezier', x1: 0.25, y1: 0.1, x2: 0.25, y2: 1 },
  'ease-in': { kind: 'bezier', x1: 0.42, y1: 0, x2: 1, y2: 1 },
  'ease-out': { kind: 'bezier', x1: 0, y1: 0, x2: 0.58, y2: 1 },
  'ease-in-out': { kind: 'bezier', x1: 0.42, y1: 0, x2: 0.58, y2: 1 },
  'step-start': { kind: 'parametric', family: 'steps', direction: 'in', parameters: { count: 1 } },
  'step-end': { kind: 'parametric', family: 'steps', direction: 'out', parameters: { count: 1 } },
};

const isDirection = (value: string): value is EasingDirection =>
  (EASING_DIRECTIONS as readonly string[]).includes(value);
const isFamily = (value: string): value is ParametricFamily =>
  (PARAMETRIC_FAMILIES as readonly string[]).includes(value);
const isStepPosition = (value: string): value is StepPosition =>
  (STEP_POSITIONS as readonly string[]).includes(value);

const numbers = (text: string): number[] | null => {
  const values = text
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean)
    .map(Number);
  return values.length && values.every(Number.isFinite) ? values : null;
};

function parseBezier(args: string): BezierCurve | null {
  const values = numbers(args);
  if (!values || values.length !== 4) return null;
  const [x1, y1, x2, y2] = values as [number, number, number, number];
  if (x1 < 0 || x1 > 1 || x2 < 0 || x2 > 1) return null;
  return { kind: 'bezier', x1, y1, x2, y2 };
}

function parseLinear(args: string): EasingCurve | null {
  const entries = args
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  if (entries.length < 2) return null;
  const points: Array<{ input: number | null; output: number }> = [];
  for (const entry of entries) {
    const tokens = entry.split(/\s+/);
    const output = Number(tokens[0]);
    if (!Number.isFinite(output) || tokens.length > 3) return null;
    const stops = tokens.slice(1).map((token) => {
      if (!/^-?\d*\.?\d+%$/.test(token)) return Number.NaN;
      return Number(token.slice(0, -1)) / 100;
    });
    if (stops.some((stop) => !Number.isFinite(stop))) return null;
    if (stops.length === 0) points.push({ input: null, output });
    else for (const stop of stops) points.push({ input: stop, output });
  }
  // CSS linear(): missing inputs spread evenly between the neighbouring explicit inputs.
  if (points[0]!.input === null) points[0]!.input = 0;
  if (points[points.length - 1]!.input === null) points[points.length - 1]!.input = 1;
  let index = 0;
  while (index < points.length) {
    if (points[index]!.input !== null) {
      index++;
      continue;
    }
    let end = index;
    while (points[end]!.input === null) end++;
    const start = points[index - 1]!.input!;
    const stop = points[end]!.input!;
    const gaps = end - index + 1;
    for (let fill = index; fill < end; fill++)
      points[fill]!.input = start + ((stop - start) * (fill - index + 1)) / gaps;
    index = end;
  }
  const resolved: EasingPoint[] = points.map((point) => ({
    input: point.input as number,
    output: point.output,
  }));
  return { kind: 'custom', points: normalizePoints(resolved) };
}

function parseSteps(args: string): EasingCurve | null {
  const [countText, positionText = 'jump-end'] = args.split(',').map((part) => part.trim());
  const count = Number(countText);
  if (!Number.isInteger(count) || count < 1) return null;
  const position =
    positionText === 'start' ? 'jump-start' : positionText === 'end' ? 'jump-end' : positionText;
  if (!isStepPosition(position)) return null;
  return {
    kind: 'parametric',
    family: 'steps',
    direction: directionOfStepPosition(position),
    parameters: { count },
  };
}

function parseSpring(args: string): EasingCurve | null {
  const values = numbers(args);
  if (!values || values.length < 3 || values.length > 4) return null;
  const [mass, stiffness, damping, velocity = 0] = values as [number, number, number, number?];
  if (mass <= 0 || stiffness <= 0 || damping < 0) return null;
  return { kind: 'spring', mass, stiffness, damping, velocity: velocity ?? 0 };
}

function parseParametric(family: ParametricFamily, args: string): EasingCurve | null {
  const tokens = args
    .trim()
    .split(/[\s,]+/)
    .filter(Boolean);
  const direction = tokens[0];
  if (!direction || !isDirection(direction)) return null;
  const definitions = parametricParameterDefinitions(family);
  const values = tokens.slice(1).map(Number);
  if (values.length > definitions.length || !values.every(Number.isFinite)) return null;
  const parameters: Record<string, number> = {};
  definitions.forEach((definition, index) => {
    if (index < values.length) parameters[definition.key] = values[index]!;
  });
  return {
    kind: 'parametric',
    family,
    direction,
    parameters: normalizeParameters(family, parameters),
  };
}

/**
 * Parses an easing string in any accepted notation (Widgets 6.2 `uwg-ee-req-def-1`): the CSS
 * keywords, `cubic-bezier()`, `linear()`, `steps()`, `spring()` and the parametric families.
 * Returns null when the text is not an easing.
 */
export function parseEasingCurve(text: string): EasingCurve | null {
  const source = text.trim().toLowerCase();
  if (!source) return null;
  const keyword = KEYWORDS[source];
  if (keyword) return keyword;
  const match = /^([a-z-]+)\((.*)\)$/s.exec(source);
  if (!match) return null;
  const name = match[1]!;
  const args = match[2]!;
  switch (name) {
    case 'cubic-bezier':
      return parseBezier(args);
    case 'linear':
      return parseLinear(args);
    case 'steps':
      return parseSteps(args);
    case 'spring':
      return parseSpring(args);
    default:
      return isFamily(name) && name !== 'steps' ? parseParametric(name, args) : null;
  }
}

/** The canonical text of an easing string, or the empty string when it does not parse. */
export function normalizeEasingText(text: string): string {
  const curve = parseEasingCurve(text);
  return curve ? serializeEasingCurve(curve) : '';
}

/** Two records with the same canonical text. */
export function easingCurvesEqual(a: EasingCurve | null, b: EasingCurve | null): boolean {
  if (!a || !b) return a === b;
  return serializeEasingCurve(a) === serializeEasingCurve(b);
}
