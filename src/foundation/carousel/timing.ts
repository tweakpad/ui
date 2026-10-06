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

export function carouselMotionTiming(
  owner: HTMLElement,
  explicit?: number,
): { duration: number; easing: string } {
  const style = owner.ownerDocument.defaultView?.getComputedStyle(owner);
  const token = style?.getPropertyValue('--tp-duration-normal').trim() ?? '';
  const match = /^(\d+(?:\.\d+)?)(ms|s)$/.exec(token);
  const duration = explicit ?? (match ? Number(match[1]) * (match[2] === 's' ? 1000 : 1) : 300);
  const scale = Number(style?.getPropertyValue('--tp-motion-scale').trim() || 1);
  return {
    duration: Math.max(0, duration * (Number.isFinite(scale) ? scale : 1)),
    easing: style?.getPropertyValue('--tp-easing-standard').trim() || 'ease',
  };
}
