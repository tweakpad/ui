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
      }

      [part~='accordion-heading'] {
        margin: 0;
        font: inherit;
      }

      [part~='accordion-trigger'] {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        width: 100%;
        padding: 0.85rem 1rem;
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
        outline: 2px solid var(--tp-color-accent, Highlight);
        outline-offset: -2px;
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
