import { css, html } from 'lit';
import type { CSSResultGroup, PropertyValues } from 'lit';
import { TpElement } from '../foundation/element.js';
import { TpOpenChangeEvent } from '../foundation/events.js';
import { focusableElements, restoreFocus, trapTabKey } from '../foundation/focus.js';
import {
  positionSurface,
  type Placement,
  type PositioningHandle,
} from '../foundation/positioning.js';
import { PresenceController } from '../foundation/presence.js';
import { assignedElements, controlStyles, eventReason } from './shared.js';

abstract class TpDialogBase extends TpElement {
  static override properties = {
    ...TpElement.properties,
    open: { type: Boolean, reflect: true },
    modal: { type: Boolean, reflect: true },
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

      .backdrop {
        position: fixed;
        z-index: 1100;
        inset: 0;
        display: grid;
        place-items: center;
        padding: 1rem;
        background: rgb(0 0 0 / 48%);
        opacity: 1;
        transition: opacity var(--tp-duration-normal);
      }

      .dialog {
        width: min(32rem, 100%);
        max-height: calc(100vh - 2rem);
        overflow: auto;
      }

      .backdrop[hidden] {
        display: none;
      }

      .backdrop[data-state='entering'] {
        opacity: 0;
      }

      .backdrop[data-state='exiting'] {
        opacity: 0;
      }
    `,
  ];
  open = false;
  modal = true;
  dismissible = true;
  label = '';
  protected readonly presence = new PresenceController(this);
  protected trigger: HTMLElement | null = null;
  protected get dialogRole(): 'dialog' | 'alertdialog' {
    return 'dialog';
  }

  protected override render() {
    return html`<slot name="trigger" @slotchange=${this.#trigger}></slot>
      <div
        class="backdrop"
        part="backdrop"
        ?hidden=${!this.presence.mounted}
        data-state=${this.presence.state}
        @pointerdown=${this.#backdrop}
      >
        <section
          class="surface dialog"
          part="surface"
          role=${this.dialogRole}
          aria-modal=${String(this.modal)}
          aria-label=${this.label || undefined}
          tabindex="-1"
          @keydown=${this.#key}
        >
          <slot></slot>
        </section>
      </div>`;
  }
  #trigger = (event: Event): void => {
    this.trigger = assignedElements(event.currentTarget as HTMLSlotElement)[0] ?? null;
    if (this.trigger) {
      this.trigger.setAttribute('aria-haspopup', 'dialog');
      this.trigger.setAttribute('aria-expanded', String(this.open));
      this.trigger.onclick = (e) => this.setOpen(!this.open, eventReason(e), e);
    }
  };
  #backdrop = (event: PointerEvent): void => {
    if (event.target === event.currentTarget && this.dismissible)
      this.setOpen(false, 'dismiss', event);
  };
  #key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.dismissible) {
      event.preventDefault();
      this.setOpen(false, 'dismiss', event);
    } else if (this.modal) trapTabKey(event, this.renderRoot);
  };
  setOpen(
    open: boolean,
    reason: 'keyboard' | 'pointer' | 'input' | 'dismiss' | 'programmatic',
    sourceEvent?: Event,
  ): void {
    if (this.open === open) return;
    if (!this.dispatchEvent(new TpOpenChangeEvent(open, this.open, reason, sourceEvent))) return;
    this.open = open;
    this.presence.setPresent(open, 180);
    this.trigger?.setAttribute('aria-expanded', String(open));
    if (open) {
      void this.updateComplete.then(() => {
        const target =
          focusableElements(this.renderRoot)[0] ??
          this.renderRoot.querySelector<HTMLElement>('.dialog');
        target?.focus();
      });
    } else restoreFocus(this.trigger);
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('open')) this.presence.setPresent(this.open, 180);
  }
}

export class TpDialog extends TpDialogBase {
  static tagName = 'tp-dialog';
}
export class TpAlertDialog extends TpDialogBase {
  static tagName = 'tp-alert-dialog';
  protected override get dialogRole() {
    return 'alertdialog' as const;
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
        transition: transform var(--tp-duration-normal);
      }

      .backdrop[data-state='entering'] .dialog,
      .backdrop[data-state='exiting'] .dialog {
        transform: translateX(100%);
      }

      :host([side='left']) .backdrop {
        place-items: stretch start;
      }

      :host([side='left']) .backdrop[data-state='entering'] .dialog,
      :host([side='left']) .backdrop[data-state='exiting'] .dialog {
        transform: translateX(-100%);
      }
    `,
  ];
  side: 'left' | 'right' = 'right';
}

export class TpSidePanel extends TpDrawer {
  static tagName = 'tp-side-panel';
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
          opacity var(--tp-duration-fast),
          transform var(--tp-duration-fast);
        transform-origin: var(--tp-transform-origin, center);
      }

      .surface[hidden] {
        display: none;
      }

      .surface[data-state='entering'],
      .surface[data-state='exiting'] {
        opacity: 0;
        transform: scale(0.98);
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
  protected readonly presence = new PresenceController(this);
  #position: PositioningHandle | null = null;
  protected get overlayRole(): string {
    return 'dialog';
  }
  protected override render() {
    return html`<slot name="trigger" @slotchange=${this.#trigger}></slot>
      <div
        class="surface"
        part="surface"
        role=${this.overlayRole}
        aria-label=${this.label || undefined}
        ?hidden=${!this.presence.mounted}
        data-state=${this.presence.state}
        @keydown=${this.#key}
      >
        <slot></slot>
      </div>`;
  }
  #trigger = (event: Event): void => {
    this.trigger = assignedElements(event.currentTarget as HTMLSlotElement)[0] ?? null;
    this.bindTrigger();
  };
  protected bindTrigger(): void {
    if (!this.trigger) return;
    this.trigger.setAttribute('aria-expanded', String(this.open));
    this.trigger.onclick = (e) => this.setOpen(!this.open, eventReason(e), e);
  }
  #key = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.dismissible) {
      event.preventDefault();
      this.setOpen(false, 'dismiss', event);
    }
  };
  #documentKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.open && this.dismissible) {
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
    this.presence.setPresent(open, 120);
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
      this.presence.setPresent(this.open, 120);
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
}

export class TpTooltip extends TpPreviewCard {
  static tagName = 'tp-tooltip';
  protected override get overlayRole() {
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
      const id = this.id || (this.id = `tp-tooltip-${Math.random().toString(36).slice(2)}`);
      this.trigger.setAttribute('aria-describedby', id);
    }
  }
}
