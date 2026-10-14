import { css } from 'lit';
import { TpHoverSurface } from '../anchored-surface/anchored-surface.js';
import { deepActiveElement } from '../../foundation/focus.js';
import { previewCardPresentation } from '../../presentation/families/preview-card.js';

/** Supplementary preview policy on the shared anchored/hover implementation. */
export class TpPreviewCard extends TpHoverSurface {
  static tagName = 'tp-preview-card';
  static override presentation = previewCardPresentation;
  static override styles = [
    TpHoverSurface.styles,
    css`
      .backdrop {
        pointer-events: none;
      }
    `,
  ];
  #movedFocus = false;
  protected override get overlayRole(): string {
    return 'group';
  }
  protected override get partPrefix(): string {
    return 'preview-card';
  }
  protected override get surfaceModal(): boolean {
    return false;
  }
  protected override get describesTrigger(): boolean {
    return true;
  }
  protected override get defaultHoverDelay(): number {
    return 600;
  }
  protected override get defaultCloseDelay(): number {
    return 300;
  }
  protected override get delayedKeyboardFocus(): boolean {
    return true;
  }
  protected override focusOnOpen(): void {
    const before = deepActiveElement(this.ownerDocument);
    super.focusOnOpen();
    this.#movedFocus = before !== deepActiveElement(this.ownerDocument);
  }
  protected override focusOnClose(): void {
    if (this.#movedFocus) super.focusOnClose();
    this.#movedFocus = false;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-preview-card': TpPreviewCard;
  }
}
