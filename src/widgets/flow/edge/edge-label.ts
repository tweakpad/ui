import { css, html, type TemplateResult } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { TpBadge } from '../../../components/badge/badge.js';
import { TpButton } from '../../../components/button/button.js';
import { TpIcon } from '../../../components/icon/icon.js';
import { plusIcon } from '../../../icons/plus.js';
import { flowPresentation } from '../../../presentation/families/flow.js';

export const LABEL_PRESS = 'flow-label-press';
export const LABEL_ADD = 'flow-label-add';

const labelStyles = css`
  :host {
    display: inline-flex;
    align-items: center;
    gap: var(--tp-space-1);
    transform: translate(-50%, -50%);
  }

  :host([hidden]) {
    display: none;
  }
`;

/**
 * An edge label (Widgets 6.3 Anatomy): a Badge pill placed at a path anchor by the label layer,
 * optionally followed by an add Button that opens the palette for an insertion on this edge.
 */
export class TpFlowEdgeLabel extends TpElement {
  static tagName = 'tp-flow-edge-label';
  static override presentation = flowPresentation;
  static get elementDependencies() {
    return [TpBadge, TpButton, TpIcon];
  }
  static override properties = {
    ...TpElement.properties,
    edgeId: { type: String, attribute: 'edge-id' },
    text: { type: String },
    selected: { type: Boolean, reflect: true },
    addable: { type: Boolean },
    addLabel: { type: String, attribute: 'add-label' },
    content: { attribute: false },
  };
  static override styles = [TpElement.styles, labelStyles];

  edgeId = '';
  text = '';
  selected = false;
  addable = false;
  addLabel = 'Add node';
  /** Custom content from an edge template replaces the default pill. */
  content: TemplateResult | null = null;

  get presentationOwner(): HTMLElement | null {
    const root = this.getRootNode();
    return root instanceof ShadowRoot ? (root.host as HTMLElement) : null;
  }

  #press = (event: Event): void => {
    this.dispatchEvent(
      new CustomEvent(LABEL_PRESS, {
        bubbles: true,
        composed: false,
        detail: { edgeId: this.edgeId, sourceEvent: event },
      }),
    );
  };

  #add = (event: Event): void => {
    event.stopPropagation();
    this.dispatchEvent(
      new CustomEvent(LABEL_ADD, {
        bubbles: true,
        composed: false,
        detail: { edgeId: this.edgeId, sourceEvent: event },
      }),
    );
  };

  protected override render() {
    return this.renderPart(
      'flow-edge-label',
      { selected: this.selected },
      {
        tag: 'div',
        properties: {
          part: 'flow-edge-label',
          'data-selected': this.selected,
          'data-edge': this.edgeId,
          '@click': this.#press,
        },
        content: html`${
          this.content ??
          (this.text
            ? html`<tp-badge class="pill" variant="outline">${this.text}</tp-badge>`
            : null)
        }${
          this.addable
            ? html`<tp-button
                class="add"
                variant="outline"
                size="icon-xs"
                aria-label=${this.addLabel}
                .icon=${plusIcon}
                @click=${this.#add}
              ></tp-button>`
            : null
        }`,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-edge-label': TpFlowEdgeLabel;
  }
}
