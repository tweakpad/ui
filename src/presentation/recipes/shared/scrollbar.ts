import { motionTransition } from '../../motion.js';
import type { PresentationRule } from '../../resolver.js';

/** Shared scrollbar track and thumb paint (Scroll area, Carousel and other shared scrollbars). */
export const scrollbarRules: readonly PresentationRule[] = [
  {
    declarations: {
      // Nova cn-scroll-area-scrollbar: a transparent 1px border insets the thumb.
      padding: 'var(--tp-border-width)',
      transition: motionTransition(['opacity'], 'fast'),
    },
  },
  {
    selector: '&[data-orientation="vertical"]',
    declarations: { width: 'var(--tp-space-2-5)' },
  },
  {
    selector: '&[data-orientation="horizontal"]',
    declarations: { height: 'var(--tp-space-2-5)' },
  },
];

export const scrollbarThumbRules: readonly PresentationRule[] = [
  { declarations: { background: 'var(--tp-border)', 'border-radius': 'var(--tp-radius-full)' } },
  {
    selector: '&[data-orientation="vertical"]',
    declarations: { 'min-height': 'min(var(--tp-space-4), 100%)' },
  },
  {
    selector: '&[data-orientation="horizontal"]',
    declarations: { 'min-width': 'min(var(--tp-space-4), 100%)' },
  },
];
