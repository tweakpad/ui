import { css, html } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent } from '../foundation/events.js';
import { focusableElements, restoreFocus, trapTabKey } from '../foundation/focus.js';
import { createId } from '../foundation/id.js';
import {
  prepareMotion,
  type MotionHandle,
  type MotionRoleDefinition,
} from '../foundation/motion.js';
import type { ChangeReason } from '../foundation/types.js';
import {
  positionSurface,
  type Placement,
  type PositioningHandle,
} from '../foundation/positioning.js';
import { PresenceController } from '../foundation/presence.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

export const overlayMotionRoles = {
  backdrop: {
    name: 'backdrop',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
  surface: {
    name: 'surface',
    kind: 'presence',
    phases: ['enter', 'exit'],
    completion: 'blocking',
  },
} as const satisfies Record<string, MotionRoleDefinition>;

abstract class TpDialogBase extends TpElement {
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    modality: { type: String, reflect: true },
    closeOnOutsideInteraction: { type: Boolean, attribute: 'close-on-outside-interaction' },
    closeOnEscape: { type: Boolean, attribute: 'close-on-escape' },
    showCloseControl: { type: Boolean, attribute: 'show-close-control' },
    label: { type: String },
    description: { type: String },
  };
  static override styles: CSSResultGroup = [
    TpElement.styles,
    controlStyles,
    css`
      :host {
        display: contents;
      }

      .backdrop {
        position: fixed;
        z-index: 1100;
        inset: 0;
        display: grid;
        place-items: center;
        padding: var(--tp-space-4);
        background: transparent;
        opacity: 1;
        transition: opacity calc(var(--tp-duration-normal) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .backdrop::before {
        content: '';
        position: absolute;
        inset: 0;
        background: var(--tp-foreground);
        opacity: var(--tp-opacity-backdrop);
        pointer-events: none;
      }

      .dialog {
        position: relative;
        width: min(32rem, 100%);
        max-height: calc(100vh - var(--tp-space-8));
        overflow: auto;
      }

      .backdrop[hidden] {
        display: none;
      }

      .backdrop[data-state='starting'] {
        opacity: 0;
      }

      .backdrop[data-state='ending'] {
        opacity: 0;
      }

      .backdrop[data-tp-motion-driven] {
        transition: none !important;
      }
    `,
  ];
  open = false;
  modality: 'modal' | 'non-modal' | 'trap-focus-only' = 'modal';
  closeOnOutsideInteraction = true;
  closeOnEscape = true;
  showCloseControl = true;
  label = '';
  description = '';
  protected readonly presence = new PresenceController(this, {
    surface: () => this.renderRoot.querySelector('.backdrop'),
    onStateChange: (state) => this.motionStateChanged(state),
  });
  protected pendingEnterMotion: MotionHandle[] = [];
  protected pendingExitMotion: MotionHandle[] = [];
  protected trigger: HTMLElement | null = null;
  readonly #titleId = createId('tp-dialog-title');
  readonly #descriptionId = createId('tp-dialog-description');
  readonly #inerted = new Map<HTMLElement, boolean>();
  protected get dialogRole(): 'dialog' | 'alertdialog' {
    return 'dialog';
  }
  protected get partPrefix(): string {
    return 'dialog';
  }
  protected get closePart(): string {
    return `${this.partPrefix}-close`;
  }
  protected motionTargets(): Array<{ target: HTMLElement | null; role: MotionRoleDefinition }> {
    return [
      {
        target: this.renderRoot.querySelector<HTMLElement>('.backdrop'),
        role: overlayMotionRoles.backdrop,
      },
    ];
  }
  protected motionStateChanged(
    state: 'absent' | 'starting' | 'open' | 'ending' | 'retained',
  ): void {
    const phase = state === 'starting' ? 'enter' : state === 'ending' ? 'exit' : null;
    if (phase) {
      const handles = this.motionTargets().map(({ target, role }) =>
        prepareMotion(this, target, role, {
          phase,
          fromState: phase === 'enter' ? 'closed' : 'open',
          toState: phase === 'enter' ? 'open' : 'closed',
        }),
      );
      if (phase === 'enter') this.pendingEnterMotion = handles;
      else this.pendingExitMotion = handles;
    }
    const handles =
      state === 'open' ? this.pendingEnterMotion : state === 'ending' ? this.pendingExitMotion : [];
    void this.updateComplete.then(() => {
      for (const handle of handles) {
        handle.start();
        this.presence.trackCompletion(handle.finished);
      }
    });
    if (state === 'open') this.pendingEnterMotion = [];
    if (state === 'ending') this.pendingExitMotion = [];
  }

  protected override render() {
    return html`<div part=${this.partPrefix}>
      <slot name="trigger" @slotchange=${this.#trigger}></slot>
      <div
        class="backdrop"
        part=${`${this.partPrefix}-overlay`}
        ?hidden=${!this.presence.mounted}
        data-state=${this.presence.state}
        @pointerdown=${this.#backdrop}
      >
        <section
          class="surface dialog"
          part=${`${this.partPrefix}-content`}
          role=${this.dialogRole}
          aria-modal=${this.modality === 'modal' ? 'true' : 'false'}
          aria-labelledby=${this.#titleId}
          aria-describedby=${this.description ? this.#descriptionId : undefined}
          tabindex="-1"
          @keydown=${this.#key}
        >
          <header part=${`${this.partPrefix}-header`}>
            <span
              id=${this.#titleId}
              part=${`${this.partPrefix}-title`}
              class=${this.label ? 'visually-hidden' : ''}
              ><slot name="title">${this.label}</slot></span
            >
            ${
              this.description
                ? html`<span id=${this.#descriptionId} part=${`${this.partPrefix}-description`}
                    ><slot name="description">${this.description}</slot></span
                  >`
                : null
            }
          </header>
          <slot></slot>
          <footer part=${`${this.partPrefix}-footer`}><slot name="footer"></slot></footer>
          ${
            this.showCloseControl
              ? html`<button
                  part=${`${this.closePart} focusable`}
                  type="button"
                  aria-label="Close"
                  @click=${(event: Event) => this.setOpen(false, 'close-action', event)}
                >
                  ×
                </button>`
              : null
          }
        </section>
      </div>
    </div>`;
  }
  #trigger = (event: Event): void => {
    this.trigger = assignedElements(event.currentTarget as HTMLSlotElement)[0] ?? null;
    if (this.trigger) {
      this.trigger.setAttribute('part', `${this.partPrefix}-trigger`);
      this.trigger.setAttribute('aria-haspopup', 'dialog');
      this.trigger.setAttribute('aria-expanded', String(this.open));
      this.trigger.onclick = (e) => this.setOpen(!this.open, eventReason(e), e);
    }
  };
  #backdrop = (event: PointerEvent): void => {
    if (event.target === event.currentTarget && this.closeOnOutsideInteraction)
      this.setOpen(false, 'outside-press', event);
  };
  #key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.closeOnEscape) {
      event.preventDefault();
      this.setOpen(false, 'escape-key', event);
    } else if (this.modality !== 'non-modal') trapTabKey(event, this.renderRoot);
  };
  setOpen(open: boolean, reason: ChangeReason, sourceEvent?: Event): void {
    if (this.open === open) return;
    if (!this.dispatchEvent(new TpOpenChangeEvent(open, this.open, reason, sourceEvent))) return;
    this.open = open;
    this.presence.setPresent(open);
    this.trigger?.setAttribute('aria-expanded', String(open));
    if (open) {
      if (this.modality === 'modal') this.#setOutsideInert(true);
      void this.updateComplete.then(() => {
        const target =
          focusableElements(this.renderRoot)[0] ??
          this.renderRoot.querySelector<HTMLElement>('.dialog');
        target?.focus();
      });
    } else {
      this.#setOutsideInert(false);
      restoreFocus(this.trigger);
    }
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('open')) {
      this.presence.setPresent(this.open);
      this.trigger?.setAttribute('aria-expanded', String(this.open));
      if (this.open) {
        if (this.modality === 'modal') this.#setOutsideInert(true);
        void this.updateComplete.then(() => {
          const target =
            focusableElements(this.renderRoot)[0] ??
            this.renderRoot.querySelector<HTMLElement>('.dialog');
          target?.focus();
        });
      } else {
        this.#setOutsideInert(false);
      }
    }
    if (changed.has('modality') && this.open) {
      this.#setOutsideInert(this.modality === 'modal');
    }
  }
  override disconnectedCallback(): void {
    this.#setOutsideInert(false);
    super.disconnectedCallback();
  }
  #setOutsideInert(inert: boolean): void {
    if (!inert) {
      for (const [element, previous] of this.#inerted) element.inert = previous;
      this.#inerted.clear();
      return;
    }
    this.#inertOutsideBranch(this);
  }
  #inertOutsideBranch(branch: Node): void {
    const parent = branch.parentNode;
    if (!parent) return;
    const siblings =
      parent instanceof Document || parent instanceof DocumentFragment || parent instanceof Element
        ? parent.children
        : [];
    for (const sibling of siblings) {
      if (sibling === branch || !(sibling instanceof HTMLElement)) continue;
      if (!this.#inerted.has(sibling)) this.#inerted.set(sibling, sibling.inert);
      sibling.inert = true;
    }
    if (parent instanceof ShadowRoot) this.#inertOutsideBranch(parent.host);
    else if (parent instanceof HTMLElement) this.#inertOutsideBranch(parent);
  }
}

export class TpDialog extends TpDialogBase {
  static tagName = 'tp-dialog';
}
export class TpAlertDialog extends TpDialogBase {
  static tagName = 'tp-alert-dialog';
  constructor() {
    super();
    this.closeOnOutsideInteraction = false;
  }
  protected override get dialogRole() {
    return 'alertdialog' as const;
  }
  protected override get partPrefix(): string {
    return 'alert-dialog';
  }
  protected override get closePart(): string {
    return 'alert-dialog-cancel';
  }
}

export class TpDrawer extends TpDialogBase {
  static tagName = 'tp-drawer';
  static override properties = {
    ...TpDialogBase.properties,
    side: { type: String, reflect: true },
  };
  static override styles = [
    TpDialogBase.styles,
    css`
      .backdrop {
        place-items: stretch end;
        padding: 0;
      }

      .dialog {
        width: min(26rem, 90vw);
        height: 100%;
        max-height: none;
        border-radius: 0;
        transform: translateX(0);
        transition: transform calc(var(--tp-duration-normal) * var(--tp-motion-scale))
          var(--tp-easing-standard);
      }

      .backdrop[data-state='starting'] .dialog,
      .backdrop[data-state='ending'] .dialog {
        transform: translateX(100%);
      }

      :host([side='left']) .backdrop {
        place-items: stretch start;
      }

      :host([side='left']) .backdrop[data-state='starting'] .dialog,
      :host([side='left']) .backdrop[data-state='ending'] .dialog {
        transform: translateX(-100%);
      }

      .dialog[data-tp-motion-driven] {
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
        target: this.renderRoot.querySelector<HTMLElement>('.dialog'),
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
        @keydown=${this.#key}
      >
        <slot></slot>
      </div>
    </div>`;
  }
  #trigger = (event: Event): void => {
    this.trigger = assignedElements(event.currentTarget as HTMLSlotElement)[0] ?? null;
    this.bindTrigger();
  };
  protected bindTrigger(): void {
    if (!this.trigger) return;
    this.trigger.setAttribute('part', `${this.partPrefix}-trigger`);
    this.trigger.setAttribute('aria-expanded', String(this.open));
    this.trigger.setAttribute('aria-controls', this.contentId);
    this.trigger.onclick = (e) => this.setOpen(!this.open, eventReason(e), e);
  }
  #key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.dismissible) {
      event.preventDefault();
      this.setOpen(false, 'dismiss', event);
    }
  };
  #documentKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.setOpen(false, 'dismiss', event);
    }
  };
  #outside = (event: PointerEvent): void => {
    const path = event.composedPath();
    if (
      this.open &&
      this.dismissible &&
      !path.includes(this) &&
      (!this.trigger || !path.includes(this.trigger))
    )
      this.setOpen(false, 'dismiss', event);
  };
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
    if (open) {
      document.addEventListener('pointerdown', this.#outside, true);
      document.addEventListener('keydown', this.#documentKey, true);
      void this.updateComplete.then(() => this.#startPosition());
    } else {
      document.removeEventListener('pointerdown', this.#outside, true);
      document.removeEventListener('keydown', this.#documentKey, true);
      this.#position?.destroy();
      this.#position = null;
      const active =
        this.renderRoot instanceof ShadowRoot
          ? this.renderRoot.activeElement
          : document.activeElement;
      if (active && this.surface?.contains(active)) restoreFocus(this.trigger);
    }
  }
  #startPosition(): void {
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
    if (changed.has('open')) {
      this.presence.setPresent(this.open);
      if (this.open) void this.updateComplete.then(() => this.#startPosition());
    }
  }
  override disconnectedCallback(): void {
    document.removeEventListener('pointerdown', this.#outside, true);
    document.removeEventListener('keydown', this.#documentKey, true);
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
    this.trigger.onpointerenter = (e) => this.#schedule(true, e);
    this.trigger.onpointerleave = (e) => this.#schedule(false, e);
    this.trigger.onfocus = (e) => this.#schedule(true, e);
    this.trigger.onblur = (e) => this.#schedule(false, e);
  }
  #schedule(open: boolean, event: Event): void {
    if (this.#timer !== undefined) clearTimeout(this.#timer);
    this.#timer = window.setTimeout(
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
      this.trigger.removeAttribute('aria-controls');
      this.trigger.removeAttribute('aria-expanded');
      this.trigger.setAttribute('aria-describedby', this.contentId);
    }
  }
}
