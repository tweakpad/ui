import { transitionCss } from '../../presentation/motion.js';
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
    position: sticky;
    inset-block-start: 0;
    align-self: flex-start;
    flex: 0 0 auto;
    inline-size: var(--navigation-wide-extent);
    block-size: 100svh;
    min-inline-size: 0;
    transition: ${transitionCss(['inline-size'])};
  }

  .wide[data-tp-motion-driven] {
    transition: none;
  }

  .rail-mount {
    position: sticky;
    inset-block-start: 0;
    align-self: flex-start;
    flex: 0 0 auto;
    inline-size: var(--tp-target-size-min);
    block-size: 100svh;
  }

  .rail-mount[data-side='inline-end'] {
    order: 1;
  }

  .rail-mount ::slotted(*) {
    display: block;
    block-size: 100%;
  }

  .wide[data-collapsed][data-collapse-mode='off-canvas'] {
    inline-size: 0;
    padding: 0;
  }

  .wide[data-collapsed][data-collapse-mode='compact'] {
    inline-size: max(
      calc(var(--tp-target-size-min) + var(--tp-space-2) * 2 + var(--tp-border-width) * 2),
      calc(var(--tp-spacing) * 12)
    );
  }

  .wide[data-side='inline-end'] {
    order: 2;
  }

  .wide:is([data-variant='floating'], [data-variant='inset']) {
    padding: var(--tp-space-2);
  }

  .wide:is(
      [data-variant='floating'],
      [data-variant='inset']
    )[data-collapsed][data-collapse-mode='compact'] {
    inline-size: calc(
      max(
          var(--tp-target-size-min) + var(--tp-space-2) * 2 + var(--tp-border-width) * 2,
          var(--tp-spacing) * 12
        ) +
        var(--tp-space-2) * 2
    );
  }

  .primary {
    display: flex;
    flex-direction: column;
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

  ::slotted(tp-navigation-panel-content) {
    flex: 1;
    min-block-size: 0;
    overflow: auto;
  }

  ::slotted(tp-navigation-panel-header),
  ::slotted(tp-navigation-panel-footer) {
    flex: 0 0 auto;
  }

  [hidden] {
    display: none !important;
  }
`;
