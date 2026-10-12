import { css } from 'lit';

/**
 * Structural styles of Custom cursor (Foundation `cc-anatomy`, `cc-layer`, `cc-visibility`):
 * the root occupies no space, the surface is a transform-only box in the top layer and the
 * content centers whatever it shows. Appearance comes from the recipe.
 */
export const cursorStyles = css`
  :host {
    display: contents;
  }

  /* The UA popover box (inset auto, border, padding, canvas colors) is reset so the surface is
     nothing but a positioned box; its transform is written each frame. */
  [part~='surface'] {
    position: fixed;
    inset: 0 auto auto 0;
    margin: 0;
    padding: 0;
    border: 0;
    background: transparent;
    overflow: visible;
    inline-size: max-content;
    block-size: max-content;
    color: inherit;
    display: grid;
    place-items: center;
    pointer-events: none;
    will-change: transform;
    transform: translate3d(-100vw, -100vh, 0);
  }

  /* Without a top layer the surface is a fixed box above everything else. */
  [part~='surface'].fixed {
    z-index: 2147483647;
  }

  [part~='content'] {
    display: grid;
    place-items: center;
  }

  [part~='content'] > * {
    grid-area: 1 / 1;
  }

  .resting,
  .clone {
    display: contents;
  }

  /* The resting content yields to an active zone's content. */
  [part~='content'][data-tp-clone] .resting {
    display: none;
  }
`;

/** Structural styles of a zone: a layout-neutral wrapper. */
export const cursorZoneStyles = css`
  :host {
    display: contents;
  }

  /* Native passthrough (Foundation cc-passthrough): the subtree, shadow parts included, takes
     the host pointer back. */
  :host([native]) {
    --tp-cursor-hidden: 0;
  }
`;
