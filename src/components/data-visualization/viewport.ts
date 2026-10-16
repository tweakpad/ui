import { observeResize } from '../../foundation/observation.js';
import type { VisualizationDimensions } from './types.js';

/** Responsive measurement only; chart geometry and rendering remain in the adapter. */
export class VisualizationResponsiveViewport {
  dimensions: VisualizationDimensions = { width: 320, height: 200 };
  #release: (() => void) | undefined;
  connect(element: HTMLElement, changed: (dimensions: VisualizationDimensions) => void): void {
    this.disconnect();
    this.#release = observeResize(element, (entry) => {
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
  }
  disconnect(): void {
    this.#release?.();
    this.#release = undefined;
  }
}
