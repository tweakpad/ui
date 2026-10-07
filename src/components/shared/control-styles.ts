import { css } from 'lit';

export const controlStyles = css`
  .control {
    appearance: none;
  }

  .control:disabled {
    cursor: not-allowed;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
    border: 0;
  }
`;

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
