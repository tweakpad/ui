import { css } from 'lit';

export const selectStyles = css`
  :host {
    display: inline-block;
    min-inline-size: 0;
  }

  .select-root {
    display: inline-flex;
    min-inline-size: 0;
    inline-size: 100%;
  }

  .select-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: space-between;
    min-inline-size: 0;
    inline-size: 100%;
    cursor: pointer;
  }

  .select-value,
  .select-item-text {
    display: inline-flex;
    align-items: center;
    min-inline-size: 0;
  }

  .select-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-trigger > tp-icon {
    flex: none;
    rotate: 90deg;
  }

  .select-content {
    position: absolute;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    margin: 0;
    padding: 0;
    inline-size: max-content;
    min-inline-size: var(--tp-anchor-width);
    max-inline-size: var(--tp-available-width, 100vw);
    max-block-size: var(--tp-available-height, 80vh);
    overflow: visible;
  }

  .select-body {
    position: relative;
    display: flex;
    flex: 1;
    flex-direction: column;
    min-block-size: 0;
    overflow: hidden;
    border-radius: inherit;
  }

  .select-content:not([data-positioned]) {
    visibility: hidden;
  }

  .select-content[data-presence='retained'] {
    display: none;
  }

  .select-list {
    flex: 1;
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
    scroll-padding-block: var(--_tp-select-scroll-up-height, 0)
      var(--_tp-select-scroll-down-height, 0);
    max-block-size: min(var(--tp-available-height, 80vh), calc(var(--tp-spacing) * 120));
    outline: 0;
  }

  .select-option {
    position: relative;
    display: flex;
    align-items: center;
    inline-size: 100%;
    min-inline-size: 0;
    cursor: default;
    user-select: none;
  }

  .select-item-text {
    flex: 1;
  }

  .select-indicator {
    position: absolute;
    inset-inline-end: var(--tp-space-2);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }

  .select-indicator[data-presence='retained'] {
    visibility: hidden;
  }

  .select-scroll {
    position: absolute;
    z-index: 1;
    inset-inline: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    inline-size: 100%;
    border: 0;
    cursor: default;
  }

  .select-scroll-up {
    inset-block-start: 0;
  }

  .select-scroll-down {
    inset-block-end: 0;
  }

  .select-scroll[data-presence='retained'] {
    display: none;
  }

  .select-scroll-up tp-icon {
    rotate: -90deg;
  }

  .select-scroll-down tp-icon {
    rotate: 90deg;
  }

  .select-backdrop {
    position: fixed;
    inset: 0;
    border: 0;
    background: transparent;
  }

  .select-separator {
    block-size: var(--tp-border-width);
    flex: none;
  }

  .select-separator[aria-orientation='vertical'] {
    inline-size: var(--tp-border-width);
    block-size: auto;
    align-self: stretch;
  }
`;
