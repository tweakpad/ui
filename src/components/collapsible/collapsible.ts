import { disclosureIndicatorStyles, disclosurePanelStyles } from '../../presentation/motion.js';
import { css, html, nothing } from 'lit';
import type { PropertyValues } from 'lit';
import { compositeControl } from '../../foundation/composite-control.js';
import { stateMarkers } from '../../foundation/state-markers.js';
import type { PartRenderOptions, PartState } from '../../foundation/part.js';
import { CollapsibleController } from '../../foundation/collapsible.js';
import {
  DisclosureIndicator,
  DisclosurePanelController,
} from '../../foundation/disclosure-panel.js';
import { TpElement } from '../../foundation/element.js';
import { TpOpenChangeEvent } from '../../foundation/events.js';
import type { MotionValue } from '../../foundation/motion.js';
import type { LogicalPosition } from '../../foundation/types.js';
import { chevronRightIcon } from '../../icons/chevron-right.js';
import { collapsiblePresentation } from '../../presentation/families/collapsible.js';
import { TpIcon } from '../icon/icon.js';
import type { CustomElementConstructorWithTag } from '../../foundation/define.js';

export type CollapsibleIndicatorPosition = LogicalPosition;
export type CollapsibleContentAlignment = 'edge' | 'label';

/**
 * One disclosure that shows and hides its content behind a labelled native button. Accordion
 * Items are built on it; use it alone for a single independent disclosure.
 *
 * @slot - The content shown when open.
 * @slot label - The trigger text.
 * @slot leading - Non-interactive content before the label, such as a step number; it replaces the
 *   chevron when the indicator sits on this side.
 * @slot trailing - Non-interactive content after the label, such as a status; it replaces the
 *   chevron when the indicator sits on this side.
 * @fires tp-open-change - Cancelable proposal to open or close, before `open` changes;
 *   `detail.value` is the proposed state.
 * @fires tp-open-change-complete - After the content finishes opening or closing; `detail.open`.
 */
export class TpCollapsible extends TpElement {
  static tagName = 'tp-collapsible';
  /** Library elements this element renders; defining it defines them too. */
  static get elementDependencies(): readonly CustomElementConstructorWithTag[] {
    return [TpIcon];
  }
  static override presentation = collapsiblePresentation;
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
      }

      ${disclosureIndicatorStyles('[data-default-indicator]')}

      [data-default-indicator][hidden] {
        display: none;
      }

      [part~='collapsible-content'] {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
      }

      ${disclosurePanelStyles("[part~='collapsible-content']")}

      [part~='collapsible-content-body'] {
        display: flow-root;
        grid-column: 1 / -1;
        min-width: 0;
      }

      :host([data-content-alignment='label']) [part~='collapsible-content-body'] {
        grid-column-start: 2;
      }
    `,
  ];
  /** Whether the content is shown; accepted trigger presses update it. */
  open = false;
  /** Initial state when `open` is not set; later changes do not reset it. */
  defaultOpen = false;
  /** Keeps closed content in the page instead of removing it. */
  keepMounted = false;
  /** Keeps closed content searchable by the browser's find in page, which opens the disclosure on a match. */
  hiddenUntilFound = false;
  /** The side of the trigger that draws the chevron, in writing direction. */
  indicatorPosition: CollapsibleIndicatorPosition = 'trailing';
  /** Starts the content at the outer edge, or lined up with the label, which reads better after leading content. */
  contentAlignment: CollapsibleContentAlignment = 'edge';
  /** Wraps the trigger in a heading of this level, 1 to 6, so the disclosure joins the page outline; `0` adds no heading. */
  headingLevel = 0;
  /** Called after an open or close proposal is accepted. */
  onOpenChange: ((event: TpOpenChangeEvent) => void) | undefined;
  #motionOwner: HTMLElement = this;
  #motionContext: Readonly<Record<string, MotionValue>> = Object.freeze({});
  #composedTrigger: ReturnType<typeof compositeControl>;
  readonly #refreshController = (): void => {
    if (this.isConnected) this.#collapsible.update(this.open, this.disabled);
  };
  #part(name: string, state: PartState, options: PartRenderOptions = {}): unknown {
    return this.renderPart(name, state, {
      ...options,
      reference: this.presentationController.partReference(name),
      properties: {
        ...stateMarkers({ open: this.open, disabled: this.disabled }, ['open', 'disabled']),
        ...options.properties,
      },
    });
  }
  readonly #indicator = new DisclosureIndicator();
  readonly #panel = new DisclosurePanelController(this, {
    owner: () => this.#motionOwner,
    panel: () => this.panelElement,
    body: () => this.bodyElement,
    context: () => this.#motionContext,
    trackCompletion: (completion) => this.#collapsible.trackCompletion(completion),
  });
  #defaultInitialized = false;
  readonly #collapsible = new CollapsibleController(this, {
    owner: this,
    trigger: () => this.triggerElement,
    activation: () => this.presentationController.partElement('collapsible-trigger') ?? null,
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
    onStateChange: (state) => this.#panel.sync(state),
    onComplete: (open) => {
      this.emit('tp-open-change-complete', { open });
    },
  });

  /** @internal Part element for compositions such as Accordion Item. */
  get rootElement(): HTMLElement | null {
    return this.presentationController.partElement('collapsible') ?? null;
  }

  /** @internal Part element for compositions such as Accordion Item. */
  get triggerElement(): HTMLButtonElement | null {
    const host = this.presentationController.partElement('collapsible-trigger');
    if (!host) return null;
    const control = compositeControl(host);
    return (control ? control.target() : host) as HTMLButtonElement | null;
  }

  /** @internal Part element for compositions such as Accordion Item. */
  get panelElement(): HTMLElement | null {
    return this.presentationController.partElement('collapsible-content') ?? null;
  }

  /** @internal Part element for compositions such as Accordion Item. */
  get bodyElement(): HTMLElement | null {
    return this.presentationController.partElement('collapsible-content-body') ?? null;
  }

  /** @internal Part element for compositions such as Accordion Item. */
  get leadingElement(): HTMLElement | null {
    return this.presentationController.partElement('collapsible-leading') ?? null;
  }

  /** @internal Part element for compositions such as Accordion Item. */
  get labelElement(): HTMLElement | null {
    return this.presentationController.partElement('collapsible-label') ?? null;
  }

  /** @internal Part element for compositions such as Accordion Item. */
  get trailingElement(): HTMLElement | null {
    return this.presentationController.partElement('collapsible-trailing') ?? null;
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
      this.#indicator.cancel();
      return;
    }
    this.#indicator.apply(indicator, DisclosureIndicator.rotation(this.open));
  }

  override connectedCallback(): void {
    super.connectedCallback();
    if (!this.#defaultInitialized) {
      this.#defaultInitialized = true;
      if (!this.hasAttribute('open') && this.defaultOpen) this.open = true;
    }
    if (this.hasUpdated) {
      this.#panel.observe();
      this.requestUpdate();
      queueMicrotask(() => {
        if (this.isConnected) this.#collapsible.update(this.open, this.disabled);
      });
    }
  }

  override disconnectedCallback(): void {
    this.#composedTrigger?.release(this);
    this.#composedTrigger = undefined;
    this.#panel.disconnect();
    this.#indicator.cancel();
    super.disconnectedCallback();
  }

  protected override firstUpdated(): void {
    this.refreshPositions();
    this.#panel.observe();
    queueMicrotask(() => {
      if (!this.isConnected) return;
      this.#collapsible.update(this.open, this.disabled);
      this.#indicator.apply(this.#defaultIndicatorElement, DisclosureIndicator.rotation(this.open));
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

  protected override willUpdate(changed: PropertyValues<this>): void {
    if (!this.hasUpdated) return;
    if (changed.has('open') && this.#collapsible.initialized) {
      this.#indicator.prepare(
        this.#motionOwner,
        this.#defaultIndicatorElement,
        this.#collapsible.open,
        this.open,
        this.#motionContext,
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
      this.#indicator.apply(this.#defaultIndicatorElement, DisclosureIndicator.rotation(this.open));
      this.#indicator.start();
    }
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const position = this.#resolvedIndicatorPosition();
    this.dataset.indicatorPosition = position;
    this.dataset.contentAlignment = this.#resolvedContentAlignment();
    this.refreshPositions();
    const triggerHost = this.presentationController.partElement('collapsible-trigger');
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
    // The first update defers this to firstUpdated's microtask: presence changes made here would
    // need another render inside this one.
    if (this.#collapsible.initialized) this.#refreshController();
    this.#panel.observe();
    this.#panel.measure();
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

declare global {
  interface HTMLElementTagNameMap {
    'tp-collapsible': TpCollapsible;
  }
}
