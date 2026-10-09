import { css } from 'lit';

/** Checkbox, Radio and Tree view check indicators: the box that carries selection paint. */
export const selectionBoxStyles = css`
  .box {
    display: inline-grid;
    flex: none;
    place-items: center;
    inline-size: var(--tp-icon-size-md);
    block-size: var(--tp-icon-size-md);
  }
`;
