import type { ToastSwipeDirection } from './types.js';

export interface ToastGestureOutput {
  x: number;
  y: number;
  progress: number;
  strength: number;
  direction: ToastSwipeDirection | undefined;
  swiping: boolean;
}
const rest = (): ToastGestureOutput => ({
  x: 0,
  y: 0,
  progress: 0,
  strength: 0,
  direction: undefined,
  swiping: false,
});

/** Toast-specific gesture policy. Shared gesture outputs match Foundation §12.6. */
export class ToastGesture {
  #element: HTMLElement | null = null;
  #pointer: number | null = null;
  #start = { x: 0, y: 0, time: 0 };
  #last = { x: 0, y: 0, time: 0 };
  #allowed: readonly ToastSwipeDirection[] = [];
  #output = rest();
  #selection = '';
  #maximum = 0;
  constructor(
    readonly publish: (output: ToastGestureOutput) => void,
    readonly dismiss: () => void,
  ) {}
  start(event: PointerEvent, element: HTMLElement, allowed: readonly ToastSwipeDirection[]): void {
    if (event.defaultPrevented || event.button !== 0 || !allowed.length) return;
    if (
      event
        .composedPath()
        .some(
          (node) =>
            node instanceof Element &&
            node !== element &&
            node.matches(
              'button,a,input,textarea,select,tp-button,tp-input,tp-text-area,[role="button"],[contenteditable],[data-swipe-ignore],[data-base-ui-swipe-ignore]',
            ),
        )
    )
      return;
    if (element.ownerDocument.getSelection()?.toString()) return;
    this.reset();
    this.#element = element;
    this.#pointer = event.pointerId;
    this.#allowed = allowed;
    this.#start = this.#last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    this.#selection = element.style.userSelect;
    element.setPointerCapture(event.pointerId);
  }
  move(event: PointerEvent): void {
    if (event.pointerId !== this.#pointer || !this.#element) return;
    const x = event.clientX - this.#start.x;
    const y = event.clientY - this.#start.y;
    let direction = this.#output.direction;
    if (!direction && Math.hypot(x, y) >= 4) {
      direction =
        Math.abs(x) > Math.abs(y) * 1.15
          ? x > 0
            ? 'right'
            : 'left'
          : Math.abs(y) > Math.abs(x) * 1.15
            ? y > 0
              ? 'down'
              : 'up'
            : undefined;
      if (direction && !this.#allowed.includes(direction)) {
        this.reset();
        return;
      }
    }
    if (!direction) return;
    event.preventDefault();
    this.#element.style.userSelect = 'none';
    const horizontal = direction === 'left' || direction === 'right';
    const movement = (horizontal ? x : y) * (direction === 'left' || direction === 'up' ? -1 : 1);
    this.#maximum = Math.max(this.#maximum, movement);
    if (this.#maximum > 40 && this.#maximum - movement >= 10) {
      this.reset();
      return;
    }
    const extent = horizontal ? this.#element.offsetWidth : this.#element.offsetHeight;
    const time = Math.max(1, event.timeStamp - this.#last.time);
    const velocity = Math.hypot(event.clientX - this.#last.x, event.clientY - this.#last.y) / time;
    this.#last = { x: event.clientX, y: event.clientY, time: event.timeStamp };
    this.#output = {
      x: horizontal ? x : 0,
      y: horizontal ? 0 : y,
      progress: Math.max(0, Math.min(1, movement / Math.max(1, extent))),
      strength: Math.min(1, velocity / 1.2),
      direction,
      swiping: true,
    };
    this.publish(this.#output);
  }
  end(event: PointerEvent): void {
    if (event.pointerId !== this.#pointer) return;
    const output = this.#output;
    const displacement = Math.max(Math.abs(output.x), Math.abs(output.y));
    const dismiss =
      event.type !== 'pointercancel' &&
      output.swiping &&
      (displacement > 40 || (displacement > 10 && output.strength > 0.7));
    this.#release();
    if (dismiss) {
      this.publish({ ...output, swiping: false });
      this.dismiss();
    } else this.reset();
  }
  lostCapture(event: PointerEvent): void {
    if (this.#pointer === event.pointerId) this.reset();
  }
  reset(): void {
    this.#release();
    this.#maximum = 0;
    this.#output = rest();
    this.publish(this.#output);
  }
  #release(): void {
    if (this.#element && this.#pointer !== null) {
      if (this.#element.hasPointerCapture(this.#pointer))
        this.#element.releasePointerCapture(this.#pointer);
      if (this.#element.style.userSelect === 'none')
        this.#element.style.userSelect = this.#selection;
    }
    this.#element = null;
    this.#pointer = null;
  }
}
