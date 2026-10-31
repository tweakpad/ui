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

const lengths = (style: CSSStyleDeclaration, names: readonly string[]): number =>
  names.reduce((sum, name) => sum + (parseFloat(style.getPropertyValue(name)) || 0), 0);

/** The layout border box, sub-pixel like an observer entry (offsetWidth rounds it). */
function layoutBox(style: CSSStyleDeclaration): { width: number; height: number } | null {
  const width = parseFloat(style.width),
    height = parseFloat(style.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null;
  if (style.boxSizing === 'border-box') return { width, height };
  return {
    width:
      width +
      lengths(style, ['padding-left', 'padding-right', 'border-left-width', 'border-right-width']),
    height:
      height +
      lengths(style, ['padding-top', 'padding-bottom', 'border-top-width', 'border-bottom-width']),
  };
}

/** Preserve keyed payload content while the prior view finishes its actual exit. */
export class PopupViewportController implements ReactiveController {
  current: PopupViewportEntry | null = null;
  previous: PopupViewportEntry | null = null;
  direction: 'forward' | 'backward' | null = null;
  #currentElement: HTMLElement | null = null;
  #previousElement: HTMLElement | null = null;
  #observer: ResizeObserver | null = null;
  #frame = 0;
  #width = 0;
  #height = 0;
  readonly #exit: PresenceController;
  constructor(
    private host: ReactiveControllerHost,
    private viewport: () => HTMLElement | null,
    private surface: () => HTMLElement | null = () => null,
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
    this.#disconnect();
    this.#currentElement = current;
    const view = current?.ownerDocument.defaultView;
    this.#observer =
      view && current ? new view.ResizeObserver(([entry]) => this.#observed(entry!)) : null;
    if (current) this.#observer?.observe(current);
    this.measure();
  }
  // Sizing inside the observer's delivery resizes the positioner, an ancestor of the observed view,
  // which the positioning observer could then only see through a loop error: size it next frame.
  #observed(entry: ResizeObserverEntry): void {
    const view = this.#currentElement?.ownerDocument.defaultView;
    if (!view) return;
    view.cancelAnimationFrame(this.#frame);
    this.#frame = view.requestAnimationFrame(() => {
      this.#frame = 0;
      if (entry.target === this.#currentElement) this.measure(entry);
    });
  }
  #disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = null;
    if (this.#frame)
      this.#currentElement?.ownerDocument.defaultView?.cancelAnimationFrame(this.#frame);
    this.#frame = 0;
  }
  /** Reads the current view's size now; the observer keeps it current afterwards. */
  measure(entry?: ResizeObserverEntry): void {
    const element = this.#currentElement;
    const elementStyle = element && element.ownerDocument.defaultView?.getComputedStyle(element);
    // Presence transforms change painted bounds, not the layout space required
    // by the content. Measuring them here clips the settled viewport.
    const size = entry?.borderBoxSize[0];
    const vertical = elementStyle?.writingMode.startsWith('vertical');
    const box = size
      ? {
          width: vertical ? size.blockSize : size.inlineSize,
          height: vertical ? size.inlineSize : size.blockSize,
        }
      : elementStyle
        ? layoutBox(elementStyle)
        : null;
    if (!box || (!box.width && !box.height)) return;
    // Observer sizes are sub-pixel: a read that rounded them would make the first notification
    // resize the positioner again.
    if (Math.abs(box.width - this.#width) < 0.01 && Math.abs(box.height - this.#height) < 0.01)
      return;
    this.#width = box.width;
    this.#height = box.height;
    const viewport = this.viewport();
    viewport?.style.setProperty('--tp-popup-width', `${box.width}px`);
    viewport?.style.setProperty('--tp-popup-height', `${box.height}px`);
    // The positioner takes the next view's outer size at once, so its position is computed once
    // for the settled geometry and the viewport morphs inside a box that no longer moves it.
    const surface = this.surface();
    const view = viewport?.ownerDocument.defaultView;
    if (surface && viewport && view) {
      const style = view.getComputedStyle(viewport);
      const extent = (...names: string[]) => lengths(style, names);
      const inline = extent(
        'border-left-width',
        'border-right-width',
        'padding-left',
        'padding-right',
      );
      const block = extent(
        'border-top-width',
        'border-bottom-width',
        'padding-top',
        'padding-bottom',
      );
      surface.style.setProperty('--tp-positioner-width', `${box.width + inline}px`);
      surface.style.setProperty('--tp-positioner-height', `${box.height + block}px`);
    }
    // A host that measures inside its own update (setElements, a late remeasure) is already
    // rendering with this size; only an observed resize arrives between updates.
    if (entry) this.host.requestUpdate();
  }
  hostDisconnected(): void {
    this.#disconnect();
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
