import { css } from 'lit';
/** Placement and flow only; appearance is supplied by the replaceable family dictionary. */
export const navigationPanelStyles = css`
  :host {
    display: block;
    min-inline-size: 0;
  }
  .frame {
    position: relative;
    display: flex;
    min-inline-size: 0;
    min-block-size: 100svh;
  }
  .wide {
    flex: 0 0 auto;
    inline-size: var(--navigation-wide-extent);
    min-inline-size: 0;
    transition: inline-size calc(var(--tp-duration-normal) * var(--tp-motion-scale, 1))
      var(--tp-easing-standard);
  }
  .wide[data-tp-motion-driven] {
    transition: none;
  }
  .rail-mount {
    position: absolute;
    inset-block: 0;
    inset-inline-start: calc(var(--navigation-wide-extent) - var(--tp-target-min) / 2);
    inline-size: var(--tp-target-min);
    z-index: 1;
  }
  .rail-mount[data-side='inline-end'] {
    inset-inline-start: auto;
    inset-inline-end: calc(var(--navigation-wide-extent) - var(--tp-target-min) / 2);
  }
  .rail-mount[data-collapsed][data-collapse-mode='compact'] {
    --navigation-wide-extent: max(var(--tp-target-min), calc(var(--tp-spacing) * 12));
  }
  .rail-mount[data-collapsed][data-collapse-mode='off-canvas'] {
    --navigation-wide-extent: calc(var(--tp-target-min) / 2);
  }
  .rail-mount[data-compact] {
    position: static;
    inline-size: auto;
  }
  .rail-mount:not([data-compact]) ::slotted(*) {
    display: block;
    block-size: 100%;
  }
  .wide[data-collapsed][data-collapse-mode='off-canvas'] {
    inline-size: 0;
  }
  .wide[data-collapsed][data-collapse-mode='compact'] {
    inline-size: max(var(--tp-target-min), calc(var(--tp-spacing) * 12));
  }
  .wide[data-side='inline-end'] {
    order: 2;
  }
  .primary {
    flex: 1;
    min-inline-size: 0;
  }
  .toolbar {
    display: flex;
    align-items: center;
  }
  .projection {
    display: contents;
  }
  [hidden] {
    display: none !important;
  }
`;
export const navigationViewStyles = css`
  :host {
    display: block;
    inline-size: 100%;
    block-size: 100%;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  nav {
    display: flex;
    flex-direction: column;
    inline-size: 100%;
    min-inline-size: 0;
    block-size: 100%;
    min-block-size: 0;
    overflow: hidden;
  }
  header,
  footer {
    flex: 0 0 auto;
  }
  [part~='navigation-panel-content'] {
    flex: 1;
    min-block-size: 0;
    overflow: auto;
  }
  slot {
    display: contents;
  }
  [hidden] {
    display: none !important;
  }
`;
