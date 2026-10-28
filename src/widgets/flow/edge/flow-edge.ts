import { css } from 'lit';
import { TpElement } from '../../../foundation/element.js';
import { flowPresentation } from '../../../presentation/families/flow.js';

/**
 * An edge declared in markup: a child of `tp-flow` that the flow adopts into the document by id.
 * It renders nothing itself; the flow draws the edge from its attributes: `id`, `source`,
 * `target`, `source-port`, `target-port`, `kind`, `label`, `animated`, `waypoints` (`x,y x,y …`),
 * `data` (JSON), `marker-start`, `marker-end` and `hidden`.
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
