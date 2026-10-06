import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { TpMediaElement } from './context.js';
import { mediaContainerStyles, mediaSurfaceVariables } from './styles.js';

/**
 * `tp-media-container`: optional container part (`mp-f-container`). When present inside a
 * `tp-media-player`, it takes over the container roles from the root: fullscreen target,
 * activity/idle surface, hotkey and gesture surface, and anchored-surface (portal) boundary.
 * Content outside it (a playlist, a transcript) stays in the player scope but outside fullscreen.
 *
 * The player manages its ARIA (`role="group"`, `tabindex="0"`, `aria-label`, unless authored), its
 * state markers (`data-paused`, `data-controls-visible`, …) and `--tp-media-caption-offset`.
 *
 * @slot - The media element and overlay constituents.
 */
export class TpMediaContainer extends TpMediaElement {
  static tagName = 'tp-media-container';

  static override styles = [
    TpElement.styles,
    mediaContainerStyles,
    mediaSurfaceVariables,
    css`
      :host {
        display: block;
        position: relative;
      }

      :host([data-disabled]) {
        cursor: auto;
        opacity: 1;
      }
    `,
  ];

  protected override render() {
    return html`<slot></slot>`;
  }
}
