import type { MotionRequestOptions } from '../motion.js';

export const carouselMotionRoles = {
  track: { name: 'track', kind: 'state', phases: ['change'], completion: 'non-blocking' },
  /** Effect transitions: frame-driven logical position from one alignment point to another. */
  transition: {
    name: 'transition',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  autoHeight: {
    name: 'auto-height',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  scrollbarVisibility: {
    name: 'scrollbar-visibility',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const;

/** auto-height parameters: previous/next height plus the accepted snap. */
export function carouselAutoHeightMotion(
  previous: number,
  next: number,
  snap: number | null,
): MotionRequestOptions {
  return { phase: 'change', fromState: previous, toState: next, context: { snap } };
}
/** scrollbar-visibility parameters: previous/next visibility plus orientation. */
export function carouselScrollbarVisibilityMotion(
  previous: boolean,
  next: boolean,
  orientation: 'horizontal' | 'vertical',
): MotionRequestOptions {
  return { phase: 'change', fromState: previous, toState: next, context: { orientation } };
}
