import { ambientCss } from '../presentation/motion.js';
import { css, html, nothing } from 'lit';
import { TpElement } from '../foundation/element.js';
import { progressMotionRoles } from './progress/motion.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';

export const displayMotionRoles = {
  carouselTrack: {
    name: 'track',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
  progressValue: progressMotionRoles.value,
  progressIndeterminate: progressMotionRoles.indeterminate,
  spinnerRotation: {
    name: 'rotation',
    kind: 'ambient',
    phases: ['start', 'stop'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export { TpAvatar, TpAvatarGroup } from './avatar/index.js';
export type { AvatarLoadingStatus } from './avatar/index.js';

export { TpCarousel } from './carousel/index.js';
export type * from './carousel/index.js';

export * from './data-visualization/index.js';

export * from './message-scroller/index.js';

export { TpProgress } from './progress/index.js';

export * from './resizable-panel-group/index.js';

export * from './scroll-area/index.js';

export class TpSeparator extends TpElement {
  static tagName = 'tp-separator';
  static override properties = {
    ...TpElement.properties,
    decorative: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        height: var(--tp-border-width);
        width: 100%;
      }

      :host([orientation='vertical']) {
        height: 100%;
        width: var(--tp-border-width);
      }
    `,
  ];
  decorative = true;
  protected override render() {
    return this.renderPart(
      'root',
      Object.freeze({ decorative: this.decorative, orientation: this.orientation }),
      {
        tag: 'div',
        properties: {
          part: 'root',
          role: this.decorative ? 'none' : 'separator',
          'aria-orientation': this.decorative ? nothing : this.orientation,
        },
      },
    );
  }
}

export class TpSpinner extends TpElement {
  static tagName = 'tp-spinner';
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
      this.#rotationMotion = prepareMotion(this, this, displayMotionRoles.spinnerRotation, {
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

export { TpToast } from './toast/index.js';
