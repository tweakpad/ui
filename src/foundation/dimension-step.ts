/**
 * Keyboard step model shared by widget dimension inputs (Widgets Specification 5.2, Slider
 * and NumberField parity): Arrow by `step`, Shift, Control or Meta with an arrow and the Page
 * keys by `largeStep`, Alt with an arrow by `smallStep`, Home and End to the bounds.
 */
export interface DimensionDefinition {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly smallStep: number;
  readonly largeStep: number;
}

export type KeyboardStep = { kind: 'delta'; amount: number } | { kind: 'min' } | { kind: 'max' };

export interface KeyboardStepOptions {
  readonly definition: DimensionDefinition;
  /** Which arrows move this dimension; the other pair is ignored. */
  readonly axis: 'horizontal' | 'vertical' | 'both';
  readonly direction: 'ltr' | 'rtl';
  /** Angular and time axes do not flip with the writing direction. */
  readonly angular?: boolean;
}

/** Resolves a key to a step; horizontal arrows follow the writing direction unless angular. */
export function stepForKey(
  event: KeyboardEvent,
  options: KeyboardStepOptions,
): KeyboardStep | null {
  const { definition, axis, direction, angular } = options;
  const coarse = event.shiftKey || event.ctrlKey || event.metaKey;
  const amount = event.altKey
    ? definition.smallStep
    : coarse
      ? definition.largeStep
      : definition.step;
  const flip = direction === 'rtl' && !angular ? -1 : 1;
  switch (event.key) {
    case 'ArrowRight':
      return axis === 'vertical' ? null : { kind: 'delta', amount: amount * flip };
    case 'ArrowLeft':
      return axis === 'vertical' ? null : { kind: 'delta', amount: -amount * flip };
    case 'ArrowUp':
      return axis === 'horizontal' ? null : { kind: 'delta', amount };
    case 'ArrowDown':
      return axis === 'horizontal' ? null : { kind: 'delta', amount: -amount };
    // Page, Home and End act on the focused dimension only (`axis: 'both'`).
    case 'PageUp':
      return axis === 'both' ? { kind: 'delta', amount: definition.largeStep } : null;
    case 'PageDown':
      return axis === 'both' ? { kind: 'delta', amount: -definition.largeStep } : null;
    case 'Home':
      return axis === 'both' ? { kind: 'min' } : null;
    case 'End':
      return axis === 'both' ? { kind: 'max' } : null;
    default:
      return null;
  }
}

/** Applies a keyboard step to a display value (before clamping or wrapping). */
export function applyKeyboardStep(
  current: number,
  step: KeyboardStep,
  definition: DimensionDefinition,
): number {
  if (step.kind === 'min') return definition.min;
  if (step.kind === 'max') return definition.max;
  return current + step.amount;
}
