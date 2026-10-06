import { ambientCss } from '../../presentation/motion.js';
import { css, html, nothing } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { prepareMotion, type MotionHandle } from '../../foundation/motion.js';
import type { MotionRoleDefinition } from '../../foundation/motion.js';
import { spinnerPresentation } from '../../presentation/families/spinner.js';

export const spinnerMotionRoles = {
  rotation: {
    name: 'rotation',
    kind: 'ambient',
    phases: ['start', 'stop'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export class TpSpinner extends TpElement {
  static tagName = 'tp-spinner';
  static override presentation = spinnerPresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    size: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-block;
        animation: ${ambientCss('spin')};
        animation-play-state: var(--tp-motion-play-state, running);
      }

      :host([data-tp-motion-driven]) {
        animation: none !important;
      }

      @keyframes spin {
        to {
          rotate: 1turn;
        }
      }
    `,
  ];
  label = 'Loading';
  size: 'sm' | 'default' | 'lg' = 'default';
  #rotationMotion: MotionHandle | null = null;
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (!this.isConnected || this.#rotationMotion) return;
      this.#rotationMotion = prepareMotion(this, this, spinnerMotionRoles.rotation, {
        phase: 'start',
        fromState: null,
        toState: 'loading',
      });
      this.#rotationMotion.start();
    });
  }
  override disconnectedCallback(): void {
    this.#rotationMotion = null;
    super.disconnectedCallback();
  }
  protected override render() {
    return this.label
      ? html`<span class="visually-hidden" role="status">${this.label}</span>`
      : nothing;
  }
}
