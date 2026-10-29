import { css, type PropertyValues } from 'lit';
import type { SplitUnit } from '../../foundation/text-split/splitter.js';
import type { RevealCoordinatorHost } from '../../foundation/reveal-coordination.js';
import { moTextSplitPresentation } from '../../presentation/families/mo-text-split.js';
import {
  parseSplitUnits,
  TextRevealElement,
  textRevealRoles,
  type TextRevealSplit,
} from '../shared/text-reveal.js';
import { moTextSplitPieceCss } from './piece-styles.js';

export { parseSplitUnits } from '../shared/text-reveal.js';

export type MoTextSplitEffect =
  'fade' | 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out' | 'blur';
export type MoTextSplitMask = 'none' | 'lines' | 'words' | 'chars';

const EFFECTS: readonly MoTextSplitEffect[] = [
  'fade',
  'up',
  'down',
  'left',
  'right',
  'zoom-in',
  'zoom-out',
  'blur',
];
const DEFAULT_REVEAL = 'fade up';

export const moTextSplitRoles = textRevealRoles;

/**
 * Splits its text into lines, words or characters and reveals the pieces one after another as the
 * text enters the view. The pieces are built around the original text, so links and inline
 * formatting keep working, and splitting never changes the space the text takes. Inside a Scroll
 * trigger the trigger decides when the reveal plays.
 *
 * @slot - The text, with inline formatting and interactive elements.
 * @fires tp-text-split - `{ lines, words, chars, masks }` after every split.
 * @fires tp-reveal-change - `{ revealed, effect }` when the reveal starts or a repeat resets it.
 * @fires tp-reveal-change-complete - `{ revealed }` after the last piece settles.
 * @cssprop --tp-mo-text-split-duration - Per-piece reveal duration. Default `var(--tp-duration-slow)`.
 * @cssprop --tp-mo-text-split-easing - Reveal easing. Default `var(--tp-easing-enter)`.
 * @cssprop --tp-mo-text-split-distance - Travel without a mask. Default `0.4em`.
 * @cssprop --tp-mo-text-split-scale - Scale offset for zoom-in and zoom-out. Default `0.2`.
 * @cssprop --tp-mo-text-split-blur - Start blur for `blur`. Default `0.15em`.
 * @cssprop --tp-mo-text-split-mask-bleed - How far masks extend over ascenders and descenders.
 * Default `0.1em`.
 */
export class TpMoTextSplit extends TextRevealElement {
  static tagName = 'tp-mo-text-split';
  static override presentation = moTextSplitPresentation;
  static override properties = {
    ...TextRevealElement.properties,
    split: { type: String, reflect: true },
    mask: { type: String, reflect: true },
    reveal: { type: String, reflect: true },
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

  /** Units to create: tokens of `chars`, `words`, `lines`. The finest unit animates. */
  split = 'words';
  /** The unit whose pieces are clipped, so they emerge from behind it. */
  mask: MoTextSplitMask = 'none';
  /**
   * Effect tokens (`fade`, `up`, `down`, `left`, `right`, `zoom-in`, `zoom-out`, `blur`).
   * Unset uses the coordinator default, or `fade up`; empty disables the reveal.
   */
  reveal: string | undefined = undefined;

  protected readonly pieceCss = moTextSplitPieceCss;

  protected splitOptions(): TextRevealSplit {
    const units = parseSplitUnits(this.split);
    const mask = this.mask === 'none' ? null : (this.mask as SplitUnit);
    return { units, mask: mask && units.has(mask) ? mask : null };
  }

  protected revealEffects(coordinator: RevealCoordinatorHost | undefined): string[] {
    const tokens = (this.reveal ?? (coordinator?.reveal || DEFAULT_REVEAL)).split(/\s+/);
    return EFFECTS.filter((effect) => tokens.includes(effect));
  }

  protected override updated(changed: PropertyValues<this>): void {
    super.updated(changed);
    if (changed.has('reveal')) this.effectsChanged();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'tp-mo-text-split': TpMoTextSplit;
  }
}
