import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import type { TpOpenChangeEvent } from '../foundation/events.js';
import type { CollapsibleIndicatorPosition, TpCollapsible } from './collapsible.js';

export type AccordionIndicatorPosition = CollapsibleIndicatorPosition;

/** A public Accordion Item host. Its Root owns selection; Collapsible owns disclosure behavior. */
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

      tp-collapsible[disabled] {
        opacity: 1 !important;
      }

      tp-collapsible::part(collapsible-trigger) {
        width: 100%;
        padding: var(--tp-space-3) var(--tp-space-4);
        border: 0;
        background: transparent;
        color: inherit;
        font: inherit;
        text-align: start;
        cursor: pointer;
      }

      tp-collapsible::part(collapsible-trigger):disabled {
        cursor: not-allowed;
      }

      tp-collapsible::part(collapsible-trigger):focus-visible {
        outline: var(--tp-ring-width) var(--tp-border-style) var(--tp-ring);
        outline-offset: calc(-1 * var(--tp-ring-width));
      }

      .label {
        display: contents;
      }
    `,
  ];

  value = '';
  indicatorPosition: AccordionIndicatorPosition = 'trailing';
  headingLevel = 2;
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;
  override orientation = 'vertical' as const;

  get collapsibleElement(): TpCollapsible | null {
    return this.renderRoot.querySelector<TpCollapsible>('tp-collapsible');
  }

  get triggerElement(): HTMLButtonElement | null {
    return this.collapsibleElement?.triggerElement ?? null;
  }

  get panelElement(): HTMLElement | null {
    return this.collapsibleElement?.panelElement ?? null;
  }

  get bodyElement(): HTMLElement | null {
    return this.collapsibleElement?.bodyElement ?? null;
  }

  get indicatorElement(): HTMLElement | null {
    return this.collapsibleElement?.indicatorElement ?? null;
  }

  override focus(options?: FocusOptions): void {
    this.triggerElement?.focus(options);
  }

  protected override render() {
    return html`<tp-collapsible
      .indicatorPosition=${this.indicatorPosition}
      .headingLevel=${this.headingLevel}
      exportparts="collapsible-heading: accordion-heading, collapsible-trigger: accordion-trigger, collapsible-indicator: accordion-indicator, collapsible-content: accordion-content, collapsible-content-body: accordion-content-body"
    >
      <span slot="trigger" class="label"><slot name="label"></slot></span>
      <slot
        name="indicator"
        slot="indicator"
        @slotchange=${() => this.collapsibleElement?.refreshIndicator()}
      ></slot>
      <slot></slot>
    </tp-collapsible>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const position = this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
    this.setAttribute('data-icon-edge', position);
    this.collapsibleElement?.refreshIndicator();
  }
}
