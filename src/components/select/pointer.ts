/** Select's aligned-popup gesture policy; keyboard action stays in the shared part binding. */
export class SelectPointer<T> {
  #pressed: T | undefined;
  #pointerType = 'mouse';
  #openedAt = 0;
  #dragY = 0;
  #released: T | undefined;
  constructor(private now: () => number = () => performance.now()) {}
  opened(): void {
    this.reset();
    this.#openedAt = this.now();
  }
  enter(pointerType: string): void {
    this.#pointerType = pointerType || 'mouse';
  }
  down(item: T, pointerType: string): void {
    this.#pressed = item;
    this.#pointerType = pointerType || 'mouse';
    this.#dragY = 0;
    this.#released = undefined;
  }
  move(pointerType: string, buttons: number, movementY: number): void {
    if (pointerType === 'mouse' && buttons === 1) this.#dragY += movementY;
  }
  release(item: T, selected: boolean): boolean {
    const dragged = this.#dragY ** 2 >= 64;
    this.#dragY = 0;
    if (this.#pointerType === 'touch' || this.#pressed === item) return false;
    if (this.now() - this.#openedAt < 400 && (selected || !dragged)) return false;
    this.#released = item;
    return true;
  }
  click(item: T, event: { detail: number; pointerType?: string }, highlighted: boolean): boolean {
    if (this.#released === item) {
      this.#released = undefined;
      return false;
    }
    const virtual = event.detail === 0 && (event.pointerType !== undefined || highlighted);
    const accept = this.#pointerType === 'touch' || virtual || this.#pressed === item;
    this.#pressed = undefined;
    return accept;
  }
  reset(): void {
    this.#pressed = undefined;
    this.#released = undefined;
    this.#pointerType = 'mouse';
    this.#dragY = 0;
  }
}
