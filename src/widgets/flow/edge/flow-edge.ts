import { css } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { flowPresentation } from '../../../presentation/families/flow.js';

/**
 * A declarative edge record (Widgets 6.3 Definition): a light-DOM child of `tp-flow` that the
 * widget adopts into the document by id. It renders nothing; the renderer paints the edge.
 * Attributes: `source`, `target`, `source-port`, `target-port`, `kind`, `label`, `animated`,
 * `waypoints` (`x,y x,y …`), `data` (JSON), `marker-start`, `marker-end`, `hidden`.
 */
export class TpFlowEdge extends TpElement {
  static tagName = 'tp-flow-edge';
  static override presentation = flowPresentation;
  static override styles = [
    css`
      :host {
        display: none !important;
      }
    `,
  ];

  protected override createRenderRoot(): HTMLElement | DocumentFragment {
    return this;
  }

  protected override render() {
    return null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-flow-edge': TpFlowEdge;
  }
}
