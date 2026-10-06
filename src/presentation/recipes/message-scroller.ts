import type { PresentationDictionary } from '../resolver.js';
import { motionTransition } from '../motion.js';
import { css } from 'lit';

/** Shadow-scoped keyframe for the shared viewport recipe, adapted from scroll-fade-b. */
export const messageScrollerFadeKeyframes = css`
  @keyframes tp-message-scroller-fade-end {
    from {
      --_tp-message-scroller-fade: min(12%, var(--tp-space-10));
    }

    to {
      --_tp-message-scroller-fade: 0%;
    }
  }
`;

export const messageScrollerAppearance: PresentationDictionary = {
  'message-scroller-viewport': [
    {
      declarations: {
        'mask-image':
          'linear-gradient(to bottom, #000 0, #000 calc(100% - var(--_tp-message-scroller-fade, 0px)), transparent 100%)',
        'mask-repeat': 'no-repeat',
        animation: 'tp-message-scroller-fade-end 1ms ease-in-out both',
        'animation-timeline': 'scroll(self y)',
        'animation-range': 'calc(100% - var(--tp-space-12) * 2) 100%',
      },
    },
  ],
  'message-scroller-return-control': [
    {
      declarations: {
        background: 'var(--tp-background)',
        color: 'var(--tp-foreground)',
        'border-color': 'var(--tp-border)',
        'border-radius': 'var(--tp-radius-full)',
        transition: motionTransition(['opacity', 'translate'], 'fast'),
        opacity: '1',
        translate: '0 0',
      },
    },
    {
      selector: '&[data-active="false"]',
      declarations: { opacity: '0', translate: '0 var(--tp-space-1)' },
    },
  ],
  'message-scroller-content': [
    { declarations: { gap: 'var(--tp-space-6)', padding: 'var(--tp-space-3)' } },
  ],
};
