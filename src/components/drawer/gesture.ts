import { composedContains } from '../../foundation/focus.js';
import { componentHandlingPrevented } from '../../foundation/part.js';
import {
  directionSign,
  horizontalDirection,
  type DrawerDirection,
  type DrawerGestureOutput,
} from './types.js';
interface Contact {
  x: number;
  y: number;
  time: number;
}
interface GestureOptions {
  enabled(): boolean;
  direction(): DrawerDirection;
  canExpand(): boolean;
  surface(): HTMLElement | null;
  publish(output: DrawerGestureOutput): void;
  release(output: DrawerGestureOutput): void;
}
const interactive =
  'button,a[href],input,textarea,select,[contenteditable]:not([contenteditable=false]),[role=button],[role=slider],[data-swipe-ignore],[data-base-ui-swipe-ignore]';
/** Drawer axis arbitration; content keeps native scrolling until the dismiss edge is reached. */
export class DrawerGesture {
  #element: HTMLElement | null = null;
  #document: Document | null = null;
  #pointer: number | null = null;
  #touch: number | null = null;
  #start: Contact = { x: 0, y: 0, time: 0 };
  #last = this.#start;
  #direction: DrawerDirection = 'down';
  #opening = false;
  #locked = false;
  #path: HTMLElement[] = [];
  #selection = '';
  #guardCleanup: (() => void) | undefined;
  #output: DrawerGestureOutput = { movement: 0, velocity: 0, swiping: false, opening: false };
  constructor(private options: GestureOptions) {}
  get active(): boolean {
    return this.#locked;
  }
  start(
    event: PointerEvent | TouchEvent,
    element: HTMLElement,
    opening = false,
    direction = this.options.direction(),
  ): void {
    if (
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      !this.options.enabled() ||
      this.#element
    )
      return;
    const touch = 'touches' in event ? event.touches[0] : undefined;
    if (
      !touch &&
      'pointerType' in event &&
      (event.pointerType === 'touch' || event.button !== 0 || !event.isPrimary)
    )
      return;
    if ('touches' in event && event.touches.length !== 1) return;
    const path = event
      .composedPath()
      .filter((node): node is HTMLElement => node instanceof HTMLElement);
    const region = path.indexOf(element);
    const targets = region < 0 ? path : path.slice(0, region + 1);
    if (
      targets.some(
        (node) =>
          node.matches(
            touch
              ? 'input[type=range],[role=slider],[data-swipe-ignore],[data-base-ui-swipe-ignore]'
              : interactive,
          ) && !node.hasAttribute('data-drawer-swipe-handle'),
      )
    )
      return;
    const surface = this.options.surface();
    if (!touch && !opening && targets.some((node) => node.matches('[data-drawer-content]'))) return;
    const selection = element.ownerDocument.getSelection();
    if (
      touch &&
      selection?.toString() &&
      surface &&
      composedContains(surface, selection.anchorNode)
    )
      return;
    this.#element = element;
    this.#document = element.ownerDocument;
    this.#path = targets;
    this.#direction = direction;
    this.#opening = opening;
    this.#pointer = touch ? null : (event as PointerEvent).pointerId;
    this.#touch = touch?.identifier ?? null;
    this.#start = this.#last = {
      x: touch?.clientX ?? (event as PointerEvent).clientX,
      y: touch?.clientY ?? (event as PointerEvent).clientY,
      time: event.timeStamp,
    };
    this.#selection = element.style.userSelect;
    this.#output = { movement: 0, velocity: 0, swiping: false, opening, sourceEvent: event };
    this.#document.addEventListener('pointermove', this.#pointerMove, true);
    this.#document.addEventListener('pointerup', this.#pointerEnd, true);
    this.#document.addEventListener('pointercancel', this.#cancel, true);
    this.#document.addEventListener('touchmove', this.#touchMove, {
      capture: true,
      passive: false,
    });
    this.#document.addEventListener('touchend', this.#touchEnd, true);
    this.#document.addEventListener('touchcancel', this.#cancel, true);
    this.#document.addEventListener('contextmenu', this.#cancel, true);
    this.#document.defaultView?.addEventListener('blur', this.#cancel);
    element.addEventListener('lostpointercapture', this.#cancel);
  }
  #pointerMove = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointer) return;
    this.#move({ x: event.clientX, y: event.clientY, time: event.timeStamp }, event);
    if (event.buttons === 0) this.#finish(event);
  };
  #pointerEnd = (event: PointerEvent): void => {
    if (event.pointerId !== this.#pointer) return;
    if (event.clientX !== this.#last.x || event.clientY !== this.#last.y)
      this.#move({ x: event.clientX, y: event.clientY, time: event.timeStamp }, event);
    this.#finish(event);
  };
  #touchMove = (event: TouchEvent): void => {
    if (event.touches.length !== 1) {
      this.cancel();
      return;
    }
    const touch = [...event.touches].find((t) => t.identifier === this.#touch);
    if (touch) this.#move({ x: touch.clientX, y: touch.clientY, time: event.timeStamp }, event);
  };
  #touchEnd = (event: TouchEvent): void => {
    const touch = [...event.changedTouches].find((t) => t.identifier === this.#touch);
    if (!touch) return;
    if (touch.clientX !== this.#last.x || touch.clientY !== this.#last.y)
      this.#move({ x: touch.clientX, y: touch.clientY, time: event.timeStamp }, event);
    this.#finish(event);
  };
  #nativeCanScroll(horizontal: boolean, delta: number): boolean {
    for (const node of this.#path) {
      const style = getComputedStyle(node);
      if (!/(auto|scroll)/.test(horizontal ? style.overflowX : style.overflowY)) continue;
      const max = horizontal
        ? node.scrollWidth - node.clientWidth
        : node.scrollHeight - node.clientHeight;
      if (max <= 0) continue;
      const rtl = horizontal && style.direction === 'rtl';
      const offset = horizontal ? (rtl ? -node.scrollLeft : node.scrollLeft) : node.scrollTop;
      const scrollDelta = delta * (rtl ? 1 : -1);
      if (scrollDelta > 0 ? offset < max - 1 : offset > 1) return true;
    }
    return false;
  }
  #move(current: Contact, event: Event): void {
    if (!this.#element || !this.options.enabled()) {
      this.cancel();
      return;
    }
    const horizontal = horizontalDirection(this.#direction);
    const x = current.x - this.#start.x,
      y = current.y - this.#start.y;
    const axis = horizontal ? x : y,
      cross = horizontal ? y : x;
    const movement = axis * directionSign(this.#direction);
    if (!this.#locked) {
      if (Math.max(Math.abs(axis), Math.abs(cross)) < 6) return;
      if (Math.abs(cross) > Math.abs(axis) + 2) {
        this.cancel();
        return;
      }
      if (Math.abs(axis) < Math.abs(cross) + 2) return;
      if (this.#opening && movement <= 0) {
        this.cancel();
        return;
      }
      if (!this.#opening && movement < 0 && !this.options.canExpand()) {
        this.cancel();
        return;
      }
      if (this.#touch !== null && this.#nativeCanScroll(horizontal, axis)) {
        this.#start = this.#last = current;
        return;
      }
      // A noncancelable touchmove means the browser already owns native scrolling.
      if (this.#touch !== null && !event.cancelable) {
        this.cancel();
        return;
      }
      this.#locked = true;
      if (this.#pointer !== null) {
        this.#element.setPointerCapture(this.#pointer);
        const selection = this.#document?.getSelection();
        const surface = this.options.surface();
        if (selection?.anchorNode && surface && composedContains(surface, selection.anchorNode))
          selection.removeAllRanges();
      }
      this.#element.style.userSelect = 'none';
    }
    if (event.cancelable) event.preventDefault();
    const delta = horizontal ? current.x - this.#last.x : current.y - this.#last.y;
    const velocity =
      delta === 0
        ? this.#output.velocity
        : (delta * directionSign(this.#direction)) / Math.max(1, current.time - this.#last.time);
    this.#last = current;
    this.#output = {
      movement,
      velocity,
      swiping: true,
      opening: this.#opening,
      sourceEvent: event,
    };
    this.options.publish(this.#output);
  }
  #finish(event: Event): void {
    if (!this.#element) return;
    const doc = this.#document;
    const output = { ...this.#output, sourceEvent: event };
    const locked = this.#locked;
    this.#cleanup();
    if (locked) {
      this.#guardCleanup?.();
      if (doc) {
        const cleanup = () => {
          doc.removeEventListener('click', suppress, true);
          doc.removeEventListener('pointerdown', cleanup, true);
          this.#guardCleanup = undefined;
        };
        const suppress = (event: MouseEvent) => {
          if (event.detail > 0) {
            event.preventDefault();
            event.stopImmediatePropagation();
          }
          cleanup();
        };
        doc.addEventListener('click', suppress, true);
        doc.addEventListener('pointerdown', cleanup, true);
        this.#guardCleanup = cleanup;
      }
      this.options.release(output);
    }
  }
  dispose(): void {
    this.cancel();
    this.#guardCleanup?.();
  }
  #cancel = (): void => this.cancel();
  cancel(): void {
    const changed = this.#locked;
    this.#cleanup();
    if (changed) this.options.publish({ movement: 0, velocity: 0, swiping: false, opening: false });
  }
  #cleanup(): void {
    const doc = this.#document;
    doc?.removeEventListener('pointermove', this.#pointerMove, true);
    doc?.removeEventListener('pointerup', this.#pointerEnd, true);
    doc?.removeEventListener('pointercancel', this.#cancel, true);
    doc?.removeEventListener('touchmove', this.#touchMove, true);
    doc?.removeEventListener('touchend', this.#touchEnd, true);
    doc?.removeEventListener('touchcancel', this.#cancel, true);
    doc?.removeEventListener('contextmenu', this.#cancel, true);
    doc?.defaultView?.removeEventListener('blur', this.#cancel);
    if (this.#element) {
      this.#element.removeEventListener('lostpointercapture', this.#cancel);
      if (this.#pointer !== null && this.#element.hasPointerCapture(this.#pointer))
        this.#element.releasePointerCapture(this.#pointer);
      this.#element.style.userSelect = this.#selection;
    }
    this.#element = null;
    this.#document = null;
    this.#pointer = null;
    this.#touch = null;
    this.#locked = false;
    this.#path = [];
  }
}
