import { ambientAnimation, motionTransition } from '../motion.js';
import type { PresentationDictionary } from '../resolver.js';

/** shadcn base registry + Nova selectors947–965; invariant containment lives in TpProgress. */
export const progressAppearance: PresentationDictionary = {
  progress: [{ declarations: { gap: 'var(--tp-space-3)' } }],
  'progress-label': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        'font-weight': 'var(--tp-font-medium)',
        'overflow-wrap': 'anywhere',
      },
    },
  ],
  'progress-value-output': [
    {
      declarations: {
        'font-size': 'var(--tp-text-sm)',
        color: 'var(--tp-muted-foreground)',
        'margin-inline-start': 'auto',
        'font-variant-numeric': 'tabular-nums',
      },
    },
  ],
  'progress-track': [
    {
      declarations: {
        height: 'var(--tp-space-1)',
        background: 'var(--tp-muted)',
        'border-radius': 'var(--tp-radius-full)',
      },
    },
  ],
  'progress-indicator': [
    {
      declarations: {
        background: 'var(--tp-primary)',
        transition: motionTransition(['inline-size']),
      },
    },
    {
      selector: '&[data-indeterminate]',
      declarations: {
        animation: ambientAnimation(
          'tp-progress-indeterminate',
          'continuous',
          'var(--tp-easing-standard)',
        ),
        'animation-play-state': 'var(--tp-motion-play-state, running)',
      },
    },
    {
      selector: '&[data-indeterminate][data-direction="rtl"]',
      declarations: {
        'animation-name': 'tp-progress-indeterminate-rtl',
      },
    },
  ],
};
