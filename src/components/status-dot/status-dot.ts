import { css, html, nothing, type PropertyValues } from 'lit';
import { ref } from 'lit/directives/ref.js';
import { defaultTrue } from '../../foundation/converters.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';
import { TpElement } from '../../foundation/element.js';
import {
  ambientRole,
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../../foundation/motion.js';
import { statusDotPresentation } from '../../presentation/families/status-dot.js';
import { ambientCss } from '../../presentation/motion.js';
import { DescriptionTooltipController } from '../shared/description-tooltip.js';
import { TpTooltip } from '../tooltip/tooltip.js';

export type StatusDotVariant = 'default' | 'secondary' | 'success' | 'warning' | 'destructive';
export type StatusDotMotion = 'none' | 'pulse' | 'ping';

export const statusDotMotionRoles = {
  attention: ambientRole('attention'),
} as const satisfies Record<string, MotionRoleDefinition>;

const MOTIONS = new Set<StatusDotMotion>(['pulse', 'ping']);

/**
 * Marks a status with a small colored dot and a text label, shown beside the dot or presented
 * in a tooltip on hover and keyboard focus, optionally with a looping pulse or ping.
 *
 * @csspart status-dot-indicator - The dot.
 * @csspart status-dot-label - The label beside the dot, while `show-label` is set.
 * @csspart status-dot-description - The Tooltip presenting the label while it is not shown.
 * @cssprop --tp-status-dot-color - Dot color, replacing the variant color.
 * @cssprop --tp-status-dot-size - Dot diameter.
 */
export class TpStatusDot extends TpElement {
  static tagName = 'tp-status-dot';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpTooltip];
  }
  static override presentation = statusDotPresentation;
  static override properties = {
    ...TpElement.properties,
    variant: { type: String, reflect: true },
    label: { type: String },
    showLabel: { type: Boolean, attribute: 'show-label', reflect: true },
    tooltip: { converter: defaultTrue },
    motion: { type: String, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        --_tp-status-dot-size: var(--tp-status-dot-size, var(--tp-space-2));

        display: inline-flex;
        align-items: flex-start;
        vertical-align: middle;
        max-inline-size: 100%;
        min-inline-size: 0;
        color: inherit;
        font: inherit;
      }

      /* A shown Label gives the host its text baseline. */
      :host([data-label-shown]) {
        vertical-align: baseline;
      }

      .indicator {
        position: relative;
        flex: none;
        inline-size: var(--_tp-status-dot-size);
        block-size: var(--_tp-status-dot-size);
      }

      /* Centered on the first line of the Label. */
      :host([data-label-shown]) .indicator {
        margin-block: calc((1lh - var(--_tp-status-dot-size)) / 2);
      }

      .label {
        align-self: baseline;
        min-inline-size: 0;
        overflow-wrap: anywhere;
      }

      /* The ping ring repeats the dot's own fill and paints outside the layout. */
      .indicator::before {
        content: '';
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: inherit;
        opacity: 0;
        pointer-events: none;
      }

      /* The hover and focus target reaches the small icon size around the dot. */
      .indicator[tabindex]::after {
        content: '';
        position: absolute;
        inset: min(0px, calc(50% - var(--tp-icon-size-sm) / 2));
        border-radius: inherit;
      }

      .indicator[tabindex] {
        cursor: default;
      }

      .indicator[data-motion='pulse'] {
        animation: ${ambientCss('tp-status-dot-pulse', 'placeholder', 'var(--tp-easing-standard)')};
        animation-play-state: var(--tp-motion-play-state, running);
      }

      .indicator[data-motion='ping']::before {
        animation: ${ambientCss('tp-status-dot-ping', 'placeholder')};
        animation-play-state: var(--tp-motion-play-state, running);
      }

      .indicator[data-tp-motion-driven],
      .indicator[data-tp-motion-driven]::before {
        animation: none !important;
      }

      /* Reduced motion rests the dot instead of freezing it mid-cycle. */
      @container style(--tp-motion-play-state: paused) {
        .indicator[data-motion],
        .indicator[data-motion]::before {
          animation: none;
        }
      }

      @keyframes tp-status-dot-pulse {
        0%,
        100% {
          opacity: 1;
        }

        50% {
          opacity: var(--tp-opacity-disabled);
        }
      }

      @keyframes tp-status-dot-ping {
        0% {
          scale: 1;
          opacity: 0.6;
        }

        75%,
        100% {
          scale: 2.5;
          opacity: 0;
        }
      }
    `,
  ];

  /** Status color: `default`, `secondary`, `success`, `warning` or `destructive`. */
  variant: StatusDotVariant = 'default';
  /** Status text: shown beside the dot, or the dot's accessible name and tooltip. */
  label = '';
  /** Shows the label beside the dot instead of in a tooltip. */
  showLabel = false;
  /** Presents the label in a tooltip while it is not shown. */
  tooltip = true;
  /** Looping motion of the dot: `none`, `pulse` or `ping`. */
  motion: StatusDotMotion = 'none';

  #labelShown = false;
  #describing = false;
  readonly #descriptionTooltip = new DescriptionTooltipController(this, 'status-dot-description');
  // One function for the Tooltip content, so a re-render does not re-render the Tooltip.
  readonly #tooltipContent = (): string => this.label;
  #attention: MotionHandle | null = null;
  #indicator: HTMLElement | null = null;
  readonly #indicatorReference = (element: HTMLElement | null): void => {
    if (element === this.#indicator) return;
    this.#attention?.cancel();
    this.#attention = null;
    this.#indicator = element;
    if (element && this.isConnected && this.hasUpdated && this.#motion())
      queueMicrotask(() => {
        const motion = this.#motion();
        if (this.#indicator === element && this.isConnected && motion && !this.#attention)
          this.#requestAttention('start', null, motion);
      });
  };

  #motion(): Exclude<StatusDotMotion, 'none'> | null {
    return MOTIONS.has(this.motion) ? (this.motion as Exclude<StatusDotMotion, 'none'>) : null;
  }

  override connectedCallback(): void {
    super.connectedCallback();
    // Disconnection released the tooltip registration; the next update restores it.
    if (this.hasUpdated) this.requestUpdate();
    void this.updateComplete.then(() => {
      const motion = this.#motion();
      if (this.isConnected && motion && !this.#attention)
        this.#requestAttention('start', null, motion);
    });
  }

  override disconnectedCallback(): void {
    this.#attention = null;
    super.disconnectedCallback();
  }

  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    // A dot that kept focus after its tooltip went away leaves the focus order on blur.
    this.renderRoot.addEventListener('focusout', () => {
      if (!this.#describing) this.requestUpdate();
    });
  }

  /** Whether the dot has focus; it keeps it after its tooltip goes away. */
  #holdsFocus(): boolean {
    return Boolean((this.renderRoot as ShadowRoot).activeElement?.matches('.indicator'));
  }

  protected override render() {
    const named = this.label.trim() !== '';
    this.#labelShown = named && this.showLabel;
    this.#describing = named && !this.showLabel && this.tooltip;
    const holding = !this.#describing && this.#holdsFocus();
    // The label is exposed once: as the Label text, or as the name of the dot.
    const image = (named && !this.#labelShown) || holding;
    const focusable = this.#describing || holding;
    const motion = this.#motion();
    const state = Object.freeze({
      variant: this.variant,
      motion: motion ?? 'none',
      showLabel: this.#labelShown,
    });
    return html`${this.renderPart('status-dot-indicator', state, {
      tag: 'span',
      reference: this.#indicatorReference,
      properties: {
        class: 'indicator',
        part: focusable ? 'status-dot-indicator focusable' : 'status-dot-indicator',
        role: image ? 'img' : nothing,
        'aria-label': image ? this.label : nothing,
        'aria-hidden': image ? nothing : 'true',
        tabindex: this.#describing ? '0' : holding ? '-1' : nothing,
        'data-motion': motion ?? nothing,
      },
    })}${
      this.#labelShown
        ? this.renderPart('status-dot-label', state, {
            tag: 'span',
            // While the dot holds focus it carries the name, so the text is not read twice.
            properties: {
              class: 'label',
              part: 'status-dot-label',
              'aria-hidden': holding ? 'true' : nothing,
            },
            content: this.label,
          })
        : nothing
    }${
      this.#describing
        ? html`<tp-tooltip
            describes="none"
            ${ref(this.#descriptionTooltip.reference)}
            .content=${this.#tooltipContent}
          ></tp-tooltip>`
        : nothing
    }`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.toggleAttribute('data-label-shown', this.#labelShown);
    this.#descriptionTooltip.sync(this.#describing ? (this.#indicator ?? undefined) : undefined);
    if (!changed.has('motion') || changed.get('motion') === undefined) return;
    const previous = MOTIONS.has(changed.get('motion') as StatusDotMotion)
      ? (changed.get('motion') as StatusDotMotion)
      : 'none';
    const next = this.#motion() ?? 'none';
    if (previous === next) return;
    this.#requestAttention(next === 'none' ? 'stop' : 'start', previous, next);
  }

  #requestAttention(
    phase: 'start' | 'stop',
    fromState: StatusDotMotion | null,
    toState: StatusDotMotion,
  ): void {
    this.#attention?.cancel();
    this.#attention = prepareMotion(this, this.#indicator, statusDotMotionRoles.attention, {
      phase,
      fromState,
      toState,
      context: { motion: phase === 'start' ? toState : (fromState ?? 'none') },
    });
    this.#attention.start();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-status-dot': TpStatusDot;
  }
}
