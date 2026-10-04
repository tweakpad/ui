import { CleanupScope } from './services.js';
import { componentHandlingPrevented } from './part.js';

export interface PressAndHoldOptions {
  start?(): void;
  disabled(): boolean;
  tick(event: PointerEvent | MouseEvent): boolean;
  release(event: PointerEvent): void;
  focus?(): void;
}

/** Shared native-button hold policy. Timing/gesture thresholds follow Base UI usePressAndHold. */
export class PressAndHold {
  readonly #scope = new CleanupScope();
  #gesture: CleanupScope | undefined;
  #timer: number | undefined;
  #pointer: number | undefined;
  #source: PointerEvent | undefined;
  #skipClick = false;
  #started = false;
  #moves = 0;
  constructor(
    readonly element: HTMLElement,
    readonly options: PressAndHoldOptions,
  ) {
    this.#scope.listen(element, 'pointerdown', this.#down);
    this.#scope.listen(element, 'pointerleave', () => this.#clearTimer());
    this.#scope.listen(element, 'pointerenter', (event) => {
      if (this.#pointer === event.pointerId && event.pointerType === 'mouse' && !options.disabled())
        this.#start(event);
    });
  }
  get active(): boolean {
    return this.#pointer !== undefined;
  }
  shouldSkipClick(event: MouseEvent): boolean {
    const skip = event.detail !== 0 && this.#skipClick;
    this.#skipClick = false;
    return skip;
  }
  cancel(): void {
    this.#clearTimer();
    this.#gesture?.dispose();
    this.#gesture = undefined;
    this.#pointer = undefined;
    this.#source = undefined;
    this.#started = false;
  }
  dispose(): void {
    this.cancel();
    this.#scope.dispose();
  }
  #clearTimer(): void {
    if (this.#timer !== undefined)
      this.element.ownerDocument.defaultView!.clearTimeout(this.#timer);
    this.#timer = undefined;
  }
  #repeat(event: PointerEvent, delay: number): void {
    this.#timer = this.element.ownerDocument.defaultView!.setTimeout(() => {
      this.#timer = undefined;
      if (!this.element.isConnected || this.options.disabled()) return;
      if (this.options.tick(event)) this.#repeat(event, 60);
    }, delay);
  }
  #start(event: PointerEvent): void {
    this.#clearTimer();
    this.#started = this.#skipClick = true;
    if (this.options.tick(event)) this.#repeat(event, 400);
  }
  #down = (event: PointerEvent): void => {
    if (
      event.defaultPrevented ||
      componentHandlingPrevented(event) ||
      event.button !== 0 ||
      !event.isPrimary ||
      this.options.disabled()
    )
      return;
    this.cancel();
    this.options.start?.();
    this.#skipClick = false;
    this.#pointer = event.pointerId;
    this.#source = event;
    this.#moves = 0;
    const scope = (this.#gesture = new CleanupScope());
    const win = this.element.ownerDocument.defaultView!;
    scope.listen(win, 'pointerup', (up) => {
      if (up.pointerId !== this.#pointer) return;
      const started = this.#started;
      this.cancel();
      if (started) this.options.release(up);
    });
    scope.listen(win, 'pointercancel', (cancel) => {
      if (cancel.pointerId === this.#pointer) {
        this.#skipClick = true;
        this.cancel();
      }
    });
    scope.listen(win, 'blur', () => this.cancel());
    scope.listen(win, 'contextmenu', (context) => {
      if (this.#started) context.preventDefault();
    });
    const touch = event.pointerType === 'touch' || event.pointerType === 'pen';
    scope.listen(win, 'pointermove', (move) => {
      if (!touch || move.pointerId !== this.#pointer || !this.#source) return;
      this.#moves++;
      if (
        Math.hypot(move.clientX - event.clientX, move.clientY - event.clientY) > 8 ||
        (!this.#started && this.#moves >= 3)
      ) {
        this.#skipClick = true;
        this.cancel();
      }
    });
    if (touch) this.#timer = win.setTimeout(() => this.#start(event), 50);
    else {
      event.preventDefault();
      this.options.focus?.();
      this.#start(event);
    }
  };
}
