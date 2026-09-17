import { css, html } from 'lit';
import type { PropertyValues } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { CollapsibleController } from '../foundation/collapsible.js';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent } from '../foundation/events.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
  type MotionValue,
} from '../foundation/motion.js';
import type { PresenceState } from '../foundation/types.js';
import { chevronRightIcon } from '../icons/chevron-right.js';

export type CollapsibleIndicatorPosition = 'leading' | 'trailing';

export const collapsibleMotionRoles = {
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

export class TpCollapsible extends TpElement {
  static tagName = 'tp-collapsible';
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    keepMounted: { type: Boolean, attribute: 'keep-mounted', reflect: true },
    hiddenUntilFound: { type: Boolean, attribute: 'hidden-until-found', reflect: true },
    indicatorPosition: { type: String, attribute: 'indicator-position', reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level', reflect: true },
    onOpenChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part~='collapsible-heading'] {
        margin: 0;
        font: inherit;
      }

      [part~='collapsible-trigger'] {
        display: flex;
        align-items: center;
        gap: var(--tp-space-3);
      }

      .label {
        flex: 1;
        min-width: 0;
      }

      [part~='collapsible-indicator'] {
        display: inline-block;
        flex: none;
        line-height: 1;
        pointer-events: none;
        rotate: 0deg;
        transition-property: rotate;
        transition-duration: calc(var(--tp-duration-normal) * var(--tp-motion-scale));
        transition-timing-function: var(--tp-easing-standard);
      }

      :host([data-icon-edge='leading']) [part~='collapsible-indicator'] {
        order: -1;
      }

      [part~='collapsible-content'] {
        overflow: clip;
        block-size: 0;
        transition-property: block-size;
        transition-duration: calc(var(--tp-duration-normal) * var(--tp-motion-scale));
        transition-timing-function: var(--tp-easing-standard);
      }

      [part~='collapsible-content'][data-state='open'] {
        block-size: var(--collapsible-panel-height);
      }

      [part~='collapsible-content-body'] {
        display: flow-root;
      }

      [part~='collapsible-content'][data-tp-motion-driven~='disclosure'],
      [part~='collapsible-indicator'][data-tp-motion-driven~='indicator'] {
        transition: none !important;
      }

      [part~='collapsible-content'][hidden]:not([hidden='until-found']) {
        display: none;
      }
    `,
  ];
  open = false;
  defaultOpen = false;
  keepMounted = false;
  hiddenUntilFound = false;
  indicatorPosition: CollapsibleIndicatorPosition = 'trailing';
  headingLevel = 0;
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;
  #motionOwner: HTMLElement = this;
  #motionContext: Readonly<Record<string, MotionValue>> = Object.freeze({});
  #resizeObserver: ResizeObserver | null = null;
  #pendingEnter: MotionHandle[] = [];
  #pendingExit: MotionHandle[] = [];
  #indicatorMotion: MotionHandle | null = null;
  #defaultInitialized = false;
  readonly #collapsible = new CollapsibleController(this, {
    owner: this,
    trigger: () => this.triggerElement,
    content: () => this.panelElement,
    markers: () => [this.#motionOwner, this.rootElement, this.indicatorElement],
    keepMounted: () => this.keepMounted,
    hiddenUntilFound: () => this.hiddenUntilFound,
    onOpenRequest: (open, reason, sourceEvent) => this.#requestOpen(open, reason, sourceEvent),
    onStateChange: (state) => this.#syncPresence(state),
    onComplete: (open) => {
      this.dispatchEvent(
        new CustomEvent('tp-open-change-complete', {
          bubbles: true,
          composed: true,
          detail: { open },
        }),
      );
    },
  });

  get rootElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="collapsible"]');
  }

  get triggerElement(): HTMLButtonElement | null {
    return this.renderRoot.querySelector<HTMLButtonElement>('[part~="collapsible-trigger"]');
  }

  get panelElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="collapsible-content"]');
  }

  get bodyElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="collapsible-content-body"]');
  }

  get indicatorElement(): HTMLElement | null {
    return this.renderRoot.querySelector<HTMLElement>('[part~="collapsible-indicator"]');
  }

  /** Supplies composition-owned event scope without transferring disclosure state ownership. */
  setMotionScope(
    owner: HTMLElement = this,
    context: Readonly<Record<string, MotionValue>> = {},
  ): void {
    this.#motionOwner = owner;
    this.#motionContext = Object.freeze({ ...context });
    if (this.#collapsible.initialized) this.#collapsible.update(this.open, this.disabled);
  }

  /** Re-evaluates a forwarded indicator slot after its outer assignment changes. */
  refreshIndicator(): void {
    const slot = this.renderRoot.querySelector<HTMLSlotElement>('slot[name="indicator"]');
    const hasCustomIndicator = Boolean(
      slot?.assignedNodes({ flatten: true }).some((node) => {
        if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
        return node.nodeType === Node.ELEMENT_NODE;
      }),
    );
    this.renderRoot
      .querySelector<HTMLElement>('[data-default-indicator]')
      ?.toggleAttribute('hidden', hasCustomIndicator);
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#defaultInitialized) {
      this.#defaultInitialized = true;
      if (!this.hasAttribute('open') && this.defaultOpen) this.open = true;
    }
    if (this.hasUpdated) {
      this.#observeBody();
      this.requestUpdate();
      queueMicrotask(() => {
        if (this.isConnected) this.#collapsible.update(this.open, this.disabled);
      });
    }
  }

  override disconnectedCallback(): void {
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#cancelPendingMotion();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.refreshIndicator();
    this.#observeBody();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#collapsible.update(this.open, this.disabled);
      const indicator = this.indicatorElement;
      if (indicator) indicator.style.rotate = this.open ? '90deg' : '0deg';
    });
  }

  protected override render() {
    const position = this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
    const level = Math.min(6, Math.max(0, Math.trunc(this.headingLevel) || 0));
    const trigger = html`<button part="collapsible-trigger focusable" type="button">
      <span class="label"><slot name="trigger">Toggle</slot></span>
      <span part="collapsible-indicator" data-icon-edge=${position} aria-hidden="true">
        <slot name="indicator" @slotchange=${this.refreshIndicator}></slot>
        <tp-icon data-default-indicator .icon=${chevronRightIcon}></tp-icon>
      </span>
    </button>`;
    return html`<div part="collapsible">
      <div
        part="collapsible-heading"
        role=${ifDefined(level ? 'heading' : undefined)}
        aria-level=${ifDefined(level || undefined)}
      >
        ${trigger}
      </div>
      <div part="collapsible-content" role="region" data-state="absent" hidden>
        <div part="collapsible-content-body"><slot></slot></div>
      </div>
    </div>`;
  }

  #requestOpen(open: boolean, reason: 'trigger-press' | 'programmatic', sourceEvent: Event): void {
    if (this.disabled || open === this.open) return;
    const request = new TpOpenChangeEvent(open, this.open, reason, sourceEvent);
    if (!this.dispatchEvent(request)) return;
    this.onOpenChange?.(request);
    this.open = open;
  }

  #syncPresence(state: PresenceState): void {
    const panel = this.panelElement;
    const body = this.bodyElement;
    if (!panel || !body) return;
    const phase = state === 'starting' ? 'enter' : state === 'ending' ? 'exit' : null;
    if (phase) {
      const handles = [
        prepareMotion(this.#motionOwner, panel, collapsibleMotionRoles.disclosure, {
          phase,
          fromState: phase === 'enter' ? 'closed' : 'open',
          toState: phase === 'enter' ? 'open' : 'closed',
          context: this.#motionContext,
        }),
        prepareMotion(this.#motionOwner, body, collapsibleMotionRoles.content, {
          phase,
          fromState: phase === 'enter' ? 'closed' : 'open',
          toState: phase === 'enter' ? 'open' : 'closed',
          context: this.#motionContext,
        }),
      ];
      if (phase === 'enter') this.#pendingEnter = handles;
      else this.#pendingExit = handles;
    }
    if (state === 'starting' || state === 'open' || state === 'ending') this.#measure();
    const handles =
      state === 'open' ? this.#pendingEnter : state === 'ending' ? this.#pendingExit : [];
    for (const handle of handles) {
      handle.start();
      this.#collapsible.trackCompletion(handle.finished);
    }
    if (state === 'open') this.#pendingEnter = [];
    if (state === 'ending') this.#pendingExit = [];
  }

  #observeBody(): void {
    const body = this.bodyElement;
    if (!body || typeof ResizeObserver === 'undefined' || this.#resizeObserver) return;
    this.#resizeObserver = new ResizeObserver(() => this.#measure());
    this.#resizeObserver.observe(body);
    this.#measure();
  }

  #measure(): void {
    const panel = this.panelElement;
    const body = this.bodyElement;
    if (!panel || !body) return;
    panel.style.setProperty('--collapsible-panel-height', `${Math.max(0, body.scrollHeight)}px`);
    panel.style.setProperty('--collapsible-panel-width', `${Math.max(0, body.scrollWidth)}px`);
  }

  #cancelPendingMotion(): void {
    for (const handle of [...this.#pendingEnter, ...this.#pendingExit]) handle.cancel();
    this.#pendingEnter = [];
    this.#pendingExit = [];
    this.#indicatorMotion?.cancel();
    this.#indicatorMotion = null;
  }

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) return;
    if (changed.has('open') && this.#collapsible.initialized) {
      this.#indicatorMotion = prepareMotion(
        this.#motionOwner,
        this.indicatorElement,
        collapsibleMotionRoles.indicator,
        {
          phase: 'change',
          fromState: this.#collapsible.open,
          toState: this.open,
          context: this.#motionContext,
        },
      );
    }
    if (
      changed.has('open') ||
      changed.has('disabled') ||
      changed.has('keepMounted') ||
      changed.has('hiddenUntilFound')
    ) {
      this.#collapsible.update(this.open, this.disabled);
    }
    if (changed.has('open')) {
      const indicator = this.indicatorElement;
      if (indicator) indicator.style.rotate = this.open ? '90deg' : '0deg';
      this.#indicatorMotion?.start();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const position = this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
    this.setAttribute('data-icon-edge', position);
    this.refreshIndicator();
    this.#measure();
  }
}
