import { css } from 'lit';

/** Directional Arrow geometry shared by anchored surfaces and Select. */
export const anchoredArrowStyles = css`
  :is(.arrow, .select-arrow) {
    position: absolute;
    pointer-events: none;
    inline-size: var(--_tp-arrow-width);
    block-size: var(--_tp-arrow-height);
  }

  :is(.arrow, .select-arrow):is([data-side='left'], [data-side='right']) {
    inline-size: var(--_tp-arrow-height);
    block-size: var(--_tp-arrow-width);
  }

  :is(.arrow, .select-arrow) svg {
    position: absolute;
    inset: 50% auto auto 50%;
    translate: -50% -50%;
    display: block;
    inline-size: var(--_tp-arrow-width);
    block-size: var(--_tp-arrow-height);
  }

  :is(.arrow, .select-arrow)[data-side='top'] {
    top: calc(100% - var(--tp-border-width));
  }

  :is(.arrow, .select-arrow)[data-side='bottom'] {
    bottom: calc(100% - var(--tp-border-width));
  }

  :is(.arrow, .select-arrow)[data-side='left'] {
    left: calc(100% - var(--tp-border-width));
  }

  :is(.arrow, .select-arrow)[data-side='right'] {
    right: calc(100% - var(--tp-border-width));
  }

  :is(.arrow, .select-arrow)[data-side='bottom'] svg {
    rotate: 180deg;
  }

  :is(.arrow, .select-arrow)[data-side='left'] svg {
    rotate: 270deg;
  }

  :is(.arrow, .select-arrow)[data-side='right'] svg {
    rotate: 90deg;
  }
`;
