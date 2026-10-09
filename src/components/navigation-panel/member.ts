import { reportDiagnostic } from '../../foundation/services.js';
import type { ReactiveController } from 'lit';
import type { TpElement } from '../../foundation/element.js';
import type { ComponentPartContract } from '../../foundation/part.js';
import {
  navigationPanelOwner,
  navigationPartContract,
  type NavigationPanelOwner,
} from './context.js';
/** Context/presentation projection only; each inherited constituent keeps its actual behavior owner. */
export class NavigationPanelMember implements ReactiveController {
  owner: NavigationPanelOwner | undefined;
  #unsubscribe: (() => void) | undefined;
  #unregister: (() => void) | undefined;
  #element: HTMLElement | null = null;
  constructor(
    readonly host: TpElement,
    readonly part: string,
    readonly nativePart: string,
  ) {
    host.addController(this);
  }
  hostConnected(): void {
    this.owner = navigationPanelOwner(this.host);
    if (!this.owner) {
      reportDiagnostic(this.host, {
        code: 'navigation-panel-provider-missing',
        message: `Place ${this.host.localName} under tp-navigation-panel to supply its Provider.`,
        severity: 'error',
      });
      return;
    }
    this.#unsubscribe = this.owner.provider.subscribe(() => this.host.requestUpdate());
    this.host.requestUpdate();
  }
  hostDisconnected(): void {
    this.#unsubscribe?.();
    this.#unregister?.();
    this.#unsubscribe = this.#unregister = undefined;
    this.#element = null;
    this.owner = undefined;
  }
  hostUpdated(): void {
    if (!this.host.isConnected || !this.owner) return;
    const element = this.host.renderRoot.querySelector<HTMLElement>(`[part~="${this.nativePart}"]`);
    if (element !== this.#element) {
      this.#unregister?.();
      this.#element = element;
      this.#unregister =
        element && this.owner
          ? this.owner.registerNavigationPart(this.part, element, this.host)
          : undefined;
    }
    if (element && this.owner) {
      const state = this.owner.provider.state;
      for (const token of [...element.part])
        if (token.startsWith(`${this.part}-variant-`)) element.part.remove(token);
      element.part.add(this.part, `${this.part}-variant-${state.variant}`);
      for (const [name, value] of Object.entries({
        expanded: state.expanded,
        collapsed: state.collapsed,
        compact: state.compact,
      }))
        element.toggleAttribute(`data-${name}`, value);
      element.setAttribute('data-side', state.side);
      element.setAttribute('data-collapse-mode', state.collapseMode);
    }
  }
  contract(local?: ComponentPartContract): ComponentPartContract {
    return this.owner ? navigationPartContract(this.owner, this.part, local) : (local ?? {});
  }
}
