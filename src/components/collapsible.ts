import { transitionCss } from '../presentation/motion.js';
import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { compositeControl } from '../foundation/composite-control.js';
import type { PartRenderOptions, PartState } from '../foundation/part.js';
import { CollapsibleController } from '../foundation/collapsible.js';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent } from '../foundation/events.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
  type MotionValue,
} from '../foundation/motion.js';
import type { LogicalPosition, PresenceState } from '../foundation/types.js';
import { chevronRightIcon } from '../icons/chevron-right.js';

export type CollapsibleIndicatorPosition = LogicalPosition;
export type CollapsibleContentAlignment = 'edge' | 'label';

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
    contentAlignment: { type: String, attribute: 'content-alignment', reflect: true },
    headingLevel: { type: Number, attribute: 'heading-level', reflect: true },
    onOpenChange: { attribute: false },
  };
  static override styles = [
    TpElement.styles,
    css`
      :host {
        display: block;
      }

      [part~='collapsible'] {
        display: grid;
        grid-template-columns: max-content minmax(0, 1fr) max-content;
      }

      [part~='collapsible-heading'] {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        margin: 0;
      }

      [part~='collapsible-trigger'] {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        align-items: center;
        width: 100%;
        text-align: start;
        cursor: pointer;
      }

      [part~='collapsible-trigger']:disabled {
        cursor: not-allowed;
      }

      [part~='collapsible-leading'],
      [part~='collapsible-trailing'] {
        display: inline-flex;
        flex: none;
        align-items: center;
        min-width: 0;
        pointer-events: none;
      }

      [part~='collapsible-leading'] {
        grid-column: 1;
        margin-inline-end: var(--tp-space-3);
      }

      [part~='collapsible-trailing'] {
        grid-column: 3;
        margin-inline-start: var(--tp-space-3);
      }

      [part~='collapsible-leading'][hidden],
      [part~='collapsible-trailing'][hidden] {
        display: none;
        margin-inline: 0;
      }

      [part~='collapsible-label'] {
        grid-column: 2;
        min-width: 0;
      }

      [data-default-indicator] {
        display: inline-block;
        flex: none;
        line-height: 1;
        pointer-events: none;
        rotate: 0deg;
        transition: ${transitionCss(['rotate'])};
      }

      [data-default-indicator][hidden] {
        display: none;
      }

      [part~='collapsible-content'] {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        overflow: clip;
        block-size: 0;
        transition: ${transitionCss(['block-size'])};
      }

      [part~='collapsible-content'][data-state='open'] {
        block-size: var(--collapsible-panel-height);
      }

      [part~='collapsible-content-body'] {
        display: flow-root;
        grid-column: 1 / -1;
        min-width: 0;
      }

      :host([data-content-alignment='label']) [part~='collapsible-content-body'] {
        grid-column-start: 2;
      }

      [part~='collapsible-content'][data-tp-motion-driven~='disclosure'],
      [data-default-indicator][data-tp-motion-driven~='indicator'] {
        transition: none !important;
      }

      [part~='collapsible-content'][hidden]:not([hidden='until-found']) {
        display: none !important;
      }
    `,
  ];
  open = false;
  defaultOpen = false;
  keepMounted = false;
  hiddenUntilFound = false;
  indicatorPosition: CollapsibleIndicatorPosition = 'trailing';
  contentAlignment: CollapsibleContentAlignment = 'edge';
  headingLevel = 0;
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;
  #motionOwner: HTMLElement = this;
  #motionContext: Readonly<Record<string, MotionValue>> = Object.freeze({});
  #resizeObserver: ResizeObserver | null = null;
  #observedBody: HTMLElement | null = null;
  #parts = new Map<string, HTMLElement>();
  #references = new Map<string, (element: HTMLElement | null) => void>();
  #composedTrigger: ReturnType<typeof compositeControl>;
  readonly #refreshController = (): void => {
    if (this.isConnected) this.#collapsible.update(this.open, this.disabled);
  };
  #part(name: string, state: PartState, options: PartRenderOptions = {}): unknown {
    let reference = this.#references.get(name);
    if (!reference) {
      reference = (element) => {
        if (element) this.#parts.set(name, element);
        else this.#parts.delete(name);
      };
      this.#references.set(name, reference);
    }
    return this.renderPart(name, state, {
      ...options,
      reference,
      properties: {
        'data-open': this.open,
        'data-closed': !this.open,
        'data-disabled': this.disabled,
        ...options.properties,
      },
    });
  }
  #pendingEnter: MotionHandle[] = [];
  #pendingExit: MotionHandle[] = [];
  #indicatorMotion: MotionHandle | null = null;
  #defaultInitialized = false;
  readonly #collapsible = new CollapsibleController(this, {
    owner: this,
    trigger: () => this.triggerElement,
    activation: () => this.#parts.get('collapsible-trigger') ?? null,
    content: () => this.panelElement,
    markers: () => [
      this.#motionOwner,
      this.rootElement,
      this.leadingElement,
      this.labelElement,
      this.trailingElement,
      this.#defaultIndicatorElement,
    ],
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
    return this.#parts.get('collapsible') ?? null;
  }

  get triggerElement(): HTMLButtonElement | null {
    const host = this.#parts.get('collapsible-trigger');
    if (!host) return null;
    const control = compositeControl(host);
    return (control ? control.target() : host) as HTMLButtonElement | null;
  }

  get panelElement(): HTMLElement | null {
    return this.#parts.get('collapsible-content') ?? null;
  }

  get bodyElement(): HTMLElement | null {
    return this.#parts.get('collapsible-content-body') ?? null;
  }

  get leadingElement(): HTMLElement | null {
    return this.#parts.get('collapsible-leading') ?? null;
  }

  get labelElement(): HTMLElement | null {
    return this.#parts.get('collapsible-label') ?? null;
  }

  get trailingElement(): HTMLElement | null {
    return this.#parts.get('collapsible-trailing') ?? null;
  }

  get #defaultIndicatorElement(): HTMLElement | null {
    const position = this.#resolvedIndicatorPosition();
    const slot = this.#positionSlot(position);
    if (this.#hasAssignedPositionContent(slot)) return null;
    return this.#positionIndicator(position);
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

  /** Re-evaluates forwarded positional slots after their outer assignments change. */
  refreshPositions(): void {
    // A composition may forward slots before this nested element first connects.
    // firstUpdated/updated refresh them again once its render root exists.
    if (!this.renderRoot) return;
    const selected = this.#resolvedIndicatorPosition();
    for (const position of ['leading', 'trailing'] as const) {
      const slot = this.#positionSlot(position);
      const region = position === 'leading' ? this.leadingElement : this.trailingElement;
      const assigned = this.#hasAssignedPositionContent(slot);
      region?.toggleAttribute('hidden', !assigned && position !== selected);
      this.#positionIndicator(position)?.toggleAttribute('hidden', assigned);
    }
    const indicator = this.#defaultIndicatorElement;
    if (!indicator) {
      this.#indicatorMotion?.cancel();
      this.#indicatorMotion = null;
      return;
    }
    indicator.style.rotate = this.open ? '90deg' : '0deg';
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
    this.#observedBody = null;
    this.#composedTrigger?.release(this);
    this.#composedTrigger = undefined;
    this.#cancelPendingMotion();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.refreshPositions();
    this.#observeBody();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#collapsible.update(this.open, this.disabled);
      const indicator = this.#defaultIndicatorElement;
      if (indicator) indicator.style.rotate = this.open ? '90deg' : '0deg';
    });
  }

  protected override render() {
    const position = this.#resolvedIndicatorPosition();
    const level = Math.min(6, Math.max(0, Math.trunc(this.headingLevel) || 0));
    const state = Object.freeze({
      open: this.open,
      disabled: this.disabled,
      indicatorPosition: position,
      contentAlignment: this.#resolvedContentAlignment(),
    });
    const trigger = this.#part('collapsible-trigger', state, {
      tag: 'button',
      properties: { part: 'collapsible-trigger focusable', type: 'button' },
      content: html`${this.#renderPosition('leading', position, state)}${this.#part(
        'collapsible-label',
        state,
        {
          tag: 'span',
          content: html`<slot name="label">Toggle</slot>`,
        },
      )}${this.#renderPosition('trailing', position, state)}`,
    });
    const presence = this.#collapsible.state;
    return this.#part('collapsible', state, {
      content: html`${this.#part('collapsible-heading', state, {
        properties: { role: level ? 'heading' : null, 'aria-level': level || null },
        content: trigger,
      })}${this.#part('collapsible-content', state, {
        properties: {
          role: 'region',
          'data-state': presence,
          hidden:
            presence === 'absent' || presence === 'retained'
              ? this.hiddenUntilFound
                ? 'until-found'
                : true
              : false,
        },
        content: this.#part('collapsible-content-body', state, { content: html`<slot></slot>` }),
      })}`,
    });
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
    if (body === this.#observedBody) return;
    this.#resizeObserver?.disconnect();
    this.#resizeObserver = null;
    this.#observedBody = body;
    if (!body || typeof ResizeObserver === 'undefined') return;
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
        this.#defaultIndicatorElement,
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
      const indicator = this.#defaultIndicatorElement;
      if (indicator) indicator.style.rotate = this.open ? '90deg' : '0deg';
      this.#indicatorMotion?.start();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const position = this.#resolvedIndicatorPosition();
    this.dataset.indicatorPosition = position;
    this.dataset.contentAlignment = this.#resolvedContentAlignment();
    this.refreshPositions();
    const triggerHost = this.#parts.get('collapsible-trigger');
    const composed = triggerHost ? compositeControl(triggerHost) : undefined;
    if (composed !== this.#composedTrigger) {
      this.#composedTrigger?.release(this);
      this.#composedTrigger = composed;
    }
    composed?.apply(
      this,
      { disabled: this.disabled, focusableWhenDisabled: false, tabIndex: this.disabled ? -1 : 0 },
      this.#refreshController,
    );
    this.#refreshController();
    this.#observeBody();
    this.#measure();
  }

  #renderPosition(
    position: CollapsibleIndicatorPosition,
    indicatorPosition: CollapsibleIndicatorPosition,
    state: PartState,
  ) {
    const fallback =
      position === indicatorPosition
        ? html`<span data-default-indicator aria-hidden="true">
            <tp-icon .icon=${chevronRightIcon}></tp-icon>
          </span>`
        : nothing;
    return this.#part(`collapsible-${position}`, state, {
      tag: 'span',
      properties: { 'data-position': position },
      content: html`<slot name=${position} @slotchange=${this.refreshPositions}></slot>${fallback}`,
    });
  }

  #resolvedIndicatorPosition(): CollapsibleIndicatorPosition {
    return this.indicatorPosition === 'leading' ? 'leading' : 'trailing';
  }

  #resolvedContentAlignment(): CollapsibleContentAlignment {
    return this.contentAlignment === 'label' ? 'label' : 'edge';
  }

  #positionSlot(position: CollapsibleIndicatorPosition): HTMLSlotElement | null {
    return this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${position}"]`);
  }

  #positionIndicator(position: CollapsibleIndicatorPosition): HTMLElement | null {
    const region = position === 'leading' ? this.leadingElement : this.trailingElement;
    return region?.querySelector<HTMLElement>(':scope > [data-default-indicator]') ?? null;
  }

  #hasAssignedPositionContent(slot: HTMLSlotElement | null): boolean {
    if (!slot) return false;
    const visited = new Set<HTMLSlotElement>();
    const hasConsumerNode = (candidate: HTMLSlotElement): boolean => {
      if (visited.has(candidate)) return false;
      visited.add(candidate);
      return candidate.assignedNodes().some((node) => {
        if (node instanceof HTMLSlotElement && node.getRootNode() instanceof ShadowRoot) {
          return hasConsumerNode(node);
        }
        if (node.nodeType === Node.TEXT_NODE) return Boolean(node.textContent?.trim());
        return node.nodeType === Node.ELEMENT_NODE;
      });
    };
    return hasConsumerNode(slot);
  }
}
