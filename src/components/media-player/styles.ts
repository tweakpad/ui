import { css, unsafeCSS, type CSSResult } from 'lit';

/**
 * Container structure shared by the root (when it is the container) and `tp-media-container`:
 * the positioning context and stacking boundary for overlays, the media sizing, and the
 * presentation-only cursor hiding while controls are hidden (contract proposal §5 Cursor).
 * Appearance (radius, focus ring, scoped color scheme) comes from the `media-container` recipe.
 */
export const mediaContainerStyles = css`
  :host([data-media-container]) {
    display: block;
    position: relative;
    isolation: isolate;
    outline: none;
  }

  :host([data-media-container]) ::slotted(:is(video, audio)) {
    display: block;
    inline-size: 100%;
  }

  :host([data-media-container]) ::slotted(video) {
    block-size: 100%;
    object-fit: var(--tp-media-object-fit, contain);
    object-position: var(--tp-media-object-position, center);
  }

  @media (pointer: fine) {
    :host(
      [data-media-container][data-media-type='video'][data-started]:not([data-controls-visible])
    ) {
      cursor: none;
    }
  }
`;

/** Overlay layers fill the container; layering follows source order (proposal §5 Layering). */
export const mediaOverlayStyles = css`
  :host {
    position: absolute;
    inset: 0;
  }
`;

/**
 * User preferences for translucent overlay surfaces (Library mp-l-presentation; Video.js
 * `media-high-contrast` and `forced-colors` skin variants). Dictionary recipes cannot hold
 * `@media`, so the structure owns these overrides; `!important` lets the preference win over
 * recipe and per-instance paint, as an accessibility setting should.
 *
 * - `prefers-reduced-transparency: reduce` and `prefers-contrast: more`: no blur or text shadow;
 *   translucent surfaces become the opaque `background` role (still in the scoped dark scheme).
 * - `forced-colors: active`: decorative scrims are removed and surfaces use `Canvas` /
 *   `CanvasText` with a `CanvasText` outline, so they stay visible over the media.
 *
 * `selector` names the surface inside the component's shadow root (`:host` for the host).
 */
const HIGH_CONTRAST = '(prefers-reduced-transparency: reduce), (prefers-contrast: more)';

/**
 * The frosted overlay surface (Video.js default skin: a translucent surface with backdrop
 * blur) as private variables on the media container, so control groups and portaled popups
 * (volume, menus) inherit one surface. Preferences make it opaque without blur.
 */
export const mediaSurfaceVariables = css`
  :host([data-media-container]) {
    /* Darker than the upstream 10% white surface so text keeps contrast over bright footage. */
    --_tp-media-surface: color-mix(in oklab, var(--tp-background) 45%, transparent);
    --_tp-media-surface-filter: blur(calc(var(--tp-spacing) * 5)) saturate(110%);
    --_tp-media-surface-edge:
      0 0 0 var(--tp-border-width) color-mix(in oklab, var(--tp-background) 15%, transparent),
      inset 0 var(--tp-border-width) 0 0 color-mix(in oklab, var(--tp-foreground) 10%, transparent);
  }

  @media ${unsafeCSS(HIGH_CONTRAST)} {
    :host([data-media-container]) {
      --_tp-media-surface: var(--tp-background);
      --_tp-media-surface-filter: none;
    }
  }

  @media (forced-colors: active) {
    :host([data-media-container]) {
      --_tp-media-surface: Canvas;
      --_tp-media-surface-filter: none;
      --_tp-media-surface-edge: 0 0 0 1px CanvasText;
    }
  }
`;

/** Inline paint for portaled media popups (volume, settings), reading the container surface. */
export const mediaPopupSurface = {
  background: 'var(--_tp-media-surface)',
  'backdrop-filter': 'var(--_tp-media-surface-filter)',
  'box-shadow': 'var(--_tp-media-surface-edge)',
  'border-color': 'transparent',
} as const;

/** Opaque surface under high contrast; system colors under forced colors. */
export function mediaSurfacePreferenceStyles(selector: string): CSSResult {
  const target = unsafeCSS(selector);
  return css`
    @media ${unsafeCSS(HIGH_CONTRAST)} {
      ${target} {
        background: var(--tp-background) !important;
        backdrop-filter: none !important;
        text-shadow: none !important;
      }
    }

    @media (forced-colors: active) {
      ${target} {
        background: Canvas !important;
        color: CanvasText !important;
        outline: 1px solid CanvasText;
        backdrop-filter: none !important;
        text-shadow: none !important;
      }
    }
  `;
}

/** A decorative scrim: removed under forced colors, flattened under high contrast. */
export function mediaScrimPreferenceStyles(selector: string): CSSResult {
  const target = unsafeCSS(selector);
  return css`
    @media ${unsafeCSS(HIGH_CONTRAST)} {
      ${target} {
        backdrop-filter: none !important;
      }
    }

    @media (forced-colors: active) {
      ${target} {
        background: none !important;
        backdrop-filter: none !important;
      }
    }
  `;
}

/** Text drawn directly over the media: an opaque plate under high contrast or forced colors. */
export function mediaTextPreferenceStyles(selector: string): CSSResult {
  const target = unsafeCSS(selector);
  return css`
    @media ${unsafeCSS(HIGH_CONTRAST)} {
      ${target} {
        background: var(--tp-background) !important;
        text-shadow: none !important;
        border-radius: var(--tp-radius-md);
      }
    }

    @media (forced-colors: active) {
      ${target} {
        background: Canvas !important;
        color: CanvasText !important;
        text-shadow: none !important;
      }
    }
  `;
}
