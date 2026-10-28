import { css, html, type PropertyValues } from 'lit';
import { hiddenStyles } from '../shared/control-styles.js';
import { TpElement } from '../../foundation/element.js';
import {
  ambientRole,
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { markerPresentation } from '../../presentation/families/marker.js';
import { shimmerStyles } from '../../presentation/motion.js';

export const markerMotionRoles = {
  shimmer: ambientRole('shimmer'),
} as const satisfies Record<string, MotionRoleDefinition>;

/**
 * A quiet line of status or activity text in a stream, such as a chat transcript or an activity
 * log, with an optional icon, plain or set between rules. It adds no role: its text carries the
 * meaning, and `role="status"` makes a live update announce itself.
 *
 * @slot - The text, or inline content such as a link or a Button.
 * @slot icon - A decorative Icon or Spinner before the text, hidden from assistive technology.
 * @cssprop --tp-shimmer-color - The color of the highlight; by default derived from the text color.
 * @cssprop --tp-shimmer-duration - The time one sweep takes.
 * @cssprop --tp-shimmer-spread - Half the width of the highlight band.
 * @cssprop --tp-shimmer-angle - The tilt of the highlight band.
 * @cssprop --tp-shimmer-iterations - How many times the sweep plays; `1` plays a single sweep, as a reveal when a step completes.
 * @cssprop --tp-shimmer-direction - `reverse` runs the sweep against the reading direction.
 */
export class TpMarker extends TpElement {
  static tagName = 'tp-marker';
  static override presentation = markerPresentation;
  static override properties = {
    ...TpElement.properties,
    variant: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    label: { type: String },
    shimmer: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        min-inline-size: 0;
      }

      .root {
        position: relative;
        display: flex;
        align-items: center;
        inline-size: 100%;
        min-inline-size: 0;
        box-sizing: border-box;
      }

      .icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex: none;
      }

      .content {
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      ${hiddenStyles}
    `,
    shimmerStyles(':host([shimmer]) .content'),
  ];
  /** Visual treatment only: `separator` sets the content between two rules, `border` above one. */
  variant: 'default' | 'separator' | 'border' = 'default';
  /** Colors the text and the icon: `accent`, `success` or `danger` for an outcome the words also state. */
  tone = 'neutral';
  /** The text when the default slot is empty. */
  label = '';
  /** Sweeps a highlight across the content text, for streaming or in-progress status. */
  shimmer = false;
  #shimmerMotion: MotionHandle | null = null;
  #content: HTMLElement | null = null;
  readonly #contentReference = (element: HTMLElement | null): void => {
    if (element === this.#content) return;
    this.#shimmerMotion?.cancel();
    this.#shimmerMotion = null;
    this.#content = element;
    if (element && this.isConnected && this.hasUpdated && this.shimmer)
      queueMicrotask(() => {
        if (this.#content === element && this.isConnected && this.shimmer && !this.#shimmerMotion)
          this.#requestShimmer('start', null, 'shimmer');
      });
  };
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (this.isConnected && this.shimmer && !this.#shimmerMotion)
        this.#requestShimmer('start', null, 'shimmer');
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.get('shimmer') === undefined) return;
    this.#requestShimmer(
      this.shimmer ? 'start' : 'stop',
      this.shimmer ? 'idle' : 'shimmer',
      this.shimmer ? 'shimmer' : 'idle',
    );
    // Setting shimmer again replays the sweep, also a finished one or one cleared in this frame.
    if (this.shimmer && this.#content && !this.#shimmerMotion?.claimed) {
      const { style } = this.#content;
      style.setProperty('animation-name', 'none');
      void getComputedStyle(this.#content).animationName;
      style.removeProperty('animation-name');
    }
  }
  override disconnectedCallback(): void {
    this.#shimmerMotion = null;
    super.disconnectedCallback();
  }
  #requestShimmer(
    phase: 'start' | 'stop',
    fromState: 'shimmer' | 'idle' | null,
    toState: 'shimmer' | 'idle',
  ): void {
    this.#shimmerMotion?.cancel();
    this.#shimmerMotion = prepareMotion(this, this.#content, markerMotionRoles.shimmer, {
      phase,
      fromState,
      toState,
    });
    this.#shimmerMotion.start();
  }
  protected override render() {
    const icon = Array.from(this.children).some((child) => child.slot === 'icon');
    const state = Object.freeze({ variant: this.variant, shimmer: this.shimmer });
    return this.renderPart('marker', state, {
      properties: { class: 'root', part: 'marker' },
      content: html`${this.renderPart('marker-icon', state, {
        tag: 'span',
        properties: { class: 'icon', part: 'marker-icon', hidden: !icon, 'aria-hidden': 'true' },
        content: html`<slot name="icon" @slotchange=${() => this.requestUpdate()}></slot>`,
      })}${this.renderPart('marker-content', state, {
        tag: 'span',
        reference: this.#contentReference,
        properties: { class: 'content', part: 'marker-content' },
        content: html`<slot>${this.label}</slot>`,
      })}`,
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-marker': TpMarker;
  }
}
