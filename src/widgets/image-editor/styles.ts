import { css, unsafeCSS } from 'lit';
import { ambientCss } from '../../presentation/motion.js';
import { RESIZE_SEPARATOR_TARGET } from '../../foundation/resize-separator.js';

/**
 * Geometry the presentation cannot replace: the viewport fills the host, the image layer moves
 * by transform from the top-left corner, and the region and its handles sit over it. Paint lives
 * in the presentation family.
 */
export const imageEditorStyles = css`
  :host {
    display: block;
    position: relative;
    min-inline-size: 0;
    block-size: calc(var(--tp-spacing) * 80);
  }

  :host([hidden]) {
    display: none;
  }

  .root {
    position: relative;
    inline-size: 100%;
    block-size: 100%;
  }

  .viewport {
    position: absolute;
    inset: 0;
    overflow: hidden;
    touch-action: none;
    user-select: none;
    cursor: grab;

    /* The default region's margin, read back as padding; absolute children ignore it. */
    padding: var(--tp-image-editor-inset, var(--tp-space-6));
    box-sizing: border-box;
  }

  /* Cooperative gestures leave single-finger scrolling to the page. */
  :host([cooperative-gestures]) .viewport {
    touch-action: pan-x pan-y;
  }

  .root[data-status='error'] .viewport,
  .root[data-status='loading'] .viewport,
  :host([disabled]) .viewport {
    cursor: default;
  }

  .background,
  .placeholder,
  .error {
    position: absolute;
    inset: 0;
  }

  /* Image space is physical: the layer, the region and the handles place from the top left in
     every writing direction. */
  .layer {
    position: absolute;
    left: 0;
    top: 0;
    transform-origin: 0 0;
    will-change: transform;
  }

  img {
    position: absolute;
    display: block;
    max-inline-size: none;
    transform-origin: center;
    pointer-events: none;
    user-select: none;
    -webkit-user-drag: none;
  }

  .region {
    position: absolute;
    box-sizing: border-box;
    pointer-events: none;
  }

  .region[data-adjustable] {
    pointer-events: auto;
    cursor: move;
  }

  :host([region-drag='pan']) .region[data-adjustable] {
    cursor: grab;
  }

  .region[data-shape='circle'] {
    border-radius: 50%;
  }

  .guides {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    opacity: 0;
    pointer-events: none;
  }

  .region[data-adjusting] .guides {
    opacity: 1;
  }

  .handle {
    position: absolute;
    translate: -50% -50%;
    touch-action: none;
  }

  /* A larger hit target than the mark, larger still under a coarse pointer. */
  .handle::before {
    content: '';
    position: absolute;
    inset: calc((var(--tp-resize-target-fine, ${unsafeCSS(RESIZE_SEPARATOR_TARGET.fine)}px) * -1));
  }

  @media (any-pointer: coarse) {
    .handle::before {
      inset: calc(
        (var(--tp-resize-target-coarse, ${unsafeCSS(RESIZE_SEPARATOR_TARGET.coarse)}px) * -1)
      );
    }
  }

  .handle[data-handle='nw'] {
    left: 0;
    top: 0;
    cursor: nwse-resize;
  }

  .handle[data-handle='n'] {
    left: 50%;
    top: 0;
    cursor: ns-resize;
  }

  .handle[data-handle='ne'] {
    left: 100%;
    top: 0;
    cursor: nesw-resize;
  }

  .handle[data-handle='e'] {
    left: 100%;
    top: 50%;
    cursor: ew-resize;
  }

  .handle[data-handle='se'] {
    left: 100%;
    top: 100%;
    cursor: nwse-resize;
  }

  .handle[data-handle='s'] {
    left: 50%;
    top: 100%;
    cursor: ns-resize;
  }

  .handle[data-handle='sw'] {
    left: 0;
    top: 100%;
    cursor: nesw-resize;
  }

  .handle[data-handle='w'] {
    left: 0;
    top: 50%;
    cursor: ew-resize;
  }

  /* A circle's edge handles sit on the circle; its corner handles would float outside it. */
  .region[data-shape='circle'] .handle[data-handle$='e']:not([data-handle='e']),
  .region[data-shape='circle'] .handle[data-handle$='w']:not([data-handle='w']) {
    display: none;
  }

  /* Loading pulses like a Skeleton placeholder; reduced motion holds it still. */
  .placeholder {
    animation: ${ambientCss('pulse', 'placeholder', 'var(--tp-easing-standard)')};
    animation-play-state: var(--tp-motion-play-state, running);
  }

  @media (prefers-reduced-motion: reduce) {
    .placeholder {
      animation: none;
    }
  }

  @keyframes pulse {
    0%,
    100% {
      opacity: 1;
    }

    50% {
      opacity: 0.5;
    }
  }

  .error {
    display: grid;
    place-content: center;
    justify-items: center;
    text-align: center;
    padding: var(--tp-space-4);
  }

  .error slot {
    display: contents;
  }

  .controls {
    position: absolute;
    inset-inline: 0;
    inset-block-end: 0;
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
    align-items: center;
    pointer-events: none;
  }

  .controls[data-position='top'] {
    inset-block: 0 auto;
  }

  .controls > * {
    pointer-events: auto;
  }

  .set {
    display: inline-flex;
    align-items: center;
  }

  .set .slider {
    inline-size: calc(var(--tp-spacing) * 28);
    flex: none;
  }
`;
