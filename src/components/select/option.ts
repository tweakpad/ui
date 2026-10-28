import { html, css, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { ComponentPartContract } from '../../foundation/part.js';

/** Authored source registration; the Root's shared collection renders the semantic Option. */
export class TpSelectOption extends TpElement {
  static tagName = 'tp-select-option';
  static override properties = {
    ...TpElement.properties,
    value: { type: String },
    label: { attribute: false },
    index: { type: Number },
    row: { type: Number },
    nativeAction: { type: Boolean, attribute: 'native-action' },
    indicatorKeepMounted: { type: Boolean, attribute: 'indicator-keep-mounted' },
    onClick: { attribute: false },
    textContract: { attribute: false },
    indicatorContract: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: none;
      }
    `,
  ];
  value: unknown = undefined;
  label: unknown = undefined;
  index: number | undefined;
  row: number | undefined;
  nativeAction = false;
  indicatorKeepMounted = false;
  onClick: ((event: MouseEvent) => void) | undefined;
  textContract: ComponentPartContract | undefined;
  indicatorContract: ComponentPartContract | undefined;
  protected override render(): unknown {
    return html`<slot></slot>`;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.dispatchEvent(new Event('tp-select-source-change', { bubbles: true, composed: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-select-option': TpSelectOption;
  }
}
