import { ambientCss } from '../../presentation/motion.js';
import { css, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { skeletonPresentation } from '../../presentation/families/skeleton.js';

export const primitiveMotionRoles = {
  skeletonLoading: {
    name: 'loading',
    kind: 'ambient',
    phases: ['start', 'stop'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export class TpSkeleton extends TpElement {
  static tagName = 'tp-skeleton';
  static override presentation = skeletonPresentation;
  static override properties = {
    ...TpElement.properties,
    label: { type: String },
    animated: { type: Boolean, reflect: true },
    motion: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        overflow: hidden;
        border-radius: var(--tp-radius-md);
      }

      [part~='skeleton'][animated][data-motion='pulse'] {
        animation: ${ambientCss('pulse', 'placeholder', 'var(--tp-easing-standard)')};
        animation-play-state: var(--tp-motion-play-state, running);
      }

      [part~='skeleton'][animated][data-motion='sweep']::after {
        content: '';
        display: block;
        width: 45%;
        height: 100%;
        opacity: var(--tp-opacity-disabled);
        animation: ${ambientCss('shimmer', 'placeholder')};
        animation-play-state: var(--tp-motion-play-state, running);
      }

      [part~='skeleton'][data-tp-motion-driven],
      [part~='skeleton'][data-tp-motion-driven]::after {
        animation: none !important;
      }

      [part~='skeleton'] {
        display: block;
        inline-size: 100%;
        block-size: 100%;
        overflow: hidden;
        border-radius: inherit;
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }

        50% {
          opacity: var(--tp-opacity-disabled);
        }
      }

      @keyframes shimmer {
        from {
          translate: -100% 0;
        }

        to {
          translate: 300% 0;
        }
      }
    `,
  ];
  label = 'Loading';
  animated = true;
  motion: 'pulse' | 'sweep' | 'none' = 'pulse';
  get #active(): boolean {
    return this.animated && this.motion !== 'none';
  }
  #loadingMotion: MotionHandle | null = null;
  #surface: HTMLElement | null = null;
  readonly #surfaceReference = (element: HTMLElement | null): void => {
    if (element === this.#surface) return;
    this.#loadingMotion?.cancel();
    this.#loadingMotion = null;
    this.#surface = element;
    if (element && this.isConnected && this.hasUpdated && this.#active)
      queueMicrotask(() => {
        if (this.#surface === element && this.isConnected && this.#active && !this.#loadingMotion)
          this.#startLoadingMotion('start', null, 'loading');
      });
  };
  override connectedCallback(): void {
    super.connectedCallback();
    void this.updateComplete.then(() => {
      if (this.isConnected && this.#active && !this.#loadingMotion) {
        this.#startLoadingMotion('start', null, 'loading');
      }
    });
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.get('animated') === undefined && changed.get('motion') === undefined) return;
    this.#startLoadingMotion(
      this.#active ? 'start' : 'stop',
      this.#active ? 'idle' : 'loading',
      this.#active ? 'loading' : 'idle',
    );
  }
  override disconnectedCallback(): void {
    this.#loadingMotion = null;
    super.disconnectedCallback();
  }
  #startLoadingMotion(
    phase: 'start' | 'stop',
    fromState: 'loading' | 'idle' | null,
    toState: 'loading' | 'idle',
  ): void {
    this.#loadingMotion?.cancel();
    this.#loadingMotion = prepareMotion(this, this.#surface, primitiveMotionRoles.skeletonLoading, {
      phase,
      fromState,
      toState,
    });
    this.#loadingMotion.start();
  }
  protected override render() {
    return this.renderPart(
      'skeleton',
      Object.freeze({
        animated: this.#active,
        motion: this.motion,
        motionPolicy: this.motionPolicy,
      }),
      {
        tag: 'div',
        reference: this.#surfaceReference,
        properties: {
          part: 'skeleton',
          animated: this.#active,
          'data-motion': this.motion,
          'aria-hidden': 'true',
        },
        protectedProperties: ['animated'],
      },
    );
  }
}
