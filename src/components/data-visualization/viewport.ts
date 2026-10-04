import type { VisualizationDimensions } from './types.js';

/** Responsive measurement only; chart geometry and rendering remain in the adapter. */
export class VisualizationResponsiveViewport {
  dimensions: VisualizationDimensions = { width: 320, height: 200 };
  #observer: ResizeObserver | undefined;
  connect(element: HTMLElement, changed: (dimensions: VisualizationDimensions) => void): void {
    this.disconnect();
    const Observer = element.ownerDocument.defaultView?.ResizeObserver;
    if (!Observer) return;
    this.#observer = new Observer(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      if (
        width <= 0 ||
        height <= 0 ||
        (width === this.dimensions.width && height === this.dimensions.height)
      )
        return;
      this.dimensions = { width, height };
      changed(this.dimensions);
    });
    this.#observer.observe(element);
  }
  disconnect(): void {
    this.#observer?.disconnect();
    this.#observer = undefined;
  }
}
