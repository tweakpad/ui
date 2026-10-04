import { rect, type AnchorGeometry, type VirtualAnchor } from '../../foundation/positioning.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import { deepActiveElement, composedContains } from '../../foundation/focus.js';

interface ContextInvocationOptions {
  document(): Document;
  targetId(): string;
  children(): readonly Node[];
  parent(): HTMLElement | null;
  disabled(): boolean;
  isOpen(): boolean;
  setTarget(target: HTMLElement | null): void;
  targetRemoved(): void;
  registerTarget(target: HTMLElement): () => void;
  requestOpen(event: Event, target: HTMLElement): boolean;
  reposition(): void;
}

/** Context targeting only. Open state, items, focus and positioning belong to Menu. */
export class ContextInvocation {
  #target: HTMLElement | null = null;
  #targetPart: (() => void) | undefined;
  #targetObserver: MutationObserver | undefined;
  #point: VirtualAnchor | null = null;
  #touch: { id: number; x: number; y: number } | undefined;
  #timer: number | undefined;
  #timerWindow: Window | undefined;
  #touchDocument: Document | undefined;
  #keyboard = false;
  constructor(private readonly options: ContextInvocationOptions) {}
  get anchor(): AnchorGeometry | null {
    return this.#point ?? this.#target;
  }
  get keyboardOpening(): boolean {
    return this.#keyboard;
  }
  connect(): void {
    const document = this.options.document();
    this.#targetObserver ??= new document.defaultView!.MutationObserver(() => {
      if (
        this.options.targetId() &&
        this.options.document().getElementById(this.options.targetId()) !== this.#target
      )
        this.bindTarget();
    });
    this.#targetObserver.observe(this.options.document().documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['id'],
    });
    this.bindTarget();
  }
  bindTarget(): void {
    const target = this.options.targetId()
      ? this.options.document().getElementById(this.options.targetId())
      : (this.options
          .children()
          .find(
            (node): node is HTMLElement =>
              node.nodeType === 1 && (node as Element).getAttribute('slot') === 'trigger',
          ) ?? this.options.parent());
    if (target === this.#target) return;
    if (this.options.isOpen() && this.#target) this.options.targetRemoved();
    this.#unbindTarget();
    this.#target = target;
    this.options.setTarget(target);
    if (!target) return;
    for (const [type, handler] of Object.entries(this.#handlers))
      target.addEventListener(type, handler as EventListener);
    this.#targetPart = this.options.registerTarget(target);
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
    if (
      !event.isPrimary ||
      this.#touch ||
      this.options.disabled() ||
      componentHandlingPrevented(event)
    ) {
      this.#touchEnd();
      return;
    }
    this.#touch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    this.#touchDocument = this.options.document();
    this.#touchDocument.addEventListener('pointermove', this.#touchMove, true);
    this.#touchDocument.addEventListener('pointerup', this.#touchEnd, true);
    this.#touchDocument.addEventListener('pointercancel', this.#touchEnd, true);
    this.#touchDocument.addEventListener('pointerdown', this.#additionalTouch, true);
    this.#timerWindow = this.#touchDocument.defaultView ?? undefined;
    this.#timer = this.#timerWindow?.setTimeout(() => {
      const point = this.#touch;
      this.#timer = undefined;
      if (point) this.#openAt(point.x, point.y, event, false, 10);
    }, 500);
  };
  #additionalTouch = (event: PointerEvent): void => {
    if (event.pointerType === 'touch' && event.pointerId !== this.#touch?.id) this.#touchEnd();
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
    this.#touchDocument?.removeEventListener('pointermove', this.#touchMove, true);
    this.#touchDocument?.removeEventListener('pointerup', this.#touchEnd, true);
    this.#touchDocument?.removeEventListener('pointercancel', this.#touchEnd, true);
    this.#touchDocument?.removeEventListener('pointerdown', this.#additionalTouch, true);
    this.#touchDocument = undefined;
    this.#timer = undefined;
    this.#timerWindow = undefined;
    this.#touch = undefined;
  };
  #keyboardPoint(): { x: number; y: number } | null {
    if (!this.#target) return null;
    const box = this.#target.getBoundingClientRect();
    const rtl =
      this.options.document().defaultView?.getComputedStyle(this.#target).direction === 'rtl';
    return { x: rtl ? box.right : box.left, y: box.bottom };
  }
  #context = (event: MouseEvent): void => {
    if (event.defaultPrevented || componentHandlingPrevented(event)) return;
    const keyboard = event.button === 0 && event.clientX === 0 && event.clientY === 0;
    const point = this.#keyboardPoint();
    this.#openAt(
      keyboard && point ? point.x : event.clientX,
      keyboard && point ? point.y : event.clientY,
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
    const point = this.#keyboardPoint();
    if (point) this.#openAt(point.x, point.y, event, true);
  };
  #handlers = {
    contextmenu: this.#context,
    keydown: this.#key,
    pointerdown: this.#touchStart,
  };
  #openAt(x: number, y: number, event: Event, keyboard: boolean, extent = 0): void {
    if (this.options.disabled() || !this.#target) return;
    const prior = this.#point;
    const priorKeyboard = this.#keyboard;
    this.#keyboard = keyboard;
    this.#point = {
      contextElement: this.#target,
      getBoundingRectangle: () => rect(x - extent / 2, y - extent / 2, extent, extent),
    };
    this.options.setTarget(this.#target);
    if (!this.options.isOpen() && !this.options.requestOpen(event, this.#target)) {
      this.#point = prior;
      this.#keyboard = priorKeyboard;
      return;
    }
    this.#keyboard = keyboard;
    event.preventDefault();
    this.options.reposition();
  }
  shouldRestoreFocus(popup: HTMLElement | null): boolean {
    return (
      this.#keyboard &&
      !!popup &&
      composedContains(popup, deepActiveElement(this.options.document()))
    );
  }
  closed(): void {
    this.#point = null;
    this.#keyboard = false;
  }
  disconnect(): void {
    this.#targetObserver?.disconnect();
    this.#targetObserver = undefined;
    this.#unbindTarget();
    this.closed();
  }
}
