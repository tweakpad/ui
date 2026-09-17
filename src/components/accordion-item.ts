import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import type { TpOpenChangeEvent } from '../foundation/events.js';
import type {
  CollapsibleContentAlignment,
  CollapsibleIndicatorPosition,
  TpCollapsible,
} from './collapsible.js';

export type AccordionIndicatorPosition = CollapsibleIndicatorPosition;
export type AccordionContentAlignment = CollapsibleContentAlignment;

const optionalContentAlignmentConverter = {
  fromAttribute(value: string | null): AccordionContentAlignment | undefined {
    return value === null ? undefined : (value as AccordionContentAlignment);
  },
  toAttribute(value: AccordionContentAlignment | undefined): string | null {
    return value ?? null;
  },
};

/** A public Accordion Item host. Its Root owns selection; Collapsible owns disclosure behavior. */
export class TpAccordionItem extends TpElement {
  static tagName = 'tp-accordion-item';
  static override properties = {
    ...TpElement.properties,
    value: { type: String, reflect: true },
    indicatorPosition: { type: String, attribute: 'indicator-position', reflect: true },
    contentAlignment: {
      converter: optionalContentAlignmentConverter,
      attribute: 'content-alignment',
      reflect: true,
    },
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
    `,
  ];

  value = '';
  indicatorPosition: AccordionIndicatorPosition = 'trailing';
  contentAlignment: AccordionContentAlignment | undefined = undefined;
  headingLevel = 2;
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;
  override orientation = 'vertical' as const;
  #inheritedContentAlignment: AccordionContentAlignment = 'edge';

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

  override focus(options?: FocusOptions): void {
    this.triggerElement?.focus(options);
  }

  /** Supplies the owning Accordion's default without replacing an explicit Item value. */
  setInheritedContentAlignment(alignment: AccordionContentAlignment): void {
    this.#inheritedContentAlignment = alignment === 'label' ? 'label' : 'edge';
    this.#syncContentAlignment();
  }

  protected override render() {
    return html`<tp-collapsible
      .indicatorPosition=${this.indicatorPosition}
      .contentAlignment=${this.#resolvedContentAlignment()}
      .headingLevel=${this.headingLevel}
      exportparts="collapsible-heading: accordion-heading, collapsible-trigger: accordion-trigger, collapsible-leading: accordion-leading, collapsible-label: accordion-label, collapsible-trailing: accordion-trailing, collapsible-content: accordion-content, collapsible-content-body: accordion-content-body"
    >
      <slot
        name="leading"
        slot="leading"
        @slotchange=${() => this.collapsibleElement?.refreshPositions()}
      ></slot>
      <slot name="label" slot="label"></slot>
      <slot
        name="trailing"
        slot="trailing"
        @slotchange=${() => this.collapsibleElement?.refreshPositions()}
      ></slot>
      <slot></slot>
    </tp-collapsible>`;
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const position = this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
    this.dataset.indicatorPosition = position;
    this.#syncContentAlignment();
    this.collapsibleElement?.refreshPositions();
  }

  #resolvedContentAlignment(): AccordionContentAlignment {
    if (this.contentAlignment === 'label' || this.contentAlignment === 'edge') {
      return this.contentAlignment;
    }
    return this.#inheritedContentAlignment;
  }

  #syncContentAlignment(): void {
    const alignment = this.#resolvedContentAlignment();
    this.dataset.contentAlignment = alignment;
    const collapsible = this.collapsibleElement;
    if (collapsible) collapsible.contentAlignment = alignment;
  }
}
