import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import type { TpOpenChangeEvent } from '../foundation/events.js';
import { chevronRightIcon } from '../icons/chevron-right.js';

export type AccordionIndicatorPosition = 'leading' | 'trailing';

/** A public Accordion Item host. Its Root owns selection and presence. */
export class TpAccordionItem extends TpElement {
  static tagName = 'tp-accordion-item';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    indicatorPosition: { type: String, attribute: 'indicator-position', reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level', reflect: true },
    onOpenChange: { attribute: false },
  };

  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
        overflow: var(--_tp-accordion-item-overflow);
        border-width: var(--_tp-accordion-item-border-width);
        border-block-start-width: var(--_tp-accordion-item-border-block-start-width);
        border-style: var(--tp-border-style);
        border-color: var(--tp-border);
        border-radius: var(--_tp-accordion-item-radius);
        background: var(--_tp-accordion-item-background);
      }

      :host([data-index='0']) {
        border-block-start-width: var(--_tp-accordion-item-border-width);
      }

      [part~='accordion-heading'] {
        margin: 0;
        font: inherit;
      }

      [part~='accordion-trigger'] {
        display: flex;
        align-items: center;
        gap: var(--tp-space-3);
        width: 100%;
        padding: var(--tp-space-3) var(--tp-space-4);
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }

      [part~='accordion-trigger'][data-disabled] {
        cursor: not-allowed;
      }

      [part~='accordion-trigger']:focus-visible {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: calc(-1 * var(--tp-ring-width));
      }

      .label {
        flex: 1;
        min-width: 0;
      }

      [part~='accordion-indicator'] {
        flex: none;
        pointer-events: none;
        line-height: 1;
      }

      :host([data-icon-edge='leading']) [part~='accordion-indicator'] {
        order: -1;
      }

      [part~='accordion-content'][data-tp-motion-driven],
      [part~='accordion-indicator'][data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];

  value = '';
  indicatorPosition: AccordionIndicatorPosition = 'trailing';
  headingLevel = 2;
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;
  override orientation = 'vertical' as const;

  get triggerElement(): HTMLButtonElement | null {
    return this.renderRoot.querySelector<HTMLButtonElement>('[part~="accordion-trigger"]');
  }

  get panelElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="accordion-content"]');
  }

  get bodyElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="accordion-content-body"]');
  }

  get indicatorElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="accordion-indicator"]');
  }

  override focus(options?: FocusOptions): void {
    this.triggerElement?.focus(options);
  }

  protected override render() {
    const position = this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
    const level = Math.min(6, Math.max(1, Math.trunc(this.headingLevel) || 2));
    return html`
      <div part="accordion-heading" role="heading" aria-level=${level}>
        <button part="accordion-trigger" type="button">
          <span class="label"><slot name="label"></slot></span>
          <span part="accordion-indicator" data-icon-edge=${position} aria-hidden="true">
            <slot name="indicator"><tp-icon .icon=${chevronRightIcon}></tp-icon></slot>
          </span>
        </button>
      </div>
      <div part="accordion-content" hidden>
        <div part="accordion-content-body"><slot></slot></div>
      </div>
    `;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const position = this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
    this.setAttribute('data-icon-edge', position);
  }
}
