import { css } from 'lit';
export const comboboxStyles = css`
  :host {
    display: inline-block;
    min-inline-size: 0;
  }
  .root {
    min-inline-size: 0;
  }
  .control {
    inline-size: 100%;
    min-inline-size: 0;
  }
  .editor {
    inline-size: 100%;
    min-inline-size: 0;
    flex: 1;
  }
  .toggle tp-icon {
    rotate: 90deg;
  }
  .listbox {
    position: absolute;
    z-index: 1000;
    display: flex;
    flex-direction: column;
    margin: 0;
    inline-size: max-content;
    min-inline-size: var(--tp-anchor-width);
    max-inline-size: var(--tp-available-width, 100vw);
    max-block-size: var(--tp-available-height, 80vh);
    overflow: visible;
  }
  .listbox:not([data-positioned]) {
    visibility: hidden;
  }
  .listbox[data-inline] {
    position: static;
    visibility: visible;
  }
  .listbox[data-presence='retained'] {
    display: none;
  }
  .list {
    min-block-size: 0;
    overflow: auto;
    overscroll-behavior: contain;
    border-radius: inherit;
    outline: 0;
  }
  .option {
    position: relative;
    display: flex;
    align-items: center;
    inline-size: 100%;
    min-inline-size: 0;
    cursor: default;
    user-select: none;
  }
  .option-text {
    display: flex;
    align-items: center;
    gap: var(--tp-space-2);
    flex: 1;
    min-inline-size: 0;
  }
  .indicator {
    position: absolute;
    inset-inline-end: var(--tp-space-2);
    display: inline-flex;
    flex: none;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  }
  .indicator[data-presence='retained'] {
    visibility: hidden;
  }
  .chips {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
  }
  .chips > .editor {
    inline-size: auto;
    min-inline-size: calc(var(--tp-spacing) * 16);
    padding: 0;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    min-inline-size: 0;
  }
  .row {
    display: flex;
  }
  .backdrop {
    position: fixed;
    inset: 0;
  }
  .arrow {
    position: absolute;
    pointer-events: none;
  }
  .arrow[data-side='bottom'] {
    inset-block-start: 0;
    translate: 0 -100%;
    rotate: 180deg;
  }
  .arrow[data-side='top'] {
    bottom: 0;
    translate: 0 100%;
  }
  .arrow[data-side='left'] {
    right: 0;
    translate: 100% 0;
    rotate: -90deg;
  }
  .arrow[data-side='right'] {
    left: 0;
    translate: -100% 0;
    rotate: 90deg;
  }
  .arrow svg {
    display: block;
    inline-size: 100%;
    block-size: 100%;
    fill: currentcolor;
  }
`;
