import { TpElement } from '../../foundation/element.js';
import { renderStackGroup, stackGroupStyles } from '../shared/stack-group.js';
import { messagePresentation } from '../../presentation/families/message.js';

/** Consecutive messages share a density owner without introducing conversation state. */
export class TpMessageGroup extends TpElement {
  static tagName = 'tp-message-group';
  static override presentation = messagePresentation;
  static override styles = [TpElement.styles, stackGroupStyles];
  protected override render() {
    return renderStackGroup(this, 'message');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-message-group': TpMessageGroup;
  }
}
