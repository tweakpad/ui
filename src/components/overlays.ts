import { css, html } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent } from '../foundation/events.js';
import { restoreFocus } from '../foundation/focus.js';
import { createId } from '../foundation/id.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import {
  positionSurface,
  type Placement,
  type PositioningHandle,
} from '../foundation/positioning.js';
import { PresenceController } from '../foundation/presence.js';
import { FloatingDismissController } from '../foundation/floating-dismiss.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

import { TpDialog, dialogMotionRoles as overlayMotionRoles } from './dialog/dialog.js';
export { TpDialog, overlayMotionRoles };
export { TpAlertDialog } from './alert-dialog/index.js';

export class TpDrawer extends TpDialog {
  static tagName = 'tp-drawer';
  static override properties = {
    ...TpDialog.properties,
    side: { type: String, reflect: true },
  };
  static override styles = [
    TpDialog.styles,
    css`
      .content {
        inset: 0 0 0 auto;
        margin: 0;
        inline-size: min(26rem, 90vw);
        block-size: 100%;
        max-block-size: none;
        grid-template-rows: auto 1fr auto;
        border-radius: 0;
        transform: translateX(0);
        transition: transform calc(var(--tp-duration-normal) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .portal[data-state='starting'] .content,
      .portal[data-state='ending'] .content {
        transform: translateX(100%);
      }

      :host([side='left']) .content {
        inset: 0 auto 0 0;
      }

      :host([side='left']) .portal[data-state='starting'] .content,
      :host([side='left']) .portal[data-state='ending'] .content {
        transform: translateX(-100%);
      }

      .content[data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  side: 'left' | 'right' = 'right';
  protected override motionTargets(): Array<{
    target: HTMLElement | null;
    role: MotionRoleDefinition;
  }> {
    return [
      ...super.motionTargets(),
      {
        target: this.renderRoot.querySelector<HTMLElement>('.content'),
        role: overlayMotionRoles.surface,
      },
    ];
  }
  protected override get partPrefix(): string {
    return 'drawer';
  }
}

export class TpSidePanel extends TpDrawer {
  static tagName = 'tp-side-panel';
  protected override get partPrefix(): string {
    return 'side-panel';
  }
}

abstract class TpAnchoredOverlay extends TpElement {
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    placement: { type: String },
    offset: { type: Number },
    dismissible: { type: Boolean, reflect: true },
    label: { type: String },
  };
  static override styles: CSSResultGroup = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: contents;
      }

      .surface {
        position: fixed;
        z-index: 1000;
        max-height: var(--tp-available-height, 24rem);
        overflow: auto;
        transition:
          opacity calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard),
          transform calc(var(--tp-duration-fast) * var(--tp-motion-scale)) var(--tp-easing-standard);
        transform-origin: var(--tp-transform-origin, center);
      }

      .surface[hidden] {
        display: none;
      }

      .surface[data-state='starting'],
      .surface[data-state='ending'] {
        opacity: 0;
        transform: scale(0.98);
      }

      .surface[data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  open = false;
  placement: Placement = 'bottom-start';
  offset = 8;
  dismissible = true;
  label = '';
  protected trigger: HTMLElement | null = null;
  protected surface: HTMLElement | null = null;
  protected readonly presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('.surface'),
    onStateChange: (state) => this.#motionStateChanged(state),
  });
  #pendingEnterMotion: MotionHandle | null = null;
  #pendingExitMotion: MotionHandle | null = null;
  protected readonly contentId = createId('tp-overlay-content');
  #position: PositioningHandle | null = null;
  protected triggerCleanup: (() => void) | undefined;
  override connectedCallback(): void {
    super.connectedCallback();
    if (this.hasUpdated) {
      this.bindTrigger();
      this.requestUpdate();
      void this.updateComplete.then(() => this.#startPosition());
    }
  }
  readonly dismissController = new FloatingDismissController(this, {
    open: () => this.open,
    anchor: () => this.trigger,
    outside: () => this.dismissible,
    escape: () => this.dismissible || this.overlayRole === 'tooltip',
    dismiss: (event) => this.setOpen(false, 'dismiss', event),
  });
  protected get overlayRole(): string {
    return 'dialog';
  }
  protected get partPrefix(): string {
    return 'popover';
  }
  #motionStateChanged(state: 'absent' | 'starting' | 'open' | 'ending' | 'retained'): void {
    const surface = this.renderRoot.querySelector<HTMLElement>('.surface');
    if (state === 'starting' || state === 'ending') {
      const phase = state === 'starting' ? 'enter' : 'exit';
      const handle = prepareMotion(this, surface, overlayMotionRoles.surface, {
        phase,
        fromState: phase === 'enter' ? 'closed' : 'open',
        toState: phase === 'enter' ? 'open' : 'closed',
        context: { placement: this.placement },
      });
      if (phase === 'enter') this.#pendingEnterMotion = handle;
      else this.#pendingExitMotion = handle;
    }
    const handle =
      state === 'open'
        ? this.#pendingEnterMotion
        : state === 'ending'
          ? this.#pendingExitMotion
          : null;
    if (handle) {
      void this.updateComplete.then(() => {
        handle.start();
        this.presence.trackCompletion(handle.finished);
      });
    }
    if (state === 'open') this.#pendingEnterMotion = null;
    if (state === 'ending') this.#pendingExitMotion = null;
  }
  protected override render() {
    return html`<div part=${this.partPrefix}>
      <slot name="trigger" @slotchange=${this.#trigger}></slot>
      <div
        id=${this.contentId}
        class="surface"
        part=${`${this.partPrefix}-content ${this.partPrefix}-positioner`}
        role=${this.overlayRole}
        aria-label=${this.label || undefined}
        ?hidden=${!this.presence.mounted}
        data-state=${this.presence.state}
      >
        <slot></slot>
      </div>
    </div>`;
  }
  #trigger = (event: Event): void => {
    this.triggerCleanup?.();
    this.trigger = assignedElements(event.currentTarget as HTMLSlotElement)[0] ?? null;
    this.bindTrigger();
    this.#position?.destroy();
    this.#position = null;
    if (this.open) this.#startPosition();
  };
  protected bindTrigger(): void {
    if (!this.trigger) return;
    this.trigger.setAttribute('part', `${this.partPrefix}-trigger`);
    this.trigger.setAttribute('aria-expanded', String(this.open));
    this.trigger.setAttribute('aria-controls', this.contentId);
    const trigger = this.trigger;
    const click = (e: MouseEvent): void => {
      if (!e.defaultPrevented) this.setOpen(!this.open, eventReason(e), e);
    };
    trigger.addEventListener('click', click);
    this.triggerCleanup = () => trigger.removeEventListener('click', click);
  }
  setOpen(
    open: boolean,
    reason: 'keyboard' | 'pointer' | 'input' | 'dismiss' | 'programmatic',
    sourceEvent?: Event,
  ): void {
    if (this.open === open) return;
    if (!this.dispatchEvent(new TpOpenChangeEvent(open, this.open, reason, sourceEvent))) return;
    this.open = open;
    this.presence.setPresent(open);
    this.trigger?.setAttribute('aria-expanded', String(open));
    if (!open) {
      this.#position?.destroy();
      this.#position = null;
      const active =
        this.renderRoot instanceof ShadowRoot
          ? this.renderRoot.activeElement
          : this.ownerDocument.activeElement;
      if (this.overlayRole !== 'tooltip' && active && this.surface?.contains(active))
        restoreFocus(this.trigger);
    }
  }
  #startPosition(): void {
    if (!this.open || !this.isConnected) return;
    this.surface = this.renderRoot.querySelector('.surface');
    if (this.trigger && this.surface) {
      this.#position?.destroy();
      this.#position = positionSurface(this.trigger, this.surface, {
        placement: this.placement,
        offset: this.offset,
        strategy: 'fixed',
      });
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('open') || changed.has('placement') || changed.has('offset')) {
      this.presence.setPresent(this.open);
      if (this.overlayRole !== 'tooltip')
        this.trigger?.setAttribute('aria-expanded', String(this.open));
      if (this.open) void this.updateComplete.then(() => this.#startPosition());
      else {
        this.#position?.destroy();
        this.#position = null;
      }
    }
  }
  override disconnectedCallback(): void {
    this.triggerCleanup?.();
    this.triggerCleanup = undefined;
    this.#position?.destroy();
    super.disconnectedCallback();
  }
}

export class TpPopover extends TpAnchoredOverlay {
  static tagName = 'tp-popover';
}

export class TpPreviewCard extends TpAnchoredOverlay {
  static tagName = 'tp-preview-card';
  static override properties = { ...TpAnchoredOverlay.properties, delay: { type: Number } };
  delay = 400;
  #timer: number | undefined;
  protected override get overlayRole(): string {
    return 'group';
  }
  protected override get partPrefix(): string {
    return 'preview-card';
  }
  protected override bindTrigger(): void {
    if (!this.trigger) return;
    this.trigger.setAttribute('aria-expanded', String(this.open));
    const trigger = this.trigger;
    const enter = (e: Event): void => this.#schedule(true, e);
    const leave = (e: Event): void => this.#schedule(false, e);
    trigger.addEventListener('pointerenter', enter);
    trigger.addEventListener('pointerleave', leave);
    trigger.addEventListener('focus', enter);
    trigger.addEventListener('blur', leave);
    this.triggerCleanup = () => {
      if (this.#timer !== undefined) this.ownerDocument.defaultView?.clearTimeout(this.#timer);
      trigger.removeEventListener('pointerenter', enter);
      trigger.removeEventListener('pointerleave', leave);
      trigger.removeEventListener('focus', enter);
      trigger.removeEventListener('blur', leave);
    };
  }
  override disconnectedCallback(): void {
    if (this.#timer !== undefined) this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    super.disconnectedCallback();
  }
  #schedule(open: boolean, event: Event): void {
    if (this.#timer !== undefined) this.ownerDocument.defaultView?.clearTimeout(this.#timer);
    this.#timer = this.ownerDocument.defaultView?.setTimeout(
      () => this.setOpen(open, open ? 'pointer' : 'dismiss', event),
      open ? this.delay : 100,
    );
  }
  protected override firstUpdated(changed: PropertyValues<this>): void {
    super.firstUpdated(changed);
    const surface = this.renderRoot.querySelector<HTMLElement>('.surface');
    if (!surface) return;
    surface.addEventListener('pointerenter', () => {
      if (this.#timer !== undefined) clearTimeout(this.#timer);
    });
    surface.addEventListener('pointerleave', (event) => this.#schedule(false, event));
    surface.addEventListener('focusin', () => {
      if (this.#timer !== undefined) clearTimeout(this.#timer);
    });
    surface.addEventListener('focusout', (event) => {
      if (!(event.relatedTarget instanceof Node) || !surface.contains(event.relatedTarget))
        this.#schedule(false, event);
    });
  }
}

export class TpTooltip extends TpPreviewCard {
  static tagName = 'tp-tooltip';
  static override styles = [
    TpPreviewCard.styles,
    css`
      .surface {
        pointer-events: none;
      }
    `,
  ];
  protected override get overlayRole() {
    return 'tooltip';
  }
  protected override get partPrefix(): string {
    return 'tooltip';
  }
  constructor() {
    super();
    this.delay = 500;
    this.dismissible = false;
  }
  protected override bindTrigger(): void {
    super.bindTrigger();
    if (this.trigger) {
      const trigger = this.trigger;
      const cleanup = this.triggerCleanup;
      this.triggerCleanup = () => {
        cleanup?.();
        const ids = (trigger.getAttribute('aria-describedby') ?? '')
          .split(/\s+/)
          .filter((id) => id && id !== this.contentId);
        if (ids.length) trigger.setAttribute('aria-describedby', ids.join(' '));
        else trigger.removeAttribute('aria-describedby');
      };
      this.trigger.removeAttribute('aria-controls');
      this.trigger.removeAttribute('aria-expanded');
      this.#syncDescription();
    }
  }
  #syncDescription(): void {
    if (!this.trigger) return;
    const ids = new Set(
      (this.trigger.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
    );
    if (this.presence.mounted) ids.add(this.contentId);
    else ids.delete(this.contentId);
    if (ids.size) this.trigger.setAttribute('aria-describedby', [...ids].join(' '));
    else this.trigger.removeAttribute('aria-describedby');
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    this.#syncDescription();
  }
}
