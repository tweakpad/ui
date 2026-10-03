import type { ReactiveController, ReactiveControllerHost } from 'lit';
import { PresenceController } from './presence.js';

export interface PopupViewportEntry {
  readonly key: string;
  readonly content: unknown;
}
export interface PopupViewportState {
  readonly current: string | null;
  readonly previous: string | null;
  readonly transitioning: boolean;
  readonly activationDirection: 'forward' | 'backward' | null;
  readonly width: number;
  readonly height: number;
}

/** Preserve keyed payload content while the prior view finishes its actual exit. */
export class PopupViewportController implements ReactiveController {
  current: PopupViewportEntry | null = null;
  previous: PopupViewportEntry | null = null;
  direction: 'forward' | 'backward' | null = null;
  #currentElement: HTMLElement | null = null;
  #previousElement: HTMLElement | null = null;
  #observer: ResizeObserver | null = null;
  #width = 0;
  #height = 0;
  readonly #exit: PresenceController;
  constructor(
    private host: ReactiveControllerHost,
    private viewport: () => HTMLElement | null,
  ) {
    host.addController(this);
    this.#exit = new PresenceController(host, {
      surface: () => this.#previousElement,
      onComplete: (open) => {
        if (!open) {
          this.previous = null;
          this.direction = null;
          this.host.requestUpdate();
        }
      },
    });
  }
  get entries(): readonly PopupViewportEntry[] {
    return [this.previous, this.current].filter(
      (entry): entry is PopupViewportEntry => entry !== null,
    );
  }
  get state(): PopupViewportState {
    return {
      current: this.current?.key ?? null,
      previous: this.previous?.key ?? null,
      transitioning: this.previous !== null,
      activationDirection: this.direction,
      width: this.#width,
      height: this.#height,
    };
  }
  set(key: string, content: unknown, direction: 'forward' | 'backward' = 'forward'): void {
    if (this.current?.key === key) return;
    const previous = this.current;
    this.current = this.previous?.key === key ? this.previous : { key, content };
    this.previous = previous;
    this.direction = previous ? direction : null;
    if (previous) {
      this.#exit.setPresent(true);
      this.#exit.setPresent(false);
    }
    this.host.requestUpdate();
  }
  setElements(current: HTMLElement | null, previous: HTMLElement | null): void {
    this.#previousElement = previous;
    if (current === this.#currentElement) return;
    this.#observer?.disconnect();
    this.#currentElement = current;
    const view = current?.ownerDocument.defaultView;
    this.#observer = view && current ? new view.ResizeObserver(() => this.#measure()) : null;
    if (current) this.#observer?.observe(current);
    this.#measure();
  }
  #measure(): void {
    const box = this.#currentElement?.getBoundingClientRect();
    if (!box || (!box.width && !box.height)) return;
    if (box.width === this.#width && box.height === this.#height) return;
    this.#width = box.width;
    this.#height = box.height;
    const viewport = this.viewport();
    viewport?.style.setProperty('--tp-popup-width', `${box.width}px`);
    viewport?.style.setProperty('--tp-popup-height', `${box.height}px`);
    this.host.requestUpdate();
  }
  hostDisconnected(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    this.#currentElement = null;
    this.#previousElement = null;
  }
  reset(): void {
    this.hostDisconnected();
    this.current = null;
    this.previous = null;
    this.direction = null;
    this.#exit.completeExit();
  }
}
