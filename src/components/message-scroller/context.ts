import type { ReactiveController } from 'lit';
import type { TpElement } from '../../foundation/element.js';
import { composedParent } from '../../foundation/focus.js';
import {
  renderPart,
  type PartRenderOptions,
  type PartState,
  type ComponentPartContract,
} from '../../foundation/part.js';
import type { MessageScrollerProvider } from './provider.js';

export const messageScrollerContext = Symbol('MessageScroller');
export interface MessageScrollerOwner extends TpElement {
  readonly [messageScrollerContext]: true;
  readonly provider: MessageScrollerProvider;
  label: string;
  registerScrollerPart(name: string, element: HTMLElement, member: TpElement): () => void;
}
export function messageScrollerOwner(element: HTMLElement): MessageScrollerOwner | undefined {
  for (let node = composedParent(element); node; node = composedParent(node))
    if ((node as MessageScrollerOwner)[messageScrollerContext]) return node as MessageScrollerOwner;
}
/** Context and native-part registration only. The provider and Button retain behavior ownership. */
export class MessageScrollerMember implements ReactiveController {
  owner: MessageScrollerOwner | undefined;
  #element: HTMLElement | null = null;
  #unregister: (() => void) | undefined;
  #unsubscribe: (() => void) | undefined;
  constructor(
    readonly host: TpElement,
    readonly part: string,
    readonly nativePart = part,
  ) {
    host.addController(this);
  }
  hostConnected() {
    this.owner = messageScrollerOwner(this.host);
    if (this.part === 'message-scroller-return-control')
      this.#unsubscribe = this.owner?.provider.scrollable.subscribe(() =>
        this.host.requestUpdate(),
      );
    this.host.requestUpdate();
  }
  hostUpdated() {
    const element = this.host.renderRoot.querySelector<HTMLElement>(`[part~="${this.nativePart}"]`);
    element?.part.add(this.part);
    if (element !== this.#element) {
      this.#unregister?.();
      this.#element = element;
      this.#unregister = element
        ? this.owner?.registerScrollerPart(this.part, element, this.host)
        : undefined;
    }
  }
  hostDisconnected() {
    this.#unregister?.();
    this.#unsubscribe?.();
    this.#unregister = this.#unsubscribe = undefined;
    this.#element = null;
    this.owner = undefined;
  }
  contract(local?: ComponentPartContract): ComponentPartContract {
    // Explicit constituents own their complete contract; shorthand receives Root's contract.
    return local ?? this.owner?.partContracts[this.part] ?? {};
  }
  render(state: PartState, options: PartRenderOptions) {
    return renderPart(this.part, state, this.contract(this.host.partContracts[this.part]), options);
  }
}
