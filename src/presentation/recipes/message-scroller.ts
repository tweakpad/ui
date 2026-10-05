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
