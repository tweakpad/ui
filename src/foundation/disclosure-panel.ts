import type { ReactiveController, ReactiveControllerHost } from 'lit';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
  type MotionValue,
} from './motion.js';
import { observeResize } from './observation.js';
import type { Direction, PresenceState } from './types.js';

/** Collapsible's disclosure roles; every control that renders a disclosure region shares them. */
export const disclosureMotionRoles = {
  disclosure: {
    name: 'disclosure',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
  content: {
    name: 'content',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
  indicator: {
    name: 'indicator',
    kind: 'state',
    phases: ['change'],
    completion: 'non-blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

export interface DisclosurePanelOptions {
  /** Element that dispatches motion requests and scopes their cancellation. */
  owner: () => HTMLElement;
  /** Measured region whose block size animates. */
  panel: () => HTMLElement | null;
  /** Content inside the panel; its scroll size is the open extent. */
  body: () => HTMLElement | null;
  context?: () => Readonly<Record<string, MotionValue>>;
  /** Presence keeps the region mounted until these settle. */
  trackCompletion: (completion: PromiseLike<void>) => void;
  /** Custom properties carrying the measured extent; Collapsible's by default. */
  extent?: { block: string; inline: string };
}

const COLLAPSIBLE_EXTENT = {
  block: '--collapsible-panel-height',
  inline: '--collapsible-panel-width',
} as const;

/**
 * Measured disclosure presence: binds a Presence lifecycle to the `disclosure` and `content`
 * motion roles and keeps the open extent current. The consumer owns open state and Presence.
 */
export class DisclosurePanelController implements ReactiveController {
  readonly #host: ReactiveControllerHost;
  readonly #options: DisclosurePanelOptions;
  #pendingEnter: MotionHandle[] = [];
  #pendingExit: MotionHandle[] = [];
  #observedBody: HTMLElement | null = null;
  #stopObserving: (() => void) | null = null;

  constructor(host: ReactiveControllerHost, options: DisclosurePanelOptions) {
    this.#host = host;
    this.#options = options;
    host.addController(this);
  }

  /** Call from the Presence state callback. */
  sync(state: PresenceState): void {
    const panel = this.#options.panel();
    const body = this.#options.body();
    if (!panel || !body) return;
    const phase = state === 'starting' ? 'enter' : state === 'ending' ? 'exit' : null;
    if (phase) {
      const owner = this.#options.owner();
      const request = {
        phase,
        fromState: phase === 'enter' ? 'closed' : 'open',
        toState: phase === 'enter' ? 'open' : 'closed',
        context: this.#options.context?.() ?? {},
      } as const;
      const handles = [
        prepareMotion(owner, panel, disclosureMotionRoles.disclosure, request),
        prepareMotion(owner, body, disclosureMotionRoles.content, request),
      ];
      if (phase === 'enter') this.#pendingEnter = handles;
      else this.#pendingExit = handles;
    }
    if (state === 'starting' || state === 'open' || state === 'ending') this.measure();
    const handles =
      state === 'open' ? this.#pendingEnter : state === 'ending' ? this.#pendingExit : [];
    for (const handle of handles) {
      handle.start();
      this.#options.trackCompletion(handle.finished);
    }
    if (state === 'open') this.#pendingEnter = [];
    if (state === 'ending') this.#pendingExit = [];
  }

  /** Follow size changes of the current body. */
  observe(): void {
    const body = this.#options.body();
    if (body === this.#observedBody) return;
    this.#stopObserving?.();
    this.#stopObserving = null;
    this.#observedBody = body;
    if (!body) return;
    this.#stopObserving = observeResize(body, () => this.measure());
    this.measure();
  }

  measure(): void {
    const panel = this.#options.panel();
    const body = this.#options.body();
    if (!panel || !body) return;
    const extent = this.#options.extent ?? COLLAPSIBLE_EXTENT;
    panel.style.setProperty(extent.block, `${Math.max(0, body.scrollHeight)}px`);
    panel.style.setProperty(extent.inline, `${Math.max(0, body.scrollWidth)}px`);
  }

  cancel(): void {
    for (const handle of [...this.#pendingEnter, ...this.#pendingExit]) handle.cancel();
    this.#pendingEnter = [];
    this.#pendingExit = [];
  }

  disconnect(): void {
    this.#stopObserving?.();
    this.#stopObserving = null;
    this.#observedBody = null;
    this.cancel();
  }

  hostDisconnected(): void {
    this.disconnect();
  }

  /** Releases the controller from its host (transient regions). */
  destroy(): void {
    this.disconnect();
    this.#host.removeController(this);
  }
}

/** Default disclosure indicator: one rotation, one `indicator` motion role. */
export class DisclosureIndicator {
  #motion: MotionHandle | null = null;

  /** Turned extent of an open indicator; a mirrored right-to-left chevron turns the other way. */
  static rotation(open: boolean, direction: Direction = 'ltr', mirrored = false): string {
    if (!open) return '0deg';
    return mirrored && direction === 'rtl' ? '-90deg' : '90deg';
  }

  /** Prepare before the render that changes open state, so the request sees the old value. */
  prepare(
    owner: HTMLElement,
    element: HTMLElement | null,
    from: boolean,
    to: boolean,
    context: Readonly<Record<string, MotionValue>> = {},
  ): void {
    this.#motion?.cancel();
    this.#motion = element
      ? prepareMotion(owner, element, disclosureMotionRoles.indicator, {
          phase: 'change',
          fromState: from,
          toState: to,
          context,
        })
      : null;
  }

  apply(element: HTMLElement | null, rotation: string): void {
    if (element) element.style.rotate = rotation;
  }

  start(): void {
    this.#motion?.start();
  }

  cancel(): void {
    this.#motion?.cancel();
    this.#motion = null;
  }
}
