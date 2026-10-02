/** Native-equivalent Enter/Space activation for a non-native action host. */
export class SyntheticPress {
  #spacePressed = false;
  constructor(
    private activate: (event: KeyboardEvent) => void,
    private respectNativeDefault = true,
  ) {}
  readonly keyDown = (event: KeyboardEvent): void => {
    if (this.respectNativeDefault && event.defaultPrevented) return;
    if (event.key === ' ') {
      event.preventDefault();
      this.#spacePressed = true;
    } else if (event.key === 'Enter' && !event.repeat) {
      event.preventDefault();
      this.activate(event);
    }
  };
  readonly keyUp = (event: KeyboardEvent): void => {
    if (event.key !== ' ' || !this.#spacePressed) return;
    this.#spacePressed = false;
    if (this.respectNativeDefault && event.defaultPrevented) return;
    event.preventDefault();
    this.activate(event);
  };
  reset(): void {
    this.#spacePressed = false;
  }
}
