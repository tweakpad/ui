import { css, html, nothing } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { SurfaceState, type TpSurfaceOpenChangeEvent } from '../foundation/surface-state.js';
import type { SurfaceHandle, SurfaceTriggerOptions } from '../foundation/surface-handle.js';
import { PresenceController } from '../foundation/presence.js';
import { FloatingDismissController } from '../foundation/floating-dismiss.js';
import { composedContains, deepActiveElement, restoreFocus } from '../foundation/focus.js';
import { createId } from '../foundation/id.js';
import { prepareMotion, type MotionHandle } from '../foundation/motion.js';
import {
  positionSurface,
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
} from '../foundation/positioning.js';
import type { ChangeReason, PresenceState } from '../foundation/types.js';
import { safeCorridor } from '../foundation/safe-corridor.js';
import { DelayGroup } from '../foundation/delay-group.js';

export interface AnchoredTriggerOptions extends SurfaceTriggerOptions {
  openDelay?: number;
  closeDelay?: number;
  closeOnClick?: boolean;
  disabled?: boolean;
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
function duration(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Shared native anchored layer used by Popover, Preview Card and Tooltip. */
export abstract class TpAnchoredSurface extends TpElement {
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, noAccessor: true },
    defaultOpen: { type: Boolean, attribute: 'default-open' },
    placement: { type: String, noAccessor: true },
    side: { type: String },
    align: { type: String },
    offset: { type: Number, noAccessor: true },
    sideOffset: { type: Number, attribute: 'side-offset' },
    alignOffset: { type: Number, attribute: 'align-offset' },
    collisionPadding: { attribute: false },
    collisionBoundary: { attribute: false },
    collisionAvoidance: { attribute: false },
    sticky: { type: Boolean },
    disableAnchorTracking: { type: Boolean, attribute: 'disable-anchor-tracking' },
    anchor: { attribute: false },
    dismissible: { type: Boolean },
    label: { type: String },
    keepMounted: { type: Boolean, attribute: 'keep-mounted' },
    showArrow: { type: Boolean, attribute: 'show-arrow' },
    arrowPadding: { type: Number, attribute: 'arrow-padding' },
    arrowStaticOffset: { attribute: 'arrow-static-offset' },
    arrowWidth: { type: Number, attribute: 'arrow-width' },
    arrowHeight: { type: Number, attribute: 'arrow-height' },
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
  };
  static override styles: CSSResultGroup = [
    TpElement.styles,
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
        max-inline-size: var(--tp-available-width, calc(100vw - 10px));
        max-block-size: var(--tp-available-height, calc(100dvh - 10px));
      }
      .positioner:not([data-positioned]),
      .positioner[data-anchor-hidden] {
        visibility: hidden;
        pointer-events: none;
      }
      .popup {
        position: relative;
        max-inline-size: inherit;
        max-block-size: inherit;
        overflow-wrap: anywhere;
        transform-origin: var(--tp-transform-origin);
      }
      .body {
        max-block-size: inherit;
        overflow: auto;
      }
      .arrow {
        position: absolute;
        pointer-events: none;
      }
      .arrow svg {
        display: block;
        inline-size: 100%;
        block-size: 100%;
      }
      .arrow[data-side='top'] {
        top: 100%;
      }
      .arrow[data-side='bottom'] {
        bottom: 100%;
      }
      .arrow[data-side='left'] {
        left: 100%;
      }
      .arrow[data-side='right'] {
        right: 100%;
      }
      .arrow[data-side='bottom'] svg {
        rotate: 180deg;
      }
      .arrow[data-side='left'] svg {
        rotate: 270deg;
      }
      .arrow[data-side='right'] svg {
        rotate: 90deg;
      }
      [hidden] {
        display: none !important;
      }
    `,
  ];
  defaultOpen = false;
  side: LogicalSide = 'bottom';
  align: Alignment = 'start';
  sideOffset = 8;
  alignOffset = 0;
  collisionPadding: number | Partial<Record<'top' | 'right' | 'bottom' | 'left', number>> = 5;
  collisionBoundary: CollisionBoundary = 'clipping-ancestors';
  collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'shift' };
  sticky = false;
  disableAnchorTracking = false;
  anchor: AnchorGeometry | undefined;
  dismissible = true;
  label = '';
  keepMounted = false;
  showArrow = false;
  arrowPadding = 5;
  arrowStaticOffset: number | string | undefined;
  arrowWidth = 14;
  arrowHeight = 7;
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
  readonly actions = { close: () => this.close(), unmount: () => this.unmount() };
  protected trigger: HTMLElement | null = null;
  protected readonly contentId = createId('tp-anchored-content');
  protected readonly records = new Map<HTMLElement, TriggerRecord>();
  protected payloadValue: unknown;
  #providedOpen: boolean | undefined;
  #position: PositioningHandle | null = null;
  #positionResult: PositioningResult | null = null;
  #slotTrigger: HTMLElement | null = null;
  #slotCleanup: (() => void) | undefined;
  #handleCleanup: (() => void) | undefined;
  #observer: MutationObserver | undefined;
  #phase: PresenceState = 'absent';
  #motion: MotionHandle | null = null;
  #forceUnmount = false;
  #diagnosed = new Set<string>();
  #wasOpen = false;
  protected readonly state = new SurfaceState({
    read: () => this.#providedOpen,
    defaultOpen: () => this.defaultOpen,
    dispatch: (event) => {
      this.dispatchEvent(event);
      this.onOpenChange?.(event);
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
      }
      this.syncTriggers();
      this.emit('tp-open-change-complete', { open });
      this.onOpenChangeComplete?.(open);
    },
  });
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    anchor: () => this.trigger,
    outside: () => this.dismissible,
    escape: () => true,
    topmostOnly: true,
    dismiss: (event) =>
      this.setOpen(false, event.type === 'keydown' ? 'escape-key' : 'outside-press', event),
  });
  get open(): boolean {
    return this.state.open && !this.disabled;
  }
  set open(value: boolean | undefined) {
    const previous = this.#providedOpen;
    this.#providedOpen = value === undefined ? undefined : Boolean(value);
    this.requestUpdate('open', previous);
    this.requestUpdate();
  }
  get placement(): string {
    return this.align === 'center' ? this.side : `${this.side}-${this.align}`;
  }
  set placement(value: string) {
    const match = value.match(
      /^(top|right|bottom|left|inline-start|inline-end|block-start|block-end)(?:-(start|center|end))?$/,
    );
    if (match) {
      this.side = match[1] as LogicalSide;
      this.align = (match[2] ?? 'center') as Alignment;
    }
  }
  get offset(): number {
    return this.sideOffset;
  }
  set offset(value: number) {
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
  protected get overlayRole(): string {
    return 'dialog';
  }
  protected get isTooltip(): boolean {
    return false;
  }
  protected get positioner(): HTMLElement | null {
    return this.renderRoot.querySelector('.positioner');
  }
  protected get popup(): HTMLElement | null {
    return this.renderRoot.querySelector('.popup');
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
    this.#observer = new MutationObserver(() => {
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
    this.#slotCleanup?.();
    this.#slotCleanup = undefined;
    this.#slotTrigger = null;
    this.#handleCleanup?.();
    this.#handleCleanup = undefined;
    for (const record of this.records.values()) record.cleanup();
    this.records.clear();
    super.disconnectedCallback();
  }
  protected override willUpdate(changed: PropertyValues<this>): void {
    super.willUpdate(changed);
    this.state.sync();
    if (this.disabled && this.state.open) this.state.request(false, 'disabled');
    if (this.open) {
      const desired = this.triggerIdentifier ?? this.defaultTriggerIdentifier;
      const selected = desired
        ? [...this.records].find(([, r]) => r.identifier === desired)?.[0]
        : (this.trigger ?? this.#slotTrigger);
      if (selected && selected !== this.trigger) {
        this.trigger = selected;
        this.payloadValue = this.records.get(selected)?.options.payload;
      }
    }
    this.presence.setPresent(this.open && Boolean(this.trigger || this.anchor));
  }
  protected override render() {
    const state = this.presence.state,
      open = this.open;
    const w = Math.max(1, this.arrowWidth),
      h = Math.max(1, this.arrowHeight),
      r = Math.min(Math.max(0, this.arrowTipRadius), h / 2);
    const path =
      this.arrowPath ||
      `M0 0 L${w / 2 - r} ${h - r} Q${w / 2} ${h} ${w / 2 + r} ${h - r} L${w} 0 Z`;
    return html`<slot name="trigger" @slotchange=${this.syncSlot}></slot>${
        this.presence.mounted
          ? html` <div class="portal" part=${this.partName('portal')}>
              <div
                class="positioner"
                popover="manual"
                ?hidden=${state === 'retained'}
                part=${this.partName('positioner')}
                .inert=${!open}
                aria-hidden=${open ? nothing : 'true'}
                data-state=${state}
                @pointerenter=${this.popupEnter}
                @pointerleave=${this.popupLeave}
                @focusin=${this.popupFocus}
                @focusout=${this.popupBlur}
              >
                <div
                  class="popup"
                  id=${this.contentId}
                  part=${this.partName('content')}
                  role=${this.overlayRole}
                  aria-label=${this.isTooltip ? nothing : this.label || nothing}
                  data-state=${state}
                  ?data-open=${open}
                  ?data-closed=${!open}
                  ?data-starting-style=${state === 'starting'}
                  ?data-ending-style=${state === 'ending'}
                  data-instant=${this.instant ?? nothing}
                >
                  <div class="body">
                    ${this.content ? this.content(this.payload) : html`<slot @slotchange=${this.contentChanged}>${this.label}</slot>`}
                  </div>
                  ${
                    this.showArrow
                      ? html`<div
                          class="arrow"
                          part=${this.partName('arrow')}
                          aria-hidden="true"
                          style=${`width:${w}px;height:${w}px;`}
                        >
                          <svg viewBox=${`0 0 ${w} ${w}`} aria-hidden="true">
                            <path
                              d=${path}
                              stroke=${this.arrowBorderColor || 'none'}
                              stroke-width=${this.arrowBorderWidth}
                            ></path>
                          </svg>
                        </div>`
                      : nothing
                  }
                </div>
              </div>
            </div>`
          : nothing
      }`;
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
    const next = [...this.children].find((e) => e.getAttribute('slot') === 'trigger') as
      HTMLElement | undefined;
    if ((next ?? null) !== this.#slotTrigger) {
      this.#slotCleanup?.();
      this.#slotTrigger = next ?? null;
      this.#slotCleanup = next ? this.registerTrigger(next) : undefined;
      this.requestUpdate();
    }
  };
  protected syncTriggers(): void {
    for (const r of this.records.values()) r.sync();
  }
  protected bindInteraction(element: HTMLElement, options: AnchoredTriggerOptions): () => void {
    const click = (event: MouseEvent) =>
      queueMicrotask(() => {
        if (!event.defaultPrevented && !this.triggerDisabled(element, options))
          this.requestOpen(!this.open, 'trigger-press', event, element);
      });
    element.addEventListener('click', click);
    return () => element.removeEventListener('click', click);
  }
  protected triggerDisabled(element: HTMLElement, options: AnchoredTriggerOptions): boolean {
    return (
      this.disabled ||
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
    const originals = new Map<string, string | null>();
    const applied = new Map<string, string | null>();
    const part = this.partName('trigger'),
      hadPart = element.part.contains(part);
    element.part.add(part);
    const restore = () => {
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
      if (value === null) target!.removeAttribute(name);
      else target!.setAttribute(name, value);
    };
    const sync = () => {
      const next = targetOf(element);
      if (next !== target) {
        restore();
        target = next;
        unregister = this.presentationController.registerPart(part, target);
      }
      const active =
        this.trigger === element && this.open && !this.triggerDisabled(element, options);
      write('data-popup-open', active ? '' : null);
      write('data-disabled', this.triggerDisabled(element, options) ? '' : null);
      if (this.isTooltip) {
        if (active) {
          if (!bridge) {
            bridge = this.ownerDocument.createElement('span');
            bridge.id = createId('tp-tooltip-description');
            bridge.hidden = true;
            const root = target.getRootNode();
            (root instanceof ShadowRoot ? root : this.ownerDocument.body).append(bridge);
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
        write('aria-haspopup', 'dialog');
        if (!this.id) this.id = createId('tp-surface');
        write('aria-controls', this.id);
      }
    };
    const removeListeners = this.bindInteraction(element, options);
    const observer = new MutationObserver(() => {
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
      [...this.childNodes]
        .filter((n) => !(n instanceof Element && n.getAttribute('slot') === 'trigger'))
        .map((n) => n.textContent)
        .join(' ')
        .trim() ||
      this.label
    );
  }
  setOpen(open: boolean, reason: ChangeReason = 'programmatic', event?: Event): void {
    this.requestOpen(open, reason, event);
  }
  protected requestOpen(
    open: boolean,
    reason: ChangeReason,
    event?: Event,
    trigger?: HTMLElement,
  ): void {
    const target =
      trigger ??
      this.trigger ??
      [...this.records].find(
        ([, r]) => r.identifier === (this.triggerIdentifier ?? this.defaultTriggerIdentifier),
      )?.[0] ??
      this.#slotTrigger;
    if (
      open &&
      ((!target && !this.anchor) ||
        this.disabled ||
        (target && this.triggerDisabled(target, this.records.get(target)?.options ?? {})))
    )
      return;
    this.state.request(
      open,
      reason,
      event,
      target ?? undefined,
      () => {
        if (open) {
          this.#forceUnmount = false;
          this.trigger = target;
          this.payloadValue = target ? this.records.get(target)?.options.payload : undefined;
        }
        this.accepted(open, reason);
        this.requestUpdate();
      },
      open && target !== this.trigger,
    );
  }
  protected accepted(_open: boolean, _reason: ChangeReason): void {
    void _open;
    void _reason;
  }
  close(): void {
    this.setOpen(false, 'imperative-action');
  }
  unmount(): void {
    if (this.open) {
      this.state.request(false, 'imperative-action', undefined, undefined, () => {
        this.#forceUnmount = true;
        this.state.retained = false;
      });
    } else {
      this.#forceUnmount = true;
      this.state.retained = false;
      this.presence.releaseRetained();
      this.requestUpdate();
    }
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
    return this.anchor ?? this.trigger;
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
    this.#position = positionSurface(anchor, surface, {
      placement,
      offset: { mainAxis: this.sideOffset, crossAxis: this.alignOffset },
      strategy: 'fixed',
      padding: this.collisionPadding,
      boundary: this.collisionBoundary,
      collision: this.sticky
        ? { ...this.collisionAvoidance, align: 'shift' }
        : this.collisionAvoidance,
      constrainSize: true,
      arrow: this.showArrow ? this.renderRoot.querySelector('.arrow') : null,
      arrowPadding: this.arrowPadding,
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
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (!this.isConnected) return;
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
        ].some((k) => changed.has(k as keyof TpAnchoredSurface)))
    )
      this.startPosition();
    if (
      !this.open &&
      this.#wasOpen &&
      !this.isTooltip &&
      composedContains(this.popup!, deepActiveElement(this.ownerDocument))
    )
      restoreFocus(this.trigger);
    this.#wasOpen = this.open;
    const state = this.presence.state;
    if (state !== this.#phase) {
      this.#phase = state;
      if (state === 'starting' || state === 'ending') {
        this.#motion?.cancel();
        this.#motion = prepareMotion(
          this,
          this.popup,
          { name: 'surface', kind: 'presence', phases: ['enter', 'exit'], completion: 'blocking' },
          {
            phase: state === 'starting' ? 'enter' : 'exit',
            fromState: state === 'starting' ? 'closed' : 'open',
            toState: this.open ? 'open' : 'closed',
            context: { placement: this.positioningResult?.placement ?? this.placement },
          },
        );
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

/** Shared hover ownership; Tooltip supplies its separate description/provider policy. */
export abstract class TpHoverSurface extends TpAnchoredSurface {
  static override properties = {
    ...TpAnchoredSurface.properties,
    openDelay: { type: Number, attribute: 'open-delay', noAccessor: true },
    closeDelay: { type: Number, attribute: 'close-delay', noAccessor: true },
    delay: { type: Number, noAccessor: true },
    disableHoverablePopup: { type: Boolean, attribute: 'disable-hoverable-popup' },
    closeOnClick: { type: Boolean, attribute: 'close-on-click' },
    trackCursorAxis: { type: String, attribute: 'track-cursor-axis' },
    provider: { attribute: false },
  };
  disableHoverablePopup = false;
  closeOnClick = false;
  trackCursorAxis: 'none' | 'horizontal' | 'vertical' | 'both' = 'none';
  provider: DelayGroup | undefined;
  #ownOpenDelay: number | undefined;
  #ownCloseDelay: number | undefined;
  #timer: number | undefined;
  #corridor: (() => void) | undefined;
  #point: { x: number; y: number } | undefined;
  #focusOpened = false;
  #instant: string | undefined;
  #defaultProvider = new DelayGroup();
  #activeGroup: DelayGroup | undefined;
  #groupOpen = false;
  protected get group(): DelayGroup {
    return this.provider ?? this.#defaultProvider;
  }
  protected get defaultHoverDelay(): number {
    return 400;
  }
  get openDelay(): number {
    return this.#ownOpenDelay ?? this.group.openDelay ?? this.defaultHoverDelay;
  }
  set openDelay(v: number) {
    const previous = this.#ownOpenDelay;
    this.#ownOpenDelay = v;
    this.requestUpdate('openDelay', previous);
  }
  get closeDelay(): number {
    return this.#ownCloseDelay ?? this.group.closeDelay ?? (this.isTooltip ? 0 : 100);
  }
  set closeDelay(v: number) {
    const previous = this.#ownCloseDelay;
    this.#ownCloseDelay = v;
    this.requestUpdate('closeDelay', previous);
  }
  get delay(): number {
    return this.openDelay;
  }
  set delay(v: number) {
    this.openDelay = v;
  }
  protected override get instant(): string | undefined {
    return this.#instant;
  }
  protected cancelPending = (): void => {
    if (this.#timer !== undefined) this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#corridor?.();
    this.#corridor = undefined;
  };
  protected override bindInteraction(
    element: HTMLElement,
    options: AnchoredTriggerOptions,
  ): () => void {
    const enter = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || this.triggerDisabled(element, options)) return;
      this.cancelPending();
      this.#point = { x: event.clientX, y: event.clientY };
      this.#focusOpened = false;
      this.#instant = this.group.instant ? 'delay' : undefined;
      this.group.reserve(this, this.cancelPending);
      this.#timer = this.ownerDocument.defaultView?.setTimeout(
        () => this.requestOpen(true, 'trigger-hover', event, element),
        this.group.instant ? 0 : duration(options.openDelay ?? this.openDelay),
      );
    };
    const leave = (event: PointerEvent) => {
      this.cancelPending();
      if (this.#focusOpened) return;
      if (
        this.open &&
        !this.disableHoverablePopup &&
        this.trackCursorAxis !== 'both' &&
        this.positioner
      )
        this.#corridor = safeCorridor(element, this.positioner, event, (e) =>
          this.scheduleClose(e, options),
        );
      else this.scheduleClose(event, options);
    };
    const move = (event: PointerEvent) => {
      this.#point = { x: event.clientX, y: event.clientY };
      if (
        this.open &&
        this.trigger === element &&
        this.trackCursorAxis !== 'none' &&
        !this.#focusOpened
      )
        void this.updatePosition();
    };
    let touch = false;
    const down = (event: PointerEvent) => {
      touch = event.pointerType === 'touch';
    };
    const focus = (event: FocusEvent) => {
      if (touch || this.triggerDisabled(element, options)) return;
      this.cancelPending();
      this.#focusOpened = true;
      this.#instant = 'focus';
      this.requestOpen(true, 'trigger-focus', event, element);
    };
    const blur = (event: FocusEvent) => {
      this.#focusOpened = false;
      this.cancelPending();
      this.scheduleClose(event, options);
    };
    const click = (event: MouseEvent) => {
      touch = false;
      if (options.closeOnClick ?? this.closeOnClick) {
        this.cancelPending();
        queueMicrotask(() => {
          if (!event.defaultPrevented) {
            this.#instant = 'dismiss';
            this.setOpen(false, 'trigger-press', event);
          }
        });
      }
    };
    element.addEventListener('pointerenter', enter);
    element.addEventListener('pointerleave', leave);
    element.addEventListener('pointermove', move);
    element.addEventListener('pointerdown', down);
    element.addEventListener('focusin', focus);
    element.addEventListener('focusout', blur);
    element.addEventListener('click', click);
    return () => {
      this.cancelPending();
      element.removeEventListener('pointerenter', enter);
      element.removeEventListener('pointerleave', leave);
      element.removeEventListener('pointermove', move);
      element.removeEventListener('pointerdown', down);
      element.removeEventListener('focusin', focus);
      element.removeEventListener('focusout', blur);
      element.removeEventListener('click', click);
    };
  }
  private scheduleClose(event: Event, options: AnchoredTriggerOptions = {}): void {
    this.#timer = this.ownerDocument.defaultView?.setTimeout(
      () =>
        this.setOpen(
          false,
          event.type.startsWith('focus') ? 'focus-outside' : 'trigger-hover',
          event,
        ),
      duration(options.closeDelay ?? this.closeDelay),
    );
  }
  protected override triggerBecameDisabled(element: HTMLElement): void {
    this.cancelPending();
    this.group.release(this);
    super.triggerBecameDisabled(element);
  }
  protected override popupFocus = (): void => {
    if (!this.isTooltip) this.cancelPending();
  };
  protected override popupBlur = (event: FocusEvent): void => {
    if (!this.isTooltip && !composedContains(this.popup!, event.relatedTarget as Node | null))
      this.scheduleClose(event);
  };
  protected override popupEnter = (): void => {
    if (!this.disableHoverablePopup) this.cancelPending();
  };
  protected override popupLeave = (event: PointerEvent): void => {
    if (!this.#focusOpened) this.scheduleClose(event);
  };
  protected override accepted(open: boolean, reason: ChangeReason): void {
    super.accepted(open, reason);
    if (open) {
      this.group.activate(this);
      this.startPosition();
    } else {
      this.cancelPending();
      this.group.release(this);
    }
  }
  protected override anchorGeometry(): AnchorGeometry | null {
    const anchor = super.anchorGeometry();
    if (!anchor || this.trackCursorAxis === 'none' || this.#focusOpened || !this.#point)
      return anchor;
    const context = 'getBoundingRectangle' in anchor ? (anchor.contextElement ?? this) : anchor;
    return {
      contextElement: context,
      getBoundingRectangle: () => {
        const box =
          'getBoundingRectangle' in anchor
            ? anchor.getBoundingRectangle()
            : anchor.getBoundingClientRect();
        const horizontal = this.trackCursorAxis === 'horizontal' || this.trackCursorAxis === 'both',
          vertical = this.trackCursorAxis === 'vertical' || this.trackCursorAxis === 'both';
        return rect(
          horizontal ? this.#point!.x : box.x,
          vertical ? this.#point!.y : box.y,
          horizontal ? 0 : box.width,
          vertical ? 0 : box.height,
        );
      },
    };
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (this.#activeGroup !== this.group) {
      this.#activeGroup?.release(this);
      this.#activeGroup = this.group;
      this.#groupOpen = false;
    }
    if (this.open !== this.#groupOpen) {
      this.#groupOpen = this.open;
      if (this.open) this.group.activate(this);
      else this.group.release(this);
    }
    if (changed.has('disabled') && this.disabled) {
      this.cancelPending();
      this.group.release(this);
    }
    if (changed.has('trackCursorAxis') && this.open) this.startPosition();
    if (this.positioner)
      this.positioner.style.pointerEvents =
        this.disableHoverablePopup || this.trackCursorAxis === 'both' ? 'none' : '';
  }
  override disconnectedCallback(): void {
    this.cancelPending();
    this.group.release(this);
    super.disconnectedCallback();
  }
}
