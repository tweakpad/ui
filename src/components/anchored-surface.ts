import { anchoredArrowStyles } from './shared.js';
import { css, html, nothing } from 'lit';
import { repeat } from 'lit/directives/repeat.js';
import { PopupViewportController } from '../foundation/popup-viewport.js';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { SurfaceState, TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import type { SurfaceHandle, SurfaceTriggerOptions } from '../foundation/surface-handle.js';
import { PresenceController } from '../foundation/presence.js';
import { FloatingDismissController } from '../foundation/floating-dismiss.js';
import {
  composedContains,
  composedParent,
  deepActiveElement,
  focusableElements,
  restoreFocus,
  shadowReferenceTarget,
  trapTabKey,
} from '../foundation/focus.js';
import { OwnedPortal, type OwnedPortalContainer } from '../foundation/owned-portal.js';
import { ComposedEnvironmentObserver } from '../foundation/composed-environment.js';
import { acquireOutsideInert } from '../foundation/outside-inert.js';
import { acquireScrollLock } from '../foundation/scroll-lock.js';
import { resolveSurfaceFocus, type SurfaceFocusTarget } from '../foundation/surface-focus.js';
import {
  componentHandlingPrevented,
  type PartRenderOptions,
  type PartState,
} from '../foundation/part.js';
import { componentDefinitions } from '../presentation/components.js';
import { createId } from '../foundation/id.js';
import { prepareMotion, type MotionHandle } from '../foundation/motion.js';
import {
  positionSurface,
  themeSpacing,
  geometryOffsets,
  type GeometryOffset,
  resolveSide,
  rect,
  type Alignment,
  type LogicalSide,
  type Placement,
  type PositioningHandle,
  type PositioningResult,
  type CollisionPolicy,
  type CollisionBoundary,
  type AnchorGeometry,
  type PositioningStrategy,
} from '../foundation/positioning.js';
import type { ChangeReason, PresenceState } from '../foundation/types.js';
import { HoverSurfaceController } from '../foundation/hover-surface.js';
import { DelayGroup } from '../foundation/delay-group.js';

export interface AnchoredTriggerOptions extends SurfaceTriggerOptions {
  openOnHover?: boolean;
  openDelay?: number;
  closeDelay?: number;
  closeOnClick?: boolean;
  disabled?: boolean;
}
export interface SurfaceOpenCoordinator {
  readonly open: boolean;
  request(
    open: boolean,
    reason: ChangeReason,
    event: Event | undefined,
    trigger: HTMLElement | null,
  ): boolean;
}
interface TriggerRecord {
  identifier: string;
  options: AnchoredTriggerOptions;
  sync(): void;
  cleanup(): void;
}
function targetOf(element: HTMLElement): HTMLElement {
  return (
    element.shadowRoot?.querySelector<HTMLElement>('button,a[href],input,[tabindex]') ?? element
  );
}

/** Shared native anchored layer used by Popover, Preview Card and Tooltip. */
export abstract class TpAnchoredSurface extends TpElement {
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open', noAccessor: true },
    placement: { type: String, noAccessor: true },
    side: { type: String },
    align: { type: String },
    offset: { type: Number, noAccessor: true },
    sideOffset: { type: Number, attribute: 'side-offset', noAccessor: true },
    alignOffset: { type: Number, attribute: 'align-offset' },
    collisionPadding: { attribute: false, noAccessor: true },
    collisionBoundary: { attribute: false },
    collisionAvoidance: { attribute: false },
    sticky: { type: Boolean },
    disableAnchorTracking: { type: Boolean, attribute: 'disable-anchor-tracking' },
    anchor: { attribute: false },
    dismissible: { type: Boolean },
    label: { type: String },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    showArrow: { type: Boolean, attribute: 'show-arrow' },
    arrowPadding: { type: Number, attribute: 'arrow-padding', noAccessor: true },
    arrowStaticOffset: { attribute: 'arrow-static-offset' },
    arrowWidth: { type: Number, attribute: 'arrow-width', noAccessor: true },
    arrowHeight: { type: Number, attribute: 'arrow-height', noAccessor: true },
    arrowTipRadius: { type: Number, attribute: 'arrow-tip-radius' },
    arrowPath: { type: String, attribute: 'arrow-path' },
    arrowBorderColor: { type: String, attribute: 'arrow-border-color' },
    arrowBorderWidth: { type: Number, attribute: 'arrow-border-width' },
    handle: { attribute: false },
    triggerIdentifier: { attribute: 'trigger-identifier' },
    defaultTriggerIdentifier: { attribute: 'default-trigger-identifier' },
    onOpenChange: { attribute: false },
    onOpenChangeComplete: { attribute: false },
    content: { attribute: false },
    portal: { type: Boolean },
    container: { attribute: false },
    portalIdentifier: { type: String, attribute: 'portal-identifier' },
    preserveTabOrder: { type: Boolean, attribute: 'preserve-tab-order' },
    positionMethod: { type: String, attribute: 'position-method' },
    modal: { type: Boolean },
    initialFocus: { attribute: false },
    finalFocus: { attribute: false },
    showBackdrop: { type: Boolean, attribute: 'show-backdrop' },
    backdropForceRender: { type: Boolean, attribute: 'backdrop-force-render' },
    showViewport: { type: Boolean, attribute: 'show-viewport' },
  };
  static override styles: CSSResultGroup = [
    TpElement.styles,
    anchoredArrowStyles,
    css`
      :host,
      .portal {
        display: contents;
      }

      .positioner {
        position: fixed;
        inset: auto;
        margin: 0;
        padding: 0;
        border: 0;
        background: transparent;
        color: inherit;
        overflow: visible;
        inline-size: max-content;
        max-inline-size: var(--tp-available-width, calc(100vw - var(--tp-space-3) * 2));
        max-block-size: var(--tp-available-height, calc(100dvh - var(--tp-space-3) * 2));
      }

      .positioner:not([data-positioned]),
      .positioner[data-anchor-hidden] {
        visibility: hidden;
        pointer-events: none;
      }

      .popup {
        position: relative;
        display: flex;
        flex-direction: column;
        max-inline-size: inherit;
        max-block-size: inherit;
        overflow-wrap: anywhere;
        transform-origin: var(--tp-transform-origin);
      }

      .body {
        display: flex;
        flex-direction: column;
        gap: inherit;
        min-block-size: 0;
        flex: 1 1 auto;
        max-block-size: inherit;
        overflow: auto;
      }

      .backdrop {
        position: fixed;
        inset: 0;
      }

      .viewport {
        position: relative;
        min-inline-size: 0;
        min-block-size: 0;
      }

      .viewport-entry[data-viewport-previous] {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      [hidden] {
        display: none !important;
      }
    `,
  ];
  #defaultOpen = false;
  #hasDefaultOpen = false;
  get defaultOpen(): boolean {
    return this.#defaultOpen;
  }
  set defaultOpen(value: boolean) {
    const previous = this.#defaultOpen;
    this.#defaultOpen = Boolean(value);
    this.#hasDefaultOpen = true;
    this.requestUpdate('defaultOpen', previous);
  }
  side: LogicalSide = 'bottom';
  align: Alignment = 'start';
  #sideOffset: GeometryOffset | undefined;
  get sideOffset(): GeometryOffset {
    return this.#sideOffset ?? themeSpacing(this, 3);
  }
  set sideOffset(value: GeometryOffset | undefined) {
    const previous = this.#sideOffset;
    this.#sideOffset = value ?? undefined;
    this.requestUpdate('sideOffset', previous);
  }
  alignOffset: GeometryOffset = 0;
  #collisionPadding:
    number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>> | undefined;
  get collisionPadding(): number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>> {
    return this.#collisionPadding ?? themeSpacing(this, 3);
  }
  set collisionPadding(
    value: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>>,
  ) {
    const previous = this.#collisionPadding;
    this.#collisionPadding = value ?? undefined;
    this.requestUpdate('collisionPadding', previous);
  }
  collisionBoundary: CollisionBoundary = 'clipping-ancestors';
  collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'shift' };
  sticky = false;
  disableAnchorTracking = false;
  anchor:
    AnchorGeometry | { current: AnchorGeometry | null } | (() => AnchorGeometry | null) | undefined;
  dismissible = true;
  label = '';
  keepMounted = false;
  showArrow = false;
  #arrowPadding: number | undefined;
  get arrowPadding(): number {
    return this.#arrowPadding ?? themeSpacing(this, 2);
  }
  set arrowPadding(value: number) {
    const previous = this.#arrowPadding;
    this.#arrowPadding = value ?? undefined;
    this.requestUpdate('arrowPadding', previous);
  }
  arrowStaticOffset: number | string | undefined;
  protected get defaultArrowWidthUnits(): number {
    return 4;
  }
  protected get defaultArrowHeightUnits(): number {
    return 2;
  }
  #arrowWidth: number | undefined;
  get arrowWidth(): number {
    return this.#arrowWidth ?? themeSpacing(this, this.defaultArrowWidthUnits);
  }
  set arrowWidth(value: number) {
    const previous = this.#arrowWidth;
    this.#arrowWidth = value ?? undefined;
    this.requestUpdate('arrowWidth', previous);
  }
  #arrowHeight: number | undefined;
  get arrowHeight(): number {
    return this.#arrowHeight ?? themeSpacing(this, this.defaultArrowHeightUnits);
  }
  set arrowHeight(value: number) {
    const previous = this.#arrowHeight;
    this.#arrowHeight = value ?? undefined;
    this.requestUpdate('arrowHeight', previous);
  }
  arrowTipRadius = 0;
  arrowPath = '';
  arrowBorderColor = '';
  arrowBorderWidth = 0;
  handle: SurfaceHandle | undefined;
  triggerIdentifier: string | undefined;
  defaultTriggerIdentifier: string | undefined;
  onOpenChange: ((event: TpSurfaceOpenChangeEvent) => void) | undefined;
  onOpenChangeComplete: ((open: boolean) => void) | undefined;
  content: ((payload: unknown) => unknown) | undefined;
  portal = false;
  container: OwnedPortalContainer = null;
  portalIdentifier: string | undefined;
  preserveTabOrder = true;
  positionMethod: PositioningStrategy = 'fixed';
  modal = false;
  initialFocus: SurfaceFocusTarget = 'none';
  finalFocus: SurfaceFocusTarget = 'trigger';
  showBackdrop = false;
  backdropForceRender = false;
  showViewport = false;
  protected openCoordinator: SurfaceOpenCoordinator | undefined;
  readonly actions = { close: () => this.close(), unmount: () => this.unmount() };
  protected trigger: HTMLElement | null = null;
  protected readonly contentId = createId('tp-anchored-content');
  protected readonly records = new Map<HTMLElement, TriggerRecord>();
  protected payloadValue: unknown;
  #providedOpen: boolean | undefined;
  #position: PositioningHandle | null = null;
  #positionResult: PositioningResult | null = null;
  #slotTriggers = new Map<HTMLElement, () => void>();
  #handleCleanup: (() => void) | undefined;
  #observer: MutationObserver | undefined;
  #phase: PresenceState = 'absent';
  #motion: MotionHandle | null = null;
  #forceUnmount = false;
  #diagnosed = new Set<string>();
  #wasOpen = false;
  #portal = new OwnedPortal(this, (this.constructor as typeof TpAnchoredSurface).styles);
  #environment = new ComposedEnvironmentObserver(this, () => {
    this.requestUpdate();
    void this.updatePosition();
  });
  #partElements = new Map<string, HTMLElement>();
  #partRefs = new Map<string, (element: HTMLElement | null) => void>();
  #partReleases = new Map<string, () => void>();
  #openingEvent: Event | undefined;
  #closingEvent: Event | undefined;
  #previousFocus: Element | null = null;
  #releaseModal: (() => void) | undefined;
  #releaseScroll: (() => void) | undefined;
  #focusDocument: Document | undefined;
  #focusPending = false;
  #viewport = new PopupViewportController(this, () => this.#partElements.get('viewport') ?? null);
  protected readonly state = new SurfaceState({
    read: () => this.#providedOpen,
    defaultOpen: () => this.defaultOpen,
    hasDefaultOpen: () => this.#hasDefaultOpen,
    dispatch: (event) => {
      this.onOpenChange?.(event);
      this.dispatchEvent(event);
      if (
        event.detail.value &&
        this.triggerIdentifier &&
        event.detail.trigger &&
        this.records.get(event.detail.trigger as HTMLElement)?.identifier !== this.triggerIdentifier
      )
        event.preventDefault();
    },
    commit: () => this.requestUpdate(),
    diagnostic: (message) => this.diagnostic('state-mode', message),
  });
  protected readonly presence = new PresenceController(this, {
    surface: () => this.positioner,
    keepMounted: () => !this.#forceUnmount && (this.keepMounted || this.state.retained),
    onStateChange: (state) => {
      if (state === 'retained') this.positioner?.hidePopover();
      this.requestUpdate();
    },
    onComplete: (open) => {
      if (!open) {
        this.stopPosition();
        this.positioner?.hidePopover();
        this.trigger = null;
        this.payloadValue = undefined;
        this.#viewport.reset();
        this.closed();
      }
      this.syncTriggers();
      this.emit('tp-open-change-complete', { open });
      this.onOpenChangeComplete?.(open);
    },
  });
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    anchor: () => this.trigger,
    insideElements: () => (this.positioner ? [this.positioner] : []),
    outside: () => this.dismissible,
    escape: () => true,
    topmostOnly: true,
    dismiss: (event) => this.dismissSurface(event),
  });
  get open(): boolean {
    return (this.openCoordinator?.open ?? this.state.open) && !this.surfaceDisabled;
  }
  set open(value: boolean | undefined) {
    const previous = this.#providedOpen;
    if (this.openCoordinator) {
      this.diagnostic(
        'coordinated-open',
        'The parent owns this open lane; do not also control the child open value.',
      );
      return;
    }
    this.#providedOpen = value === undefined ? undefined : Boolean(value);
    this.requestUpdate('open', previous);
    this.requestUpdate();
    if (this.hasUpdated) this.state.sync(true);
  }
  get placement(): string {
    return this.align === 'center' ? this.side : `${this.side}-${this.align}`;
  }
  set placement(value: string) {
    const match = value
      ?.trim()
      .match(
        /^(top|right|bottom|left|inline-start|inline-end|block-start|block-end)(?:(?:-|\s+)(start|center|end))?$/,
      );
    if (match) {
      this.side = match[1] as LogicalSide;
      this.align = (match[2] ?? 'center') as Alignment;
    }
  }
  get offset(): GeometryOffset {
    return this.sideOffset;
  }
  set offset(value: GeometryOffset) {
    this.sideOffset = value;
  }
  get payload(): unknown {
    return this.payloadValue;
  }
  get activeTriggerIdentifier(): string | undefined {
    return this.trigger ? this.records.get(this.trigger)?.identifier : undefined;
  }
  get presenceState(): PresenceState {
    return this.presence.state;
  }
  get positioned(): boolean {
    return this.open && this.#positionResult !== null;
  }
  get positioningResult(): PositioningResult | null {
    return this.#positionResult;
  }
  get resolvedSide(): string | undefined {
    return this.positioner?.dataset.side;
  }
  get resolvedAlign(): string | undefined {
    return this.positioner?.dataset.align;
  }
  protected get partPrefix(): string {
    return 'popover';
  }
  get presentationTagName(): string {
    return this.localName;
  }
  protected get overlayRole(): string {
    return 'dialog';
  }
  protected get isTooltip(): boolean {
    return false;
  }
  protected get surfaceDisabled(): boolean {
    return this.disabled;
  }
  protected get surfaceModal(): boolean {
    return this.modal && !this.isTooltip;
  }
  protected get surfaceMotionRole(): boolean {
    return true;
  }
  protected get triggerHasPopup(): string | null {
    return this.overlayRole === 'tooltip' ? null : this.overlayRole;
  }
  protected get triggerPart(): string {
    return this.partName('trigger');
  }
  protected get ownedChildren(): readonly Node[] {
    return this.#portal.ownedChildren;
  }
  protected get contentNodes(): readonly Node[] {
    return this.ownedChildren.filter(
      (node) =>
        node.nodeType !== 1 ||
        !['trigger', 'anchor'].includes((node as Element).getAttribute('slot') ?? ''),
    );
  }
  protected get contentElements(): readonly HTMLElement[] {
    return this.contentNodes.filter((node): node is HTMLElement => node.nodeType === 1);
  }
  get popupElement(): HTMLElement | null {
    return this.popup;
  }
  get triggerElement(): HTMLElement | null {
    return this.trigger ? targetOf(this.trigger) : null;
  }
  get portalElement(): HTMLElement | null {
    return this.#portal.host;
  }
  protected get positioner(): HTMLElement | null {
    return this.#partElements.get('positioner') ?? null;
  }
  protected get popup(): HTMLElement | null {
    return this.#partElements.get('content') ?? null;
  }
  protected get instant(): string | undefined {
    return undefined;
  }
  protected partName(suffix: string): string {
    return `${this.partPrefix}-${suffix}`;
  }
  protected diagnostic(code: string, message: string): void {
    if (!this.#diagnosed.has(code)) {
      this.#diagnosed.add(code);
      this.emit('tp-diagnostic', {
        code: `${this.partPrefix}-${code}`,
        severity: 'warning',
        message,
      });
    }
  }
  override connectedCallback(): void {
    super.connectedCallback();
    this.part.add(this.partPrefix);
    this.#environment.connect();
    this.#observer = new this.ownerDocument.defaultView!.MutationObserver(() => {
      this.syncSlot();
      this.syncTriggers();
      this.requestUpdate();
    });
    this.#observer.observe(this, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['slot', 'disabled', 'aria-disabled'],
    });
    this.syncSlot();
    this.#handleCleanup = this.handle?.attach(this);
    this.requestUpdate();
  }
  override disconnectedCallback(): void {
    this.#observer?.disconnect();
    this.stopPosition();
    this.positioner?.hidePopover();
    this.#motion?.cancel();
    this.#phase = 'absent';
    for (const cleanup of this.#slotTriggers.values()) cleanup();
    this.#slotTriggers.clear();
    this.#environment.disconnect();
    this.#portal.clear();
    this.#viewport.reset();
    this.#releaseLayers();
    for (const release of this.#partReleases.values()) release();
    this.#partReleases.clear();
    this.#handleCleanup?.();
    this.#handleCleanup = undefined;
    for (const record of this.records.values()) record.cleanup();
    this.records.clear();
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    if (!this.openCoordinator) this.state.sync();
    if (this.surfaceDisabled && this.state.open) this.state.request(false, 'disabled');
    // Restore while the owned popup still contains focus. Rendering the closed
    // portal makes it inert (or removes it), which otherwise blurs to body first.
    if (!this.open && this.#wasOpen && !this.isTooltip) {
      this.#releaseLayers();
      this.focusOnClose();
    }
    if (this.open) {
      const desired =
        this.triggerIdentifier ?? (this.trigger ? undefined : this.defaultTriggerIdentifier);
      const selected = desired
        ? [...this.records].find(([, r]) => r.identifier === desired)?.[0]
        : (this.trigger ?? this.#slotTriggers.keys().next().value ?? null);
      if (selected && selected !== this.trigger) {
        this.trigger = selected;
        this.payloadValue = this.records.get(selected)?.options.payload;
      }
    }
    if (this.open && this.showViewport && this.content) {
      const key = this.activeTriggerIdentifier ?? 'default';
      const identifiers = [...this.records.values()].map((record) => record.identifier);
      const previous = this.#viewport.state.current;
      this.#viewport.set(
        key,
        this.popupViewContent(this.payload),
        previous && identifiers.indexOf(key) < identifiers.indexOf(previous)
          ? 'backward'
          : 'forward',
      );
    }
    this.presence.setPresent(this.open && Boolean(this.trigger || this.anchorGeometry()));
  }
  protected partState(): PartState {
    return {
      open: this.open,
      disabled: this.surfaceDisabled,
      presence: this.presence.state,
      payload: this.payload,
      side: this.resolvedSide,
      align: this.resolvedAlign,
    };
  }
  protected surfacePart(suffix: string, options: PartRenderOptions = {}): unknown {
    const name = this.partName(suffix);
    const publicPart = componentDefinitions
      .find((definition) => definition.tagName === this.presentationTagName)
      ?.parts.some((part) => part.name === name);
    const key = publicPart ? name : suffix;
    let ref = this.#partRefs.get(suffix);
    if (!ref) {
      ref = (element) => {
        if (element === this.#partElements.get(suffix)) return;
        this.#partReleases.get(suffix)?.();
        this.#partReleases.delete(suffix);
        if (element) {
          this.#partElements.set(suffix, element);
          if (publicPart)
            this.#partReleases.set(suffix, this.presentationController.registerPart(name, element));
        } else this.#partElements.delete(suffix);
      };
      this.#partRefs.set(suffix, ref);
    }
    return this.renderPart(key, this.partState(), { ...options, reference: ref });
  }
  protected popupProperties(): Record<string, unknown> {
    const state = this.presence.state;
    return {
      class: 'popup',
      id: this.contentId,
      role: this.overlayRole,
      tabindex: -1,
      'aria-label': this.isTooltip ? undefined : this.label || undefined,
      'data-state': state,
      'data-open': this.open,
      'data-closed': !this.open,
      'data-starting-style': state === 'starting',
      'data-ending-style': state === 'ending',
      'data-instant': this.instant,
      '@keydown': this.surfaceKeydown,
      '@focusin': this.popupFocus,
      '@focusout': this.surfaceFocusout,
      '@pointerenter': this.popupEnter,
      '@pointerleave': this.popupLeave,
    };
  }
  protected popupViewContent(payload: unknown): unknown {
    return this.content
      ? this.content(payload)
      : html`<slot @slotchange=${this.contentChanged}>${this.label}</slot>`;
  }
  get viewportState() {
    return this.#viewport.state;
  }
  protected popupContent(): unknown {
    if (this.showViewport && this.content)
      return repeat(
        this.#viewport.entries,
        (entry) => entry.key,
        (entry) => {
          const previous = entry.key !== this.#viewport.state.current;
          return html`<div
            class="body viewport-entry"
            .inert=${previous}
            aria-hidden=${previous ? 'true' : nothing}
            ?data-viewport-previous=${previous}
            ?data-viewport-current=${!previous}
            ?data-ending-style=${previous}
          >
            ${entry.content}
          </div>`;
        },
      );
    return html`<div class="body">${this.popupViewContent(this.payload)}</div>`;
  }
  protected renderLayer(): unknown {
    const state = this.presence.state;
    const w = Math.max(1, this.arrowWidth),
      h = Math.max(1, this.arrowHeight);
    const r = Math.min(Math.max(0, this.arrowTipRadius), h / 2);
    const path =
      this.arrowPath ||
      `M0 0 L${w / 2 - r} ${h - r} Q${w / 2} ${h} ${w / 2 + r} ${h - r} L${w} 0 Z`;
    const body = this.popupContent();
    const content = this.surfacePart('content', {
      properties: this.popupProperties(),
      content: html`${this.showViewport ? this.surfacePart('viewport', { properties: { class: 'viewport', 'data-open': this.open, 'data-closed': !this.open, 'data-transitioning': this.viewportState.transitioning, 'data-activation-direction': this.viewportState.activationDirection }, content: body }) : body}${
        this.showArrow
          ? this.surfacePart('arrow', {
              properties: {
                class: 'arrow',
                'aria-hidden': 'true',
                style: {
                  '--_tp-arrow-width':
                    this.#arrowWidth === undefined
                      ? `calc(var(--tp-spacing) * ${this.defaultArrowWidthUnits})`
                      : `${w}px`,
                  '--_tp-arrow-height':
                    this.#arrowHeight === undefined
                      ? `calc(var(--tp-spacing) * ${this.defaultArrowHeightUnits})`
                      : `${h}px`,
                },
              },
              content: html`<svg viewBox=${`0 0 ${w} ${h}`} aria-hidden="true">
                <path
                  d=${path}
                  stroke=${this.arrowBorderColor || 'none'}
                  stroke-width=${this.arrowBorderWidth}
                ></path>
              </svg>`,
            })
          : nothing
      }`,
    });
    const guards =
      this.open && this.portal && this.preserveTabOrder && !this.surfaceModal && !this.isTooltip;
    return html`${
      this.showBackdrop && (this.presence.mounted || this.backdropForceRender)
        ? this.surfacePart('backdrop', {
            properties: {
              class: 'backdrop',
              'aria-hidden': 'true',
              '.inert': !this.open,
              hidden: !this.open,
              'data-open': this.open,
              'data-closed': !this.open,
            },
          })
        : nothing
    }${
      this.presence.mounted
        ? this.surfacePart('portal', {
            properties: { class: 'portal' },
            content: this.surfacePart('positioner', {
              properties: {
                class: 'positioner',
                popover: 'manual',
                hidden: state === 'retained',
                '.inert': !this.open,
                'aria-hidden': this.open ? undefined : 'true',
                'data-state': state,
              },
              content: html`${guards ? html`<span class="visually-hidden" tabindex="0" data-focus-guard @focus=${() => this.triggerElement?.focus()}></span>` : nothing}${content}${guards ? html`<span class="visually-hidden" tabindex="0" data-focus-guard @focus=${() => this.focusOutside(1)}></span>` : nothing}`,
            }),
          })
        : nothing
    }`;
  }
  protected override render() {
    return html`<slot name="trigger" @slotchange=${this.syncSlot}></slot
      ><slot name="anchor" @slotchange=${this.contentChanged}></slot
      >${this.open && this.portal && this.preserveTabOrder && !this.surfaceModal && !this.isTooltip ? html`<span class="visually-hidden" tabindex="0" data-focus-guard @focus=${() => (focusableElements(this.popup!)[0] ?? this.popup)?.focus()}></span>` : nothing}${this.portal ? nothing : this.renderLayer()}`;
  }
  protected surfaceKeydown = (event: KeyboardEvent): void => {
    if (this.surfaceModal && this.dismissController.isTopmost && this.popup)
      trapTabKey(event, this.popup);
  };
  protected surfaceFocusout = (event: FocusEvent): void => {
    this.popupBlur(event);
    if (this.isTooltip || this.surfaceModal) return;
    queueMicrotask(() => {
      if (this.open && !this.dismissController.contains(deepActiveElement(this.ownerDocument)))
        this.setOpen(false, 'focus-outside', event);
    });
  };
  protected focusOutside(direction: -1 | 1): void {
    const target = this.triggerElement;
    const items = focusableElements(this.ownerDocument.body);
    const start = target ? items.indexOf(target) : -1;
    for (let index = start + direction; index >= 0 && index < items.length; index += direction) {
      const item = items[index]!;
      if (!this.dismissController.contains(item)) {
        item.focus();
        break;
      }
    }
    this.setOpen(false, 'focus-outside');
  }
  protected dismissSurface(event: Event): void {
    this.setOpen(false, event.type === 'keydown' ? 'escape-key' : 'outside-press', event);
  }
  protected closed(): void {}
  protected focusOnOpen(): void {
    const target = resolveSurfaceFocus(this.initialFocus, {
      event: this.#openingEvent,
      defaultTarget: () => focusableElements(this.popup!)[0] ?? this.popup,
      trigger: this.triggerElement,
      first: this.popup ? (focusableElements(this.popup)[0] ?? null) : null,
      popup: this.popup,
      previous: this.#previousFocus,
    });
    target?.focus({ preventScroll: true });
  }
  protected focusOnClose(): void {
    if (!this.popup || !composedContains(this.popup, deepActiveElement(this.ownerDocument))) return;
    restoreFocus(
      resolveSurfaceFocus(this.finalFocus, {
        event: this.#closingEvent,
        defaultTarget: () => this.triggerElement,
        trigger: this.triggerElement,
        first: null,
        popup: this.popup,
        previous: this.#previousFocus,
      }),
    );
  }
  #focusIn = (): void => {
    if (
      this.open &&
      this.surfaceModal &&
      this.dismissController.isTopmost &&
      !this.dismissController.contains(deepActiveElement(this.ownerDocument))
    )
      (this.popup ? (focusableElements(this.popup)[0] ?? this.popup) : null)?.focus({
        preventScroll: true,
      });
  };
  #releaseLayers(): void {
    this.#releaseModal?.();
    this.#releaseModal = undefined;
    this.#releaseScroll?.();
    this.#releaseScroll = undefined;
    this.#focusDocument?.removeEventListener('focusin', this.#focusIn, true);
    this.#focusDocument = undefined;
  }
  #syncLayers(): void {
    if (!this.open || !this.surfaceModal || !this.popup) {
      this.#releaseLayers();
      return;
    }
    if (this.#focusDocument !== this.ownerDocument) this.#releaseLayers();
    this.#releaseModal ??= acquireOutsideInert(this.ownerDocument, () =>
      this.dismissController.branchElements.filter(
        (element): element is HTMLElement =>
          element.namespaceURI === 'http://www.w3.org/1999/xhtml',
      ),
    );
    this.#releaseScroll ??= acquireScrollLock(this.ownerDocument);
    if (!this.#focusDocument) {
      this.#focusDocument = this.ownerDocument;
      this.#focusDocument.addEventListener('focusin', this.#focusIn, true);
    }
  }
  protected popupEnter = (_event: PointerEvent): void => {
    void _event;
  };
  protected popupLeave = (_event: PointerEvent): void => {
    void _event;
  };
  protected popupFocus = (_event: FocusEvent): void => {
    void _event;
  };
  protected popupBlur = (_event: FocusEvent): void => {
    void _event;
  };
  protected contentChanged = (): void => {
    this.syncTriggers();
    void this.updatePosition();
  };
  protected syncSlot = (): void => {
    const next = new Set(
      this.ownedChildren.filter(
        (node): node is HTMLElement =>
          node.nodeType === 1 && (node as Element).getAttribute('slot') === 'trigger',
      ),
    );
    for (const [element, cleanup] of this.#slotTriggers)
      if (!next.has(element)) {
        cleanup();
        this.#slotTriggers.delete(element);
      }
    for (const element of next)
      if (!this.#slotTriggers.has(element))
        this.#slotTriggers.set(element, this.registerTrigger(element));
  };
  protected syncTriggers(): void {
    for (const r of this.records.values()) r.sync();
  }
  protected bindInteraction(element: HTMLElement, options: AnchoredTriggerOptions): () => void {
    const click = (event: MouseEvent) =>
      queueMicrotask(() => {
        if (
          !componentHandlingPrevented(event) &&
          (!event.defaultPrevented || options.nativeAction === false) &&
          !this.triggerDisabled(element, options)
        )
          this.requestOpen(!this.open, 'trigger-press', event, element);
      });
    element.addEventListener('click', click);
    return () => element.removeEventListener('click', click);
  }
  protected triggerDisabled(element: HTMLElement, options: AnchoredTriggerOptions): boolean {
    return (
      this.surfaceDisabled ||
      Boolean(options.disabled) ||
      element.matches('[disabled],[aria-disabled=true]') ||
      targetOf(element).matches('[disabled],[aria-disabled=true]')
    );
  }
  registerTrigger(element: HTMLElement, options: AnchoredTriggerOptions = {}): () => void {
    if (this.records.has(element)) return () => {};
    if (element.ownerDocument !== this.ownerDocument) {
      this.diagnostic('trigger-environment', 'Anchor and popup must share their document.');
      return () => {};
    }
    const identifier = options.identifier ?? (element.id || createId('tp-trigger'));
    let target: HTMLElement | undefined,
      bridge: HTMLElement | undefined,
      unregister: (() => void) | undefined;
    let controls: readonly Element[] | null = null;
    let controlsAttribute: string | null = null;
    const originals = new Map<string, string | null>();
    const applied = new Map<string, string | null>();
    const part = this.triggerPart,
      hadPart = element.part.contains(part);
    element.part.add(part);
    const restore = () => {
      if (target && !this.isTooltip) {
        target.ariaControlsElements = controls;
        if (controlsAttribute) target.setAttribute('aria-controls', controlsAttribute);
        else if (controlsAttribute === null && !controls?.length)
          target.removeAttribute('aria-controls');
      }
      if (target)
        for (const [name, value] of originals)
          if (target.getAttribute(name) === applied.get(name)) {
            if (value === null) target.removeAttribute(name);
            else target.setAttribute(name, value);
          }
      originals.clear();
      applied.clear();
      bridge?.remove();
      bridge = undefined;
      unregister?.();
    };
    const write = (name: string, value: string | null) => {
      if (!originals.has(name)) originals.set(name, target!.getAttribute(name));
      applied.set(name, value);
      if (target!.getAttribute(name) === value) return;
      if (value === null) target!.removeAttribute(name);
      else target!.setAttribute(name, value);
    };
    const sync = () => {
      const next = targetOf(element);
      if (next !== target) {
        restore();
        target = next;
        controls = target.ariaControlsElements;
        controlsAttribute = target.getAttribute('aria-controls');
        unregister = this.presentationController.registerPart(part, target);
      }
      const actualDescription = target.getAttribute('aria-describedby');
      if (
        applied.has('aria-describedby') &&
        actualDescription !== applied.get('aria-describedby')
      ) {
        originals.set('aria-describedby', actualDescription);
      }
      const active =
        this.trigger === element && this.open && !this.triggerDisabled(element, options);
      write('data-popup-open', active ? '' : null);
      // Tooltip availability does not disable the control it describes.
      if (!this.isTooltip)
        write('data-disabled', this.triggerDisabled(element, options) ? '' : null);
      if (
        options.nativeAction === false &&
        !target.matches('button,a[href],input,select,textarea')
      ) {
        write('role', 'button');
        write('tabindex', this.triggerDisabled(element, options) ? '-1' : '0');
        write('aria-disabled', this.triggerDisabled(element, options) ? 'true' : null);
      }
      if (this.isTooltip) {
        if (active) {
          if (!bridge) {
            bridge = this.ownerDocument.createElement('span');
            bridge.id = createId('tp-tooltip-description');
            bridge.hidden = true;
            const root = target.getRootNode();
            (root.nodeType === 11 && 'host' in root ? root : this.ownerDocument.body).appendChild(
              bridge,
            );
          }
          bridge.textContent = this.descriptionText();
          write(
            'aria-describedby',
            [
              (originals.has('aria-describedby')
                ? originals.get('aria-describedby')
                : target.getAttribute('aria-describedby')) ?? '',
              bridge.id,
            ]
              .filter(Boolean)
              .join(' '),
          );
        } else {
          const value = originals.get('aria-describedby');
          if (value !== undefined) write('aria-describedby', value);
          bridge?.remove();
          bridge = undefined;
        }
      } else {
        write('aria-expanded', String(active));
        write('aria-haspopup', this.triggerHasPopup);
        target.ariaControlsElements = this.popup
          ? [...(controls ?? []), shadowReferenceTarget(this.popup)]
          : [...(controls ?? []), this];
      }
    };
    const removeListeners = this.bindInteraction(element, options);
    const observer = new this.ownerDocument.defaultView!.MutationObserver(() => {
      sync();
      if (this.triggerDisabled(element, options)) this.triggerBecameDisabled(element);
    });
    observer.observe(element, { attributes: true, attributeFilter: ['disabled', 'aria-disabled'] });
    if (target && target !== element)
      observer.observe(target, {
        attributes: true,
        attributeFilter: ['disabled', 'aria-disabled'],
      });
    const cleanup = () => {
      observer.disconnect();
      removeListeners();
      restore();
      if (!hadPart) element.part.remove(part);
    };
    this.records.set(element, { identifier, options, sync, cleanup });
    sync();
    this.requestUpdate();
    return () => {
      cleanup();
      this.records.delete(element);
      if (this.trigger === element && this.open) this.setOpen(false, 'anchor-removed');
      this.requestUpdate();
    };
  }
  protected triggerBecameDisabled(element: HTMLElement): void {
    if (this.open && this.trigger === element) this.setOpen(false, 'disabled');
  }
  protected descriptionText(): string {
    return (
      (this.content ? this.popup?.textContent?.trim() : '') ||
      this.contentNodes
        .map((n) => n.textContent)
        .join(' ')
        .trim() ||
      this.label
    );
  }
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', event?: Event): boolean {
    return this.requestOpen(open, reason, event);
  }
  setOpenCoordinator(coordinator: SurfaceOpenCoordinator | undefined): boolean {
    if (coordinator && this.#providedOpen !== undefined) {
      this.diagnostic(
        'coordinated-open',
        'A participating Menu cannot also control its open lane.',
      );
      return false;
    }
    this.openCoordinator = coordinator;
    if (coordinator)
      this.state.acceptCoordinated(
        new TpSurfaceOpenChangeEvent(coordinator.open, this.state.open, 'programmatic'),
      );
    this.requestUpdate();
    return true;
  }
  stageOpen(
    open: boolean,
    reason: ChangeReason,
    event?: Event,
    trigger?: HTMLElement | null,
  ): TpSurfaceOpenChangeEvent {
    const proposal = new TpSurfaceOpenChangeEvent(
      open,
      this.open,
      reason,
      event,
      trigger ?? this.trigger ?? undefined,
    );
    this.onOpenChange?.(proposal);
    this.dispatchEvent(proposal);
    return proposal;
  }
  acceptCoordinatedOpen(event: TpSurfaceOpenChangeEvent, trigger?: HTMLElement | null): void {
    this.state.acceptCoordinated(event, () =>
      this.#acceptAssociation(
        event.detail.value,
        event.detail.reason,
        event.detail.sourceEvent,
        trigger ?? this.trigger ?? this.#slotTriggers.keys().next().value ?? null,
      ),
    );
  }
  #acceptAssociation(
    open: boolean,
    reason: ChangeReason,
    event: Event | undefined,
    target: HTMLElement | null,
  ): void {
    if (open) {
      if (!this.#wasOpen) {
        this.#previousFocus = deepActiveElement(this.ownerDocument);
        this.#focusPending = true;
      }
      this.#openingEvent = event;
      this.#forceUnmount = false;
      // The existing positioner tracks its original anchor until recreated.
      if (target !== this.trigger) this.stopPosition();
      this.trigger = target;
      this.payloadValue = target ? this.records.get(target)?.options.payload : undefined;
    } else this.#closingEvent = event;
    this.accepted(open, reason, event);
    this.requestUpdate();
  }
  protected requestOpen(
    open: boolean,
    reason: ChangeReason,
    event?: Event,
    trigger?: HTMLElement,
  ): boolean {
    const target =
      trigger ??
      this.trigger ??
      [...this.records].find(
        ([, record]) =>
          record.identifier === (this.triggerIdentifier ?? this.defaultTriggerIdentifier),
      )?.[0] ??
      this.#slotTriggers.keys().next().value ??
      null;
    if (
      open &&
      ((!target && !this.anchorGeometry()) ||
        this.surfaceDisabled ||
        (target && this.triggerDisabled(target, this.records.get(target)?.options ?? {})))
    )
      return false;
    if (this.openCoordinator) return this.openCoordinator.request(open, reason, event, target);
    let accepted = false;
    this.state.request(
      open,
      reason,
      event,
      target ?? undefined,
      () => {
        accepted = true;
        this.#acceptAssociation(open, reason, event, target);
      },
      open && target !== this.trigger,
    );
    return accepted;
  }
  protected accepted(_open: boolean, _reason: ChangeReason, _event?: Event): void {
    void _open;
    void _reason;
    void _event;
  }
  close(): void {
    this.setOpen(false, 'imperative-action');
  }
  unmount(): void {
    if (this.open) {
      if (!this.requestOpen(false, 'imperative-action') || this.open) return;
    }
    this.#forceUnmount = true;
    this.state.retained = false;
    this.presence.releaseRetained();
    this.requestUpdate();
  }
  openFromHandle(identifier?: string): void {
    const target = [...this.records].find(([, r]) => r.identifier === identifier)?.[0];
    if (!target) {
      this.diagnostic(
        'unknown-trigger',
        'An anchored handle requires a registered trigger identifier.',
      );
      return;
    }
    this.requestOpen(true, 'imperative-action', undefined, target);
  }
  protected anchorGeometry(): AnchorGeometry | null {
    const configured =
      typeof this.anchor === 'function'
        ? this.anchor()
        : this.anchor && 'current' in this.anchor
          ? this.anchor.current
          : this.anchor;
    return (
      configured ??
      this.ownedChildren.find(
        (node): node is HTMLElement =>
          node.nodeType === 1 && (node as Element).getAttribute('slot') === 'anchor',
      ) ??
      this.trigger
    );
  }
  async updatePosition(): Promise<PositioningResult | null> {
    return this.#position?.update() ?? null;
  }
  protected startPosition(): void {
    const surface = this.positioner,
      anchor = this.anchorGeometry();
    if (!surface || !anchor || !this.open) return;
    this.stopPosition();
    if (!surface.matches(':popover-open')) surface.showPopover();
    const context = 'getBoundingRectangle' in anchor ? (anchor.contextElement ?? this) : anchor;
    const side = resolveSide(this.side, context),
      placement = (this.align === 'center' ? side : `${side}-${this.align}`) as Placement;
    const padding = () => this.collisionPadding;
    const arrowPadding = () => this.arrowPadding;
    this.#position = positionSurface(anchor, surface, {
      placement,
      resolvePlacement: () => {
        const currentSide = resolveSide(this.side, context);
        return (
          this.align === 'center' ? currentSide : `${currentSide}-${this.align}`
        ) as Placement;
      },
      offset: (context) => geometryOffsets(this.sideOffset, this.alignOffset)(context),
      strategy: this.positionMethod,
      get padding() {
        return padding();
      },
      boundary: this.collisionBoundary,
      collision: this.collisionAvoidance,
      sticky: this.sticky,
      constrainSize: true,
      arrow: this.showArrow ? (this.#partElements.get('arrow') ?? null) : null,
      get arrowPadding() {
        return arrowPadding();
      },
      ...(this.arrowStaticOffset !== undefined
        ? { arrowStaticOffset: this.arrowStaticOffset }
        : {}),
      tracking: this.disableAnchorTracking ? false : {},
      onInvalid: () => {
        this.#positionResult = null;
        if (this.open) this.setOpen(false, 'anchor-removed');
      },
      onPosition: (result) => {
        this.#positionResult = result;
        for (const node of [this.popup])
          if (node) {
            node.dataset.side = surface.dataset.side!;
            node.dataset.align = surface.dataset.align!;
            node.toggleAttribute('data-anchor-hidden', result.stageData.hide.referenceHidden);
          }
      },
    });
  }
  protected stopPosition(): void {
    this.#position?.destroy();
    this.#position = null;
    this.#positionResult = null;
  }
  #defaultPortalContainer(): HTMLElement {
    // Native modal dialogs make body portals inert, including top-layer popovers.
    // Keep the shared surface in its anchor's actual composed modal branch.
    const anchor = this.anchorGeometry();
    const context = anchor && 'getBoundingRectangle' in anchor ? anchor.contextElement : anchor;
    for (let node: Node | null = context ?? this; node; node = composedParent(node))
      if (node.nodeType === 1 && (node as Element).matches('dialog:modal'))
        return node as HTMLElement;
    return this.ownerDocument.body;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.isConnected) return;
    if (this.portal) {
      this.#portal.update(this.container ?? this.#defaultPortalContainer(), this.renderLayer(), {
        projectedNodes: this.contentNodes,
        ...(this.portalIdentifier ? { identifier: this.portalIdentifier } : {}),
      });
      if (this.#portal.host)
        this.#observer?.observe(this.#portal.host, {
          childList: true,
          subtree: true,
          characterData: true,
          attributes: true,
          attributeFilter: ['slot', 'disabled', 'aria-disabled'],
        });
    } else this.#portal.clear();
    const viewport = this.#partElements.get('viewport');
    this.#viewport.setElements(
      viewport?.querySelector('[data-viewport-current]') ?? null,
      viewport?.querySelector('[data-viewport-previous]') ?? null,
    );
    if (this.shadowRoot && 'referenceTarget' in this.shadowRoot)
      (this.shadowRoot as ShadowRoot & { referenceTarget: string }).referenceTarget =
        this.contentId;
    if (changed.has('handle')) {
      this.#handleCleanup?.();
      this.#handleCleanup = this.handle?.attach(this);
    }
    this.syncTriggers();
    if (
      this.open &&
      (!this.#position ||
        [
          'side',
          'align',
          'sideOffset',
          'alignOffset',
          'collisionPadding',
          'collisionBoundary',
          'collisionAvoidance',
          'showArrow',
          'arrowWidth',
          'arrowHeight',
          'arrowPadding',
          'arrowStaticOffset',
          'sticky',
          'anchor',
          'triggerIdentifier',
          'disableAnchorTracking',
          'positionMethod',
          'container',
          'portal',
        ].some((k) => changed.has(k as keyof TpAnchoredSurface)))
    )
      this.startPosition();
    this.#syncLayers();
    if (this.open && (!this.#wasOpen || this.#focusPending) && this.popup && this.#position) {
      this.#focusPending = false;
      this.focusOnOpen();
    }
    this.#wasOpen = this.open;
    const state = this.presence.state;
    if (state !== this.#phase) {
      this.#phase = state;
      if (state === 'starting' || state === 'ending') {
        this.#motion?.cancel();
        this.#motion = this.surfaceMotionRole
          ? prepareMotion(
              this,
              this.popup,
              {
                name: 'surface',
                kind: 'presence',
                phases: ['enter', 'exit'],
                completion: 'blocking',
              },
              {
                phase: state === 'starting' ? 'enter' : 'exit',
                fromState: state === 'starting' ? 'closed' : 'open',
                toState: this.open ? 'open' : 'closed',
                context: { placement: this.positioningResult?.placement ?? this.placement },
              },
            )
          : null;
      }
      if (state === 'open' || state === 'ending') {
        this.#motion?.start();
        if (this.#motion) this.presence.trackCompletion(this.#motion.finished);
      }
    }
    this.toggleAttribute('data-open', this.open);
    this.toggleAttribute('data-closed', !this.open);
  }
}

/** Shared hover binding; policies preserve Tooltip/Preview defaults and permit press surfaces. */
export abstract class TpHoverSurface extends TpAnchoredSurface {
  static override properties = {
    ...TpAnchoredSurface.properties,
    openDelay: { type: Number, attribute: 'open-delay', noAccessor: true },
    closeDelay: { type: Number, attribute: 'close-delay', noAccessor: true },
    delay: { type: Number, noAccessor: true },
    openOnHover: { type: Boolean, attribute: 'open-on-hover' },
    disableHoverablePopup: { type: Boolean, attribute: 'disable-hoverable-popup' },
    closeOnClick: { type: Boolean, attribute: 'close-on-click' },
    trackCursorAxis: { type: String, attribute: 'track-cursor-axis' },
    provider: { attribute: false },
  };
  openOnHover = true;
  disableHoverablePopup = false;
  closeOnClick = false;
  trackCursorAxis: 'none' | 'horizontal' | 'vertical' | 'both' = 'none';
  provider: DelayGroup | undefined;
  #ownOpenDelay: number | undefined;
  #ownCloseDelay: number | undefined;
  #defaultProvider = new DelayGroup();
  protected readonly hover = new HoverSurfaceController({
    document: () => this.ownerDocument,
    open: () => this.open,
    trigger: () => this.trigger,
    popup: () => this.positioner,
    inside: (node) => this.dismissController.contains(node),
    disabled: (element, options) => this.triggerDisabled(element, options),
    enabled: () => this.openOnHover,
    focusOpens: () => this.focusOpens,
    pressToggles: () => this.pressToggles,
    closeOnClick: () => this.closeOnClick,
    hoverable: () => !this.disableHoverablePopup && this.trackCursorAxis !== 'both',
    openDelay: () => this.openDelay,
    closeDelay: () => this.closeDelay,
    group: () => this.group,
    request: (open, reason, event, trigger) => this.requestOpen(open, reason, event, trigger),
    moved: () => {
      if (this.trackCursorAxis !== 'none') void this.updatePosition();
    },
  });
  protected get group(): DelayGroup {
    return this.provider ?? this.#defaultProvider;
  }
  protected get defaultHoverDelay(): number {
    return 400;
  }
  protected get defaultCloseDelay(): number {
    return this.isTooltip ? 0 : 100;
  }
  protected get focusOpens(): boolean {
    return true;
  }
  protected get pressToggles(): boolean {
    return false;
  }
  get openDelay(): number {
    return this.#ownOpenDelay ?? this.group.openDelay ?? this.defaultHoverDelay;
  }
  set openDelay(value: number) {
    const previous = this.#ownOpenDelay;
    this.#ownOpenDelay = value;
    this.requestUpdate('openDelay', previous);
  }
  get closeDelay(): number {
    return this.#ownCloseDelay ?? this.group.closeDelay ?? this.defaultCloseDelay;
  }
  set closeDelay(value: number) {
    const previous = this.#ownCloseDelay;
    this.#ownCloseDelay = value;
    this.requestUpdate('closeDelay', previous);
  }
  get delay(): number {
    return this.openDelay;
  }
  set delay(value: number) {
    this.openDelay = value;
  }
  protected override get instant(): string | undefined {
    return this.hover.instant;
  }
  protected cancelPending = (): void => {
    this.hover.cancel();
  };
  protected override bindInteraction(
    element: HTMLElement,
    options: AnchoredTriggerOptions,
  ): () => void {
    return this.hover.bind(element, options);
  }
  protected override triggerBecameDisabled(element: HTMLElement): void {
    this.hover.cancel();
    super.triggerBecameDisabled(element);
  }
  protected override popupFocus = (): void => {
    if (!this.isTooltip) this.hover.popupFocus();
  };
  protected override popupBlur = (event: FocusEvent): void => {
    if (!this.isTooltip) this.hover.popupBlur(event);
  };
  protected override popupEnter = (): void => {
    this.hover.popupEnter();
  };
  protected override popupLeave = (event: PointerEvent): void => {
    this.hover.popupLeave(event);
  };
  protected override accepted(open: boolean, reason: ChangeReason): void {
    super.accepted(open, reason);
    this.hover.accepted(open, reason);
  }
  protected override anchorGeometry(): AnchorGeometry | null {
    const anchor = super.anchorGeometry();
    const point = this.hover.point;
    if (!anchor || this.trackCursorAxis === 'none' || this.hover.focusOpened || !point)
      return anchor;
    const context = 'getBoundingRectangle' in anchor ? (anchor.contextElement ?? this) : anchor;
    return {
      contextElement: context,
      getBoundingRectangle: () => {
        const box =
          'getBoundingRectangle' in anchor
            ? anchor.getBoundingRectangle()
            : anchor.getBoundingClientRect();
        const horizontal = this.trackCursorAxis === 'horizontal' || this.trackCursorAxis === 'both';
        const vertical = this.trackCursorAxis === 'vertical' || this.trackCursorAxis === 'both';
        return rect(
          horizontal ? point.x : box.x,
          vertical ? point.y : box.y,
          horizontal ? 0 : box.width,
          vertical ? 0 : box.height,
        );
      },
    };
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.hover.sync();
    if (changed.has('disabled') && this.disabled) this.hover.disconnect();
    if (changed.has('trackCursorAxis') && this.open) this.startPosition();
    if (this.positioner)
      this.positioner.style.pointerEvents =
        this.disableHoverablePopup || this.trackCursorAxis === 'both' ? 'none' : '';
  }
  override disconnectedCallback(): void {
    this.hover.disconnect();
    super.disconnectedCallback();
  }
}
