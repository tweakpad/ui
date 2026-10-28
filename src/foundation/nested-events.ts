import type { ReactiveController, ReactiveControllerHost } from 'lit';

/**
 * Where a boundary listens: `root` in the bubble phase on the render root, `host` in the capture
 * phase on the host.
 */
export type NestedEventListenerSite = 'root' | 'host';

/** The widget element whose nested constituent events a boundary stops. */
export type NestedEventHost = HTMLElement &
  ReactiveControllerHost & { readonly renderRoot: HTMLElement | DocumentFragment };

/** Template-bound listeners (`@type` keys) that apply a boundary's rule where they are bound. */
export type NestedEventListeners = Readonly<Record<`@${string}`, (event: Event) => void>>;

export interface NestedEventContainment {
  /** The constituent event types that stop at the widget. */
  readonly types: readonly string[];
  /**
   * `root`: a bubble listener on the render root, added on each connection and removed on
   * disconnection. `host`: a capture listener on the host, added at once for the host's lifetime.
   */
  readonly on: NestedEventListenerSite;
  /** True for an event that passes unchanged: content the widget does not contain. */
  readonly passes?: ((event: Event, origin: Node) => boolean) | undefined;
  /** Runs after each contained event has stopped: the widget's re-proposal or bookkeeping. */
  readonly contained?: ((event: Event, origin: Node) => void) | undefined;
}

class NestedEventBoundary implements ReactiveController {
  readonly listeners: NestedEventListeners;
  readonly #host: NestedEventHost;
  readonly #options: NestedEventContainment;
  #root: HTMLElement | DocumentFragment | undefined;

  constructor(host: NestedEventHost, options: NestedEventContainment) {
    this.#host = host;
    this.#options = options;
    const listeners: Record<`@${string}`, (event: Event) => void> = {};
    for (const type of options.types) listeners[`@${type}`] = this.#contain;
    this.listeners = Object.freeze(listeners);
    if (options.on === 'host')
      for (const type of options.types) host.addEventListener(type, this.#contain, true);
    else host.addController(this);
  }

  hostConnected(): void {
    if (this.#root) return;
    // The render root exists from the first connection on.
    const root = this.#host.renderRoot;
    this.#root = root;
    for (const type of this.#options.types) root.addEventListener(type, this.#contain);
  }

  hostDisconnected(): void {
    const root = this.#root;
    if (!root) return;
    this.#root = undefined;
    for (const type of this.#options.types) root.removeEventListener(type, this.#contain);
  }

  readonly #contain = (event: Event): void => {
    // A capture listener on the host sees the target retargeted to the host; the path head is
    // the real origin.
    const origin = (this.#options.on === 'host' ? event.composedPath()[0] : event.target) as
      Node | null | undefined;
    if (!origin || origin === this.#host) return;
    if (this.#options.passes?.(event, origin)) return;
    event.stopPropagation();
    this.#options.contained?.(event, origin);
  };
}

/**
 * Stops the listed events of a widget's nested constituents at the widget (uwg-em-req-evt-3,
 * uwg-cp-req-evt-2, uwg-ee-req-evt-2, uwg-fl-req-evt-3, uwg-te-req-evt-6). Call it once, at
 * construction. The origin of an event is its target as the listening tree sees it (`root` and
 * the returned listeners) or the head of its composed path (`host`); the host's own events pass.
 * Returns the template-bound listeners with the same rule, for an element inside the render root
 * whose ancestors there handle the same types.
 */
export function containNestedEvents(
  host: NestedEventHost,
  options: NestedEventContainment,
): NestedEventListeners {
  return new NestedEventBoundary(host, options).listeners;
}
