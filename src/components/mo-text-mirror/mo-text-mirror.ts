import { moTextMirrorPresentation } from '../../presentation/families/mo-text-mirror.js';
import { TextRevealElement, textRevealRoles, type TextRevealSplit } from '../shared/text-reveal.js';
import { moTextMirrorPieceCss } from './piece-styles.js';

export const moTextMirrorRoles = textRevealRoles;

/**
 * Reveals its text line by line from the middle out: each line is cut at the middle of its own
 * text, whatever the alignment, and both halves slide out of that seam to their places, one line
 * after another as the text enters the view. The seam runs down the middle of each line, so the
 * halves slide sideways, or with `orientation="vertical"` across it, so they slide up and down. A hide slides them back into the seam. Links and
 * inline formatting keep working, and the text takes the same space as before. Inside a Scroll
 * trigger the trigger decides when the reveal plays.
 *
 * @slot - The text, with inline formatting and interactive elements.
 * @fires tp-text-split - `{ lines, words, chars, masks }` after every split.
 * @fires tp-reveal-change - `{ revealed, effect }` when the reveal starts or a repeat resets it.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last line settles.
 * @cssprop --tp-mo-text-mirror-duration - Per-line reveal duration. Default `var(--tp-duration-slow)`.
 * @cssprop --tp-mo-text-mirror-easing - Reveal easing. Default `var(--tp-easing-enter)`.
 * @cssprop --tp-mo-text-mirror-mask-bleed - How far each half's window extends over ascenders and
 * descenders. Default `0.1em`.
 */
export class TpMoTextMirror extends TextRevealElement {
  static tagName = 'tp-mo-text-mirror';
  static override presentation = moTextMirrorPresentation;

  /**
   * The direction the halves slide in: `horizontal` cuts each line down the middle of its text
   * and slides the halves sideways; `vertical` cuts it across the middle and slides them up and
   * down.
   */
  override orientation: 'horizontal' | 'vertical' = 'horizontal';

  protected readonly pieceCss = moTextMirrorPieceCss;

  protected splitOptions(): TextRevealSplit {
    return { units: new Set(['lines']), mask: null, mirror: true };
  }

  protected revealEffects(): string[] {
    return ['mirror'];
  }

  protected override afterSplit(): void {
    this.#measure();
  }

  protected override widthChanged(): void {
    this.#measure();
  }

  /** A line's halves slide inside their windows, so the slide carries the line's timing. */
  protected override timedElement(piece: HTMLElement): Element {
    return piece.closest('[data-tp-mirror-slide]') ?? piece;
  }

  /**
   * Each line is cut at the middle of its own text, whatever the alignment: each line's mirror
   * wrapper carries the start and size of the text it holds, along and across the line.
   */
  #measure(): void {
    if (this.getClientRects().length === 0) return;
    const range = this.ownerDocument.createRange();
    for (const mask of this.querySelectorAll<HTMLElement>('[data-tp-mirror]')) {
      const line = mask.querySelector<HTMLElement>(
        "[data-tp-piece='line']:not([data-tp-mirror-copy])",
      );
      if (!line) continue;
      const box = line.getBoundingClientRect();
      // Only the drawn text counts: the visually hidden original (for assistive technology) lays
      // out as one long run inside its clipped box.
      const rects = [...line.childNodes].flatMap((node) => {
        if (node instanceof Element && node.matches('[data-tp-text]')) return [];
        range.selectNodeContents(node);
        return [...range.getClientRects()].filter((rect) => rect.width > 0);
      });
      if (!rects.length) continue;
      const start = Math.min(...rects.map((rect) => rect.left)) - box.left;
      const end = Math.max(...rects.map((rect) => rect.right)) - box.left;
      const top = Math.min(...rects.map((rect) => rect.top)) - box.top;
      const bottom = Math.max(...rects.map((rect) => rect.bottom)) - box.top;
      mask.style.setProperty('--_tp-tm-mirror-start', `${start}px`);
      mask.style.setProperty('--_tp-tm-mirror-size', `${end - start}px`);
      mask.style.setProperty('--_tp-tm-mirror-block-start', `${top}px`);
      mask.style.setProperty('--_tp-tm-mirror-block-size', `${bottom - top}px`);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-text-mirror': TpMoTextMirror;
  }
}
