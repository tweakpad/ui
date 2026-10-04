import { unsafeCSS } from 'lit';

export function motionDuration(timing: 'fast' | 'normal' = 'normal', factor = '1') {
  return `calc(var(--tp-duration-${timing}) * var(--tp-motion-scale) * ${factor})`;
}

/** One timing policy for finite motion; state/lifecycle remain with Foundation. */
export function motionTransition(
  properties: readonly string[],
  timing: 'fast' | 'normal' = 'normal',
) {
  return properties
    .map((property) => `${property} ${motionDuration(timing)} var(--tp-easing-standard)`)
    .join(', ');
}

export function transitionCss(properties: readonly string[], timing: 'fast' | 'normal' = 'normal') {
  return unsafeCSS(motionTransition(properties, timing));
}

/** Shared activity cadence: continuous indicators and slower loading placeholders. */
export function ambientAnimation(
  name: string,
  kind: 'continuous' | 'placeholder' = 'continuous',
  easing = 'linear',
) {
  return `${name} calc(var(--tp-duration-normal) * ${kind === 'placeholder' ? 8 : 4}) ${easing} infinite`;
}

export function ambientCss(
  name: string,
  kind: 'continuous' | 'placeholder' = 'continuous',
  easing = 'linear',
) {
  return unsafeCSS(ambientAnimation(name, kind, easing));
}
