import { css, html, type PropertyDeclarations, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { OwnedAttributes } from '../../foundation/owned-attributes.js';
import { TpMediaElement, closeMediaPopups, type MediaPlayerApi } from './context.js';
import { mediaScrimPreferenceStyles, mediaSurfacePreferenceStyles } from './styles.js';

export type MediaControlsVisibility = 'auto' | 'always';

/**
 * `tp-media-controls`: the controls visibility region (Library mp-l-controls, `sec-1922`).
 *
 * - `visibility="auto"` (default) follows `controlsVisible` and overlays the bottom of the
 *   container with an optional `backdrop` scrim; `always` keeps it visible and in flow (audio).
 * - Markers: `data-visible`, `data-user-active`.
 * - Hiding is a non-blocking `state` motion (opacity) that never moves focus; focus inside the
 *   region holds a `focus` controls lock, and the pointer over it a `hover` lock unless the player
 *   sets `hide-over-controls`. Popups inside close with reason `idle` when it hides.
 * - The region is `data-interactive` with `pointer-events: none`; its children take
 *   `pointer-events: auto`, so taps between groups reach the gesture surface.
 *
 * @csspart backdrop - Decorative scrim behind the controls (`aria-hidden`).
 * @slot - Controls and `tp-media-controls-group` elements.
 */
export class TpMediaControls extends TpMediaElement {
  static tagName = 'tp-media-controls';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    visibility: { type: String, reflect: true },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        position: relative;
        z-index: 3;
        pointer-events: none;
      }

      :host(:not([visibility='always'])) {
        position: absolute;
        inset-inline: 0;
        inset-block-end: 0;
      }

      ::slotted(*) {
        pointer-events: auto;
      }

      :host(:not([data-visible])) {
        opacity: 0;
      }

      :host(:not([data-visible])) ::slotted(*) {
        pointer-events: none;
      }

      [part~='backdrop'] {
        position: absolute;
        inset: 0;
        z-index: -1;
        pointer-events: none;
      }

      :host([visibility='always']) [part~='backdrop'] {
        display: none;
      }
    `,
    // Over the media: the scrim flattens and each control group becomes an opaque surface.
    mediaScrimPreferenceStyles("[part~='backdrop']"),
    mediaSurfacePreferenceStyles(":host(:not([visibility='always'])) ::slotted(*)"),
  ];

  /** `auto` follows controls visibility; `always` stays visible (audio layout). */
  visibility: MediaControlsVisibility = 'auto';

  readonly #activity = this.select((state) => ({
    visible: state.controlsVisible,
    active: state.userActive,
  }));
  #wasVisible = true;
  #tracked: { player: MediaPlayerApi; hover: boolean; release: () => void } | undefined;
  #owned: OwnedAttributes | undefined;

  /** Whether the region is currently shown. */
  get visible(): boolean {
    return this.visibility === 'always' || !this.player || this.#activity.value.visible;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    const owned = (this.#owned ??= new OwnedAttributes(this));
    // Activity and gestures treat the whole region as interactive.
    if (owned.original('data-interactive') === null) owned.set('data-interactive', '');
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#untrack();
    this.#owned?.dispose();
    this.#owned = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const visible = this.visible;
    this.toggleAttribute('data-visible', visible);
    this.toggleAttribute('data-user-active', !this.player || this.#activity.value.active);
    if (this.#wasVisible && !visible) closeMediaPopups(this, 'idle');
    this.#wasVisible = visible;
    this.#track();
  }

  protected override render() {
    return html`<div part="backdrop" aria-hidden="true"></div>
      <slot></slot>`;
  }

  /** Focus and hover locks on the current player (re-done when the player or option changes). */
  #track(): void {
    const player = this.player;
    const hover = player ? !player.hideOverControls : false;
    if (this.#tracked?.player === player && this.#tracked?.hover === hover) return;
    this.#untrack();
    if (!player) return;
    const releaseFocus = player.trackFocusWithin(this);
    const releaseHover = hover ? player.trackHover(this) : undefined;
    const releaseRegion = player.registerControlsRegion?.(this);
    this.#tracked = {
      player,
      hover,
      release: () => {
        releaseFocus();
        releaseHover?.();
        releaseRegion?.();
      },
    };
  }

  #untrack(): void {
    this.#tracked?.release();
    this.#tracked = undefined;
  }
}

/**
 * `tp-media-controls-group`: layout grouping inside the controls. It is a `role="group"` only when
 * named (`label` or an authored `aria-label`/`aria-labelledby`); controls inside stay independent
 * tab stops in document order. `orientation` lays the group out in a row or column.
 *
 * @slot - Media controls.
 */
export class TpMediaControlsGroup extends TpMediaElement {
  static tagName = 'tp-media-controls-group';

  static override properties: PropertyDeclarations = {
    ...TpMediaElement.properties,
    label: { type: String },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: flex;
        align-items: center;
        min-inline-size: 0;
      }

      :host([data-orientation='vertical']) {
        flex-direction: column;
      }
    `,
  ];

  /** Accessible name; naming the group gives it `role="group"`. */
  label = '';

  #aria: OwnedAttributes | undefined;

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#aria?.dispose();
    this.#aria = undefined;
  }

  protected override updated(changed: PropertyValues): void {
    super.updated(changed);
    const aria = (this.#aria ??= new OwnedAttributes(this));
    const authoredLabel = aria.original('aria-label');
    const authoredLabelledBy = aria.original('aria-labelledby');
    if (authoredLabel === null) aria.set('aria-label', this.label || null);
    const named = Boolean(this.label || authoredLabel || authoredLabelledBy);
    if (aria.original('role') === null) aria.set('role', named ? 'group' : null);
  }

  protected override render() {
    return html`<slot></slot>`;
  }
}
