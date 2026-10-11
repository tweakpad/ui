import { parametricParameterDefinitions } from '../../foundation/easing/parametric.js';
import { SPRING_PARAMETERS } from '../../foundation/easing/spring.js';
import {
  PROGRESSION_MAX,
  PROGRESSION_MIN,
  type EasingCurve,
  type EasingParameterDefinition,
} from '../../foundation/easing/types.js';
import type { EasingEditorStrings } from './types.js';

/** A parameter row of the controls: its definition, current value and display name key. */
export interface EasingParameter {
  readonly definition: EasingParameterDefinition;
  readonly value: number;
  readonly name: keyof EasingEditorStrings;
}

const TIME_AXIS: Omit<EasingParameterDefinition, 'key' | 'default'> = {
  min: 0,
  max: 1,
  step: 0.01,
  smallStep: 0.001,
  largeStep: 0.1,
  precision: 3,
};
const PROGRESSION_AXIS: Omit<EasingParameterDefinition, 'key' | 'default'> = {
  min: PROGRESSION_MIN,
  max: PROGRESSION_MAX,
  step: 0.01,
  smallStep: 0.001,
  largeStep: 0.1,
  precision: 3,
};
/** Dimension definitions of the graph's handle and point inputs. */
export const TIME_DIMENSION: EasingParameterDefinition = { key: 'time', default: 0, ...TIME_AXIS };
export const PROGRESSION_DIMENSION: EasingParameterDefinition = {
  key: 'progression',
  default: 0,
  ...PROGRESSION_AXIS,
};

const NAME_BY_KEY: Readonly<Record<string, keyof EasingEditorStrings>> = {
  x1: 'x1',
  y1: 'y1',
  x2: 'x2',
  y2: 'y2',
  mass: 'mass',
  stiffness: 'stiffness',
  damping: 'damping',
  velocity: 'velocity',
  exponent: 'exponent',
  overshoot: 'overshoot',
  amplitude: 'amplitude',
  period: 'period',
  count: 'count',
};

/** The editable parameters of a record, in control order (Widgets 6.2 Anatomy controls row). */
export function easingParameters(curve: EasingCurve | null): readonly EasingParameter[] {
  if (!curve) return [];
  switch (curve.kind) {
    case 'bezier':
      return [
        { definition: { key: 'x1', default: 0.42, ...TIME_AXIS }, value: curve.x1, name: 'x1' },
        { definition: { key: 'y1', default: 0, ...PROGRESSION_AXIS }, value: curve.y1, name: 'y1' },
        { definition: { key: 'x2', default: 0.58, ...TIME_AXIS }, value: curve.x2, name: 'x2' },
        { definition: { key: 'y2', default: 1, ...PROGRESSION_AXIS }, value: curve.y2, name: 'y2' },
      ];
    case 'spring':
      return SPRING_PARAMETERS.map((definition) => ({
        definition,
        value: curve[definition.key],
        name: NAME_BY_KEY[definition.key]!,
      }));
    case 'parametric':
      return parametricParameterDefinitions(curve.family).map((definition) => ({
        definition,
        value: curve.parameters[definition.key] ?? definition.default,
        name: NAME_BY_KEY[definition.key]!,
      }));
    case 'custom':
      return [];
  }
}

/** The record with one parameter replaced. */
export function withEasingParameter(curve: EasingCurve, key: string, value: number): EasingCurve {
  switch (curve.kind) {
    case 'bezier':
      return key === 'x1' || key === 'y1' || key === 'x2' || key === 'y2'
        ? { ...curve, [key]: value }
        : curve;
    case 'spring':
      return key === 'mass' || key === 'stiffness' || key === 'damping' || key === 'velocity'
        ? { ...curve, [key]: value }
        : curve;
    case 'parametric':
      return { ...curve, parameters: { ...curve.parameters, [key]: value } };
    case 'custom':
      return curve;
  }
}

export const clampParameter = (definition: EasingParameterDefinition, value: number): number =>
  Math.min(definition.max, Math.max(definition.min, value));

/** Display text of a parameter at its precision. */
export function formatParameter(definition: EasingParameterDefinition, value: number): string {
  return Number(value.toFixed(definition.precision)).toString();
}
