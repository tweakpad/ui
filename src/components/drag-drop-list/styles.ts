import { css } from 'lit';
export const dragDropListStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }

  .list {
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

  .handle {
    touch-action: none;
  }

  .empty {
    list-style: none;
  }
`;
