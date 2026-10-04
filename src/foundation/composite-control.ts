import type { ReactiveController, ReactiveControllerHost } from 'lit';

export interface CompositeControlState {
  disabled: boolean;
  focusableWhenDisabled: boolean;
  tabIndex: number;
}
type Host = HTMLElement & ReactiveControllerHost;
const controls = new WeakMap<HTMLElement, CompositeControlController>();

/** Composed focus/disabled policy; the registered control still owns its value and actions. */
export class CompositeControlController implements ReactiveController {
  state: Readonly<CompositeControlState> | undefined;
  #owner: object | undefined;
  #refresh: (() => void) | undefined;

  constructor(
    readonly host: Host,
    readonly target: () => HTMLElement | null,
    readonly readDisabled: () => boolean,
  ) {
    controls.set(host, this);
    host.addController(this);
  }

  apply(owner: object, state: CompositeControlState, refresh: () => void): void {
    if (this.#owner && this.#owner !== owner)
      throw new Error('A control cannot belong to two composite focus owners.');
    this.#owner = owner;
    this.#refresh = refresh;
    const previous = this.state;
    if (
      previous?.disabled === state.disabled &&
      previous.focusableWhenDisabled === state.focusableWhenDisabled &&
      previous.tabIndex === state.tabIndex
    )
      return;
    this.state = Object.freeze({ ...state });
    this.host.requestUpdate();
  }

  release(owner: object): void {
    if (this.#owner !== owner) return;
    this.#owner = undefined;
    this.#refresh = undefined;
    this.state = undefined;
    this.host.requestUpdate();
  }

  hostUpdated(): void {
    this.#refresh?.();
  }
  hostDisconnected(): void {
    this.#refresh?.();
  }
  hostConnected(): void {
    this.#refresh?.();
  }
}

export function compositeControl(element: HTMLElement): CompositeControlController | undefined {
  return controls.get(element);
}
