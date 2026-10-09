import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { badgePresentation } from '../../presentation/families/badge.js';
import { fillLayerStyles } from '../../presentation/motion.js';

export class TpBadge extends TpElement {
  static tagName = 'tp-badge';
  static override presentation = badgePresentation;
  static override properties = {
    ...TpElement.properties,
    variant: { type: String, reflect: true },
    interactive: { type: Boolean, reflect: true },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: inline-flex;
        min-inline-size: 0;
        max-inline-size: 100%;
      }

      .badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        min-inline-size: 0;
        max-inline-size: 100%;
        overflow-wrap: anywhere;
      }

      slot {
        display: contents;
      }

      ${fillLayerStyles(':host([interactive]) .badge:is(button, a)')}

      :host([interactive]) .badge:is(button, a)::after {
        content: '';
        position: absolute;
        inset-block: min(0px, calc((100% - var(--tp-target-size-min)) / 2));
        inset-inline: min(0px, calc((100% - var(--tp-target-size-min)) / 2));
      }
    `,
  ];
  variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'ghost' | 'link' = 'default';
  interactive = false;
  protected override render() {
    return this.renderPart(
      'badge',
      Object.freeze({
        variant: this.variant,
        interactive: this.interactive,
        disabled: this.disabled,
      }),
      {
        tag: 'span',
        properties: { class: 'badge', part: 'badge' },
        content: html`<slot></slot>`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-badge': TpBadge;
  }
}
