import { css } from 'lit';
export const dragDropListStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .list {
    position: relative;
    display: flex;
    flex-direction: column;
    min-inline-size: 0;
    list-style: none;
    margin: 0;
    padding: 0;
  }

  :host([orientation='horizontal']) .list {
    flex-direction: row;
  }

  .item {
    min-inline-size: 0;
    flex: none;
    list-style: none;
  }

  :host([orientation='horizontal']) .item {
    flex: 1 0 auto;
  }

  /* The stand-in keeps the dragged item's measured size: it never grows or shrinks with the row. */
  [part~='placeholder'] {
    flex: none;
    min-inline-size: 0;
    list-style: none;
  }

  /* The landing line is out of the flow, above the items and the lifted one. */
  [part~='drop-indicator'] {
    position: absolute;
    z-index: 2;
    list-style: none;
    pointer-events: none;
    block-size: var(--_tp-drop-line, 2px);
    translate: 0 -50%;
  }

  :host([orientation='horizontal']) [part~='drop-indicator'] {
    inline-size: var(--_tp-drop-line, 2px);
    translate: -50% 0;
  }

  .handle {
    touch-action: none;
  }

  .empty {
    list-style: none;
  }
`;
