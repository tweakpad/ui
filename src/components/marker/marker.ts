import { css, html } from 'lit';
import { TpElement } from '../../foundation/element.js';
import { markerPresentation } from '../../presentation/families/marker.js';

export class TpMarker extends TpElement {
  static tagName = 'tp-marker';
  static override presentation = markerPresentation;
  static override properties = {
    ...TpElement.properties,
    variant: { type: String, reflect: true },
    tone: { type: String, reflect: true },
    label: { type: String },
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

      [hidden] {
        display: none !important;
      }
    `,
  ];
  variant: 'default' | 'separator' | 'border' = 'default';
  /** Retained compatibility metadata; new compositions use semantic theme colors. */
  tone = 'neutral';
  label = '';
  protected override render() {
    const icon = Array.from(this.children).some((child) => child.slot === 'icon');
    const state = Object.freeze({ variant: this.variant });
    return this.renderPart('marker', state, {
      properties: { class: 'root', part: 'marker' },
      content: html`${this.renderPart('marker-icon', state, {
        tag: 'span',
        properties: { class: 'icon', part: 'marker-icon', hidden: !icon, 'aria-hidden': 'true' },
        content: html`<slot name="icon" @slotchange=${() => this.requestUpdate()}></slot>`,
      })}${this.renderPart('marker-content', state, {
        tag: 'span',
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
