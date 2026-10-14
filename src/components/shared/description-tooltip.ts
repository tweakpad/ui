import type { ReactiveController } from 'lit';
import type { TpElement } from '../../foundation/element.js';
import type { TpTooltip } from '../tooltip/tooltip.js';

/**
 * Binds a Tooltip that a primitive renders in its own shadow root to one of its inner elements,
 * and registers the Tooltip popup as the primitive's description part. Time and Text transform
 * describe their value this way: render a Tooltip with `ref(controller.reference)` while the
 * description applies, and call `sync()` with the described element after every update.
 */
export class DescriptionTooltipController implements ReactiveController {
  readonly #host: TpElement;
  readonly #part: string;
  #tooltip: TpTooltip | undefined;
  #bound: TpTooltip | undefined;
  #target: HTMLElement | undefined;
  #releaseTrigger: (() => void) | undefined;
  #popup: HTMLElement | undefined;
  #releasePart: (() => void) | undefined;

  constructor(host: TpElement, part: string) {
    this.#host = host;
    this.#part = part;
    host.addController(this);
  }

  /** Pass to the `ref` directive on the rendered Tooltip. */
  readonly reference = (element: Element | undefined): void => {
    this.#tooltip = element as TpTooltip | undefined;
  };

  /** Describes `target` with the rendered Tooltip, or releases the description without one. */
  sync(target: HTMLElement | undefined): void {
    const tooltip = target ? this.#tooltip : undefined;
    if (target !== this.#target || !tooltip) {
      this.#releaseTrigger?.();
      this.#releaseTrigger = undefined;
      this.#target = undefined;
      if (tooltip && target) {
        this.#target = target;
        this.#releaseTrigger = tooltip.registerTrigger(target);
      }
    }
    this.#listen(tooltip);
    if (!tooltip) {
      this.#releaseDescription();
      return;
    }
    this.#registerPopup();
  }

  hostDisconnected(): void {
    this.#releaseTrigger?.();
    this.#releaseTrigger = undefined;
    this.#target = undefined;
    this.#listen(undefined);
    this.#releaseDescription();
  }

  // The popup mounts once the Tooltip has opened, so it is registered on every completed opening.
  #listen(tooltip: TpTooltip | undefined): void {
    if (tooltip === this.#bound) return;
    this.#bound?.removeEventListener('tp-open-change-complete', this.#registerPopup);
    this.#bound = tooltip;
    tooltip?.addEventListener('tp-open-change-complete', this.#registerPopup);
  }

  readonly #registerPopup = (): void => {
    const tooltip = this.#bound;
    if (!tooltip) return;
    void tooltip.updateComplete.then(() => {
      const popup = tooltip.popupElement ?? undefined;
      if (!this.#host.isConnected || tooltip !== this.#bound || !popup || popup === this.#popup)
        return;
      this.#releaseDescription();
      this.#popup = popup;
      this.#releasePart = this.#host.presentationController.registerPart(this.#part, popup);
    });
  };

  #releaseDescription(): void {
    this.#releasePart?.();
    this.#releasePart = undefined;
    this.#popup = undefined;
  }
}
