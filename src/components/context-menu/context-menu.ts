import type { PropertyValues } from 'lit';
import { TpMenu } from '../menu/menu.js';
import type { AnchoredTriggerOptions } from '../anchored-surface.js';
import { rect, type AnchorGeometry, type VirtualAnchor } from '../../foundation/positioning.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { deepActiveElement, composedContains } from '../../foundation/focus.js';

/** Context invocation is a policy binding on the actual Menu owner. */
export class TpContextMenu extends TpMenu {
  static override tagName = 'tp-context-menu';
  static override properties = { ...TpMenu.properties, for: { type: String } };
  for = '';
  override openOnHover = false;
  #target: HTMLElement | null = null;
  #targetPart: (() => void) | undefined;
  #targetObserver: MutationObserver | undefined;
  #point: VirtualAnchor | null = null;
  #touch: { id: number; x: number; y: number } | undefined;
  #timer: number | undefined;
  #timerWindow: Window | undefined;
  #keyboard = false;
  override connectedCallback(): void {
    super.connectedCallback();
    this.#targetObserver = new this.ownerDocument.defaultView!.MutationObserver(() => {
      if (this.for && this.ownerDocument.getElementById(this.for) !== this.#target)
        this.#bindTarget();
    });
    this.#targetObserver.observe(this.ownerDocument.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id'],
    });
  }
  protected override get partPrefix(): string {
    return 'context-menu';
  }
  protected override get triggerHasPopup(): string | null {
    return null;
  }
  protected override anchorGeometry(): AnchorGeometry | null {
    return this.#point ?? this.#target;
  }
  protected override syncSlot = (): void => {
    this.#bindTarget();
  };
  override registerTrigger(
    _element: HTMLElement,
    _options: AnchoredTriggerOptions = {},
  ): () => void {
    void _element;
    void _options;
    this.diagnostic(
      'context-target',
      'Context Menu uses its single context target; detached triggers are not supported.',
    );
    return () => {};
  }
  #bindTarget(): void {
    const target = this.for
      ? this.ownerDocument.getElementById(this.for)
      : (this.ownedChildren.find(
          (node): node is HTMLElement =>
            node.nodeType === 1 && (node as Element).getAttribute('slot') === 'trigger',
        ) ?? this.parentElement);
    if (target === this.#target) return;
    if (this.open && this.#target) this.setOpen(false, 'anchor-removed');
    this.#unbindTarget();
    this.#target = target;
    this.trigger = target;
    if (!target) return;
    for (const [type, handler] of Object.entries(this.#handlers))
      target.addEventListener(type, handler as EventListener);
    this.#targetPart = this.presentationController.registerPart('context-menu-target', target);
  }
  #unbindTarget(): void {
    this.#touchEnd();
    if (this.#target)
      for (const [type, handler] of Object.entries(this.#handlers))
        this.#target.removeEventListener(type, handler as EventListener);
    this.#targetPart?.();
    this.#targetPart = undefined;
    this.#target = null;
  }
  #touchStart = (event: PointerEvent): void => {
    if (event.pointerType !== 'touch') return;
    if (!event.isPrimary || this.#touch || this.disabled || componentHandlingPrevented(event)) {
      this.#touchEnd();
      return;
    }
    this.#touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.#timerWindow = this.ownerDocument.defaultView ?? undefined;
    this.#timer = this.#timerWindow?.setTimeout(() => {
      const point = this.#touch;
      this.#timer = undefined;
      if (point) this.#openAt(point.x, point.y, event, false, 10);
    }, 500);
  };
  #touchMove = (event: PointerEvent): void => {
    if (
      this.#touch &&
      (event.pointerId !== this.#touch.id ||
        Math.abs(event.clientX - this.#touch.x) > 10 ||
        Math.abs(event.clientY - this.#touch.y) > 10)
    )
      this.#touchEnd();
  };
  #touchEnd = (): void => {
    if (this.#timer !== undefined) this.#timerWindow?.clearTimeout(this.#timer);
    this.#timer = undefined;
    this.#timerWindow = undefined;
    this.#touch = undefined;
  };
  #context = (event: MouseEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    const keyboard = event.button === 0 && event.clientX === 0 && event.clientY === 0;
    const box = this.#target?.getBoundingClientRect();
    this.#openAt(
      keyboard && box ? box.left : event.clientX,
      keyboard && box ? box.bottom : event.clientY,
      event,
      keyboard,
    );
  };
  #key = (event: KeyboardEvent): void => {
    if (
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey))
    )
      return;
    const box = this.#target?.getBoundingClientRect();
    if (box) this.#openAt(box.left, box.bottom, event, true);
  };
  #handlers = {
    contextmenu: this.#context,
    keydown: this.#key,
    pointerdown: this.#touchStart,
    pointermove: this.#touchMove,
    pointerup: this.#touchEnd,
    pointercancel: this.#touchEnd,
  };
  #openAt(x: number, y: number, event: Event, keyboard: boolean, extent = 0): void {
    if (this.disabled || !this.#target) return;
    const prior = this.#point;
    this.#point = {
      contextElement: this.#target,
      getBoundingRectangle: () => rect(x - extent / 2, y - extent / 2, extent, extent),
    };
    this.trigger = this.#target;
    if (
      !this.open &&
      !this.requestOpen(true, keyboard ? 'list-navigation' : 'trigger-press', event, this.#target)
    ) {
      this.#point = prior;
      return;
    }
    this.#keyboard = keyboard;
    event.preventDefault();
    this.requestUpdate();
    void this.updateComplete.then(() => {
      this.startPosition();
    });
  }
  protected override focusOnClose(): void {
    if (
      this.#keyboard &&
      this.popupElement &&
      composedContains(this.popupElement, deepActiveElement(this.ownerDocument))
    )
      super.focusOnClose();
  }
  protected override closed(): void {
    this.#point = null;
    this.#keyboard = false;
  }
  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('for')) this.#bindTarget();
    if (this.handle)
      this.diagnostic(
        'context-handle',
        'Context Menu has one context target and does not support detached handle association.',
      );
  }
  override disconnectedCallback(): void {
    this.#targetObserver?.disconnect();
    this.#targetObserver = undefined;
    this.#unbindTarget();
    this.#point = null;
    super.disconnectedCallback();
  }
}
