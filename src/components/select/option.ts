import { html, css, type PropertyValues } from 'lit';
import { TpElement } from '../../foundation/element.js';
import type { ComponentPartContract } from '../../foundation/part.js';

/**
 * Declares one choice of a Select, as a native `option` does, with a value of any type and an
 * optional rich label; the Select renders the option itself.
 *
 * @slot - The option's text: its label when `label` is unset, and its typeahead text.
 * @fires tp-select-source-change - Bubbles after the declaration changes, so the Select reads it
 * again.
 */
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
  /** The value the option selects: text as an attribute, any value as a property. */
  value: unknown = undefined;
  /** A rich label, such as a Lit template, shown instead of the text content. */
  label: unknown = undefined;
  /** Position of the option in the application's data, reported when it is highlighted. */
  index: number | undefined;
  /** The row the option belongs to in a grid Select. */
  row: number | undefined;
  /** Renders the option as a native button rather than a plain element. */
  nativeAction = false;
  /** Keeps the check mark mounted, hidden, while the option is not selected. */
  indicatorKeepMounted = false;
  /** Called when the rendered option is clicked. */
  onClick: ((event: MouseEvent) => void) | undefined;
  /** Part contract of the option's text. */
  textContract: ComponentPartContract | undefined;
  /** Part contract of the option's check mark. */
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
