import { css } from 'lit';
/** Containment and measured gesture geometry. Paint belongs to the shared dictionary. */
export const drawerStyles = css`
  .drawer-viewport {
    position: fixed;
    inset: 0;
    margin: 0;
    padding: 0;
    border: 0;
    width: 100vw;
    height: var(--drawer-viewport-height, 100dvh);
    max-width: none;
    max-height: none;
    overflow: clip;
    background: transparent;
    pointer-events: none;
  }

  .drawer-viewport::backdrop {
    background: transparent;
  }

  .drawer-viewport[data-modal] {
    pointer-events: auto;
  }

  .content.drawer-surface {
    position: absolute;
    inset: auto;
    margin: 0;
    padding: 0;
    inline-size: auto;
    block-size: auto;
    max-inline-size: none;
    max-block-size: none;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    pointer-events: auto;
    transform: translate(var(--drawer-swipe-movement-x, 0), var(--drawer-swipe-movement-y, 0));
  }

  .drawer-surface[data-swipe-direction='down'],
  .drawer-surface[data-swipe-direction='up'] {
    left: 0;
    right: 0;
    width: 100%;
    height: auto;
    max-height: calc(var(--drawer-viewport-height, 100dvh) - var(--tp-space-8));
  }

  .drawer-surface[data-swipe-axis='y'] {
    transform: translateY(
      calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y, 0px))
    );
  }

  .drawer-surface[data-swipe-axis='x'] {
    transform: translateX(
      calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-x, 0px))
    );
  }

  .drawer-surface[data-swipe-direction='down'] {
    bottom: 0;
    transform-origin: bottom;
  }

  .drawer-surface[data-swipe-direction='up'] {
    top: 0;
    transform-origin: top;
  }

  .drawer-surface[data-swipe-axis='y'][data-snap-points] {
    height: var(--drawer-viewport-height, 100dvh);
  }

  .drawer-surface[data-swipe-direction='left'],
  .drawer-surface[data-swipe-direction='right'] {
    top: 0;
    bottom: 0;
    height: 100%;
    width: min(75vw, calc(var(--tp-spacing) * 96));
    flex-direction: row;
  }

  .drawer-surface[data-swipe-direction='left'] {
    left: 0;
    transform-origin: left;
  }

  .drawer-surface[data-swipe-direction='right'] {
    right: 0;
    transform-origin: right;
  }

  .drawer-content {
    display: flex;
    flex-direction: column;
    min-width: 0;
    min-height: 0;
    flex: 1;
    overflow: hidden;
  }

  .header,
  .footer {
    flex: none;
  }

  .body {
    min-height: 0;
    min-width: 0;
    overflow: auto;
    flex: 1;
    overscroll-behavior: contain;
    scroll-padding: var(--tp-space-3);
  }

  .footer {
    margin-block-start: auto;
  }

  .swipe-handle {
    display: flex;
    flex: none;
    position: relative;
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  .swipe-handle:active {
    cursor: grabbing;
  }

  .swipe-handle::after {
    content: '';
    display: block;
    pointer-events: none;
  }

  .drawer-surface[data-swipe-axis='y'] > .swipe-handle {
    width: 100%;
    height: var(--tp-space-3);
    justify-content: center;
  }

  .drawer-surface[data-swipe-axis='x'] > .swipe-handle {
    /* Overlay the edge so section backgrounds span the entire surface. */
    position: absolute;
    top: 0;
    z-index: 1;
    height: 100%;
    width: var(--tp-space-3);
    align-items: center;
  }

  .drawer-surface[data-swipe-direction='left'] > .swipe-handle {
    right: 0;
  }

  .drawer-surface[data-swipe-direction='down'] > .swipe-handle {
    align-items: end;
  }

  .drawer-surface[data-swipe-direction='right'] > .swipe-handle {
    left: 0;
    justify-content: end;
  }

  .drawer-surface[data-swipe-direction='up'] > .swipe-handle,
  .drawer-surface[data-swipe-direction='left'] > .swipe-handle {
    order: 1;
  }

  .drawer-surface[data-swiping] {
    user-select: none;
  }
`;
