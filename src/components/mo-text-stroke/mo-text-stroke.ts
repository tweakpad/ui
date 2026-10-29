import { css } from 'lit';
import { outlineGlyphs } from '../../foundation/text-outline.js';
import { moTextStrokePresentation } from '../../presentation/families/mo-text-stroke.js';
import {
  parseSplitUnits,
  TextRevealElement,
  textRevealRoles,
  type TextRevealSplit,
} from '../shared/text-reveal.js';
import { moTextStrokePieceCss } from './piece-styles.js';

export const moTextStrokeRoles = textRevealRoles;

/**
 * Draws the outline of every glyph in the text color, then fills the text in and lets the outline
 * fade, piece after piece as the text enters the view. A hide plays it backwards. The outlines are
 * the browser's own strokes of the font, laid exactly over the text and hidden from assistive
 * technology; links and inline formatting keep working, and the text takes the same space as
 * before. Inside a Scroll trigger the trigger decides when the reveal plays.
 *
 * @slot - The text, with inline formatting and interactive elements.
 * @fires tp-text-split - `{ lines, words, chars, masks }` after every split.
 * @fires tp-reveal-change - `{ revealed, effect }` when the reveal starts or a repeat resets it.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last piece settles.
 * @cssprop --tp-mo-text-stroke-duration - Per-piece reveal duration. Default `var(--tp-duration-slow)`.
 * @cssprop --tp-mo-text-stroke-easing - Reveal easing. Default `var(--tp-easing-enter)`.
 * @cssprop --tp-mo-text-stroke-width - Outline width. Default `0.03em`.
 * @cssprop --tp-mo-text-stroke-length - Dash length that draws one glyph outline; longer outlines
 * draw faster. Default `6em`.
 */
export class TpMoTextStroke extends TextRevealElement {
  static tagName = 'tp-mo-text-stroke';
  static override presentation = moTextStrokePresentation;
  static override properties = {
    ...TextRevealElement.properties,
    split: { type: String, reflect: true },
  };
  static override styles = [
    TextRevealElement.styles,
    css`
      /* Characters are positioned individually, so kerning and ligatures cannot apply; they are
         off from the first frame so splitting never re-wraps the text. */
      :host([split~='chars']) {
        font-kerning: none;
        font-variant-ligatures: none;
      }
    `,
  ];

  /**
   * Units to create: tokens of `chars`, `words`, `lines`. The finest unit animates; each word, or
   * each character when characters are split, carries the outline of its glyphs.
   */
  split = 'words';

  protected readonly pieceCss = moTextStrokePieceCss;

  protected splitOptions(): TextRevealSplit {
    return { units: parseSplitUnits(this.split), mask: null };
  }

  protected revealEffects(): string[] {
    return ['stroke'];
  }

  /**
   * Every word (or character, when characters are split) carries an outline of its own glyphs.
   * Outlines are rebuilt after every split and line pass.
   */
  protected override afterSplit(): void {
    for (const outline of this.querySelectorAll('[data-tp-outline]')) outline.remove();
    if (this.getClientRects().length === 0) return;
    const unit = this.querySelector("[data-tp-piece='char']") ? 'char' : 'word';
    const skip = (node: Node) => node instanceof Element && node.matches('[data-tp-text]');
    for (const piece of this.querySelectorAll<HTMLElement>(`[data-tp-piece='${unit}']`)) {
      const outline = outlineGlyphs(piece, skip);
      if (!outline) continue;
      outline.setAttribute('data-tp-outline', '');
      piece.append(outline);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-text-stroke': TpMoTextStroke;
  }
}
