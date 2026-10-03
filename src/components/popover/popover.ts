import { html, nothing, type PropertyValues } from 'lit';
import { TpHoverSurface } from '../anchored-surface.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { createId } from '../../foundation/id.js';
import { composedContains, deepActiveElement } from '../../foundation/focus.js';
import type {
  Alignment,
  CollisionPolicy,
  GeometryOffset,
  LogicalSide,
  PositioningStrategy,
} from '../../foundation/positioning.js';

/** Interactive Popover policy on the same surface/hover owners as Tooltip and Menu. */
export class TpPopover extends TpHoverSurface {
  static tagName = 'tp-popover';
  static override properties = {
    ...TpHoverSurface.properties,
    preserveOnTriggerHover: { type: Boolean, attribute: 'preserve-on-trigger-hover' },
  };
  override portal = true;
  override modal = false;
  override openOnHover = false;
  override side: LogicalSide = 'block-end';
  override align: Alignment = 'center';
  override sideOffset: GeometryOffset = 0;
  override positionMethod: PositioningStrategy = 'absolute';
  override collisionAvoidance: CollisionPolicy = { side: 'flip', align: 'flip' };
  preserveOnTriggerHover = false;
  #titleId = createId('tp-popover-title');
  #descriptionId = createId('tp-popover-description');
  #anchorRelease: (() => void) | undefined;
  #registeredAnchor: HTMLElement | undefined;
  protected override get focusOpens(): boolean {
    return false;
  }
  protected override get pressToggles(): boolean {
    return true;
  }
  protected override get defaultHoverDelay(): number {
    return 300;
  }
  protected override get defaultCloseDelay(): number {
    return 0;
  }
  #hasSlot(name: string): boolean {
    return this.contentElements.some((element) => element.getAttribute('slot') === name);
  }
  #close = (event: Event): void => {
    if (!event.composedPath().some((node) => (node as Element).getAttribute?.('slot') === 'close'))
      return;
    queueMicrotask(() => {
      if (!componentHandlingPrevented(event) && !event.defaultPrevented && this.isConnected)
        this.setOpen(false, 'close-action', event);
    });
  };
  protected override popupProperties(): Record<string, unknown> {
    return {
      ...super.popupProperties(),
      '@click': this.#close,
      'aria-labelledby': this.#hasSlot('title') ? this.#titleId : undefined,
      'aria-describedby': this.#hasSlot('description') ? this.#descriptionId : undefined,
      'aria-modal': this.modal ? 'true' : undefined,
    };
  }
  protected override popupViewContent(payload: unknown): unknown {
    const title = this.#hasSlot('title');
    const description = this.#hasSlot('description');
    const header = this.#hasSlot('header') || title || description;
    return html`${
        header
          ? this.surfacePart('header', {
              content: html`<slot name="header" @slotchange=${this.contentChanged}
                >${title ? this.surfacePart('title', { tag: 'h2', properties: { id: this.#titleId }, content: html`<slot name="title" @slotchange=${this.contentChanged}></slot>` }) : nothing}${description ? this.surfacePart('description', { tag: 'p', properties: { id: this.#descriptionId }, content: html`<slot name="description" @slotchange=${this.contentChanged}></slot>` }) : nothing}</slot
              >`,
            })
          : nothing
      }${super.popupViewContent(payload)}<slot
        name="close"
        @slotchange=${this.contentChanged}
      ></slot>`;
  }
  protected override popupLeave = (event: PointerEvent): void => {
    if (
      this.preserveOnTriggerHover &&
      this.triggerElement &&
      this.popupElement &&
      composedContains(this.triggerElement, event.relatedTarget as Node | null) &&
      composedContains(this.popupElement, deepActiveElement(this.ownerDocument))
    )
      return;
    this.hover.popupLeave(event);
  };
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    const anchor = this.ownedChildren.find(
      (node): node is HTMLElement =>
        node.nodeType === 1 && (node as Element).getAttribute('slot') === 'anchor',
    );
    if (anchor !== this.#registeredAnchor) {
      this.#anchorRelease?.();
      this.#registeredAnchor = anchor;
      this.#anchorRelease = anchor
        ? this.presentationController.registerPart('popover-anchor', anchor)
        : undefined;
    }
  }
  override disconnectedCallback(): void {
    this.#anchorRelease?.();
    this.#anchorRelease = undefined;
    this.#registeredAnchor = undefined;
    super.disconnectedCallback();
  }
}
